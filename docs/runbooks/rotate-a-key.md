# Replacing a key or a token

Ops holds a handful: the Graph client secret (reading mail and sending), the
WhatsApp token, the R2 access key, the TA System's token, the clock key, the
website lead key, and Clerk's keys.

## The order that does not lose anything

1. Make the new key at the provider, **without deleting the old one**.
2. Put it in `/opt/ops-prod/.env.production`.
3. Bring the app container up again — about twenty seconds, and anything
   mid-flight is retried by its own clock.
4. Prove it works: the Health screen, then one real action (the mail reader's
   next run, or a drafted message approved to the test address).
5. **Then** delete the old key at the provider.

## The two that are not only in that file

- **The clock key** is in two places: the app's environment and the Convex
  backend's own environment, which is separate. Set both, or the scheduled
  pass starts being refused.
- **The website lead key** is also held by whoever looks after
  career141.com. Give them the new one before deleting the old, or the form
  starts being refused. See [WEBSITE-LEAD-FORM.md](../WEBSITE-LEAD-FORM.md).

## Never

- Never put a key in the repository, a commit, a document or a chat (hard
  rule 3). The example file holds names and no values.
- Never reuse a TA System key for Ops. Two systems, two tokens, so one can be
  replaced without the other noticing.
