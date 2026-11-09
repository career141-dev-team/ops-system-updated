/**
 * A month of real mail into the desk, through the reader's own rules
 * (9 Nov, the owner: "every Ops user needs their own data, from before").
 *
 *   OPS_DATA_DIR=.local/real-data OPS_MAIL_READ=on OPS_MAILBOXES=a@x,b@x DAYS=30 \
 *     node --experimental-strip-types --import ./tests/alias.mjs deploy/local/import-mail-history.ts
 *
 * It is the same path the five-minute clock takes - readAllMailboxes, then
 * takeInbound - looped until every box is read to now, so the same filters
 * hold: our own people's mail is not a client writing, machine mail is
 * counted and left out, the same message is never recorded twice, and mail
 * from a client's company files itself under that client. Nothing is sent,
 * nothing is drafted, and no model reads any of it.
 *
 * Two things differ from the clock, both for a month at once: the body is
 * kept as plain text of at most 4,000 characters (the full message stays in
 * Outlook, a click away), and the window starts DAYS ago instead of at the
 * reader's short default.
 *
 * It refuses a Convex store that is not this laptop's, because it writes
 * real people's mail.
 */
import { CLOCK_ACTOR, desk, takeInbound } from "@/data/desk";
import { usingConvex } from "@/data/convexClient";
import { BATCH, mailboxes, readOneMailbox, readerEnabled } from "@/lib/graphMail";

const DAYS = Number(process.env.DAYS ?? "30");
if (usingConvex()) {
  const host = new URL(process.env.CONVEX_SELF_HOSTED_URL ?? "http://x").hostname;
  if (!["127.0.0.1", "localhost", "[::1]", "::1"].includes(host)) throw new Error("This writes real mail; it runs against this laptop only.");
}
if (!readerEnabled()) throw new Error("Set OPS_MAIL_READ=on for the import.");
const boxes = mailboxes();
if (!boxes.length) throw new Error("Name the mailboxes in OPS_MAILBOXES.");

/** HTML to readable text, short. */
function plain(body: string): string {
  return body
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim()
    .slice(0, 4000);
}

const start = Date.now() - DAYS * 86_400_000;
const totals = { read: 0, already: 0, filed: 0, waiting: 0, ignored: 0, pages: 0 };

// One box at a time, a page at a time, stepping by how far the raw page
// reached - not by what was kept, since a page of our own people's mail
// keeps nothing and is still a page.
for (const box of boxes) {
  let since = start;
  for (let page = 1; page <= 2000; page++) {
    // A minute a page, and three tries: the first run gave up ten whole boxes
    // on one slow page each (9 Nov).
    let r = await readOneMailbox(box, since, 60_000);
    for (let retry = 1; !r.ok && retry <= 3; retry++) r = await readOneMailbox(box, since, 60_000);
    if (!r.ok) {
      console.log("  !", r.reason, "(after three tries; this box stops here)");
      break;
    }
    totals.pages += 1;
    totals.ignored += r.ignored;
    const taken = await takeInbound(r.mail.map((m) => ({ ...m, body: plain(m.body) })), CLOCK_ACTOR);
    totals.read += taken.read;
    totals.already += taken.already;
    totals.filed += taken.filed;
    totals.waiting += taken.waiting;
    if (!r.pageFull || r.reachedAt <= since) break;
    // The next page starts just after this one. Two messages in the very same
    // second at a page's edge would be skipped; at 25 a page that is rare,
    // and the clock's own pass reads from the newest kept anyway.
    since = r.reachedAt + 1000;
  }
  console.log("  " + box.padEnd(30) + " read to now");
}

const db = await desk();
console.log(`Read ${DAYS} days from ${boxes.length} mailboxes, ${totals.pages} pages of ${BATCH}.`);
console.log(`  recorded ${totals.read}, already there ${totals.already}, filed by client ${totals.filed}, waiting to be filed ${totals.waiting}, machine mail left out ${totals.ignored}`);
for (const b of boxes) console.log("  " + b.padEnd(30) + String(db.inbound.filter((i) => i.mailbox === b).length).padStart(6) + " in the desk");
