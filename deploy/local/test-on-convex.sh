#!/bin/sh
# Runs every suite against the Ops backend on this laptop (6 Nov).
#
# The suites normally run on the JSON file, which is what CI has. That proves
# the rules, and the rules are the same whichever store is underneath - which
# is exactly why 45 suites were green while /mail was a 500 on Convex. Nothing
# had ever awaited desk(), so no `usingConvex()` branch had ever run.
#
# This brings the backend up if it is down, pushes the functions, and runs the
# same suites against it. Everything is 127.0.0.1 and the suites refuse to
# write anywhere else.
#
#   deploy/local/test-on-convex.sh
set -e
cd "$(dirname "$0")/../.." || exit 1

ENVFILE=deploy/local/.env.backend.local
if [ ! -f "$ENVFILE" ]; then
  echo "No $ENVFILE yet. Run deploy/local/start.sh once first."
  exit 1
fi

docker compose -f deploy/local/docker-compose.yml --env-file "$ENVFILE" up -d
echo "Waiting for the backend..."
until curl -fs http://127.0.0.1:3310/version > /dev/null 2>&1; do sleep 2; done

if ! grep -q "^LOCAL_ADMIN_KEY=" "$ENVFILE" 2>/dev/null; then
  KEY=$(docker exec ops-local-convex ./generate_admin_key.sh | tail -n 1 | tr -d '\r')
  echo "LOCAL_ADMIN_KEY=\"$KEY\"" >> "$ENVFILE"
fi

set -a
. "$ENVFILE"
set +a
export CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3310
export CONVEX_SELF_HOSTED_ADMIN_KEY="$LOCAL_ADMIN_KEY"

# The suites write rows, so the schema on the backend has to be today's. A
# push that refuses here means rows from an older schema are still in it:
# clear them with `docker compose -f deploy/local/docker-compose.yml
# --env-file deploy/local/.env.backend.local down -v` and run this again. That
# is a minute on a laptop and a migration anywhere else, which is why this
# script only ever talks to 127.0.0.1.
npx convex deploy -y

OPS_TEST_STORE=convex exec node tests/run.mjs "$@"
