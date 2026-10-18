import "server-only";

import { MEDIA_JOB_NAMES, getMediaQueue, type MediaJobName } from "@klivexa/queue";
import type { JobStatus, MediaJobKind, MediaSourceType, MediaStatus } from "@klivexa/database";
import type { SessionUser } from "@/server/session";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { assertPermission, can } from "@/server/rbac";
import { canonicalYouTubeUrl, extractYouTubeVideoId } from "@/lib/youtube";
import { removeStorageKey } from "@/server/storage";

export type MediaDTO = {
  id: string;
  projectId: string;
  projectTitle: string;
  sourceType: MediaSourceType;
  status: MediaStatus;
  title: string | null;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  sourceUrl: string | null;
  youtubeVideoId: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MediaJobDTO = {
  id: string;
  mediaAssetId: string;
  kind: MediaJobKind;
  status: JobStatus;
  progress: number;
  attempts: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

const mediaSelect = {
  id: true, userId: true, projectId: true, sourceType: true, status: true, title: true, originalName: true,
  storageKey: true, thumbnailKey: true, remoteThumbnailUrl: true, mimeType: true, sizeBytes: true, sourceUrl: true,
  youtubeVideoId: true, durationMs: true, width: true, height: true, videoCodec: true, audioCodec: true,
  error: true, createdAt: true, updatedAt: true, project: { select: { title: true } },
} as const;

function toMediaDTO(asset: {
  id: string; userId: string; projectId: string; sourceType: MediaSourceType; status: MediaStatus; title: string | null;
  originalName: string | null; storageKey: string | null; thumbnailKey: string | null; remoteThumbnailUrl: string | null;
  mimeType: string | null; sizeBytes: bigint | null; sourceUrl: string | null; youtubeVideoId: string | null;
  durationMs: number | null; width: number | null; height: number | null; videoCodec: string | null; audioCodec: string | null;
  error: string | null; createdAt: Date; updatedAt: Date; project: { title: string };
}): MediaDTO {
  return {
    id: asset.id,
    projectId: asset.projectId,
    projectTitle: asset.project.title,
    sourceType: asset.sourceType,
    status: asset.status,
    title: asset.title,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes?.toString() ?? null,
    sourceUrl: asset.sourceUrl,
    youtubeVideoId: asset.youtubeVideoId,
    durationMs: asset.durationMs,
    width: asset.width,
    height: asset.height,
    videoCodec: asset.videoCodec,
    audioCodec: asset.audioCodec,
    thumbnailUrl: asset.thumbnailKey ? `/api/media/${asset.id}/thumbnail` : asset.remoteThumbnailUrl,
    previewUrl: asset.storageKey && asset.status === "READY" ? `/api/media/${asset.id}/preview` : null,
    error: asset.error,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

function accessibleWhere(viewer: SessionUser) {
  return { deletedAt: null, ...(can(viewer.role, "media:read:any") ? {} : { userId: viewer.id }) };
}

export async function requireOwnedActiveProject(viewer: SessionUser, projectId: string): Promise<void> {
  assertPermission(viewer.role, "media:create");
  const project = await db.project.findFirst({ where: { id: projectId, userId: viewer.id, deletedAt: null, archivedAt: null }, select: { id: true } });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Proyek aktif tidak ditemukan.");
}

export async function findIdempotentMedia(viewer: SessionUser, idempotencyKey?: string | null): Promise<MediaDTO | null> {
  if (!idempotencyKey) return null;
  const asset = await db.mediaAsset.findFirst({ where: { userId: viewer.id, idempotencyKey, deletedAt: null }, select: mediaSelect });
  return asset ? toMediaDTO(asset) : null;
}

export async function enqueueMediaJob(input: {
  mediaAssetId: string;
  userId: string;
  projectId: string;
  kind: MediaJobKind;
  name: MediaJobName;
}): Promise<MediaJobDTO> {
  const row = await db.mediaProcessingJob.create({ data: { mediaAssetId: input.mediaAssetId, kind: input.kind } });
  try {
    const job = await getMediaQueue().add(input.name, {
      databaseJobId: row.id,
      mediaAssetId: input.mediaAssetId,
      userId: input.userId,
      projectId: input.projectId,
    }, { jobId: row.id });
    const updated = await db.mediaProcessingJob.update({ where: { id: row.id }, data: { bullJobId: String(job.id) } });
    return toJobDTO(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2_000) : "Queue unavailable";
    await db.$transaction([
      db.mediaProcessingJob.update({ where: { id: row.id }, data: { status: "FAILED", error: message } }),
      db.mediaAsset.update({ where: { id: input.mediaAssetId }, data: { status: "FAILED", error: message } }),
    ]);
    throw new AppError(503, "QUEUE_UNAVAILABLE", "Antrean media sedang tidak tersedia.");
  }
}

export async function createUploadedMedia(viewer: SessionUser, input: {
  projectId: string; originalName: string; storageKey: string; mimeType: string; sizeBytes: number; sha256: string; idempotencyKey?: string | null;
}): Promise<{ media: MediaDTO; job: MediaJobDTO }> {
  await requireOwnedActiveProject(viewer, input.projectId);
  let asset;
  try {
    asset = await db.$transaction(async (tx) => {
      const created = await tx.mediaAsset.create({
        data: {
          userId: viewer.id, projectId: input.projectId, sourceType: "UPLOAD", originalName: input.originalName.slice(0, 255),
          storageKey: input.storageKey, mimeType: input.mimeType, sizeBytes: BigInt(input.sizeBytes), sha256: input.sha256,
          idempotencyKey: input.idempotencyKey || null,
        },
        select: mediaSelect,
      });
      await tx.project.update({ where: { id: input.projectId }, data: { status: "IMPORTING" } });
      await tx.auditLog.create({ data: { userId: viewer.id, action: "media.uploaded", resource: "media", resourceId: created.id, metadata: { projectId: input.projectId, sizeBytes: input.sizeBytes, mimeType: input.mimeType } } });
      return created;
    });
  } catch (error) {
    await removeStorageKey(input.storageKey);
    throw error;
  }
  const job = await enqueueMediaJob({ mediaAssetId: asset.id, userId: viewer.id, projectId: input.projectId, kind: "PROBE_UPLOAD", name: MEDIA_JOB_NAMES.probeUpload });
  return { media: toMediaDTO(asset), job };
}

export async function createYouTubeMedia(viewer: SessionUser, input: { projectId: string; url: string; idempotencyKey?: string | null }): Promise<{ media: MediaDTO; job: MediaJobDTO }> {
  await requireOwnedActiveProject(viewer, input.projectId);
  const videoId = extractYouTubeVideoId(input.url);
  if (!videoId) throw new AppError(422, "INVALID_YOUTUBE_URL", "URL YouTube tidak valid atau tidak didukung.");
  const canonicalUrl = canonicalYouTubeUrl(videoId);
  const asset = await db.$transaction(async (tx) => {
    const created = await tx.mediaAsset.create({
      data: { userId: viewer.id, projectId: input.projectId, sourceType: "YOUTUBE", sourceUrl: canonicalUrl, youtubeVideoId: videoId, idempotencyKey: input.idempotencyKey || null },
      select: mediaSelect,
    });
    await tx.project.update({ where: { id: input.projectId }, data: { status: "IMPORTING" } });
    await tx.auditLog.create({ data: { userId: viewer.id, action: "media.youtube_linked", resource: "media", resourceId: created.id, metadata: { projectId: input.projectId, videoId } } });
    return created;
  });
  const job = await enqueueMediaJob({ mediaAssetId: asset.id, userId: viewer.id, projectId: input.projectId, kind: "FETCH_YOUTUBE_METADATA", name: MEDIA_JOB_NAMES.fetchYouTubeMetadata });
  return { media: toMediaDTO(asset), job };
}

export async function listMedia(viewer: SessionUser, projectId?: string): Promise<MediaDTO[]> {
  assertPermission(viewer.role, "media:read");
  const rows = await db.mediaAsset.findMany({ where: { ...accessibleWhere(viewer), ...(projectId ? { projectId } : {}) }, select: mediaSelect, orderBy: { createdAt: "desc" } });
  return rows.map(toMediaDTO);
}

export async function getMedia(viewer: SessionUser, id: string) {
  assertPermission(viewer.role, "media:read");
  const asset = await db.mediaAsset.findFirst({ where: { id, ...accessibleWhere(viewer) }, select: mediaSelect });
  if (!asset) throw new AppError(404, "MEDIA_NOT_FOUND", "Media tidak ditemukan.");
  return asset;
}

export async function getMediaDTO(viewer: SessionUser, id: string): Promise<MediaDTO> {
  return toMediaDTO(await getMedia(viewer, id));
}

export async function deleteMedia(viewer: SessionUser, id: string): Promise<void> {
  assertPermission(viewer.role, "media:delete");
  const asset = await getMedia(viewer, id);
  if (asset.userId !== viewer.id && !can(viewer.role, "media:delete:any")) throw new AppError(403, "FORBIDDEN", "Akses media ditolak.");
  await db.$transaction([
    db.mediaAsset.update({ where: { id }, data: { deletedAt: new Date() } }),
    db.auditLog.create({ data: { userId: viewer.id, action: "media.deleted", resource: "media", resourceId: id } }),
  ]);
  await Promise.all([removeStorageKey(asset.storageKey), removeStorageKey(asset.thumbnailKey)]);
}

function toJobDTO(job: { id: string; mediaAssetId: string; kind: MediaJobKind; status: JobStatus; progress: number; attempts: number; error: string | null; createdAt: Date; updatedAt: Date }): MediaJobDTO {
  return { ...job, createdAt: job.createdAt.toISOString(), updatedAt: job.updatedAt.toISOString() };
}

export async function getMediaJob(viewer: SessionUser, id: string): Promise<MediaJobDTO> {
  assertPermission(viewer.role, "media:read");
  const job = await db.mediaProcessingJob.findFirst({
    where: { id, mediaAsset: accessibleWhere(viewer) },
    select: { id: true, mediaAssetId: true, kind: true, status: true, progress: true, attempts: true, error: true, createdAt: true, updatedAt: true },
  });
  if (!job) throw new AppError(404, "JOB_NOT_FOUND", "Job media tidak ditemukan.");
  return toJobDTO(job);
}
