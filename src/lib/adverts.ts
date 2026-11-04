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

/* ── TopJobs (15, Phase 3 steps 12 and 13) ─────────────────────── */

/**
 * The paid advert, which is the one with money in it.
 *
 * Five steps, each a person's: a TA asks for it, marketing makes the flyer,
 * ops orders it from TopJobs, TopJobs says when it is live, and it closes two
 * weeks later. Nothing here spends anything by itself - the order is a
 * drafted email somebody approves, and the cost is written down as it was
 * agreed, not guessed from a price list.
 */
export type AdState = "requested" | "flyer" | "ordered" | "live" | "closed" | "dropped";

export const AD_MEANINGS: Record<AdState, string> = {
  requested: "Asked for - marketing is making the flyer",
  flyer: "The flyer is ready - the order can go",
  ordered: "Ordered, waiting for TopJobs to make it live",
  live: "Live on TopJobs",
  closed: "Closed",
  dropped: "Dropped before it ran",
};

const AD_NEXT: Record<AdState, AdState[]> = {
  requested: ["flyer", "dropped"],
  flyer: ["ordered", "dropped"],
  ordered: ["live", "dropped"],
  live: ["closed"],
  closed: [],
  dropped: [],
};

export function canMoveAdTo(from: AdState, to: AdState): boolean {
  return AD_NEXT[from].includes(to);
}

/** Two weeks live, then it closes - the owner's rule. */
export const AD_DAYS = 14;

/**
 * What TopJobs charges, as the owner's board records it: 5,400 for an advert
 * and 12,700 for the HR-plus-marketing one. Written down so a cost nobody
 * recognises is obvious, not so the system decides to spend it.
 */
export const AD_PRICES: Record<string, number> = {
  single: 5_400,
  hr_and_marketing: 12_700,
};

export function problemWithAdRequest(positionTitle: string, kind: string): string | null {
  if (!positionTitle.trim()) return "Which position is it for?";
  if (!(kind in AD_PRICES)) return "Say which advert: the single one, or the HR and marketing one.";
  return null;
}

/** TopJobs takes a flyer, never a job description. */
export function problemWithFlyer(fileId: string | null): string | null {
  if (!fileId) {
    return "TopJobs takes an image, not a job description. Keep marketing's flyer on the Files screen first, then attach it here.";
  }
  return null;
}

export function problemWithAdOrder(fileId: string | null, to: string[], cost: number): string | null {
  const flyer = problemWithFlyer(fileId);
  if (flyer) return flyer;
  if (!to.length) return "Who at TopJobs does the order go to? One address a line.";
  if (!Number.isFinite(cost) || cost <= 0) return "What are they charging? It goes on the record, so somebody can check the bill.";
  return null;
}

export function problemWithAdLive(at: number, orderedAt: number | null, now = Date.now()): string | null {
  if (!Number.isFinite(at)) return "Give the day TopJobs made it live.";
  if (at > now + 86_400_000) return "That is in the future.";
  if (orderedAt && at < orderedAt - 86_400_000) return "It cannot have gone live before it was ordered.";
  return null;
}

/** When a live advert comes down, counted in plain days from going live. */
export function adClosesOn(liveAt: number, days = AD_DAYS): number {
  return liveAt + days * DAY;
}

export function adInWords(
  ad: { state: string; liveAt: number | null; closesAt: number | null; cost: number | null; cvCount: number | null },
  now = Date.now(),
): string {
  const bits = [AD_MEANINGS[ad.state as AdState] ?? ad.state];
  if (ad.state === "live" && ad.closesAt) {
    const left = Math.ceil((ad.closesAt - now) / DAY);
    bits.push(left > 0 ? left + (left === 1 ? " day left" : " days left") : "due to come down");
  }
  if (ad.cost) bits.push("LKR " + ad.cost.toLocaleString("en-US"));
  // The CV count is TA's: they hold the CVs, and the advert is judged on it.
  if (ad.cvCount !== null) bits.push(ad.cvCount + (ad.cvCount === 1 ? " CV" : " CVs"));
  return bits.join(" · ");
}
