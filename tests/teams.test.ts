/** Teams meetings: what Microsoft is sent, and that a client is never on the event. */
import assert from "node:assert/strict";
import test from "node:test";

import { problemWithBooking } from "@/lib/meetings";
import {
  attendeesFrom,
  eventFor,
  problemWithAttendees,
  problemWithLength,
  readEvent,
  sayGraphFailure,
} from "@/lib/teams";

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
