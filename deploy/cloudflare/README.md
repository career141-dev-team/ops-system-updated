# The demo on Cloudflare Workers

A link to look at the screens with **invented data only**. It is not the server: the real one is `deploy/preview`
(and the go-live order in `docs/22-GO-LIVE.md`). Nothing here may point at the TA System, the live Ops backend, real
mail or real clients (AGENTS.md, hard rules 1 to 6).

## What it is, and what it is not

The app runs on Cloudflare's runtime through the OpenNext adapter (`@opennextjs/cloudflare`, `open-next.config.ts`,
`wrangler.jsonc`). It was checked on `wrangler`'s local runtime: sign-in, Clients, Candidates, saving a lead, with the
built Worker at about 2.1 MiB compressed (the free plan allows 3).

- **Data is not kept.** The store is a JSON file in memory (`OPS_DATA_DIR=/tmp/ops-data`). It resets whenever Cloudflare
  starts a new copy of the Worker, and two copies can show different data. Good for looking, not for testing a long flow.
- **No clocks.** Nothing calls `/api/clock` on a schedule here.
- **No PDFs, no sending.** There is no LibreOffice and no mail credentials, and the app says so in plain words.

## Put it on a link (Workers Builds)

1. Cloudflare dashboard: **Workers & Pages** > **Create** > **Import a repository**. An organisation admin has to let
   Cloudflare's GitHub app see `career141-dev-team/ops-system-updated`.
2. Choose the branch (`main` once this is merged).
3. **Build command:** `npx opennextjs-cloudflare build`. **Deploy command:** `npx wrangler deploy`. Leave the root as it is.
4. **Nothing to type in.** The demo's settings (`OPS_STORE`, `OPS_DATA_DIR`, `OPS_DEV_SIGNIN`, `OPS_TA_FAKE`,
   `OPS_TEAMS_FAKE`) are in `wrangler.jsonc` under `vars`. None of them is a secret, and the sign-in page shows the four
   invented people to pick from. For real sign-in later, add `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`,
   `OPS_APP_URL` and `OPS_SESSION_SECRET` as **secrets** in the dashboard (Settings > Variables and secrets): with those
   present the app switches the "pick your name" door off by itself. Never set `CONVEX_*` or R2 variables on the demo.
5. **Protect it before you share it.** `OPS_DEV_SIGNIN=on` is "pick your name, no password": anyone with the link is
   the Ops lead. In the Worker's **Settings > Domains & Routes**, switch on **Cloudflare Access** so only people you
   name can open it.

## Drift (21 Nov): this page and `wrangler.jsonc` disagree

This page says the demo uses invented data only and that `CONVEX_*` is never set. `wrangler.jsonc` at the repository root
no longer matches: it sets `OPS_STORE` to `convex`, points `CONVEX_SELF_HOSTED_URL` at a `convex.cloud` address, and
carries the Clerk sign-in settings. That is a store that keeps data and a real sign-in, not the JSON file in memory
described above. Which Convex deployment that address is has not been checked, and nothing here changes it. **The owner
decides** whether the demo goes back to invented data (set `OPS_STORE` to the JSON store, remove the `CONVEX_*` and
Clerk lines) or this page is rewritten to say what the Worker now does. AGENTS.md rules 1 and 2 apply either way: it
must never be the TA backend, and never a deploy of functions from a laptop.

## Try it on your machine first

```sh
npm ci
npm run cf:preview     # builds, then serves http://localhost:8787 with the same settings
```
