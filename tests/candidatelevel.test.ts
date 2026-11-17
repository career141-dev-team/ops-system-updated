/**
 * Where a candidate is between found and guaranteed (owner, 17 Nov evening):
 * internal shortlist (ours) -> external shortlist (the client's) -> interviews ->
 * joining -> guarantee.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { CANDIDATE_LEVELS, LEVEL_LABELS, type LevelFacts, candidateLevel } from "@/lib/positionCandidates";

const none: LevelFacts = { dropped: false, inSet: false, clientShortlisted: false, hasInterview: false, placed: false, joined: false, taStage: null };

test("one case per level, from found to guarantee", () => {
  assert.equal(candidateLevel(none), "found");
  assert.equal(candidateLevel({ ...none, inSet: true }), "internal", "in one of our CV sets, the client has not answered");
  assert.equal(candidateLevel({ ...none, taStage: "screened" }), "internal", "TA says screened");
  assert.equal(candidateLevel({ ...none, inSet: true, clientShortlisted: true }), "external", "the client said yes");
  assert.equal(candidateLevel({ ...none, taStage: "client_shortlist" }), "external");
  assert.equal(candidateLevel({ ...none, clientShortlisted: true, hasInterview: true }), "interview");
  assert.equal(candidateLevel({ ...none, taStage: "interview" }), "interview");
  assert.equal(candidateLevel({ ...none, hasInterview: true, placed: true }), "joining", "placed, not yet joined");
  assert.equal(candidateLevel({ ...none, taStage: "offer" }), "joining");
  assert.equal(candidateLevel({ ...none, placed: true, joined: true }), "guarantee", "joined: the guarantee runs");
});

test("a rejection puts them out, unless they were already placed", () => {
  assert.equal(candidateLevel({ ...none, inSet: true, dropped: true }), "out");
  assert.equal(candidateLevel({ ...none, taStage: "rejected_by_client" }), "out");
  assert.equal(candidateLevel({ ...none, dropped: true, hasInterview: true }), "out", "dropped after an interview");
  assert.equal(candidateLevel({ ...none, dropped: true, placed: true }), "joining");
});

test("a stage TA has not told us about stays found, and every level has a label", () => {
  assert.equal(candidateLevel({ ...none, taStage: "something_new" }), "found");
  for (const level of CANDIDATE_LEVELS) assert.ok(LEVEL_LABELS[level], level);
});
