# Ops System: project report and one-week timeline

| | |
|---|---|
| Project | Ops system for Career 141, integrated with the TA System (recruiter system) |
| Report date | Tuesday 27 Oct 2026 (end of Day 1) |
| Time box | 1 week: Day 1 Tue 27 Oct to Day 7 Mon 2 Nov 2026 |
| Status | Phase 1 complete. Phase 2 starts Wed 28 Oct |
| Companion documents | `docs/ops/OPS-TA-CONNECTIONS.md` (connection points, merged); planning notes in the `/ops` and `/ta-system-full-flow` skills |

---

## 1. Summary
- **The Ops system** covers the client side of the business. It runs from a client enquiry through the client agreement (ESA), the requirement meeting, client CV sets, interview scheduling, placement and invoice, to the end of the 90-day guarantee.
- **The TA System is live** (since 21 Sep, 78,000+ candidates). It covers the recruiter side: openings, candidates, follow-up, Director review, interviews, offers and placements.
- **How they fit:** the two systems share one backend but are built and run by two teams.
- **The plan:** Phase 1 (understand both flows, find the connection points, decide the architecture) was completed today. The rest of the week identifies the technology for every Ops feature, then builds, tests and deploys the whole Ops backend.
- **The UI comes after:** the Ops UI is designed and built later by the UI team, from the feature list this project hands over.

---

## 2. Phases at a glance
| Phase | Days | Goal | Output | Status |
|---|---|---|---|---|
| **1. Flows, connection points, architecture** | Day 1 (Tue 27 Oct) | Understand the TA flow and the Ops flow; find every point where they connect; decide the backend shape | TA and Ops flow knowledge; 26 connection points; architecture decision | **Done** |
| **2. Technology solutions** | Day 2 (Wed 28 Oct) | A proven technical solution for every Ops feature before building; external approvals requested | Technology decision table (section 5); permission and template requests sent | Next |
| **3. Backend build** | Days 3-6 (Thu 29 Oct to Sun 1 Nov) | The whole Ops backend: tables, contract with TA, flows, timers, integrations, tests | Ops backend in the repo, all tests passing, behind switches (off) | Planned |
| **4. Deploy + UI handover** | Day 7 (Mon 2 Nov) | Deploy the Ops backend with the TA backend; hand the UI team the feature list | Ops backend live but switched off; UI feature list | Planned |
| After the week | from Tue 3 Nov | UI built by the UI team, then team approval, a pilot and switch-on | Working Ops system | Later |

Days 5 and 6 fall on Saturday and Sunday. If the team does not work weekends, Phase 3 runs Thu 29 Oct to Tue 3 Nov and Phase 4 is Wed 4 Nov.

---

## 3. Phase 1 results (done, Day 1)

### 3.1 TA System flow: understood
- **Source:** all 937 commits (14 Sep to 27 Oct) and the code on `main`.
- **Architecture:** Next.js 16 app plus a self-hosted Convex backend and database (116 tables), Qdrant vectors, Cloudflare R2 files, Microsoft Graph mail, Meta WhatsApp, Clerk sign-in.
- **Features documented in detail:** openings, follow-up, scoops, sets and shortlists, Director Review, EOD and midday emails, workday, CV extraction, email intake, database search, Excel Tables and headhunting, strategy planner, voice agent.
- **Checked facts that matter for Ops:**
  - interview scheduling already exists (records, reschedules, attendance, alerts), but has no calendar invites or Teams links;
  - ESA records exist but no screen uses them;
  - placements already snapshot fee and guarantee terms;
  - the client CV set is built but never emailed (saved as "held");
  - the Place button sends the TA to a page that does not exist;
  - Ops staff cannot create clients today.

### 3.2 Ops flow: understood
- **Source:** the owner's planning canvas, 59 cards and about 880 steps across 12 diagrams. The final business flow is locked; the latest system flow has 250 steps.
- **The flow:**
  1. Lead in.
  2. Banking/finance check and duplicate-client check.
  3. Intro call.
  4. ESA: drafted within 1-2 h, chased, countersigned in 1 day, declined after 14 days.
  5. Requirement meeting.
  6. Opening created for a TA.
  7. Adverts: LinkedIn, TopJobs, Talent Pulse.
  8. Client CV sets: minimum 5 CVs, 7-working-day CV ownership.
  9. Client feedback chase, and hold when the client is silent.
  10. Pipeline depth: add-on at 3 or fewer pending, hold at 5 shortlisted.
  11. Interview scheduling.
  12. Reference check, only if the client asks.
  13. Offer and placement.
  14. Joining day.
  15. Invoice (due 30 days, 5% per month late) and payment chase.
  16. 90-day guarantee: replace first, 25% refund after 60 working days.
  17. Close.
- **Rule conflicts:** 17 contradictions between the cards were resolved on 27 Oct (recommended answers accepted).

### 3.3 Connection points: identified
26 connection points (CP-01 to CP-26) are documented in `docs/ops/OPS-TA-CONNECTIONS.md`. For each one the document gives the data, the direction and the rules.
- **Before the opening:** people, clients, ESA, requirement to opening.
- **Opening and sourcing:** opening state, ad channels.
- **The pipeline and client side:** the pipeline feed, the Director set, the client set, client decisions, CV ownership, silence and hold, pipeline depth.
- **Interviews to placement:** interviews, feedback, references, offers, placement, joining day.
- **Closing out:** rejection notices, guarantee, close, weekly report.
- **Cross-cutting:** notifications, files.

Which side owns what:
- **Ops:** leads, clients, ESA, client messages, money and guarantee.
- **TA:** openings, candidates, interviews, offers and placements.
- **Shared step:** TA builds the client CV set and Ops sends it.

### 3.4 Architecture: decided
- **One Convex backend and one common database, run as two separate systems with two teams.**
- **Ops code** lives in `convex/ops/` in the same repository. It has to: a deploy replaces all backend functions, so a second repository would wipe TA.
- **New Ops tables** are prefixed `ops`. TA tables keep their owners.
- **Ops gets a new UI** of its own. Its users sign in through Clerk; it never holds the backend admin key.
- **How Ops gets TA data** is still open. Ops reads TA data either through a **contract layer** (`convex/contract/`: named functions inside the same backend) or through **API endpoints**. The final choice is made in Phase 2.
  - Recommendation: the contract layer. It is one transaction, has no network failures, and TA's rules apply.
  - The HTTP API stays for outside apps (Capacity Planner, mobile).
- **TA tells Ops about changes** through an events table (`contractEvents`) written in the same transaction as each change.
- **MCP** is not used for the integration. It is an optional read-only AI helper later.

---

## 4. Lessons from the TA System that shape the Ops technology
Each lesson is a problem TA hit in production, and the rule Ops follows because of it.
| TA problem (date) | Lesson for Ops |
|---|---|
| A laptop `convex deploy` overwrote the live backend (21 Sep) | Ops deploys only through the release pipeline, from this repo |
| linkedin@ unread for 18 days: the mail poller hit a 64 MB memory limit; a half-emoji email stopped it (5-23 Oct) | Read mailboxes in small batches with a cursor; alert when a mailbox stalls for 1 hour; never let one bad message stop the queue |
| Two readers on the same mailbox (old CV poller and new mail intake) | **One reader per mailbox.** Ops owns client mailboxes; TA keeps candidate and Director mailboxes |
| Replies filed against the wrong opening or channel; duplicate candidates swallowed replies (22-25 Sep) | Every outgoing message carries a reference (round token, thread id) and replies are matched on it first, never by guesswork |
| CV reading ran out of backend action slots; an 800-CV backlog (6 Oct, 26 Oct) | Ops background jobs are queued, batched and limited, and have their own kill switch, because they share the backend with TA |
| A mutation hit the 1-second limit (26 Oct) | One record per transaction for bulk work |
| Web search: Google CAPTCHA, provider changes, SearXNG set up by hand (23-24 Sep) | Ops needs no web search in this phase. If needed later, reuse TA's search layer |
| Snippets, research and AI: model availability (only DeepSeek served on OpenRouter), 2-minute timeouts | AI in Ops only drafts or reads, always with a human approval or a fallback; reuse TA's model layer (`convex/lib/llm.ts`, Claude first, then DeepSeek) |
| Workday rules changed several times in a week (13-15 Oct) | Business numbers (days, limits, percentages) live in settings, not in code |
| Generic error text hid real causes ("API timeout or invalid response") | Every failure records the reason it failed |
| Outbound messages to real people | Every client message goes through a fail-closed safety gate like TA's `outreachSafety`; test recipients until the owner switches live |

---

## 5. Phase 2 plan: technology for every Ops feature (Day 2)
For each feature: the technology, what is reused from TA, what is new, and the outside dependency to start today.
| Ops feature | Technology / solution | Reuse from TA | New | Outside dependency |
|---|---|---|---|---|
| Backend, database, scheduling | Convex (self-hosted, same deployment), cron jobs + scheduler | Convex backend, cron pattern with cursors (follow-up sweep) | `convex/ops/*`, `ops*` tables, contract layer, `contractEvents` | None |
| Sign-in and roles | Clerk (same instance); Ops roles in an Ops table | Clerk, `users` table, identity check in `convex/lib/auth.ts` | `opsMembers` (ops lead, ops owner, accounts, Director of Operations, marketing) | Names of people per role |
| Lead intake | Website form -> hello@ mailbox read by Microsoft Graph, or a form posting to the backend; manual entry for calls/WhatsApp | Graph mail reading (`convex/mailIntake/*`), client dedup by `nameKey` | `opsLeads`, lead form endpoint | Website owner: can the form post to us? |
| Banking/finance check | Rule list + AI classifier on company/industry | AI model layer (`convex/lib/llm.ts`) | Industry flag, standard decline template | None |
| ESA document | Word template with fields -> filled -> PDF | **LibreOffice is already in the app image** (Word to PDF), `pdf-lib`, R2 storage | ESA template, placeholder check, versioning | Final ESA template (fixes the draft defects: placeholders, clause 1.1, duplicated 8.5/8.6) |
| ESA signing | Phase 1: client signs and returns a scan; system files it. Option: e-signature service later | R2 file storage | Signed and countersigned file records | Owner decision: scan or e-signature |
| Client email (ESA, sets, chases, invoices) | Microsoft Graph send from the ops owner's or a shared ops mailbox; replies read back by thread id | `convex/lib/graphMail.ts`, `graphClient.ts` (app permissions), mail intake reader | `opsMessages` approval queue (draft -> approve -> send), reply matching | Mailbox list for Ops; Mail.Send already granted |
| Client WhatsApp | Meta WhatsApp Cloud API with approved templates; client groups stay manual | WhatsApp sender, 24-hour window rules, safety gate | Client templates | Submit templates to Meta (approval 1-2 days); same or separate number |
| Interview scheduling + Teams | Microsoft Graph Calendar: create events with an online (Teams) meeting; slot proposals; day-before reconfirm | TA `interviews` record, reschedule history, confirmation alerts | Calendar integration, slot matching, invite tracking | **Admin consent** for Calendars.ReadWrite and online meetings (plus an application access policy). This is the longest lead time, so request it on Day 2 |
| Timers and reminders (about 15 clocks) | One timers table + one cron evaluator; Asia/Colombo working days | Colombo day helpers (`src/lib/calendar.ts`) | `opsTimers`, Sri Lanka public holiday list (TA's list is empty today) | Holiday list for 2026-2027 |
| Task inbox and escalation | Tasks table + in-app bell | TA notifications and bell | `opsTasks`, escalation steps | Who escalates to whom |
| Requirement meeting capture | Form + optional recording and transcript | TA briefs (recording, transcript) | Link from lead to requirement to opening | None |
| Opening hand-over to TA | Contract command creating the opening, team, 100% day | TA opening create, team seats, working stage | `openings.createFromRequirement` | Decide 1 or 5 100% positions per day |
| TopJobs | Email relay (flyer to TopJobs, live and closed dates) | Graph mail | `opsAdChannels` | None |
| Talent Pulse | Weekly list of open roles; one tracked apply link per role that files CVs to the right opening with a source tag | TA CV intake and source tags | Short-link route, Talent Pulse source | Confirm tracked links |
| Client CV set | TA builds the set; Ops sends with PDFs attached | Prepared CV PDF, EOD row fields, `reviewRounds` | Send + receipt + 7-working-day ownership clock | None |
| Reading client replies | AI reader with a human check | TA's Director/client reply reader (`mailIntake/*`, Claude first, then DeepSeek) | Ops-side reader for client mailboxes | None |
| Invoices | PDF generated from the placement's fee snapshot; number series; CSV export | `pdf-lib`, placement fee snapshot | `opsInvoices`, `opsPayments`, late charge | Invoice layout, numbering, tax lines, bank details |
| Guarantee and refund | Guarantee clock from join date; replace first; 60 working days; refund decision | Placement guarantee days, fall-through records | `opsGuarantees` | Who approves refunds |
| Weekly report | Scheduled build + email to Mr Azeem | Reports and Master Sheet logic | Scheduled send | None |
| Files | R2 storage | R2 client and upload flow | Ops file records | None |
| Audit and safety | Activity log, reasons required, fail-closed sends | `activityLog`, `outreachSafety`, `outboundGuard` | Ops send gate | None |

**Phase 2 also decides how Ops reads TA data** (contract layer or API: section 3.4), and records the result.

---

## 6. Phase 3 plan: backend build (Days 3-6)
Built in this order because of dependencies. Every day ends with tests passing and a pull request reviewed and merged with the merge-teammate skill.

**Day 3 (Thu 29 Oct): foundations**
- Split `convex/schema.ts` into TA and Ops parts.
- Create the Ops tables.
- Contract layer skeleton, plus a boundary test: Ops never touches TA tables and TA never imports Ops.
- `contractEvents` table.
- Ops roles (`opsMembers`).
- Timers engine with the holiday calendar.
- Ops kill switch and flags.
- Message approval and send pipeline behind the safety gate.

**Day 4 (Fri 30 Oct): before the opening**
- Leads.
- Banking/finance check.
- Intro call.
- ESA: generate, approve, send, chase, countersign, decline, negotiation.
- Requirement meeting.
- Opening created in TA through the contract.
- Fix the two TA issues: the Place redirect, and Ops creating clients.

**Day 5 (Sat 31 Oct): the client side of the pipeline**
- Client CV set send and receipt.
- 7-working-day ownership and claimed CVs.
- Client decisions back into TA.
- Feedback chase, silence hold and lift.
- Pipeline depth (add-on, hold at five).
- TopJobs and Talent Pulse.

**Day 6 (Sun 1 Nov): interviews to close**
- Interview scheduling with Teams invites, reconfirm and cancellations, on the TA interview record.
- Reference requests.
- Offer and placement details (package, DOJ history, offer letter).
- Joining day and no-show.
- Invoice, payment, late charge, write-off, surcharge.
- Guarantee and replacement or refund.
- Weekly report, close.

**TA changes that Phase 3 must include** (they are on the critical path):
- Move the TA rules that run in the web app today into the backend, so Ops and TA share them: saving an ESA, opening status, interview writes, offer and placement writes, the prepared CV.
- Add the new TA fields the connections need.

**Definition of done for the backend:**
- every connection point works end to end in tests;
- every timer has a test using working days;
- no message can reach a real client while test mode is on;
- `npm test` and both type-checks pass.

---

## 7. Phase 4 plan: deploy and UI handover (Day 7, Mon 2 Nov)
**Deploy**
- Release through the pipeline (`main` -> `production`) with owner approval.
- New fields are optional, and all Ops switches stay **off**.
- Data backfills run as dry-run migrations first:
  - an Ops profile per existing client;
  - guarantee rows for current placements;
  - Ops members.
- Smoke checks on the live backend, with Ops off.

**UI handover:** a feature list per Ops screen. Each screen lists the data it shows, the actions, the rules and the states.

| Screen | Contents |
|---|---|
| Ops inbox | Tasks due today and overdue, approvals waiting (client emails, ESA, invoices), escalations, timers about to run out |
| Leads | New lead form (source, contact, company), duplicate-client match, banking/finance flag and decline, intro call booking and rebook, lead status |
| Clients and ESA | Client list and record (contacts, ops owner, status), ESA draft from template, approve and send, chase progress, signed and countersigned files, negotiation notes, decline |
| Requirement and hand-over | Requirement meeting form (JD, salary, level, location, insights), impractical decline and invite-back date, create opening for a TA (primary TA, 100% day) |
| Client sets and messages | Client sets ready from TA, approval queue (draft, edit, approve, send), receipt date, 7-working-day ownership countdown, claimed-CV drop, group-post text |
| Client decisions | Client replies read in, shortlist or reject per candidate with reason, feedback chase status, silence hold and lift, pipeline depth (add-on, hold at five) |
| Interviews and calendar | Who schedules, client slots and matching, booking with Teams link, reconfirm status, drop-outs and cancellations, attendance, feedback relay, round decision |
| Placements and joining | Placement details (package, DOJ, offer letter), DOJ changes with owner, joining-day confirmation, no-show and client options |
| Invoices and payments | Invoice draft from the fee snapshot, approve and send, due date, payments, late charge, chase, write-off, surcharge invoices, CSV export |
| Guarantees | 90-day clock per placement, day-75 warning, leaver handling (replace first, 60-working-day clock), refund decision, clean end |
| Ad channels | TopJobs requests, flyer, live and closed dates, cost; Talent Pulse weekly list and tracked links; CVs per source |
| Reports | Weekly active-positions report to Mr Azeem, ESA return times, client wait on sets, money and guarantee status |
| Settings | Message templates, timers and limits, holiday list, Ops roles and ops owners, Ops switches (kill switch, test mode) |

---

## 8. External dependencies to start on Day 2
These take time outside the team, so they start first.
1. **Microsoft 365 admin consent** for calendar and online meetings (Teams links), plus the list of Ops mailboxes.
2. **Meta WhatsApp templates** for clients (ESA chase, feedback chase, inactive notice, interview notices): submit for approval.
3. **Final ESA template** (Word), with the draft's defects fixed.
4. **Invoice format:** layout, number series, tax, bank details.
5. **Sri Lanka public holiday list** for working-day clocks.
6. **People for Ops roles:** ops lead, ops owners, accounts, Director of Operations, marketing.
7. **Website form:** can it post to the system, or should we read hello@?

---

## 9. Decisions needed this week
| Decision | Needed by |
|---|---|
| How Ops reads TA data: contract layer (recommended) or API | Day 2 |
| One 100% position per TA per day (Ops board) or up to five (TA change of 27 Oct) | Day 4 |
| Confirm the client-silence clock: 14 calendar days after profiles shared; chasing stops after 3-4 silent days; hold limit | Day 5 |
| Client replies read by Ops, Director replies stay with TA | Day 5 |
| Offer-silent timeout; replace-or-stop deadline; day-75 warning | Day 6 |
| Late charge simple or compounded; fee rule (1 or 2 months' gross, basic for selected clients) | Day 6 |
| ESA signing: scan or e-signature | Day 2 (scan works for Phase 1) |
| Ops UI as a second app in the repo, or an area inside the TA app | Day 7 |
| Staging rebuild, or a supervised pilot client | Day 7 |

---

## 10. Risks and the honest timeline
| Risk | Effect | Plan |
|---|---|---|
| The whole Ops backend in 4 build days is very tight | Some modules slip | Build in the order above. If time runs short, **finance and guarantee (Day 6) move to week 2**; everything before the placement still lands |
| Microsoft calendar consent not granted in time | No Teams invites | Build scheduling with the calendar call behind a switch; switch it on when consent arrives |
| Meta template approval delay | No client WhatsApp | Email works first; WhatsApp switched on when approved |
| Moving TA web-app rules into the backend touches live TA code | TA regressions | Small pull requests, existing TA tests, merge-teammate review, release with owner approval |
| One shared backend | Ops load slows TA | Batched jobs, limits, an Ops kill switch, check server capacity before switch-on |
| No staging environment (paused since 21 Sep) | Testing only locally | Local backend tests plus Ops switched off on live until a pilot |
| Open business decisions | Rework | Settings, not code, for every number; decisions table in section 9 |

**Cut line:** if the week is short, the minimum to finish is:
- foundations;
- leads, ESA and requirement to opening;
- the client side of the pipeline;
- interviews (with the calendar behind a switch).

Placement extras, money and guarantee then follow in week 2.

---

## 11. Rules for the whole project
- Branch and pull request for every change; nothing pushed straight to `main` or `production`.
- Nothing touches the live backend from a laptop; live changes go only through the release pipeline.
- No secrets in code, documents or chat.
- Every message to a real person goes through the safety gate, with test recipients until the owner switches live. `OUTREACH_LIVE` is never set in code.
- Data changes are migrations with a dry run first.
- When a feature's code changes, its skill is updated in the same pull request (`/skill-sync`).
