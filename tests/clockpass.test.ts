/**
 * The scheduled pass. What matters here is that nobody but the scheduler can
 * ask, and that two asks at once cannot fire the same clock twice.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { keyAccepted, onePass, parsePass, passInWords } from "@/lib/clockPass";

const nothing = { warned: 0, fired: 0, escalated: 0 };

test("with no key set, nobody may ask", () => {
  delete process.env.OPS_CLOCK_KEY;
  assert.equal(keyAccepted("anything"), false);
  assert.equal(keyAccepted(""), false);
  assert.equal(keyAccepted(null), false);
});

test("the right key is accepted, a wrong one is not", () => {
  process.env.OPS_CLOCK_KEY = "a-long-random-string";
  assert.equal(keyAccepted("a-long-random-string"), true);
  assert.equal(keyAccepted(" a-long-random-string "), true);
  assert.equal(keyAccepted("a-long-random-strinG"), false);
  assert.equal(keyAccepted(null), false);
});

test("a pass says what it did, in the words the screen shows", async () => {
  const answer = await onePass(async () => ({ warned: 1, fired: 2, escalated: 3 }));
  assert.equal(answer.ok, true);
  assert.equal(answer.pass?.fired, 2);
  assert.equal(answer.pass?.escalated, 3);
  assert.match(passInWords(answer.pass), /2 clocks finished, 1 is close, 3 tasks passed on/);
});

test("a pass long ago says the scheduler has stopped", () => {
  const pass = { at: 1_000_000, ms: 3, warned: 0, fired: 1, escalated: 0 };
  assert.match(passInWords(pass, 1_000_000 + 60_000), /1 clock finished/);
  assert.doesNotMatch(passInWords(pass, 1_000_000 + 60_000), /stopped/);
  assert.match(passInWords(pass, 1_000_000 + 40 * 60_000), /looks like it has stopped/);
});

test("the remembered pass is read back, and nonsense is not guessed at", () => {
  const written = JSON.stringify({ at: 1, ms: 2, warned: 3, fired: 4, escalated: 5 });
  assert.equal(parsePass(written)?.fired, 4);
  assert.equal(parsePass("not json"), null);
  assert.equal(parsePass(""), null);
  assert.equal(parsePass(42), null);
  assert.equal(parsePass(JSON.stringify({ ms: 2 })), null, "without a time it means nothing");
});

test("a second ask while one is running is refused, not queued", async () => {
  let release: (() => void) | undefined;
  const slow = onePass(() => new Promise<typeof nothing>((resolve) => {
    release = () => resolve(nothing);
  }));
  const second = await onePass(async () => ({ warned: 9, fired: 9, escalated: 9 }));
  assert.equal(second.ok, false);
  assert.match(second.reason ?? "", /still running/);
  release?.();
  assert.equal((await slow).ok, true);
});

test("a pass that hangs answers after the time limit", async () => {
  const answer = await onePass(() => new Promise<typeof nothing>(() => {}), Date.now(), 20);
  assert.equal(answer.ok, false);
  assert.match(answer.reason ?? "", /longer than/);
  assert.equal(answer.pass, null);
});

test("with nothing remembered the health screen says so", () => {
  assert.match(passInWords(null), /No pass has ever run/);
});
