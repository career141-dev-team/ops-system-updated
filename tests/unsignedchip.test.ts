/**
 * "Agreement not signed" chip and the requirement call's organiser (26 Nov, Nov 25 ops meeting).
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase } from "@/data/types";
import { agreementToChase, clientAgreementNotSigned, positionAgreementNotSigned } from "@/lib/clients";
import { callEffects, requirementOrganiser } from "@/lib/meetings";

const db = (agreements: { leadId: string; state: string }[], stage = "onboarding") =>
  ({
    clients: [{ id: "c1", leadId: "l1", stage, nameKey: "tea" }],
    leads: [{ id: "l7", nameKey: "tea" }],
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

test("an active client with no agreement record at all signed before Ops", () => {
  const p = { requirementId: "r1", clientId: "c1" };
  assert.equal(clientAgreementNotSigned(db([], "active"), "c1"), false);
  assert.equal(positionAgreementNotSigned(db([], "active"), p), false);
  assert.equal(clientAgreementNotSigned(db([], "lead"), "c1"), true);
  assert.equal(clientAgreementNotSigned(db([{ leadId: "l1", state: "sent" }], "active"), "c1"), true);
  // An unsigned agreement on another lead of the same company ends the exception too.
  assert.equal(clientAgreementNotSigned(db([{ leadId: "l7", state: "draft" }], "active"), "c1"), true);
  assert.equal(clientAgreementNotSigned(db([{ leadId: "l7", state: "signed" }], "active"), "c1"), false);
});

test("a client and its positions give the same answer; a position with no client reads its requirement", () => {
  const signed = db([{ leadId: "l2", state: "signed" }]);
  assert.equal(positionAgreementNotSigned(signed, { requirementId: null, clientId: "c1" }), false);
  assert.equal(positionAgreementNotSigned(signed, { requirementId: "r1", clientId: null }), false);
  assert.equal(positionAgreementNotSigned(db([], "active"), { requirementId: null, clientId: null }), true);
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

test("the chase opens the unsigned agreement, falling back to the client's lead", () => {
  const p = { requirementId: "r1", clientId: "c1" };
  const of = (agreements: object[]) => agreementToChase(db(agreements as never), p)?.id ?? null;
  assert.equal(of([{ id: "e1", leadId: "l1", version: 1, state: "sent" }]), "e1", "requirement lead has none, client lead does");
  assert.equal(of([{ id: "e1", leadId: "l1", version: 1, state: "sent" }, { id: "e2", leadId: "l2", version: 1, state: "signed" }]), "e1", "never opens a signed one");
  assert.equal(of([{ id: "e2", leadId: "l2", version: 1, state: "sent" }, { id: "e3", leadId: "l2", version: 2, state: "draft" }]), "e3", "newest version");
  assert.equal(of([]), null);
});

test("only an intro call starts the agreement clock when it is marked held", () => {
  assert.deepEqual(callEffects("intro"), { step: "intro", name: "intro call", startsAgreement: true });
  assert.deepEqual(callEffects("requirement"), { step: "requirement", name: "requirement call", startsAgreement: false });
});
