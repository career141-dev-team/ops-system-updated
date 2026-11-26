/**
 * Where each position of a client stands, in five numbers (Ops lead, 25 Nov): sets sent, shortlisted by the client,
 * interviews, offered, joined. Pure: nothing here reads a database or sends anything.
 */
import { isOff } from "@/lib/interviews";
import { setCounts, type TrackSet } from "@/lib/setTracking";

export interface PositionSummary {
  setsSent: number;
  shortlisted: number;
  interviews: number;
  offered: number;
  joined: number;
}

/**
 * - sets sent: sets that went to the client (a set pulled back is not counted);
 * - shortlisted: people the client said yes to, across those sets;
 * - interviews: interviews not cancelled or withdrawn from;
 * - offered: placements made and not fallen through (an offer was accepted, or the person joined);
 * - joined: of those, the ones who have joined.
 */
export function positionSummary(
  sets: TrackSet[],
  interviews: { state: string }[],
  placements: { state: string; joinedAt?: number | null }[],
): PositionSummary {
  const counts = setCounts(sets);
  const live = placements.filter((p) => p.state !== "cancelled" && p.state !== "no_show");
  return {
    setsSent: counts.length,
    shortlisted: counts.reduce((n, c) => n + c.shortlisted, 0),
    interviews: interviews.filter((i) => !isOff(i.state)).length,
    offered: live.length,
    joined: live.filter((p) => !!p.joinedAt).length,
  };
}
