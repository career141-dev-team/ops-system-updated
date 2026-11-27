import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase } from "@/data/types";
import { agreementCards, talksOf, chaseLadder, checkInText, chipFilter, clientCards, clientsLine, contactOf, enquiryCards, filterCards, standsClients, weekStrip } from "@/lib/clientsView";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 19, 4); // Thu 19 Nov, 09:30 in Colombo

const empty = { members: [{ id: "m1", name: "Rushda Fernando" }], settings: [], calls: [], inbound: [], messages: [], templates: [], positions: [], meetings: [], agreements: [], leads: [], clients: [] };
const make = (extra: Record<string, unknown>) => ({ ...empty, ...extra }) as unknown as OpsDatabase;

const lead = (over: Record<string, unknown>) => ({ id: "l1", company: "Pearl Dental Group", nameKey: "pearl dental group", contactName: "Anjali", contactEmail: "a@x.lk", contactPhone: "", source: "website", notes: "3 roles", industryFlagged: false, industryBecause: null, industryConfirmedBy: null, state: "new", clientTaId: null, ownerId: "m1", createdAt: NOW - DAY, ...over });
const esa = (over: Record<string, unknown>) => ({ id: "e1", leadId: "l2", state: "chasing", version: 1, fields: { companyName: "Hill Country Tea", signatoryName: "Nimal Herath", signatoryEmail: "n@h.lk" }, sentAt: NOW - 7 * DAY, chaseStep: 2, countersignedAt: null, reason: null, createdAt: NOW - 8 * DAY, updatedAt: NOW - DAY, ...over });
const client = (over: Record<string, unknown>) => ({ id: "c1", leadId: "l2", taClientId: "ta1", name: "Hill Country Tea", nameKey: "hill country tea", stage: "onboarding", ownerId: "m1", createdAt: NOW - 30 * DAY, contacts: [{ name: "Nimal Herath", email: "n@h.lk", phone: "077", role: "hr" }], ...over });

test("the contact is the HR person, else the lead's", () => {
  assert.equal(contactOf({ contacts: [{ name: "A", email: "a", phone: "", role: "other" }, { name: "B", email: "b", phone: "", role: "hr" }] }, null)?.name, "B");
  assert.equal(contactOf({ contacts: [] }, { contactName: "L", contactEmail: "", contactPhone: "" })?.name, "L");
  assert.equal(contactOf({ contacts: [] }, null), null);
});

test("a chase that falls due is a card with a copy button; a client who replied is not chased", () => {
  const base = { leads: [lead({ id: "l2", company: "Hill Country Tea" })], clients: [client({})], agreements: [esa({})], templates: [{ key: "esa.chase.email.2", subject: "S", body: "Hello {{contact}}, please sign." }] };
  const [card] = clientCards(make(base), NOW);
  assert.equal(card.status.text, "Chase 3 due today");
  assert.equal(card.copy?.label, "Copy chase 3");
  assert.match(card.copy!.text, /Hello Nimal Herath/);
  assert.equal(card.needsYou, true);
  const replied = clientCards(make({ ...base, inbound: [{ clientId: "c1", direction: "in", receivedAt: NOW - DAY }] }), NOW)[0];
  assert.equal(replied.copy, null, "a reply stops the chase");
  assert.equal(replied.needsYou, false);
});

test("a quiet client gets a check-in to copy, a lead does not", () => {
  const base = { clients: [client({ stage: "active", leadId: null })], calls: [{ subjectId: "c1", at: NOW - 5 * DAY }] };
  const [card] = clientCards(make(base), NOW);
  assert.equal(card.quietDays, 5);
  assert.equal(card.copy?.kind, "checkin");
  assert.match(card.copy!.text, /Hello Nimal/);
  assert.equal(clientCards(make({ ...base, clients: [client({ stage: "lead", leadId: null })] }), NOW)[0].copy, null);
  assert.equal(filterCards([card], "quiet", "", "m1").length, 1);
  assert.equal(filterCards([card], "leads", "", "m1").length, 0);
  assert.equal(filterCards([card], "all", "nimal", "m1").length, 1);
  assert.equal(filterCards([card], "mine", "", "other").length, 0);
});

test("enquiries land in their column; a name like a client gets a badge, not a tab", () => {
  const db = make({
    leads: [lead({ id: "a", company: "Palm Court Resorts", nameKey: "palm court resorts" }), lead({ id: "b", company: "Hill Country Tea Exports", nameKey: "hill country tea exports" }), lead({ id: "c", state: "closed_other" })],
    clients: [client({})],
  });
  const cols = Object.fromEntries(enquiryCards(db, NOW).map((c) => [c.id, c.column]));
  assert.deepEqual(cols, { a: "new", b: "new" });
  const flags = Object.fromEntries(enquiryCards(db, NOW).map((c) => [c.id, c.flags.map((f) => f.text)]));
  assert.deepEqual(flags.a, []);
  assert.deepEqual(flags.b, ["Possible duplicate"]);
});

test("agreements land in their column with a due chase", () => {
  const db = make({ leads: [lead({ id: "l2" })], agreements: [esa({}), esa({ id: "e2", state: "declined" })] });
  const cards = agreementCards(db, NOW);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].column, "chasing");
  assert.equal(cards[0].extra, "chase 3 of 6");
  assert.equal(cards[0].due?.tone, "warn");
  const withContact = agreementCards(make({ leads: [lead({ id: "l2", contactName: "Nimal Perera" })], agreements: [esa({ leadId: "l2" })] }), NOW);
  assert.ok(withContact[0].find.includes("nimal"), "the search finds an agreement by its contact");
});

test("the words around the boards", () => {
  assert.equal(clientsLine({ clients: 1, enquiries: 6, agreements: 1, owners: ["Rushda", "Zainab"] }), "1 client · 6 enquiries · 1 agreement open · owners Rushda, Zainab");
  assert.equal(chaseLadder()[0].text, "Day 2: first reminder by email");
  assert.equal(chaseLadder().length, 6);
  assert.match(checkInText(null, "Rushda Fernando"), /^Hello, I wanted to check in/);
  assert.equal(standsClients([]).head, "Nothing needs you today.");
  const week = weekStrip([{ when: NOW + DAY }, { when: null }], NOW);
  assert.equal(week.length, 6);
  assert.equal(week.find((d) => d.today)?.day, 19);
  assert.equal(week.find((d) => d.day === 20)?.events, 1);
  assert.equal(week.find((d) => d.day === 21)?.events, 0);
});

test("the dark card names each client who needs you, five at most, with why", () => {
  const card = (id: string, needsYou: boolean, extra: object = {}) => ({ id, name: "Client " + id, needsYou, quietDays: null, status: { text: "Chase 3 due today", tone: "warn" }, esa: null, ...extra }) as never;
  const none = standsClients([card("a", false)]);
  assert.equal(none.head, "Nothing needs you today.");
  assert.deepEqual(none.people, []);
  const some = standsClients([card("a", true), card("b", true, { status: { text: "Changes wanted", tone: "warn" } }), card("c", false), ...["d", "e", "f", "g"].map((i) => card(i, true))]);
  assert.equal(some.head, "6 clients need you today.");
  assert.equal(some.people.length, 5);
  assert.equal(some.more, 1);
  assert.equal(some.people[0].why, "Chase 3 due today");
  assert.equal(some.people[1].why, "Changes wanted");
  assert.equal(standsClients([card("a", true)]).head, "1 client needs you today.");
});

test("the talks with a client, newest first, from calls, mail and what we sent", () => {
  const db = make({
    clients: [client({ leadId: null })],
    calls: [{ id: "k1", subjectId: "c1", at: NOW - 2 * DAY, spokeTo: "Nimal", outcome: "monthly update" }],
    inbound: [{ id: "i1", clientId: "c1", channel: "whatsapp", receivedAt: NOW - DAY, fromName: "Nimal", subject: "hello", direction: "in" }],
    messages: [{ id: "g1", state: "sent", sentAt: NOW - 3 * DAY, subjectId: "c1", channel: "email", subject: "Set 1", body: "" }, { id: "g2", state: "draft", sentAt: null, subjectId: "c1", channel: "email", subject: "x", body: "" }],
  });
  const talks = talksOf(db, db.clients[0], 5);
  assert.deepEqual(talks.map((t) => t.id), ["i1", "k1", "g1"]);
  assert.equal(talks[0].kind, "chat");
  assert.equal(talks[1].text, "Call with Nimal: monthly update");
  assert.equal(talksOf(db, db.clients[0], 1).length, 1);
});

test("the list starts with signed clients, Not signed is its own filter, and a search looks at everyone", () => {
  const base = {
    leads: [lead({ id: "l2", company: "Hill Country Tea" }), lead({ id: "l3", company: "Ruwan Foods", nameKey: "ruwan foods" })],
    clients: [client({}), client({ id: "c2", leadId: "l3", name: "Ruwan Foods", nameKey: "ruwan foods", stage: "active" })],
    agreements: [esa({ state: "signed", chaseStep: 0 }), esa({ id: "e2", leadId: "l3", state: "sent" })],
  };
  const cards = clientCards(make(base), NOW);
  const names = (f: string, q = "") => filterCards(cards, f, q, "m1").map((c) => c.name).sort();
  assert.deepEqual(names(""), ["Hill Country Tea"]);
  assert.deepEqual(names("signed"), ["Hill Country Tea"]);
  assert.deepEqual(names("notsigned"), ["Ruwan Foods"]);
  assert.deepEqual(names("", "ruwan"), ["Ruwan Foods"]);
});

test("an active client with an unsigned agreement is not signed anywhere on its card; one with none is", () => {
  const base = { leads: [lead({ id: "l2" })], clients: [client({ stage: "active" })] };
  const [draft] = clientCards(make({ ...base, agreements: [esa({ state: "draft", sentAt: null })] }), NOW);
  assert.equal(draft.agreementNotSigned, true);
  assert.equal(draft.status.text, "Agreement not sent yet");
  assert.equal(filterCards([draft], "signed", "", "m1").length, 0);
  const [onFile] = clientCards(make(base), NOW);
  assert.equal(onFile.agreementNotSigned, false);
  assert.equal(onFile.status.text, "Agreement signed");
});

test("the Signed chip applies itself when a search is on, and a lit chip clears", () => {
  assert.equal(chipFilter("signed", "", ""), "", "the default view needs no filter");
  assert.equal(chipFilter("signed", "", "tea"), "signed");
  assert.equal(chipFilter("signed", "signed", "tea"), "");
  assert.equal(chipFilter("signed", "notsigned", ""), "");
  assert.equal(chipFilter("quiet", "", "tea"), "quiet");
  assert.equal(chipFilter("quiet", "quiet", ""), "");
});

test("a card counts every position given, closed ones too, and lists the open ones", () => {
  const pos = (id: string, stage: string) => ({ id, clientId: "c1", title: "Role " + id, stage });
  const [card] = clientCards(make({ leads: [lead({ id: "l2" })], clients: [client({})], agreements: [esa({})], positions: [pos("p1", "searching"), pos("p2", "closed"), pos("p3", "handed_over"), pos("p4", "searching")] }), NOW);
  assert.equal(card.positionsGiven, 4);
  assert.deepEqual(card.openRoles.map((r) => r.id), ["p1", "p3", "p4"]);
});
