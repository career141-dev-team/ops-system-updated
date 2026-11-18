import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.OPS_DATA_DIR = mkdtempSync(path.join(tmpdir(), "ops-sample-"));
process.env.OPS_STORE = "json";

const { SAMPLE_PREFIX, SAMPLE_TA, sampleOpenings } = await import("@/data/sampleOpenings");
const { fakeAnswer, fakeFile } = await import("@/data/fakeTa");
const { repo } = await import("@/data/store");

const NOW = Date.UTC(2026, 10, 18, 4);

test("every sample row is the sample's, and lines up with the stand-in TA", () => {
  const rows = sampleOpenings(NOW, "m_owner");
  for (const list of Object.values(rows)) for (const row of list as { id: string }[]) assert.ok(row.id.startsWith(SAMPLE_PREFIX), row.id);
  assert.equal(rows.positions.length, 6);
  for (const p of rows.positions) {
    if (!p.openingTaId) continue;
    const answer = fakeAnswer<{ id: string; title: string }>("/integrations/v1/openings/" + p.openingTaId);
    assert.ok(answer.ok && answer.data.id === p.openingTaId && answer.data.title === p.title, p.title + " is answered by id");
    assert.ok(rows.clients.some((c) => c.taClientId === p.clientTaId && SAMPLE_TA.clients.some((t) => t.id === c.taClientId)));
  }
  for (const set of rows.clientSets) {
    for (const c of set.candidates) assert.equal(fakeFile("/integrations/v1/applications/" + c.applicationTaId + "/prepared-cv").ok, c.problem === null, c.name);
  }
});

test("one opening's pipeline is its own, and a client's decision moves it", () => {
  const before = fakeAnswer<{ applications: { id: string; currentStage: string }[] }>("/integrations/v1/openings/ta_smp_j4/pipeline");
  assert.ok(before.ok);
  assert.equal(before.data.applications.filter((a) => a.currentStage === "client_shortlist").length, 5, "Kelani's five shortlisted");
  fakeAnswer("/integrations/v1/applications/ta_smp_a16/client-decision", "POST", JSON.stringify({ decision: "rejected" }));
  const after = fakeAnswer<{ applications: { id: string; currentStage: string }[] }>("/integrations/v1/openings/ta_smp_j4/pipeline");
  assert.ok(after.ok);
  assert.equal(after.data.applications.find((a) => a.id === "ta_smp_a16")?.currentStage, "rejected_by_client");
  // The recorded sample every other test uses is untouched.
  const recorded = fakeAnswer<{ applications: unknown[] }>("/integrations/v1/openings/ta_j1/pipeline");
  assert.ok(recorded.ok && recorded.data.applications.length === 6);
});

test("loading and removing the sample leaves everything else alone", () => {
  repo.reset();
  const leadsBefore = repo.all().leads.length;
  repo.addSample(sampleOpenings(NOW, "m_owner") as never);
  assert.equal(repo.all().positions.length, 6);
  repo.removeSample(SAMPLE_PREFIX);
  assert.equal(repo.all().positions.length, 0);
  assert.equal(repo.all().leads.length, leadsBefore, "the seed's own leads stay");
});
