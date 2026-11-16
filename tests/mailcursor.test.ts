/**
 * The mailbox reader must move forward (16 Nov).
 *
 * Our own people's mail and machine mail is dropped by the reader and never
 * stored. The next read used to start after the newest *stored* message, so a
 * page of 25 dropped messages left the start where it was and the same 25 were
 * fetched, and dropped, on every pass - with the client's reply behind them
 * never reached. These tests use a fake Graph; no real mailbox is touched.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

process.env.OPS_DATA_DIR ??= fs.mkdtempSync(path.join(os.tmpdir(), "ops-cursor-"));
process.env.OPS_MAIL_READ = "on";
process.env.OPS_MAILBOXES = "box@career141.com";
process.env.MS_TENANT_ID = "t";
process.env.MS_CLIENT_ID = "c";
process.env.MS_CLIENT_SECRET = "s";

const { desk, readTheMailboxes } = await import("@/data/desk");

const MINUTE = 60_000;
const BASE = Date.now() - 36 * 60 * MINUTE;

type Fake = { id: string; from: string; at: number; subject?: string; to?: string; files?: string[] };
/** `own` messages from our own domain, then one client reply, a minute apart. */
function mailbox(own: number, reply: string): Fake[] {
  const list: Fake[] = [];
  for (let i = 0; i < own; i++) list.push({ id: "own-" + i, from: "us" + i + "@career141.com", at: BASE + i * MINUTE });
  list.push({ id: reply, from: "hr@sampleclient.test", at: BASE + own * MINUTE });
  return list;
}

/**
 * Stands in for Graph: token, then `$filter=receivedDateTime ge X`, oldest
 * first, `$top` of them, with an `@odata.nextLink` when more are left. The
 * Sent Items folder and the attachment list are served too. `asked` collects
 * the `ge` of every first request (not of the pages Graph's own link leads to).
 */
function fakeGraph(messages: Fake[], asked: number[], extra: { sent?: Fake[] } = {}): void {
  const everything = [...messages, ...(extra.sent ?? [])];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = decodeURIComponent(String(input));
    if (url.includes("oauth2")) return Response.json({ access_token: "token" });
    const files = url.match(/\/messages\/([^/]+)\/attachments/);
    if (files) {
      const names = everything.find((m) => m.id === files[1])?.files ?? [];
      return Response.json({ value: [...names.map((name) => ({ name, isInline: false })), { name: "logo.png", isInline: true }] });
    }
    const sent = url.includes("/mailFolders/sentitems/");
    const ge = Date.parse(url.match(/receivedDateTime ge ([^&]+)/)![1]);
    const top = Number(url.match(/\$top=(\d+)/)![1]);
    const skip = Number(url.match(/[?&]skip=(\d+)/)?.[1] ?? 0);
    if (!url.includes("skip=")) asked.push(ge);
    const all = (sent ? extra.sent ?? [] : messages).filter((m) => m.at >= ge);
    const page = all.slice(skip, skip + top);
    const more = skip + top < all.length;
    return Response.json({
      value: page.map((m) => ({
        id: m.id,
        subject: m.subject ?? "Re: hello",
        receivedDateTime: new Date(m.at).toISOString(),
        bodyPreview: "hi",
        body: { content: "hi" },
        from: { emailAddress: { address: m.from, name: "x" } },
        toRecipients: m.to ? [{ emailAddress: { address: m.to } }] : [],
        hasAttachments: Boolean(m.files?.length),
        internetMessageHeaders: [],
      })),
      ...(more
        ? { "@odata.nextLink": "https://graph.microsoft.com/v1.0/next?" + (sent ? "/mailFolders/sentitems/" : "") + "skip=" + (skip + top) + "&receivedDateTime ge " + new Date(ge).toISOString() + "&$top=" + top }
        : {}),
    });
  }) as typeof fetch;
}

const filed = async (reply: string) => (await desk()).inbound.filter((i) => i.providerId === reply).length;

test("a run of our own mail does not hide the client's reply behind it", async () => {
  const asked: number[] = [];
  process.env.OPS_MAILBOXES = "one@career141.com";
  fakeGraph(mailbox(30, "reply-1"), asked); // 30 dropped, then the reply: 31 messages, pages of 25
  await readTheMailboxes("clock");
  assert.equal(await filed("reply-1"), 1, "the reply is reached in the same pass, by paging forward");
});

test("the next pass starts where the last one reached, not at the old start", async () => {
  const asked: number[] = [];
  process.env.OPS_MAILBOXES = "two@career141.com";
  fakeGraph(mailbox(120, "reply-2"), asked); // more dropped mail than one pass pages through (4 pages of 25)
  const first = await readTheMailboxes("clock");
  assert.equal(first.ok, true);
  assert.equal(await filed("reply-2"), 0, "four pages of our own mail is as far as one pass goes");
  const firstStart = asked[0];

  asked.length = 0;
  await readTheMailboxes("clock");
  assert.ok(asked[0] > firstStart, "the second pass must not fetch the same first page again");
  assert.equal(await filed("reply-2"), 1, "the reply is reached on the next pass");

  // Reading again with nothing new records nothing twice.
  asked.length = 0;
  const third = await readTheMailboxes("clock");
  assert.equal(third.read, 0);
  assert.equal(await filed("reply-2"), 1);
});

test("two messages in one second, either side of a page boundary, are both kept", async () => {
  const asked: number[] = [];
  process.env.OPS_MAILBOXES = "three@career141.com";
  // 30 client messages in the same second: 25 fit a page, 5 spill over. Asking again
  // "after that second" would lose the 5; the id cursor does not.
  const burst: Fake[] = Array.from({ length: 30 }, (_, i) => ({ id: "burst-" + i, from: "hr@sampleclient.test", at: BASE + 500 * MINUTE }));
  fakeGraph(burst, asked);
  await readTheMailboxes("clock");
  assert.equal((await desk()).inbound.filter((i) => i.providerId.startsWith("burst-")).length, 25, "the first page");
  await readTheMailboxes("clock");
  assert.equal((await desk()).inbound.filter((i) => i.providerId.startsWith("burst-")).length, 30, "the rest of the same second, none twice");
});

test("a message with files keeps their names, and the picture in the signature is not one", async () => {
  const asked: number[] = [];
  process.env.OPS_MAILBOXES = "four@career141.com";
  fakeGraph([{ id: "with-files", from: "hr@sampleclient.test", at: BASE + 600 * MINUTE, files: ["cv-set-2.pdf", "terms.docx"] }, { id: "no-files", from: "hr@sampleclient.test", at: BASE + 601 * MINUTE }], asked);
  await readTheMailboxes("clock");
  const rows = (await desk()).inbound;
  assert.deepEqual(rows.find((i) => i.providerId === "with-files")?.attachments, ["cv-set-2.pdf", "terms.docx"]);
  assert.equal(rows.find((i) => i.providerId === "no-files")?.attachments, undefined);
});

test("our own sent mail is filed in its thread and never stops a chase", async () => {
  const { repo } = await import("@/data/store");
  const { referenceFor } = await import("@/lib/mailMatch");
  const { buildThreads } = await import("@/lib/mailbox");
  repo.reset();
  const NOW = Date.now();
  const chase = repo.startTimer({
    kind: "feedback.chase",
    subjectType: "clientSet",
    subjectId: "cs_1",
    startsAt: NOW,
    dueAt: NOW + 24 * 3_600_000,
    warnAt: null,
    ownerId: "m_owner",
    payload: { label: "SAMPLE CLIENT set 2" },
  });
  const asked: number[] = [];
  process.env.OPS_MAILBOXES = "five@career141.com";
  // The subject carries our reference to the set: were it from the client, it would stop the chase.
  fakeGraph([], asked, {
    sent: [{ id: "sent-1", from: "five@career141.com", to: "hr@sampleclient.test", at: BASE + 700 * MINUTE, subject: "Set 2 " + referenceFor("clientSet", "cs_1"), files: ["set2.zip"] }],
  });
  const r = await readTheMailboxes("clock");
  assert.equal(r.chasesStopped, 0);
  assert.equal(r.read, 0, "sent mail is not counted as new mail to answer");
  assert.notEqual(repo.timers().find((t) => t.id === chase.id)?.state, "cancelled");

  const db = await desk();
  const row = db.inbound.find((i) => i.providerId === "sent-1");
  assert.equal(row?.direction, "out");
  assert.equal(row?.readState, "actioned", "nobody has to answer our own mail");
  assert.equal(row?.subjectId, "cs_1", "it is filed against the set");
  const thread = buildThreads(db.inbound, db.messages).find((t) => t.items.some((i) => i.providerId === "sent-1"));
  assert.equal(thread?.items[0].direction, "out");
  assert.deepEqual(thread?.items[0].attachmentNames, ["set2.zip"]);
  assert.equal(thread?.waitingOnUs, false);

  // A second pass records it once.
  await readTheMailboxes("clock");
  assert.equal((await desk()).inbound.filter((i) => i.providerId === "sent-1").length, 1);
});
