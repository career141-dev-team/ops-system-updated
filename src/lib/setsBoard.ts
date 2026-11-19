/**
 * The Sets tab of a role (v6 R2, 19 Nov): which column a set stands in, and the one line each card
 * says. Pure, so every case is testable; the screen only draws what this returns.
 */
import { workingDaysBetween } from "@/lib/calendar";

export interface BoardSet {
  setNumber: number;
  state: string;
  sentAt: number | null;
  receivedAt: number | null;
  candidates: { decision?: string | null; claimedAt?: number | null; claimVerdict?: string | null }[];
}

export type BoardColumn = "ready" | "client" | "answered" | "withdrawn";

/** Not sent yet is "ready"; sent with somebody still unanswered is "client"; everyone answered is "answered". */
export function columnOf(set: BoardSet): BoardColumn {
  if (set.state === "withdrawn") return "withdrawn";
  if (set.state !== "sent") return "ready";
  return awaiting(set) > 0 ? "client" : "answered";
}

/** People the client has neither answered nor claimed as their own. */
export function awaiting(set: BoardSet): number {
  return set.candidates.filter((c) => !c.decision && !c.claimedAt).length;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "12 Nov", Colombo time. */
export function shortDay(at: number): string {
  const d = new Date(at + 5.5 * 3_600_000);
  return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
}

/** Working days the client has had the set, capped at the window ("day 5 of 7"); 0 on the day it arrived. */
export function dayOfWindow(set: BoardSet, now: number, holidays: string[], windowDays: number): number {
  const from = set.receivedAt ?? set.sentAt;
  return from === null ? 0 : Math.min(windowDays, workingDaysBetween(from, now, holidays));
}

/** "Sent 12 Nov · day 5 of 7", or "Sent 12 Nov · today" on the day it went. */
export function sentLine(set: BoardSet, now: number, holidays: string[], windowDays: number): string {
  if (set.sentAt === null) return "Not sent yet";
  const day = dayOfWindow(set, now, holidays, windowDays);
  return "Sent " + shortDay(set.sentAt) + " · " + (day === 0 ? "today" : "day " + day + " of " + windowDays);
}

/** "2 shortlisted, 3 rejected" (plus "1 theirs already" for a claim we dropped). */
export function answerLine(set: BoardSet): string {
  const n = (f: (c: BoardSet["candidates"][number]) => boolean) => set.candidates.filter(f).length;
  const parts = [
    [n((c) => c.decision === "shortlisted"), "shortlisted"],
    [n((c) => c.decision === "rejected"), "rejected"],
    [n((c) => !!c.claimedAt), "already theirs"],
  ] as const;
  const said = parts.filter(([count]) => count > 0).map(([count, word]) => count + " " + word);
  return said.length ? said.join(", ") : set.candidates.length + " CVs, no answers";
}
