import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Data yang dikirim tidak valid.", details: error.flatten() } },
      { status: 422 },
    );
  }

  console.error("Unhandled application error", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan internal." } },
    { status: 500 },
  );
}

export async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "Body harus berupa JSON yang valid.");
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const allowedOrigins = new Set([
    requestUrl.origin,
    process.env.NEXT_PUBLIC_APP_URL,
    host ? `${protocol}://${host}` : undefined,
  ].filter((value): value is string => Boolean(value)));
  if (!origin || !allowedOrigins.has(origin)) {
    throw new AppError(403, "INVALID_ORIGIN", "Permintaan lintas-origin ditolak.");
  }
}
