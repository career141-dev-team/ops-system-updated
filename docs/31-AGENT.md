# 31 · The desk assistant: a chat that does the work

Written 8 November 2026, after the owner said the traditional UI is not enough:
he wants a chat inside the system that behaves like an agent. A person types
"approve the last email"; the chat shows one line and a button; the click runs
the work; the result shows in the same thread. Every new email, clock and
change from the TA System arrives in the thread as a line with its own
buttons. The screens stay. The chat becomes the way most of the day is done.

The owner sent a reference the same day - an onboarding agent he found - and
the shape is taken from it: the assistant speaks under a small label with no
bubble; the person's words sit in a dark pill on the right with "Sent"; every
choice is an inline button; before anything runs the assistant shows "Here is
what I will do" as label and value rows and asks "Does this look right?" with
two buttons; a working line while it runs; a result card after. The desk's
state is pinned at the top of the thread.

## The decisions (8 Nov, in docs/09)

- **The chat may run every action a person may do on the screens, money
  included**, each behind a button that names the client and the amount
  before it runs. Nothing runs without a click. This supersedes phase 9 step
  14's "never sends, never writes to TA, never touches money": the click in the
  chat *is* the person's approval, so "the system drafts, a person approves,
  the system sends" is unchanged. What stays refused: the AI deciding a reject,
  a hold or a decline; the AI calling anybody; the AI setting a money figure
  itself (it copies the amount from the invoice or from the person's own
  words, and shows it before anything runs); and removing any screen.
- **On a phone the chat replaces Clients in the bottom bar**: Your day · Inbox
  · Chat · The work. Clients stays one tap away in the Everything menu.
- **No overlay, modal or drawer.** The chat is a third column on the desk that
  pushes the page over, opened from the sidebar's header, and its own page
  on the phone. The sidebar stays at eight entries (docs/25).
- **DeepSeek v4 flash through OpenRouter**, the same key and the same daily
  cap; every call in the ledger as task `agent`.

## The two rules, and where they live

1. **The model never executes.** It turns words into an intent and its
   fields, as JSON, and nothing else (`agentPrompt` in `src/lib/aiTasks.ts`).
   Everything after that is rules.
2. **The rules never guess silently.** `src/lib/agent.ts` holds the catalogue
   of what the chat may run and the resolver that turns an intent into one
   button, a question or a refusal: "the last email" names the draft it picked
   on the button; a client must be a whole name or an unambiguous part, or it
   asks; an invoice by number or the client's only open one, or it asks; a
   money amount is on the button before anything runs; a permission the
   person does not have is refused in words. `tests/agent.test.ts` holds all
   of it.

The button runs the **same server action the screen runs**, with the same
FormData, through the same gate (`RUNNABLE` in `app/actions.ts`, typed by the
catalogue's own list so a missing one fails to compile). Every action ends in
a redirect carrying `?msg=` or `?did=`; `chatDo` catches that redirect and
reads the sentence off it, so the gate's own words - "Test mode: sent to
test@… instead", or a refusal - are what the thread shows.

## What is built, pull request by pull request

| PR | What | State |
|---|---|---|
| 1 | The column and the daily set: `chat` table on both stores, `agent.ts` with eleven intents (approve a draft, approve all routine, mark mail done, file mail, finish a task, log a call, keep a note, a new enquiry, write an email, record a payment, send an invoice), `chatSay` / `chatDo` / `toggleChat`, `app/Chat.tsx`, the column in the layout, `/chat` for the phone, the toggle in the sidebar | built 8 Nov |
| 2 | The feed: `src/lib/feed.ts` (tested), `/api/chat` polled every 30 s like the bell and on the tab coming back; new mail with a *Mark it done* button, a clock of yours that ran out, a task made or passed to you, a TA event - each kept once as a feed row, marked by its source. Mail reading is in the clock pass now, so it runs every five minutes without the button | built 8 Nov |
| 3 | The rest of the catalogue, and the "ask for the missing field" turn | after |
| 4 | Memory of yesterday at the top of today; the agent's accuracy on `/ai` | after |

## What the first walk found (8 Nov)

- The model was shown only the intents the person may run, so an ops owner
  asking to record a payment was read as a *question* and answered "no
  information". The model now sees every intent and the rules refuse the
  permission in words.
- A refusal from the model itself (no JSON) read as a bare error; it now
  comes with "here is what I can".
- The rows a person reads before pressing ("Here is what I will do") have to
  be kept on the button, not rebuilt later, or a thread read next week would
  not say what was pressed.

## Not in this document, on purpose

Streaming tokens; voice in the chat (dictation already exists on the fields);
the chat writing to TA outside the existing actions; any new rule about what
a client is sent; WhatsApp, which waits on the number.
