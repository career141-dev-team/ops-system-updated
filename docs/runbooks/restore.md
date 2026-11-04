# Restoring the Ops database

Ops keeps everything in `convex_ops`, a database of its own in the Postgres
that is already on the VPS. The TA System's `convex_self_hosted` is a
different database on the same server and is never touched by any of this.

## The backup

A nightly `pg_dump` of `convex_ops` in custom format, kept fourteen days,
alongside the TA System's own backup. A dump of the documents is not needed:
they live in R2 (bucket `c141-ops`), which keeps its own versions.

## Restoring

1. **Stop the app, not the Postgres**, so nothing writes while you work.
2. Restore into a **new** database first and look at it: create
   `convex_ops_check` and restore the dump into that.
3. Only when it looks right, stop the Ops backend, move the old `convex_ops`
   aside, restore into it, and start both again.
4. The TA System stays up throughout. Nothing above mentions its database, and
   nothing in it should.

## After a restore

- The events cursor is back to where the dump was taken, so TA's events
  between then and now are read again. That is safe: every handler is written
  so the same event twice is one effect.
- The outbox may hold writes TA has already had. Also safe: every write
  carries its key.
- Watch the Health screen's cursor age and the outbox size until they settle.

## Rehearsing it

Do the restore into `convex_ops_check` on the laptop once before go-live, from
a real dump. A backup nobody has restored is not a backup.
