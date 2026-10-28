# 06 · Features and technology

The Ops system is planned as **12 modules** (features). Each one is planned in
detail on its own (Phase 0, step 3) before it is built. Sizes: S small, M medium,
L large.

## The 12 modules

| # | Module | What it does | Size |
|---|---|---|---|
| M1 | **Foundations** | Ops roles and ops owner per client; the Ops inbox; one timers engine for every clock (working days, Colombo time, holidays); messages drafted → approved → sent through the safety checks; the connection to TA's API; audit log; on/off switches | L |
| M2 | **Leads** | New lead form and website leads; duplicate-client check; banking and finance decline; intro call booking and rebook (3 emails then close); package, role and brief saved | M |
| M3 | **Client agreement (ESA)** | Draft from the template (blank fields block sending); send within 2 hours; chase plan with approval; Rushda call task; negotiation and resend; signed copy, team notice, Director countersign in 1 day; declined after 2 weeks | L |
| M4 | **Requirement and hand-over** | Requirement meeting booking and rebook; requirement form; impractical role reply and invite-back reminder; the opening created in TA with primary TA and 100% day | M |
| M5 | **Adverts** | TopJobs requests, flyer, live and closed dates (2 weeks), cost; Talent Pulse weekly list and tracked links; CVs filed to the opening with their source | M |
| M6 | **Client CV sets and messages** | Send client sets (at least 5 CVs) with approval; receipt date; 7-working-day ownership countdown; claimed-CV drop; client group post text | L |
| M7 | **Client decisions and chasing** | Read client replies; shortlist or reject with reason, sent to TA; feedback chase; silence hold and return; pipeline depth (add-on, hold at 5); unreported hire after 3 months | M |
| M8 | **Interviews** | Who schedules; client time slots; booking with Teams link and invite; day-before reminders; drop-outs and cancellations; attendance; feedback; round decision | L |
| M9 | **Placement and joining** | Placement details from TA; Asma and Ops told the same day; joining-date changes; joining-day check; no-show options | M |
| M10 | **Invoices and payments** | Invoice on joining day from the ESA fee; approval and send; due 30 days; payments; 5% per month late charge; chase; write-off; surcharge invoices; CSV export | L |
| M11 | **Guarantee** | 90-day window from joining (only if paid); leaver: replace first within 60 working days, else 25% refund decided by the Director of Operations; a replacement starts a new guarantee | M |
| M12 | **Reports and close** | Weekly active-positions report for Mr Azeem; close checklist when the guarantee ends (LinkedIn, TopJobs, position, lead) | S |

Plus, in the TA repository: the **TA API for Ops** (endpoints, events, Ops key) and
the small TA rule changes listed in [03](03-CONNECTION-TO-TA.md), section 5.

## Technology for each need

| Need | Technology | Reused from TA | Outside need |
|---|---|---|---|
| Backend, timers, reminders | Self-hosted Convex: tables, scheduled jobs, one timers engine using Colombo working days | Same stack and patterns as TA | Sri Lankan holiday list |
| Screens | Next.js 16 (UI team) | Same stack as TA | Designs from the UI team |
| Sign-in and roles | Clerk, plus Ops roles (ops lead, ops owner, accounts, Director of Operations, marketing) | Same Clerk as TA (to confirm) | Who gets which role |
| Connection to TA | TA's API, version 1, Ops key, events list | Built on TA's partner API | TA pull requests |
| Leads | Website form or the hello@ mailbox, plus a manual form | TA's mailbox reading approach | Website owner |
| ESA document | Word template filled by the system, turned into a PDF | LibreOffice and PDF tools as in TA | The final ESA template |
| ESA signing | Scan and upload first; e-signature later if wanted | — | Owner's choice |
| Client email | Microsoft Graph send and read, from Ops mailboxes | TA's Graph approach | List of Ops mailboxes |
| Client WhatsApp | Meta WhatsApp Cloud API templates; client groups stay manual | TA's sender and safety gate approach | Meta template approval (1-2 days) |
| Interview booking | Microsoft Graph calendar with Teams links | — | **Microsoft admin consent** (longest wait) |
| AI help | Reads client replies and drafts chases, always checked by a person | TA's AI routing (Claude first, then DeepSeek) | — |
| Invoices | PDF from the placement's fee; number series; CSV export | PDF tools | Invoice format, tax, bank details |
| Files | Cloudflare R2 | Same as TA | — |
| Safety | Every client message through outbound safety checks; test recipients until switched live | TA's outreach safety approach | — |

"Reused from TA" means the same approach or a copy of the code adapted for Ops.
Ops never imports or calls TA's code directly; it only uses TA's API.
