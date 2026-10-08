#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INPUT_PATH="${1:-}"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

if [[ -z "$INPUT_PATH" || ! -d "$INPUT_PATH" ]]; then
  echo "Usage: $0 /path/to/displayhub-YYYYMMDD-HHMMSS[/displayhub-dump]"
  exit 1
fi

BACKUP_ROOT="$INPUT_PATH"
DUMP_PATH="$INPUT_PATH"
if [[ "$(basename "$INPUT_PATH")" == "displayhub-dump" ]]; then
  BACKUP_ROOT="$(dirname "$INPUT_PATH")"
elif [[ -d "$INPUT_PATH/displayhub-dump" ]]; then
  DUMP_PATH="$INPUT_PATH/displayhub-dump"
fi

if [[ ! -d "$DUMP_PATH" ]]; then
  echo "Mongo dump not found at $DUMP_PATH"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q '^displayhub-mongodb$'; then
  echo "Container displayhub-mongodb not running"
  exit 1
fi

AUTH_ARGS=()
if [[ -n "${MONGO_ROOT_USER:-}" && -n "${MONGO_ROOT_PASSWORD:-}" ]]; then
  AUTH_ARGS=(-u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin)
fi

docker cp "$DUMP_PATH" displayhub-mongodb:/tmp/displayhub-restore
docker exec displayhub-mongodb mongorestore "${AUTH_ARGS[@]}" --drop /tmp/displayhub-restore
docker exec displayhub-mongodb rm -rf /tmp/displayhub-restore

if [[ -d "$BACKUP_ROOT/uploads" ]]; then
  mkdir -p "$ROOT_DIR/server/uploads"
  cp -a "$BACKUP_ROOT/uploads/." "$ROOT_DIR/server/uploads/"
fi
if [[ -d "$BACKUP_ROOT/public" ]]; then
  mkdir -p "$ROOT_DIR/server/public"
  cp -a "$BACKUP_ROOT/public/." "$ROOT_DIR/server/public/"
fi

echo "Restore completed from $BACKUP_ROOT (mongo + uploads/public if present)"
