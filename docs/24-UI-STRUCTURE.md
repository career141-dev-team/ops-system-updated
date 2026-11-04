# The Ops screens: the whole structure, and the process for building them

Written 4 November 2026, after the owner walked the app and said, in plain
words: none of the features are in the UI, the navigation is wrong, the AI is
not there, it does not look clean, the old backend work is not covered, and
every section should say what it is for.

This document is the answer to all six. It is the structure, the per-screen
analysis, and the process we follow for each screen. [23](23-UI-PLAN.md) is
still true — the five rules and the three patterns — this is the layer under
it: what every screen must carry, and in what order we build them.

## 1. The finding, before any design

We checked every one of the **100 server actions** in `app/actions.ts` against
every screen that calls it. The result is worth stating plainly, because it
changes what the problem is:

> **Every action is already wired to a screen. Not one is orphaned.**

So "none of the features are in the UI" is not about wiring. It is about
**finding** them. Dictation exists, on one page, with no label saying it is
dictation. Improving a draft exists, inside a message you have to open first.
The depth rule that holds a search at five candidates runs, and the position
page never mentions it. The AI layer is built, and nothing on any screen says
a model could help here.

A feature a person cannot find has not been built for them. That is the fault
this document fixes, and it is a UI fault, not a backend one.

### What was actually wrong, point by point

| The owner's words | What was really happening | What it becomes |
|---|---|---|
| "none of the features are in the UI" | All 100 actions are reachable; nothing announces them | Every page states its purpose; every section lists its pages with theirs |
| "the navbar is not proper — sub-categories must show after a click of the top category" | Clicking a section *navigated* to its first page. You could not look inside "Money" without leaving the lead you were reading | Clicking a section opens its pages **where you are**. Clicking again closes them. It never navigates |
| "the AI feature is not there" | Five AI features exist, scattered, unlabelled, and off without a key | One rule for where AI appears on a screen (section 5), and every screen that could use it says so — including when it is off, and why |
| "it does not look clean" | Everything is one size. A deadline today and a note from last month are both 13px grey | One size scale with three levels, and only one thing per screen in the heavy one (section 6) |
| "old backend processes are not covered" | The clocks, the outbox, the depth rules and the guards run invisibly | Every screen that has a clock running says what it will do and when, in words (rule 5 of document 23) |
| "each section needs to show its purpose" | The header was five words and then twenty-four | A purpose line on every section **and** every page, in `src/lib/nav.ts`, tested so it cannot be left empty |

## 2. The shell

Five sections. Nothing else is ever added to the top row.

| Section | What it is for |
|---|---|
| **Today** | What is waiting on you now, and what the system is about to do by itself |
| **Clients** | Everyone we work for: the enquiry, the agreement, and what they asked us to fill |
| **The search** | The client's side of the search only: the candidate stays the TA System's |
| **Money** | What a placement is worth, getting it paid, and the ninety days after |
| **Set up** | The tools behind the desk: the report, the numbers, the AI, and the switches |

**How it behaves.** A section is a button, not a link. Clicking it opens that
section's pages in the header, in the flow of the page — the header grows and
the page moves down. No overlay, no drawer, no hover menu: the owner's rule
holds. Clicking the same section again closes it; moving to another page
closes it too, because it has done its job.

Each page in the open panel shows its name, its purpose in one line, and how
much work is waiting on it. When the panel is closed the header shows one
quiet line instead: *where you are, and what this page is for*.

**No open/close animation.** A menu is used dozens of times a day; anything
that has to play before you can read makes the whole desk feel slower. The
only motion in the header is the press itself (`scale(0.97)`, 150ms,
ease-out), which is feedback, not decoration.

## 3. The counts, and why they can never lie

`src/lib/sectionWork.ts` is the only thing that counts work. The header and
the day page both read it, so they cannot disagree.

A count is one thing and not a clever score: **an open task assigned to you,
placed on the page its own link points at**. Every task already carries the
link it takes you to, so where a piece of work belongs is a fact we hold, not
a guess. A task with no link, or a link to a page we do not have, counts on
**Your day** — the one page that must never lose anything.

Late work is counted separately and shown in the danger colour. A person can
check any number by opening the page and counting the rows; if they ever
cannot, the rule is wrong and we fix the rule, not the screen.

## 4. What every screen carries

Six parts, in this order, on every screen without exception. A screen missing
one of them is unfinished.

1. **Where you are** — the section and the page, with the page's purpose. From
   the header; the screen does not repeat it.
2. **What this is** — the name of the thing, and one line saying where it
   stands in its own life. Never the state as it is written in the code.
3. **What to do now** — on a one-thing page, the card: what is waiting and on
   whom, the one or two buttons that move it, and what will happen by itself.
   On a list page, the order is the answer: late, then waiting, then done.
4. **The record** — the sections of the thing, with only the step you are on
   open. The rest are one line each.
5. **The clock** — wherever one runs, in words: "the chase goes tomorrow at
   nine unless they reply".
6. **What happened to it** — the audit, newest first, in plain words.

## 5. Where the AI appears

The AI layer is built and switched off until a key is set. The rule for the
screens is the same whether it is on or off:

- **It is offered beside the work, never on a page of its own.** Dictation sits
  on the field it fills. "Improve this draft" sits beside the draft. "What did
  they say?" sits on the mail that came in. A person never goes looking for it.
- **It proposes; a person decides.** Every AI result lands in a field or a
  draft that a person edits and saves. Nothing is recorded by a model.
- **When it is off, the offer still shows, greyed, with the reason**: "AI is
  off — no key is set." Hiding it is how a feature becomes invisible, which is
  the fault this document exists to fix.
- **`/ai` is the ledger, not the feature**: what it is allowed to do, what it
  cost today against the cap, and how often a person kept what it suggested.

| Screen | What the AI offers there |
|---|---|
| Lead, requirement fields | Dictate it instead of typing |
| Any draft message | Improve the wording; use or leave it, which is the sample |
| Mail | Read what the client sent into a task to confirm — recording nothing |
| Client | Summarise everything we have had with them |
| Set, position, placement | A summary of where it stands, on request |
| `/ai` | The ask box, read-only, naming what it used |

**Built on 4 November, with the offers.** Walking the screens for this found
that the message page imported `improveDraft`, `useImprovedDraft` and the
proposal it redirects back with - and rendered none of them. The whole
improve-a-draft feature existed and had no buttons. It has them now, and every
offer above shows while the layer is off, with the reason beside it
(`aiOffReason`, `app/AiOffer.tsx`), rather than disappearing.

## 6. Looking clean, in four decisions

No colours were chosen, no component library added. "Clean" here means a
person's eye lands on the right thing first.

1. **Three type sizes, and no more.** 17px for the name of the thing, 13.5px
   for everything that matters, 12.5px for what supports it. If a third of a
   screen is in the middle size, the screen has not decided what it is for.
2. **One heavy thing per screen.** The card. Everything else is quiet.
3. **Danger is for late, and nothing else.** Not for delete, not for
   emphasis. A red number on this desk means somebody is waiting.
4. **Space does the grouping, not boxes.** A box inside a box inside a box is
   how the lead page ended up with nine open forms.

## 7. Screen by screen

The full sheet is the canvas (the master sheet artboard) and it is the same
list as [23](23-UI-PLAN.md) section 6, with the purpose lines now living in
`src/lib/nav.ts`. The states here are the honest ones as of 4 November.

| Screen | Pattern | State | What it needs |
|---|---|---|---|
| Your day | list | **done 4 Nov** | the section summary, from the one count rule |
| Mail | list | to do | needs-filing first; the reader's own state in words; the AI "read what they sent" offer |
| Calls | list | leave | already one purpose |
| Task, Message | one thing | to do | the message page should say why a send would be refused, and offer the improve |
| Leads | list | to do | one line per lead saying where it is, late first |
| Lead | one thing | **done (PR #19)** | — |
| Clients | list | to do | stage, what is open, what is owed, in one line each |
| Client | one thing | **done (PR #19)** | — |
| Positions · Position | list · one thing | to do | whose move it is; the depth rule said out loud |
| Adverts · Advert | list · one thing | to do | whose step: marketing, ops, TopJobs; the two-week clock |
| Talent Pulse | list | leave | — |
| CV sets · Set | list · one thing | **done 4 Nov** | the card picks one clock of the four; late sets first on the list |
| Holds · Hold | list · one thing | **done 4 Nov** | the review date, and that it never closes by itself |
| Interviews · Interview | list · one thing | **done 4 Nov** | the card replaced seven open forms |
| Placements · Placement | list · one thing | after | joining, joined, or waiting on a choice; the three clocks |
| Invoices · Invoice | list · one thing | after | late with the charge; the CSVs; the drift list |
| Guarantees · Guarantee | list · one thing | after | days left; whose decision a leaver is; paid-fee rule |
| Closing · Close | list · one thing | leave | already a checklist |
| Report · Numbers · AI · Health | list | leave | single-purpose already |
| Templates · Files · TA System · First day · Settings | form or list | leave | tools, not the day |

## 8. The process for one screen

Every screen goes through the same seven steps, in this order. It is the same
process that found the faults in every phase of the backend.

1. **Read the rules it must obey** in `src/lib/`, and the actions it must
   expose. The screen never invents a rule.
2. **Write the words first**, in the rule file, as a function with a test:
   `setNextStep`, `holdNextStep`, and so on. If the sentence cannot be written
   from the data, the screen cannot be honest and the rule needs fixing first.
3. **Build the page** on the pattern, reading those words. No wording is
   written twice.
4. **Check the six parts** of section 4 are all there.
5. **All suites and both type-checks.**
6. **Walk it in a browser.** Every phase so far, this is the step that found
   what tests and types had passed.
7. **One pull request**, with the screen and its rule together.

## 9. The order

1. ~~The shell: five sections, two levels~~ — done (PR #19).
2. ~~"What to do now", the lead and the client~~ — done (PR #19).
3. ~~The header that opens in place, purpose lines, the counts, Your day~~ —
   **done 4 Nov, this pull request.** The demo screen.
4. ~~The search: sets, holds, interviews~~ — **done 4 Nov.** The card for each
   (`setNextStep`, `holdNextStep`, `interviewNextStep`, with tests), and the
   record as shut parts: only the step you are on is open. `app/Part.tsx` is a
   plain `details`, so it needs no JavaScript and is not an overlay.
5. Money: placements, invoices, guarantees.
6. The lists: leads, clients, positions, adverts, mail.
7. The rest, as each is opened for some other reason.

Nothing in 4 to 7 blocks the pilot. What blocks the pilot is the server half
of phase 8.

## 10. What this does not do

- No design system, no component library, no new colours.
- No client-side framework. Server components and server actions, as now; the
  only client parts are the microphone and the header's open/closed state.
- No dashboard. The owner's rule, twice.
- No overlays, modals or drawers. The header panel is in the flow of the page.
- No animation that a person has to wait for.
