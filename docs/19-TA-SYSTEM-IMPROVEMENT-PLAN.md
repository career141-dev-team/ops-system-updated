# 19 · TA System: deep internal analysis, operational simulation and improvement plan

_2 Nov 2026. Research and planning only: nothing was built, no code or data was changed.
Source of truth: the TA System repository on `main` at `9deff7ef` (read in a read-only
checkout), its twelve feature skills, the owner's planning board, and seven targeted code
audits run on 2 Nov (permissions, workday, alerts and dashboards, EOD and sets, follow-up,
intake and integration health, openings and candidates). File references are to that
checkout. Where this document and [18](18-OPERATIONS-SIMULATION.md) disagree, this one is
right; the corrections are listed in section 13._

**Tags used throughout.** **[V]** verified in the code on 2 Nov · **[O]** observed problem
(verified behaviour that costs people time or hides information) · **[A]** assumption or
estimate (not provable from the repository; live environment values, minutes of effort) ·
**[R]** recommendation. Nothing marked [R] changes the established business workflow: every
recommendation keeps the stages, the sets, the Director review, the workday, the approvals
and the ownership rules exactly as they are, and removes effort around them.

---

## 1. Existing system understanding

### 1.1 What it is [V]

A recruiting desk for Career 141, live since 21 Sep 2026. A Next.js 16 app (`ta-prod-app`)
with Clerk sign-in; pages load an in-memory copy of the data (`primeStore`) and server
actions write the difference back through one backend call, `ta/commit:apply`, which the app
has "already authorised" (`convex/ta/commit.ts:50-51`). A self-hosted Convex backend holds
116 tables and 19 cron jobs. Stores: Postgres (data), Qdrant (candidate vectors), Cloudflare
R2 (CV files). Integrations: Microsoft Graph (mailboxes, send and read), Meta WhatsApp Cloud
API (main line plus per-TA numbers since 30 Oct), DeepSeek via OpenRouter, Claude by
subscription (`claude -p`), NVIDIA, OpenAI embeddings, SearXNG, LiveKit (browser calls only),
a partner read-only API, a Chrome tracking extension (`/ta-track`, 27 Oct), a mobile API.

### 1.2 Modules and what each one does [V]

| Module | Does | Where |
|---|---|---|
| Openings | one `jobs` row per client role; team seats; JD and approval; job posts; status; priority; Bin | `convex/ta/openings.ts`, `src/lib/openings/*`, `src/app/openings/*` |
| Intake | mailbox pollers and mail intake file CVs onto openings; unmatched CVs wait for a person | `convex/communications/emailAgent.ts`, `convex/mailIntake/*`, `src/app/intake/*` |
| CV reading | extraction queue (3 slots, 2 background, urgent for HH/Scoop), OCR, dedup, healer | `convex/cvs/*`, `convex/lib/extractionQueue.ts`, `convex/lib/sameCandidate.ts` |
| Pipeline | stages, the claim (collision lock), the Director-review gate, state machine | `convex/pipeline/pipelineStateMachine.ts`, `convex/ta/applications.ts`, `convex/ta/stages.ts` |
| Follow-up | 7-minute sweep, Meta templates, the WhatsApp assistant, take-over, extraction of details | `convex/crons.ts`, `convex/communications/*`, `convex/ta/followUp.ts` |
| Workday | Today's Checks, modes, carry, exceptions, automatic completion, reviewers' panel | `convex/ta/workdays.ts`, `src/components/Workday.tsx`, `src/lib/workdayRequirements.ts` |
| EOD / midday | the Director set email, prepared CVs, Excel, receipts, reconcile, missed days | `convex/ta/dailyEmails.ts`, `convex/ta/eodMail.ts`, `src/components/EodComposer.tsx` |
| Director and client replies | `shortlists@` reader, parser, AI reader, `/shortlist-decisions` | `convex/mailIntake/decisions.ts`, `convex/lib/shortlistReply.ts`, `convex/lib/directorReplyAi.ts` |
| Interviews, offers, placements | records and stage moves; nothing is sent | `src/lib/candidates/interviewWrites.ts`, `closingWrites.ts`, `src/components/ClosingPanel.tsx` |
| Headhunting | Research, Suggestions (learning from picks), Excel Tables L-sheets, Referee Calls, extension | `src/app/openings/[id]/hh/*`, `linkVault` |
| Database search | natural, boolean and meaning search; filters; chat rail; "Add to opening" | `src/app/actions.ts:2829-3056` |
| Alerts and bells | computed alerts; stored notifications; dashboards per role | `src/lib/sla.ts`, `convex/ta/notifications.ts`, `src/components/dash/*` |
| Reports | Master Sheet (45 columns, 6 typed), presets, CSV, saved reports | `src/lib/reportSpec.ts`, `src/lib/reporting.ts`, `src/app/reports/*` |
| People and settings | roles (admin only), mailboxes (admin only), WhatsApp numbers (admin only), follow-up demo | `src/app/people/*`, `src/app/settings/*` |
| TA Track | browser time per domain per TA, 30 days, admin and TA lead | `src/app/ta-track/*`, `src/lib/taTracking.ts` |

### 1.3 How the records connect [V]

```
clients ──< jobs (opening) ──< jobPosts (adverts; routing keys) ──< applications (candidate × opening)
                 │                                                      │  currentStage, ownerTaId, setNumber,
                 ├──< jobAssignments (seat + workingStage)              │  isAddOn, backupForApplicationId
                 ├──< briefs                                            └──> candidates ──< cvUploads, candidateResumes
                 ├──< reviewRounds (Director / client sets) ──< directorReviews / clientReviews
                 ├──< interviews, offers, placements (per application)
                 ├──< taWorkdays (per TA per day: jobs[], modes, checks) ──< taWorkdayTaskEvents, CheckNotes, Exceptions
                 └──< strategies, linkVault (Excel Tables), researchReports, profileSuggestions
users (role, taRole) ── notifications (bell) · taSettings (per-user keys) · mailboxLog / mailboxCheckpoints · whatsappNumbers
```

Ownership rules that the whole desk runs on [V]: the first TA to shortlist owns the candidate
(`convex/ta/guard.ts:163-170`); a TA's roster for an EOD is only the candidates they own
(`src/lib/eodEligibility.ts:33`); a seat on the opening is what lets a TA see it
(`src/lib/visibility.ts:165-211`); the opening's `taLeadId` is written once at creation and
nothing can change it afterwards (`src/lib/openings/create.ts:71`; no writer found by grep).

### 1.4 Crons: what runs by itself [V]

| Cron | Every | Does | Switch |
|---|---|---|---|
| evaluate-follow-up | 7 min | 60 applications per run; day-0 template and email on entry; 24 h reminders; 3 attempts then Unresponsive; never 20:00-08:00 Colombo | `appSettings.autopilotEnabled`, channel toggles |
| poll-linkedin / cv / jobs-sender inbox | 13 / 11 / 3 min | reads the mailbox, routes CVs to posts, files unmatched to the database | `C141_DISABLE_CRONS` swaps the whole registry |
| poll-per-job-email-inboxes | 17 min | per-job inboxes | same |
| check-mailboxes-read | 30 min | bell `mailbox_stalled` to every admin and TA lead when a watched mailbox has not been fully read for 60 min | same |
| ta-mail-intake-sync / -process | 5 / 1 min | the newer intake: `shortlists@`, `interviews@` and enabled mailboxes; 3 messages per run | only with `C141_MAIL_INTAKE=on` [A: live value unknown] |
| process-unextracted-cv-queue · recover-stuck-uploads · bg-healer | 2 / 29 / 31 min | CV reading, stuck → failed after 10 min, healer 5 per tick | registry swap |
| check-sla-breaches | daily 08:00 UTC | bell `sla_breached` to the primary recruiter, once per stage entry | `autopilotEnabled` |
| ta-flag-stuck-sends | 5 min | EOD `sending` older than 15 min → `uncertain` | — |
| renew-graph-subscriptions | daily 03:00 UTC | renews; failures only logged | — |
| update-dashboard-stats · fail-stale-voice · ta-empty-bin · purge EOD copies · purge tracking | 19 min · 23 min · daily · 41 min · 30 min | housekeeping | — |

Nothing reminds a TA to send the EOD, closes a workday, or builds a report on a schedule [V]
(`convex/crons.ts` holds no such job).

### 1.5 Behaviour that depends on live settings nobody can read from the repository [A]

`C141_MAIL_INTAKE` (the `shortlists@`/`interviews@` readers), `C141_TA_INTAKE` (the intake
queue with "Already on file"), `C141_POST_ROUTING` (routing CVs to posts), `C141_SHORTLIST_AUTO_APPLY`
(Director replies applied without a person), `OUTREACH_LIVE` (real recipients), `C141_DISABLE_CRONS`,
`appSettings.autopilotEnabled`, whether any per-TA WhatsApp number is `ready`, whether
`smb_message_echoes` is subscribed at Meta (phone take-over). The plan treats each as
"may be off" and never relies on it.

---

## 2. The actual internal workflow map [V]

Each row is the real rule in the code today, with the exact message a person sees.

### 2.1 A position is opened

| Step | Who may | What happens | Exact rule / message |
|---|---|---|---|
| New opening | everyone except client (`src/lib/auth.ts:255`) | client (required), title (required), country, nationality, gender, work locations, notes or a voice brief, TAs (leads only), auto follow-up tick | "Choose a client and a position." No priority, salary or dates on the form (`src/components/CaptureForm.tsx`) |
| Defaults written | — | `priorityTier` P3; status active; JD `pending_ta_approval`; first job post live; brief; `taLeadId` = the creating lead, else the first `ta_lead` in roster order; `directorId` = first director | `assignedAt` and `requirementReceivedAt` are **not** written (`convex/ta/openings.ts:405-444`) |
| JD | assigned TA, lead, admin | AI drafts; TA edits; Approve starts requirement extraction and scoring of waiting CVs (max 400) | "Add the job description before approving it." Scoring beyond 400 is by hand (`convex/ta/jdApproval.ts:12-26`) |
| Advert | `opening.manage` | a post can go live only with an approved JD; LinkedIn URL pasted by the TA; the "On LinkedIn" pill needs a job or project number in the URL | "This job cannot go live until its JD is approved." |
| Priority, status | `opening.manage` | Overview → Edit the details (P1-P5); StatusMenu (Active / On hold / Placed / Closed-Lost) | no reason asked, nobody notified (`src/lib/openings/writes.ts:56-60`) |
| Team | `opening.manage` | Change the team: any active user, any role; a team needs a recruiter | saving deletes and re-creates every seat **without** `workingStage`, so every member's mode returns to 100% (`src/data/store.ts:2692-2703`); `primaryRecruiterId` never moves |
| Access | a `ta`/`ta_support` without a seat | request → bell to the opening's lead → approve creates a supporting seat at 100% and sets `assignedAt` if empty | "This opening does not have an active TA Lead. Ask an administrator to assign one." (`convex/ta/openingAccess.ts:141-144`) — and no administrator has a screen for it |

### 2.2 Candidates arrive and are read

| Source | Route | Lands | Source tag |
|---|---|---|---|
| LinkedIn mail at `linkedin@` | job number → Recruiter project number → campaign code → exact headline/keyword; partial never (`convex/lib/postRouting.ts:345-416`) | matched → New CVs on that post; unmatched → database only (poller) or "Mailbox CVs that matched no job" on `/intake` for a lead | `linkedin`; poller writes no `campaignLabel` |
| `cv@`, per-job inboxes, per-TA `.jobs@` | same / job pinned | same | `email` / channel |
| WhatsApp document to a number | caption keyword only | `cvUploads` queued, stub candidate from the phone | `whatsapp` |
| TA upload, HH upload, Scoop, ZIP, Workable | direct | the opening, urgent slot for HH/Scoop | as chosen |
| Partner API upload | none | `partnerCvFiles` only, never read | — |

`jobPosts.routingEmailAlias` exists and is written, but **no router reads it** [V] (grep). Reading:
3 concurrent slots, 240 s lock, 2 attempts then `needs_review`, which is never retried
automatically; HH/Scoop uploaders see "Try again"; a mail-sourced failure is told to nobody
(no notification type exists) [V]. Duplicates: the backend merges only on proof (file hash,
LinkedIn, or a unique email/phone with agreeing names, `convex/lib/sameCandidate.ts:31-60`); a
near-duplicate is simply a new candidate; the only review screen is `/intake` "Already on
file", and only when `C141_TA_INTAKE` is on [V].

### 2.3 Screening, shortlist and follow-up

| Step | Rule [V] |
|---|---|
| Score | AI score on JD approval and on arrival; level ladder; salary and notice read from the CV (29 Oct) |
| Shortlist = claim | first TA owns; a colleague sees "Already shortlisted by <name>"; the move into Follow-up claims in the same transaction |
| Automatic follow-up | **off** on a new opening (the "on by default" change was reverted 30 Oct); switched on per opening by admin/director/lead/ops anywhere or a recruiter on it; day 0 = Meta template + the TA's first email; reminders every 24 h; 3 attempts (last gets its 24 h) then **Unresponsive** (= Dropped out); nothing 20:00-08:00 |
| The assistant | answers from the job context, one question at a time; reads "no"; keeps promised times; hands over on opt-out, not interested, wants a human, upset, or an ETA over 72 h, with one bell "A candidate needs you" to the owner; 8 messages per candidate per day then it flags; a TA takes over from the candidate page or by replying from the WhatsApp Business app (needs Meta `message_echoes`, live state unknown) |
| What completes a candidate | CV + expected salary + notice period (+ the opening's own questions); **current salary is not required** by the gate but is still asked in every message and shown as "missing" in the checklists (`convex/ta/stages.ts:119-147` vs `followUpHelper.ts:243`) |
| Email replies | read for details, but **do not set `lastCandidateReplyAt`**, so "they replied" and the 1-day AI-follow-up rule see WhatsApp only |
| Manual follow-up | Send dialog: max 3 attempts, 60 s double-press guard, "All N follow-ups have been sent. Call them, or mark them as dropped out."; Aura call = browser microphone only; call log = `callFeedback`, nothing else |
| Per-TA WhatsApp numbers | sender = opening's number → owner TA's number (only when `ready`) → first assigned TA's → main line; `ready` needs Cloud API, CONNECTED, both templates approved **in that TA's WABA**, app subscribed; connecting is admin-only in Settings |

### 2.4 The workday

| Step | Rule [V] |
|---|---|
| Start | `ta`/`ta_support` only; each position must have the TA on its team and a `taLeadId` ("Ask the lead to assign a TA Lead to this job before starting work."); at most 10 non-carried positions and 5 at 100%; carried positions (own candidates still in follow-up or Director review, pending profile carries, unreviewed CVs on the TA's posts) join automatically as Follow-up; bell `workday_started` to each job's lead |
| Scope gate | once a TA has ever started a day, every recruitment write needs today's day to contain the job: "Add this assigned position to your workday first." / "Start your workday before continuing recruitment work." (`convex/lib/workdayScope.ts`) |
| 100% checks | JD reviewed (per TA, invalidated for everyone by any JD edit), LinkedIn post, Suggestions reviewed, ≥1 own Excel Tables profile, ChatGPT research link confirmed **every day per job**, daily email, midday (only when the policy row exists) |
| Follow-up / Add-on checks | ChatGPT link, daily email, mail problem only; Add-on roster = own `isAddOn` candidates that reached Director review since the last Add-on entry |
| Exceptions | a TA may excuse JD, LinkedIn, Suggestions, Excel, ChatGPT with a reason (≤1,000 chars), today only; bell `workday_exception` to every admin and the job's lead |
| Modes | 100% / Follow-up / Add-on, own mode only (`setWorkingStage` always sends the actor's id); refused while a send is stuck or after a final EOD; the EOD composer's effort field also writes the mode |
| Completion | automatic when every job/location has an accepted original EOD; Finish always throws "Your workday completes automatically when the required EOD email is sent."; no EOD → the day stays open and is closed as **expired** at the TA's next Start, **nobody is told** |
| What the lead sees | reviewers' panel (admin, ta_lead, director; action forms only for admin or the job's lead): today's open days, 20 newest, full checklist on open, activity counts, task history, exceptions, "record a CV review as lead", "reconcile a stuck email" after 5 min; TA Track by domain (admin and ta_lead only) |

### 2.5 The Director set and the EOD

| Step | Rule [V] |
|---|---|
| Sets | numbered per TA per opening (not per location); `SET_SIZE = 5`; a set closes when a past Colombo day holds ≥5 of its rows; today's rows never close it |
| Roster | today's own Director-review candidates not yet in a round; earlier days' candidates reach the Director only through the **Missed** tab (up to 7 days back, no workbook, nothing tells the Director it is late) |
| Send | To `joborders@`; Cc shamra@, asma@, opsteam@, cv@ + the shortlist inbox (default `shortlists@`); from the TA's own mailbox; one prepared-CV PDF per candidate (one failure stops the whole email) + Excel; subject `SET n - CLIENT - TITLE - k CVs`; activity-only allowed when nobody is eligible |
| Blocks | own send stuck/uncertain on this location (any date); original already sent; midday required and none accepted; ChatGPT link + private-window tick (TAs only); Today's Checks blockers; roster ≠ server roster |
| Stuck | `sending` > 15 min → `uncertain` by cron; blocks every later send on that location; only admin or **the job's `taLeadId`** may reconcile, with a written reason, after 5 min; no bell is raised by the flag |
| One original per day | "The end-of-day email has already been sent. You can correct that email; new submissions resume tomorrow." |
| Leads sending | admin/lead/director/ops send with no receipt, no checks, no completion |

### 2.6 Replies and the client round

| Step | Rule [V] |
|---|---|
| Director reply | `shortlists@` read only with `C141_MAIL_INTAKE=on`; trusted senders joborders@, shamra@ and People with role director; strict parser, then the AI reader (must decide everyone, name nobody unknown, be confident); **applied automatically only when clear and `C141_SHORTLIST_AUTO_APPLY=on`**, otherwise `review_required` + bell "Shortlist reply needs review" to the sending TA and the lead; silence is never rejection; a hold is recorded, never moved |
| Who decides by hand | `/shortlist-decisions`: admin, director, ta_lead, ops ("Use this set", "Confirm selected decisions", "Keep for review", "Ignore" with reason); a TA can paste a reply on the EOD page |
| Client round | created only by "Record that it went to the client" on the EOD composer: roster = Director Shortlist, `dispatch: "held"`, "Nothing was emailed from here.", the page's To defaults to the **Director's** email; a client "yes" by email to `shortlists@` moves director_shortlist → client_review, "no" → rejected |
| WhatsApp replies | from the Director or a client: logged as a candidate communication at most; **nothing moves** |
| Interviews | `interviews@`: an invitation sent by career141 with subject `CLIENT > ROLE > CANDIDATE` moves the stage to Interview; no `interviews` row is created by mail; the interview record is typed by a person (date and time required); nothing is sent to the candidate or the client |
| Offer and Place | offer: salary > 0, from Client Shortlist, one pending; Place: join date only, fee % and guarantee days copied from the ESA record or defaults, then `redirect("/placements/<id>")` to a page that does not exist; the opening stays Active; `candidate_placed` bell is declared and never sent |

### 2.7 Who is told what [V]

Bells that fire on a live path: `opening_assigned` (new seat), `opening_access_requested /
approved / rejected`, `strategy_assigned` (both directions), `candidate_replied` (reply needs
review; assistant hand-over; voice note), `mailbox_stalled` (admins + leads), `sla_breached`
(primary recruiter, daily), `workday_started / finished / exception / decision`. Declared and
**never** sent: `candidate_placed`, `candidate_placed_elsewhere`, `reverse_match_ready`,
`candidate_unresponsive`, `scoop_received`, `workday_request`.

Alerts (`src/lib/sla.ts`) are computed on each request, only for open openings, assigned to
TAs and the lead (the Director and Ops roles essentially never own one), read-state kept per
user by a **fixed id**, so a condition that recurs stays "read"; three kinds escalate (chase
doubling, interview under 4 h, follow-up overdue), none can be snoozed or reassigned.

---

## 3. Role-by-role operational simulation

### 3.1 The cast and their real access [V]

| Person (role) | Can | Cannot |
|---|---|---|
| **Director** (`director`) | everything desk-wide: openings, clients, decisions, Master Sheet, workday review (read, no action forms), Strategy Planner, reports | reconcile a stuck EOD (`dailyEmails.ts:256`), manage people, see TA Track, see Settings |
| **Ops lead** (`ops`) | see every opening, `commercial.manage` (Master Sheet, fees), bin openings, sourcing, intake, `/shortlist-decisions`, send an EOD on any opening | **create or edit clients** (`auth.ts:158`), record Director/client decisions except through a recorded reply, reconcile EOD, review workdays (`workdays.ts:1178` excludes ops), assign strategies |
| **TA lead** (`ta_lead`) | manage any opening (web), clients, strategies, access approvals **only for openings where they are the fixed `taLeadId`**, reconcile and review those openings' workdays, Master Sheet, TA Track, `/shortlist-decisions` | change an opening's TA lead (no UI), manage people, Settings → Mailboxes (admin only), connect WhatsApp numbers |
| **Admin** | everything above plus People, Settings, mailboxes, WhatsApp numbers, approve any access request | — |
| **TA-1, TA-2, TA-3** (`ta`) | their seats: act, source, shortlist (claim), follow up, EOD, interviews/offers/Place on own candidates, request access, excuse a check | see an opening without a seat, act on a colleague's claimed candidate, change status/priority on an opening where they are not a recruiter, send before starting a workday |
| **TA-5** (`ta_support`) | a TA's working access + read every TA's Excel Tables rows across positions, review position EODs | act on another TA's rows |

### 3.2 The desk on Tuesday 4 Nov [A for the numbers, V for every rule]

24 open openings (3 P1, 6 P2, rest P3-P4), 5 TAs, 180 overnight CVs (140 LinkedIn, 25
TopJobs by email to `cv@`, 15 uploads), one new P1 that the ops lead received by WhatsApp
last night.

### 3.3 08:30 · What happened overnight (nobody is in yet)

| System did [V] | Who will know, and how |
|---|---|
| 140 LinkedIn CVs routed by job number / headline; 9 with partial headlines went to the database only (poller) or to `/intake` (if `C141_TA_INTAKE` is on) | a lead, only by opening `/intake` or noticing a candidate "in the database" |
| 25 TopJobs CVs at `cv@`: no LinkedIn number, no campaign code in the subject → database only | nobody is told; the TA notices them only by searching |
| 3 uploads failed reading twice → `needs_review` | the HH uploader sees "Try again"; mail-sourced ones are told to nobody |
| The 7-minute sweep sent 41 reminders between 08:00 and 08:30 (none overnight); 12 replies read; 4 hand-overs → 4 bells "A candidate needs you"; 6 reached the 3rd attempt → Unresponsive | the 4 bells chime on the owners' screens; the 6 drop-outs appear only in each opening's Dropped out stage |
| TA-3 never sent yesterday's EOD on a P2; the day is still "active"; TA-2's send sat in `sending` and was flagged `uncertain` at 18:20 | TA-3: the Missed tab appears when they open the composer; the lead: no bell for either; the `uncertain` blocks TA-2's sends on that opening until the job's lead reconciles |
| Director's reply to Monday's set arrived at 07:50 at `shortlists@`; the parser found "the rest can wait" → `review_required` | bell "Shortlist reply needs review" to the sending TA and the lead (if `C141_MAIL_INTAKE` is on; otherwise the mail is simply unread) |

### 3.4 09:00 · Planning (Ops lead, TA lead, Director)

**New P1 from the client side.** The ops lead has the brief on WhatsApp. Who opens it: the
ops lead *can* (`opening.create`), but the TA lead does, because only a lead's picks of TAs
stick and the lead becomes `taLeadId` [V]. Steps: New opening (client, title, locations,
brief pasted from WhatsApp, TA-1) → save → Overview → Edit the details → priority P1 → save.
Two screens, ~20 actions, the brief retyped [O]. `assignedAt` stays empty, so "day N of
target" counts from creation [V]. TA-1 gets the `opening_assigned` bell [V].

**TA-4 is sick; TA-2 wants Thursday off.** No availability record exists [V]. The lead
decides to move TA-4's two 100% positions to TA-1. "Change the team" on each: TA-4 removed,
TA-1 added → bell to TA-1; **every remaining member's mode on both openings returns to 100%**
[V `store.ts:2692-2703`]; TA-4's carried candidates will re-attach to TA-4's next day, not
TA-1's, because carry keys on the candidates' `ownerTaId` [V]. The lead now has to tell TA-1
and the other members on WhatsApp to reset their modes [O]. TA-1 is at 3 positions at 100%
(cap 5) — the lead counts this by hand; the dashboard shows roles per TA, not modes [V].

**TA-3 cannot open the P2 they were asked to help on.** TA-3 opens `/openings`, finds the
opening in "All active" (visible as a row, not openable) and presses Request access with a
reason → bell to the opening's `taLeadId` [V]. If that lead is the one who left in October,
TA-3 sees "This opening does not have an active TA Lead. Ask an administrator to assign one."
and the admin has no screen to assign one — a migration through the pipeline [V, O].
Otherwise the lead approves from `/openings?accessRequests=open`; TA-3 gets a supporting seat
at 100% [V].

**The Director asks at 09:20: "Which roles are waiting on clients?"** The Director's own
dashboard shows "Waiting on you" (Director review) and sets, nothing about clients [V]. The
Ops dashboard's "Waiting on client feedback" lists Client Shortlist candidates with days
since the last stage change [V] — but a client set that was emailed from Outlook and never
"recorded" is not in it, and a client's WhatsApp "no" moved nothing [V]. The ops lead
answers from that list plus the client WhatsApp groups: ~15 minutes [A].

**Uncertain send on TA-2's P2.** TA-2 cannot send or change mode on that opening until the
job's `taLeadId` (or admin) reconciles with a reason, after the 5-minute wait [V]. The lead
learns of it when TA-2 asks [O]: the flag raises no bell.

### 3.5 09:30 · The TAs start

| TA | Today's Checks [V] | What stops them [V/O] |
|---|---|---|
| TA-1 | 100%: the new P1 and the reassigned P1; Follow-up: two P2 (carried). The new P1's JD is `pending_ta_approval`: writes it from the retyped brief, approves (scoring starts), pastes the LinkedIn URL, decides the Suggestions round, has one Excel profile, pastes the ChatGPT link and ticks the private-window box | ~18 clicks before sourcing; the ChatGPT link again tomorrow for the same job [O] |
| TA-2 | 100%: one P2; Follow-up: three | on the blocked P2: "Wait for this position's email result or ask the lead to reconcile it before changing work type." until the lead acts [V] |
| TA-3 | 100%: own P2 + the newly granted P2 | the Missed tab for yesterday's EOD: sends it now with the roster recomputed for that day, no workbook, and the Director will not know it is late [V] |
| TA-5 (support) | reads every TA's Excel Tables rows across positions, prepares L-sheets, reviews position EODs | cannot act on another TA's row [V] |

### 3.6 10:00-12:30 · CVs, research, screening, follow-up

| Event | What the system does [V] | What the person does by hand [O] |
|---|---|---|
| 22 of the 140 LinkedIn CVs score above the bar on 9 openings | score, level, salary and notice read from the CV; AI shortlist on high score | open each, read, press Shortlist (claim) |
| 25 TopJobs CVs in the database only | nothing | TA-2 searches the database by role, finds them one by one, "Add to opening" → claim; source stays `email` |
| 6 duplicates: two with different emails | merge only on proof; the two near-duplicates become two people | TA notices by name; two records live on; no review list |
| 11 shortlisted lack expected salary or notice | the assistant asks one item at a time; 4 are silent after 3 messages → Unresponsive; current salary keeps being asked though the gate does not need it | TA calls the 4 from a phone and logs a `callFeedback` row; "Bring back" from Dropped out when one answers (attempt count is not reset) |
| A candidate says "call me after 5" | the assistant keeps the promise and reschedules | TA calls at 5 |
| A candidate replies by **email** "my notice is 2 months" | notice saved; `lastCandidateReplyAt` **not** set | the dialog still shows "no reply"; the 1-day AI-follow-up rule ignores it |
| TA-1 researches the Head of Planning: 14 Suggestions, 5 kept | Select → Excel row + CV match; Add to pipeline → claim → Director review if CV, salary and notice exist | 2-3 screens per profile; 3 of 5 need salary/notice typed on the candidate page first |
| TA-3 wants to put a strong candidate from one P2 on the other | "Add to another job" on the row → application at New CVs → claimed to Follow-up (29 Oct) | one click, if TA-3 is on both teams and both are in today's workday |

### 3.7 12:30 · A priority changes

The Director decides a P3 becomes P1. The lead edits the tier in Overview → Edit. No bell,
no event [V]. The lead messages the TA on WhatsApp [O]. The TA changes the mode in the drawer
(3 of 5 at 100%). The stale-role alert for that opening recomputes on the next request [V].

### 3.8 13:30 · A mailbox goes quiet

Graph stops returning `linkedin@` (token refresh failed). The poller leaves `mailPollOkAt`
unstamped [V]. **After 60 minutes** `check-mailboxes-read` sends `mailbox_stalled` ("Problem:
linkedin@ has stopped … Please tell the developer") to every admin and TA lead, linking to
`/settings?tab=mailboxes`, which only admins can open [V]. Recovery is credentials or a
deploy: the developer [V]. Until 14:30 the TAs simply see no new CVs [O]. Had it been the
WhatsApp webhook, nothing in the app would have noticed at all [V].

### 3.9 14:00-16:30 · Coordination

| Event | System [V] | By hand [O] |
|---|---|---|
| Monday's Director reply (`review_required`) | the bell went to TA-1 and the lead; `/shortlist-decisions` lists it with the parser's reasons | the lead opens it, presses "Confirm selected decisions" (the Director said "Nimal and Kamal yes, the rest can wait"); the "rest" are held, not rejected |
| Client set for a P2 (5 Director-shortlisted) | the composer's `kind=client` page: To = the Director's email, "Nothing was emailed from here." | the ops owner exports the prepared PDFs, emails the client from Outlook, posts in the client's WhatsApp group, presses "Record that it went to the client", writes the date in the client sheet |
| Client reply by WhatsApp in the group: "Nimal yes, Kamal no (too senior)" | nothing moves | the ops owner tells TA-3; TA-3 moves Kamal to Rejected with a note (no reason field is required); Nimal to Client Shortlist needs a recorded reply or a lead [V `auth.ts:204`] — so TA-3 asks the lead, or pastes the WhatsApp text into the EOD page's reply box |
| Client asks for interviews, three slots | the interview record holds date/time/round/panel once typed; `interviews@` moves the stage if the invitation subject follows `CLIENT > ROLE > CANDIDATE` | six messages to agree the slot; TA-3 phones the candidate; the ops owner sends the Teams invite from Outlook with that subject so the stage moves; TA-3 types the record |
| 15:30, the Director wants the weekly active-positions list now | Reports: "by-ta", "over-target", Master Sheet; CSV | the ops lead builds it in ~25 minutes from Reports and the client sheet [A] |
| 16:00, a candidate joining Thursday has no offer letter | offer and placement records hold salary and join date only | TA-1 calls the client's HR; nothing records the letter |

### 3.10 17:00-18:30 · End of day

| Event | System [V] | By hand [O] |
|---|---|---|
| EODs: TA-1 two openings (5 and 6 CVs), TA-2 one, TA-3 one plus yesterday's missed one | prepared PDFs, Excel, Cc list, from each TA's mailbox; the day completes on the first accepted original 100% EOD; lead bell `workday_finished` | TA-2's blocked opening: still waiting for the reconcile |
| TA-2 forgets the Follow-up EOD for one P2 | nothing today; tomorrow at Start the day is closed as `expired`, silently | the lead finds out on the reviewers' panel if they open that day |
| TA-4 (sick) | her day never started; her carried candidates wait for her next Start; her openings' EOD blockers show on nobody's panel | the lead has no list of "openings with no EOD today" |
| After 5 PM TA-3 phones two interviewed candidates | `callFeedback` rows; interview `taFeedback` on the record | the ops owner relays to the client group by hand |
| 18:00, the lead's review | reviewers' panel (today's days), bells (started/finished/exceptions), `/alerts?all=1`, `/shortlist-decisions`, Lead dashboard, EOD copies, TA Track | ~30 minutes across seven places [A]; tomorrow's plan in a notebook |
| 18:15, the ops lead | — | master, client and interview sheets, ~40 minutes [A] |

### 3.11 What each role repeats every day [O]

| Role | Repeated by hand | Decisions | Slowed by |
|---|---|---|---|
| Director | reads sets in email; replies in prose; asks for numbers | shortlist / reject / hold | no "waiting on client" view; replies that need a human when phrased loosely |
| Ops lead | places unrouted CVs; answers "waiting on client"; relays WhatsApp decisions; builds reports; updates sheets | which opening a CV belongs to; what to tell a TA | no client-side record; cannot create clients; `/intake` has no nav entry |
| TA lead | plans modes by memory; fixes modes after team saves; approves access; reconciles stuck sends; decides reviews; chases missed EODs next morning; collects the evening picture from seven places | who takes what; priority; approve/reject; confirm Director decisions | no availability record; no per-TA mode or 100%-count view; no missed-EOD list; no bell on priority change or stuck send |
| TA | confirms the ChatGPT link daily; re-ticks JD after any edit; hunts TopJobs CVs in the database; retypes salary/notice; calls silent candidates; moves Suggestions through 2-3 screens; types interview records | shortlist; mode; call or drop | the 5-check gate; blocked opening waiting on a reconcile; duplicates; email replies not counted |

### 3.12 Dependencies between modules that the day exposed [V]

Workday → EOD (a TA cannot send outside today's day); EOD → Workday completion; Team save →
Workday modes (reset); `taLeadId` → access requests, workday start, reconcile, review;
JD edit → every TA's JD check; `shortlists@` reader → `C141_MAIL_INTAKE`; Director apply →
`C141_SHORTLIST_AUTO_APPLY`; interviews@ → subject format; Place → ESA record (fee snapshot)
→ a page that does not exist.

---

## 4. Access and permission analysis

### 4.1 The model as it is [V]

Two layers, deliberately separate (`src/lib/auth.ts:15-24`): **role** (what kind of person
across the desk) and **assignment** (the seat on one opening). The web checks `can()` before
every write; the backend re-checks only a subset (`convex/ta/guard.ts`), and everything
written through `ta/commit:apply` trusts the web.

Roles: `admin, director, ta_lead, ta, ta_support, ops, client, viewer` (`src/data/types.ts:18`).
Desk-wide (never narrowed to one opening): admin, director, ta_lead, ops (`auth.ts:99`).
`ta_support` = a TA that may also read every TA's Excel rows. A signed-in email maps to a
roster row; an explicit `taRole` wins over the legacy backend `role`; unknown → viewer.

| Capability | admin | director | ta_lead | ta / ta_support | ops | client | viewer |
|---|---|---|---|---|---|---|---|
| user.manage (People) | Y | — | — | — | — | — | — |
| client.manage | Y | Y | Y | — | **—** | — | — |
| strategy.assign / manage | Y | Y | Y | — | — | — | — |
| strategy.work | on strategy | on strategy | on strategy | seat or strategy | on strategy | — | — |
| database.read, report.read | Y | Y | Y | Y | Y | — | Y |
| commercial.manage (fees, guarantees, Master Sheet) | Y | Y | Y | — | Y | — | — |
| decide.director / decide.client | Y | Y | Y | only via a recorded reply or the matching seat | **only via a recorded reply or seat** | client seat (client) | — |
| opening.create, intake.handle | Y | Y | Y | Y | Y | — | — |
| opening.manage (details, posts, team, status, bin) | Y | Y | Y | primary/supporting seat | Y | — | — |
| opening.act (work the pipeline) | Y | Y | Y | seat, own or unclaimed candidate | Y | — | — |
| opening.sourcing | Y | Y | Y | seat or strategy; own rows | Y | — | — |
| opening.read | Y | Y | Y | seat | Y | seat | seat |
| link.note (note on an Excel row) | Y | Y | Y | — | Y | — | — |
| review.note | Y | Y | Y | seat | Y | — | — |
| interview.feedback | Y | Y | Y | seat | Y | seat | — |
| voice.practice | Y | Y | Y | — | Y | **Y** | — |
| tables.readAll | — | — | — | ta_support only | — | — | — |

Outside `auth.ts`: reconcile a stuck EOD = admin or the job's `taLeadId` (`dailyEmails.ts:256`);
review a workday = admin or the job's lead; reviewers' panel = admin, ta_lead, director;
TA Track = admin, ta_lead; Settings (mailboxes, WhatsApp numbers) = admin; `/shortlist-decisions`
= admin, director, ta_lead, ops; access requests: a TA asks, only that opening's lead or an
admin decides; bin "Delete now" = desk roles; leaving Placed = desk-wide only.

### 4.2 Where web and backend disagree [V, O]

| # | Web says | Backend says | Effect |
|---|---|---|---|
| P1 | any ta_lead, director or ops may `opening.manage` any opening (`auth.ts:225-230`) | `openings.ts:138,262,320` and `requirements.ts` need an assignment, `taLeadId`, or backend role admin/ta_manager | a director, ops, or a `senior_ta` lead editing someone else's opening gets "You are not assigned to this opening. Ask the TA lead to add you to its team." — the same thing was fixed for one function (`followUp.ts:165-171`, 30 Oct) and not the rest |
| P2 | `decide.*` allows ta_lead and director roles, supporting recruiter via recorded reply | `moveStage` reserves director_shortlist/client_review for assignment `director` or `primary_recruiter` (`applications.ts:347-352`) | a lead without a seat moving a candidate for the Director can be refused by the backend |
| P3 | desk-wide = admin, director, ta_lead, ops (`auth.ts:99`) | `workdays.ts:1178` desk-wide = admin, director, ta_lead | ops cannot open the reviewers' panel |
| P4 | role vocabulary `taRole` | bypasses key on backend `role` (`guard.ts:96`, `permissions.ts:10`, `openingDelete.ts:26`); four copies of the mapping | a director/ops/recruiter backend role named as actor fails `assertFullAccess` on candidate reads although the web allows `database.read` (whether those callers pass an actor: [A]) |
| P5 | `openingsForUser` narrows a ta_lead to openings where they are the fixed `taLeadId` (`store.ts:812`; Lead dashboard "Needs a decision") | ta_lead is desk-wide; the Openings page shows all | a lead's dashboard and alerts cover only "their" openings; openings whose lead left belong to nobody |

### 4.3 Restrictions that block ordinary daily work [O]

| # | Restriction | Who is blocked | How often (A) |
|---|---|---|---|
| R1 | `client.manage` excludes `ops` although ops is desk-wide, keeps commercials and may bin openings | the ops lead cannot add a client contact or fix a name | weekly |
| R2 | `taLeadId` set once, no editor anywhere | access requests, workday start, reconcile and review on an opening whose lead left all fail with "Ask an administrator to assign one"; the admin has no screen either | every time a lead changes |
| R3 | reconcile = admin or **that** lead | a director or another lead cannot unblock a TA whose send is stuck | daily when sends get stuck |
| R4 | `decide.client` for ops only via a recorded reply | the ops owner who received the client's WhatsApp "yes" cannot record it as a decision without a lead or a pasted text | daily |
| R5 | Settings → Mailboxes admin-only, but `mailbox_stalled` bells go to leads with a link to Settings | leads get a bell they cannot act on | on every stall |
| R6 | `/intake` has no nav entry; `cv_waiting` alerts link to it | leads find it only through an alert | daily |
| R7 | `voice.practice` allowed for `client` | a client contact can open the voice agent | rare, unintended |

### 4.4 Duplicated responsibilities [O]

- Four copies of the role mapping (`map.ts:301-311`, `openingAccess.ts:15-20`, `guard.ts:139-144`,
  `workdays.ts:51`), one legacy gate on backend names (`permissions.ts:10`).
- Two reply-apply code paths with different "awaiting" stage lists (`store.ts:2922-3005` vs
  `decisions.ts:207-259`).
- `opening_assigned` raised twice (an alert for 7 days and a bell); `strategy_assigned` carries
  two different events.
- Master Sheet status and StatusMenu both write the opening status with different rules
  (reason required on one side only).

### 4.5 Recommendations on access (within the existing model) [R]

Each keeps the two-layer model and only aligns what already exists.

| # | Change | Why it is safe |
|---|---|---|
| A1 | Make the backend honour the web's desk-wide rule for `opening.manage` (`openings.ts`, `requirements.ts`): admin, director, ta_lead, ops pass as `followUp.ts:165-171` already does | the web already grants it; the backend refusal is a leftover, not a policy |
| A2 | Give `ops` `client.manage` | ops already owns commercial records and may delete openings; the denial text names "director, lead or admin" as a habit, not a rule; the Ops system will create clients through ops anyway |
| A3 | Let `ops` record a client decision when they are the person who received it (the same recorded-reply door, with the reply text pasted), and let any ta_lead or admin reconcile a stuck send, not only the fixed lead | removes two daily blocks without adding a capability |
| A4 | One mapping function for roles, used by all four places | pure refactor |
| A5 | An admin (and the lead on the opening) may change `taLeadId` from "Change the team" | there is already a `taLeadId` field and a team editor; only the writer is missing |
| A6 | Reviewers' panel desk-wide list includes ops; TA Track viewers include director | aligns with `auth.ts:99` and with who reviews workdays |
| A7 | Remove `voice.practice` from `client` | nobody needs it |

Not recommended: any new role, any new capability, any change to the collision lock, the
workday gate, the Director gate or the one-original EOD rule. They are the business rules.

---

## 5. Operational difficulties identified [O]

Grouped by what the brief asks for. Every row is verified behaviour (section 2) that costs
time; the minutes are estimates [A].

### 5.1 Unnecessary manual actions
- Placing CVs by hand that arrived with a partial headline or from TopJobs/Talent Pulse (no
  routing key); `routingEmailAlias` exists but is not used.
- Retyping the client's brief into the opening, then into the JD.
- Confirming the ChatGPT research link every day for every 100% job.
- Re-ticking "JD reviewed" after any colleague edits the JD.
- Resetting work modes after every team save.
- Exporting prepared-CV PDFs and emailing the client set from Outlook; pressing "Record that
  it went to the client".
- Typing the interview record after agreeing slots in messages; sending the invite from Outlook
  with a special subject so the stage moves.
- Typing salary and notice on the candidate page before "Add to pipeline" can move a profile.
- Searching the database for CVs that should have been on the opening.

### 5.2 Repeated data entry
- Brief → opening → JD; client sheet ↔ clients table; interview summary sheet ↔ interview
  records; placement WhatsApp post ↔ placement record; the weekly report rebuilt from Reports.

### 5.3 Repetitive task management
- The lead's evening picture from seven places; the morning hunt for missed EODs; counting
  100% slots per TA by hand; telling TAs about priority changes by WhatsApp.

### 5.4 Unnecessary navigation
- Suggestions → Excel Tables → candidate page → pipeline (2-3 screens per profile).
- Priority on a second screen after creation.
- `/intake` reachable only from an alert; Settings from the admin menu; Alerts, bells,
  `/shortlist-decisions`, reviewers' panel, Lead dashboard, Reports, TA Track as separate
  destinations.

### 5.5 Delayed information
- A stuck EOD send raises no bell; the TA is blocked until they ask.
- A missed EOD is discovered the next morning; an expired day is closed silently.
- A stalled mailbox is noticed after 60 minutes, by admins and leads only, with a link only
  admins can open; a WhatsApp outage is never noticed by the app.
- Email replies do not count as replies for the 1-day rule or the dialog.
- Director replies wait for a person unless an environment flag is on.
- A priority or status change tells nobody.

### 5.6 Workload coordination
- No availability record; reassignment resets modes; carried candidates follow the old owner.
- The lead dashboard shows roles per TA but not modes, 100% count, today's workday state or
  missing EODs.
- Alerts have fixed ids, so recurring conditions stay "read"; the Director and Ops own none.

### 5.7 Reporting overhead
- Nothing is scheduled; the weekly active-positions report is built by hand; "waiting on
  client" is not a field.

### 5.8 Communication gaps
- Client decisions arriving by WhatsApp move nothing; the client set is never emailed by the
  system; interview invites and reminders go by hand; `candidate_placed`, `scoop_received`
  and four more bell types never fire.

### 5.9 Repeated approvals
- Every Director reply needs "Confirm selected decisions" unless the flag is on; every stuck
  send needs a written reason from one specific person; every JD edit re-opens every TA's
  JD check.

### 5.10 Integration friction
- Routing depends on LinkedIn numbers in the subject; the partner API writes files nobody
  reads; per-TA WhatsApp numbers need Meta template approval per account; Graph subscription
  renewal failures are only logged.

---

## 6. Unnecessary manual activities (what the system could do without changing the workflow)

| # | Activity | Who | How often | Minutes/day (A) | Root cause [V] |
|---|---|---|---|---|---|
| M1 | Place unrouted CVs; hunt TopJobs/Talent Pulse CVs in the database | ops lead, TAs | daily | 20-40 | no routing key for those sources; alias unused |
| M2 | Retype the brief into the opening and the JD | TA lead, TA | per opening | 10 | no requirement record; the brief field is free text |
| M3 | Set priority on a second screen | TA lead | per opening | 2 | not on the create form |
| M4 | Reset modes after a team save; tell members | TA lead, TAs | per reassignment | 10 | `setAssignments` drops `workingStage` |
| M5 | Confirm the ChatGPT link daily per job | TA | daily × jobs | 2 per job | check is day-scoped |
| M6 | Re-tick JD after a colleague's edit | every TA on the job | per edit | 1 each | `invalidateJdReviews` for all |
| M7 | Find and send yesterday's missed EOD; the lead's morning hunt | TA, lead | when missed | 10 + 10 | no reminder; silent expiry |
| M8 | Ask the lead to reconcile a stuck send | TA, lead | when stuck | 5 + 5 | no bell to the lead; one named person |
| M9 | Export PDFs, email the client set from Outlook, record it, update the sheet | ops owner | per set | 20-25 | client round is held, never sent |
| M10 | Relay a client's WhatsApp decision to the TA; the TA moves stages; a lead records the "yes" | ops owner, TA, lead | per decision | 5-10 | WhatsApp replies move nothing; `decide.client` |
| M11 | Agree interview slots over messages; type the record; send the invite with the magic subject | ops owner, TA | per interview | 15-20 | nothing sends or reminds; `interviews@` reads subjects only |
| M12 | Type salary/notice before "Add to pipeline" | TA | per profile | 2 | gate needs them; Suggestions do not carry them |
| M13 | Count 100% slots and modes per TA; plan tomorrow in a notebook | TA lead | daily | 15-30 | dashboard shows roles, not modes |
| M14 | Tell a TA about a priority change | TA lead | per change | 2 | no bell |
| M15 | Build the weekly active-positions report | ops lead | weekly | 25 | nothing scheduled |
| M16 | Update master, client and interview sheets | ops lead | daily | 40 | no client-side record in the system |
| M17 | Confirm Director decisions that were clear | lead | per reply | 3 | `C141_SHORTLIST_AUTO_APPLY` off [A] |
| M18 | Call candidates the assistant gave up on, log by hand | TA | daily | 20-30 | human calls stay; logging is one field |
| M19 | Mark a placed opening Placed; chase the missing page | TA, lead | per placement | 3 | Place does not set status; dead redirect |

Total, a normal day [A]: TA lead ~1.5-2 h, ops lead ~2-2.5 h, each TA ~45-60 min, each ops
owner ~2-3 h (M9-M11 and the sheets).

---

## 7. Automation opportunities

Each one: existing workflow · current difficulty · proposed improvement · how it integrates ·
who benefits · permissions · risks · expected reduction. **None adds a step to the business
process; each removes a hand step or a wait.** Ordered by value.

### 7.1 Stuck-send bell and "openings with no EOD today" list
- **Existing:** `ta-flag-stuck-sends` marks a send `uncertain` after 15 min; only the job's lead or admin can reconcile (`dailyEmails.ts:256`). No EOD reminder; expired days close silently.
- **Difficulty:** the TA is blocked until they ask; the lead learns next morning.
- **Improvement:** when the cron flips a send to `uncertain`, insert a bell (`eod_stuck`) to the job's lead and the admin with the reconcile link; at 17:30 Colombo, a bell to each TA with an open 100% day and no accepted original EOD; at 18:30, one bell to each lead listing their TAs' openings without an EOD; when `recoverStaleDays` closes a day as `expired`, a bell to the lead.
- **Integration:** three small additions in `convex/ta/eodCopies.ts`, a new cron entry, `recoverStaleDays` (`workdays.ts:951-960`); the bell types already have a table and a renderer.
- **Benefits:** TA lead (M7, M8), TAs.
- **Permissions:** none new; bells go to the people who already may act.
- **Risks:** noise if a TA legitimately has no EOD (availability, below); mitigated by the availability record (7.3).
- **Reduction:** ~20 min/day for the lead; stuck-send waits from hours to minutes.

### 7.2 Keep work modes on team save; editable TA lead
- **Existing:** `setAssignments` re-creates seats without `workingStage` (`store.ts:2692-2703`); `taLeadId` has no writer.
- **Difficulty:** every reassignment flips the whole team to 100%; openings whose lead left are stuck (R2).
- **Improvement:** carry each kept member's `workingStage` into the new row; add "TA lead" to "Change the team" for admin and the current lead; access requests, reconcile and review then follow the new lead automatically.
- **Integration:** `src/data/store.ts` + `convex/ta/model/tables.ts` (seat mapping); one field on the team form; `convex/ta/openingAccess.ts` already reads `taLeadId` live.
- **Benefits:** TA lead, every TA on a reassigned opening.
- **Permissions:** existing `opening.manage`; `taLeadId` change limited to admin and the current lead [R].
- **Risks:** none to the workflow; a migration to set `taLeadId` on orphaned openings (dry run first).
- **Reduction:** M4 and R2 gone; the "no active TA Lead" dead end gone.

### 7.3 TA availability record and a reassign action that keeps carry
- **Existing:** no leave or availability model; carry keys on `ownerTaId`; the sick TA's candidates wait for her next Start.
- **Difficulty:** the lead reassigns by hand with side effects; bells and expected EODs keep firing for an absent TA.
- **Improvement:** a small `taAvailability` table (user, from, to, reason) set by the lead or the TA; the reviewers' panel and the 7.1 bells treat "away" days as expected-no-EOD; a "Reassign to" action on a position that moves the seat **and** re-owns the TA's open follow-ups on that opening to the new TA (through the existing claim path), writing the pipeline event with the reason.
- **Integration:** new table + two mutations; `workdays.ts` carry logic reads `ownerTaId` so the re-own does the rest; uses existing `opening_assigned` bell.
- **Benefits:** TA lead, TAs.
- **Permissions:** `opening.manage` for the reassign; the TA for their own availability.
- **Risks:** re-owning a candidate changes who the Director sees as sender on the next set (desired); must respect the collision lock (the new owner is set explicitly by the lead, so the lock is satisfied by design).
- **Reduction:** M4 side effects, half of M13.

### 7.4 Lead "today" view (one screen, no new data)
- **Existing:** the picture is spread across the Lead dashboard, reviewers' panel, bells, `/alerts?all=1`, `/shortlist-decisions`, Reports, TA Track.
- **Improvement:** one page for admin/ta_lead/director: per TA — workday started?, positions and modes, 100% count, EOD state per opening, flagged candidates ("needs you" count), away today?; per opening — JD state, LinkedIn pill, stale/over-target, waiting-on-client days (once the Ops system feeds it), pending access requests, replies needing review, stuck sends. Everything already exists as a query; the page joins them.
- **Integration:** `src/components/dash/LeadDashboard.tsx` extended or a sibling page; reads `taWorkdays` (today), `jobAssignments.workingStage`, `dailyEmails` receipts, `applications.flaggedForTaReview`, `openingAccessRequests`, `shortlistDecisionReviews`.
- **Benefits:** TA lead and Operations lead most; Director.
- **Permissions:** existing reviewer roles; TA Track stays separate.
- **Risks:** read cost — must use the bounded queries introduced 28-29 Oct (`workday-dashboard-read`), not table scans (the 29 Oct freezes).
- **Reduction:** M13 and most of the evening review: ~30 min/day.

### 7.5 Route TopJobs and Talent Pulse CVs without a person
- **Existing:** routing keys are LinkedIn numbers, campaign code, exact headline; `routingEmailAlias` is written but unread; TopJobs mails land in the database.
- **Improvement:** make `routeShared` accept the post's `routingEmailAlias` as a key when the mail was addressed to it (one more branch before the headline match), and let the TA set a post's `campaignCode` on the LinkedIn Job tab for non-LinkedIn channels; TopJobs orders and Talent Pulse entries then carry the alias or code. Source tag from the post's `channel`.
- **Integration:** `convex/lib/postRouting.ts:345-416`; `jobPosts` already has the fields; the poller already reads recipients.
- **Benefits:** ops lead (M1), TAs.
- **Permissions:** `opening.manage` to set a code (exists).
- **Risks:** a wrong code files CVs to the wrong post — same risk as today's headline rule; unmatched still goes to the database.
- **Reduction:** M1 ~30 min/day.

### 7.6 Apply clear Director replies, keep the human for the rest
- **Existing:** clear replies are applied only when `C141_SHORTLIST_AUTO_APPLY=on` (`decisions.ts:455`); otherwise `review_required` for everyone.
- **Improvement:** turn the flag on in production (a release-pipeline change, owner's go-ahead), after one week of comparing the parser's "clear" verdicts with the lead's confirmations on `/shortlist-decisions` (the data is already stored). Unclear replies keep the existing review path.
- **Integration:** no code; a setting; the existing `candidate_replied` bell tells the TA either way.
- **Benefits:** TA lead (M17), TAs (faster next step).
- **Permissions:** unchanged.
- **Risks:** a misread shortlist moves a candidate; the parser refuses unknown names and conflicts already, and "Confirm selected decisions" can correct it.
- **Reduction:** M17; replies applied in minutes instead of hours.

### 7.7 Count email replies as replies
- **Existing:** `checkAndRecordEmailReply` saves details but never sets `lastCandidateReplyAt` (`emailAgent.ts:707-800`).
- **Improvement:** set it, exactly as the WhatsApp path does (`whatsappOutbound.ts:715-717`).
- **Benefits:** TAs (the dialog and the 1-day AI-follow-up rule become true).
- **Permissions:** none. **Risks:** none. **Reduction:** small but daily confusion removed.

### 7.8 Bell on priority and status change; bell on placement
- **Existing:** `writeOpeningDetails` and `setOpeningStatus` tell nobody; `candidate_placed` is declared and never emitted.
- **Improvement:** on tier change, bell to the recruiter seats (and the lead if the actor is not the lead); on status change, the same; on Place, emit `candidate_placed` to the lead and the opening's director seat, and — when the Ops system exists — the ops owner.
- **Integration:** `src/lib/openings/admin.ts`, `writes.ts`, `closingWrites.ts`; the `ta/notifications:create` mutation already exists.
- **Benefits:** TAs, lead, Director, (later) Ops.
- **Permissions:** none. **Risks:** none. **Reduction:** M14; the "placed but nobody knew" case.

### 7.9 Fix Place: required fields and the dead page
- **Existing:** Place takes the join date only, then redirects to `/placements/{id}` which does not exist; the opening stays Active.
- **Improvement:** add package and offer letter (file) to the Place form, required; redirect to the candidate page; offer "Mark the opening Placed?" with one click (the existing StatusMenu write, reason optional).
- **Integration:** `src/components/ClosingPanel.tsx`, `closingWrites.ts`, `placements` fields exist for salary; add `package`/`offerLetterFileId`.
- **Benefits:** TAs, Asma (accounts), the Ops system later (CP-19).
- **Permissions:** `opening.act`; status change stays `opening.manage` (the lead confirms).
- **Risks:** none to the workflow; it is the workflow as described on the board.
- **Reduction:** M19 and the "package asked two months later" problem.

### 7.10 "Needs a person" list and a duplicates review list
- **Existing:** `flaggedForTaReview`, `taTookOverAt`, Unresponsive and gate-blocked candidates are visible per opening only; near-duplicates become two people with no screen.
- **Improvement:** one TA page "Needs you" across the TA's openings (flagged, hand-over reason, missing item, days silent, back-up tag) with the existing actions (Take over, Hand back, Send, Mark dropped out); a lead page "Possible duplicates" from `sameCandidate`'s near-miss cases (strong key but names disagree, or same name + employer) with "Same person" (existing merge) / "Different".
- **Integration:** queries over `applications` by `ownerTaId` and flags (index exists); a small `candidateDuplicateReviews` table or a computed list; merge uses the existing `planMerge`.
- **Benefits:** TAs (M18 planning), leads (clean data).
- **Permissions:** existing `opening.act` / `database.read`.
- **Risks:** a wrong merge — mitigated by the "fills blanks only" merge rule already in `dedup.ts`.
- **Reduction:** 10-15 min/day per TA; fewer duplicate calls.

### 7.11 Stall and outage bells for every reader
- **Existing:** `mailbox_stalled` after 60 min to admins and leads; per-job inboxes unwatched; Graph renewal failures logged; WhatsApp webhook outage unnoticed; mail-sourced CV reading failures told to nobody.
- **Improvement:** one health check every 15 min: last successful poll per watched mailbox (threshold 20 min for `job@`, 30 for the others), last inbound webhook per WhatsApp number (threshold 2 h in sending hours), queue depth and `needs_review` count; one bell per condition per 4 h to admins, linked to the mailbox-health panel; the panel shows the same numbers.
- **Integration:** extend `checkMailboxesRead` (`emailAgent.ts:1170-1195`) and the Settings panel; a `lastInboundAt` on `whatsappNumbers`.
- **Benefits:** admin, leads, every TA (CVs keep flowing).
- **Permissions:** none new; the link stays admin-only, the bell text says what to tell the developer.
- **Risks:** false alarms at quiet times — thresholds only inside sending hours.
- **Reduction:** detection from 60-90 min (mail) / never (WhatsApp) to 15-20 min.

### 7.12 Checks that remember
- **Existing:** the ChatGPT link is day-scoped per job; a JD edit invalidates every TA's JD tick.
- **Improvement:** keep the ChatGPT confirmation for the job until the research report or the JD changes (the check already stores a version); on a JD edit, invalidate only when the text differs materially (the existing `jdVersion` compare, but on the normalised text) and show the TA a diff of what changed instead of a blank tick.
- **Integration:** `convex/lib/workdayChecks.ts:11-114`; `workdays.ts:1031-1032`.
- **Benefits:** every TA. **Permissions:** none. **Risks:** a stale link — the research report version guards it.
- **Reduction:** M5, M6: 5-10 min/day per TA.

### 7.13 "Add to pipeline" asks for the two missing items in place
- **Existing:** `pipelineFromLink` fails when CV/salary/notice are missing and sends the TA to the candidate page.
- **Improvement:** the Excel row's panel shows the three fields when missing and saves them with the move (same `saveReviewDetails` write).
- **Benefits:** TAs (M12). **Permissions:** none. **Risks:** none. **Reduction:** 2 min per profile.

### 7.14 Weekly active-positions report, built on a schedule
- **Existing:** Reports presets exist; nothing is scheduled; the Director asks for it ad hoc.
- **Improvement:** a Monday 08:00 cron builds the "by-ta" + "over-target" + waiting-on-client rows into a stored report and emails the PDF/CSV to the lead for review, then the Director (the Ops system will add its columns later, CP-24).
- **Integration:** `src/lib/reporting.ts` already computes everything; a cron + `graphMail` send from `joborders@`.
- **Benefits:** ops lead (M15), Director. **Permissions:** `report.read`. **Risks:** none. **Reduction:** 25 min/week and every ad-hoc request.

### 7.15 Record what the WhatsApp said (until the Ops system takes the client side)
- **Existing:** Director or client decisions on WhatsApp move nothing; a TA cannot record a client "yes".
- **Improvement:** on the EOD page's existing "paste a reply" box, allow a pasted WhatsApp text for the client round too, applied through the same parser and recorded-reply path (`viaRecordedReview`), so the ops owner or the TA records it without a lead.
- **Integration:** `src/app/actions.ts:5149-5209` already reads a pasted reply against the newest open round; extend the round kind.
- **Benefits:** ops owners, TAs, leads (M10). **Permissions:** the existing recorded-reply door. **Risks:** the same as any recorded reply (the text is kept as evidence). **Reduction:** M10 halved until the Ops system lands.

Not proposed: AI calls (suspended, and clients/Director stay human), any new approval step,
any change to set sizes, the one-original rule, the five checks themselves, or the Director's
freedom to reply in prose.

---

## 8. Integration improvements

| Integration | Today [V] | Improvement [R] | Why |
|---|---|---|---|
| Microsoft Graph mail | pollers 3-17 min; delta intake; stall bell at 60 min; renewal failures logged; the EOD from each TA's mailbox with a `job@` fallback | 7.11 health; a `graph_subscription_failed` bell; keep polling as the primary path (it already is) | detection, not redesign |
| LinkedIn mail routing | numbers, code, exact headline; alias unread | 7.5 alias and per-post code | TopJobs / Talent Pulse without a person |
| Meta WhatsApp | main line + per-TA numbers (`ready` gate), assistant, echoes for take-over | 7.11 `lastInboundAt`; a Settings check that reports which TA numbers lack template approval; keep groups manual | the Ops system will add the client number later |
| Director replies | parser + AI reader; apply behind a flag | 7.6 flag on after a one-week comparison | the code is there |
| Interviews | `interviews@` moves stages by subject; nothing sent | leave as is; the Ops system books and reminds (CP-15) and writes the record through the API | avoid building it twice |
| CV reading | queue, healer, Try again for uploaders | a `cv_read_failed` bell to the opening's primary TA for mail-sourced failures; a "needs review" count on the health panel | silent failures today |
| Partner API | read-only + file upload nobody reads | the Ops key and endpoints of the Ops plan (15 Part E); `partnerCvFiles` either read into `cvUploads` or dropped | one API, two keys |
| Claude / DeepSeek | scoring, JD, suggestions (learning from picks), replies | no change; keep proposals under human confirmation | as today |
| Qdrant | nightly matching never scheduled | a nightly `matchRuns` cron for open openings with an approved JD, bounded per run | TA work plan item E3 |
| Clerk | one instance; admin provisions | satellite domain for the Ops app (15 J10) | one login |
| TA Track | domains and time, admin/lead only | add director to viewers (A6); no change to what is collected | consistency |

---

## 9. User experience improvements (no redesign; fewer hops on the screens that exist)

| # | Screen | Today [V] | Change [R] | Who |
|---|---|---|---|---|
| U1 | New opening | priority absent; brief free text | priority select (default P3) and a "requirement received on" date on the form; brief keeps a recording | TA lead |
| U2 | Change the team | any role listed; modes reset; no TA lead field | keep modes (7.2); TA lead field; show each member's current mode next to the seat | TA lead |
| U3 | Lead dashboard | roles, in-pipeline, CVs today, sets, alerts per TA | the "today" view of 7.4 as the top block; counts link to the thing | lead, ops lead, Director |
| U4 | Today's Checks | each check a separate form; link re-entered daily | "Start as yesterday"; checks that still pass stay green with the date they passed; the link remembered (7.12) | TA |
| U5 | EOD composer | the `kind=client` page addresses the Director and says replies are tracked | until the Ops system sends client sets: correct the copy, default To = the client contact, and one button "Record that it went to the client" that also asks for the date; the Missed tab shows "(late)" in the subject | TA, ops owner |
| U6 | Candidate row | "Add to another job" (29 Oct) | the same row shows the assistant's state ("needs you: upset") and the back-up tag | TA |
| U7 | Excel Tables row | "Add to pipeline" fails on missing items | the three fields in place (7.13) | TA |
| U8 | `/shortlist-decisions` | reached from the bell only | a count in the header for leads; one line per reply with the parser's reason | lead, ops |
| U9 | `/intake` | no nav entry | a header link for intake.handle roles with the unfiled count | ops lead, leads |
| U10 | Alerts | fixed ids keep recurring alerts "read" | the id carries the condition's start time (the alert's own `since`), so a recurrence is unread again; "snooze until" per alert | everyone |
| U11 | Bell | `sla_breached` and `candidate_replied` open the opening root | link to the candidate | TA |
| U12 | Settings → Mailboxes | admin only; leads get the stall bell | leads may open the panel read-only (status, last read) | TA lead |
| U13 | Place | join date only; dead page | package, offer letter, join date; back to the candidate; "mark opening Placed?" | TA |
| U14 | Opening Overview | Edit/Delete shown to client/viewer | hide for roles that `must` will refuse (the code's own rule: hiding is a courtesy, refusing is the check) | — |

---

## 10. Prioritised recommendations

Scored 1-5 on operational value, simplicity, maintainability and workload reduction; the
order is by the sum, ties broken by how many roles benefit. **Tier 1** = do first, each
is a small separate pull request; **Tier 2** = the next month; **Tier 3** = with or after
the Ops system.

| Rank | Recommendation | Value | Simple | Maintain | Workload | Tier | Fixes |
|---|---|---|---|---|---|---|---|
| 1 | 7.1 Stuck-send bell; EOD reminder; no-EOD list; expired-day bell | 5 | 5 | 5 | 4 | 1 | M7, M8 |
| 2 | 7.2 Keep modes on team save; editable TA lead (+ A5) | 5 | 4 | 5 | 4 | 1 | M4, R2 |
| 3 | 7.8 Bells on priority/status change and on Place | 4 | 5 | 5 | 3 | 1 | M14, M19 |
| 4 | 7.7 Email replies count as replies | 3 | 5 | 5 | 3 | 1 | 5.5 |
| 5 | 7.9 Place: required fields, no dead page, "mark Placed" | 4 | 4 | 5 | 3 | 1 | M19, B9 |
| 6 | A1-A3 Align backend `opening.manage`; ops `client.manage`; reconcile by any lead; ops records a received client decision | 4 | 4 | 4 | 4 | 1 | P1-P3, R1, R3, R4 |
| 7 | 7.6 Turn on clear-reply apply after a one-week comparison | 4 | 5 | 5 | 3 | 1 | M17 |
| 8 | 7.11 Health bells for every reader (mail, WhatsApp, CV queue) | 4 | 4 | 4 | 3 | 1 | 5.5, 5.10 |
| 9 | 7.4 Lead "today" view | 5 | 3 | 4 | 5 | 2 | M13, 5.6 |
| 10 | 7.3 Availability record + reassign that keeps carry | 5 | 3 | 4 | 4 | 2 | 5.6 |
| 11 | 7.5 Route by alias / per-post code (TopJobs, Talent Pulse) | 4 | 4 | 4 | 4 | 2 | M1 |
| 12 | 7.12 Checks that remember | 3 | 4 | 4 | 4 | 2 | M5, M6 |
| 13 | 7.10 "Needs a person" list; duplicates review | 4 | 3 | 4 | 4 | 2 | M18, 5.1 |
| 14 | 7.13 Add to pipeline with the missing items in place | 3 | 4 | 5 | 3 | 2 | M12 |
| 15 | 7.14 Scheduled weekly report | 3 | 4 | 5 | 3 | 2 | M15 |
| 16 | 7.15 Record a WhatsApp decision through the recorded-reply door | 4 | 4 | 4 | 4 | 2 | M10 (interim) |
| 17 | U1, U5, U8-U12, U14 copy and navigation fixes | 3 | 5 | 5 | 2 | 2 | 5.4 |
| 18 | A4 one role mapping; A6-A7 | 2 | 4 | 5 | 1 | 2 | 4.4 |
| 19 | Nightly matching cron (TA plan E3) | 3 | 4 | 4 | 2 | 2 | — |
| 20 | The client side (sets sent by the system, feedback chase, interviews booked and reminded, placement notice, invoices, guarantee) | 5 | 2 | 3 | 5 | 3 | M9-M11, M16 — the Ops system, [15](15-BUILD-PLAN.md) |

What is deliberately **not** on the list: AI calls; auto-rejecting unpicked candidates; moving
candidates on a WhatsApp reply without a person; any change to set sizes, the one-original
rule, the collision lock, the workday gate or the five checks; a new role; a dashboard
rebuild.

---

## 11. Technical implementation considerations [V where it cites code]

1. **Two write paths.** Most TA writes go through `ta/commit:apply`, which trusts the web and
   re-checks only the workday scope (`commit.ts:50-63`). Anything that must be true for API
   callers too (the Ops system, mobile) belongs in a Convex mutation, not the store diff. 7.2
   (modes on team save) is a store/`tables.ts` change; 7.9 (Place) should move
   `writeCandidateClosing` into Convex, which the Ops plan already requires (T9).
2. **Bounded reads.** The 29 Oct freezes came from table-wide reads under Convex's 1 s mutation
   and 16 MB limits; 7.4 and 7.10 must use indexed, paged queries (`by_assignee`, `by_owner`,
   `by_user_job_date` patterns already in the schema) and the 28-29 Oct "two at a time" style.
3. **Bells.** `ta/notifications:create` accepts 13 types; new types (`eod_stuck`, `eod_due`,
   `priority_changed`, `status_changed`, `cv_read_failed`, `health_*`) need the schema union,
   the `create` validator, the `listForUser` href map and `alertKinds.ts` labels, in one PR.
4. **Crons.** Add the 17:30/18:30 reminders and the 15-minute health check to `crons.ts` with
   prime-ish intervals as the file does, registered on both registries where they must survive
   `C141_DISABLE_CRONS`; respect `inSendingHours` for anything that messages a candidate.
5. **Flags.** 7.6 is `C141_SHORTLIST_AUTO_APPLY=on` set through the release pipeline, never
   from a laptop; measure first: `shortlistDecisionReviews` already stores parser verdicts and
   lead confirmations.
6. **Routing.** 7.5 touches `postRouting.ts` only; keep the "exact or nothing" rule; add the
   alias branch before the headline branch; a test per source.
7. **Permissions.** A1-A3 change denial texts and the backend helpers (`openings.ts:138,262,320`,
   `requirements.ts:113,150`, `dailyEmails.ts:256`, `workdays.ts:1178`), and one line in
   `auth.ts` for `client.manage`; add a test per capability × role in `tests/` as the 13 Sep
   audit did.
8. **Migrations.** Orphaned `taLeadId` (openings whose lead is inactive) and empty `assignedAt`
   get a `dryRun` migration run by the pipeline, as every data change does.
9. **Skills.** Every PR that touches a file a feature skill lists must update the skill and
   stamp it (`skill-sync`), or `staleness.mjs check` fails CI.
10. **Release.** One PR per recommendation, `merge-teammate` review, `npm test` + both `tsc`,
    `main` → `production` with the owner's go-ahead; nothing here needs downtime.
11. **Do not** change `OUTREACH_LIVE` handling, the safety gates, or any candidate-facing text
    in these PRs.

---

## 12. Expected operational benefits [A, from the minutes in section 6]

| Role | Today's hand work on these items | After Tier 1 | After Tier 2 | After the Ops system |
|---|---|---|---|---|
| TA lead | 1.5-2 h/day | ~1 h (stuck sends, missed EODs, mode resets, priority relays gone) | ~30 min (today view, availability, reassign) | ~20 min |
| Operations lead | 2-2.5 h/day | ~2 h (clients editable, intake link) | ~1.5 h (routing, report) | ~30 min (sheets gone, client side in the system) |
| Each TA | 45-60 min/day | ~40 min (replies counted, Place fixed, bells) | ~20 min (checks remember, needs-you list, add-to-pipeline in place) | ~15 min |
| Each ops owner | 2-3 h/day | unchanged | ~2 h (WhatsApp decisions recorded) | ~30 min |
| Director | ad-hoc numbers; prose replies | replies applied when clear | the weekly report arrives | client-side numbers in the same report |

Beyond minutes: stuck sends found in minutes, not hours; missed EODs known the same evening;
a stalled mailbox or a silent WhatsApp number known in 15-20 minutes; no opening orphaned by a
departed lead; no mode flipped by a reassignment; every placement known the day it happens;
recurring alerts seen again; fewer duplicate calls to the same person.

---

## 13. Corrections to earlier documents (so the record stays true)

| Document | It said | Verified now |
|---|---|---|
| 18 §1.7 G12 | a stalled poller is caught only by the healer/watchdog, not a bell | `check-mailboxes-read` sends `mailbox_stalled` after 60 min to admins and TA leads (`emailAgent.ts:1170-1195`); the watchdog covers historical scans only |
| 18 §1.7 G16 | no acknowledgement of alerts | a per-user read state exists (`read_alerts:<userId>`), but ids are fixed so recurrences stay read |
| 18 §3 09:00 | the lead counts by feel; no bell on workday start | `workday_started` and `workday_finished` bells go to the job's lead |
| 18 §3 13:30 | `check-mailboxes-read` bells only when an inbox stays unread | it keys on `mailPollOkAt` (last full read), not unread mail |
| 18 §2.4 / 15 J4 | TopJobs/Talent Pulse CVs route by the post's `routingEmailAlias` | the alias is written but **no router reads it**; routing is job number → project number → campaign code → exact headline. 7.5 adds the alias branch; until then use `campaignCode` in the subject |
| 15 E5 T15 | `shortlists@` and `interviews@` readers run always | both run only with `C141_MAIL_INTAKE=on` [A on live]; the Ops plan must not assume them |
| 18 Part 4 I | current salary is part of the gate | the gate needs CV, expected salary, notice; current salary is only asked |
| 18 §3 14:00 | a client "no" by email moves nothing | a client reply to `shortlists@` from a trusted address moves director_shortlist → client_review / rejected; WhatsApp replies move nothing |

[18](18-OPERATIONS-SIMULATION.md) is kept as the first pass; this document supersedes it where
they differ. [15](15-BUILD-PLAN.md) Part J4 and E5 T15 are amended by note at the top of
Part J.

---

_End. Nothing was built; no code or data was changed. The next step is the owner's choice of
Tier 1 items, each then becomes one pull request in the TA repository._
