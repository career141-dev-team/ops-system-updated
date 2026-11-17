import assert from "node:assert/strict";
import test from "node:test";

import { dayGroup, inFolder, labelFor, matchesWords, subjectHref } from "@/lib/inboxView";

const t = (items: { direction: "in" | "out"; id: string; state: string | null }[], extra = {}) => ({
  items,
  waitingOnUs: false,
  hasDraft: false,
  about: null,
  ...extra,
});

test("folders answer from the data Ops has", () => {
  const rs = new Map([["a", "new"], ["b", "actioned"], ["c", "filed"]]);
  const fresh = t([{ direction: "in", id: "a", state: null }]);
  const done = t([{ direction: "in", id: "b", state: null }]);
  const sentOnly = t([{ direction: "out", id: "o", state: "sent" }]);
  assert.equal(inFolder(fresh, "inbox", rs), true);
  assert.equal(inFolder(fresh, "unread", rs), true);
  assert.equal(inFolder(done, "inbox", rs), false, "dealt with leaves the inbox");
  assert.equal(inFolder(done, "archived", rs), true);
  assert.equal(inFolder(sentOnly, "inbox", rs), false, "our own sends alone are not a conversation");
  assert.equal(inFolder(sentOnly, "sent", rs), true);
  assert.equal(inFolder(t([{ direction: "in", id: "c", state: null }], { hasDraft: true }), "drafts", rs), true);
  assert.equal(inFolder(t([{ direction: "in", id: "c", state: null }], { waitingOnUs: true }), "waiting", rs), true);
});

test("labels, words, days and links", () => {
  assert.equal(labelFor("lead"), "clients");
  assert.equal(labelFor("clientSet"), "openings");
  assert.equal(labelFor("invoice"), "money");
  assert.equal(labelFor("inbound"), null);
  assert.equal(matchesWords("kasun meridian", "Kasun yes", "Meridian Foods"), true);
  assert.equal(matchesWords("kasun bluewater", "Kasun yes", "Meridian Foods"), false);
  const now = Date.UTC(2026, 10, 17, 6, 0);
  assert.equal(dayGroup(now - 3_600_000, now), "Today");
  assert.equal(dayGroup(now - 24 * 3_600_000, now), "Yesterday");
  assert.equal(dayGroup(now - 72 * 3_600_000, now), "Earlier");
  assert.equal(subjectHref("clientSet", "s1"), "/sets/s1");
  assert.equal(subjectHref("nothing", "x"), null);
});
