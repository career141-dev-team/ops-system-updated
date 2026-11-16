/**
 * Interviews, the client's side of them (15, Phase 5).
 *
 * The TA System owns the candidate: it invites them, phones them after the
 * interview and keeps their feedback. Ops owns the client: the slots, the
 * booking, the invite to the interviewers, the reconfirm, and telling the
 * client when something goes wrong.
 *
 * Three of the owner's rules shape all of it:
 *
 *   - **Who schedules is decided per interview**, us or the client. The two
 *     are different work: asking for slots, or waiting to be told a date.
 *   - **A drop-out reaches the client in time.** At least one day before, or
 *     three hours at the very least. Telling them an hour before is how a
 *     client stops taking our calls.
 *   - **The slot loop stops.** Three unanswered rounds and a person is asked
 *     to step in with a back-up, rather than the emails going on for ever.
 *
 * Nothing here touches a database or sends anything.
 */

import { COLOMBO_OFFSET_MS, DAY, HOUR, colomboDate } from "@/lib/calendar";

/** Who agrees the time: we ask for slots, or the client books and tells us. */
export type Scheduler = "us" | "client";

export const SCHEDULER_MEANINGS: Record<Scheduler, string> = {
  us: "We agree the time with the client and the candidate",
  client: "The client books it and tells us the date",
};

export type InterviewState =
  | "slots"
  | "agreed"
  | "booked"
  | "reconfirmed"
  | "attended"
  | "no_show"
  | "cancelled";

export const STATE_MEANINGS: Record<InterviewState, string> = {
  slots: "Agreeing a time",
  agreed: "A time is agreed, not booked yet",
  booked: "Booked",
  reconfirmed: "Booked and reconfirmed",
  attended: "Held",
  no_show: "Nobody came",
  cancelled: "Cancelled",
};

const NEXT: Record<InterviewState, InterviewState[]> = {
  slots: ["agreed", "cancelled"],
  agreed: ["booked", "slots", "cancelled"],
  booked: ["reconfirmed", "attended", "no_show", "cancelled", "slots"],
  reconfirmed: ["attended", "no_show", "cancelled", "slots"],
  // A held interview is history. The next round is its own interview, so the
  // round a candidate reached is never overwritten.
  attended: [],
  no_show: ["slots"],
  cancelled: ["slots"],
};

export function canMoveTo(from: InterviewState, to: InterviewState): boolean {
  return NEXT[from].includes(to);
}

/** Three rounds of slots nobody answers is where a person steps in. */
export const MAX_SLOT_LOOPS = 3;

/** How long before an interview the client is reminded, and we ask the TA. */
export const RECONFIRM_HOUR = 9;

/** The least warning a client gets about a candidate dropping out. */
export const NOTICE_DAYS = 1;
export const NOTICE_HOURS = 3;

export type InterviewFormat = "online" | "onsite" | "phone";

export const FORMAT_MEANINGS: Record<InterviewFormat, string> = {
  online: "Online, with a Teams link",
  onsite: "At the client's office",
  phone: "On the phone",
};

/**
 * Slots a client offered, as a person types them in.
 *
 * One a line, "2026-11-09 10:00". Typed in rather than read out of the email
 * by itself: reading them is Phase 9's job, and a date guessed wrong wastes
 * the client's morning.
 */
export function parseSlots(text: string): { slots: number[]; bad: string[] } {
  const slots: number[] = [];
  const bad: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    // Colombo time, always: a client writing "10:00" means ten in Colombo.
    const at = Date.parse(line.replace(" ", "T") + ":00+05:30");
    if (Number.isFinite(at)) slots.push(at);
    else bad.push(line);
  }
  return { slots: [...new Set(slots)].sort((a, b) => a - b), bad };
}

export function problemWithSlots(
  text: string,
  now = Date.now(),
): string | null {
  const { slots, bad } = parseSlots(text);
  if (bad.length) {
    return "This line is not a date and time: “" + bad[0] + "”. Write one a line, like 2026-11-09 10:00.";
  }
  if (!slots.length) return "Write at least one time they offered, one a line.";
  if (slots.every((at) => at < now)) return "Every one of those times has gone. Ask them for new ones.";
  return null;
}

/** The candidate picked one. It has to be one of the ones on offer. */
export function problemWithPick(at: number, slots: number[], now = Date.now()): string | null {
  if (!Number.isFinite(at)) return "Pick one of the times the client offered.";
  if (!slots.includes(at)) return "That is not one of the times the client offered.";
  if (at < now) return "That time has gone. Ask the client for new ones.";
  return null;
}

/** Asking for slots again, until the loop runs out. */
export function problemWithNewSlots(loops: number, max = MAX_SLOT_LOOPS): string | null {
  if (loops >= max) {
    return (
      "This is the " +
      max +
      "th round of times with nothing agreed. The TA is asked for a back-up candidate instead of another email."
    );
  }
  return null;
}

export interface BookingWanted {
  at: number;
  round: number;
  format: string;
  interviewers: string;
  /** A link for an online interview, or the address for one at the office. */
  whereOrLink: string;
}

export function problemWithInterviewBooking(wanted: BookingWanted, now = Date.now()): string | null {
  if (!Number.isFinite(wanted.at)) return "Give the day and time.";
  if (wanted.at < now) return "That time has gone.";
  if (wanted.round < 1) return "Which round is it?";
  if (!(wanted.format in FORMAT_MEANINGS)) return "Say whether it is online, at the office, or on the phone.";
  if (!wanted.interviewers.trim()) return "Who is interviewing? One address a line, so they get the invite.";
  if (wanted.format === "online" && !wanted.whereOrLink.trim()) {
    return "An online interview needs its meeting link. Paste the Teams link, or put the interview on the phone.";
  }
  if (wanted.format === "onsite" && !wanted.whereOrLink.trim()) {
    return "Where is it? The candidate is told the address by the TA, so it has to be written down.";
  }
  return null;
}

/** The interviewers, one a line, as addresses. */
export function interviewersFrom(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((one) => one.trim())
    .filter((one) => one.includes("@"));
}

/** Nine in the morning, Colombo, the day before the interview. */
export function reconfirmAt(at: number): number {
  const here = new Date(at - DAY + COLOMBO_OFFSET_MS);
  return (
    Date.UTC(here.getUTCFullYear(), here.getUTCMonth(), here.getUTCDate(), RECONFIRM_HOUR) - COLOMBO_OFFSET_MS
  );
}

/**
 * Is there still time to warn the client properly?
 *
 * The owner's rule has two numbers, a day and three hours, which is one rule:
 * a day is the promise, three hours is the floor below which it is a phone
 * call and an apology rather than a notice.
 */
export function noticeStanding(
  interviewAt: number,
  now = Date.now(),
  days = NOTICE_DAYS,
  hours = NOTICE_HOURS,
): { ok: boolean; late: boolean; what: string } {
  const left = interviewAt - now;
  if (left <= 0) {
    return { ok: false, late: true, what: "That interview has already started or passed." };
  }
  if (left >= days * DAY) {
    return { ok: true, late: false, what: "There is more than a day's notice, which is what we promised." };
  }
  if (left >= hours * HOUR) {
    return {
      ok: true,
      late: true,
      what:
        "Under a day's notice: " +
        Math.floor(left / HOUR) +
        " hours. Send it now, and somebody should phone them as well.",
    };
  }
  return {
    ok: true,
    late: true,
    what:
      "Under " +
      hours +
      " hours' notice. The notice still goes, but phone them first - an email this late is not a warning.",
  };
}

export function problemWithAttendance(state: string, at: number, now = Date.now()): string | null {
  if (state !== "booked" && state !== "reconfirmed") {
    return "Attendance is only marked on an interview that was booked.";
  }
  if (at > now + HOUR) return "That interview has not happened yet.";
  return null;
}

/**
 * Moving a booked interview to a new agreed time (16 Nov, plan B1).
 *
 * Only a booked one moves: before that nothing is promised, and after it has
 * been held it is history. A reason is required, like every other thing here
 * that goes off plan.
 */
export function problemWithReschedule(
  wanted: { state: string; from: number | null; to: number; reason: string },
  now = Date.now(),
): string | null {
  if (wanted.state !== "booked" && wanted.state !== "reconfirmed") {
    return "Only a booked interview can be moved. Book it first, or ask for new times.";
  }
  if (!Number.isFinite(wanted.to)) return "Give the new day and time.";
  if (wanted.to < now) return "That time has gone.";
  if (wanted.from !== null && wanted.to === wanted.from) return "That is the time it already has.";
  if (wanted.reason.trim().length < 4) return "Write why it is moving.";
  return null;
}

export const ROUND_DECISIONS: Record<string, string> = {
  next: "Another round",
  selected: "Selected - no more rounds",
  rejected: "Rejected after the interview",
};

export function problemWithRoundDecision(decision: string, reason: string): string | null {
  if (!(decision in ROUND_DECISIONS)) return "Say what the client decided.";
  // The owner's standing rule: every rejection carries a reason, in the
  // client's own words, because the TA has to tell the candidate something.
  if (decision === "rejected" && reason.trim().length < 4) {
    return "Write why, in the client's own words. The TA has to tell the candidate something true.";
  }
  return null;
}

export type ReferenceState = "requested" | "reported" | "relayed" | "cleared" | "dropped";

export const REFERENCE_MEANINGS: Record<ReferenceState, string> = {
  requested: "Asked of the TA",
  reported: "The TA has reported back",
  relayed: "Passed to the client",
  cleared: "The client is happy",
  dropped: "The client dropped them",
};

/**
 * A reference check happens only when the client asks for one.
 *
 * The owner settled this on 26 October: no form, no score out of ten. The TA
 * phones the referee, writes down what was said, and we pass it on as it is.
 */
export function problemWithReference(clientAsked: boolean, who: string): string | null {
  if (!clientAsked) {
    return "A reference is only taken when the client asks for one. Tick that they asked, or there is nothing to do.";
  }
  if (!who.trim()) return "Which candidate is it for?";
  return null;
}

export function problemWithRelay(report: string): string | null {
  if (report.trim().length < 10) {
    return "Write what the referee actually said. A relay with nothing in it tells the client nothing.";
  }
  return null;
}

/** The line a person reads about one interview. */
export function interviewInWords(
  row: {
    state: string;
    scheduler: string;
    at: number | null;
    round: number;
    slotLoops: number;
    format: string;
  },
  now = Date.now(),
): string {
  const bits: string[] = [STATE_MEANINGS[row.state as InterviewState] ?? row.state];
  bits.push("round " + row.round);
  if (row.at) {
    const left = row.at - now;
    bits.push(
      left > 0
        ? left < DAY
          ? "in " + Math.max(1, Math.floor(left / HOUR)) + " hours"
          : "in " + Math.floor(left / DAY) + " days"
        : "was " + Math.max(1, Math.floor(-left / DAY)) + " days ago",
    );
    bits.push(FORMAT_MEANINGS[row.format as InterviewFormat] ?? row.format);
  } else {
    bits.push(row.scheduler === "us" ? "we are agreeing the time" : "waiting for the client's date");
    if (row.slotLoops > 1) bits.push("round " + row.slotLoops + " of times");
  }
  return bits.join(" · ");
}

/* ── The week board and the interview page (16 Nov, Figma "IV · Interviews") ── */

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export interface BoardDay {
  name: (typeof WEEKDAY_NAMES)[number];
  dayNum: number;
  startMs: number;
  endMs: number;
  isToday: boolean;
}

/**
 * Monday to Friday of the week `offset` weeks from today, in Colombo, and the words for it
 * ("10 – 14 November", or "28 Nov – 2 Dec" across a month end). `endMs` is the end of Sunday,
 * so a weekend interview can be told about instead of lost. Today is today: it used to be
 * Wednesday whatever the day.
 */
export function weekDays(now: number, offset = 0): { days: BoardDay[]; rangeLabel: string; endMs: number } {
  const local = new Date(now + COLOMBO_OFFSET_MS);
  const toMonday = local.getUTCDay() === 0 ? -6 : 1 - local.getUTCDay();
  const monday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + toMonday + offset * 7) - COLOMBO_OFFSET_MS;
  const today = colomboDate(now);
  const days = WEEKDAY_NAMES.map((name, i): BoardDay => {
    const startMs = monday + i * DAY;
    return { name, dayNum: new Date(startMs + COLOMBO_OFFSET_MS).getUTCDate(), startMs, endMs: startMs + DAY, isToday: colomboDate(startMs) === today };
  });
  const first = new Date(days[0].startMs + COLOMBO_OFFSET_MS);
  const last = new Date(days[4].startMs + COLOMBO_OFFSET_MS);
  const rangeLabel =
    first.getUTCMonth() === last.getUTCMonth()
      ? first.getUTCDate() + " – " + last.getUTCDate() + " " + MONTH_NAMES[last.getUTCMonth()]
      : first.getUTCDate() + " " + MONTH_NAMES[first.getUTCMonth()].slice(0, 3) + " – " + last.getUTCDate() + " " + MONTH_NAMES[last.getUTCMonth()].slice(0, 3);
  return { days, rangeLabel, endMs: monday + 7 * DAY };
}

export interface BoardStatus {
  label: string;
  tone: "ok" | "warn" | "violet" | "info" | "danger" | "quiet";
  /** The three queues the pills above the board count: an interview can be in more than one. */
  needsTime: boolean;
  needsFeedback: boolean;
  toRebook: boolean;
}

/**
 * The word and colour on an interview's card, and which queues it is in. A cancelled or no-show
 * interview can go back to the times (`canMoveTo`), so both are "to rebook"; so is one that has
 * asked for times twice with no answer.
 */
export function boardStatus(iv: {
  state: string;
  round: number;
  slotLoops: number;
  decision: string | null;
  candidateFeedback: string | null;
}): BoardStatus {
  const needsTime = iv.state === "slots" || iv.state === "agreed";
  const needsFeedback = iv.state === "attended" && !iv.decision;
  const toRebook = iv.state === "cancelled" || iv.state === "no_show" || (iv.state === "slots" && iv.slotLoops >= 2);
  const queues = { needsTime, needsFeedback, toRebook };
  if (iv.state === "attended") {
    return iv.decision
      ? { label: "Held", tone: "ok", ...queues }
      : { label: iv.candidateFeedback ? "Send feedback" : "Feedback after 5", tone: "warn", ...queues };
  }
  if (needsTime) return { label: "Pick a time", tone: "violet", ...queues };
  if (iv.state === "no_show") return { label: "No-show", tone: "danger", ...queues };
  if (iv.state === "cancelled") return { label: "Cancelled", tone: "quiet", ...queues };
  return { label: iv.round > 1 ? "Round " + iv.round : "Booked", tone: "info", ...queues };
}

/** Whole Colombo calendar days from one instant to a later one. */
function calendarDaysBetween(from: number, to: number): number {
  return Math.round((Date.parse(colomboDate(to)) - Date.parse(colomboDate(from))) / DAY);
}

/**
 * The short word in the Up next card's clock pill ("Today", "2 days waiting"), or null.
 * Red only when somebody is waiting on us (the Figma "Clock": late means somebody is waiting).
 * `interviewNextStep` has the long sentence; a pill cannot hold it.
 */
export function interviewClock(
  iv: { state: string; at: number | null; updatedAt: number; attendedAt: number | null; decision: string | null },
  now: number,
): { label: string; tone: "warn" | "danger" | "quiet" } | null {
  const waiting = (since: number, dangerAfter: number) => {
    const days = Math.max(0, calendarDaysBetween(since, now));
    return { label: days === 0 ? "Today" : days + (days === 1 ? " day waiting" : " days waiting"), tone: days >= dangerAfter ? ("danger" as const) : ("warn" as const) };
  };
  if (iv.state === "attended" && !iv.decision) return waiting(iv.attendedAt ?? iv.updatedAt, 2);
  if (iv.state === "slots" || iv.state === "agreed") return waiting(iv.updatedAt, 3);
  if ((iv.state === "booked" || iv.state === "reconfirmed") && iv.at !== null) {
    const days = calendarDaysBetween(now, iv.at);
    if (days < 0) return { label: days === -1 ? "A day late" : -days + " days late", tone: "danger" };
    return { label: days === 0 ? "Today" : days === 1 ? "Tomorrow" : "In " + days + " days", tone: days === 0 ? "warn" : "quiet" };
  }
  return null;
}

/** What Ops was told about the candidate's availability for one offered time. Never guessed. */
export function slotAnswerFor(iv: { slotAnswers?: { at: number; free: boolean }[] }, at: number): "free" | "busy" | null {
  const found = iv.slotAnswers?.find((a) => a.at === at);
  return found ? (found.free ? "free" : "busy") : null;
}

/** Only a time the client offered can be marked free or busy. */
export function problemWithAnswers(answers: { at: number; free: boolean }[], slots: number[]): string | null {
  if (answers.some((a) => !slots.includes(a.at))) return "Only the times the client offered can be marked free or busy.";
  return null;
}

/**
 * The time the "Book" button is for: the one picked on the page if it was offered and the
 * candidate is not busy then; else the agreed time; else a time they are free; else the first
 * not marked busy.
 */
export function chosenSlot(
  iv: { slots: number[]; at: number | null; slotAnswers?: { at: number; free: boolean }[] },
  pick: number | null,
): number | null {
  const offered = iv.slots.length ? iv.slots : iv.at ? [iv.at] : [];
  if (pick !== null && offered.includes(pick) && slotAnswerFor(iv, pick) !== "busy") return pick;
  if (iv.at !== null) return iv.at;
  return offered.find((t) => slotAnswerFor(iv, t) === "free") ?? offered.find((t) => slotAnswerFor(iv, t) !== "busy") ?? null;
}
