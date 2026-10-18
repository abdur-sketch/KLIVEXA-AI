import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/server/audit";
import { db } from "@/server/db";
import { AppError, assertSameOrigin, errorResponse, parseJson } from "@/server/errors";
import { verifyPassword } from "@/server/password";
import { consumeLoginAttempt, rateLimitIdentifier, resetLoginAttempts } from "@/server/rate-limit";
import { createSession, setSessionCookie } from "@/server/session";
import { loginSchema } from "@/server/validation";

const DUMMY_PASSWORD_HASH = "$argon2id$v=19$m=19456,t=2,p=1$hCbmve3onRQ7j/HYSHzSyw$LDvKpKLSJYTDLdfjsAkMqR8J4e9lh35pXv0LQ+zniYY";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const input = loginSchema.parse(await parseJson(request));
    const source = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limit = await consumeLoginAttempt(`${input.email}:${source}`);
    if (!limit.allowed) throw new AppError(429, "RATE_LIMITED", `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfter} detik.`);

    const user = await db.user.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, email: true, role: true, isActive: true, passwordHash: true },
    });
    const passwordMatches = await verifyPassword(user?.passwordHash ?? DUMMY_PASSWORD_HASH, input.password);
    const valid = Boolean(user?.isActive && passwordMatches);
    if (!user || !valid) {
      await writeAuditLog({
        userId: user?.id,
        action: "auth.login_failed",
        resource: "session",
        metadata: { identifierHash: rateLimitIdentifier(input.email), remaining: limit.remaining },
      });
      throw new AppError(401, "INVALID_CREDENTIALS", "Email atau password salah.");
    }

    const session = await createSession(user.id, request);
    await resetLoginAttempts(limit.key);
    await writeAuditLog({ userId: user.id, action: "auth.login_succeeded", resource: "session", resourceId: session.id });
    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
