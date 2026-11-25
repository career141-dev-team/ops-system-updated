/**
 * CVs posted in one WhatsApp group (25 Nov): queued only from the configured group, read like a Scoop by email,
 * tried again when WhatsApp will not give the file, and tried every 4 hours until WhatsApp's 7 days are up. Nothing reaches Meta.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument, StandardFonts } from "pdf-lib";

import type { WaMessage } from "@/lib/whatsapp";
import { WA_QUEUE, isDirectCv, isGroupCv, newBatch, parseWaRow, waQueueKey, waRowOf } from "@/lib/scoop";

const NOW = Date.UTC(2026, 10, 25, 4, 30);
const GAP = 4 * 3_600_000;
const GROUP = "120363000000000001@g.us";
const doc = (id: string, filename = "cv.pdf"): WaMessage => ({ id, from: "94700000009", name: "Sam", at: NOW, text: "", kind: "document", groupId: GROUP, fromUserId: "", document: { mediaId: "media-" + id, filename, mime: "application/pdf" } });

async function pdf(): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  const page = d.addPage();
  const font = await d.embedFont(StandardFonts.Helvetica);
  ["NIMAL PERERA", "Colombo", "nimal@example.test", "Mobile: 077 123 4567", "NIC: 912345678V", "Applying for: Recruitment Consultant", "Several years of experience in agency recruitment, client handling and screening."].forEach((l, i) => page.drawText(l, { x: 50, y: 740 - i * 18, size: 11, font }));
  return d.save();
}

/** Meta's two calls, answered from memory. */
const fakeMeta = (bytes: Uint8Array | null, calls: { n: number }): typeof fetch =>
  (async (url: string | URL | Request) => {
    calls.n += 1;
    if (String(url).startsWith("https://graph.facebook.com")) return new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/f", mime_type: "application/pdf" }), { status: 200 });
    return bytes ? new Response(bytes as BodyInit, { status: 200 }) : new Response("no", { status: 500 });
  }) as typeof fetch;

async function fresh() {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-wascoop-"));
  process.env.OPS_STORE = "json";
  delete process.env.OPS_WHATSAPP_CV_GROUP;
  delete process.env.OPS_WHATSAPP_TOKEN;
  const { repo } = await import("@/data/store");
  repo.reset();
  return { desk: await import("@/data/desk"), repo };
}
const rowOf = async (desk: typeof import("@/data/desk"), id: string) => parseWaRow((await desk.desk()).settings.find((s) => s.key === waQueueKey(id))?.value)!;

test("the pure decisions: only a CV document in the configured group", () => {
  assert.equal(isGroupCv(doc("a"), GROUP), true);
  assert.equal(isGroupCv(doc("a"), ""), false);
  assert.equal(isGroupCv(doc("a"), "other@g.us"), false);
  assert.equal(isGroupCv(doc("a", "photo.jpg"), GROUP), true, "every document is queued; the reader says why it is not a CV");
  assert.equal(isGroupCv({ groupId: GROUP, document: null }, GROUP), false);
  assert.ok(waQueueKey("wamid.x").startsWith(WA_QUEUE) && waQueueKey("wamid.x").length === WA_QUEUE.length + 32);
  assert.equal(waRowOf({ ...doc("a"), from: "", fromUserId: "BSUID1" }, NOW).from, "BSUID1");
  assert.equal(parseWaRow("nonsense"), null);
});

test("queued only for the configured group; chatter and other groups never reach the Inbox", async () => {
  const { desk } = await fresh();
  const none = await desk.takeWhatsApp([doc("g1")], "clock", NOW);
  assert.equal(none.queued, 0, "no group set, nothing queued");

  process.env.OPS_WHATSAPP_CV_GROUP = GROUP;
  const chatter: WaMessage = { ...doc("g2"), kind: "text", text: "morning all", document: null };
  const r = await desk.takeWhatsApp([doc("g3"), chatter, { ...doc("g4"), groupId: "other@g.us" }, { ...doc("g5"), kind: "image", document: null }], "clock", NOW);
  assert.deepEqual([r.queued, r.recorded], [1, 0]);
  assert.equal((await desk.desk()).inbound.length, 0);
  assert.equal((await rowOf(desk, "g3")).state, "waiting");
  delete process.env.OPS_WHATSAPP_CV_GROUP;
});

test("a retried webhook leaves a finished row finished", async () => {
  const { desk } = await fresh();
  process.env.OPS_WHATSAPP_CV_GROUP = GROUP;
  await desk.takeWhatsApp([doc("r1")], "clock", NOW);
  process.env.OPS_WHATSAPP_TOKEN = "test-token";
  await desk.runWhatsAppScoopPass("clock", NOW, fakeMeta(await pdf(), { n: 0 }));
  assert.equal((await rowOf(desk, "r1")).state, "done");
  const again = await desk.takeWhatsApp([doc("r1")], "clock", NOW);
  assert.equal(again.queued, 0);
  assert.equal((await rowOf(desk, "r1")).state, "done");
});

test("the pass reads the CV into an applicant and one WhatsApp batch for the day", async () => {
  const { desk } = await fresh();
  process.env.OPS_WHATSAPP_CV_GROUP = GROUP;
  process.env.OPS_WHATSAPP_TOKEN = "test-token";
  await desk.takeWhatsApp([doc("p1")], "clock", NOW);
  const r = await desk.runWhatsAppScoopPass("clock", NOW + 1000, fakeMeta(await pdf(), { n: 0 }));
  assert.deepEqual([r.handled, r.added], [1, 1]);
  const db = await desk.desk();
  const batch = desk.scoopBatches(db).find((b) => b.source === "whatsapp")!;
  assert.equal(batch.id, "whatsapp-2026-11-25");
  assert.deepEqual([batch.found, batch.applicantIds.length, batch.complete, batch.done], [1, 1, true, ["p1"]]);
  assert.equal(db.applicants.find((a) => a.id === batch.applicantIds[0])!.source, "Scoop");
});

test("with no WhatsApp token the row waits, no try is used and no call is made", async () => {
  const { desk } = await fresh();
  process.env.OPS_WHATSAPP_CV_GROUP = GROUP;
  delete process.env.OPS_WHATSAPP_TOKEN;
  await desk.takeWhatsApp([doc("n1")], "clock", NOW);
  const calls = { n: 0 };
  await desk.runWhatsAppScoopPass("clock", NOW, fakeMeta(null, calls));
  const row = await rowOf(desk, "n1");
  assert.deepEqual([row.state, row.tries, calls.n], ["waiting", 0, 0]);
});

test("a file that keeps failing stays waiting for the whole 7 days; only the 7 days list it as unreadable", async () => {
  const { desk } = await fresh();
  process.env.OPS_WHATSAPP_CV_GROUP = GROUP;
  process.env.OPS_WHATSAPP_TOKEN = "test-token";
  await desk.takeWhatsApp([doc("f1")], "clock", NOW);
  const broken = fakeMeta(null, { n: 0 });
  for (let i = 1; i <= 12; i++) {
    await desk.runWhatsAppScoopPass("clock", NOW + i * GAP, broken);
    const row = await rowOf(desk, "f1");
    assert.deepEqual([row.state, row.tries], ["waiting", i]);
  }
  const calls = { n: 0 };
  await desk.runWhatsAppScoopPass("clock", NOW + 8 * 86_400_000, fakeMeta(await pdf(), calls));
  assert.equal((await rowOf(desk, "f1")).state, "failed");
  assert.equal(calls.n, 0, "past 7 days it is not fetched");
  const batch = desk.scoopBatches(await desk.desk()).find((b) => b.source === "whatsapp")!;
  assert.deepEqual(batch.unreadable.map((u) => u.name), ["cv.pdf"]);
  assert.match(batch.unreadable[0].why, /7 days/);
});

test("the end-of-day summary names a WhatsApp batch as such", async () => {
  const { desk } = await fresh();
  process.env.OPS_WHATSAPP_CV_GROUP = GROUP;
  process.env.OPS_WHATSAPP_TOKEN = "test-token";
  await desk.takeWhatsApp([doc("s1")], "clock", NOW);
  await desk.runWhatsAppScoopPass("clock", NOW, fakeMeta(await pdf(), { n: 0 }));
  await desk.runScoopSummary("clock", Date.UTC(2026, 10, 25, 12, 5));
  const task = (await desk.desk()).tasks.find((t) => t.title.startsWith("Scoop summary"))!;
  assert.match(task.body, /CVs sent on WhatsApp/);
  assert.doesNotMatch(task.body, /by hand/);
  assert.equal(newBatch({ id: "x", at: NOW, source: "whatsapp", found: 0 }).source, "whatsapp");
});

test("failed passes minutes apart cost one try; the file rests four hours", async () => {
  const { desk } = await fresh();
  process.env.OPS_WHATSAPP_CV_GROUP = GROUP;
  process.env.OPS_WHATSAPP_TOKEN = "test-token";
  await desk.takeWhatsApp([doc("b1")], "clock", NOW);
  const calls = { n: 0 };
  const broken = fakeMeta(null, calls);
  for (let i = 0; i < 5; i++) await desk.runWhatsAppScoopPass("clock", NOW + i * 5 * 60_000, broken);
  const row = await rowOf(desk, "b1");
  assert.deepEqual([row.state, row.tries], ["waiting", 1]);
  assert.equal(calls.n, 2, "one try is two calls to Meta");
});

test("a file that throws costs a try and does not block the one behind it", async () => {
  const { desk } = await fresh();
  process.env.OPS_WHATSAPP_CV_GROUP = GROUP;
  process.env.OPS_WHATSAPP_TOKEN = "test-token";
  await desk.takeWhatsApp([doc("t1"), { ...doc("t2"), at: NOW + 1000 }], "clock", NOW);
  const good = await pdf();
  let first = true;
  const meta = (async (url: string | URL | Request) => {
    if (String(url).startsWith("https://graph.facebook.com")) return new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/f" }), { status: 200 });
    if (first) {
      first = false;
      return { ok: true, headers: new Headers(), arrayBuffer: async () => good.buffer } as unknown as Response;
    }
    return new Response(good as BodyInit, { status: 200 });
  }) as typeof fetch;
  // Make the first file's ingest throw by giving its second row's name a character the file store refuses.
  const store = await import("@/data/store");
  const original = store.repo.addApplicant.bind(store.repo);
  let thrown = false;
  store.repo.addApplicant = ((...args: Parameters<typeof original>) => {
    if (!thrown) {
      thrown = true;
      throw new Error("disk full");
    }
    return original(...args);
  }) as typeof original;
  try {
    await desk.runWhatsAppScoopPass("clock", NOW + 5000, meta);
  } finally {
    store.repo.addApplicant = original;
  }
  const one = await rowOf(desk, "t1");
  assert.deepEqual([one.state, one.tries, one.why.startsWith("The file could not be read: ")], ["waiting", 1, true]);
  assert.equal((await rowOf(desk, "t2")).state, "done");
});

test("the CV group is adopted only after it was asked for, with no group set, by name; a failure clears the ask with its reason (25 Nov)", async () => {
  const { desk } = await fresh();
  const made = (over = {}) => ({ groupId: "G1", subject: "Career 141 CVs", inviteLink: "https://chat.whatsapp.com/L", error: null, ...over });
  const state = async () => desk.cvGroupState(await desk.desk());

  assert.deepEqual(await desk.takeGroupEvents([made()], "clock"), { adopted: false }, "never asked: ignored");
  assert.equal((await state()).groupId, "");

  await desk.markCvGroupAsked("Career 141 CVs", "u1");
  assert.equal((await desk.takeGroupEvents([made({ subject: "Somebody else's group" })], "clock")).adopted, false, "another name: ignored");
  assert.ok((await state()).asked);
  assert.deepEqual(await desk.takeGroupEvents([made()], "clock"), { adopted: true });
  let s = await state();
  assert.deepEqual([s.groupId, s.link, s.asked, s.problem], ["G1", "https://chat.whatsapp.com/L", null, ""]);
  assert.equal((await desk.takeGroupEvents([made({ groupId: "G2" })], "clock")).adopted, false, "already set up: a second group is ignored");
  assert.equal((await state()).groupId, "G1");

  await desk.setCvGroupByHand("G9", "u1");
  await desk.markCvGroupAsked("Career 141 CVs", "u1");
  assert.equal((await desk.takeGroupEvents([made({ groupId: "G3" })], "clock")).adopted, false, "a group set by hand is never replaced");

  const second = await fresh();
  await second.desk.markCvGroupAsked("Career 141 CVs", "u1");
  await second.desk.takeGroupEvents([made({ groupId: "", inviteLink: "", error: "Group limit reached." })], "clock");
  const t = second.desk.cvGroupState(await second.desk.desk());
  assert.deepEqual([t.groupId, t.asked, t.problem], ["", null, "Group limit reached."]);
});

test("a group made while the ask was being sent is adopted; asking again once a group is set is refused (25 Nov)", async () => {
  const { desk } = await fresh();
  const ev = { groupId: "G1", subject: "Career 141 CVs", inviteLink: "https://chat.whatsapp.com/L", error: null };
  // The webhook lands inside the call to Meta: the ask is already written, so it is adopted.
  const r = await desk.askForCvGroup("Career 141 CVs", "u1", async () => {
    await desk.takeGroupEvents([ev], "clock");
    return { ok: true };
  });
  assert.deepEqual(r, { ok: true });
  assert.equal(desk.cvGroupState(await desk.desk()).groupId, "G1");
  let called = 0;
  const again = await desk.askForCvGroup("Career 141 CVs", "u1", async () => (called++, { ok: true }));
  assert.equal(again.ok, false);
  assert.equal(called, 0);
  // A failed call clears the ask and keeps the reason.
  const second = await fresh();
  const bad = await second.desk.askForCvGroup("Career 141 CVs", "u1", async () => ({ ok: false, reason: "WhatsApp refused it: No." }));
  assert.deepEqual(bad, { ok: false, reason: "WhatsApp refused it: No." });
  const s = second.desk.cvGroupState(await second.desk.desk());
  assert.deepEqual([s.asked, s.problem], [null, "WhatsApp refused it: No."]);
});

test("a CV sent 1:1 is read like a Scoop too, only from somebody who is not a client's or an enquiry's contact (25 Nov)", async () => {
  const direct = (id: string, filename = "cv.pdf"): WaMessage => ({ ...doc(id, filename), groupId: null });
  assert.equal(isDirectCv(direct("a"), "none"), true);
  assert.equal(isDirectCv(direct("a"), "applicant"), true);
  assert.equal(isDirectCv(direct("a"), "client"), false, "a client's file is an agreement or a JD, not a CV");
  assert.equal(isDirectCv(direct("a"), "lead"), false);
  assert.equal(isDirectCv(direct("a", "photo.jpg"), "none"), false, "a stranger's photo stays an Inbox line");
  assert.equal(isDirectCv(doc("a"), "none"), false, "a group message is the group's business");
  assert.equal(isDirectCv({ ...direct("a"), document: null }, "none"), false);

  const { desk } = await fresh();
  const r = await desk.takeWhatsApp([direct("d1"), direct("d2", "photo.jpg")], "clock", NOW);
  assert.deepEqual([r.recorded, r.queued], [2, 1], "both are in the Inbox; only the CV is queued");
  assert.equal((await rowOf(desk, "d1")).state, "waiting");
  const again = await desk.takeWhatsApp([direct("d1")], "clock", NOW);
  assert.deepEqual([again.already, again.queued], [1, 0], "a retried webhook queues nothing twice");

  process.env.OPS_WHATSAPP_TOKEN = "test-token";
  const read = await desk.runWhatsAppScoopPass("clock", NOW + 1000, fakeMeta(await pdf(), { n: 0 }));
  assert.equal(read.added, 1);
  assert.equal((await rowOf(desk, "d1")).state, "done");
  delete process.env.OPS_WHATSAPP_TOKEN;
});
