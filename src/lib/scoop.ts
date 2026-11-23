/**
 * A Scoop (23 Nov, the ops team's feedback): fifty or sixty CVs sent in one email, or added in one go. The batch
 * is the unit the team reports on, so each one is recorded, and an end-of-day summary says what became of it.
 *
 * A batch is kept in one settings row, as the mail cursor is (`scoop.batch.<id>`), so it needs no table of its
 * own: it is a few counters, the people it added (by id) and the files it could not read. The summary is read
 * off the applicants themselves, so it cannot disagree with the board.
 *
 * Pure: no database, nothing read from mail. The desk reads and writes; this decides.
 */
import { DAY, COLOMBO_OFFSET_MS, HOUR, colomboDate, isWorkingDay } from "@/lib/calendar";

const MINUTE = 60_000;
import { rejectKind } from "@/lib/hiring";

export const SCOOP_KEY = "scoop.batch.";
/** The end-of-day summary time, Colombo (the working day ends at 17:30). */
export const SUMMARY_HOUR = 17;
export const SUMMARY_MINUTE = 30;
/** How many attachments one clock pass reads, so a Scoop of sixty is spread over passes and no pass runs long. */
export const PER_PASS = 12;
/** The most a Scoop may hold. More than this in one email is read in the next day's pass. */
export const MAX_PER_BATCH = 150;

export interface ScoopBatch {
  id: string;
  /** When it arrived (the email's time) or was added by hand. */
  at: number;
  source: "mail" | "upload";
  mailbox: string;
  from: string;
  subject: string;
  /** Attachments found in the email, or files given. */
  found: number;
  /** The applicants it added, by id. */
  applicantIds: string[];
  /** Files that were somebody already on file, and files that could not be read, with why. */
  duplicates: { name: string; of: string }[];
  unreadable: { name: string; why: string }[];
  /** Attachment ids already handled, so a pass that stops half way carries on rather than starting again. */
  done: string[];
  complete: boolean;
  /** When the end-of-day summary was made for it. */
  summarisedAt: number | null;
}

export function newBatch(input: { id: string; at: number; source: ScoopBatch["source"]; mailbox?: string; from?: string; subject?: string; found: number }): ScoopBatch {
  return { id: input.id, at: input.at, source: input.source, mailbox: input.mailbox ?? "", from: input.from ?? "", subject: input.subject ?? "", found: input.found, applicantIds: [], duplicates: [], unreadable: [], done: [], complete: false, summarisedAt: null };
}

/** The settings row for a batch: the key carries the id, the value is the batch as JSON. */
export const keyOf = (id: string): string => SCOOP_KEY + id.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80);

export function parseBatch(value: unknown): ScoopBatch | null {
  try {
    const b = JSON.parse(String(value)) as ScoopBatch;
    return b && typeof b.id === "string" && Array.isArray(b.applicantIds) ? b : null;
  } catch {
    return null;
  }
}

/** Every batch on the desk, newest first. A row that does not parse is left out, not fatal. */
export function batchesOf(settings: { key: string; value: unknown }[]): ScoopBatch[] {
  return settings
    .filter((s) => s.key.startsWith(SCOOP_KEY))
    .map((s) => parseBatch(s.value))
    .filter((b): b is ScoopBatch => b !== null)
    .sort((a, b) => b.at - a.at);
}

/** The senders whose mail is a Scoop: addresses or whole domains, comma or newline separated. Empty means nobody. */
export function sendersFrom(raw: string): string[] {
  return raw.split(/[,;\n]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function isScoopSender(from: string, senders: string[]): boolean {
  const address = from.trim().toLowerCase();
  return senders.some((s) => {
    // "@domain" and a bare "domain" mean everyone at that domain; a full address means exactly that address.
    const domain = s.startsWith("@") ? s.slice(1) : s.includes("@") ? null : s;
    return domain === null ? address === s : address.endsWith("@" + domain);
  });
}

/** The next 17:30 Colombo on a working day, strictly after `at` unless today's has not come yet. */
export function nextSummaryAt(at: number, holidays: string[] = []): number {
  const local = new Date(at + COLOMBO_OFFSET_MS);
  let day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - COLOMBO_OFFSET_MS;
  for (let i = 0; i < 14; i++) {
    const when = day + SUMMARY_HOUR * HOUR + SUMMARY_MINUTE * MINUTE;
    if (when > at && isWorkingDay(day + 12 * HOUR, holidays)) return when;
    day += DAY;
  }
  return day + SUMMARY_HOUR * HOUR + SUMMARY_MINUTE * MINUTE;
}

/** Batches that arrived on this Colombo day. */
export function batchesOn(batches: ScoopBatch[], at: number): ScoopBatch[] {
  const day = colomboDate(at);
  return batches.filter((b) => colomboDate(b.at) === day);
}

export interface ApplicantLike {
  id: string;
  name: string;
  stage: string;
  tries: number;
  interviewAt: number | null;
  rejectReason: string | null;
  rejectedAtStage?: string | null;
  /** They wrote back to us on WhatsApp (23 Nov). */
  repliedAt?: number | null;
}

export interface ScoopSummary {
  processed: number;
  duplicates: number;
  unreadable: number;
  /** Reached on a call (talked, with any outcome), and tried with no answer yet, and not called yet. */
  responded: number;
  noAnswer: number;
  notCalled: number;
  screeningRejects: { name: string; reason: string }[];
  interviews: number;
  lines: string[];
}

/**
 * What became of one Scoop (the end-of-day report): how many CVs were processed, who responded and who did not,
 * who was turned away at screening and why, and how many interviews are booked. Read off the applicants as they
 * are now, so the summary of a Scoop from this morning counts a call made this afternoon.
 */
export function summaryOf(batch: ScoopBatch, applicants: ApplicantLike[]): ScoopSummary {
  const mine = applicants.filter((a) => batch.applicantIds.includes(a.id));
  const rejected = mine.filter((a) => a.stage === "rejected");
  const screeningRejects = rejected.filter((a) => rejectKind(a.rejectedAtStage) === "screening").map((a) => ({ name: a.name, reason: a.rejectReason ?? "No reason written" }));
  // Responded: spoken to on a call, or wrote back to us on WhatsApp. Somebody who wrote back is not "no answer".
  const reached = (a: ApplicantLike) => ["fits", "interview", "decision", "hired"].includes(a.stage) || (a.stage === "rejected" && a.tries > 0) || !!a.repliedAt;
  const responded = mine.filter(reached).length;
  const noAnswer = mine.filter((a) => a.stage === "call" && a.tries > 0 && !a.repliedAt).length;
  const notCalled = mine.filter((a) => !a.repliedAt && (a.stage === "new" || (a.stage === "call" && a.tries === 0))).length;
  const interviews = mine.filter((a) => a.interviewAt !== null).length;
  const n = (count: number, one: string, many: string) => count + " " + (count === 1 ? one : many);
  const lines = [
    n(mine.length, "CV was", "CVs were") + " processed" + (batch.duplicates.length ? ", " + n(batch.duplicates.length, "was somebody already on file", "were people already on file") : "") + (batch.unreadable.length ? ", " + n(batch.unreadable.length, "could not be read", "could not be read") : "") + ".",
    responded + " responded, " + noAnswer + " did not answer, " + notCalled + " not called yet.",
    screeningRejects.length ? n(screeningRejects.length, "was", "were") + " turned away at screening: " + screeningRejects.map((r) => r.name + " (" + r.reason + ")").join("; ") + "." : "Nobody was turned away at screening.",
    n(interviews, "interview is", "interviews are") + " booked.",
  ];
  return { processed: mine.length, duplicates: batch.duplicates.length, unreadable: batch.unreadable.length, responded, noAnswer, notCalled, screeningRejects, interviews, lines };
}
