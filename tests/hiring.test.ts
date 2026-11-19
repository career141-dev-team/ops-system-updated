import assert from "node:assert/strict";
import test from "node:test";

import { EMPTY_HIRING, hiringView, inviteMessage, offerLetter, totals, vacancyById, whereItStands, whyNow } from "@/lib/hiring";
import { hiringSample } from "@/lib/hiringSample";

const now = Date.UTC(2026, 10, 19, 6, 0);

test("with no backend and no sample the view is empty and says so", () => {
  const v = hiringView({}, null);
  assert.equal(v, EMPTY_HIRING);
  assert.equal(totals(v, now).toCall, 0);
  assert.match(whereItStands(v, now).headline, /No vacancies/);
});

test("the numbers count open vacancies only, and a call is a new CV or a called one", () => {
  const v = hiringSample(now);
  const t = totals(v, now);
  assert.equal(t.newCvs, 3);
  assert.equal(t.toCall, 5);
  assert.equal(t.decision, 2);
  assert.equal(t.hiredThisMonth, 1);
  assert.match(whereItStands(v, now).body, /Marketing Executive is on hold/);
});

test("why now says only what is known, and a draft is made only when every fact is there", () => {
  const v = hiringSample(now);
  const rec = vacancyById(v, "vac_recruit")!;
  const lines = whyNow(rec, rec.applicants[0], now);
  assert.ok(lines.at(-1)!.includes("none is filled"));
  assert.equal(inviteMessage(rec.applicants.find((a) => a.id === "a6")!, rec.title), null);
  assert.match(inviteMessage(rec.applicants.find((a) => a.id === "a5")!, rec.title)!, /Hello Dilini/);
  assert.equal(offerLetter(rec.applicants.find((a) => a.id === "a10")!, rec.title), null);
  assert.match(offerLetter(rec.applicants.find((a) => a.id === "a9")!, rec.title)!, /LKR 160,000/);
});
