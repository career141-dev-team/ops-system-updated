#!/usr/bin/env bash
# Brings the Ops production app up to a given image on the VPS.
#
# Run by .github/workflows/deploy-production.yml over SSH:
#
#   bash /opt/ops-system/.deploy/remote-up.sh ghcr.io/<org>/ops-system:<sha>
#
# Never touches TA System containers, networks, or databases.
set -euo pipefail

DIR=${OPS_PROD_DIR:-/opt/ops-system}
IMAGE=${1:-}

if [ -z "$IMAGE" ]; then
  echo "Give the image to run, e.g. ghcr.io/career141-dev/ops-system:<sha>" >&2
  exit 1
fi
cd "$DIR" || { echo "$DIR is missing on the server." >&2; exit 1; }
[ -f .env.production ] || { echo "$DIR/.env.production is missing." >&2; exit 1; }
[ -f docker-compose.yml ] || { echo "$DIR/docker-compose.yml is missing." >&2; exit 1; }

if grep -Eq '^CONVEX_SELF_HOSTED_URL=.*(api\.career141\.com|ta-system)' .env.production; then
  echo "Refusing: CONVEX_SELF_HOSTED_URL points at the TA System." >&2
  exit 1
fi

KEY_LINE=$(grep -E '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env.production | head -1 | cut -d= -f2- | tr -d '"')
case "$KEY_LINE" in
  ops-prod\|*) : ;;
  *)
    echo "Refusing: CONVEX_SELF_HOSTED_ADMIN_KEY in .env.production must start with 'ops-prod|'." >&2
    exit 1
    ;;
esac

echo "Pulling $IMAGE"
docker pull "$IMAGE" >/dev/null

export OPS_IMAGE="$IMAGE"
docker compose --env-file .env.production up -d postgres convex dashboard
docker compose --env-file .env.production up -d --force-recreate app

echo "Waiting for ops-system-app on 127.0.0.1:3332"
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:3332/sign-in; then
    echo "ops-system-app is answering on 127.0.0.1:3332"
    echo "$(date -u +%FT%TZ) $IMAGE" >> "$DIR/.deploy/history.log"
    exit 0
  fi
  sleep 2
done

echo "ops-system-app did not answer in a minute. Last 40 log lines:" >&2
docker logs --tail 40 ops-system-app >&2 || true
exit 1
