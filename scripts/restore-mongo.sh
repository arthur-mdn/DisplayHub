#!/usr/bin/env bash
set -euo pipefail

DUMP_PATH="${1:-}"
if [[ -z "$DUMP_PATH" || ! -d "$DUMP_PATH" ]]; then
  echo "Usage: $0 /path/to/displayhub-dump"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q '^displayhub-mongodb$'; then
  echo "Container displayhub-mongodb not running"
  exit 1
fi

docker cp "$DUMP_PATH" displayhub-mongodb:/tmp/displayhub-restore
docker exec displayhub-mongodb mongorestore --drop /tmp/displayhub-restore
docker exec displayhub-mongodb rm -rf /tmp/displayhub-restore
echo "Restore completed from $DUMP_PATH"
