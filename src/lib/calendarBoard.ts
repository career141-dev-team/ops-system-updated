/**
 * The calendar's week (v6 K1, 19 Nov): which cards each filter keeps, the clock on a card and the
 * words for the week. Pure, so the page only reads the desk and draws.
 *
 * Client interviews come from the interviews table. Internal interviews (26 Nov) come from the
 * applicants at stage "interview" with a time (app/calendar/page.tsx), booked in app/hiring.
 * Team meetings have no source yet, so that filter honestly shows nothing; the day one has a source
 * it needs no change here.
 */
import { COLOMBO_OFFSET_MS, DAY } from "@/lib/calendar";

export type CalendarKind = "client" | "internal" | "meeting" | "joining";
export type CalendarFilter = "mine" | "team" | "client" | "internal" | "meetings" | "joining";

export const CALENDAR_FILTERS: { key: CalendarFilter; label: string }[] = [
  { key: "mine", label: "Mine" },
  { key: "team", label: "Team" },
  { key: "client", label: "Client interviews" },
  { key: "internal", label: "Internal interviews" },
  { key: "meetings", label: "Meetings" },
  { key: "joining", label: "Joining days" },
];

const KIND_OF: Partial<Record<CalendarFilter, CalendarKind>> = { client: "client", internal: "internal", meetings: "meeting", joining: "joining" };

/** The filter named in the address; anything else is the whole team. */
export function filterFrom(raw: string | undefined): CalendarFilter {
  return CALENDAR_FILTERS.some((f) => f.key === raw) ? (raw as CalendarFilter) : "team";
}

/** Keep the cards a filter asks for. "Mine" is the ones this person owns. */
export function filterCards<T extends { kind: CalendarKind; ownerId: string | null }>(cards: T[], filter: CalendarFilter, meId: string): T[] {
  if (filter === "team") return cards;
  if (filter === "mine") return cards.filter((c) => c.ownerId === meId);
  const kind = KIND_OF[filter];
  return cards.filter((c) => c.kind === kind);
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
