/**
 * The weekly report (15, Phase 3 step 18 and Phase 7 step 9).
 *
 * One page the Director reads on a Monday: every position that is open, what
 * has happened to it, and who is waiting for whom. Today this is made by hand
 * from a sheet, which is why it is late, wrong, or both.
 *
 * Two rules decide what it says:
 *
 *   - **Nothing is invented.** Every number comes from TA's own pipeline or
 *     from our own rows. A column we cannot fill says so rather than showing
 *     a zero, because a zero is read as news.
 *   - **A person approves it before it goes.** The system builds it, the TA
 *     lead reads it, and only then is the Director's email drafted. The owner
 *     asked for the report to be the TA lead's.
 *
 * Nothing here touches a database or sends anything.
 */

import { COLOMBO_OFFSET_MS, colomboDate } from "@/lib/calendar";

const DAY = 86_400_000;

/** One line of the report: one position. */
export interface ReportRow {
  positionId: string;
  openingTaId: string | null;
  client: string;
  title: string;
  /** Who in TA is searching, as TA names them. */
  primaryTa: string;
  stage: string;
  /** Working days since it went to TA. */
  daysOpen: number;
  /** What TA's pipeline holds, or null when we could not read it. */
  counts: Record<string, number> | null;
  shortlisted: number | null;
  /** Where the client is: the newest set, and what has come back. */
  setsSent: number;
  lastSentAt: number | null;
  daysWaitingOnClient: number | null;
  decisionsIn: number;
  onHold: boolean;
  depth: string | null;
  advertised: boolean;
}

/** The same shape the database keeps; one shape, one name. */
export type ReportRowRecord = ReportRow;

/**
 * The stage as the Director reads it.
 *
 * Not the words the ops screens use: "Open in the TA System" is right beside
 * a link to TA and wrong in a sentence about a position (found in the browser,
 * 3 Nov). The row keeps the raw stage so this stays one decision.
 */
export const STAGE_FOR_REPORT: Record<string, string> = {
  handed_over: "waiting for TA to open it",
  searching: "being searched",
  on_hold: "on hold",
  closed: "closed",
  queued: "waiting for TA to open it",
};

export type ReportState = "building" | "review" | "approved" | "sent";

export const REPORT_MEANINGS: Record<ReportState, string> = {
  building: "Being built",
  review: "Waiting for the TA lead to read it",
  approved: "Read and approved",
  sent: "Gone to the Director",
};

/**
 * The Monday a report belongs to, as a readable date.
 *
 * Monday, because the owner's week starts there and the report is read at the
 * start of it. A report built on the Wednesday of the same week is still that
 * Monday's report, so two cannot exist for one week.
 */
export function reportWeekOf(now = Date.now()): string {
  const here = new Date(now + COLOMBO_OFFSET_MS);
  // 1 is Monday; a Sunday belongs to the Monday six days before it.
  const back = (here.getUTCDay() - 1 + 7) % 7;
  return colomboDate(now - back * DAY);
}

/** Monday at eight in the morning, Colombo, and never a Monday gone. */
export function nextMondayEightAm(at: number): number {
  const here = new Date(at + COLOMBO_OFFSET_MS);
  const eight = Date.UTC(here.getUTCFullYear(), here.getUTCMonth(), here.getUTCDate(), 8) - COLOMBO_OFFSET_MS;
  const days = (1 - here.getUTCDay() + 7) % 7;
  const candidate = eight + days * DAY;
  return candidate > at ? candidate : candidate + 7 * DAY;
}

/** Working days between two moments, counting the first day as day one. */
export function daysBetween(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / DAY));
}

/** A report with no position in it is not sent: there is nothing to read. */
export function problemWithReport(rows: ReportRow[]): string | null {
  if (!rows.length) {
    return "No position is open, so there is nothing to report. Nothing is sent rather than an empty page.";
  }
  const unread = rows.filter((r) => r.counts === null);
  if (unread.length === rows.length) {
    return (
      "The TA System could not be read for any of the " +
      rows.length +
      " positions, so the report would be our side only. Try again, or send it knowing what is missing."
    );
  }
  return null;
}

/** The line a person reads about the report itself. */
export function reportInWords(report: { state: string; weekOf: string; rows: ReportRow[] }): string {
  const meaning = REPORT_MEANINGS[report.state as ReportState] ?? report.state;
  const missing = report.rows.filter((r) => r.counts === null).length;
  return (
    meaning +
    " · week of " +
    report.weekOf +
    " · " +
    report.rows.length +
    (report.rows.length === 1 ? " position" : " positions") +
    (missing ? " · " + missing + " could not be read from the TA System" : "")
  );
}

/** What one row says, in a sentence, for the screen and the email. */
export function rowInWords(row: ReportRow): string {
  const bits: string[] = [];
  bits.push(STAGE_FOR_REPORT[row.stage] ?? row.stage);
  bits.push(
    row.daysOpen === 0
      ? "handed over today"
      : row.daysOpen + (row.daysOpen === 1 ? " day open" : " days open"),
  );
  if (row.counts === null) {
    bits.push("the TA System could not be read");
  } else {
    bits.push((row.shortlisted ?? 0) + " shortlisted");
  }
  if (row.setsSent) {
    bits.push(row.setsSent + (row.setsSent === 1 ? " set sent" : " sets sent"));
    if (row.daysWaitingOnClient !== null) {
      bits.push(
        row.decisionsIn
          ? row.decisionsIn + (row.decisionsIn === 1 ? " decision back" : " decisions back")
          : row.daysWaitingOnClient === 0
            ? "sent today, nothing back yet"
            : row.daysWaitingOnClient +
              (row.daysWaitingOnClient === 1 ? " day waiting on the client" : " days waiting on the client"),
      );
    }
  } else {
    bits.push("no set yet");
  }
  if (row.onHold) bits.push("on hold");
  if (!row.advertised) bits.push("no LinkedIn post");
  return bits.join(" · ");
}

/**
 * The report as the Director reads it: plain lines, no table drawing.
 *
 * Email, not a spreadsheet. The owner's rule is no spreadsheets, and a
 * Director reading on a phone wants sentences.
 */
export function reportText(weekOf: string, rows: ReportRow[]): string {
  const lines: string[] = ["Active positions, week of " + weekOf, ""];
  const byClient = new Map<string, ReportRow[]>();
  for (const row of rows) {
    const held = byClient.get(row.client) ?? [];
    held.push(row);
    byClient.set(row.client, held);
  }
  for (const [client, theirs] of [...byClient.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(client);
    for (const row of theirs) {
      lines.push("  " + row.title + " (" + row.primaryTa + ") - " + rowInWords(row));
    }
    lines.push("");
  }
  const waiting = rows.filter((r) => r.daysWaitingOnClient !== null && !r.decisionsIn);
  if (waiting.length) {
    lines.push(
      waiting.length === 1
        ? "One client has a set and has not answered yet."
        : waiting.length + " clients have a set and have not answered yet.",
    );
  }
  const quiet = rows.filter((r) => !r.setsSent);
  if (quiet.length) {
    lines.push(
      quiet.length === 1 ? "One position has had no set yet." : quiet.length + " positions have had no set yet.",
    );
  }
  return lines.join("\n").trim();
}

/** Who the report goes to, from the setting, as a list of addresses. */
export function recipientsFrom(value: unknown): string[] {
  return String(value ?? "")
    .split(/[,;\s]+/)
    .map((one) => one.trim())
    .filter((one) => one.includes("@"));
}
