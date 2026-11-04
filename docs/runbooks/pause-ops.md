# Pausing Ops altogether

For a release, an incident, or a day when nobody should be touching it.

## The order

1. **Settings → switch.timersEnabled off.** No clock fires. Nothing is lost:
   every clock keeps its own due date, and one that came due while it was off
   fires on the first pass afterwards.
2. **Settings → switch.outreachLive off.** Nothing reaches a client.
3. If it is serious, set `OPS_SEND=off` on the server and bring the app
   container up again.

The desk still works while paused: people can read, draft, record and
approve. Approving a message while sending is off records it as **blocked**
with the reason, not as failed — so nothing looks broken and nothing is lost.

## Checking it really is paused

Health screen: the clocks say paused and sending says off. Then press **Run
the clocks now** on the day page; it should report that nothing fired.

## Coming back

Turn the switches on in the reverse order, and watch the first pass: a day of
clocks fires at once, which is the point, but it means a run of drafts to
read. The day page's "to approve" count is where they land.
