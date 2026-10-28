# 03 · How Ops connects to the TA System

Ops and TA are two separate systems with two databases. They meet in **26
connection points** (CP-01 to CP-26), found on 27 Oct by walking the whole client
journey. This page is the plan for the connection; the full detail of every point
is in [`reference/OPS-TA-CONNECTIONS.md`](reference/OPS-TA-CONNECTIONS.md).

> That reference was written on 27 Oct when Ops was planned **inside** the TA
> backend, so it names "contract functions". With the separate design decided on
> 28 Oct, each contract function becomes an **API endpoint** on TA, and the
> `contractEvents` table becomes TA's **events list** read through the API. The
> points, data and rules stay the same.

## 1. Who owns which information

Each piece of information has one owner. The other side reads it, or asks the
owner to change it.

| Information | Owner | The other side |
|---|---|---|
| Leads, intro calls, client agreement (ESA) work: drafts, chasing, signing, decline | **Ops** | TA sees the ESA status and fee terms only |
| Client record (company, contacts, ops owner) | **TA** keeps the record, **Ops** creates and updates it through the API | Openings and placements in TA point to it |
| Requirement from the requirement meeting | **Ops** | Becomes a TA opening through the API |
| Openings, job posts, candidates, CVs, follow-up, Director set | **TA** | Ops reads and gets events |
| Client CV set | **TA** builds it | **Ops** sends it, records receipt, ownership claims and client decisions, and sends the decisions back |
| Interviews | **TA** keeps the record | **Ops** books the client side through the API; TA handles the candidate side |
| Offers and placements | **TA** | Ops reads, gets events, adds package, offer letter and joining-date changes through the API |
| Invoices, payments, late charges, guarantee, replacement and refund | **Ops** | TA gets the status only |
| Staff and roles | **TA** (sign-in directory) | Ops reads the list; Ops-only roles live in Ops |
| TopJobs and Talent Pulse adverts | **Ops** | TA receives the CVs with their source |

**No copies:** Ops stores TA's IDs (for example "TA opening 123") and asks TA for
the details when it needs them.

⚪ **Open (question 5 in [09](09-DECISIONS-AND-QUESTIONS.md)):** TA leads and directors can
still edit clients inside TA today. If both systems edit the same client, changes can
clash. Either TA's client editing stays (and Ops reads the latest before every change),
or client editing moves to Ops only.

## 1b. The 26 connection points, by phase of the flow

| Phase ([04](04-OPS-FLOW.md)) | Points | What crosses between the systems |
|---|---|---|
| A. Lead and client check | CP-01, CP-02 | Staff list and roles; client find, create, link; ops owner |
| B. Intro call and ESA | CP-03 | ESA status and fee terms to TA (TA copies them at Place) |
| C. Requirement → opening | CP-04, CP-05 | Opening created from the requirement; primary TA and 100% day; opening state Ops watches |
| D. Adverts, CVs, Director set | CP-06, CP-07, CP-08 | TopJobs and Talent Pulse CVs with source; pipeline counts; Director set sent and decided |
| E. Client set and feedback | CP-09 to CP-14 | Client set ready / sent / received; client decisions with reasons; client-owned CVs; silence hold; unreported hire; pipeline depth → add-on or monitor |
| F. Interviews and reference | CP-15 to CP-17 | Interview booked, rescheduled, outcome, client decision; reference requested and reported |
| G. Offer, placement, joining | CP-18 to CP-21 | Offer made / accepted / declined; placement with package, joining date, offer letter; joining, no-show; rejection notices |
| I. Guarantee and close | CP-22, CP-23 | Candidate left → opening reopened; close the opening and its posts |
| All phases | CP-24 to CP-26 | Weekly report data; bells for TA users; files (CVs, offer letters) |

Each point in full: [`reference/OPS-TA-CONNECTIONS.md`](reference/OPS-TA-CONNECTIONS.md), section 3.

## 2. What TA's API has today

TA already has a **read-only partner API** (`/integrations/v1`, built for the
Capacity Planner, see the TA repository's `docs/PARTNER-READ-ONLY-API.md`):

- read any application table page by page;
- download a CV;
- upload a CV file for later pick-up;
- one shared secret key; the routes stay closed if the key is not set.

It is a good base, but Ops needs more: specific reads, writes, events, and its own key.

## 3. What Ops needs from TA (API version 1, draft)

**Reading (Ops asks TA):**

| Endpoint (draft) | Gives | Points |
|---|---|---|
| `GET people` | Staff list with roles | CP-01 |
| `GET clients?name=` / `GET clients/{id}` | Find or read a client | CP-02 |
| `GET openings?status=&client=` / `GET openings/{id}` | Openings, team, JD state, LinkedIn post, stage counts | CP-05, CP-06, CP-24 |
| `GET openings/{id}/pipeline` | Candidates and stage counts (pending, shortlisted) | CP-07, CP-13, CP-14 |
| `GET openings/{id}/client-sets/{n}` | One client CV set and its candidates | CP-09 |
| `GET applications/{id}/prepared-cv`, `GET cv/{id}` | The CV files to send | CP-09, CP-26 |
| `GET applications/{id}/offer`, `GET placements/{id}` | Offer and placement details | CP-18 to CP-20 |
| `GET reports/active-positions` | The weekly report data | CP-24 |
| `GET events?after=` | TA's events list (section 4) | All |

**Writing (Ops sends TA), all new:**

| Endpoint (draft) | Does | Points |
|---|---|---|
| `POST clients` (create or update) | New client, contacts, ops owner | CP-02 |
| `POST clients/{id}/esa` | ESA status and fee terms, used when TA places a candidate | CP-03 |
| `POST openings` | Opening built from the requirement, primary TA, 100% day | CP-04 |
| `POST openings/{id}/status` (hold, close, reopen) | Client silent, guarantee events, closing | CP-12, CP-22, CP-23 |
| `POST openings/{id}/working-stage` | Add-on or monitor-only, from pipeline depth | CP-14 |
| `POST openings/{id}/ad-channel` | TopJobs or Talent Pulse advert live or closed | CP-06 |
| `POST cvs` | A CV from TopJobs or Talent Pulse filed to the opening with its source | CP-06 |
| `POST client-sets/{id}/sent` | Client set sent and received dates | CP-09 |
| `POST applications/{id}/client-decision` | Client shortlisted or rejected, with reason | CP-10 |
| `POST applications/{id}/client-owned` | Client already had this CV (within 7 working days) | CP-11 |
| `POST applications/{id}/reference-request` | Client asked for a reference check | CP-17 |
| `POST interviews` (book, reschedule, outcome, client decision) | The client side of interviews | CP-15, CP-16 |
| `POST placements/{id}/details` (package, joining date, offer letter, left) | Placement details and changes | CP-19, CP-20, CP-22 |
| `POST notify` | A bell for a TA user | CP-25 |

Every write: needs the Ops key, carries a repeat-safe key so a retry never does it
twice, applies TA's own rules, and answers either "done" or TA's own refusal message.

## 4. What TA tells Ops (events)

TA adds a row to its events list in the same step as the change, so an event is
never lost. Ops reads the list every minute.

| Event | Used for |
|---|---|
| Opening created, updated, closed; JD approved; working stage changed | Opening state Ops watches |
| LinkedIn post live or closed | Adverts, closing |
| Candidate stage changed | Pipeline counts, client decisions, unreported hires |
| Director set sent and decided | Knowing a client set is coming |
| **Client set ready** | Ops drafts the client email |
| Interview booked, confirmed, candidate out, outcome, feedback | Interviews |
| Offer made, accepted, declined | Search stops, back-ups |
| **Placement made**, joined, no-show, fell through | Invoice, guarantee start |
| Rejection notice sent | Records |

## 5. What has to change in TA (the only TA work)

All of it is **added**; nothing existing changes. Each change is a small pull request
in the TA repository, reviewed, tested and released on its own with the owner's go-ahead.

1. **An Ops key:** its own secret, allowed only the Ops endpoints. The Capacity
   Planner's key stays as it is.
2. **The read endpoints** in section 3.
3. **The write endpoints** in section 3. Several TA actions (saving an ESA, opening
   status, interviews, offers, placements) run in the TA web app today, not in the
   backend, so they must be moved into the backend first for the API to use them.
   This is the largest TA task and needs the most care.
4. **The events list:** a new table, written in the same step as each change.
5. **New fields where Ops needs them:** for example, the ops owner on a client, the
   client-owned date on an application, and the advert channel on an opening. All optional.
6. **Rules Ops needs TA to follow:** required package, joining date and offer letter
   on Place; a reason saved on every reject, hold, decline and drop-out; the refund
   rule matching the ESA (replace first).

## 6. Shared rules both systems apply the same way

- Working days in Colombo time, with the Sri Lankan public holidays (TA's holiday list is empty today).
- Reasons before saving any reject, hold, decline or drop-out (Director rejections excepted).
- Every message to a real person goes through the outbound safety checks.
- Fees and guarantee terms come from the client's ESA.
