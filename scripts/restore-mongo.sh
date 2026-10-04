#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DUMP_PATH="${1:-}"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

if [[ -z "$DUMP_PATH" || ! -d "$DUMP_PATH" ]]; then
  echo "Usage: $0 /path/to/displayhub-dump"
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
echo "Restore completed from $DUMP_PATH"
