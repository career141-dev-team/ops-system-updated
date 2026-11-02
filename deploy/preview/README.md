# The Ops preview — ops-preview.career141.com

A password-protected preview of the Ops system on the VPS, with **invented data
only**. It is for looking at: the owner, Asma, Rushda and the TA lead can walk
the screens and say what is wrong, before anything real is in it.

It shares the machine with the TA System and touches nothing of TA's. What
keeps them apart:

| | TA System (live) | Ops preview |
|---|---|---|
| Folder | `/opt/ta-prod` | `/opt/ops-preview` |
| Convex instance | `career141-backend-1` | `ops-preview` |
| Database | `convex_self_hosted` | `convex_ops_preview` |
| Ports (loopback) | 3210 / 3211 | 3320 / 3321, app 3322, dashboard 6892 |
| Containers | `ta-prod-*`, `career141-*` | `ops-preview-*` |
| Public name | ta-system.career141.com | ops-preview.career141.com, behind a password |

Nothing in this folder starts, stops or reads anything of TA's. The deploy
names the preview's own containers explicitly, so it cannot restart the wrong
thing.

## What is deliberately switched off

The preview exists to be clicked on, not to do anything. In `.env.preview`:

- `OPS_SEND=off` — an approved message records as blocked, with the reason.
- `OPS_OUTREACH_LIVE` empty, `OPS_OUTBOUND_LOCK=on` — two more guards under it.
- `OPS_MAIL_READ=off` — the preview never reads real client mail.
- `OPS_TA_FAKE=on`, reads and writes off — it talks to the stand-in TA System
  with recorded sample answers, and every screen says so.
- `OPS_DEV_SIGNIN=on` — the simple pick-your-name page. **This is why the whole
  site sits behind basic auth**: the sign-in itself proves nothing. Clerk
  replaces it before anything real is in here.

`deploy/preview/remote-up.sh` refuses to start the app if sending or live
outreach has been switched on in `.env.preview`, or if its backend address
points at the TA System.

## 1. Once, on the server (the owner, or with the owner watching)

Everything here is done by hand, once, and none of it changes anything of
TA's. The DNS is already live: `ops-preview.career141.com` is an A record to
94.136.189.48, DNS only.

```bash
# a. The preview's own database in the Postgres that is already running.
#    One CREATE DATABASE. TA's convex_self_hosted is not touched.
docker exec -i career141-postgres-1 psql -U convex -c 'CREATE DATABASE convex_ops_preview;'

# b. The folder, and the files that live on the server only.
mkdir -p /opt/ops-preview/.deploy && cd /opt/ops-preview
#    Copy deploy/preview/.env.preview.example from the repository to
#    /opt/ops-preview/.env.preview and fill it in. Make the secrets with:
openssl rand -hex 32   # OPS_SESSION_SECRET
openssl rand -hex 32   # NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (also a GitHub secret)
openssl rand -hex 32   # PREVIEW_INSTANCE_SECRET  (in .env.preview)
openssl rand -hex 32   # OPS_CLOCK_KEY
#    PREVIEW_POSTGRES_URL, in .env.preview, is the Postgres the backend uses:
#      postgresql://convex:<the password>@<postgres host>:5432/convex_ops_preview?sslmode=disable

# c. The backend, so an admin key can be made.
cp <repo>/deploy/preview/docker-compose.yml /opt/ops-preview/docker-compose.yml
docker compose --env-file .env.preview up -d convex
docker exec ops-preview-convex ./generate_admin_key.sh | tail -1
#    Put that key in .env.preview as CONVEX_SELF_HOSTED_ADMIN_KEY, and in
#    GitHub as the secret PREVIEW_CONVEX_ADMIN_KEY.

# d. The clocks' own cron lives in the backend, which is a separate place:
npx convex env set OPS_CLOCK_KEY '<the same key as .env.preview>'
npx convex env set OPS_APP_URL http://app:3300
#    (with CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3320 and the admin key set)

# e. The password, and the Caddy block.
docker run --rm caddy:2 caddy hash-password --plaintext '<the password>'
#    Paste the hash into the block from deploy/preview/Caddyfile, add it to the
#    VPS's Caddyfile beside TA's sites, then:
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy

# f. Memory check before and after, because TA needs this box:
free -m
```

The firewall needs no change: every preview port is on 127.0.0.1 and the only
thing the internet reaches is Caddy, which already has 80 and 443 open.

## 2. Once, in GitHub

Repository → Settings:

- **Secrets:** `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`
  (the same server as TA's), `PREVIEW_CONVEX_ADMIN_KEY`,
  `PREVIEW_SERVER_ACTIONS_KEY`.
- **Variables:** `PREVIEW_ENABLED` = `true` (this is the lock; until it is set,
  the workflow stops with a message), `PREVIEW_DIR` only if the folder is not
  `/opt/ops-preview`.
- **Environment** `ops-preview` with the owner as a required reviewer, so every
  deploy waits for their approval — their standing rule for the preview.

## 3. Each deploy

Actions → **Deploy preview** → Run workflow. It:

1. stops unless `PREVIEW_ENABLED` is `true`;
2. runs every test and both type-checks on that commit;
3. waits for the owner's approval on the `ops-preview` environment;
4. builds the image (Node and LibreOffice) and pushes it to GHCR;
5. copies the compose file and the script to the server;
6. puts the backend's functions in place through an SSH tunnel — the backend is
   never opened to the internet;
7. brings the app up on the new image and waits for it to answer;
8. checks `https://ops-preview.career141.com` answers **401**, because the
   password must come before anything else. A deploy that lands an unprotected
   preview fails here.

There is no automatic deploy. Nothing happens on a push.

The sample desk puts itself in the first time a screen is opened on an empty
backend, so there is nothing to seed by hand.

## 4. Looking after it

```bash
# What is running, and what it is using
docker ps --filter name=ops-preview
docker stats --no-stream ops-preview-app ops-preview-convex

# The app's log
docker logs --tail 100 -f ops-preview-app

# Stop the preview (nothing of TA's is affected)
cd /opt/ops-preview && docker compose --env-file .env.preview down

# The Convex dashboard, over SSH rather than on the internet
ssh -L 6892:127.0.0.1:6892 root@94.136.189.48   # then http://127.0.0.1:6892
```

**Throw the data away and start again** — the preview's data is invented, so
this is safe and sometimes the quickest way to see the sample desk fresh:

```bash
cd /opt/ops-preview
docker compose --env-file .env.preview down
docker volume rm ops-preview_ops-preview-convex-files
docker exec -i career141-postgres-1 psql -U convex -c 'DROP DATABASE convex_ops_preview;'
docker exec -i career141-postgres-1 psql -U convex -c 'CREATE DATABASE convex_ops_preview;'
# then deploy again
```

## 5. Before anything real goes in here

This preview is for test data. Before a real client, candidate or message
reaches it: Clerk sign-in instead of the pick-your-name page, its own R2 bucket
(`c141-ops`, never TA's), the mail reader pointed at real mailboxes, and the
switches turned on one at a time. That is Phase 8, and it is a different
decision each time.
