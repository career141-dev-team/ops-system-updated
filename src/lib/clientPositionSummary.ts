/**
 * Where each position of a client stands, in five numbers (Ops lead, 25 Nov): sets sent, shortlisted by the client,
 * interviews, offered, joined. Pure: nothing here reads a database or sends anything.
 */
import type { OpsDatabase, OpsPosition } from "@/data/types";
import { countItems, type CountKind } from "@/lib/positionCounts";
import { setCounts } from "@/lib/setTracking";

export interface PositionSummary {
  setsSent: number;
  shortlisted: number;
  interviews: number;
  offered: number;
  joined: number;
}

/**
 * Every number but shortlisted is `countItems`, so this page and the positions table cannot disagree
 * (interviews is 1st + 2nd + Final; dropouts are counted apart there). Shortlisted is the people the client
 * said yes to, across the sets that went.
 */
export function positionSummary(db: OpsDatabase, position: Pick<OpsPosition, "id" | "openingTaId">): PositionSummary {
  const n = (k: CountKind) => countItems(db, position.id, k).length;
  const sets = position.openingTaId ? db.clientSets.filter((s) => s.openingTaId === position.openingTaId) : [];
  return {
    setsSent: n("sets"),
    shortlisted: setCounts(sets).reduce((sum, c) => sum + c.shortlisted, 0),
    interviews: n("i1") + n("i2") + n("ifinal"),
    offered: n("offered"),
    joined: n("joined"),
  };
}
