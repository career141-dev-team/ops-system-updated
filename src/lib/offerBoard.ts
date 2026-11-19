/**
 * The two role-page boards (v6 R4 and R5, 19 Nov): who is at which step from offer to joining, and who is
 * inside the guarantee. Pure: rows in, columns out, so every case is testable.
 */
import { WARN_DAY } from "@/lib/guarantee";
import { missingPlacementFields } from "@/lib/money";

const DAY = 86_400_000;

export interface PlacementRow {
  id: string;
  candidateName: string;
  state: string;
  joinDate: number | null;
  joinedAt: number | null;
  monthlySalary: number | null;
  offerLetterFileRef: string | null;
}

export type OfferColumn = "offer" | "missing" | "joining" | "joined" | "didNotJoin";

/** Which column a placement sits in. Cancelled ones are not on the board. */
export function offerColumn(p: PlacementRow, addressKnown: boolean): OfferColumn | null {
  if (p.state === "cancelled") return null;
  if (p.state === "joined") return "joined";
  if (p.state === "no_show") return "didNotJoin";
  if (!p.joinDate) return "offer";
  if (missingPlacementFields(p).length > 0 || !addressKnown) return "missing";
  return "joining";
}

/** What is missing on a placed person, in words ("Invoice address missing"). */
export function missingInWords(p: PlacementRow, addressKnown: boolean): string[] {
  const out = missingPlacementFields(p).map((m) => m[0].toUpperCase() + m.slice(1) + " missing");
  if (!addressKnown) out.push("Invoice address missing");
  return out;
}

export interface GuaranteeRow {
  id: string;
  state: string;
  startsAt: number;
  endsAt: number;
}
export type GuaranteeColumn = "in" | "call" | "leaver" | "ended";

export function guaranteeDay(g: GuaranteeRow, now: number, total = 90): number {
  return Math.max(1, Math.min(total, Math.ceil((now - g.startsAt) / DAY)));
}

export function guaranteeColumn(g: GuaranteeRow, now: number): GuaranteeColumn {
  if (g.state === "replacing" || g.state === "refund_pending") return "leaver";
  if (["ended_clean", "replaced", "refunded", "void"].includes(g.state)) return "ended";
  const total = Math.max(1, Math.round((g.endsAt - g.startsAt) / DAY));
  return g.state === "warned" || guaranteeDay(g, now, total) >= WARN_DAY ? "call" : "in";
}
