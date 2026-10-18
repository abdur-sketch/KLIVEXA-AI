import { Prisma } from "@klivexa/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { assertSameOrigin, errorResponse, AppError, parseJson } from "@/server/errors";
import { hashPassword } from "@/server/password";
import { consumeLoginAttempt } from "@/server/rate-limit";
import { createSession, setSessionCookie } from "@/server/session";
import { registerSchema } from "@/server/validation";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const input = registerSchema.parse(await parseJson(request));
    const source = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limit = await consumeLoginAttempt(`register:${source}`);
    if (!limit.allowed) throw new AppError(429, "RATE_LIMITED", `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfter} detik.`);

    const passwordHash = await hashPassword(input.password);
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: input.name, email: input.email, passwordHash },
        select: { id: true, name: true, email: true, role: true },
      });
      await tx.auditLog.create({ data: { userId: created.id, action: "auth.registered", resource: "user", resourceId: created.id } });
      return created;
    });

    const session = await createSession(user.id, request);
    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse(new AppError(409, "EMAIL_EXISTS", "Email sudah terdaftar."));
    }
    return errorResponse(error);
  }
}
