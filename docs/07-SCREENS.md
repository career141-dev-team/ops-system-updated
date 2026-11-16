# 07 · Screens (for the UI team)

The screens come **after** the backend. This page tells the UI team how the system is
meant to work, so the designs fit the flow. Nothing here is a design.

## How the screens work

- **Inbox first.** The Ops person starts every day on the Ops inbox: tasks due,
  messages waiting for approval, and anything late. Most work starts from an inbox item.
- **Draft → approve → send.** Almost every client message is drafted by the system.
  The screen shows the draft, lets the person edit it, and has one clear **Approve and
  send** button. Nothing goes to a client without that press, except routine notices
  from one approved template.
- **Reasons before saving.** Every reject, hold, decline and drop-out asks for a reason
  before it can be saved (Director rejections excepted).
- **Clocks are visible.** Wherever a timer runs (ESA, 7-day ownership, feedback,
  invoice, guarantee), the screen shows the time left and turns amber, then red.
- **One client, one owner.** Every client shows its ops owner; the ops lead can move it.
- **TA data is shown, not copied.** Opening, candidate and placement details come from
  the TA System through the API and are read-only on Ops screens.
- Plain, specific messages: "Sent to the client", "Could not send — the email address
  is missing".

## How the screens are built (decided 2 Nov)

- **Every feature ships with its screen.** A backend step is not done until the screen that
  uses it works and the owner has seen it. This replaces "backend first, UI later".
- **A thin skeleton first:** sign in, the inbox, one real clock, one drafted message to
  approve, and one read from the TA System. Everything else slots into that shape.
- **The same look as the TA System.** Same fonts, colours, buttons and plain wording as
  ta-system.career141.com, and the same components where they fit, so the team recognises it
  and we do not design twice.
- **Minimal, and no overlays.** No pop-up dialogs, no modals, no drawers over the page, no
  nested pop-ups. A thing opens as its own page or expands in place. A confirmation is a
  line with a button, not a box over the screen.
  Three exceptions the owner drew: the top bar called back over the page, and a PDF or picture
  opened from a draft in My Work's To approve, and the card that opens from the profile with
  the page blurred behind it (decisions, 13 and 16 Nov).
- **One page per thing,** with a list and a detail view. Edit in place, save on the page,
  show the result in plain words ("Sent to the client", "Could not send — the email address
  is missing").
- **The screen shows the clock** wherever a timer runs, with the time left, turning amber
  then red.
- **Nothing hidden behind hover.** Buttons are visible, labelled with verbs, and reachable on
  a phone.
- **A preview the owner can click, from day one** (decided 2 Nov): the Ops app runs on the
  VPS on its own port and subdomain, with the whole site behind a password at the proxy and
  excluded from search engines. Sign-in starts as a simple pick-your-name dev sign-in, so
  **only test data goes on it** until real Clerk sign-in is in. Each deploy needs the owner's
  go-ahead, as every live change does.

## The 13 screens

| Screen | What it shows |
|---|---|
| **Ops inbox** | Tasks due today and late, messages waiting for approval (client emails, ESA, invoices), escalations, timers about to run out |
| **Leads** | New lead form (source, contact, company), duplicate-client match, banking/finance flag and decline, intro call booking and rebook, lead status |
| **Clients and ESA** | Client list and record (contacts, ops owner, status), ESA draft from the template, approve and send, chase progress, signed and countersigned files, negotiation notes, decline |
| **Requirement and hand-over** | Requirement meeting form (JD, salary, level, location, insights), impractical decline and invite-back date, create the opening for a TA (primary TA, 100% day) |
| **Client CV sets and messages** | Sets ready from TA, approval (draft, edit, approve, send), receipt date, 7-working-day ownership countdown, claimed-CV drop, group post text |
| **Client decisions** | Client replies read in, shortlist or reject per candidate with reason, feedback chase status, silence hold and lift, pipeline depth (add-on, hold at five) |
| **Interviews and calendar** | Who schedules, client slots and matching, booking with Teams link, reminder status, drop-outs and cancellations, attendance, feedback, round decision |
| **Placements and joining** | Placement details (package, joining date, offer letter), joining-date changes with who changed them, joining-day check, no-show and client options |
| **Invoices and payments** | Invoice draft from the ESA fee, approve and send, due date, payments, late charge, chase, write-off, surcharge invoices, CSV export |
| **Guarantees** | 90-day window per placement, leaver handling (replace first, 60-working-day clock), refund decision, clean end |
| **Adverts** | TopJobs requests, flyer, live and closed dates, cost; Talent Pulse weekly list and tracked links; CVs per source |
| **Reports** | Weekly active-positions report for Mr Azeem, ESA return times, client wait on sets, money and guarantee status |
| **Settings** | Message templates, timers and limits, holiday list, Ops roles and ops owners, on/off switches and test mode |

## Who uses which screen

| Person | Main screens |
|---|---|
| Ops owner | Inbox, Leads, Clients and ESA, Client CV sets, Client decisions, Interviews, Placements |
| Ops lead | Everything, plus moving clients between owners |
| Accounts (Asma) | Placements, Invoices and payments, Guarantees, Reports |
| Director of Operations | Guarantees (refund decisions), Reports |
| Marketing | Adverts |
| TA lead | Reports (weekly report), read access to client and requirement details |
