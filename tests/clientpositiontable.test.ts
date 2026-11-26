/**
 * The client and position table (23 Nov): package from the requirement then the placement, the handler, the filters.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { filterPositionRows, positionRows, problemWithNewBackup, problemWithNewHandler } from "@/lib/clientPositionTable";
import type { OpsDatabase } from "@/data/types";

const FULL = { title: "x", level: "x", salary: "LKR 500k", locations: "Colombo", headcount: "1", jdNotes: "x" };
const db = {
  clients: [{ id: "c1", name: "Acme Ltd", clientType: "local" }, { id: "c2", name: "Zeta", clientType: "international" }],
  members: [{ id: "m1", name: "Rakshana", active: true, role: "ops_owner" }, { id: "m2", name: "Haifa", active: true, role: "ops_lead" }, { id: "m3", name: "Gone", active: false, role: "ops_owner" }, { id: "m4", name: "Sales", active: true, role: "ta" }],
  agreements: [],
  interviews: [],
  clientSets: [],
  requirements: [{ id: "r1", fields: FULL }, { id: "r2", fields: { title: "Analyst", salary: "  " } }],
  placements: [{ positionId: "p3", package: "LKR 300k all in", state: "joined" }, { positionId: "p2", package: "LKR 1", state: "cancelled" }],
  positions: [
    { id: "p1", clientId: "c1", clientTaId: "t1", title: "Head of sales", requirementId: "r1", ownerId: "m1", stage: "searching", backupOwnerId: "m2", priority: "P1", salaryMonthly: 500000, salaryCurrency: "LKR" },
    { id: "p2", clientId: "c1", clientTaId: "t1", title: "Analyst", requirementId: "r2", ownerId: "m2", stage: "searching" },
    { id: "p3", clientId: "c2", clientTaId: "t2", title: "Driver", requirementId: null, ownerId: "m1", stage: "placed", priority: "P2", salaryMonthly: 100 },
    { id: "p4", clientId: null, clientTaId: "t9", title: "Orphan", requirementId: null, ownerId: "zz", stage: "handed_over" },
  ],
} as unknown as OpsDatabase;

test("the package is what the client said, then what TA recorded for the person placed, never a cancelled placement", () => {
  const rows = positionRows(db);
  const by = (id: string) => rows.find((r) => r.positionId === id)!;
  assert.deepEqual([by("p1").pack, by("p1").packFrom, by("p1").packLocked], ["LKR 500k", "requirement", true]);
  assert.deepEqual([by("p2").pack, by("p2").packFrom, by("p2").packLocked, by("p2").hasRequirement], ["", "none", false, true]);
  assert.deepEqual([by("p3").pack, by("p3").packFrom], ["LKR 300k all in", "placement"]);
  assert.deepEqual([by("p4").client, by("p4").handler], ["t9", "Nobody"]);
  assert.deepEqual(rows.map((r) => r.client), ["Acme Ltd", "Acme Ltd", "t9", "Zeta"], "grouped by client, A to Z");
});

test("the search needs every word, and the handler filter keeps one person's positions", () => {
  const rows = positionRows(db);
  assert.deepEqual(filterPositionRows(rows, "acme sales", "").map((r) => r.positionId), ["p1"]);
  assert.deepEqual(filterPositionRows(rows, "", "m1").map((r) => r.positionId).sort(), ["p1", "p3"]);
  assert.deepEqual(filterPositionRows(rows, "lkr 300k", "").map((r) => r.positionId), ["p3"]);
  assert.equal(filterPositionRows(rows, "", "").length, 4);
});

test("a new handler must be an active member, a different one, with a reason", () => {
  const m = db.members;
  assert.equal(problemWithNewHandler("m2", "m1", m, "Rakshana is on leave"), null);
  assert.match(problemWithNewHandler("nobody", "m1", m, "reason here") ?? "", /team/);
  assert.match(problemWithNewHandler("m3", "m1", m, "reason here") ?? "", /team/);
  assert.match(problemWithNewHandler("m1", "m1", m, "reason here") ?? "", /already/);
  assert.match(problemWithNewHandler("m2", "m1", m, "no") ?? "", /why/i);
});

test("filters: client type, value range (no value drops out), priority, backup", () => {
  const rows = positionRows(db);
  const ids = (f: object) => filterPositionRows(rows, "", "", f).map((r) => r.positionId).sort();
  assert.deepEqual(ids({ type: "local" }), ["p1", "p2"]);
  assert.deepEqual(ids({ type: "international" }), ["p3"], "a client with none matches neither");
  assert.deepEqual(ids({ min: "1000" }), ["p1"]);
  assert.deepEqual(ids({ max: "1000" }), ["p3"]);
  assert.deepEqual(ids({ min: "50", max: "600000" }), ["p1", "p3"]);
  assert.deepEqual(ids({ priority: "P2" }), ["p3"]);
  assert.deepEqual(ids({ backup: "m2" }), ["p1"]);
  assert.equal(rows.find((r) => r.positionId === "p1")!.backup, "Haifa");
  assert.equal(rows.find((r) => r.positionId === "p2")!.backup, "—");
});

test("a backup must be an active Ops person other than the main one", () => {
  const m = db.members;
  assert.equal(problemWithNewBackup("m2", "m1", m), null);
  assert.match(problemWithNewBackup("m1", "m1", m) ?? "", /other/);
  assert.match(problemWithNewBackup("m3", "m1", m) ?? "", /Ops person/);
  assert.match(problemWithNewBackup("m4", "m1", m) ?? "", /Ops person/);
  assert.match(problemWithNewBackup("zz", "m1", m) ?? "", /Ops person/);
});
