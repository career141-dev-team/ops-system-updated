# Where the build actually is

Updated 21 November 2026. This is the one page that says what exists.

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
| **Sign-in: Microsoft, with the ops team as the allow-list** | `src/lib/signIn.ts`, `src/lib/seal.ts`, `src/lib/session.ts`, `app/sign-in` | `tests/signin.test.ts`. Built 6 Nov, because there was none: you picked a name from a list. Pick-your-name remains for development and is **refused outright** wherever Microsoft is set up. **Clerk replaced it as the door on 20 Nov** (committed on `hdbinath/clerk-auth-roles`, row under *Ops v6 backend gaps*); the Microsoft code stays, and Graph mail and calendar still use the Microsoft app |
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
| Auto-sent Teams meeting invites (17 Nov) | `canAutoSendInvite` in `src/lib/teams.ts`, `sendBookingInvite` in `app/actions.ts`, `MeetingBookingForm.tsx` | sends on booking when a join link exists and *"Email the invite to them now"* is ticked, through the same `approveOne` outbound gate (`OPS_SEND`, `OPS_OUTBOUND_LOCK`, test mode); refuses a stand-in `teams.example` link when outreach is live; outcome shown on the lead page |
| The agreement: fields from the real template | `src/lib/esa.ts` (`ESA_FIELDS`) | every hole in the template is a required field |
| Filling the template, and the PDF | `src/lib/docxFill.ts` → `docxToPdf` | a hole with no value stops the send; a hole Word split over runs is gathered first (16 Nov) |
| Template versions, check and preview (16 Nov) | `currentTemplate` in `src/lib/files.ts`, `checkTemplate` in `src/lib/esa.ts`, the "agreement template" card on `app/(settings)/files/page.tsx`, `previewAgreement` + `fillAgreementDraft` in `app/actions.ts`, "Make a filled draft" on `app/(clients)/leads/[id]/page.tsx` | newest upload is in use; blanks nothing fills and required fields never printed are listed; a preview makes the files, no message |
| The agreement's details on the intro call, the cover email with the client's terms, and Open in a new tab (17 Nov) | `AgreementFieldsForm` on `app/(clients)/leads/[id]` (intro and agreement steps, one form), `saveAgreementFields` (starts the agreement if there is none), `coverDraft` in `src/lib/esa.ts`, `esa.cover` in `src/data/seed.ts`, `app/ui/AgreementVersions.tsx`, `app/api/files/[id]/view`, `src/lib/docxHtml.ts` | the cover email uses every agreement field and refuses an empty hole; the filled Word draft opens as a page in a new tab (a PDF opens as it is); the template is `docs/templates/ESA-TEMPLATE.docx`, from the owner's Valtrix draft |
| The agreement's details, typed once on the intro call (17 Nov) | `AgreementFieldsForm` in `app/(clients)/leads/[id]/`, `saveAgreementFields` in `app/actions.ts` (starts the agreement if there is none) | the same form on the intro call and on the Agreement step; blank required fields save and block the send |
| The cover email carries this client's terms (17 Nov) | `coverDraft` in `src/lib/esa.ts`, the `esa.cover` template in `src/data/seed.ts` | the owner's Valtrix email; fee, payment days and guarantee come from the agreement; an empty hole stops the send before any file is made |
| Open the agreement in a new tab (17 Nov) | `agreementVersions` in `src/lib/esa.ts`, `app/ui/AgreementVersions.tsx` (lead and client), `/api/files/[id]/view`, `src/lib/docxHtml.ts` | a PDF opens as it is; a Word file is read as a page, which is what a laptop without LibreOffice shows |
| One version per draft, and a PDF to read (17 Nov; upload `docs/templates/ESA-TEMPLATE.docx` on Files on each server) | `nextDraftVersion` in `src/lib/esa.ts`, "Save and make the draft" in `AgreementFieldsForm`, `src/lib/docxPdf.ts`, `/api/files/[id]/view` | each draft is the next version and earlier ones stay listed; with no LibreOffice the draft opens as a plain reading PDF that is never stored or sent |
| The lead's bar rings the step you are on (17 Nov) | `barStates` in `src/lib/leadJourney.ts`, `app/(clients)/leads/[id]/page.tsx` | an earlier step still open shows the warning "!"; the opening is refused until the intro call is held, a draft agreement no longer stands in for it |
| The intro call ends with the ESA sent (17 Nov) | the intro step of `app/(clients)/leads/[id]/page.tsx`: held, then 1 details, 2 the ESA shown on the page (`DraftDocument` in `app/ui/AgreementVersions.tsx`), 3 its email, 4 Send the ESA; `leadJourney` counts the call done only when held and sent | the Agreement step is for what comes back (signed, or changes); the opening waits for the signed agreement and a complete requirement (17 Nov evening), unless marked "open it now" |
| The lead page as a flow (18 Nov) | `src/lib/leadFlow.ts`, `existingClientOf` in `src/lib/leads.ts`, `leadMoved` in `app/actions.ts` | the step now, an "also happening" card for the requirement beside the agreement, one line per finished step; the five sections are free tabs with a dot on the one that is next (from `leadNextStep`); a finished step lands on the page that opens on what is next; an existing client skips the intro call and a signed one on file skips the agreement, including at the opening |
| Links, not a progress bar (18 Nov) | `relatedWork` in `src/data/journeyOf.ts`, `RelatedLinks` in `app/ui/figma.tsx` | every record page (lead, opening, placement, invoice, guarantee) lists plain links to the rest of that client's work, only what exists; there is no step bar anywhere (owner, 18 Nov), and the next-step card on each page says what comes next; once an opening exists the lead page says *Where it is now* (`positionStanding` in the same file, the same answer the Work board uses) |
| Buttons answer in place (17 Nov) | `app/ui/SubmitButton.tsx` (`SubmitButton`, `Answer`), `leadBack` in `app/actions.ts` | a spinner while it works; the result is written beside the button and the page scrolls to it; lead page only so far |
| Finished steps are read-only (17 Nov evening) | `requirementLocked` in `src/lib/requirements.ts`, `saveRequirement` refuses, `FieldList` in `app/ui/`, the agreement, requirement, enquiry and decline steps of `app/(clients)/leads/[id]/page.tsx` | working = editable, done = shown and locked; the requirement header now reads the real fields |
| People on an opening (17 Nov evening) | `setOpeningPeople` in `app/actions.ts`, `src/lib/openingTeam.ts`, the "People on this opening" fold of `app/(positions)/positions/[id]/page.tsx` | several at once, more later, removable; queued to TA as `memberIds`, **which TA does not read yet** |
| Candidates by level (17 Nov evening) | `candidateLevel`, `taApplicationsFor` in `src/lib/positionCandidates.ts`, the Candidates tab and the bar links of the position page | found, internal shortlist, external shortlist, interviews, joining, guarantee, out; TA's pipeline merged in when connected |
| The invoice for each placed job, drawn to the owner's design (17 Nov evening) | `drawInvoicePdf` in `src/lib/invoicePdf.ts`, `invoiceSheet` in `src/lib/invoiceDoc.ts`, `fillInvoiceDocument`, `previewInvoice`, `saveBankDetails`, `draftInvoiceForPlacement` in `app/actions.ts`, "Bank details on invoices" on the Settings screen, the invoice page and the Invoices list | a real PDF with no LibreOffice; versions; refused until the bank details are set; an uploaded Word template still overrides it; the job named on each row; "Draft the invoice" on a joined placement with none |
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
| Sourcing strategies on an opening (17 Nov) | `TA_STRATEGIES`, `problemWithStrategy` in `src/lib/strategies.ts`, `addStrategy` in `app/actions.ts`, `app/(positions)/positions/[id]/page.tsx` | 19 standard TA strategies selectable from a list with an optional note, assignable to either an Ops team member or a TA person on the job |

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
| Booking it | `bookInterview` | refuses an online interview with no link and an onsite one with no address; with "make a Teams event" ticked it creates the Teams event itself (`createTeamsEvent`, 18-20 Nov) and uses its join link, saving `calendarEventId`; tells TA through the outbox, drafts the invite to the interviewers, starts both clocks |
| The day before | `interview.reconfirm` → `remindAboutInterview` in `src/data/desk.ts` | nine in the morning the day before: the client's reminder drafted, and a task to have the TA reconfirm the candidate |
| The interview itself | `interview.day` clock, `markInterviewAttendance` | somebody is asked whether it happened; a no-show needs a reason and TA is told |
| A candidate pulling out | `noticeCandidateOut`, and TA's `interview.candidate_out` event | the notice is drafted whatever the hour, and how late it is said in plain words - a day is the promise, three hours the floor |
| The client cancelling or moving it | `cancelInterview` | rebooking keeps the round, so a candidate at round two stays at round two |
| What the candidate said afterwards | TA's `interview.feedback` event → `draftCandidateFeedback` | drafted for the client and due the next morning, not sent at night |
| The client's decision | `recordRoundDecision` | another round, selected, or rejected with their own words; a rejection re-counts the shortlist |
| The reference | `requestReference`, `recordReferenceReport`, `relayReference`, `recordReferenceDecision` | only when the client asks; no form and no score (the owner, 26 Oct); passed on word for word; a dropped candidate re-counts the shortlist |
| Screens | `app/interviews`, `app/interviews/[id]` | the week board (Mon to Fri, today outlined, a pill per queue) and one interview on its own page: time tiles with free / busy as the candidate told the TA (`recordSlotAnswers`), the drafted feedback approved from the page, and ruled folds for attendance and the client's decision |

Added 16 Nov (scheduling and follow-ups):

| Thing | Where | What it does |
|---|---|---|
| Reschedule | `rescheduleInterview`, `problemWithReschedule` (`src/lib/interviews.ts`), `reschedules` on the interview | a booked interview gets a new agreed time and keeps its round; the move (from, to, who, when, why) is kept; the old clocks stop and new ones start; an updated invite is drafted; TA is told through the same interview write as booking (no new TA endpoint). Cancel-and-rebook stays for "ask for new times" |
| Calendar invites (.ics) | `src/lib/ics.ts`, `keepInvite` in `app/actions.ts` | a standard invite (UTC times, stable UID, SEQUENCE up on every move) attached to the drafted interview invite, the reschedule invite, and the intro-call and requirement-meeting invites (a draft to the lead's contact, with an optional link) |
| Chasing the client's times and dates | `slots.chase` clock started by `requestInterviewSlots`, `chaseForSlots` / `chaseForDate` in `desk.ts` | after two days (setting `interview.slotsChaseDays`) a chase is drafted; `interview.report` now drafts one too, instead of only leaving a task. Drafts only; a client who has answered is not chased |
| The outbound gate | `doNotContactFrom`, `sentToday` in `src/lib/messages.ts`, `approveOne` | the do-not-contact list is the contacts of leads marked do-not-invite, and the daily cap counts what really went today (Colombo day) - until now both were passed empty, so neither ever blocked |

The **Teams meeting for the intro call and the requirement meeting** is built (17 Nov):
`src/lib/teams.ts`, `src/lib/graphCalendar.ts`, `teamsPartOf` in `app/actions.ts`,
`MeetingBookingForm`. It needs the `Calendars.ReadWrite` permission with admin consent and
`switch.teamsEnabled`; until then a pasted link is used. Interviews use it too: `bookInterview` creates the event when "make a Teams event" is ticked (see the 21 Nov table below).

Also built on 17 Nov (supervisor review; each is a decision in 09):

| Thing | Where it is |
|---|---|
| The opening is created last: after the client has signed and the requirement is complete (17 Nov evening), unless the lead was marked "open it now" | `problemWithOpening` in `src/lib/requirements.ts`, `handOverToTa` and `openEarly` in `app/actions.ts`, the Opening step of `app/(clients)/leads/[id]/page.tsx` (later fields queue `/integrations/v1/openings/details`, **an endpoint TA does not have yet**) |
| The lead's bar: Enquiry, Intro call, Agreement, Requirement (side by side), Opening | `src/lib/leadJourney.ts` |
| One meeting as intro call and requirement meeting | `alsoRequirement` on the meeting, the tick on `MeetingBookingForm` |
| Automatic countersign | `src/lib/countersign.ts`, `countersignAutomatically` and `finishCountersign` in `app/actions.ts`; needs a "director_signature" file and the `pdf-lib` dependency |
| One search stage and the opening's own bar | `loopSummary`, `app/(positions)/positions/page.tsx` (three groups, not a board), `app/work/page.tsx`, the opening page |
| Strategies tab, Placements tab, a "Waiting on" list | the opening page; `addStrategy` |
| Contacts for a client and for a position | `src/lib/contacts.ts`, `app/ui/Contacts.tsx`, `saveContact` |
| Interview invites: a calendar event (Teams for online, an address for onsite) and both feedbacks side by side | `bookInterview`, `recordClientBooking`, `recordCandidateFeedbackByHand`, the candidate's Interviews tab |
| Candidates added by hand | `addManualCandidate`, `src/lib/positionCandidates.ts` |
| Pretend to be the TA System (`/dev/ta`) | development only, never against the real TA: opens when `OPS_DEV_SIGNIN` and `OPS_TA_FAKE` are both on (`sh deploy/local/start-ui.sh`). Buttons make TA create an opening, send a set of five CVs, send interview events, place a candidate and say they joined, through the same handlers as real events (`devTa*` in `app/actions.ts`) |
| Testing Openings on a laptop (18 Nov) | `src/data/sampleOpenings.ts`, `src/lib/fakeTaState.ts`, `src/data/fakeTa.ts`, `/dev/ta` | "Load the Openings sample" adds five invented clients and six openings, one per state, after copying `.data-ui/ops.json` to `ops.before-sample-<time>.json`; "Remove" takes out only `smp_` rows. The stand-in TA answers each sample opening by id and keeps the stages Ops' pushed decisions set (`.data-ui/fake-ta.json`). Per opening: TA approves the JD, TA closes it, TA moves a candidate, move a clock to now, TA reads the queue |
| Testing Placements on a laptop (18 Nov) | `src/data/samplePlacements.ts`, `/dev/ta` | the same "Load the sample" adds seventeen placed jobs, one per placement, invoice and guarantee state (invoices numbered `SMP-`), with the clocks those states run; the stand-in TA answers each placement by id. `/dev/ta` moves the joining, invoice, guarantee and replacement clocks to now, and "TA places" can make an offer with no date or letter yet. No bank details are written: put test ones in Settings to draw an invoice |
| Staged dummy data (19 Nov) | `src/data/sampleDesk.ts` (with `sampleOpenings.ts`, `samplePlacements.ts`), `deploy/local/seed-ui.mjs`, `tests/sampledesk.test.ts` | Load it with `node deploy/local/seed-ui.mjs` (into `OPS_DATA_DIR`, default `.data-ui`; `--remove` takes it out) or the "Load the staged dummy data" button on `/dev/ta`. One named example of every state: leads at all eight steps and the meeting states, agreements draft to countersigned (chasing 1/2/3, one client who replied), clients at every stage, positions at every stage with 0-3 sets, claimed CVs, holds, interviews and references in every state, placements, guarantees and invoices in every state, and the inbox (mail, WhatsApp, drafts, tasks, calls, Talent Pulse, weekly report). Names carry the state, e.g. "Sample Ceylon Tea (chasing 2)". Every id is `smp_`, dates are relative to today, the real clock starters run; your own rows are never touched. JSON store only |
| The requirement from a Teams transcript | `src/lib/transcript.ts`, `fetchTranscript`, `readRequirementFromCall` |

Not done from that review, each with its reason:

| Thing | Why |
|---|---|
| A manual candidate in a CV set, an interview or a placement | every TA write for it would be refused; needs a TA endpoint that can hold a person Ops made |
| A clock that reads the transcript by itself after the call | it is a button for now |
| A warning line on an invoice drafted for a client with no signed agreement | the existing fallback (1 month on gross) still applies silently |

Still to come in phase 5: reading a client's reply for its times by itself (Phase 9).

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
| Late | `chaseThePayment`, `lateCharge` | **5% a month, compounded** (clause 5.5, 17 Nov; was 1%), as the agreement words it - and **nothing at all** on an invoice disputed in good faith; the chase is drafted, approved, sent, and the next one is a month later |
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

| The numbers | `src/lib/numbers.ts` (its screen, `app/(reports)/numbers`, was deleted in the v6 UI; the Reports menu entry is gone too, and `/reports` redirects to `/positions`) | how long an agreement takes to come back, how long a client sits on a set, how long a position takes to fill, how long the money takes, joining days that moved, guarantees kept. Every line says how many finished things it is made of, and the ones still waiting are **not** in the average - a slow month must not look fast because the slowest clients never answered |

Still to come in phase 7: the credit note **document**, which waits on the same
template work as the invoice.

## Built: phase 8, the hardening

| Piece | Where | Notes |
|---|---|---|
| The whole flow in one test | `tests/wholeflow.test.ts` | enquiry to close: a set out, the client's decision, the depth counted, an interview held, a placement, the fee invoiced and paid, ninety clean days, the position closed - and a last check that every client message is still only a draft |
| TA down, a handler throwing, every switch off | `tests/hardening.test.ts` | writes queue with their keys and wait longer each time, reads answer "could not be read" rather than throwing, one bad clock does not stop the pass, and with the senders off nothing can leave the building |
| The ops lead's own TA-writes switch | `pushOutbox` in `src/data/desk.ts` | it now really holds the link: the writes stay queued while it is off. It was read from the environment only, so the switch on the Settings screen did nothing |
| The first-day import | `src/lib/importer.ts`, screen `app/(settings)/import` | clients and who owns each, the holiday list, the ops people. A dry run first every time, and the same code builds the dry run and the real run; a bad row stops itself and names its line; a file run twice adds nothing |
| An empty backend never fills with sample data (22 Nov) | `wantsSampleDesk`, `firstRunDesk` in `src/lib/firstRun.ts`, `desk()` in `src/data/desk.ts`, `tests/firstrun.test.ts` | a Convex backend with no settings gets, once, only the real defaults: the settings and our own wording, no people, clocks, tasks, drafts or holidays (the people and holidays come in through the first-day import). The invented sample desk goes in only where `OPS_SAMPLE_DESK=on`: `deploy/local/start-ui.sh`, `deploy/local/start.sh` and the invented-data preview's compose file, never production. Before this, a live backend that started empty (first deploy, a restore) would have filled with sample clients' work |
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
| The approved look (13 Nov) | `app/globals.css`, `app/layout.tsx`, `public/career141-lockup.png`, `public/aura-symbol.png` | the Figma variables under the existing token names, Poppins, the career141 · 20 years logo. Since 25 Nov the logo and the AURA mark are served from the public R2 bucket `ops-brand-assets` when `NEXT_PUBLIC_ASSETS_URL` (a GitHub repository variable, read at build time) is set, from `public/` otherwise (`src/lib/brandAssets.ts`); the hosted image had left `public/` out, so both were missing. Since 14 Nov on a desktop each page is one fixed box under the top bar that scrolls inside itself (the window does not, so the bar no longer hides), and every scrollbar is one thin pill set in `globals.css` |
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

Nothing hides behind a hover, and the only overlays are the ones the owner drew: the top bar called back, a file opened from To approve (`?view=approve&file=`), the profile card over a blurred page (`app/ProfileMenu.tsx`), the cards from the + and the bell, and (19 Nov, the v6 design) the 680px state panels a page opens with `?panel=` (`app/ui/Panel.tsx`).

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
| 7 The phone | `app/PhoneNav.tsx`, `PHONE_ONLY` in `src/lib/nav.ts` | under 768px a top bar, an in-flow menu and a bottom bar with Your day · Inbox · The work · Clients; the desk unchanged |
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

## Built: the v6 interface (19 Nov)

The screens were redrawn to the v6 design in a first wave; later waves fill the pages in.

- **The bar of eight**: My work, Inbox, Calendar, Clients, Positions, Internal hiring, Accounts,
  Settings (`NAV` in `src/lib/nav.ts`). Work, Candidates and Reports have no entry of their own and
  are in the avatar menu (`app/ProfileMenu.tsx`), so nothing is unreachable.
- **New routes**: `/calendar` (the week of interviews), `/hiring` and `/hiring/[id]` (our own
  vacancies), `/clients/agreements`.
- **Redirects** (`next.config.ts` and in-page redirects): `/sets`, `/placements`, `/guarantees`,
  `/holds`, `/adverts` go to `/positions`; `/money` goes to `/invoices`; `/calls` redirects to
  `/?view=calls` and `/interviews` redirects to `/calendar` (preserving `?msg=`). Calendar (`K1`)
  now renders real client interviews, booked meetings, and joining days, plus a 680px
  `?panel=start-interview` drawer.
- **Role-tab aliases** (`src/lib/roleTabs.ts`): a role page has seven tabs, and an old `?view=` or
  `?tab=` (jd, adverts, placements, activity, messages, candidates) resolves to the tab that holds it,
  because stored tasks, mail and `back` fields still carry them.
- **Gone**: the page zoom, the fixed page box and the notch. Pages scroll normally.
- **The Panel drawer** (`app/ui/Panel.tsx`, `src/lib/panel.ts`): a state is `?panel=<name>&on=<id>`, a
  680px native dialog on the right. Escape, the X and the dimmed page replace the history entry, so
  Back never reopens it; focus goes to the first field and returns on close. Forms post a `back` that is
  `closeHref(path, params)`, so the page's own tab and filters survive. Kit shells for the Figma
  "Something changed" and "Duplicate check" panels, and `ChoicePill` / `ChoiceGroup` / `panelInput`,
  are in `app/ui/`.
- **Preview and send overlays** (`app/ui/PreviewAndSend.tsx`, `src/lib/sendModal.ts`, 19 Nov): the 15
  two-column 1600px modals (`?send=<kind>&on=<id>`) across Clients (`check-in`, `send-agreement`,
  `chase-agreement`), Positions (`ask-ta`, `chase-hr`, `weekly-report`), Role (`book-interview`,
  `candidate-feedback`, `reconfirm`, `send-set`, `chase-set`), Internal hiring (`book-internal`,
  `offer-letter`), and Accounts (`invoice`, `ask-refund`), all routing through the existing server
  actions and outbound gate.
- **Settings v6 & Global Find or do** (`app/(settings)/settings/page.tsx`, `app/FindOrDo.tsx`,
  `app/api/find/route.ts`, 19 Nov): two-tab Rules / Templates and people card grid with right-rail
  live template editor, leave cover (`saveCover`), and `/` instant command palette (`G1`).
- **v6 screen check (24 Nov, `hdbinath/v6-ui-gaps`)**: every v6 frame was compared with the running screens and each
  drawer and send URL was opened. Fixed: the Offer and joining tab (R4) crashed when a placement had no `dojHistory`
  (defaulted once in `desk()`); Positions' "Call <name>" opened nothing (My work's call drawer now also takes a role
  id); My work buttons open the drawer the flow list names (`buttonFor`); the role header carries each tab's own
  buttons (R1, R2, R4) and the Preview links sit on the interview cards; the client page leads with Agreement and
  Contacts; board card names wrap; Notifications is "what changed on my clients" in plain sentences
  (`src/lib/clientNews.ts`); client cards use a dark pill for the chase or check-in; Build SET shows the group text.
  Left as they are, on purpose: payments to match (needs the bank feed), the Board | Calendar toggle on R1, and the
  owner chip on client cards (moved behind the menu on 23 Nov).

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
| Teams for **interviews**, and the reschedule / not-held emails | built on `hdbinath/motion-teams-aura` (see the 21 Nov table); like every Teams piece they wait on `Calendars.ReadWrite` consent and `switch.teamsEnabled`, and the system is not hosted yet |
| The WhatsApp conversation view, and the WhatsApp CV group (25 Nov, built on `hdbinath/whatsapp-group-cvs`, see [28](28-WHATSAPP.md)) | wait on the Ops WhatsApp number existing; the CV group also needs a Cloud API number (not Coexistence) and a real test, as Meta publishes no sample of a document in a group |
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
- A calendar permission (`Calendars.ReadWrite`) for the Ops mailboxes, or a
  Teams link stays something a person pastes in, and the /calendar page shows
  no Outlook events.
- `OPS_API_TOKEN` on the TA deployment, and the same value as `OPS_TA_TOKEN`
  here, or the link stays shut and Ops runs on recorded sample data.
- The Ops WhatsApp number bought and verified, or there is no WhatsApp
  conversation to show.
- An `ANTHROPIC_API_KEY` or a `DEEPSEEK_API_KEY`, then `switch.aiEnabled` in
  Settings. Either key alone is enough; with none the layer is off and every
  screen says which of the two reasons it is.

## Built: Ops v6 backend gaps closed (19 Nov)

| Piece | Where | Proved by |
|---|---|---|
| **Quick panel actions** (move a task to Today, Tomorrow or a date from the task board - free tasks either way, system tasks later only with a reason, others' tasks need the reassign right (22 Nov, `src/lib/taskMove.ts`), per-candidate call decisions, manual chase logging on ESA & CV sets, ESA invite-back reminder, candidate reconfirmation by hand, HR follow-up & TA CV chase logging, custom/declined refund decisions, mark client dormant on write-off) | `src/lib/panelActions.ts`, `app/actions.ts`, `app/(money)/invoices/panelActions.ts`, `src/data/desk.ts`, `src/data/store.ts`, `convex/ops/data.ts` | `tests/panelactions.test.ts`, `tests/taskmove.test.ts` |
| **Additive fields & append-only History corrections** (`candidatePhone` on placements, `hiredStartDate` on surcharge invoices, immutable `audit.correction` notes on R7 History) | `src/data/types.ts`, `convex/schema.ts`, `app/(positions)/positions/[id]/tabs/Offer.tsx`, `UnreportedHire.tsx`, `History.tsx` | `tests/schema.test.ts`, `tests/panelactions.test.ts` |
| **Inbox · Team news (I3)** (`opsTeamNotes` table + audit milestone feed, live team note composer) | `src/lib/inboxChannels.ts`, `app/(inbox)/mail/ChannelViews.tsx`, `postTeamNote` and `deleteTeamNote` in `app/actions.ts` (an author deletes only their own note, audited `teamNote.deleted`; a repeat post by the same author with the same text within 10 minutes is not saved again, after the 21 Nov incident where a slow Post with no waiting state saved one note 4+ times) | `tests/teamnews.test.ts`, `tests/bothstores.test.ts` |
| **Internal hiring (H1/H2) & Calendar K1** (`opsVacancies` + `opsApplicants` tables, add vacancy/applicant drawers, all 4 applicant panels wired, a CV upload on Add applicant and the call drawer (PDF or Word, 10 MB, kept in the file store), "Talked - not a fit" and a "Not a fit" drawer to reject without an interview, interview times read as Colombo time, booked internal interviews surfaced in Calendar K1) | `src/lib/hiring.ts`, `app/hiring/page.tsx`, `app/hiring/[id]/page.tsx`, `app/hiring/[id]/HiringPanel.tsx`, `app/calendar/page.tsx` | `tests/hiringbackend.test.ts`, `tests/schema.test.ts` |
| **Clerk authentication & 3-role access model (20 Nov)** (`@clerk/nextjs`, `proxy.ts`, `src/lib/clerkAuth.ts`, `src/lib/session.ts`, `app/sign-in/[[...sign-in]]`, Settings → Templates and people) | **Ops person** (`ops_owner`), **Ops lead** (`ops_lead`), and **Admin** (`admin`, full capabilities + `View as` any role + `OPS_ADMIN_EMAILS` bootstrap). Dev sign-in automatically disables whenever Clerk or Microsoft keys are set. Committed on `hdbinath/clerk-auth-roles` ("Clerk sign-in and roles"); not live | `tests/clerkauth.test.ts`, `tests/roles.test.ts`, `tests/schema.test.ts` |

## Rules the code enforces, and why

Each of these exists because of something that went wrong, written in
[13](13-CORRECTIONS-LOG.md) or on the owner's board:

- **Nothing closes, holds or declines without a reason**, and the reason is kept.
- **Nothing reaches a client except as a draft a person approved.** Switched off
  records as *blocked*, never as *failed*, and nothing is retried silently.
- **A live desk never holds invented data.** An empty backend gets the sample desk
  only when the run sets `OPS_SAMPLE_DESK=on`; otherwise it starts with the real
  defaults alone (22 Nov, found in review: any empty backend was seeded).
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

## Built: motion, Outlook calendar, Teams follow-through and the Aura tool loop (21 Nov, on branch `hdbinath/motion-teams-aura`, not merged and not live)

None of this is live. Email and Teams are integrated but the system is not hosted yet:
`OPS_SEND` stays off, the outbound lock on, `OPS_TEAMS_FAKE` on. Everything below is
faked or refused on a laptop, with a plain sentence saying why.

| Piece | Where | What it does |
|---|---|---|
| **Motion** (GSAP) | see *Motion* in [07](07-SCREENS.md) | page fade and rise, a sliding tab pill, the drawer backdrop, staggered lists, number count-up and small hover and press motions. Off under reduced motion |
| **Outlook calendar on /calendar** | `app/calendar/page.tsx`, Graph `calendarView` via `src/lib/graphCalendar.ts` | shows the signed-in person's **own** events only, read-only. Faked on a laptop. Needs `Calendars.ReadWrite` consent |
| **Clash warnings when booking** | the booking forms in `app/actions.ts` | a booking that overlaps something already in that person's calendar says so. It **warns only**: it never blocks the booking |
| **Teams events follow the interview** | `rescheduleInterview`, `cancelInterview` in `app/actions.ts` (uses the saved `calendarEventId`) | rescheduling moves the Teams event and cancelling cancels it, so no orphan meeting is left in somebody's calendar |
| **Teams link for hiring interviews** | `app/hiring` | an internal interview gets a Teams link the same way a client interview does |
| **Not-held notice for the intro call and requirement meeting** | `markMeetingNotHeld` in `app/actions.ts` | only "not held" drafts a client notice, and it is **drafted and goes through approval**, like every other client email. There is no reschedule draft for these two meetings |
| **Aura looks things up** | `src/lib/agentTools.ts` (the tools), `src/lib/ai.ts` (the loop), [31](31-AGENT.md) | Claude Haiku 5.5 (`claude-haiku-5-5`) with tool use finds the client, lead, person, position, tasks and free times, fills in one action, and shows **one confirm card**. A person still clicks once before anything runs |
| **New Aura actions** | `src/lib/agent.ts` | `create_lead`, `assign_lead_owner`, `book_intro_call`, `book_requirement_meeting`, `hand_over` |
| **Health screen buttons** | `app/(settings)/health/page.tsx` | "Check Microsoft" says only whether the app got a Graph token, or the plain reason it did not; "Send a test email to me" sends one message to the signed-in person through `sendEmail`, so `OPS_SEND` and the outbound lock apply |

Not live, in order: [22](22-GO-LIVE.md) has the switch-on runbook for when it is hosted.

## Built: the ops team's first feedback round, stage 1A (23 Nov, on branch `rayan/UI-fixes`, not merged and not live)

The ops team replaced their Excel trackers with Ops and sent a list of small fixes. This is the first stage, the ones that are screens only.

| Thing | Where | What it does |
|---|---|---|
| **Clients and positions show up where they belong** | `clientForLead` in `src/lib/clients.ts`, `clientFromLead` in `src/data/desk.ts` (the Active filter showing a client with an open position is from the "Add a client" work) | a second lead for a returning company now finds its client (by lead, then name, then TA client), so its position is no longer orphaned; a client made as a lead moves to onboarding when the agreement goes out |
| **Requirement call only for existing clients** | `app/(clients)/leads/[id]/page.tsx`, `tabs/Requirement.tsx` | the intro-call booking is never shown to a lead that skips the intro; the position's Requirement tab links to booking the requirement call (the client page's own intro or requirement call is `callKindFor`, from the "Add a client" work) |
| **Reject from any stage, tagged** | `rejectKind`, `rejectedByKind` in `src/lib/hiring.ts`, the card menu on `app/hiring/[id]` | a three-dot menu on every applicant card; `rejectedAtStage` is kept (additive, optional) so the Rejected list says Screening reject or Final reject |
| **Hold by hand** | `holdByHand` in `app/actions.ts`, `HoldPanel.tsx` | a hold was only ever proposed by the clock; now a person can start one, through the same approval, TA write and thirty-day review. The button is on the Requirement tab as well |
| **Delete a team note** | `canDeleteTeamNote` in `src/lib/panelActions.ts` | an Ops lead or Admin can delete anybody's note on Inbox, Team news |
| **No invented tasks** | `src/data/seed.ts`, `freshSeed` in `src/data/store.ts` | the JSON store follows the same "sample only where `OPS_SAMPLE_DESK=on`" rule as Convex, and the sample desk no longer ships two invented tasks |
| **Add or replace an applicant's CV at any stage** | the `cv` panel in `app/hiring/[id]/HiringPanel.tsx` | the form used to live only in the call drawer |

Proved by `tests/uifixes.test.ts`. Not walked in a browser, and not run against the Convex store. The New position form, the contact edit and the client rename are the ones merged from `hdbinath/add-client-intro-call-new-position` (PR 32), which built the same things first; this branch's own versions of them were dropped in the merge.

## Built: the ops team's first feedback round, stage 1B, the new views (23 Nov, on branch `rayan/UI-fixes`, not merged and not live)

The four views the team kept as Excel trackers. Each is read from rows the desk already holds, so none can drift from the screens it summarises.

| Thing | Where | What it does |
|---|---|---|
| **Interview summary** | `src/lib/interviewSummary.ts`, the Table toggle on `app/calendar/page.tsx` (`?view=table`) | every client and internal interview as a row: client, candidate with position and round, mode (On-site, Online, Phone), schedule, status (Scheduled, Pending, Attended, Withdrew, No-show, Cancelled), filtered by client, mode, status and dates |
| **Withdrew** | `isOff` and `InterviewState` in `src/lib/interviews.ts`, `noticeCandidateOut` in `src/data/desk.ts` | a candidate pulling out is now its own state, kept apart from the client cancelling. It behaves like a cancellation everywhere an interview is read (the calendar, next step, candidates, Aura). Interviews already cancelled for that reason stay cancelled |
| **Pipeline history** | `src/lib/pipelineHistory.ts`, `app/ui/PipelineHistory.tsx`, the top of a position's History tab and a client's History tab | one row per candidate per set: when it was sent, which set, and the furthest outcome (placed, interview round, shortlisted, rejected with the client's words, withdrew, on hold, pending client feedback, already theirs, not sent yet). Nothing is stored for it |
| **Client and position table** | `src/lib/clientPositionTable.ts`, `app/(clients)/clients/positions`, a fourth tab on Clients | client, position, package (the requirement's, then the placement's), Ops handler, and an Edit on each row. The package is edited only while the requirement is unlocked; the Ops lead changes the handler with a reason (`setPositionOwner`, which tells the new person) |
| **Internal hiring: Board and Table** | `src/lib/hiringTable.ts`, `?view=board` and `?view=table` on `app/hiring/page.tsx` | the whole funnel across vacancies: a board that shows the first eight of each column and links to the rest, and a table filtered by search, vacancy and stage, fifty to a page |

Proved by `tests/interviewsummary.test.ts`, `tests/pipelinehistory.test.ts`, `tests/clientpositiontable.test.ts`, `tests/hiringtable.test.ts`, and the changed `tests/interviews.test.ts` and `tests/sampledesk.test.ts`. Walked in the browser on the invented data (dev sign-in, as the sample Ops lead). Not run against the Convex store.

## Built: Scoops, CVs read into internal hiring (23 Nov, on branch `rayan/cv-ingestion`, not merged and not live)

Stage 2 of the ops team's feedback. The decision is in [09](09-DECISIONS-AND-QUESTIONS.md) (23 Nov: Ops reads CVs for its own vacancies).

| Piece | Where | What it does |
|---|---|---|
| **Reading a CV** | `src/lib/cvParse.ts`, `src/data/cvText.ts` (PDF by `unpdf`, Word by JSZip), task `cv.fields` in `src/lib/aiTasks.ts` | the email, number and NIC by pattern; the name and the position applied for by the model when it is on, kept only if they are in the text, else by a guess; what was not found is named. A scan with no text is named as one |
| **Intake** | `ingestCv`, `ingestScoopFiles` in `src/data/desk.ts` | the file is kept (hashed, never overwritten), read, and made an applicant in the vacancy asked for, else the one its position matches, else "Scoop: to sort". Somebody already on file (same file, email, NIC or number) is a duplicate, listed and not added |
| **Add a Scoop** | `addScoop` in `app/actions.ts`, "Add a Scoop" on `/hiring` | any number of CVs at once, up to 150 and 25 MB, read the same way as a Scoop by email |
| **Scoop by email** | `runScoopPass` in `src/data/desk.ts`, `graphScoopSource` in `src/lib/graphMail.ts`, `selfClock.ts` | one named mailbox, the named senders only; PER_PASS (12) files a pass, carrying on where it stopped; the mailbox cursor moves past an email only when all of it is done. Off until mail reading is on and `scoop.mailbox` and `scoop.senders` are set; says why when it is not |
| **The applicant's details** | `saveApplicantDetails`, the Details drawer | phone, email, NIC, position applied for, package and laptop (the last two are asked on the call), and a move to another vacancy, which is how a CV held under "to sort" is placed. NIC, applied for, package and laptop are columns in the Table |
| **Scoops view and the day's summary** | `src/lib/scoop.ts`, `?view=scoops`, `runScoopSummary` | each batch with its counts and the files to look at; at 17:30 Colombo on a working day one task for the Ops lead with, per Scoop, how many CVs, who responded and who did not, who was turned away at screening and why, and the interviews booked |

Proved by `tests/cvparse.test.ts`, `tests/scoop.test.ts` and `tests/scoopintake.test.ts` (real PDFs made on the fly and a fake mailbox). **Not run against a real mailbox** (it needs the Microsoft consent and the owner's go-ahead) **or the Convex store.** Not built: reading the CVs in an old binary .doc; the TA read ("is this person already in TA"), which was left out because it would need the stage map of [32](32-TA-SHORTLIST-FEED.md) first.

## Built: Aura tables, inbound WhatsApp, the Health checks (23 Nov, on branch `rayan/integrations`, not merged and not live)

Stage 3 of the ops team's feedback. The decisions are in [09](09-DECISIONS-AND-QUESTIONS.md) (23 Nov: Aura in tables, WhatsApp in, and the checks).

| Piece | Where | What it does |
|---|---|---|
| **Aura answers in tables** | `Table` in `src/lib/a2ui.ts` and `app/A2ui.tsx`; `find_candidates`, `find_interviews`, `scoop_status`, `show_table` in `src/lib/agentTools.ts` | "How are the interviews this week?" comes back as a compact table in the chat. The tools are read-only and filtered by role; the NIC is never returned. Built on the existing `show_ui` path, so there is no new storage |
| **Inbound WhatsApp** | `src/lib/whatsapp.ts`, `app/api/whatsapp/route.ts`, `takeWhatsApp` in `src/data/desk.ts`, the WhatsApp view of `/mail` | a signed webhook; a message filed to whose number it is; a client who replies not chased; an applicant who replies counted as responded in the Scoop summary; recorded once; a "Done" to clear it. Refuses everything until `OPS_WHATSAPP_APP_SECRET` is set |
| **WhatsApp CV group** (25 Nov, branch `hdbinath/whatsapp-group-cvs`) | `readWebhook` in `src/lib/whatsapp.ts`, `runWhatsAppScoopPass` and `fetchWhatsAppMedia` in `src/data/desk.ts` / `src/lib/senders.ts`, the "WhatsApp CV group" card in Settings (`CvGroupCard.tsx`), a CV queue line on Health | CVs posted as documents in one group the Ops number made are read into the Scoop intake (`ingestCv`), one batch per Colombo day, source "whatsapp"; a group message never reaches the Inbox or stops a chase. A PDF or Word CV sent 1:1 by somebody who is not a client's or an enquiry's contact is read the same way (`isDirectCv`), so CVs can come in before Meta allows the group. Proved by `tests/whatsappscoop.test.ts` and the changed WhatsApp, senders and health tests; **not run against Meta**. The webhook must also subscribe to `group_lifecycle_update`. Setting `whatsapp.cvGroup` or `OPS_WHATSAPP_CV_GROUP` |
| **Health: what is missing, named** | `src/lib/integrationHealth.ts`, `app/(settings)/health/page.tsx`, `healthCheckMicrosoft` | "Check Microsoft" lists which permission is not granted; new WhatsApp and Scoops sections say what is set and what is not |
| **Teams follows the interview** | `noticeCandidateOut` in `src/data/desk.ts`, `dropApplicantEvent` in `app/actions.ts` | a candidate pulling out, and an internal applicant rejected before their interview, cancel the Outlook event |

Proved by `tests/auratable.test.ts`, `tests/whatsapp.test.ts`, `tests/whatsappintake.test.ts`, `tests/integrationhealth.test.ts` and a case in `tests/interviews.test.ts` (a recorded Meta payload, a computed signature, real PDFs from Stage 2). **Not run against Microsoft, Meta, an Anthropic key (Aura's tools are tested without a model), or the Convex store.** Nothing here is switched on.

## Built: the Nov 25 meeting's changes, PR 1 the foundation (26 Nov, on branch `hdbinath/ops-nov25-foundation`, not merged and not live)

The first of eight PRs for the ops team's 25 Nov walkthrough (the plan: one PR per area, in order). This one changes no behaviour a person sees except the three fixes; the rest is room for the later PRs.

| Piece | Where | What it does |
|---|---|---|
| **New optional fields** | `src/data/types.ts`, `convex/schema.ts`, the add mutations in `convex/ops/data.ts`, `tests/schema.test.ts` | backup ops, priority and a numeric salary on a position; client type; draft or final on an ESA; position, JD and salary scale on a meeting; expat fee, nationality, payment details and testimonial on a placement; reminders and the details request on an invoice; the source of a vacancy; caller and call answers on an applicant, and five new applicant stages (type only). All optional, so no migration and no backfill: an old row shows "—" |
| **The owners page lists the ops team** | `app/(clients)/clients/owners/page.tsx` | it filtered on a role called "ops", which does not exist, so it always fell back to everybody; it now uses `ASSIGNABLE_ROLES`, the same people as the positions picker |
| **"Agreement not signed" counts no agreement at all** | `agreementNotSigned` in `src/lib/clients.ts`, `app/(positions)/positions/page.tsx` | a position whose client had no ESA was not flagged. The requirement's lead and the client's own lead are both looked at, so a position TA opened without a requirement is not flagged when the client has signed |
| **The calendar's comment** | `src/lib/calendarBoard.ts` | it said internal interviews had no data; they come from booked applicants |

Proved by `tests/agreementnotsigned.test.ts` and `tests/schema.test.ts`; all 138 suites and `tsc` green on the JSON store. Not run against the Convex store; not walked in a browser.
