# Career 141 · Ops System

The Ops system runs the **client side** of Career 141's recruitment business:
new leads, client agreements (ESA), requirement meetings, CV sets sent to clients,
client feedback, interviews with clients, placements, invoices and the 90-day
guarantee.

It is a **separate system** from the TA System (the recruiter side, live at
https://ta-system.career141.com). The two are connected through an API, so
information moves between them and nothing is typed twice, but **the TA System
is never changed or put at risk by Ops work.**

## Status

| | |
|---|---|
| Phase | **0 · Project start-up** (started 28 Oct 2026) |
| Built so far | Nothing. This repository holds the plan, the architecture and everything collected so far |
| Next | Plan each Ops feature one by one (see [`docs/10-FEATURE-PLANNING.md`](docs/10-FEATURE-PLANNING.md)), then build |
| Team | Binath and Sanjeev (Ops and TA), UI team (screens, later) |

## Start here

Read in this order:

| # | Document | What it tells you |
|---|---|---|
| 1 | [Start-up plan](docs/01-STARTUP-PLAN.md) | The first phase, step by step, and what is done |
| 2 | [Architecture](docs/02-ARCHITECTURE.md) | How Ops is built and why it is separate from TA |
| 3 | [How Ops connects to TA](docs/03-CONNECTION-TO-TA.md) | The API between the two systems, and who owns which data |
| 4 | [The Ops flow](docs/04-OPS-FLOW.md) | The whole client journey, from new lead to guarantee end |
| 5 | [A day for an Ops person](docs/05-A-DAY-FOR-AN-OPS-PERSON.md) | How the system helps an Ops person through a working day |
| 6 | [Features and technology](docs/06-FEATURES-AND-TECHNOLOGY.md) | The Ops features (modules) and the tool for each |
| 7 | [Screens](docs/07-SCREENS.md) | How the Ops screens work, for the UI team |
| 8 | [What the TA System has today](docs/08-TA-SYSTEM-FOR-OPS.md) | What Ops can reuse from TA, and what is missing |
| 9 | [Decisions and open questions](docs/09-DECISIONS-AND-QUESTIONS.md) | What is decided, and what still needs an answer |
| 10 | [Feature planning](docs/10-FEATURE-PLANNING.md) | The order we plan and build features in, and the template |

Background material (the full analysis, the connection points in detail, the
flow diagrams as step lists, earlier reports) is in [`docs/reference/`](docs/reference/).

## The shape of it

```
        ops-system (this repo)                     ta-system (live, untouched)
┌──────────────────────────────┐   API (v1)   ┌──────────────────────────────┐
│ Ops screens   (later, UI team)│ ───────────▶ │ TA API: read today,           │
│ Ops backend   (Convex)        │ ◀─────────── │ small new write endpoints     │
│ Ops database  (convex_ops)    │   events     │ TA backend + database         │
└──────────────────────────────┘              └──────────────────────────────┘
         Same VPS and same Postgres server, separate backend and database
```

## Rules

Read [`AGENTS.md`](AGENTS.md) before changing anything. The short version: never
touch the live TA System from this repository, never put secrets in the
repository, and every message to a real client goes through the safety checks.
