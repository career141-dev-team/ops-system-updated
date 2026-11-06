# Page one: running the whole thing for real, on one laptop

Written 6 November 2026, because the owner asked the right question: forget
hosting for now — **what would it take to run the real system, with real data,
real email and no stand-ins, on this machine?**

Hosting is page two ([27](27-DEPLOYMENT-AND-KEYS.md)). This page is everything before it.

Everything here is in order. Each item says what it is, what you have to get
from outside, what I build, and how we prove it is real rather than believing
it is.

---

## 0. The two rules that never relax, local or not

They are not here for tidiness. Both exist because of something that went
wrong before.

1. **Nothing reaches a client or a candidate except as a draft a person
   approved.** Running locally does not loosen this. The laptop can send real
   email through Microsoft the moment the credentials exist, so the guards
   matter *more* here, not less.
2. **Nothing writes into the live TA System from a laptop.** Reading from it
   is fine with your say-so. Writing is not, ever, at any stage of this page.
   Ops writes to TA for the first time on the server, in the pilot, on page
   two.

---

## 1. First, three things nobody had on a list

I found these by reading the code today rather than the plan. The first one is
a genuine blocker for everything that follows.

### 1.1 There is no real sign-in. This blocks real data.

`src/lib/session.ts` is 39 lines. You pick a name from a list and it is kept in
a cookie. There is no password, no account, nothing to verify. Its own comment
says so: *"Real Clerk sign-in replaces this before any real client data
exists."* No authentication package is installed — the dependency list is
Convex, Next, React, Tailwind, Zod, the S3 client and JSZip.

What that means in practice:

| With | What happens |
|---|---|
| `OPS_DEV_SIGNIN=on` | anyone who reaches the address picks any identity, including the Director of Operations, with no password |
| `OPS_DEV_SIGNIN=off` | `currentMember()` returns nothing, every page redirects to sign-in, and **the app cannot be used at all** |

So real client data cannot go in until this is built. It is not a large
change — everything downstream already receives a `member` and never asks how
it was decided, which is exactly what that comment was protecting — but it is
the first thing, and it is mine.

**You decide one thing:** Clerk (what the plan assumed, and what the TA System
uses) or Microsoft sign-in (everyone already has a Microsoft 365 account, and
we are asking Microsoft for mail permissions anyway, so it is one admin
conversation instead of two). I would take Microsoft for exactly that reason.

### 1.2 `OPS_OUTREACH_LIVE` does nothing

It is in `.env.example` under the words *"Nothing reaches a client or a
candidate while this is off"*. It is in the build plan four times. It is the
last row of the switch table in [22](22-GO-LIVE.md), which says to turn it
**on** and the outbound lock **off**.

**No application code reads it.** The only thing in the repository that looks
at it is a deploy script that refuses to push if it is set.

What *does* exist, and is tested, is `switch.outreachLive` on the Settings
screen: with it off, every client message goes to the test address instead of
the client. So test mode has always been real — the documents simply name the
wrong lever, and following 22's last row would set an environment variable
that does nothing while taking off the outbound lock, which does.

The fix, built on 6 November: the environment variable becomes a **veto the
data cannot carry**, and both have to agree. A setting lives in the database,
so it travels with a restored backup — and 22 tells you to rehearse a restore
on the laptop. The Health screen now names whichever of the two is off, because
"test mode" on its own sends somebody looking in the wrong place.

### 1.3 The local backend never receives its own code

`deploy/local/start.sh` brings up Convex and Postgres in Docker, waits for the
backend, generates the admin key, and starts the website with
`OPS_STORE=convex`. It never pushes `convex/ops/` to that backend. The preview
workflow does (`npx convex deploy -y`); the local script does not.

So the moment you move off the JSON file, every read fails. One line fixes it,
and it has to be in the script rather than in somebody's memory.

---

## 2. The store: off the JSON file, onto a real database

Today the app runs on `OPS_STORE=json`, which is a file of invented sample
data. Real data needs the real store.

**What it is:** Convex and Postgres in Docker on this machine, listening on
127.0.0.1 only. `deploy/local/docker-compose.yml` already describes it. The
code behind it is real and finished — `convex/ops/data.ts` is 2,081 lines and
64 functions over a 713-line schema.

**You need:** Docker Desktop running. Nothing else, no account, no key.

**Done, 6 November.** The backend was brought up, the functions pushed, and
the app walked on the real store: every page, a lead written, the record read
back, and the clocks run. It found three things, which is why it was worth
doing rather than assuming:

| Found | What it was |
|---|---|
| **`/mail` was a 500 on Convex and fine on JSON** | `attachmentFileIds` was `v.optional` in the schema while the TypeScript type says `Id[]`. A row written without it came back with no field at all, and the mailbox read `.length` of undefined. The schema says required now, both inserts fill it, and `tests/schema.test.ts` names the fields that may be optional so the next one is a deliberate act |
| **The checked-in Convex index was stale** | `convex/_generated/api.d.ts` was missing `crons` and `ops/clock`. This is the same staleness that failed a TA release on 5 November |
| **`clerkUserId` in the schema** | read by nothing, written by nothing, left from when the plan assumed Clerk. Gone |

One thing that looked like a fault and was not: a saved lead bounced back to
the sign-in screen. The cookie held a member id from a seed that had since
been wiped, so the person it named no longer existed. Being asked to sign in
again is the right answer to that.

**Done, 6 November, and it needed one correction first.** The suites did not
run against the JSON repository "directly" - sixteen of them import
`src/data/desk.ts`. What was true is sharper and worse: **no test had ever
awaited `desk()`**. They take the plain helpers that live in that file and
never the async path, so every `usingConvex()` branch - 97 functions here, 64
on the backend - ran for the first time when a person opened a page.

The runner also forced `OPS_STORE=json` on every child process, so
`OPS_STORE=convex node tests/run.mjs` ran on JSON and printed *All 45 suites
passed*. A green run that proved nothing, and one I reported before noticing
it finished in the same 95 milliseconds as the JSON run.

Both are fixed:

| | |
|---|---|
| `tests/bothstores.test.ts` | writes and reads back through the real path - a lead, a message, a clock, the audit - and checks **shape**: every field the type promises is actually there. It fails on a backend with the old schema and passes on JSON, which is the fault exactly |
| `tests/run.mjs` | takes `OPS_TEST_STORE`, says which store it ran on in its last line, and **refuses** to fall back to JSON when asked for a backend it has not been given |
| `npm run test:convex` | brings the backend up, pushes the functions, runs all 46 suites against it |

The suite writes rows, so it refuses any address that is not this machine.

**46 suites green on both stores**, and the Convex run takes 1.3 seconds where
JSON takes 12 milliseconds - which is how you can tell it really went.

---

## 3. Real data in

Three things, and the screen for them is built: `/import` under Settings.
It reads a pasted sheet, dry-runs first, names the line of a bad row, and
running the same file twice adds nothing.

| What | Columns it wants | Where it comes from |
|---|---|---|
| **Clients** | the real client list with their ops owner | your master sheet |
| **Holidays** | the 2026–27 Sri Lanka list | the public calendar, plus your own closures |
| **People** | the ops team with their roles and real email addresses | you |

**You need to give me:** those three as sheets or CSV. Real names are fine —
they stay on this machine and in the local database, and none of it goes near
the repository.

**Also decide:** whether Saturday is a working day. Every clock in the system
counts working days, so this one answer moves hundreds of dates.

**Then the harder half.** The import covers the three above. The *open work* —
live positions, CV sets already with clients, interviews booked, placements
inside their guarantee — is not an import, because each row has to land in the
right stage with the right clocks already part-run. That is its own piece, and
it needs your decision on how far back to go. My recommendation: don't. Start
the system on the day you start it, let the old work finish the old way, and
only carry across **placements still inside their 90 days**, because those
carry money and a promise.

---

## 4. Real email, both directions

This is the heart of what you asked for: the desk works in this system, not in
Outlook.

The code is real and finished. `src/lib/graphMail.ts` reads
`/users/{mailbox}/messages` from Microsoft Graph; `src/lib/senders.ts` creates
a draft in the sender's own box and sends it, with attachments, and with
`In-Reply-To` so a reply lands under the original in the client's thread.
Neither has a stand-in. They need credentials and nothing else.

**You need, from the Microsoft 365 admin centre:**

| Thing | What it is |
|---|---|
| `MS_TENANT_ID` | your tenant's id |
| `MS_CLIENT_ID` | an app registration for Ops — a new one, not the TA System's |
| `MS_CLIENT_SECRET` | its secret |
| **`Mail.Read`** | application permission, admin consent granted |
| **`Mail.Send`** | application permission, admin consent granted |
| `ops@career141.com` | the box the system sends from |

A word on the permissions, because they are broader than they sound.
Application permissions of this kind grant access to **every** mailbox in the
tenant, not only the ones we name. Microsoft's own answer to that is an
*application access policy*, which restricts the app to a named group. Ask
your admin for one, with a group holding only the boxes below. It takes them
five minutes and it means a mistake in our configuration cannot read the whole
company.

**The boxes to put in that group, and in `OPS_MAILBOXES`:** `ops@`,
`opsteam@`, `joborders@`, `cv@`, `interviews@`, `hello@`, and each ops
person's own address. The reader reads the box the reply actually landed in,
which is the sender's own — that was decision 11, narrowed on 2 November.
Nobody is asked to change how they write.

**I do:** turn `OPS_MAIL_READ=on`, watch the Mail screen's per-box last-run,
and check that replies file against the right lead and the right set rather
than against the subject line.

**What stays off at this stage:** `OPS_SEND`. Reading first, for as long as it
takes to trust the filing. Sending is section 9.

---

## 5. Real documents

Two documents go to clients: the agreement and the invoice. The filling is
built — `src/lib/docxFill.ts` fills the holes in the body, the headers and the
footers, escapes what it writes (a client called "Smith & Co" made an
unopenable file), and refuses to send when a hole has no value.

| What you give | Why it is needed |
|---|---|
| **Read and correct the agreement template** at `.local/ESA-TEMPLATE-career141.docx` | it was made from the real Nippon Paint draft with every detail replaced by a named hole. It has never been read by you. Until it is, we are one template away from sending a client a contract nobody checked |
| **An invoice template**, as a Word document with the same kind of holes | without it an invoice goes as lines in the body of an email. That works. It is not your paperwork |
| **A credit-note template** | same, for the refund and the unreported-hire surcharge |
| **LibreOffice installed** | it is what turns the filled Word file into the PDF the client receives. Without it the screens say so plainly rather than failing |

The three decisions in `.local/ESA-TEMPLATE-NOTES.md` are settled — the refund
is 50% and late payment is 1% a month compounded, both taken from the document
on 3 November — but **clause 1.1 still says "working calendar days"**, which is
two different things, and every date in the agreement hangs off it.

---

## 6. The real TA link — reads only

The TA side is built, merged and live in production since 5 November. It
answers 401 until somebody sets the token.

**You need:**

| Set | Where | Value |
|---|---|---|
| `OPS_API_TOKEN` | the TA deployment's environment | a long random string you generate |
| `OPS_TA_TOKEN` | here, in `.env.local` | the same string |
| `OPS_TA_BASE_URL` | here | the TA API address |
| `OPS_TA_FAKE=off`, `OPS_TA_READS_ENABLED=on` | here | |

**Stay off, on a laptop, without exception:** `OPS_TA_WRITES_ENABLED`, and
`OPS_API_WRITES_ENABLED` on the TA side. A write from here reaches 78,000 real
candidates' system. Writes wait for the server and the pilot, on page two. A
write attempted with the switch off waits in our outbox and is lost by nobody.

**What you get the moment reads are on:** real openings, real pipelines, real
CV sets, the real events feed. The board and the weekly report stop being
invented.

**I do:** walk every read against the real API and compare what comes back
with what the stand-in has been returning. Four faults turned up last time I
wired these two sides together, and all four were in the shape of the data
rather than in the logic.

---

## 7. Real WhatsApp

**You need:** the Ops WhatsApp number bought and verified with Meta, then
`OPS_WHATSAPP_NUMBER_ID` and `OPS_WHATSAPP_TOKEN`.

**I build, once the number exists:** the conversation view — the last thing
outstanding from your own list of six. The sending code is already there and
already behind the same draft-approve-send gate as email.

This is the restriction you described: a person writes the WhatsApp message in
this system, somebody approves it, and the system sends it. Not a person
opening WhatsApp on their phone.

---

## 8. The AI layer

**You need:** an `ANTHROPIC_API_KEY` or a `DEEPSEEK_API_KEY` — either alone is
enough — and then `switch.aiEnabled` on, on the Settings screen.

Everything is built and off: dictation, reading what a client sent, improving
a draft, summaries, the ask box. There is a ledger with cost per run and what
the person did with the result, which is where accuracy and spend get read
from, and a daily budget in `ai.dailyBudget`.

**Still mine to build:** the "what to do first today" line, and an ask box that
*acts* rather than only reads. Both are phase 9 steps 12 and 14.

**Start it with a small daily budget.** The ledger will tell us inside a week
what it really costs, and the number can go up once it is a number rather than
a guess.

---

## 9. Turning sending on, last

Everything above happens with sending off. Then, in this order, and not faster
than one a day:

| Step | What | Why this order |
|---|---|---|
| 1 | `OPS_OUTBOUND_ALLOW_EMAILS` = your own address only, `OPS_OUTBOUND_LOCK=on` | the lock is the real guard. Set it before the thing it guards |
| 2 | `OPS_SEND=on` | now exactly one address in the world can receive anything |
| 3 | send yourself a real agreement, a real set, a real invoice | read every one before approving it |
| 4 | add one pilot client's addresses to the allow-list | still nobody else |

The lock does not come off on a laptop. It comes off on the server, after the
pilot, on page two.

---

## 10. The small keys, and the settings nobody can guess

**Keys you generate yourself** — `openssl rand -hex 32` each, no account
needed:

| Key | What it does |
|---|---|
| `OPS_CLOCK_KEY` | the backend asks the app for a clock pass every five minutes. Both sides need the same value, and with none set nobody may ask |
| `OPS_WEB_LEAD_KEY` | the website's form sends it in `x-ops-lead-key`. With none set, nobody may post a lead |
| `OPS_SESSION_SECRET` | written by the start scripts, and **read by nothing** — it is not a real guard today. It becomes real in 1.1 |

**Settings you fill on the Settings screen, which no default can supply:**

- `report.recipients` — the Director's address, or Monday's approved report
  has nowhere to go
- `OPS_COMMON_MAILBOX` — copied on every client email, so a thread is never
  one person's alone
- `OPS_OUR_DOMAINS` — already `career141.com`; add any other you send from

**And the website form:** give whoever looks after career141.com the page
`docs/WEBSITE-LEAD-FORM.md` and the lead key. The email to `hello@` keeps
working, so nothing breaks while it is tried.

---

## 11. What is still not built, and will not be by the end of this page

Honestly, so it is not a surprise later:

| Thing | Why |
|---|---|
| Real sign-in | section 1.1 — mine, and first |
| The outreach switch that works | section 1.2 — mine |
| The WhatsApp conversation view | waits on your number |
| The invoice and credit-note documents | wait on your templates |
| The Teams link made from the Ops mailbox | waits on a calendar permission |
| "What to do first today", and an ask box that acts | phase 9, steps 12 and 14 — mine |
| Reading the client's offered interview times; the ICS export | phase 9, small — mine |
| Phase 7's analytics | no screen; kept weekly as numbers |
| Carrying the open work across | section 3 — needs your decision first |

---

## 12. The order, and what each step is waiting on

| # | Step | Waiting on |
|---|---|---|
| 1 | Real sign-in | **your choice**: Clerk or Microsoft |
| 2 | The outreach switch made real | me |
| 3 | The local backend gets its own code, suites run against Convex | me |
| 4 | Clients, holidays and people imported | **your three sheets**, and the Saturday answer |
| 5 | Mail reading on | **your Microsoft app registration** and the access policy |
| 6 | The agreement template read; invoice and credit note made | **you** |
| 7 | TA reads on | **your token**, set on both sides |
| 8 | AI on | **your key** |
| 9 | Sending on, to your address alone | nothing — once 1 to 8 are done |
| 10 | WhatsApp | **your number** |

Steps 2 and 3 are mine and need nothing from you, so they start immediately.
Everything else moves the day the thing beside it arrives.

When all ten are done, this laptop runs the real system on real data: real
mail in, real drafts, a real person approving, real mail out, real documents,
and the real TA System on the other side of the link. Then page two takes
exactly that and puts it on a server.
