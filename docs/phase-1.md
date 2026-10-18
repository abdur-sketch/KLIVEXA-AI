# Phase 1 — Authentication, Database & Project Management

## Implemented

- registration, login, logout, opaque database sessions, expiry, and revocation
- Argon2id password hashing and timing-resistant invalid-user login verification
- Redis fixed-window brute-force protection
- profile update with role-aware access checks
- default-deny RBAC and ownership filtering in the data access layer
- PostgreSQL-backed project creation, editing, archive/restore, and soft deletion
- real dashboard statistics and recent-project data
- audit events for authentication, profile, and project mutations
- database and Redis health endpoint at `/api/health`
- idempotent synthetic seed and non-destructive local service scripts
- unit, database integration, and Chrome E2E suites for desktop/mobile

## Deliberately deferred

Video upload/import, transcription, highlight detection, rendering, social OAuth, and publishing are not active. The AI Clipper remains a Phase 0 interaction mock and is visibly labeled as such.

## Data boundaries

Regular users can only query or mutate projects where `project.userId` matches the database-backed session user. Cross-user identifiers resolve as not found. Administrators receive explicit `*:any` grants; all unlisted permissions are denied.

## Local infrastructure

Docker Compose is optional. The verified fallback uses the existing Homebrew PostgreSQL 16 service and an official Redis 7 container through Colima. Setup scripts create only the dedicated `klivexa` role/database and `klivexa-redis` container/volume when absent; they never drop or truncate existing data.
