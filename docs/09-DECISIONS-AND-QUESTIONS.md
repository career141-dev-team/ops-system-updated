# 09 · Decisions and open questions

When a decision is made, add it here with the date and who made it. Newer decisions win
over older documents.

## 1. Decided

| Date | Decision | By |
|---|---|---|
| 8 Nov | **The desk assistant** ([31](31-AGENT.md)): a chat column that turns words into the desk's own actions, each behind a button the person presses. It may run **every action a person may do on the screens, money included**; nothing runs without the click, which is the person's approval, so "the system drafts, a person approves, the system sends" stands. Supersedes phase 9 step 14's "never sends, never writes to TA, never touches money". On a phone the chat replaces Clients in the bottom bar | Owner (chat) |
| 19 Nov | **The v6 design replaces the old UI** (Figma "OPS New Design", page "v6 · Screens"): a top bar of eight (My work, Inbox, Calendar, Clients, Positions, Internal hiring, Accounts, Settings), pages as canvas with cards, Poppins type styles, ink-3 `#8a939c` (lighter than before; about 3:1 on white at 12px, below AA, kept as drawn). **State panels are real overlay drawers**, 680px on the right, opened with `?panel=`; this changes the 2 Nov "no overlays" rule ([07](07-SCREENS.md)). **The send pipeline is kept** (`approveAndSend`, `sendAgreement`, `sendClientSet`, `sendInvoice` and the outbound safety checks); "Copy the message" is added only where nothing can be sent (WhatsApp). **Screens with no backend** (WhatsApp, Team news, Internal hiring, Calendar data) show an honest empty state, not sample rows. The page's 90% zoom is gone: the frames are drawn at 1920px at 100%. The old tab above the page card is gone | Owner (chat) |
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
| 3 Nov | ~~Late payment: **1% a month, compounded**, and nothing charged on an invoice disputed in good faith - not 5% simple. This closes open question 12 on the late charge~~ Rate superseded 17 Nov: **5% a month, compounded** (clause 5.5 of the current ESA); the rest stands | Owner (chat), from the agreement |
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
| 16 Nov | **Our own team interviews a candidate before the CV goes to the client, and the set cannot go without a pass.** `set.requireInternalInterview` is on by default; an ops lead can switch it off in Settings, with a reason (the existing settings rule). A hold keeps the set back, a fail takes the candidate out of it with the notes as the reason. Blocked in `problemWithSending`, so it cannot be bypassed from a screen | Owner (chat) |
| 16 Nov | **A client set's CVs download as one zip** ("Client - Position - set N.zip"), read through the file store so R2 works too | Owner (chat) |
| 16 Nov | **Dark mode is a cookie** (`ops_theme`), chosen in the profile card and read by the layout, so a page is drawn dark from the first byte. Light until somebody chooses | Owner (chat) |
| 16 Nov | **View as previews a role and never gains access.** A person may look through a role whose every power they have too (and that does not open a wider part of the desk than theirs); `canPreview` in `src/lib/roles.ts`. The cookie (`ops_view_as`) is only a request, checked again on every page and action, so one written by hand changes nothing. Only the role changes - the person stays them, so what they do is recorded as them. A pill at the foot of every page says so and goes back. The TA System's chips (TA, Lead ...) are not Ops roles | Owner (chat) |
| 16 Nov | **A tab above the page names the workspace** (Figma "Notch tab"): the entry the bar marks, or the page's own name for Account, Notifications and AURA (`workspaceTitle` in `src/lib/nav.ts`) | Owner (chat), the Figma frames |
| 16 Nov | **The agreement template is a Word file with `{{holes}}`; the newest upload with no subject is the one in use** (it was the first, so a corrected template was ignored). A hole Word split across runs is gathered back before filling (`joinSplitHoles`), so it is filled or refused, never sent with `{{` in it. The Files page lists the versions and checks the template against the ESA fields (`checkTemplate`); "Make a filled draft to look at" on the lead fills it exactly as the send does and sends nothing. The refund fallback is the 50% of `REFUND_PCT`, not 25 | Owner (plan, 16 Nov) |
| 16 Nov | **The Interviews board shows this week, and today is today.** Monday to Friday of the week looked at, the day outlined in green being the real one (it was Wednesday whatever the day, and the week was taken from the newest interview). A card sits on the day it is booked for, or on the first time the client offered; a filter pill lists its queue instead of the board. A cancelled or no-show interview counts as "to rebook", as does one that has asked for times twice with no answer (`boardStatus`, `weekDays` in `src/lib/interviews.ts`) | Owner (chat), the Figma frames 249:9996, 249:10142, 249:10196 |
| 16 Nov | **Whether the candidate is free for an offered time is written down by hand, never guessed** (`slotAnswers` on the interview, set from "The time" on the interview page). A time nobody has answered shows no free/busy line; a busy time cannot be picked. It used to show the first time as free whatever the truth | Owner (chat) |
| 16 Nov | **The feedback card shows the real drafted message and approves it from the page** (the one made from `interview.client_feedback`), with no invented sample wording; "Approve and send" goes through the normal message checks. The owner's name moved from the top of the interview page to "What happened to it" | Owner (chat), the Figma frame 249:10196 |
| 16 Nov | **The fee follows the agreement's basis, with allowances.** The placement carries `basicSalary`, `allowances` (monthly) and TA's free-text `package`. Fee on "basic" is months x basic; on "gross" months x (basic + allowances); when the split is unknown the salary TA gave is used as it stands, never a guess. TA sends the basis and a text package, not the split, so a salary TA calls "basic" fills basic, and otherwise Accounts or the ops lead fills it in on the placement page with a mandatory reason (audit). A draft invoice is re-priced; one already sent is changed only by a credit note (`feeAmount`, `salaryForFee`, `correctSalarySplit`). The new Convex fields are required, so rows already in a live backend need a migration with `dryRun` before deploy | Owner's FigJam finance flow, built |
| 16 Nov | **No invoice is drafted or sent without the client's billing name, address and email** (FigJam "Billing address exists? No: fix client billing record"). The client record gained `billingAddress`, edited on the client page; the refusal names what is missing (`problemWithInvoiceBilling`) | Owner's FigJam finance flow, built |
| 16 Nov | **The invoice is the owner's Word template, filled and sent as a PDF.** Upload it on the Files screen as "Invoice template" (and "Credit note template"); holes are `{{invoiceNumber}}`, `{{invoiceDate}}`, `{{billingName}}`, `{{billingAddress}}`, `{{candidateName}}`, `{{positionTitle}}`, `{{joinedOn}}`, `{{basicSalary}}`, `{{allowances}}`, `{{feeMonths}}`, `{{feeBasis}}`, `{{amount}}`, `{{lateCharge}}`, `{{dueOn}}`, `{{total}}`, `{{currency}}`, `{{againstInvoiceNumber}}`, `{{reason}}`. Amounts are plain numbers (450,000.00); the currency is its own hole. Due is the joined day + 30, never the sent day. A hole with no value refuses the document and names it; no LibreOffice keeps the plain-sentence guard; with no template the lines stay in the email body and the invoice page says so. Credit notes are separate documents, never negative payments (`src/lib/invoiceDoc.ts`) | Owner's FigJam finance flow, built |
| 17 Nov | **The intro call and the requirement meeting get a Teams meeting made in the organiser's Outlook calendar; the client gets the link by an approved draft, never on the Outlook event.** The booking asks for the time, length, whose calendar, the TA lead and the client emails. The event holds only our own people (the organiser and the TA lead), because Exchange emails everyone on an event the moment it is made, which would be a message to a client nobody approved. A pasted link still works, and a Microsoft failure never stops the booking (`src/lib/teams.ts`, `src/lib/graphCalendar.ts`, `switch.teamsEnabled`, `OPS_TEAMS_FAKE`) | Owner (17 Nov) |
| 17 Nov | **The opening is opened right after the intro call, and no longer waits for the agreement to be signed.** Intro call (held) -> the opening is opened (a title and a headcount are enough) -> the agreement goes out at once -> signed immediately, or conditions are settled in a requirement meeting, which can be the intro call itself (`alsoRequirement`). The rest of the requirement is written in later and goes to the opening as it is saved. The lead page says "Working without a signed agreement since <date>" and the chase and 14-day decline clocks keep running. This replaces the earlier hard rule "no search before the agreement is signed" (`problemWithHandover`, `bookRequirementMeeting`) | Owner / supervisor (17 Nov) |
| 17 Nov | **A signed agreement is countersigned by stamping the Director's stored signature** (a PNG or JPG on the Files screen as "director_signature") on the last page of the client's signed PDF (`src/lib/countersign.ts`). The cover email is still a draft a person reads and sends, and nothing waits on the countersign. With no signature on file it falls back to the manual upload | Owner / supervisor (17 Nov) |
| 17 Nov | **Search, CV sets and interviews are one stage, "Search & interviews", with a count of what is in it** (`loopSummary` in `src/lib/journey.ts`), on the Openings board (3 columns now), the work board and the opening's own bar. They repeat until the role is filled and can run at the same time | Supervisor (17 Nov) |
| 17 Nov | **A client has standard contacts, and a position can have extra people for that role only** (`src/lib/contacts.ts`). A CV set goes to the position's people and the standard "hr" contacts; TA's contacts are used only where Ops has none | Supervisor (17 Nov) |
| 17 Nov | **Candidates can be added by hand, kept in Ops only and shown as "added by hand, not in TA".** They are not sent to TA and cannot yet go into a CV set, an interview or a placement: those need TA to be able to hold them (an additive TA endpoint). The invented sample candidates on a position now show only while the stand-in TA System is on | Supervisor (17 Nov) |
| 17 Nov | **The requirement can be proposed from a Teams call's transcript**, read after the call from Microsoft (`fetchTranscript`) and checked by a person before saving. It works only if somebody started transcription in the meeting; there is no bot in the call. Behind `switch.transcriptsEnabled` | Supervisor (17 Nov) |
| 17 Nov | **New lead has three paths, and Direct client picks from our own clients.** Enquiry and Client discovery keep the form as it was. Direct client shows only a search over existing clients; picking one fills the company and offers the client's contacts as chips (or a new contact), and asks only "What do they need?". The company name comes from our record, never the form, so no second client can appear; the lead routes as an exact match does (signed agreement: requirement meeting; otherwise: waiting on the agreement) and goes to the client's owner. The form's sources are now ones the server accepts: it used to send values (`website_form`, `director`, `linkedin`) that were not in `LEAD_SOURCES`, so it could not save | Owner (chat), Figma 331:2976 variations A and B |
| 17 Nov | **Inbox and Call are three-pane screens with Conversation / Call tabs** (Figma 395:11299, 396:11347). The folders and labels are the ones Ops can answer from its own records (`src/lib/inboxView.ts`): Inbox, Unread, Waiting on us, Drafts, Sent, Archived (= dealt with), and labels by what a thread or call is filed to (Clients, Openings, Money). The frames' stars, hand-made labels, Forward, call duration, recording and incoming/missed need a mail or phone system Ops does not have, so they are not drawn. Calls stay human: Call back is the phone's own link, and a call's next step is the open call task on the same record. The Director-set email (361:3346) is sent by the TA System, so it is not in this repository | Owner (chat), Figma |
| 17 Nov | **A booked intro call or requirement meeting sends its invite email automatically on booking** (deliberate exception to "a person approves every client message") when a join link exists, at least one client recipient is present, and the booker leaves *"Email the invite to them now"* ticked (`canAutoSendInvite` in `src/lib/teams.ts`). It still passes through the same outbound gate (`gate()`, `OPS_SEND`, `OPS_OUTBOUND_LOCK`, daily cap, do-not-contact, and test-mode redirect). Sent from the organiser's mailbox (or `OPS_DEV_SENDER_EMAIL` under dev sign-in only), with the booker recorded as the approver and `"Sent automatically on booking."` in the note. A stand-in link (`teams.example`) is never sent to a real client (`outreachLive`). If the gate blocks or Microsoft refuses, the booking stands and the message keeps its real `blocked`/`failed` state | Owner (17 Nov) |
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

## 17 Nov: the ESA is one template; only the client's details and the numbers change

- Source: the owner's Valtrix draft and its cover email. One Word template with `{{holes}}`; nothing else changes per client (the owner confirmed: only the numbers).
- The details are typed once, on the intro call, and go into both the document and the cover email.
- **Refund is 25%, not 50%.** Clause 6.6 of the current ESA says 25%. An older draft said 50 (reviewer, 10 Sep) and the system followed it from 3 Nov; the owner chose the current document on 17 Nov. `REFUND_PCT` and the `refund.pct` seed are 25. A live server keeps its setting until someone changes it on the Settings screen. The 50% **surcharge** in clause 5.9 is a different number and stays.
- The client's registration number is not printed in the ESA, so it is optional.
- A reading copy of a Word file is made with a small reader on JSZip (`src/lib/docxHtml.ts`), not a new package; tables and pictures are not kept.

## Decided 17 Nov: the ESA template and its terms

- **One template, only the numbers change per client.** `docs/templates/ESA-TEMPLATE.docx` is the owner's Valtrix draft with a `{{hole}}` over each client-specific phrase (company, address, signatory, business, date, fee, payment, guarantee, replacement, refund). A client who negotiates changes numbers, never clauses.
- **The ops person fills the details on the intro call** (the "agreement details" form on the lead's intro view), and the same form is on the agreement step.
- **The cover email carries this client's fee, payment days and guarantee** beside clauses 5.1 and 6.1, and still waits for a person to approve it.
- **Refund is 25%** (clause 6.6 of the current ESA). It was 50 from 3 Nov, from an older draft. The 50% *surcharge* in 5.9 is a different clause and stays 50.
- **Late payment is 5% a month, compounded** (clause 5.5 of the current ESA), changed from 1% on the owner's say on 17 Nov. Still compounded, and still nothing on an invoice disputed in good faith. A running server keeps whatever **Late charge** says on the Settings screen until someone changes it there.


## 17 Nov: the lead bar, and every draft is a new version

- The opening is refused until the intro call is held. A draft agreement (made from the intro call's details form) no longer counts as "an agreement is out"; only one that has gone out does. A Director's lead still skips the call.
- The lead's bar rings the step the page is on and shows the warning on any earlier step still open, so "on the opening, the intro call is not done" is visible.
- Each "make a draft" is the next version (v1, v2, ...); nothing is written over. To change anything, edit the details and make the draft again.
- A laptop has no LibreOffice, so the draft opens as a plain reading PDF built from the Word file. It is for reading only: it is never stored, and the client still gets only the LibreOffice PDF from the server.

## 17 Nov: the ESA is sent at the end of the intro call (owner)

- Order: intro call held → the agreement's details from the call → the ESA, read on the page → its email → **send** → then the opening is opened → Agreement (signed, or changes to settle) and Requirement side by side → Search & interviews → Joining → Guarantee.
- This refines the supervisor's row above ("intro call → opening → agreement goes out at once"): both are right after the call and nothing waits on the other; the owner wants the ESA out first. The opening is still not blocked by the agreement, only by the call being held.
- The details form appears once the call is marked held (before, it showed while the call was only booked).
- On the bar the intro call is done when it was held **and** the ESA has gone out; the agreement stage starts when the client answers (changes asked for, or signed).

## 17 Nov (evening): the opening comes last again (owner)

- **Order:** Enquiry → Intro call (ends with the ESA sent) → **Agreement and Requirement side by side** → **Opening** → Search & interviews → Joining → Guarantee.
- **Why:** since the supervisor's morning change the opening was created right after the intro call, and the TA System filled with openings for companies that never signed. The opening now waits for **the client's signed copy** (the Director's countersignature need not be there) and **a complete requirement** (`problemWithOpening`).
- **Replaces** the supervisor's 17 Nov row "The opening is opened right after the intro call, and no longer waits for the agreement to be signed", and the order line in "the ESA is sent at the end of the intro call". The 3 Nov rule (no opening before the agreement is signed) is back, with one exception.
- **The exception: "Open it now, without waiting"**, chosen per lead for a client we trust (owner's choice: per lead, not a flag on the client). It needs a written reason (10 characters or more), is kept on the lead with who and when (`openEarlyBy/At/Reason`), shows on the lead and as "opened early" on its card, and can be taken back while no opening exists. The role's name and number are still needed. The "Working without a signed agreement" line shows as before.
- A lead opened early does not turn the agreement and requirement into "skipped" on the bar: they stay current.

## 17 Nov (evening): finished steps are read-only; people on the opening; candidates by level (owner)

- **Working and done.** Every step of the lead bar has two views. While a step is being worked on, its data can be changed. Once it is done, the same data is shown and nothing can be changed. A requirement with every required field written is **locked** (`requirementLocked`): the page has no form for it and `saveRequirement` refuses. The agreement's fields lock once it is signed (they already locked once it was sent). A decided industry check shows the decision instead of its buttons. Changes after that go through the client ("they want changes") and a new meeting, not an edit. The one exception: a signed agreement still takes the Director's countersigned copy.
- **People on the opening.** The TA lead adds people to the opening, several at once and more later, and takes them off (`setOpeningPeople`, `OpsPosition.team`). Ops keeps the list and queues it with the Primary TA to `POST /integrations/v1/openings/{id}/team` as `memberIds`. **TA does not read `memberIds` yet**: an additive change to make in the TA repository through its own pull request (AGENTS rule 8). Until then Ops' list is the record. New TA staff are not created here; people come from TA's own list.
- **Candidates by level** (`candidateLevel` in `src/lib/positionCandidates.ts`): found, **internal shortlist** (ours: in a CV set, or TA says screened/shortlisted), **external shortlist** (the client said yes), interviews, joining (placed), guarantee (joined), or out. The Candidates tab filters by these. When the TA System is connected its pipeline for the opening is merged in, so candidates TA shortlisted appear (`taApplicationsFor`); TA's own names for the stages before the client's yes are not published, so only `shortlisted`, `internal_shortlist` and `screened` count as internal and any other stays "found".

## 17 Nov (evening): the Openings tab is three groups, not a board (owner)

- **No Kanban.** The openings are listed in three groups, one under the other: **Requirement & JD**, **Search & interviews** (with the loop's summary on each row) and **Offer & joining**.
- **The rule** (`app/(positions)/positions/page.tsx`): an opening **stays under Requirement & JD until the requirement/JD is approved** (`jdApprovedAt`), and, when its agreement is out, until that is **signed**; whatever else has started (a CV set, an interview). Only then does it move to Search & interviews, and it stays there while sets and interviews loop. It moves to Offer & joining **only once somebody is placed** (a placement that has not fallen through), whatever else is true. Closed openings stay under the Closed filter.
- Before this, an opening with a CV set or an interview went to Search & interviews even when its JD was not approved.

## 17 Nov (evening): the invoice is drawn to the owner's design, one per placed job (owner)

- **The design is the owner's PDF "Invoice Final design 1 (SL)".** Ops draws it itself (`src/lib/invoicePdf.ts`, pdf-lib): logo, PLACEMENT TO / SERVICE OFFERED, invoice number and date, one table (position, name of the recruited, date of appointment, consultancy fee, due date, amount), the bank block, TOTAL DUE and the letterhead. A real PDF on any machine, no LibreOffice. A late charge adds a row; a surcharge and a credit note use the same sheet with their own title.
- **The bank details are in Settings** ("Bank details on invoices", `bank.*`, set by the ops lead), not in the code. An invoice is refused, naming what is missing, until they are set: a bill with no way to pay is not made.
- **An uploaded Word "Invoice template" still wins** if somebody uploads one (it is filled and turned into a PDF by LibreOffice on the server); without one the drawn design is used. The Files screen checks an uploaded template's holes.
- **Numbering stays `C141-YYYY-0001`** (owner's choice); the owner's earlier plain numbers (e.g. 1643) stay as history.
- **Shown per job:** the invoice page has "The invoice, as the client will get it" (the PDF on the page, versions, "Make the invoice to look at"), the Invoices list names the job (position, candidate), and a joined placement with no invoice has "Draft the invoice" (a refused draft was permanent before). The fee rule comes from the **signed** agreement (the countersignature is not needed), and the page says when none was on record.
- **Fixed on the way:** a payment's bank reference and the day it arrived were sent by the forms and ignored; both are kept now (a future date is refused).

## 18 Nov: the Openings screens show only what is known (owner: "fix them in this branch")

- **No invented values.** Five made-up candidates were added to every opening while the stand-in TA was on, with made-up fit scores, sources, years, notice and salary. They are gone. A candidate shows the set they are in, the client's answer and their interviews; the TA System keeps the screening notes, notice and package and does not send them to Ops yet, and the page says so.
- **Fixed text replaced by the real rule:** "Day n of 21" (no such rule) is now "Open n days"; the ownership bar counts working days from `set.ownershipWorkingDays`; "feedback late" is past `feedback.chaseDays`; the hold page uses `hold.afterDays` and `hold.reviewDays`; "Needs a TA" means no primary TA (a waiting TA write no longer counts).
- **Requirement & JD** shows the recorded fields or "Not recorded yet", and the brief exactly as TA gets it (`briefText`). The "Drafted by AURA" text and its style pills went: they were sentences in the code, not a draft.
- **Advertising:** "Where the CVs came from" counts only TopJobs (`cvCount`), added by hand, and "not recorded". The TopJobs button says "Request the advert", which is what it does.
- **The set page** lost the fixed "AURA read the reply" quote; our own interview (Pass / Hold / Fail) can be recorded on it, since the set cannot go without it.
- **Logic:** a corrected receipt date restarts the receipt clocks still running (not one that already fired); the position page's requirement form is gone once the requirement is locked, and the action refuses too, as `saveRequirement` does; a save from the position queues the details write to TA like the lead's; the closing checklist includes "Close the TopJobs advert" when an advert ran.

## 18 Nov: Placements, invoices and guarantees - fixed what testing showed (owner: "build it")

- **Bugs:** a credit note could never be raised (the form sent `reason`, the action read `why`). A draft, paid, written-off invoice or a credit note no longer takes a payment (`problemWithPaymentOn`), and the guarantee's "fee paid" is the day the money arrived. Writing an invoice off now voids the guarantee and opens the close checklist, as it always said it did. A client's "stop" after a no-show opens the close checklist; the choice is only for a no-show, and only once. A dispute checks the invoice exists and is owed on. Confirming an unreported hire stops its three-month clock and goes back to the page it came from. The TA opening on a close list is ticked only once the adverts are down, and stays ticked once TA is told (`problemWithTick`).
- **"They joined" by hand** counts from the join date when it has passed, not from the click, so the guarantee and the due date are right; it queues `POST /integrations/v1/placements/{id}/joined` to TA. **TA does not have that endpoint yet**: an additive change for the TA repository (AGENTS rule 8). Until then it waits in the outbox. Payment in full likewise queues `invoice-state` `paid`, beside the existing `sent`.
- **Settings, not numbers in the code:** the guarantee length is the guarantee's own dates; the warning day, refund %, replacement working days, write-off days, late % and the unreported-hire months come from Settings. Removed: "Day n of 90", "of 60", "day 75", "fifteen days left", "150% of placement fee" (it is the surcharge %), "9:00 call" on a join day already gone, "4" items on a close list that does not exist.
- **Lists:** "In guarantee" is only guarantees still running; ended, void and refunded ones and cancelled placements are under a new **Ended** view. Drafts are not owed or late, a disputed invoice is not late, and the month's collections start on Colombo's first of the month. "Possible unreported hire" shows only once the three-month check has fired and nobody has answered (`unreportedToAsk`). The unreported-hire form no longer pre-fills the first candidate as the hire.
- **Left as it is (shortcut):** the invoice totals add every invoice as LKR, the only currency billed today. The fee still falls back to one month of gross when no signed agreement carries a rule, and the invoice page says so.

## 21 Nov: Aura fills in the action; a person still clicks once (on branch `hdbinath/motion-teams-aura`)

- **Aura uses Claude Haiku 5.5 with tool use** to look things up (clients, leads, people, positions, tasks, free times) and fill in an action, then shows **one confirm card**. The [31](31-AGENT.md) rule stands unchanged: the model never executes, and nothing runs until a person clicks once. The model proposes through the same resolver and the same permission and money checks as before; a lookup is read-only. Without an Anthropic key Aura falls back to the earlier one-shot path.
- **The Outlook calendar on /calendar shows only the signed-in person's own events**, read-only. Nobody sees a colleague's calendar through Ops, because the app permission reaches every mailbox and the screen must not widen that. A clash with something in the calendar is a **warning when booking, never a block**: a person may know better than the calendar.
- **Email and Teams are integrated but not live until the system is hosted.** `OPS_SEND` stays off, the outbound lock stays on and `OPS_TEAMS_FAKE` stays on. The order of switching on is [22](22-GO-LIVE.md) section 9, and each step needs the owner's explicit go-ahead.
- **Teams events follow the interview**: rescheduling moves the event and cancelling cancels it; the client's reschedule or not-held notice for an intro or requirement meeting is drafted and approved by a person like any other client email.
- **Motion style**: calm and short, never decoration. Page fade and rise, a sliding tab pill, a drawer backdrop, staggered lists, number count-up and small hover and press responses; everything off under reduced motion. The rules are in [07](07-SCREENS.md) under *Motion*.

## 22 Nov: internal hiring - CV upload, reject from the call, interview time (ops team feedback)

- **CV upload** on Add applicant and on the call drawer: PDF or Word, up to 10 MB, checked by its first bytes, kept as a `cv` file. The server-action and proxy body limits are both raised to 26 MB in `next.config.ts` (the action limit was 1 MB, the proxy's 10 MB, so a 3 MB CV failed with a raw error); this also covers the older Files upload.
- **Reject without an interview:** the call result "Talked - not a fit" (reason required) and a "Not a fit" button on Called · fits cards both move the person to Rejected and show the message to copy. A Not OK check does not force it; the person decides.
- **Interview time:** the typed time was read in the server zone, so on a UTC server it was saved 5h30 late; it is now read as Colombo time. The exact "Sun 05:15" the team saw was not reproduced. **Interviews booked on a UTC server before this fix are 5h30 late and must be re-entered** (open `/hiring/<vacancy id>?panel=book-interview&on=<applicant id>`, which works for a person already in Interview, enter the right time and save, then check the Calendar; an online interview also gets a new Teams event); bookings made on a laptop are fine. No migration.

## 23 Nov: AURA as a clean chat, and A2UI answers (owner; branch `hdbinath/aura-clean-a2ui`)

- **An AURA button bottom right on every page**, a fixed 480px column with no drag (the width cookie is gone), the helper text removed, "Your desk" folded into a dropdown, and a one-line box that grows. Details in [31](31-AGENT.md) and [07](07-SCREENS.md) (exception 5).
- **A2UI is drawn by our own small renderer, not `@a2ui/react`.** That package needs zod 3 and this project is on zod 4, and it is pre-1.0. We draw a part of the v1.0 basic catalog, with literal strings only (no data binding).
- **An A2UI surface never runs an action.** A Button can only send words into the chat as if typed, so every change still needs the confirm card and its one click. The A2UI skill (`.claude/skills/a2ui`) is in the repo for whoever extends it.


## 23 Nov: Ops reads CVs for its own vacancies (owner; ops team feedback, on branch `rayan/cv-ingestion`)

- **An exception to [21](21-AI-OPPORTUNITIES.md) section 1, on purpose.** That document says Ops never grows a second CV reader, because CV reading belongs to the TA System. It is right for the people TA sources for clients. The people who apply to **Career 141's own vacancies** never go through TA, and the team receives them in "Scoops" of fifty or sixty PDFs in one email. Typing the name, email, number, NIC and position from each was the work, so Ops reads those CVs itself. TA's CV reading is untouched, and Ops still never reads or scores a client candidate's CV.
- **What is found by pattern and what by a model.** An email, a phone number and an NIC have a shape, so they are found by pattern and never asked of a model. Only the two judgments (which line is the name, which position is meant) may go to the model (`cv.fields`, the cheap provider, off with the rest of the AI layer), and what it says is kept only if it is really in the text. With no key the pattern's guess stands.
- **A person confirms.** Every field lands editable on the applicant; what could not be found is named on the card. A scan with no text still makes an applicant, named from the file, marked "type the details in", so a CV is never lost for being unreadable.
- **Nobody is added twice.** The same file (SHA-256), or the same email, NIC or number, is a duplicate and is listed on the Scoop, not added.
- **Package and laptop are asked on the call**, so they start empty and are typed from the applicant's Details.
- **The mailbox and the senders are named, never guessed.** `scoop.mailbox` and `scoop.senders` (Settings, or `OPS_SCOOP_MAILBOX` and `OPS_SCOOP_SENDERS`), and mail reading must be on. A Scoop email comes from one of our own people, which the ordinary reader drops on purpose, so this is a separate read of one mailbox for the named senders.
- **End of the day, 17:30 Colombo on a working day**, one task for the Ops lead per day with a few lines per Scoop: how many CVs, who responded and who did not, who was turned away at screening and why, and how many interviews are booked. Read off the applicants as they stand. Not a timer of its own: the five-minute clock pass asks, and does nothing before its time or twice in a day.

## 23 Nov: Aura in tables, WhatsApp in, and the checks (owner; ops team feedback, on branch `rayan/integrations`)

- **Aura answers a status question as a table.** Three read-only lookups (`find_candidates`, `find_interviews`, `scoop_status`) and a finishing tool, `show_table`, that draws a compact table in the chat through the existing A2UI path. The `Table` component is our own addition to the basic catalog, literal strings only, at most six columns and thirty rows. Display only, as `show_ui` is: nothing in a table runs an action. **An NIC, a salary or a fee is never in a table.**
- **Inbound WhatsApp is built and shut** ([28](28-WHATSAPP.md)): a signed webhook, a message filed only to a number that is exactly one person's, a client who replies not chased. It accepts nothing until the app secret is set.
- **"Check Microsoft" now names the missing permission.** An app-only token lists what an admin granted in its `roles`, so the Health screen says which of mail, sending, Teams and the calendar, and transcripts is not granted, with no extra call. Health also shows WhatsApp and Scoop lines.
- **A Teams meeting follows the people:** a candidate pulling out of a client interview, and rejecting an internal applicant whose interview is still ahead, now cancel the Outlook event (it was left in the organiser's calendar).
- **Not done, on purpose: the Outlook calendar for the whole team.** The 21 Nov decision stands: the Calendar shows only the signed-in person's own events, because the app permission reaches every mailbox and a screen must not widen that. Seeing a colleague's *free times* is still possible through Aura's `free_times`, from the meetings and interviews Ops itself holds.

## 25 Nov: CVs posted in a WhatsApp group (branch `hdbinath/whatsapp-group-cvs`)

- **One WhatsApp group, made by the Ops number, is read as a CV inbox.** Documents posted in it go into the same Scoop CV intake as the emails ([28](28-WHATSAPP.md)). This is the one group the system reads, because it is one the system created. A group message never goes to the Inbox, matches a phone or stops a chase.
- **Costs and limits, accepted:** it needs a Cloud API number (not Coexistence on the same number); 8 people at most, our number included; a CV after 17:30 misses that day's summary; a CV sent 1:1 by somebody who is not a client's or an enquiry's contact is read too (decided later the same day, because Meta does not yet allow groups on the Ops number: it is not an Official Business Account); phone-made groups still cannot be joined. Meta publishes no sample of a document inside a group, so a real test comes before anyone relies on it.
- **Open question: who are these CVs for?** They are filed as applicants to Career 141's own vacancies. If the people posting them are candidates for **clients**, they belong in the TA System, through its API, not in Ops internal hiring. Needs the owner's answer before the group is switched on.

## 26 Nov: set tracking and the export (ops lead, 25 Nov meeting; branch `rayan/set-tracking`)

- **Client feedback stays manual entry.** The tracking reads what a person recorded through "Record the answer" and the interview decisions. A WhatsApp reply is not read into it.
- **Who is listed.** A candidate appears once they are in a set that has gone to the client, or have gone further (interview, offer, joined, out). Candidates still with the TA or in an unsent set are not shown, because the table is meant for the client.
- **The export needs no money permission.** It holds names, sets, stages and feedback, no salary or fee, so any signed-in person may take it (as the set zip). The salary is never a column.
- **Backup ops follows PR 1.** The collapsible block shows the Ops owner only until `backupOwnerId` exists.
