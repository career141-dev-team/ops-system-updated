# Events are not being read, or are stuck

TA tells Ops things through an events feed: a set is ready, an opening was
created, somebody was placed. If it stops, Ops goes quiet — no new sets, no
placements, no guarantee clocks.

## 1. How far behind is it?

Health screen → the events cursor and its age. Under five minutes is normal;
over an hour means the pass is not running, or every read is failing.

## 2. The cursor only moves past what was handled

That is deliberate: an event we could not deal with keeps the cursor where it
is, so nothing is skipped. It also means one bad event can hold up everything
behind it.

TA System screen → the last events. One showing "we do not know this kind of
event" is harmless and is passed. One that keeps failing is the one holding
the line.

## 3. What to do with the one that is stuck

Read what it is. Usually it is an event about a client or an opening Ops does
not have, which the handlers are written to ignore — if it is failing instead,
that is a fault to write down and fix, not to work around.

**Never move the cursor by hand to get past it.** Everything behind it would
be skipped silently, which is worse than being behind. The right move is to
fix the handler and let it try again.

## 4. While it is stuck

The desk carries on: sets can be sent, decisions recorded, interviews booked.
What stops is anything that *starts* from TA — new sets and new placements. If
it will be a while, TA can tell the desk by hand and the rows can be made from
the screens.
