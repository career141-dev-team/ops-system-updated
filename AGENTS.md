# AGENTS.md — read this before changing anything

For every developer and every AI coding tool working in this repository.

## What this is

The Career 141 **Ops system**: the client side of the business (leads, client
agreements, client CV sets, interviews, placements, invoices, guarantee). It is a
separate system from the **TA System** (`career141-dev/ta-system`), which is
**live production** at https://ta-system.career141.com with 78,000+ real
candidates. Ops talks to TA **only through TA's API**.

Status: Phase 0, start-up. No code yet. See [`docs/01-STARTUP-PLAN.md`](docs/01-STARTUP-PLAN.md).

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
and active ("Saved", "Could not send — the email address is missing").
