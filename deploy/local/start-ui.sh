#!/bin/sh
# Screens only: the website with invented sample data, no backend, no real
# sign-in. Pick a name on the sign-in page. Nothing real is used or sent.
set -e
cd "$(dirname "$0")/../.." || exit 1
export OPS_DATA_DIR="$PWD/.data-ui"
unset CONVEX_SELF_HOSTED_URL CONVEX_SELF_HOSTED_ADMIN_KEY
export OPS_STORE=json
export OPS_DEV_SIGNIN=on
# The TA side of the API does not exist yet, so a stand-in answers with
# recorded sample data. Every screen that uses it says so.
export OPS_TA_FAKE=on
# The clocks, the waiting writes and the events can be asked for by hand.
export OPS_CLOCK_KEY="${OPS_CLOCK_KEY:-local-ui-only-clock-key}"
export OPS_SESSION_SECRET="${OPS_SESSION_SECRET:-local-ui-only}"
exec npx next dev -p "${PORT:-3300}" --webpack
