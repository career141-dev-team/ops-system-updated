import { strict as assert } from "node:assert";
import { guaranteeColumn, offerColumn } from "@/lib/offerBoard";

const day = 86_400_000;
const p = { id: "p", candidateName: "A B", state: "placed", joinDate: 5 * day, joinedAt: null, monthlySalary: 100, offerLetterFileRef: "f" };
assert.equal(offerColumn({ ...p, joinDate: null }, true), "offer");
assert.equal(offerColumn(p, false), "missing");
assert.equal(offerColumn({ ...p, monthlySalary: null }, true), "missing");
assert.equal(offerColumn(p, true), "joining");
assert.equal(offerColumn({ ...p, state: "joined" }, true), "joined");
assert.equal(offerColumn({ ...p, state: "no_show" }, true), "didNotJoin");
assert.equal(offerColumn({ ...p, state: "cancelled" }, true), null);
const g = { id: "g", state: "running", startsAt: 0, endsAt: 90 * day };
assert.equal(guaranteeColumn(g, 10 * day), "in");
assert.equal(guaranteeColumn(g, 80 * day), "call");
assert.equal(guaranteeColumn({ ...g, state: "replacing" }, day), "leaver");
assert.equal(guaranteeColumn({ ...g, state: "ended_clean" }, day), "ended");
console.log("ok");
