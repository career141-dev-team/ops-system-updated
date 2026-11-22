# Going live: the order, the pilot, and what stays behind

Written 4 November 2026, with phase 8 (15, Phase 8). The code side of
hardening is built and tested; everything in here that needs the server or
the team is the owner's, in this order and no other.

Nothing in this document is urgent. The point of the order is that each step
can be undone by one switch, and that no step can reach a real client until
the one before it has been watched for a day.

## 1. The server, once

`deploy/production/` holds what the preview holds, with production names:

- `docker-compose.yml` — `ops-prod`, its own instance name, its own ports
  (3330/3331/6893 on loopback), its own volumes, 3 GB for the backend. It
  shares the machine with the TA System and touches nothing of its.
- `.env.production.example` — every switch **off**, and the order to turn
  them on written at the top of the file.

What the owner does once: one `CREATE DATABASE convex_ops` in the Postgres
already running (TA's `convex_self_hosted` is not touched), the env file from
the example, the backend's admin key, the Caddy block for
`ops.career141.com`, the DNS record, and the GitHub secrets and environment
the deploy workflow needs. The preview's README is the model; the shape is
the same.

## 2. Backups, before anything real is in it

A nightly `pg_dump` of `convex_ops` beside the TA System's own, fourteen days
kept, and **one restore rehearsed on the laptop** from a real dump. A backup
nobody has restored is not a backup. [runbooks/restore.md](runbooks/restore.md)
has both halves.

Documents are not in the dump: they are in R2 (`c141-ops`), which keeps its
own versions. That bucket is Ops' own, never TA's.

## 3. The first deploy: everything off

`OPS_SEND=off`, `OPS_OUTREACH_LIVE` empty and `switch.outreachLive` off, `OPS_OUTBOUND_LOCK=on`,
`OPS_MAIL_READ=off`, `OPS_TA_FAKE=on`, both TA switches off, and **Microsoft
sign-in** - `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `OPS_APP_URL`
and `OPS_SESSION_SECRET`, which between them refuse the development door
whatever `OPS_DEV_SIGNIN` says. (This line read "`OPS_DEV_SIGNIN=off` with
Clerk as the door" until 6 November. Clerk had not been built then, and in that
state the app served nobody at all: every page redirected to a sign-in that
could sign nobody in, so Microsoft replaced it. **Clerk is built now** - 20 Nov,
committed on `hdbinath/clerk-auth-roles`, three roles, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
and `CLERK_SECRET_KEY`, `OPS_ADMIN_EMAILS` for the first admin - and either door
refuses the development one. Which of the two the server uses is the owner's
call, made before the first deploy.) In that state Ops cannot reach a
client, a candidate or the TA System's database however hard anybody clicks.

Then the first day's data, on the **First day** screen: the clients and who
owns each one, the holiday list, the ops people. Every one is a dry run
first — the same code builds the dry run and the real run, so what was read
is what lands, and running a file twice adds nothing.

Placements and guarantees are not imported. They arrive from TA's own events,
so anybody who joined inside the last ninety days comes with their placement
once reads are on.

## 4. Turning the switches on, one a day

| Day | Switch | What to watch |
|---|---|---|
| 1 | `OPS_MAIL_READ=on` | the Mail screen's last run per mailbox; replies filing against the right lead or set |
| 2 | `OPS_TA_READS_ENABLED=on`, `OPS_TA_FAKE=off` | the TA System screen: real people, real openings; the events cursor age |
| 3 | `OPS_TA_WRITES_ENABLED=on` **and** `switch.taWritesEnabled` in Settings, **and** `OPS_API_WRITES_ENABLED=on` + `OPS_API_ACTOR_EMAIL` on the **TA** deployment | the outbox draining in order, nothing stuck. All four, and two of them are on the other system |
| 4 | `OPS_SEND=on`, the lock still on and holding the pilot client's addresses | one real message, read before it goes |
| 5 | `OPS_OUTREACH_LIVE=on` **and** `switch.outreachLive` in Settings | real clients receive what we send, instead of the test address. Both are needed (`outreachLiveInEnv()` and `switchedOn(db, "switch.outreachLive")` in `approveOne`), and the Health screen names whichever is still off. Same as [27](27-DEPLOYMENT-AND-KEYS.md) section 4 |
| later | the lock off | everybody. This is the real step, and the one that needs the most thought |

Every one of those is reversible in under a minute, and nothing is lost while
one is off: clocks keep their dates, writes stay queued, messages record as
*blocked* rather than failed.

## 5. The pilot

One client, for two weeks. Their addresses in the allow list and nobody
else's. Every message still drafted and approved by a person — that does not
change at any point, pilot or not.

Each day: the Health screen (mail runs, the events cursor, the outbox, the
clocks), and the audit for anything a person did by hand that the system
should have done. What the team works around is the list of what to fix.

Then the review with the owner: what was sent, what TA received, what the
team bypassed. Fixes first, then the allow list comes off.

## 6. The sheets

The sheets stop one at a time, each on the day the screen that replaces it is
being used for real:

| Sheet | Replaced by | Stops when |
|---|---|---|
| The master client sheet | Clients, and the First day import | the import has run for real |
| The job order sheet | Positions and the weekly report | TA reads are on and the report has gone once |
| The interview sheet | Interviews | the pilot client's interviews are booked in Ops |
| Placement Updates (the WhatsApp posts) | the placement's same-day notice | sending is on |

Anything in flight on the day a sheet stops is recorded in Ops by hand — every
screen has a "record what happened" path for exactly this, which is why the
set, the interview and the placement can all be made from a screen rather than
only from an event.

## 7. What is still not built, and should not be forgotten

| Thing | Why it waits |
|---|---|
| ~~The TA-side API~~ | **Built, merged and live since 5 November** (ta-system #361). It answers 401 until `OPS_API_TOKEN` is set, so production still runs on the stand-in and says so on every screen |
| The invoice and credit note documents | they wait on a template from the owner, exactly as the agreement did |
| The Teams meeting made from the Ops mailbox | a calendar permission the owner has yet to grant. The code (meetings, interviews, reschedules, the Outlook calendar on /calendar) is on `hdbinath/motion-teams-aura`, not merged |
| TopJobs | paused by the owner on 3 November |
| Phase 7's analytics | step 16: no screen, kept weekly as KPIs |
| Phase 9, the AI layer | planned in 15 and [21](21-AI-OPPORTUNITIES.md); nothing built |
| Contract tests shared with the TA repo | 15 Phase 8 step 2: needs the real API to test against |
| The load check at ten times a day | worth doing on the laptop once the real API is there; the stand-in answers too fast to mean anything |

## 8. Where to report a problem

The same way the TA System's feedback desk works: a line to the ops lead, who
writes it into [13](13-CORRECTIONS-LOG.md) with the date if it was a fault in
the system. Every fault in that file was found by somebody using the thing,
most of them by walking it in a browser — which is the habit to keep.

## 9. Switch-on runbook (when hosted)

Written 21 Nov for the email, Teams and Aura work on `hdbinath/motion-teams-aura`.
**Nothing here has been done.** The system is not hosted, and there is no production
deploy pipeline yet: `deploy/production` holds only `docker-compose.yml` and
`.env.production.example`, and `.github/workflows` holds only `ci.yml` and
`deploy-preview.yml`. Every step below needs the owner's explicit go-ahead in the
conversation, each time, and none may be done from a laptop (AGENTS.md rule 3).

| Step | What | Check |
|---|---|---|
| 1 | **Rotate the secrets first.** The Microsoft Graph client secret was pasted in chat on 2 Nov, and the Anthropic API key has been in use on laptops. Make a new client secret (note its expiry) and a new Anthropic key; revoke the old ones. Put the new ones only in the server's environment | the old secret no longer gets a token |
| 2 | **Microsoft admin grants**, application permissions with admin consent: `Mail.Send`; `Mail.ReadWrite` (`sendEmail` first creates a draft with `POST /users/{from}/messages`, which normally needs it - **to be confirmed against the tenant**, drop it if sending works without); `Calendars.ReadWrite` (Teams events, and the calendar read on /calendar). Then an **application access policy** restricting the app to the ops mailboxes, or those permissions reach every mailbox in the company | Health, "Check Microsoft" |
| 3 | **First deploy with everything off**: section 3 above. `OPS_TEAMS_FAKE` on, `switch.teamsEnabled` off | every Health row says off, for the right reason |
| 4 | `OPS_SEND=on`, `OPS_OUTBOUND_LOCK=on`, allow-list (`OPS_OUTBOUND_ALLOW_EMAILS`) holding **the owner's address only** | Health, "Send me a test email": one message arrives, from the right mailbox |
| 5 | `switch.teamsEnabled` on in Settings, `OPS_TEAMS_FAKE` off | book **one internal meeting**; the Teams link opens, the event is in the owner's Outlook, and /calendar shows it |
| 6 | **One pilot client.** Add their addresses to the allow-list, then `OPS_OUTREACH_LIVE=on` **and** `switch.outreachLive`. Read every message before it is approved | one real message, read before it goes |
| 7 | Later, widen the allow-list, then drop the lock. This is the real step (section 4) | |
| 8 | **The Anthropic key on the server for Aura**, then `switch.aiEnabled` and a small `ai.dailyBudget`. Aura only ever shows one confirm card; a person clicks once before anything runs, and a send still goes through steps 4 to 7 | the ledger shows task `agent` calls and their cost |

Each is reversible in under a minute by turning the switch back off.
