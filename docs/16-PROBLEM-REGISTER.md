# 16 · Problem register: every problem on the board, and the solution

_Written 1 Nov 2026 from the live board (re-read that day; identical to 27 Oct). One row per
problem line as it appears on the card, in the card's own order. Nothing is skipped; where
two cards state the same problem, the later row says "same as" and points to the first.
"Plan" points to [15](15-BUILD-PLAN.md): B = problem table row, P = phase and step, J =
second-pass item, I = decision number. Status: **Solved** = the plan builds it; **Decision**
= the owner must choose first (default given); **Accepted** = kept as the owner decided; **TA**
= fixed in the TA System (change T-number)._

Count: **179 problem lines** across 11 cards (many repeat from card to card). Of them
**150 are solved by the plan** (18 of those are TA-side fixes, and 4 are solved apart from one
open number), **15 wait for a decision** (default given in section 12), and **14 are accepted** as
the owner decided or as outside Ops.

---

## 1. c3620 · Problems in today's workflow (24 lines)

### Chasing is late

| # | On the board | Solution | Plan | Status |
|---|---|---|---|---|
| 1.1 | ESA follow-ups miss the 5-working-day activation KPI | ESA state machine with the chase plan on timers (email, WhatsApp, email, WhatsApp, email, call task), each drafted for approval; late-send alert at 2 h; any reply cancels; KPI "ESA return time" reported weekly | B1, P2 9-16, P7 16 | Solved |
| 1.2 | Client feedback chased late; 21 positions mostly pending (13 Mar 2026) | Feedback timer from the receipt date: chase at 1 day, call task next day, stop after 3-4 silent days, hold at 14 days; "waiting on client (days)" view; the weekly report counts positions waiting on clients | B3, P4 10-13 | Solved |
| 1.3 | Candidates hadn't heard back (Prima, 13 Mar 2026) | Rejection notices from one approved template go automatically for Director and client rejections (TA sends; Ops triggers client ones by the decision write) | B4, T5 | Solved (TA) |
| 1.4 | Invites unanswered (Neel, Dilum, 25 Sep 2026) | Day-before reconfirm timer; no reply → call task to the TA; client interviewers get the Teams invite from the Ops calendar | B5, P5 9-12 | Solved |

### Hand-passed news arrives late

| # | On the board | Solution | Plan | Status |
|---|---|---|---|---|
| 1.5 | Signed ESA reached Director only 2 Jun 2026 (Fletching) | "Signed" sends the notice to ops, TA lead and Director at once; countersign task with 1-day timer; countersigned copy emailed back automatically | B8, P2 15-18 | Solved |
| 1.6 | Asma learned of January joining on 30 Mar 2026 | TA's Place requires package, DOJ, offer letter; event `placement.created`; same-day notice to Asma and the owner; invoice drafted on joining day | B9, P6 3, T1 | Solved |
| 1.7 | Interview cancellations learned late (24-25 Sep 2026) | Client cancel recorded in Ops → TA interview cancelled through the API → bell to the TA at once; any change on the TA side raises an event Ops shows within a minute | B10, P5 13, J1 | Solved |
| 1.8 | TopJobs status and post removal relayed through ops | Ad-channel record with live/closed dates and a 2-week timer; the TA is told on each change through `notify`; close checklist creates the "close TopJobs" task | B11, P3 12, P7 11 | Solved |
| 1.9 | TA hears client feedback late | Client decision written to TA the moment the owner confirms; TA bell | B12, P4 9 | Solved |

### Same data retyped

| # | On the board | Solution | Plan | Status |
|---|---|---|---|---|
| 1.10 | Master, client, job and interview sheets updated by hand | No sheets: each column has one system home (table D4); Ops reads TA live and never copies | B15, D4, P8 12 | Solved |
| 1.11 | Tabs not always updated | Same as 1.10: there are no tabs to update; the system is the record | D4 | Solved |
| 1.12 | No master client contact sheet (14 May 2026) | Client contacts live on TA's `clients.contacts`; Ops creates and edits them through the API; the Clients screen is the contact sheet | B16, P2 3 | Solved |
| 1.13 | Hunted CVs not always copied to CV mailbox | TA-side habit (hunted CVs go through TA's HH upload/scoops); for Ops channels, CVs go to the post's own routing address so nothing is copied by hand | J4, P3 13 | Solved |

### Reasons and owners missing

| # | On the board | Solution | Plan | Status |
|---|---|---|---|---|
| 1.14 | Director doesn't say why a candidate wasn't shortlisted | Owner's decision 26 Oct: no reason required from the Director | B21, I (decided) | Accepted |
| 1.15 | Client rejection reasons not recorded | Decision form requires a reason per rejected candidate; written to TA with the stage move | B20, P4 9, T2 | Solved |
| 1.16 | Handover date unclear | "Create opening in TA" stamps `openedAt` in Ops and `requirementReceivedAt`/`assignedAt` in TA | B17, B24, J8 | Solved |
| 1.17 | DOJ moved to 15 Jun with no owner | DOJ change form: new date, who, why; history kept; ops owner owns DOJ tracking; reminders 7 and 1 days before | B22, P6 5 | Solved |
| 1.18 | Reschedules not tracked | One interview record in TA with history; every change goes through the API | B19, P5 13 | Solved |

### No safety net

| # | On the board | Solution | Plan | Status |
|---|---|---|---|---|
| 1.19 | No backup candidate at final stage | Hold-at-five keeps a pool; TA's back-up tag shown on sets and interviews; the slot loop falls back to the back-up | B26, P4 16, P5 5 | Solved |
| 1.20 | Posts hang open with 20-30 CVs, no capacity planner | Under-20-CVs-a-day repost rule (TA); monitor-only closes LinkedIn; close checklist; the Capacity Planner is a separate partner app already reading TA | B27, P3 16, P7 11 | Solved |
| 1.21 | No immediate allocation or full JD on arrival | Lead gets an owner at once (round-robin or chosen); package/role/brief captured on the intro call; requirement form before any opening | B28, P2 2, P3 3 | Solved |
| 1.22 | ESA copy came back unsealed, resent | ESA from a template with named fields; blank field blocks sending; versioned PDF; signed scan uploaded and countersigned copy returned by the system | B2, P2 10-11, 18 | Solved |
| 1.23 | No invoice records | `opsInvoices` and `opsPayments` with numbering, PDF and CSV export | B29, P6 9-17 | Solved |
| 1.24 | Package asked two months after joining | Place requires the package (T1); invoice drafted from it on joining day | B9, P6 3, 9 | Solved (TA) |

## 2. c713 · Job-to-Joining map, "Where it goes wrong" (8 lines)

| # | On the board | Solution | Plan | Status |
|---|---|---|---|---|
| 2.1 | Placement news reached Asma late (January joining posted 30 Mar 2026) | Same as 1.6 | B9 | Solved |
| 2.2 | Package details missing at invoicing; no offer letter on file | Same as 1.24; offer letter is a required file on Place, stored in R2 | B9, T1 | Solved |
| 2.3 | Clients stall on feedback: most of 21 positions pending (13 Mar 2026) | Same as 1.2 | B3 | Solved |
| 2.4 | Client cancelled Head of Planning and COO interviews 24-25 Sep 2026; ops learned late | Same as 1.7 | B10 | Solved |
| 2.5 | AMW's selected candidate withdrew 30 Jan 2026; only a reserve was left | Back-up kept at the final stage; offer declined → back-up promoted in TA or search reopened; depth rule keeps the pool | B26, B30, P6 2 | Solved |
| 2.6 | Joining date moved to 15 Jun on 21 May 2026 with no owner | Same as 1.17 | B22 | Solved |
| 2.7 | Candidate no-show 18 Aug 2026; Sithusha withdrew 12 Aug 2026 | No-show path: client options (replace or stop), nothing invoiced; withdrawal before joining = placement cancelled → TA reopens; both recorded with reason | B30, P6 6, 8 | Solved |
| 2.8 | DOJs still "yet to confirm (visa)" on 30 Mar 2026 | DOJ tracking with reminders and a "waiting on visa" reason on the date move; the placement stays `placed` until joined; no invoice until joined | P6 5, 7 | Solved |

## 3. c719 · The as-is ops workflow, per-step incidents (39 problems, 5 ideas)

| # | Step on the board | Problem as written | Solution | Plan | Status |
|---|---|---|---|---|---|
| 3.1 | Interview held, attendance marked | Vinuki was a no-show on 18 Aug 2026 | Attendance ticked on the record; no-show → client notice and back-up; attendance is a KPI | P5 14, 11 | Solved |
| 3.2 | Client cancels or postpones | Cancelled 24-25 Sep; ops learned late | Same as 1.7 | B10 | Solved |
| 3.3 | Candidate feedback (TA after 5 PM) | TA hears client feedback late | Same as 1.9; TA's own feedback raises `interview.feedback` so Ops drafts the client message the same evening | B12, P5 15 | Solved |
| 3.4 | Client feedback posted | SQ BD COO still awaiting final feedback | Round decision pending shows in "awaiting feedback"; chase timer applies to interview feedback too | P5 15-16, 18 | Solved |
| 3.5 | Round 2 or drop | Senuri did not move forward after round 2 | Round decision recorded with reason; rejected → TA stage + notice; depth re-evaluated | P5 16 | Solved |
| 3.6 | Final interview | No back-up candidate kept at the final stage | Same as 1.19 | B26 | Solved |
| 3.7 | First client contact | No immediate allocation, no full JD or package on arrival | Same as 1.21 | B28 | Solved |
| 3.8 | Chase client feedback | Prima candidates had heard nothing by 13 Mar 2026 | Same as 1.2 and 1.3 | B3, B4 | Solved |
| 3.9 | Intro call, requirements | Idea: connect package, role and brief in the intro call step | The held-call form has exactly those three fields; the brief goes to the TA lead | P2 8 | Solved |
| 3.10 | Selection, offer, negotiation | A candidate had not received the client's offer letter | Offer letter is a required file on Place; missing → task to the owner; TA tells the candidate (TA side) | T1, P6 4 | Solved |
| 3.11 | Client shortlists | Client may change the brief with the shortlist (age up to 50, budget) | Requirement versions; a changed brief → new version → `PATCH openings/{id}` with a bell to the TA | B31, P3 10 | Solved |
| 3.12 | Set rejected, add-on set | The rejection reason is not recorded | Same as 1.15 | B20 | Solved |
| 3.13 | Draft and send ESA | Copy came back unsealed and was resent; each ESA drafted separately; idea: automate with variable columns | Same as 1.22 | B2 | Solved |
| 3.14 | Client schedules | Ops must pass on candidate contacts (Apex, 7 Oct 2026) | When the client books, Ops's message carries the candidate contact from TA's record (owner approves); the client must report the date (reminder timer) | P5 6 | Solved |
| 3.15 | Chase and log ESA signature | Follow-ups miss the 5-working-day KPI | Same as 1.1 | B1 | Solved |
| 3.16 | Post placement update | Asma learned of a January joining on 30 Mar 2026 | Same as 1.6; the Placement Updates post is replaced by the notice (text still drafted if wanted) | B9, B14 | Solved |
| 3.17 | We schedule | Carsons schedule was late on 15 Feb 2026 | Slot request drafted at once when the client shortlists; slot loop with timers and a 3-attempt limit; "awaiting slots" view | P5 3-5 | Solved |
| 3.18 | Candidate drops out | Client must be told at least 1 day, or 3 hours, before | Drop-out notice drafted with the 1-day / 3-hour check against the slot; approved; sent | B5, P5 11 | Solved |
| 3.19 | Check candidate availability | Sithusha withdrew over a laptop on 12 Aug 2026 | Candidate side is TA's: reconfirm and call task; withdrawal → candidate out → notice + back-up | P5 10-11 | Solved |
| 3.20 | Director countersigns ESA | Fletching's signed ESA reached the Director only on 2 Jun 2026 | Same as 1.5 | B8 | Solved |
| 3.21 | Get package, DOJ, invoice address | Asma could not ask for package details two months after joining | Same as 1.24; billing contact on the client profile | B9, D2 | Solved |
| 3.22 | Track DOJ through notice | Date moved with no owner | Same as 1.17 | B22 | Solved |
| 3.23 | Log schedule, post image | Reschedules are not tracked | Same as 1.18 | B19 | Solved |
| 3.24 | Record client and position | No master client contact sheet; idea: can be automated | Same as 1.12; the client and position records are created from the lead, ESA and requirement without retyping | B16, P2 3, P3 6 | Solved |
| 3.25 | Send invite, candidate accepts | Neel and Dilum had not replied by 25 Sep 2026 | Same as 1.4 | B5 | Solved |
| 3.26 | Joining delayed | Siva was awaiting a visa on 3 Aug 2025 | Same as 2.8 | P6 5 | Solved |
| 3.27 | Confirm joined | "Pls confirm if all 3 joined" was asked on 1 Jul 2025 | Joining-day 9 AM task per placement; `placement.joined` event; placements view "joining this week" | P6 7, 18 | Solved |
| 3.28 | Handover and allocate TA | The handover date is unclear | Same as 1.16 | B17 | Solved |
| 3.29 | Invoice and collect fee | No invoice records in the archive; late charge 5% per month | Same as 1.23; late charge computed by the engine (simple or compounded, decision) | B29, I15 | Solved / Decision |
| 3.30 | Offer declined or dropped | AMW's Thushara withdrew on 30 Jan 2026 | Same as 2.5 | B30 | Solved |
| 3.31 | Post job ad | Posts hang open with only 20-30 CVs and no capacity planner | Same as 1.20 | B27 | Solved |
| 3.32 | Replacement within 90 days | Full fee must be paid first | Guarantee valid only if `feePaidAt` is set; unpaid → void | P7 4, I (decided 27 Oct) | Solved |
| 3.33 | Reopen search | Dropouts must be reported (22 Nov 2025) | Leaver recorded with reason → TA opening reopened automatically → TA and TA lead told | P7 4 | Solved |
| 3.34 | Close or remove post | Ops must always be told to remove posts | Close checklist creates the tasks for both sides | B13, P7 11 | Solved |
| 3.35 | Search, call, screen | Most of the 14 May 2026 TA campaign list was unreachable | TA's own problem (follow-up and drop-out rules); outside Ops; TA's 3-attempt rule and drop-out list apply | TA | Accepted |
| 3.36 | Internal shortlist | The Director does not say why | Same as 1.14 | — | Accepted |
| 3.37 | Email CV set | Hunted CVs not always copied to the CV mailbox; idea: map where sources come from | Same as 1.13; source on every post and CV | B18, J4 | Solved |
| 3.38 | CVs redirected to recruiter system | Idea: this part needs to be automated | Every ad channel gets its own routing address; TA files the CV itself with the source | J4 | Solved |
| 3.39 | Create client group, post set | Damad was chased for feedback on 29 Sep 2026 | Same as 1.2; the group post is drafted at set-sent | B3, P4 5 | Solved |
| 3.40 | Update client and job sheets | Tabs are not always updated | Same as 1.11 | D4 | Solved |
| 3.41 | Weekly active positions report | Most of 21 positions read "Pending client feedback" (13 Mar 2026) | Report built by the system every Monday from TA and Ops data; "waiting on client" is a column with days | P7 9 | Solved |

## 4. c5185 · Flow problems by topic (23 rows)

| # | Topic / step | Problem | Solution | Plan | Status |
|---|---|---|---|---|---|
| 4.1 | Path: ESA chase | Chase kept going after the client replied or signed | Any inbound matched to the subject cancels the chase timers | B32, P1 17 | Solved |
| 4.2 | Path: ESA reply | Outright decline had no exit | `esa.decline` from the reply classification | P2 17 | Solved |
| 4.3 | Path: placeholders | Blocked draft had no way back | Blank field → error listing the fields → edit → redraft | P2 10 | Solved |
| 4.4 | Path: candidate reminders | Reminders ran after a reply; complete reply went via "missing items" | TA's follow-up (T4): reply stops reminders; details complete → Director review | T4 | Solved (TA) |
| 4.5 | Path: candidate skipped | Do-not-contact and not-reached drop-outs were dead ends | TA: back to search; Ops not involved | TA | Accepted |
| 4.6 | Path: client reply | Chase and owner call forced even if the client had replied | Inbound cancels `feedback.chase` and `feedback.call`; the call task is only created if no reply | P4 10-11 | Solved |
| 4.7 | Path: interviews | No-slot loop, unreachable on reconfirm, no back-up, report reminder looping | Slot loop limit 3; reconfirm → call task → candidate out; back-up from TA; report reminder is a separate timer | P5 5, 6, 10-12 | Solved |
| 4.8 | Path: unlabeled arrows | Rejected candidates continued after decision steps | State machines allow only the listed moves (D5) | D5 | Solved |
| 4.9 | Path: depth check | "Set reviewed, none shortlisted" leaks to "Who schedules?" | Interviews start only from a shortlisted candidate (state `slots` needs a Client Shortlist application) | P5 2, 13 gap 7 | Solved |
| 4.10 | Path: replacement hire | Billed like a new hire | `isReplacementOf` → no invoice, new guarantee | B37, P6 11 | Solved |
| 4.11 | Path: lost after placing | Placement and Asma are not told | `placement.fell_through` / cancel events → notice to Asma and the owner | P6 6 | Solved |
| 4.12 | Timing: ownership vs feedback | Feedback timer waited for the 7-day window | Both timers start at receipt, independently | B33, P4 6 | Solved |
| 4.13 | Timing: weekly report, Talent Pulse, surcharge | Tied to the wrong events | Monday desk job; Tuesday job; 3 months from set sent | B34 | Solved |
| 4.14 | Timing: ESA late alert | Alert hung off the review step, not the 2 h clock | Timer `esa.send` from the held call | P2 8 | Solved |
| 4.15 | Timing: rebook loops, hold, offer, referee, client options | No limits or timeouts | Rebooks 3; slot loop 3; hold limit ⚪; offer silent ⚪; referee not reached → reported as is; client options deadline ⚪ | I11, I16, I17 | Decision |
| 4.16 | Ownership: ops owner and TA | Owner set twice; TA at intro call before assignment | Owner set once at lead tagging; the **TA lead** (not a TA) joins the intro call; the TA is assigned at opening creation | B23, P2 7 | Solved |
| 4.17 | Ownership: countersign and Director set | Single reminder, no escalation | Escalation ladder: owner → ops lead after 24 h (⚪ target) | B6, P1 15, I6 | Decision |
| 4.18 | Rules: pipeline depth | 3-pending and 5-total rules overlap | Evaluated in fixed order: ≥5 → hold, else ≤3 pending → add-on, else follow-up | B36, P4 14 | Solved |
| 4.19 | Rules: set size | No minimum before the client set | Minimum 5 enforced in TA for both sets | T5 | Solved (TA) |
| 4.20 | Inefficiency: payment logged and fee collected | Same event twice | One payment row marks the invoice paid | B38 | Solved |
| 4.21 | Inefficiency: ads stay live until fee | Posts hang open 30+ days after search stops | Offer made → "close adverts?" prompt to the TA; close checklist at the end; TopJobs closes itself at 2 weeks | P6 2, P7 11 | Solved |
| 4.22 | Misalignment: position closed | Closes at fee while guarantee runs; closed twice | Closes once, at guarantee end / refund / write-off, through the checklist | B39, P7 11-13 | Solved |
| 4.23 | Misalignment: TopJobs | Dead end after ad closed; duplicate close | One ad-channel record with a single closed state; the close checklist only asks if still live | P3 12 | Solved |

## 5. c4309 · System flow gaps (13 rows)

| # | Area | Gap | Solution | Plan | Status |
|---|---|---|---|---|---|
| 5.1 | Source flow | c3626 not on desk; Full Final Flow edges stop after Track DOJ | Plan built on c5237 (newest) with c3626 as the locked business flow | 04, 14 | Solved |
| 5.2 | Pre-ESA stages 1-3 | No lead, ESA or countersign module | Phase 2 in full | P2 | Solved |
| 5.3 | Silence rule | 2 weeks vs ESA 14 days vs "follow ESA" | One rule, 14 calendar days from profiles shared; chase cadence inside it | B35, I (decided 27 Oct) | Solved |
| 5.4 | Client round | Saved as held, never emailed | Ops sends it and marks it sent in TA | B43, P4 4 | Solved |
| 5.5 | Interviews | No scheduling in the code (actually partly exists) | Extend TA's interview record; Ops adds slots, invites, Teams, reminders, notices | P5 | Solved |
| 5.6 | Voice calls | AI calls suspended; drop-out and joining-day calls manual | Call tasks with number and outcome; no AI calls now | F4, I13 | Decision (default: tasks) |
| 5.7 | Alerts | Only to the main recruiter; no escalation | Ops escalation ladder; TA bells to the TA lead through `notify` | B42, P1 15 | Solved |
| 5.8 | Two follow-up flows | Old day 3/5/7 beside the new | T4 retires it | T4 | Solved (TA) |
| 5.9 | Client WhatsApp groups | Notes disagree | Groups stay; the system drafts the post text and logs it; ops posts | I (decided), F2 | Accepted |
| 5.10 | Accounting | No tool; no late charge or chase | Invoice engine with late charge and chase; CSV export | P6 | Solved |
| 5.11 | Website form | Lead automation undecided | Webhook (default) or hello@ parse | I4, P2 6 | Decision |
| 5.12 | Guarantee warning | Day-75 unconfirmed | Timer `guarantee.warn`, default on at 75 | I17 | Decision |
| 5.13 | Talent Pulse | One tracked link per role; CV redirect not live | Post per channel with its routing address; link optional | J4, I9 | Decision (default: address only) |

## 6. c4103 · System map gaps (8 lines)

| # | Gap | Solution | Plan | Status |
|---|---|---|---|---|
| 6.1 | Not built: lead, ESA, requirement notes, scheduling, invoicing, guarantee | Phases 2, 3, 5, 6, 7 | G | Solved |
| 6.2 | Ops has no screens; everything on Excel, WhatsApp, Outlook | The Ops backend and inbox; screens by the UI team after Phase 1 queries | 07, P8 20 | Solved |
| 6.3 | Mail is the weak link: client set never sent; no offer/placement notices | Ops sends sets; same-day placement notice; candidate notices stay TA's (offer letter by TA) | P4 4, P6 3 | Solved |
| 6.4 | AI voice calls suspended | Same as 5.6 | F4 | Decision |
| 6.5 | Two intake designs and two follow-up flows | T4; intake is TA's | T4 | Solved (TA) |
| 6.6 | Follow-up auto-advance needs current salary but the Director gate does not | TA-side alignment (stop asking current salary where not required) | TA follow-up skill, T4 | Solved (TA) |
| 6.7 | Silent-client wording conflicts | Same as 5.3 | B35 | Solved |
| 6.8 | Client WhatsApp groups conflict | Same as 5.9 | — | Accepted |

## 7. c4217 · Assumptions to confirm (4 rows)

| # | Topic | Risk on the board | Solution | Plan | Status |
|---|---|---|---|---|---|
| 7.1 | AI voice calls | If the design counts on AI calls, none will happen | Calls are human; the system makes the task and records the outcome; never AI to clients or the Director | F4, I13 | Decision (default: human) |
| 7.2 | Silent-client hold | Closed arrow contradicts the decision; three clocks; no reason field | One clock (14 days), reason required on hold, return-from-hold path, closing a separate ⚪ decision | B35, P4 12-13, I11 | Solved / Decision |
| 7.3 | Fee payment | Who invoices and when; simple or compound; unpaid fee and guarantee; leaver before payment | Ops drafts, accounts approves and sends on joining day; due 30 days; simple (default) or compounded ⚪; guarantee void if unpaid; leaver before payment → void | P6 9-14, P7 4, I15 | Solved / Decision |
| 7.4 | Refund ownership | Nobody named to decide, pay, close; no role; no 60-day timer | Director of Operations role decides; accounts pays (credit note); close checklist; 60-working-day timer; ops owner linked to the client | P7 6, D2 roles | Solved |

## 8. c4571 · Flow check, seven decisions (12 rows)

| # | Decision | Board result | In the plan | Status |
|---|---|---|---|---|
| 8.1 | d12 Signed ESA: notify team, then countersign | Covered | P2 15, 18 | Solved |
| 8.2 | d99/d102 7-working-day ownership from receipt | Covered | P4 6-7 | Solved |
| 8.3 | d101 Rest of set continues after claimed CV | Covered | P4 7 | Solved |
| 8.4 | d63 Hold at five shortlisted | Covered; exit rule open | Exit = below five → open again (26 Oct); hold limit for silence is the open part | P4 14, I11 | Solved / Decision |
| 8.5 | d65/d89 Add-on at 3 or fewer pending | Covered | P4 14 | Solved |
| 8.6 | d82 Silent client follows ESA inactive rule | Covered; day count open | 14 calendar days (decided 27 Oct) | B35 | Solved |
| 8.7 | d47 Check pipeline after a rejection | Partly: rejection notice has no arrow back | Depth evaluated after every client decision and every stage-change event, including rejections | P4 14 | Solved |
| 8.8 | d43/d45 ESA decline after 2 weeks, search never starts | Covered | P2 17 (14 days) | Solved |
| 8.9 | d86/d87/d90 Guarantee from joining; close at fee; write-off closes | Covered on the board, but "close at fee" was replaced on 27 Oct by "close at guarantee end"; write-off still closes | P7 11-12 | Solved |
| 8.10 | d121/d123 TA informed of feedback; owner calls next day | Covered | P4 9-10 | Solved |
| 8.11 | d117 Client/Director emails held for approval | Covered | P1 16 (pipeline) | Solved |
| 8.12 | d126 Manual lead entry by TA lead, Asma or Director | Covered | P2 2 | Solved |

## 9. c2499 · Open questions (11 lines)

| # | Question | Answer in the plan | Plan | Status |
|---|---|---|---|---|
| 9.1 | Candidate leaves before the fee is paid | Guarantee void; position closes; no replacement duty | P7 4 | Solved (decided 27 Oct) |
| 9.2 | Client never pays after the chase | Write-off at ~60 days; guarantee void; close; client flagged for the owner's decision | P6 14 | Solved |
| 9.3 | 90 days from first working day or 3 months | 90 days from joining (ESA) | decided | Accepted |
| 9.4 | 5% monthly vs letting non-payers go after 2 months | Both: 5% per month for two cycles, then write-off | P6 13-14 | Solved |
| 9.5 | ESA promises 7-14 days response and 5-10 profiles: track? | Set due timer 7/14 days; KPIs "sets within 14 days" and "profiles per set" | P4 2, P7 16, J12 | Solved |
| 9.6 | ESA inactive rule vs 2-week hold | Same as 5.3 | B35 | Solved |
| 9.7 | Fee collected leads nowhere: end or close? | Guarantee runs on; close at guarantee end | 13 gap 2 | Solved |
| 9.8 | Client chase and inactive notice: approval or automatic | Both drafted for approval (client-facing) | P4 10, 12 | Solved |
| 9.9 | "What to build" says 14-day hold; align with ESA | Aligned: 14 calendar days from profiles shared | B35 | Solved |
| 9.10 | Director Review: rejection reason required? | No | decided | Accepted |
| 9.11 | Client feedback chase: 2 working days, call at day 4? | Replaced by 26 Oct: chase at 1 day, call next day, stop after 3-4 silent days | B35 | Solved |

## 10. c1700 · Decisions for you (28 lines)

| # | Question on the board | Where it stands | Plan | Status |
|---|---|---|---|---|
| 10.1 | Asma's two months after DOJ, or 30 days after joining? | Invoice on joining day, due 30 days | P6 9 | Solved (decided) |
| 10.2 | Who owns DOJ tracking and the 90-day window? | Ops owner; TA makes the calls | B22, B25 | Solved (decided) |
| 10.3 | Ops sees all clients, or each only theirs? | Default all visible, own in the inbox | I2 | Decision |
| 10.4 | Which accounting tool? | None now; generated invoices + CSV | P6 17 | Solved (decided) |
| 10.5 | Should the client round email go live? | Yes, sent by Ops after approval | P4 4 | Solved |
| 10.6 | "Industry declined" vs "Role impractical" follow-up differ? | Yes: industry = never invited back; impractical = invite-back date | P2 4, P3 4 | Solved |
| 10.7 | How long should a silent client wait before the position closes? | Hold at 14 days; close limit ⚪ (default manual) | I11 | Decision |
| 10.8 | Cards c1256, c1502, c1708 not on the desk | Not on the board; nothing to build | — | Accepted |
| 10.9 | Is the Hold rule after 2 weeks of silence final? | Replaced by the 14-calendar-day ESA rule | B35 | Solved |
| 10.10 | Fee due 30 days after joining, or invoice sent then? | Invoice sent on joining day, due 30 days after | P6 9 | Solved |
| 10.11 | Does a refund require the full fee paid first? | Yes | P7 4 | Solved (decided) |
| 10.12 | Next-day 100% decided by the TA lead only? | TA lead picks; ⚪ one or five per day | I8 | Decision |
| 10.13 | (same as 10.6) | — | — | Solved |
| 10.14 | Final flow: Enquiry to fee collected, or First draft? | c3626 locked; c5237 is the system flow | 04 | Accepted |
| 10.15 | Position closes at offer or at fee collected? | Neither: search stops at offer; closes at guarantee end | 13 gap 2 | Solved (decided) |
| 10.16 | 2-week silent hold replaces the ESA 14-day rule? | The ESA rule wins | B35 | Solved |
| 10.17 | (same as 10.12) | — | — | Decision |
| 10.18 | Guarantee 90 days from first working day or 3 months? | 90 days | — | Accepted |
| 10.19 | Who owns the weekly report? | TA lead reviews; the system builds and sends | P7 9 | Solved |
| 10.20 | Ownership check from sent or received? | Received (receipt date editable, default = sent) | P4 4, 6 | Solved |
| 10.21 | Fee basis from percent to months of gross? | Months of gross (or basic) from the ESA; stored per agreement | D2 opsEsa.fields | Solved |
| 10.22 | Website form creates leads automatically? | Default yes by webhook | I4 | Decision |
| 10.23 | Client rejections: automatic or after approval? | Rejection notice to the candidate automatic (template, TA); the client is never sent a rejection | T5 | Solved |
| 10.24 | Client WhatsApp groups stay? | Stay; system drafts, ops posts | F2 | Accepted |
| 10.25 | (same as 10.23) | — | — | Solved |
| 10.26 | Client feedback chase at 2 working days, call at 4? | Replaced: 1 day, call next day | B35 | Solved |
| 10.27 | Day-75 guarantee warning wanted? | Default on | I17 | Decision |
| 10.28 | Talent Pulse one tracked link per role? | Default: routing address, link optional | I9 | Decision |

## 11. c1834 · To check (5 lines) and c3929 · Task sort notes (2 questions)

| # | On the board | Answer | Plan | Status |
|---|---|---|---|---|
| 11.1 | Hold per ESA rule vs 2 weeks silent | ESA rule, 14 calendar days | B35 | Solved |
| 11.2 | ESA decline: 14 days silent vs 2 weeks of chase | 14 calendar days from sending, any reply stops | P2 17 | Solved |
| 11.3 | "No client WhatsApp groups" vs "groups stay" | Groups stay | F2 | Accepted |
| 11.4 | Brief says groups stay; later "groups gone"; client process unchanged | Same as 11.3 | — | Accepted |
| 11.5 | 2 weeks silent for decline and hold vs ESA rule | Same as 11.1-11.2 | — | Solved |
| 11.6 | Interview invite: Ops owner, or sent automatically? | Automatic from a template; the owner handles exceptions | P5 9, I5 | Solved (decided 27 Oct) |
| 11.7 | ESA hold: ESA rule vs 2 weeks | Same as 11.1 | — | Solved |

---

## 12. The decisions still open, collected from the rows above

| Decision (Part I number) | Rows | Default in the plan |
|---|---|---|
| I2 own clients or all | 10.3 | all visible, own in the inbox |
| I4 website leads | 5.11, 10.22 | webhook |
| I6 escalation targets after a single reminder | 4.17 | ops lead after 24 h |
| I8 one or five 100% positions a day | 10.12 | TA's current rule (five) |
| I9 Talent Pulse link | 5.13, 10.28 | routing address only |
| I11 hold limit before closing | 4.15, 7.2, 8.4, 10.7 | manual close |
| I13 calls | 5.6, 6.4, 7.1 | human calls, system tasks and logs |
| I15 late charge simple or compounded; invoice details | 3.29, 7.3 | simple |
| I16 offer-silent timeout | 4.15 | none (TA's) |
| I17 day-75 warning; client deadline after no-show | 4.15, 5.12, 10.27 | 75 on; 5 working days |

Everything else on the board is either built by the plan or was decided by the owner on
20-28 Oct.
