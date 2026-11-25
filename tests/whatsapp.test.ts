/**
 * Inbound WhatsApp (23 Nov): the signature, Meta's one-time check, reading a recorded payload, and whose number it is.
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { challengeFor, matchPhone, readGroupEvents, readWebhook, signatureOk, type PhoneBook } from "@/lib/whatsapp";

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

const wrap = (messages: unknown[], contacts: unknown[] = []) => ({ entry: [{ changes: [{ value: { contacts, messages } }] }] });

test("a group message keeps its group and the sender's BSUID; a group file with no number is kept, one with no sender at all is not (25 Nov)", () => {
  const contacts = [{ profile: { name: "Nimal", username: "nimal.p" }, wa_id: "94771234567", user_id: "BS1" }, { profile: { name: "Nameless Number" }, user_id: "BS2" }];
  const doc = { caption: "CV for the QA role", filename: "cv.pdf", mime_type: "application/pdf", sha256: "x", id: "MEDIA1" };
  const { messages, ignored } = readWebhook(wrap([
    { from: "94771234567", from_user_id: "BS1", group_id: "G1", id: "w1", timestamp: "1764050400", type: "text", text: { body: "hello group" } },
    { from: "94771234567", from_user_id: "BS1", group_id: "G1", id: "w2", timestamp: "1764050401", type: "document", document: doc },
    { from_user_id: "BS2", group_id: "G1", id: "w3", timestamp: "1764050402", type: "document", document: { ...doc, id: "MEDIA2", filename: undefined, mime_type: undefined, caption: undefined } },
    { from: "94771234567", id: "w4", timestamp: "1764050403", type: "document", document: doc },
    { from: "94771234567", id: "w5", timestamp: "1764050404", type: "document", document: { filename: "x.pdf" } },
    { id: "w6", group_id: "G1", timestamp: "1764050405", type: "text", text: { body: "who?" } },
    { from_user_id: "BS2", id: "w7", timestamp: "1764050406", type: "text", text: { body: "1:1 with no number" } },
  ], contacts));
  assert.deepEqual(messages.map((m) => m.id), ["w1", "w2", "w3", "w4", "w5"]);
  assert.equal(ignored, 2, "no sender at all, and a 1:1 message with no number");
  assert.deepEqual([messages[0].groupId, messages[0].fromUserId, messages[0].name, messages[0].text, messages[0].document], ["G1", "BS1", "Nimal", "hello group", null]);
  assert.deepEqual(messages[1].document, { mediaId: "MEDIA1", filename: "cv.pdf", mime: "application/pdf" });
  assert.equal(messages[1].text, "CV for the QA role", "a file's text is its caption");
  assert.deepEqual([messages[2].from, messages[2].name, messages[2].text], ["", "Nameless Number", ""], "found by BSUID");
  assert.deepEqual(messages[2].document, { mediaId: "MEDIA2", filename: "document", mime: "" });
  assert.deepEqual([messages[3].groupId, messages[3].document?.mediaId], [null, "MEDIA1"], "a 1:1 file");
  assert.equal(messages[4].document, null, "a file with no media id cannot be fetched");
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

test("group events: a created group gives its id and link, a failure gives its reason, anything else is left out (25 Nov)", () => {
  const hook = (groups: unknown[], field = "group_lifecycle_update") => ({ entry: [{ changes: [{ field, value: { messaging_product: "whatsapp", groups } }] }] });
  const ok = { timestamp: "1764050400", group_id: "G1", type: "group_create", request_id: "r1", subject: "CVs", invite_link: "https://chat.whatsapp.com/LINK", join_approval_mode: "approval_required" };
  const bad = { type: "group_create", request_id: "r2", subject: "CVs", errors: [{ code: 131215, message: "Too many", title: "Limit", error_data: { details: "Group limit reached." } }] };
  assert.deepEqual(readGroupEvents(hook([ok, bad, { ...ok, type: "group_update" }])), [
    { groupId: "G1", subject: "CVs", inviteLink: "https://chat.whatsapp.com/LINK", error: null },
    { groupId: "", subject: "CVs", inviteLink: "", error: "Group limit reached." },
  ]);
  assert.deepEqual(readGroupEvents(hook([ok], "messages")), []);
  assert.deepEqual(readGroupEvents(null), []);
  assert.deepEqual(readGroupEvents({}), []);
});
