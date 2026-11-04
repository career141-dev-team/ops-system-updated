# The Ops screens: the plan, and what to build first

Written 4 November 2026. The system works end to end and every feature has a
screen, but the screens grew one phase at a time and it shows: twenty-four
links in one row, and a lead's page with nine forms open at once. The owner's
own words on 3 November were that the flow is complicated and that nothing
felt useful yet.

This is the plan to fix that, and the first piece of it — phase 2's own
screens — is built in the same pull request so the pattern is real and not a
drawing.

## 1. What is wrong now, exactly

| What | Why it hurts |
|---|---|
| 24 flat links in the header | Nobody reads twenty-four of anything. Finding "holds" means scanning a list of words that are all the same size |
| Every form on a page is open at once | The lead page shows the intro call, the agreement, its chase, the negotiation, the requirement, the hand-over and the dictation together. The page does not say what to do **now** |
| Nothing says where a thing is in its own life | A lead at "requirement" and a lead at "chasing the agreement" look identical until you read the forms |
| The same thing is worded differently in two places | "CV sets" in the header, "the set" on the page, "client set" in a message |
| Everything is the same size | A deadline today and a note from last month are both 13px grey text |

## 2. Five rules the screens follow

These are the owner's rules from 2 November, made concrete.

1. **One page per thing.** No overlays, no modals, no drawers, ever. A thing
   you can open is a URL you can send somebody.
2. **The next step first.** Every "one thing" page opens with a short card:
   where this is, what is waiting, and the one or two things to do now. The
   rest of the page is the record, in order, below it.
3. **Edit in place.** A field is a field on the page; saving is a button
   beside it. Nothing is a wizard and nothing is a second screen.
4. **Plain words, the same words everywhere.** The header, the page title, the
   task and the message all call a thing by one name. The glossary
   ([12](12-GLOSSARY.md)) is the arbiter.
5. **The clock is visible wherever one runs.** If something will happen by
   itself, the page says what and when, in words — "the chase goes tomorrow at
   nine unless they reply".

## 3. The shell

**Two levels, never more.** Five sections, always visible; under them, the
pages of the section you are in. Nothing is hidden behind a hover.

| Section | Pages | Who lives here |
|---|---|---|
| **Today** | Your day · Mail · Calls | everybody, all day |
| **Clients** | Leads · Clients · Positions · Adverts · Talent Pulse | the ops owner |
| **The search** | CV sets · Holds · Interviews | the ops owner |
| **Money** | Placements · Invoices · Guarantees · Closing | accounts and the lead |
| **Set up** | Report · Numbers · AI · Templates · Files · TA System · First day · Settings · Health | the ops lead |

The current section's pages are a second row; the current page is marked. The
header keeps the "test data only" badge and who you are signed in as, which
the preview needs.

## 4. Three page patterns, and nothing else

### A list page

A sentence saying what the page is for. Then the lists in the order the work
matters — late first, waiting second, done last — each with its count. One
line per row: the name as a link, and one line of plain words under it saying
where it stands. No tables, no columns to read across.

### A "one thing" page

```
← back to the list
NAME                                     where it stands, in one line
the owner · the client · the position

┌─ What to do now ──────────────────────────────────────────┐
│ one sentence: what is waiting, and on whom                │
│ [the one or two buttons that move it]                     │
│ what will happen by itself, and when                      │
└───────────────────────────────────────────────────────────┘

The record, in sections, in the order things happened.
Each section: a heading, what it holds, and its own form if it has one.

What happened to it — the audit, newest first.
```

The "what to do now" card is the whole point: it is written from the same
rules the system already has (`handoverInWords`, `whereItStands`,
`interviewInWords`, `guaranteeInWords` and the rest), so it cannot drift from
what the buttons will actually let you do.

### A form page

Only where a thing is being made from nothing: the first-day import, a new
lead. Fields in the order a person says them, the required ones first, and a
line under each saying why it is needed.

## 5. What a person sees in the first ten seconds

Your day stays the front door and gains nothing clever: to approve, due today,
late, the clocks. Underneath, one line per section saying what is waiting
there — "3 sets waiting to go", "1 invoice late" — each a link. That line is
read off the same rules the section's own page uses.

## 6. Screen by screen

| Screen | Pattern | What changes |
|---|---|---|
| Your day | list | section counts added; the rest already reads well |
| Leads | list | one line per lead saying where it is, late ones first |
| Lead | one thing | **rebuilt**: the next-step card, then the record in sections |
| Clients | list | one line each: stage, what is open, what is owed |
| Client | one thing | **rebuilt**: the next-step card, the summary, then the record |
| Positions · Position | list · one thing | the card says whose move it is (TA's or ours) |
| CV sets · Set | list · one thing | the card says due, sent, or waiting on the client |
| Holds · Hold | list · one thing | the card says when the review is due |
| Interviews · Interview | list · one thing | already close; the card replaces the four stacked forms |
| Placements · Placement | list · one thing | the card says joining, joined, or waiting on a choice |
| Invoices · Invoice | list · one thing | the card says owed, late, or settled |
| Guarantees · Guarantee | list · one thing | the card says days left, or whose decision it is |
| Closing · Close | list · one thing | the list is already a checklist; keep it |
| Adverts · Advert | list · one thing | the card says whose step it is: marketing, ops, TopJobs |
| Mail | list | the "needs filing" list first; the reader's own state in words |
| Report · Numbers · AI · Health | list | leave them; they are already single-purpose pages |
| Templates · Files · Calls · TA System · First day · Settings | form or list | leave them; they are tools, not the day |

## 7. The order to build it

1. **The shell** — two-level navigation, five sections. Touches one file and
   every page at once. *(This pull request.)*
2. **Phase 2's screens** — the lead and the client, as the pattern. They are
   the worst two and the most used. *(This pull request.)*
3. The search: sets, holds, interviews.
4. Money: placements, invoices, guarantees, closing.
5. Your day's section counts.
6. The rest, as each is touched for other reasons.

Nothing in steps 3 to 6 is urgent: every one of those screens works today.
They get the pattern as they are opened for a change, not in a sweep.

## 8. What this plan does not do

- **No design system, no component library, no new colours.** The tokens in
  `globals.css` are the design: paper, surface, ink, rule, brand, warning.
- **No client-side framework.** Server components and server actions, as now.
  The only client component is the microphone, because it must be.
- **No dashboard.** The owner's rule, twice: no spreadsheets and no dashboard
  rebuild. Numbers live on `/numbers`, and the weekly report is the one that
  goes out.
- **No mobile app.** The screens work at phone width because they are one
  column of plain rows, and that is as far as it goes until somebody asks.
