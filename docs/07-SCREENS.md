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
- **Minimal, and overlays only where drawn.** No pop-up dialogs, no nested pop-ups. A thing opens
  as its own page or expands in place. A confirmation is a line with a button, not a box over
  the screen. Four exceptions the owner drew:
  1. the top bar called back over the page (13 Nov);
  2. a PDF or picture opened from a draft in My Work's To approve (16 Nov);
  3. the card that opens from the profile, with the page blurred behind it (16 Nov);
  4. **state panels (19 Nov, the v6 design): a screen's own states - find a time, write a
     result, add a payment - open as a 680px drawer on the right, driven by `?panel=`**
     (`app/ui/Panel.tsx`, `src/lib/panel.ts`). It is a native `<dialog>`: focus stays inside,
     Escape and the X close it, the address says which one is open, and with no script the same
     links open and close it. Forms in a panel post to the existing server actions with a hidden
     `back`. The small cards from the + and the bell in the top bar are the same kind of thing.
  5. **AURA's round button in the bottom-right corner (23 Nov)**, on every page while the column is
     shut: it opens the column on the desk and AURA's page on a phone. AURA's "Your desk" numbers are a
     small dropdown in the column's header.
- **One thing now (18 Nov).** A record page says the step the work is at, once, and the rest stays
  quiet: a second current step is a small "also happening" card, finished steps are one line each,
  and the exceptions sit under "Something different?". **No progress bar (owner, 18 Nov):** a
  person moves freely. A lead's five sections are plain tabs, the one the backend says is next
  carries a small dot, and the links to the rest of the client's work (lead, opening, placement,
  invoice, guarantee) list only what exists. The order is the backend's - its rules refuse what
  is out of turn - and the screen does not draw it. A finished step sends the person to the page
  that opens on what comes next.
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

## Motion (21 Nov, on branch `hdbinath/motion-teams-aura`)

GSAP, kept small. It helps a person see what changed; it never makes them wait.

- **What moves:** a page fades in and rises a few pixels on arrival; the tab underline is one pill that slides between tabs; a drawer's backdrop fades with the 680px panel; lists and card groups stagger in; numbers on the home page count up; buttons and rows have a small hover and press response.
- **Durations (seconds):** fast `.2`, base `.42`, panel `.48`, stagger `.05` between items.
- **Reduced motion:** with `prefers-reduced-motion` set, none of it runs. Content just appears, in its final place, and nothing depends on an animation finishing.
- **Stagger convention:** put `data-stagger` on a container and its children stagger in. Mark a list or grid, not each row, and keep it to the first screenful so a long list does not take a second to appear.
- **Rules:** motion never delays a click or hides content that has not arrived, never moves something a person is about to press, and is never the only sign of a state (the colour, the label and the clock still say it).

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
