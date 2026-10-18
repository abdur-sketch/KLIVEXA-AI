#!/usr/bin/env bash
set -euo pipefail

pg_isready
docker exec klivexa-redis redis-cli ping
psql "postgresql://klivexa:klivexa_local@localhost:5432/klivexa" -Atqc "select 'postgres:ok'"
