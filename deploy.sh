#!/usr/bin/env bash
set -euo pipefail

SKIP_MONGO_CHECK="${SKIP_MONGO_CHECK:-0}"

run_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return 0
  fi
  echo "[deploy] 未找到 docker compose（或 docker-compose）" >&2
  exit 1
}

run_compose up -d --build
run_compose ps

if [[ "$SKIP_MONGO_CHECK" != "1" ]]; then
  if ! run_compose exec -T backend python - <<'PY'
from __future__ import annotations

from pymongo import MongoClient

from app.config import get_settings

s = get_settings()
if getattr(s, "MOCK_MODE", False):
    raise SystemExit(0)

uri = s.mongo_uri
client = MongoClient(uri, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000)
client.admin.command("ping")
print("mongo ping ok")
PY
  then
    run_compose logs --tail 200 backend
    exit 1
  fi
fi
