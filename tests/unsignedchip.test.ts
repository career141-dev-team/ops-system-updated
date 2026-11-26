/**
 * "Agreement not signed" chip and the requirement call's organiser (26 Nov, Nov 25 ops meeting).
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase } from "@/data/types";
import { clientAgreementNotSigned, positionAgreementNotSigned } from "@/lib/clients";
import { requirementOrganiser } from "@/lib/meetings";

const db = (agreements: { leadId: string; state: string }[]) =>
  ({
    clients: [{ id: "c1", leadId: "l1" }],
    requirements: [{ id: "r1", leadId: "l2" }],
    positions: [{ id: "p1", clientId: "c1", requirementId: "r1" }],
    agreements,
  }) as unknown as OpsDatabase;

test("a client with no ESA is not signed", () => {
  assert.equal(clientAgreementNotSigned(db([]), "c1"), true);
});

test("signed on the client's own lead or on a position's lead settles it", () => {
  assert.equal(clientAgreementNotSigned(db([{ leadId: "l1", state: "signed" }]), "c1"), false);
  assert.equal(clientAgreementNotSigned(db([{ leadId: "l2", state: "countersigned" }]), "c1"), false);
  assert.equal(clientAgreementNotSigned(db([{ leadId: "l1", state: "sent" }, { leadId: "l9", state: "signed" }]), "c1"), true);
});

test("a position reads its requirement's lead and the client's lead", () => {
  const p = { requirementId: "r1", clientId: "c1" };
  assert.equal(positionAgreementNotSigned(db([{ leadId: "l2", state: "draft" }]), p), true);
  assert.equal(positionAgreementNotSigned(db([{ leadId: "l1", state: "signed" }]), p), false);
});

test("the requirement call goes in the primary TA's calendar", () => {
  const members = [
    { id: "m1", active: true, taUserId: null },
    { id: "m2", active: true, taUserId: "ta7" },
    { id: "m3", active: false, taUserId: "ta8" },
  ];
  assert.equal(requirementOrganiser({ primaryTaId: "ta7" }, members), "m2");
  assert.equal(requirementOrganiser({ primaryTaId: "ta8" }, members), null);
  assert.equal(requirementOrganiser({ primaryTaId: null }, members), null);
});
