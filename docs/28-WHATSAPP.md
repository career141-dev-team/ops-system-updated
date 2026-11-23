# WhatsApp: what it is used for, what Meta now allows, and what to build

Written 6 November 2026, because the owner said WhatsApp is the crucial part
and asked how it fits the system.

Everything below about Meta comes from **Meta's own documentation**, read
today, not from a blog. That matters, because the answer changed in October
2025 and the code in this repository still says the old one.

---

## 1. What the desk uses WhatsApp for

Read out of the owner's own cards, not invented:

| | Where it is said |
|---|---|
| A client enquiry arrives by WhatsApp | brief, c1 |
| **A client group is created after the first CV set** | c11, "how ops runs today" |
| The set is posted to that group | c11 |
| Interview updates go to the client by email **and** WhatsApp | c11 |
| After 5pm the TA's candidate feedback is forwarded to the client groups, by ops | c11 |
| Interview feedback goes to the client on WhatsApp, ops sends it | c1 |
| The agreement chase is 3 emails, **2 WhatsApps**, then a call | c1 |
| A silent client is chased by WhatsApp, call, email | c1 |

Two of those are one-to-one with a person. **Five of them are the group.** That
is why this is not a small piece.

The brief also says, twice, that the client's own experience does not change:
*"client and Director touchpoints (email, WhatsApp group updates) stay as
today"*.

## 2. What this system does today

| | |
|---|---|
| Send a 1:1 WhatsApp | **built** — Meta Cloud API, behind the same draft → approve → send gate as email |
| Post to a group | **drafted only.** It settles at *approved* and a person posts it from their phone |
| **Receive any WhatsApp at all** | **not built.** There is no webhook. `app/api/` has the clock, exports, files and website leads, and nothing for WhatsApp |

So WhatsApp is **one-way**. The system can write; it cannot hear. A client who
answers on WhatsApp is invisible to it, and whoever read that reply has to
come and type it in - which is the thing the whole system exists to stop.

The group post carries a sentence in `senders.ts`:

> "Post it from your phone: no system can write to a WhatsApp group."

**That is now out of date.**

## 3. What Meta actually allows, as of today

From the WhatsApp Business Platform documentation. The Groups API arrived on
**6 October 2025**.

| Can we… | Answer |
|---|---|
| Send a message **to a group** | **Yes.** `recipient_type: "group"`, `to: <GROUP_ID>`, same messages endpoint |
| **Read** what people post in the group | **Yes.** The messages webhook carries `group_id`, and `from_user_id` says which participant wrote it |
| **Create** a group | **Yes.** `POST /<PHONE_NUMBER_ID>/groups` with a subject |
| **Add** somebody to a group | **No.** Meta: *"Since you cannot manually add participants to the group, simply send a message with your invite link"* — they join themselves, and we approve or reject the request |
| **Remove** somebody | Yes |
| Join a group that already exists | **Nothing in the documentation allows it** |
| How many people | **8.** That is the whole group, us included |
| What may be sent | Text, media, text templates, media templates. No interactive, authentication or commerce messages |
| Who may use it | An **Official Business Account** only. *"Groups are not available for WhatsApp Business app phone numbers and phone numbers onboarded to Multi-solution Conversations"* |

Two of those decide the shape of everything else.

**The eight.** A client group holds their HR person, their hiring manager,
sometimes a second manager, our ops owner, sometimes a second ops person and
sometimes the Director. That is five to seven. It fits, but it has no room,
and the day a client adds two colleagues the group is full.

**No joining an existing group.** Every client group that exists today was made
on somebody's phone. There is no way to put the system inside one. So the
groups you already have **stay manual for their whole life.** Only a new group
can be a system group.

## 4. The decision nobody ever settled

The owner's own card `c1834` lists it as an open question, twice:

> Decision 'no client WhatsApp groups' conflicts with later 'client groups
> stay'; remove the old line.
> Brief says client WhatsApp groups stay; later Mona said groups gone; he said
> client process unchanged. **Settle.**

It was never settled, and the build has been carrying both answers: the group
is in the flow, and the code says no system can post to one.

It can be settled now, because the facts are different from when it was asked.

## 5. What to build, in order

### Step one — hear WhatsApp at all

**The biggest hole, and it needs no group and no Official Business Account.**

A webhook at `POST /api/whatsapp` that takes Meta's inbound messages and puts
them through the same door the mailbox uses: match it to a client, a set, an
interview; file it; stop the chase clock; show it on the Inbox screen beside
the emails.

Everything for this already exists except the webhook itself. `mailMatch.ts`
matches a sender to a client. `mailbox.ts` builds conversations. The Inbox
screen already has a WhatsApp channel in its types.

After this, a client who answers "yes, Tuesday works" on WhatsApp stops the
chase by themselves, exactly as an email does.

### Step two — the one-to-one messages, properly

The agreement chase, the feedback chase, the interview reminder and the
drop-out notice all go to **a person**, not a group. Those are already
sendable. With step one they become conversations rather than shouts.

Nothing new to build. They start working the day the Ops number exists.

### Step three — groups, decided

**New clients: a system group.** The system creates it, sends the invite link
with the first CV set, posts every set and every interview update into it, and
**reads what the client writes back**. That last one is the prize: the group
stops being a place where decisions get lost.

**Existing clients: manual, forever.** There is no way in. The system keeps
drafting the post and a person keeps pasting it. That is what is built today
and it does not change.

So the group question settles itself: **groups stay, and new ones get better.**
Nothing is taken away from anybody.

## 6. What it costs, and what it needs

**The Ops WhatsApp number, which still does not exist.** Nothing in this
document works without it. It is the same item that has been on the owner's
list since 1 November.

**An Official Business Account**, for step three only. Steps one and two work
on an ordinary number.

**Money.** Group messages are charged per person who receives them, at the same
rate as a 1:1 message - a post to a group of six costs six. From 1 October
2026 utility messages inside the service window are charged, where they used
to be free.

**Templates**, approved by Meta, for anything we send first. A reply inside 24
hours is free-form; the first message is not.

## 7. What is deliberately not here

- **No automatic sending.** Every client message is still drafted, approved by
  a person, and only then sent. A group is a louder room, not a looser rule.
- **No reading of the TA System's WhatsApp.** Those eight numbers are the
  recruiters' own and stay separate. This is the Ops number only.
- **No candidate WhatsApp.** The candidate belongs to the TA System.

---

## 8. The objection that changes the plan

The owner asked the question that undoes most of section 5:

> I am an ops person. I have WhatsApp. Without using WhatsApp, why would I use
> the ops system? That is not possible, right?

He is right. Rushda has WhatsApp open all day. Typing into a web form is
slower than typing into WhatsApp, and a system that is slower than the thing
it replaces does not get used - it gets worked around, and then the records
are wrong **and** people are annoyed.

**Meta built a mode for exactly this.** It is called Coexistence, and it was
not in section 3 because section 3 asked the wrong question.

### What Coexistence is

One phone number, used **at the same time** by the WhatsApp Business app on a
person's phone **and** by the Cloud API. Meta: *"They can still send messages
on a one-to-one basis using the WhatsApp Business app, and WhatsApp keeps
messaging history between both apps in sync."*

| | |
|---|---|
| Rushda types on her phone, as always | the system gets a copy - the `smb_message_echoes` webhook, which Meta says *"describes any new messages your client sends with the WhatsApp Business app"* |
| The system sends something | it appears in her phone's chat. Meta: *"Messages sent and received are mirrored between the Cloud API and WhatsApp Business app"* |
| The six months before we started | synced once, at onboarding |
| What she sends from the phone | **free.** Only Cloud API sends are charged |

**Nobody changes how they work.** That is the whole point, and it is the only
version of this that actually gets adopted.

### What it costs

One thing, and it is the thing section 5 built step three on:

> **Group chats: Not supported. Group chats will not be synchronized.**

So with Coexistence the system never sees inside a WhatsApp group. Groups go
back to being exactly what they are today: the system drafts the post, a
person pastes it.

### So the plan changes

| Step | Was | Now |
|---|---|---|
| One - hear WhatsApp | a webhook on an Ops number | **Coexistence**, so it hears what ops people already type, with no new habit |
| Two - the 1:1 messages | send from the system | unchanged, and now optional: the drafted message can be approved and sent by the system, or copied to the phone |
| Three - system groups | create groups through the API | **dropped**, unless a second number is worth it. Coexistence and the Groups API cannot share a number |

Losing system groups costs nothing against today, because today the system
cannot see a group either. Gaining Coexistence means every one-to-one message
the desk already sends becomes a record without anybody doing anything.

### Three things to find out before committing

Honest unknowns, not details:

1. **Is Sri Lanka supported?** Meta's changelog lists the countries added for
   Coexistence - India in May 2025, then Australia, Japan, the Philippines,
   Russia, South Korea, Turkey, the EEA, the EU and the UK in October 2025.
   **Sri Lanka is not named in either list.** This is the first thing to check,
   because nothing else matters if the answer is no.
2. **It needs a provider.** Coexistence is onboarded through a Solution Partner
   or Tech Provider using Embedded Signup - not something switched on alone.
   Career 141 already routes TA WhatsApp through WhatChimp, so the question is
   whether they do Coexistence, or whether another partner is needed.
3. **The version deadline has passed.** Meta: *"Embedded Signup v2 and v3 will
   be deprecated on October 15, 2026."* That is three weeks ago. Any provider
   we use has to be on v4 or v5 already.

### What is still true either way

The Ops WhatsApp number is still the first thing. Coexistence needs a number
in the WhatsApp Business app to coexist **with**, and today there is none for
Ops.


## Inbound: what is built (23 Nov, on branch `rayan/integrations`)

Receiving is built and shut. It cannot be switched on until the Ops number exists, and then it is three settings
and one address.

- **The door is `/api/whatsapp`.** `GET` answers Meta's one-time check, and only when `hub.verify_token` is
  `OPS_WHATSAPP_VERIFY_TOKEN`. `POST` takes a message, and only when its `X-Hub-Signature-256` is the HMAC of the
  exact bytes under `OPS_WHATSAPP_APP_SECRET`. With no secret set it answers 503 and accepts nothing; a bad
  signature is 401 and nothing is read; a signed post is always 200, so Meta does not retry what we have chosen
  not to keep (a delivery receipt, a reaction).
- **A message is filed to whose number it is** (`matchPhone` in `src/lib/whatsapp.ts`): a client's contact, an
  enquiry's contact, or an applicant to us, by the last nine digits. A number that is one person's is filed to them
  (`matchedBy: "phone"`); a number that fits two different people, or none, is filed as nobody's with the reason on
  it, and a person files it.
- **A client who replies is not chased.** Filed to a client's contact, it stops that client's agreement chase and
  CV-set feedback chases, as a reply by email does. An applicant who replies is marked (`repliedAt`) and counts as
  "responded" in a Scoop's end-of-day summary.
- **Recorded once** by Meta's own message id (`wamid...`), so a retried post adds nothing. A picture or a voice
  note is recorded as a line saying it came, and never kept.
- **It shows in the Inbox's WhatsApp view** (`/mail?view=whatsapp`) until somebody marks it done, with whose it is.
- **Still not possible:** reading a client's *group* (Meta's Groups API only reaches groups the system created, see
  above), and sending, which needs `OPS_SEND` on and the outbound lock's allow-list as for every message.

To switch it on, in this order (each needs the owner's go-ahead): buy and verify the number; set
`OPS_WHATSAPP_NUMBER_ID`, `OPS_WHATSAPP_TOKEN`, `OPS_WHATSAPP_APP_SECRET` and `OPS_WHATSAPP_VERIFY_TOKEN`; in Meta's
dashboard point the webhook at `https://<ops>/api/whatsapp` with that verify token and subscribe to `messages`;
send one test message and look for it under Health, WhatsApp.
