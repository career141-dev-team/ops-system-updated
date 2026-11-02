#!/usr/bin/env bash
# Brings the Ops preview up to a given image, on the server.
#
# Run by the deploy workflow over SSH, and safe to run by hand:
#
#   bash /opt/ops-preview/.deploy/remote-up.sh ghcr.io/career141-dev/ops-system:<sha>
#
# It refuses rather than guesses: no directory, no environment file, no image,
# nothing happens. It never touches the TA System's containers, and the only
# thing it restarts is the preview's own app.
set -euo pipefail

DIR=${OPS_PREVIEW_DIR:-/opt/ops-preview}
IMAGE=${1:-}

if [ -z "$IMAGE" ]; then
  echo "Give the image to run, e.g. ghcr.io/career141-dev/ops-system:<sha>" >&2
  exit 1
fi
cd "$DIR" || { echo "$DIR is not there. See deploy/preview/README.md." >&2; exit 1; }
[ -f .env.preview ] || { echo "$DIR/.env.preview is missing. Copy .env.preview.example and fill it in." >&2; exit 1; }
[ -f docker-compose.yml ] || { echo "$DIR/docker-compose.yml is missing." >&2; exit 1; }

# The preview must never be pointed at anything live. Checked here as well as
# in the file itself, because this is the last place before it runs.
if grep -Eq '^(OPS_SEND|OPS_OUTREACH_LIVE)=on' .env.preview; then
  echo "Refusing: the preview has sending or live outreach switched on in .env.preview." >&2
  exit 1
fi
if grep -Eq '^CONVEX_SELF_HOSTED_URL=.*(api\.career141\.com|ta-system)' .env.preview; then
  echo "Refusing: the preview's backend address points at the TA System." >&2
  exit 1
fi

# A Convex admin key begins with the name of the backend it belongs to. The TA
# System's key here would let the preview write into the live database, so the
# key is read before the app is started and anything but the preview's is
# refused. (This is the same mistake the old CV-Processing repository could
# have made against TA's backend.)
KEY_LINE=$(grep -E '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env.preview | head -1 | cut -d= -f2- | tr -d '"')
case "$KEY_LINE" in
  ops-preview\|*) : ;;
  *)
    echo "Refusing: CONVEX_SELF_HOSTED_ADMIN_KEY in .env.preview is not an ops-preview key (it must start with 'ops-preview|')." >&2
    exit 1
    ;;
esac

echo "Pulling $IMAGE"
docker pull "$IMAGE" >/dev/null

export OPS_IMAGE="$IMAGE"
# Only the preview's own services, named explicitly.
docker compose --env-file .env.preview up -d convex dashboard
docker compose --env-file .env.preview up -d --force-recreate app

echo "Waiting for the app"
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:3322/sign-in; then
    echo "The preview is answering on 127.0.0.1:3322"
    echo "$(date -u +%FT%TZ) $IMAGE" >> "$DIR/.deploy/history.log"
    exit 0
  fi
  sleep 2
done

echo "The app did not answer in a minute. The last lines of its log:" >&2
docker logs --tail 40 ops-preview-app >&2 || true
exit 1
