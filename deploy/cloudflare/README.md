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
4. **Settings > Variables and secrets** on the Worker (not in the repo), all of them invented:

   | Name | Value |
   |---|---|
   | `OPS_STORE` | `json` |
   | `OPS_DATA_DIR` | `/tmp/ops-data` |
   | `OPS_DEV_SIGNIN` | `on` |
   | `OPS_TA_FAKE` | `on` |
   | `OPS_TEAMS_FAKE` | `on` |
   | `OPS_SESSION_SECRET` | a long random string |
   | `OPS_CLOCK_KEY` | a random string |
   | `OPS_WEB_LEAD_KEY` | a random string |

   Never set `CONVEX_*`, `MS_*` or R2 variables here.
5. **Protect it before you share it.** `OPS_DEV_SIGNIN=on` is "pick your name, no password": anyone with the link is
   the Ops lead. In the Worker's **Settings > Domains & Routes**, switch on **Cloudflare Access** so only people you
   name can open it.

## Try it on your machine first

```sh
npm ci
cp the eight values above into a file called .dev.vars   # git-ignored
npm run cf:preview                                        # builds, then serves http://localhost:8787
```
