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
  // One stage, not three (supervisor review, 17 Nov): searching, sets with the
  // client and interviews repeat in a loop until the position is filled, and
  // can run at the same time, so they are one stage with a summary of the loop.
  {
    key: "in_search",
    what: "Search & interviews",
    about: "Searching, CV sets with the client and interviews - they repeat until the role is filled",
  },
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
  // Signed by the client is enough to move on to the requirement; the countersignature follows in the background.
  if (parts.esaState === "signed" || parts.esaState === "countersigned") return "requirement";
  if (parts.esaState) return "agreement";
  // A client we already had skips the intro call (the enquiry's routing says where they are).
  if (lead.state === "requirement") return "requirement";
  if (lead.state === "waiting_agreement" || parts.heldIntro) return "agreement";
  // The enquiry is done once the TA check was answered, as the lead page decides it. A new client has
  // no TA id until its agreement is countersigned, so the id alone kept every new client in Enquiry.
  if ((lead.state === "new" && !lead.clientTaId) || (lead.industryFlagged && !lead.industryConfirmedBy)) return "enquiry";
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
  return "in_search";
}

/* ── The loop on one opening: search, sets, interviews ──────────── */

export interface LoopSummary {
  /** What is holding the loop right now: TA's search, the client's answer, or an interview. */
  waitingOn: "ta" | "client" | "interview";
  setsSent: number;
  shortlisted: number;
  interviewed: number;
  toInterview: number;
  /** One line for a card: "Search active · 2 sets · 5 shortlisted · 2 interviewed · 1 to interview". */
  line: string;
}

const LIVE_INTERVIEW = ["slots", "agreed", "booked", "reconfirmed"];

/**
 * Where an opening's loop stands, in numbers a card can show.
 *
 * Search, sets and interviews do not happen in order - a second set can go
 * while an interview is booked - so this counts each rather than naming one
 * stage, and says which of the three is holding things up.
 */
export function loopSummary(input: {
  taStatus: "active" | "on_hold" | "closed";
  sets: { state: string; candidates: { decision?: string | null }[] }[];
  interviews: { state: string }[];
}): LoopSummary {
  const sent = input.sets.filter((set) => set.state === "sent");
  const setsSent = sent.length;
  const shortlisted = sent.reduce((n, set) => n + set.candidates.filter((c) => c.decision === "shortlisted").length, 0);
  const interviewed = input.interviews.filter((iv) => iv.state === "attended").length;
  const toInterview = input.interviews.filter((iv) => LIVE_INTERVIEW.includes(iv.state)).length;

  const clientOwes =
    sent.some((set) => set.candidates.some((c) => !c.decision)) ||
    input.sets.some((set) => set.state === "ready" || set.state === "reviewing");
  const waitingOn = toInterview > 0 ? "interview" : clientOwes ? "client" : "ta";

  const search = input.taStatus === "on_hold" ? "On hold" : input.taStatus === "closed" ? "Closed" : "Search active";
  const parts = [search];
  if (setsSent) parts.push(setsSent + (setsSent === 1 ? " set" : " sets"));
  if (shortlisted) parts.push(shortlisted + " shortlisted");
  if (interviewed) parts.push(interviewed + " interviewed");
  if (toInterview) parts.push(toInterview + " to interview");
  return { waitingOn, setsSent, shortlisted, interviewed, toInterview, line: parts.join(" · ") };
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
