# The mail reader has stopped filing replies

What you will see: the Mail screen's last run is hours old, or a client says
they replied and nothing on the set or the agreement moved.

## 1. Is it the reader, or is it one mailbox?

Health screen → the last run per mailbox. If every mailbox is old, it is the
reader. If one is old, it is that mailbox's permission.

## 2. The reader

Read the app container's recent log and look for the mail lines.

- *"Reading the mailboxes is switched off"* → `OPS_MAIL_READ=off` in the env.
  Turn it on and bring the app up again.
- *401 or 403 from Graph* → the Graph app's secret has expired, or the
  mailbox permission was removed. See [rotate-a-key.md](rotate-a-key.md).
- *nothing at all* → the clock pass is not running. See
  [pause-ops.md](pause-ops.md) for how to check the clocks.

## 3. While it is down

Nothing is lost: a reply that was not read is still in the mailbox, and the
reader goes back far enough to pick it up when it starts. What does happen is
that chases keep going out to a client who has already answered — so if it
will be down for more than a few hours, turn **switch.timersEnabled** off as
well, and turn it back on with the reader.

## 4. Afterwards

Check the chases that went out while it was blind, and tell any client who was
chased after answering. The reader filing a reply is what stops a chase; until
it runs, the clocks do not know.
