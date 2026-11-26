/**
 * Where each CV set stands and where each candidate the client has seen stands (Ops lead, 25 Nov meeting): one
 * summary line, one row per candidate, and the CSV of those rows. Pure: nothing here reads a database or sends
 * anything. The client's answers are still typed in by hand (Record the answer, interview decisions); this only reads them.
 */
import type { TrackRow } from "@/lib/stageTable";
import type { OpsDatabase, OpsPosition } from "@/data/types";
import { LEVEL_LABELS, type CandidateLevel } from "@/lib/positionCandidates";
import { awaiting } from "@/lib/setsBoard";

export interface TrackSet {
  id: string;
  setNumber: number;
  state: string;
  candidates: { applicationTaId: string; decision?: string | null; decisionReason?: string | null; decidedAt?: number | null; claimedAt?: number | null; claimVerdict?: string | null }[];
}

export interface TrackInterview {
  applicationTaId: string;
  round: number;
  decision?: string | null;
  decisionReason?: string | null;
  decidedAt?: number | null;
}

export interface TrackCandidate {
  id: string;
  applicationTaId: string;
  name: string;
  setId: string | null;
  level: CandidateLevel;
}

export { stageRowsCsv, stageRowsHtml, stageRowsTsv, type TrackRow } from "@/lib/stageTable";

export interface SetCount {
  setNumber: number;
  sent: number;
  shortlisted: number;
  rejected: number;
  awaiting: number;
}


/** Counts for each set that has gone to the client. Sets not sent yet, or pulled back, are not counted. */
export function setCounts(sets: TrackSet[]): SetCount[] {
  return sets
    .filter((s) => s.state === "sent")
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((s) => ({
      setNumber: s.setNumber,
      sent: s.candidates.length,
      shortlisted: s.candidates.filter((c) => c.decision === "shortlisted").length,
      rejected: s.candidates.filter((c) => c.decision === "rejected").length,
      awaiting: awaiting({ setNumber: s.setNumber, state: s.state, sentAt: null, receivedAt: null, candidates: s.candidates }),
    }));
}

/** "3 shortlisted (set 1) · set 2 awaiting feedback" (a line starting with a set says "Set 2 …"); "No set has gone to the client yet." when none has. */
export function summaryLine(counts: SetCount[]): string {
  if (counts.length === 0) return "No set has gone to the client yet.";
  const parts: string[] = [];
  const shortlisted = counts.filter((c) => c.shortlisted > 0);
  if (shortlisted.length) {
    const total = shortlisted.reduce((n, c) => n + c.shortlisted, 0);
    parts.push(`${total} shortlisted (${shortlisted.map((c) => "set " + c.setNumber).join(", ")})`);
  }
  const waiting = counts.filter((c) => c.awaiting > 0);
  if (waiting.length) parts.push(`${waiting.map((c) => "set " + c.setNumber).join(", ")} awaiting feedback`);
  if (parts.length === 0) parts.push(`${counts.length === 1 ? "Set " + counts[0].setNumber : "All sets"} answered, nobody shortlisted`);
  const line = parts.join(" · ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

const WORD: Record<string, string> = { shortlisted: "Shortlisted", rejected: "Rejected" };
const say = (decision: string, reason?: string | null) => (WORD[decision] ?? decision) + (reason ? ": " + reason : "");

/**
 * One row for each candidate the client has seen: in a set that went, or further on (interview, offer, joined, out).
 * The last feedback is the newest of the set answer and the interview answers; a set still open says so.
 */
export function trackingRows(candidates: TrackCandidate[], sets: TrackSet[], interviews: TrackInterview[]): TrackRow[] {
  const rows: TrackRow[] = [];
  for (const cand of candidates) {
    const set = sets.find((s) => s.id === cand.setId) ?? null;
    const seen = (set !== null && set.state === "sent") || !["found", "internal"].includes(cand.level);
    if (!seen) continue;
    const inSet = set?.candidates.find((c) => c.applicationTaId === cand.applicationTaId) ?? null;
    const answers: { at: number; text: string }[] = [];
    if (inSet?.decision && inSet.decidedAt) answers.push({ at: inSet.decidedAt, text: say(inSet.decision, inSet.decisionReason) });
    for (const iv of interviews) {
      if (iv.applicationTaId === cand.applicationTaId && iv.decision && iv.decidedAt) {
        answers.push({ at: iv.decidedAt, text: `Interview ${iv.round}: ${say(iv.decision, iv.decisionReason)}` });
      }
    }
    // An answer typed in without a date still counts, but only when nothing dated is newer.
    if (answers.length === 0 && inSet?.decision) answers.push({ at: 0, text: say(inSet.decision, inSet.decisionReason) });
    const last = answers.sort((a, b) => b.at - a.at)[0];
    rows.push({
      id: cand.id,
      name: cand.name,
      setNumber: set?.setNumber ?? null,
      stage: LEVEL_LABELS[cand.level],
      feedback: last ? last.text : set?.state === "sent" ? "Awaiting feedback" : "—",
      feedbackAt: last && last.at ? last.at : null,
    });
  }
  return rows.sort((a, b) => (a.setNumber ?? 999) - (b.setNumber ?? 999) || a.name.localeCompare(b.name));
}

/** Everything the Sets tab and the CSV need for one position, from the desk as it stands and its candidate list. */
export function trackingForPosition(db: OpsDatabase, position: OpsPosition, candidates: TrackCandidate[]) {
  const sets = db.clientSets.filter((s) => s.openingTaId === position.openingTaId).sort((a, b) => a.setNumber - b.setNumber);
  const interviews = db.interviews.filter((i) => i.positionId === position.id);
  const counts = setCounts(sets);
  return { counts, summary: summaryLine(counts), rows: trackingRows(candidates, sets, interviews) };
}
