# 21 · Where AI earns its place, module by module

Written 3 November 2026, at the owner's request, and built as
[Phase 9](15-BUILD-PLAN.md) of the plan.

This is the analysis the owner asked for, kept to what is actually true of **our two
systems**. Every line below is tied to a real piece of work somebody does today, in the
flow of [04](04-OPS-FLOW.md) and the owner's own diagram
([14](14-DIAGRAM-DEEP-WALKTHROUGH.md)); nothing here is in because it is a popular idea.

The short version: **the TA System is already full of AI, and the Ops System has almost
none.** What is missing is not intelligence — it is typing, reading and remembering. So
the opportunity is dictation, reading what arrives, drafting what we already draft, and
one place to ask. Not a new brain.

---

## 1. What already exists, and is not rebuilt

From the TA System as it really is (`/ta-system-full-flow`, verified in its code):

| Already AI, in TA | Where | What Ops does about it |
|---|---|---|
| CV reading and extraction | DeepSeek, the CV queue | nothing: Ops asks TA for the prepared CV |
| Candidate scoring, matching, search ranking | Claude first since 5 Oct, then DeepSeek; Qdrant vectors | nothing: a set arrives ready |
| The JD draft and its approval | TA's own AI draft | nothing: Phase 3 hands over the requirement, TA drafts |
| Research and Suggestions on a JD | `claude -p` through the app bridge | nothing |
| Candidate reply reading (WhatsApp and email) | TA's follow-up reader | nothing: candidate contact is TA's side |
| Director reply reading | `reviewReply.ts` | nothing |
| Three model routing layers, with a per-task env switch | `convex/lib/llm.ts`, `src/lib/ai.ts`, the Claude bridge | **copied, not reinvented** (Phase 9 step 2) |
| Voice: LiveKit worker, OpenAI Realtime, ElevenLabs, Fish Audio keys | `voice-agent/` | **the speech-to-text part is reused for dictation; the calling part stays off** |

Two things follow. First, Ops must never grow a second CV reader or a second matcher —
that is how two systems start disagreeing about a candidate. Second, **the voice
machinery is already paid for**: dictation is a small piece of plumbing, not a new
platform.

## 2. What the owner has already decided about AI

These are not reopened by Phase 9. They are its boundaries.

| Decision | Where it came from |
|---|---|
| Calls stay human: a task and an outcome, no AI calling, no telephony | Owner's decision 7, 1 Nov |
| AI voice calls in TA are **suspended**, and the day-2 AI call is switched off | The owner's own notes, card c1144 |
| No candidate is moved on a WhatsApp reply without a person | TA improvement scope, docs/19 |
| Every message to a client or the Director: the system drafts, a person approves, the system sends | Owner's standing rules |
| Nothing closes, holds, declines or drops without a reason that is kept | Owner's standing rules |
| AI is used to **propose, never to act** | Part F7 of the plan |
| The automation line, step by step, through the whole flow | Card c3935, transcribed in the `/ops` skill |

Card c3935 is the backbone of the table below: for sixty steps of the real flow the owner
already said *automate*, *automate the draft and a person approves*, or *manual*. Phase 9
adds nothing to the "manual" ones except dictation, because the owner's reason for
keeping them manual is that a person must judge — and typing was never the judgment.

## 3. The register

Read "level" as: **D** dictation, **R** reading what arrives, **W** writing a draft,
**S** summarising, **O** ordering the day, **X** executing an existing action.
"Who decides" is always a person unless it says otherwise.

| # | Module and workflow | What somebody does today | What it costs us | AI piece | Level | Phase 9 step | Priority |
|---|---|---|---|---|---|---|---|
| 1 | Intro call held | Types the brief, the package and the role after the call, from memory | The brief is the only copy until the opening exists; thin briefs mean a wrong opening | Dictate the call; fields proposed and shown | D | 5-7 | 1 |
| 2 | Requirement meeting | Same, longer, and the TA lead often holds it in their head | The fault on the board: "the requirement was in the TA lead's head" | Dictate; the requirement's fields proposed | D | 5-7 | 1 |
| 3 | Any call outcome | Types what was said to finish a call task | Calls go unlogged, so a chase repeats | Dictate the outcome | D | 5-6 | 1 |
| 4 | A reason on any decline, hold or drop | Types a sentence, or writes "no reply" | A reason nobody can use is the same as none | Dictate; the reason stays the person's words | D | 5-6 | 1 |
| 5 | Client feedback on a candidate | Types what the client said on the phone or in a group | Feedback lives in WhatsApp and is lost | Dictate into the decision record | D | 5-6 | 1 |
| 6 | Every drafted message (agreement cover, five chases, set cover, group post, feedback, invoice chase) | Reads a template, rewrites the tone by hand | Each rewrite is five minutes, and the tone drifts between people | Rewrite, shorter, warmer, more formal, regenerate - on the draft that already exists | W | 9 | 1 |
| 7 | A client's email arrives about an agreement | A person reads it and decides: signed, changes wanted, declined | Read late, the chase keeps running | Classify into a proposal plus a task | R | 8 | 2 |
| 8 | A client's email arrives about a set | A person reads it and records each candidate's decision and reason by hand | The slowest clerical job in the flow; reasons get summarised away | Per candidate: shortlisted or rejected, **with the client's own words** | R | 8 | 2 |
| 9 | A client claims a CV as theirs | A person spots the claim in a thread | A claim after the window costs us the fee | Classify the claim, with the date | R | 8 | 2 |
| 10 | An interview slot or a cancellation arrives | A person reads and rebooks | A missed cancellation is a candidate at a locked door | Classify; the booking stays a person's | R | 8 | 2 |
| 11 | Replying to a client | Writes the reply | Minutes each, several a day | A drafted reply from the thread and the record, facts listed | W | 10 | 2 |
| 12 | Reading a client's history before a call | Scrolls the lead, the agreement, the sets, the audit | Ten minutes before every client call | One summary that names and links what it read | S | 11 | 2 |
| 13 | The agreement's negotiation | Reads a redline thread | What was agreed is argued about later | Summarise the terms as they moved | S | 11 | 2 |
| 14 | A set's feedback | Reads five replies to see where the role stands | Depth decisions are made on a feeling | Summarise the set: who is in, who is out, why | S | 11 | 2 |
| 15 | Starting the day | Looks at four lists and decides | New people cannot tell what is urgent | Order by the rules; AI writes only the reason | O | 12 | 2 |
| 16 | "Where is X?" | Opens three screens | Constant, small, and it adds up | The ask box, read-only, answers with links | S | 13 | 3 |
| 17 | "Draft the chase for X" | Opens the lead and presses the button | Navigation, not judgment | The ask box runs the existing action with its confirmation | X | 14 | 3 |
| 18 | The weekly report to the Director | The TA lead assembles it | It slips, and it is the Director's only view | Numbers from the data, prose from AI, the lead approves | W | 15 | 3 |
| 19 | Deciding whether AI is any good | Nobody can say today | A quietly wrong proposal is worse than none | Weekly sampling; a bad task switches itself off | — | 16 | 2 |
| 20 | Paying for it | Nobody can see what AI costs | A limited subscription ran down on 3 Nov with nobody using it | Every run costed; a daily cap; the health screen shows the spend | — | 17 | 2 |

### Refused, and why

| Asked for | Why not |
|---|---|
| AI phone calls, AI screening calls, voice agents talking to candidates or clients | The owner's decision 7, and TA's voice worker is already suspended. Dictation yes; calling no |
| AI deciding a reject, a hold, a decline or a drop | The owner's rule is a person and a reason. A model may propose the words; it may not make the decision |
| AI sending anything | Everything to a client goes draft → approve → send. That is the whole safety design |
| AI writing to the TA System | Writes go through the outbox with a person behind them. A model that can create an opening can create a wrong one |
| AI setting a fee, a refund, a surcharge or an invoice figure | Money is read from the agreement and the settings. Never generated |
| One chatbot as the way to work | The owner's UI rule: one page per thing, minimal, no overlays. The box is an extra door, never the only one |
| Multilingual everywhere on day one | Sinhala and Tamil are offered per field only once each is proved on real recordings. A wrong transcription in a brief is worse than typing |

## 4. The architecture, in one page

- **One router**, copied from TA's: `modelFor(task)` with a per-task setting, DeepSeek v4
  flash by default, the Claude subscription only for judgment tasks (classification of a
  client's words, a summary somebody will act on), nothing to Opus. A hard timeout, one
  retry, and a budget guard.
- **Never on a hot path.** AI runs from an action a person pressed, or from the clock
  pass. A screen never waits on a model; a model that is down means a screen with no
  proposal on it, which is the normal unaided screen.
- **Schema or nothing.** Every task validates its output before it is shown. No free text
  lands in a field.
- **One proposal shape**, so every screen shows AI the same way: what it suggests, what it
  read, how sure, use-it or ignore-it.
- **`opsAiRuns`** holds every run with its cost and what the person did next. That single
  table answers "is it any good" and "what does it cost", which is the difference between
  an AI layer and an AI rumour.
- **Permissions unchanged.** The layer reads as the person, writes through the same
  actions, and is in the audit like everything else.
- **Least data per task.** A score needs a CV; a reply does not. A client's agreement text
  goes to no model unless the owner says so.

## 5. How we will know it worked

Measured against the baseline screen the system already collects (Phase 1):

| Measure | Today | What good looks like |
|---|---|---|
| Minutes from a call ending to the brief being saved | often the next day | under five minutes, dictated |
| Client set emails sent on the day they were due | unknown, often late | 9 in 10 |
| Client decisions recorded with the client's own words | rare | every one |
| Minutes a person spends writing a chase | about five | under one |
| Proposals a person changes | — | under half, per task, or the task switches off |
| AI spend a day | invisible | inside the cap, visible by task |

## 6. What this is not

It is not a rewrite, and it adds no module. Every piece above hangs off a screen that
already exists, uses an action that already exists, and obeys the approval that already
exists. If Phase 9 were deleted entirely, the desk would still work exactly as it does at
the end of Phase 8 — only with more typing.
