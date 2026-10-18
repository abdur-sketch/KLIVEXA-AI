import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionUser } from "./session";
import { db } from "./db";
import { deleteMedia, getMediaDTO, getMediaJob, listMedia } from "./media";

const marker = randomUUID();
let owner: SessionUser;
let outsider: SessionUser;
let assetId: string;
let jobId: string;

describe("media ownership integration", () => {
  beforeAll(async () => {
    const [first, second] = await Promise.all([
      db.user.create({ data: { email: `media-owner-${marker}@test.local`, passwordHash: "integration-only" }, select: { id: true, email: true, name: true, role: true } }),
      db.user.create({ data: { email: `media-outsider-${marker}@test.local`, passwordHash: "integration-only" }, select: { id: true, email: true, name: true, role: true } }),
    ]);
    owner = first; outsider = second;
    const project = await db.project.create({ data: { userId: owner.id, title: "Private media project" } });
    const asset = await db.mediaAsset.create({ data: { userId: owner.id, projectId: project.id, sourceType: "YOUTUBE", status: "READY", youtubeVideoId: "dQw4w9WgXcQ", sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } });
    assetId = asset.id;
    jobId = (await db.mediaProcessingJob.create({ data: { mediaAssetId: asset.id, kind: "FETCH_YOUTUBE_METADATA" } })).id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { in: [`media-owner-${marker}@test.local`, `media-outsider-${marker}@test.local`] } } });
    await db.$disconnect();
  });

  it("lists and reads only the current user's media", async () => {
    expect((await listMedia(owner)).some((item) => item.id === assetId)).toBe(true);
    expect((await listMedia(outsider)).some((item) => item.id === assetId)).toBe(false);
    await expect(getMediaDTO(outsider, assetId)).rejects.toMatchObject({ status: 404 });
  });

  it("conceals job status from another user", async () => {
    expect((await getMediaJob(owner, jobId)).id).toBe(jobId);
    await expect(getMediaJob(outsider, jobId)).rejects.toMatchObject({ status: 404 });
  });

  it("prevents cross-user deletion and soft-deletes for the owner", async () => {
    await expect(deleteMedia(outsider, assetId)).rejects.toMatchObject({ status: 404 });
    await deleteMedia(owner, assetId);
    await expect(getMediaDTO(owner, assetId)).rejects.toMatchObject({ status: 404 });
  });
});
