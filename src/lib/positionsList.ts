/**
 * The Positions list (v6 frame P1, 19 Nov): every role as one row, grouped by client, with where it
 * stands in the six steps and the one next action.
 *
 * Pure: the page hands in the rows it read and the names it looked up, and gets back what to draw.
 * Nothing here reads a database or sends anything, so every rule below is a test.
 */

const DAY = 86_400_000;
const COLOMBO = 5.5 * 3_600_000;

export type StepKey = "ta" | "client" | "interv" | "offer" | "join" | "guar";
export const STEPS: { key: StepKey; label: string }[] = [
  { key: "ta", label: "TA" },
  { key: "client", label: "Client" },
  { key: "interv", label: "Interv." },
  { key: "offer", label: "Offer" },
  { key: "join", label: "Join" },
  { key: "guar", label: "Guar." },
];

export type RowTone = "danger" | "warn" | "info" | "ok" | "quiet";

export type ActionKind = "call" | "find-a-time" | "ask-ta" | "chase-hr" | "chase-agreement" | "choose-ta";
export interface RowAction {
  kind: ActionKind;
  label: string;
  /** The id the panel is about: the role, or the interview for find-a-time. */
  on: string;
}

export interface PositionIn {
  id: string;
  clientId: string | null;
  clientTaId: string;
  openingTaId: string | null;
  title: string;
  stage: string;
  primaryTaId: string | null;
  jdApprovedAt: number | null;
  pendingCount: number | null;
  handedOverAt: number;
  closedAt: number | null;
  ownerId: string;
  createdAt: number;
}
export interface SetIn {
  openingTaId: string;
  setNumber: number;
  state: string;
  receivedAt?: number | null;
  candidates: { decision?: string | null }[];
}
export interface InterviewIn {
  id: string;
  openingTaId: string;
  state: string;
  round: number;
  at: number | null;
}
export interface PlacementIn {
  openingTaId: string;
  state: string;
  joinDate: number | null;
  joinedAt: number | null;
  candidateName: string;
}

export interface ListInput {
  now: number;
  chaseDays: number;
  positions: PositionIn[];
  sets: SetIn[];
  interviews: InterviewIn[];
  placements: PlacementIn[];
  /** openingTaId of every role that is on hold. */
  holds: string[];
  /** The role's client name and the client contact's first name, as the page found them. */
  clientNameOf: (p: PositionIn) => string;
  contactFirstNameOf: (p: PositionIn) => string | null;
  taFirstNameOf: (taId: string) => string | null;
  /** True when the client has the agreement but has not signed it. */
  agreementPendingOf: (p: PositionIn) => boolean;
}

export interface RoleRow {
  id: string;
  clientName: string;
  title: string;
  ownerId: string;
  placed: number;
  /** null: not read from the TA System. */
  counts: Record<StepKey, number | null>;
  /** The step that is stuck, drawn in the row's tone. */
  problemStep: StepKey | null;
  statusText: string;
  tone: RowTone;
  action: RowAction | null;
  withClient: boolean;
  /** Days the oldest answer has been waited for. */
  waitingDays: number;
  onHold: boolean;
  closed: boolean;
}

export interface WeekEvent {
  at: number;
  kind: "interview" | "joining";
  title: string;
  sub: string;
  href: string;
}

export interface ListView {
  rows: RoleRow[];
  needsYou: number;
  withClient: number;
  oldestWaitDays: number;
  oldestWaitClient: string | null;
  interviews: number;
  interviewsThisWeek: number;
  joining: number;
  nextJoinAt: number | null;
  onHold: number;
}

const LIVE_INTERVIEW = ["slots", "agreed", "booked", "reconfirmed"];

const days = (from: number, now: number) => Math.max(0, Math.floor((now - from) / DAY));

/** "Fri 10:00", Colombo time. */
export function dayTime(at: number): string {
  const d = new Date(at + COLOMBO);
  const wd = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  return `${wd} ${d.toISOString().slice(11, 16)}`;
}

/** "24 Nov", Colombo time. */
export function dayMonth(at: number): string {
  const d = new Date(at + COLOMBO);
  return `${d.getUTCDate()} ${d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}`;
}

export function roleRows(input: ListInput): RoleRow[] {
  const { now, chaseDays } = input;
  return input.positions.map((p): RoleRow => {
    const closed = p.stage === "closed" || Boolean(p.closedAt);
    const onHold = !closed && (input.holds.includes(p.openingTaId ?? "\0") || p.stage === "on_hold");
    const sets = input.sets.filter((s) => s.openingTaId === p.openingTaId);
    const sent = sets.filter((s) => s.state === "sent");
    const waiting = sent.find((s) => s.candidates.some((c) => !c.decision)) ?? null;
    const ready = sets.find((s) => s.state !== "sent" && s.state !== "withdrawn") ?? null;
    const live = input.interviews.filter((iv) => iv.openingTaId === p.openingTaId && LIVE_INTERVIEW.includes(iv.state));
    const pl = input.placements.filter((x) => x.openingTaId === p.openingTaId && x.state !== "cancelled" && x.state !== "no_show");
    const joined = pl.filter((x) => x.state === "joined" || x.joinedAt);
    const toJoin = pl.filter((x) => !(x.state === "joined" || x.joinedAt));

    const counts: Record<StepKey, number | null> = {
      ta: p.pendingCount,
      client: sent.reduce((n, s) => n + s.candidates.filter((c) => !c.decision).length, 0),
      interv: live.length,
      offer: toJoin.filter((x) => !x.joinDate).length,
      join: toJoin.filter((x) => x.joinDate).length,
      guar: joined.length,
    };

    const silent = waiting?.receivedAt ? days(waiting.receivedAt, now) : 0;
    const late = !!waiting && silent > chaseDays;
    const ta = p.primaryTaId ? input.taFirstNameOf(p.primaryTaId) : null;
    const contact = input.contactFirstNameOf(p);
    const base = { id: p.id, clientName: input.clientNameOf(p), title: p.title, ownerId: p.ownerId, placed: pl.length, counts, closed, onHold };
    const row = (r: Partial<RoleRow> & Pick<RoleRow, "statusText" | "tone">): RoleRow => ({
      ...base,
      problemStep: null,
      action: null,
      withClient: !!waiting,
      waitingDays: waiting ? silent : 0,
      ...r,
    });

    if (closed) return row({ statusText: "Closed", tone: "quiet", withClient: false });
    if (onHold) return row({ statusText: "On hold", tone: "quiet", withClient: false });

    // Joining day gone and nobody told us: the client's HR is asked.
    const gone = toJoin.find((x) => x.joinDate && x.joinDate < now - DAY);
    if (gone) {
      return row({ statusText: `${gone.candidateName}: joining day passed`, tone: "danger", problemStep: "join", action: { kind: "chase-hr", label: "Chase the HR", on: p.id } });
    }
    if (!p.primaryTaId) {
      return row({ statusText: "Needs a TA", tone: "warn", problemStep: "ta", action: { kind: "choose-ta", label: "Choose a TA", on: p.id } });
    }
    if (!p.jdApprovedAt || input.agreementPendingOf(p)) {
      return row({
        statusText: !p.jdApprovedAt ? "Waiting for the JD to be approved" : "Waiting for the agreement",
        tone: "warn",
        action: { kind: "chase-agreement", label: "Chase the agreement", on: p.id },
      });
    }
    const unsettled = live.find((iv) => !iv.at);
    if (unsettled) {
      return row({ statusText: `Round ${unsettled.round} needs a time`, tone: "warn", problemStep: "interv", action: { kind: "find-a-time", label: "Find a time", on: unsettled.id } });
    }
    if (late) {
      return row({
        statusText: `SET ${waiting!.setNumber} · day ${silent} · no answer`,
        tone: "danger",
        problemStep: "client",
        action: { kind: "call", label: contact ? `Call ${contact}` : "Call the client", on: p.id },
      });
    }
    const booked = live.filter((iv) => iv.at).sort((a, b) => (a.at ?? 0) - (b.at ?? 0))[0];
    if (booked) return row({ statusText: `Round ${booked.round} ${dayTime(booked.at!)}`, tone: "info", problemStep: null });
    if (waiting) return row({ statusText: `SET ${waiting.setNumber} with the client · day ${silent}`, tone: "info" });
    if (ready) return row({ statusText: `SET ${ready.setNumber} ready to send`, tone: "info" });
    if (toJoin.length) {
      const next = toJoin.filter((x) => x.joinDate).sort((a, b) => a.joinDate! - b.joinDate!)[0];
      return row({ statusText: next ? `Joins ${dayMonth(next.joinDate!)}` : "Offer made", tone: "ok" });
    }
    if (joined.length) return row({ statusText: `Placed ${joined.length}, guarantee running`, tone: "ok" });
    // Searching, with nothing yet at the client: the TA is asked for CVs.
    return row({
      statusText: `Open ${Math.max(1, days(p.handedOverAt || p.createdAt, now))} days · no CV set yet`,
      tone: "warn",
      problemStep: "ta",
      action: { kind: "ask-ta", label: ta ? `Ask ${ta} for CVs` : "Ask the TA for CVs", on: p.id },
    });
  });
}

export function listView(input: ListInput): ListView {
  const rows = roleRows(input);
  const open = rows.filter((r) => !r.closed);
  const weekEnd = input.now + 7 * DAY;
  const live = input.interviews.filter((iv) => LIVE_INTERVIEW.includes(iv.state));
  const joining = input.placements.filter((x) => x.state === "placed" && !x.joinedAt && x.joinDate && x.joinDate >= input.now - DAY);
  const waiting = open.filter((r) => r.withClient).sort((a, b) => b.waitingDays - a.waitingDays);
  return {
    rows,
    needsYou: open.filter((r) => r.action).length,
    withClient: waiting.length,
    oldestWaitDays: waiting[0]?.waitingDays ?? 0,
    oldestWaitClient: waiting[0]?.clientName ?? null,
    interviews: live.length,
    interviewsThisWeek: live.filter((iv) => iv.at && iv.at <= weekEnd && iv.at >= input.now - DAY).length,
    joining: joining.length,
    nextJoinAt: joining.map((x) => x.joinDate!).sort((a, b) => a - b)[0] ?? null,
    onHold: open.filter((r) => r.onHold).length,
  };
}

export interface ClientGroup {
  name: string;
  rows: RoleRow[];
}

/** Rows grouped by client in the order of the most urgent role in each group (or the given order when none is). */
export function groupByClient(rows: RoleRow[], needsYouFirst: boolean): ClientGroup[] {
  const groups = new Map<string, RoleRow[]>();
  for (const r of rows) groups.set(r.clientName, [...(groups.get(r.clientName) ?? []), r]);
  const out = [...groups].map(([name, list]) => ({ name, rows: list }));
  if (needsYouFirst) {
    const urgent = (g: ClientGroup) => (g.rows.some((r) => r.tone === "danger") ? 0 : g.rows.some((r) => r.action) ? 1 : 2);
    out.sort((a, b) => urgent(a) - urgent(b));
  }
  return out;
}

export type ListFilter = "all" | "mine" | "needs" | "hold";

export function filterRows(rows: RoleRow[], filter: ListFilter, query: string, meId: string): RoleRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (q && !(r.title + " " + r.clientName).toLowerCase().includes(q)) return false;
    if (filter === "hold") return r.onHold;
    if (r.closed) return false;
    if (filter === "mine" && r.ownerId !== meId) return false;
    return filter !== "needs" || !!r.action;
  });
}
