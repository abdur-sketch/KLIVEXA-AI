import "dotenv/config";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { POST as register } from "@/app/api/auth/register/route";
import { db } from "./db";
import { verifyPassword } from "./password";
import { rateLimitIdentifier } from "./rate-limit";
import { ensureRedis } from "./redis";

const marker = randomUUID();
const email = `register-${marker}@test.local`;
const source = `integration-${marker}`;

describe("registration integration", () => {
  afterAll(async () => {
    await db.user.deleteMany({ where: { email } });
    const client = await ensureRedis();
    await client.del(`klivexa:auth:login:${rateLimitIdentifier(`register:${source}`)}`);
    await db.$disconnect();
  });

  it("creates an Argon2id user and database session cookie", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { origin: "http://localhost:3000", host: "localhost:3000", "x-forwarded-for": source, "content-type": "application/json" },
      body: JSON.stringify({ name: "Integration User", email, password: "Integration!123" }),
    });
    const response = await register(request);
    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toMatch(/klivexa_session=.*HttpOnly.*SameSite=lax/i);
    const user = await db.user.findUniqueOrThrow({ where: { email }, select: { passwordHash: true, sessions: true } });
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(user.passwordHash, "Integration!123")).toBe(true);
    expect(user.sessions).toHaveLength(1);
  });
});
