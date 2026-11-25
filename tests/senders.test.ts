/**
 * The two senders (15, Part F1 and F2).
 *
 * The sending itself needs Microsoft and Meta, so what is tested here is
 * everything that decides whether a real client hears from us: the switch, the
 * allow-list, and the reference that lets their reply find its way home. Each
 * of these has a matching scar in the TA System.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  answerGroupJoinRequest,
  createWhatsAppGroup,
  emailAllowed,
  getGroupInviteLink,
  listGroupJoinRequests,
  fetchWhatsAppMedia,
  groupPostIsManual,
  healthLines,
  senderMailbox,
  outreachInWords,
  outreachLiveInEnv,
  phoneAllowed,
  sendEmail,
  sendWhatsApp,
  sendingEnabled,
  subjectWithReference,
} from "@/lib/senders";

const clearEnv = () => {
  for (const key of ["OPS_SEND", "OPS_OUTBOUND_LOCK", "OPS_OUTBOUND_ALLOW_EMAILS", "OPS_OUTBOUND_ALLOW_PHONES"]) {
    delete process.env[key];
  }
};

test("nothing is sent until sending is switched on, and it says so", async () => {
  clearEnv();
  assert.equal(sendingEnabled(), false, "off unless OPS_SEND says on");

  const mail = await sendEmail({ from: "rushda@career141.test", to: ["hr@client.test"], subject: "Set 1", body: "hello" });
  assert.equal(mail.ok, false);
  assert.match(mail.reason ?? "", /switched off/);

  const chat = await sendWhatsApp({ to: "+94770000000", body: "hello", templateKey: null });
  assert.equal(chat.ok, false);
  assert.match(chat.reason ?? "", /switched off/);

  process.env.OPS_SEND = "ON";
  assert.equal(sendingEnabled(), true, "the switch is not case-fussy");
  clearEnv();
});

test("the outbound lock allows only named addresses and numbers", () => {
  clearEnv();
  assert.equal(emailAllowed(["anyone@anywhere.test"]), true, "unlocked, everything passes");

  process.env.OPS_OUTBOUND_LOCK = "on";
  process.env.OPS_OUTBOUND_ALLOW_EMAILS = "me@career141.test";
  assert.equal(emailAllowed(["ME@Career141.test"]), true);
  assert.equal(emailAllowed([]), false, "nobody is not the same as allowed");
  assert.equal(
    emailAllowed(["me@career141.test", "hr@client.test"]),
    false,
    "every address must be allowed, not just the first",
  );

  process.env.OPS_OUTBOUND_ALLOW_PHONES = "+94 77 123 4567";
  // The same number, as three different people write it.
  assert.equal(phoneAllowed("94771234567"), true);
  assert.equal(phoneAllowed("0771234567"), true);
  assert.equal(phoneAllowed("+94771234568"), false);
  assert.equal(phoneAllowed("123"), false, "too short to be a number");
  clearEnv();
});

test("our reference goes into the subject once, and only when it names something", () => {
  assert.equal(subjectWithReference("Client > Role > SET 1", "clientSet", "cs_7"), "Client > Role > SET 1 [C141-CLIENTSET-CS7]");
  // Already carried, so not doubled - a reply we are quoting back keeps one.
  const once = subjectWithReference("RE: Set 1 [C141-CLIENTSET-CS7]", "clientSet", "cs_7");
  assert.equal(once.match(/\[C141/g)?.length, 1);
  // An internal note is about nothing in particular; it gets no reference.
  assert.equal(subjectWithReference("A note", null, null), "A note");
});

test("a WhatsApp group is posted by a person, and the system says so plainly", () => {
  const outcome = groupPostIsManual();
  assert.equal(outcome.ok, true);
  assert.equal(outcome.providerMessageId, null);
  assert.match(outcome.reason ?? "", /from your phone/);
});

test("outreach to real people needs the environment as well as the desk", () => {
  // The setting lives in the database, so it travels with a restored backup.
  // The environment does not, which is the whole point of having both (6 Nov).
  delete process.env.OPS_OUTREACH_LIVE;
  assert.equal(outreachLiveInEnv(), false, "unset is off, like every other switch here");
  process.env.OPS_OUTREACH_LIVE = "off";
  assert.equal(outreachLiveInEnv(), false);
  process.env.OPS_OUTREACH_LIVE = "ON";
  assert.equal(outreachLiveInEnv(), true, "the case of the word is not the point");
  process.env.OPS_OUTREACH_LIVE = " on ";
  assert.equal(outreachLiveInEnv(), true, "a space in an env file is not a decision");
  process.env.OPS_OUTREACH_LIVE = "true";
  assert.equal(outreachLiveInEnv(), false, "only the word we document turns it on");
  delete process.env.OPS_OUTREACH_LIVE;
});

test("the health screen says which of the two is off, not just that it is off", () => {
  assert.match(outreachInWords(true, true), /^on/);
  assert.match(outreachInWords(false, false), /neither/);
  // The two that send somebody looking in the wrong place unless they are named.
  assert.match(outreachInWords(false, true), /OPS_OUTREACH_LIVE/);
  assert.match(outreachInWords(true, false), /switch\.outreachLive/);
  // Three of the four are test mode, and each says so in the first words.
  for (const [a, b] of [[false, false], [false, true], [true, false]] as const) {
    assert.match(outreachInWords(a, b), /^test mode/);
  }
});

test("health lines show the sender and only the count of allowed addresses", () => {
  const lines = healthLines({ OPS_SEND: "on", OPS_OUTBOUND_LOCK: "on", OPS_OUTBOUND_ALLOW_EMAILS: "a@x.test, b@x.test," }, "me@x.test");
  assert.deepEqual(lines, ["Sending: on", "Sender mailbox: me@x.test", "Outbound lock: on, 2 addresses allowed"]);
  assert.ok(!lines.join(" ").includes("a@x.test"));
  assert.match(healthLines({}, "")[0], /switched off/);
  assert.equal(senderMailbox("me@x.test", true, { OPS_DEV_SENDER_EMAIL: "dev@x.test" }), "dev@x.test");
  assert.equal(senderMailbox("me@x.test", false, { OPS_DEV_SENDER_EMAIL: "dev@x.test" }), "me@x.test");
});

/* ── fetchWhatsAppMedia: a fake fetcher, so nothing reaches Meta ─────────── */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const env = { OPS_WHATSAPP_TOKEN: " tok " };

test("media: no token means not set up, and no call is made", async () => {
  let calls = 0;
  const fetcher = (async () => (calls++, json({}))) as unknown as typeof fetch;
  const r = await fetchWhatsAppMedia("m1", {}, fetcher);
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.notSetUp, true);
  assert.equal(calls, 0);
  const empty = await fetchWhatsAppMedia("", env, fetcher);
  assert.equal(!empty.ok && empty.notSetUp, false);
  assert.equal(calls, 0);
});

test("media: the address then the bytes, both with the token", async () => {
  const seen: { url: string; auth: string }[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    seen.push({ url, auth: (init?.headers as Record<string, string>).authorization });
    return seen.length === 1
      ? json({ url: "https://lookaside.whatsapp.net/f/1", mime_type: "application/pdf", file_size: 3 })
      : new Response(new Uint8Array([1, 2, 3]));
  }) as unknown as typeof fetch;
  const r = await fetchWhatsAppMedia("m 1", env, fetcher);
  assert.equal(r.ok && r.mime, "application/pdf");
  assert.deepEqual(r.ok && Array.from(r.bytes), [1, 2, 3]);
  assert.equal(seen.length, 2);
  assert.equal(seen[0].url, "https://graph.facebook.com/v21.0/m%201");
  assert.ok(seen.every((s) => s.auth === "Bearer tok"));
});

test("media: Meta's error is passed on in plain words", async () => {
  const fetcher = (async () => json({ error: { message: "Media not found" } }, 404)) as unknown as typeof fetch;
  const r = await fetchWhatsAppMedia("m1", env, fetcher);
  assert.equal(!r.ok && r.reason, "WhatsApp would not give the file: Media not found.");
});

test("media: a stranger's host is refused before the token is sent to it", async () => {
  for (const url of ["https://evil.test/x", "http://x.whatsapp.net/x", "https://whatsapp.net.evil.test/x", "nonsense"]) {
    let calls = 0;
    const fetcher = (async () => (calls++, json({ url }))) as unknown as typeof fetch;
    const r = await fetchWhatsAppMedia("m1", env, fetcher);
    assert.match(!r.ok ? r.reason : "", /do not trust/, url);
    assert.equal(calls, 1, url);
  }
});

test("media: over 10 MB is refused, by the stated size and by the bytes", async () => {
  const stated = (async () => json({ url: "https://x.fbcdn.net/f", file_size: 11 * 1024 * 1024 })) as unknown as typeof fetch;
  assert.match((await fetchWhatsAppMedia("m1", env, stated) as { reason: string }).reason, /10 MB/);
  let n = 0;
  const real = (async () =>
    ++n === 1 ? json({ url: "https://x.fbcdn.net/f" }) : new Response(new Uint8Array(10 * 1024 * 1024 + 1))) as unknown as typeof fetch;
  assert.match((await fetchWhatsAppMedia("m1", env, real) as { reason: string }).reason, /10 MB/);
});

test("media: a thrown error never escapes", async () => {
  const boom = (async () => { throw new Error("socket"); }) as unknown as typeof fetch;
  const r = await fetchWhatsAppMedia("m1", env, boom);
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.notSetUp, false);
});

/* ── The CV group calls: fake fetchers, nothing reaches Meta (25 Nov) ───── */

const GROUP_ENV = { OPS_SEND: "on", OPS_WHATSAPP_TOKEN: "tok", OPS_WHATSAPP_NUMBER_ID: "123" };
const recorder = (answer: unknown, status = 200) => {
  const seen: { url: string; method: string; body: unknown }[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    seen.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : null });
    return json(answer, status);
  }) as unknown as typeof fetch;
  return { seen, fetcher };
};

test("group: creating asks Meta with approval on, and is refused with no call when sending is off or the number is missing", async () => {
  const { seen, fetcher } = recorder({});
  assert.deepEqual(await createWhatsAppGroup("CVs", GROUP_ENV, fetcher), { ok: true });
  assert.deepEqual(seen, [{ url: "https://graph.facebook.com/v21.0/123/groups", method: "POST", body: { messaging_product: "whatsapp", subject: "CVs", join_approval_mode: "approval_required" } }]);
  for (const bad of [{ ...GROUP_ENV, OPS_SEND: "" }, { ...GROUP_ENV, OPS_WHATSAPP_NUMBER_ID: "" }, { ...GROUP_ENV, OPS_WHATSAPP_TOKEN: "" }]) {
    assert.equal((await createWhatsAppGroup("CVs", bad, fetcher)).ok, false);
  }
  assert.equal((await createWhatsAppGroup("  ", GROUP_ENV, fetcher)).ok, false);
  assert.equal((await createWhatsAppGroup("x".repeat(129), GROUP_ENV, fetcher)).ok, false);
  assert.equal(seen.length, 1);
});

test("group: the link and the requests are read with GET and the token alone, never the POST that resets the link", async () => {
  const link = recorder({ messaging_product: "whatsapp", invite_link: "https://chat.whatsapp.com/L" });
  assert.deepEqual(await getGroupInviteLink("G1", { OPS_WHATSAPP_TOKEN: "tok" }, link.fetcher), { ok: true, link: "https://chat.whatsapp.com/L" });
  assert.deepEqual(link.seen, [{ url: "https://graph.facebook.com/v21.0/G1/invite_link", method: "GET", body: null }]);
  const list = recorder({ data: [{ join_request_id: "J1", wa_id: "9477", user_id: "U1", creation_timestamp: "1764050400" }, { user_id: "x" }] });
  const r = await listGroupJoinRequests("G1", { OPS_WHATSAPP_TOKEN: "tok" }, list.fetcher);
  assert.deepEqual(r.ok && r.requests, [{ id: "J1", waId: "9477", userId: "U1", username: "", at: 1764050400000 }]);
  assert.equal((await getGroupInviteLink("G1", {}, link.fetcher)).ok, false);
  assert.equal(link.seen.length, 1);
});

test("group: approve is POST, reject is DELETE, both off when sending is off, and a failed request is said in words", async () => {
  const a = recorder({ approved_join_requests: ["J1"], failed_join_requests: [] });
  assert.deepEqual(await answerGroupJoinRequest("G1", "J1", true, GROUP_ENV, a.fetcher), { ok: true });
  assert.deepEqual(a.seen[0], { url: "https://graph.facebook.com/v21.0/G1/join_requests", method: "POST", body: { messaging_product: "whatsapp", join_requests: ["J1"] } });
  const d = recorder({ rejected_join_requests: ["J1"] });
  assert.equal((await answerGroupJoinRequest("G1", "J1", false, GROUP_ENV, d.fetcher)).ok, true);
  assert.equal(d.seen[0].method, "DELETE");
  assert.equal((await answerGroupJoinRequest("G1", "J1", true, { ...GROUP_ENV, OPS_SEND: "off" }, d.fetcher)).ok, false);
  assert.equal(d.seen.length, 1);
  const f = recorder({ failed_join_requests: [{ join_request_id: "J1", errors: [{ message: "Group is full" }] }] });
  assert.deepEqual(await answerGroupJoinRequest("G1", "J1", true, GROUP_ENV, f.fetcher), { ok: false, reason: "WhatsApp could not do it: Group is full." });
  const boom = (async () => { throw new Error("socket"); }) as unknown as typeof fetch;
  assert.equal((await answerGroupJoinRequest("G1", "J1", true, GROUP_ENV, boom)).ok, false);
  assert.deepEqual(await createWhatsAppGroup("CVs", GROUP_ENV, recorder({ error: { message: "No" } }, 400).fetcher), { ok: false, reason: "WhatsApp refused it: No." });
});
