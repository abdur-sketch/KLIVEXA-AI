import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { UserRole } from "@klivexa/database";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { isSessionActive, sessionTtlSeconds } from "@/lib/session-policy";

export const SESSION_COOKIE = "klivexa_session";

export type SessionUser = { id: string; name: string | null; email: string; role: UserRole };
export type ActiveSession = { sessionId: string; expiresAt: Date; user: SessionUser };

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, request: NextRequest): Promise<{ id: string; token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlSeconds() * 1_000);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");

  const created = await db.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
      userAgent: request.headers.get("user-agent")?.slice(0, 512),
      ipHash: createHash("sha256").update(`${secret}:${forwarded}`).digest("hex"),
    },
  });
  return { id: created.id, token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function validateSessionToken(token?: string): Promise<ActiveSession | null> {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  });
  if (!session || !session.user.isActive || !isSessionActive(session.expiresAt, session.revokedAt)) return null;
  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    user: { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role },
  };
}

export async function getRequestSession(request: NextRequest): Promise<ActiveSession | null> {
  return validateSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function requireRequestSession(request: NextRequest): Promise<ActiveSession> {
  const session = await getRequestSession(request);
  if (!session) throw new AppError(401, "UNAUTHENTICATED", "Silakan login untuk melanjutkan.");
  return session;
}

export async function getPageSession(): Promise<ActiveSession | null> {
  const cookieStore = await cookies();
  return validateSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requirePageSession(): Promise<ActiveSession> {
  const session = await getPageSession();
  if (!session) redirect("/login");
  return session;
}

export async function revokeSession(token?: string): Promise<void> {
  if (!token) return;
  await db.session.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
