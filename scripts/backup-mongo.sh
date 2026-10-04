#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${1:-$ROOT_DIR/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$BACKUP_DIR/displayhub-$TIMESTAMP"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

mkdir -p "$OUT_DIR"

if ! docker ps --format '{{.Names}}' | grep -q '^displayhub-mongodb$'; then
  echo "Container displayhub-mongodb not running"
  exit 1
fi

AUTH_ARGS=()
if [[ -n "${MONGO_ROOT_USER:-}" && -n "${MONGO_ROOT_PASSWORD:-}" ]]; then
  AUTH_ARGS=(-u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin)
fi

docker exec displayhub-mongodb mongodump "${AUTH_ARGS[@]}" --out "/tmp/displayhub-dump"
docker cp displayhub-mongodb:/tmp/displayhub-dump "$OUT_DIR"
docker exec displayhub-mongodb rm -rf /tmp/displayhub-dump
echo "Backup written to $OUT_DIR"
