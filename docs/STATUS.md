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

## Built: phase 3, the hand-over

| Piece | Where | Notes |
|---|---|---|
| The requirement meeting | `bookRequirementMeeting` in `app/actions.ts` | refused until the agreement is signed; the same reminders and rebooks as the intro call |
| The requirement written down | `src/lib/requirements.ts`, on the lead page | six required fields; "the requirement was in the TA lead's head" is the fault it exists for |
| The brief TA reads | `briefText` | labelled lines, the client's own words kept |
| The role too low for the salary | `markRoleImpractical` | a drafted reply, the lead closed with its reason, and a clock to invite them back |
| Handing it to TA | `handOverToTa` | refused before the agreement is signed and refused on a half-written requirement; the opening is **queued**, never created here |
| TA confirming the opening | `takeOpeningCreated` in `src/data/desk.ts` | from TA's own event; a TA opening one by hand for our client becomes a position with "link a requirement" |
| What TA says afterwards | `takeOpeningUpdate` | the JD approved, the working stage, the closing |
| The primary TA and the 100% day | `setPositionTeam`, screens `app/positions` | the TA lead decides; Ops records it and tells TA |

| The LinkedIn post recorded | `recordLinkedInPost`, `src/lib/adverts.ts` | only a real LinkedIn post address is taken (a wrong link looks done), the share tail is cut, and TA is told because that is what unlocks Live |
| Talent Pulse, every Tuesday | `compileTalentPulse` in `src/data/desk.ts`, screen `app/talent-pulse` | compiled by a clock that sets the next Tuesday itself; each role needs its TA's line and its own apply address, and an issue with a line missing is refused |

| The weekly report | `src/lib/reports.ts`, `buildWeeklyReport` in `src/data/desk.ts`, screens `app/reports` | built at eight on a Monday by its own clock, which sets the next Monday itself; one line per open position read from TA's pipeline and our own rows; a position TA cannot be read for keeps its line and says so rather than showing a zero; the ops lead reads it, and only then is the Director's email drafted |

Still to come in phase 3: **TopJobs** — requested, the flyer, the order, live,
and closed after two weeks — which the owner paused on 3 Nov because it is the
one with money in it.

## Built: phase 4, the client side of the search

The owner asked for these before phase 3, so they stand on the stand-in TA
System rather than on an opening Ops created itself.

| Piece | Where | Notes |
|---|---|---|
| The set arrives when TA says it is ready | `takeClientSetReady` in `src/data/desk.ts` | from the `client_set.ready` event; the same event twice is one set |
| Due from the day the agreement was signed | `dueFromEsa` in `src/lib/clientSets.ts` | 7 days for the first set, 14 for a later one, and a `set.due` clock |
| Every prepared CV fetched once and kept | `reviewClientSet` in `app/actions.ts`, `preparedCv` in `src/lib/ta.ts` | so what the client received can be read back a year later |
| A candidate with no CV taken out, with a reason | `dropFromClientSet` | the set still has to hold the minimum afterwards |
| Sent to the client's own "hr" contacts, CVs attached | `sendClientSet` | at least 5 CVs, every one present, or it refuses and says which |
| The day they received it, correctable | `recordSetReceived` | everything after the set counts from this |
| Screens | `app/sets`, `app/sets/[id]` | waiting to go, soonest due first; then sent |

| The clocks a set starts, all from the day they received it | `startReceiptClocks` in `src/data/desk.ts` | ownership, feedback chase, the two weeks before a hold, and three months for an unreported hire |
| The seven-working-day CV ownership window | `ownershipWindow` in `src/lib/clientFeedback.ts` | working days and holidays, exactly as the agreement words it |
| A claim: theirs inside the window, refused after it | `recordCvClaim` in `app/actions.ts` | the reply is drafted either way; TA is told when a candidate becomes theirs |
| The feedback chase: ask, then call, then stop | `chaseTheFeedback` in `src/data/desk.ts`, from the clock | the chase is drafted for approval; after the stop day nothing more is drafted |
| What the client decided, in their own words | `recordClientDecision` | a rejection without their words is refused; TA is told so it moves the stage |
| The silence hold, and lifting it | `proposeTheHold`, `approveTheHold`, `liftTheHold`; screens `app/holds` | proposed by a clock, held only when a person approves the notice, reviewed every thirty days, and never closing by itself |

| The client's WhatsApp group post | `sendClientSet` in `app/actions.ts` | drafted with the set; the first set for a client with no group also leaves the task to make it. Nothing sends it - no system can write to a WhatsApp group - so it stops at *approved*, which is the truth |
| Three left means search again, five shortlisted means hold | `src/lib/depth.ts`, `evaluateDepth` in `src/data/desk.ts` | counted from TA's own pipeline after every client decision and every stage move TA tells us about; the hold is read first, so a full client is never told to search; below five again opens the opening back up by itself |
| A held client gets no sixth CV | `problemWithAnotherSet`, used by `sendClientSet` | refused with the reason; the ops lead can override, and the override is written to the audit |

Still to come in phase 4: the inbound reader that proposes a client's decisions
instead of them being typed (that is Phase 9 step 8), and the surcharge invoice
an unreported hire leads to (the invoice engine is Phase 6).

## Built: phase 5, interviews and the reference

The TA System keeps the candidate: it invites them, phones them afterwards and
holds their feedback. All of this is the client's side.

| Piece | Where | Notes |
|---|---|---|
| Who schedules, us or the client | `startInterview` in `app/actions.ts` | asked once at the start, because the two are different work; a client who books it themselves gets a clock that asks for the date |
| The times, asked and agreed | `requestInterviewSlots`, `recordInterviewSlots`, `recordCandidatePick` | the client's times are typed in (reading them is Phase 9); the candidate is asked by the TA, through their channels, and we record which they took |
| The slot loop that stops | `problemWithNewSlots` in `src/lib/interviews.ts` | three rounds with nothing agreed and the TA is asked for a back-up instead of another email |
| Booking it | `bookInterview` | refuses an online interview with no link and an onsite one with no address; tells TA through the outbox, drafts the invite to the interviewers, starts both clocks |
| The day before | `interview.reconfirm` → `remindAboutInterview` in `src/data/desk.ts` | nine in the morning the day before: the client's reminder drafted, and a task to have the TA reconfirm the candidate |
| The interview itself | `interview.day` clock, `markInterviewAttendance` | somebody is asked whether it happened; a no-show needs a reason and TA is told |
| A candidate pulling out | `noticeCandidateOut`, and TA's `interview.candidate_out` event | the notice is drafted whatever the hour, and how late it is said in plain words - a day is the promise, three hours the floor |
| The client cancelling or moving it | `cancelInterview` | rebooking keeps the round, so a candidate at round two stays at round two |
| What the candidate said afterwards | TA's `interview.feedback` event → `draftCandidateFeedback` | drafted for the client and due the next morning, not sent at night |
| The client's decision | `recordRoundDecision` | another round, selected, or rejected with their own words; a rejection re-counts the shortlist |
| The reference | `requestReference`, `recordReferenceReport`, `relayReference`, `recordReferenceDecision` | only when the client asks; no form and no score (the owner, 26 Oct); passed on word for word; a dropped candidate re-counts the shortlist |
| Screens | `app/interviews`, `app/interviews/[id]` | agreeing a time, booked, held and waiting on the client; everything about one interview on its own page |

Still to come in phase 5: the **Teams meeting made from the Ops mailbox** (a
calendar permission the owner has yet to grant - the link is pasted in by a
person until then), reading a client's reply for its times by itself (Phase 9),
and the ICS export.

## Built: phase 6, the placement and the money

The TA System makes the placement. This is what happens next, which is the
part that pays for everything.

| Piece | Where | Notes |
|---|---|---|
| A placement arrives the day it is made | `takePlacement` in `src/data/desk.ts`, from TA's `placement.created` event | the same-day notice to accounts and the ops owner is the point of it - the owner's own note is that Asma learns months later; the same event twice is one placement |
| The agreement's fee rule, copied onto it | `takePlacement` | the signed agreement as it stood that day, so a rule changed next year cannot change an invoice already sent |
| What TA could not give us | `missingPlacementFields` in `src/lib/money.ts` | asked for at once rather than on the joining day, because an invoice cannot be built on a package nobody wrote down |
| Three clocks before the joining day | `joinClocks`, `startJoinClocks` | a week out, the day before, and nine on the morning when the TA phones them; a clock whose day has gone is not set |
| The joining day moving | `changeJoinDate` in `app/actions.ts` | needs a reason, keeps every move, resets the clocks, tells TA - a day that slips twice is the thing to watch |
| They joined | `markPlacementJoined`, and TA's `placement.joined` event | one door for both ways in; the fee is drafted at once, because thirty days run from the first working day whether or not anybody remembered |
| They never turned up | `markNoShow`, and TA's `placement.no_show` event | nothing invoiced and nothing refunded (the owner's rule); the client's choice between a replacement and stopping is drafted, and their answer reopens or closes the search in TA |
| The fee invoice | `draftFeeInvoice` | the agreement's rule times the package, a number from the series, due thirty days from the first working day; invoicing twice is refused, and a replacement under the guarantee is not invoiced at all |
| Sending it | `sendInvoice` | to the billing address on the client's record, as a draft accounts approves; the clock that chases it starts from the due date, and TA is told the invoice state |
| Money in | `recordPayment` | part payments allowed, more than the balance refused (a digit too many is the usual mistake); paid in full tells accounts and the ops owner and stops every chase |
| Late | `chaseThePayment`, `lateCharge` | **1% a month, compounded**, as the agreement words it - and **nothing at all** on an invoice disputed in good faith; the chase is drafted, approved, sent, and the next one is a month later |
| Writing it off | `writeOffInvoice` | not before ninety days unless the Director of Operations decides; the guarantee is void and the position closes |
| Screens | `app/placements`, `app/invoices` | joining, joined, never happened; and late, waiting for accounts, out, settled |

Still to come in phase 6: the **invoice document** (it waits on a template
from the owner, exactly as the agreement did - until then the lines go in the
body of the email), tax lines, the surcharge invoice for an unreported hire
(phase 4's step), credit notes (they belong with phase 7's refunds), the CSV
exports, and the nightly check of our invoice state against TA's.

## Built: phase 7, the guarantee and the close

| Piece | Where | Notes |
|---|---|---|
| Ninety days from joining | `startGuarantee` in `src/data/desk.ts`, `endsOn` in `src/lib/guarantee.ts` | from the day they joined, not the day the fee was paid; started for every hire, including a replacement |
| Only valid on a fee fully paid | `verdictOnLeaver`, and `recordPayment` writing the paid date on | the owner's rule, and the one sentence that decides what a leaver costs us. The fee is always settled after the guarantee started, so paying an invoice in full writes that day onto the guarantee |
| The warning on day 75 | `guarantee.warn` clock → `warnAboutGuarantee` | fifteen days left: a wobble heard now may not become a leaver at all |
| A clean ninety days | `guarantee.end` clock → `endGuaranteeClean` | the internal notice, and the close list opens by itself |
| Somebody left | `markLeaver`, and the owner's button | unpaid fee → **void**, nothing replaced and nothing refunded, the position closes; paid fee → **replacing**: TA is told they left, the position reopens, and sixty **working** days start |
| A replacement | `takeReplacement`, from the next `placement.created` on that opening | marked a replacement so nothing is invoiced again, the old guarantee closes as replaced, and the new one starts its own ninety days |
| The refund | `askAboutRefund` clock → the Director's decision in `decideRefund` | **50% of what was paid** (the agreement; our board said 25%), by decision and never by a clock. The Director may decide before the sixty days are up, and that is written down as what it was |
| The close list | `openCloseChecklist`, `tickCloseItem`, `completeClose`; screens `app/closes` | every way a position ends opens it: a clean end, a refund, a write-off, a void guarantee, a client who stopped, or a TA who closed the opening first. Only the items this position really had, and closing the opening in TA is an item of its own - an opening closed with a live advert is how somebody applies to a job that has gone |
| Nothing left open for a client | `completeClose` | their last position closing leaves a task, not an automatic change: whether they are finished with us is a person's call |
| Screens | `app/guarantees`, `app/closes` | ending this month first, then who has left, then the rest |

The weekly report (step 9) was built on 3 November and is above.

Still to come in phase 7: the **analytics** (step 16 - ESA return time, client
wait on a set, slipped hires, time to fill, kept weekly as KPIs), and the
credit note **document**, which waits on the same template work as the
invoice.

## Built: phase 8, the hardening

| Piece | Where | Notes |
|---|---|---|
| The whole flow in one test | `tests/wholeflow.test.ts` | enquiry to close: a set out, the client's decision, the depth counted, an interview held, a placement, the fee invoiced and paid, ninety clean days, the position closed - and a last check that every client message is still only a draft |
| TA down, a handler throwing, every switch off | `tests/hardening.test.ts` | writes queue with their keys and wait longer each time, reads answer "could not be read" rather than throwing, one bad clock does not stop the pass, and with the senders off nothing can leave the building |
| The ops lead's own TA-writes switch | `pushOutbox` in `src/data/desk.ts` | it now really holds the link: the writes stay queued while it is off. It was read from the environment only, so the switch on the Settings screen did nothing |
| The first-day import | `src/lib/importer.ts`, screen `app/import` | clients and who owns each, the holiday list, the ops people. A dry run first every time, and the same code builds the dry run and the real run; a bad row stops itself and names its line; a file run twice adds nothing |
| Production deploy files | `deploy/production/` | the preview's shape with production names and ports, **every switch off on the first deploy**, and the order to turn them on written at the top of the env example |
| Runbooks | `docs/runbooks/` | the wrong recipient, the mail reader stalled, the TA link down, events stuck, pausing Ops, restoring, rotating a key - and every switch in one table |
| Going live | [22](22-GO-LIVE.md) | the server once, backups rehearsed, the first deploy with everything off, one switch a day, the pilot, which sheet stops when, and what is still not built |

Still to come in phase 8, and all of it needs the server or the real API:
the contract tests shared with the TA repository (step 2), the load check
(step 6), the backups and the restore rehearsal on the machine (step 7), the
staging run and the team's walkthrough (steps 15 and 16), and the pilot
itself (steps 17 to 22).

## Not built

TopJobs, phase 7's analytics, the server and pilot half of phase 8, and
phase 9's AI layer.

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
- The Director's address in the setting `report.recipients`, or an approved
  weekly report has nowhere to go.
- The invoice template, as a document, before a real invoice can be sent as
  anything but the lines in an email.
- A calendar permission for the Ops mailbox, or an interview's Teams link
  stays something a person pastes in.

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
node tests/run.mjs        # all 36 suites, each in its own process
npx tsc --noEmit          # types
```

Both are green on `main`, and CI runs them on every push.

Two things a laptop cannot do, and says so plainly rather than failing: make a
PDF without LibreOffice, and reach Microsoft or Meta without credentials.
