# 11 · People and roles

Who does what today (as named on the owner's canvas), and the role each person is
likely to have in the Ops system. The role mapping is a **proposal** to confirm
(open question 2 in [09](09-DECISIONS-AND-QUESTIONS.md)).

## People named on the canvas

| Person | What they do today (canvas) | Likely system role |
|---|---|---|
| **Mr Azeem** (M.A Azeemusham) | Managing Director; countersigns the ESA; reviews Director sets; receives the weekly report | Director (TA) |
| **Asma** | Director level; logs leads; raises invoices; creates client groups; must hear about placements | Accounts + ops lead (to confirm) |
| **Rushda** | ESA chase and the final call; ESA tracker; posting | Ops owner |
| **Shamra** | Allocation; Director mailbox; reconfirms | Ops owner / TA support (to confirm) |
| **Zainab** | Records client and position; tells the team; scheduling; cancellations; references | Ops owner |
| **Rakshana** | Job posting; scheduling; references; logs the schedule | Ops owner / TA (to confirm) |
| **Jesmeen** (Ops) | Routes the signed ESA; posts placement updates | Ops owner |
| **Insha, Haifa** | Scheduling; placement posts | Ops owner (to confirm) |
| **Rumana** | Posts sets in client groups | Ops owner (to confirm) |
| **Sameera, Sanduni** | Reconfirm; client feedback posting | TA (they are TAs in the TA System) |
| **Siyan, Nuha** | Weekly active-positions report | TA lead / reporting (to confirm) |
| **Sapna** | Asked for a master client contact sheet | — |
| **TA lead** | On every intro call; picks the primary TA and the 100% day; owns the weekly report | TA lead (TA) |
| **Director of Operations** | Decides refunds | New Ops role (no such role in TA today) |
| **Marketing** | TopJobs flyers; Talent Pulse newsletter | New Ops role |
| **DLA** | Attends intro calls (the canvas does not expand the name) | ⚪ to confirm |

"Mona" on the canvas is the owner's AI assistant, not a person. "He" on the canvas is
the owner speaking (the notes card is titled "Uzmaan's notes").

## Roles in the Ops system (proposed)

| Role | Can do |
|---|---|
| **Ops owner** | Works the clients they own: leads, intro calls, ESA, requirement, client sets, client decisions, interviews (client side), placements follow-up |
| **Ops lead** | Everything an ops owner can, for all clients; moves clients between owners |
| **Accounts** | Invoices, payments, late charges, write-offs, CSV export; sees placements and guarantees |
| **Director of Operations** | Refund decisions; sees guarantees and reports |
| **Marketing** | TopJobs flyers and Talent Pulse lists |
| **Director** (read) | Countersign tasks; reports |
| **TA lead** (read) | Client and requirement details; the weekly report |

## Roles in the TA System today (for reference)

admin, director, ta_lead, ta, ta_support, ops, client, viewer. The `ops` role already
exists in TA and sees every opening, but it **cannot create or edit clients** today
(`client.manage` is admin, director and ta_lead only). With the separate design, Ops
staff create clients in the Ops system, which writes them to TA through the API.

⚪ Open: does each ops person see only their own clients, or all clients? (canvas
question in c1700).
