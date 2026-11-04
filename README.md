# Career 141 · Ops System

The Ops system runs the **client side** of Career 141's recruitment business: new
leads, client agreements (ESA), requirement meetings, CV sets sent to clients, client
feedback, interviews with clients, placements, invoices and the 90-day guarantee.

It is a **separate system** from the TA System (the recruiter side, live at
https://ta-system.career141.com). The two are connected through an API, so information
moves between them and nothing is typed twice, but **the live TA System is never changed
or put at risk by Ops work.**

**The client comes first into Ops.** Only when the client has signed the agreement and
the requirement meeting has happened does the position open in the TA System. Ops stays
with the client until the guarantee ends.

## Status

**Phases 1 and 2 are built, tested and merged** (3 November 2026): the foundation, and
client onboarding from a lead to a countersigned agreement and a client record. Phase 3
is next. One page says exactly what exists and where each piece lives:
[`docs/STATUS.md`](docs/STATUS.md).

The link to the TA System is still a stand-in (`OPS_TA_FAKE=on`) until TA's own API is
built, which is a pull request in that repository.

Waiting on a person rather than on code: the agreement template read and uploaded, the
preview server's once-only setup, Microsoft 365 permission for the mailboxes, the website
form pointed at `/api/leads/website`, and the holiday list.

## Running it

**Screens only, no backend.** Invented sample data, pick-your-name sign-in. The quickest way
to look at the app.

```sh
npm install
deploy/local/start-ui.sh     # http://localhost:3300
```

**With the Ops backend on this laptop.** Needs Docker. Its own Convex instance on port 3310
and its own Postgres, so it cannot touch the TA System's local backend or anything live.

```sh
deploy/local/start.sh        # app 3300, backend 3310, dashboard 6891
```

## Checks

```sh
npm test            # the calendar, the clocks, the message gate, roles, the store
npm run typecheck
```

## Start here

**New chat or new teammate? Read [`docs/00-CONTEXT-FOR-A-NEW-CHAT.md`](docs/00-CONTEXT-FOR-A-NEW-CHAT.md) first.**

| # | Document | What it tells you |
|---|---|---|
| 00 | [Context for a new chat](docs/00-CONTEXT-FOR-A-NEW-CHAT.md) | The whole project on one page: business, two systems, decisions, where things are, next step |
| 01 | [Start-up plan](docs/01-STARTUP-PLAN.md) | Phase 0 step by step and what is done |
| 02 | [Architecture](docs/02-ARCHITECTURE.md) | How Ops is built and why it is separate from TA |
| 03 | [Connection to TA](docs/03-CONNECTION-TO-TA.md) | Who owns which data, the 26 connection points, the API and events |
| 04 | [**The whole flow**](docs/04-OPS-FLOW.md) | From a new client to the end of the guarantee, in 9 phases with diagrams |
| 05 | [A day for an Ops person](docs/05-A-DAY-FOR-AN-OPS-PERSON.md) | How the system helps an Ops person through a working day |
| 06 | [Features and technology](docs/06-FEATURES-AND-TECHNOLOGY.md) | The 12 Ops features and the proposed tool for each |
| 07 | [Screens](docs/07-SCREENS.md) | How the screens should work, for the UI team |
| 08 | [The TA System today](docs/08-TA-SYSTEM-FOR-OPS.md) | How TA works, how a position opens there, what Ops reuses |
| 09 | [Decisions and questions](docs/09-DECISIONS-AND-QUESTIONS.md) | Every decision with its date, the 17 settled conflicts, 20 open questions |
| 10 | [Feature planning](docs/10-FEATURE-PLANNING.md) | The order features are planned in, and the template |
| 11 | [People and roles](docs/11-PEOPLE-AND-ROLES.md) | Who does what today, and the proposed Ops roles |
| 12 | [Glossary](docs/12-GLOSSARY.md) | Every term in plain words |
| 13 | [Corrections log](docs/13-CORRECTIONS-LOG.md) | What was corrected from the canvas and earlier plans, and why |
| 14 | [Diagram deep walkthrough](docs/14-DIAGRAM-DEEP-WALKTHROUGH.md) | All 250 steps of the owner's diagram c5237, phase by phase, with owners, arrows, labels and connection points |
| 15 | [**The implementation plan**](docs/15-BUILD-PLAN.md) | Version 2: every problem and its solution, an Ops day and a TA day side by side, every table and link, the API and events, the TA changes, integrations and the calls decision, 8 phases of 20-25 steps, release and pilot, open decisions |
| 16 | [Problem register](docs/16-PROBLEM-REGISTER.md) | Every problem line on the board (179), with its solution and where the plan builds it |
| 17 | [Board coverage](docs/17-BOARD-COVERAGE.md) | All 59 cards checked against the plan; the 9 gaps found and added as Part K |
| 18 | [Operations simulation and final plan](docs/18-OPERATIONS-SIMULATION.md) | The TA System as it really behaves (18 verified gaps), four roles, one simulated working day, every activity evaluated, TA improvements T20-T30, final technologies and the 26 connection points |
| 19 | [**TA System improvement plan**](docs/19-TA-SYSTEM-IMPROVEMENT-PLAN.md) | Verified from seven code audits: the system as it is, the workflow map with exact rules, a day per role within real access, the permission matrix and its conflicts, difficulties, 19 manual activities, 15 automation opportunities with integration and risks, integration and UX improvements, 20 prioritised recommendations, technical notes, benefits |
| 20 | [Replacing the Ops sheets](docs/20-SHEETS-TO-SYSTEM.md) | Every sheet the desk keeps today, and what replaces it |
| 21 | [Where AI earns its place](docs/21-AI-OPPORTUNITIES.md) | The AI register, module by module: what the TA System already does (and so is never rebuilt here), what is worth adding, what is refused and why, the cost and accuracy rules, and the priority order. Built as Phase 9 |
| [22](docs/22-GO-LIVE.md) | Going live: the order, the pilot, the sheets, and what stays behind |
| [23](docs/23-UI-PLAN.md) | The screens: what is wrong, the patterns, screen by screen, and the order |

Source material (the full analysis, the connection points in detail, the canvas flows as
step lists, earlier reports) is in [`docs/reference/`](docs/reference/).

## The shape of it

```
        ops-system (this repo)                     ta-system (live, untouched)
┌──────────────────────────────┐   API (v1)   ┌──────────────────────────────┐
│ Ops screens  (later, UI team) │ ───────────▶ │ TA API: read today,           │
│ Ops backend                   │ ◀─────────── │ small new write endpoints     │
│ Ops database                  │   events     │ TA backend + database         │
└──────────────────────────────┘              └──────────────────────────────┘
         Same VPS and same Postgres server, separate backend and database
```

## Rules

Read [`AGENTS.md`](AGENTS.md) before changing anything. The short version: never touch the
live TA System from this repository, never put secrets in the repository, every message to
a real client goes through the safety checks, and every change goes through a branch and a
pull request.
