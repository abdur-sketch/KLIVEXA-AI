import { readFile } from "node:fs/promises";
import type { NextRequest } from "next/server";
import { AppError, errorResponse } from "@/server/errors";
import { getMedia } from "@/server/media";
import { consumeMediaRead } from "@/server/rate-limit";
import { requireRequestSession } from "@/server/session";
import { resolveStorageKey } from "@/server/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRequestSession(request);
    await consumeMediaRead(user.id);
    const { id } = await context.params;
    const asset = await getMedia(user, id);
    if (!asset.thumbnailKey) throw new AppError(404, "THUMBNAIL_NOT_FOUND", "Thumbnail tidak ditemukan.");
    const bytes = await readFile(resolveStorageKey(asset.thumbnailKey));
    return new Response(bytes, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return errorResponse(error); }
}
