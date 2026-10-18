import "server-only";

import { createHmac } from "node:crypto";
import { ensureRedis } from "@/server/redis";
import { AppError } from "@/server/errors";

type RateLimitResult = { allowed: boolean; remaining: number; retryAfter: number; key: string };

function numberFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function rateLimitIdentifier(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function consumeLoginAttempt(identifier: string): Promise<RateLimitResult> {
  const max = numberFromEnv("LOGIN_RATE_LIMIT_MAX", 5);
  const windowSeconds = numberFromEnv("LOGIN_RATE_LIMIT_WINDOW_SECONDS", 900);
  const key = `klivexa:auth:login:${rateLimitIdentifier(identifier)}`;

  try {
    const client = await ensureRedis();
    const result = (await client.eval(
      `local current = redis.call('INCR', KEYS[1])
       if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
       local ttl = redis.call('TTL', KEYS[1])
       return {current, ttl}`,
      1,
      key,
      String(windowSeconds),
    )) as [number, number];
    const [current, ttl] = result;
    return { allowed: current <= max, remaining: Math.max(0, max - current), retryAfter: Math.max(1, ttl), key };
  } catch (error) {
    console.error("Redis rate limiter unavailable", error);
    throw new AppError(503, "AUTH_PROTECTION_UNAVAILABLE", "Proteksi login sedang tidak tersedia. Coba lagi sebentar.");
  }
}

export async function consumeRateLimit(scope: string, identifier: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
  const key = `klivexa:${scope}:${rateLimitIdentifier(identifier)}`;
  try {
    const client = await ensureRedis();
    const result = (await client.eval(
      `local current = redis.call('INCR', KEYS[1])
       if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
       local ttl = redis.call('TTL', KEYS[1])
       return {current, ttl}`,
      1,
      key,
      String(windowSeconds),
    )) as [number, number];
    const [current, ttl] = result;
    if (current > max) throw new AppError(429, "RATE_LIMITED", "Terlalu banyak permintaan. Coba lagi nanti.", { retryAfter: Math.max(1, ttl) });
    return { allowed: true, remaining: Math.max(0, max - current), retryAfter: Math.max(1, ttl), key };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Redis media rate limiter unavailable", error);
    throw new AppError(503, "PROTECTION_UNAVAILABLE", "Proteksi permintaan sedang tidak tersedia.");
  }
}

export async function consumeMediaRequest(userId: string): Promise<RateLimitResult> {
  const max = numberFromEnv("MEDIA_RATE_LIMIT_MAX", 20);
  const windowSeconds = numberFromEnv("MEDIA_RATE_LIMIT_WINDOW_SECONDS", 3_600);
  return consumeRateLimit("media", userId, max, windowSeconds);
}

export async function consumeMediaRead(userId: string): Promise<RateLimitResult> {
  return consumeRateLimit("media-read", userId, 600, 60);
}

export async function resetLoginAttempts(key: string): Promise<void> {
  try {
    const client = await ensureRedis();
    await client.del(key);
  } catch (error) {
    console.error("Unable to reset login attempts", error);
  }
}
