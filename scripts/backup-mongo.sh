#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${1:-$ROOT_DIR/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$BACKUP_DIR/displayhub-$TIMESTAMP"

mkdir -p "$OUT_DIR"

if docker ps --format '{{.Names}}' | grep -q '^displayhub-mongodb$'; then
  docker exec displayhub-mongodb mongodump --out "/tmp/displayhub-dump"
  docker cp displayhub-mongodb:/tmp/displayhub-dump "$OUT_DIR"
  docker exec displayhub-mongodb rm -rf /tmp/displayhub-dump
  echo "Backup written to $OUT_DIR"
else
  echo "Container displayhub-mongodb not running"
  exit 1
fi
