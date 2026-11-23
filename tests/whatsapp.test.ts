/**
 * Inbound WhatsApp (23 Nov): the signature, Meta's one-time check, reading a recorded payload, and whose number it is.
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { challengeFor, matchPhone, readWebhook, signatureOk, type PhoneBook } from "@/lib/whatsapp";

const SECRET = "app-secret-for-tests";
const sign = (body: string, secret = SECRET) => "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex");

// A trimmed copy of what Meta's Cloud API posts: one text, one image, one delivery receipt.
const PAYLOAD = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "123",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            contacts: [{ wa_id: "94771234567", profile: { name: "Roshan de Silva" } }],
            messages: [
              { from: "94771234567", id: "wamid.AAA", timestamp: "1764050400", type: "text", text: { body: "We have signed the agreement, sending it back today." } },
              { from: "94715550100", id: "wamid.BBB", timestamp: "1764050460", type: "image", image: { id: "x" } },
              { from: "", id: "wamid.CCC", timestamp: "1764050470", type: "text", text: { body: "no sender" } },
            ],
            statuses: [{ id: "wamid.OUT1", status: "delivered" }, { id: "wamid.OUT2", status: "read" }],
          },
        },
      ],
    },
  ],
};

test("a post is believed only when its signature matches the exact bytes and the secret", () => {
  const body = JSON.stringify(PAYLOAD);
  assert.equal(signatureOk(body, sign(body), SECRET), true);
  assert.equal(signatureOk(body + " ", sign(body), SECRET), false, "one changed byte");
  assert.equal(signatureOk(body, sign(body, "another"), SECRET), false, "another secret");
  assert.equal(signatureOk(body, null, SECRET), false);
  assert.equal(signatureOk(body, "sha256=zz", SECRET), false);
  assert.equal(signatureOk(body, "md5=abc", SECRET), false);
  assert.equal(signatureOk(body, sign(body, ""), ""), false, "with no secret set nothing is accepted");
});

test("Meta's one-time check is answered only with the right token", () => {
  const q = (o: Record<string, string>) => new URLSearchParams(o);
  assert.equal(challengeFor(q({ "hub.mode": "subscribe", "hub.verify_token": "tok", "hub.challenge": "1158201444" }), "tok"), "1158201444");
  assert.equal(challengeFor(q({ "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "1" }), "tok"), null);
  assert.equal(challengeFor(q({ "hub.mode": "subscribe", "hub.verify_token": "", "hub.challenge": "1" }), ""), null, "no token set, no answer");
  assert.equal(challengeFor(q({ "hub.mode": "unsubscribe", "hub.verify_token": "tok", "hub.challenge": "1" }), "tok"), null);
});

test("a recorded payload gives its messages, with receipts and half-messages left out", () => {
  const { messages, ignored } = readWebhook(PAYLOAD);
  assert.equal(messages.length, 2);
  assert.deepEqual([messages[0].id, messages[0].from, messages[0].name, messages[0].at, messages[0].kind], ["wamid.AAA", "94771234567", "Roshan de Silva", 1764050400000, "text"]);
  assert.match(messages[0].text, /signed the agreement/);
  assert.deepEqual([messages[1].kind, messages[1].text], ["image", ""], "a picture is noted, never kept");
  assert.equal(ignored, 3, "two receipts and one message with no sender");
  assert.deepEqual(readWebhook({}), { messages: [], ignored: 0 });
  assert.deepEqual(readWebhook(null), { messages: [], ignored: 0 });
});

const book: PhoneBook = {
  clients: [{ id: "c1", name: "Ceylon Harbour", leadId: "l1", contacts: [{ name: "Roshan de Silva", phone: "077 123 4567" }] }],
  leads: [{ id: "l1", company: "Ceylon Harbour", contactName: "Roshan de Silva", contactPhone: "0771234567" }, { id: "l2", company: "Lanka Tiles", contactName: "Nimal", contactPhone: "+94 71 222 3344" }],
  applicants: [{ id: "a1", name: "Kamala de Silva", phone: "071 555 0100", vacancyId: "v1" }, { id: "a2", name: "Shared Number", phone: "071 222 3344", vacancyId: "v1" }],
};

test("a number is matched exactly: a client's contact, an enquiry, an applicant; never a guess", () => {
  const client = matchPhone("94771234567", book);
  assert.deepEqual([client.kind, client.id], ["client", "c1"], "the client and its first enquiry are one company, not two people");
  assert.match(client.name, /Roshan de Silva at Ceylon Harbour/);
  const applicant = matchPhone("94715550100", book);
  assert.deepEqual([applicant.kind, applicant.id, applicant.name], ["applicant", "a1", "Kamala de Silva"]);
  const stranger = matchPhone("94700000000", book);
  assert.equal(stranger.kind, "none");
  assert.match(stranger.note, /not one we know/);
  assert.equal(matchPhone("123", book).kind, "none");
});

test("a number that fits two different people is left for a person", () => {
  const m = matchPhone("94712223344", book);
  assert.equal(m.kind, "none");
  assert.match(m.note, /more than one person/);
});
