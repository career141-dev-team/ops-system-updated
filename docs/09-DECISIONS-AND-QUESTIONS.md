# 09 · Decisions and open questions

When a decision is made, add it here with the date and who made it. Newer decisions win
over older documents.

## 1. Decided

| Date | Decision | By |
|---|---|---|
| 8 Nov | **The desk assistant** ([31](31-AGENT.md)): a chat column that turns words into the desk's own actions, each behind a button the person presses. It may run **every action a person may do on the screens, money included**; nothing runs without the click, which is the person's approval, so "the system drafts, a person approves, the system sends" stands. Supersedes phase 9 step 14's "never sends, never writes to TA, never touches money". On a phone the chat replaces Clients in the bottom bar | Owner (chat) |
| 2 Nov | **Every feature ships with its screen.** The UI is built and connected as each backend part is built, not after it; the owner must be able to click every feature. Replaces "backend first, UI later" (28 Oct) | Owner (chat) |
| 2 Nov | The Ops screens use **the same look as the TA System**, and are **minimal with no overlays**: no modals or drawers, one page per thing, edit in place, plain wording (rules in [07](07-SCREENS.md)) | Owner (chat) |
| 2 Nov | Build starts with a **thin end-to-end skeleton** (sign in, inbox, one clock, one drafted message, one TA read), then fills in Phase 1 | Owner (chat) |
| 2 Nov | A **live preview link from day one** on the VPS (own port and subdomain). Guarded: password on the whole site at the proxy, no search indexing, **test data only** while sign-in is the simple dev one; each deploy needs the owner's go-ahead | Owner (chat), guard conditions by Claude |
| 2 Nov | The preview lives at **ops-preview.career141.com** (A record to <VPS_IP>, the owner adds it), https with a password at the proxy, **only the owner may open it** for now | Owner (chat) |
| 2 Nov | Sign-in while building is a **simple dev sign-in** (pick your name, as TA's local run does); real Clerk sign-in comes once the screens are agreed | Owner (chat) |
| 20-26 Oct | Two systems, two teams, connected wherever relevant (not only openings, interviews, offer) | Owner (canvas) |
| 20-26 Oct | Client and Director processes stay as they are (email, WhatsApp groups). Client and Director emails: system drafts, a person approves, system sends. Routine notices from one approved template go automatically | Owner (canvas) |
| 20-26 Oct | Everything lives in the system; the master, client, job and interview sheets and the placement WhatsApp posts are dropped | Owner (canvas) |
| 20-26 Oct | A reason is saved before every reject, hold, decline and drop-out, except Director rejections | Owner (canvas) |
| 20-26 Oct | One ops person owns each client (movable by the ops lead); once a TA is assigned, the position is the TA's responsibility | Owner (canvas) |
| 26 Oct | At least 5 CVs in both client sets and Director sets | Owner (c5220) |
| 26 Oct | A replacement hire starts a new guarantee, no new invoice | Owner (c5220) |
| 26 Oct | Rebooks are for client meetings, not candidate rebooks | Owner (c5220) |
| 26 Oct | Client silent for 3-4 days: stop following up | Owner (c5220) |
| 26 Oct | TopJobs closes 2 weeks after posting; LinkedIn closes when under 20 CVs a day or monitor-only | Owner (c5220) |
| 26 Oct | Candidate follow-up: max 3 messages in 24 h, then escalate to the TA | Owner (c5220) |
| 26 Oct | Reference check only when the client asks; TA phones the referee; no form | Owner (c5220) |
| 26 Oct | When shortlisted drops below five, the hold lifts and CV sending resumes | Owner (c5220) |
| 26 Oct | No accounting tool yet: generated invoices and CSV export | Owner (canvas) |
| 27 Oct | The 17 conflicts settled with the recommended answers (section 2) | Owner |
| 27 Oct | The position closes when the guarantee ends (or at refund or write-off) | Owner |
| 28 Oct | **Ops is a separate system:** own repository, backend and database, on the same server and Postgres as TA, connected to TA by API; TA only gets added endpoints | Owner |
| 28 Oct | Backend first; the UI team designs the screens later | Owner |
| 28 Oct | Order of work: agree the whole flow → decide technology → update documents → build, feature by feature | Owner |
| 1 Nov | Ops owners see all clients; each inbox shows only their own clients' work | Owner |
| 1 Nov | Website enquiries post directly to the Ops system (webhook from the form) | Owner |
| 1 Nov | After one unanswered reminder (countersign, Director set, client report), the ops lead is told after 1 more day | Owner |
| 1 Nov | A TA may have up to five 100% positions a day (TA's rule of 27 Oct stays) | Owner |
| 1 Nov | Talent Pulse: each role gets its own apply email address; no tracked link | Owner |
| 1 Nov | A position on hold for a silent client never closes automatically; a task to the owner every 30 days | Owner |
| 1 Nov | Calls stay human: the system creates the call task with the number and records the outcome; no AI calls, no phone system | Owner |
| 1 Nov | Late charge: simple 5% of the fee per unpaid month | Owner |
| 1 Nov | Offer with no answer: no automatic timeout; the TA decides | Owner |
| 1 Nov | Guarantee warning at day 75; after a no-show the client has 5 working days to choose replace or stop | Owner |
| 1 Nov | Ops mail from a new `ops@career141.com` mailbox | Owner |
| 1 Nov | WhatsApp from a new Ops number with its own templates | Owner |
| 2 Nov | **Mail: we read the boxes the desk already uses, plus each ops person’s own box.** Nobody is asked to move to one address. A new `ops@career141.com` is still worth having as the address on messages the system sends, but it replaces nothing | Owner |
| 2 Nov | **The clocks run themselves every five minutes.** The Ops backend's own scheduler asks the app for one pass through `/api/clock`, with a shared key; one pass at a time, and a pass that hangs is given up on after twenty seconds. Five minutes because the shortest thing we promise anybody is counted in hours. The health screen shows the last pass and says so when the scheduler looks stopped | Build decision, no owner input needed |
| 2 Nov | **Files: R2 on the server, a folder on the machine while we build.** Nothing is public: a download is a signed link that lasts ten minutes, or our own screen, which asks who you are. A file is never overwritten — the time is in its key — and its SHA-256 is kept, so a year later we can prove which version went out. Documents, spreadsheets and pictures only, up to 25 MB. A Word document becomes a PDF through LibreOffice, as in TA; a machine without LibreOffice says so plainly | Build decision, no owner input needed |
| 2 Nov | **Calls stay a person's job, and a call is not done until it is written down.** A call task carries a number as a `tel:` link; saving what was said finishes the task. No telephony, nothing dials, no AI speaks (owner's decision 7) | Owner, built |
| 2 Nov | **A write to the TA System is queued, never sent from a screen.** Every write carries a key built from the path and the body, so asking twice cannot make two openings; a write that cannot get through waits 1, 5, 15, 30 then 60 minutes, and after twelve tries it stops and says a person must do it by hand | Build decision |
| 2 Nov | **A stand-in TA System (`OPS_TA_FAKE=on`) answers while the TA side of the API does not exist.** Recorded, obviously invented data, and every screen that uses it says so. The real API replaces it by switching the flag off | Build decision |
| 2 Nov | **The events cursor only moves past events that were handled.** An event that cannot be handled stops the line rather than being skipped, because a skipped placement is the problem being fixed | Build decision |
| 2 Nov | **A lead is saved first and routed second.** A company that rang us exists whether or not the TA System can be reached, so nothing about the check blocks writing the lead down. One way to reply (an email or a number) is required, because a lead nobody can answer is not a lead | Build decision |
| 2 Nov | **The industry rule proposes; a person decides.** Banking and finance are flagged from the company name, what they say they do, their website and the notes, with the word that caused it shown. Confirming declines them for good and marks them never to be invited back (owner's standing rule); clearing it records who cleared it | Owner's rule, built |
| 2 Nov | **An exact company-name match is linked; a near match is only offered.** The name is reduced exactly as the TA System reduces a client's name, so the two sides agree. "Lanka Hospitals" and "Lanka Hospital Diagnostics" are two companies, and guessing would put a lead on somebody else's client | Build decision |
| 2 Nov | **A meeting cannot be marked held with nothing written down.** The brief is required; the position and the package are asked for and what is still unknown is said back. This is the fix for "the requirement was in the TA lead's head" — until the opening exists in TA, the meeting record is the only copy | Owner's problem list, built |
| 2 Nov | **Attempts to rebook belong to the lead, not to one booking.** Three attempts with no reply closes the lead with a reason (owner's rule); a client who is still answering is never closed on | Owner's rule, built |
| 2 Nov | **Two reminders for every client meeting:** the day before at nine, and an hour before. Both are cancelled the moment the meeting is settled, because a reminder for a meeting that already happened teaches people to ignore reminders | Build decision |
| 2 Nov | **A blank required field blocks the agreement from being sent, and the screen names which.** The incident behind it: a draft went to a client with placeholders still in it. The numbers (fee, guarantee, payment, replacement, refund) come from the settings, so a client on different terms is a settings change, not a code change | Owner's incident, built |
| 2 Nov | **The agreement cannot be sent until the owner's ESA template is uploaded** as a Word file on the Files screen (kind “Agreement, drafted”, attached to nothing). Until then the send refuses and says exactly that, rather than inventing an agreement of our own. **This is the one thing Phase 2 is waiting on from the owner** | Owner to supply |
| 2 Nov | **A signed copy needs a file and somebody saying they looked at it** — signed, dated and sealed. A copy came back unsealed once and had to be resent; we cannot tell a seal from a scan, so a person confirms | Owner's incident, built |
| 2 Nov | **Settling an agreement stops every clock on it, not only the chases.** A signed agreement still had the two-week “nobody has signed” clock running, which would have fired a fortnight later on an agreement that was signed | Build fix |

| 3 Nov | **The agreement document is the truth where it and our notes disagree.** The owner's own ESA was read out of the mailbox and made into a template; two numbers in it contradicted earlier decisions, and the owner said to go with the document | Owner (chat) |
| 3 Nov | Refund when no replacement is found in 60 working days: **50%** of the fee, not 25%. The agreement's reviewer struck 25 and wrote 50 on 10 Sep | Owner (chat), from the agreement |
| 3 Nov | Late payment: **1% a month, compounded**, and nothing charged on an invoice disputed in good faith - not 5% simple. This closes open question 12 on the late charge | Owner (chat), from the agreement |
| 3 Nov | The agreement asks for the company registration number and what the client's business is, and never asks for a tax number. The field list follows the document | From the agreement |

| 3 Nov | **AI becomes Phase 9: one productivity layer over the finished system**, not a chatbot and not a new module. Written as Phase 9 of [15](15-BUILD-PLAN.md), with the register in [21](21-AI-OPPORTUNITIES.md). It comes after the pilot, because the desk must run on rules first; dictation and draft-improve may ride earlier | Owner (chat) |
| 3 Nov | **Voice means dictation into our own fields, not calls.** The owner's decision 7 (calls stay human) and TA's suspended voice worker both stand. The speech-to-text half of TA's voice machinery is reused; the calling half stays off | Owner's decision 7, restated |
| 3 Nov | **AI proposes; a person decides** - no AI send, no AI reject or hold, no AI write to the TA System, no AI money figure, and no chatbot as the only way to do something that has a screen | Owner's standing rules, applied to AI |
| 3 Nov | **Nothing TA already does is rebuilt in Ops**: CV reading and scoring, matching and search ranking, the JD draft, Research and Suggestions, the candidate reply reader. Ops asks through the API | Build decision |
| 3 Nov | **Every AI run is costed and recorded** (`opsAiRuns`), with a daily budget and a weekly accuracy sample; a task whose proposals are changed more than half the time switches itself off. The Claude subscription is a limited pool - it ran down on 3 Nov with nobody at a keyboard, because the live TA System spends it by itself | Build decision, from what 3 Nov showed |

| 3 Nov | **Everything after a set counts from the day the client received it**, not from the day we sent it: the ownership window, the feedback chase, the two weeks before a hold, and the three months before an unreported hire is asked about. The received date is editable for that reason | Build decision, from the agreement's wording |
| 3 Nov | **A CV claim lives on the candidate in the set, not in a table of its own.** There is exactly one claim per candidate per set, so `opsOwnershipClaims` would hold the same row twice. It is recorded with the verdict and the sentence the client is told | Build decision (docs/15 Phase 4 step 1 named a table) |
| 3 Nov | **A client who answers about one candidate is not a silent client.** The silence count resets on anything they say, and any decision or claim stops the chase clocks - but never the ownership window, which is a promise in the agreement rather than a chase | Build decision |

| 3 Nov | **Ops never creates an opening in the TA System; it queues one and waits for TA's own event to give it the id.** The position exists in Ops the moment it is handed over, with no opening id and the screen saying so, because a queued write may take a while and an invented id would be a lie | Build decision |
| 3 Nov | **No opening before the agreement is signed, and none from a half-written requirement.** Both are refusals with the missing field named, not warnings. Signed is enough - the Director's countersignature follows | Owner's rule, built |
| 3 Nov | **A TA who opens a position by hand for a client of ours gets a position record and a task to link a requirement.** Otherwise the brief exists only in that TA's head, which is the fault this phase is for | Build decision |

| 3 Nov | **TopJobs is paused**, at the owner's word, and built on its own pass: it is the advert with money in it (about Rs 5,400 an ad) and four hand-offs between the TA, marketing, ops and TopJobs | Owner (chat) |
| 3 Nov | **Only a real LinkedIn post address is accepted**, and the share button's tracking tail is cut off. A wrong link is worse than none: the TA System unlocks Live on the link's presence, so a wrong one looks done | Build decision |
| 13 Nov | **The screens follow the approved Figma design ("Ops System", frame 68:2791, "MW · My Work").** Its colours, Poppins and the career141 · 20 years logo replace the 5 Nov look; the assistant is named **AURA** | Owner (chat) |
| 13 Nov | **A top bar replaces the sidebar on every page**, reversing 5 Nov. Five workspaces across it, as the design shows them (My Work, Clients, Openings, Interviews, Placements); the board, the inbox, Finance, Reports, AURA and Settings behind the profile - the design hides Finance, Reports and Candidates in the bar, and Candidates stays in TA. Every page is still under exactly one entry (`tests/nav.test.ts`, `tests/nextstep.test.ts`) | Owner (chat), the Figma "Top nav" description |
| 13 Nov | **My Work replaces Your day as the page everybody starts on: one thing at a time.** Up next is still chosen by the rules in `src/lib/whatFirst.ts`, never by the model; Later only moves a thing down the view and writes nothing. The busy counts and "Where your work is" are gone from it - the top bar's counts carry that now | Owner (chat), the Figma "MW · My Work" frame |
| 13 Nov | **AURA's composer on My Work posts the chat's own action and opens the AURA column with the answer.** It is the same chat, with the same rule: nothing runs without a person pressing a button | Owner (chat), the Figma "AURA composer" |
| 13 Nov | **The top bar hides once the page is scrolled and comes back for the pointer at the top edge**, for keyboard focus inside it, and always on a touch screen (`src/lib/topBar.ts`). Called back, it slides over the page: the one overlay the owner allowed, with the panels that open from its + and its profile | Owner (chat) |
| 16 Nov | **A file opened from To approve shows over the page**, as the owner's Figma "MW · Approvals — Agreement" draws it: the page behind it blurred, the file in a dark viewer, a round X to close (also Esc, or a click on the page behind). A PDF or a picture only (`previewable` in `src/lib/files.ts`); anything else downloads. It is the second overlay the owner allowed, after the top bar, and nothing else opens over a page. The URL carries it (`&file=`), so the page still holds no state | Owner (chat), the Figma frame 87-10408 |
| 16 Nov | **The profile opens a card over a blurred page**, as the owner's screenshot shows: the same items in the same order as before (Account & help, Notifications, The work, Inbox, Finance, Reports, Settings, Open AURA), then View as, Dark mode and Sign out. Esc, a click outside or going to a page closes it. The third thing allowed over a page, after the top bar and a file from To approve | Owner (chat) |
| 16 Nov | **Sign out signs out.** It was a link to the sign-in page that left the session cookie behind; it is now a form that deletes the cookies (`signOutAction`), in the profile card and on Account | Owner (chat) |
| 16 Nov | **Dark mode is a cookie** (`ops_theme`), chosen in the profile card and read by the layout, so a page is drawn dark from the first byte. Light until somebody chooses | Owner (chat) |
| 16 Nov | **View as previews a role and never gains access.** A person may look through a role whose every power they have too (and that does not open a wider part of the desk than theirs); `canPreview` in `src/lib/roles.ts`. The cookie (`ops_view_as`) is only a request, checked again on every page and action, so one written by hand changes nothing. Only the role changes - the person stays them, so what they do is recorded as them. A pill at the foot of every page says so and goes back. The TA System's chips (TA, Lead ...) are not Ops roles | Owner (chat) |
| 16 Nov | **A tab above the page names the workspace** (Figma "Notch tab"): the entry the bar marks, or the page's own name for Account, Notifications and AURA (`workspaceTitle` in `src/lib/nav.ts`) | Owner (chat), the Figma frames |
| 16 Nov | **The Interviews board shows this week, and today is today.** Monday to Friday of the week looked at, the day outlined in green being the real one (it was Wednesday whatever the day, and the week was taken from the newest interview). A card sits on the day it is booked for, or on the first time the client offered; a filter pill lists its queue instead of the board. A cancelled or no-show interview counts as "to rebook", as does one that has asked for times twice with no answer (`boardStatus`, `weekDays` in `src/lib/interviews.ts`) | Owner (chat), the Figma frames 249:9996, 249:10142, 249:10196 |
| 16 Nov | **Whether the candidate is free for an offered time is written down by hand, never guessed** (`slotAnswers` on the interview, set from "The time" on the interview page). A time nobody has answered shows no free/busy line; a busy time cannot be picked. It used to show the first time as free whatever the truth | Owner (chat) |
| 16 Nov | **The feedback card shows the real drafted message and approves it from the page** (the one made from `interview.client_feedback`), with no invented sample wording; "Approve and send" goes through the normal message checks. The owner's name moved from the top of the interview page to "What happened to it" | Owner (chat), the Figma frame 249:10196 |
| 3 Nov | **Talent Pulse compiles itself on Tuesday at nine and sets the next Tuesday's clock.** One issue a week, whoever asks for it, so the clock and the button cannot make two. A role whose TA has written no line keeps the issue in: a newsletter entry with nothing under it tells a reader nothing | Owner's rhythm, built |

## 2. The 17 conflicts between canvas cards, settled 27 Oct

| # | Topic | Settled as |
|---|---|---|
| 1 | Silent client | One clock: 14 calendar days after profiles shared (ESA) → hold with reason; inside it, chase after 1 day, call the next day, stop after 3-4 silent days |
| 2 | ESA decline | 14 calendar days after sending; any reply stops the chase |
| 3 | ~~Guarantee start and validity~~ Decided 1 Nov: all visible, own inbox | Clock from the joining day; replacement or refund only if the fee is fully paid; unpaid = no guarantee |
| 4 | 90 days or 3 months | 90 days from the first working day (ESA) |
| 5 | Invoice timing | Invoice on the joining day; due 30 calendar days after the first working day |
| 6 | Late charge | 5% per month; ESA says compounded: ⚪ owner or legal to confirm |
| 7 | ~~Fee basis~~ Decided 1 Nov: webhook | Stored per client agreement (months of gross, basis, nationality rule) instead of a percentage |
| 8 | ~~Position close~~ Decided 1 Nov: up to five | Search stops at offer; posts close at the close checklist; position closes at guarantee end, refund or write-off |
| 9 | ~~Reference check~~ Decided 1 Nov: new Ops number; templates listed in 15 F2 | 26 Oct rule: phone, only when the client asks |
| 10 | Director rejection reason | No reason needed |
| 11 | ~~Client WhatsApp groups~~ Decided 1 Nov: no timeout | Groups stay; the system drafts the post text and logs it; ops posts |
| 12 | ~~Who tracks the joining date~~ Decided 1 Nov: simple 5%; numbering, tax, bank details still ⚪ | The TA makes the calls; the ops owner owns the record and the guarantee; both are alerted |
| 13 | ~~Rejection notices~~ Decided 1 Nov: warn at 75; 5 working days | Automatic from one approved template |
| 14 | ~~100% position~~ Decided 1 Nov: never automatically | The TA lead sets the daily 100%, also on a returning job |
| 15 | ~~Interview invites~~ Decided 1 Nov: ops lead after 1 day | Sent automatically; the ops owner handles exceptions |
| 16 | Replacement billing | No invoice; new 90-day guarantee |
| 17 | Talent Pulse link | ⚪ open: one tracked apply link per role? |

## 3. Flow corrections to confirm with the owner

The corrected flow in [04](04-OPS-FLOW.md) fixes 10 points on the canvas (section 12 there,
details in [13](13-CORRECTIONS-LOG.md)). They follow the decisions above, but the owner should
confirm each one while walking the flow.

## 4. Open questions

| # | Question | Needed for |
|---|---|---|
| 1 | Do staff sign in to Ops with the same Clerk accounts as TA? | M1 |
| 2 | Who gets which Ops role (see [11](11-PEOPLE-AND-ROLES.md))? | M1 |
| 3 | Does each ops person see only their own clients, or all clients? | M1 |
| 4 | Rebuild staging, or a supervised pilot with one client? | Phase 0 |
| 5 | Client records: Ops creates and edits them through the API, but TA leads and directors can still edit clients in TA. Should TA's client editing stay, or move to Ops only? | M1, M2 |
| 6 | Is ESA signing by scan and upload enough to start, or e-signature now? | M3 |
| 7 | Can the website form create leads automatically? | M2 |
| 8 | One 100% position per TA per day (canvas), or up to five (TA change `9bfb190`, 27 Oct)? | M4 |
| 9 | Which client WhatsApp templates to send to Meta for approval? | M1, M3, M7 |
| 10 | May we request Microsoft calendar and Teams permissions (admin consent)? | M8 |
| 11 | Offer with no answer: after how many days does it count as declined? | M9 |
| 12 | Late charge simple or compounded; invoice numbering, tax lines, currency, bank details | M10 |
| 13 | Guarantee: a day-75 warning? A client deadline to choose replace or stop? | M11 |
| 14 | How long does a held position stay on hold before it closes? | M7 |
| 15 | Escalation when the Director does not countersign, or does not answer a set, after one reminder | M3 |
| 16 | Surcharge invoice: chase and payment path | M10 |
| 17 | Who maintains the Sri Lankan holiday list? | M1 |
| 18 | Import the current sheets (master, client, interview) or start clean at go-live? | Go-live |
| 19 | ~~Talent Pulse: one tracked apply link per role?~~ Decided 1 Nov: own address per role | M5 |
| 20 | What does "DLA" stand for (attends intro calls)? | M2 |
