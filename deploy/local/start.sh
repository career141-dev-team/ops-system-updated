#!/bin/sh
# Brings up the Ops backend on this laptop and runs the website against it.
# Everything listens on 127.0.0.1. Nothing here can reach a live address.
set -e
cd "$(dirname "$0")/../.." || exit 1

ENVFILE=deploy/local/.env.backend.local
if [ ! -f "$ENVFILE" ]; then
  echo "First run: writing $ENVFILE with fresh local secrets."
  {
    echo "LOCAL_POSTGRES_PASSWORD=$(openssl rand -hex 16)"
    echo "LOCAL_INSTANCE_SECRET=$(openssl rand -hex 32)"
    echo "LOCAL_SESSION_SECRET=$(openssl rand -hex 32)"
  } > "$ENVFILE"
fi

docker compose -f deploy/local/docker-compose.yml --env-file "$ENVFILE" up -d
echo "Waiting for the backend..."
until curl -fs http://127.0.0.1:3310/version > /dev/null 2>&1; do sleep 2; done

if ! grep -q "^LOCAL_ADMIN_KEY=" "$ENVFILE" 2>/dev/null; then
  KEY=$(docker exec ops-local-convex ./generate_admin_key.sh | tail -n 1 | tr -d '\r')
  echo "LOCAL_ADMIN_KEY=$KEY" >> "$ENVFILE"
fi

set -a
. "$ENVFILE"
set +a
export CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3310
export CONVEX_SELF_HOSTED_ADMIN_KEY="$LOCAL_ADMIN_KEY"
export OPS_SESSION_SECRET="$LOCAL_SESSION_SECRET"
export OPS_STORE=convex
export OPS_DEV_SIGNIN=on
echo "Backend:   http://127.0.0.1:3310"
echo "Dashboard: http://127.0.0.1:6891"
exec npx next dev -p "${PORT:-3300}" --webpack
