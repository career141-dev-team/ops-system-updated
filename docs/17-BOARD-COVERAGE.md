# 17 · Board coverage: every card, where it is in the plan, what was missing

_Checked 1 Nov 2026 against the live board (59 cards, 12 charts, 880 steps, 1,199 arrows;
unchanged since 27 Oct). "Plan" points to [15](15-BUILD-PLAN.md) parts and steps, [04](04-OPS-FLOW.md),
[14](14-DIAGRAM-DEEP-WALKTHROUGH.md), [16](16-PROBLEM-REGISTER.md). The gaps found by this check
were added to the plan as **Part K** the same day._

## 1. Card by card

| Card | What it holds | Where in the plan | Gap found → fixed in |
|---|---|---|---|
| c1 Career 141 brief | business, problem, goal, scope, limits, ~60 rules, ~45 decisions, approach | rules and decisions: 04 §13, 09, 15 Part B/G; approach: 15 §1 and K | ops lead assigns the lead's owner (K1); client sends package/DOJ/billing address/offer letter per ESA (K2); team approves the workflow before build (K6); ESA template proofread (K7); "don't track 5-10 profiles" (K8) |
| c5 Next steps | the owner's working steps for the board | process, nothing to build | — |
| c11 How ops runs today | the notebook outline | 15 Part C "before the system", 16 §3 | — |
| c713 Job-to-joining map | archive findings, numbers, where it goes wrong | 16 §2, 04 §13 | — |
| c719 Ops workflow (chart, locked) | today's 65 steps with 41 incident notes | 16 §3 (every note), 14 (as the "before") | — |
| c869 Side notes | ESA automation, requirement call recording, countersigned copy always returned | 15 P2; recording → K3 | requirement meeting recording passed to TA as the brief recording (K3) |
| c895 CV source tracking | sources must be tracked; Talent Pulse analytics | 15 J4, P3 13-15 | — |
| c899 Talent Pulse analytics | title only | 15 P7 16 KPIs (CVs per source from `cvCountToday`) | — |
| c1036-c1201 (12 cards) | the owner's analysis of the TA System | checked against the code: 13, 08, 15 Part J | — |
| c1039 How the system is built (chart) | TA parts | 08 | — |
| c1061 Candidates in the pipeline (chart) | TA stages | 08 §3 | — |
| c1700 Decisions for you | 28 questions | 16 §10 (all answered or decided) | — |
| c1834 To check | 5 conflicts | 16 §11 | — |
| c2499 Open questions | 11 | 16 §9 | — |
| c2505 Best Pacific ESA draft | fee, due, late charge, guarantee, 2.12 client duties, surcharge, term, interview room, defects | 15 J12, P6, P7; defects → K7; 2.12 → K2 | client's duty to send placement details (K2); template defects to fix before use (K7); replacement profiles within 14 days (K4) |
| c2511 ESA terms to fee (chart, locked) | terms → fee chain | 15 P6 9, D2 opsEsa.fields | — |
| c2533 Who does what (ESA) | signatories and team | 11 | — |
| c2790, c3002, c3626 (charts, locked) | the business flows | 04 (built on c3626), 14 | — |
| c3620 Problems in today's workflow | 24 lines | 16 §1 | — |
| c3777 One Desk | the one-system idea, what it fixes, connects to, risks | risks → K9 mapping; "connects to" → 15 Part F | each risk mapped to its handling (K9) |
| c3782 New system step by step | 30 steps with who / in the system / by itself / records / today | 15 Part G phases 2-4 (every step) | — |
| c3813 What to build | 12 items with size and today | 15 Part G; 08 | — |
| c3849 Task sort | 60 steps: automate / partly / no | 15 Part B and §2 (traditional stays) | TA suggested by load (K5, optional) |
| c3913 Automation opportunities | 15 priorities | 15 Part G order | — |
| c3929 Task sort notes | invite automatic?; hold rule | 16 §11 | — |
| c3935 Automation decisions | 60 rows | 15 Part G, F | — |
| c3998 Notes 20 Oct | business flow final; email read by system, WhatsApp/call recorded by hand | 15 F1, F2, §2 | — |
| c4070, c4176, c4323 mapping tables | older mappings (replaced per c6337) | superseded by 03 and 15 Part D | — |
| c4103 System map gaps | 8 | 16 §6 | — |
| c4217 Assumptions | 4 | 16 §7 | — |
| c4222 Mapping readme | how the mapping cards were made | process | — |
| c4234, c4412, c4585 (charts) | older system flows (replaced by c5237) | 14 header; 13 | — |
| c4290 Business stage to system parts | 18 stages → parts → status | 15 Part G mirrors the 18 stages; 08 | — |
| c4309 System flow gaps | 13 | 16 §5 | — |
| c4369 New parts and integrations | 11 parts | 15 Part G modules (same list; reference check = phone, not form) | — |
| c4381 Target system parts (chart) | 10 parts NEW/EXTEND/EXISTS | 15 Part G | — |
| c4401 What we're doing | agreed: two systems, limits, connection everywhere | 02, 03 | — |
| c4405 Notes 22 Oct | the map must show who sends, who follows up, alerts, tags, mechanics | 14 (owner per step), 15 Part C and G | — |
| c4571 Flow check | 12 decisions covered / partly | 16 §8 | — |
| c5185 Flow problems by topic | 23 | 16 §4 | — |
| c5209 Notes 23 Oct | rebook loop rule; TopJobs 2 weeks; **owners are in the team**; **ops lead assigns the owner** | rebook, TopJobs: 15 P2/P3; owner in team → K1; ops lead assigns → K1 | ops owner on the opening's team and assigned by the ops lead (K1) |
| c5220 Notes 26 Oct | 14 rules | 09 §1, 04 | — |
| c5237 Ops and recruiter systems (chart) | the 250-step flow | 14 (every step), 04, 15 | — |
| c6337 Archive | which cards are replaced | 00 §5 authority order | — |

## 2. The gaps, in one list (now Part K of the plan)

| K | Gap | Source |
|---|---|---|
| K1 | The **ops lead assigns** each lead's owner (not round-robin); the ops owner is **on the position's team** in TA | c5209 |
| K2 | After an offer is accepted the **client** must send package, joining date, billing address and signed offer letter (ESA clause 2.12); the plan only had TA's Place capturing them | c2505, c1 |
| K3 | The requirement meeting's **recording** goes to TA as the opening's brief recording (TA already stores brief recordings and transcripts) | c869, c1 |
| K4 | After a leaver, **replacement profiles within 14 days** (ESA) — a timer the plan did not have | c2505, c713 |
| K5 | TA lead's choice of TA: the system **suggests by load** (optional) | c3849 |
| K6 | The Ops team (Asma, Rushda, TAs) **approves the workflow before** building, not only at the end | c1 approach |
| K7 | The ESA **template must be proofread and fixed** before it becomes the system's template (placeholders, clause 1.1 "working calendar days", duplicated 8.5/8.6, misspelt file name) | c2505 |
| K8 | "Track the 7-14 day response; **do not track 5-10 profiles**" — the KPI list is adjusted | c1 decisions |
| K9 | c3777's six risks mapped to their handling | c3777 |

Everything else on the board is in the plan, the flow, the walkthrough or the register.
