/** Colombo-time wording for the role page tabs (UTC+5:30, the way the rest of the app writes a day). */
const COLOMBO = 5.5 * 3_600_000;
const on = (at: number, opts: Intl.DateTimeFormatOptions) =>
  new Date(at + COLOMBO).toLocaleString("en-GB", { ...opts, timeZone: "UTC" });

export const dayMonth = (at: number) => on(at, { day: "numeric", month: "short" });
export const weekdayDayMonth = (at: number) => on(at, { weekday: "short", day: "numeric", month: "short" });
export const clock = (at: number) => on(at, { hour: "2-digit", minute: "2-digit", hour12: false });
export const dayKey = (at: number) => new Date(at + COLOMBO).toISOString().slice(0, 10);
export const first = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] ?? "";
