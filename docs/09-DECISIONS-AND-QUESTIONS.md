# 09 · Decisions and open questions

When a decision is made, add it here with the date and who made it. Newer decisions win
over older documents.

## 1. Decided

| Date | Decision | By |
|---|---|---|
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

## 2. The 17 conflicts between canvas cards, settled 27 Oct

| # | Topic | Settled as |
|---|---|---|
| 1 | Silent client | One clock: 14 calendar days after profiles shared (ESA) → hold with reason; inside it, chase after 1 day, call the next day, stop after 3-4 silent days |
| 2 | ESA decline | 14 calendar days after sending; any reply stops the chase |
| 3 | Guarantee start and validity | Clock from the joining day; replacement or refund only if the fee is fully paid; unpaid = no guarantee |
| 4 | 90 days or 3 months | 90 days from the first working day (ESA) |
| 5 | Invoice timing | Invoice on the joining day; due 30 calendar days after the first working day |
| 6 | Late charge | 5% per month; ESA says compounded: ⚪ owner or legal to confirm |
| 7 | Fee basis | Stored per client agreement (months of gross, basis, nationality rule) instead of a percentage |
| 8 | Position close | Search stops at offer; posts close at the close checklist; position closes at guarantee end, refund or write-off |
| 9 | Reference check | 26 Oct rule: phone, only when the client asks |
| 10 | Director rejection reason | No reason needed |
| 11 | Client WhatsApp groups | Groups stay; the system drafts the post text and logs it; ops posts |
| 12 | Who tracks the joining date | The TA makes the calls; the ops owner owns the record and the guarantee; both are alerted |
| 13 | Rejection notices | Automatic from one approved template |
| 14 | 100% position | The TA lead sets the daily 100%, also on a returning job |
| 15 | Interview invites | Sent automatically; the ops owner handles exceptions |
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
| 19 | Talent Pulse: one tracked apply link per role? | M5 |
| 20 | What does "DLA" stand for (attends intro calls)? | M2 |
