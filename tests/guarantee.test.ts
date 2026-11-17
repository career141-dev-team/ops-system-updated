/**
 * The guarantee, and closing a position (15, Phase 7).
 *
 * The owner's rules, each of which costs real money if it is wrong: ninety
 * days from joining, void on an unpaid fee, replacement before refund, 25%
 * and only by decision, and nothing closed with an advert still up.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  CLOSE_TRIGGERS,
  GUARANTEE_DAYS,
  GUARANTEE_MEANINGS,
  REFUND_PCT,
  REPLACEMENT_WORKING_DAYS,
  WARN_DAY,
  type GuaranteeState,
  canMoveTo,
  closeInWords,
  closeItemsFor,
  daysLeftInWords,
  endsOn,
  guaranteeInWords,
  problemWithCloseComplete,
  problemWithLeaver,
  problemWithRefund,
  refundAmount,
  replacementDeadline,
  verdictOnLeaver,
  warnOn,
} from "@/lib/guarantee";

const DAY = 86_400_000;
// Monday 9 November 2026, 10:00 Colombo.
const MONDAY = Date.UTC(2026, 10, 9, 4, 30);

test("ninety days from joining, with the warning on day 75", () => {
  assert.equal(endsOn(MONDAY), MONDAY + 90 * DAY);
  assert.equal(warnOn(MONDAY), MONDAY + 75 * DAY);
  assert.equal(endsOn(MONDAY, 60), MONDAY + 60 * DAY, "the number is a setting");
  assert.equal(GUARANTEE_DAYS, 90);
  assert.equal(WARN_DAY, 75);
  // Fifteen days between them, which is the owner's whole point.
  assert.equal((endsOn(MONDAY) - warnOn(MONDAY)) / DAY, 15);
});

test("an unpaid fee means there was never a guarantee", () => {
  const unpaid = verdictOnLeaver(null);
  assert.equal(unpaid.state, "void");
  assert.match(unpaid.because, /never paid in full/);
  assert.match(unpaid.because, /nothing is refunded/i);

  const paid = verdictOnLeaver(MONDAY);
  assert.equal(paid.state, "replacing");
  assert.match(paid.because, /replacement first/i);
});

test("a leaver needs the day and the reason, and cannot predate joining", () => {
  assert.equal(problemWithLeaver(MONDAY + 30 * DAY, "Went back to their old firm.", MONDAY, MONDAY + 31 * DAY), null);
  assert.match(problemWithLeaver(NaN, "x", MONDAY) ?? "", /day they left/i);
  assert.match(problemWithLeaver(MONDAY - DAY, "Gone.", MONDAY, MONDAY + DAY) ?? "", /before they joined/i);
  assert.match(problemWithLeaver(MONDAY + 90 * DAY, "Gone.", MONDAY, MONDAY) ?? "", /in the future/i);
  assert.match(problemWithLeaver(MONDAY + DAY, "no", MONDAY, MONDAY + 2 * DAY) ?? "", /Write why/i);
});

test("sixty working days to replace, counted as the agreement counts them", () => {
  const deadline = replacementDeadline(MONDAY);
  // Sixty working days is twelve weeks of five, so eighty-four calendar days.
  assert.equal((deadline - MONDAY) / DAY, 84);
  assert.equal(new Date(deadline).getUTCDay(), 1, "lands on a Monday, not a weekend");
  assert.equal(REPLACEMENT_WORKING_DAYS, 60);
  // A holiday inside the window pushes it out by that day.
  const withHoliday = replacementDeadline(MONDAY, 60, ["2026-11-24"]);
  assert.equal((withHoliday - deadline) / DAY, 1);
});

test("a refund is 25%, only by decision, and replacement comes first", () => {
  assert.equal(REFUND_PCT, 25);
  assert.equal(refundAmount(450_000), 112_500);
  assert.equal(refundAmount(450_000, 50), 225_000, "the number is a setting");

  const deadline = MONDAY + 84 * DAY;
  // Before the deadline the answer is "keep looking", said as a number.
  const early = problemWithRefund("replacing", "They cannot wait any longer.", deadline, MONDAY) ?? "";
  assert.match(early, /working days to find a replacement/);
  assert.match(early, /replacement comes first/);
  // The Director may still decide now, by saying that is what they are doing.
  assert.equal(
    problemWithRefund("replacing", "They cannot wait any longer.", deadline, MONDAY, [], true),
    null,
  );
  // After it, the decision is allowed - and still needs its reason.
  assert.equal(problemWithRefund("replacing", "No replacement in sight.", deadline, deadline + DAY), null);
  assert.match(problemWithRefund("replacing", "", deadline, deadline + DAY) ?? "", /reason/i);
  // And only while we are replacing somebody.
  assert.match(problemWithRefund("running", "Anything.", null) ?? "", /only decided while/i);
});

test("the states go one way, and every one has words", () => {
  assert.equal(canMoveTo("running", "warned"), true);
  assert.equal(canMoveTo("warned", "replacing"), true);
  assert.equal(canMoveTo("replacing", "replaced"), true);
  assert.equal(canMoveTo("replacing", "refund_pending"), true);
  assert.equal(canMoveTo("refund_pending", "refunded"), true);
  assert.equal(canMoveTo("ended_clean", "replacing"), false, "an ended guarantee is history");
  assert.equal(canMoveTo("void", "replacing"), false);
  for (const state of [
    "running",
    "warned",
    "ended_clean",
    "replacing",
    "replaced",
    "void",
    "refund_pending",
    "refunded",
  ]) {
    assert(GUARANTEE_MEANINGS[state as GuaranteeState], state + " has no wording");
  }
});

test("the line says how long is left, or how long to replace", () => {
  assert.match(daysLeftInWords(MONDAY + 10 * DAY, MONDAY), /10 days left/);
  assert.match(daysLeftInWords(MONDAY + 1000, MONDAY), /the last day/);
  assert.match(daysLeftInWords(MONDAY - 2 * DAY, MONDAY), /2 days over/);

  const running = { state: "running", endsAt: MONDAY + 30 * DAY, deadlineAt: null };
  assert.match(guaranteeInWords(running, MONDAY), /Running · 30 days left/);
  const replacing = { state: "replacing", endsAt: MONDAY, deadlineAt: MONDAY + 14 * DAY };
  assert.match(guaranteeInWords(replacing, MONDAY), /working days to replace/);
  assert.match(guaranteeInWords(replacing, MONDAY + 20 * DAY), /run out/);
});

test("the close list holds only the items this position really had", () => {
  const withPost = closeItemsFor({ linkedInUrl: "https://www.linkedin.com/jobs/view/1" });
  assert(withPost.some((i) => i.key === "linkedin"), "a post means an item about closing it");
  const without = closeItemsFor({ linkedInUrl: null });
  assert.equal(without.some((i) => i.key === "linkedin"), false, "no post, no item");
  // TopJobs is off by default, because TopJobs itself is paused.
  assert.equal(without.some((i) => i.key === "topjobs"), false);
  assert(without.some((i) => i.key === "opening"), "the opening is always closed");
  assert.equal(without.every((i) => i.doneAt === null), true);

  // The one that gets forgotten belongs to the TA, and says so.
  assert.equal(withPost.find((i) => i.key === "linkedin")?.whose, "ta");
});

test("nothing closes with an item still open, and the list says which", () => {
  const items = closeItemsFor({ linkedInUrl: "https://www.linkedin.com/jobs/view/1" });
  const left = problemWithCloseComplete(items) ?? "";
  assert.match(left, /items are still open/);
  assert.match(left, /Close the LinkedIn post/);

  const allDone = items.map((item) => ({ ...item, doneAt: MONDAY, doneBy: "m_owner" }));
  assert.equal(problemWithCloseComplete(allDone), null);

  assert.match(closeInWords({ trigger: "ended_clean", items, completedAt: null }), new RegExp(CLOSE_TRIGGERS.ended_clean));
  assert.match(closeInWords({ trigger: "ended_clean", items, completedAt: null }), /0 of 4 done/);
  assert.match(closeInWords({ trigger: "refunded", items: allDone, completedAt: MONDAY }), /^Closed/);
});

test("joining starts the guarantee; day 75 warns and day 90 closes it", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-gar-"));
  process.env.OPS_STORE = "json";
  process.env.OPS_TA_FAKE = "on";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const placement = repo.addPlacement({
    placementTaId: "ta_p1",
    applicationTaId: "ta_a4",
    openingTaId: "ta_j1",
    positionId: null,
    clientId: null,
    candidateName: "SAMPLE CANDIDATE FOUR",
    state: "joined",
    monthlySalary: 450_000,
    basicSalary: null,
    allowances: 0,
    package: "",
    currency: "LKR",
    offerLetterFileRef: "ta_f1",
    joinDate: now,
    joinedAt: now,
    dojHistory: [],
    feeMonths: 1,
    feeBasis: "gross",
    isReplacementOf: null,
    invoiceId: null,
    reason: null,
    noShowChoice: null,
    ownerId: "m_owner",
  });

  const guarantee = await desk.startGuarantee(placement.id, now);
  assert(guarantee, "a guarantee started");
  assert.equal(guarantee.state, "running");
  assert.equal(guarantee.endsAt, now + 90 * DAY);
  assert.equal(guarantee.feePaidAt, null, "nothing is paid yet, so it would not hold today");

  const clocks = repo.liveTimers().filter((t) => t.subjectId === guarantee.id);
  assert.deepEqual(clocks.map((c) => c.kind).sort(), ["guarantee.end", "guarantee.warn"]);
  assert.equal(clocks.find((c) => c.kind === "guarantee.warn")?.dueAt, now + 75 * DAY);

  // Starting it twice gives the same one back.
  const again = await desk.startGuarantee(placement.id, now + 1000);
  assert.equal(again?.id, guarantee.id);
  assert.equal(repo.all().guarantees.length, 1);

  // Day 75.
  await desk.warnAboutGuarantee(guarantee.id, now + 75 * DAY);
  assert.equal(repo.guaranteeIn(guarantee.id)?.state, "warned");
  assert.match(repo.all().tasks.find((t) => t.subjectId === guarantee.id)?.title ?? "", /Fifteen days/);

  // Day 90 with nobody having left: ended, and the close list is open.
  await desk.endGuaranteeClean(guarantee.id, now + 90 * DAY);
  assert.equal(repo.guaranteeIn(guarantee.id)?.state, "ended_clean");
  assert.equal(repo.liveTimers().filter((t) => t.subjectId === guarantee.id).length, 0);
  const notice = repo.all().messages.find((m) => m.templateKey === "guarantee.ended");
  assert.equal(notice?.channel, "internal");
  const checklist = repo.all().closeChecklists[0];
  assert.equal(checklist?.trigger, "ended_clean");
  assert.equal(checklist?.openingTaId, "ta_j1");
});

test("a leaver on a paid fee reopens the position; on an unpaid one it closes", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-gar2-"));
  process.env.OPS_STORE = "json";
  process.env.OPS_TA_FAKE = "on";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const base = {
    placementTaId: "ta_p1",
    applicationTaId: "ta_a4",
    openingTaId: "ta_j1",
    positionId: null,
    clientId: null,
    candidateName: "SAMPLE CANDIDATE FOUR",
    state: "joined",
    monthlySalary: 450_000,
    basicSalary: null,
    allowances: 0,
    package: "",
    currency: "LKR",
    offerLetterFileRef: "ta_f1",
    joinDate: now - 40 * DAY,
    joinedAt: now - 40 * DAY,
    dojHistory: [],
    feeMonths: 1,
    feeBasis: "gross",
    isReplacementOf: null,
    invoiceId: null,
    reason: null,
    noShowChoice: null,
    ownerId: "m_owner",
  };
  const paidPlacement = repo.addPlacement(base);
  const invoice = repo.addInvoice({
    number: "C141-2026-0001",
    kind: "fee",
    about: null,
    setId: null,
    againstInvoiceId: null,
    placementId: paidPlacement.id,
    clientId: null,
    state: "paid",
    amount: 450_000,
    currency: "LKR",
    lateCharge: 0,
    lateMonths: 0,
    disputed: false,
    disputedReason: null,
    payments: [{ amount: 450_000, paidAt: now - 10 * DAY, method: "bank transfer", by: "m_accounts", note: null }],
    sentAt: now - 35 * DAY,
    sentMessageId: null,
    dueAt: now - 10 * DAY,
    paidAt: now - 10 * DAY,
    writtenOffAt: null,
    reason: null,
    ownerId: "m_accounts",
  });
  repo.patchPlacement(paidPlacement.id, { invoiceId: invoice.id }, "m_owner", "placement.invoiced", null);

  const paid = await desk.startGuarantee(paidPlacement.id, now);
  assert.equal(paid?.feePaidAt, invoice.paidAt, "the guarantee knows the fee is settled");

  const left = await desk.markLeaver(paid.id, now, "Went back to their old firm.", "m_owner", now);
  assert.equal(left.ok, true);
  assert.match(left.what, /replacement first/i);
  const after = repo.guaranteeIn(paid.id);
  assert.equal(after?.state, "replacing");
  // Counted with the holiday list the desk has, not a bare sixty working days:
  // a poya day inside the window pushes the deadline out, which is the point
  // of counting working days at all.
  const holidays = repo.all().holidays.map((h) => h.date);
  assert.equal(after?.deadlineAt, replacementDeadline(now, 60, holidays));
  assert(replacementDeadline(now, 60, holidays) > replacementDeadline(now), "the holidays really count");
  // TA is told twice: the person left, and the position reopens.
  const told = repo.all().outbox.map((o) => o.path);
  assert(told.some((p) => p.endsWith("/placements/ta_p1/left")));
  assert(told.some((p) => p.endsWith("/openings/ta_j1/status")));
  assert.equal(repo.liveTimers().some((t) => t.kind === "replacement.deadline"), true);

  // A replacement placed on the same opening is not invoiced, and starts its
  // own ninety days.
  const replacement = repo.addPlacement({
    ...base,
    placementTaId: "ta_p9",
    candidateName: "SAMPLE CANDIDATE NINE",
    joinedAt: now,
    joinDate: now,
  });
  assert.equal(await desk.takeReplacement(replacement.id, "ta_j1", now), true);
  assert.equal(repo.placementIn(replacement.id)?.isReplacementOf, paidPlacement.id);
  assert.equal(repo.guaranteeIn(paid.id)?.state, "replaced");
  const second = await desk.startGuarantee(replacement.id, now);
  assert.equal(second?.endsAt, now + 90 * DAY, "a new ninety days");
  assert(second?.feePaidAt, "covered by the fee already paid, so it holds");
  const invoiced = await desk.draftFeeInvoice(replacement.id, "m_owner", now);
  assert.equal(invoiced.ok, false);
  assert.match(invoiced.what, /not invoiced again/i);

  // The unpaid one: void, and the position simply closes.
  const unpaidPlacement = repo.addPlacement({ ...base, placementTaId: "ta_p2", openingTaId: "ta_j2", invoiceId: null });
  const unpaid = await desk.startGuarantee(unpaidPlacement.id, now);
  assert(unpaid, "a guarantee for the unpaid one too - the clock is from joining");
  const voided = await desk.markLeaver(unpaid.id, now, "Left after three weeks.", "m_owner", now);
  assert.match(voided.what, /never paid in full/);
  assert.equal(repo.guaranteeIn(unpaid.id)?.state, "void");
  assert.equal(repo.liveTimers().some((t) => t.kind === "replacement.deadline" && t.subjectId === unpaid.id), false);
  const closing = repo.all().closeChecklists.find((c) => c.openingTaId === "ta_j2");
  assert.equal(closing?.trigger, "void");
});

test("a fee paid after the guarantee started still makes it hold", async () => {
  // The invoice is drafted the day they join, so the fee is always paid after
  // the guarantee began. If the paid date were only read at the start, every
  // leaver would read as void (found while walking Phase 7).
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-gar3-"));
  process.env.OPS_STORE = "json";
  process.env.OPS_TA_FAKE = "on";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const placement = repo.addPlacement({
    placementTaId: "ta_p1",
    applicationTaId: "ta_a4",
    openingTaId: "ta_j1",
    positionId: null,
    clientId: null,
    candidateName: "SAMPLE CANDIDATE FOUR",
    state: "joined",
    monthlySalary: 450_000,
    basicSalary: null,
    allowances: 0,
    package: "",
    currency: "LKR",
    offerLetterFileRef: "ta_f1",
    joinDate: now,
    joinedAt: now,
    dojHistory: [],
    feeMonths: 1,
    feeBasis: "gross",
    isReplacementOf: null,
    invoiceId: null,
    reason: null,
    noShowChoice: null,
    ownerId: "m_owner",
  });
  const guarantee = await desk.startGuarantee(placement.id, now);
  assert.equal(guarantee?.feePaidAt, null, "nothing is paid on the day they join");

  // What `recordPayment` does when an invoice settles.
  await desk.patchGuarantee(guarantee!.id, { feePaidAt: now + 20 * DAY }, "m_accounts", "guarantee.feePaid", null);
  const held = repo.guaranteeIn(guarantee!.id);
  assert.equal(verdictOnLeaver(held?.feePaidAt ?? null).state, "replacing", "now a leaver is replaced, not void");
});
