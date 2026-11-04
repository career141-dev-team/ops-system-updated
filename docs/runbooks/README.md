# Runbooks

One page per thing that goes wrong (15, Phase 8 step 9). Each is written for
the person on the spot at the time, not for whoever built it: what you will
see, what to do first, and what not to do.

Two rules run through all of them:

- **Stop the bleeding before you understand it.** Every switch is reversible
  and nothing is lost while one is off. Turn it off, then look.
- **Write down what happened.** The audit records what the system did; a line
  in [13](../13-CORRECTIONS-LOG.md) records what we learnt.

| When | Read |
|---|---|
| A message went to the wrong person | [wrong-recipient.md](wrong-recipient.md) |
| The mail reader has stopped filing replies | [mail-reader-stalled.md](mail-reader-stalled.md) |
| The TA System cannot be reached | [ta-link-down.md](ta-link-down.md) |
| Events are not being read, or are stuck | [events-stuck.md](events-stuck.md) |
| Ops has to be paused altogether | [pause-ops.md](pause-ops.md) |
| The database has to be restored | [restore.md](restore.md) |
| A key or token has to be replaced | [rotate-a-key.md](rotate-a-key.md) |

The switches, all of them in one place:

| Switch | Where | What it stops |
|---|---|---|
| `switch.timersEnabled` | Settings screen | every clock; nothing fires, nothing is lost |
| `switch.taReadsEnabled` | Settings screen | reading TA; screens say so instead of breaking |
| `switch.taWritesEnabled` | Settings screen | writing to TA; the writes stay queued |
| `switch.outreachLive` | Settings screen | real recipients; approved messages go to the test address |
| `OPS_SEND` | the server's env | the senders themselves; approved messages record as **blocked** |
| `OPS_OUTBOUND_LOCK` | the server's env | everything except the allow list |
| `OPS_MAIL_READ` | the server's env | the mail reader |

A switch in the Settings screen is the ops lead's and takes effect at once. A
switch in the environment needs a restart of the app container, about twenty
seconds.
