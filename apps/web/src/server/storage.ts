import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import Busboy from "busboy";
import { AppError } from "@/server/errors";

function findWorkspaceRoot(): string {
  let current = process.cwd();
  while (path.dirname(current) !== current) {
    if (existsSync(path.join(current, "packages", "database")) && existsSync(path.join(current, "apps", "web"))) return current;
    current = path.dirname(current);
  }
  throw new Error("KLIVEXA workspace root was not found");
}

export function mediaStorageRoot(): string {
  return path.resolve(findWorkspaceRoot(), process.env.MEDIA_STORAGE_PATH ?? "storage");
}

export function resolveStorageKey(storageKey: string): string {
  if (!/^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/.test(storageKey)) throw new AppError(400, "UNSAFE_STORAGE_KEY", "Lokasi media tidak valid.");
  const root = mediaStorageRoot();
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new AppError(400, "PATH_TRAVERSAL_BLOCKED", "Lokasi media ditolak.");
  return resolved;
}

export type DetectedVideo = { extension: "mp4" | "mov" | "webm"; mimeType: "video/mp4" | "video/quicktime" | "video/webm" };

export function detectVideoMagic(buffer: Uint8Array): DetectedVideo | null {
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { extension: "webm", mimeType: "video/webm" };
  }
  if (buffer.length >= 12 && String.fromCharCode(...buffer.slice(4, 8)) === "ftyp") {
    const brand = String.fromCharCode(...buffer.slice(8, 12));
    if (brand === "qt  ") return { extension: "mov", mimeType: "video/quicktime" };
    return { extension: "mp4", mimeType: "video/mp4" };
  }
  return null;
}

export function maxUploadBytes(): number {
  const parsed = Number(process.env.MEDIA_MAX_UPLOAD_BYTES ?? 500 * 1024 * 1024);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 500 * 1024 * 1024;
}

export async function receiveMultipartUpload(request: Request, maxBytes = maxUploadBytes()): Promise<{
  projectId: string;
  originalName: string;
  tempKey: string;
  detected: DetectedVideo;
  sizeBytes: number;
  sha256: string;
}> {
  if (!request.body) throw new AppError(400, "EMPTY_UPLOAD", "Body upload kosong.");
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) throw new AppError(415, "INVALID_MULTIPART", "Upload harus menggunakan multipart/form-data.");
  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) throw new AppError(411, "CONTENT_LENGTH_REQUIRED", "Content-Length upload wajib dan harus valid.");
  if (contentLength > maxBytes + 1_048_576) throw new AppError(413, "UPLOAD_TOO_LARGE", `Ukuran maksimum upload adalah ${maxBytes} byte.`);

  const uploadId = randomUUID();
  const tempKey = `tmp/${uploadId}.upload`;
  const tempPath = resolveStorageKey(tempKey);
  await mkdir(path.dirname(tempPath), { recursive: true, mode: 0o700 });
  let projectId = "";
  let originalName = "";
  let fileSeen = false;
  let sizeBytes = 0;
  let limited = false;
  let parseError: Error | null = null;
  const hash = createHash("sha256");
  const signatureChunks: Buffer[] = [];
  let signatureLength = 0;
  const writes: Promise<void>[] = [];

  try {
    const parser = Busboy({
      headers: Object.fromEntries(request.headers.entries()),
      limits: { fileSize: maxBytes, files: 1, fields: 4, parts: 5, fieldSize: 2_048 },
    });
    const parsed = new Promise<void>((resolve, reject) => {
      parser.on("field", (name, value) => {
        if (name === "projectId") projectId = value.trim();
      });
      parser.on("file", (name, stream, info) => {
        if (name !== "file" || fileSeen) {
          parseError = new AppError(422, "UNEXPECTED_FILE", "Hanya satu field file yang diperbolehkan.");
          stream.resume();
          return;
        }
        fileSeen = true;
        originalName = path.basename(info.filename || "upload").slice(0, 255);
        stream.once("limit", () => { limited = true; });
        const inspector = new Transform({
          transform(chunk: Buffer, _encoding, callback) {
            sizeBytes += chunk.length;
            hash.update(chunk);
            if (signatureLength < 64) {
              const slice = chunk.subarray(0, Math.min(chunk.length, 64 - signatureLength));
              signatureChunks.push(slice);
              signatureLength += slice.length;
            }
            callback(null, chunk);
          },
        });
        writes.push(pipeline(stream, inspector, createWriteStream(tempPath, { flags: "wx", mode: 0o600 })));
      });
      parser.once("error", reject);
      parser.once("filesLimit", () => { parseError = new AppError(422, "TOO_MANY_FILES", "Hanya satu file yang diperbolehkan."); });
      parser.once("partsLimit", () => { parseError = new AppError(422, "TOO_MANY_PARTS", "Form upload terlalu kompleks."); });
      parser.once("close", resolve);
    });
    Readable.from(request.body as unknown as AsyncIterable<Uint8Array>).pipe(parser);
    await parsed;
    await Promise.all(writes);
    if (parseError) throw parseError;
    if (!projectId) throw new AppError(422, "PROJECT_REQUIRED", "Project wajib dipilih.");
    if (!fileSeen || sizeBytes === 0) throw new AppError(422, "FILE_REQUIRED", "File video wajib dipilih.");
    if (limited || sizeBytes > maxBytes) throw new AppError(413, "UPLOAD_TOO_LARGE", `Ukuran maksimum upload adalah ${maxBytes} byte.`);
    const detected = detectVideoMagic(Buffer.concat(signatureChunks));
    if (!detected) throw new AppError(415, "INVALID_VIDEO_SIGNATURE", "Magic bytes bukan MP4, MOV, atau WebM yang didukung.");
    return { projectId, originalName, tempKey, detected, sizeBytes, sha256: hash.digest("hex") };
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

export async function finalizePrivateUpload(input: {
  tempKey: string;
  userId: string;
  projectId: string;
  extension: DetectedVideo["extension"];
}): Promise<string> {
  const finalKey = `media/${input.userId}/${input.projectId}/${randomUUID()}.${input.extension}`;
  const finalPath = resolveStorageKey(finalKey);
  await mkdir(path.dirname(finalPath), { recursive: true, mode: 0o700 });
  await rename(resolveStorageKey(input.tempKey), finalPath);
  return finalKey;
}

export async function removeStorageKey(storageKey: string | null): Promise<void> {
  if (!storageKey) return;
  await unlink(resolveStorageKey(storageKey)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}
