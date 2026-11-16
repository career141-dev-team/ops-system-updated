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

type Fake = { id: string; from: string; at: number };
/** `own` messages from our own domain, then one client reply, a minute apart. */
function mailbox(own: number, reply: string): Fake[] {
  const list: Fake[] = [];
  for (let i = 0; i < own; i++) list.push({ id: "own-" + i, from: "us" + i + "@career141.com", at: BASE + i * MINUTE });
  list.push({ id: reply, from: "hr@sampleclient.test", at: BASE + own * MINUTE });
  return list;
}

/** Stands in for Graph: token, then `$filter=receivedDateTime ge X`, oldest first, `$top` of them. */
function fakeGraph(messages: Fake[], asked: number[]): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("oauth2")) return Response.json({ access_token: "token" });
    const ge = Date.parse(decodeURIComponent(url).match(/receivedDateTime ge ([^&]+)/)![1]);
    const top = Number(url.match(/\$top=(\d+)/)![1]);
    asked.push(ge);
    const page = messages.filter((m) => m.at >= ge).slice(0, top);
    return Response.json({
      value: page.map((m) => ({
        id: m.id,
        subject: "Re: hello",
        receivedDateTime: new Date(m.at).toISOString(),
        bodyPreview: "hi",
        body: { content: "hi" },
        from: { emailAddress: { address: m.from, name: "x" } },
        internetMessageHeaders: [],
      })),
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
