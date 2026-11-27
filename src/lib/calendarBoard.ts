/**
 * The calendar's week (v6 K1, 19 Nov; updated 26 Nov PR 8):
 * - "Meetings" renamed to "Client meetings".
 * - Mine / Team (`?who=`) split from category (`?kind=`) so the two combine.
 * - `calendarItems(db)` builds all calendar events in one pure place for both `/calendar` and `/leads`.
 */
import type { OpsDatabase, OpsInterview } from "@/data/types";
import { COLOMBO_OFFSET_MS, DAY } from "@/lib/calendar";
import { boardStatus, isOff } from "@/lib/interviews";

export type CalendarKind = "client" | "internal" | "meeting" | "joining";
export type CalendarFilter = "mine" | "team" | "client" | "internal" | "meetings";
export type CalendarWho = "mine" | "team";
export type CalendarKindFilter = "all" | "client" | "internal" | "meetings";

export const CALENDAR_FILTERS: { key: CalendarFilter; label: string }[] = [
  { key: "mine", label: "Mine" },
  { key: "team", label: "Team" },
  { key: "client", label: "Client interviews" },
  { key: "internal", label: "Internal interviews" },
  { key: "meetings", label: "Client meetings" },
];

export const CALENDAR_WHO_FILTERS: { key: CalendarWho; label: string }[] = [
  { key: "mine", label: "Mine" },
  { key: "team", label: "Team" },
];

export const CALENDAR_CATEGORY_FILTERS: { key: CalendarKindFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "client", label: "Client interviews" },
  { key: "internal", label: "Internal interviews" },
  { key: "meetings", label: "Client meetings" },
];

const KIND_OF: Partial<Record<CalendarKindFilter, CalendarKind>> = {
  client: "client",
  internal: "internal",
  meetings: "meeting",
};

/** The filter named in the address; anything else is the whole team. */
export function filterFrom(raw: string | undefined): CalendarFilter {
  return CALENDAR_FILTERS.some((f) => f.key === raw) ? (raw as CalendarFilter) : "team";
}

export function whoFrom(rawWho: string | undefined, rawShow?: string | undefined): CalendarWho {
  if (rawWho === "mine" || rawWho === "team") return rawWho;
  if (rawShow === "mine") return "mine";
  return "team";
}

export function kindFrom(rawKind: string | undefined, rawShow?: string | undefined): CalendarKindFilter {
  if (CALENDAR_CATEGORY_FILTERS.some((f) => f.key === rawKind)) return rawKind as CalendarKindFilter;
  if (rawShow === "client" || rawShow === "internal" || rawShow === "meetings") {
    return rawShow;
  }
  return "all";
}

/** Keep the cards a filter asks for. "Mine" is the ones this person owns. */
export function filterCards<T extends { kind: CalendarKind; ownerId: string | null }>(cards: T[], filter: CalendarFilter, meId: string): T[] {
  if (filter === "team") return cards;
  if (filter === "mine") return cards.filter((c) => c.ownerId === meId);
  const kind = KIND_OF[filter];
  return cards.filter((c) => c.kind === kind);
}

/** Combine Mine / Team with a category filter (26 Nov, PR 8). */
export function filterCalendarCards<T extends { kind: CalendarKind; ownerId: string | null }>(
  cards: T[],
  filters: { who: CalendarWho; kind: CalendarKindFilter },
  meId: string,
): T[] {
  let out = cards;
  if (filters.who === "mine") out = out.filter((c) => c.ownerId === meId);
  const mapped = KIND_OF[filters.kind];
  if (mapped) out = out.filter((c) => c.kind === mapped);
  return out;
}

export interface CalendarEventItem {
  id: string;
  kind: CalendarKind;
  ownerId: string | null;
  when: number | null;
  title: string;
  sub: string;
  href: string;
  iv?: OpsInterview;
  status?: ReturnType<typeof boardStatus>;
  clientName?: string;
  roleTitle?: string;
  positionId?: string | null;
}

/** Build all calendar items from the desk in one pure function (26 Nov, PR 8). */
export function calendarItems(
  db: Pick<OpsDatabase, "interviews" | "meetings" | "placements" | "applicants" | "vacancies" | "leads" | "clients" | "positions">,
): CalendarEventItem[] {
  const clientById = new Map(db.clients.map((c) => [c.id, c]));
  const positionById = new Map(db.positions.map((p) => [p.id, p]));
  const leadById = new Map(db.leads.map((l) => [l.id, l]));
  const vacancyById = new Map((db.vacancies ?? []).map((v) => [v.id, v]));

  const interviewsNewest = [...db.interviews].sort((a, b) => b.createdAt - a.createdAt);
  const interviewItems: CalendarEventItem[] = interviewsNewest.map((iv) => {
    const position = iv.positionId ? positionById.get(iv.positionId) ?? null : (db.positions.find((p) => p.openingTaId === iv.openingTaId) ?? null);
    const client = iv.clientId ? clientById.get(iv.clientId) ?? null : position?.clientId ? clientById.get(position.clientId) ?? null : null;
    const clientName = client?.name ?? "Client";
    return {
      id: iv.id,
      kind: "client",
      ownerId: iv.ownerId,
      when: isOff(iv.state) ? null : iv.at,
      title: iv.candidateName,
      sub: `Round ${iv.round} · client interview`,
      href: `/interviews/${iv.id}`,
      iv,
      status: boardStatus(iv),
      clientName,
      roleTitle: position?.title ?? iv.openingTaId,
      positionId: position?.id ?? iv.positionId,
    };
  });

  const meetingItems: CalendarEventItem[] = db.meetings
    .filter((m) => m.state === "booked" && m.at)
    .map((m) => {
      const lead = leadById.get(m.leadId);
      const client = lead?.clientTaId
        ? db.clients.find((c) => c.taClientId === lead.clientTaId) ?? db.clients.find((c) => c.leadId === m.leadId) ?? null
        : db.clients.find((c) => c.leadId === m.leadId) ?? null;
      const who = client?.name ?? lead?.company ?? "Client";
      const label = m.kind === "requirement" ? "Requirement meeting" : "Intro call";
      return {
        id: "mtg_" + m.id,
        kind: "meeting",
        // "Mine" for a meeting means its organiser (26 Nov, PR 8).
        ownerId: m.organiserId ?? lead?.ownerId ?? client?.ownerId ?? null,
        when: m.at,
        title: who,
        sub: label,
        href: lead ? `/leads/${lead.id}?step=${m.kind === "requirement" ? "requirement" : "intro"}` : client ? `/clients/${client.id}` : "/leads",
      };
    });

  const joiningItems: CalendarEventItem[] = db.placements
    .filter((pl) => pl.joinDate && pl.state !== "cancelled" && pl.state !== "no_show")
    .map((pl) => {
      const client = pl.clientId ? clientById.get(pl.clientId) ?? null : null;
      const pos = pl.positionId ? positionById.get(pl.positionId) ?? null : null;
      return {
        id: "pl_" + pl.id,
        kind: "joining",
        ownerId: pl.ownerId,
        when: pl.joinDate,
        title: "Joining day",
        sub: [pl.candidateName, client?.name].filter(Boolean).join(" · "),
        href: pos ? `/positions/${pos.id}?view=offer` : `/placements/${pl.id}`,
      };
    });

  const internalItems: CalendarEventItem[] = (db.applicants ?? [])
    .filter((a) => ["interview", "shortlisted", "offered", "decision"].includes(a.stage) && a.interviewAt !== null)
    .map((a) => {
      const vac = vacancyById.get(a.vacancyId);
      return {
        id: "ih_" + a.id,
        kind: "internal",
        ownerId: vac?.ownerId ?? null,
        when: a.interviewAt,
        title: a.name,
        sub: [vac?.title ?? "Scoops & vacancies", a.place].filter(Boolean).join(" · "),
        href: `/hiring/${a.vacancyId}`,
      };
    });

  return [...interviewItems, ...meetingItems, ...joiningItems, ...internalItems];
}

/** "08:30", Colombo time. */
export function clockOf(at: number): string {
  return new Date(at + COLOMBO_OFFSET_MS).toISOString().slice(11, 16);
}

/** "Mon 16 to Sat 21 Nov" from the first day's start (Monday); six days, Saturday included. */
export function weekLabel(mondayMs: number): string {
  const part = (ms: number) => new Date(ms + COLOMBO_OFFSET_MS);
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const a = part(mondayMs);
  const b = part(mondayMs + 5 * DAY);
  const month = (d: Date) => new Date(d).toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const first = names[a.getUTCDay()] + " " + a.getUTCDate() + (a.getUTCMonth() === b.getUTCMonth() ? "" : " " + month(a));
  return first + " to " + names[b.getUTCDay()] + " " + b.getUTCDate() + " " + month(b);
}

/** Day column for Saturday, which `weekDays` leaves out: the day after Friday's end. */
export function saturdayAfter(fridayEndMs: number, now: number) {
  const dayNum = new Date(fridayEndMs + COLOMBO_OFFSET_MS).getUTCDate();
  const today = Math.floor((now + COLOMBO_OFFSET_MS) / DAY) === Math.floor((fridayEndMs + COLOMBO_OFFSET_MS) / DAY);
  return { name: "Sat" as const, dayNum, startMs: fridayEndMs, endMs: fridayEndMs + DAY, isToday: today };
}

/**
 * Where a booked meeting sits on /calendar (22 Nov): the page shows one Monday-to-Saturday week
 * and opens on the current one, so "it is on the Calendar" needs the week to be true. A Sunday
 * call is on no week at all.
 */
export function meetingWeek(now: number, at: number): { offset: number; sunday: boolean; mondayLabel: string } {
  const mondayOf = (t: number) => {
    const local = new Date(t + COLOMBO_OFFSET_MS);
    const toMonday = local.getUTCDay() === 0 ? -6 : 1 - local.getUTCDay();
    return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + toMonday);
  };
  const monday = new Date(mondayOf(at));
  return {
    offset: Math.round((mondayOf(at) - mondayOf(now)) / (7 * DAY)),
    sunday: new Date(at + COLOMBO_OFFSET_MS).getUTCDay() === 0,
    mondayLabel: monday.getUTCDate() + " " + monday.toLocaleString("en-GB", { month: "short", timeZone: "UTC" }),
  };
}

/** "Fri 20 Nov", Colombo. */
export function dayWord(at: number): string {
  const d = new Date(at + COLOMBO_OFFSET_MS);
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return names[d.getUTCDay()] + " " + d.getUTCDate() + " " + d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
}
