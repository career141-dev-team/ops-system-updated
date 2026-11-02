# Handover prompt — paste this into any new AI chat

_Written 2 Nov 2026. For a new teammate, or any AI tool (Claude Code, Claude on the web,
Cursor, Copilot, Codex) that has to work on the Career 141 Ops system._

**How to use it.** In Claude Code inside this repository, `CLAUDE.md` and `AGENTS.md` load
by themselves, so you only need to say: *"Read `docs/HANDOVER-PROMPT.md`, then
`docs/00-CONTEXT-FOR-A-NEW-CHAT.md` and `docs/15-BUILD-PLAN.md`, and tell me back what we
are building and what the next step is."* In a chat that cannot read the repository, paste
everything between the two lines below, and attach `docs/15-BUILD-PLAN.md`.

---

You are joining the Career 141 Ops system project. Read this whole brief before you
answer anything. Do not plan, design or write code until the last section says you may.

## 1. The business, in one paragraph

Career 141 is a recruitment company in Sri Lanka. Clients (companies) ask Career 141 to
fill positions. **Ops** staff handle the client side: new enquiries, the client agreement
(called the **ESA**), the requirement meeting, sending CVs to the client, booking
interviews, the placement, the invoice, and the 90-day guarantee after someone joins.
**TAs** (talent acquisition recruiters) handle the candidate side: adverts, CVs,
screening, follow-up, and sets of CVs for the Director (Mr Azeem) to review before they
go to the client. The client enters through Ops. A position only opens on the TA side
after the ESA is signed and the requirement meeting has happened. Ops stays with the
client until the guarantee ends.

## 2. The two systems

| | TA System | Ops system |
|---|---|---|
| What it is | The recruiter, candidate side | The client side |
| State | **Live production** since 21 September 2026, at https://ta-system.career141.com, with 78,000+ real candidates | **Nothing is built.** Planning only |
| Repository | `career141-dev/ta-system` | `career141-dev/ops-system` — this one |
| Stack | Next.js 16 and a self-hosted Convex backend on the company VPS, Clerk sign-in, Microsoft Graph mail, Meta WhatsApp, Cloudflare R2 files, Qdrant | The same stack, but its **own** backend and its own database |

**The architecture is decided and is not open for discussion:** Ops is a separate service
with its own Convex backend and its own database (`convex_ops`), on the same VPS and
Postgres server as the TA System, talking to the TA System **only through an API on the TA
side**. Ops never reads or writes the TA database directly. The live TA System must never
be slowed down, changed or put at risk by Ops work. The TA side only ever **gains** new
API endpoints and events; nothing existing is changed or removed.

## 3. Read these, in this order

Everything is in `docs/` in this repository.

1. `00-CONTEXT-FOR-A-NEW-CHAT.md` — the short version of the whole project, and the map of
   every other document.
2. `15-BUILD-PLAN.md` — **the plan.** Parts A to K: the problems on the owner's board, a
   working day hour by hour, the Ops tables and how they link to TA's, the API contract
   version 1, the technology chosen per feature, and the build in seven phases.
3. `09-DECISIONS-AND-QUESTIONS.md` — what is decided, with dates, and what is still open.
   **The newest dated decision always wins.**
4. `04-OPS-FLOW.md` — the whole flow, phase A to I, with the numbers and timers in
   section 13.
5. `19-TA-SYSTEM-IMPROVEMENT-PLAN.md` — how the TA System really works today, verified
   from the code, plus the fixes it needs. Section 10 is the priority list.
6. Then, as you need them: `02` architecture, `03` the Ops-to-TA connection, `05` a day
   for an Ops person, `06` features and technology, `07` screens, `08` the TA System
   explained for Ops, `10` the feature order and plan template, `11` people and roles,
   `12` glossary, `13` what was corrected and why, `14` the owner's diagram read step by
   step, `16` every problem with its solution, `17` the check that all 59 planning cards
   are covered, `18` the simulated working day.

**Important:** documents 14 to 19 are on the branch `sanjeev/build-plan` (pull request #3),
not yet on `main`. If `docs/15-BUILD-PLAN.md` is missing, run
`git fetch origin && git checkout sanjeev/build-plan`.

## 4. What is already decided (do not reopen)

- **28 October:** Ops is a separate system with its own backend and database, API-only
  link to TA, **backend first and the user interface later**, planned and built one
  feature at a time in the order in `docs/10`.
- **The owner's 12 decisions of 1 November:** every ops person sees all clients and has
  their own inbox; website leads arrive by webhook; a client chase escalates to the ops
  lead after one more day; up to five 100% positions a day; Talent Pulse gets its own
  apply address per role; a silent client's hold never closes by itself, the owner gets a
  task every 30 days; **calls stay human** — a task and a recorded outcome, no AI calling
  and no telephony; late payment is a simple 5% per unpaid month; there is no
  offer-silent timeout; the guarantee warns at day 75, and a no-show gives 5 working
  days; a new mailbox `ops@career141.com`; a new WhatsApp number for Ops.
- **The owner's standing rules:** every reject, hold, decline and drop-out needs a reason
  before saving, except a Director rejection; one ops person owns each client; client and
  Director communication stays email and WhatsApp, where the system drafts, a person
  approves and the system sends; routine notices go automatically from one approved
  template; no spreadsheets; the TA lead sets the daily 100% position; the search stops
  when an offer is given; the guarantee is 90 days from the joining day and only valid if
  the fee is fully paid; replacement first, and a 25% refund only by decision.

## 5. Hard rules (never break these)

1. **Never touch the live TA backend or the live server from a laptop.** No
   `npx convex deploy`, `convex run`, `convex import` or `convex env set` against
   `api.career141.com`, `ta-system-api.career141.com` or the VPS. A Convex deploy from the
   wrong repository replaces every function in that backend and would wipe the TA System.
2. **Every live change needs the owner's explicit go-ahead in the conversation, every
   time**, and goes through the release pipeline, never by hand.
3. **Branch and pull request.** Never commit or push to `main`. Branch names are
   `<person>/<topic>`.
4. **No secrets** in code, commits, documents, chat or example files. `.env` files stay
   local.
5. **Real clients and candidates are real.** Every message to a client, the Director or a
   candidate is drafted, approved where the rules say so, and sent through the outbound
   safety checks. Tests use test recipients only. Never switch outreach live.
6. **Data changes are migrations:** a function with a `dryRun` argument, run by the
   pipeline, never an ad-hoc script against live data.
7. **Changes to the TA System are made in the TA repository**, in its own pull request,
   and only by adding.
8. **Do not invent facts.** If something is not in these documents, in the TA code, or in
   a dated decision, mark it as open and ask the owner. Do not copy the owner's planning
   canvas cards into the repository: they hold real staff, client and candidate names.

## 6. How to work and how to write

- Plain, simple English. Short sentences. Tables. One idea at a time. The owner is not
  reading code.
- Say what is **decided** and what is a **guess**. Every system step that came from the
  owner's diagram is still a draft until the owner approves it.
- When a decision changes, write it in `docs/09-DECISIONS-AND-QUESTIONS.md` with the date,
  and update the document it affects in the same pull request.
- Finish what you start, end to end. Do not redesign what is already agreed, and do not
  add roles, screens or features nobody asked for.

## 7. Where the project stands, and what you may do now

- The plan in `15-BUILD-PLAN.md` is written and **waiting for the owner's approval**
  (pull request #3). **No Ops code may be written until the owner approves it and says to
  build.**
- Before that approval you may: read, answer questions about the plan, find gaps,
  improve the documents, and prepare the feature plan for M1 Foundations using the
  template in `docs/10-FEATURE-PLANNING.md`.
- After approval, the build order is the seven phases in `15-BUILD-PLAN.md` Part G,
  starting with Phase 1 Foundation: the new Convex deployment, roles, the Ops inbox,
  timers, messages, the events reader and the TA client. The TA-side API (Part E) is a
  separate pull request in the TA repository.
- Outside work that only the owner can do: create `ops@career141.com`, buy and verify the
  Ops WhatsApp number, give Microsoft Teams and Graph admin consent, point the website
  lead form at a webhook, and supply the ESA template with its variable fields.

**First answer back, in five lines:** what the Ops system is, how it connects to the TA
System, which document holds the plan, what the next step is, and one thing you are not
allowed to do.

---
