/**
 * The number strip at the top of a role page (v6 frames R0, R6, R7, 19 Nov): where the people on
 * one opening are, counted from what the desk holds. Pure: the page hands in plain rows, so every
 * case is testable and nothing here invents a figure. A number with nothing behind it is 0 and its
 * small line says "—".
 */

const DAY = 86_400_000;

export interface RoleNumbersInput {
  now: number;
  headcount: number | null;
  /** Candidates TA has on the opening, whether or not they are in a set. */
  candidates: { setId: string | null; out: boolean }[];
  sets: { name: string; state: string; sentAt: number | null; candidates: { decision?: string | null }[] }[];
  interviews: { state: string; at: number | null }[];
  placements: { state: string; joinDate: number | null }[];
  guarantees: { state: string; startsAt: number; endsAt: number }[];
}

export interface RoleNumbers {
  taSearch: { n: number; line: string };
  ready: { n: number; line: string };
  withClient: { n: number; line: string };
  /** Sets sent to the client: the strip's "Sets" cell (26 Nov, Nov 25 ops meeting). */
  setsSent: { n: number; line: string };
  interviews: { n: number; line: string; needsTime: number };
  offer: { n: number; line: string };
  joining: { n: number; line: string };
  guarantee: { n: number; line: string };
  placed: { done: number; of: number | null };
}

const LIVE_INTERVIEW = ["slots", "agreed", "booked", "reconfirmed"];
const dayMonth = (at: number) =>
  new Date(at + 5.5 * 3_600_000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function roleNumbers(i: RoleNumbersInput): RoleNumbers {
  const unset = i.candidates.filter((c) => !c.setId && !c.out).length;
  const ready = i.sets.filter((s) => s.state !== "sent" && s.state !== "withdrawn");
  const readyN = ready.reduce((n, s) => n + s.candidates.length, 0);

  const waiting = i.sets.filter((s) => s.state === "sent" && s.candidates.some((c) => !c.decision));
  const withClientN = waiting.reduce((n, s) => n + s.candidates.filter((c) => !c.decision).length, 0);
  const withClientLine = waiting
    .map((s) => (s.sentAt ? `${s.name} day ${Math.max(1, Math.floor((i.now - s.sentAt) / DAY) + 1)}` : s.name))
    .join(" · ");

  const setsSent = i.sets.filter((s) => s.state === "sent").length;

  const live = i.interviews.filter((iv) => LIVE_INTERVIEW.includes(iv.state));
  const needsTime = live.filter((iv) => iv.at === null).length;

  const placed = i.placements.filter((p) => p.state === "placed" || p.state === "joined");
  const offerN = i.placements.filter((p) => p.state === "placed" && p.joinDate === null).length;
  const joining = i.placements.filter((p) => p.state === "placed" && p.joinDate !== null);
  const soonest = joining.map((p) => p.joinDate as number).sort((a, b) => a - b)[0];

  const running = i.guarantees.filter((g) => ["running", "warned", "replacing"].includes(g.state));
  const g0 = running[0];
  const gLine = g0
    ? `day ${Math.max(1, Math.floor((i.now - g0.startsAt) / DAY) + 1)} of ${Math.max(1, Math.round((g0.endsAt - g0.startsAt) / DAY))}`
    : "—";

  return {
    taSearch: { n: unset, line: unset ? "not in a set yet" : "—" },
    ready: { n: readyN, line: readyN ? "from TA" : "—" },
    withClient: { n: withClientN, line: withClientLine || "—" },
    setsSent: { n: setsSent, line: withClientLine || (setsSent ? "all answered" : "—") },
    interviews: { n: live.length, needsTime, line: needsTime ? `${needsTime} needs a time` : live.length ? "all have a time" : "—" },
    offer: { n: offerN, line: offerN ? "waiting for a start day" : "—" },
    joining: { n: joining.length, line: soonest ? `DOJ ${dayMonth(soonest)}` : "—" },
    guarantee: { n: running.length, line: gLine },
    placed: { done: placed.length, of: i.headcount && i.headcount > 0 ? i.headcount : null },
  };
}
