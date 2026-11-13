# AGENTS.md — read this before changing anything

For every developer and every AI coding tool working in this repository.

## What this is

The Career 141 **Ops system**: the client side of the business (leads, client
agreements, client CV sets, interviews, placements, invoices, guarantee). It is a
separate system from the **TA System** (`career141-dev/ta-system`), which is
**live production** at https://ta-system.career141.com with 78,000+ real
candidates. Ops talks to TA **only through TA's API**.

**Status: all nine phases of [`docs/15-BUILD-PLAN.md`](docs/15-BUILD-PLAN.md) are
built, and so are the screens (9 Nov 2026).** Read [`docs/STATUS.md`](docs/STATUS.md)
first - it is the one page that says what exists, where each piece lives and what is
still not built. What is left of size is the server and pilot half of phase 8, which is
a person's work ([`docs/22-GO-LIVE.md`](docs/22-GO-LIVE.md) is the order).

Every feature ships with its screen (owner, 2 Nov): minimal, the TA System's look, and
**no overlays, modals or drawers** — one page per thing, edit in place. The rules are in
[`docs/07-SCREENS.md`](docs/07-SCREENS.md).

## Hard rules

1. **The TA System is never put at risk.** Nothing in this repository deploys to,
   or changes, the TA backend (`api.career141.com`, `ta-system-api.career141.com`)
   or its database. Ops never reads TA's database directly; it uses TA's API.
2. **Ops has its own backend and database.** Never run `npx convex deploy` from
   this repository against the TA backend: a Convex deploy replaces every
   function in that backend and would wipe the TA System.
3. **No live change from a laptop.** Live changes (the Ops backend on the VPS, DNS,
   Caddy, secrets) go through the release pipeline, and each one needs the
   owner's explicit go-ahead in the conversation, every time.
4. **Branch and pull request.** After the first commit, never commit or push
   straight to `main`. Branch names: `<person>/<topic>`.
5. **No secrets anywhere tracked or shared.** No keys, tokens or passwords in
   code, commits, docs, chat or example files. `.env*` files stay local.
6. **Real clients and candidates are real.** Every message to a client, the
   Director or a candidate is drafted, approved by a person where the rules say
   so, and sent through the outbound safety checks. Tests use test recipients
   only. Never switch outreach live in code or config.
7. **Data changes are migrations** with a `dryRun` argument, run by the pipeline,
   never an ad-hoc script against live.
8. **Changes to TA are made in the TA repository**, through its own pull request
   and review (its `merge-teammate` skill), and only by adding: new API endpoints
   and events, never changing or removing what TA already has.

## Running it, and checking it

```bash
sh deploy/local/start-ui.sh     # the screens on http://127.0.0.1:3300, invented data,
                                # a JSON file for a store, nothing can be sent
node tests/run.mjs              # all 57 suites, each in its own process
node tests/run.mjs esa          # one suite
npx tsc --noEmit                # types
```

Both checks must be green before a pull request. The local run never points at
anything live: it uses its own folder (`.data-ui`) and a stand-in TA System.

A laptop has no LibreOffice and no Microsoft or Meta credentials, so making a PDF
and sending anything answer with a plain sentence saying why, instead of failing.
That is deliberate - do not "fix" it by removing the guard.

## Where things are

| | |
|---|---|
| Screens | `app/<thing>/page.tsx`, one page per thing. Every form posts to a server action |
| Every action | `app/actions.ts` - the only place a screen writes anything |
| Doors from outside | `app/api/clock` (the scheduler), `app/api/leads/website` (the website form), `app/api/files/[id]` (a download) |
| The desk | `src/data/desk.ts` - one API over two stores: a JSON file while building, the Ops Convex backend on a server. A screen never knows which |
| The stores | `src/data/store.ts` (JSON), `convex/ops/data.ts` + `convex/schema.ts` (backend), `src/data/fileStore.ts` (bytes: a folder, or R2) |
| The rules | `src/lib/*.ts`, each one pure: no database, nothing sent, so every case is testable. `desk.ts` only reads and writes |
| Tests | `tests/<name>.test.ts`, run by `tests/run.mjs` |
| The server side | `Dockerfile`, `deploy/local`, `deploy/preview`, `.github/workflows` |

New rules go in `src/lib`, not in a screen and not in the store. A rule with no
test is not finished.

## Working with the documents

- The plan lives in `docs/`. When a decision changes, update the document in the
  same pull request.
- `docs/reference/` holds the source material. Do not edit it to match new
  decisions; write the decision in `docs/09-DECISIONS-AND-QUESTIONS.md` instead.
- The owner's planning canvas holds real staff, client and candidate names. Do not
  copy the raw canvas cards into this repository.

## Code style (once code exists)

Match the TA System: Next.js 16 + self-hosted Convex, TypeScript. Comments explain
*why*, often with the date and the incident. User-facing copy is plain, specific
and active ("Saved", "Could not send - the email address is missing").

The rules this system actually enforces, and the incident behind each, are listed in
[`docs/STATUS.md`](docs/STATUS.md). Do not weaken one to make a feature easier:
nothing closes without a reason, nothing reaches a client without a person
approving it, a document never goes out with a hole in it, a client who replies is
not chased, and one company has one record with one owner.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
