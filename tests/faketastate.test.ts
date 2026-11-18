import assert from "node:assert/strict";
import test from "node:test";

import { EMPTY_STATE, addApps, applyWrite, pipelineNow, setStage } from "@/lib/fakeTaState";

const app = (id: string, currentStage = "sent_to_client") => ({ id, candidateName: id, currentStage, setNumber: 1, backupForApplicationId: null });

test("a client's decision moves the candidate in the stand-in's pipeline", () => {
  let s = applyWrite(EMPTY_STATE, "/integrations/v1/applications/ta_smp_a1/client-decision", { decision: "shortlisted" });
  s = applyWrite(s, "/integrations/v1/applications/ta_smp_a2/client-decision", { decision: "rejected" });
  s = applyWrite(s, "/integrations/v1/applications/ta_dev_x_s1one/client-owned", {});
  const p = pipelineNow([app("ta_smp_a1"), app("ta_smp_a2"), app("ta_smp_a3")], s);
  assert.deepEqual(p.applications.map((a) => a.currentStage), ["client_shortlist", "rejected_by_client", "sent_to_client"]);
  assert.equal(p.counts.client_shortlist, 1);
  assert.equal(s.stages.ta_dev_x_s1one, "client_owned");
});

test("the recorded sample and other writes are left alone", () => {
  assert.equal(applyWrite(EMPTY_STATE, "/integrations/v1/applications/ta_a1/client-decision", { decision: "rejected" }), EMPTY_STATE);
  assert.equal(applyWrite(EMPTY_STATE, "/integrations/v1/openings/ta_smp_j1/status", { status: "on_hold" }), EMPTY_STATE);
  assert.equal(setStage(EMPTY_STATE, "ta_a3", "offer"), EMPTY_STATE);
  assert.equal(setStage(EMPTY_STATE, "ta_smp_a3", "offer").stages.ta_smp_a3, "offer");
});

test("people the panel invents join their opening once", () => {
  let s = addApps(EMPTY_STATE, "ta_dev_1", [app("ta_dev_1_s1one"), app("ta_dev_1_s1two")]);
  s = addApps(s, "ta_dev_1", [app("ta_dev_1_s1two"), app("ta_dev_1_s2one")]);
  assert.deepEqual(s.apps.ta_dev_1.map((a) => a.id), ["ta_dev_1_s1one", "ta_dev_1_s1two", "ta_dev_1_s2one"]);
});
