/**
 * "Agreement not signed" (26 Nov): a client with no ESA at all is not signed either. The positions
 * page only flagged an ESA that existed and was unsigned.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { agreementNotSigned } from "@/lib/clients";

const esas = (...states: string[]) => states.map((state) => ({ state }));

test("no ESA at all is not signed", () => {
  assert.equal(agreementNotSigned([]), true);
});

test("a draft or a sent ESA is not signed", () => {
  assert.equal(agreementNotSigned(esas("draft")), true);
  assert.equal(agreementNotSigned(esas("sent")), true);
  assert.equal(agreementNotSigned(esas("chasing")), true);
});

test("a signed or countersigned ESA is signed", () => {
  assert.equal(agreementNotSigned(esas("signed")), false);
  assert.equal(agreementNotSigned(esas("countersigned")), false);
});

test("several ESAs: one signed is enough, none signed is not", () => {
  assert.equal(agreementNotSigned(esas("declined", "signed", "draft")), false);
  assert.equal(agreementNotSigned(esas("declined", "expired", "draft")), true);
});
