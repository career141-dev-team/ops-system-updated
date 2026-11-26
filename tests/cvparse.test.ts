/**
 * Reading a CV (23 Nov): the five things internal hiring needs, by pattern where there is a shape and by the
 * model only where it is a judgment, and only when what it says is on the page.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { checkedAiFields, duplicateOf, findEmail, findNic, findPhone, guessName, guessPosition, matchVacancy, nationalityOf, readCv } from "@/lib/cvParse";

const CV = ["NIMAL PERERA", "Colombo 07", "nimal.perera@example.test", "Mobile: +94 77 123 4567", "NIC: 912345678V", "Applying for: Recruitment Consultant", "Experience: five years in agency recruitment and client handling."].join("\n");

test("an email, an NIC and a number are found by their shape", () => {
  assert.equal(findEmail("write to Nimal.Perera@Example.test today"), "nimal.perera@example.test");
  assert.equal(findNic("NIC 912345678v"), "912345678V");
  assert.equal(findNic("NIC No: 199112345678"), "199112345678");
  assert.equal(findNic("no number here"), "");
  for (const typed of ["077 123 4567", "0771234567", "+94 77 123 4567", "94771234567", "(077) 123-4567", "771234567"]) {
    assert.equal(findPhone("Tel " + typed + " thanks"), "077 123 4567", typed);
  }
  assert.equal(findPhone("Colombo office 011 234 5678"), "011 234 5678");
});

test("an NIC is never mistaken for a phone number, nor a year for either", () => {
  assert.equal(findPhone("NIC: 199112345678"), "");
  assert.equal(findPhone("NIC: 912345678V and born 1991"), "");
  assert.equal(findPhone("from 2019 to 2023"), "");
});

test("the name is the first short line of letters, the position a labelled line", () => {
  assert.equal(guessName(CV), "Nimal Perera");
  assert.equal(guessName("Curriculum Vitae\nMs. Kamala de Silva\n0771234567"), "Kamala De Silva".replace("De", "de"));
  assert.equal(guessName("Curriculum Vitae\nPersonal profile\nEducation"), "");
  assert.equal(guessPosition(CV), "Recruitment Consultant");
  assert.equal(guessPosition("Position: Ops Executive."), "Ops Executive");
  assert.equal(guessPosition("I would like a job."), "");
});

test("the model's name and position count only when they are on the page", () => {
  assert.deepEqual(checkedAiFields(CV, { name: "Nimal Perera", targetPosition: "Recruitment Consultant" }), { name: "Nimal Perera", targetPosition: "Recruitment Consultant" });
  assert.deepEqual(checkedAiFields(CV, { name: "Sunil Fernando", targetPosition: "Astronaut" }), { name: "", targetPosition: "" }, "invented, so dropped");
  assert.deepEqual(checkedAiFields(CV, null), { name: "", targetPosition: "" });
});

test("a whole CV reads into the five fields, and a scan is named as a scan", () => {
  const r = readCv(CV, { name: "Nimal Perera", targetPosition: "Recruitment Consultant" });
  assert.deepEqual(r.fields, { name: "Nimal Perera", email: "nimal.perera@example.test", phone: "077 123 4567", nic: "912345678V", targetPosition: "Recruitment Consultant" });
  assert.deepEqual(r.missing, []);
  const bare = readCv("Nimal Perera\nnimal@example.test\nI worked in several places over many years and enjoyed all of them.");
  assert.deepEqual(bare.missing, ["contact number", "NIC", "position applied for"]);
  const scan = readCv("  \n ");
  assert.equal(scan.scanned, true);
  assert.equal(scan.missing.length, 5);
});

test("a position points at the vacancy whose title it mostly shares, and a tie is left to a person", () => {
  const vac = [{ id: "v1", title: "Recruitment Consultant" }, { id: "v2", title: "Ops Executive" }, { id: "v3", title: "Marketing Executive" }];
  assert.equal(matchVacancy("Senior Recruitment Consultant", vac), "v1");
  assert.equal(matchVacancy("Ops Executive", vac), "v2");
  assert.equal(matchVacancy("Executive", vac), null, "two executives tie");
  assert.equal(matchVacancy("Astronaut", vac), null);
  assert.equal(matchVacancy("", vac), null);
});

test("the same person is found by email, NIC or number, however it was typed", () => {
  const have = [{ id: "a1", email: "Nimal.Perera@example.test", phone: null, nic: null }, { id: "a2", email: null, phone: "+94 77 555 0146", nic: null }, { id: "a3", email: null, phone: null, nic: "912345678v" }];
  const f = (o: Partial<{ email: string; phone: string; nic: string }>) => ({ name: "x", email: "", phone: "", nic: "", targetPosition: "", ...o });
  assert.equal(duplicateOf(f({ email: "nimal.perera@example.test" }), have)?.id, "a1");
  assert.equal(duplicateOf(f({ phone: "077 555 0146" }), have)?.id, "a2");
  assert.equal(duplicateOf(f({ nic: "912345678V" }), have)?.id, "a3");
  assert.equal(duplicateOf(f({ email: "other@example.test", phone: "077 000 0000" }), have), null);
  assert.equal(duplicateOf(f({}), have), null, "a CV with nothing to match on is never called a duplicate");
});

test("nationality is read from a labelled line or a known demonym (26 Nov)", () => {
  assert.equal(nationalityOf("Name: Raj Kumar\nNationality: Indian\nColombo"), "Indian");
  assert.equal(nationalityOf("Citizenship - SRI LANKAN\nExperience: 5 years"), "Sri Lankan");
  assert.equal(nationalityOf("Nationality: Pakistani | Married"), "Pakistani");
  // 26 Nov (PR 3 review): only a labelled line counts, never a demonym in the body.
  assert.equal(nationalityOf("Experienced British chartered accountant based in Dubai."), "");
  assert.equal(nationalityOf("Colombo, Sri Lanka\nBritish Council course\nIndian Ocean cruise"), "");
  assert.equal(nationalityOf("Nationality: Sri Lankan Male"), "Sri Lankan");
  assert.equal(nationalityOf("Nationality: Sinhala"), "Sri Lankan");
  assert.equal(nationalityOf("Nationality: Indian Female"), "Indian");
  assert.equal(nationalityOf("No country or demonym mentioned here."), "");
  assert.equal(nationalityOf(""), "");
});
