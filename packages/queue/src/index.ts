import { Queue, type ConnectionOptions, type DefaultJobOptions, type JobsOptions } from "bullmq";

export const QUEUE_NAMES = {
  media: "media.process",
  render: "media.render",
  publish: "social.publish",
} as const;

export const MEDIA_JOB_NAMES = {
  probeUpload: "probe-upload",
  fetchYouTubeMetadata: "fetch-youtube-metadata",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
export type MediaJobName = (typeof MEDIA_JOB_NAMES)[keyof typeof MEDIA_JOB_NAMES];

export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 500 },
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 1_000 },
};

export type MediaJobData = {
  databaseJobId: string;
  mediaAssetId: string;
  userId: string;
  projectId: string;
};

export type MediaJob<T extends Record<string, unknown>> = {
  userId: string;
  projectId: string;
  payload: T;
  requestedAt: string;
  options?: JobsOptions;
};

export function redisConnection(redisUrl = process.env.REDIS_URL): ConnectionOptions {
  if (!redisUrl) throw new Error("REDIS_URL is required");
  const url = new URL(redisUrl);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") throw new Error("REDIS_URL must use redis:// or rediss://");
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

let mediaQueue: Queue<MediaJobData, void, MediaJobName> | undefined;

export function getMediaQueue(): Queue<MediaJobData, void, MediaJobName> {
  mediaQueue ??= new Queue<MediaJobData, void, MediaJobName>(QUEUE_NAMES.media, {
    connection: redisConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  return mediaQueue;
}

export async function closeMediaQueue(): Promise<void> {
  if (mediaQueue) await mediaQueue.close();
  mediaQueue = undefined;
}
