# Ops x TA System: integration plan (DRAFT, 27 Oct 2026)

Status: **draft for the owner and the team (Asma, Rushda, TAs) to approve. Nothing is built.** Built from `/ops` (ANALYSIS.md, the latest flow c5237, the locked flows, the dated decisions) and the TA System code at main `4c355c4`. The 17 contradictions are settled with the recommended answers (section 2, owner chose "use your recommendations" on 27 Oct). Open timeouts get proposed defaults, marked **(proposed)**.

## 1. Shape of the solution
**Recommendation: one codebase and one backend, two workspaces.** The owner wants "two systems, separate teams, connected wherever relevant". The TA System already owns clients, openings, applications, interviews, offers, placements and `esaRecords` on one Convex backend, so a separately hosted Ops app would have to copy that data and keep it in sync through an API. Instead:
- An **Ops workspace** inside the same app: its own nav and pages under `/ops/*` (Leads, Clients & ESA, Client comms, Interviews, Placements & money, Guarantees, Ops inbox, Reports), shown to ops roles. TAs keep their workspace as it is.
- The **connection points (LINK steps in c5237)** become explicit backend hand-overs (`convex/ops/links.ts`): one internal mutation per LINK, so each crossing is logged and testable.
- Same sign-in (Clerk), same safety gates, same release pipeline.
This is the one architectural choice to confirm (section 10, Q1). A separate deployment can still be split out later because the LINK layer is the only seam.

## 2. Rules applied (contradictions resolved)
| # | Rule | Value used in the build |
|---|---|---|
| 1 | Silent client | One clock: ESA inactive = **14 calendar days after profiles shared** with no feedback -> position **On hold** (reason saved, inactive notice drafted for approval). Inside it: chase draft after 1 working day, owner call next working day, chasing stops after the 3rd-4th silent working day. |
| 2 | ESA decline | **14 calendar days after the ESA is sent** with no signature/agreement -> ESA declined, reason saved, search blocked. Any client reply stops the chase. |
| 3 | Guarantee | Clock starts on the **first working day (join date)**; replacement/refund rights only if the fee is **fully paid**; unpaid -> no guarantee. |
| 4 | Length | **90 days** from first working day (ESA wording). |
| 5 | Invoice | Drafted **on joining day**, ops approves, sent; **due 30 calendar days after first working day**. |
| 6 | Late charge | **5% per month, compounded**, from the due date (as the ESA says; legal wording stays the owner's call). |
| 7 | Fee basis | Stored per client agreement as a rule: months of gross (1 for Sri Lankan, 2 for non-Sri-Lankan), basis gross/basic, or flat fee; snapshotted on the placement (extends today's `feePercent`/`flatFee`). |
| 8 | Close | Search stops at the **offer**; LinkedIn/TopJobs close at placement (or monitor-only/underperforming); the **position closes when the guarantee ends** (clean, refund paid, or fee written off). |
| 9 | Reference | Only if the **client asks**; TA phones the referee, notes saved, reported as is (no form, no score). |
| 10 | Director rejection | **No reason required.** |
| 11 | Client WhatsApp groups | **Stay.** System drafts the group post text and logs it; ops posts by hand. |
| 12 | DOJ | TA makes the calls; **ops owner owns** the DOJ record and the guarantee; both get alerts. |
| 13 | Rejection notices | **Automatic** from one approved template (no per-message approval). |
| 14 | Daily 100% | The **TA lead sets** each TA's 100% position, also on a returning job, for 1-3 days. |
| 15 | Interview invites | **Sent automatically** (invite, Teams link, day-before reconfirm); ops handles exceptions. |
| 16 | Replacement hire | **No new invoice; a new 90-day guarantee.** |
| 17 | Talent Pulse | **One tracked apply link per role (proposed).** |
Already decided on the canvas and kept: client/Director emails drafted -> approved -> sent; reasons required for reject/hold/decline/drop-out; min **5 CVs** per Director set and client set; add-on at **<=3 pending**, hold at **5 shortlisted in total**, hold lifts below five; CV ownership **7 working days from receipt**; banking/finance declined for good; ESA sent within **1-2 h** of the intro call (alert at 2 h); countersign within **1 day**; 3 unanswered rebook emails close an intro call or requirement meeting; candidate reminders 24/48/72 h, max 3 messages in 24 h then escalate to TA; TopJobs closes after **2 weeks**; LinkedIn reposted under 20 CVs/day; unreported hire after **3 months** -> 50% surcharge; payment chase **2 months** then write-off; refund **25%** only after **60 working days** without a replacement, decided by the Director of Operations.

**Proposed defaults for the OPEN timeouts** (owner to confirm): offer silent -> TA call task after 3 working days, counted as declined after 5; silent-hold limit -> close (ops approves) 30 days after hold; client replace/stop decision after a no-show -> reminder after 3, ops call after 5 working days; day-75 guarantee warning -> yes (cheap); Director countersign -> reminder day 1, escalate to Asma day 2; Director set chase -> 1 working day, escalate to TA lead day 2; client "report the interview date" -> 2 reminders then ops owner call; surcharge invoice -> same payment chase as fees.

## 3. Roles and access (extends `src/lib/auth.ts`, `users.taRole`)
- Keep `ops` (desk-wide). Add a per-client **ops owner** (`clients.opsOwnerId`, movable by an ops lead; also on leads).
- New capabilities: `lead.manage`, `esa.manage`, `client.comms.approve` (approve client/Director emails), `interview.schedule`, `finance.manage` (invoices, payments: Asma/accounts), `guarantee.refund` (Director of Operations), `ads.marketing` (flyers, Talent Pulse).
- New roles only if the people need them: `ops_lead` (assigns ops owners, approves closes), `accounts`, `marketing`, `director_ops`. **Which person holds which role is Q2.** Backend checks mirror `can()` in `convex/ta/guard.ts` style; every money action audited in `activityLog`.

## 4. Data model (Convex; every new field optional; data changes as `dryRun` migrations through the pipeline)
New tables:
- `leads`: source (website/whatsapp/call/email), contact, company, industry, bankingFinanceFlag, opsOwnerId, status (new, intro_booked, intro_held, esa, requirement, opened, declined_industry, declined_esa, impractical, closed_silent), reasons, invite-back date, links to client and opening.
- `opsTasks` (the ops inbox): kind (approve_message, call_client, rebook, countersign, final_esa_call, review_set, decide_hold, refund_decision...), ownerId, dueAt, subject refs, status, escalation level.
- `opsTimers`: kind (esa_send_2h, esa_decline_14d, countersign_1d, ownership_7wd, client_chase, inactive_14d, offer_silent, guarantee_90d, replacement_60wd, unreported_3m, payment_due_30d, chase_2m...), subject, startsAt, dueAt, firedAt, cancelledAt. One evaluator, not scattered code.
- `clientMessages`: one row per client- or Director-facing message: kind, channel (email/WhatsApp), template id, draft body, status (drafted, approved, sent, failed, uncertain), approvedBy, sentAt, Graph/Meta ids. All sends go through it.
- `adChannels`: per opening: TopJobs (requested, flyer file, sent, live, closesAt 2 weeks, cost 5,400/12,700) and Talent Pulse (edition, apply link, CV count).
- `invoices` + `payments`: number, kind (fee/surcharge), basis snapshot, amount, issuedAt, dueAt, status (draft, approved, sent, paid, overdue, written_off, credited), late-charge ledger.
- `guarantees`: placementId, startsAt (join), endsAt (+90 d), state (running, ended_clean, leaver, replacing, refund_due, refunded, void_unpaid), replacementOf.
Extend: `clients` (opsOwnerId, industry flag, status), `esaRecords` (templateVersion, draft file, chase state, countersignedAt, negotiation notes, declineReason; status adds `declined`), `reviewRounds` client rounds (approval state, `receivedAt`, ownership clock, claimed CVs; `dispatch: "held"` becomes a real send), `interviews` (scheduledBy client/us, slot proposals, Teams link, reconfirm state; it already has round, confirmedAt, taOutcome, taHistory, taFeedback), `placements` (package, offer-letter file, DOJ change log, opsOwnerId, guaranteeId, fee rule), `jobs` (requirement fields from the meeting, `handoverAt`).

## 5. Connection points (LINK -> how it is built)
| LINK on c5237 | Direction | Built as |
|---|---|---|
| Lead tagged, owner set; owner alerted | Ops -> Ops/TA lead | `leads` insert + bell to owner |
| Client, ops owner recorded (after countersign or ESA on file) | Ops | `clients` upsert + `esaRecords` signed |
| Notice to ops, TA, director (ESA signed) | Ops -> all | notifications + countersign task/timer |
| Requirement saved -> Opening built -> Primary TA picked -> 100% day set -> Bell to TA | Ops -> TA | `ops/links:openingFromRequirement` calls the existing opening create path (`convex/ta/openings.ts`), sets team seats and the TA's 100% day, stamps `handoverAt` |
| JD approved | TA -> Ops | existing JD approval; Ops sees status |
| LinkedIn advert Live | TA -> Ops | existing job post; starts weekly Talent Pulse listing, TopJobs request button, repost rule |
| CV source tagged | Ops ads -> TA | source tag on applications (LinkedIn, TopJobs, Talent Pulse, hunted); Talent Pulse link files CVs to the TA's opening |
| Set emailed to Director / Director reviews / reply read in | TA | existing EOD + reply reader; add min-5 check and chase escalation |
| Client set drafted -> set sent to client | TA -> Ops | client round leaves "held": `clientMessages` draft, ops approves, system sends; `receivedAt` starts ownership clock and feedback timer |
| Client replies -> reply read -> TA informed -> reason saved -> client decision | client -> both | existing shortlist reader (`convex/mailIntake/*`) + TA bell + reason |
| Pipeline pending counted / total shortlisted / add-on alert / hold at five / hold lifts | TA | new depth evaluator on opening events |
| Interview booked / invite and Teams sent / TA alerted / cancel logged / held | Ops -> TA | scheduler on `interviews` |
| Client round decision / TA informed | client -> TA | interview feedback + bell |
| Offer made -> search stops -> accepted / declined | TA -> Ops | existing offer panel; search stop + ad close prompts |
| TA presses Place -> package, DOJ, offer letter asked -> placement saved -> Asma and ops told | TA -> Ops | extended Place form; same-day notice; guarantee + invoice draft created |
| TA confirms joined -> 90-day clock starts | TA -> Ops | joining-day 9 AM alert exists; confirm starts guarantee (every hire; invoice first hire only) |
| Candidate leaves -> position reopened | Ops -> TA | reopen same opening, TA bell, replacement clock |
| Lead or position closed | both | close checklist (LinkedIn by TA, TopJobs by ops, position, lead) |

## 6. Modules (what, reuse, new, size)
**M1 Foundations (L).** Roles/capabilities, ops owner, `opsTasks` inbox page, `opsTimers` + one cron evaluator (pattern of `evaluate-follow-up`: cursor, prime interval, kill switch `C141_OPS_TIMERS`), `clientMessages` pipeline (draft -> approve -> send through `convex/lib/outreachSafety.ts`/`outboundGuard.ts`; Graph mail via `convex/lib/graphMail.ts` from an ops mailbox; WhatsApp via existing senders with **new Meta-approved client templates**), working-day calendar with **Sri Lankan public holidays filled** (`src/lib/calendar.ts` has `HOLIDAYS = []`), audit.
**M2 Leads desk (M).** Lead form (manual), website lead from hello@ (Q: auto?), duplicate-client match (`clients.nameKey`), banking/finance flag + standard decline (template, approval), intro call booking/rebook with 3-email close, package/role/brief saved.
**M3 ESA manager (L).** Template with variable fields (client, company, tax no., email, signatory) -> placeholder check -> ops approve -> send within 2 h (alert); chase 3 emails + 2 WhatsApps (held for approval), Rushda call task; reply stops the chase; negotiation notes + resend; signed copy upload, team notice, countersign task (1 day), countersigned copy returned; declined at 14 days; returning client without ESA = hold + chase. Builds on `esaRecords`/`esaStanding()` (a dormant model: no screen or action uses it yet, see COMPARISON.md).
**M4 Requirement and handover (M).** Requirement meeting booking/rebook (3-email close), requirement form (JD, insights, salary, location, position, level), impractical -> polite reply + invite-back reminder, `openingFromRequirement` LINK, lead-set 100% day (extends `/workday` rule).
**M5 Ad channels (M).** TopJobs request -> marketing flyer -> ops sends -> live/closed (2 weeks) with TA alerts and cost; Talent Pulse Tuesday list + tracked link + source tag + CV redirect to the opening; LinkedIn under-20-CVs/day repost prompt; analytics by source.
**M6 TA-side changes (M).** Follow-up: escalate to TA after 3 unanswered in 24 h; stop chasing current salary where not required (`pipeline/followUpHelper.ts`, `communications/inboundExtraction.ts`); retire the legacy day-3/5/7 flow. Sets: min 5 CVs for Director set. Rejection notices from one template (Director and client rejections, round rejections). Pipeline depth evaluator (add-on at <=3 pending, hold at 5 shortlisted, lift below 5). Director chase escalation. Update `/follow-up`, `/sets-shortlist`, `/workday`, `/eod-email` skills.
**M7 Client comms hub (L).** Client set email out of "held" (min 5, approval, send, receipt date), client group post text + log, ownership clock 7 working days with countdown/alert, claimed-CV drop (rest continues; refused after 7 days), feedback chase cadence, inactive notice + On hold with reason, return path, unreported-hire 3-month clock.
**M8 Interview scheduler (L, largest; EXTENDS the existing interview record, actions and alerts: see COMPARISON.md row 14).** Who schedules; client slots request/receive/match loop (stop after 3 unanswered, TA back-up); client-books path with report reminders; booking creates Outlook invite + Teams link (needs Graph calendar/online-meeting permission), day-before reconfirm (auto) + call task, candidate drop-out notice to client (>=1 day or 3 h, approved), client cancel -> TA alert -> rebook, attendance, TA feedback after 5 PM, client message draft/approve/post, round decision.
**M9 Reference, offer and placement (M).** Client-requested reference (phone notes, report as is), offer -> search stops (+ ad close prompt), offer-silent timer, Place form asks package, DOJ, offer letter (alert Asma/ops if missing), same-day notice to Asma and ops, DOJ change log with owner, joining-day 9 AM (exists) -> confirm joined / no-show options (replace or stop, no refund). Move offer/placement writes into the backend (today the logic sits in `src/data/store.ts`).
**M10 Money (L).** Invoice draft on joining day from the fee rule (first hire only), approval, send, due 30 days; payment logging; chase from day 30 with compounded 5%/month; write-off after 2 months (no guarantee); surcharge invoice for unreported hires; CSV export (no accounting tool yet).
**M11 Guarantee (M).** Guarantee from join date, day-75 warning, clean end; leaver: fee paid -> replace first (reopen same opening, TA told, 60-working-day clock), replaced -> new guarantee, none in 60 working days -> Director of Operations decides 25% refund -> logged; unpaid -> void. Replace `refund_due` "refund or free re-run" in `src/lib/closing.ts` with this rule.
**M12 Reports and close (S/M).** Weekly active-positions report built automatically, TA lead reviews, sent to Mr Azeem; close checklist (LinkedIn, TopJobs, position, lead) when the guarantee ends.

## 7. Build order and release
Built in dependency order, released **together** (owner: "build the whole system at once after approval"), each module behind its own flag so it can be tested alone and switched on as one release:
1. M1 Foundations -> 2. M2 Leads + M3 ESA + M4 Handover -> 3. M6 TA-side + M7 Client comms + M5 Ads -> 4. M8 Interviews -> 5. M9 Placement + M10 Money + M11 Guarantee -> 6. M12 Reports/close.
Release path as always: branches + PRs (merge-teammate review), `npm test` + both `tsc`, local backend only, `git push origin main:production` with approval. Schema fields optional; data backfills (ops owners for current clients, existing ESAs into `esaRecords`, open placements into `guarantees`, optional import of the master/client/interview sheets) as `dryRun` migrations run by the pipeline.

## 8. Safety
- Every client, Director and candidate message goes through `clientMessages` + `outreachSafety`/`outboundGuard`; `OUTREACH_LIVE` stays out of code; test recipients until the owner switches live.
- Client emails only after ops approval (rule); automatic only for: rejection notices (one template), interview invites/reconfirms, internal alerts.
- WhatsApp to clients needs **Meta-approved templates** (ESA chase, feedback chase, inactive notice, interview notices) outside the 24 h window.
- Graph needs Mail.Send from the ops mailbox(es) and calendar/online-meeting permissions for Teams links (admin consent).
- Money actions audited; refunds need `guarantee.refund`; write-offs need an approval task.

## 9. Testing and acceptance
- Unit tests for every timer (working days with holidays, Colombo time), every rule (min 5, depth, ownership 7 wd, 14-day clocks, 90/60 days, compounded late charge, fee rule) and every LINK.
- Flow tests that walk each branch of c5237 end to end on a local backend with test recipients.
- **Staging does not exist today** (paused since 21 Sep): rebuild it or run a supervised pilot on one client before switching on (Q8).
- Acceptance: Asma, Rushda and two TAs walk the flow with real (test-mode) cases; owner signs off.
- New feature skills for `/ops-leads`, `/esa`, `/client-comms`, `/interviews`, `/money-guarantee`, registered with `/skill-sync`.

## 10. Questions before building (short)
1. One app with an Ops workspace (recommended) or a separately hosted Ops app?
2. Who gets which role: ops lead, ops owners, accounts (Asma?), Director of Operations, marketing?
3. Accept the proposed defaults for the open timeouts (section 2)?
4. Website form: create leads automatically from hello@?
5. Teams/Outlook: may we request Graph calendar and online-meeting permissions?
6. WhatsApp: which client templates to submit to Meta?
7. Invoice numbering, tax lines and currency; CSV export until an accounting tool is chosen?
8. Staging rebuild or a supervised pilot client?
9. Import the current sheets (master, client, interview) or start clean from go-live?
10. Sri Lankan public holiday list for working-day clocks: who maintains it?
