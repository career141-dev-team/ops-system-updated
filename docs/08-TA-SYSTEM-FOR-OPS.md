# 08 · What the TA System has today, for Ops

Checked against the TA System's code on 27 Oct 2026. **Exists** = TA already does it;
**extend** = TA has part of it; **new** = nobody does it yet. Ops-side work is built in
this repository; TA-side work is a small pull request in the TA repository.

## The TA System in short

- Live since 21 Sep 2026 at https://ta-system.career141.com, with 78,000+ candidates.
- Next.js 16 app on a self-hosted Convex backend (116 tables) on the VPS.
- Microsoft 365 mail, Meta WhatsApp, Clerk sign-in, Cloudflare R2 files, Qdrant for
  meaning search, AI through Claude first and DeepSeek second.
- Main features: openings, CV intake from mailboxes, CV reading and scoring, AI
  follow-up of candidates, Director sets and the end-of-day emails, database search,
  workday planning for TAs, headhunting tables, interviews, offers and placements,
  reports and the Master Sheet.

## Fit-gap

| Ops need | TA today | Verdict |
|---|---|---|
| Leads, website form, duplicate-client check, banking/finance flag | Clients list exists; no leads | **New** (Ops) |
| ESA draft, chase, countersign, decline | An ESA record exists in TA but no screen uses it; no drafting, chasing or signing | **New** (Ops), with ESA status sent to TA |
| Ops owner per client, Ops roles | An `ops` role exists; no ops owner field; no accounts, marketing or Director of Operations roles | **Extend** (TA field) + **new** (Ops roles) |
| Requirement → opening, primary TA, 100% day | Openings, team seats and working stages exist | **Exists**, needs an API endpoint |
| JD approval, LinkedIn post | Exists (JD tab, LinkedIn job post) | **Exists** |
| TopJobs and Talent Pulse, source tags | Adverts are LinkedIn only; source tagging is partial | **New** (Ops) + **extend** (TA source) |
| CV intake, scoring, follow-up, drop-outs | Exists | **Exists** |
| Director set | Exists | **Exists** |
| Client CV set sent by email, 7-day ownership | The client set is built but saved as "held", never emailed | **Extend** (TA event) + **new** (Ops sending) |
| Client chase, silence hold, pipeline depth | Some alerts exist (client chase after 2 working days); working stages exist | **Extend** |
| Interview booking, slots, reminders, Teams | Interview records and actions exist; no slot matching, invites, Teams or client notices | **Extend** (TA endpoint) + **new** (Ops booking) |
| Reference check when the client asks | Referee tools exist on the sourcing side | **Extend** |
| Offer, Place with package, joining date, offer letter | Offer and Place exist; the Place button opens a missing page; fields not required | **Extend** (TA fix) |
| Asma and Ops told the same day | Not today | **New** (TA event + Ops notice) |
| Invoices, payments, late charge, write-off | Fee stored as a percentage; no invoices | **New** (Ops) |
| 90-day guarantee, replace first, 25% refund | A guarantee date is worked out, but TA raises "refund due" at once, against the ESA | **New** (Ops) + **TA rule fix** |
| Weekly report to Mr Azeem | Reports page exists; no scheduled report | **Extend** |
| Ops inbox and escalations | TA's alerts go to recruiters and TA leads | **New** (Ops) |
| Safety for client messages | TA's outbound safety checks exist | **Exists** (Ops copies the approach) |

## Things in TA that Ops must not break

- TA's release pipeline, its backend and its database: Ops never deploys to them.
- The Capacity Planner's partner API and key: Ops gets its own key.
- TA's candidate messaging rules: the candidate never receives a message from Ops.
