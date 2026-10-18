import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as uploadMedia } from "@/app/api/media/upload/route";
import { db } from "./db";
import { ensureRedis } from "./redis";
import { rateLimitIdentifier } from "./rate-limit";
import { hashSessionToken, SESSION_COOKIE } from "./session";

const marker = randomUUID();
const email = `invalid-upload-${marker}@test.local`;
let token: string;
let projectId: string;
let userId: string;

describe("media upload rejection integration", () => {
  beforeAll(async () => {
    const user = await db.user.create({ data: { email, passwordHash: "integration-only" } });
    userId = user.id;
    projectId = (await db.project.create({ data: { userId, title: "Invalid upload project" } })).id;
    token = randomBytes(32).toString("base64url");
    await db.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 60_000) } });
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email } });
    const redis = await ensureRedis();
    await redis.del(`klivexa:media:${rateLimitIdentifier(userId)}`);
    await db.$disconnect();
  });

  it("rejects a renamed executable by magic bytes without creating media", async () => {
    const form = new FormData();
    form.set("projectId", projectId);
    form.set("file", new File([new TextEncoder().encode("MZ fake executable")], "malware.mp4", { type: "video/mp4" }));
    const request = new NextRequest("http://localhost:3000/api/media/upload", {
      method: "POST",
      headers: { origin: "http://localhost:3000", host: "localhost:3000", cookie: `${SESSION_COOKIE}=${token}`, "content-length": "1024" },
      body: form,
    });
    const response = await uploadMedia(request);
    expect(response.status).toBe(415);
    expect((await response.json()).error.code).toBe("INVALID_VIDEO_SIGNATURE");
    expect(await db.mediaAsset.count({ where: { userId } })).toBe(0);
  });
});
