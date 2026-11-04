/**
 * The numbers behind the work (15, Phase 7 step 16).
 *
 * The owner's own wish, from the start: "measure today's numbers" - how long
 * an agreement takes to come back, how long a client sits on a set, how often
 * a joining day slips, how long a position takes to fill. Not a dashboard:
 * four or five numbers that say whether this month was better than last.
 *
 * Two rules:
 *
 *   - **Only what we really know.** A number with two rows behind it is
 *     written as "2 so far", never dressed up as an average of nothing. Every
 *     measure carries its count.
 *   - **Nothing is invented from a gap.** A set nobody answered is not a
 *     zero-day wait; it is left out of the average and counted separately, so
 *     a slow month cannot look fast because the slowest clients never
 *     replied.
 *
 * Nothing here touches a database.
 */

const DAY = 86_400_000;

export interface Measure {
  key: string;
  what: string;
  /** The average, in days, or null when nothing has finished yet. */
  days: number | null;
  /** How many finished things the average is made of. */
  count: number;
  /** Things still waiting, which are deliberately not in the average. */
  waiting: number;
  /** A plain sentence, which is what the screen shows. */
  words: string;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function say(measure: Omit<Measure, "words">, unit = "days"): Measure {
  const words =
    measure.days === null
      ? "Nothing has finished yet" + (measure.waiting ? ", and " + measure.waiting + " are still running" : "")
      : measure.days +
        " " +
        unit +
        " on average, from " +
        measure.count +
        (measure.count === 1 ? " so far" : "") +
        (measure.waiting ? " · " + measure.waiting + " still waiting, and not in the average" : "");
  return { ...measure, words };
}

export interface NumbersInput {
  agreements: { sentAt: number | null; signedAt: number | null; state: string }[];
  clientSets: { receivedAt: number | null; candidates: { decidedAt?: number | null }[]; state: string }[];
  positions: { handedOverAt: number; closedAt: number | null; stage: string }[];
  placements: { joinDate: number | null; joinedAt: number | null; dojHistory: unknown[]; state: string }[];
  invoices: { sentAt: number | null; paidAt: number | null; state: string }[];
  guarantees: { state: string }[];
}

/** Every measure, in the order the work happens. */
export function numbersFrom(input: NumbersInput): Measure[] {
  // 1. How long an agreement takes to come back.
  const esaDays = input.agreements
    .filter((a) => a.sentAt && a.signedAt)
    .map((a) => (a.signedAt! - a.sentAt!) / DAY);
  const esaWaiting = input.agreements.filter((a) => a.sentAt && !a.signedAt && a.state !== "declined").length;

  // 2. How long a client sits on a set before saying anything.
  const waits = input.clientSets
    .filter((s) => s.receivedAt)
    .map((s) => {
      const first = s.candidates
        .map((c) => c.decidedAt ?? null)
        .filter((at): at is number => typeof at === "number")
        .sort((a, b) => a - b)[0];
      return first ? (first - s.receivedAt!) / DAY : null;
    });
  const answered = waits.filter((d): d is number => d !== null);
  const unanswered = waits.filter((d) => d === null).length;

  // 3. How long a position takes to fill, from the day TA got it.
  const filled = input.positions
    .filter((p) => p.closedAt && p.stage === "closed")
    .map((p) => (p.closedAt! - p.handedOverAt) / DAY);
  const openStill = input.positions.filter((p) => p.stage !== "closed").length;

  // 4. Joining days that slipped - a count, not an average, because one
  //    placement that moved three times is the thing to look at.
  const slipped = input.placements.filter((p) => p.dojHistory.length > 0).length;
  const joined = input.placements.filter((p) => p.state === "joined").length;

  // 5. How long the money takes.
  const paidDays = input.invoices.filter((i) => i.sentAt && i.paidAt).map((i) => (i.paidAt! - i.sentAt!) / DAY);
  const owing = input.invoices.filter((i) => i.sentAt && !i.paidAt && i.state !== "written_off").length;

  const guaranteesRunning = input.guarantees.filter((g) => g.state === "running" || g.state === "warned").length;
  const guaranteesLost = input.guarantees.filter(
    (g) => g.state === "replacing" || g.state === "refunded" || g.state === "void" || g.state === "replaced",
  ).length;

  return [
    say({
      key: "esa.returnDays",
      what: "An agreement, sent to signed",
      days: average(esaDays),
      count: esaDays.length,
      waiting: esaWaiting,
    }),
    say({
      key: "set.waitDays",
      what: "A client, set received to their first decision",
      days: average(answered),
      count: answered.length,
      waiting: unanswered,
    }),
    say({
      key: "position.fillDays",
      what: "A position, handed to TA until closed",
      days: average(filled),
      count: filled.length,
      waiting: openStill,
    }),
    say({
      key: "invoice.payDays",
      what: "An invoice, sent to paid",
      days: average(paidDays),
      count: paidDays.length,
      waiting: owing,
    }),
    {
      key: "doj.slipped",
      what: "Joining days that moved",
      days: null,
      count: slipped,
      waiting: joined,
      words:
        joined === 0
          ? "Nobody has joined yet"
          : slipped +
            " of " +
            joined +
            (joined === 1 ? " placement" : " placements") +
            " had the joining day moved at least once",
    },
    {
      key: "guarantee.kept",
      what: "Guarantees",
      days: null,
      count: guaranteesRunning,
      waiting: guaranteesLost,
      words:
        guaranteesRunning +
        (guaranteesRunning === 1 ? " running" : " running") +
        ", " +
        guaranteesLost +
        " where somebody left",
    },
  ];
}

/** The same numbers, as the lines a weekly KPI row keeps. */
export function numbersForReport(measures: Measure[]): { measure: string; value: number | null; count: number }[] {
  return measures.map((m) => ({ measure: m.key, value: m.days, count: m.count }));
}
