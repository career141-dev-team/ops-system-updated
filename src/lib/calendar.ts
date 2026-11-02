/**
 * Colombo time and working days (15, Phase 1 step 7).
 *
 * Every number in Ops is counted in one of three ways, and they are not the
 * same: hours (the two-hour agreement clock), calendar days (the ninety-day
 * guarantee), and working days (the seven-day CV ownership window, the sixty
 * days to find a replacement). Getting these mixed is how a deadline lands on
 * a Sunday, so they live in one place and are tested.
 */

const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
/** Sri Lanka is UTC+5:30 all year. */
export const COLOMBO_OFFSET_MS = 5.5 * HOUR;

/** The Colombo calendar date of an instant, as YYYY-MM-DD. */
export function colomboDate(at: number): string {
  return new Date(at + COLOMBO_OFFSET_MS).toISOString().slice(0, 10);
}

/** The hour of the Colombo day, 0 to 23. */
export function colomboHour(at: number): number {
  return new Date(at + COLOMBO_OFFSET_MS).getUTCHours();
}

/** Saturday and Sunday are not working days, nor is a date on the holiday list. */
export function isWorkingDay(at: number, holidays: string[] = []): boolean {
  const shifted = new Date(at + COLOMBO_OFFSET_MS);
  const weekday = shifted.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !holidays.includes(colomboDate(at));
}

/** Plain calendar days, for anything counted in days rather than working days. */
export function addCalendarDays(at: number, days: number): number {
  return at + days * DAY;
}

/**
 * Working days forward. Day zero is the instant itself; each step lands on the
 * next day that is worked. Asking for zero gives the same instant back, even
 * when that instant is a Sunday, because "now" is not a deadline.
 */
export function addWorkingDays(at: number, days: number, holidays: string[] = []): number {
  if (days <= 0) return at;
  let left = days;
  let cursor = at;
  while (left > 0) {
    cursor += DAY;
    if (isWorkingDay(cursor, holidays)) left -= 1;
  }
  return cursor;
}

/** How many working days lie between two instants, not counting the first. */
export function workingDaysBetween(from: number, to: number, holidays: string[] = []): number {
  if (to <= from) return 0;
  let count = 0;
  let cursor = from;
  while (cursor < to) {
    cursor += DAY;
    if (cursor <= to && isWorkingDay(cursor, holidays)) count += 1;
  }
  return count;
}

/** The next 09:00 Colombo at or after an instant — when the day's tasks land. */
export function nextNineAm(at: number): number {
  const date = new Date(at + COLOMBO_OFFSET_MS);
  const nine = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 9) - COLOMBO_OFFSET_MS;
  return nine > at ? nine : nine + DAY;
}

/** Candidate and client traffic runs 08:00 to 20:00 Colombo, never at night. */
export function inWorkingHours(at: number): boolean {
  const hour = colomboHour(at);
  return hour >= 8 && hour < 20;
}
