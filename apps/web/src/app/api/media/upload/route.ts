import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, AppError, errorResponse } from "@/server/errors";
import { createUploadedMedia, findIdempotentMedia, requireOwnedActiveProject } from "@/server/media";
import { consumeMediaRequest } from "@/server/rate-limit";
import { requireRequestSession } from "@/server/session";
import { finalizePrivateUpload, maxUploadBytes, receiveMultipartUpload, removeStorageKey } from "@/server/storage";

export const runtime = "nodejs";

function idempotencyKey(request: NextRequest): string | null {
  const value = request.headers.get("idempotency-key")?.trim() ?? null;
  if (value && !/^[a-zA-Z0-9._-]{8,128}$/.test(value)) throw new AppError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency key tidak valid.");
  return value;
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { user } = await requireRequestSession(request);
    await consumeMediaRequest(user.id);
    const key = idempotencyKey(request);
    const existing = await findIdempotentMedia(user, key);
    if (existing) return NextResponse.json({ media: existing, idempotent: true });
    const received = await receiveMultipartUpload(request, maxUploadBytes());
    try {
      await requireOwnedActiveProject(user, received.projectId);
      const storageKey = await finalizePrivateUpload({ tempKey: received.tempKey, userId: user.id, projectId: received.projectId, extension: received.detected.extension });
      const result = await createUploadedMedia(user, {
        projectId: received.projectId, originalName: received.originalName || `upload.${received.detected.extension}`, storageKey,
        mimeType: received.detected.mimeType, sizeBytes: received.sizeBytes, sha256: received.sha256, idempotencyKey: key,
      });
      return NextResponse.json(result, { status: 202 });
    } catch (error) {
      await removeStorageKey(received.tempKey);
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
