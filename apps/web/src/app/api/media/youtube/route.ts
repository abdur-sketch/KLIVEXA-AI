import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, AppError, errorResponse, parseJson } from "@/server/errors";
import { createYouTubeMedia, findIdempotentMedia } from "@/server/media";
import { consumeMediaRequest } from "@/server/rate-limit";
import { requireRequestSession } from "@/server/session";
import { youtubeImportSchema } from "@/server/validation";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { user } = await requireRequestSession(request);
    await consumeMediaRequest(user.id);
    const key = request.headers.get("idempotency-key")?.trim() ?? null;
    if (key && !/^[a-zA-Z0-9._-]{8,128}$/.test(key)) throw new AppError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency key tidak valid.");
    const existing = await findIdempotentMedia(user, key);
    if (existing) return NextResponse.json({ media: existing, idempotent: true });
    const input = youtubeImportSchema.parse(await parseJson(request));
    return NextResponse.json(await createYouTubeMedia(user, { projectId: input.projectId, url: input.url, idempotencyKey: key }), { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
