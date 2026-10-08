#!/usr/bin/env bash
# Run ONCE against an existing Mongo volume while authorization is OFF
# (docker-compose.prod.mongo-bootstrap.yml), then enable auth and restart
# with docker-compose.prod.yml.
#
# Usage:
#   docker compose -f docker-compose.prod.yml -f docker-compose.prod.mongo-bootstrap.yml up -d DisplayHub-mongodb
#   set -a && source .env && set +a
#   ./scripts/bootstrap-existing-mongo-auth.sh
#   docker compose -f docker-compose.prod.yml -f docker-compose.prod.mongo-bootstrap.yml down
#   docker compose -f docker-compose.prod.yml up -d

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
  echo "Mongo is not reachable without credentials inside $CONTAINER." >&2
  echo "Start it with the bootstrap override (auth OFF):" >&2
  echo "  docker compose -f docker-compose.prod.yml -f docker-compose.prod.mongo-bootstrap.yml up -d DisplayHub-mongodb" >&2
  exit 1
fi

echo "Ensuring root user matches MONGO_ROOT_USER / MONGO_ROOT_PASSWORD..."
RESULT="$(
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
const existing = admin.getUser(user);
if (existing) {
  admin.changeUserPassword(user, pwd);
  print("root password updated");
} else {
  try {
    admin.createUser({
      user,
      pwd,
      roles: [{ role: "root", db: "admin" }],
    });
    print("root created");
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes("requires authentication")) {
      print("ERROR_AUTH_REQUIRED");
    } else {
      throw e;
    }
  }
}
'
)"
echo "$RESULT"

if [[ "$RESULT" == *"ERROR_AUTH_REQUIRED"* ]]; then
  echo "Mongo requires authentication. Restart WITHOUT auth first:" >&2
  echo "  docker compose -f docker-compose.prod.yml -f docker-compose.prod.mongo-bootstrap.yml up -d DisplayHub-mongodb" >&2
  exit 1
fi

echo "Verifying credentials..."
docker exec -i "$CONTAINER" mongosh --quiet \
  -u "$ROOT_USER" \
  -p "$ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --eval 'db.adminCommand("ping").ok' >/dev/null

echo "Done. Root user is ready."
echo "Next:"
echo "  docker compose -f docker-compose.prod.yml -f docker-compose.prod.mongo-bootstrap.yml down"
echo "  docker compose -f docker-compose.prod.yml up -d"
