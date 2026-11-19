import type { OpsCloseChecklist, OpsGuarantee, OpsInvoice, OpsPlacement, OpsPosition } from "@/data/types";

/**
 * The Placements sample (18 Nov, the owner: test Placements on a laptop with realistic values), loaded with the
 * Openings sample from /dev/ta.
 *
 * One placed job for each state the Placements, Invoices, Guarantees and Closes pages draw: an offer, joining,
 * a join day gone by, a no-show, one that fell through, and after joining every invoice state (draft, sent,
 * overdue with a late charge, part-paid, disputed, paid, written off, a credit note) and every guarantee state
 * (running, warned, ended clean, replacing, refund to decide, refunded, void). Names are invented, ids start
 * `smp_` (Ops) and `ta_smp_` (TA), invoice numbers `SMP-`, so none of it can be mistaken for, or numbered like,
 * a real invoice. No bank details are written: put test ones in Settings to draft an invoice PDF.
 */

const DAY = 86_400_000;
const P = "smp_";

/** The companies are the Openings sample's (src/data/sampleOpenings.ts). */
type Company = "meridian" | "harbour" | "kelani" | "bluewater" | "sunrise";

interface Job {
  n: number;
  company: Company;
  title: string;
  candidate: string;
  salary: number;
  /** Days from now to the join date (negative = in the past); null = no date yet. */
  joinIn: number | null;
  offerLetter: boolean;
  placement: "placed" | "joined" | "no_show" | "cancelled";
  invoice?: { state: string; paidShare?: number; lateMonths?: number; disputed?: string; writtenOff?: boolean };
  guarantee?: { state: string; paid: boolean; leftDaysAgo?: number; refundPct?: number };
  close?: "open" | "done";
  replacementOf?: number;
  movedOnce?: boolean;
}

/** One job per state. `joinIn` is days from now; a joined job joined on that day. */
const JOBS: Job[] = [
  { n: 7, company: "harbour", title: "Warehouse Manager", candidate: "Chathura Perera", salary: 320_000, joinIn: null, offerLetter: false, placement: "placed" },
  { n: 8, company: "meridian", title: "Quality Assurance Lead", candidate: "Nimesha Fernando", salary: 280_000, joinIn: 5, offerLetter: true, placement: "placed", movedOnce: true },
  { n: 9, company: "kelani", title: "Production Manager", candidate: "Sanjeewa Kumara", salary: 350_000, joinIn: -2, offerLetter: true, placement: "placed" },
  { n: 10, company: "sunrise", title: "Maintenance Engineer", candidate: "Isuru Jayalath", salary: 240_000, joinIn: -3, offerLetter: true, placement: "no_show" },
  { n: 11, company: "bluewater", title: "Executive Chef", candidate: "Dilan Mendis", salary: 400_000, joinIn: 12, offerLetter: true, placement: "cancelled" },
  { n: 12, company: "meridian", title: "Sales Manager", candidate: "Harsha Wijeratne", salary: 300_000, joinIn: -1, offerLetter: true, placement: "joined", invoice: { state: "draft" }, guarantee: { state: "running", paid: false } },
  { n: 13, company: "meridian", title: "Brand Manager", candidate: "Yasodha Ranatunga", salary: 260_000, joinIn: -20, offerLetter: true, placement: "joined", invoice: { state: "sent" }, guarantee: { state: "running", paid: false } },
  { n: 14, company: "harbour", title: "HR Manager", candidate: "Gayani Samarasinghe", salary: 330_000, joinIn: -65, offerLetter: true, placement: "joined", invoice: { state: "sent", lateMonths: 1 }, guarantee: { state: "running", paid: false } },
  { n: 15, company: "kelani", title: "Finance Controller", candidate: "Mahesh Gunasekara", salary: 420_000, joinIn: -40, offerLetter: true, placement: "joined", invoice: { state: "partly_paid", paidShare: 0.5 }, guarantee: { state: "running", paid: false } },
  { n: 16, company: "sunrise", title: "Plant Manager", candidate: "Rangana Herath", salary: 450_000, joinIn: -35, offerLetter: true, placement: "joined", invoice: { state: "sent", disputed: "They say the fee should be on basic, not gross." }, guarantee: { state: "running", paid: false } },
  { n: 17, company: "bluewater", title: "Revenue Manager", candidate: "Tharushi Abeyratne", salary: 290_000, joinIn: -80, offerLetter: true, placement: "joined", invoice: { state: "paid" }, guarantee: { state: "warned", paid: true } },
  { n: 18, company: "meridian", title: "IT Manager", candidate: "Kosala Rajapaksha", salary: 380_000, joinIn: -100, offerLetter: true, placement: "joined", invoice: { state: "paid" }, guarantee: { state: "ended_clean", paid: true }, close: "open" },
  { n: 19, company: "harbour", title: "Fleet Supervisor", candidate: "Pubudu Wickramasinghe", salary: 210_000, joinIn: -30, offerLetter: true, placement: "joined", invoice: { state: "paid" }, guarantee: { state: "replacing", paid: true, leftDaysAgo: 10 } },
  { n: 20, company: "harbour", title: "Fleet Supervisor", candidate: "Charith Dissanayake", salary: 210_000, joinIn: 9, offerLetter: true, placement: "placed", replacementOf: 19 },
  { n: 21, company: "kelani", title: "Quality Manager", candidate: "Shehani Liyanage", salary: 310_000, joinIn: -150, offerLetter: true, placement: "joined", invoice: { state: "paid" }, guarantee: { state: "refund_pending", paid: true, leftDaysAgo: 100 } },
  { n: 22, company: "sunrise", title: "Sales Executive", candidate: "Lakmal Senaratne", salary: 180_000, joinIn: -160, offerLetter: true, placement: "joined", invoice: { state: "paid" }, guarantee: { state: "refunded", paid: true, leftDaysAgo: 110, refundPct: 25 } },
  { n: 23, company: "bluewater", title: "Accountant", candidate: "Nadeeka Kariyawasam", salary: 200_000, joinIn: -130, offerLetter: true, placement: "joined", invoice: { state: "written_off", writtenOff: true }, guarantee: { state: "void", paid: false }, close: "open" },
  // 19 Nov: the guarantee that ended in a replacement (24 left, 25 replaced them), and an invoice old enough to be a write-off candidate (26).
  { n: 24, company: "meridian", title: "Packing Supervisor", candidate: "Sandun Weerakoon", salary: 190_000, joinIn: -70, offerLetter: true, placement: "joined", invoice: { state: "paid" }, guarantee: { state: "replaced", paid: true, leftDaysAgo: 40 } },
  { n: 25, company: "meridian", title: "Packing Supervisor", candidate: "Oshadi Ratnayake", salary: 190_000, joinIn: -8, offerLetter: true, placement: "joined", guarantee: { state: "running", paid: true }, replacementOf: 24 },
  { n: 26, company: "sunrise", title: "Cashier Supervisor", candidate: "Janaka Mudalige", salary: 170_000, joinIn: -150, offerLetter: true, placement: "joined", invoice: { state: "sent", lateMonths: 3 }, guarantee: { state: "void", paid: false } },
];

export const SAMPLE_JOB_NUMBERS = JOBS.map((j) => j.n);

/** What the stand-in TA answers for these jobs: the openings, each with its one placed candidate, and the placements. */
export const SAMPLE_TA_MONEY = {
  openings: JOBS.map((j) => ({
    id: "ta_smp_j" + j.n,
    title: j.title,
    clientId: "ta_smp_c_" + j.company,
    status: j.placement === "cancelled" || j.close ? "closed" : "open",
    primaryRecruiterId: "ta_u2",
    taLeadId: "ta_u1",
    headcount: 1,
    assignedAt: Date.UTC(2026, 6, 1),
  })),
  pipelines: Object.fromEntries(
    JOBS.map((j) => [
      "ta_smp_j" + j.n,
      [{ id: "ta_smp_a" + (100 + j.n), candidateName: j.candidate, currentStage: j.placement === "cancelled" ? "rejected" : "offer", setNumber: 1, backupForApplicationId: null }],
    ]),
  ) as Record<string, { id: string; candidateName: string; currentStage: string; setNumber: number | null; backupForApplicationId: null }[]>,
  /** TA's placement record, the shape `takePlacement` reads. Dated from `now` when asked. */
  placement(placementTaId: string, now = Date.now()) {
    const j = JOBS.find((one) => "ta_smp_p" + one.n === placementTaId);
    if (!j) return null;
    return {
      id: placementTaId,
      applicationId: "ta_smp_a" + (100 + j.n),
      openingId: "ta_smp_j" + j.n,
      clientId: "ta_smp_c_" + j.company,
      candidateName: j.candidate,
      placedSalary: j.salary,
      currency: "LKR",
      salaryBasis: "gross",
      package: "LKR " + j.salary.toLocaleString("en-GB") + " a month, gross",
      offerLetterFileId: j.offerLetter ? "ta_smp_offer_" + j.n : null,
      joinDateMs: j.joinIn === null ? null : startOfDay(now + j.joinIn * DAY),
      joinConfirmedAt: j.placement === "joined" ? startOfDay(now + (j.joinIn ?? 0) * DAY) : null,
      fellThroughAt: j.placement === "cancelled" ? now - 2 * DAY : null,
      fellThroughReason: j.placement === "cancelled" ? "Took a counter-offer from the current employer." : null,
    };
  },
};

/** 09:00 Colombo on that day, as joining days are kept. */
function startOfDay(at: number): number {
  const colombo = new Date(at + 5.5 * 3_600_000);
  return Date.UTC(colombo.getUTCFullYear(), colombo.getUTCMonth(), colombo.getUTCDate(), 3, 30);
}

export interface PlacementSampleRows {
  positions: OpsPosition[];
  placements: OpsPlacement[];
  invoices: OpsInvoice[];
  guarantees: OpsGuarantee[];
  closeChecklists: OpsCloseChecklist[];
}

/** The fee rule each sample company signed (the Openings sample's agreements carry the same). */
export const SAMPLE_FEE_RULES: Record<Company, { feeMonths: number; feeBasis: string }> = {
  meridian: { feeMonths: 1, feeBasis: "gross" },
  harbour: { feeMonths: 1, feeBasis: "basic" },
  kelani: { feeMonths: 1, feeBasis: "gross" },
  bluewater: { feeMonths: 1, feeBasis: "gross" },
  sunrise: { feeMonths: 2, feeBasis: "gross" },
};

/** The Ops rows for the jobs, owned by `ownerId`, dated around `now`. Pure: the same `now` gives the same rows. */
export function samplePlacements(now: number, ownerId: string): PlacementSampleRows {
  const rows: PlacementSampleRows = { positions: [], placements: [], invoices: [], guarantees: [], closeChecklists: [] };
  const guaranteeDays = 90;
  const dueDays = 30;
  let invoiceNo = 0;

  for (const j of JOBS) {
    const openingTaId = "ta_smp_j" + j.n;
    const positionId = P + "pos_" + j.n;
    const placementId = P + "pl_" + j.n;
    const clientId = P + "cl_" + j.company;
    const rule = SAMPLE_FEE_RULES[j.company];
    const joinDate = j.joinIn === null ? null : startOfDay(now + j.joinIn * DAY);
    const joinedAt = j.placement === "joined" ? joinDate : null;
    // Basic is 80% of gross in the sample, so a fee "on basic" really differs.
    const basic = Math.round(j.salary * 0.8);
    const fee = rule.feeMonths * (rule.feeBasis === "basic" ? basic : j.salary);
    const placedAt = (joinDate ?? now) - 20 * DAY;
    const closed = j.placement === "cancelled" || j.close === "open" || j.close === "done";

    rows.positions.push({
      id: positionId,
      requirementId: null,
      clientId,
      clientTaId: "ta_smp_c_" + j.company,
      openingTaId,
      title: j.title,
      stage: closed ? "closed" : "placed",
      primaryTaId: "ta_u2",
      hundredPercentDay: "Tuesday",
      taStatus: closed ? "Closed" : "Placed",
      jdApprovedAt: placedAt - 30 * DAY,
      linkedInUrl: j.n % 2 === 0 ? "https://www.linkedin.com/jobs/view/" + (4200000000 + j.n) : null,
      linkedInPostedAt: j.n % 2 === 0 ? placedAt - 28 * DAY : null,
      depthStage: null,
      shortlistedTotal: null,
      pendingCount: null,
      depthCheckedAt: null,
      handedOverAt: placedAt - 31 * DAY,
      closedAt: j.placement === "cancelled" ? now - 2 * DAY : null,
      ownerId,
      createdAt: placedAt - 31 * DAY,
      updatedAt: now - DAY,
    } as OpsPosition);

    let invoiceId: string | null = null;
    if (j.invoice && joinedAt) {
      invoiceId = P + "inv_" + j.n;
      invoiceNo += 1;
      const sent = j.invoice.state !== "draft";
      const dueAt = joinedAt + dueDays * DAY;
      const late = j.invoice.lateMonths ?? 0;
      const lateCharge = Math.round(fee * (Math.pow(1.05, late) - 1) * 100) / 100;
      const paidInFull = j.invoice.state === "paid";
      const paidAt = paidInFull ? joinedAt + 25 * DAY : null;
      const payments = paidInFull
        ? [{ amount: fee, paidAt: paidAt!, method: "bank transfer", by: ownerId, note: "Ref SMP-TT-" + j.n }]
        : j.invoice.paidShare
          ? [{ amount: Math.round(fee * j.invoice.paidShare), paidAt: joinedAt + 28 * DAY, method: "bank transfer", by: ownerId, note: "Ref SMP-TT-" + j.n + " · first half" }]
          : [];
      rows.invoices.push({
        id: invoiceId,
        number: "SMP-2026-" + String(invoiceNo).padStart(4, "0"),
        kind: "fee",
        placementId,
        about: null,
        setId: null,
        againstInvoiceId: null,
        clientId,
        state: j.invoice.state,
        amount: fee,
        currency: "LKR",
        lateCharge,
        lateMonths: late,
        disputed: Boolean(j.invoice.disputed),
        disputedReason: j.invoice.disputed ?? null,
        payments,
        sentAt: sent ? joinedAt + DAY : null,
        sentMessageId: null,
        dueAt,
        paidAt,
        writtenOffAt: j.invoice.writtenOff ? now - 5 * DAY : null,
        reason: j.invoice.writtenOff ? "The client went into administration; nothing will be recovered." : null,
        ownerId,
        createdAt: joinedAt,
        updatedAt: now - DAY,
      });
    }

    rows.placements.push({
      id: placementId,
      placementTaId: "ta_smp_p" + j.n,
      applicationTaId: "ta_smp_a" + (100 + j.n),
      openingTaId,
      positionId,
      clientId,
      candidateName: j.candidate,
      state: j.placement,
      monthlySalary: j.salary,
      basicSalary: basic,
      allowances: j.salary - basic,
      package: "LKR " + j.salary.toLocaleString("en-GB") + " a month, gross",
      currency: "LKR",
      offerLetterFileRef: j.offerLetter ? "ta_smp_offer_" + j.n : null,
      joinDate,
      joinedAt,
      dojHistory: j.movedOnce && joinDate ? [{ from: joinDate - 7 * DAY, to: joinDate, reason: "Serving a longer notice than expected.", at: now - 4 * DAY, by: ownerId }] : [],
      feeMonths: rule.feeMonths,
      feeBasis: rule.feeBasis,
      isReplacementOf: j.replacementOf ? P + "pl_" + j.replacementOf : null,
      invoiceId,
      reason: j.placement === "cancelled" ? "Took a counter-offer from the current employer." : j.placement === "no_show" ? "Did not turn up and is not answering the phone." : null,
      noShowChoice: null,
      ownerId,
      createdAt: placedAt,
      updatedAt: now - DAY,
    });

    if (j.guarantee && joinedAt) {
      const g = j.guarantee;
      const leftAt = g.leftDaysAgo !== undefined ? now - g.leftDaysAgo * DAY : null;
      const refunded = g.state === "refunded";
      rows.guarantees.push({
        id: P + "g_" + j.n,
        placementId,
        openingTaId,
        clientId,
        candidateName: j.candidate,
        state: g.state,
        startsAt: joinedAt,
        endsAt: joinedAt + guaranteeDays * DAY,
        feePaidAt: g.paid ? joinedAt + 25 * DAY : null,
        leftAt,
        reason: leftAt ? "Resigned for a role abroad." : g.state === "void" ? (j.invoice?.writtenOff ? "The fee was written off." : "The fee was not paid in full.") : null,
        // Sixty working days is about twelve weeks.
        deadlineAt: leftAt ? leftAt + 84 * DAY : null,
        replacedByPlacementId: j.n === 19 ? P + "pl_20" : j.n === 24 ? P + "pl_25" : null,
        refundPct: refunded ? (g.refundPct ?? 25) : null,
        refundAmount: refunded ? Math.round(fee * ((g.refundPct ?? 25) / 100)) : null,
        decidedBy: refunded ? ownerId : null,
        decidedAt: refunded ? now - 10 * DAY : null,
        ownerId,
        createdAt: joinedAt,
        updatedAt: now - DAY,
      });
      if (refunded) {
        invoiceNo += 1;
        rows.invoices.push({
          id: P + "cn_" + j.n,
          number: "SMP-2026-" + String(invoiceNo).padStart(4, "0") + "-CN",
          kind: "credit_note",
          placementId,
          about: "Refund under the guarantee: " + j.candidate + " left and was not replaced in time.",
          setId: null,
          againstInvoiceId: invoiceId,
          clientId,
          state: "sent",
          amount: Math.round(fee * ((g.refundPct ?? 25) / 100)),
          currency: "LKR",
          lateCharge: 0,
          lateMonths: 0,
          disputed: false,
          disputedReason: null,
          payments: [],
          sentAt: now - 9 * DAY,
          sentMessageId: null,
          dueAt: null,
          paidAt: null,
          writtenOffAt: null,
          reason: "Refund under the guarantee.",
          ownerId,
          createdAt: now - 10 * DAY,
          updatedAt: now - 9 * DAY,
        });
      }
    }

    if (j.close) {
      const linkedIn = j.n % 2 === 0;
      rows.closeChecklists.push({
        id: P + "close_" + j.n,
        openingTaId,
        positionId,
        clientId,
        trigger: j.guarantee?.state === "void" ? "written_off" : "ended_clean",
        // The first item done, the rest waiting: the opening closes last.
        items: [
          ...(linkedIn ? [{ key: "linkedin", what: "Close the LinkedIn post", whose: "ta" }] : []),
          { key: "opening", what: "Close the opening in the TA System", whose: "ops" },
          { key: "lead", what: "Close the lead, if nothing else is open for this client", whose: "ops" },
          { key: "group", what: "Tell the client's WhatsApp group it is closed", whose: "ops" },
        ].map((item, i) => ({ ...item, doneAt: i === 0 && item.key !== "opening" ? now - DAY : null, doneBy: i === 0 && item.key !== "opening" ? ownerId : null })),
        completedAt: null,
        ownerId,
        createdAt: now - 3 * DAY,
        updatedAt: now - DAY,
      });
    }
  }

  // A surcharge for a hire the client did not report, drafted from Ceylon Harbour's sent set.
  invoiceNo += 1;
  rows.invoices.push({
    id: P + "sur_1",
    number: "SMP-2026-" + String(invoiceNo).padStart(4, "0"),
    kind: "surcharge",
    placementId: null,
    about: "Dinuka Herath (Operations Lead), hired without our being told - 50% of one month's basic of LKR 300,000",
    setId: P + "set_3_1",
    againstInvoiceId: null,
    clientId: P + "cl_harbour",
    state: "draft",
    amount: 120_000,
    currency: "LKR",
    lateCharge: 0,
    lateMonths: 0,
    disputed: false,
    disputedReason: null,
    payments: [],
    sentAt: null,
    sentMessageId: null,
    dueAt: now + 30 * DAY,
    paidAt: null,
    writtenOffAt: null,
    reason: null,
    ownerId,
    createdAt: now - DAY,
    updatedAt: now - DAY,
  });

  return rows;
}
