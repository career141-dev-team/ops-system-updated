#!/bin/sh
# Screens only: the website with invented sample data, no backend, no real
# sign-in. Pick a name on the sign-in page. Nothing real is used or sent.
set -e
cd "$(dirname "$0")/../.." || exit 1
export OPS_DATA_DIR="$PWD/.data-ui"
unset CONVEX_SELF_HOSTED_URL CONVEX_SELF_HOSTED_ADMIN_KEY
export OPS_STORE=json
export OPS_DEV_SIGNIN=on
export OPS_SESSION_SECRET="${OPS_SESSION_SECRET:-local-ui-only}"
exec npx next dev -p "${PORT:-3300}" --webpack
