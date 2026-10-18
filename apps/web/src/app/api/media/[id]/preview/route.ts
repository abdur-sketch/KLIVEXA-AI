import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { AppError, errorResponse } from "@/server/errors";
import { getMedia } from "@/server/media";
import { consumeRateLimit } from "@/server/rate-limit";
import { requireRequestSession } from "@/server/session";
import { resolveStorageKey } from "@/server/storage";

export const runtime = "nodejs";

function parseRange(value: string | null, size: number): { start: number; end: number } | null {
  if (!value) return null;
  const match = /^bytes=(\d+)-(\d*)$/.exec(value);
  if (!match) throw new AppError(416, "INVALID_RANGE", "Range video tidak valid.");
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : Math.min(size - 1, start + 4 * 1024 * 1024 - 1);
  const end = Math.min(requestedEnd, size - 1);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) {
    throw new AppError(416, "INVALID_RANGE", "Range video berada di luar file.");
  }
  return { start, end };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRequestSession(request);
    await consumeRateLimit("media-preview", user.id, 300, 60);
    const { id } = await context.params;
    const asset = await getMedia(user, id);
    if (!asset.storageKey || asset.status !== "READY") throw new AppError(409, "MEDIA_NOT_READY", "Video belum siap dipratinjau.");
    const filePath = resolveStorageKey(asset.storageKey);
    const info = await stat(filePath);
    if (!info.isFile()) throw new AppError(404, "MEDIA_FILE_NOT_FOUND", "File media tidak ditemukan.");
    const range = parseRange(request.headers.get("range"), info.size);
    const start = range?.start ?? 0;
    const end = range?.end ?? info.size - 1;
    const body = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
    return new Response(body, {
      status: range ? 206 : 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Type": asset.mimeType ?? "application/octet-stream",
        "Content-Length": String(end - start + 1),
        ...(range ? { "Content-Range": `bytes ${start}-${end}/${info.size}` } : {}),
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; media-src 'self'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) { return errorResponse(error); }
}
