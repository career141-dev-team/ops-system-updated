# 18 · Operations simulation and the final plan

_1 Nov 2026. A research and planning exercise only: nothing was built or changed. Sources:
the TA System's code on `main` (`9deff7ef`, 96 commits since the 27 Oct read), the twelve
feature skills in the TA repository, the owner's planning board (59 cards), and the Ops plan
([15](15-BUILD-PLAN.md)). Where this document says "verified", the behaviour was read in the
code on 1 Nov; where it says "unverified", it was not._

> **2 Nov:** superseded where it differs by [19](19-TA-SYSTEM-IMPROVEMENT-PLAN.md), which was written from seven code audits; the corrections are listed in 19 §13.

**What this document is.** Part 1 describes the real working environment of the TA System
as it is today, and lists where the intended workflow and the real behaviour differ. Part 2
sets out four roles as working people: what each decides, needs and depends on. Part 3 runs
one realistic working day through all four roles with the events the brief asks for. Part 4
evaluates each activity of that day with the ten questions. Part 5 is the final plan: the
improvements to the TA System that the simulation exposes, the Ops system, the technology for
every integration, and the connection points between the two systems, each with its
technology, direction and trigger.

---

# Part 1 · The real operational environment (verified)

## 1.1 What the TA System is, in operation

A recruiting desk used every working day since 21 Sep 2026 by the TAs, the TA lead, the
Director and ops. One **opening** per client role; candidates flow in as **applications**
on that opening; a TA works openings in a **workday** with a mode per opening (100%,
Follow-up, Add-on); sets of CVs go to the Director in an **end-of-day email**; the Director's
and the client's replies move candidates on; offers and placements close the loop.

| Layer | What it is (verified) |
|---|---|
| App | Next.js 16 on the VPS (`ta-prod-app`), Clerk sign-in, server actions; pages load an in-memory copy of the data (`primeStore`) and write differences back through one backend call (`ta/commit:apply`) |
| Backend | Self-hosted Convex (`career141-backend-1`), 116 tables, 19 cron jobs (follow-up sweep every 7 min, mailbox polls 3-17 min, CV queue 2 min, mailbox-read check 30 min, SLA check daily 08:00 UTC) |
| Stores | Postgres (Convex data), Qdrant (candidate vectors), Cloudflare R2 (CV files) |
| Integrations | Microsoft Graph (12+ mailboxes, send and read), Meta WhatsApp Cloud API (8 numbers; per-TA numbers since 30 Oct), OpenRouter DeepSeek, Claude subscription (`claude -p`), NVIDIA, OpenAI embeddings, SearXNG web search, LiveKit voice (browser calls only), partner read-only API, TA tracking extension (since 27 Oct) |
| Mobile | `/api/mobile/v1/*` (26+ routes, extended 23-27 Oct: references, chat, call logs, JD, strategy, snippets, headhunting) |

## 1.2 How candidates enter and move

| Entry | Mechanism (verified) |
|---|---|
| LinkedIn applicants | `linkedin@` polled every 13 min; routed to a job post by alias and keyword (`routeShared`); unmatched → `intakeItems` for a lead to place |
| Per-job and per-TA mailboxes | polled 17 min / 3 min; filed to the opening |
| TA uploads, HH uploads, Scoops, ZIP/folder imports, Workable | `cvUploads` → extraction queue → candidate + application |
| LinkedIn profiles (hunting) | Excel Tables L-sheets with pasted links; the Chrome extension captures; "Add to pipeline" makes an application |
| Database matches | nightly matching is **not** scheduled; matches refresh on "Run" (verified, still true 1 Nov) |

Stages (app names): New CVs → Matched → AI Follow-up → TA Follow-up → Director Review →
Director Shortlist → Client Shortlist → Interview → Offer → Placed; Rejected; Dropped out.
Real blocks: role checks, the Director-review gate (CV + expected salary + notice period), the
placed-exit rule, the collision lock (first TA to shortlist owns the candidate), the workday
gate (a TA with workday history cannot write to a job outside a started workday).

## 1.3 Openings, jobs, candidates and TAs: how they connect

`jobs` (opening) ← `jobPosts` (adverts; several share one pool) ← `applications` (candidate ×
opening, with `ownerTaId`, `setNumber`, `isAddOn`, `backupForApplicationId`) → `candidates`.
Team: `jobAssignments` seats (primary recruiter, supporting recruiter, director, client
contact) with `workingStage`; `jobs.assignedTaIds`, `taLeadId` (set once at creation, no edit
screen, verified 1 Nov), `priorityTier` P1-P5 (targets 14/21/30/45/60 days from `assignedAt`,
which creation never sets).

## 1.4 Daily mechanics (verified)

| Mechanic | Today |
|---|---|
| Start of day | "Today's Checks" drawer; `ta/workdays:start`; needs assigned openings with a TA lead; **at most 10 selected positions and at most 5 at 100%** (`MAX_100_PER_DAY = 5`, 28 Oct); carried positions join as Follow-up |
| Checks before working a 100% position | approved JD, valid LinkedIn job link, latest Suggestions round decided, ≥1 own Excel Tables profile, ChatGPT research link confirmed. Follow-up/Add-on: research link + daily email + no mail problem |
| Activity tracking | `taWorkdayActivity`, `taWorkdayTaskEvents`, check notes, evidence; the TA tracking extension (browser time) since 27 Oct |
| Approvals | JD approval (assigned TA/lead/admin); opening access requests (lead/admin only); Director/client decisions via recorded replies; Master Sheet edits with a reason |
| Feedback | Feedback desk (screenshots, status) for problems; interview feedback per interviewer |
| Handovers | none as a feature: reassignment = "Change the team" (which **resets every TA's mode to 100%**, verified still true 1 Nov); Scoops (CVs sent by a lead/ops to a TA) |
| EOD reporting | `EodComposer`: one original per TA/opening/location/day, To `joborders@`, Cc shamra@, asma@, opsteam@, cv@, shortlists@; prepared-CV PDFs + Excel; sent from the TA's mailbox. **No cron sends or reminds**; a missed EOD for a past day can now be sent separately (30 Oct); stuck sends are flagged (30 Oct) |
| Workday end | automatic when the first final 100% EOD is accepted; no Finish button |
| Follow-up | 7-minute sweep: day-0 template, 24 h reminders, 3 attempts then Unresponsive; AI reads replies; the WhatsApp assistant "answers like a person" and a TA can take over the chat (30 Oct); automatic follow-up is **off by default** (reverted 30 Oct), any TA lead can switch it on |

## 1.5 Roles and permissions (verified)

admin, director, ta_lead, ta, ta_support, ops, client, viewer. Desk-wide: admin, director,
ta_lead, ops. `client.manage` (clients): admin, director, ta_lead only. `commercial.manage`
(fees, guarantees, Master Sheet): + ops. Access requests: only a `ta` or `ta_support` can ask;
only that opening's TA lead or an admin can approve; approval is the only thing that creates a
seat. Clients: contacts are an address book; a `client` login sees the last four stages only.

## 1.6 What people still do by hand (verified)

- Post on LinkedIn and paste the URL; email TopJobs; compile Talent Pulse.
- Decide every day which positions to carry and in which mode; confirm the five checks.
- Place CVs that did not route; merge duplicates by proof is automatic, but no screen lists
  "possible duplicates" for a person to decide (no merge UI found, 1 Nov).
- Chase candidates by phone when the bot gives up; call drop-outs (voice calls are browser-only).
- Build the Director set and send the EOD; reconcile uncertain sends (lead only).
- Build the client set, which is then **held and never emailed** (still true 1 Nov); email it from Outlook.
- Read Director and client replies when the AI reader is unsure.
- Book interviews over email/WhatsApp; record them on the interview record.
- Change opening status by hand after a placement (placing never marks the opening Placed).
- Reassign openings (team change), approve access requests, edit the Master Sheet.
- Everything on the client side (leads, ESA, feedback chase, invoices, guarantee): outside the system.

## 1.7 Intended workflow vs real behaviour (gaps verified on 1 Nov)

| # | Intended | Actual | Effect on the day |
|---|---|---|---|
| G1 | Reassigning a TA keeps everyone's work mode | Saving the team resets every TA's mode to 100% | A lead's reassignment silently flips colleagues' days |
| G2 | The opening's TA lead can be changed | `taLeadId` set once; no edit UI | Wrong lead gets bells and approvals; access requests fail if the lead left |
| G3 | "Day N of target" counts from assignment | `assignedAt` not set at creation; counts from `createdAt` unless the Master Sheet corrects it | Stale-role alerts fire early or late |
| G4 | Every notification type is sent | 13 types declared; emitters exist for opening_assigned, access requested/approved/rejected, strategy_assigned, candidate_replied, workday_exception, workday_request, scoop_received, reverse_match_ready, candidate_unresponsive, candidate_placed, candidate_placed_elsewhere — but several of those emitters are in test or dead code paths (27 Oct finding: 6 never fire in live paths) | TAs expect bells that never come |
| G5 | Nightly database matching | Never scheduled; only "Run" | Matches go stale |
| G6 | Place closes the loop | Place saves the join date only, then redirects to a page that does not exist | TA lands on "not found"; package and offer letter never recorded |
| G7 | Client set emailed from the system | Held, never emailed | Ops emails it from Outlook; nothing knows the receipt date |
| G8 | A TA is reminded to send the EOD | No cron, no reminder | Missed EODs; the lead finds out next morning |
| G9 | Interview invites and reminders go out | `interviews@` reads invitations in; nothing sends invites or reminders out | Done by hand |
| G10 | Unavailable TA is handled | No leave or availability model (verified: none) | The lead reassigns by hand, with G1's side effect |
| G11 | Priority change reaches the TA | Priority edit writes the field; no bell | TA keeps the old order |
| G12 | Mailbox trouble reaches a lead | `check-mailboxes-read` (30 min) writes a notification when a shared inbox stays unread an hour | Works; but a stalled **poller** is caught only by the healer/watchdog and the mailbox-health panel, not a bell |
| G13 | Duplicates are resolved | Merge on proof is automatic; near-duplicates have no review list | TAs find the same person twice |
| G14 | Candidates missing details are chased until complete | The bot stops after 3 attempts; "Flagged for TA" exists; no single "needs information" list across openings | Each TA checks per opening |
| G15 | Capacity is visible | Lead dashboard shows per-TA openings, in-pipeline, CVs today, sets, alerts, LinkedIn link state; no "hours", no 100%-slot count, no availability | The lead balances by feel |
| G16 | Alerts are owned and escalated | Alerts are computed per request (`sla.ts`), not stored; shown to the TA and the lead; no escalation ladder, no acknowledgement | An ignored alert stays ignored |
| G17 | One intake and one follow-up design | Two intake designs; the old day-3/5/7 follow-up flow still runs for non-TA openings | Duplicate or missed reminders |
| G18 | Ops staff can run the client side | `ops` role cannot create or edit clients; no leads, ESA, invoices or guarantee screens | Everything client-side is outside the system |

---

# Part 2 · The four roles, as working people

## 2.1 TA Operations Director

**Thinks about:** the whole desk: how many openings are open, how old they are against
their targets, how many are waiting on clients, how many placements a month, which clients
pay, which TAs carry the load, and whether the chain from enquiry to invoice leaks.

| Decides | Needs to know | Gets it from today | Gap |
|---|---|---|---|
| Which clients and roles get priority (P1-P5) | Client value, urgency, ESA terms, pipeline age | Master Sheet, Director dashboard (value in progress, placed), Reports presets, the TA lead | No client-side numbers (ESA signed, sets waiting on client, invoices unpaid) |
| Whether capacity is enough | Open roles per TA, 100% slots used, stale roles, hiring plan | Lead dashboard per-TA load, over-target preset | No hours or availability; no forecast |
| Systemic fixes | Where time is lost: unchased ESAs, late client feedback, missed EODs, stuck CVs | Alerts, Feedback desk, mailbox-health panel, the weekly report (manual) | No KPI series (ESA return time, client wait, time to fill) |
| Escalations | Who ignored what for how long | Alerts list (unowned), bells | No acknowledgement or ladder |

Interactions: with the Director (Mr Azeem) on reviews and the weekly report; with Asma on
invoices and placements; with the TA lead on priorities; with the ops lead on clients.

## 2.2 Operations Lead

**Coordinates the day:** every opening's progress, who is on it, what is blocked, which
client is silent, which TA is overloaded, what needs a decision from above.

| Decides | Needs | From | Gap |
|---|---|---|---|
| Daily priorities across openings | Age vs target, stage counts, waiting-on-client flags, interviews today, joinings this week | Openings list buckets (mine/all/unassigned/on hold/placed/closed), alerts, Lead dashboard, Director dashboard | "Waiting on client" is not a field; interviews and joinings are per-candidate, no desk calendar |
| Bottlenecks and resources | Unfiled CVs (`/intake`), stuck uploads, unapproved JDs, unlinked LinkedIn posts, access requests pending | `/intake`, mailbox-health panel, Lead dashboard counts, access-request queue | Several screens; nothing combines them into one "blocked" list |
| What to tell the client side | Set ready, client decision, interview result, placement | Pipeline, interview record, placement | No client-facing channel; told by hand |

## 2.3 TA Lead

**Knows every TA:** who is strong at which roles, who is on how many positions, who is
behind on EODs, who needs help; plans the day's modes; reviews quality; handles escalations.

| Decides | Needs | From | Gap |
|---|---|---|---|
| Who takes which opening and in which mode | Per-TA load, skills, today's 100% count (max 5), carry-overs, yesterday's EOD status | Lead dashboard, openings list, workday reviewers' panel (29 Oct), EOD copies | Skills are in the lead's head; 100% count not shown per TA; no availability |
| Strategy per opening | Strategy Planner (ticks strategies by hand), Today's Checks, Suggestions rounds | Strategy Planner, opening Overview | No automatic plan, no due dates (TA work plan C1) |
| Access and reassignment | Access requests, team seats | Access-request queue, "Change the team" | G1 and G2 |
| Quality | EOD content, prepared CVs, Director feedback, shortlist decisions | EOD copies, Director replies, `/shortlist-decisions` | No per-TA quality score |
| Escalations | Candidate silent after 3 tries, client silent, JD unapproved, stale role | Alerts, bells, the TA | Alerts have no owner or ladder |

## 2.4 TA Executive

**Does the work:** starts the workday, confirms checks, sources, screens, shortlists, chases,
builds the Director set, sends the EOD, records interview feedback, places.

| Task | Needs | Screen | Manual steps (typical) |
|---|---|---|---|
| Start the day | Which openings, which mode, carry-overs, checks | Today's Checks drawer | 10-15 clicks; up to 5 checks per 100% position |
| Process new CVs | Who arrived, score, duplicates, missing details | Pipeline stages, Database CVs, `/intake` for unrouted | 3-6 per candidate |
| Research and verify | LinkedIn profile, employer, level, salary band | Suggestions, Excel Tables, Research tab, extension | 5-10 per profile |
| Follow up | Who replied, who is silent, what is missing | Candidate page, follow-up state, WhatsApp assistant hand-over | 2-4 per candidate; calls by phone |
| Shortlist | Collision lock, set number, Director gate (CV, salary, notice) | Shortlist button, Prepared CV box | 3-5 per candidate |
| EOD | 5+ CVs ready, prepared PDFs, Excel, Cc list | EodComposer | 8-12 clicks; retried by hand if uncertain |
| Interviews, offers, Place | Dates, panel, outcome, package | ClosingPanel, interview actions | 5-8; Place ends on a missing page (G6) |

---

# Part 3 · One realistic working day (Tuesday 4 Nov 2026, Colombo)

**The desk this morning:** 24 open openings; 5 TAs (two senior, two mid, one TA support);
one TA lead; the Director; the ops lead and two ops owners (client side, outside the system
today); Asma (accounts). Three P1 openings (two for one manufacturing client, one for a
logistics client), six P2, the rest P3-P4. One new P1 arrived yesterday evening from the
client side. 180 new CVs arrived overnight (LinkedIn 140, TopJobs email 25, direct uploads 15).

Names below are roles, not people. **System** = what the TA System does by itself; **Hand**
= done outside it or by hand inside it.

## 08:30 · Before the desk starts

| What happens | Director | Ops lead | TA lead | TA | System support / obstruction |
|---|---|---|---|---|---|
| Overnight: 180 CVs routed; 9 unmatched in `/intake`; 3 uploads stuck in extraction | — | sees 9 unfiled in `/intake`, 3 stuck in the mailbox-health panel | — | — | **Support:** routing, extraction, stuck-upload cron, Try-again on failed upload (28 Oct). **Obstruction:** two screens for one problem; no bell for "stuck" |
| Follow-up sweep sent 41 reminders; 12 replies read; 4 flagged for TA; 6 became Unresponsive | — | — | sees 4 flagged + 6 unresponsive only by opening the openings | — | **Obstruction:** no cross-opening "needs a TA" list (G14) |
| Yesterday: one TA (TA-3) never sent the EOD for a P2; another's send got stuck | — | — | finds out from EOD copies / the reviewers' panel | TA-3 must send a missed EOD for 3 Nov (30 Oct feature) | **Support:** missed-EOD send, stuck flag. **Obstruction:** no reminder last evening (G8) |

## 09:00 · Planning the day

| Event | Decision | Who | System |
|---|---|---|---|
| New P1 (logistics, Head of Planning) came in last night from ops by WhatsApp with a one-paragraph brief | Create the opening; assign TA-1 (senior) at 100%; set priority P1 | TA lead | **Hand:** types the client (lead can), title, locations, brief; priority is **not** on the create form (defaults P3), changed in Overview → Edit (two screens). **Obstruction:** `assignedAt` not set (G3); no requirement record; ops's brief retyped |
| TA-2 asks for a day off tomorrow; TA-4 is sick today | Move TA-4's two 100% positions: one to TA-5 (TA support can't take 100%), so to TA-1; the other waits | TA lead | **Obstruction:** no availability model (G10); "Change the team" resets TA-4's and TA-1's modes on both openings (G1); TA-1 is now at 4 positions, 3 at 100% — the lead counts by hand (G15) |
| TA-3 cannot open a P2 opening they were told to help on | Request access → lead approves | TA-3, TA lead | **Support:** access request + bell to the lead + approval creates the seat. **Obstruction:** if that opening's `taLeadId` is the lead who left in October, the request is refused ("no active TA Lead") and an admin must edit the row by migration (G2) |
| Director asks at 09:20: "How many roles are waiting on clients, and which?" | Count by hand from the pipeline (Client Shortlist with no interview) and from ops's WhatsApp group | Ops lead | **Obstruction:** no "waiting on client" state or date (G7, G18) |

## 09:30 · TAs start

| TA | Workday | Checks | System |
|---|---|---|---|
| TA-1 | 100%: new P1 + reassigned P1; Follow-up: two P2 | JD on the new P1 is **not approved** → cannot go 100% until approved; writes it from the retyped brief, approves; LinkedIn post pasted; Suggestions round decided; one Excel profile; research link | **Support:** AI JD draft, scoring starts at approval, checks enforce quality. **Obstruction:** 12-18 clicks before sourcing starts; the brief is thin because the requirement meeting notes live in ops's head |
| TA-2 | 100%: P2; Follow-up: three | fine | — |
| TA-3 | 100%: P2 (the one without yesterday's EOD) + the newly granted P2 | must send the missed EOD first; the stuck send from yesterday is flagged and recovered by the lead | **Support:** flags and recovery exist (30 Oct). **Obstruction:** only the opening's lead or an admin can reconcile |
| TA-5 (support) | reads Excel Tables across positions, prepares L-sheets, reviews position EODs | — | **Support:** TA-support read-across (23 Oct) |

## 10:00-12:30 · Processing CVs, research, screening

| Event | Who | What the system does | What the person does by hand |
|---|---|---|---|
| 140 LinkedIn CVs on 9 openings: scored; 22 above the shortlist bar | TAs | AI score, level ladder, salary/notice read from CVs (29 Oct); AI shortlist on high score | Open each, decide, press Shortlist (collision lock claims) |
| 25 TopJobs CVs arrived at the shared CV mailbox with no alias → `/intake` | Ops lead, TAs | Unmatched held for a lead to place | Lead places 25 by hand; TopJobs source not tagged (G: source partial) |
| 6 duplicates: same person on two openings, two with different emails | TA-2 | Merge on proof (file hash / LinkedIn / unique contact) | Two near-duplicates are not merged; TA notices by name; no review list (G13) |
| 11 shortlisted candidates lack expected salary or notice → Director gate blocks | TAs | Follow-up asks for the missing items; the bot reads replies and keeps promised times (29 Oct) | TA calls the four who are silent after 3 messages (voice is browser-only; most calls on a phone, logged by hand) |
| LinkedIn research on a Head of Planning: 14 profiles from Suggestions round 2; 5 kept | TA-1 | Suggestions accuracy (28 Oct), learning from picks; extension capture | 10 clicks per kept profile across Suggestions → Excel Tables → Add to pipeline |
| A candidate replies "call me after 5" on WhatsApp | TA-2 | Bot keeps the promise; TA can take over the chat (30 Oct) | TA calls at 5 and logs |

## 12:30 · A priority change

The Director decides a P3 for a long-standing client becomes **P1** because the client's
CEO called. The lead edits the tier in Overview → Edit. **Nothing tells the TA** (G11); the
lead messages the TA on WhatsApp. TA-2 moves it to 100% in the drawer; the drawer allows it
(3 of 5). The stale-role alert for that opening recalculates on the next page load.

## 13:30 · Integration failure

`linkedin@` polling stops returning new mail (a Graph token refresh failed). For 40 minutes
no new LinkedIn CVs arrive. **System:** the mailbox-health panel shows the last successful
sync time; `check-mailboxes-read` would raise a bell only if the shared inbox stayed **unread**
for an hour (it is not that case: nothing is arriving). The watchdog cron catches stuck jobs,
not a silent poller. **Hand:** the ops lead notices at 14:10 because a TA asks "why no CVs";
the admin reconnects the mailbox in Settings → Mailboxes.

## 14:00-16:30 · Coordination

| Event | Who | System | Hand |
|---|---|---|---|
| Director reply to yesterday's set (shortlists@): 5 of 7 shortlisted, no reasons | TA-1 | AI reader applies decisions to the exact roster | Ops lead reads the one reply the AI marked unsure |
| Client set for a P2: 5 Director-shortlisted CVs | TA-2, ops owner | Client round created, **held** (G7) | Ops owner emails the PDFs from Outlook, posts in the client WhatsApp group, and writes the date in the client sheet |
| Client replies to last week's set: 2 shortlisted, 3 rejected ("too senior", "salary") | Ops owner, TA-3 | Client reply to shortlists@ moves candidates to Client Shortlist **if** it came by email to that mailbox; a WhatsApp reply in the group does not | Ops owner tells TA-3 on WhatsApp; TA-3 moves the three rejected by hand; reasons typed in notes, not required (T2 pending) |
| Interview request from a client for two candidates, three slots | Ops owner, TA-3 | Interview record can hold time/round/panel; `interviews@` reads invitations in | Slots agreed over 6 messages; TA-3 confirms the candidates by phone; ops owner sends the Teams invite from Outlook; TA-3 records the interview |
| Management request 15:30: the Director wants the weekly active-positions list now, not Monday | Ops lead | Reports page presets, CSV | Built by hand in 25 minutes from Reports + the client sheet |
| Escalation 16:00: a candidate due to join on Thursday says the offer letter never arrived | TA-1, ops owner | Offer record exists; placement has join date only (G6) | TA-1 calls the client's HR; ops owner chases the letter; nothing records it |

## 17:00-18:30 · End of day

| Event | Who | System | Hand |
|---|---|---|---|
| EODs: TA-1 two sets (5 and 6 CVs), TA-2 one, TA-3 one plus the missed one for yesterday | TAs | Composer, prepared PDFs, Excel, Cc list, sent from the TA's mailbox; workday completes on the first final 100% EOD | TA-4 (sick) has no EOD; her carried positions wait; nobody is told |
| TA-2 forgets the Follow-up-only EOD for one P2 | — | No reminder (G8) | Lead finds it tomorrow |
| Feedback after 5 PM: TA-3 phones two interviewed candidates, logs feedback | TA-3, ops owner | Interview feedback per interviewer | Ops owner relays to the client group by hand |
| Lead's review 18:00: which TA sent what, which openings moved, who is stale | TA lead | Lead dashboard, EOD copies, reviewers' panel | 30 minutes across four screens; writes tomorrow's plan in a notebook |
| Ops lead 18:15: updates the master, client and interview sheets | Ops lead | — | 40 minutes of retyping (B3) |

**The day's cost in hand work (estimate from the simulation):** TA lead ~2 h (planning,
reassignment side effects, access, reconciliation, review); ops lead ~2.5 h (intake placing,
sheets, waiting-on-client count, report); each TA 45-75 min (checks, duplicate hunting,
retyping between Suggestions and pipeline, calls logged by hand); ops owners ~3 h (client set
by Outlook, replies relayed, interviews over messages, chasing).

---

# Part 4 · Evaluation of each activity (the ten questions)

For each activity: **1** goal · **2** information needed · **3** where it comes from · **4**
module used · **5** manual actions · **6** decisions · **7** approvals/permissions · **8** if
it goes wrong · **9** repetitive work to remove · **10** how it becomes simpler.

### A. Starting a workday (TA)
1 Work the right positions in the right mode. 2 Assigned openings, carry-overs, yesterday's
EOD state, the five checks. 3 Today's Checks drawer, opening pages. 4 Workday (`ta/workdays`).
5 10-15 clicks; up to 25 for five 100% positions. 6 Which to carry, which mode. 7 Needs a TA
lead on the opening; workday gate. 8 Start refused ("no active TA Lead", check fails) → TA
blocked until the lead acts; no bell to the lead. 9 Re-confirming unchanged checks (JD,
LinkedIn link) daily. 10 Checks that passed yesterday and did not change stay green;
"start as yesterday" one click; refusal creates a task for the lead.

### B. Creating an opening from a client requirement (TA lead)
1 Open the position with the full brief. 2 Client, title, locations, salary, level, brief,
priority, who takes it. 3 Ops's message, the lead's call notes. 4 `/openings/new` + Overview
Edit. 5 ~20 actions on two screens; brief retyped. 6 TA, mode, priority. 7 `opening.create`;
lead to assign. 8 Priority stays P3; `assignedAt` empty; brief thin → JD weak → scoring weak.
9 Retyping the requirement. 10 **The Ops system creates the opening from the requirement**
(CP-04): client, brief (with the meeting recording), locations, headcount, priority,
`requirementReceivedAt`, `assignedAt` set by the API (J8).

### C. Reassigning when a TA is unavailable (TA lead)
1 Keep positions moving. 2 Who is free, their load and 100% count, skills. 3 Lead dashboard,
memory. 4 Change the team. 5 5-8 per opening, ×N openings. 6 Who, which mode, what to pause.
7 `opening.manage`. 8 Modes reset (G1); the sick TA's carried items vanish from view; EODs
missing with no owner. 9 Repeating the same reassignment per opening. 10 An **availability
record** (leave, sick, half-day) + a **reassign action** that keeps modes and moves carry-overs
(TA fix T6 + new item T20 in Part 5).

### D. Access to an opening (TA)
1 Work on a colleague's opening. 2 Which opening, why. 3 Openings list. 4 Access requests.
5 3 (request) + 2 (approve). 6 Lead: approve/reject with reason. 7 Only the opening's TA lead
or admin. 8 Opening with a departed lead → refused; no path but a migration (G2). 9 None.
10 Editable TA lead (T6); an SLA bell to the lead if a request waits > 2 h.

### E. Processing new CVs (TA)
1 Find the good ones fast. 2 Score, level, salary, notice, duplicates, source. 3 Pipeline,
Database CVs, candidate page. 4 CV extraction + scoring. 5 3-6 per candidate. 6 Shortlist or
not. 7 Collision lock. 8 Extraction fails → alert and Try again; duplicate not merged → two
records. 9 Opening each CV to see what the score already knows. 10 Score reasons in the list
row; a **possible-duplicates review list** (T21); source always known (J4).

### F. Unrouted and TopJobs CVs (ops lead)
1 Get every CV onto its opening. 2 Which opening each belongs to. 3 Subject, body, sender.
4 `/intake`. 5 2-3 per CV × 25. 6 Which opening. 7 `intake.handle`. 8 Placed wrong → wrong
scoring. 9 Placing CVs that an alias could have routed. 10 **Every ad channel gets its own
routing address** (J4, CP-06); `/intake` shrinks to true strays.

### G. Research and verification (TA)
1 Confirm the profile is right for the level. 2 LinkedIn, employer, title, years, salary band.
3 Suggestions, Excel Tables, Research tab, extension. 4 Headhunting rail. 5 5-10 per kept
profile. 6 Keep or drop; add to pipeline. 7 `opening.sourcing`. 8 Wrong level → Director
rejects. 9 Moving one profile through three screens. 10 "Keep → pipeline" in one action;
the research chatbot (TA work plan C2) later.

### H. Following up candidates (TA + bot)
1 Complete the details, keep momentum. 2 Who replied, what is missing, promised times.
3 Candidate page, follow-up state. 4 Follow-up engine, WhatsApp assistant. 5 2-4 per silent
candidate; calls by phone. 6 Call now, wait, drop. 7 `opening.act`. 8 Bot gives up after 3;
no cross-opening list (G14); old day-3/5/7 flow still runs elsewhere (G17). 9 Checking each
opening for "flagged for TA". 10 A desk-wide **"needs a person"** list (T22); T4 retires the
old flow; call tasks logged once (Ops's call-log pattern, F4).

### I. Shortlisting and the Director gate
1 Put complete candidates in front of the Director. 2 CV, expected salary, notice, set
number. 3 Candidate page. 4 Pipeline. 5 3-5. 6 Shortlist; set. 7 Collision lock; details gate.
8 Blocked candidate waits; TA chases. 9 Typing salary/notice the CV already states (now read
from CVs, 29 Oct). 10 Gate shows exactly what is missing and offers "ask by WhatsApp" in one click.

### J. Priority change (Director → TA lead → TA)
1 Make the desk work the urgent role first. 2 New tier, why. 3 The Director's call. 4 Overview
Edit. 5 4 + a WhatsApp. 6 Mode change. 7 `opening.manage`. 8 TA never told (G11). 9 Telling
each TA by hand. 10 Priority change raises a bell to the seats (T23) and, through the events
list, reaches Ops (CP-05).

### K. Integration failure (ops lead / admin)
1 Keep CVs flowing. 2 Which mailbox, since when, why. 3 Mailbox-health panel, logs. 4 Settings
→ Mailboxes. 5 2-4 to reconnect; 0 to notice. 6 Reconnect, wait, call the admin. 7 admin.
8 40 minutes of silence before anyone notices. 9 Looking at the panel "just in case".
10 **Stall alert** (no successful poll for 15 min → bell to admin and lead): the same rule
the Ops mail reader has (P1 18); also for the WhatsApp webhook and the CV queue.

### L. Director review reply
1 Apply the Director's decisions. 2 The reply, the roster. 3 shortlists@. 4 AI reader.
5 0-2 (unsure cases). 6 Interpret an ambiguous reply. 7 lead/admin/ops via recorded reply.
8 Partly readable → nobody moved; lead reconciles. 9 None. 10 Already good; the "unsure"
case becomes a task with the reply quoted.

### M. Client set and client feedback (ops owner + TA)
1 Get the set to the client and the answer back to the TA. 2 The set, prepared CVs, client
contacts, receipt date, reply. 3 Client round (held), Outlook, WhatsApp group. 4 Review
rounds; nothing for sending. 5 15-25 (export PDFs, email, post, sheet) + relaying replies.
6 What to tell the TA; reasons. 7 `decide.client` for the recorded reply. 8 Set never logged
as sent; reply in a group is invisible to the system; reasons lost. 9 Everything here.
10 **The Ops system sends the set, counts the 7 days, chases feedback, reads the reply and
writes the decision to TA with the reason** (CP-09 to CP-12).

### N. Interview scheduling (ops owner + TA)
1 Book the interview and get everyone there. 2 Client slots, candidate availability, panel,
link. 3 Email/WhatsApp threads. 4 Interview record (after the fact). 5 10-20 messages;
5-8 to record. 6 Who schedules; which slot; back-up. 7 `opening.act`. 8 Cancellation learned
late; no reminder; no-show. 9 Chasing slots by message. 10 **Ops slot loop + Teams invite +
day-before reminders**, written to TA's record (CP-15, CP-16).

### O. Management request: weekly active-positions list
1 Answer the Director now. 2 Open roles, stage counts, days in, waiting on client, interviews
this week, placements. 3 Reports presets + the client sheet. 4 Reports. 5 ~25 minutes.
6 Which columns. 7 `report.read`. 8 Numbers from two sources disagree. 9 Rebuilding the same
report. 10 Built by the system every Monday from TA + Ops data and on demand (CP-24, P7 9).

### P. Escalation: offer letter never reached the candidate
1 Secure the joining. 2 Who has the letter, package, date. 3 Phone calls. 4 Offer/placement
(join date only). 5 Several calls; nothing recorded. 6 Chase the client; warn the Director.
7 — 8 Candidate accepts elsewhere; nobody knew. 9 Asking the client twice. 10 Place requires
the letter (T1); the Ops system asks the client for package, date, address and letter right
after acceptance (K2) and tracks the joining (CP-19, CP-20).

### Q. End-of-day email
1 Put today's set in front of the Director. 2 Ready candidates, prepared PDFs, Cc list.
3 Composer. 4 EOD. 5 8-12. 6 Final or activity-only. 7 recruiter seat; one original per day.
8 Stuck send (now flagged); missed EOD (no reminder); sick TA's day silent. 9 Re-sending
uncertain ones by hand. 10 A **17:30 reminder bell** and a lead digest of EODs not sent
(T24); the sick TA's positions show "no EOD expected" when an availability record exists.

### R. The lead's evening review
1 Know where every TA and opening stands; plan tomorrow. 2 EODs sent, sets closed, stale
roles, unapproved JDs, access requests, flagged candidates, tomorrow's 100% plan. 3 Four
screens. 4 Lead dashboard, EOD copies, reviewers' panel, alerts. 5 30 minutes. 6 Tomorrow's
modes per TA. 7 ta_lead. 8 Something missed on one screen. 9 Collecting from four places.
10 One **lead digest** (T25): per TA: EOD state, positions and modes, flagged candidates,
tomorrow's plan suggestion; per opening: stage movement, waiting-on-client days (from Ops).

---

# Part 5 · The final plan

The simulation shows two kinds of loss: **the client side has no system** (sets, feedback,
interviews, placements, money, guarantee run on Outlook, WhatsApp and sheets), and **the TA
side has a few sharp edges** that cost the lead and the TAs an hour or two a day (reassignment
side effects, no availability, no reminders, no cross-opening lists, no stall alerts, no
priority bells). The plan therefore has two tracks that run in parallel and meet at the
connection points.

## 5.1 Track A · TA System improvements exposed by the simulation

The TA work plan already carries ten team-lead tasks and seven code problems. These are the
**additional** items the simulation surfaces, numbered on from the TA changes in
[15](15-BUILD-PLAN.md) Part E5 (T1-T19). Each is small, separate, and released through TA's
own pipeline.

| # | Change | Fixes | Size |
|---|---|---|---|
| T20 | **Availability record** per TA (leave, sick, half-day, from-to) and a **reassign** action that moves seats and carry-overs while keeping every mode; the workday reviewers' panel shows "away" | Part 3 09:00; G1, G10 | M |
| T21 | **Possible-duplicates review list**: near-matches that proof-merge could not decide, with "same person / different" buttons | 10:00; G13 | S |
| T22 | **Desk-wide "needs a person" list**: candidates flagged for a TA, unresponsive after 3 tries, blocked at the Director gate, across all a TA's openings; one line per candidate with the missing item | 10:00, H | S |
| T23 | **Bells on priority change and on opening reassignment** to every seat; the events list carries them to Ops | 12:30; G11 | S |
| T24 | **EOD reminder at 17:30** to each TA with an unsent final EOD on a 100% position, and a lead digest at 18:30 of EODs not sent; suppressed when an availability record says away | 17:00; G8 | S |
| T25 | **Lead digest** (one screen, 18:00): per TA the EOD state, positions and modes, flagged candidates, tomorrow's suggested modes; per opening the stage movement and, from Ops, days waiting on the client | R; G15 | M |
| T26 | **Stall alerts** for pollers and queues: no successful poll of a mailbox for 15 min, webhook silent for 30 min, CV queue not draining for 20 min → bell to admin and TA lead, plus the mailbox-health panel | 13:30; G12 | S |
| T27 | **Alert ownership**: each computed alert gets an owner (seat) and an "acknowledged" mark; unacknowledged after 24 h → the TA lead; after 48 h → the Director | G16 | M |
| T28 | **Priority on the create form** and `assignedAt` on assignment (also set by the Ops API) | B; G3 | S |
| T29 | **"Start as yesterday"** in Today's Checks; checks that passed and did not change stay green | A | S |
| T30 | **Gate helper**: the Director gate names the missing item and offers "ask by WhatsApp" in one click | I | S |

Already in the TA work plan and the Ops plan: T1-T19 (Place fields and page, reasons, replace
first, follow-up escalation and the old flow, minimum 5, team save and TA lead, the Ops key,
reads, writes, events, readers skipping Ops mail, the system actor, bell type, Clerk satellite,
prepared-CV endpoint).

**Order on the TA side:** T26, T24, T23 (small, immediate relief) → T20 → T22, T21 → T25,
T27 → T28-T30, interleaved with T7-T19 as the Ops phases need them.

## 5.2 Track B · The Ops system (the client side)

Built as planned in [15](15-BUILD-PLAN.md): a separate backend and database on the same
server, eight phases, every client-side step from lead to guarantee end, every clock, every
message drafted and approved, every traditional step recorded in one line. The simulation
confirms the order: foundation → onboarding → hand-over → client side of the search →
interviews → placement and money → guarantee and close → hardening and pilot. Nothing in the
simulation argues for a different order; two things argue for speed: the client set (M)
and interviews (N) are where the ops owners lose most of their day.

## 5.3 Technologies, final

| Need | Technology | Why this one | Used by |
|---|---|---|---|
| Ops backend, database, jobs | Self-hosted Convex, database `convex_ops` in the shared Postgres server, own container on the VPS | Same stack as TA; one backup; nothing leaves the box | Ops |
| Ops web app | Next.js 16, Clerk satellite domain of TA's instance | One login for staff; UI team's stack | Ops |
| TA ↔ Ops link | TA's HTTP API (`/integrations/v1`, Ops key, idempotent writes) + `contractEvents` read by a one-minute cron; calls over the Docker network | Safe, versioned, no shared database access | both |
| Email | Microsoft Graph: send and delta-read on `ops@` (application permission limited by an access policy); subject reference `[C141-OPS-…]` | Already used by TA; replies match by reference | Ops |
| WhatsApp | Meta WhatsApp Cloud API on a new Ops number; approved templates outside 24 h; webhook in; groups stay manual | Already used by TA; the API cannot post to groups | Ops |
| Meetings | Microsoft Graph calendar + Teams online meeting from `ops@` (admin consent); until consent: a pasted link; Zoom only if Teams is refused | Client interviewers get real invites; link saved on TA's record | Ops → TA |
| Calls | Call tasks with the number and a one-line outcome; `tel:` links; no AI calls, no telephony | Decided 1 Nov; zero cost; clients and referees stay human | Ops, TA |
| Documents | DOCX templates filled by the backend → PDF by LibreOffice (in the Ops image) | Same as TA's prepared CVs | Ops |
| Files | Cloudflare R2 bucket `c141-ops`, signed links | Same as TA | Ops |
| AI | Claude first, DeepSeek second (TA's routing); proposals only | Reads replies, drafts chases, flags industry; a person confirms | Ops |
| Website leads | Webhook from the form with a shared secret | Decided 1 Nov | Ops |
| Working days | One calendar helper (Colombo, holidays in Settings) shared as a package by both repos | Same answer on both sides | both |
| Monitoring | Health queries + bells (stall alerts both sides), Postgres nightly dump incl. `convex_ops` | T26, P1 21, P8 7 | both |

## 5.4 The connection points, final (what, which way, trigger, technology)

Each row is one place where the two systems meet. **Direction:** O→T = Ops calls TA's API;
T→O = TA writes an event Ops reads; O←T = Ops reads TA. **Trigger** says when it happens in
the day. The full data of each point is in [reference/OPS-TA-CONNECTIONS.md](reference/OPS-TA-CONNECTIONS.md).

| CP | Meets at | Direction | Trigger | Endpoint / event | Phase |
|---|---|---|---|---|---|
| 01 | People and roles | O←T | lead tagging, invites | `GET people` | P1 |
| 02 | Client record and ops owner | O→T | lead linked / client created; owner moved | `POST clients` (upsert, `opsOwnerId`) | P2 |
| 03 | ESA status and fee terms | O→T | ESA sent / signed / declined | `POST clients/{id}/esa` | P2 |
| 04 | Requirement → opening, primary TA, 100% day | O→T; T→O | "Create opening in TA" | `POST openings` (brief + recording, `opsOwnerId`, `requirementReceivedAt`) → `opening.created`; TA lead assigns in TA | P3 |
| 05 | Opening state Ops watches | T→O; O←T | JD approved, post live/closed, priority/team change, status | events `opening.*`, `jobpost.*`; `GET openings/{id}` | P3 |
| 06 | Ad channels and their CVs | O→T; O←T | TopJobs/Talent Pulse requested, live, closed | `POST openings/{id}/posts` (routing alias), `POST openings/{id}/ad-channel`; `cvCountToday` | P3 |
| 07 | Pipeline counts and stage moves | T→O; O←T | every stage move | `application.stage_changed` (from `pipelineEvents`); `GET openings/{id}/pipeline` | P4 |
| 08 | Director set sent and decided | T→O | EOD sent; Director reply read | `director_round.sent / decided` | P4 |
| 09 | Client set: built by TA, sent by Ops | T→O; O←T; O→T | client round created; owner approves | `client_set.ready` → `GET client-sets/{n}` + prepared CVs → `POST client-sets/{id}/sent` | P4 |
| 10 | Client decisions with reasons | O→T | owner confirms the reply | `POST applications/{id}/client-decision` (TA moves stage, records review, sends the notice) | P4 |
| 11 | CV ownership claim (7 working days) | O→T | claim recorded within the window | `POST applications/{id}/client-owned` | P4 |
| 12 | Client silence → hold / lift | O→T | 14-day clock; client returns | `POST openings/{id}/status on_hold / open` | P4 |
| 13 | Unreported hire (3 months) | O←T | timer; stage history read | `GET openings/{id}/pipeline` | P4 |
| 14 | Pipeline depth → TA mode | O←T; O→T | after every decision | `GET pipeline` → `POST openings/{id}/working-stage add_on` / `status on_hold` ("five shortlisted") | P4 |
| 15 | Interviews: client side by Ops, candidate side by TA | O→T; T→O | slots agreed; reschedule; outcome | `POST interviews`, `POST interviews/{id}` (`teamsLink`); events `interview.*` | P5 |
| 16 | Interview feedback and round decision | T→O; O→T | TA logs feedback; client decides | `interview.feedback`; `POST interviews/{id}` client-decision | P5 |
| 17 | Reference check (client asks) | O→T; T→O | request; TA reports | `POST applications/{id}/reference-request`; `reference.reported` | P5 |
| 18 | Offer made / accepted / declined | T→O | TA's offer panel | `offer.*` | P6 |
| 19 | Placement: Place, package, DOJ, offer letter, Asma told the same day | T→O; O→T | TA presses Place; client sends details (K2) | `placement.created`; `POST placements/{id}` details / doj / cancel | P6 |
| 20 | Joining day, no-show, guarantee start | T→O; O→T | 09:00 task; TA confirms | `placement.joined / no_show`; `POST openings/{id}/status filled` | P6, P7 |
| 21 | Candidate rejection notices | T→O | TA sends the template | `candidate.rejection_notice_sent` | P4 |
| 22 | Guarantee events → opening reopened / closed | O→T; T→O | leaver; replacement placed | `POST placements/{id}` left; `POST openings/{id}/status open` (replacement); `placement.created` with `isReplacementOf` | P7 |
| 23 | Close: posts, opening, lead | O→T | close checklist | `POST openings/{id}/status closed` (TA closes posts) | P7 |
| 24 | Weekly report to Mr Azeem | O←T | Monday 08:00 | `GET reports/active-positions` | P7 |
| 25 | Bells across the line | O→T | every hand-over | `POST notify` (type `ops_notice`) | P1 |
| 26 | Files: CVs, offer letters | O←T | set sending; placement | `GET applications/{id}/prepared-cv` (Next app), `GET cv/{id}` | P4, P6 |

**Rules that hold for every point:** TA keeps candidates, openings, interviews, offers and
placements; Ops keeps leads, ESA, client messages, money and guarantee; each side stores
only the other's IDs; every write is idempotent and runs as the Ops system actor under TA's
own rules; every TA change is an event in the same transaction; the two switches
(`OPS_TA_WRITES_ENABLED`, `OPS_TA_READS_ENABLED`) can pause the link without stopping either
system.

## 5.5 The same Tuesday, after the plan

| Moment | Before (Part 3) | After |
|---|---|---|
| 08:30 | Three screens to find stuck CVs; no bell for a silent poller | One bell to the admin at the 15-minute stall (T26); `/intake` holds only true strays (CP-06) |
| 09:00 new P1 | Opening retyped from a WhatsApp brief; priority on a second screen; `assignedAt` empty | The ops owner presses "Create opening in TA" after the requirement meeting; the brief and its recording arrive; priority and dates set (CP-04, K3, T28) |
| 09:00 sick TA | Reassignment resets modes; carried items vanish | Availability record → reassign keeps modes and carry-overs; EOD reminder suppressed (T20, T24) |
| 09:20 "waiting on clients?" | Counted by hand | The Ops inbox and the lead digest show "waiting on client, N days" per position (CP-09 to CP-12, T25) |
| 10:00 TopJobs CVs | 25 placed by hand | Routed by the post's own address with the source known (CP-06) |
| 10:00 duplicates | Found by name | Review list with two buttons (T21) |
| 10:00 silent candidates | Per-opening hunt | One "needs a person" list (T22) |
| 12:30 priority | WhatsApp to the TA | Bell to every seat; Ops sees it (T23, CP-05) |
| 13:30 mailbox | 40 minutes unnoticed | Stall bell at 15 min (T26) |
| 14:00 client set | Outlook, group post, sheet | Approved in the Ops inbox; emailed with the reference; receipt date and clocks start; TA told (CP-09) |
| 14:30 client reply | Relayed on WhatsApp; reasons in notes | Read by the Ops reader, confirmed per candidate, written to TA with reasons (CP-10) |
| 15:00 interviews | Six messages, Outlook invite, record typed | Slot loop, Teams invite, TA bell, reminders (CP-15) |
| 15:30 report now | 25 minutes by hand | One click on the weekly report, built from both systems (CP-24) |
| 16:00 offer letter | Calls; nothing recorded | Ops asked the client for the letter at acceptance; Place requires it (K2, T1) |
| 17:30 EOD | Forgotten EOD found tomorrow | Reminder at 17:30; lead digest at 18:30 (T24) |
| 18:00 review | Four screens, a notebook | The lead digest (T25) |
| 18:15 sheets | 40 minutes | No sheets (D4) |

Estimated hand work saved per day: TA lead ~1.5 h, ops lead ~2 h, each TA ~30-45 min, each
ops owner ~2.5 h. The baseline measurement (K6/P1 step 0) turns this estimate into numbers.

## 5.6 Sequencing both tracks

| Weeks | Track A (TA, Binath) | Track B (Ops, Sanjeev) | Meets at |
|---|---|---|---|
| 1 | T26, T24, T23, T7, T8, T11a, T16-T18 | P1 foundation; baseline; team walkthrough (K6) | events and reads work against local TA |
| 2 | T12 fields, T9 ESA + opening status, T10 for clients/ESA/openings | P2 onboarding, P3 hand-over | CP-02, 03, 04, 05, 06 |
| 3 | T20, T21, T22, T5, T2, T19 | P4 client side | CP-07 to 14, 21, 26 |
| 4 | T9 interviews, T10 interviews, T15 | P5 interviews | CP-15 to 17 |
| 5 | T1, T9 placements, T10 placements, T3 | P6 placement to money | CP-18 to 20 |
| 6 | T25, T27, T28-T30, T4, T6 | P7 guarantee, reports, close | CP-22 to 24 |
| 7-8 | T13 (`opsForTa` on the opening page) | P8 hardening, staging, pilot | all, on staging; then one pilot client |

Each week ends with both repositories green (`npm test`, both `tsc`) and the week's
connection points demonstrated on the laptop against a local TA; nothing reaches live
without the owner's go-ahead and the release pipeline.

---

_End. This document changes nothing in either system; it is the research behind the plan._
