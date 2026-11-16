/**
 * The CVs that go to the client (15, Phase 4 steps 2 to 4).
 *
 * The board's complaints these rules answer: a set promised in the agreement
 * and sent weeks later, a set sent short, and CVs sent from somebody's own
 * inbox so nobody could say afterwards what the client actually got.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  MIN_CVS,
  type SetCandidate,
  canMoveTo,
  dueFromEsa,
  dueInWords,
  problemWithInternalInterview,
  problemWithSending,
  problemWithZip,
  uniqueNames,
  zipName,
  setName,
  whereItStands,
} from "@/lib/clientSets";

const DAY = 86_400_000;

const five = (): SetCandidate[] =>
  ["One", "Two", "Three", "Four", "Five"].map((n, i) => ({
    applicationTaId: "ta_a" + (i + 1),
    name: "SAMPLE CANDIDATE " + n.toUpperCase(),
    fileId: "f_" + (i + 1),
    problem: null,
  }));

test("the set is named the way the desk already writes it", () => {
  assert.equal(setName("Sample Client", "Head of finance", 2), "SAMPLE CLIENT > HEAD OF FINANCE > SET 2");
  assert.equal(setName("  sample client  ", " head of finance ", 1), "SAMPLE CLIENT > HEAD OF FINANCE > SET 1");
});

test("the set is due from the day the agreement was signed", () => {
  const signed = Date.UTC(2026, 10, 1);
  // The client was promised seven to fourteen days: the first set uses the
  // short end of that promise, a later one the long end.
  assert.equal(dueFromEsa(signed, 1), signed + 7 * DAY);
  assert.equal(dueFromEsa(signed, 2), signed + 14 * DAY);
  assert.equal(dueFromEsa(signed, 1, 5, 10), signed + 5 * DAY);
});

test("late or not is said in words", () => {
  const now = Date.UTC(2026, 10, 10);
  assert.equal(dueInWords(now + 3 * DAY, now), "due in 3 days");
  assert.equal(dueInWords(now + DAY, now), "due in 1 day");
  assert.equal(dueInWords(now, now), "due today");
  assert.equal(dueInWords(now - DAY, now), "1 day late");
  assert.equal(dueInWords(now - 4 * DAY, now), "4 days late");
});

test("a sent set is history; a change of mind is a new set", () => {
  assert.equal(canMoveTo("ready", "reviewing"), true);
  assert.equal(canMoveTo("reviewing", "sent"), true);
  assert.equal(canMoveTo("ready", "sent"), false, "nothing goes to a client unread");
  assert.equal(canMoveTo("sent", "reviewing"), false);
  assert.equal(canMoveTo("withdrawn", "reviewing"), true);
});

test("a set cannot go out short, to nobody, or without every CV", () => {
  assert.equal(problemWithSending(five(), ["hr@example.test"]), null);

  assert.match(problemWithSending(five(), []) ?? "", /nobody to send it to/i);
  assert.match(problemWithSending(five(), []) ?? "", /marked/, "it says where the address should come from");

  const four = five().slice(0, 4);
  const short = problemWithSending(four, ["hr@example.test"]) ?? "";
  assert.match(short, new RegExp("at least " + MIN_CVS + " CVs"));
  assert.match(short, /has 4/);
  assert.match(short, /search carries on/i);

  const oneMissing = five();
  oneMissing[2] = { ...oneMissing[2], fileId: null, problem: "TA has no prepared CV yet." };
  const said = problemWithSending(oneMissing, ["hr@example.test"]) ?? "";
  assert.match(said, /SAMPLE CANDIDATE THREE/, "it names who, not just a count");

  // A client on a different minimum is a settings change, not a code change.
  assert.equal(problemWithSending(four, ["hr@example.test"], 4), null);
});

test("the zip is named for the set, refuses a hole, and keeps two same-named CVs", () => {
  assert.equal(zipName("Acme / Lanka", 'Finance: "Manager"', 2), "Acme Lanka - Finance Manager - set 2.zip");
  assert.equal(problemWithZip(five()), null);
  assert.match(problemWithZip([]) ?? "", /no candidates/i);
  const hole = five();
  hole[1] = { ...hole[1], fileId: null };
  assert.match(problemWithZip(hole) ?? "", /SAMPLE CANDIDATE TWO/);
  assert.deepEqual(uniqueNames(["a.pdf", "b.pdf", "a.pdf", "a.pdf"]), ["a.pdf", "b.pdf", "a (2).pdf", "a (3).pdf"]);
});

test("our own interview: notes are needed to hold or fail, and only a pass lets the set go", () => {
  assert.equal(problemWithInternalInterview("pass", ""), null);
  assert.match(problemWithInternalInterview("maybe", "x") ?? "", /pass, hold or fail/);
  assert.match(problemWithInternalInterview("hold", " ") ?? "", /reason/);
  assert.match(problemWithInternalInterview("fail", "ab") ?? "", /reason/);
  assert.equal(problemWithInternalInterview("fail", "Could not explain the last role"), null);

  const to = ["hr@example.test"];
  const done = (outcome: "pass" | "hold" | "fail") => ({ by: "m_lead", at: 1, outcome, notes: "n" });
  // Off, nobody is asked: the existing behaviour.
  assert.equal(problemWithSending(five(), to, MIN_CVS, false), null);
  // On, a set with no interviews is refused and the names are said.
  assert.match(problemWithSending(five(), to, MIN_CVS, true) ?? "", /SAMPLE CANDIDATE ONE/);
  const all = five().map((c) => ({ ...c, internalInterview: done("pass") }));
  assert.equal(problemWithSending(all, to, MIN_CVS, true), null);
  // A hold is not a pass.
  all[3] = { ...all[3], internalInterview: done("hold") };
  const said = problemWithSending(all, to, MIN_CVS, true) ?? "";
  assert.match(said, /SAMPLE CANDIDATE FOUR/);
  assert.doesNotMatch(said, /SAMPLE CANDIDATE ONE/);
});

test("one line says where the set stands", () => {
  const now = Date.UTC(2026, 10, 10);
  const base = {
    state: "ready",
    setNumber: 1,
    candidates: five(),
    dueAt: now + 2 * DAY,
    sentAt: null,
    receivedAt: null,
  };
  assert.match(whereItStands(base, now), /TA says it is ready, 5 CVs/);
  assert.match(whereItStands(base, now), /due in 2 days/);
  assert.match(whereItStands({ ...base, dueAt: now - DAY }, now), /1 day late/);
  assert.match(whereItStands({ ...base, candidates: five().slice(0, 3) }, now), /short of 5/);
  assert.match(
    whereItStands({ ...base, state: "sent", sentAt: now - 3 * DAY, receivedAt: now - 3 * DAY }, now),
    /Sent, 5 CVs · 3 days ago/,
  );
  assert.match(whereItStands({ ...base, state: "withdrawn" }, now), /Pulled back/);
  assert.match(whereItStands({ ...base, dueAt: null }, now), /no date yet/);
});

test("a set TA says is ready becomes a set here, once, with its clock", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-sets-"));
  process.env.OPS_STORE = "json";
  // The TA side of the API does not exist yet; the stand-in answers.
  process.env.OPS_TA_FAKE = "on";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const lead = repo.addLead({
    company: "SAMPLE CLIENT",
    nameKey: "sample client",
    contactName: "Sample contact",
    contactEmail: "hr@example.test",
    contactPhone: "",
    source: "email",
    industry: "Manufacturing",
    website: "",
    notes: "",
    industryFlagged: false,
    industryBecause: null,
    industryConfirmedBy: null,
    state: "requirement",
    reason: null,
    doNotInvite: false,
    clientTaId: "ta_c1",
    ownerId: "m_owner",
    createdBy: "m_owner",
  });
  repo.addAgreement({
    leadId: lead.id,
    clientTaId: "ta_c1",
    state: "countersigned",
    version: 1,
    fields: { companyName: "SAMPLE CLIENT" },
    draftFileId: null,
    sentAt: now - 10 * DAY,
    sentMessageId: null,
    chaseStep: 0,
    expiresAt: null,
    signedAt: now - 8 * DAY,
    signedFileId: "f_s",
    countersignedAt: now - 7 * DAY,
    countersignedFileId: "f_c",
    reason: null,
    ownerId: "m_owner",
  });
  repo.addClient({
    leadId: lead.id,
    taClientId: "ta_c1",
    name: "SAMPLE CLIENT",
    nameKey: "sample client",
    stage: "active",
    billingName: "",
    billingEmail: "",
    billingAddress: "",
    groupName: "",
    notes: "",
    reason: null,
    ownerId: "m_owner",
  });

  const made = await desk.takeClientSetReady({ openingId: "ta_j1", setNumber: 1 }, now);
  assert(made, "the set was made");
  assert.equal(made.name, "SAMPLE CLIENT > HEAD OF FINANCE > SET 1");
  assert.equal(made.state, "ready");
  assert.equal(made.ownerId, "m_owner", "whoever owns the client owns the set");
  assert.equal(made.candidates.length, 6, "everybody TA put in the round, including the one with no CV");
  assert.equal(made.candidates.filter((c) => c.problem).length, 1, "the one with no prepared CV says so");
  assert.equal(made.dueAt, (now - 8 * DAY) + 7 * DAY, "seven days from the day it was signed");

  const clocks = repo.liveTimers().filter((t) => t.subjectId === made.id);
  assert.deepEqual(clocks.map((t) => t.kind), ["set.due"]);
  const task = repo.openTasksFor("m_owner").find((t) => t.subjectId === made.id);
  assert(task, "somebody has it to do");
  assert.match(task.title, /ready to go/i);

  // The same event twice is one set: TA may send it again, and two sets would
  // mean the client is sent the same CVs twice.
  const again = await desk.takeClientSetReady({ openingId: "ta_j1", setNumber: 1 }, now);
  assert.equal(again?.id, made.id);
  assert.equal(repo.all().clientSets.length, 1);
});

test("taking a candidate out leaves the set counted as it really is", async () => {
  // The store hands back the same record a patch writes to, so a count taken
  // after the patch counts the new list: the screen said "short of 5" about a
  // set of exactly five (3 Nov, found by walking it).
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-sets-drop-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const six = [...five(), { applicationTaId: "ta_a6", name: "SAMPLE CANDIDATE SIX", fileId: null, problem: "No CV." }];
  const set = repo.addClientSet({
    taRoundId: "ta_round1",
    openingTaId: "ta_j1",
    setNumber: 1,
    clientId: null,
    clientTaId: "ta_c1",
    name: "SAMPLE CLIENT > HEAD OF FINANCE > SET 1",
    role: "Head of finance",
    state: "reviewing",
    candidates: six,
    dueAt: null,
    sentAt: null,
    sentMessageId: null,
    sentTo: [],
    receivedAt: null,
    reason: null,
    ownerId: "m_owner",
  });

  const left = set.candidates.filter((c) => c.applicationTaId !== "ta_a6");
  await desk.patchClientSet(set.id, { candidates: left }, "m_owner", "clientSet.candidateDropped", "No CV.");

  const after = repo.all().clientSets[0];
  assert.equal(after.candidates.length, 5, "five are left");
  assert.equal(problemWithSending(after.candidates, ["hr@example.test"]), null, "five is not short of five");
  assert.equal(repo.audit()[0].reason, "No CV.");
});
