# Where the build actually is

Updated 9 November 2026. This is the one page that says what exists.

**Every phase of [15](15-BUILD-PLAN.md) is built, and so are the screens.** The
nine phases are below, each with where its pieces live and what proves them.
What is **not** built is one thing of size - the server and pilot half of
phase 8, which is a person's work rather than code's ([22](22-GO-LIVE.md) is
the order) - and a short list of small ones, each named under *Not built* with
the reason it waits.

No staff, client or candidate names belong on this page. The sample data in the
code is invented.

## Built: phase 1, the foundation

| Piece | Where | Proved by |
|---|---|---|
| **Sign-in: Microsoft, with the ops team as the allow-list** | `src/lib/signIn.ts`, `src/lib/seal.ts`, `src/lib/session.ts`, `app/sign-in` | `tests/signin.test.ts`. Built 6 Nov, because there was none: you picked a name from a list. Pick-your-name remains for development and is **refused outright** wherever Microsoft is set up |
| Who may do what | `src/lib/roles.ts` | `tests/roles.test.ts` |
| The desk, one API over two stores | `src/data/desk.ts` (JSON file or the Ops Convex backend) | every suite, and **the Convex store walked for the first time on 6 Nov** - every page, a lead written and read back, the clocks run. It found that `/mail` was a 500 there and fine on JSON; `tests/schema.test.ts` now guards the whole class |
| The Colombo calendar and working days | `src/lib/calendar.ts` | `tests/calendar.test.ts` |
| Settings, each change needing a reason | `src/lib/settingsRules.ts`, `app/(settings)/settings` | `tests/settingsrules.test.ts` |
| The clocks: warn, fire, leave a task | `src/lib/tick.ts`, `src/lib/timers.ts` | `tests/tick.test.ts`, `tests/timers.test.ts` |
| A fired clock doing the work, not only the task | `AFTER_FIRED` in `src/data/desk.ts` | `tests/esa.test.ts` |
| The clocks running themselves every five minutes | `convex/crons.ts` → `convex/ops/clock.ts` → `POST /api/clock` | `tests/clockpass.test.ts`, and curl |
| Escalation after a day | `src/lib/escalation.ts` | `tests/tick.test.ts` |
| One way out: draft, approve, send | `src/lib/messages.ts`, `app/messages` | `tests/messages.test.ts` |
| The three switches under sending | `src/lib/senders.ts` (`OPS_SEND`, the settings switch, `OPS_OUTBOUND_LOCK`) | `tests/senders.test.ts` |
| Wording the ops lead can edit | `src/lib/templates.ts`, `app/(settings)/templates` | `tests/templates.test.ts` |
| Reading the mailboxes, matching a reply | `src/lib/graphMail.ts`, `src/lib/mailMatch.ts`, `app/(inbox)/mail` | `tests/mailmatch.test.ts`. **Run against the real boxes on 6 Nov** with the TA System's own Microsoft keys - no new app registration was needed. 34 real messages in 19 seconds; 20 of them newsletters, billing and automatic replies, which `machineMail` now leaves out and the screen says it has |
| Files, and Word → PDF | `src/lib/files.ts`, `src/data/fileStore.ts`, `src/lib/docxToPdf.ts`, `app/(settings)/files` | `tests/files.test.ts`, `tests/docxtopdf.test.ts` |
| Call tasks (a person calls; the outcome is written down) | `src/lib/calls.ts`, `app/(inbox)/calls` | `tests/calls.test.ts` |
| The TA link: reads, writes, events | `src/lib/ta.ts`, `src/lib/outbox.ts`, `src/lib/taEvents.ts`, `app/(settings)/ta` | `tests/outbox.test.ts`, `tests/taevents.test.ts` |
| The holiday list, today's numbers | `src/lib/holidays.ts`, `src/lib/baseline.ts` | `tests/holidays.test.ts`, `tests/runthrough.test.ts` |
| One run-through of the whole phase | — | `tests/runthrough.test.ts` |

## Built: phase 2, client onboarding

| Piece | Where | Notes |
|---|---|---|
| Leads from anywhere | `src/lib/leads.ts`, `app/(clients)/leads` | one way to reply is required |
| Website leads posting themselves in | `app/api/leads/website`, `src/lib/webLead.ts` | key in a header; see [WEBSITE-LEAD-FORM.md](WEBSITE-LEAD-FORM.md) |
| Is this company already ours? | `duplicateMatch` in `src/lib/leads.ts` | exact match linked, near match only offered |
| The banking and finance rule | `flagIndustry` in `src/lib/leads.ts` | reads the company and what they say they do, **never what they want to hire** |
| The intro call, its reminders and rebooks | `src/lib/meetings.ts` | three attempts with no reply closes the lead, with a reason |
| The agreement: fields from the real template | `src/lib/esa.ts` (`ESA_FIELDS`) | every hole in the template is a required field |
| Filling the template, and the PDF | `src/lib/docxFill.ts` → `docxToPdf` | a hole with no value stops the send; a hole Word split over runs is gathered first (16 Nov) |
| Template versions, check and preview (16 Nov) | `currentTemplate` in `src/lib/files.ts`, `checkTemplate` in `src/lib/esa.ts`, the "agreement template" card on `app/(settings)/files/page.tsx`, `previewAgreement` + `fillAgreementDraft` in `app/actions.ts`, "Make a filled draft" on `app/(clients)/leads/[id]/page.tsx` | newest upload is in use; blanks nothing fills and required fields never printed are listed; a preview makes the files, no message |
| The chase: email, WhatsApp, email, WhatsApp, email, call | `CHASE_PLAN`, `chaseTheAgreement` in `src/data/desk.ts` | the clock drafts it; a person approves it; a reply stops it |
| They want changes | `recordChangesWanted` in `app/actions.ts` | chasing stops, the version moves on, the two weeks keep running |
| Signed, countersigned, declined | `app/actions.ts` | settling an agreement stops every clock on it |
| The client record | `src/lib/clients.ts`, `app/(clients)/clients` | made by the system, never typed; one company, one record, one owner |
| The desk's two morning views | top of `app/(clients)/leads/page.tsx` | meetings booked; agreements not back yet |

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
| The primary TA and the 100% day | `setPositionTeam`, screens `app/(positions)/positions` | the TA lead decides; Ops records it and tells TA |

| The LinkedIn post recorded | `recordLinkedInPost`, `src/lib/adverts.ts` | only a real LinkedIn post address is taken (a wrong link looks done), the share tail is cut, and TA is told because that is what unlocks Live |
| Talent Pulse, every Tuesday | `compileTalentPulse` in `src/data/desk.ts`, screen `app/(positions)/talent-pulse` | compiled by a clock that sets the next Tuesday itself; each role needs its TA's line and its own apply address, and an issue with a line missing is refused |

| The weekly report | `src/lib/reports.ts`, `buildWeeklyReport` in `src/data/desk.ts`, screens `app/(reports)/reports` | built at eight on a Monday by its own clock, which sets the next Monday itself; one line per open position read from TA's pipeline and our own rows; a position TA cannot be read for keeps its line and says so rather than showing a zero; the ops lead reads it, and only then is the Director's email drafted |

| TopJobs, the paid advert | `src/lib/adverts.ts`, `src/data/desk.ts`, screens `app/adverts` | a TA asks from the position, marketing's flyer (an image, never a JD), the order drafted with the flyer attached and what they charge written down, TopJobs' own live date, two weeks, then closed with the CV count TA gives us. TA is told the apply alias and the advert channel. Nothing spends anything by itself |

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
| All of a set's CVs as one zip (16 Nov) | `app/api/sets/[id]/zip/route.ts`, `zipName`/`problemWithZip` in `src/lib/clientSets.ts` | "Download all CVs" on the set page and the position's set list. Signed-in only; refuses, in words, when a CV is missing rather than leaving somebody out |
| Our own interview before the CV goes (16 Nov) | `InternalInterview`, `problemWithInternalInterview`, the last argument of `problemWithSending` in `src/lib/clientSets.ts`; `recordInternalInterview` in `app/actions.ts` | pass / hold / fail with notes, kept on the set candidate. The set refuses to go while anyone lacks a **pass**, unless setting `set.requireInternalInterview` is off (seed: on; a desk without the setting counts as on). A fail takes the candidate out of the set; the notes stay on the audit as `clientSet.internalInterview.fail`. Form on the candidate page's *Screening & contacts* view; an "Interviewed" chip per candidate on the set page |
| Candidate feedback log (16 Nov) | `subjectsOfCandidate`, `feedbackLog` in `src/lib/timeline.ts`, the *Feedback* view on the candidate page | `tests/feedbacklog.test.ts`. Read-only, newest first: our own interview, the client's decision on the CV, each round's decision, what the candidate told the TA, the reference. A candidate who failed our interview is read back from the audit, since the set no longer holds them (matched on the "Name: notes" reason, so it relies on the name being unchanged) |
| Screens | `app/sets`, `app/sets/[id]` | waiting to go, soonest due first; then sent |

| The clocks a set starts, all from the day they received it | `startReceiptClocks` in `src/data/desk.ts` | ownership, feedback chase, the two weeks before a hold, and three months for an unreported hire |
| The seven-working-day CV ownership window | `ownershipWindow` in `src/lib/clientFeedback.ts` | working days and holidays, exactly as the agreement words it |
| A claim: theirs inside the window, refused after it | `recordCvClaim` in `app/actions.ts` | the reply is drafted either way; TA is told when a candidate becomes theirs |
| The feedback chase: ask, then call, then stop | `chaseTheFeedback` in `src/data/desk.ts`, from the clock | the chase is drafted for approval; after the stop day nothing more is drafted |
| What the client decided, in their own words | `recordClientDecision` | a rejection without their words is refused; TA is told so it moves the stage |
| The silence hold, and lifting it | `proposeTheHold`, `approveTheHold`, `liftTheHold`; screens `app/holds` | proposed by a clock, held only when a person approves the notice, reviewed every thirty days, and never closing by itself |

| The client's WhatsApp group post | `sendClientSet` in `app/actions.ts` | drafted with the set; the first set for a client with no group also leaves the task to make it. Nothing sends it, so it stops at *approved*, which is the truth. **Why, corrected 6 Nov**: Meta's Groups API (Oct 2025) *can* post to and read a group - but only one the system created, and there is no way to join a group made on somebody's phone. See [28](28-WHATSAPP.md) |
| Three left means search again, five shortlisted means hold | `src/lib/depth.ts`, `evaluateDepth` in `src/data/desk.ts` | counted from TA's own pipeline after every client decision and every stage move TA tells us about; the hold is read first, so a full client is never told to search; below five again opens the opening back up by itself |
| A held client gets no sixth CV | `problemWithAnotherSet`, used by `sendClientSet` | refused with the reason; the ops lead can override, and the override is written to the audit |

| The unreported hire | `askAboutUnreportedHire`, `draftSurchargeInvoice` | three months after a set goes, a clock **asks**; a person confirms with the salary they know, and the surcharge is 50% of the fee. Nobody is invoiced by a clock, and "we were wrong" closes the question with its reason |

Still to come in phase 4: the inbound reader that proposes a client's decisions
instead of them being typed (that is Phase 9 step 8).

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
| Screens | `app/interviews`, `app/interviews/[id]` | the week board (Mon to Fri, today outlined, a pill per queue) and one interview on its own page: time tiles with free / busy as the candidate told the TA (`recordSlotAnswers`), the drafted feedback approved from the page, and ruled folds for attendance and the client's decision |

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
| Basic and allowances | `correctSalarySplit`, `feeAmount` | the placement keeps basic, allowances and TA's package text; the fee on "basic" or "gross" follows them, and correcting the split needs a reason in the audit (16 Nov) |
| The billing check | `problemWithInvoiceBilling` | no invoice drafted or sent without the client's billing name, address and email, each named when missing (16 Nov) |
| The invoice document | `sendInvoice`, `invoiceHoles` | the uploaded invoice template is filled, made a PDF and attached to the draft; a hole nothing fills refuses it by name (16 Nov) |
| Sending it | `sendInvoice` | to the billing address on the client's record, as a draft accounts approves; the clock that chases it starts from the due date, and TA is told the invoice state |
| Money in | `recordPayment` | part payments allowed, more than the balance refused (a digit too many is the usual mistake); paid in full tells accounts and the ops owner and stops every chase |
| Late | `chaseThePayment`, `lateCharge` | **1% a month, compounded**, as the agreement words it - and **nothing at all** on an invoice disputed in good faith; the chase is drafted, approved, sent, and the next one is a month later |
| Writing it off | `writeOffInvoice` | not before ninety days unless the Director of Operations decides; the guarantee is void and the position closes |
| Screens | `app/(money)/placements`, `app/(money)/invoices` | joining, joined, never happened; and late, waiting for accounts, out, settled |

| The surcharge and the credit note | `draftSurchargeInvoice`, `draftCreditNote` | both are invoices of their own kind, with what they are about written on them; a credit note is a document against an invoice, never a negative payment |
| The money as a file | `src/lib/exports.ts`, `app/api/exports/[what]` | invoices.csv and payments.csv, accounts only, one row per thing; a cell that starts with `=` is defused, because a CSV that runs formulas is a hole |
| Where we and TA may disagree | `invoiceDrift`, shown on `app/(money)/invoices` | a sent invoice whose write to TA never got through - TA's closing checklist reads that state, so it matters |

Still to come in phase 6: the **invoice document** (it waits on a template
from the owner, exactly as the agreement did - until then the lines go in the
body of the email), tax lines, and tax lines. The nightly automatic check is not built; the drift is shown on
the invoices screen instead, which is where somebody would act on it.

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
| The close list | `openCloseChecklist`, `tickCloseItem`, `completeClose`; screens `app/(money)/closes` | every way a position ends opens it: a clean end, a refund, a write-off, a void guarantee, a client who stopped, or a TA who closed the opening first. Only the items this position really had, and closing the opening in TA is an item of its own - an opening closed with a live advert is how somebody applies to a job that has gone |
| Nothing left open for a client | `completeClose` | their last position closing leaves a task, not an automatic change: whether they are finished with us is a person's call |
| Screens | `app/(money)/guarantees`, `app/(money)/closes` | ending this month first, then who has left, then the rest |

The weekly report (step 9) was built on 3 November and is above.

| The numbers | `src/lib/numbers.ts`, screen `app/(reports)/numbers` | how long an agreement takes to come back, how long a client sits on a set, how long a position takes to fill, how long the money takes, joining days that moved, guarantees kept. Every line says how many finished things it is made of, and the ones still waiting are **not** in the average - a slow month must not look fast because the slowest clients never answered |

Still to come in phase 7: the credit note **document**, which waits on the same
template work as the invoice.

## Built: phase 8, the hardening

| Piece | Where | Notes |
|---|---|---|
| The whole flow in one test | `tests/wholeflow.test.ts` | enquiry to close: a set out, the client's decision, the depth counted, an interview held, a placement, the fee invoiced and paid, ninety clean days, the position closed - and a last check that every client message is still only a draft |
| TA down, a handler throwing, every switch off | `tests/hardening.test.ts` | writes queue with their keys and wait longer each time, reads answer "could not be read" rather than throwing, one bad clock does not stop the pass, and with the senders off nothing can leave the building |
| The ops lead's own TA-writes switch | `pushOutbox` in `src/data/desk.ts` | it now really holds the link: the writes stay queued while it is off. It was read from the environment only, so the switch on the Settings screen did nothing |
| The first-day import | `src/lib/importer.ts`, screen `app/(settings)/import` | clients and who owns each, the holiday list, the ops people. A dry run first every time, and the same code builds the dry run and the real run; a bad row stops itself and names its line; a file run twice adds nothing |
| Production deploy files | `deploy/production/` | the preview's shape with production names and ports, **every switch off on the first deploy**, and the order to turn them on written at the top of the env example |
| Runbooks | `docs/runbooks/` | the wrong recipient, the mail reader stalled, the TA link down, events stuck, pausing Ops, restoring, rotating a key - and every switch in one table |
| Going live | [22](22-GO-LIVE.md) | the server once, backups rehearsed, the first deploy with everything off, one switch a day, the pilot, which sheet stops when, and what is still not built |

Still to come in phase 8, and all of it needs the server or the real API:
the contract tests shared with the TA repository (step 2), the load check
(step 6), the backups and the restore rehearsal on the machine (step 7), the
staging run and the team's walkthrough (steps 15 and 16), and the pilot
itself (steps 17 to 22).

## Built: phase 9, the AI layer

Off until the owner turns it on, and useless without a key - by design. With
neither key the desk works exactly as it does now, and every screen says so
rather than breaking.

| Piece | Where | Notes |
|---|---|---|
| One door to a model | `src/lib/ai.ts` | judgment work to Anthropic, the plain work to DeepSeek, whichever keys exist; a hard timeout; JSON or nothing; every refusal a sentence a screen can show |
| Every task's prompt | `src/lib/aiTasks.ts` | each one forbids inventing, asks for the client's own words where a reason is required, and names what it did not find rather than filling it in |
| The ledger | `opsAiRuns`, `runAi` in `src/data/desk.ts` | task, model, tokens, cost, what it read, what it proposed, and what the person did with it. Accuracy and spend are read off these rows |
| Dictation | `app/Dictate.tsx`, `dictateRequirement` | the listening is the **browser's own**: no key, no cost, nothing leaves the machine until a person presses. The fields are filled in for correction; nothing saves itself |
| Reading what a client sent | `readInbound` | proposes the decisions per candidate in the client's own words, the times offered, a claim, a cancellation - into a task to confirm. It records nothing |
| Improving a draft | `improveDraft`, `useImprovedDraft` | rewrite, shorter, warmer, more formal; the new words are offered **beside** the draft, and "use this" or "leave it" is recorded as the accuracy sample |
| Summaries | `summariseClient` | a client's own rows in a paragraph, with what it could not see named |
| The ask box | `askTheDesk`, screen `app/(settings)/ai` | read-only, from our own rows, inside what that person could read anyway, naming what it used |
| Costed, sampled, switchable | screen `app/(settings)/ai`, settings `switch.aiEnabled`, `ai.dailyBudget`, `ai.task.*` | today's spend against the cap, and how often each task's proposals were used as they came - under half and the screen says to fix the prompt or switch it off |

What it will never do, and why: no AI telephone calls (the owner's decision
7); no AI deciding a rejection, a hold or a decline; no AI sending anything;
no AI writing to the TA System; no AI setting a money figure. CV reading,
scoring and matching stay in the TA System.

Still to come in phase 9: the reply drafting screen (the rule and the prompt
are built, the button is not), "why this first" on the day page, and the ask
box that *does* things (step 14) - which is deliberately last.

## Built: the screens

Three documents, in the order they were written, and the last one is the one
that counts: [23](23-UI-PLAN.md) is the first plan, [24](24-UI-STRUCTURE.md)
says what every screen must carry and where the AI appears, and
[25](25-UI-ARCHITECTURE.md) is the layout as it stands - written after the
owner said on 5 November that the screens were still sloppy, with tabs inside
tabs and nothing joining the parts. 25 replaced the layout halves of 23 and 24;
their rules about *wording* still hold.

The rule is three levels and never four: the sidebar, the page, and one tab bar
on that page.

| Piece | Where | Notes |
|---|---|---|
| The top bar (13 Nov; the sidebar before it) | `src/lib/nav.ts`, `app/TopBar.tsx`, `src/lib/topBar.ts`, phone: `app/PhoneNav.tsx` | The approved Figma design: My Work · Clients · Openings · Interviews · Placements across it, as the design shows; The work · Inbox · Finance · Reports · Settings and AURA behind the profile. It hides once the page is scrolled and comes back for the pointer at the top edge, keyboard focus, or a touch screen (since 14 Nov the window no longer scrolls on a desktop - the page scrolls inside its own box - so in practice the bar stays). `COVERS` says which pages each entry covers, so the "you are here" mark and the counts read one list and cannot disagree. The 5 Nov sidebar it replaces had eight entries, from 27 |
| The approved look (13 Nov) | `app/globals.css`, `app/layout.tsx`, `public/career141-lockup.png`, `public/aura-symbol.png` | the Figma variables under the existing token names, Poppins, the career141 · 20 years logo. Since 14 Nov on a desktop each page is one fixed box under the top bar that scrolls inside itself (the window does not, so the bar no longer hides), and every scrollbar is one thin pill set in `globals.css` |
| My Work (13 Nov; "Your day" before it) | `app/page.tsx`, `src/lib/myWork.ts`, `tests/mywork.test.ts` | the Figma "one thing at a time": three views as pills (Today · To approve · Messages), the greeting and one sentence of how much and how bad, "N of M done" from tasks finished today, **Up next** - the rules' first thing with one verb and Later (moves it to the end, writes nothing) - then the next four, See all for the whole day and every clock. The drafts list and Approve all routine moved to To approve unchanged. On a desktop only the Then list scrolls |
| My Work · To approve (14 Nov) | `app/page.tsx`, `draftKind` in `src/lib/messages.ts`, `src/lib/keys.ts` | the Figma "MW · Approvals - one draft at a time": a stack, `n of N` with arrows, pills by kind (Client emails · Agreements · CV sets · Invoices), Skip · Edit · Approve and send, A / E / S keys, Shorter · Warmer · In Sinhala through `improveDraft` (shown on the draft's page, used only when a person presses use it), Approve all routine at the foot |
| My Work · Messages (14 Nov) | `app/MessagesView.tsx`, `initialsOf` / `shortWhen` / `bubbleWhen` in `src/lib/myWork.ts` | the Figma "MW · Messages - conversations filed to their records": email conversations someone wrote to us in, the chosen one as bubbles, what AURA read in their last message (Record it opens the record, Not quite closes AURA's reading with a reason), and a reply box that drafts through `replyInThread`, so the reply waits in To approve. No calendar page yet, so Calendar opens Interviews; WhatsApp threads are not listed |
| AURA (13 Nov) | `app/AuraComposer.tsx`, `app/Chat.tsx`, `chatSay` in `app/actions.ts` | the desk assistant's name on screen. Its composer sits at the foot of My Work and posts the chat's own action, opening the AURA column with the answer; the microphone is the browser's own listening |
| One tab bar per page, never a second | `app/ui.tsx` (`Tabs`), `app/AreaHead.tsx`, `src/lib/tabs.ts`, six `(area)/layout.tsx` files | the area's bar lives in a route-group layout, and steps aside on a record, which has its own. A record's header - name, state, owner, the next-step card - sits **above** the bar and never changes between tabs |
| Every sidebar entry has a page behind it | `tests/nav.test.ts` | Money pointed at `/money`, which had no page, so clicking it gave a 404 (6 Nov). The test reads the sidebar against the filesystem rather than against anybody's memory |
| "What to do now" | `app/NextStep.tsx`, `src/lib/nextStep.ts` | the card on a page about one thing: what is waiting and on whom, the one button that moves it, and what happens by itself and when. Every word comes from the rules the buttons obey, so it cannot drift. One per kind: lead, client, set, hold, interview, position, placement, invoice, guarantee |
| The board | `app/work/page.tsx`, `src/lib/journey.ts` | `/work` is a column per stage in the order work moves. A lead's agreement outranks its meeting; a position is read **backwards from the end**, because forwards puts a placed candidate back in "with the client" over one unanswered old set. Deliberately not draggable: a stage is the consequence of a decision, not a thing you move |
| The mailbox | `app/(inbox)/mail`, `src/lib/mailbox.ts` | conversations, not messages: `Re:`/`FW:` stripped, filed-against beating the subject, two clients two threads, `In-Reply-To` joining what it answers. A reply is written in the thread and carries the header, so it lands under their email. "What we have said to them" on the client, "what the client was told" on the position |
| Every list, the same four columns | `app/ui.tsx` (`Toolbar`, `Table`, `ListRow`), `src/lib/listing.ts` | name with its one plain line · state as short chips · owner · last moved, over a plain GET form. Every word of a search must appear; late first is the default order; an unknown order is the default rather than a blank table; an empty table says what would fill it |
| One box that finds anything | `app/find/page.tsx` | enquiries, clients, positions, sets, interviews, placements and invoices in one search, on the same rule the lists use, so what it finds and what a list finds are the same thing |
| Light and green, in one place | `app/globals.css`, `app/ui.tsx` | one header, one tab bar, one table, one chip. Twenty-six screens cannot drift into twenty-six shapes if there is one of each |
| The AI, offered while it is off | `app/AiOffer.tsx`, `aiOffReason` in `src/lib/ai.ts` | a dashed chip saying *why* it is off - no key, or the switch - rather than a disabled button that explains nothing |

Nothing is a modal, a drawer or an overlay, and nothing hides behind a hover - bar the three the owner drew: the top bar called back, a file opened from To approve (`?view=approve&file=`), and the profile card over a blurred page (`app/ProfileMenu.tsx`: View as, Dark mode, Sign out).

### The UX order (docs/30), all eight built 7 to 8 November

The owner asked, as the ops person on the phone all day: would you use this?
The answer was "partly", seven questions were put with a recommended answer
each, and he said *all yes*. [30](30-UX-ORDER.md) is the order; every step
was its own pull request, walked in the browser before it merged, and most
walks found something the tests had passed.

| Step | Where | What it is |
|---|---|---|
| 1 The board | `app/work/page.tsx` | ash stage containers, white cards, an empty stage collapses to a strip |
| 2 Approve from the list | `app/page.tsx`, `approveOne` in `app/actions.ts`, `app/Toast.tsx` | a draft reads inline under a `details` and approves there through the same gate; "approve all routine" takes exactly the template-approved drafts; a three-second line confirms every action |
| 3 The bell | `src/lib/bell.ts`, `app/Bell.tsx`, `app/api/bell/route.ts` | one number in the sidebar, the top of Your day added up, polled every 30 seconds and on the tab coming back; red when something is late; a link to Your day and nothing more |
| 4 The timeline | `src/lib/timeline.ts`, the History tab on a client and a position | everything under a client or a position, as plain sentences, newest day first. Every action the desk writes has words; an unnamed state move still reads "went from X to Y" |
| 5 Quick-add | `app/QuickAdd.tsx`, `src/lib/quickAdd.ts` | a call, a note or an enquiry from the sidebar on any page, saved through the same writes and leaving you where you were; a note is a task to yourself due the next nine in the morning. Its walk found and fixed the JSON store's stale-cache overwrite in `next dev` (`src/data/store.ts` re-reads when the file's mtime moved) |
| 6 What first | `src/lib/whatFirst.ts`, `dayItems` in `src/data/desk.ts`, the "First today" card on Your day - since 13 Nov the Up next card on My Work | the rules choose the first thing (late, a draft a person must read, due today, a clock, routine); the AI writes one line only when a person asks, kept per person, day and first thing |
| 7 The phone | `app/Sidebar.tsx`, `PHONE_PAGES` in `src/lib/nav.ts` | under 768px a top bar, an in-flow menu and a bottom bar with Your day · Inbox · The work · Clients; the desk unchanged |
| 8 The keyboard | `src/lib/keys.ts`, `app/Keys.tsx` | J/K move, A approves, Enter opens, / finds; nothing while typing; pages mark their rows with `data-row`, `data-open`, `data-approve` |

### The desk assistant (docs/31), begun 8 November

| Piece | Where | Notes |
|---|---|---|
| The catalogue and the resolver | `src/lib/agent.ts`, `tests/agent.test.ts`, `tests/agent-more.test.ts` | 57 intents over 56 real server actions (the type makes `actions.ts` provide every one); words resolved against the desk - "the last email" names the draft on the button, a client must be a whole or unambiguous name, money is on the button, a missing permission is refused in words |
| The model's part | `agentPrompt` in `src/lib/aiTasks.ts`, task `agent` in `src/lib/ai.ts` | words into an intent and fields, as JSON, and nothing else; it never executes |
| The thread | table `chat` on both stores (`OpsChatRow`), `chatSay` / `chatDo` / `toggleChat` in `app/actions.ts` | a button runs the same action the screen runs with the same FormData; its redirect is caught and the sentence on it is the result |
| The polish (9 Nov) | `app/Chat.tsx`, `nextSteps` / `editFrom` / `Shown` in `src/lib/agent.ts`, `tests/agent-polish.test.ts` | a shade under the column; three steps on every plan; every claimed row linked to its record, answers and results naming their sources; the reply's space laid out before it arrives so nothing jumps; one line of a plan changed by typing; the next three actions as one-tap suggestions |
| The missing-field turn, and yesterday | `pendingMark` / `answerPending` / `yesterdayInWords` in `src/lib/agent.ts`, `chatSay` | one question at a time, the next words are the answer, no model between; yesterday's line counted from the thread; a pressed proposal is the ledger's "used", one left behind is "ignored" |
| The feed | `src/lib/feed.ts`, `app/api/chat/route.ts` | what arrived by itself - new mail (with *Mark it done*), your clock that ran out, a task made or passed to you, a TA event - as lines in the thread, kept once each; the column polls every 30 s like the bell. Mail reading runs in the clock pass (`app/api/clock/route.ts`) every five minutes; until 8 Nov it ran only from the button on /mail while the page said "every two minutes" |
| The column and the page | `app/Chat.tsx`, `app/layout.tsx`, `app/chat/page.tsx`, the toggle behind the profile in the top bar (the sidebar's header until 13 Nov); named AURA since 13 Nov | the owner's reference shape: a label not a bubble for the assistant, a dark pill for the person, "Here is what I will do" rows, "Does this look right?", a result card; the desk's state pinned on top; on the phone it replaces Clients in the bottom bar |

## Real data, from a month of mail (9 Nov)

| Piece | Where | Notes |
|---|---|---|
| A month's mail import | `deploy/local/import-mail-history.ts` | the five-minute reader's own path, paged by how far each raw page reached, a minute a page and three tries; same filters, nothing twice, no model. How to run it and what it cannot give: [26](26-RUN-IT-FOR-REAL.md) section 3.1 |
| Your own mailbox | `/mail` (Your mailbox · Shared boxes · Everything), the bell, the chat's feed and its pins, "Mark email done" | each counts the person's own box; with a month of real mail in, every bell read the whole desk |
| A client's mail files itself | `takeInbound` in `src/data/desk.ts` | the address kept on the client record is a contact until the TA link's contacts arrive; a domain two clients share is still asked about |
| Mail on the day and on the client | `dayItems`, `whatFirst` (kind `mail`), `clientNextStep` (`unanswered`) | "N emails in your mailbox wait for an answer" ranks after a draft; a client with mail waiting says so, each email counted once across mailboxes |
| The ops admin sees the desk | `seesWholeDesk` in `src/lib/roles.ts`, `/mail`, Your day | the ops lead and the Director open on everything; an ops owner on their own box (9 Nov) |
| The TA events cursor is a time | `eventsAfter` in `src/lib/ta.ts`, `readTaEvents`, the stand-in in `src/data/fakeTa.ts` | the live route takes `after` in milliseconds and answers `cursor`; an id was refused with a 400 on the second read. The 5 Nov note that it took an id was wrong |
| Depth waits for the client | `depthApplies` in `src/lib/depth.ts`, `evaluateDepth` | the two rules apply once a set has gone or a candidate is at a client stage; on the first real events run they queued "search again" for 23 live openings that had never sent a set |
| The reader says why | `readOneMailbox` | the error behind "could not be read", 429 named, and a time limit the import may lengthen; the clock keeps 15 seconds |
| The reader moves forward (16 Nov) | `readAllMailboxes` in `src/lib/graphMail.ts`, `readTheMailboxes` in `src/data/desk.ts`, setting `mail.reached.<box>` | our own and machine mail is never stored, so "start after the newest stored mail" re-read the same dropped page every pass and a client's reply behind it was never reached. Each box now keeps a cursor of its own: the newest receivedDateTime plus the ids seen at that second, so two messages in one second are never skipped. Pages are followed by Graph's `@odata.nextLink` (up to four a pass), not by asking again after a time. The cursor is saved only after the mail is recorded. More than 100 messages in one second would stall (not expected) |
| Files and Sent Items (16 Nov) | `attachments`, `direction`, `to` on the inbound row (both stores), `app/(inbox)/mail/[key]`, `tests/mailcursor.test.ts` | the names of an email's files are kept (inline pictures left out) and listed on the thread. Each box's Sent Items is read with its own cursor (`mail.reached.<box>#sent`) and filed into threads as "we wrote" - read state "actioned", never counted as new mail, and it never calls `recordReply`, so our own mail cannot stop a chase. A copy of something this system sent is skipped (same id, or same subject and recipient within ten minutes) so it is not shown twice |

## Not built

**The server and pilot half of phase 8**, which is a person's work, not code's.
[22](22-GO-LIVE.md) is the order: the server once, backups rehearsed before
anything real is in it, the first deploy with every switch off, then one switch
a day, then two weeks with one client.

Small things still open, each with its reason:

| Thing | Why it waits |
|---|---|
| The invoice and credit-note **template files** | the filling, PDF and attaching are built (16 Nov, `src/lib/invoiceDoc.ts`, `sendInvoice`); what waits is the owner's Word template. Until it is uploaded on the Files screen an invoice goes as lines in the body of an email, and the invoice page says so |
| The Teams meeting made from the Ops mailbox | a calendar permission nobody has granted |
| The WhatsApp conversation view | waits on the Ops WhatsApp number existing |
| Phase 7's analytics (step 16) | no screen; kept weekly as numbers |
| The desk assistant: what stays a screen | [31](31-AGENT.md) names them: anything that takes a file, settings and wording, a reply inside a thread, the ten-field forms, the team on a position. All four parts of 31 are built (8 Nov) |
| Reading the client's offered interview times; the ICS export | phase 9, and small |
| Contract tests shared with the TA repo, and the load check | both need the real API answering rather than the stand-in |
| TopJobs | built end to end; **paused by the owner on 3 November** |

## The link to TA is real, and shut

The TA side of the API **exists and is live**. ta-system PR #361 was merged on
5 November and released, so `convex/integrations/opsRead.ts`, `opsReadHttp.ts`,
`opsWrite.ts`, `opsWriteHttp.ts` and `convex/lib/opsEvents.ts` - all in the
**ta-system** repository - are running in production. The contract is
`docs/OPS-SYSTEM-API.md` there.

It answers 401 until somebody sets the token, so Ops still runs on the stand-in
(`OPS_TA_FAKE=on`) and every screen says so. Three settings open it, in order:

| Set this | Where | What it does |
|---|---|---|
| `OPS_API_TOKEN` | the TA deployment | opens the door at all. The same value goes on Ops as `OPS_TA_TOKEN` |
| `OPS_TA_FAKE=off`, `OPS_TA_READS_ENABLED=on` | Ops | real people, real openings, the real events feed |
| `OPS_API_WRITES_ENABLED=on` + `OPS_API_ACTOR_EMAIL` | the TA deployment | lets Ops write. Ops needs `OPS_TA_WRITES_ENABLED` **and** `switch.taWritesEnabled` in Settings as well |

Either side off and a write waits in our outbox. Nothing is lost, and nothing
goes twice: every write carries an idempotency key the TA side keeps.

## Planned, and worth reading before anything AI is built

[21](21-AI-OPPORTUNITIES.md) and Phase 9 of [15](15-BUILD-PLAN.md), added 3 November:
the AI productivity layer - dictation into our own fields, reading what arrives,
improving the drafts we already make, summaries, and one ask box - with what the TA
System already does (and so is never rebuilt here), what is refused and why, the cost
and accuracy machinery, and the priority order. It is **built and switched off** - see phase 9 above; what is left of it is in *Not built*.

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
- `OPS_API_TOKEN` on the TA deployment, and the same value as `OPS_TA_TOKEN`
  here, or the link stays shut and Ops runs on recorded sample data.
- The Ops WhatsApp number bought and verified, or there is no WhatsApp
  conversation to show.
- An `ANTHROPIC_API_KEY` or a `DEEPSEEK_API_KEY`, then `switch.aiEnabled` in
  Settings. Either key alone is enough; with none the layer is off and every
  screen says which of the two reasons it is.

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
node tests/run.mjs        # all 51 suites, each in its own process, on the JSON store
npm run test:convex       # the same 46 against the Ops backend on this laptop
npx tsc --noEmit          # types
```

Both are green on `main`, and CI runs them on every push.

Two things a laptop cannot do, and says so plainly rather than failing: make a
PDF without LibreOffice, and reach Microsoft or Meta without credentials.
