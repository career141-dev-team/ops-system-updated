import { COLOMBO_OFFSET_MS } from "@/lib/calendar";

/**
 * ISO week number of the Colombo day (22 Nov). Positions said "week 48" on Sat 21 Nov, which
 * is week 47: the old sum kept the time of day, so any time after midnight pushed it up a week.
 */
export function colomboIsoWeek(at: number): number {
  const d = new Date(at + COLOMBO_OFFSET_MS);
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  // The Thursday of this ISO week decides which year, and so which week, it belongs to.
  const thursday = day + (4 - (new Date(day).getUTCDay() || 7)) * 86_400_000;
  const jan1 = Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1);
  return Math.floor((thursday - jan1) / (7 * 86_400_000)) + 1;
}
