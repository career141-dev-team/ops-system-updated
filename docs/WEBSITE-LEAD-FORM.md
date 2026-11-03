# The website contact form, into the Ops system

For whoever looks after career141.com. One page, and nothing on the website has
to change beyond a few lines.

## What it does

Today the contact form becomes an email to `hello@`, and somebody has to notice
it and type the enquiry in. With this, the form also posts the details to the
Ops system, and the enquiry is on the Leads screen a second later with an owner
and a task on their day.

**Keep the email as well.** Nothing here stops it, and running both for a
couple of weeks is how we find out whether this works.

## Where to post

```
POST https://<the Ops address>/api/leads/website
x-ops-lead-key: <the key Career 141 gives you>
content-type: application/json
```

The key goes in that header, **never in the web address**, so it cannot end up
in a server log or a browser history. It is not a public key: it belongs on
your server, not in the page's JavaScript, because anything in the page can be
read by anybody.

## What to send

```json
{
  "company": "Sample Holdings (Pvt) Ltd",
  "contactName": "Nimal Perera",
  "contactEmail": "hr@sample.lk",
  "contactPhone": "077 123 4567",
  "industry": "tiles",
  "website": "https://sample.lk",
  "notes": "We need a finance manager, urgently."
}
```

- **`company` is required**, and **either `contactEmail` or `contactPhone`** -
  one way to reply is enough. Everything else is optional.
- `notes` is whatever they typed in the message box.
- A plain HTML form post (`application/x-www-form-urlencoded`) works too, with
  the same field names, if that is simpler than JSON.

### The hidden field, against bots

Add an input nobody can see, named `honeypot`, and send it along:

```html
<input type="text" name="honeypot" tabindex="-1" autocomplete="off"
       style="position:absolute;left:-9999px" aria-hidden="true">
```

A person never fills that in; the bots that fill in every field on every form
do. When it arrives filled, the enquiry is thrown away and the answer is a
normal `200`, so whoever wrote the bot learns nothing.

## What comes back

| Answer | What it means | What your site should do |
|---|---|---|
| `200 {"ok":true,"leadId":"ld_..."}` | written down | show your thank-you page |
| `200 {"ok":true,"leadId":"ld_...","already":true}` | the same form arrived a moment ago | the same; it is not an error |
| `400 {"ok":false,"reason":"..."}` | it cannot be used - no company name, or no way to reply | log the reason; show your own error |
| `401` | the key is missing or wrong | log it and tell Career 141 |
| `503` | our side has nobody to give it to | keep the form and try again later |

Anything else, or no answer at all: **send the email as you do now and carry
on.** A lead must never be lost because our system was down.

## An example

```bash
curl -X POST https://<the Ops address>/api/leads/website \
  -H "x-ops-lead-key: <the key>" \
  -H "content-type: application/json" \
  -d '{"company":"Sample Holdings (Pvt) Ltd","contactEmail":"hr@sample.lk","notes":"Need a finance manager"}'
```

## What happens on our side

1. The enquiry is tidied up and checked.
2. The same form sent twice inside ten minutes counts once, because people
   double-click Send.
3. Whichever ops person is holding the fewest leads becomes the owner, and gets
   a task due within the hour: *"New lead from the website"*.
4. If the company looks like banking or finance, the lead is flagged for a
   person to decide - we do not take those. What they are asking to hire is
   never read as what their business is.

## For Career 141

Make the key the same way as the clock key (a long random string), put it in
`OPS_WEB_LEAD_KEY` in the server's env file, and give the same string to the
website. No key set means nobody may post at all, which is the safe default.
