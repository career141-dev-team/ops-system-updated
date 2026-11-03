# M1 · Foundations

_Written 2 Nov 2026, from the template in [10](../10-FEATURE-PLANNING.md) and Phase 1 of
[15](../15-BUILD-PLAN.md). This is the first feature plan. The owner reads it, then it is
built._

## Purpose

Nothing in Ops works without four things: the people and what they may do, a clock that
remembers, a message that drafts and sends only when a person approves, and a window to the
TA System. M1 builds exactly those, and the one screen that shows them: the inbox.

It solves nothing business-specific by itself. It is what every later feature stands on, and
it is the first thing the owner can click.

## Who uses it

| Role | What they do in M1 |
|---|---|
| Ops owner (Rushda) | Signs in, works from the inbox: what needs approving, what is due, what is late, what clock is running out |
| Ops lead | The same, plus sees every owner's inbox and can move a task to someone else |
| Accounts (Asma) | Signs in and sees tasks passed to her |
| Director of Operations, Director, marketing, TA lead | Sign in, see only what their role allows |
| The system | Fires clocks, creates tasks, drafts messages, reads the TA System, writes down everything it did |

## The flow

The thin skeleton first, then the rest. Each numbered item ends with something on a screen.

**The skeleton (first)**

1. Sign in with the simple dev sign-in: pick your name from the list of Ops people. The page
   shows who you are and your role.
2. The inbox page, empty at first, in four parts: to approve, due today, late, clocks.
3. One real clock: start a two-hour test clock from the page, see it counting down, see it
   fire and leave a task in "due today".
4. One drafted message: the system drafts a test email, the page shows it, you edit it or
   approve it. In test mode it does not go to anybody; the page says so plainly and names
   the test address it would have used.
5. One read from the TA System: the page lists the TA desk's people, read live through the
   API. This proves the window works.
6. The preview link on the VPS, password-protected, showing all of the above.

**The rest of M1**

7. People and roles: Ops members synced from sign-in, each with a role; one place that
   decides what a role may do; every write checks it.
8. Settings: every number and switch from the plan in one place, with a screen to read them
   and the ops lead able to change them. Nothing is a number buried in code.
9. The Sri Lanka holiday list, and the working-day helper that uses it, so "7 working days"
   means the same everywhere.
10. The clock engine in full: start, cancel, move; a warning before it fires; one check every
    minute; a switch to turn all clocks off.
11. Tasks: create, done, snooze, pass to someone else, record an outcome. The inbox is the
    view over them.
12. The escalation ladder: a task nobody has done goes to the ops lead after a day, and to
    the Director of Operations after three days for money and guarantee work.
13. Messages in full: draft, edit, approve, send, with email and WhatsApp senders, the group
    post as a task, and the safety gate (test mode, test recipients, do-not-contact, a daily
    cap per client).
14. Chasing stops on a reply: when a client answers, every chase clock for that subject
    cancels itself.
15. The mailbox reader: read `ops@career141.com` every two minutes, file each email against
    the right client and subject, leave the ones it cannot match for a person, and raise an
    alert if reading stops.
16. The TA window: every read the plan lists, each one logged, with switches to turn reads
    and writes off, and a fake TA for tests.
17. The outbox: a write to TA that fails is queued and retried, and a health page shows the
    last read, the last write and how far behind the events are.
18. The events reader: TA's events copied in every minute, with handlers that do nothing yet.
19. Files: upload, store in Cloudflare R2, keep a registry, and convert a Word document to
    PDF when needed.
20. Call tasks: a task with who to call and why, and a place to record what was said. No
    dialling, by the owner's decision.
21. Templates: the message templates in one place, editable by the ops lead, with their
    placeholders checked.
22. The audit trail: every change recorded with who, what, before, after and why.

**Branches that matter**

- A clock fires while the owner is away: the task escalates on the ladder rather than sitting.
- A message fails to send: it goes to "failed" with the reason on the screen, and nothing is
  silently lost.
- The TA System is unreachable: reads show the last known value with a plain warning, writes
  queue, and the health page says so.
- The mailbox cannot be read: an alert after the threshold, exactly as the TA System does.
- An email arrives that matches nothing: it waits in "to file" instead of being guessed at.

## Rules and numbers

All from the settings list in [15](../15-BUILD-PLAN.md) Phase 1 step 9, and stored in
settings rather than code.

| Rule | Value | Where it comes from |
|---|---|---|
| Clock check | every minute, 50 at a time | plan |
| Escalation to the ops lead | after 24 hours | plan, owner 1 Nov |
| Escalation to the Director of Operations | after 72 hours, money and guarantee only | plan |
| Mailbox read | every 2 minutes, 25 at a time | plan |
| Working days | Monday to Friday, minus the holiday list | owner |
| Outreach switch | off while building; test recipients only | hard rule |
| TA reads switch | on | plan |
| TA writes switch | off until the owner says otherwise | plan |

## Information it keeps

The foundation tables from [15](../15-BUILD-PLAN.md) D2: members, settings, holidays, timers,
tasks, messages, inbound, events, audit, files, templates, escalations, call logs, outbox, and
the log of calls made to the TA System. No business tables in M1.

## Connection to TA

- **Reads used:** the desk's people, clients, openings, and the events feed.
- **Writes used:** none in M1 beyond a notification, and even that stays behind the writes
  switch.
- **TA changes needed:** the API itself (Part E of the build plan) plus the system actor that
  the API writes run as. Those are separate pull requests in the TA repository, under the TA
  rules, and only add new endpoints.

## Messages

Only internal ones in M1: a task notice to an Ops person, and the test email used to prove
the draft-approve-send path. No client or candidate ever receives anything from M1.

## Screens

Built with the backend, in this order, in the TA System's look, minimal and with no overlays.

| Screen | What it shows |
|---|---|
| Sign in | Pick your name, for now |
| Inbox (home) | To approve, due today, late, clocks. Each row opens its own page |
| A task | What it is, who owns it, its clock, done, snooze, pass on, record an outcome |
| A message | The draft, editable, with approve and send, and plainly whether it really went |
| Settings | Every number and switch, with the ops lead able to change them, and the holiday list |
| People | The Ops team and their roles, read from sign-in |
| Health | Last mailbox read, last TA read and write, how far behind the events are, which switches are on |

## Alerts and escalations

- A task not done: ops lead after a day, Director of Operations after three days for money
  and guarantee work.
- A mailbox that stops being read, a TA window that stops answering, an events feed falling
  behind: shown on the health page and told to the ops lead.
- Nothing in M1 alerts a client.

## Open questions

1. ~~The preview address~~ **Decided 2 Nov: `ops-preview.career141.com`**, https, one
   password at the proxy, and **only the owner** may open it. The owner adds the DNS A record
   to 94.136.189.48.
2. Whether the Ops mailbox `ops@career141.com` exists yet. Until it does, M1's reader runs
   against a test mailbox.
3. The Ops WhatsApp number is not bought yet, so the WhatsApp sender is built and left off.
4. Which host port the preview app uses on the VPS, and the password itself — both set when
   the deploy step comes, with the owner's go-ahead, and the password is never written down
   in this repository.

## Done means

- Every rule and clock has a test, and the tests run in CI on every pull request.
- The demo, clicked by the owner on the preview link: sign in, a clock fires, a task appears,
  a message drafts, approving it shows it blocked in test mode, a reply to the test mailbox is
  filed and cancels the clock, and the TA people list loads.
- Both type-checks clean, and no secret anywhere in the repository.
- The owner says the inbox is the screen they would want to start their day on.
