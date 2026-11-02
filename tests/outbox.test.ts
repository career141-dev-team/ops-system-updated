/**
 * Writes to the TA System. The two things that must hold: the same intention
 * twice is one write, and a system that is down is not hammered.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { GIVE_UP_AFTER, dueNow, keyFor, nextTryAt, outboxInWords, shouldGiveUp, waitAfter } from "@/lib/outbox";

test("the same write twice has the same key, a different one does not", () => {
  const a = keyFor("/integrations/v1/openings", { clientId: "c1", title: "Head of finance" });
  const b = keyFor("/integrations/v1/openings", { title: "Head of finance", clientId: "c1" });
  const c = keyFor("/integrations/v1/openings", { clientId: "c1", title: "Head of sales" });
  const d = keyFor("/integrations/v1/clients", { clientId: "c1", title: "Head of finance" });
  assert.equal(a, b, "the order the fields were written in is not a difference");
  assert.notEqual(a, c);
  assert.notEqual(a, d);
  assert.match(a, /^integrations-v1-openings-/);
});

test("waiting gets longer, then settles at an hour", () => {
  assert.equal(waitAfter(1), 60_000);
  assert.equal(waitAfter(2), 5 * 60_000);
  assert.equal(waitAfter(4), 30 * 60_000);
  assert.equal(waitAfter(9), 60 * 60_000);
  assert.equal(nextTryAt(1, 1_000), 61_000);
});

test("it gives up eventually, and says a person must step in", () => {
  assert.equal(shouldGiveUp(GIVE_UP_AFTER - 1), false);
  assert.equal(shouldGiveUp(GIVE_UP_AFTER), true);
  assert.match(outboxInWords({ state: "failed", attempts: 12, lastError: "The TA System answered 500." }), /by hand/);
  assert.match(outboxInWords({ state: "queued", attempts: 0, lastError: null }), /Waiting to go/);
  assert.match(outboxInWords({ state: "queued", attempts: 3, lastError: "down" }), /Tried 3 times/);
  assert.equal(outboxInWords({ state: "sent", attempts: 1, lastError: null }), "Sent.");
});

test("only queued writes past their waiting time are tried", () => {
  const items = [
    { id: "a", state: "queued", nextTryAt: null },
    { id: "b", state: "queued", nextTryAt: 500 },
    { id: "c", state: "queued", nextTryAt: 5_000 },
    { id: "d", state: "sent", nextTryAt: null },
    { id: "e", state: "failed", nextTryAt: null },
  ];
  assert.deepEqual(dueNow(items, 1_000).map((i) => i.id), ["a", "b"]);
});
