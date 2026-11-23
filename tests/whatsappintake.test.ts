/**
 * Inbound WhatsApp on the desk (23 Nov): recorded once, filed to whose number it is, a client's reply stops the
 * agreement chase, an applicant's reply counts as a response, and an unknown number waits for a person.
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { WaMessage } from "@/lib/whatsapp";
import { whatsappView } from "@/lib/inboxChannels";
import { newBatch, summaryOf } from "@/lib/scoop";

const NOW = Date.UTC(2026, 10, 25, 4, 30);
const msg = (id: string, from: string, text: string, name = ""): WaMessage => ({ id, from, name, at: NOW, text, kind: "text" });

test("a message is filed to whose number it is, and the chasing of a client who answers stops", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-wa-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const lead = repo.addLead({ company: "Ceylon Harbour", nameKey: "ceylon harbour", contactName: "Roshan", contactEmail: "r@harbour.test", contactPhone: "077 123 4567", source: "call", industry: "", website: "", notes: "", industryFlagged: false, industryBecause: null, industryConfirmedBy: null, state: "waiting_agreement", reason: null, doNotInvite: false, clientTaId: null, ownerId: "m_owner", createdBy: "m_owner" });
  const client = repo.addClient({ leadId: lead.id, taClientId: null, name: "Ceylon Harbour", nameKey: "ceylon harbour", stage: "active", billingName: "", billingEmail: "", billingAddress: "", groupName: "", contacts: [{ name: "Roshan de Silva", email: "r@harbour.test", phone: "077 123 4567", role: "hr" }], notes: "", reason: null, ownerId: "m_owner" });
  const esa = repo.addAgreement({ leadId: lead.id, clientTaId: null, state: "chasing", version: 1, fields: {}, draftFileId: null, sentAt: NOW - 86_400_000, sentMessageId: null, chaseStep: 1, expiresAt: null, signedAt: null, signedFileId: null, countersignedAt: null, countersignedFileId: null, reason: null, ownerId: "m_owner" });
  await desk.startTimer({ kind: "esa.chase", subjectType: "esa", subjectId: esa.id, startsAt: NOW, dueAt: NOW + 86_400_000, warnAt: null, ownerId: "m_owner", payload: { label: "Ceylon Harbour" } });
  const vacancy = await desk.addVacancy({ title: "Recruiter", places: 1, checks: [], ownerId: "m_owner" });
  const applicant = await desk.addApplicant({ vacancyId: vacancy.id, name: "Kamala de Silva", source: "Scoop", phone: "071 555 0100", email: null, by: "m_owner" });

  const first = await desk.takeWhatsApp(
    [msg("wamid.1", "94771234567", "We signed it. Sending today.", "Roshan"), msg("wamid.2", "94715550100", "Yes, I can come Friday."), msg("wamid.3", "94700000000", "Hello?")],
    "clock",
    NOW,
  );
  assert.deepEqual(first, { recorded: 3, already: 0, filed: 2, waiting: 1, chasesStopped: 1 });

  const db = await desk.desk();
  const rows = db.inbound.filter((i) => i.channel === "whatsapp");
  const byId = (id: string) => rows.find((r) => r.providerId === id)!;
  assert.deepEqual([byId("wamid.1").subjectType, byId("wamid.1").subjectId, byId("wamid.1").clientId, byId("wamid.1").matchedBy], ["client", client.id, client.id, "phone"]);
  assert.deepEqual([byId("wamid.2").subjectType, byId("wamid.2").subjectId], ["applicant", applicant.id]);
  assert.deepEqual([byId("wamid.3").matchedBy, byId("wamid.3").subjectId, byId("wamid.3").readState], ["none", null, "new"]);
  assert.match(byId("wamid.3").note, /not one we know/);
  assert.equal(db.timers.find((t) => t.kind === "esa.chase")!.state, "cancelled", "a client who replies is not chased");
  assert.ok(db.applicants.find((a) => a.id === applicant.id)!.repliedAt, "the applicant is marked as having replied");

  // A retried webhook adds nothing.
  assert.deepEqual(await desk.takeWhatsApp([msg("wamid.1", "94771234567", "We signed it. Sending today.")], "clock", NOW), { recorded: 0, already: 1, filed: 0, waiting: 0, chasesStopped: 0 });

  // The inbox shows all three, each saying whose it is, until somebody marks it done.
  const view = whatsappView(db);
  assert.equal(view.replies.length, 3);
  assert.equal(view.replies.find((r) => r.id === byId("wamid.2").id)!.about, "Applied: Recruiter");
  assert.equal(view.replies.find((r) => r.id === byId("wamid.1").id)!.recordHref, "/clients/" + client.id);
  await desk.markInboundActioned(byId("wamid.1").id, "m_owner");
  assert.equal(whatsappView(await desk.desk()).replies.length, 2);

  // And a Scoop's summary counts that applicant as having responded, not as unanswered.
  const batch = { ...newBatch({ id: "s", at: NOW, source: "upload", found: 1 }), applicantIds: [applicant.id] };
  const people = (await desk.desk()).applicants.map((a) => ({ id: a.id, name: a.name, stage: a.stage, tries: a.tries, interviewAt: a.interviewAt, rejectReason: a.rejectReason, rejectedAtStage: null, repliedAt: a.repliedAt ?? null }));
  const s = summaryOf(batch, people);
  assert.deepEqual([s.responded, s.noAnswer, s.notCalled], [1, 0, 0]);
});

test("a picture or a voice note is recorded as a note that it came, never kept", async () => {
  const desk = await import("@/data/desk");
  const r = await desk.takeWhatsApp([{ id: "wamid.img", from: "94700000001", name: "", at: NOW, text: "", kind: "image" }], "clock", NOW);
  assert.equal(r.recorded, 1);
  const row = (await desk.desk()).inbound.find((i) => i.providerId === "wamid.img")!;
  assert.match(row.body, /image: open it in WhatsApp/);
});
