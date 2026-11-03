# 20 · Replacing the Ops sheets, the way the TA System replaced its own

_Written 2 Nov 2026. The owner's instruction: the Ops sheets must be replaced inside the
system, in the same way the TA System replaced its Master Sheet, not merely "mapped"._

Document [15](15-BUILD-PLAN.md) section D4 lists each sheet in one line. That is enough to
build a table, and not enough to retire a sheet. This document is the method, the sheet by
sheet plan, and the list of what is still needed from the Ops team.

## 1. What the TA System actually did, and why it worked

The TA System did not copy the Master Sheet into a screen. It made the record the truth and
the sheet a view of it.

1. **Every column became a field on a real record** (`jobs`), not a cell in a grid.
2. **The sheet became one screen** over those records, editable cell by cell, so nobody had
   to open another tool.
3. **Every change asks why.** `ta/openings:updateMasterSheet` refuses a change without a
   reason of 3 to 500 characters.
4. **Only desk-wide people may change it** (admin, director, TA lead), so the one shared
   view cannot be quietly rewritten by anyone.
5. **Every change is logged with its before and after** (`activityLog`, action
   `master_sheet_updated`), which is what killed the "who changed this?" argument.
6. **Derived columns stopped being typed.** Status, dates and counts are computed from the
   work itself (`masterSheetStatusFields` in `src/lib/masterSheet.ts`), so they cannot drift
   from reality.
7. **Export stayed.** People could still get a file out, so nobody felt locked in.

The lesson for Ops: a sheet dies when **(a)** its columns live on records, **(b)** one screen
shows them, **(c)** the numbers are computed not typed, **(d)** changes need a reason and are
logged, and **(e)** an export exists. Anything less and the sheet comes back in a week.

## 2. The sheets and the WhatsApp post, and what replaces each

Each row names the sheet, who keeps it today, the problem the board records against it, and
the screen that replaces it. "Computed" means the system works the value out; nobody types it.

### 2.1 Master sheet · kept by Zainab and Rushda

Client, position, TA, status, dates, values.

- **Replaced by:** the TA System's existing Master Sheet screen for the recruiter columns,
  plus the Ops **positions** screen for the client-side columns (`opsPositions.stage`).
- **Computed, not typed:** status, stage, days open, candidates sent, set numbers, TA name,
  handover date, close date.
- **Typed once:** client, position, package, location, level, at the requirement meeting.
- **Why it ends:** the opening is the record. Ops reads it through `GET openings` rather than
  keeping a second copy. Today the two copies disagree, which is the whole problem.

### 2.2 Client sheet · kept by the owners, "by 9:30 AM"

Client, contacts, ESA state, owner.

- **Replaced by:** the **clients** screen. Contacts and the agreement state come from TA
  `clients` plus `opsEsa`; the owner is `opsOwnerId`; anything Ops-only (notes about the
  client, how they like to be contacted) is `opsClientProfiles`.
- **Board problem it fixes:** "No master client contact sheet. Sapna asked for one on
  14 May 2026", and "tabs are not always updated".
- **Why it ends:** there is one client record, with one owner, that both sides read.

### 2.3 Job order status sheet · kept by Asma and Zainab

Handover date, TA, 100% day.

- **Replaced by:** the opening itself. `jobs.assignedAt` is the handover, the TA comes from
  `jobAssignments`, the 100% day from `workingStage`, and `opsRequirements.openedAt` records
  when Ops handed it over.
- **Board problem it fixes:** "The handover date is unclear."
- **Why it ends:** the hand-over writes the date, so nobody has to remember to.

### 2.4 ESA tracker · kept by Rushda

Sent, chased, signed, countersigned.

- **Replaced by:** the **clients and ESA** screen. `opsEsa` holds the state, `opsTimers` the
  clocks, `opsMessages` every chase that went out and when.
- **Computed, not typed:** days since sent, which chase step is next, the decline date,
  whether the countersigned copy went back.
- **Board problem it fixes:** "Follow-ups miss the KPI of activation within 5 working days",
  and the copy that came back unsealed and was resent on 22 Apr 2025.
- **Why it ends:** the tracker existed to remember the clock. The clock is now in the system.

### 2.5 Interview summary sheet · kept by Rushda, Rakshana and Haifa

Date, candidate, client, round, outcome.

- **Replaced by:** the **interviews** screen, over TA `interviews` plus `opsInterviews`.
- **Computed, not typed:** round number, state, who scheduled, attendance, the Teams link,
  and the full history of every reschedule.
- **Board problem it fixes:** "Reschedules are not tracked."
- **Why it ends:** every booking and change already passes through the system, so the list
  writes itself.

### 2.6 Placement Updates · a WhatsApp group post by Jesmin, Insha and Rushda

Client, role, candidate, joining date, source.

- **Replaced by:** `opsPlacements` plus the same-day notice to accounts and the ops owner.
  The group post text is still drafted, for whoever wants to post it, but it is no longer
  how the news travels.
- **Board problem it fixes:** "30 Mar 2026: Asma learned of a January joining only then",
  and "Pls confirm if all 3 joined" asked on 1 Jul 2025.
- **Why it ends:** the TA now has to enter the package, the joining date and the offer letter
  at Place (live in the TA System from 2 Nov), and that is what triggers the notice.

### 2.7 Two more sheets the diagram names, and one naming question

Re-reading the as-is diagram (c719) on 2 Nov turned up two sheets this document had missed,
and one thing to confirm with the team.

- **Performance sheet** (step n730, internal shortlist, the TA then the Director). Replaced
  by the TA System's own Director review and set records, which already hold who was
  shortlisted and when. The board's problem against it is that the Director does not say why
  a candidate was not shortlisted, and that stays true: his rejections need no reason, by his
  own rule. Nothing to build; the sheet is already redundant.
- **Summary sheet** (step n749, round 2 or drop, kept on the client's side). It is listed
  against the client, not against us, so it may be the client's own file rather than ours.
  **To confirm with Rushda.**
- **"Job sheet", "TA job sheet" and "job order status sheet"** appear on three different
  steps (n726, n733, n725). They may be one file under three names, or three files. **To
  confirm before mapping columns.**

### 2.8 Invoices and payments · no sheet today

- **New, not replaced:** `opsInvoices` and `opsPayments`, with the CSV export the owner asked
  for, since accounting has no tool today and invoicing is manual.

## 3. The rules every replacement screen follows

Taken from what worked on the TA side, and from the owner's standing rules.

1. **One screen per old sheet.** If the ops person has to open a spreadsheet for anything,
   the replacement is not finished.
2. **Computed beats typed.** Any column that can be worked out from the work is computed.
   A typed status is a status that will be wrong by Friday.
3. **A reason before saving,** for every reject, hold, decline, drop-out and every manual
   correction of a computed value. Director rejections are the one exception.
4. **Every change logged** with before, after, who and why (`opsAudit`), as TA's
   `activityLog` does.
5. **Who may change what** follows the roles in [15](15-BUILD-PLAN.md) D2. The shared views
   are not editable by everyone.
6. **TA data is read-only on Ops screens.** Ops never keeps a second copy of an opening, a
   candidate or a placement.
7. **Export exists** on every list screen: CSV, so nobody is locked in and the first weeks
   feel safe.
8. **Nothing is retired until its replacement is used for two weeks** in parallel, and the
   person who kept the sheet says the screen is enough.

## 4. The first-day import

The sheets hold history that must not be lost. Phase 8 of the build plan does this; the
sources are the sheets themselves.

| What | From | Into |
|---|---|---|
| Live clients, their contacts and owners | Client sheet | TA `clients` plus `opsClientProfiles`, `opsOwnerId` |
| Signed agreements, their dates and fee rules | ESA tracker and the signed PDFs | `opsEsa`, `opsFiles` |
| Open positions and their stage | Master sheet and job order sheet | TA `jobs` where missing, `opsPositions` |
| Placements still inside their guarantee | Placement Updates and Asma's records | `opsPlacements`, with the clock set from the joining day |
| Invoices sent and paid, and anything unpaid | Asma's records | `opsInvoices`, `opsPayments` |
| The six-month baseline (agreement return times, client waits, slipped joinings) | The archive | `opsReports` kind `baseline` |
| Sri Lanka holidays | The 2027 calendar | `opsHolidays` |

Every import is a migration with a `dryRun` first, and the counts are shown to the owner
before anything is written.

## 5. What is still needed, and from whom

This document names the columns the board records. The real sheets will have more, and the
extra ones are exactly where a screen fails if we guess.

| Needed | From | Why |
|---|---|---|
| The master sheet, as it is today (export or a copy) | Zainab, Rushda | To map every column, including the ones nobody mentions but everyone uses |
| The client sheet, with its tabs | The owners | Contacts, tabs, and whatever is kept per client |
| The job order status sheet | Asma | Handover and allocation columns |
| The ESA tracker | Rushda | The chase columns, and how "activation in 5 working days" is measured |
| The interview summary sheet | Rushda, Rakshana, Haifa | Round and outcome vocabulary as they actually write it |
| Whether "job sheet", "TA job sheet" and "job order status sheet" are one file or three | Asma, Zainab, the owners | Three names appear on three steps of the diagram |
| Whether the round-2 "summary sheet" is ours or the client's | Rushda | The diagram lists it against the client |
| Asma's invoice and payment records | Asma | The fee rules in use, and anything unpaid right now |
| One real signed ESA with its variable fields marked | The owner | The template the system drafts from |

Until those arrive, section 2 is the plan and section 5 is the gap. Nothing here is built;
the Ops build starts only when the owner approves [15](15-BUILD-PLAN.md).
