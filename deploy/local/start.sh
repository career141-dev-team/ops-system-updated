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
  # The key holds a pipe, so it is quoted: an unquoted value breaks `. $ENVFILE`.
  echo "LOCAL_ADMIN_KEY=\"$KEY\"" >> "$ENVFILE"
fi

set -a
. "$ENVFILE"
set +a
export CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3310
export CONVEX_SELF_HOSTED_ADMIN_KEY="$LOCAL_ADMIN_KEY"
export OPS_SESSION_SECRET="$LOCAL_SESSION_SECRET"
export OPS_STORE=convex
export OPS_DEV_SIGNIN=on
# Invented sample desk on an empty store (22 Nov). Never set on a live server.
export OPS_SAMPLE_DESK=on
# The TA System and Teams are stand-ins on a laptop (17 Nov): the pretend-TA panel at
# /dev/ta needs the first, and no real meeting is ever made without the second.
export OPS_TA_FAKE=on
export OPS_TEAMS_FAKE=on

# The backend starts empty. Without this it has no functions, so the first
# read fails and every screen is an error (found 6 Nov writing docs/26). It is
# the same `convex deploy` the preview workflow runs, and it is safe for
# exactly one reason: CONVEX_SELF_HOSTED_URL is 127.0.0.1, which is this
# laptop's own backend and can be nothing else.
echo "Pushing the Ops functions to the local backend..."
npx convex deploy -y
echo "Backend:   http://127.0.0.1:3310"
echo "Dashboard: http://127.0.0.1:6891"
exec npx next dev -p "${PORT:-3300}" --webpack
