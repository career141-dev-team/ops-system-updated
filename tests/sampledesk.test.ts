/** The staged dummy data (19 Nov): every row of the coverage matrix has a named example, all of it is the sample's, and it comes out cleanly. */
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.OPS_DATA_DIR = mkdtempSync(path.join(tmpdir(), "ops-sample-desk-"));
process.env.OPS_STORE = "json";
process.env.OPS_TA_FAKE = "on";

const { sampleDesk, SAMPLE_TA_DESK } = await import("@/data/sampleDesk");
const { sampleOpenings, SAMPLE_PREFIX } = await import("@/data/sampleOpenings");
const { samplePlacements } = await import("@/data/samplePlacements");
const { loadOpeningsSample, removeOpeningsSample } = await import("@/data/desk");
const { repo } = await import("@/data/store");

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 18, 4); // a Wednesday
const desk = sampleDesk(NOW, "m_owner");
const openings = sampleOpenings(NOW, "m_owner");
const money = samplePlacements(NOW, "m_owner");

/** Every sample row there is, as the loader writes it, by collection. */
const all: Record<string, { id: string }[]> = {
  ...(openings as unknown as Record<string, { id: string }[]>),
  placements: money.placements, invoices: money.invoices, guarantees: money.guarantees,
};
for (const [key, list] of Object.entries(desk)) if (key !== "clockSetIds") all[key] = [...(all[key] ?? []), ...(list as { id: string }[])];
all.positions.push(...money.positions);

const has = (list: { state?: string; stage?: string }[], value: string) => list.some((r) => (r.state ?? r.stage) === value);

test("leads: every step, every meeting state, and the duplicate-name case", () => {
  for (const s of ["new", "intro_call", "waiting_agreement", "requirement", "handed_over", "declined_industry", "closed_silent", "closed_other"]) assert.ok(has(desk.leads, s), "lead " + s);
  for (const s of ["booked", "held", "not_held"]) assert.ok(desk.meetings.some((m) => m.state === s && m.kind === "intro"), "intro " + s);
  for (const s of ["booked", "held", "not_held"]) assert.ok(desk.meetings.some((m) => m.state === s && m.kind === "requirement"), "requirement " + s);
  const existing = new Set(openings.clients.map((c) => c.nameKey));
  assert.ok(desk.leads.some((l) => existing.has(l.nameKey) && l.company !== openings.clients.find((c) => c.nameKey === l.nameKey)!.name), "a lead with a client's name");
});

test("agreements: every state, every chase step, and one client who replied", () => {
  const states = [...desk.agreements, ...openings.agreements];
  for (const s of ["draft", "sent", "chasing", "negotiating", "signed", "countersigned", "declined", "expired"]) assert.ok(has(states, s), "agreement " + s);
  for (const n of [1, 2, 3]) assert.ok(desk.agreements.some((a) => a.state === "chasing" && a.chaseStep === n), "chase " + n);
  const replied = desk.agreements.find((a) => a.id === SAMPLE_PREFIX + "esa_replied")!;
  assert.ok(desk.inbound.some((m) => m.subjectId === replied.id && m.receivedAt > replied.sentAt!), "a reply after it went");
  assert.ok(desk.clients.some((c) => desk.inbound.some((m) => m.clientId === c.id && m.subjectId === replied.id)));
});

test("clients, positions, holds and sets", () => {
  const clients = [...desk.clients, ...openings.clients];
  for (const s of ["lead", "onboarding", "active", "dormant", "closed"]) assert.ok(has(clients, s), "client " + s);
  assert.ok(desk.clients.some((c) => c.contacts?.some((p) => !p.phone)) && desk.clients.some((c) => c.contacts?.some((p) => p.phone)), "contacts with and without a phone");
  assert.ok(desk.clients.some((c) => /Billing details held/.test(c.notes)), "held billing details");
  const positions = all.positions as unknown as { stage: string; depthStage: string | null; jdApprovedAt: number | null }[];
  for (const s of ["handed_over", "searching", "on_hold", "closed"]) assert.ok(positions.some((p) => p.stage === s), "position " + s);
  for (const d of ["hold_at_five", "add_on", "follow_up"]) assert.ok(positions.some((p) => p.depthStage === d || p.stage === d), "depth " + d);
  for (const s of ["proposed", "on_hold", "lifted"]) assert.ok(has(desk.holds, s), "hold " + s);
  const sets = [...desk.clientSets, ...openings.clientSets];
  for (const s of ["ready", "reviewing", "sent", "withdrawn"]) assert.ok(has(sets, s), "set " + s);
  const perPosition = (id: string) => sets.filter((x) => x.openingTaId === id).length;
  const counts = new Set([...desk.positions, ...openings.positions].map((p) => perPosition(p.openingTaId ?? "")));
  for (const n of [0, 1, 2, 3]) assert.ok(counts.has(n), n + " sets on a position");
  const candidates = sets.flatMap((s) => s.candidates);
  assert.ok(candidates.some((c) => c.decision === "shortlisted") && candidates.some((c) => c.decision === "rejected") && candidates.some((c) => !c.decision && !c.claimedAt), "shortlisted, rejected, unanswered");
  assert.ok(candidates.some((c) => c.claimedAt && c.claimVerdict === "dropped"), "a claimed CV: the client already had it");
  assert.ok(desk.requirements.length >= 3);
});

test("interviews, references, placements, guarantees, invoices", () => {
  for (const s of ["slots", "agreed", "booked", "reconfirmed", "attended", "no_show", "cancelled", "withdrew"]) assert.ok(has([...desk.interviews, ...openings.interviews], s), "interview " + s);
  for (const r of [1, 2, 3]) assert.ok(desk.interviews.some((i) => i.round === r), "round " + r);
  for (const s of ["requested", "reported", "relayed", "cleared", "dropped"]) assert.ok(has(desk.references, s), "reference " + s);
  for (const s of ["placed", "joined", "no_show", "cancelled"]) assert.ok(has(money.placements, s), "placement " + s);
  for (const s of ["running", "warned", "ended_clean", "replacing", "replaced", "void", "refund_pending", "refunded"]) assert.ok(has(money.guarantees, s), "guarantee " + s);
  for (const s of ["draft", "sent", "partly_paid", "paid", "written_off"]) assert.ok(has(money.invoices, s), "invoice " + s);
  assert.ok(money.invoices.some((i) => i.state === "sent" && i.dueAt! < NOW - 90 * DAY && !i.writtenOffAt), "a write-off candidate: sent and over ninety days late");
  assert.ok(money.invoices.some((i) => i.state === "sent" && i.dueAt! < NOW && i.dueAt! > NOW - 90 * DAY), "overdue");
  assert.ok(money.invoices.some((i) => i.kind === "credit_note") && money.invoices.some((i) => i.kind === "surcharge") && money.invoices.some((i) => i.disputed));
  assert.ok(money.placements.some((p) => p.dojHistory.length) && money.placements.some((p) => p.isReplacementOf), "join date moved, a replacement chain");
});

test("the inbox: mail, WhatsApp, drafts, tasks, calls, Talent Pulse, the weekly report", () => {
  for (const s of ["new", "filed", "actioned"]) assert.ok(desk.inbound.some((m) => m.channel === "email" && m.readState === s), "mail " + s);
  assert.ok(desk.inbound.some((m) => m.channel === "whatsapp" && m.readState === "new"), "a WhatsApp reply to record");
  for (const s of ["draft", "approved", "queued", "sent", "failed", "blocked"]) assert.ok(has(desk.messages, s), "message " + s);
  for (const k of ["approve", "call", "record", "decide", "remind", "escalation", "check"]) assert.ok(desk.tasks.some((t) => t.kind === k && t.state === "open"), "open task " + k);
  for (const s of ["done", "dismissed", "snoozed"]) assert.ok(has(desk.tasks, s), "task " + s);
  assert.ok(desk.calls.length >= 3 && desk.talentPulse.length >= 2 && desk.reports.length >= 2);
  assert.ok(desk.tasks.some((t) => t.assigneeId === "m_dirops") && desk.tasks.some((t) => t.assigneeId === "m_accounts"), "work for the other roles");
});

test("everything is the sample's: ids, addresses, phones, names", () => {
  for (const [key, list] of Object.entries(all)) for (const row of list) assert.ok(row.id.startsWith(SAMPLE_PREFIX), key + " " + row.id);
  const text = JSON.stringify([desk, SAMPLE_TA_DESK]);
  for (const m of text.matchAll(/[\w.+-]*@[\w.-]+/g)) assert.ok(m[0].endsWith("@example.test") || m[0].endsWith(".example.test"), "address " + m[0]);
  for (const m of text.matchAll(/\b07\d[ 0-9]{9,}/g)) assert.ok(m[0].startsWith("077 000 "), "phone " + m[0]);
  for (const id of text.matchAll(/"id":"(ta_[^"]+)"/g)) assert.ok(id[1].startsWith("ta_smp_"), id[1]);
  assert.ok(!/iban|account number|swift/i.test(text), "no bank details");
});

test("dates are relative to now", () => {
  const later = sampleDesk(NOW + 7 * DAY, "m_owner");
  const walk = (a: unknown, b: unknown, where: string) => {
    if (typeof a === "number" && typeof b === "number" && a > 1e12) assert.equal(b - a, 7 * DAY, where);
    else if (Array.isArray(a) && Array.isArray(b)) a.forEach((x, i) => walk(x, b[i], where + "[" + i + "]"));
    else if (a && b && typeof a === "object" && typeof b === "object") for (const k of Object.keys(a)) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], where + "." + k);
  };
  walk(desk, later, "desk");
  walk(openings, sampleOpenings(NOW + 7 * DAY, "m_owner"), "openings");
  walk(money, samplePlacements(NOW + 7 * DAY, "m_owner"), "money");
});

test("loading and removing: the owner's own rows stay, the clocks start, and it can load again", async () => {
  repo.reset();
  repo.addSample({ leads: [{ ...desk.leads[0], id: "own_lead_1", company: "Owner's own lead" }] } as never);
  const before = JSON.stringify(repo.all().leads.filter((l) => l.id === "own_lead_1"));
  const done = await loadOpeningsSample("m_owner", NOW);
  assert.ok(done.ok);
  if (!done.ok) return;
  assert.ok(done.counts.leads >= 25 && done.counts.agreements >= 20 && done.counts.tasks >= 10);
  const db = repo.all();
  assert.ok(db.timers.some((t) => t.kind === "esa.chase" && t.subjectId === SAMPLE_PREFIX + "esa_chase2"), "the real chase clock");
  assert.ok(!db.timers.some((t) => t.kind === "esa.chase" && t.subjectId === SAMPLE_PREFIX + "esa_replied"), "a client who replied is not chased");
  assert.ok(db.timers.some((t) => t.kind === "silence.hold" && t.subjectId === SAMPLE_PREFIX + "set_103_1"), "the receipt clocks of a fresh set");
  assert.ok(!db.timers.some((t) => t.kind === "silence.hold" && t.subjectId === SAMPLE_PREFIX + "set_102_1"), "an old set does not hold itself on the first load");
  assert.equal((await loadOpeningsSample("m_owner", NOW)).ok, false, "not loaded twice");

  const gone = await removeOpeningsSample();
  assert.ok(gone.ok && gone.gone > 200);
  const after = repo.all() as unknown as Record<string, { id?: string; subjectId?: string }[]>;
  for (const [key, list] of Object.entries(after)) if (Array.isArray(list)) for (const row of list) assert.ok(!String(row.id ?? "").startsWith(SAMPLE_PREFIX) && !String(row.subjectId ?? "").startsWith(SAMPLE_PREFIX), key);
  assert.equal(JSON.stringify(repo.all().leads.filter((l) => l.id === "own_lead_1")), before, "the owner's own lead is untouched");
  assert.ok((await loadOpeningsSample("m_owner", NOW)).ok, "loads again after removal");
});
