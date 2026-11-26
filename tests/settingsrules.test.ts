/**
 * What a settings change may do.
 *
 * Written after the screen was clicked for the first time and a switch was
 * flipped by whatever the page happened to send. Two rules came out of it: a
 * switch is inverted by the server, never set from the page, and outreach is
 * not switchable from a screen at all, because it is the one setting that lets
 * a real message reach a real client.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { LOCKED_SETTINGS, settingChange } from "@/lib/settingsRules";

const REASON = "The owner asked for it";

test("nothing changes without a reason, whatever the value is", () => {
  const r = settingChange("set.minCvs", 5, "6", "   ");
  assert.deepEqual(r, { ok: false, message: "Say why it is changing before you save it." });
});

test("the hiring interviewers may be emptied, other text may not", () => {
  assert.deepEqual(settingChange("hiring.interviewers", "Asma", " ", REASON), { ok: true, value: "" });
  assert.equal(settingChange("scoop.mailbox", "a@example.test", " ", REASON).ok, false);
});

test("a switch is flipped by the server, and the page cannot decide it", () => {
  assert.deepEqual(settingChange("switch.timersEnabled", true, "on", REASON), { ok: true, value: false });
  assert.deepEqual(settingChange("switch.timersEnabled", false, "off", REASON), { ok: true, value: true });
  // Nonsense from the page changes nothing about the answer.
  assert.deepEqual(settingChange("switch.timersEnabled", false, "21", REASON), { ok: true, value: true });
  assert.deepEqual(settingChange("switch.timersEnabled", false, "", REASON), { ok: true, value: true });
});

test("outreach cannot be switched on from a screen, by anybody", () => {
  assert(LOCKED_SETTINGS.includes("switch.outreachLive"));
  const r = settingChange("switch.outreachLive", false, "on", REASON);
  assert.equal(r.ok, false);
  assert(!r.ok && /released, not from this screen/.test(r.message));
  assert(!r.ok && /test address/.test(r.message), "it says what happens meanwhile");
});

test("a number must be a number, and never below nothing", () => {
  assert.deepEqual(settingChange("set.minCvs", 5, " 6 ", REASON), { ok: true, value: 6 });
  assert.equal(settingChange("set.minCvs", 5, "six", REASON).ok, false);
  assert.equal(settingChange("set.minCvs", 5, "", REASON).ok, false);
  assert.equal(settingChange("set.minCvs", 5, "-1", REASON).ok, false);
  assert.deepEqual(settingChange("set.minCvs", 5, "0", REASON), { ok: true, value: 0 });
});

test("text is trimmed and never left empty", () => {
  assert.deepEqual(settingChange("mail.from", "ops@example.test", "  hello@example.test ", REASON), {
    ok: true,
    value: "hello@example.test",
  });
  assert.equal(settingChange("mail.from", "ops@example.test", "   ", REASON).ok, false);
});
