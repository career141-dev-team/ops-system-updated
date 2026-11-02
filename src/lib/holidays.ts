/**
 * The days the office is shut (15, Phase 1 step 10).
 *
 * Sri Lanka has many public and poya holidays, and until the list is filled
 * every working-day clock in Ops is wrong: the seven working days of CV
 * ownership, the sixty working days to find a replacement, the five working
 * days after a no-show. The calendar already skips weekends; this is what
 * tells it about the rest.
 *
 * The list arrives as a pasted block, because that is how it exists — a page
 * from the gazette or a copied table — so the parsing has to be forgiving
 * about separators and strict about dates.
 */

export interface HolidayLine {
  date: string;
  name: string;
}

export interface ParsedHolidays {
  days: HolidayLine[];
  /** A line we could not read, said back so somebody can fix it. */
  problems: string[];
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real date, not just four digits and two dashes. 2026-02-30 is not a day. */
export function isRealDate(value: string): boolean {
  const match = ISO.exec(value.trim());
  if (!match) return false;
  const [, year, month, day] = match;
  const at = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return at.toISOString().slice(0, 10) === value.trim();
}

/**
 * One line is a date and a name: "2027-01-15, Thai Pongal", or with a tab, or
 * with two spaces. A line with only a date is kept with no name, because the
 * date is the part the clocks use.
 */
export function parseHolidayLines(text: string): ParsedHolidays {
  const days: HolidayLine[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [first, ...rest] = line.split(/[,\t]|\s{2,}/);
    const date = (first ?? "").trim();
    if (!isRealDate(date)) {
      problems.push(line);
      continue;
    }
    if (seen.has(date)) continue;
    seen.add(date);
    days.push({ date, name: rest.join(" ").trim().replace(/\s+/g, " ") });
  }
  return { days, problems };
}

/** Only the ones from this year on: a holiday in the past changes nothing. */
export function fromTodayOn(days: HolidayLine[], today: string): HolidayLine[] {
  return days.filter((day) => day.date >= today);
}

export function holidayYears(days: HolidayLine[]): string[] {
  return [...new Set(days.map((d) => d.date.slice(0, 4)))].sort();
}

/**
 * Why the list is not good enough yet, or nothing when it is.
 *
 * A year with three holidays in it is a half-finished paste, not Sri Lanka,
 * and a clock counted against a half-finished list is wrong in a way nobody
 * would notice. Twenty is well below the real number and still catches it.
 */
export function gapInTheList(days: HolidayLine[], today: string): string | null {
  const thisYear = today.slice(0, 4);
  const count = days.filter((d) => d.date.slice(0, 4) === thisYear && d.date >= today).length;
  const next = days.filter((d) => d.date.slice(0, 4) === String(Number(thisYear) + 1)).length;
  if (days.length === 0) return "The holiday list is empty, so every working-day clock counts a poya day as a working day.";
  if (next === 0) return "Nothing is listed for " + (Number(thisYear) + 1) + " yet. Clocks that reach into next year will be wrong.";
  if (count + next < 20) return "There are only " + (count + next) + " days listed from today on. The real list is much longer.";
  return null;
}
