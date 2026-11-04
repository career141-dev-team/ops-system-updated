# The TA System cannot be reached

What you will see: the TA System screen says the last calls failed, the outbox
is growing, and screens that read TA (positions, sets, the weekly report) say
they could not be read rather than showing numbers.

## 1. Nothing is lost, so do not rush

Every write to TA is queued with its own key. While the link is down they
wait; when it comes back they go, and the key means TA makes one of each
however many times it is tried. Reading degrades to "could not be read", which
is why no screen shows a zero it does not know.

## 2. Is it TA, or is it us?

Ask the TA System's own health address for its status. If it does not answer,
it is the TA System: nothing to do here, and Ops catches up by itself. If it
answers, it is our end — the token, the address, or the switch.

## 3. Our end

Settings → is **switch.taWritesEnabled** on? Then on the server, in
`.env.production`: the TA base address, the token, and the two
reads/writes switches. A token that has been rotated on the TA side is the
usual cause.

## 4. If it will be down for a day or more

Turn **switch.taWritesEnabled** off. The queue stops growing, the screens
still work, and a person can carry on by hand — every screen that needs TA
says what it could not read. Turn it back on and the queue drains in order.

## 5. A write that gave up

After about nine hours of trying, a write stops and says so on the TA System
screen. That one is not retried automatically: somebody reads what it was and
either presses it again or does it by hand in TA.
