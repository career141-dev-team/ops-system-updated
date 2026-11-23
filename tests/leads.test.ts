/**
 * Leads: the front door. The four questions asked of every one, and the two
 * standing rules behind them — banking and finance are declined for good, and
 * nothing closes without a reason.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  type ClientLike,
  duplicateMatch,
  existingClientOf,
  LEAD_SOURCES,
  flagIndustry,
  leadSection,
  nameKey,
  neverInviteBack,
  problemWithClosing,
  problemWithNewClient,
  problemWithNewLead,
  routeLead,
} from "@/lib/leads";
import { callKindFor, problemWithClientRename } from "@/lib/clients";
import { problemWithNewPosition } from "@/lib/requirements";

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
    { company: "A Firm", industry: "micro finance" },
    { company: "X", website: "www.xleasing.lk" },
  ]) {
    const flag = flagIndustry(text);
    assert.equal(flag.flagged, true, JSON.stringify(text));
    assert.ok(flag.because);
  }
});

test("what they want hiring is never read as what they do", () => {
  // A tile maker whose website enquiry said "we need a finance manager" was
  // flagged as a finance company (3 Nov). Once the form posts leads by itself,
  // that would have happened to every finance vacancy we are sent.
  const flag = flagIndustry({
    company: "WEBFORM TILES (Pvt) Ltd",
    industry: "tiles",
    notes: "We need a finance manager, urgently.",
  });
  assert.equal(flag.flagged, false);
  assert.equal(flag.because, null);
  // The company itself still decides it, whatever the enquiry says.
  assert.equal(flagIndustry({ company: "LB Finance", notes: "we need a driver" }).flagged, true);
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

import { directClientRouting } from "@/lib/leads";
test("a direct client lead goes where an exact match would", () => {
  const signed = directClientRouting({ id: "c1", name: "Delmege Interiors", nameKey: "delmege", stage: "active", taClientId: "ta1" });
  assert.equal(signed.state, "requirement", "an active client has a signed agreement: no intro call, no agreement to chase");
  assert.equal(signed.existing.id, "ta1");
  const notYet = directClientRouting({ id: "c2", name: "Orion", nameKey: "orion", stage: "lead", taClientId: null });
  assert.equal(notYet.state, "waiting_agreement");
  assert.equal(notYet.existing.id, "c2", "with no TA client yet, our own record stands in");
});

test("every state a lead can be in lands in a section, so a count can never be bigger than its list", () => {
  // The states the code writes (app/actions.ts), each with and without an agreement.
  const open = ["new", "intro_call", "waiting_agreement", "requirement", "handed_over"];
  const closed = ["declined_industry", "closed_silent", "closed_other"];
  for (const state of [...open, ...closed]) {
    for (const esa of [null, "draft", "sent", "chasing", "negotiating", "signed", "countersigned", "declined", "expired"]) {
      assert.ok(["new", "agreement", "opening", "closed"].includes(leadSection(state, esa)), state + " / " + esa);
    }
  }
  for (const state of closed) assert.equal(leadSection(state, "signed"), "closed");

  // The lead that went missing: opening made, agreement already countersigned.
  assert.equal(leadSection("handed_over", "countersigned"), "opening");
  assert.equal(leadSection("handed_over", null), "opening");

  assert.equal(leadSection("new", null), "new");
  assert.equal(leadSection("intro_call", null), "new");
  assert.equal(leadSection("waiting_agreement", null), "agreement");
  // An agreement already out puts a lead there whatever its own state says,
  // including the countersigned one that used to fall through both lists.
  assert.equal(leadSection("intro_call", "countersigned"), "agreement");
  assert.equal(leadSection("new", "sent"), "agreement");
  // A declined or expired agreement does not make it an agreement lead.
  assert.equal(leadSection("new", "declined"), "new");

  // A state nobody has written yet is shown, not dropped.
  assert.equal(leadSection("something_new", null), "new");
});

test("adding a client needs a name, one way to reach them, and no twin", () => {
  const ok = { company: "Test Co", contactEmail: "a@b.co", contactPhone: "", billingEmail: "" };
  assert.equal(problemWithNewClient(ok, false), null);
  assert.ok(problemWithNewClient({ ...ok, contactEmail: "" }, false));
  assert.ok(problemWithNewClient({ ...ok, billingEmail: "nope" }, false));
  assert.ok(problemWithNewClient(ok, true));
});

test("an existing client has no intro call, and no agreement when one is signed on file", () => {
  const intro = [{ kind: "intro" }];
  // Linked at the enquiry, signed before: routeLead put it at "requirement".
  assert.deepEqual(existingClientOf({ state: "requirement", clientTaId: "ta_c1" }, [], null), { skipsIntro: true, signedOnFile: true });
  // Known to us but never signed: the agreement is still to do.
  assert.deepEqual(existingClientOf({ state: "waiting_agreement", clientTaId: "ta_c1" }, [], null), { skipsIntro: true, signedOnFile: false });
  // A new client after its countersignature also has a TA id, but it had an intro call.
  assert.deepEqual(existingClientOf({ state: "requirement", clientTaId: "ta_c1" }, intro, { state: "countersigned" }), { skipsIntro: false, signedOnFile: false });
  // Still being checked: nothing skipped.
  assert.deepEqual(existingClientOf({ state: "new", clientTaId: null }, [], null), { skipsIntro: false, signedOnFile: false });
  // A Director's lead skips the call by design, and still needs its agreement.
  assert.deepEqual(existingClientOf({ state: "intro_call", clientTaId: null, source: "director" }, [], null), { skipsIntro: true, signedOnFile: false });
});

test("a client is offered one call: intro while new, requirement for a new role", () => {
  assert.equal(callKindFor({ stage: "lead", hasPosition: false, heldCall: false }), "intro");
  assert.equal(callKindFor({ stage: "lead", hasPosition: false, heldCall: true }), "requirement");
  assert.equal(callKindFor({ stage: "active", hasPosition: false, heldCall: false }), "requirement");
  assert.equal(callKindFor({ stage: "lead", hasPosition: true, heldCall: false }), "requirement");
});

test("a new position needs a client, a name, a number and a package; a rename needs a free name", () => {
  const ok = { title: "Finance Manager", headcount: "1", salary: "LKR 300,000" };
  assert.equal(problemWithNewPosition(ok, true), null);
  assert.ok(problemWithNewPosition(ok, false));
  assert.ok(problemWithNewPosition({ ...ok, title: "" }, true));
  assert.ok(problemWithNewPosition({ ...ok, salary: "" }, true));
  assert.equal(problemWithClientRename("Ceylon Cold Stores", false), null);
  assert.ok(problemWithClientRename("C", false));
  assert.ok(problemWithClientRename("Ceylon Cold Stores", true));
});
