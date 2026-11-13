# The UI architecture: three levels, and nothing below them

Written 5 November 2026, after the owner said the screens still look sloppy:
everything added as tabs inside tabs, no real sub-categorisation, nothing
connecting one part to another, and tools sitting in the way of the work when
they belong in Settings.

He is right. This document replaces the layout halves of
[23](23-UI-PLAN.md) and [24](24-UI-STRUCTURE.md); the rules in those two
about *wording* and *what each screen must carry* still stand.

## 1. What is actually wrong, counted

| The fault | The number today |
|---|---|
| The sidebar is a flat list of nouns | **27 items**, twelve of them under "Records" |
| A record page is a stack of collapsible boxes | **7** on a position, **7** on an interview, **6** on a set, an invoice and a guarantee |
| Things that are the same thing appear as different things | a hold, a set, an advert and an interview are all *a position*, and each has its own top-level entry |
| Tools sit among the work | templates, files, the import, the TA link and health are not somebody's Tuesday |
| Nothing joins the parts | opening the "Interviews" box on a position tells you nothing about the set those candidates came from |

The common cause: **the screens were built one phase at a time, and each
phase added its own top-level place.** Nobody ever decided the hierarchy.

## 2. The rule: three levels, never four

1. **The sidebar** — where you work. Eight entries, and they never change.
2. **The page** — one thing, or one list of things.
3. **One tab bar on that page** — its faces. One bar. Never a tab inside a tab.

Inside a tab there are plain sections with headings. **No collapsible boxes as
structure.** A `details` is for one long thing somebody rarely needs - an
audit trail - not for the shape of a page.

A tab may list children (a position's CV sets). Clicking a child opens **its
own page**, with its own header and, if it needs them, its own single tab bar.
That is still three levels, because you are now on a different thing.

## 3. The sidebar: eight entries

> **Replaced 13 Nov** by the approved Figma top bar (`app/TopBar.tsx`,
> `src/lib/nav.ts`; [09](09-DECISIONS-AND-QUESTIONS.md), 13 Nov). Across the
> bar: My Work · Clients · Openings · Interviews · Placements · Finance ·
> Reports. Behind the profile: The work · Inbox · Settings, and the chat. The
> rule below still holds in its new form: every page sits under exactly one
> entry, and the list does not grow without a decision. The bar hides once
> the page is scrolled and comes back for the pointer at the top edge. The
> table below is the 5 Nov sidebar, kept for its reasons.

| Entry | What it holds |
|---|---|
| **Your day** | to approve, due today, late, the clocks |
| **The work** | the board: every enquiry and position in its stage |
| **Inbox** | every conversation, email and WhatsApp, and the calls the system asked for |
| **Clients** | the companies, and the enquiries that have not become one yet |
| **Positions** | what each client asked for, and everything the search does for it |
| **Money** | placements, invoices, guarantees, closing |
| **Reports** | Monday's report, and the numbers |
| **Settings** | everything that is set up once and then left alone |

Nothing else is ever added to this list. A new feature belongs to one of these
eight or it belongs in Settings.

## 4. Every page, and its one tab bar

### Clients
`Clients · Enquiries` — a client is a company with an agreement; an enquiry is
one that is not there yet. Same list, two tabs, because people ask "have we
heard from them before?" across both.

**One client:** `Overview · Positions · Agreement · People & group · Messages · Money`
Header above the tabs, constant: the name, where they stand, who owns them,
and the next-step card.

### Positions
`Positions · Talent Pulse` — the second tab is Tuesday's compiled list, which
is a view of the same positions.

**One position:** `Overview · CV sets · Interviews · Advertising · Messages · History`
Header: client and role, the stage, whose move it is, the depth rule in words,
and the next-step card. A hold is **not** a tab: it is a state the header
says, with its lift-or-review button on Overview.

### Money
`Placements · Invoices · Guarantees · Closing` — four tabs, one page. Accounts
live here all day; everyone else visits.

**One placement / invoice / guarantee / close:** its own page, header plus
sections. No tabs: none of them has four faces.

### Reports
`Weekly report · Numbers`

### Settings
`Switches & numbers · What we send · Files · People & holidays · TA System · AI · First day · Health`

Everything that is configured once. The owner's point: it is not the work, so
it is not in the way of the work.

## 5. What joins the parts

Three things, and they are the whole answer to "nothing connects":

1. **The header never changes between tabs.** The name, the state, and the
   next-step card sit above the bar. Moving to another tab never loses what
   you were there to do.
2. **Every child names its parent and links to it.** A set page says which
   position and which client, as links. A position says the client. An invoice
   says the placement. Today some do and some do not.
3. **A tab that is empty says what would put something in it** — "No CV set
   has gone yet. One appears here when the TA System says a set is ready" -
   rather than "Nothing here."

## 6. What moves, from today to tomorrow

| Today, top level | Tomorrow |
|---|---|
| Leads | Clients › **Enquiries** tab |
| CV sets | Positions › one position › **CV sets** tab (its own page for one set) |
| Interviews | Positions › one position › **Interviews** tab (its own page for one) |
| Holds | the position's header and Overview |
| Adverts, Talent Pulse | Positions › **Advertising** tab, Positions › **Talent Pulse** tab |
| Placements, Invoices, Guarantees, Closing | **Money**, four tabs |
| Report, Numbers | **Reports**, two tabs |
| Templates, Files, TA System, First day, Settings, Health, AI | **Settings**, seven tabs |
| Calls | **Inbox**, second tab |
| Mail | **Inbox**, first tab |

Nothing is deleted. Every URL that exists today still works; what changes is
where it is reached from and what sits around it.

## 7. The order to build it

1. **The sidebar: 27 entries down to 8.** One file, one afternoon, and the
   biggest single improvement.
2. **The tab bar component**, and the constant header above it.
3. **The position page** on it, collapsibles replaced by tabs. It is the worst
   page and the most used.
4. **The client page.**
5. **Money and Settings** as tabbed pages.
6. **Empty tabs that say what would fill them**, everywhere.
7. ~~The list pages as tables, and one search box~~ — **done 5 Nov.**

## 9. The lists, and the one box

Every list page is the same four columns, and the same four everywhere:
**Name** (with the one line of plain words under it), **State** (short chips,
a word each - never a sentence), **Owner**, **Last moved**. Above it a plain
GET form: a search box, a "sorted by", and what was found. Because it is a
form and not JavaScript, a search worth keeping is a URL you can send
somebody, and the back button does what it should.

The rules are in `src/lib/listing.ts` with their own tests: every word of a
search has to appear somewhere ("nippon finance" is the finance role at
Nippon, not everything at Nippon and everything in finance); the default
order is **late first, then whatever has waited longest**; an unknown order
is the default rather than a blank table; and an empty table says *why* it is
empty, naming what the search looks at.

`/find` is one box over everything the desk keeps - enquiries, clients,
positions, CV sets, interviews, placements and invoices - because a person
knows the client's name, not which of eight places a thing is filed under. It
is the search at the top of the sidebar, and it uses the same rule as every
list, so what it finds and what a list finds are the same thing.

## 8. What this does not change

The wording rules, the "what to do now" card, the clock said in words, one
page per thing, no overlays or modals or drawers, and the board not being
draggable. Those are not layout; they are how the system tells the truth.
