/**
 * Quick-add (7 Nov, UX order 5): what a note becomes, and whom it is about.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { clientNamed, noteToTask, problemWithNote } from "@/lib/quickAdd";

// Tuesday 4 Nov 2026, 14:30 in Colombo (09:00 UTC).
const TUESDAY_AFTERNOON = Date.UTC(2026, 10, 3, 9, 0);
const NINE_WED = Date.UTC(2026, 10, 4, 3, 30);

test("a note becomes a task to yourself, due the next nine in the morning", () => {
  const task = noteToTask("Nippon want the set by Friday\nRushda said so on the phone", "m_1", TUESDAY_AFTERNOON, null);
  assert.equal(task.kind, "remind");
  assert.equal(task.title, "Nippon want the set by Friday");
  assert.equal(task.body, "Rushda said so on the phone");
  assert.equal(task.assigneeId, "m_1");
  assert.equal(task.dueAt, NINE_WED);
  assert.equal(task.subjectId, null);
});

test("a one-line note has no body, and a long first line is cut to a title", () => {
  const long = "x".repeat(100);
  const task = noteToTask(long, "m_1", TUESDAY_AFTERNOON, null);
  assert.equal(task.title.length, 80);
  assert.ok(task.title.endsWith("..."));
  assert.equal(task.body, "");
});

test("a note about a client carries the client and where to go", () => {
  const about = { subjectType: "client", subjectId: "cl_1", link: "/clients/cl_1" };
  const task = noteToTask("Call back Monday", "m_1", TUESDAY_AFTERNOON, about);
  assert.equal(task.subjectType, "client");
  assert.equal(task.subjectId, "cl_1");
  assert.equal(task.link, "/clients/cl_1");
});

test("an empty or tiny note is refused with words", () => {
  assert.equal(problemWithNote("   "), "Write the note.");
  assert.equal(problemWithNote("ok"), "Write a little more.");
  assert.equal(problemWithNote("Ring them back"), null);
});

test("a client is matched by its whole name, any case, and never by a part of it", () => {
  const clients = [{ id: "cl_1", name: "Nippon Paint Lanka" }, { id: "cl_2", name: "Another Client, Pvt" }];
  assert.equal(clientNamed("nippon paint  lanka", clients)?.id, "cl_1");
  assert.equal(clientNamed("  ANOTHER CLIENT, PVT ", clients)?.id, "cl_2");
  assert.equal(clientNamed("Nippon", clients), null, "a part of a name is not the client");
  assert.equal(clientNamed("", clients), null);
});
