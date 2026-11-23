/**
 * Position and candidate pipeline history (23 Nov, the ops team's feedback): the sheet the team kept by
 * hand, one row per candidate per set: who was sent, when, as which set, and where it ended up.
 *
 * Nothing is stored for it. Every row is read from what the desk already holds (the set, the client's
 * answer on it, the interviews, the placement, a hold), so it cannot drift from the screens it summarises.
 * The outcome is the furthest the candidate got, read from the end backwards, the same way a position is.
 */
import type { OpsDatabase } from "@/data/types";

export type Outcome =
  | "Placed"
  | "Interview"
  | "Withdrew"
  | "Rejected"
  | "Shortlisted"
  | "On hold"
  | "Pending client feedback"
  | "Client already had the CV"
  | "Not sent yet";

export const OUTCOMES: Outcome[] = ["Placed", "Interview", "Shortlisted", "Pending client feedback", "On hold", "Withdrew", "Rejected", "Client already had the CV", "Not sent yet"];

export interface HistoryRow {
  key: string;
  candidate: string;
  setNumber: number;
  setName: string;
  /** When the set went to the client. Null for a set that has not gone. */
  submittedAt: number | null;
  outcome: Outcome;
  /** The round, when the outcome is an interview. */
  round: number | null;
  /** The client's own words for a rejection, when there are some. */
  reason: string | null;
  positionId: string | null;
  position: string;
  client: string;
}

export function pipelineHistory(db: OpsDatabase, scope: { positionId?: string; clientId?: string }): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (const set of db.clientSets) {
    const position = db.positions.find((p) => p.openingTaId === set.openingTaId) ?? null;
    const clientId = set.clientId ?? position?.clientId ?? null;
    if (scope.positionId && position?.id !== scope.positionId) continue;
    if (scope.clientId && clientId !== scope.clientId) continue;
    const client = clientId ? (db.clients.find((c) => c.id === clientId)?.name ?? "Client") : "Client";
    const onHold = db.holds.some((h) => h.openingTaId === set.openingTaId && h.state === "on_hold");

    for (const cand of set.candidates) {
      const placement = db.placements.find((p) => p.applicationTaId === cand.applicationTaId && (p.state === "placed" || p.state === "joined"));
      const interviews = db.interviews.filter((i) => i.applicationTaId === cand.applicationTaId).sort((a, b) => b.round - a.round || b.createdAt - a.createdAt);
      const latest = interviews[0] ?? null;

      let outcome: Outcome;
      let reason: string | null = null;
      if (placement) outcome = "Placed";
      else if (latest?.state === "withdrew") {
        outcome = "Withdrew";
        reason = latest.reason;
      } else if (latest?.decision === "rejected") {
        outcome = "Rejected";
        reason = latest.decisionReason;
      } else if (latest && latest.state !== "cancelled") outcome = "Interview";
      else if (cand.decision === "rejected") {
        outcome = "Rejected";
        reason = cand.decisionReason ?? null;
      } else if (cand.decision === "shortlisted") outcome = "Shortlisted";
      else if (cand.claimVerdict === "dropped") outcome = "Client already had the CV";
      else if (set.state !== "sent") outcome = "Not sent yet";
      else outcome = onHold ? "On hold" : "Pending client feedback";

      rows.push({
        key: set.id + ":" + cand.applicationTaId,
        candidate: cand.name,
        setNumber: set.setNumber,
        setName: set.name,
        submittedAt: set.sentAt,
        outcome,
        round: outcome === "Interview" && latest ? latest.round : null,
        reason,
        positionId: position?.id ?? null,
        position: position?.title ?? set.role,
        client,
      });
    }
  }
  return rows.sort((a, b) => (b.submittedAt ?? Number.MAX_SAFE_INTEGER) - (a.submittedAt ?? Number.MAX_SAFE_INTEGER) || a.setNumber - b.setNumber);
}

/** The words for an outcome: an interview carries its round ("1st interview", "Interview round 2"). */
export function outcomeWords(row: Pick<HistoryRow, "outcome" | "round">): string {
  if (row.outcome !== "Interview" || row.round === null) return row.outcome;
  return row.round <= 1 ? "1st interview" : "Interview round " + row.round;
}

/** How many candidates ended in each outcome, for the line above the table. */
export function outcomeCounts(rows: HistoryRow[]): { outcome: Outcome; n: number }[] {
  return OUTCOMES.map((outcome) => ({ outcome, n: rows.filter((r) => r.outcome === outcome).length })).filter((x) => x.n > 0);
}
