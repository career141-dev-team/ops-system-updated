# 10 · Feature planning, one by one

The Ops work is big, so we plan it **one feature at a time** with the owner and the
Ops team, and only then build it. Each feature gets its own plan file in
`docs/features/`, written from the template below.

## Before any feature: agree the whole flow

Feature planning starts only after the owner has walked through the whole flow in
[04](04-OPS-FLOW.md) (phases A to I) and the technology is decided ([06](06-FEATURES-AND-TECHNOLOGY.md)).
Each feature plan then takes its part of the agreed flow.

## The order

The order follows what each feature depends on. Foundations first, because every
other feature uses them.

| # | Feature | Plan file | Depends on | Status |
|---|---|---|---|---|
| 1 | M1 Foundations (roles, inbox, timers, messages, TA connection) | `features/M01-foundations.md` | — | To plan |
| 2 | TA API for Ops (in the TA repository) | `features/TA-API.md` | M1 | To plan |
| 3 | M2 Leads | `features/M02-leads.md` | M1 | To plan |
| 4 | M3 Client agreement (ESA) | `features/M03-esa.md` | M1, M2 | To plan |
| 5 | M4 Requirement and hand-over | `features/M04-requirement.md` | M3, TA API | To plan |
| 6 | M6 Client CV sets and messages | `features/M06-client-sets.md` | M4, TA API | To plan |
| 7 | M7 Client decisions and chasing | `features/M07-client-decisions.md` | M6 | To plan |
| 8 | M5 Adverts | `features/M05-adverts.md` | M4 | To plan |
| 9 | M8 Interviews | `features/M08-interviews.md` | M7, Microsoft consent | To plan |
| 10 | M9 Placement and joining | `features/M09-placement.md` | M8, TA API | To plan |
| 11 | M10 Invoices and payments | `features/M10-invoices.md` | M9 | To plan |
| 12 | M11 Guarantee | `features/M11-guarantee.md` | M10 | To plan |
| 13 | M12 Reports and close | `features/M12-reports.md` | All | To plan |

## How we plan one feature

1. **Walk the flow.** Go through the feature's part of the Ops flow ([04](04-OPS-FLOW.md))
   and the canvas diagrams with the owner and the person who does the work today.
2. **Write the day.** How the Ops person uses it, step by step, like
   [05](05-A-DAY-FOR-AN-OPS-PERSON.md).
3. **Fill the template** below.
4. **Agree it** with the owner. Only then build it.

## Template

```markdown
# Mxx · <Feature name>

## Purpose
One or two sentences: what problem it solves for the Ops person.

## Who uses it
Roles and what each one does.

## The flow
Step by step, including every branch (not held, declined, silent, late).

## Rules and numbers
Every timer, limit and percentage, and where it comes from (canvas card, ESA, owner).

## Information it keeps
The Ops tables and fields (names start with `ops`).

## Connection to TA
Which API reads, writes and events it uses (see 03), and any TA change it needs.

## Messages
Every message it sends: to whom, by email or WhatsApp, drafted or automatic, template name.

## Screens
What the UI team needs to show (see 07).

## Alerts and escalations
Who is told what, and when.

## Open questions
Anything the owner must decide first.

## Done means
The checks that prove it works: tests for every timer and rule, the flow walked
with test recipients, the owner's sign-off.
```
