import assert from "node:assert/strict";
import test from "node:test";

import {
  addTaPersonToRoster,
  mergeLiveTaIntoRoster,
  normalizeTaRole,
  parseTaRoster,
  removeTaPersonFromRoster,
  taRoleLabel,
  withLiveIds,
} from "@/lib/taRoster";

test("parseTaRoster returns null when unset and parses valid JSON", () => {
  assert.equal(parseTaRoster(null), null);
  assert.equal(parseTaRoster(""), null);
  assert.equal(parseTaRoster("not-json"), null);

  const parsed = parseTaRoster(
    JSON.stringify([
      { id: "ta_1", fullName: "Dewmini", email: "DEWMINI@career141.com", taRole: "Talent Acquisition", isActive: true },
      { id: "ta_2", fullName: "Jesmeen", email: "jesmeen@career141.com", taRole: "TA Lead", isActive: true },
    ]),
  );
  assert.ok(parsed);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].email, "dewmini@career141.com");
  assert.equal(parsed[0].taRole, "ta");
  assert.equal(parsed[1].taRole, "ta_lead");
});

test("role normalisation and labels", () => {
  assert.equal(normalizeTaRole("TA Lead"), "ta_lead");
  assert.equal(normalizeTaRole("Admin"), "admin");
  assert.equal(normalizeTaRole("Talent Acquisition"), "ta");
  assert.equal(taRoleLabel("ta_lead"), "TA Lead");
  assert.equal(taRoleLabel("admin"), "Admin");
  assert.equal(taRoleLabel("ta"), "Talent Acquisition");
});

test("addTaPersonToRoster validates, avoids duplicates, and sorts", () => {
  const first = addTaPersonToRoster([], { fullName: "Jesmeen", email: "jesmeen@career141.com", taRole: "TA Lead" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.added.id, "ta_jesmeen");
  assert.equal(first.added.taRole, "ta_lead");

  const dup = addTaPersonToRoster(first.next, { fullName: "Jesmeen 2", email: "JESMEEN@career141.com", taRole: "ta" });
  assert.equal(dup.ok, false);

  const badEmail = addTaPersonToRoster(first.next, { fullName: "Dewmini", email: "bad-email", taRole: "ta" });
  assert.equal(badEmail.ok, false);

  const second = addTaPersonToRoster(first.next, { fullName: "Dewmini", email: "dewmini@career141.com", taRole: "Talent Acquisition" });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.deepEqual(second.next.map((p) => p.fullName), ["Dewmini", "Jesmeen"]);
});

test("removeTaPersonFromRoster marks the TA inactive (so names still show) and adding them again brings them back", () => {
  const added = addTaPersonToRoster([], { fullName: "Dewmini", email: "dewmini@career141.com", taRole: "ta" });
  assert.equal(added.ok, true);
  if (!added.ok) return;

  const missing = removeTaPersonFromRoster(added.next, "ta_missing");
  assert.equal(missing.ok, false);

  const removed = removeTaPersonFromRoster(added.next, added.added.id);
  assert.equal(removed.ok, true);
  if (!removed.ok) return;
  assert.equal(removed.next.length, 1);
  assert.equal(removed.next[0].isActive, false);
  assert.equal(removed.removed.fullName, "Dewmini");
  assert.equal(removeTaPersonFromRoster(removed.next, added.added.id).ok, false, "already off the list");

  const back = addTaPersonToRoster(removed.next, { fullName: "Dewmini", email: "dewmini@career141.com", taRole: "ta" });
  assert.equal(back.ok, true);
  if (!back.ok) return;
  assert.equal(back.next.length, 1);
  assert.equal(back.next[0].isActive, true);
  assert.equal(back.next[0].id, added.added.id);
});

test("withLiveIds gives each roster entry the TA System's id by email, so TA writes carry TA's ids", () => {
  const roster = parseTaRoster(
    JSON.stringify([
      { id: "ta_dewmini", fullName: "Dewmini", email: "dewmini@career141.com", taRole: "ta", isActive: true },
      { id: "ta_newbie", fullName: "Newbie", email: "newbie@career141.com", taRole: "ta", isActive: true },
    ]),
  )!;
  const out = withLiveIds(roster, [{ id: "k17abc", fullName: "Dewmini P", email: "DEWMINI@career141.com", taRole: "ta", isActive: true }]);
  assert.deepEqual(out.map((p) => p.id), ["k17abc", "ta_newbie"]);
  assert.equal(out[0].fullName, "Dewmini", "the roster's name is kept");
});

test("mergeLiveTaIntoRoster adds missing live people without duplicating existing emails", () => {
  const local = parseTaRoster(
    JSON.stringify([{ id: "ta_dewmini", fullName: "Dewmini", email: "dewmini@career141.com", taRole: "ta", isActive: true }]),
  )!;
  const merged = mergeLiveTaIntoRoster(local, [
    { id: "live_1", fullName: "Dewmini", email: "dewmini@career141.com", taRole: "ta", isActive: true },
    { id: "live_2", fullName: "Shamra", email: "shamra@career141.com", taRole: "ta_lead", isActive: true },
  ]);
  assert.deepEqual(merged.map((p) => p.fullName), ["Dewmini", "Shamra"]);
  assert.equal(merged[0].id, "live_1", "an email match takes TA's id");
  assert.equal(merged[1].id, "live_2");
});
