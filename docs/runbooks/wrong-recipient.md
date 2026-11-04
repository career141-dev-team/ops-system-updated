# A message went to the wrong person

The worst thing this system can do. Work in this order.

## 1. Stop any more going (one minute)

Settings → turn **switch.outreachLive** off. Approved messages now go to the
test address instead of to clients. Nothing is lost; everything still drafts.

If you cannot get to the screen, on the server set `OPS_SEND=off` in
`/opt/ops-prod/.env.production` and bring the app container up again.

## 2. Find out exactly what went where

Messages screen → the message. It records who it really went to, when, and
what the mail server called it. The audit beside it records who approved it.
Do not guess from the draft: the gate can change the recipients, and what it
recorded is what happened.

## 3. Tell the person it reached

A client who was sent somebody else's CV has to hear it from us, today, from
a person — not from the system. The ops lead writes it; nothing is drafted
for this.

## 4. Then find out why

Almost always one of three things:

- the wrong contact on the client record (Clients screen → their contacts);
- a template with the wrong hole filled (What we send → the template);
- the allow list open wider than it should be (`OPS_OUTBOUND_ALLOW_EMAILS`).

Fix the cause, write the incident into [13](../13-CORRECTIONS-LOG.md) with the
date, and only then turn outreach back on.
