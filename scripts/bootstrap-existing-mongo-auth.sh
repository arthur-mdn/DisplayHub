#!/usr/bin/env bash
# Run ONCE against an existing Mongo volume while authorization is OFF
# (or while the localhost exception still applies), then enable auth in
# mongo/mongod.prod.conf and restart with docker-compose.prod.yml.
#
# Usage (from repo root, mongo running without auth):
#   set -a && source .env && set +a
#   ./scripts/bootstrap-existing-mongo-auth.sh
#
# Or with an explicit bootstrap compose override:
#   docker compose -f docker-compose.prod.yml -f docker-compose.prod.mongo-bootstrap.yml up -d DisplayHub-mongodb
#   set -a && source .env && set +a
#   ./scripts/bootstrap-existing-mongo-auth.sh

set -euo pipefail

ROOT_USER="${MONGO_ROOT_USER:?MONGO_ROOT_USER required}"
ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD required}"
CONTAINER="${MONGO_CONTAINER:-displayhub-mongodb}"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Container not found: $CONTAINER" >&2
  echo "Set MONGO_CONTAINER or start DisplayHub-mongodb first." >&2
  exit 1
fi

echo "Waiting for Mongo to accept connections..."
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" mongosh --quiet --eval 'db.adminCommand("ping").ok' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! docker exec "$CONTAINER" mongosh --quiet --eval 'db.adminCommand("ping").ok' >/dev/null 2>&1; then
  echo "Mongo is not reachable inside $CONTAINER" >&2
  exit 1
fi

echo "Creating root user on admin (no-op if already present)..."
ROOT_OUT="$(
  docker exec -i \
    -e BOOTSTRAP_USER="$ROOT_USER" \
    -e BOOTSTRAP_PASSWORD="$ROOT_PASSWORD" \
    "$CONTAINER" mongosh --quiet --eval '
const user = process.env.BOOTSTRAP_USER;
const pwd = process.env.BOOTSTRAP_PASSWORD;
if (!user || !pwd) {
  throw new Error("missing BOOTSTRAP_USER or BOOTSTRAP_PASSWORD");
}
const admin = db.getSiblingDB("admin");
try {
  admin.createUser({
    user,
    pwd,
    roles: [{ role: "root", db: "admin" }],
  });
  print("root created");
} catch (e) {
  const msg = String(e.message || e);
  if (msg.includes("already exists")) {
    print("root already exists");
  } else {
    throw e;
  }
}
'
)"
echo "$ROOT_OUT"

echo "Verifying credentials..."
docker exec -i "$CONTAINER" mongosh --quiet \
  -u "$ROOT_USER" \
  -p "$ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --eval 'db.adminCommand("ping").ok' >/dev/null

echo "Done."
echo "Next:"
echo "  1. Confirm MONGO_ROOT_USER / MONGO_ROOT_PASSWORD in .env"
echo "  2. Stop the bootstrap override if used"
echo "  3. docker compose -f docker-compose.prod.yml up -d"
