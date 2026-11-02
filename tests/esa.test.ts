/**
 * The client agreement. Two incidents from the owner's board are what these
 * rules exist for: a draft that went out with placeholders still in it, and a
 * chase done by hand from somebody's tracker.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  CHASE_PLAN,
  type EsaFields,
  type EsaState,
  canMoveTo,
  chaseStep,
  defaultFields,
  expiresAt,
  missingFields,
  nextChaseAt,
  problemWithDraft,
  problemWithSigned,
  whereItStands,
} from "@/lib/esa";

const DAY = 86_400_000;

const filled = (): EsaFields => ({
  companyName: "SAMPLE CLIENT (Pvt) Ltd",
  companyAddress: "1 Sample Road, Colombo",
  taxNo: "123456789",
  signatoryName: "Sample contact",
  signatoryEmail: "hr@example.test",
  feeMonths: "1",
  feeBasis: "gross",
  guaranteeDays: "90",
  paymentDays: "30",
  replacementWorkingDays: "60",
  refundPct: "25",
});

test("a blank required field blocks the draft, and is named", () => {
  assert.equal(problemWithDraft(filled()), null);

  const noTax = { ...filled(), taxNo: "  " };
  assert.deepEqual(missingFields(noTax).map((f) => f.key), ["taxNo"]);
  assert.match(problemWithDraft(noTax) ?? "", /still blank: tax number/i);

  const empty = problemWithDraft({});
  assert.match(empty ?? "", /company, as it signs/i);
  assert.match(empty ?? "", /tax number/i);
});

test("an optional field being blank changes nothing", () => {
  const noTitle = { ...filled(), signatoryTitle: "", notes: "" };
  assert.equal(problemWithDraft(noTitle), null);
});

test("the numbers start from the settings", () => {
  const fields = defaultFields({ guaranteeDays: 90, paymentDays: 30, replacementWorkingDays: 60, refundPct: 25 });
  assert.equal(fields.guaranteeDays, "90");
  assert.equal(fields.feeMonths, "1", "one month of salary is standard");
  assert.equal(fields.feeBasis, "gross");
  // A client on a different guarantee is a settings change, not a code change.
  const other = defaultFields({ guaranteeDays: 60, paymentDays: 45, replacementWorkingDays: 30, refundPct: 10 });
  assert.equal(other.guaranteeDays, "60");
  assert.equal(other.paymentDays, "45");
});

test("the chase is the owner's plan: email, WhatsApp, email, WhatsApp, email, call", () => {
  assert.deepEqual(CHASE_PLAN.map((s) => s.channel), ["email", "whatsapp", "email", "whatsapp", "email", "call"]);
  assert.equal(chaseStep(1)?.templateKey, "esa.chase.email.1");
  assert.equal(chaseStep(6)?.channel, "call", "the last resort is a person, not another email");
  assert.equal(chaseStep(7), null);
});

test("each chase is due a fixed number of days after the one before", () => {
  const first = nextChaseAt(0, 1_000);
  assert.deepEqual(first, { step: 1, dueAt: 1_000 + 2 * DAY });
  assert.deepEqual(nextChaseAt(2, 1_000), { step: 3, dueAt: 1_000 + 3 * DAY });
  assert.equal(nextChaseAt(6, 1_000), null, "after the call there is nothing automatic left");
});

test("two weeks are counted in calendar days, not working days", () => {
  const sent = Date.UTC(2026, 10, 2);
  assert.equal(expiresAt(sent, 14), sent + 14 * DAY);
});

test("the agreement can only move where it is allowed to", () => {
  assert.equal(canMoveTo("draft", "sent"), true);
  assert.equal(canMoveTo("sent", "signed"), true);
  assert.equal(canMoveTo("signed", "countersigned"), true);
  assert.equal(canMoveTo("draft", "signed"), false, "nothing is signed that was never sent");
  assert.equal(canMoveTo("countersigned", "sent"), false, "a finished agreement does not reopen");
  assert.equal(canMoveTo("declined", "sent"), false);
  assert.equal(canMoveTo("expired", "sent"), true, "an expired one can be sent again if they come back");
});

test("where it stands reads as a sentence, at every stage", () => {
  const now = Date.UTC(2026, 10, 10);
  const sent = Date.UTC(2026, 10, 2);
  const base = { state: "sent" as EsaState, chaseStep: 0, sentAt: sent, expiresAt: expiresAt(sent, 14) };

  assert.match(whereItStands(base, now), /Sent\. Next: first reminder by email/);
  assert.match(whereItStands({ ...base, chaseStep: 1 }, now), /chased 1 time/);
  assert.match(whereItStands({ ...base, chaseStep: 2 }, now), /chased 2 times/);
  assert.match(whereItStands(base, now), /6 days left of the two weeks/);
  assert.match(whereItStands({ ...base, chaseStep: 6 }, now), /somebody must call them/);
  assert.match(whereItStands({ ...base, state: "signed" }, now), /Waiting for the Director/);
  assert.match(whereItStands({ ...base, state: "countersigned" }, now), /gone back to the client/);
  assert.match(whereItStands({ ...base, state: "declined" }, now), /No work starts/);
  assert.match(whereItStands({ ...base, state: "draft", sentAt: null, expiresAt: null }, now), /Not sent yet/);
  assert.match(whereItStands(base, Date.UTC(2026, 10, 20)), /the two weeks are up/);
});

test("a signed copy needs a file and somebody saying they looked at it", () => {
  assert.match(problemWithSigned({ fileId: null, checked: true }) ?? "", /Upload the signed copy/);
  assert.match(problemWithSigned({ fileId: "f_1", checked: false }) ?? "", /signed, dated and sealed/);
  assert.equal(problemWithSigned({ fileId: "f_1", checked: true }), null);
});

test("a settled agreement leaves no clocks running", async () => {
  // The two-week clock is not a chase, so a reply does not stop it. What stops
  // it is the agreement being settled, which is what this proves.
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-esa-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  for (const kind of ["esa.chase", "esa.decline"]) {
    repo.startTimer({
      kind,
      subjectType: "esa",
      subjectId: "esa_x",
      startsAt: now,
      dueAt: now + 14 * DAY,
      warnAt: null,
      ownerId: "m_owner",
      payload: {},
    });
  }
  assert.equal(repo.liveTimers().filter((t) => t.subjectId === "esa_x").length, 2);

  const stopped = await desk.cancelClocksFor(await desk.desk(), "esa", "esa_x", "m_owner", "It is signed.");
  assert.equal(stopped, 2);
  assert.equal(repo.liveTimers().filter((t) => t.subjectId === "esa_x").length, 0);
  assert.equal(repo.audit()[0].reason, "It is signed.");
});
