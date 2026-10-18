import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { hashSessionToken, validateSessionToken } from "./session";

const marker = randomUUID();
const email = `session-${marker}@test.local`;
let userId: string;

describe("database session expiry integration", () => {
  beforeAll(async () => {
    userId = (await db.user.create({ data: { email, name: "Session Test", passwordHash: "integration-only" }, select: { id: true } })).id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  });

  it("rejects an expired opaque session", async () => {
    const token = randomBytes(32).toString("base64url");
    await db.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() - 1_000) } });
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("accepts an active opaque session", async () => {
    const token = randomBytes(32).toString("base64url");
    await db.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 60_000) } });
    expect((await validateSessionToken(token))?.user.id).toBe(userId);
  });
});
