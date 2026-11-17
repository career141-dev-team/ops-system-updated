/** Contacts for a client and for one position. */
import assert from "node:assert/strict";
import test from "node:test";

import { contactsFor, problemWithContact, setRecipients } from "@/lib/contacts";

const c = (name: string, email: string, role = "hr") => ({ name, email, phone: "", role });

test("a position's own people come first, then the client's, with no address twice", () => {
  const got = contactsFor({
    position: [c("Team lead", "lead@client.com", "other"), c("Ann", "ANN@client.com")],
    client: [c("Ann", "ann@client.com"), c("Bob", "bob@client.com")],
  });
  assert.deepEqual(got.map((r) => r.email), ["lead@client.com", "ANN@client.com", "bob@client.com"]);
});

test("TA's contacts are used only when Ops has none of its own", () => {
  const ta = [{ name: "Tia", email: "tia@client.com", role: "HR" }];
  assert.deepEqual(contactsFor({ client: [], ta }).map((r) => r.email), ["tia@client.com"]);
  assert.deepEqual(contactsFor({ client: [c("Bob", "bob@client.com")], ta }).map((r) => r.email), ["bob@client.com"]);
  // A row with no usable address is dropped, not kept as a hole.
  assert.deepEqual(contactsFor({ client: [c("Nobody", "")] }), []);
});

test("a set goes to the position's people and the standard HR contacts, not to everyone listed", () => {
  const got = setRecipients({
    position: [c("Team lead", "lead@client.com", "other")],
    client: [c("Ann", "ann@client.com", "hr"), c("Finance", "fin@client.com", "billing")],
  });
  assert.deepEqual(got, ["lead@client.com", "ann@client.com"]);
});

test("a contact needs a name and a real address", () => {
  assert.equal(problemWithContact({ name: "Ann", email: "ann@client.com" }), null);
  assert.match(problemWithContact({ name: "", email: "ann@client.com" }) ?? "", /name/);
  assert.match(problemWithContact({ name: "Ann", email: "ann" }) ?? "", /email/);
});
