# Where the build actually is

Updated 3 November 2026. This is the one page that says what exists. The eight
phases are planned in [15](15-BUILD-PLAN.md); **phases 1 and 2 are built, tested
and merged**, and nothing of phases 3 to 8 is written yet.

No staff, client or candidate names belong on this page. The sample data in the
code is invented.

## Built: phase 1, the foundation

| Piece | Where | Proved by |
|---|---|---|
| Sign-in (pick a name, development only) | `src/lib/session.ts`, `app/sign-in` | clicking it |
| Who may do what | `src/lib/roles.ts` | `tests/roles.test.ts` |
| The desk, one API over two stores | `src/data/desk.ts` (JSON file or the Ops Convex backend) | every suite |
| The Colombo calendar and working days | `src/lib/calendar.ts` | `tests/calendar.test.ts` |
| Settings, each change needing a reason | `src/lib/settingsRules.ts`, `app/settings` | `tests/settings.test.ts` |
| The clocks: warn, fire, leave a task | `src/lib/tick.ts`, `src/lib/timers.ts` | `tests/tick.test.ts`, `tests/timers.test.ts` |
| A fired clock doing the work, not only the task | `AFTER_FIRED` in `src/data/desk.ts` | `tests/esa.test.ts` |
| The clocks running themselves every five minutes | `convex/crons.ts` → `convex/ops/clock.ts` → `POST /api/clock` | `tests/clockpass.test.ts`, and curl |
| Escalation after a day | `src/lib/escalation.ts` | `tests/escalation.test.ts` |
| One way out: draft, approve, send | `src/lib/messages.ts`, `app/messages` | `tests/messages.test.ts` |
| The three switches under sending | `src/lib/senders.ts` (`OPS_SEND`, the settings switch, `OPS_OUTBOUND_LOCK`) | `tests/senders.test.ts` |
| Wording the ops lead can edit | `src/lib/templates.ts`, `app/templates` | `tests/templates.test.ts` |
| Reading the mailboxes, matching a reply | `src/lib/graphMail.ts`, `src/lib/mailMatch.ts`, `app/mail` | `tests/mailmatch.test.ts` |
| Files, and Word → PDF | `src/lib/files.ts`, `src/data/fileStore.ts`, `src/lib/docxToPdf.ts`, `app/files` | `tests/files.test.ts`, `tests/docxtopdf.test.ts` |
| Call tasks (a person calls; the outcome is written down) | `src/lib/calls.ts`, `app/calls` | `tests/calls.test.ts` |
| The TA link: reads, writes, events | `src/lib/ta.ts`, `src/lib/outbox.ts`, `src/lib/taEvents.ts`, `app/ta` | `tests/outbox.test.ts`, `tests/taevents.test.ts` |
| The holiday list, today's numbers | `src/lib/holidays.ts`, `src/lib/baseline.ts` | `tests/holidays.test.ts`, `tests/baseline.test.ts` |
| One run-through of the whole phase | — | `tests/runthrough.test.ts` |

## Built: phase 2, client onboarding

| Piece | Where | Notes |
|---|---|---|
| Leads from anywhere | `src/lib/leads.ts`, `app/leads` | one way to reply is required |
| Website leads posting themselves in | `app/api/leads/website`, `src/lib/webLead.ts` | key in a header; see [WEBSITE-LEAD-FORM.md](WEBSITE-LEAD-FORM.md) |
| Is this company already ours? | `duplicateMatch` in `src/lib/leads.ts` | exact match linked, near match only offered |
| The banking and finance rule | `flagIndustry` in `src/lib/leads.ts` | reads the company and what they say they do, **never what they want to hire** |
| The intro call, its reminders and rebooks | `src/lib/meetings.ts` | three attempts with no reply closes the lead, with a reason |
| The agreement: fields from the real template | `src/lib/esa.ts` (`ESA_FIELDS`) | every hole in the template is a required field |
| Filling the template, and the PDF | `src/lib/docxFill.ts` → `docxToPdf` | a hole with no value stops the send |
| The chase: email, WhatsApp, email, WhatsApp, email, call | `CHASE_PLAN`, `chaseTheAgreement` in `src/data/desk.ts` | the clock drafts it; a person approves it; a reply stops it |
| They want changes | `recordChangesWanted` in `app/actions.ts` | chasing stops, the version moves on, the two weeks keep running |
| Signed, countersigned, declined | `app/actions.ts` | settling an agreement stops every clock on it |
| The client record | `src/lib/clients.ts`, `app/clients` | made by the system, never typed; one company, one record, one owner |
| The desk's two morning views | top of `app/leads/page.tsx` | meetings booked; agreements not back yet |

## Not built

Phases 3 to 8 of [15](15-BUILD-PLAN.md): the requirement meeting and the opening
created in TA, the adverts, the client side of the search, interviews,
placement and the invoice, the guarantee and the close, then hardening and the
pilot.

**The link to TA is a stand-in.** `OPS_TA_FAKE=on` answers with recorded sample
data, because the TA side of the API does not exist yet. Making it real is a
pull request in the TA repository (Part E of the plan), API only, adding
endpoints and never changing what TA already has.

## Planned, and worth reading before anything AI is built

[21](21-AI-OPPORTUNITIES.md) and Phase 9 of [15](15-BUILD-PLAN.md), added 3 November:
the AI productivity layer - dictation into our own fields, reading what arrives,
improving the drafts we already make, summaries, and one ask box - with what the TA
System already does (and so is never rebuilt here), what is refused and why, the cost
and accuracy machinery, and the priority order. Nothing of it is built.

## Waiting on a person, not on code

- The agreement template read and corrected, then uploaded on the Files screen
  as "Agreement, drafted". Until then a send refuses and says so.
- The preview server's once-only setup: [`deploy/preview/README.md`](../deploy/preview/README.md).
- Microsoft 365: letting the Graph app read the mailboxes the desk already uses.
- The website form pointed at `/api/leads/website`.
- Whether Saturday is a working day, and the holiday list for 2026-27.

## Rules the code enforces, and why

Each of these exists because of something that went wrong, written in
[13](13-CORRECTIONS-LOG.md) or on the owner's board:

- **Nothing closes, holds or declines without a reason**, and the reason is kept.
- **Nothing reaches a client except as a draft a person approved.** Switched off
  records as *blocked*, never as *failed*, and nothing is retried silently.
- **A hole in a document is never left in it.** A draft once went to a client
  with placeholders still in it.
- **A client who replies is not chased.** A reply cancels the chase clocks.
- **One company, one record, one owner.** Two records means two owners and two
  agreements.
- **A clock does the work, not just the reminder.** The clocks exist so that
  nobody has to remember.
- **Nothing is overwritten.** Files carry the time in their key and their
  SHA-256 is kept; every change is written to the audit with who, when and why.

## How it is checked

```bash
node tests/run.mjs        # all 24 suites, each in its own process
npx tsc --noEmit          # types
```

Both are green on `main`, and CI runs them on every push.

Two things a laptop cannot do, and says so plainly rather than failing: make a
PDF without LibreOffice, and reach Microsoft or Meta without credentials.
