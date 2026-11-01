# 00 · Context for a new chat (read this first)

Paste or point any new AI chat (or new teammate) at this file. It says what the
project is, what is decided, where everything is, and what to do next, so nobody has
to explain the TA System and the Ops system again.

_Last updated: 1 Nov 2026._

## 1. The business in one paragraph

Career 141 is a recruitment company in Sri Lanka. **Clients** (companies) ask Career 141
to fill **positions**. **Ops** staff handle the client side: new enquiries, the client
agreement (**ESA**), the requirement meeting, sending CVs to the client, booking
interviews, the placement, the invoice and the 90-day guarantee. **TAs** (talent
acquisition recruiters) handle the candidate side: adverts, CVs, screening, follow-up,
sets of CVs for the **Director** (Mr Azeem) to review, then for the client.

## 2. The two systems

| | TA System | Ops system |
|---|---|---|
| What | The recruiter (candidate) side | The client side |
| State | **Live production** since 21 Sep 2026 at https://ta-system.career141.com, 78,000+ candidates | **Phase 0, start-up.** No code yet |
| Repository | `career141-dev/ta-system` | `career141-dev/ops-system` (this one) |
| Stack | Next.js 16 + self-hosted Convex (116 tables) on the VPS, Clerk, Microsoft Graph mail, Meta WhatsApp, Cloudflare R2, Qdrant | Proposed: the same stack, its own backend and database ([02](02-ARCHITECTURE.md)) |
| Knowledge | `/ta-system-full-flow` skill + 12 feature skills in the TA repo | This `docs/` folder + the owner's `/ops` skill |

**The client comes first into Ops. The position opens in TA only after the client has
signed the ESA and the requirement meeting has happened.** Ops stays with the client
until the guarantee ends. See the whole flow in [04](04-OPS-FLOW.md).

## 3. What is decided

- **Ops is a separate system** (28 Oct): its own repository, backend and database, on
  the same VPS and Postgres server as TA, connected to TA **only by TA's API**. The
  live TA System must never be put at risk; TA only gets *added* API endpoints.
- **Backend first;** the UI team designs the screens later.
- **Plan feature by feature,** agree each with the owner, then build.
- **Order of work now:** (1) agree the whole flow → (2) decide the technology → (3) update
  the documents → (4) build. **We are at step 1.**
- Business rules: see [09](09-DECISIONS-AND-QUESTIONS.md) (dated list) and the numbers
  table in [04](04-OPS-FLOW.md), section 13.

## 4. Where everything is

| Need | File |
|---|---|
| Start-up plan and current step | [01](01-STARTUP-PLAN.md) |
| Architecture | [02](02-ARCHITECTURE.md) |
| Ops ↔ TA connection (ownership, API, events) | [03](03-CONNECTION-TO-TA.md) |
| **The whole corrected flow with diagrams** | [04](04-OPS-FLOW.md) |
| A day for an Ops person | [05](05-A-DAY-FOR-AN-OPS-PERSON.md) |
| Features (M1-M12) and proposed technology | [06](06-FEATURES-AND-TECHNOLOGY.md) |
| Screens, for the UI team | [07](07-SCREENS.md) |
| How the TA System works today, and what Ops reuses | [08](08-TA-SYSTEM-FOR-OPS.md) |
| Decisions and open questions | [09](09-DECISIONS-AND-QUESTIONS.md) |
| Feature planning order and template | [10](10-FEATURE-PLANNING.md) |
| People and roles | [11](11-PEOPLE-AND-ROLES.md) |
| Glossary | [12](12-GLOSSARY.md) |
| What was corrected from the canvas, and why | [13](13-CORRECTIONS-LOG.md) |
| The owner's diagram c5237, all 250 steps, read deeply | [14](14-DIAGRAM-DEEP-WALKTHROUGH.md) |
| **The build plan** for the whole backend, stage by stage | [15](15-BUILD-PLAN.md) |
| Every problem on the board with its solution | [16](16-PROBLEM-REGISTER.md) |
| Every card checked against the plan | [17](17-BOARD-COVERAGE.md) |
| The simulated working day, verified TA gaps, final technologies and connection points | [18](18-OPERATIONS-SIMULATION.md) |
| **The TA System improvement plan** (verified, 12 sections) | [19](19-TA-SYSTEM-IMPROVEMENT-PLAN.md) |
| Source material (analysis, 26 connection points, diagrams as step lists) | [`reference/`](reference/) |

## 5. Sources and how reliable they are

1. **The owner's planning canvas** ("Career 141 operations", Thinking Room share): 59
   cards, re-read on 28 Oct and 1 Nov and unchanged since 27 Oct. The share link's key is **not**
   stored anywhere; ask the owner for it. Locked cards: today's ops workflow (c719), the
   job-to-joining archive map (c713), the business flows (c2790, c3002, c3626), the ESA
   terms (c2511). The newest system flow is **c5237**; every system step on it is still
   a draft. Dated notes (20, 22, 23, 26 Oct) override older cards.
2. **The TA System code** (checked on 27-28 Oct) for what exists today.
3. **The owner's decisions in chat** (27-28 Oct), recorded in [09](09-DECISIONS-AND-QUESTIONS.md).

When sources disagree: newest dated decision > c5237 > locked business flows > older
system flows > older mapping tables.

## 6. Rules for whoever works here

- Read [`AGENTS.md`](../AGENTS.md). Never touch the live TA System; nothing from this
  repository deploys to the TA backend; no secrets; every client message goes through
  the safety checks; branch + pull request.
- Write for non-technical readers: plain, simple English. The owner prefers short
  sentences, tables, and one idea at a time.
- Do not invent facts. If something is not on the canvas, in the TA code or in a
  decision, mark it ⚪ open and ask.
- The raw canvas cards contain real staff, client and candidate names; do not copy
  them into this repository.

## 7. The next step

**Now (1 Nov):** the owner reviews the build plan in [15](15-BUILD-PLAN.md), asks questions,
and approves it. Then building starts at stage S0.

Earlier plan:

Walk the owner through the flow in [04](04-OPS-FLOW.md), phase by phase (A to I), and
record every answer in [09](09-DECISIONS-AND-QUESTIONS.md). When the flow is agreed,
decide the technology for each feature ([06](06-FEATURES-AND-TECHNOLOGY.md)), then plan
M1 Foundations with the template in [10](10-FEATURE-PLANNING.md).
