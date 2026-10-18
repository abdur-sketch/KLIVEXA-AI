# Phase 2 — Video Import & Media Processing Foundation

Phase 2 adds a local-only ingestion layer without enabling AI clipping.

## Implemented

- strict HTTPS YouTube URL parsing and canonical video IDs
- metadata-only YouTube oEmbed job with a fixed upstream host
- streamed MP4/MOV/WebM uploads with mandatory content length, configurable byte limit, SHA-256, magic-byte checks, and FFprobe verification
- private user/project storage with randomized names and traversal-safe path resolution
- BullMQ processing with PostgreSQL job state, progress, three attempts, exponential backoff, timeouts, and bounded concurrency
- thumbnail generation with one FFmpeg thread
- authenticated list, detail, metadata, preview with byte ranges, thumbnail, delete, and job-status endpoints
- media library and dashboard counts backed by PostgreSQL
- audit events, idempotency keys, temporary-file cleanup, archive-aware project ownership, and soft deletion

## Security boundaries

- default-deny RBAC is extended with media permissions
- non-admin media reads are always scoped by `userId`
- creation requires an active project owned by the current user
- state changes require a same-origin request
- Redis rate limiting fails closed if protection is unavailable
- uploads are not archive-extracted, preventing zip-bomb expansion
- unknown signatures, multiple files, excessive form parts, oversized bodies, missing content length, and invalid FFprobe output are rejected
- stored paths are generated server-side and must resolve beneath the configured storage root
- private files are served only through authenticated handlers with `nosniff` and private cache headers

## Run locally

Run the web app and worker in separate terminals:

```bash
npm run worker:media
npm run dev
```

Open `http://localhost:3000/media`.

The AI Clipper remains a demo. Transcription and highlight detection belong to Phase 3.
