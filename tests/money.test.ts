/**
 * From the placement to the money (15, Phase 6).
 *
 * This is the file that decides what a client is asked to pay, so the sums
 * are checked rather than trusted: the fee off the agreement's own rule, the
 * late charge compounded as the document words it, and nothing at all on an
 * invoice disputed in good faith.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  DUE_DAYS,
  LATE_PCT_PER_MONTH,
  NO_SHOW_CHOICES,
  PLACEMENT_MEANINGS,
  WRITE_OFF_DAYS,
  balanceOf,
  dueOn,
  feeAmount,
  feeInWords,
  invoiceInWords,
  invoiceLines,
  invoiceNumber,
  joinClocks,
  lateCharge,
  missingPlacementFields,
  money,
  monthsLate,
  nineAmOn,
  paidSoFar,
  placementInWords,
  problemWithDojChange,
  problemWithNoShow,
  problemWithSalarySplit,
  problemWithNoShowChoice,
  problemWithPayment,
  problemWithWriteOff,
} from "@/lib/money";

const DAY = 86_400_000;
// Monday 9 November 2026, 10:00 Colombo.
const MONDAY = Date.UTC(2026, 10, 9, 4, 30);

test("a placement with no package cannot be invoiced, and says what is missing", () => {
  assert.deepEqual(
    missingPlacementFields({ monthlySalary: 450_000, offerLetterFileRef: "ta_f1", joinDate: MONDAY }),
    [],
  );
  const missing = missingPlacementFields({ monthlySalary: null, offerLetterFileRef: null, joinDate: null });
  assert.deepEqual(missing, ["the agreed package", "the signed offer letter", "the joining day"]);
  // A zero package is as useless as none: an invoice for nothing is worse.
  assert.deepEqual(
    missingPlacementFields({ monthlySalary: 0, offerLetterFileRef: "ta_f1", joinDate: MONDAY }),
    ["the agreed package"],
  );
});

test("the joining clocks are a week out, the day before, and the morning itself", () => {
  const clocks = joinClocks(MONDAY, MONDAY - 30 * DAY);
  assert.deepEqual(
    clocks.map((c) => c.kind),
    ["doj.remind.week", "doj.remind.day", "doj.join"],
  );
  // Nine in the morning Colombo is 03:30 UTC.
  assert.equal(clocks[2].dueAt, Date.UTC(2026, 10, 9, 3, 30));
  assert.equal(clocks[0].dueAt, Date.UTC(2026, 10, 2, 3, 30));
  assert.equal(nineAmOn(MONDAY, -1), Date.UTC(2026, 10, 8, 3, 30));

  // A placement taken three days before the joining day gets the two clocks
  // that are still ahead, not a reminder that fires at once.
  const late = joinClocks(MONDAY, MONDAY - 3 * DAY);
  assert.deepEqual(
    late.map((c) => c.kind),
    ["doj.remind.day", "doj.join"],
  );
  assert.deepEqual(joinClocks(MONDAY, MONDAY + DAY), []);
});

test("moving a joining day needs a reason, because a day that slips twice matters", () => {
  assert.equal(problemWithDojChange(MONDAY, "The client's own start date moved.", MONDAY - 10 * DAY), null);
  assert.match(problemWithDojChange(NaN, "whatever") ?? "", /new joining day/i);
  assert.match(problemWithDojChange(MONDAY, "x", MONDAY - DAY) ?? "", /Write why/i);
  assert.match(problemWithDojChange(MONDAY - 30 * DAY, "late", MONDAY) ?? "", /long gone/i);
});

test("the fee is the agreement's rule times the package", () => {
  assert.equal(feeAmount({ feeMonths: 1, feeBasis: "gross" }, 450_000), 450_000);
  assert.equal(feeAmount({ feeMonths: 2, feeBasis: "gross" }, 450_000), 900_000);
  // A rule with no months is one month, never nothing.
  assert.equal(feeAmount({ feeMonths: 0, feeBasis: "gross" }, 450_000), 450_000);
  assert.match(feeInWords({ feeMonths: 1, feeBasis: "gross" }), /one month of gross salary/);
  assert.match(feeInWords({ feeMonths: 2, feeBasis: "basic" }), /2 months of basic salary/);
});

test("the invoice number is the series, the year, and a number that only goes up", () => {
  assert.equal(invoiceNumber("C141", 0, MONDAY), "C141-2026-0001");
  assert.equal(invoiceNumber("C141", 41, MONDAY), "C141-2026-0042");
  assert.equal(invoiceNumber("", 0, MONDAY), "C141-2026-0001", "a series is never empty");
});

test("due thirty days from the first working day, not from the invoice", () => {
  const joined = MONDAY;
  assert.equal(dueOn(joined), joined + 30 * DAY);
  assert.equal(dueOn(joined, 45), joined + 45 * DAY);
  assert.equal(DUE_DAYS, 30);
  assert.equal(monthsLate(joined, joined), 0);
  assert.equal(monthsLate(joined, joined + 29 * DAY), 0, "part of a month does not count");
  assert.equal(monthsLate(joined, joined + 31 * DAY), 1);
  assert.equal(monthsLate(joined, joined + 65 * DAY), 2);
});

test("late is 1% a month compounded, and nothing at all when disputed", () => {
  assert.equal(LATE_PCT_PER_MONTH, 1);
  // Compounded: the second month's 1% is on the first month's total.
  assert.equal(lateCharge(100_000, 1), 1000);
  assert.equal(lateCharge(100_000, 2), 2010);
  assert.equal(lateCharge(100_000, 3), 3030.1);
  // Simple, if the owner ever switches it back.
  assert.equal(lateCharge(100_000, 2, 1, false), 2000);
  // The agreement's own exception.
  assert.equal(lateCharge(100_000, 6, 1, true, true), 0, "disputed in good faith");
  assert.equal(lateCharge(100_000, 0), 0);
  assert.equal(lateCharge(0, 5), 0);
});

test("what is owed is the fee plus the charge less what came in", () => {
  const invoice = { amount: 450_000, lateCharge: 4500, payments: [{ amount: 200_000 }] };
  assert.equal(paidSoFar(invoice), 200_000);
  assert.equal(balanceOf(invoice), 254_500);
  assert.equal(balanceOf({ amount: 100, lateCharge: 0, payments: [{ amount: 100 }] }), 0);
});

test("a payment has to be real money against something still owed", () => {
  assert.equal(problemWithPayment(100_000, 450_000), null);
  assert.match(problemWithPayment(0, 450_000) ?? "", /How much/i);
  assert.match(problemWithPayment(-5, 450_000) ?? "", /How much/i);
  assert.match(problemWithPayment(100, 0) ?? "", /Nothing is owed/i);
  // A digit too many is the usual mistake, and an overpaid invoice is worse
  // than one waiting for a correction.
  assert.match(problemWithPayment(4_500_000, 450_000) ?? "", /more than/i);
  // Paying the balance exactly is fine, and so is a rounding penny.
  assert.equal(problemWithPayment(450_000, 450_000), null);
  assert.equal(problemWithPayment(450_000.4, 450_000), null);
});

test("a fee is not written off before ninety days, unless a director says so", () => {
  const due = MONDAY;
  assert.match(problemWithWriteOff(due, "", MONDAY + 200 * DAY) ?? "", /Write why/i);
  assert.match(problemWithWriteOff(due, "They have gone under.", MONDAY + 10 * DAY) ?? "", /not written off before 90/);
  assert.equal(problemWithWriteOff(due, "They have gone under.", MONDAY + 95 * DAY), null);
  assert.equal(WRITE_OFF_DAYS, 90);
});

test("a no-show needs what happened, and the client's choice", () => {
  assert.match(problemWithNoShow("") ?? "", /what happened/i);
  assert.equal(problemWithNoShow("Took another offer the week before."), null);
  assert.equal(problemWithNoShowChoice("replace"), null);
  assert.equal(problemWithNoShowChoice("stop"), null);
  assert.match(problemWithNoShowChoice("maybe") ?? "", /replacement, or to stop/i);
  assert.deepEqual(Object.keys(NO_SHOW_CHOICES).sort(), ["replace", "stop"]);
});

test("the invoice reads as an invoice, with only the lines that are true", () => {
  const lines = invoiceLines({
    number: "C141-2026-0001",
    candidateName: "SAMPLE CANDIDATE FOUR",
    positionTitle: "Head of finance",
    clientName: "SAMPLE CLIENT (PVT) LTD",
    feeWords: "one month of gross salary",
    monthlySalary: 450_000,
    amount: 450_000,
    lateCharge: 0,
    payments: [],
    joinedAt: MONDAY,
    dueAt: MONDAY + 30 * DAY,
    currency: "LKR",
  });
  assert.match(lines, /Invoice C141-2026-0001/);
  assert.match(lines, /SAMPLE CLIENT \(PVT\) LTD/);
  assert.match(lines, /Head of finance - SAMPLE CANDIDATE FOUR/);
  assert.match(lines, /LKR 450,000\.00/);
  assert.match(lines, /Payable by: 2026-12-09/);
  // No late line and no received line when there is neither.
  assert.doesNotMatch(lines, /Late payment charge/);
  assert.doesNotMatch(lines, /Received/);

  const chased = invoiceLines({
    number: "C141-2026-0001",
    candidateName: "SAMPLE CANDIDATE FOUR",
    positionTitle: "Head of finance",
    clientName: "SAMPLE CLIENT",
    feeWords: "one month of gross salary",
    monthlySalary: 450_000,
    amount: 450_000,
    lateCharge: 4500,
    payments: [{ amount: 200_000, paidAt: MONDAY }],
    joinedAt: MONDAY,
    dueAt: MONDAY + 30 * DAY,
    currency: "LKR",
  });
  assert.match(chased, /Late payment charge: LKR 4,500\.00/);
  assert.match(chased, /Received: LKR 200,000\.00/);
  assert.match(chased, /Due: LKR 254,500\.00/);
  assert.equal(money(1234.5), "LKR 1,234.50");
});

test("the lines about a placement and an invoice say where they stand", () => {
  const placement = { state: "placed", joinDate: MONDAY, joinedAt: null, isReplacementOf: null };
  assert.match(placementInWords(placement, MONDAY - 3 * DAY), new RegExp(PLACEMENT_MEANINGS.placed));
  assert.match(placementInWords(placement, MONDAY - 3 * DAY), /joins in 3 days/);
  assert.match(placementInWords(placement, MONDAY + DAY), /did they turn up/i);
  assert.match(
    placementInWords({ ...placement, state: "joined", joinedAt: MONDAY }, MONDAY + DAY),
    /joined 2026-11-09/,
  );
  assert.match(
    placementInWords({ ...placement, isReplacementOf: "plc_1" }, MONDAY - DAY),
    /nothing is invoiced/,
  );

  const invoice = {
    number: "C141-2026-0001",
    state: "sent",
    amount: 450_000,
    lateCharge: 0,
    payments: [],
    dueAt: MONDAY,
    currency: "LKR",
  };
  assert.match(invoiceInWords(invoice, MONDAY - 5 * DAY), /due in 5 days/);
  // The number is not in the line: every screen shows it as the link beside.
  assert.doesNotMatch(invoiceInWords(invoice, MONDAY), /C141/);
  // A draft owes nothing yet; it says what it will be and when.
  const draft = invoiceInWords({ ...invoice, state: "draft" }, MONDAY - 5 * DAY);
  assert.doesNotMatch(draft, /owed/);
  assert.match(draft, /LKR 450,000\.00/);
  assert.match(draft, /payable by 2026-11-09/);
  assert.match(invoiceInWords(invoice, MONDAY + 3 * DAY), /3 days late/);
  assert.match(invoiceInWords({ ...invoice, state: "paid", payments: [{ amount: 450_000 }] }, MONDAY), /collected/);
});

test("a placement event becomes a placement, a notice and the three clocks", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-money-"));
  process.env.OPS_STORE = "json";
  process.env.OPS_TA_FAKE = "on";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const client = repo.addClient({
    leadId: null,
    taClientId: "ta_c1",
    name: "SAMPLE CLIENT",
    nameKey: "sample client",
    stage: "active",
    billingName: "SAMPLE CLIENT (PVT) LTD",
    billingEmail: "finance@example.test",
    billingAddress: "1 Test Road, Colombo 03",
    groupName: "",
    notes: "",
    reason: null,
    ownerId: "m_owner",
  });
  repo.addPosition({
    requirementId: null,
    clientId: client.id,
    clientTaId: "ta_c1",
    openingTaId: "ta_j1",
    title: "Head of finance",
    stage: "searching",
    primaryTaId: "ta_u2",
    hundredPercentDay: null,
    taStatus: "open",
    jdApprovedAt: null,
    linkedInUrl: null,
    linkedInPostedAt: null,
    depthStage: null,
    shortlistedTotal: null,
    pendingCount: null,
    depthCheckedAt: null,
    handedOverAt: now,
    closedAt: null,
    ownerId: "m_owner",
  });

  const placement = await desk.takePlacement({ placementId: "ta_p1" }, now);
  assert(placement, "a placement was taken");
  assert.equal(placement.candidateName, "SAMPLE CANDIDATE FOUR");
  assert.equal(placement.monthlySalary, 450_000);
  assert.equal(placement.state, "placed");
  assert.equal(placement.clientId, client.id, "joined to our own client record");
  // No signed agreement in this test, so the standard rule is used.
  assert.equal(placement.feeMonths, 1);

  // The same-day notice, internal so it needs nobody's approval.
  const notice = repo.all().messages.find((m) => m.templateKey === "placement.notice");
  assert.equal(notice?.channel, "internal");
  assert.match(notice?.body ?? "", /450,000/);

  const clocks = repo.liveTimers().filter((t) => t.subjectId === placement.id);
  assert.deepEqual(
    clocks.map((c) => c.kind).sort(),
    ["doj.join", "doj.remind.day", "doj.remind.week"],
  );

  // The same event twice is one placement.
  const again = await desk.takePlacement({ placementId: "ta_p1" }, now + 1000);
  assert.equal(again?.id, placement.id);
  assert.equal(repo.all().placements.length, 1);

  // Joining drafts the fee at once, due thirty days from the first day.
  const joined = await desk.markPlacementJoined(placement.id, "m_owner", now);
  assert.equal(joined.ok, true);
  const invoice = repo.all().invoices[0];
  assert(invoice, "the fee is drafted");
  assert.equal(invoice.amount, 450_000);
  assert.equal(invoice.state, "draft", "accounts reads it before it goes");
  assert.equal(invoice.dueAt, now + 30 * DAY);
  assert.match(invoice.number, /^C141-\d{4}-0001$/);
  assert.equal(repo.liveTimers().filter((t) => t.subjectId === placement.id).length, 0, "the joining clocks stop");

  // Invoicing twice is refused, which is the thing that would really cost us.
  const twice = await desk.draftFeeInvoice(placement.id, "m_owner", now);
  assert.equal(twice.ok, false);
  assert.match(twice.what, /already been invoiced/i);
  assert.equal(repo.all().invoices.length, 1);
});

test("the chase recomputes the charge, asks accounts, and sets the next month", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-money2-"));
  process.env.OPS_STORE = "json";
  process.env.OPS_TA_FAKE = "on";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const client = repo.addClient({
    leadId: null,
    taClientId: "ta_c1",
    name: "SAMPLE CLIENT",
    nameKey: "sample client",
    stage: "active",
    billingName: "SAMPLE CLIENT (PVT) LTD",
    billingEmail: "finance@example.test",
    billingAddress: "1 Test Road, Colombo 03",
    groupName: "",
    notes: "",
    reason: null,
    ownerId: "m_owner",
  });
  const invoice = repo.addInvoice({
    number: "C141-2026-0007",
    kind: "fee",
    about: null,
    setId: null,
    againstInvoiceId: null,
    placementId: null,
    clientId: client.id,
    state: "sent",
    amount: 450_000,
    currency: "LKR",
    lateCharge: 0,
    lateMonths: 0,
    disputed: false,
    disputedReason: null,
    payments: [],
    sentAt: now - 70 * DAY,
    sentMessageId: null,
    dueAt: now - 65 * DAY,
    paidAt: null,
    writtenOffAt: null,
    reason: null,
    ownerId: "m_accounts",
  });

  const chased = await desk.chaseThePayment(invoice.id, now);
  assert.equal(chased.ok, true);
  const saved = repo.invoiceIn(invoice.id);
  assert.equal(saved?.lateMonths, 2);
  // Two months, compounded, on 450,000.
  assert.equal(saved?.lateCharge, 9045);

  const draft = repo.all().messages.find((m) => m.templateKey === "invoice.chase");
  assert.deepEqual(draft?.to, ["finance@example.test"]);
  assert.equal(draft?.state, "draft", "nothing reaches a client unapproved");
  assert.match(draft?.body ?? "", /459,045\.00/, "the amount owed includes the charge");

  // The next chase is a month away, and goes on until it is paid.
  const next = repo.liveTimers().find((t) => t.kind === "invoice.chase");
  assert.equal(next?.dueAt, now + 30 * DAY);

  // At sixty-five days nobody is asked to write it off: ninety is the rule,
  // and a fee written off early is a fee nobody chased.
  assert.equal(repo.all().tasks.some((t) => t.title.startsWith("Write off")), false);

  // Past ninety days, the question is asked - of the Director, not accounts.
  await desk.chaseThePayment(invoice.id, now + 30 * DAY);
  const asked = repo.all().tasks.find((t) => t.title.startsWith("Write off"));
  assert.match(asked?.title ?? "", /C141-2026-0007/);
  assert.equal(asked?.assigneeId, "m_dirops", "the Director decides, not accounts");

  // A disputed invoice carries no charge at all, which is the agreement.
  repo.patchInvoice(invoice.id, { disputed: true, disputedReason: "They query the package." }, "m_accounts", "invoice.disputed", null);
  await desk.chaseThePayment(invoice.id, now + DAY);
  assert.equal(repo.invoiceIn(invoice.id)?.lateCharge, 0);
});

test("the fee follows the agreement's basis, with allowances (16 Nov)", () => {
  const split = { basicSalary: 300_000, allowances: 150_000 };
  assert.equal(feeAmount({ feeMonths: 1, feeBasis: "basic" }, 450_000, split), 300_000);
  assert.equal(feeAmount({ feeMonths: 1, feeBasis: "gross" }, 450_000, split), 450_000);
  assert.equal(feeAmount({ feeMonths: 2, feeBasis: "basic" }, 450_000, split), 600_000);
  // Gross is basic plus allowances, even when monthlySalary disagrees: the split is the corrected truth.
  assert.equal(feeAmount({ feeMonths: 1, feeBasis: "gross" }, 400_000, split), 450_000);
  // Split unknown: the salary as TA gave it, never a guess.
  assert.equal(feeAmount({ feeMonths: 1, feeBasis: "basic" }, 450_000, { basicSalary: null, allowances: 0 }), 450_000);
  assert.equal(feeAmount({ feeMonths: 1, feeBasis: "basic" }, 450_000), 450_000);
});

test("correcting the split needs numbers and a reason", () => {
  assert.equal(problemWithSalarySplit(300_000, 150_000, "Offer letter says so"), null);
  assert.match(problemWithSalarySplit(0, 0, "Offer letter says so") ?? "", /basic/i);
  assert.match(problemWithSalarySplit(300_000, -1, "Offer letter says so") ?? "", /negative/i);
  assert.match(problemWithSalarySplit(300_000, 0, " ") ?? "", /why/i);
});

test("a fee invoice is not drafted for a client with no billing address (16 Nov)", async () => {
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  const now = Date.now();
  const bare = repo.addClient({
    leadId: null,
    taClientId: "ta_c9",
    name: "NO ADDRESS CLIENT",
    nameKey: "no address client",
    stage: "active",
    billingName: "NO ADDRESS (PVT) LTD",
    billingEmail: "finance@bare.test",
    billingAddress: "",
    groupName: "",
    notes: "",
    reason: null,
    ownerId: "m_owner",
  });
  const placement = repo.addPlacement({
    placementTaId: "ta_p9",
    applicationTaId: "ta_a9",
    openingTaId: "ta_j9",
    positionId: null,
    clientId: bare.id,
    candidateName: "SAMPLE CANDIDATE NINE",
    state: "joined",
    monthlySalary: 100_000,
    basicSalary: 80_000,
    allowances: 20_000,
    package: "",
    currency: "LKR",
    offerLetterFileRef: "f_offer",
    joinDate: now,
    joinedAt: now,
    dojHistory: [],
    feeMonths: 1,
    feeBasis: "basic",
    isReplacementOf: null,
    invoiceId: null,
    reason: null,
    noShowChoice: null,
    ownerId: "m_owner",
  });
  const refused = await desk.draftFeeInvoice(placement.id, "m_owner", now);
  assert.equal(refused.ok, false);
  assert.match(refused.what, /billing address/);

  repo.patchClient(bare.id, { billingAddress: "2 Test Lane, Kandy" }, "m_owner", "client.detailsSaved");
  const ok = await desk.draftFeeInvoice(placement.id, "m_owner", now);
  assert.equal(ok.ok, true);
  const invoice = repo.all().invoices.find((i) => i.placementId === placement.id);
  assert.equal(invoice?.amount, 80_000, "fee on basic, not gross");
  assert.equal(invoice?.dueAt, now + 30 * DAY, "due from the joined day, not the sent day");
});
