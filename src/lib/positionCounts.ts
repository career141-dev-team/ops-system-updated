/**
 * The counts on the positions table, and the lists behind them (26 Nov, Nov 25 ops meeting).
 *
 * One function builds both: the number in a cell is the length of the list its pop-up shows, so the two
 * can never disagree. Pure: the db is passed in.
 *
 * Judgement calls, all written down so the screen can say them:
 *  - Interviews: round 1 is "1st", round 2 "2nd", round 3 and later "Final". There is no "final" flag on
 *    an interview, so the round decides.
 *  - A cancelled interview (the client's doing) counts nowhere: it never happened and is rebooked.
 *  - Dropout is an interview whose candidate withdrew or did not show up. It is counted in Dropout only,
 *    not also in its round, so the four columns add up to the interviews that stand or were held.
 *  - Offered is every placement for the position that is not cancelled or a no-show: a placement is
 *    created when the candidate accepts, so "Offered" here means "offer made and taken". Joined is the
 *    placements in state joined. Joined is a subset of Offered.
 *  - Sets counts sets in state "sent", matched on the TA opening.
 *  - Live ("Interv." on the roles list) is the interviews still to come: being arranged or booked.
 */
import type { OpsDatabase } from "@/data/types";

export const COUNT_KINDS = ["sets", "i1", "i2", "ifinal", "dropout", "offered", "joined", "live"] as const;
export type CountKind = (typeof COUNT_KINDS)[number];

export const COUNT_TITLES: Record<CountKind, string> = {
  sets: "Sets sent",
  i1: "1st interviews",
  i2: "2nd interviews",
  ifinal: "Final interviews",
  dropout: "Dropouts",
  offered: "Offered",
  joined: "Joined",
  live: "Interviews to come",
};

export const LIVE_INTERVIEW = ["slots", "agreed", "booked", "reconfirmed"];

export interface CountItem {
  id: string;
  /** The candidate, or the set's name. */
  title: string;
  /** Set number, round or state, and the date, as one short line. */
  line: string;
  /** The page for it, when there is one. */
  href: string;
}

const day = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString().slice(0, 10) : "no date");

export function isCountKind(k: string): k is CountKind {
  return (COUNT_KINDS as readonly string[]).includes(k);
}

/**
 * Whether an interview or placement is this position's. A record TA sent before its position was known has no
 * positionId; it belongs by its opening (26 Nov, PR 4 review).
 */
export function onPosition(
  position: { id: string; openingTaId?: string | null },
  x: { positionId?: string | null; openingTaId?: string | null },
): boolean {
  return x.positionId === position.id || (!x.positionId && !!position.openingTaId && x.openingTaId === position.openingTaId);
}

export function countItems(db: OpsDatabase, positionId: string, k: CountKind): CountItem[] {
  const position = db.positions.find((p) => p.id === positionId);
  if (!position) return [];

  if (k === "sets") {
    if (!position.openingTaId) return [];
    return db.clientSets
      .filter((s) => s.openingTaId === position.openingTaId && s.state === "sent")
      .map((s) => {
        const names = s.candidates.map((c) => (c.name ?? "").trim()).filter(Boolean);
        const preview = names.length
          ? " — " + names.slice(0, 4).join(", ") + (names.length > 4 ? ` +${names.length - 4} more` : "")
          : "";
        return {
          id: s.id,
          title: "Set " + s.setNumber,
          line: "Sent " + day(s.sentAt) + " · " + s.candidates.length + (s.candidates.length === 1 ? " candidate" : " candidates") + preview,
          href: "/positions/" + positionId + "?view=sets",
        };
      });
  }

  // The candidate's own page exists once they are in a set on this opening; until then, the record's page.
  const about = (applicationTaId: string, record: string) => {
    const set = db.clientSets.filter((s) => s.openingTaId === position.openingTaId && s.candidates.some((c) => c.applicationTaId === applicationTaId)).sort((a, b) => Number(b.state === "sent") - Number(a.state === "sent"))[0];
    if (!applicationTaId || !set) return { set: "", href: record };
    return { set: "Set " + set.setNumber + " · ", href: "/positions/" + positionId + "/candidates/" + encodeURIComponent(applicationTaId) };
  };

  if (k === "offered" || k === "joined") {
    return db.placements
      .filter((x) => onPosition(position, x) &&(k === "joined" ? x.state === "joined" : x.state !== "cancelled" && x.state !== "no_show"))
      .map((x) => ({
        id: x.id,
        title: x.candidateName,
        line: about(x.applicationTaId, "").set + (x.state === "joined" ? "Joined" : "Placed") + " · " + day(x.joinedAt ?? x.createdAt),
        href: about(x.applicationTaId, "/placements/" + x.id).href,
      }));
  }

  return db.interviews
    .filter((iv) => {
      if (!onPosition(position, iv)) return false;
      if (k === "live") return LIVE_INTERVIEW.includes(iv.state);
      if (k === "dropout") return iv.state === "withdrew" || iv.state === "no_show";
      if (iv.state === "cancelled" || iv.state === "withdrew" || iv.state === "no_show") return false;
      return k === "i1" ? iv.round <= 1 : k === "i2" ? iv.round === 2 : iv.round >= 3;
    })
    .map((iv) => ({
      id: iv.id,
      title: iv.candidateName,
      line: about(iv.applicationTaId, "").set + "Round " + iv.round + " · " + iv.state.replace("_", " ") + " · " + day(iv.at),
      href: about(iv.applicationTaId, "/interviews/" + iv.id).href,
    }));
}
