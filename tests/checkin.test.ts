import assert from "node:assert/strict";
import test from "node:test";

import { checkInMessage, lastTalkLine, recentJoiner } from "@/lib/checkIn";

const NOW = Date.UTC(2026, 10, 18, 5, 0);
const DAY = 86_400_000;

test("the message follows the ticks", () => {
  const base = { contact: "Mahesh Rathnayake", sender: "Rushda Fernando", settling: { name: "Dinesh Perera", joined: "Tue 17 Nov" }, roles: ["Field Officer", "Driver"] };
  const all = checkInMessage({ ...base, parts: ["settling", "places", "better"] });
  assert.match(all, /^Hi Mahesh, this is Rushda from Career141\./);
  assert.match(all, /How is Dinesh settling in since joining on Tue 17 Nov\?/);
  assert.match(all, /We still have 2 roles open \(Field Officer, Driver\)/);
  assert.match(all, /Is there anything we can do better\?/);
  const none = checkInMessage({ ...base, parts: [] });
  assert.doesNotMatch(none, /settling|open \(|do better/);
  const noJoiner = checkInMessage({ ...base, settling: null, parts: ["settling"] });
  assert.doesNotMatch(noJoiner, /settling/);
  assert.match(checkInMessage({ ...base, contact: null, parts: [] }), /^Hi, this is Rushda/);
});

test("the last talk line and the newest joiner", () => {
  assert.equal(lastTalkLine(null, NOW), "No call or message is written down yet");
  assert.equal(lastTalkLine(0, NOW), "Last talk today");
  assert.match(lastTalkLine(5, NOW), /^Last talk \w{3} 13 Nov, 5 days ago$/);
  assert.match(lastTalkLine(1, NOW), /1 day ago$/);
  const p = (id: string, clientId: string, joinedAt: number | null, state = "joined") => ({ id, clientId, joinedAt, state, candidateName: "P " + id }) as never;
  const db = { placements: [p("old", "c1", NOW - 40 * DAY), p("a", "c1", NOW - 5 * DAY), p("b", "c1", NOW - 2 * DAY), p("other", "c2", NOW - DAY), p("placed", "c1", null, "placed")] };
  assert.equal(recentJoiner(db, "c1", NOW)?.name, "P b");
  assert.equal(recentJoiner(db, "c3", NOW), null);
  assert.equal(recentJoiner({ placements: [p("old", "c1", NOW - 40 * DAY)] }, "c1", NOW), null);
});
