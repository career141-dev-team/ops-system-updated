/**
 * The last of the plan: TopJobs, the unreported hire, credit notes, the
 * exports and the numbers (15, Phase 3 step 12; Phase 6 steps 15 to 19;
 * Phase 7 step 16).
 *
 * Two of these spend or demand money, so they are the ones to be careful
 * with: an advert nobody ordered and a surcharge nobody checked are both
 * worse than doing nothing.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  AD_DAYS,
  AD_MEANINGS,
  AD_PRICES,
  type AdState,
  adClosesOn,
  adInWords,
  canMoveAdTo,
  problemWithAdLive,
  problemWithAdOrder,
  problemWithAdRequest,
  problemWithFlyer,
} from "@/lib/adverts";
import { csvCell, csvDate, invoiceDrift, invoicesCsv, paymentsCsv } from "@/lib/exports";
import { numbersFrom } from "@/lib/numbers";

const DAY = 86_400_000;
const MONDAY = Date.UTC(2026, 10, 9, 4, 30);

test("an advert is refused until it is something TopJobs can run", () => {
  assert.equal(problemWithAdRequest("Head of finance", "single"), null);
  assert.equal(problemWithAdRequest("Head of finance", "hr_and_marketing"), null);
  assert.match(problemWithAdRequest("", "single") ?? "", /Which position/);
  assert.match(problemWithAdRequest("Head of finance", "banner") ?? "", /single one, or the HR/);

  // TopJobs takes an image, not a JD - the owner's own note.
  assert.match(problemWithFlyer(null) ?? "", /image, not a job description/);
  assert.equal(problemWithFlyer("f_1"), null);

  // The order needs the flyer, somebody to send it to, and the price.
  assert.match(problemWithAdOrder(null, ["ads@topjobs.test"], 5400) ?? "", /image, not a job/);
  assert.match(problemWithAdOrder("f_1", [], 5400) ?? "", /Who at TopJobs/);
  assert.match(problemWithAdOrder("f_1", ["ads@topjobs.test"], 0) ?? "", /What are they charging/);
  assert.equal(problemWithAdOrder("f_1", ["ads@topjobs.test"], 5400), null);
  // The board's own prices are written down, not invented.
  assert.equal(AD_PRICES.single, 5_400);
  assert.equal(AD_PRICES.hr_and_marketing, 12_700);
});

test("two weeks from the day TopJobs made it live, and only forwards", () => {
  assert.equal(adClosesOn(MONDAY), MONDAY + 14 * DAY);
  assert.equal(AD_DAYS, 14);
  assert.equal(problemWithAdLive(MONDAY, MONDAY - DAY, MONDAY + DAY), null);
  assert.match(problemWithAdLive(NaN, null) ?? "", /day TopJobs made it live/);
  assert.match(problemWithAdLive(MONDAY + 5 * DAY, null, MONDAY) ?? "", /in the future/);
  assert.match(problemWithAdLive(MONDAY, MONDAY + 5 * DAY, MONDAY + 6 * DAY) ?? "", /before it was ordered/);

  assert.equal(canMoveAdTo("requested", "flyer"), true);
  assert.equal(canMoveAdTo("flyer", "ordered"), true);
  assert.equal(canMoveAdTo("ordered", "live"), true);
  assert.equal(canMoveAdTo("live", "closed"), true);
  assert.equal(canMoveAdTo("live", "dropped"), false, "a live advert is closed, not dropped");
  assert.equal(canMoveAdTo("closed", "live"), false);
  for (const state of ["requested", "flyer", "ordered", "live", "closed", "dropped"]) {
    assert(AD_MEANINGS[state as AdState], state + " has no wording");
  }
});

test("the line about an advert says the money and the CVs", () => {
  const live = { state: "live", liveAt: MONDAY, closesAt: MONDAY + 14 * DAY, cost: 5400, cvCount: null };
  assert.match(adInWords(live, MONDAY + 4 * DAY), /10 days left/);
  assert.match(adInWords(live, MONDAY + 4 * DAY), /LKR 5,400/);
  assert.match(adInWords(live, MONDAY + 20 * DAY), /due to come down/);
  // The CV count is what judges the next one, so it is in the line.
  assert.match(adInWords({ ...live, state: "closed", cvCount: 23 }, MONDAY), /23 CVs/);
  assert.match(adInWords({ ...live, state: "closed", cvCount: 1 }, MONDAY), /1 CV\b/);
});

test("a CSV cell cannot break the file or run in a spreadsheet", () => {
  assert.equal(csvCell('SMITH & CO, "PVT"'), '"SMITH & CO, ""PVT"""');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(1234.5), '"1234.5"');
  // A cell starting with = is a formula in Excel: that is a hole, not a cell.
  assert.equal(csvCell("=1+1"), "\"'=1+1\"");
  assert.equal(csvCell("-5"), "\"'-5\"");
  assert.equal(csvDate(MONDAY), "2026-11-09");
  assert.equal(csvDate(null), "");

  const csv = invoicesCsv([
    {
      number: "C141-2026-0001",
      kind: "fee",
      state: "paid",
      about: null,
      clientName: "SMITH & CO, PVT",
      candidateName: "SAMPLE CANDIDATE",
      amount: 450_000,
      lateCharge: 0,
      paid: 450_000,
      balance: 0,
      currency: "LKR",
      sentAt: MONDAY,
      dueAt: MONDAY + 30 * DAY,
      paidAt: MONDAY + 20 * DAY,
      writtenOffAt: null,
      disputed: false,
    },
  ]);
  const lines = csv.trim().split("\r\n");
  assert.equal(lines.length, 2, "a header and one row");
  assert.match(lines[0], /^"invoice","kind"/);
  assert.match(lines[1], /"SMITH & CO, PVT"/);

  const payments = paymentsCsv([
    {
      invoiceNumber: "C141-2026-0001",
      clientName: "SMITH & CO",
      amount: 200_000,
      currency: "LKR",
      paidAt: MONDAY,
      method: "bank transfer",
      recordedBy: "Sample Accounts",
      note: null,
    },
  ]);
  assert.match(payments, /bank transfer/);
});

test("drift is only what it really is: a sent invoice TA was never told about", () => {
  const sent = { id: "inv_1", number: "C141-2026-0001", state: "sent", sentAt: MONDAY, placementId: "plc_1" };
  // Told, and it went: no drift.
  assert.deepEqual(
    invoiceDrift([sent], [{ path: "/x/invoice-state", state: "sent", subjectType: "invoice", subjectId: "inv_1" }]),
    [],
  );
  // Told, but stuck in the outbox.
  const stuck = invoiceDrift([sent], [
    { path: "/x/invoice-state", state: "queued", subjectType: "invoice", subjectId: "inv_1" },
  ]);
  assert.match(stuck[0]?.what ?? "", /still queued/);
  // Never told at all.
  assert.match(invoiceDrift([sent], [])[0]?.what ?? "", /never told/);
  // A draft is not drift, and a surcharge has no placement to tell TA about.
  assert.deepEqual(invoiceDrift([{ ...sent, sentAt: null }], []), []);
  assert.deepEqual(invoiceDrift([{ ...sent, placementId: null }], []), []);
});

test("the numbers say what they are made of, and leave the waiting out", () => {
  const measures = numbersFrom({
    agreements: [
      { sentAt: MONDAY, signedAt: MONDAY + 4 * DAY, state: "countersigned" },
      { sentAt: MONDAY, signedAt: MONDAY + 6 * DAY, state: "countersigned" },
      // Sent and never signed: waiting, and not an average of zero days.
      { sentAt: MONDAY, signedAt: null, state: "chasing" },
    ],
    clientSets: [
      { receivedAt: MONDAY, candidates: [{ decidedAt: MONDAY + 2 * DAY }, { decidedAt: MONDAY + 5 * DAY }], state: "sent" },
      { receivedAt: MONDAY, candidates: [{ decidedAt: null }], state: "sent" },
    ],
    positions: [
      { handedOverAt: MONDAY, closedAt: MONDAY + 30 * DAY, stage: "closed" },
      { handedOverAt: MONDAY, closedAt: null, stage: "searching" },
    ],
    placements: [
      { joinDate: MONDAY, joinedAt: MONDAY, dojHistory: [{}], state: "joined" },
      { joinDate: MONDAY, joinedAt: MONDAY, dojHistory: [], state: "joined" },
    ],
    invoices: [
      { sentAt: MONDAY, paidAt: MONDAY + 25 * DAY, state: "paid" },
      { sentAt: MONDAY, paidAt: null, state: "sent" },
    ],
    guarantees: [{ state: "running" }, { state: "replacing" }],
  });

  const esa = measures.find((m) => m.key === "esa.returnDays");
  assert.equal(esa?.days, 5, "the average of four and six days");
  assert.equal(esa?.count, 2);
  assert.equal(esa?.waiting, 1);
  assert.match(esa?.words ?? "", /5 days on average, from 2/);
  assert.match(esa?.words ?? "", /1 still waiting/);

  // The client's wait is to their *first* decision, and the set nobody
  // answered is counted separately rather than as a fast one.
  const wait = measures.find((m) => m.key === "set.waitDays");
  assert.equal(wait?.days, 2);
  assert.equal(wait?.waiting, 1);

  assert.equal(measures.find((m) => m.key === "position.fillDays")?.days, 30);
  assert.equal(measures.find((m) => m.key === "invoice.payDays")?.days, 25);
  assert.match(measures.find((m) => m.key === "doj.slipped")?.words ?? "", /1 of 2 placements/);
  assert.match(measures.find((m) => m.key === "guarantee.kept")?.words ?? "", /1 running, 1 where somebody left/);

  // Nothing finished at all says so, rather than showing a zero.
  const empty = numbersFrom({
    agreements: [],
    clientSets: [],
    positions: [],
    placements: [],
    invoices: [],
    guarantees: [],
  });
  assert.match(empty[0].words, /Nothing has finished yet/);
});

test("an advert, a surcharge and a credit note, end to end", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-balance-"));
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
    groupName: "",
    notes: "",
    reason: null,
    ownerId: "m_owner",
  });
  const position = repo.addPosition({
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
    handedOverAt: now - 30 * DAY,
    closedAt: null,
    ownerId: "m_owner",
  });

  // The advert's own clock: two weeks, and the task it leaves.
  const ad = repo.addAd({
    channel: "topjobs",
    openingTaId: "ta_j1",
    positionId: position.id,
    clientId: client.id,
    title: "Head of finance",
    state: "live",
    kind: "single",
    cost: 5400,
    flyerFileId: "f_1",
    applyAlias: "apply-finance@example.test",
    orderMessageId: null,
    requestedAt: now - 20 * DAY,
    orderedAt: now - 18 * DAY,
    liveAt: now - 14 * DAY,
    closesAt: now,
    closedAt: null,
    cvCount: null,
    reason: null,
    ownerId: "m_owner",
  });
  await desk.askAboutClosingAd(ad.id, now);
  assert.match(repo.all().tasks.find((t) => t.subjectId === ad.id)?.title ?? "", /two weeks old/);

  // The unreported hire: the clock asks, and asks nobody for money.
  const set = await desk.takeClientSetReady({ openingId: "ta_j1", setNumber: 1 }, now - 95 * DAY);
  assert(set, "a set to ask about");
  repo.patchClientSet(set.id, { state: "sent", sentAt: now - 95 * DAY, receivedAt: now - 95 * DAY }, "m_owner", "clientSet.sent", null);
  await desk.askAboutUnreportedHire(set.id, now);
  const asked = repo.all().tasks.find((t) => t.title.startsWith("Three months on"));
  assert.match(asked?.body ?? "", /Nobody is invoiced by a clock/);
  assert.equal(repo.all().invoices.length, 0, "and nothing is invoiced yet");

  // Confirmed: 50% of one month, from the salary a person typed in.
  const surcharge = await desk.draftSurchargeInvoice(set.id, "SAMPLE CANDIDATE TWO", 400_000, "m_owner", now);
  assert.equal(surcharge.ok, true);
  const invoice = repo.all().invoices[0];
  assert.equal(invoice.kind, "surcharge");
  assert.equal(invoice.amount, 200_000, "half of one month of 400,000");
  assert.equal(invoice.state, "draft", "accounts reads it first");
  assert.match(invoice.about ?? "", /hired without our being told/);

  // Twice is refused: one surcharge per set.
  const again = await desk.draftSurchargeInvoice(set.id, "SAMPLE CANDIDATE TWO", 400_000, "m_owner", now);
  assert.equal(again.ok, false);
  assert.equal(repo.all().invoices.length, 1);

  // A credit note against it, which is its own document.
  const note = await desk.draftCreditNote(invoice.id, 100_000, "Half agreed with the client.", "m_accounts", now);
  assert.equal(note.ok, true);
  const credit = repo.all().invoices.find((i) => i.kind === "credit_note");
  assert.equal(credit?.againstInvoiceId, invoice.id);
  assert.match(credit?.number ?? "", /-CN$/);
  assert.equal(credit?.dueAt, null, "a credit note is not owed by anybody");
});
