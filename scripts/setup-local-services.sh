#!/usr/bin/env bash
set -euo pipefail

KLIVEXA_DB_NAME="klivexa"
KLIVEXA_DB_USER="klivexa"
KLIVEXA_DB_PASSWORD="klivexa_local"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required for the Docker Compose fallback."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  brew install postgresql@16
fi

if ! pg_isready >/dev/null 2>&1; then
  brew services start postgresql@16
fi

if ! docker info >/dev/null 2>&1; then
  if command -v colima >/dev/null 2>&1; then
    colima start --cpu 2 --memory 2 --disk 20
  else
    echo "Redis requires a running Docker daemon or Colima."
    exit 1
  fi
fi

if docker container inspect klivexa-redis >/dev/null 2>&1; then
  docker start klivexa-redis >/dev/null
else
  docker run -d --name klivexa-redis --restart unless-stopped \
    -p 127.0.0.1:6379:6379 -v klivexa_redis:/data \
    redis:7-alpine redis-server --appendonly yes >/dev/null
fi

if [ "$(psql -d postgres -Atqc "select 1 from pg_roles where rolname='${KLIVEXA_DB_USER}'")" != "1" ]; then
  psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE ${KLIVEXA_DB_USER} LOGIN PASSWORD '${KLIVEXA_DB_PASSWORD}' CREATEDB"
fi

if [ "$(psql -d postgres -Atqc "select 1 from pg_database where datname='${KLIVEXA_DB_NAME}'")" != "1" ]; then
  createdb -O "${KLIVEXA_DB_USER}" "${KLIVEXA_DB_NAME}"
fi

docker exec klivexa-redis redis-cli ping
echo "KLIVEXA PostgreSQL and Redis services are ready."
