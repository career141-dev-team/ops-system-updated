/**
 * What a clock does. These rules are the whole point of the Ops system: the
 * clocks remember so that nobody has to.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { cancelledByReply, isChase, nextState, shouldFire, shouldWarn, timeLeft } from "@/lib/timers";
import type { OpsTimer } from "@/data/types";

const NOW = Date.UTC(2026, 10, 2, 4, 30);
const HOUR = 3_600_000;

const timer = (over: Partial<OpsTimer> = {}): OpsTimer => ({
  id: "t1",
  kind: "esa.chase",
  subjectType: "esa",
  subjectId: "esa_1",
  startsAt: NOW - 4 * HOUR,
  dueAt: NOW + HOUR,
  warnAt: NOW - HOUR,
  state: "running",
  firedAt: null,
  ownerId: "m_owner",
  payload: {},
  ...over,
});

test("a clock warns between its warning time and its due time", () => {
  assert.equal(shouldWarn(timer(), NOW), true);
  assert.equal(shouldWarn(timer({ warnAt: NOW + HOUR / 2 }), NOW), false, "not yet");
  assert.equal(shouldWarn(timer({ dueAt: NOW - 1 }), NOW), false, "past due is firing, not warning");
  assert.equal(shouldWarn(timer({ warnAt: null }), NOW), false, "a clock with no warning never warns");
});

test("a clock fires once it is due, from running or warned", () => {
  assert.equal(shouldFire(timer({ dueAt: NOW }), NOW), true);
  assert.equal(shouldFire(timer({ dueAt: NOW, state: "warned" }), NOW), true);
  assert.equal(shouldFire(timer(), NOW), false, "not due yet");
});

test("a cancelled, fired or finished clock does nothing again", () => {
  for (const state of ["cancelled", "fired", "done"] as const) {
    assert.equal(nextState(timer({ state, dueAt: NOW - HOUR }), NOW), null, state);
  }
});

test("firing wins over warning when both are true", () => {
  assert.equal(nextState(timer({ dueAt: NOW - 1, warnAt: NOW - 2 * HOUR }), NOW), "fired");
  assert.equal(nextState(timer(), NOW), "warned");
  assert.equal(nextState(timer({ warnAt: NOW + HOUR / 2 }), NOW), null);
});

test("a client's reply stops the chasing and nothing else", () => {
  assert.equal(isChase("esa.chase"), true);
  assert.equal(isChase("feedback.chase"), true);
  // The ownership window and the guarantee measure something real; a reply does
  // not change when they end.
  assert.equal(isChase("set.ownership"), false);
  assert.equal(isChase("guarantee.end"), false);

  const timers = [
    timer({ id: "chase", kind: "esa.chase" }),
    timer({ id: "window", kind: "set.ownership" }),
    timer({ id: "other", kind: "esa.chase", subjectId: "esa_2" }),
    timer({ id: "done", kind: "esa.chase", state: "fired" }),
  ];
  const stopped = cancelledByReply(timers, "esa", "esa_1").map((t) => t.id);
  assert.deepEqual(stopped, ["chase"]);
});

test("time left is said in words, and turns late", () => {
  assert.deepEqual(timeLeft(NOW + 3 * 86_400_000, NOW), { text: "3 days left", tone: "calm" });
  assert.deepEqual(timeLeft(NOW + 2 * HOUR, NOW), { text: "2 hours left", tone: "soon" });
  assert.deepEqual(timeLeft(NOW - 2 * 86_400_000, NOW), { text: "2 days late", tone: "late" });
});
