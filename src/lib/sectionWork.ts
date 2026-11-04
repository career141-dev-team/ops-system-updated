/**
 * What is waiting, and where (24, section 4).
 *
 * The header and the day page both have to answer the same question - "where
 * is my work?" - and they must never disagree. So neither of them counts
 * anything itself: both read this.
 *
 * The count is deliberately one thing and not a clever score: an open task
 * assigned to you, placed on the page its own link points at. A task always
 * carries the link it takes you to, so the page a piece of work belongs to is
 * a fact we already hold, not a guess. Drafts waiting for approval are counted
 * too, on the day page, because that is where they are read.
 *
 * Nothing here touches a database.
 */

import { NAV, pageAndSectionFor } from "@/lib/nav";

export interface WorkCount {
  /** Open work on this page, late included. */
  waiting: number;
  /** How much of it is past its time. */
  late: number;
}

export interface WorkThing {
  link: string | null;
  dueAt: number;
}

const empty = (): WorkCount => ({ waiting: 0, late: 0 });

/**
 * Work by page href, then by section key.
 *
 * A task whose link is a page we do not have - or no link at all - counts on
 * the day itself, because the day is the page that must never lose anything.
 */
export function workByPage(things: WorkThing[], now: number): Record<string, WorkCount> {
  const counts: Record<string, WorkCount> = {};
  for (const section of NAV) {
    counts[section.key] = empty();
    for (const page of section.pages) counts[page.href] = empty();
  }

  for (const thing of things) {
    const found = thing.link ? pageAndSectionFor(thing.link) : null;
    const href = found ? found.page.href : "/";
    const key = found ? found.section.key : NAV[0].key;
    const late = thing.dueAt < now ? 1 : 0;
    counts[href].waiting += 1;
    counts[href].late += late;
    counts[key].waiting += 1;
    counts[key].late += late;
  }

  return counts;
}

/**
 * The same count, in words, for the line under a section on the day page.
 *
 * Plain and countable: a person should be able to check it by opening the
 * page and counting the rows.
 */
export function workInWords(count: WorkCount | undefined): string {
  if (!count || count.waiting === 0) return "Nothing waiting";
  const things = count.waiting === 1 ? "1 thing waiting" : count.waiting + " things waiting";
  if (count.late === 0) return things;
  return things + ", " + count.late + " late";
}
