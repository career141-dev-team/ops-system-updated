# 09 · Decisions and open questions

When a decision is made, add it here with the date and who made it. Newer decisions
win over older documents.

## Decided

| Date | Decision | By |
|---|---|---|
| 26 Oct | Two systems, two teams, connected wherever relevant; client and Director processes stay as they are (email, WhatsApp groups) | Owner (canvas) |
| 26 Oct | Client and Director emails: the system drafts, a person edits and approves, the system sends. Routine notices from one approved template go automatically | Owner (canvas) |
| 26 Oct | Everything lives in the system; the master, client, job and interview sheets are dropped | Owner (canvas) |
| 26 Oct | A reason is saved before every reject, hold, decline and drop-out, except Director rejections | Owner (canvas) |
| 26 Oct | One ops person owns each client (movable by the ops lead); the ops owner owns joining-date tracking and the guarantee window | Owner (canvas) |
| 26 Oct | Reference checks only when the client asks; by phone, no form | Owner (canvas) |
| 26 Oct | No accounting tool yet: generated invoices and CSV export | Owner (canvas) |
| 27 Oct | The 17 conflicting rules between canvas cards settled with the recommended answers (in `reference/ANALYSIS.md`) | Owner |
| 27 Oct | Silence clock: 14 calendar days after profiles are shared; chasing stops after 3-4 silent days | Owner |
| 27 Oct | The position closes when the guarantee ends | Owner |
| 28 Oct | **Ops is a separate system** with its own repository, backend and database, on the same server and Postgres as TA, connected to TA by API | Owner |
| 28 Oct | Backend first; the UI team designs the screens later | Owner |
| 28 Oct | Build feature by feature after each feature is planned with the owner | Owner |

## Open questions

| # | Question | Needed for |
|---|---|---|
| 1 | Staff sign in to Ops with the same Clerk accounts as TA? | M1 |
| 2 | Who gets which Ops role: ops lead, ops owners, accounts (Asma?), Director of Operations, marketing? | M1 |
| 3 | Rebuild staging, or a supervised pilot with one client? | Phase 0 step 6 |
| 4 | Is ESA signing by scan and upload enough to start, or e-signature now? | M3 |
| 5 | Can the website form create leads in the system automatically? | M2 |
| 6 | One 100% position per TA per day (canvas) or up to five (TA change of 27 Oct)? | M4 |
| 7 | Which client WhatsApp templates to send to Meta for approval? | M1, M3, M7 |
| 8 | May we request Microsoft calendar and Teams permissions (admin consent)? | M8 |
| 9 | Offer with no answer: after how many days? | M9 |
| 10 | Invoice: numbering, tax lines, currency, bank details; late charge simple or compounded; fee rule (one month's gross, or basic for some clients) | M10 |
| 11 | Guarantee: a warning at day 75? A deadline for the client to choose replace or stop? | M11 |
| 12 | Hold limit: when does a held position close? | M7 |
| 13 | Who maintains the Sri Lankan holiday list? | M1 |
| 14 | Import the current sheets (master, client, interview) or start clean at go-live? | Go-live |

The full list of the 17 settled conflicts and 12 design gaps is in
[`reference/ANALYSIS.md`](reference/ANALYSIS.md).
