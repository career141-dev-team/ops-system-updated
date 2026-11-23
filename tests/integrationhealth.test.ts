/**
 * The Health screen's words about Microsoft, the Scoop mailbox and WhatsApp (23 Nov).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { decodeRoles, permissionLines, permissionSentence, scoopLines, whatsappLines } from "@/lib/integrationHealth";

const token = (claims: unknown) => "x." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".y";

test("a token's roles are read, and anything that is not a token gives none", () => {
  assert.deepEqual(decodeRoles(token({ roles: ["Mail.Read", "Calendars.ReadWrite"], aud: "graph" })), ["Mail.Read", "Calendars.ReadWrite"]);
  assert.deepEqual(decodeRoles(token({ aud: "graph" })), []);
  assert.deepEqual(decodeRoles(token({ roles: "Mail.Read" })), []);
  assert.deepEqual(decodeRoles("not a token"), []);
  assert.deepEqual(decodeRoles(""), []);
});

test("each need says granted, or which permission to ask the admin for", () => {
  const lines = permissionLines(["Mail.Read", "Mail.Send"]);
  assert.match(lines[0], /granted \(Mail\.Read\)/);
  assert.match(lines[1], /NOT granted, ask for Mail\.ReadWrite/);
  assert.match(lines[2], /granted \(Mail\.Send\)/);
  assert.match(lines[3], /NOT granted, ask for Calendars\.ReadWrite/);
  assert.match(lines[4], /ask for OnlineMeetingTranscript\.Read\.All/);
  assert.match(permissionLines(["Mail.ReadWrite"])[0], /granted \(Mail\.ReadWrite\)/, "ReadWrite also reads");
});

test("the sentence names what is missing, or says all is granted, or says nothing was granted", () => {
  assert.match(permissionSentence(["Mail.ReadWrite", "Mail.Send", "Calendars.ReadWrite", "OnlineMeetingTranscript.Read.All"]), /every permission the desk uses is granted/);
  const partial = permissionSentence(["Mail.Read"]);
  assert.match(partial, /Teams meetings and the calendar: NOT granted/);
  assert.doesNotMatch(partial, /Reading the mailboxes.*NOT granted/);
  assert.match(permissionSentence([]), /nothing has been granted with admin consent yet/);
});

test("WhatsApp: sending and receiving are named apart, with what is missing", () => {
  const NOW = Date.UTC(2026, 10, 25, 6, 0);
  const shut = whatsappLines({}, { count: 0, lastAt: null }, NOW);
  assert.match(shut[0], /not set up/);
  assert.match(shut[1], /shut.*OPS_WHATSAPP_APP_SECRET.*OPS_WHATSAPP_VERIFY_TOKEN/);
  assert.equal(shut[2], "No message has been received yet");
  const open = whatsappLines({ OPS_WHATSAPP_NUMBER_ID: "1", OPS_WHATSAPP_TOKEN: "t", OPS_WHATSAPP_APP_SECRET: "s", OPS_WHATSAPP_VERIFY_TOKEN: "v" }, { count: 3, lastAt: NOW - 5 * 3_600_000 }, NOW);
  assert.match(open[0], /Ops number is set up/);
  assert.match(open[1], /ready at \/api\/whatsapp/);
  assert.equal(open[2], "3 messages received, the last 5 hours ago");
});

test("Scoop: the mailbox, the senders, and whether reading is on", () => {
  assert.match(scoopLines({ mailbox: "", senders: [] }, false, 0, null).join("\n"), /not set.*\n.*nobody named yet.*\n.*switched off.*\n0 Scoops so far$/);
  const ready = scoopLines({ mailbox: "scoop@career141.com", senders: ["sir@career141.com"] }, true, 1, Date.UTC(2026, 10, 25, 4, 30));
  assert.equal(ready[0], "Scoop mailbox: scoop@career141.com");
  assert.equal(ready[2], "Reading it: on");
  assert.equal(ready[3], "1 Scoop so far, the mailbox read up to 2026-11-25 10:00 Colombo");
});
