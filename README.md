# KLIVEXA AI

Local-first foundation for a premium AI video clipping and content automation studio.

> Phase 2 status: private media upload, YouTube metadata import, BullMQ processing, FFprobe inspection, thumbnails, and the media library are functional locally. AI Clipper remains an explicitly labeled demo.

## Requirements (macOS)

- Node.js 22+
- npm 10+
- Docker-compatible runtime (Docker Desktop or Colima); Docker Compose is optional
- Python 3.11–3.13 (the worker dependencies do not yet support every newer Python release)
- FFmpeg (`brew install ffmpeg`)

## Start locally

```bash
cp .env.example .env
npm install
npm run services:setup
npm run db:generate
npm run db:deploy
npm run db:seed
npm run worker:media # terminal 1
npm run dev          # terminal 2
```

Open [http://localhost:3000](http://localhost:3000). PostgreSQL and Redis must be healthy for authentication and Phase 2 features.

Development accounts created by the idempotent seed:

- `admin@klivexa.local` / `ChangeMe!Phase1`
- `creator@klivexa.local` / `Creator!Phase1`

These credentials are local development data only and must never be used in production.

### Infrastructure options

`docker-compose.yml` remains available when Docker Compose is installed. On this machine, the verified fallback is Homebrew PostgreSQL 16 plus an official Redis 7 container running through Colima. `npm run services:setup` is idempotent: it preserves existing roles, databases, containers, volumes, and records.

## AI worker preparation

Use a Python version supported by `faster-whisper` and OpenCV, then:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r workers/ai/requirements.txt
(cd workers/ai && python -m worker.main)
```

The Phase 0 worker only performs dependency and FFmpeg readiness checks. It does not process media.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Local services

| Service | Port | Purpose |
| --- | ---: | --- |
| Web | 3000 | Next.js app and authenticated API |
| PostgreSQL | 5432 | users, projects, transcripts, clips, jobs |
| Redis | 6379 | rate limiting, BullMQ queues, progress, and retries |

## Repository map

```text
apps/web/          Next.js App Router UI
packages/database/ Prisma schema and client
packages/queue/    BullMQ contracts and queue client
workers/media/     Node.js FFprobe/FFmpeg media worker
workers/ai/        Python worker foundation
docs/              architecture and phase notes
```

## Phase 1 security model

- opaque database sessions in `HttpOnly`, `SameSite=Lax` cookies
- `Secure` cookies in production and HTTP-compatible cookies on localhost
- Argon2id password hashing
- Redis-backed login throttling that fails closed if protection is unavailable
- same-origin checks on state-changing API requests
- default-deny RBAC and ownership-scoped project queries
- archive plus soft deletion; audit logs retain security history

No deployment, paid API, billing, or production integration is included.

## Phase 2 media model

- YouTube URLs are normalized to an 11-character video ID; only HTTPS URLs on known YouTube hosts are accepted.
- The worker requests metadata from YouTube's HTTPS oEmbed endpoint and never downloads YouTube media.
- MP4, MOV, and WebM uploads are streamed to a private temporary file with byte limits, hashing, and magic-byte validation before they enter user/project storage.
- FFprobe verifies the video stream. FFmpeg creates a local thumbnail with one processing thread and a configurable timeout.
- BullMQ jobs have persisted progress, three bounded attempts, exponential backoff, and failure state in PostgreSQL.
- Preview, thumbnail, metadata, job, list, and deletion routes require an authenticated owner or an explicitly granted admin permission.
- Uploaded files use random names under `storage/media/<user>/<project>/`; public static serving is not used.

Phase 2 settings:

```text
MEDIA_MAX_UPLOAD_BYTES=524288000
MEDIA_PROCESS_TIMEOUT_MS=45000
MEDIA_RATE_LIMIT_MAX=20
MEDIA_RATE_LIMIT_WINDOW_SECONDS=3600
```
