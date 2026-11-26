/**
 * A position's value (26 Nov, Nov 25 ops meeting, PR 4): salary times the signed agreement's fee months.
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase } from "@/data/types";
import { positionValue } from "@/lib/clients";

const db = (agreements: { leadId: string; state: string; version: number; fields: Record<string, string> }[]) =>
  ({
    clients: [{ id: "c1", leadId: "l1" }],
    requirements: [{ id: "r1", leadId: "l2" }],
    agreements,
  }) as unknown as OpsDatabase;
const p = (salaryMonthly?: number) => ({ requirementId: "r1", clientId: "c1", salaryMonthly });

test("no salary typed is no value, not zero", () => {
  assert.equal(positionValue(db([]), p()), null);
  assert.equal(positionValue(db([]), p(0)), null);
});

test("one month when there is no signed agreement", () => {
  assert.equal(positionValue(db([{ leadId: "l1", state: "sent", version: 1, fields: { feeMonths: "2" } }]), p(150000)), 150000);
});

test("the newest signed agreement's fee months, on either lead", () => {
  const agreements = [
    { leadId: "l1", state: "countersigned", version: 1, fields: { feeMonths: "1" } },
    { leadId: "l2", state: "signed", version: 2, fields: { feeMonths: "1.5" } },
  ];
  assert.equal(positionValue(db(agreements), p(100000)), 150000);
});
