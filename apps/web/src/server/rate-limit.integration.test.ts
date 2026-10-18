import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { consumeLoginAttempt, rateLimitIdentifier } from "./rate-limit";
import { ensureRedis } from "./redis";

const identifier = `rate-limit-${randomUUID()}`;

describe("Redis brute-force protection", () => {
  afterAll(async () => {
    const client = await ensureRedis();
    await client.del(`klivexa:auth:login:${rateLimitIdentifier(identifier)}`);
  });

  it("blocks attempts after the configured limit", async () => {
    const results = [];
    for (let attempt = 0; attempt < 6; attempt += 1) results.push(await consumeLoginAttempt(identifier));
    expect(results.slice(0, 5).every((result) => result.allowed)).toBe(true);
    expect(results[5].allowed).toBe(false);
    expect(results[5].retryAfter).toBeGreaterThan(0);
  });
});
