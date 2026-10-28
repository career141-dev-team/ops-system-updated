# 01 · Start-up plan (Phase 0)

**Goal of Phase 0:** get everything ready so the Ops system can be planned feature by
feature and then built safely, without touching the live TA System.

Phase 0 builds **no screens and no Ops features**. It sets up the project: the
repository, the documents, the architecture, the connection plan, the environments
(laptop, staging, live) and the outside approvals that take time.

## The steps

| # | Step | What it means | Who | Needs | Status |
|---|---|---|---|---|---|
| 1 | **Repository and documents** | This repository, with the plan, the architecture and everything collected so far | Sanjeev | — | **Done 28 Oct** |
| 2 | **Architecture agreed** | Ops is a separate system with its own backend and database, on the same server, connected to TA by API ([02](02-ARCHITECTURE.md)) | Owner | — | **Done 28 Oct** |
| 3 | **Feature planning, one by one** | Walk through each Ops feature with the owner and the Ops team (Asma, Rushda); write one plan per feature ([10](10-FEATURE-PLANNING.md)) | Binath, Sanjeev, owner | Owner and Ops team time | Next |
| 4 | **API contract, version 1** | One written list of what Ops asks TA, what Ops sends TA, and what TA tells Ops ([03](03-CONNECTION-TO-TA.md)) | Binath, Sanjeev | Step 3 for the details | Draft in 03 |
| 5 | **Laptop set-up** | An empty Ops app and Ops backend running on the laptop, talking to a local copy of TA with a test key | Sanjeev | — | Planned |
| 6 | **Staging** | A test copy of TA and Ops on the server, so nothing is tried on live first. TA's old staging was stopped on 21 Sep and has to be rebuilt | Binath, Sanjeev | **Owner's go-ahead** (server change) | Planned |
| 7 | **Live server plan** | Where Ops runs on the VPS: its own backend container, its own database, its own address, firewall, backups | Binath, Sanjeev | **Owner's go-ahead** (server change) | Planned (below) |
| 8 | **Release pipeline** | Automatic checks on every pull request, and a release step that needs approval, like TA's | Sanjeev | Step 5 | Planned |
| 9 | **Outside approvals** | Requests that take days, started early (list below) | Owner, Sanjeev | Owner | To start |

## Step 5 · Laptop set-up (what it will contain)

- `app/`: an empty Next.js 16 app (the screens come later from the UI team).
- `convex/`: the Ops backend, empty apart from a health check.
- `deploy/local/`: a script that starts the Ops backend on `127.0.0.1` only, like
  TA's `deploy/local/start-app.sh`.
- A local TA backend (from the TA repository's own local script) with a **test** API
  key, so the connection can be tried end to end without any live address.
- Checks: `npm test`, and type checks for the app and the backend.

## Step 7 · Live server plan (for the owner's approval later)

Same server as TA (VPS `94.136.189.48`), but every piece separate:

| Piece | Plan | TA's piece (untouched) |
|---|---|---|
| Ops backend | New Convex container, compose project in its own folder (for example `/opt/ops-prod`), bound to `127.0.0.1` on free ports | `career141-backend-1` on 3210/3211 |
| Ops database | New database (for example `convex_ops`) inside the same Postgres server | `convex_self_hosted` |
| Address | New names such as `ops-api.career141.com` through the same Caddy, with a DNS record | `api.career141.com` |
| Firewall | The new ports added to the existing firewall script, so they are not open to the internet | Same script |
| Secrets | Own `.env` file, readable only by root; own admin key | TA's file |
| Backups | The Ops database included in the Postgres backup; a backup before every live step | Same |
| Sign-in | The same Clerk sign-in as TA, so staff use one account (to confirm in step 3) | Clerk |

Before step 7: check the server's free memory and disk, because a second backend
uses more memory on the same machine.

## Step 9 · Outside approvals to start early

1. Microsoft admin consent for calendar and Teams links (interview booking). The longest wait.
2. Meta approval for the WhatsApp templates sent to clients (1-2 days each).
3. The final client agreement (ESA) template.
4. The invoice format: numbering, tax lines, bank details.
5. The Sri Lankan public holiday list, for working-day timers.
6. Who gets which Ops role: ops lead, ops owners, accounts, Director of Operations, marketing.
7. Whether the website contact form can send new leads to the system.

## Phase 0 is finished when

- [x] The repository exists with the plan and all collected material.
- [x] The architecture is agreed.
- [ ] Every feature has its own plan, agreed with the owner.
- [ ] API contract version 1 is written and agreed by both teams.
- [ ] The empty Ops app and backend run on the laptop and talk to a local TA.
- [ ] Staging is running, or the owner has chosen a supervised pilot instead.
- [ ] The live server plan is approved.
- [ ] The outside approvals are requested.

After Phase 0, building starts feature by feature, in the order in
[`10-FEATURE-PLANNING.md`](10-FEATURE-PLANNING.md).
