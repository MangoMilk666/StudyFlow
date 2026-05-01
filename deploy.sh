#!/usr/bin/env bash
set -euo pipefail

if docker compose version >/dev/null 2>&1; then
  docker compose up -d --build
  docker compose ps
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose up -d --build
  docker-compose ps
else
  echo "[deploy] 未找到 docker compose（或 docker-compose）" >&2
  exit 1
fi
