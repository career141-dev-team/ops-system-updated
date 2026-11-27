/**
 * The Positions list (v6 frame P1, 19 Nov): every role as one row, grouped by client, with where it
 * stands in the five steps and the one next action.
 *
 * Pure: the page hands in the rows it read and the names it looked up, and gets back what to draw.
 * Nothing here reads a database or sends anything, so every rule below is a test.
 */

import { LIVE_INTERVIEW, type CountKind } from "./positionCounts";
import { unanswered } from "./setsBoard";

const DAY = 86_400_000;
const COLOMBO = 5.5 * 3_600_000;

export type StepKey = "ta" | "sets" | "interv" | "offer" | "join";
/**
 * `count` names the list behind the number (positionCounts.ts); TA's number comes from the TA System with
 * no list here, so it opens nothing. 26 Nov (Nov 25 ops meeting): "Client" became "Sets", "Guar." went.
 */
export const STEPS: { key: StepKey; label: string; count?: CountKind }[] = [
  { key: "ta", label: "TA" },
  { key: "sets", label: "Sets", count: "sets" },
  { key: "interv", label: "Interv.", count: "live" },
  { key: "offer", label: "Offer", count: "offered" },
  { key: "join", label: "Join", count: "joined" },
];

export type RowTone = "danger" | "warn" | "info" | "ok" | "quiet";

export type ActionKind = "call" | "find-a-time" | "ask-ta" | "chase-hr" | "chase-agreement" | "choose-ta" | "confirm-nationality" | "testimonial";
export interface RowAction {
  kind: ActionKind;
  label: string;
  /** The id the panel is about: the role, the interview for find-a-time, or the placement. */
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
  backupOwnerId?: string;
  clientType?: "local" | "international" | "";
  value?: number | null;
  currency?: string;
  priority?: "P1" | "P2" | "P3" | "";
  createdAt: number;
}
export interface SetIn {
  openingTaId: string;
  setNumber: number;
  state: string;
  receivedAt?: number | null;
  sentAt?: number | null;
  candidates: { decision?: string | null; claimedAt?: number | null }[];
}
export interface InterviewIn {
  id: string;
  openingTaId: string;
  state: string;
  round: number;
  at: number | null;
}
export interface PlacementIn {
  id: string;
  openingTaId: string;
  state: string;
  joinDate: number | null;
  joinedAt: number | null;
  candidateName: string;
  nationalityConfirmedAt?: number;
  /** The fee invoice has gone to the client, so the nationality can no longer be confirmed (26 Nov, PR 4 review). */
  invoiceSent?: boolean;
  /** A replacement under the guarantee is never invoiced, so its nationality prices nothing. */
  isReplacementOf?: string | null;
  testimonial?: { candidate: "pending" | "done"; client: "pending" | "done" };
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
  /** True when the client has not signed an agreement. */
  agreementPendingOf: (p: PositionIn) => boolean;
  /** The length of the list a step's pop-up shows, so the number and the list cannot disagree. */
  countOf: (p: PositionIn, k: CountKind) => number;
}

export interface RoleRow {
  id: string;
  clientName: string;
  title: string;
  ownerId: string;
  backupOwnerId: string;
  clientType: "local" | "international" | "";
  value: number | null;
  currency: string;
  priority: "P1" | "P2" | "P3" | "";
  placed: number;
  /** null: not read from the TA System. */
  counts: Record<StepKey, number | null>;
  /** The step that is stuck, drawn in the row's tone. */
  problemStep: StepKey | null;
  statusText: string;
  tone: RowTone;
  action: RowAction | null;
  /** Every reason this role needs a person, the one in `statusText` first. Empty: it does not. */
  reasons: { text: string; action: RowAction }[];
  needsYou: boolean;
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
  /** The people the Joining number counts. */
  joiningList: PlacementIn[];
  nextJoinAt: number | null;
  onHold: number;
}

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
    const gotAt = (s: SetIn) => s.receivedAt ?? s.sentAt ?? null;
    // The set the client has sat on longest.
    const waiting = sent.filter((s) => s.candidates.some(unanswered)).sort((a, b) => (gotAt(a) ?? now) - (gotAt(b) ?? now))[0] ?? null;
    const ready = sets.find((s) => s.state !== "sent" && s.state !== "withdrawn") ?? null;
    const live = input.interviews.filter((iv) => iv.openingTaId === p.openingTaId && LIVE_INTERVIEW.includes(iv.state));
    const pl = input.placements.filter((x) => x.openingTaId === p.openingTaId && x.state !== "cancelled" && x.state !== "no_show");
    const joined = pl.filter((x) => x.state === "joined" || x.joinedAt);
    const toJoin = pl.filter((x) => !(x.state === "joined" || x.joinedAt));

    const counts: Record<StepKey, number | null> = {
      ta: p.pendingCount ?? null,
      sets: input.countOf(p, "sets"),
      interv: input.countOf(p, "live"),
      offer: input.countOf(p, "offered"),
      join: input.countOf(p, "joined"),
    };

    const since = waiting ? gotAt(waiting) : null;
    const silent = since ? days(since, now) : 0;
    const contact = input.contactFirstNameOf(p);
    const base = {
      id: p.id,
      clientName: input.clientNameOf(p),
      title: p.title,
      ownerId: p.ownerId,
      backupOwnerId: p.backupOwnerId ?? "",
      clientType: p.clientType ?? "",
      value: p.value ?? null,
      currency: p.currency ?? "",
      priority: p.priority ?? "",
      placed: pl.length,
      counts,
      closed,
      onHold,
    };
    const row = (r: Partial<RoleRow> & Pick<RoleRow, "statusText" | "tone">): RoleRow => ({
      ...base,
      problemStep: null,
      action: null,
      reasons: [],
      needsYou: false,
      withClient: !!waiting,
      waitingDays: waiting ? silent : 0,
      ...r,
    });

    if (closed) return row({ statusText: "Closed", tone: "quiet", withClient: false });
    if (onHold) return row({ statusText: "On hold", tone: "quiet", withClient: false });

    // 26 Nov (Nov 25 ops meeting): these, and nothing else, are why a role needs a person. Most urgent first.
    const needs: (Pick<RoleRow, "statusText" | "tone" | "problemStep"> & { action: RowAction })[] = [];
    const need = (statusText: string, tone: RowTone, problemStep: StepKey | null, kind: ActionKind, label: string, on: string = p.id) =>
      needs.push({ statusText, tone, problemStep, action: { kind, label, on } });

    // Joining day gone and nobody told us: the client's HR is asked.
    const gone = toJoin.find((x) => x.joinDate && x.joinDate < now - DAY);
    if (gone) need(`${gone.candidateName}: joining day passed`, "danger", "join", "chase-hr", "Chase the HR");
    if (!p.primaryTaId) need("Needs a TA", "warn", "ta", "choose-ta", "Choose a TA");
    if (input.agreementPendingOf(p)) need("Agreement not signed", "warn", null, "chase-agreement", "Chase the agreement");
    const unsettled = live.find((iv) => !iv.at);
    if (unsettled) need(`Round ${unsettled.round} needs a time`, "warn", "interv", "find-a-time", "Find a time", unsettled.id);
    if (waiting && silent > chaseDays) need(`SET ${waiting.setNumber} · day ${silent} · no answer`, "danger", "sets", "call", contact ? `Call ${contact}` : "Call the client");
    for (const x of joined.filter((j) => j.state === "joined")) {
      if (!x.nationalityConfirmedAt && !x.invoiceSent && !x.isReplacementOf) need(`${x.candidateName}: nationality not confirmed`, "warn", "join", "confirm-nationality", "Confirm nationality", x.id);
    }
    for (const x of joined.filter((j) => j.state === "joined")) {
      // No testimonial record means they joined before we asked for them: nothing is pending.
      const sides = (["candidate", "client"] as const).filter((s) => x.testimonial?.[s] === "pending");
      if (sides.length) need(`${x.candidateName}: testimonial pending (${sides.join(" and ")})`, "warn", "join", "testimonial", "Testimonial", x.id);
    }
    if (needs.length) return row({ ...needs[0], reasons: needs.map((n) => ({ text: n.statusText, action: n.action })), needsYou: true });

    // Nothing below needs a person; a button may still be offered.
    if (!p.jdApprovedAt) {
      return row({ statusText: "Waiting for the JD to be approved", tone: "warn", action: { kind: "chase-agreement", label: "Chase the agreement", on: p.id } });
    }
    const booked = live.filter((iv) => iv.at).sort((a, b) => (a.at ?? 0) - (b.at ?? 0))[0];
    if (booked) return row({ statusText: `Round ${booked.round} ${dayTime(booked.at!)}`, tone: "info" });
    if (waiting) return row({ statusText: `SET ${waiting.setNumber} with the client · day ${silent}`, tone: "info" });
    if (ready) return row({ statusText: `SET ${ready.setNumber} ready to send`, tone: "info" });
    if (toJoin.length) {
      const next = toJoin.filter((x) => x.joinDate).sort((a, b) => a.joinDate! - b.joinDate!)[0];
      return row({ statusText: next ? `Joins ${dayMonth(next.joinDate!)}` : "Offer made", tone: "ok" });
    }
    if (joined.length) return row({ statusText: `Placed ${joined.length}, guarantee running`, tone: "ok" });
    // Searching, with nothing yet at the client: do not flag every active search with "Ask TA for CVs".
    return row({
      statusText: `Searching · open ${Math.max(1, days(p.handedOverAt || p.createdAt, now))} days`,
      tone: "info",
    });
  });
}

export function listView(input: ListInput): ListView {
  const rows = roleRows(input);
  const open = rows.filter((r) => !r.closed);
  const weekEnd = input.now + 7 * DAY;
  const openIds = new Set(open.map((r) => r.id));
  const openings = new Set(input.positions.filter((p) => openIds.has(p.id)).map((p) => p.openingTaId));
  const joining = input.placements
    .filter((x) => x.state === "placed" && !x.joinedAt && x.joinDate && x.joinDate >= input.now - DAY)
    .sort((a, b) => a.joinDate! - b.joinDate!);
  const waiting = open.filter((r) => r.withClient).sort((a, b) => b.waitingDays - a.waitingDays);
  return {
    rows,
    needsYou: open.filter((r) => r.needsYou).length,
    withClient: waiting.length,
    oldestWaitDays: waiting[0]?.waitingDays ?? 0,
    oldestWaitClient: waiting[0]?.clientName ?? null,
    interviews: open.reduce((n, r) => n + (r.counts.interv ?? 0), 0),
    interviewsThisWeek: input.interviews.filter((iv) => openings.has(iv.openingTaId) && LIVE_INTERVIEW.includes(iv.state) && iv.at && iv.at <= weekEnd && iv.at >= input.now - DAY).length,
    joining: joining.length,
    joiningList: joining,
    nextJoinAt: joining[0]?.joinDate ?? null,
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
    const urgent = (g: ClientGroup) => (g.rows.some((r) => r.tone === "danger" && r.needsYou) ? 0 : g.rows.some((r) => r.needsYou) ? 1 : 2);
    out.sort((a, b) => urgent(a) - urgent(b));
  }
  return out;
}

export type ListFilter = "all" | "mine" | "needs" | "client" | "hold";

export interface RoleFilterOptions {
  opsId?: string;
  clientType?: string;
  priority?: string;
  min?: string;
  max?: string;
  currency?: string;
  reason?: string;
}

const REASON_LABELS: Partial<Record<ActionKind, string>> = {
  "choose-ta": "Needs a TA",
  "chase-agreement": "Agreement not signed",
  "find-a-time": "Needs a time",
  call: "Client feedback overdue",
  "chase-hr": "Joining day passed",
  "confirm-nationality": "Nationality not confirmed",
  testimonial: "Testimonial pending",
};

/** Counts open roles per "Needs your attention" reason so each count can be clicked to filter. */
export function reasonCounts(rows: RoleRow[]): { kind: ActionKind; label: string; count: number }[] {
  const counts = new Map<ActionKind, number>();
  for (const r of rows) {
    if (r.closed || r.onHold || !r.needsYou) continue;
    const seen = new Set<ActionKind>();
    for (const why of r.reasons) {
      if (seen.has(why.action.kind)) continue;
      seen.add(why.action.kind);
      counts.set(why.action.kind, (counts.get(why.action.kind) ?? 0) + 1);
    }
  }
  const order: ActionKind[] = ["chase-hr", "choose-ta", "chase-agreement", "find-a-time", "call", "confirm-nationality", "testimonial"];
  return order
    .filter((k) => (counts.get(k) ?? 0) > 0)
    .map((kind) => ({ kind, label: REASON_LABELS[kind] ?? kind, count: counts.get(kind)! }));
}

export function filterRoleRows(
  rows: RoleRow[],
  filter: ListFilter,
  query: string,
  meId: string,
  opts: RoleFilterOptions = {},
): RoleRow[] {
  const q = query.trim().toLowerCase();
  const min = opts.min?.trim() ? Number(opts.min) : null;
  const max = opts.max?.trim() ? Number(opts.max) : null;
  return rows.filter((r) => {
    if (q && !(r.title + " " + r.clientName).toLowerCase().includes(q)) return false;
    if (filter === "hold") {
      if (!r.onHold) return false;
    } else if (r.closed) {
      return false;
    }
    if (filter === "client" && !r.withClient) return false;
    if (filter === "mine" && r.ownerId !== meId && r.backupOwnerId !== meId) return false;
    if (filter === "needs" && !r.needsYou) return false;
    if (opts.opsId && r.ownerId !== opts.opsId && r.backupOwnerId !== opts.opsId) return false;
    if (opts.clientType && r.clientType !== opts.clientType) return false;
    if (opts.priority && r.priority !== opts.priority) return false;
    if (opts.reason && !r.reasons.some((why) => why.action.kind === opts.reason)) return false;
    if ((min !== null && Number.isFinite(min)) || (max !== null && Number.isFinite(max))) {
      if (r.value === null) return false;
      if ((r.currency || "LKR") !== (opts.currency || "LKR")) return false;
      if (min !== null && Number.isFinite(min) && r.value < min) return false;
      if (max !== null && Number.isFinite(max) && r.value > max) return false;
    }
    return true;
  });
}

export function filterRows(rows: RoleRow[], filter: ListFilter, query: string, meId: string): RoleRow[] {
  return filterRoleRows(rows, filter, query, meId);
}
