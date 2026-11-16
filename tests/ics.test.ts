/**
 * Calendar invites (16 Nov, plan B2): the .ics a drafted invite carries.
 * The facts that matter: the time is right in UTC for a Colombo clock, text is
 * escaped, a pasted value cannot inject a field, and a move keeps the UID.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { buildInvite, colomboWhen, icsEscape, icsTime } from "../src/lib/ics";

// 20 Nov 2026, 14:30 in Colombo (UTC+5:30) is 09:00 UTC.
const AT = Date.UTC(2026, 10, 20, 9, 0);
const NOW = Date.UTC(2026, 10, 16, 3, 0);

test("Colombo 14:30 is written as 09:00 UTC", () => {
  assert.equal(icsTime(AT), "20261120T090000Z");
  assert.match(colomboWhen(AT), /20 November 2026, 14:30 \(Colombo\)/);
  const ics = buildInvite({ uid: "u1", startsAt: AT, summary: "x", now: NOW });
  assert.match(ics, /DTSTART:20261120T090000Z\r\n/);
  assert.match(ics, /DTEND:20261120T100000Z\r\n/, "an hour long unless told otherwise");
  assert.match(ics, /DTSTAMP:20261116T030000Z\r\n/);
});

test("it is a VCALENDAR with one VEVENT, CRLF throughout", () => {
  const ics = buildInvite({ uid: "u1", startsAt: AT, summary: "x", now: NOW });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n"));
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 1);
  assert.doesNotMatch(ics.replace(/\r\n/g, ""), /[\r\n]/);
});

test("text is escaped, and a pasted value cannot add a field", () => {
  assert.equal(icsEscape("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
  const ics = buildInvite({
    uid: "u1",
    startsAt: AT,
    summary: "Interview, round 2",
    location: "Office\r\nATTENDEE:mailto:evil@example.test",
    now: NOW,
  });
  assert.match(ics, /SUMMARY:Interview\\, round 2\r\n/);
  assert.doesNotMatch(ics, /\r\nATTENDEE:mailto:evil/);
});

test("the link, the organiser and the attendees are carried; non-addresses are dropped", () => {
  const ics = buildInvite({
    uid: "interview-7@ops.career141.com",
    startsAt: AT,
    summary: "Interview",
    location: "https://teams.microsoft.com/l/meetup-join/abc",
    url: "https://teams.microsoft.com/l/meetup-join/abc",
    organizer: { name: "Ops, Person", email: "ops@career141.com" },
    attendees: ["panel@client.test", "not an address"],
    now: NOW,
  });
  assert.match(ics, /UID:interview-7@ops\.career141\.com/);
  assert.match(ics, /LOCATION:https:\/\/teams\.microsoft\.com\/l\/meetup-join\/abc/);
  assert.match(ics, /URL:https:\/\/teams\.microsoft\.com/);
  assert.match(ics, /ORGANIZER;CN=Ops Person:mailto:ops@career141\.com/);
  assert.equal(ics.match(/ATTENDEE/g)?.length, 1);
});

test("a move keeps the UID and raises the SEQUENCE, so the calendar updates the entry", () => {
  const first = buildInvite({ uid: "i-1", startsAt: AT, summary: "x", now: NOW });
  const moved = buildInvite({ uid: "i-1", startsAt: AT + 86_400_000, summary: "x", sequence: 1, now: NOW });
  assert.match(first, /SEQUENCE:0/);
  assert.match(moved, /SEQUENCE:1/);
  assert.match(moved, /UID:i-1\r\n/);
  assert.match(moved, /DTSTART:20261121T090000Z/);
});

test("long lines are folded at 75 characters", () => {
  const ics = buildInvite({ uid: "u", startsAt: AT, summary: "S".repeat(200), now: NOW });
  for (const line of ics.split("\r\n")) assert.ok(line.length <= 75, line.length + ": " + line.slice(0, 30));
});
