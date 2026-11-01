# 15 · The build plan: the whole Ops backend, connected to the TA System

_Written 1 Nov 2026 for the owner's approval. Nothing here is built. Once approved, this is
the plan the Ops team builds from; the TA team builds the TA side (section 4) from the same
plan. Read it with the flow ([04](04-OPS-FLOW.md)) and the diagram walkthrough
([14](14-DIAGRAM-DEEP-WALKTHROUGH.md)) open._

---

## 0. What this plan promises

When it is finished, an Ops person can run **every step of the client journey** from the
Ops system, from a new enquiry to the end of the 90-day guarantee, without a sheet, a
notebook, or asking a TA on WhatsApp what happened. The system:

1. **Remembers every clock** (ESA 1-2 h, countersign 1 day, ownership 7 working days,
   feedback 1 day, silence 14 days, invoice 30 days, guarantee 90 days, replacement 60
   working days, unreported hire 3 months) and puts the work in front of the right person.
2. **Drafts every message** to a client, the Director or the team, and sends it only after a
   person approves it, except routine notices from one approved template.
3. **Sends and reads email** (Microsoft 365) and **WhatsApp** (Meta) from Ops's own
   accounts, and **books meetings** with Teams links.
4. **Talks to the TA System** through an API, so the position opens in TA from the
   requirement, client decisions reach the TA, and placements reach Ops the same day,
   with nothing typed twice.
5. **Keeps the traditional ways where they work** (phone calls, client WhatsApp groups,
   paper signatures, in-person interviews) and only asks the person to **record the
   result** in the system.
6. **Never risks the live TA System:** separate backend, separate database, TA changed only
   by adding API endpoints and events.

## 1. Ground rules for the build

| Rule | Why |
|---|---|
| Two systems, two teams. Ops code in `ops-system`; TA changes in `ta-system` by the TA team through its own pull requests | The owner's decision; TA is live |
| Ops never deploys to the TA backend, never reads TA's database | A Convex deploy replaces every function; direct reads bypass TA's rules |
| Every Ops table starts with `ops` | Easy to tell apart, easy to back up and move |
| Every business number lives in **Settings**, not in code | TA's workday rules changed several times in one week |
| Every client, Director and candidate message goes through **one** send pipeline with the safety gate; test recipients until the owner switches live | Real people |
| Every failure saves its reason; every change is audited | Finding out what happened a month later |
| Background jobs run in small batches with their own on/off switch | Shared server with TA |
| Built feature by feature, each behind a flag, released together, switched on with one client first | The owner: build all, approve, pilot |

## 2. Where people act outside the system, and what the system records

The system is **not** the only tool. These stay as they are today; the system just needs
to know the result.

| Traditional step | Stays traditional | What the system does |
|---|---|---|
| Intro call, requirement meeting, negotiation meeting | Phone, Teams or in person | Books it, reminds, and gives one form to save what was agreed (package, role, brief; requirement; terms) |
| ESA signing | Client signs on paper or a PDF; Mr Azeem countersigns by hand | Drafts and sends the PDF; the ops owner uploads the signed scan; one "Countersigned" tick returns the copy |
| Chasing by phone (Rushda's final ESA call, the owner's feedback call) | A phone call | Creates the call task, shows the number, asks for the outcome in one line |
| Client WhatsApp groups | Ops person posts in the group from their phone | Drafts the post text (set posted, feedback, placement news), logs that it was posted |
| Director review | Email to Mr Azeem (from TA) and his reply | TA already reads the reply; Ops only sees the result |
| Interviews | Teams, or at the client's office | Books, invites, reminds; the ops owner ticks attendance |
| Reference check | The TA phones the referee | Records that it was asked for and what the TA reported |
| Offer, joining day | TA calls the candidate | The 9 AM alert and one "Joined / Not joined" tick |
| Payment | Bank transfer | Accounts records the payment date and amount |
| Refund | Director of Operations decides | One decision form with the reason, logged |

If the system is down or someone is in the field, **nothing is lost**: every step above can be
recorded later from the inbox ("record what happened"), and every timer is recomputed from
the recorded dates.

## 3. The architecture (decided 28 Oct)

```
┌──────────────── ops-system ─────────────────┐   HTTPS, Ops key   ┌──────────── ta-system (live) ──────────────┐
│ Ops web app (Next.js 16, UI team later)      │ ───── API v1 ────▶ │ TA HTTP API: reads, writes, events list    │
│ Ops backend (self-hosted Convex, convex/)    │ ◀──── events ───── │ TA backend (Convex) + database             │
│ Ops database (convex_ops, own Postgres DB)   │                    │ Clerk users, mailboxes, WhatsApp numbers  │
│ Ops jobs: timers, mail reader, WhatsApp hook │                    └───────────────────────────────────────────┘
└──────────────────────────────────────────────┘
   Both on VPS 94.136.189.48 · one Postgres server, two databases · one Caddy, separate names
```

**Technology (proposed, to confirm in step 5 of the plan):**

| Need | Tool | Note |
|---|---|---|
| Backend, database, jobs | Self-hosted Convex (same as TA) | Team knows it; cron jobs; reactive queries for live screens |
| Web app | Next.js 16 | Same as TA; built by the UI team against the backend |
| Sign-in | Clerk, the same instance as TA | One account per person; Ops roles stored in Ops (`opsMembers`) |
| Email send/read | Microsoft Graph, Ops mailboxes (`ops@`, `clients@`, per-owner mailboxes to decide) | Same client-credentials app as TA, new mailbox permissions |
| Calendar and meetings | Microsoft Graph calendar + Teams online meetings | Needs admin consent (the longest outside wait). Fallback: paste a Zoom/Teams link by hand |
| WhatsApp to clients | Meta WhatsApp Cloud API, a dedicated Ops number, approved templates | Client groups stay manual (Meta API cannot post to groups) |
| Documents (ESA, invoice, offer letter) | DOCX template filled by the backend → PDF via LibreOffice (as TA's Docker image) | Signed scans uploaded as PDF/JPG |
| Files | Cloudflare R2, an `ops` bucket | Same as TA; signed links, no public files |
| AI help | Claude first, DeepSeek second (TA's routing) | Reads client replies into decisions, drafts chases, flags banking/finance; always a person approves |
| Website leads | A webhook from the website form, or the hello@ mailbox reader | Owner's choice (open question 7) |
| Working days | One calendar helper with Colombo time and the Sri Lankan holiday list in Settings | TA's list is empty today |

## 4. The TA side of the plan (built by the TA team, in `ta-system`)

Everything Ops needs from TA is **added**, nothing existing changes. One pull request per
block, reviewed with `merge-teammate`, released through the pipeline with the owner's
go-ahead.

### 4.1 Access

- A second partner key, `OPS_API_TOKEN`, fail-closed like the Capacity Planner's; each
  endpoint checks which key it accepts. Set only through the release pipeline.
- Every write carries an `idempotencyKey`; a repeat returns the first result.
- Every write runs TA's own rules and returns TA's own refusal text (`{ok:false, code, message}`).

### 4.2 Reads (`GET /integrations/v1/...`)

| Endpoint | Returns | For |
|---|---|---|
| `people` | users with role, active flag (never tokens) | CP-01 |
| `clients?name=` · `clients/{id}` | client with contacts, ESA signed date, ops owner | CP-02 |
| `openings?status=&clientId=` · `openings/{id}` | opening, team, JD status, posts, stage counts, priority, days in | CP-05, CP-24 |
| `openings/{id}/pipeline` | applications with stage, owner TA, set number, client-owned flag | CP-07, CP-13, CP-14 |
| `openings/{id}/client-sets` · `.../client-sets/{n}` | the client round, its candidates, prepared-CV ids | CP-09 |
| `applications/{id}/prepared-cv` · `cv/{cvUploadId}` | file stream (exists today for CVs) | CP-26 |
| `applications/{id}/offer` · `placements/{id}` | offer and placement with fee snapshot | CP-18, CP-19 |
| `interviews?openingId=` | interview records | CP-15 |
| `reports/active-positions` | the weekly report rows | CP-24 |
| `events?after=` | the events list, oldest first, max 200 | all |

### 4.3 Writes (`POST /integrations/v1/...`), all new

| Endpoint | Does in TA | Needs in TA first |
|---|---|---|
| `clients` (upsert) | create/update client, contacts, **new `opsOwnerId`** | field |
| `clients/{id}/esa` | upsert `esaRecords` (status, fee rule, guarantee days, signed/declined dates) | move `saveEsa` from the web app into Convex |
| `openings` | create from requirement = `ta/openings:create` + brief + team seats | expose the create path to the API |
| `openings/{id}/status` | open / on_hold / filled / closed with reason | move `setOpeningStatus` into Convex |
| `openings/{id}/working-stage` | set a TA's mode (100% / follow-up / add-on) | exists (`setWorkingStage`) |
| `openings/{id}/ad-channel` | record TopJobs/Talent Pulse live/closed on the post | **new fields** on `jobPosts` |
| `cvs` | file a CV to an opening with `source` | reuse partner upload + `cvUploads.source` |
| `client-sets/{roundId}/sent` | mark the round sent/received (today always "held") | small change to `reviewRounds` |
| `applications/{id}/client-decision` | stage move + recorded client reply with reason | reuse `moveStage` + `recordShortlistDecision` |
| `applications/{id}/client-owned` | **new** `clientOwnedAt` + stage move | field |
| `applications/{id}/reference-request` | **new** reference record | table |
| `interviews` · `interviews/{id}` (reschedule, outcome, client-decision) | the interview record, **new `teamsLink`** | move `interviewWrites.ts` into Convex |
| `placements/{id}/details` · `/doj` · `/cancel` · `/left` | package, offer letter, DOJ change with actor, cancel, left date | move `closingWrites.ts` into Convex; **required fields** on Place |
| `notify` | a `notifications` row (bell) for a TA user | exists |

### 4.4 Events (`contractEvents` table in TA, read by Ops)

Written **in the same transaction** as the change, kept 30 days, consumed with a cursor.

`opening.created / updated / closed / jd_approved / working_stage_changed` ·
`jobpost.live / closed` · `application.stage_changed` · `director_round.sent / decided` ·
`client_set.ready` · `interview.booked / confirmed / candidate_out / outcome / feedback` ·
`reference.reported` · `offer.made / accepted / declined` ·
`placement.created / joined / no_show / fell_through` · `candidate.rejection_notice_sent` ·
`notification.for_ops`.

### 4.5 TA rule changes (small, each its own PR)

1. Place requires package, joining date and offer letter; fix the `/placements/{id}` redirect.
2. A reason is required on every reject, hold, decline and drop-out (Director rejections excepted).
3. `closing.ts`: replace "refund or free re-run at once" with the replace-first rule.
4. Follow-up: escalate to the TA after 3 unanswered messages in 24 h; retire the old day-3/5/7 flow.
5. Director set and client set: minimum 5 CVs.
6. Saving an opening's team must not reset working modes; the opening's TA lead must be editable.

## 5. Stages of the build

Each stage ends with something that runs on the laptop against a local TA, with tests. The
stage order follows what depends on what. Times are for two developers (Binath, Sanjeev)
working on both sides; the TA-side blocks are listed where Ops needs them.

| Stage | Builds | Ops modules | TA blocks | Ends with |
|---|---|---|---|---|
| **S0 Set-up** | repo, local backend, local TA, pipeline, test harness | — | Ops key | `npm test` green on an empty backend talking to a local TA |
| **S1 Foundation** | tables, roles, settings, calendar, timers engine, message pipeline, approvals, audit, TA client, events reader, inbox | M1 | reads 4.2, `notify`, events table | An inbox that shows a timer-driven task and a drafted message that sends to a test mailbox |
| **S2 Client onboarding** | leads, duplicate check, banking flag, intro call, ESA document, ESA chase, countersign, negotiation, decline | M2, M3 | `clients`, `clients/{id}/esa` | A new client goes from enquiry to a countersigned ESA with every chase and alert |
| **S3 Hand-over** | requirement meeting, requirement form, impractical loop, **create opening in TA**, 100% day, ad channels | M4, M5 | `openings`, `ad-channel`, `cvs`, TA rule 6 | The position opens in TA from Ops; TopJobs/Talent Pulse CVs land on it with a source |
| **S4 Client side of the search** | client set sending, ownership clock, claims, feedback chase, silence hold, client decisions, pipeline depth, unreported hire | M6, M7 | `client-sets/{id}/sent`, `client-decision`, `client-owned`, `status`, `working-stage`, TA rules 2 and 5 | A client set goes out, decisions come back to TA, depth sets the TA's mode |
| **S5 Interviews** | who schedules, slots, booking, Teams invite, reminders, drop-outs, cancels, attendance, feedback, round decision, reference | M8 | `interviews*`, `reference-request`, Teams consent | An interview is booked in TA from Ops with a Teams link; reminders go out; the round decision reaches TA |
| **S6 Placement to money** | placement intake, same-day notice, DOJ tracking, joining day, no-show options, invoice, payments, late charge, chase, write-off, surcharge | M9, M10 | `placements/*`, TA rule 1 | A placement in TA produces an invoice in Ops on joining day and chases it |
| **S7 Guarantee, reports, close** | guarantee clock, leaver, replace first, 60-working-day clock, refund decision, weekly report, close checklist | M11, M12 | `status` reopen/close, TA rule 3 | A leaver reopens the opening in TA; a clean 90 days closes everything |
| **S8 Hardening** | end-to-end flow tests, load check on the shared server, backups, runbooks, kill switches tested, data import migrations (dry run) | all | — | Ready for staging |
| **S9 Staging and pilot** | staging on the VPS, Ops team walkthrough with test data, fixes, live deploy switched off, one pilot client, switch-on | — | — | Live with one client, then all |

The **UI team** can start on S1's screens as soon as S1's backend queries exist; each later
stage hands over its screen list ([07](07-SCREENS.md)) with the real queries and actions.

---

## 6. Stage S1 · Foundation (M1) in detail

Everything else stands on this. It has no business feature, so it is boring, and it is the
most important stage.

### 6.1 Tables

| Table | Holds | Key fields |
|---|---|---|
| `opsMembers` | who is who in Ops | `clerkUserId`, `taUserId?`, `name`, `email`, `role` (ops_owner · ops_lead · accounts · director_ops · marketing · director_ro · ta_lead_ro), `active`, `phone` |
| `opsSettings` | every business number and switch | `key`, `value`, `updatedBy`, `updatedAt` (seeded with the table in 6.6) |
| `opsHolidays` | Sri Lankan public holidays | `date`, `name` |
| `opsTimers` | one row per running clock | `kind`, `subjectType`, `subjectId`, `startsAt`, `dueAt`, `warnAt?`, `state` (running · done · cancelled · fired), `firedAt?`, `ownerId`, `payload` |
| `opsTasks` | the inbox | `kind` (approve · call · record · decide · remind · escalation), `title`, `body`, `assigneeId`, `clientId?`, `openingTaId?`, `dueAt`, `priority`, `state` (open · done · dismissed), `link`, `source` (timer id or event id) |
| `opsMessages` | every outbound message | `channel` (email · whatsapp · group_post · internal), `to`, `cc`, `subject`, `body`, `templateKey`, `clientId?`, `subjectType/Id`, `state` (draft · approved · queued · sent · failed · blocked), `approvedBy/At`, `sentAt`, `providerId`, `error?`, `threadKey` |
| `opsInbound` | every inbound client message | `channel`, `from`, `receivedAt`, `subject`, `body`, `attachments`, `threadKey`, `matchedClientId?`, `matchedSubject?`, `readState`, `aiSummary?` |
| `opsEvents` | cursor + copy of consumed TA events | `taEventId`, `type`, `payload`, `consumedAt`, `handled`, `error?` |
| `opsAudit` | who did what | `actorId`, `action`, `subjectType/Id`, `before`, `after`, `at`, `reason?` |
| `opsFiles` | file registry | `kind`, `r2Key`, `name`, `size`, `subjectType/Id`, `uploadedBy`, `uploadedAt` |
| `opsTemplates` | message and document templates | `key`, `channel`, `subject`, `body` with `{{placeholders}}`, `metaTemplateName?`, `approvedForAuto` (bool), `version` |

### 6.2 Roles and what they may do

| Capability | ops_owner | ops_lead | accounts | director_ops | marketing |
|---|---|---|---|---|---|
| see own clients / all clients | own (⚪ or all) | all | all (read) | all (read) | — |
| leads, intro calls, ESA, requirement | own | all | — | — | — |
| approve client messages | own | all | invoices only | — | — |
| move a client to another owner | — | yes | — | — | — |
| client sets, decisions, interviews | own | all | — | — | — |
| placements follow-up, DOJ | own | all | read | — | — |
| invoices, payments, write-off | — | — | yes | — | — |
| refund decision | — | — | — | yes | — |
| TopJobs, Talent Pulse | request | all | — | — | yes |
| settings, templates, holidays, switches | — | yes | — | — | — |

The Director (Mr Azeem) and the TA lead get read access to what concerns them (countersign
tasks; client and requirement details) through `director_ro` / `ta_lead_ro`.

### 6.3 The timers engine (one engine for every clock)

- `startTimer(kind, subject, from, {days | workingDays | hours}, warnBefore?)` computes `dueAt`
  with the calendar helper (Colombo time, working days skip weekends and `opsHolidays`).
- A cron every minute takes due timers in batches of 50 (cursor, kill switch
  `OPS_TIMERS_ENABLED`), marks them `fired`, and runs the kind's handler: create a task,
  draft a message, change a state, or raise an alert.
- `cancelTimer(subject, kind)` whenever the thing it waits for happens (a reply, a signature,
  a payment).
- Every kind is a named rule with its number in `opsSettings`:

| Kind | From | Length | Fires |
|---|---|---|---|
| `esa.send` | intro call held | 2 h | late-send alert |
| `esa.chase.n` | ESA sent / last chase | per step (settings: 2d, 2d, 3d, 2d, 3d) | next chase draft |
| `esa.decline` | ESA sent | 14 calendar days | decline task |
| `esa.countersign` | signed received | 1 day | reminder to Director |
| `meeting.rebook` | not held | daily | rebook reminder; 3rd → close |
| `set.due` | ESA signed | 7 / 14 days | overdue alert |
| `set.ownership` | receipt date | 7 working days (warn at 5) | window closes |
| `feedback.chase` | receipt date | 1 day | chase draft |
| `feedback.call` | chase sent | 1 day | call task |
| `silence.hold` | profiles shared | 14 calendar days | inactive notice draft → hold |
| `hire.unreported` | set sent | 3 months | surcharge draft |
| `interview.reconfirm` | booked | day before, 09:00 | reconfirm messages |
| `interview.report` | client books | 2 days | reminder to client |
| `offer.silent` | offer made | ⚪ (settings) | task |
| `doj.remind` | placement | 7 / 1 days before | reminders |
| `doj.join` | joining date | 09:00 that day | join check |
| `invoice.due` | invoice sent | 30 days | chase draft |
| `invoice.chase` | chase sent | 30 days | next chase, +5% |
| `invoice.writeoff` | invoice sent | ~60 days | write-off task |
| `guarantee.warn` | joined | day 75 (⚪) | warning |
| `guarantee.end` | joined | 90 days | clean end |
| `replacement.deadline` | left | 60 working days | Director of Ops task |

### 6.4 The message pipeline (one way out for every message)

```
draft (template + data) → [AI polish optional] → opsMessages.state=draft → task "approve"
→ approved by a person (or approvedForAuto template) → queued → sender → sent / failed
```

- **Senders:** `email` via Graph `sendMail` from the Ops mailbox (per-owner `from`
  when configured); `whatsapp` via Meta Cloud API with an approved template outside the 24 h
  window, free text inside it; `group_post` creates a task with the text to copy;
  `internal` writes an Ops task and, for TA users, calls `notify`.
- **Safety gate** (copied from TA's `outreachSafety` + `outboundGuard` idea): `OPS_OUTREACH_LIVE`
  off → every external recipient is replaced by the test recipient list and the message is
  marked `blocked:test_mode`; a do-not-contact list; a per-client daily cap; every send logged.
- **Threading:** every email carries a reference `[C141-OPS-<clientId>-<subjectId>]` in the
  subject so replies match without guesswork (lesson from TA).

### 6.5 Reading what comes back

- **Mail reader:** Graph delta query on each Ops mailbox every 2 minutes, batches of 25,
  cursor stored, stall alert if no run for 15 minutes (lesson from the 18-day gap). Each mail
  becomes an `opsInbound` row, matched by the reference, else by sender domain → client, else
  left for a person to file.
- **WhatsApp webhook:** Meta sends messages to `/api/whatsapp/ops` (signature checked);
  matched by phone number → client contact.
- **AI read:** for a matched inbound tied to a client set, the AI proposes "shortlisted:
  A, B; rejected: C (reason)"; for an ESA thread, "signed / wants changes / declined"; a
  person confirms before anything is written (section 8).
- **Any reply stops the chase** for that subject: the reader cancels the chase timer.

### 6.6 Settings seeded on day one

`esa.sendHours=2` · `esa.chaseDays=[2,2,3,2,3]` · `esa.declineDays=14` · `esa.countersignDays=1` ·
`meeting.maxRebooks=3` · `set.minCvs=5` · `set.dueDays=[7,14]` · `set.ownershipWorkingDays=7` ·
`feedback.chaseDays=1` · `feedback.stopAfterSilentDays=4` · `silence.holdDays=14` ·
`depth.addOnAtPending=3` · `depth.holdAtShortlisted=5` · `interview.dropoutNoticeHours=[24,3]` ·
`hire.unreportedMonths=3` · `hire.surchargePct=50` · `invoice.dueDays=30` ·
`invoice.latePctPerMonth=5` · `invoice.compounded=⚪` · `invoice.writeOffDays=60` ·
`guarantee.days=90` · `guarantee.warnDay=⚪75` · `replacement.workingDays=60` ·
`refund.pct=25` · `topjobs.closeDays=14` · `linkedin.minCvsPerDay=20` ·
`talentpulse.listDay=Tue` · `talentpulse.postDay=Wed` · `OPS_OUTREACH_LIVE=off` ·
`OPS_TIMERS_ENABLED=on` · `OPS_TA_WRITES_ENABLED=off` · `testRecipients=[…]`.

### 6.7 The TA client and the events reader

- `lib/ta/client.ts`: typed functions for every endpoint in section 4, with the Ops key from
  the environment, retries on network errors, never on 4xx, and `idempotencyKey` on writes.
  All writes are blocked while `OPS_TA_WRITES_ENABLED=off` (they are logged as "would send").
- `jobs/taEvents.ts`: every minute, `GET events?after=<cursor>`, batches of 200, each event
  stored in `opsEvents` and dispatched to a handler; the cursor moves only after the batch is
  handled; failures keep the cursor and alert after 3 tries.
- Ops screens read TA data live through the client (cached for 30 s), never from copies.

### 6.8 The inbox (the home page's engine)

`opsTasks` is what the home page shows. Queries: `inbox.forMe` (open tasks, due today first),
`inbox.approvals` (messages in `draft` for my clients), `inbox.late` (past due),
`inbox.timers` (clocks ending in 48 h). Actions: `task.done`, `task.snooze`, `task.reassign`,
`task.recordOutcome` (the "record what happened" form for every traditional step).

### 6.9 Done means

Tests for the calendar (holidays, weekends), every timer kind (start, warn, fire, cancel),
the pipeline (draft → approve → send → blocked in test mode), the mail reader (match by
reference, by domain, unmatched), the events reader (cursor, retry), and roles. A fake TA
(recorded responses) runs the whole thing on the laptop.

---

## 7. Stage S2 · Client onboarding (M2 Leads, M3 ESA)

### 7.1 Tables

| Table | Key fields |
|---|---|
| `opsLeads` | `source` (website · whatsapp · call · email · referral), `companyName`, `contactName`, `contactEmail`, `contactPhone`, `industry`, `bankingFinanceFlag`, `notes`, `ownerId`, `clientTaId?` (after linking/creating), `state` (new · intro_call · held · esa · requirement · closed), `closedReason?`, `inviteBackAt?`, `createdBy`, `createdAt` |
| `opsMeetings` | `kind` (intro · requirement · negotiation), `leadId`/`clientId`, `at`, `attendees`, `link?`, `state` (booked · held · not_held · cancelled), `rebookCount`, `outcomeNotes`, `packageNotes`, `roleNotes`, `briefNotes` |
| `opsEsa` | `clientTaId`, `leadId`, `templateVersion`, `fields` (company, address, tax no, signatory, email, feeRule, guaranteeDays, paymentDays), `state` (draft · sent · chasing · negotiating · signed · countersigned · declined · expired), `sentAt`, `chaseStep`, `signedFileId?`, `countersignedFileId?`, `declineReason?`, `history[]` |

### 7.2 Flow, in system terms

1. **Lead in.** Website webhook or hello@ reader creates `opsLeads` (state `new`); the Ops lead
   or the system assigns `ownerId` (round-robin by default, settings); task "new lead" to the
   owner.
2. **Duplicate check.** `GET clients?name=` on TA with the name key; exact → link
   (`clientTaId`); close match → the owner picks "same" or "new".
3. **Banking/finance.** AI flags from company name and website; the owner confirms; decline
   template drafted → approved → sent; lead `closed`, reason "industry"; `doNotInvite=true`.
4. **ESA lookup.** TA `clients/{id}` → `esaSignedAt` present → lead goes to `requirement`;
   returning client without ESA → `opsEsa` created from the old agreement's fields, state
   `sent` again, chase starts; new client → intro call.
5. **Intro call.** `opsMeetings` kind intro; invite to the TA lead (`notify` + email); not
   held → rebook task, `rebookCount++`; 3 with no reply → lead closed, reason "silent". Held →
   the owner fills package, role, brief (visible to the TA lead through `notify` and later
   as the opening's brief).
6. **ESA document.** Template DOCX from `opsTemplates` filled with `opsEsa.fields` → PDF
   (LibreOffice) → `opsFiles`. Blank required field → cannot send. Timer `esa.send` from the
   intro call; the owner approves; email with the PDF; state `sent`; timers `esa.chase.1`
   and `esa.decline` start.
7. **Chase.** Each `esa.chase.n` drafts the next message (email/WhatsApp alternating) for
   approval; after email 3, task "final call" to Rushda (member with flag `esaCaller`). Any
   inbound matched to the thread cancels the chase.
8. **Reply.** AI classifies: signed (attachment) → owner uploads/confirms the signed file;
   wants changes → `opsMeetings` kind negotiation; terms edited → back to approve and resend;
   declined → state `declined`, reason, TA `clients/{id}/esa` status `declined`.
9. **Signed.** `opsEsa.signed`, internal notice to ops, TA lead and Director; TA
   `clients/{id}/esa` with status, fee rule, guarantee days; timer `esa.countersign`; task to
   the Director; one reminder; countersigned scan uploaded → copy emailed to the client; lead
   → `requirement`.
10. **Declined / expired.** `esa.decline` fires at 14 days → task "declare declined" (a person
    confirms) → TA ESA status `declined` (TA refuses to open a search); lead closed.

### 7.3 Messages (templates)

`lead.decline.industry` (email, auto-approved? ⚪ no: approved) · `esa.cover` (email+PDF) ·
`esa.chase.email.1/2/3` · `esa.chase.wa.1/2` (Meta template) · `esa.countersign.reminder`
(internal) · `esa.countersigned.cover` (email+PDF) · `meeting.invite` · `meeting.rebook.1/2/3` ·
`role.impractical.reply`.

### 7.4 Problems this stage solves

ESA chasing and countersigning late and by hand; nobody owning a lead; banking/finance
leads handled inconsistently; the brief living in the TA lead's head.

---

## 8. Stage S3 · Hand-over to TA and adverts (M4 Requirement, M5 Adverts)

### 8.1 Tables

| Table | Key fields |
|---|---|
| `opsRequirements` | `clientTaId`, `leadId`, `meetingId`, `title`, `jdNotes`, `keyInsights`, `salaryMin/Max`, `currency`, `location`, `level`, `headcount`, `nationality`, `workLocations[]`, `practical` (bool), `impracticalReason?`, `inviteBackAt?`, `openingTaId?`, `state` (draft · saved · opened · declined) |
| `opsAdChannels` | `openingTaId`, `channel` (topjobs · talentpulse · linkedin), `state` (requested · flyer · sent · live · closed), `requestedBy`, `flyerFileId?`, `cost?`, `liveAt?`, `closeAt?`, `trackedLink?`, `cvCount` |
| `opsTalentPulseIssues` | `weekOf`, `openingTaIds[]`, `briefByOpening`, `state` (compiled · posted), `postedAt` |

### 8.2 Flow

1. **Requirement meeting.** `opsMeetings` kind requirement with the TA lead; reminder; not
   held → daily rebook reminder; 3 silent → lead closed, no opening.
2. **Form.** The owner fills `opsRequirements`; "practical?" tick; impractical → reason,
   polite reply (approved), `inviteBackAt` → timer → task → new lead when it fires.
3. **Create opening in TA.** Button → `POST openings` with client, title, country,
   nationality, work locations, brief (= jdNotes + keyInsights + salary + level), headcount,
   `requestedTaLeadId`. TA returns `openingId`; stored. TA lead picks TAs and 100% day in
   TA as today; the bell is TA's. ⚪ one or up to five 100% positions per day.
4. **Watch the opening.** Events `opening.*`, `jobpost.*` update the Ops view (JD approved,
   LinkedIn live); alert to the owner if the JD is unapproved after 1 day (TA's alert, shown
   in Ops through `notification.for_ops`).
5. **TopJobs.** TA or owner requests → task to marketing (flyer) → marketing uploads →
   owner sends to TopJobs by email (drafted) → "live" recorded with date → timer 14 days →
   closed → TA `openings/{id}/ad-channel`. CVs that arrive by email from TopJobs: the Ops
   mail reader files them to TA with `POST cvs` and `source=topjobs`.
6. **Talent Pulse.** Every Tuesday a job compiles open roles (TA `openings?status=open`)
   with each TA's one-line brief (requested by task) → marketing posts Wednesday → "posted"
   recorded. One tracked apply link per role (⚪) → inbound CVs filed with `source=talentpulse`.

### 8.3 Problems solved

The requirement lives in the system; the opening is created from it without retyping;
TopJobs and Talent Pulse news stop being passed by hand; CV sources are known.

---

## 9. Stage S4 · The client side of the search (M6 Client sets, M7 Decisions)

### 9.1 Tables

| Table | Key fields |
|---|---|
| `opsClientSets` | `openingTaId`, `roundIdTa`, `setNumber`, `candidates[] {appIdTa, name, cvFileRef}`, `state` (ready · approved · sent · received · closed), `dueAt`, `sentAt`, `receivedAt`, `messageId`, `groupPostTaskId?` |
| `opsOwnershipClaims` | `setId`, `appIdTa`, `claimedAt`, `withinWindow`, `decision` (dropped · refused), `by` |
| `opsClientDecisions` | `setId`, `appIdTa`, `decision` (shortlisted · rejected), `reason`, `source` (email · whatsapp · call), `inboundId?`, `confirmedBy`, `sentToTaAt` |
| `opsHolds` | `openingTaId`, `startedAt`, `reason`, `noticeMessageId`, `liftedAt?`, `closedAt?` |
| `opsUnreportedHires` | `setId`, `flaggedAt`, `surchargeInvoiceId?` |

### 9.2 Flow

1. **Set ready** (event `client_set.ready`) → `opsClientSets` row; the owner sees candidates
   and prepared CVs (TA files); minimum 5 enforced by TA (TA rule 5); due date from the ESA
   (timer `set.due`).
2. **Send.** Email drafted with the CVs attached (prepared-CV PDFs fetched from TA, stored
   once in `opsFiles`); approved; sent; `receivedAt` = sent date unless the owner edits it;
   TA `client-sets/{id}/sent`. First set for a new client → task "create WhatsApp group" and a
   drafted group post.
3. **Ownership.** Timer `set.ownership` (7 working days, warn at 5). Claim → owner records
   it → within window → `POST client-owned` (TA drops the candidate from this opening,
   stage with reason) ; after → "refused" reply drafted.
4. **Feedback.** Timers `feedback.chase` → chase drafted (email + WhatsApp template) → sent;
   `feedback.call` → call task; still silent → counts silent days; `silence.hold` at 14 days
   → inactive notice drafted → approved → sent → `opsHolds` + TA `status on_hold` with reason;
   any client reply lifts the hold (`status open`) and restarts the feedback timer; ⚪ hold
   limit → close.
5. **Decisions.** Inbound matched to the set → AI proposal → owner confirms per candidate
   with reason → `POST client-decision` (TA moves the stage, records the reply, sends the
   rejection template itself) → TA tells the TA (bell, by TA).
6. **Depth.** After each decision, read `openings/{id}/pipeline`: pending (client shortlist
   not yet interviewed) ≤ 3 → `working-stage add_on` for the primary TA + `notify`; total
   shortlisted ≥ 5 → `working-stage monitor` (⚪ TA needs a monitor mode or uses hold) and
   LinkedIn close prompt; drops below 5 → back to follow-up, resume sending.
7. **Unreported hire.** Timer `hire.unreported` (3 months from send) → owner confirms →
   surcharge invoice (stage S6's invoice engine) at 50%.

### 9.3 Problems solved

The client round is actually sent (today it is saved as "held" and never emailed); the 7-day
ownership rule is counted; clients are chased on time; silence has one rule; the TA hears
every client decision without a phone call.

---

## 10. Stage S5 · Interviews (M8)

### 10.1 Tables

| Table | Key fields |
|---|---|
| `opsInterviews` | `interviewIdTa`, `openingTaId`, `appIdTa`, `scheduler` (us · client), `round`, `slotsOffered[]`, `slotsFromClient[]`, `agreedAt?`, `mode` (teams · onsite · phone · zoom), `teamsLink?`, `calendarEventId?`, `state` (slots · booked · reconfirmed · held · no_show · cancelled · rescheduled), `attendanceBy`, `clientFeedbackMessageId?`, `roundDecision?` |
| `opsReferenceRequests` | `appIdTa`, `requestedAt`, `reportedAt?`, `reportText`, `clientDecision` (cleared · dropped) |

### 10.2 Flow

1. **Who schedules.** Owner picks. **We schedule:** message to the client asking for slots
   (drafted); inbound slots recorded; TA checks with the candidate (task to the TA via
   `notify`, result recorded by the TA in TA → event `interview.confirmed`, or by Ops); no fit
   → new slots; 3 unanswered → TA alerted, back-up. **Client books:** the client contacts the
   candidate; timer `interview.report`; the owner records the date.
2. **Book.** `POST interviews` (TA record: time, round, mode, interviewers) → Graph:
   create a calendar event with a Teams online meeting from the Ops mailbox, attendees = the
   client's interviewers (and the Ops owner); the link saved on the TA record (`teamsLink`).
   Fallback without consent: the owner pastes a Teams/Zoom link by hand; the email invite is
   still drafted and sent by the pipeline. TA alerted (`notify`); TA invites the candidate
   through its own channels.
3. **Reminders.** Timer `interview.reconfirm` the day before 09:00 → client reminder (email)
   and, through TA, the candidate reconfirm (TA's own message); no candidate reply → event →
   call task to the TA.
4. **Changes.** Candidate out (event `interview.candidate_out`) → client notice drafted (≥ 1
   day or 3 h rule checked against the slot) → approved → sent; TA picks a back-up. Client
   cancels (inbound) → `POST interviews/{id}` reschedule/cancel → TA told → new slot.
5. **After.** Owner ticks attendance (`outcome`); TA logs candidate feedback after 5 PM (TA);
   client feedback message drafted for WhatsApp → approved → sent; round decision recorded
   → `POST interviews/{id}/client-decision` (next round / rejected with reason / selected).
6. **Reference.** Only on the client's request: `POST reference-request`; TA phones, reports
   (event `reference.reported`); owner relays to the client; client clears or drops →
   decision recorded.

### 10.3 Problems solved

Interview times agreed over dozens of messages; reschedules reaching Ops late; nobody
reminding; no record of attendance.

---

## 11. Stage S6 · Placement to money (M9 Placement, M10 Invoices)

### 11.1 Tables

| Table | Key fields |
|---|---|
| `opsPlacements` | `placementIdTa`, `openingTaId`, `appIdTa`, `clientTaId`, `candidateName`, `package`, `currency`, `doj`, `dojHistory[] {from, to, by, at, reason}`, `offerLetterFileRef`, `state` (placed · joined · no_show · cancelled · left), `joinedAt?`, `leftAt?`, `isReplacementOf?`, `feeRule` (snapshot from ESA), `guaranteeId?` |
| `opsInvoices` | `number` (series `C141-OPS-YYYY-NNNN`), `placementId`, `clientTaId`, `kind` (fee · surcharge · late_charge), `amount`, `currency`, `tax`, `issuedAt`, `dueAt`, `state` (draft · approved · sent · paid · partly_paid · written_off), `fileId`, `lateMonths`, `history[]` |
| `opsPayments` | `invoiceId`, `amount`, `paidAt`, `method`, `recordedBy`, `note` |

### 11.2 Flow

1. **Placement made** (event `placement.created` with package, DOJ, offer letter from TA's
   required fields) → `opsPlacements`; **same-day notice** to Asma (accounts) and the owner
   (internal + email); the fee rule snapshot from the ESA.
2. **DOJ.** Timers `doj.remind`; date moves recorded with who/why → `POST placements/{id}/doj`;
   candidate lost → `cancel` → TA reopens the offer flow (TA).
3. **Joining day.** 09:00 task "confirm joined" to the TA (via `notify`) and the owner; TA
   confirms in TA (event `placement.joined`) or the owner records it. Not joined → no-show →
   client options message drafted (replace or stop) → approved → sent; replace → opening
   stays open in TA; stop → close (S7). Nothing invoiced.
4. **Invoice.** On `joined` and `isReplacementOf` empty → invoice drafted from `feeRule`
   (months of gross × package, or basic, or 2 months for a non-Sri-Lankan: all from the ESA
   fields) → PDF from the invoice template → Accounts approves → emailed to the client's
   billing contact; `dueAt` = joined + 30 days; timer `invoice.due`.
5. **Payment.** Accounts records `opsPayments`; full → `paid`, fee collected notice to the
   owner and Asma; TA shows "fee paid" through `opsForTa`-style read later (⚪ optional).
6. **Chase.** `invoice.due` → chase drafted with late charge (5% per unpaid month, simple or
   compounded per settings) → Accounts approves → sent; repeats monthly; at ~60 days → task
   "write off?" → Accounts decides → `written_off` → guarantee void → TA `status closed`.
7. **Surcharge.** From S4's unreported hire → `kind=surcharge` invoice, 50% of the fee rule
   on the estimated package (⚪ basis) → same approve/send; ⚪ chase path.
8. **Export.** CSV of invoices and payments (no accounting tool yet).

### 11.3 Problems solved

Asma learning about joinings months late; invoices going out two months late; late charges
never applied; no list of what is owed.

---

## 12. Stage S7 · Guarantee, reports and close (M11, M12)

### 12.1 Tables

| Table | Key fields |
|---|---|
| `opsGuarantees` | `placementId`, `startsAt` (joined), `endsAt` (+90 days), `state` (running · ended_clean · leaver · replaced · refunded · void), `feePaidAt?`, `leftAt?`, `replacementDeadlineAt?`, `replacementPlacementId?`, `refundDecision? {by, at, pct, reason}` |
| `opsReports` | `kind` (weekly_active_positions), `weekOf`, `rows`, `state` (built · reviewed · sent), `sentAt`, `fileId` |
| `opsCloseChecklists` | `openingTaId`, `items {linkedinClosed, topjobsClosed, openingClosed, leadClosed}`, `completedAt` |

### 12.2 Flow

1. **Start.** On `joined` → `opsGuarantees` running for **every** hire (replacement included,
   no new invoice); timers `guarantee.end`, ⚪ `guarantee.warn`.
2. **Clean end.** Day 90, nobody left → `ended_clean` → close checklist (step 5).
3. **Leaver.** Owner records `left` (or event `placement.fell_through`) → `POST
   placements/{id}/left`; fee not fully paid → `void` → close; fee paid → **replace first**:
   `POST openings/{id}/status open` with reason "replacement", TA told; timer
   `replacement.deadline` 60 working days.
4. **Replacement or refund.** A new placement on the same opening with `isReplacementOf` →
   `replaced`, new guarantee, no invoice. Deadline fires → task to the Director of
   Operations → decision form (25% refund, reason) → `refunded` → credit note drafted
   (Accounts) → close; client flagged `doNotContact` if the owner says so.
5. **Close checklist.** On clean end, refund, write-off or "client stops": tasks "close
   LinkedIn" (TA, via `notify`), "close TopJobs" (owner), `POST openings/{id}/status closed`
   (TA closes posts), lead closed. All ticked → `completedAt`.
6. **Weekly report.** Monday 08:00 job: `GET reports/active-positions` + Ops states (ESA,
   sets, holds, placements, guarantees) → `opsReports` built → task to the TA lead to review
   → approve → emailed to Mr Azeem.

### 12.3 Problems solved

Guarantee dates worked out by hand or not at all; refunds offered at once against the ESA;
positions never formally closed; the weekly report compiled by hand.

---

## 13. The home page and the screens (for the UI team)

### 13.1 Home page = the Ops inbox

| Block | Shows | Backend |
|---|---|---|
| **Today** | tasks due today for me, grouped: calls, approvals, record-outcome, decisions | `inbox.forMe` |
| **Waiting for my approval** | drafted messages with a preview, one-click approve/edit | `inbox.approvals` + `message.approve/edit` |
| **Late** | anything past due, red | `inbox.late` |
| **Clocks ending soon** | ownership windows, invoices, guarantees ending in 48 h | `inbox.timers` |
| **My clients** | each client with its stage (lead · ESA · searching · interviews · placed · guarantee) and the next action | `clients.mine` (Ops + TA reads) |
| **From the TA System** | new events that concern me: set ready, placement made, candidate out | `opsEvents` for my clients |
| **Quick actions** | new lead · record a call · book a meeting · create opening in TA | the actions |
| **Switches (lead only)** | outreach live/test, timers on/off, TA writes on/off | `settings.switches` |

### 13.2 The other screens

Leads · Clients and ESA · Requirement and hand-over · Client sets and messages · Client
decisions · Interviews and calendar · Placements and joining · Invoices and payments ·
Guarantees · Adverts · Reports · Settings, as in [07](07-SCREENS.md), each backed by the
tables above. Every screen that shows TA data (opening, candidates, interview, placement)
shows it **read-only, live from TA**, with a "open in TA System" link.

### 13.3 How TA users see Ops

TA users keep their own system. They get: bells (`notify`) for everything that concerns
them; and later, read-only ESA status, ops owner, client-set state and guarantee state on
the TA opening page, through a small read endpoint Ops exposes to TA (`opsForTa`).

---

## 14. Integrations, one by one

| Integration | What is set up | Who | Lead time |
|---|---|---|---|
| **Microsoft 365 mail** | Ops mailboxes created; the existing Graph app given `Mail.Send` and `Mail.Read` on them (application permissions, scoped with an access policy to the Ops mailboxes only) | IT admin / owner | days |
| **Microsoft calendar + Teams** | `Calendars.ReadWrite` + `OnlineMeetings.ReadWrite.All` with admin consent, application access policy to the Ops mailbox | IT admin | **weeks** (start now) |
| **Zoom (optional)** | not needed if Teams works; otherwise a Zoom server-to-server app to create meetings | owner's choice | days |
| **Meta WhatsApp** | an Ops WABA phone number (or one of the 8 existing), templates submitted: `esa_chase`, `feedback_chase`, `inactive_notice`, `interview_notice`, `drop_out_notice`, `payment_chase`; webhook to the Ops backend | owner | 1-2 days per template |
| **Website form** | the web agency posts the form to `/api/leads/website` with a shared secret, or forwards to hello@ | website owner | days |
| **Cloudflare R2** | bucket `c141-ops`, keys in the Ops `.env` only | Sanjeev + owner | hours |
| **LibreOffice** | in the Ops Docker image, as TA's | Sanjeev | hours |
| **Clerk** | the TA instance; Ops app added as an allowed origin; roles in `opsMembers` | Sanjeev + owner | hours |
| **AI** | OpenRouter/Anthropic keys in the Ops `.env`; the same routing idea as TA | Sanjeev | hours |
| **TA API** | `OPS_API_TOKEN` set in TA through the pipeline; endpoints of section 4 | TA team + owner | per stage |

## 15. Data: what exists today and comes in

| Today | Into | How |
|---|---|---|
| TA `clients` (40 on staging data; live count to check) | `opsOwnerId` per client (TA field) | migration in TA, dry run first; a sheet from Asma says who owns whom |
| TA `esaRecords` (dormant) + signed agreements in Outlook/files | `opsEsa` (signed, with fee rule) | import script with dry run; scans uploaded by Ops |
| TA `placements` with join dates inside 90 days | `opsPlacements` + `opsGuarantees` | import, dry run |
| The master / client / interview sheets | ⚪ import or start clean | owner's decision (question 18) |
| Holidays | `opsHolidays` | one CSV, maintained in Settings |

## 16. Testing, release, operations

- **Tests:** unit tests for every timer, rule and template; flow tests that walk every branch
  of the diagram ([14](14-DIAGRAM-DEEP-WALKTHROUGH.md)) against a fake TA; contract tests on
  both sides from one shared API document; type checks for app and backend.
- **Release:** CI on every pull request (tests, type checks); `main` → `production` by the
  owner, as in TA; Docker image built by the pipeline; `docker-compose.yml` in `deploy/production/`.
- **Live:** Ops containers in `/opt/ops-prod`, database `convex_ops`, names
  `ops.career141.com` / `ops-api.career141.com`, firewall rules, backups (Postgres dump nightly,
  including `convex_ops`), a backup before every live step.
- **Switches on day one:** `OPS_OUTREACH_LIVE=off`, `OPS_TA_WRITES_ENABLED=off`,
  `OPS_TIMERS_ENABLED=on`. Pilot: one client, both switches on for that client only
  (`pilotClientIds` in settings), watched for two weeks, then all.
- **Runbooks:** "a message went to the wrong person", "the mail reader stalled", "TA API is
  down" (Ops keeps working; writes queue and retry), "pause Ops" (two switches), "restore".

## 17. Risks and how the plan handles them

| Risk | Handling |
|---|---|
| Microsoft consent for Teams arrives late | Interviews work with a pasted link; invites still go by the pipeline |
| WhatsApp templates rejected | Email path for every message; templates resubmitted |
| TA-side blocks slip | Ops stages S2 and S3 only need reads + `clients`/`esa`/`openings`; later stages are built against the fake TA and switched on when TA lands |
| Shared server load | Batched jobs, own switches, memory check before go-live; Ops Postgres database can move out |
| Double-editing clients (TA leads in TA, Ops in Ops) | Ops reads the latest before every write; ⚪ decide whether TA keeps client editing |
| A message reaching a real client in test | Safety gate with test recipients; `OPS_OUTREACH_LIVE` only by the owner |
| The Ops team not using the system | Every traditional step has a one-line "record what happened"; the inbox is the only page they must open |

## 18. Questions to settle before building (all also in [09](09-DECISIONS-AND-QUESTIONS.md))

1. Same Clerk accounts as TA? Who holds which Ops role? Own clients or all clients per owner?
2. Which Ops mailboxes (one shared `ops@`, or one per owner)?
3. Teams (needs consent) or Zoom, or links pasted by hand to start?
4. WhatsApp: a new Ops number or one of the existing eight; which templates first?
5. Website form: webhook or hello@?
6. ESA: scan and upload, or e-signature now?
7. One or up to five 100% positions per TA per day?
8. TA "monitor" mode for the hold-at-five rule: a new mode, or on_hold?
9. Invoice: numbering, tax, currency, bank details, simple or compounded 5%, surcharge basis.
10. Hold limit, offer-silent timeout, day-75 warning, replace-or-stop deadline, escalations after single reminders.
11. Import the sheets or start clean?
12. Rebuild staging or pilot with one client?

## 19. What "finished" looks like

- [ ] Every row of [14](14-DIAGRAM-DEEP-WALKTHROUGH.md) has a backend function, a timer or a recorded manual step behind it.
- [ ] Every message in section 7-12 has a template, an approval path and a test.
- [ ] Every connection point CP-01..CP-26 has an endpoint or event on the TA side and a client call or handler on the Ops side, with a contract test.
- [ ] The Ops team walks the whole flow on staging with test data and signs off.
- [ ] One pilot client runs live for two weeks with no message sent that a person did not approve.
