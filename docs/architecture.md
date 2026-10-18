# Phase 0 architecture

KLIVEXA AI is local-first and separates interactive product UI from long-running media work.

```text
Browser -> Next.js App/API -> PostgreSQL
                    |-----> Redis/BullMQ -> Python worker -> FFmpeg/OpenCV/Whisper
                                                   |-----> local file storage
```

- The Next.js app owns authenticated web/API boundaries, input validation, project access checks, and audit events.
- PostgreSQL stores metadata and paths/object keys, never large video BLOBs.
- Redis/BullMQ will carry bounded retry jobs and progress events.
- The Python worker will transcribe and analyze media; FFmpeg remains the canonical renderer.
- OAuth tokens must be encrypted at rest. Publishing adapters remain disabled until Phase 7.
- Authorization is default-deny: every resource query will be scoped by `userId` and role.

Phase 0 deliberately uses demo data. No UI label implies that video AI or social publishing is operational.

## Phase 2 media flow

```text
Authenticated browser
  -> upload stream / YouTube URL
  -> ownership + rate + origin validation
  -> private storage + PostgreSQL media record
  -> BullMQ / Redis
  -> local media worker
  -> FFprobe + bounded FFmpeg thumbnail OR YouTube metadata-only request
  -> persisted progress/status
  -> authenticated preview and media library
```

YouTube imports store only the canonical URL, video ID, title, and trusted thumbnail URL. They never download or proxy the video file. Local uploads are never placed under `public/`.
