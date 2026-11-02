# 13 · Corrections log

Everything corrected while consolidating the plan, with the reason. Newest first.

## 28 Oct 2026 · Consolidation pass (this repository)

**Canvas re-read:** all 59 cards present; every diagram has the same steps and arrows as
on 27 Oct (c5237 250/332, c4585 236/324, c3626 60/95, c3002 60/94, c2790 60/93, c719
65/75, c4412 65/93, c4234 28/27, c1061 25/36, c2511 11/10, c1039 10/11, c4381 10/9). Text
cards checked against the stored copies: identical. **Nothing on the canvas changed.**

**TA System re-checked on `main` (a083b14b):** `client.manage` still excludes `ops`;
Place still redirects to `/placements/{id}`, a page that does not exist; the read-only
partner API (`/integrations/v1`) is unchanged; Gajani's TA tracking has been added to TA
(separate project, not part of Ops).

**Repository documents corrected:**

| Document | Was | Now |
|---|---|---|
| 04 flow | A 15-row table copied from the canvas, with its gaps | Full flow in 9 phases with diagrams, the design gaps fixed, combined position status |
| 03 connection | Said TA "keeps" the client and Ops writes it, without the open conflict | Same model, plus the open question: TA leads and directors can still edit clients in TA |
| 01 plan | Technology listed as decided | Order of work: agree the flow → decide technology → update documents → build |
| 06 technology | Read as final | Marked "proposed", decided after the flow is agreed |
| 09 decisions | Pointed to the analysis for the 17 settled conflicts | Lists all 17 with their resolution, and the 10 flow corrections to confirm |
| New | — | 00 context for a new chat, 11 people and roles, 12 glossary, 13 this log |

## 27 Oct 2026 · Corrections to the canvas flow (c5237)

### Design gaps fixed in [04](04-OPS-FLOW.md)

1. A first hire's 90-day clock (n6181) led only to the invoice; the leave / day-75 /
   clean branches hung off the replacement clock (n6201). Now every hire's guarantee has them.
2. "Fee collected" (n6189) was a dead end while the locked flow c3626 closed the position
   at fee collected. Decided 27 Oct: the position closes at guarantee end, refund or write-off.
3. "Escalated to TA" (n6333) was a dead end. Now a call task for the TA.
4. Only Reminder 48h/72h led to "Reply read". A reply at any point stops the reminders.
5. "Director rejection notice" fed "Pipeline pending counted" (client counts). Director
   rejections now only continue the search.
6. Rejection notices back to pipeline depth were only partly drawn. Drawn for client
   rejections.
7. "Set reviewed, none shortlisted" leaked into scheduling (an arrow the canvas tool could
   not delete). Removed.
8. The surcharge invoice has no chase or payment path. Kept as ⚪ open.
9. Single reminders with no escalation (Director countersign, Director chase, client
   report reminder). Kept as ⚪ open.
10. Undecided timeouts: offer silent, silent-hold limit, client deadline for replace or stop,
    day-75 warning, hold exit. Kept as ⚪ open.
11. "Hold lead, chase ESA" for a returning client jumped into ESA email 1. Now: the existing
    agreement is sent again, then chased.
12. The weekly report and Talent Pulse hung off "LinkedIn advert Live". The weekly report is
    one desk-level job; Talent Pulse runs weekly per open role.

### Arrow labels on the wrong arrow

The canvas stores arrow labels as floating text; about 35 sat on a neighbouring arrow. The
full table (shown on → belongs to) is in [`reference/ANALYSIS.md`](reference/ANALYSIS.md),
section 3. The diagrams in [04](04-OPS-FLOW.md) use the corrected labels. Examples:

| Shown on | Says | Belongs to |
|---|---|---|
| ESA clock starts → ESA drafted | "no reply to 3 emails" | Intro call not held → Intro silent, lead closed |
| TA informed of decision → Rejected after round | "selected" | swapped with "not moving" |
| Client asks for reference? → Offer made | "TA wants TopJobs" | should be "no reference requested" |
| Candidate leaves → No guarantee | "refund paid, close" | should be "fee unpaid" |
| Package asked → Placement saved | "candidate declines" | Search stops → Offer declined |

### The plan's claims about the TA System, corrected

| Canvas said | TA code says |
|---|---|
| No interview scheduling in the code | Interview records, schedule/confirm/reschedule/outcome/feedback actions and alerts exist; slots, invites, Teams, automatic reconfirm and client notices are missing |
| No ESA record | An ESA table and status logic exist but no screen uses them (dormant) |
| Weekly report, rejection notices, placement update to Asma "already automatic" | None exist in code; they are planned |
| Guarantee not tied to joining day | The guarantee end is already joining date + guarantee days; missing: ops owner, day-75, full-payment check, replace first |
| (not on canvas) | Place redirects to a page that does not exist (TA bug) |
| (not on canvas) | Ops cannot create clients in TA (`client.manage`) |

## 2 Nov · One ops mailbox was the wrong answer

Decision 11 of 1 Nov read as "a new mailbox `ops@career141.com`", and the first mail
reader was written for that one address. Two things on the canvas say it is not enough.

**The habit already exists.** The as-is ops flow (c719) shows every client email going
from a person’s own Outlook with a shared box copied: the CV set as
"CLIENT > ROLE > SET n" copying cv@, the interview invite from interviews@ copying
opsteam@, the weekly report from joborders@, a website lead arriving at hello@, and the
first client contact reaching joborders@ or opsteam@. So there is no new habit to teach
and no box to force on anyone.

**A copy is not the reply.** Copying a shared box shows the message we sent. The
client’s answer follows the person who sent it, so a reader that watches only the
shared box would see everything we already know and almost nothing we need. The TA
System settled this months ago: its reply reader checks the signed-in person’s own
mailbox, the shortlist inbox and job@ together (`src/app/actions.ts`). That also means
Microsoft already permits this app to read staff mailboxes in this tenant, so there is
no new consent to arrange.

**What changed:** the reader takes a list (`OPS_MAILBOXES`), reads each box in turn, and
every email it records remembers which box it arrived in. One box it is not allowed to
read reports that one address and does not stop the others.

**Still to do:** the house subject "CLIENT > ROLE > SET n" is already a form the TA
System parses, and it would match hand-written set mail from Outlook. It is not built
here yet, because matching by client needs the client contacts that arrive with the TA
API.

## 2 Nov · Two holes in the reply matching, closed

**The sent-message id was invented.** `desk.ts` built it from our own row id as
`<…@ops.career141.com>` — a domain that does not exist, and not what a mail server
calls a message. Microsoft gives the real `internetMessageId` back when it sends, and a
client’s reply quotes that. So the thread rule could never have matched a single real
reply. The message record now keeps `providerMessageId`, null until a sender fills it,
and the thread rule reads only messages whose real id we kept.

**The desk’s own subject was not read.** The matcher looked only for our
`[C141-…]` reference, which appears on mail the system sent — and the desk has typed
"CLIENT > ROLE > SET n" by hand in Outlook for years (c719), which is what almost every
client is replying to today. Both rules now run, reference first: a hybrid, not a swap.

The house rule is the looser one, so it is held to three conditions. It must name a set
number, or "your shortlist, thanks" could be read as a company and a role. It must lead
to exactly one thing we know about, otherwise it is held for a person — the mistake the
TA System made when it matched candidate mail on subject text alone. And names are
compared without case, spacing or punctuation, so "A.B.C. Holdings (Pvt) Ltd" and
"abc holdings pvt ltd" are one company. Reply prefixes, a "REVISED -" marker and our
own reference are stripped before parsing, because a real reply carries all three.

Both forms are read: "CLIENT > ROLE > SET 02" and "SET 2 - CLIENT - ROLE - 5 CVs", the
latter being what the TA app already sends.

