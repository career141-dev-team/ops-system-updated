/**
 * One email thread per client (26 Nov, PR 8 review): threading is the mail headers only. Every message keeps
 * its own subject and its own record's reference, so a reply still finds its record and stops its chase.
 * Graph is a stub; nothing is sent.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-thread-"));
process.env.OPS_STORE = "json";
process.env.OPS_TA_FAKE = "on";

const { repo } = await import("@/data/store");
const desk = await import("@/data/desk");
const { sendEmail, subjectWithReference, threadFor } = await import("@/lib/senders");

const DAY = 86_400_000;

test("a reply to a second, threaded set email matches that set and stops its chase", async () => {
  repo.reset();
  const now = Date.now();
  const client = repo.addClient({
    leadId: null, taClientId: "ta_c1", name: "Acme", nameKey: "acme", stage: "active", billingName: "Acme",
    billingEmail: "fin@acme.test", billingAddress: "1 Main", groupName: "", notes: "", reason: null, ownerId: "m_owner",
  });
  const addSet = (setNumber: number) =>
    repo.addClientSet({
      taRoundId: "r" + setNumber, openingTaId: "o1", setNumber, clientId: client.id, clientTaId: "ta_c1",
      name: "Acme > Dev > SET " + setNumber, role: "Dev", state: "sent", candidates: [], dueAt: null,
      sentAt: now - DAY, sentMessageId: null, sentTo: ["hr@acme.test"], receivedAt: now - DAY, reason: null, ownerId: "m_owner",
    });
  const sent = (templateKey: string, subjectId: string, to: string, providerId: string) => {
    const m = repo.draftMessage({ channel: "email", to: [to], subject: "Acme > Dev > SET 1", body: "x", templateKey, subjectType: "clientSet", subjectId });
    repo.settleMessage(m.id, "m_owner", "sent", [to], null, providerId);
  };
  const first = addSet(1);
  const second = addSet(2);
  sent("set.cover", first.id, "hr@acme.test", "<one@graph.test>");

  const chased = await desk.chaseTheFeedback(second.id, "m_owner", now);
  const draft = repo.all().messages.find((m) => m.id === chased.messageId)!;
  assert.doesNotMatch(draft.subject, /^Re:|SET 1/, "its own subject, not the first thread's");
  assert.equal(draft.inReplyToProviderId, "<one@graph.test>", "threaded through the headers");

  const sentSubject = subjectWithReference(draft.subject, draft.subjectType, draft.subjectId);
  repo.settleMessage(draft.id, "m_owner", "sent", draft.to, null, "<two@graph.test>");
  const timer = repo.startTimer({ kind: "feedback.chase", subjectType: "clientSet", subjectId: second.id, startsAt: now, dueAt: now + DAY, warnAt: null, ownerId: "m_owner", payload: {} });
  const taken = await desk.takeInbound(
    [{ providerId: "<reply@acme.test>", from: "hr@acme.test", fromName: "HR", subject: "RE: " + sentSubject, body: "ok", receivedAt: now, inReplyTo: "<two@graph.test>", mailbox: "ops@career141.test" }],
    "m_owner",
    now,
  );
  assert.ok(taken.chasesStopped >= 1);
  assert.equal(repo.all().inbound[0].subjectId, second.id);
  assert.equal(repo.all().timers.find((t) => t.id === timer.id)?.state, "cancelled");

  // Only client-threaded mail to somebody on the new draft is ever answered: candidate mail never.
  sent("testimonial.ask", second.id, "candidate@person.test", "<candidate@graph.test>");
  const db = repo.all();
  assert.equal(threadFor(db, client.id, ["HR@acme.test"]), "<two@graph.test>");
  assert.equal(threadFor(db, client.id, ["candidate@person.test"]), null);
  assert.equal(threadFor(db, client.id, ["someone@else.test"]), null);
  assert.equal(threadFor(db, "ta_c1", ["hr@acme.test"]), null, "the TA client id is not the Ops one");
});

/** Graph, faked: records every call. `found` is what the lookup answers, `reply` whether createReply works. */
async function sendThrough(found: boolean, reply: boolean, inReplyTo = "<o'one@graph.test>") {
  const calls: { method: string; url: string; body: Record<string, unknown> | null }[] = [];
  const real = globalThis.fetch;
  Object.assign(process.env, { OPS_SEND: "on", OPS_OUTBOUND_LOCK: "off", MS_TENANT_ID: "t", MS_CLIENT_ID: "c", MS_CLIENT_SECRET: "s", OPS_COMMON_MAILBOX: "" });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("oauth2")) return Response.json({ access_token: "token" });
    const method = init?.method ?? "GET";
    calls.push({ method, url, body: typeof init?.body === "string" ? JSON.parse(init.body) : null });
    if (method === "GET") return Response.json({ value: found ? [{ id: "orig" }] : [] });
    if (url.endsWith("/createReply")) return reply ? Response.json({ id: "r1", internetMessageId: "<reply@graph.test>" }, { status: 201 }) : new Response("", { status: 403 });
    if (url.endsWith("/messages")) return Response.json({ id: "p1", internetMessageId: "<plain@graph.test>" }, { status: 201 });
    if (method === "PATCH") return Response.json({ id: "r1" });
    return new Response(null, { status: 202 });
  }) as typeof fetch;
  try {
    const outcome = await sendEmail({
      from: "ops@career141.test", to: ["hr@acme.test"], subject: "Set 2", body: "hello", inReplyTo,
      attachments: [{ name: "cv.pdf", mime: "application/pdf", bytes: new Uint8Array([1]) }],
    });
    assert.ok(!calls.some((c) => c.body && "internetMessageHeaders" in c.body), "Graph refuses standard headers");
    return { outcome, calls, steps: calls.map((c) => c.method + " " + c.url.split("/users/ops%40career141.test")[1].split("?")[0]) };
  } finally {
    globalThis.fetch = real;
    delete process.env.OPS_SEND;
  }
}

test("a threaded email is Microsoft's own reply to the original, with our words and recipients", async () => {
  const { outcome, calls, steps } = await sendThrough(true, true);
  assert.deepEqual(steps, ["GET /messages", "POST /messages/orig/createReply", "PATCH /messages/r1", "POST /messages/r1/attachments", "POST /messages/r1/send"]);
  assert.equal(decodeURIComponent(calls[0].url.split("$filter=")[1].split("&")[0]), "internetMessageId eq '<o''one@graph.test>'");
  assert.deepEqual(calls[2].body, {
    subject: "Set 2", body: { contentType: "Text", content: "hello" },
    toRecipients: [{ emailAddress: { address: "hr@acme.test" } }], ccRecipients: [],
  });
  assert.deepEqual(outcome, { ok: true, providerMessageId: "<reply@graph.test>", reason: null });
});

test("no original in the sender's box, or no reply draft: a plain email goes instead", async () => {
  for (const [found, reply] of [[false, true], [true, false]]) {
    const { outcome, steps } = await sendThrough(found, reply);
    assert.deepEqual(steps.slice(-3), ["POST /messages", "POST /messages/p1/attachments", "POST /messages/p1/send"]);
    assert.equal(outcome.providerMessageId, "<plain@graph.test>");
  }
});

test("a reply from /mail carries Graph's own id, so it is answered without a lookup", async () => {
  const { steps } = await sendThrough(false, true, "AAMkAGraphId");
  assert.deepEqual(steps.slice(0, 2), ["POST /messages/AAMkAGraphId/createReply", "PATCH /messages/r1"]);
});

test("a set the client has answered about in full, claims included, is not chased", async () => {
  const desk = await import("@/data/desk");
  const now = Date.now();
  const set = repo.addClientSet({
    taRoundId: "r9", openingTaId: "o9", setNumber: 9, clientId: null, clientTaId: "ta_c9", name: "Acme > Dev > SET 9", role: "Dev",
    state: "sent", candidates: [{ decision: null, claimedAt: now } as never], dueAt: null, sentAt: now - 6 * DAY,
    sentMessageId: null, sentTo: ["hr@acme.test"], receivedAt: now - 6 * DAY, reason: null, ownerId: "m_owner",
  });
  const chased = await desk.chaseTheFeedback(set.id, "m_owner", now);
  assert.deepEqual([chased.ok, chased.what], [false, "They have answered about everyone."]);
});
