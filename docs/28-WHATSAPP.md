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
