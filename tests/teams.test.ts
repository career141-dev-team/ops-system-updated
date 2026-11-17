/** Teams meetings: what Microsoft is sent, and that a client is never on the event. */
import assert from "node:assert/strict";
import test from "node:test";

import { problemWithBooking } from "@/lib/meetings";
import {
  attendeesFrom,
  canAutoSendInvite,
  eventFor,
  isStandInTeamsLink,
  problemWithAttendees,
  problemWithLength,
  readEvent,
  sayGraphFailure,
} from "@/lib/teams";
import { addMeeting, desk, draftMessage, settleMessage } from "@/data/desk";
import { doNotContactFrom, gate, sentToday } from "@/lib/messages";
import { sendEmail, sendingEnabled } from "@/lib/senders";

// 20 Nov 2026, 10:30 in Colombo = 05:00 UTC.
const AT = Date.UTC(2026, 10, 20, 5, 0);

test("the event is in Colombo time, with the length, and holds only our own people", () => {
  const body = eventFor({
    company: "Delmege",
    kind: "intro",
    at: AT,
    lengthMin: 45,
    internalAttendees: [{ name: "Sam", email: "sam@career141.com" }],
  });
  assert.equal(body.subject, "Career 141 and Delmege: Intro call");
  assert.deepEqual(body.start, { dateTime: "2026-11-20T10:30:00", timeZone: "Sri Lanka Standard Time" });
  assert.deepEqual(body.end, { dateTime: "2026-11-20T11:15:00", timeZone: "Sri Lanka Standard Time" });
  assert.equal(body.isOnlineMeeting, true);
  assert.equal(body.onlineMeetingProvider, "teamsForBusiness");
  assert.deepEqual(body.attendees.map((a) => a.emailAddress.address), ["sam@career141.com"]);
});

test("the join link and event id are read from Graph's answer", () => {
  assert.deepEqual(readEvent({ id: "AAMk1", onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/x" } }), {
    eventId: "AAMk1",
    joinUrl: "https://teams.microsoft.com/l/meetup-join/x",
  });
  assert.equal(readEvent({ id: "AAMk1", onlineMeeting: null }), null);
  assert.equal(readEvent(null), null);
});

test("client attendees: blank rows dropped, and every way a list can be wrong", () => {
  const rows = attendeesFrom(["Ann", "", "Bob"], ["Ann@Client.com", "", " bob@client.com "]);
  assert.deepEqual(rows, [
    { name: "Ann", email: "ann@client.com" },
    { name: "Bob", email: "bob@client.com" },
  ]);
  assert.equal(problemWithAttendees(rows), null);
  assert.match(problemWithAttendees([]) ?? "", /at least one email/);
  assert.match(problemWithAttendees([{ name: "", email: "nope" }]) ?? "", /not an email/);
  assert.match(problemWithAttendees([rows[0], rows[0]]) ?? "", /twice/);
});

test("length is 15 to 120 minutes, and a booking checks it", () => {
  assert.equal(problemWithLength(30), null);
  assert.notEqual(problemWithLength(5), null);
  assert.notEqual(problemWithLength(300), null);
  const now = AT - 86_400_000;
  assert.equal(problemWithBooking({ at: AT, taLeadId: "ta1", lengthMin: 30 }, now), null);
  assert.match(problemWithBooking({ at: AT, taLeadId: "ta1", lengthMin: 5 }, now) ?? "", /15 and 120/);
});

test("a refusal from Microsoft is said in words a person can act on", () => {
  assert.match(sayGraphFailure(403, "a@career141.com"), /Calendars\.ReadWrite/);
  assert.match(sayGraphFailure(404, "a@career141.com"), /no mailbox/);
  assert.match(sayGraphFailure(500, "a@career141.com"), /500/);
});

test("an interview at their office is a plain calendar event with the address, not a Teams meeting", () => {
  const body = eventFor({
    company: "Delmege",
    kind: "interview",
    subject: "Interview: Ann Perera, round 2",
    at: AT,
    lengthMin: 60,
    online: false,
    location: "12 Galle Road, Colombo 3",
    internalAttendees: [],
  });
  assert.equal(body.subject, "Interview: Ann Perera, round 2");
  assert.equal(body.isOnlineMeeting, false);
  assert.equal("onlineMeetingProvider" in body, false);
  assert.deepEqual(body.location, { displayName: "12 Galle Road, Colombo 3" });
  // No link is expected back for an event that is not online.
  assert.deepEqual(readEvent({ id: "AAMk2" }, false), { eventId: "AAMk2", joinUrl: "" });
  assert.equal(readEvent({ id: "AAMk2" }), null);
});

test("isStandInTeamsLink detects teams.example stand-in links and leaves real links alone", () => {
  assert.equal(isStandInTeamsLink("https://teams.example/fake/123"), true);
  assert.equal(isStandInTeamsLink("http://TEAMS.EXAMPLE/fake"), true);
  assert.equal(isStandInTeamsLink("https://teams.microsoft.com/l/meetup-join/x"), false);
  assert.equal(isStandInTeamsLink(""), false);
});

test("canAutoSendInvite checks every condition and refuses a fake link when outreach is live", () => {
  const base = {
    hasLink: true,
    linkIsStandIn: false,
    recipients: ["client@company.com"],
    sendNow: true,
    outreachLive: false,
  };
  assert.deepEqual(canAutoSendInvite(base), { ok: true });

  const unticked = canAutoSendInvite({ ...base, sendNow: false });
  assert.equal(unticked.ok, false);
  if (!unticked.ok) assert.match(unticked.reason, /To approve/);

  const noLink = canAutoSendInvite({ ...base, hasLink: false });
  assert.equal(noLink.ok, false);
  if (!noLink.ok) assert.match(noLink.reason, /no meeting link/);

  const noRecipients = canAutoSendInvite({ ...base, recipients: [] });
  assert.equal(noRecipients.ok, false);
  if (!noRecipients.ok) assert.match(noRecipients.reason, /no client email/);

  // Stand-in link is allowed in test mode, refused when outreach is live.
  assert.deepEqual(canAutoSendInvite({ ...base, linkIsStandIn: true, outreachLive: false }), { ok: true });
  const fakeLive = canAutoSendInvite({ ...base, linkIsStandIn: true, outreachLive: true });
  assert.equal(fakeLive.ok, false);
  if (!fakeLive.ok) assert.match(fakeLive.reason, /teams\.example/);
});

test("a booking on the JSON store with sending off keeps the booking and records the invite as blocked", async () => {
  const prevSend = process.env.OPS_SEND;
  delete process.env.OPS_SEND;
  try {
    const before = await desk();
    const owner = before.members[0];
    const lead = before.leads.find((l) => !l.doNotInvite) ?? before.leads[0];
    const meeting = await addMeeting({
      leadId: lead.id,
      kind: "intro",
      at: AT,
      state: "booked",
      taLeadId: "ta1",
      rebookCount: 0,
      brief: "",
      role: "",
      packageSaid: "",
      reason: null,
      bookedBy: owner.id,
      heldAt: null,
      joinUrl: "https://teams.microsoft.com/l/meetup-join/real-1",
    });
    const check = canAutoSendInvite({
      hasLink: true,
      linkIsStandIn: false,
      recipients: ["nadia@autosend.example"],
      sendNow: true,
      outreachLive: false,
    });
    assert.equal(check.ok, true);

    const msg = await draftMessage({
      channel: "email",
      to: ["nadia@autosend.example"],
      subject: "Our introductory call",
      body: "Join here",
      templateKey: null,
      attachmentFileIds: [],
      subjectType: "meeting",
      subjectId: meeting.id,
    });

    const fresh = await desk();
    const verdict = gate(
      { ...msg, state: "approved" },
      {
        outreachLive: false,
        testRecipient: "test@example.test",
        doNotContact: doNotContactFrom(fresh.leads),
        sentToClientToday: sentToday(fresh.messages, msg.to),
        dailyCapPerClient: 4,
      },
    );
    assert.equal(verdict.ok, true);
    if (!verdict.ok) return;

    const outcome = await sendEmail({
      from: owner.email,
      to: verdict.to,
      subject: msg.subject,
      body: msg.body,
    });
    assert.equal(outcome.ok, false);
    assert.equal(outcome.reason, "Sending is switched off (OPS_SEND).");

    const note = ["Sent automatically on booking.", verdict.note, outcome.reason].filter(Boolean).join(" ");
    await settleMessage(
      msg.id,
      owner.id,
      sendingEnabled() ? "failed" : "blocked",
      verdict.to,
      note,
      outcome.providerMessageId,
    );

    const after = await desk();
    const savedMeeting = after.meetings.find((m) => m.id === meeting.id);
    const savedMsg = after.messages.find((m) => m.id === msg.id);
    assert.equal(savedMeeting?.state, "booked");
    assert.equal(savedMsg?.state, "blocked");
    assert.match(savedMsg?.note ?? "", /Sending is switched off \(OPS_SEND\)/);
  } finally {
    if (prevSend !== undefined) process.env.OPS_SEND = prevSend;
  }
});
