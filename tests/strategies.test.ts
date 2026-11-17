import assert from "node:assert/strict";
import test from "node:test";

import {
  TA_STRATEGIES,
  formatStrategyText,
  problemWithStrategy,
  resolveStrategyOwner,
  strategyNameOf,
  taOwnerId,
  tryBuildStrategyAdditions,
} from "@/lib/strategies";

test("TA_STRATEGIES contains all 19 standard strategies from the TA system", () => {
  assert.equal(TA_STRATEGIES.length, 19);
  assert.ok(TA_STRATEGIES.includes("LinkedIn Search"));
  assert.ok(TA_STRATEGIES.includes("Recruiter Search & POST"));
  assert.ok(TA_STRATEGIES.includes("Linked Post"));
});

test("problemWithStrategy accepts an Ops member or a TA person, and refuses bad input", () => {
  const base = {
    strategy: "LinkedIn Search",
    ownerId: "mem_1",
    validOpsIds: ["mem_1"],
    validTaIds: ["ta_1"],
    existing: [],
  };

  assert.equal(problemWithStrategy(base), null);
  assert.equal(problemWithStrategy({ ...base, ownerId: taOwnerId("ta_1") }), null);

  assert.match(problemWithStrategy({ ...base, strategy: "Made up" }) ?? "", /from the list/);
  assert.match(problemWithStrategy({ ...base, ownerId: "nobody" }) ?? "", /who is working/);
  assert.match(problemWithStrategy({ ...base, ownerId: taOwnerId("unknown") }) ?? "", /who is working/);

  // Same strategy for the same person is refused; same strategy for a different person is allowed.
  const existing = [{ text: formatStrategyText("LinkedIn Search", "Hotels only"), ownerId: "mem_1" }];
  assert.match(problemWithStrategy({ ...base, existing }) ?? "", /already assigned/);
  assert.equal(problemWithStrategy({ ...base, ownerId: taOwnerId("ta_1"), existing }), null);
});

test("formatStrategyText, strategyNameOf, and resolveStrategyOwner handle notes and both teams", () => {
  const formatted = formatStrategyText("ChatGPT", "Kurunegala apparel");
  assert.equal(formatted, "ChatGPT — Kurunegala apparel");
  assert.equal(strategyNameOf(formatted), "ChatGPT");
  assert.equal(strategyNameOf("SCOOP"), "SCOOP");

  const members = [{ id: "mem_1", name: "Rushda" }];
  const taPeople = [{ id: "ta_1", fullName: "Thushini" }];
  assert.deepEqual(resolveStrategyOwner("mem_1", members, taPeople), { name: "Rushda", team: "Ops" });
  assert.deepEqual(resolveStrategyOwner(taOwnerId("ta_1"), members, taPeople), { name: "Thushini", team: "TA" });
  assert.equal(resolveStrategyOwner("missing", members, taPeople), null);
});

test("tryBuildStrategyAdditions adds multiple strategies at once and rejects empty or invalid batches", () => {
  const empty = tryBuildStrategyAdditions([], ["mem_1"], ["ta_1"], [], 1000);
  assert.equal(empty.ok, false);

  const batch = tryBuildStrategyAdditions(
    [
      { strategy: "LinkedIn Search", ownerId: taOwnerId("ta_1"), note: "Hotels only" },
      { strategy: "ChatGPT", ownerId: "mem_1", note: "Kurunegala apparel" },
      { strategy: "Linked Post", ownerId: taOwnerId("ta_1") },
    ],
    ["mem_1"],
    ["ta_1"],
    [],
    1000,
  );
  assert.equal(batch.ok, true);
  if (batch.ok) {
    assert.equal(batch.added.length, 3);
    assert.equal(batch.added[0].text, "LinkedIn Search — Hotels only");
    assert.equal(batch.added[1].ownerId, "mem_1");
    assert.equal(batch.added[2].text, "Linked Post");
  }

  const badBatch = tryBuildStrategyAdditions(
    [
      { strategy: "LinkedIn Search", ownerId: "mem_1" },
      { strategy: "LinkedIn Search", ownerId: "mem_1" },
    ],
    ["mem_1"],
    [],
    [],
    1000,
  );
  assert.equal(badBatch.ok, false);
});
