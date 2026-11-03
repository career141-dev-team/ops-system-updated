/**
 * Where a job is advertised (15, Phase 3 steps 14 to 16).
 *
 * Ops does not advertise: a TA posts on LinkedIn and marketing posts the
 * newsletter. What Ops does is **remember** - the link, the week, who posted
 * it - because today a client asking "where is my role advertised?" is
 * answered from somebody's memory.
 *
 * Two of the three channels are here. TopJobs is paused at the owner's word
 * (3 Nov), and it is the one with money in it, so it gets its own pass.
 *
 * Nothing here touches a database or sends anything.
 */

import { COLOMBO_OFFSET_MS, DAY, colomboDate } from "./calendar";

/* ── LinkedIn: the TA posts it, we hold the link (step 16) ─────── */

/**
 * Why a LinkedIn link cannot be recorded.
 *
 * The TA System will not let an opening go Live without this link, so a wrong
 * one is worse than none: it looks done and is not. A LinkedIn URL is the only
 * thing accepted, and the trailing rubbish every share button adds is cut.
 */
export function problemWithLinkedIn(url: string): string | null {
  const clean = url.trim();
  if (!clean) return "Paste the link to the post.";
  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return "That is not a web address. Copy the link from the post itself.";
  }
  if (parsed.protocol !== "https:") return "The link should start with https.";
  if (!/(^|\.)linkedin\.com$/i.test(parsed.hostname)) {
    return "That is not a LinkedIn address. This is the LinkedIn post the TA made.";
  }
  if (parsed.pathname.length < 2) return "That is LinkedIn's front page, not the post.";
  return null;
}

/** The link as it is kept: no tracking tail, so two people paste the same thing. */
export function tidyLinkedIn(url: string): string {
  const parsed = new URL(url.trim());
  return parsed.origin + parsed.pathname.replace(/\/$/, "");
}

/* ── Talent Pulse: ours, every Tuesday (steps 14 and 15) ───────── */

/**
 * Nine o'clock on the next Tuesday, Colombo.
 *
 * The owner's rhythm: ops compiles on Tuesday, marketing posts on Wednesday.
 * Nine o'clock because the TAs are asked for a line each and need the morning.
 */
export function nextTuesdayNineAm(at: number): number {
  const here = new Date(at + COLOMBO_OFFSET_MS);
  const nine = Date.UTC(here.getUTCFullYear(), here.getUTCMonth(), here.getUTCDate(), 9) - COLOMBO_OFFSET_MS;
  // 2 is Tuesday. Days until the next one, and never today once nine has gone.
  const days = (2 - here.getUTCDay() + 7) % 7;
  const candidate = nine + days * DAY;
  return candidate > at ? candidate : candidate + 7 * DAY;
}

/** The Tuesday an issue belongs to, as a date somebody can read. */
export function weekOf(at: number): string {
  const here = new Date(at + COLOMBO_OFFSET_MS);
  const back = (here.getUTCDay() - 2 + 7) % 7;
  return colomboDate(at - back * DAY);
}

export type IssueState = "compiling" | "ready" | "posted";

export const ISSUE_MEANINGS: Record<IssueState, string> = {
  compiling: "Being compiled — the TAs are writing their lines",
  ready: "Ready for marketing",
  posted: "Posted",
};

export interface IssueLine {
  positionId: string;
  openingTaId: string | null;
  title: string;
  client: string;
  /** The TA's one line about the role. The newsletter is nothing without it. */
  note: string;
  /** Where applications for this role go, so a CV knows which role it came from. */
  applyAddress: string;
}

/**
 * Why the issue cannot go to marketing yet.
 *
 * A newsletter with a role and no line under it is worse than a shorter
 * newsletter: it tells a reader nothing and it tells the TA we did not ask.
 */
export function problemWithIssue(lines: IssueLine[]): string | null {
  if (!lines.length) return "No open positions to put in it.";
  const quiet = lines.filter((l) => !l.note.trim());
  if (quiet.length) {
    return (
      "No line yet for " +
      quiet.map((l) => l.title).join(", ") +
      ". Ask the TA, or take the role out of this week's issue."
    );
  }
  return null;
}

/** One line for the list: where the issue stands. */
export function issueInWords(issue: { state: string; weekOf: string; lines: IssueLine[]; postedAt: number | null }): string {
  const count = issue.lines.length + (issue.lines.length === 1 ? " position" : " positions");
  const missing = issue.lines.filter((l) => !l.note.trim()).length;
  if (issue.state === "posted") return "Posted · " + count;
  return (
    (ISSUE_MEANINGS[issue.state as IssueState] ?? issue.state) +
    " · " +
    count +
    (missing ? " · " + missing + " still with no line" : "")
  );
}
