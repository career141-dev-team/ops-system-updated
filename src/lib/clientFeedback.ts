/**
 * After the set has gone (15, Phase 4 steps 6 to 13).
 *
 * Everything in this file counts from the day the client **received** the set,
 * not from the day we sent it, because that is what the agreement promises and
 * what a client will argue about.
 *
 * Three clocks start at that moment and they are not the same kind of thing:
 *
 *   - **The CV ownership window.** Seven working days in which the client may
 *     say "we already had this one". After it, a claim is refused. This is the
 *     one that costs money, and it is counted in working days because that is
 *     how the agreement is written.
 *   - **The feedback chase.** A day of silence and we ask; the next day
 *     somebody calls; after three or four silent days we stop asking, because
 *     the owner's rule is that chasing a silent client past that is noise.
 *   - **The silence hold.** Two weeks from receipt with nothing back and the
 *     position goes on hold with a notice the owner approves - it never closes
 *     by itself (the owner's decision 6).
 *
 * Nothing here touches a database or sends anything.
 */

import { addWorkingDays, workingDaysBetween } from "./calendar";

/* ── The CV ownership window (step 6 to 8) ─────────────────────── */

export const OWNERSHIP_WORKING_DAYS = 7;

export interface Window {
  closesAt: number;
  /** Two working days before it closes, so somebody can chase in time. */
  warnAt: number;
}

export function ownershipWindow(
  receivedAt: number,
  holidays: string[] = [],
  workingDays = OWNERSHIP_WORKING_DAYS,
): Window {
  const closesAt = addWorkingDays(receivedAt, workingDays, holidays);
  const warnAt = addWorkingDays(receivedAt, Math.max(1, workingDays - 2), holidays);
  return { closesAt, warnAt };
}

export type ClaimVerdict = "dropped" | "refused";

export interface ClaimAnswer {
  verdict: ClaimVerdict;
  /** What the client is told, and what the record says a year later. */
  because: string;
  /** The template the reply is drafted from. */
  templateKey: string;
}

/**
 * The client says they already had this candidate.
 *
 * Inside the window we take their word for it and drop the candidate: it is
 * their own record against ours, and arguing costs more than the fee. Outside
 * it, the claim is refused - that is the whole point of the window, and the
 * reason it is counted and shown rather than remembered.
 */
export function claimVerdict(closesAt: number, claimedAt: number): ClaimAnswer {
  if (claimedAt <= closesAt) {
    return {
      verdict: "dropped",
      because: "Claimed inside the seven working days, so the candidate is theirs and comes out of the set.",
      templateKey: "claim.noted",
    };
  }
  return {
    verdict: "refused",
    because: "Claimed after the seven working days had closed, so the candidate stays ours.",
    templateKey: "claim.refused",
  };
}

/** How the window reads on screen, whoever is looking. */
export function windowInWords(window: Window, now: number, holidays: string[] = []): string {
  if (now > window.closesAt) return "The ownership window has closed. A claim now is refused.";
  const left = workingDaysBetween(now, window.closesAt, holidays);
  if (left <= 0) return "The ownership window closes today.";
  return left + (left === 1 ? " working day" : " working days") + " left of the ownership window";
}

/* ── The feedback chase (steps 10 and 11) ──────────────────────── */

export interface FeedbackRules {
  /** A day of silence before the first chase (owner's rule). */
  chaseDays: number;
  /** After this many silent days we stop asking. */
  stopAfterSilentDays: number;
}

export type FeedbackStep =
  | { what: "wait"; because: string }
  | { what: "chase"; because: string }
  | { what: "call"; because: string }
  | { what: "stop"; because: string };

/**
 * Silent days, counted from the last thing the client said.
 *
 * Any word from them resets it: a client who answered about one candidate is
 * not a silent client, and chasing them as one is how we sound like a machine.
 */
export function silentDays(receivedAt: number, lastHeardAt: number | null, now: number): number {
  const from = Math.max(receivedAt, lastHeardAt ?? 0);
  return Math.max(0, Math.floor((now - from) / 86_400_000));
}

/**
 * What to do about the silence now.
 *
 * The owner's ladder: ask after a day, call the next day, and stop after
 * three or four days rather than chase a client who is clearly not answering.
 * The hold clock keeps running underneath whatever this says.
 */
export function nextFeedbackStep(silent: number, rules: FeedbackRules): FeedbackStep {
  if (silent >= rules.stopAfterSilentDays) {
    return {
      what: "stop",
      because:
        "Silent for " +
        silent +
        " days. No more chases: the owner's rule is to stop and let the hold clock decide.",
    };
  }
  if (silent > rules.chaseDays) {
    return { what: "call", because: "Chased already and still silent. Somebody rings them today." };
  }
  if (silent === rules.chaseDays) {
    return { what: "chase", because: "A day with no feedback. Ask once, in writing." };
  }
  return { what: "wait", because: "Received today. Nothing to chase yet." };
}

/* ── What the client decided (step 9) ──────────────────────────── */

export const CLIENT_DECISIONS = ["shortlisted", "rejected"] as const;
export type ClientDecision = (typeof CLIENT_DECISIONS)[number];

export const DECISION_MEANINGS: Record<ClientDecision, string> = {
  shortlisted: "Shortlisted — they want to interview",
  rejected: "Rejected",
};

/**
 * Why a decision cannot be recorded yet.
 *
 * The reason is required on a rejection and it must be the client's own words:
 * the owner's rule is that nothing is rejected without one, and TA sends the
 * candidate's notice from it. "Not suitable" tells the TA nothing and tells
 * the candidate less.
 */
export function problemWithDecision(decision: string, reason: string): string | null {
  if (!(CLIENT_DECISIONS as readonly string[]).includes(decision)) return "Say whether they shortlisted or rejected.";
  if (decision === "rejected" && reason.trim().length < 4) {
    return "Write what the client said. A rejection without their reason is no use to the TA or the candidate.";
  }
  return null;
}

/* ── The silence hold (steps 12 and 13) ────────────────────────── */

export const HOLD_AFTER_DAYS = 14;

/** Two weeks of silence from receipt, in calendar days, as the agreement says. */
export function holdDueAt(receivedAt: number, days = HOLD_AFTER_DAYS): number {
  return receivedAt + days * 86_400_000;
}

export type HoldState = "proposed" | "on_hold" | "lifted";

export const HOLD_MEANINGS: Record<HoldState, string> = {
  proposed: "Waiting for somebody to approve the notice",
  on_hold: "On hold, and the client has been told",
  lifted: "Lifted — the search is on again",
};

/**
 * Why a hold cannot be put on yet.
 *
 * A hold stops work on a position and tells the client so; it is exactly the
 * kind of thing the owner's rule means by "nothing without a reason". It also
 * never closes by itself: the owner is asked again every thirty days
 * (decision 6), which is the review, not a closure.
 */
export function problemWithHold(reason: string): string | null {
  if (reason.trim().length < 4) return "Write why it is going on hold. Nothing holds without a reason.";
  return null;
}

/** Any word from the client lifts it; so may a person, with a reason. */
export function problemWithLift(reason: string): string | null {
  if (reason.trim().length < 4) return "Say what changed. A hold is lifted for a reason too.";
  return null;
}

export const HOLD_REVIEW_DAYS = 30;
