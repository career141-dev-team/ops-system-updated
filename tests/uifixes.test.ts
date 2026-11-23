/**
 * The ops team's first feedback round (23 Nov): the rules behind the small UI fixes.
 * Each one is pure, so each is tested here without a screen.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { clientForLead, problemWithRename } from "@/lib/clients";
import { contactsAfterEdit } from "@/lib/contacts";
import { REJECT_KIND_LABEL, rejectKind, rejectedByKind, type Applicant } from "@/lib/hiring";
import { EXISTING_CLIENT_SOURCE, existingClientOf, nameKey } from "@/lib/leads";
import { canDeleteTeamNote } from "@/lib/panelActions";
import { newPositionFields, problemWithNewPosition } from "@/lib/quickAdd";
import { briefText } from "@/lib/requirements";
import type { OpsDatabase } from "@/data/types";

test("a new position needs a name, a designation and a package, and the note is optional", () => {
  assert.equal(problemWithNewPosition({ title: "Head of sales", level: "Head", salary: "LKR 600k", incumbentNote: "" }), null);
  assert.match(problemWithNewPosition({ title: " ", level: "Head", salary: "x", incumbentNote: "" }) ?? "", /position's name/);
  assert.match(problemWithNewPosition({ title: "Head of sales", level: "", salary: "x", incumbentNote: "" }) ?? "", /designation/);
  assert.match(problemWithNewPosition({ title: "Head of sales", level: "Head", salary: "", incumbentNote: "" }) ?? "", /package/);
});

test("the new position's fields are the requirement's own keys, and the note reaches the brief TA reads", () => {
  const fields = newPositionFields({ title: " Head of sales ", level: "Head", salary: "LKR 600k", incumbentNote: "Like Nimal at ABC" });
  assert.deepEqual(Object.keys(fields).sort(), ["incumbentNote", "level", "salary", "title"]);
  assert.equal(fields.title, "Head of sales");
  assert.match(briefText(fields), /Incumbent or reference profile: Like Nimal at ABC/);
  assert.equal("incumbentNote" in newPositionFields({ title: "Head", level: "Head", salary: "x", incumbentNote: "  " }), false);
});

test("a lead made for an existing client skips the intro call, whoever the client is in TA", () => {
  const lead = { state: "requirement", clientTaId: null, source: EXISTING_CLIENT_SOURCE };
  assert.equal(existingClientOf(lead, [], null).skipsIntro, true);
  assert.equal(existingClientOf({ state: "new", clientTaId: null, source: "call" }, [], null).skipsIntro, false);
});

test("a second lead for the same company finds the same client, by name and by TA id", () => {
  const db = {
    clients: [{ id: "c1", leadId: "l1", nameKey: "acme", taClientId: "ta1" }],
    leads: [
      { id: "l1", nameKey: "acme", clientTaId: "ta1" },
      { id: "l2", nameKey: "acme", clientTaId: null },
      { id: "l3", nameKey: "other name", clientTaId: "ta1" },
      { id: "l4", nameKey: "nobody", clientTaId: null },
    ],
  } as unknown as OpsDatabase;
  assert.equal(clientForLead(db, "l1")?.id, "c1");
  assert.equal(clientForLead(db, "l2")?.id, "c1");
  assert.equal(clientForLead(db, "l3")?.id, "c1");
  assert.equal(clientForLead(db, "l4"), null);
  assert.equal(clientForLead(db, "missing"), null);
});

test("renaming a client needs a name and a reason, and never takes another client's name", () => {
  const others = [
    { id: "c1", name: "Acme Ltd", nameKey: nameKey("Acme Ltd") },
    { id: "c2", name: "Zeta", nameKey: nameKey("Zeta") },
  ];
  assert.equal(problemWithRename("Acme Lanka", "Renamed in October", others, "c1", nameKey), null);
  assert.match(problemWithRename("A", "Renamed", others, "c1", nameKey) ?? "", /new name/);
  assert.match(problemWithRename("Acme Lanka", "no", others, "c1", nameKey) ?? "", /why/i);
  assert.match(problemWithRename("zeta", "Typo fixed", others, "c1", nameKey) ?? "", /already a client/);
  // Keeping its own name (a case change) is not a clash.
  assert.equal(problemWithRename("ACME LTD", "Capitals fixed", others, "c1", nameKey), null);
});

test("a contact can be replaced in place, and made the main one", () => {
  const rows = [
    { name: "Old HR", email: "old@x.lk", phone: "1", role: "hr" },
    { name: "Finance", email: "fin@x.lk", phone: "2", role: "other" },
  ];
  const swapped = contactsAfterEdit(rows, "old@x.lk", { name: "New HR", email: "new@x.lk", phone: "3", role: "hr" }, false);
  assert.ok("contacts" in swapped);
  if ("contacts" in swapped) {
    assert.deepEqual(swapped.contacts.map((c) => c.email), ["new@x.lk", "fin@x.lk"]);
    assert.equal(swapped.contacts[0].name, "New HR");
  }
  const primary = contactsAfterEdit(rows, "fin@x.lk", { name: "Finance", email: "fin@x.lk", phone: "2", role: "other" }, true);
  assert.ok("contacts" in primary);
  if ("contacts" in primary) {
    assert.equal(primary.contacts[0].email, "fin@x.lk");
    assert.equal(primary.contacts[0].role, "hr");
  }
  assert.ok("problem" in contactsAfterEdit(rows, "old@x.lk", { name: "X", email: "FIN@x.lk", phone: "", role: "" }, false));
  assert.ok("problem" in contactsAfterEdit(rows, "gone@x.lk", { name: "X", email: "z@x.lk", phone: "", role: "" }, false));
  assert.ok("problem" in contactsAfterEdit(rows, "old@x.lk", { name: "X", email: "not-an-email", phone: "", role: "" }, false));
});

const person = (id: string, stage: Applicant["stage"], at: string | null, since: number): Applicant => ({
  id, name: id, source: "", phone: null, stage, since, detail: "", rejectedAtStage: at, rejectReason: "reason " + id,
});

test("a rejection before an interview is a screening reject, after one a final reject", () => {
  assert.equal(rejectKind("call"), "screening");
  assert.equal(rejectKind("fits"), "screening");
  assert.equal(rejectKind("interview"), "final");
  assert.equal(rejectKind("decision"), "final");
  assert.equal(rejectKind(null), "screening");
  const groups = rejectedByKind([
    person("a", "rejected", "fits", 1),
    person("b", "rejected", "interview", 2),
    person("c", "rejected", "call", 3),
    person("d", "fits", null, 4),
  ]);
  assert.deepEqual(groups.screening.map((a) => a.id), ["c", "a"]);
  assert.deepEqual(groups.final.map((a) => a.id), ["b"]);
  assert.equal(REJECT_KIND_LABEL.final, "Final reject");
});

test("an Ops lead can delete anybody's team note, an Ops person only their own", () => {
  const note = { authorId: "a" };
  assert.equal(canDeleteTeamNote(note, "a"), true);
  assert.equal(canDeleteTeamNote(note, "b"), false);
  assert.equal(canDeleteTeamNote(note, "b", true), true);
  assert.equal(canDeleteTeamNote(undefined, "a", true), false);
});
