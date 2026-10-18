import "server-only";

import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is required");
}

const globalForRedis = globalThis as unknown as { klivexaRedis?: Redis };

export const redis = globalForRedis.klivexaRedis ?? new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 2_000,
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.klivexaRedis = redis;
}

export async function ensureRedis(): Promise<Redis> {
  if (redis.status === "wait" || redis.status === "end") {
    await redis.connect();
  }
  return redis;
}
