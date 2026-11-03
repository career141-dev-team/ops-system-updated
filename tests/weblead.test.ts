/**
 * Leads from the website form (15, Phase 2 step 6).
 *
 * Nobody is at a screen when one of these arrives, so everything that would
 * normally be a person noticing something has to be a rule here: rubbish
 * refused with a reason, a double-click not becoming two leads, a bot not
 * becoming anything, and somebody's name on every lead that is written down.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  SAME_AGAIN_WITHIN_MS,
  alreadyArrived,
  keyAccepted,
  looksLikeABot,
  problemWithWebLead,
  readWebLead,
  whoTakesIt,
} from "@/lib/webLead";

test("the form is tidied into the shape a lead is written in", () => {
  const lead = readWebLead({
    company: "  Sample\n Holdings  (Pvt) Ltd ",
    contactEmail: " HR@Sample.LK ",
    contactPhone: " 077 123 4567 ",
    notes: "  We need a finance manager.  ",
    industry: 42,
  });
  assert.equal(lead.company, "Sample Holdings (Pvt) Ltd", "a pasted line break is not part of a name");
  assert.equal(lead.contactEmail, "hr@sample.lk", "addresses match in one case or they never match");
  assert.equal(lead.contactPhone, "077 123 4567");
  assert.equal(lead.notes, "We need a finance manager.");
  assert.equal(lead.industry, "", "a field that is not text is nothing");
});

test("a form nobody could answer is refused, with a reason to log", () => {
  const good = readWebLead({ company: "Sample Ltd", contactEmail: "hr@sample.lk" });
  assert.equal(problemWithWebLead(good), null);

  assert.match(problemWithWebLead(readWebLead({ contactEmail: "a@b.lk" })) ?? "", /company's name is missing/i);
  assert.match(problemWithWebLead(readWebLead({ company: "X", contactEmail: "a@b.lk" })) ?? "", /too short/i);
  assert.match(problemWithWebLead(readWebLead({ company: "Sample Ltd" })) ?? "", /nobody could reply/i);
  assert.match(
    problemWithWebLead(readWebLead({ company: "Sample Ltd", contactEmail: "hr.sample.lk" })) ?? "",
    /does not look like one/i,
  );
  // A number on its own is enough: the website form does not always ask for both.
  assert.equal(problemWithWebLead(readWebLead({ company: "Sample Ltd", contactPhone: "0771234567" })), null);
});

test("a bot is caught by the field a person cannot see", () => {
  const lead = readWebLead({ company: "Sample Ltd", contactEmail: "hr@sample.lk" });
  assert.equal(looksLikeABot({ company: "Sample Ltd" }, lead), null);
  assert.match(looksLikeABot({ honeypot: "http://buy-things.example" }, lead) ?? "", /hidden field/i);

  const linkFarm = readWebLead({
    company: "Sample Ltd",
    contactEmail: "hr@sample.lk",
    notes: "https://a.example https://b.example https://c.example https://d.example https://e.example",
  });
  assert.match(looksLikeABot({}, linkFarm) ?? "", /list of links/i);
  // Two links in a real message are normal: their website and their careers page.
  const normal = readWebLead({ company: "Sample Ltd", contactEmail: "hr@sample.lk", notes: "See https://sample.lk and https://sample.lk/careers" });
  assert.equal(looksLikeABot({}, normal), null);
});

test("the same form sent twice is one lead", () => {
  const now = Date.UTC(2026, 10, 3, 6, 0);
  const leads = [
    {
      id: "ld_1",
      nameKey: "sample ltd",
      contactEmail: "HR@sample.lk",
      contactPhone: "",
      source: "website",
      createdAt: now - 60_000,
      ownerId: "m_owner",
    },
  ];
  const same = { nameKey: "sample ltd", contactEmail: "hr@sample.lk", contactPhone: "" };
  assert.equal(alreadyArrived(leads, same, now)?.id, "ld_1");

  // Long enough afterwards it is a real second enquiry, not a double-click.
  assert.equal(alreadyArrived(leads, same, now + SAME_AGAIN_WITHIN_MS + 1), null);
  // Same company, a different person: two leads, because two people asked.
  assert.equal(alreadyArrived(leads, { ...same, contactEmail: "ceo@sample.lk" }, now), null);
  // A lead somebody typed in is not a double-click of the form.
  assert.equal(alreadyArrived([{ ...leads[0], source: "call" }], same, now), null);
});

test("whoever is holding the fewest leads takes it", () => {
  const members = [
    { id: "m_a", role: "ops_owner", active: true },
    { id: "m_b", role: "ops_owner", active: true },
    { id: "m_lead", role: "ops_lead", active: true },
    { id: "m_gone", role: "ops_owner", active: false },
  ];
  const leads = [{ ownerId: "m_a" }, { ownerId: "m_a" }, { ownerId: "m_b" }];
  assert.equal(whoTakesIt(members, leads)?.id, "m_b");
  assert.equal(whoTakesIt(members, [...leads, { ownerId: "m_b" }, { ownerId: "m_b" }])?.id, "m_a");
  assert.equal(whoTakesIt(members, [])?.id, "m_a", "with none each, the first of them, not nobody");
  // Nobody away ever takes a lead; with no owners at all the ops lead holds it
  // rather than the lead landing on nobody.
  assert.equal(whoTakesIt([members[2], members[3]], [])?.id, "m_lead");
  assert.equal(whoTakesIt([members[3]], []), null);
});

test("with no key set, nobody may post", () => {
  delete process.env.OPS_WEB_LEAD_KEY;
  assert.equal(keyAccepted("anything"), false, "a system with no key is not an open door");
  process.env.OPS_WEB_LEAD_KEY = "a-long-random-key";
  assert.equal(keyAccepted("a-long-random-key"), true);
  assert.equal(keyAccepted(" a-long-random-key "), true, "a header with spaces around it still matches");
  assert.equal(keyAccepted("a-long-random-ke"), false);
  assert.equal(keyAccepted(null), false);
});
