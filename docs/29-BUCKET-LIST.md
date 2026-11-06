# The bucket list: everything outstanding, in one place

Written 6 November 2026, at the owner's ask. One page, so nothing has to be
remembered. Each item says **whose** it is and **what it is waiting on**.

The owner's own order, in his words: *finish the TA link, then the UI changes,
then WhatsApp.*

---

## 1. The TA link — is anything missing?

**The question he asked: "we did every API call from the TA system and get
every data we need — do we already get it or not?"**

Read on both sides today. The answer is in three parts.

### Reads: complete

Ten of them, and nothing Ops does is short of data: people, clients, openings,
one opening, its pipeline, its client sets (and one by number), placements, an
application's prepared CV as bytes, and the events feed. `docs/OPS-SYSTEM-API.md`
in the TA repository is the contract.

### Writes: complete

Twenty-four endpoints, covering every change Ops makes to TA: notify, create
an opening, status, working stage, team, ad channel and posts, the client's
Ops owner, a set sent with the received date, a client decision, a
client-owned claim, a reference request, interviews and their outcomes, and the
five placement outcomes.

One deliberate gap, recorded when it was built: **who the primary recruiter is
stays a TA action**, because changing it needs a signed-in TA user.

### Events: this is the hole

Ops reacts to things that happen in TA on their own. It polls
`GET /integrations/v1/events` with a cursor, correctly, and keeps its place.

| | |
|---|---|
| Event types Ops knows how to handle | **25** |
| Event types the TA side declares | **15** |
| Event types the TA side actually raises | **5** |
| …of which raised by **TA's own work** rather than echoing an Ops write | **1** |

The one is `application.stage_changed`, raised beside TA's own `pipelineEvents`
row. The other four — `opening.created`, `opening.updated`/`closed`,
`interview.booked`, `interview.outcome` — are raised inside `opsWrite.ts`, so
they only fire when **Ops itself** just did something. They tell Ops what Ops
already knows.

**So Ops is nearly blind to TA.** The ones that matter and never arrive:

| Event | What stops working without it |
|---|---|
| `client_set.ready` | **the whole of phase 4.** A set of five CVs is ready in TA and Ops never hears. Every clock that counts from the client receiving it never starts |
| `placement.created` · `joined` · `no_show` | phase 6. The placement, the same-day notice to accounts, the joining-day clocks, the invoice |
| `offer.made` · `accepted` · `declined` | the search stopping when an offer is given |
| `director_round.sent` · `decided` | not even declared on the TA side |
| `interview.feedback` | the client's morning-after draft |
| `jobpost.live` · `closed` | the advert's own dates |
| `reference.reported` | declared, never raised |
| `opening.jd_approved` · `working_stage_changed` | one declared and never raised, one not declared |

**How big is the fix?** Each one is a single `raiseOpsEvent(ctx, "...", {...})`
beside a mutation that already exists, exactly like the one in
`pipelineStateMachine.ts`. About a dozen call sites, in the TA repository, plus
declaring the types that are missing. `raiseOpsEvent` is already wrapped so it
can never break a TA write.

**Until then there is a workaround, and it is worth knowing:** Ops can *read*
sets, pipelines and placements whenever it likes. So a clock could poll instead
of waiting to be told. That is more calls and a slower reaction, and it was
rejected when the link was designed - but it is the difference between "Ops
works, late" and "Ops does not work".

---

## 2. The UI changes

The owner's second item, and his to specify. Nothing is open from the last
pass: docs/25 is fully built, every list is on one table, and the sidebar is
eight entries.

---

## 3. WhatsApp — parked here on purpose

The whole plan is [28](28-WHATSAPP.md). In short:

1. **Coexistence** — the ops person keeps WhatsApp on their own phone, and the
   system gets a copy of everything they type. No new habit, which is the only
   version that gets used.
2. **The 1:1 messages** — already built; they work the day the number exists.
3. **Groups** — stay manual, as today. Coexistence cannot see inside a group,
   and no system can join a group it did not create.

The owner says he can connect the number to Meta and keep it working on the
phone, which is exactly what Coexistence needs.

**Before building:** check Sri Lanka is supported (Meta's country lists do not
name it), confirm the provider does Coexistence on Embedded Signup v4 or v5,
and buy the Ops number.

---

## 4. Waiting on a person, not on code

| | Who | Blocks |
|---|---|---|
| **Rotate the keys pasted into a chat on 2 November** | owner | nothing, and it gets worse with time |
| The Ops WhatsApp number | owner | all of WhatsApp |
| The redirect URL in the Microsoft app registration | owner | real sign-in only. The laptop works without it |
| The client list, the 2026-27 holidays, the ops people | owner | **the mailbox matching anything.** 34 real emails matched 0, because the system knows only invented clients |
| Is Saturday a working day? | owner | every clock that counts working days |
| The agreement template, read and corrected | owner | the first real agreement |
| An invoice template, and a credit note | owner | invoices go as lines in an email until then |
| A calendar permission for the Ops mailbox | M365 admin | the Teams link on an interview |
| The website form pointed at `/api/leads/website` | whoever runs the site | website leads arriving by themselves |
| `report.recipients` — the Director's address | owner | Monday's report having somewhere to go |
| An Anthropic or DeepSeek key, then `switch.aiEnabled` | owner | the whole AI layer, which is built and off |
| The server, backups, the pilot | owner | going live. [22](22-GO-LIVE.md) is the order |

**Not needed after all, both settled 6 November:** a new Microsoft app
registration (the TA System's keys work), and the mailbox
`ops@career141.com` (every message goes from the person's own address).

---

## 5. Code still to write, in rough order of worth

| | Why it waits |
|---|---|
| **The TA events** (section 1) | a TA pull request; the biggest single gap in the system |
| The WhatsApp webhook | the number |
| "What to do first today", and an ask box that acts | phase 9 steps 12 and 14; better built against a real key |
| Reading the client's offered interview times | phase 9, small |
| The ICS export | small |
| Phase 7's analytics | no screen; kept weekly as numbers |
| Contract tests shared with the TA repo, and the load check | both need the real API answering |
| TopJobs | built end to end; **paused by the owner on 3 November** |

---

## 6. What is done, so it is not asked again

Everything of docs/15's nine phases; the whole UI of docs/23, 24 and 25; real
Microsoft sign-in; the Convex store proved and the suites runnable against it;
the TA link's reads, writes and feed; and the mailbox reading six real
mailboxes with the newsletters filtered out.

`docs/STATUS.md` is the page that says what exists, piece by piece.
