/**
 * Leads: the front door. The four questions asked of every one, and the two
 * standing rules behind them — banking and finance are declined for good, and
 * nothing closes without a reason.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  type ClientLike,
  duplicateMatch,
  flagIndustry,
  nameKey,
  neverInviteBack,
  problemWithClosing,
  problemWithNewLead,
  routeLead,
} from "@/lib/leads";

const client = (name: string, esaSignedAt: number | null = null): ClientLike => ({
  id: "ta_" + nameKey(name).replace(/ /g, "_"),
  name,
  nameKey: nameKey(name),
  esaSignedAt,
});

test("a company name is reduced the same way the TA System reduces it", () => {
  assert.equal(nameKey("  Lanka Hospitals (Pvt) Ltd.  "), "lanka hospitals pvt ltd");
  assert.equal(nameKey("ABC & Co."), "abc co");
  assert.equal(nameKey(""), "");
});

test("banking and finance are flagged, with the word that caused it", () => {
  for (const text of [
    { company: "Sampath Bank PLC" },
    { company: "Some Company", industry: "Insurance" },
    { company: "LB Finance" },
    { company: "A Firm", notes: "they do micro finance in the north" },
    { company: "X", website: "www.xleasing.lk" },
  ]) {
    const flag = flagIndustry(text);
    assert.equal(flag.flagged, true, JSON.stringify(text));
    assert.ok(flag.because);
  }
});

test("a word that only looks like it is not flagged", () => {
  assert.equal(flagIndustry({ company: "National Blood Bank" }).flagged, false);
  assert.equal(flagIndustry({ company: "Hayleys Plantations" }).flagged, false);
  assert.equal(flagIndustry({ company: "Urbanisation Consultants" }).flagged, false);
});

test("the same company is linked; a company that merely looks similar is only offered", () => {
  const clients = [client("Lanka Hospitals"), client("Lanka Hospital Diagnostics"), client("Hemas Holdings")];

  const same = duplicateMatch("  LANKA HOSPITALS  ", clients);
  assert.equal(same.exact?.name, "Lanka Hospitals");
  assert.deepEqual(same.near, []);

  const similar = duplicateMatch("Lanka Hospital Diagnostics Pvt", clients);
  assert.equal(similar.exact, null);
  assert.ok(similar.near.some((c) => c.name === "Lanka Hospital Diagnostics"));

  const unknown = duplicateMatch("Brandix Apparel", clients);
  assert.equal(unknown.exact, null);
  assert.deepEqual(unknown.near, []);
});

test("a lead with no way to reply is refused", () => {
  const good = { company: "Brandix", contactName: "A", contactEmail: "a@example.test", contactPhone: "", source: "call" };
  assert.equal(problemWithNewLead(good), null);
  assert.match(problemWithNewLead({ ...good, company: " " }) ?? "", /company's name/);
  assert.match(problemWithNewLead({ ...good, company: "B" }) ?? "", /too short/);
  assert.match(problemWithNewLead({ ...good, source: "pigeon" }) ?? "", /where this lead came from/);
  assert.match(problemWithNewLead({ ...good, contactEmail: "" }) ?? "", /email address or a phone number/);
  assert.match(problemWithNewLead({ ...good, contactEmail: "not-an-address" }) ?? "", /does not look like one/);
  assert.equal(problemWithNewLead({ ...good, contactEmail: "", contactPhone: "077 123 4567" }), null);
});

test("the four questions are answered in order", () => {
  // Industry wins over everything, even an old signed agreement.
  assert.equal(
    routeLead({ industryFlagged: true, industryConfirmed: true, existing: client("Sampath Bank", 1000) }).state,
    "declined_industry",
  );
  // A flag nobody has confirmed changes nothing.
  assert.equal(routeLead({ industryFlagged: true, industryConfirmed: false, existing: null }).state, "intro_call");
  // An existing client with a signed agreement skips the intro call.
  assert.equal(
    routeLead({ industryFlagged: false, industryConfirmed: false, existing: client("Hemas", 1700000000000) }).state,
    "requirement",
  );
  // A returning client with no agreement waits for one.
  assert.equal(
    routeLead({ industryFlagged: false, industryConfirmed: false, existing: client("Hemas", null) }).state,
    "waiting_agreement",
  );
  assert.equal(routeLead({ industryFlagged: false, industryConfirmed: false, existing: null }).state, "intro_call");
});

test("nothing closes without a reason, and a declined industry is never invited back", () => {
  assert.match(problemWithClosing("closed_silent", "") ?? "", /without a reason/);
  assert.match(problemWithClosing("declined_industry", "no") ?? "", /without a reason/);
  assert.equal(problemWithClosing("closed_other", "They went with another agency."), null);
  assert.equal(problemWithClosing("intro_call", ""), null, "a lead that is not closing needs no reason");

  assert.equal(neverInviteBack("declined_industry"), true);
  assert.equal(neverInviteBack("closed_silent"), false);
});
