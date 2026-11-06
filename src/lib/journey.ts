/**
 * Where every piece of work is, on one line (24, section 12).
 *
 * The owner's point on 5 November: the TA System's screens follow how a TA
 * works, and Ops's followed what things *are* - clients here, the search
 * there, money somewhere else. That is a filing cabinet. The work itself runs
 * one way, from an enquiry to a closed position, and a person should see it
 * that way.
 *
 * So this file does one thing: given the rows, it says which stage each lead
 * and each position is in. The screen draws them in order. Nothing here
 * touches a database, and no screen is allowed to decide a stage itself -
 * two places deciding would be two answers.
 */

export interface Stage {
  key: string;
  what: string;
  /** One line: what this stage is, in the desk's own words. */
  about: string;
}

export const STAGES: Stage[] = [
  { key: "enquiry", what: "Enquiry", about: "Somebody asked. Are they already ours, and may we work for them?" },
  { key: "intro", what: "Intro call", about: "The call that turns an enquiry into a client" },
  { key: "agreement", what: "Agreement", about: "Sent, chased by its own clock, signed and countersigned" },
  { key: "requirement", what: "Requirement", about: "The meeting, and the six fields TA needs" },
  { key: "with_ta", what: "With the TA System", about: "Theirs to search. Nothing of ours runs until a set is ready" },
  { key: "with_client", what: "With the client", about: "CVs are with them. The clocks are ours again" },
  { key: "interviews", what: "Interviews", about: "Times, the invite, who turned up, and what they decided" },
  { key: "joining", what: "Offer and joining", about: "Placed, not started. The joining day is the one that matters" },
  { key: "money", what: "The money", about: "Invoiced, and chased until it is paid" },
  { key: "guarantee", what: "Guarantee", about: "Ninety days from joining, on a fee that is fully paid" },
  { key: "closed", what: "Closed", about: "Ended, with every item on the close list ticked" },
];

export const STAGE_KEYS = STAGES.map((stage) => stage.key);

/* ── Which stage a lead is in ───────────────────────────────────── */

export interface LeadForStage {
  state: string;
  clientTaId: string | null;
  industryFlagged: boolean;
  industryConfirmedBy: string | null;
}

export function stageOfLead(
  lead: LeadForStage,
  parts: { heldIntro: boolean; esaState: string | null },
): string {
  if (lead.state.startsWith("closed") || lead.state === "declined_industry") return "closed";
  // The agreement outranks the meeting: a lead whose agreement is out is not
  // waiting for a call, whatever its own state field says.
  if (parts.esaState && parts.esaState !== "countersigned") return "agreement";
  if (parts.esaState === "countersigned") return "requirement";
  if (parts.heldIntro) return "agreement";
  if (!lead.clientTaId || (lead.industryFlagged && !lead.industryConfirmedBy)) return "enquiry";
  return "intro";
}

/* ── Which stage a position is in ───────────────────────────────── */

export interface PositionForStage {
  stage: string;
  openingTaId: string | null;
}

export function stageOfPosition(
  position: PositionForStage,
  parts: {
    /** A set that has gone to the client and has answers outstanding. */
    setWithClient: boolean;
    liveInterview: boolean;
    placement: { joinedAt: number | null; state: string } | null;
    invoiceOwing: boolean;
    guaranteeRunning: boolean;
    closed: boolean;
  },
): string {
  if (parts.closed || position.stage === "closed") return "closed";
  // Backwards from the end: the furthest a position has got is where it is.
  // Reading forwards puts a placed candidate back in "with the client"
  // because an old set is still sitting there unanswered.
  if (parts.guaranteeRunning) return "guarantee";
  if (parts.invoiceOwing) return "money";
  if (parts.placement && !parts.placement.joinedAt) return "joining";
  if (parts.placement?.joinedAt) return "money";
  if (parts.liveInterview) return "interviews";
  if (parts.setWithClient) return "with_client";
  return "with_ta";
}

/* ── A row on the board ─────────────────────────────────────────── */

export interface JourneyRow {
  id: string;
  href: string;
  /** The client, and what they asked for. */
  title: string;
  under: string;
  stage: string;
  /** What is waiting and on whom: the thing's own sentence. */
  waiting: string;
  /** When it last moved, so a stuck one is obvious. */
  since: number;
  ownerId: string;
  late: boolean;
}

/** Late first, then the one that has sat longest. */
export function sortForBoard(rows: JourneyRow[]): JourneyRow[] {
  return [...rows].sort((a, b) => (a.late === b.late ? a.since - b.since : a.late ? -1 : 1));
}

export function rowsInStage(rows: JourneyRow[], stage: string): JourneyRow[] {
  return sortForBoard(rows.filter((row) => row.stage === stage));
}

/** How long it has sat here, in the words the board shows. */
export function sittingFor(since: number, now: number): string {
  const days = Math.floor((now - since) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 7) return days + " days";
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week" : weeks + " weeks";
}
