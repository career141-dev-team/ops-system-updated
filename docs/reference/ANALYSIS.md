# Ops plan: deep analysis (Opus pass, 27 Oct 2026)

Done by reading every flow as a walkthrough (`walkthroughs/`, generated from the cards; all 12 diagrams parse to the exact step and arrow counts, every step reachable from the start), every text card, and checking the plan's claims about the TA System against the repo (worktree at d078fcb/4c355c4). Everything below is cited to a card (cNNNN) or a file. Where this file and an older card disagree, this file explains why.

## 1. Which cards are authoritative
1. **Decisions** (dated notes c3998 20 Oct, c4405 22 Oct, c5209 23 Oct, c5220 26 Oct; the brief c1 "Rules/Decisions") override everything older. c5220 says all open questions of that round were answered.
2. **Latest system flow: c5237** "Ops and recruiter systems: enquiry to guarantee end" (250 steps, 332 arrows, OPS/REC/LINK/OPEN). The archive card c6337 says c4234, c4412 and c4585 are **replaced** by it, and c4176, c4323, c4070 are **older mapping tables**. Everything on c5237 is still marked guess (not locked).
3. **Locked business flows**: c3626 "Enquiry to guarantee end" (final business flow, 20 Oct), c3002 "Full Final Flow" (locked, do not edit), c2790 "Enquiry to fee collected" (same as c3002 minus the CV ownership check). c719 = locked as-is picture of today; c2511 = locked ESA terms.
4. Analysis cards about the TA System (c1036-c1201) are the canvas assistant's reading of the code: mostly right, a few points outdated or overstated (section 6).
5. "Mona" in the cards is the canvas AI assistant the owner talks to (c1: "ESA chase (Mona's suggestion, he agreed)"; c1834 "later Mona said groups gone"). Lines attributed to Mona are suggestions the owner accepted or must still settle. "He" is the owner speaking; c11 is titled "Uzmaan's notes".

## 2. How c5237 evolved from c4585 (what the 26 Oct revision changed)
Added (34 steps): minimum-5-CV checks before the Director set and the client set (with "set held, search more"); "Escalated to TA" after 3 unanswered messages in 24 h; slot loop with TA alert and back-up pick; "Client group created" for a new client after the first set; returning client without ESA = "Hold lead, chase ESA"; intro call / requirement meeting closed after 3 unanswered rebook emails; LinkedIn reposted when under 20 CVs a day; reference check by phone only when the client asks (form, score and "reference sent" removed); "Five-CV hold lifts"; "Placement cancelled"; OPEN steps for offer-silent timeout and silent-hold limit; one shared "Lead or position closed" end.
Removed or merged (21): "Payment logged" merged into "Fee collected" (c5185 flagged the duplicate); "Hold exit check (TA lead)" replaced by the "exit rule" arrow; "TopJobs closed (ops)" replaced by the automatic two-week close; "Position closed" replaced by "Lead or position closed"; reference form/score/sent steps removed (26 Oct decision).

## 3. Arrow labels in c5237 that are on the wrong arrow (corrections by reading the flow)
The canvas stores labels as floating text; these sit on a neighbouring arrow. Each correction is my reading, not the owner's.
| Shown on | Says | Belongs to (most likely) |
|---|---|---|
| Website lead created -> Lead tagged | "WhatsApp, call, personal email" | Lead sources -> Lead entered by hand |
| Owner alerted -> Duplicate client match | "search continues" | an REC drop-out step -> Search |
| ESA clock starts -> ESA drafted | "no reply to 3 emails" | Intro call not held -> Intro silent, lead closed |
| Placeholders checked -> ESA drafted (loop) | "check pipeline after rejection" | that loop is "blank found, redraft"; the label belongs near Rejection notice -> Pipeline pending counted |
| ESA email 1 -> WhatsApp 1 -> email 2 ... | "client replies, chase stops" | these are plain sequence arrows; "client replies at any point" goes from each chase step to ESA reply read |
| ESA sent -> ESA email 1 | "client replies at any point" | ESA sent -> ESA email 1 is unlabelled (chase starts) |
| Director countersigns -> copy returned | "client replies, chase stops" | unlabelled (countersigned) |
| Client, ops owner recorded -> Requirement meeting booked | "set reviewed, none shortlisted" | Client decision -> Pipeline pending counted |
| ESA decline reason saved -> Search blocked | "other industry" | unlabelled (search blocked); "other industry" = Banking/finance check -> ESA lookup |
| Talent Pulse list -> Newsletter posted | "TA hunts" | CV scored -> TA shortlists ("TA picks / hunts") |
| CV read -> CV scored | "fee unpaid" | Candidate leaves -> No guarantee, clock stopped |
| First message -> Reminder 24h | "close checklist" | Lead or position closed -> LinkedIn closed |
| TA shortlists -> Candidate skipped | "replies, reminders stop" | that arrow is "do-not-contact flag"; "replies, reminders stop" = reminder -> Reply read |
| Candidate skipped -> Search | "guarantee over, position done" | Commitment done -> Lead or position closed |
| Reminder 48h -> 72h | "unsigned after 2 weeks of chase" | ESA final call -> ESA declined |
| Missing items asked -> Escalated to TA | "client books" | that arrow is "3 unanswered in 24 h"; "client books" = Who schedules? -> Client contacts candidate |
| TA calls candidate -> Drop-out reason saved | "3 messages in 24h, still missing" | Missing items asked -> Escalated to TA; this arrow is "not reached" |
| Queued for Director -> Set email drafted | "search more" | Unreported hire area / Set held; this arrow is unlabelled |
| Director reviews -> Reply read in | "no reply in 1 working day" | Set emailed -> Director chase |
| Pipeline pending counted -> Total shortlisted | "below 20 CVs a day" | LinkedIn advert Live -> LinkedIn reposted |
| Who schedules? -> Client contacts candidate | "not reached" | should be "client books" |
| Client slots requested -> Slots received | "refill" | Monitor position / depth check -> Search ("refill") |
| Feedback timer -> Chase drafted | "client replies first" | Feedback timer -> Client replies; timer -> chase is "no feedback after 1 day" |
| Chase drafted -> Chase approved | "invited back later" | Invite-back reminder -> Lead sources |
| Set sent to client -> Unreported hire flagged | "3 months, no hire reported" | correct label, but the 3-month clock should start from the client set (ESA: client must report within 3 months) - fine |
| Unreported hire flagged -> Surcharge drafted | "search more" | unlabelled |
| TA informed of decision -> Rejected after round | "selected" | swapped: "not moving" -> Rejected after round; "selected" -> Client asks for reference? |
| Rejected after round -> Candidate told not moving | "not moving" | see above (this arrow is unlabelled) |
| Client asks for reference? -> Offer made | "TA wants TopJobs" | should be "no reference requested"; "TA wants TopJobs" = LinkedIn advert Live -> TopJobs requested |
| TA calls referee -> Reference reported | "check pipeline" | Client clears reference -> Pipeline pending counted ("client drops") |
| Package, DOJ, offer letter asked -> Placement saved | "candidate declines" | Search stops -> Offer declined |
| Placement saved -> Asma and ops told | "still missing" | Package asked -> alert to Asma/ops (missing items) |
| Search reopened -> Search | "replaced in time" | 60-working-day clock -> Guarantee ends clean |
| Candidate leaves -> No guarantee, clock stopped | "refund paid, close" | should be "fee unpaid"; "refund paid, close" = Refund logged -> Lead or position closed |
| Director of Operations told -> Refund 25% | "client stops, no refund" | that arrow is "none in 60 working days"; "client stops, no refund" = No-show client options -> close |
| Refund logged -> Lead or position closed | "do-not-contact flag" | TA shortlists -> Candidate skipped |
Reliable labels (no correction needed) include: banking/finance, new client, held/not held, practical/impractical, rebooked, signs, declines outright, wants changes, URL missing, fixed, high score, TA picks, lead places, no advert, fewer/five or more, 3 or fewer pending, 5+ shortlisted in total, exit rule, we schedule, no slot fits, reported, no update, round 2, client requests, referee not reached, back-up kept, no back-up, date moves, candidate lost, joining day, not joined, first hire, unpaid day 30, paid, unpaid after 2 months, day 75, 90 days, leaves within 90 days, fee paid: replace first.

## 4. Real design gaps in the latest flow (c5237), beyond labels
1. **First-hire guarantee is disconnected.** "TA confirms joined" -> "90-day clock starts" (n6181) -> invoice (first hire) or a second "90-day clock" (n6201, replacement hire). Only n6201 has the day-75 / clean / leaves branches, so a first hire never reaches "Candidate leaves" in the drawing. The locked c3626 has it right: Joined -> invoice AND 90-day guarantee in parallel. Fix: n6181 -> n6201 for every hire; invoice only for first hire.
2. **"Fee collected" is a dead end** (n6189). Fine if the position closes only when the guarantee ends (that is the latest intent: position closes at guarantee end / refund / write-off), but it contradicts the locked c3626 (Fee collected -> Close posts and position) and decision d87 "close at fee" (c4571). Needs one answer: position closes at fee collected or at guarantee end.
3. **"Escalated to TA" (n6333) is a dead end**: after 3 unanswered messages the TA is told, but no task or return path (should join "Call task to TA").
4. **No path from the first reminders to "Reply read"**: only Reminder 48h/72h lead to Reply read; a reply after the first message or the 24h reminder has no drawn path (drawing gap; c5185 says reminders stop on reply).
5. **Director rejection counts the client pipeline**: "Director rejection notice" -> "Pipeline pending counted" mixes the internal (Director) and client counts.
6. **Rejection notice back to pipeline depth** is still only partly drawn (c4571 d47 "Partly").
7. **"Set reviewed, none shortlisted" leaks to scheduling** (c5185, arrow the canvas tool could not delete).
8. **Surcharge invoice has no chase or payment path** (OPEN; c5237 "no chase decided").
9. **Single reminders with no escalation**: Director countersign, Director chase, client report reminder (OPEN).
10. **Undecided timeouts**: offer silent, silent-hold limit, client deadline for replace/stop, day-75 warning, hold exit rule.
11. **"Hold lead, chase ESA"** for a returning client jumps straight into ESA email 1, skipping draft/approval of a new ESA (may be intended: re-send the existing agreement).
12. **Weekly report and Talent Pulse hang off "LinkedIn advert Live"**: they run per opening; the weekly report is really per desk (one report to Mr Azeem), so it should be a desk-level schedule, not per advert.

## 5. Contradictions register (with my recommended resolution to confirm)
| # | Topic | Versions | Recommended resolution (ask owner) |
|---|---|---|---|
| 1 | Silent client | ESA: inactive 14 calendar days after profiles shared (c2505/c2511); flows: hold after 2 weeks silent; chase alert 2 working days, call at 4 (c3782/c4323); 26 Oct: stop following up after 3-4 silent days; c5237: hold follows ESA rule, day count OPEN | One clock = ESA 14 calendar days from profiles shared -> hold with reason; chase cadence inside it (day 1 call, then 3-4 days then stop) |
| 2 | ESA decline | "after 2 weeks of chase" (c3626, c5237) vs "14 days of silence" (c3782) | 14 calendar days from ESA sent, chase stops on any reply |
| 3 | Guarantee start/validity | Decision: starts at joining, not payment; ESA: valid only if fee fully paid; c2511 (locked) draws guarantee after fee settled | Clock from joining day; refund/replacement only if fee fully paid; unpaid -> no guarantee (c5237 already does this) |
| 4 | 90 days vs 3 months | brief wording "3 months" vs ESA "90 days from first working day" | 90 days from first working day (ESA) |
| 5 | Invoice timing | Asma invoices ~2 months after DOJ (c713) vs plan: invoice on joining day, due 30 days after first working day | Invoice on joining day; ESA due date 30 calendar days |
| 6 | Late charge | 5% per month (flow) vs 5% monthly compounded (ESA) | Follow ESA (compounded) or change the ESA - owner/legal call |
| 7 | Fee basis | 1 month gross (basic for selected clients) vs ESA 2 months for non-Sri-Lankan; code stores fee % | Store fee rule per client agreement (months of gross, basis, nationality rule) instead of % |
| 8 | Position close | at fee collected (c3626, d87) vs at guarantee end (c5237); "search stops at offer" | Search stops at offer; posts close at offer/placement; position closes at guarantee end or refund/write-off |
| 9 | Reference check | form scored 1-10 (c3626 locked, c4412, c4369) vs 26 Oct: only if client asks, TA phones, no form | 26 Oct rule (newest) |
| 10 | Director rejection reason | "reason if not shortlisted" (c3002/c2790) vs "no reason needed" (decision) | No reason (decision) |
| 11 | Client WhatsApp groups | "no groups" (old) vs "groups stay" (later); client process unchanged | Groups stay; system drafts the post text and logs it, ops posts |
| 12 | Who tracks DOJ | TA tracks (flow) vs ops owner owns DOJ + guarantee (decision) | TA does the calls; ops owner owns the record and guarantee (both alerted) |
| 13 | Rejection notices | automatic from approved template vs held for ops approval | Automatic from one approved template (decision "routine messages automatic") |
| 14 | 100% position | TA System: 100% = first full day on a job; plan: TA lead picks the daily 100% and may keep it 1-3 days | Extend workday: lead can set 100% on a returning job |
| 15 | Interview invites | Ops owns the step vs brief: invites and reconfirms sent automatically | System sends automatically; ops owns exceptions |
| 16 | Replacement billing | "billed like a new hire" (c5185) vs 26 Oct: replacement starts a new guarantee, no invoice | No invoice, new 90-day guarantee (26 Oct) |
| 17 | Talent Pulse link | one tracked apply link per role (guess) | open |

## 6. The plan's claims about the TA System, checked against the repo
| Claim on the canvas | Repo says | Verdict |
|---|---|---|
| "No ESA record or status" (c4323, c4290) / "client has only an ESA signed date" | `convex/schema.ts` has **`esaRecords`** (status pending/sent/signed/expired/not_required, sentAt, signedAt, signedBy, documentUrl, slaDeadlineAt, dueAt, feePercent, guaranteeDays, clientId); `src/lib/closing.ts` `esaStanding()` derives not_required/draft/awaiting/overdue/signed/expired; `ClientEditor` has an ESA signed date | **Wrong: an ESA model exists** (no drafting, chase or countersign workflow) |
| "Code offers refund at once, against the ESA" (c3813) | `closing.ts`: when a placed candidate leaves inside the guarantee and the fee was paid, item `refund_due` "a refund or a free re-run is owed"; invoiced-unpaid -> "invoice needs crediting"; no 60-working-day clock | **Right** (offers refund or re-run immediately; no replace-first timer) |
| Guarantee "not tied to joining day" | `guaranteeFor()` computes the end from `joinDate + guaranteeDays` | Partly wrong: window starts at the join date already; no ops owner, no day-75, no full-payment check |
| Client round "saved as held, never emailed" | `src/data/store.ts` review rounds: `dispatch: "held"` default, "Nothing is emailed from here" | **Right** |
| Intake queue live only with a flag | `src/lib/ingest.ts`: `C141_INTAKE_LIVE === "on"` | **Right** |
| "Auto-advance needs current salary, the gate does not" | `convex/ta/stages.ts directorReviewBlockers`: current salary NOT required (sweep in `crons.ts` uses it). But `pipeline/followUpHelper.ts` (allComplete) and `communications/inboundExtraction.ts` (remainingMissing) still treat current salary as required, so the AI keeps asking for it | **Partly right**: the advance is fine; outreach/AI chasing still asks for current salary |
| "Graphic Designer hard-coded" | appears in `convex/communications/followUpMutations.ts` (a helper that binds to a Graphic Designer job) and QA tests | Right that it exists; it is a helper, not the live sweep |
| Old day-3/5/7 flow still in crons | `/follow-up` skill: legacy static flow for non-TA openings still runs in `evaluateFollowUpStage` | Right |
| Sweep 60 per run; SLA check 500 per run | `/follow-up` and data-platform reference confirm | Right |
| Weekly report, rejection notices, placement update to Asma "already automatic" (c3849 task sort "System - Already automatic") | Not in the code; these are "System" only in the designed flow | **Misleading**: task sort describes the planned flow, not today |
| "No interview scheduling in the code" (c4309, c4323, c4290, c4176) | `interviews` table, `scheduleInterview/confirm/reschedule/outcome/result/edit/feedback` actions (`src/app/actions.ts:2554-2670`), `src/lib/candidates/interviewWrites.ts`, alerts `interview_confirmation(_escalation)` and `interview_followup` in `src/lib/sla.ts` | **Wrong**: a scheduling record and alerts exist; slots, invites, Teams, auto reconfirm and client notices are missing |
| "ESA: client has only an ESA signed date" refined | `esaRecords` model + `saveEsa`/`esaStanding` exist but no action or screen calls them (only `esaFor` at placement time) | model **dormant**, not absent |
| Place button (not on the canvas) | `recordPlacement` redirects to `/placements/{id}`; no such route in `src/app` | TA System **bug** (confirm in the running app) |

## 7. People on the canvas (as named; roles as described there)
M.A Azeemusham / Mr Azeem: Managing Director; countersigns ESA; receives weekly report; Director Review. Asma: director-level, logs leads, raises invoices, creates client groups, receives placement news. Shamra: allocation, Director mailbox, reconfirms. Rushda: ESA chase and final call, ESA tracker, posting. Zainab: records client/position, notify team, scheduling, cancellations, reference. Rakshana: job posting, scheduling, reference, logs schedule. Jesmeen/Jesmin (Ops): routes signed ESA, posts placement updates. Insha, Haifa: scheduling, placement posts. Rumana: posts sets in client groups. Sameera, Sanduni: reconfirm, client feedback posting. Siyan, Nuha: weekly active-positions report. Sapna: asked for a master client contact sheet. Mona: the canvas AI assistant. DLA: attends intro calls (expansion not given). Marketing (digital marketing): flyers, Talent Pulse. Director of Operations: refunds (no such role in the TA System).

## 8. What the plan needs from the TA System (build list, by size)
New: leads desk; ESA workflow on top of `esaRecords` (template, draft/approve/send, chase, countersign, decline, negotiation); timers/rules engine; ops task inbox; client comms hub (client set email out of "held", chase, inactive notice, ownership clock, claimed CV); interview scheduler (largest: slots, invites, Teams, reconfirm, attendance, cancellations); finance (invoice, payment chase, late charge, write-off, surcharge) and guarantee (replace-first, 60 working days, refund routing); ad-channels tracker (TopJobs, Talent Pulse, source tags, CV redirect); scheduled weekly report; ops roles (ops owner per client, Director of Operations, marketing, accounts).
Extend: clients (ops owner, movable), openings (create from requirement, rebook/impractical states, 100% set by lead), follow-up (escalate after 3 unanswered in 24 h; stop asking current salary if not required), Director/client set minimum 5 CVs, pipeline depth automation (<=3 pending add-on, 5 shortlisted monitor + hold lift), placements (package, offer letter, notify Asma/ops), DOJ change log, closing (fee basis, replace-first), alerts escalation to TA lead / ops owner.
Fix: retire the old day-3/5/7 follow-up flow; one source of truth for offers/placements (logic lives in `src/data/store.ts`, not the backend, per c1183).
All new client-facing sends must go through `convex/lib/outreachSafety.ts` / `outboundGuard.ts`; nothing is approved for building yet.
