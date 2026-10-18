import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { JobStatus, MediaStatus, PrismaClient } from "@klivexa/database";
import { MEDIA_JOB_NAMES, QUEUE_NAMES, redisConnection, type MediaJobData } from "@klivexa/queue";
import { Worker, type Job } from "bullmq";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

function workspaceRoot(): string {
  let current = process.cwd();
  while (path.dirname(current) !== current) {
    if (existsSync(path.join(current, "packages", "database")) && existsSync(path.join(current, "apps", "web"))) return current;
    current = path.dirname(current);
  }
  throw new Error("KLIVEXA workspace root was not found");
}

const root = workspaceRoot();
const storageRoot = path.resolve(root, process.env.MEDIA_STORAGE_PATH ?? "storage");
const timeoutMs = Math.max(5_000, Number(process.env.MEDIA_PROCESS_TIMEOUT_MS ?? 45_000));

function safeStoragePath(storageKey: string): string {
  if (!/^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/.test(storageKey)) throw new Error("Unsafe storage key");
  const resolved = path.resolve(storageRoot, storageKey);
  if (!resolved.startsWith(`${storageRoot}${path.sep}`)) throw new Error("Storage path escaped its root");
  return resolved;
}

async function cleanupStaleTempFiles(): Promise<void> {
  const tempDirectory = path.join(storageRoot, "tmp");
  try {
    const entries = await readdir(tempDirectory);
    const cutoff = Date.now() - 60 * 60 * 1_000;
    await Promise.all(entries.filter((name) => /^[a-f0-9-]+\.upload$/i.test(name)).map(async (name) => {
      const target = safeStoragePath(`tmp/${name}`);
      const info = await stat(target);
      if (info.isFile() && info.mtimeMs < cutoff) await unlink(target);
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Temporary media cleanup failed", error);
  }
}

async function run(command: string, args: string[], timeout = timeoutMs): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} exceeded ${timeout}ms`));
    }, timeout);
    child.stdout.on("data", (chunk: Buffer) => { if (stdout.length < 1_000_000) stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { if (stderr.length < 32_000) stderr += chunk.toString(); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} failed (${code}): ${stderr.slice(-2_000)}`));
    });
  });
}

type ProbeOutput = {
  format?: { duration?: string; format_name?: string };
  streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
};

async function reportProgress(job: Job<MediaJobData>, progress: number): Promise<void> {
  await Promise.all([
    job.updateProgress(progress),
    db.mediaProcessingJob.update({ where: { id: job.data.databaseJobId }, data: { progress } }),
  ]);
}

async function probeUpload(job: Job<MediaJobData>): Promise<void> {
  const asset = await db.mediaAsset.findFirst({
    where: { id: job.data.mediaAssetId, userId: job.data.userId, projectId: job.data.projectId, deletedAt: null },
  });
  if (!asset?.storageKey) throw new Error("Media upload no longer exists");
  const input = safeStoragePath(asset.storageKey);
  const output = await run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration,format_name:stream=codec_type,codec_name,width,height",
    "-of", "json", input,
  ]);
  const probe = JSON.parse(output) as ProbeOutput;
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const audio = probe.streams?.find((stream) => stream.codec_type === "audio");
  const duration = Number(probe.format?.duration);
  if (!video || !Number.isFinite(duration) || duration <= 0) throw new Error("FFprobe did not find a valid video stream");
  if ((video.width ?? 0) > 8192 || (video.height ?? 0) > 8192 || duration > 21_600) throw new Error("Media exceeds the processing resource policy");

  await reportProgress(job, 55);
  const thumbnailKey = `media/${asset.userId}/${asset.projectId}/${asset.id}.jpg`;
  const thumbnail = safeStoragePath(thumbnailKey);
  await mkdir(path.dirname(thumbnail), { recursive: true, mode: 0o700 });
  await run("ffmpeg", [
    "-v", "error", "-threads", "1", "-ss", String(Math.min(1, duration / 2)), "-i", input,
    "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "4", "-y", thumbnail,
  ]);
  await reportProgress(job, 90);
  await db.mediaAsset.update({
    where: { id: asset.id },
    data: {
      status: MediaStatus.READY,
      title: asset.title ?? asset.originalName,
      thumbnailKey,
      durationMs: Math.round(duration * 1_000),
      width: video.width,
      height: video.height,
      videoCodec: video.codec_name,
      audioCodec: audio?.codec_name,
      error: null,
    },
  });
}

function trustedThumbnail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || !(url.hostname === "i.ytimg.com" || url.hostname.endsWith(".ytimg.com"))) return null;
  return url.toString();
}

async function fetchYouTubeMetadata(job: Job<MediaJobData>): Promise<void> {
  const asset = await db.mediaAsset.findFirst({
    where: { id: job.data.mediaAssetId, userId: job.data.userId, projectId: job.data.projectId, deletedAt: null },
  });
  if (!asset?.youtubeVideoId) throw new Error("YouTube media no longer exists");
  const canonical = `https://www.youtube.com/watch?v=${asset.youtubeVideoId}`;
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", canonical);
  endpoint.searchParams.set("format", "json");
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "User-Agent": "KLIVEXA-AI/0.1 local metadata client" },
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`YouTube oEmbed returned ${response.status}`);
  const metadata = await response.json() as { title?: unknown; author_name?: unknown; thumbnail_url?: unknown };
  if (typeof metadata.title !== "string" || metadata.title.length === 0) throw new Error("YouTube metadata did not contain a title");
  await reportProgress(job, 80);
  await db.mediaAsset.update({
    where: { id: asset.id },
    data: {
      title: metadata.title.slice(0, 300),
      remoteThumbnailUrl: trustedThumbnail(metadata.thumbnail_url),
      status: MediaStatus.READY,
      error: null,
    },
  });
}

async function processJob(job: Job<MediaJobData>): Promise<void> {
  await db.mediaProcessingJob.update({
    where: { id: job.data.databaseJobId },
    data: { bullJobId: String(job.id), status: JobStatus.RUNNING, progress: 5, attempts: { increment: 1 }, startedAt: new Date(), error: null },
  });
  await db.mediaAsset.update({ where: { id: job.data.mediaAssetId }, data: { status: MediaStatus.PROCESSING, error: null } });
  await job.updateProgress(5);
  try {
    if (job.name === MEDIA_JOB_NAMES.probeUpload) await probeUpload(job);
    else if (job.name === MEDIA_JOB_NAMES.fetchYouTubeMetadata) await fetchYouTubeMetadata(job);
    else throw new Error(`Unsupported media job: ${job.name}`);
    const outstanding = await db.mediaAsset.count({ where: { projectId: job.data.projectId, deletedAt: null, status: { in: [MediaStatus.QUEUED, MediaStatus.PROCESSING] } } });
    if (outstanding === 0) await db.project.updateMany({ where: { id: job.data.projectId, deletedAt: null }, data: { status: "READY" } });
    await job.updateProgress(100);
    await db.mediaProcessingJob.update({ where: { id: job.data.databaseJobId }, data: { status: JobStatus.COMPLETED, progress: 100, completedAt: new Date(), error: null } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2_000) : "Media processing failed";
    const finalAttempt = job.attemptsMade + 1 >= Number(job.opts.attempts ?? 1);
    await db.mediaProcessingJob.update({ where: { id: job.data.databaseJobId }, data: { status: finalAttempt ? JobStatus.FAILED : JobStatus.QUEUED, error: message } });
    await db.mediaAsset.update({ where: { id: job.data.mediaAssetId }, data: { status: finalAttempt ? MediaStatus.FAILED : MediaStatus.QUEUED, error: message } });
    if (finalAttempt) await db.project.updateMany({ where: { id: job.data.projectId, deletedAt: null }, data: { status: "FAILED" } });
    throw error;
  }
}

const worker = new Worker<MediaJobData>(QUEUE_NAMES.media, processJob, {
  connection: redisConnection(),
  concurrency: 2,
  lockDuration: Math.max(timeoutMs + 10_000, 60_000),
  limiter: { max: 4, duration: 1_000 },
});

void cleanupStaleTempFiles();

worker.on("ready", () => console.log("KLIVEXA media worker ready"));
worker.on("completed", (job) => console.log(`Media job ${job.id} completed`));
worker.on("failed", (job, error) => console.error(`Media job ${job?.id ?? "unknown"} failed: ${error.message}`));

async function shutdown(): Promise<void> {
  await worker.close();
  await db.$disconnect();
}

process.once("SIGINT", () => { void shutdown().finally(() => process.exit(0)); });
process.once("SIGTERM", () => { void shutdown().finally(() => process.exit(0)); });

void worker.waitUntilReady().catch((error) => {
  console.error("Media worker failed to start", error);
  process.exitCode = 1;
});
