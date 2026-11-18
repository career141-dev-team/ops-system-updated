/** The Placements sample (18 Nov): every state on the money pages has a row, and the stand-in TA agrees with it. */
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.OPS_DATA_DIR = mkdtempSync(path.join(tmpdir(), "ops-sample-money-"));
process.env.OPS_STORE = "json";

const { SAMPLE_FEE_RULES, samplePlacements } = await import("@/data/samplePlacements");
const { SAMPLE_PREFIX } = await import("@/data/sampleOpenings");
const { fakeAnswer } = await import("@/data/fakeTa");
const { repo } = await import("@/data/store");
const { feeAmount } = await import("@/lib/money");

const NOW = Date.UTC(2026, 10, 18, 4);
const rows = samplePlacements(NOW, "m_owner");

test("every placement, invoice and guarantee state is in the sample", () => {
  const states = (list: { state: string }[]) => new Set(list.map((r) => r.state));
  for (const s of ["placed", "joined", "no_show", "cancelled"]) assert.ok(states(rows.placements).has(s), "placement " + s);
  for (const s of ["draft", "sent", "partly_paid", "paid", "written_off"]) assert.ok(states(rows.invoices).has(s), "invoice " + s);
  for (const s of ["running", "warned", "ended_clean", "replacing", "refund_pending", "refunded", "void"]) assert.ok(states(rows.guarantees).has(s), "guarantee " + s);
  assert.ok(rows.invoices.some((i) => i.disputed), "a disputed invoice");
  assert.ok(rows.invoices.some((i) => i.lateMonths > 0 && i.lateCharge > 0), "an overdue one with a late charge");
  assert.ok(rows.invoices.some((i) => i.kind === "credit_note" && i.againstInvoiceId), "a credit note against an invoice");
  assert.ok(rows.invoices.some((i) => i.kind === "surcharge" && i.setId), "a surcharge from a set");
  assert.ok(rows.placements.some((p) => p.isReplacementOf), "a replacement");
  assert.ok(rows.placements.some((p) => p.state === "placed" && !p.joinDate), "an offer with no join date");
  for (const list of Object.values(rows)) for (const row of list as { id: string }[]) assert.ok(row.id.startsWith(SAMPLE_PREFIX), row.id);
  // Never numbered like a real invoice.
  assert.ok(rows.invoices.every((i) => i.number.startsWith("SMP-")));
});

test("each fee follows its client's signed rule", () => {
  for (const inv of rows.invoices.filter((i) => i.kind === "fee")) {
    const p = rows.placements.find((one) => one.id === inv.placementId)!;
    const company = p.clientId!.replace(SAMPLE_PREFIX + "cl_", "") as keyof typeof SAMPLE_FEE_RULES;
    assert.equal(p.feeBasis, SAMPLE_FEE_RULES[company].feeBasis);
    assert.equal(inv.amount, feeAmount(p, p.monthlySalary!, { basicSalary: p.basicSalary, allowances: p.allowances }), p.candidateName);
  }
});

test("the stand-in TA answers each sample placement and opening by id", () => {
  for (const p of rows.placements) {
    const answer = fakeAnswer<{ id: string; candidateName: string }>("/integrations/v1/placements/" + p.placementTaId);
    assert.ok(answer.ok && answer.data.candidateName === p.candidateName, p.candidateName);
    const opening = fakeAnswer<{ id: string }>("/integrations/v1/openings/" + p.openingTaId);
    assert.ok(opening.ok && opening.data.id === p.openingTaId);
  }
  // The recorded placement every other test uses is untouched.
  const recorded = fakeAnswer<{ id: string }>("/integrations/v1/placements/ta_p1");
  assert.ok(recorded.ok && recorded.data.id === "ta_p1");
});

test("removing the sample takes out what was made from it, too", () => {
  repo.reset();
  repo.addSample({ placements: rows.placements, invoices: rows.invoices, guarantees: rows.guarantees } as never);
  // A credit note drafted later on a sample invoice has its own id, but hangs off a sample placement.
  repo.addSample({ invoices: [{ ...rows.invoices[0], id: "inv_later", number: "C141-2026-0099" }] } as never);
  repo.removeSample(SAMPLE_PREFIX);
  assert.equal(repo.all().placements.length, 0);
  assert.equal(repo.all().invoices.length, 0);
  assert.equal(repo.all().guarantees.length, 0);
});
