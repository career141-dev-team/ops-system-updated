/**
 * The shell's own map (24, sections 3, 12 and 13).
 *
 * A sidebar, in groups that do not change as you work: the day, the
 * workspace, the records, the tools. The owner showed two screens of an ATS
 * on 5 November and asked for this shape - everything reachable from
 * anywhere, categorised by what kind of thing it is, with the *work* itself
 * on the board rather than in the menu.
 *
 * Every page in the app is in exactly one group. A page that is in none is a
 * page nobody can find, which is how we ended up with twenty-four links in a
 * row; a test fails if one goes missing.
 */

export interface NavPage {
  href: string;
  what: string;
  /** What this page is for, in one line. Shown under the name where there is room. */
  about: string;
  /** Needed to see it at all; everything else is for everybody. */
  needs?: "money.manage" | "settings.manage" | "report.read";
}

export interface NavSection {
  key: string;
  /** The small heading above the group. Empty for the first one, which needs none. */
  what: string;
  about: string;
  pages: NavPage[];
}

export const NAV: NavSection[] = [
  {
    key: "today",
    what: "",
    about: "What is waiting on you now, and where all the work is",
    pages: [
      { href: "/", what: "Your day", about: "To approve, due today, late, and every clock that is running" },
      { href: "/work", what: "The work", about: "Every enquiry and position in the stage it is really in" },
      { href: "/mail", what: "Inbox", about: "Every conversation, email and WhatsApp, and the calls we were asked to make" },
    ],
  },
  {
    key: "records",
    what: "Records",
    about: "The three things this desk keeps, and the money that comes of them",
    pages: [
      { href: "/clients", what: "Clients", about: "The companies we work for, and the enquiries that are not one yet" },
      { href: "/positions", what: "Positions", about: "What each client asked for, and everything the search does for it" },
      { href: "/money", what: "Money", about: "Placements, invoices, the guarantee, and closing a position properly" },
    ],
  },
  {
    key: "tools",
    what: "",
    about: "Read once a week, and set up once",
    pages: [
      { href: "/reports", what: "Reports", about: "Monday's report for the Director, and the numbers behind the desk" },
      { href: "/settings", what: "Settings", about: "The switches, the wording, the people, the files and the links" },
    ],
  },
];

/**
 * The pages a group's own page covers, for the counts.
 *
 * "Money" is one entry in the sidebar and four tabs underneath; a late
 * invoice still has to show against Money, so a page says what it covers
 * rather than the sidebar guessing.
 */
export const COVERS: Record<string, string[]> = {
  "/clients": ["/clients", "/leads"],
  "/positions": ["/positions", "/sets", "/interviews", "/holds", "/adverts", "/talent-pulse"],
  "/money": ["/money", "/placements", "/invoices", "/guarantees", "/closes"],
  "/reports": ["/reports", "/numbers"],
  "/settings": ["/settings", "/templates", "/files", "/ta", "/import", "/health", "/ai", "/holidays", "/baseline"],
  "/mail": ["/mail", "/calls", "/messages", "/tasks"],
};

/**
 * Which group a path is in.
 *
 * The longest matching page wins, so /sets/abc is the sets page and / is only
 * ever the day itself.
 */
export function sectionFor(path: string): NavSection {
  return pageAndSectionFor(path)?.section ?? NAV[0];
}

/**
 * The page a path belongs to, and its group.
 *
 * A sidebar entry covers more than its own path: /sets/abc is the Positions
 * entry, because a CV set is a face of a position and not a place of its own
 * (25, section 3). What each entry covers is in COVERS, so one list decides
 * both the marking and the counts.
 */
export function pageAndSectionFor(path: string): { page: NavPage; section: NavSection } | null {
  let best: { page: NavPage; section: NavSection; length: number } | null = null;
  for (const section of NAV) {
    for (const page of section.pages) {
      for (const under of COVERS[page.href] ?? [page.href]) {
        const matches = under === "/" ? path === "/" : path === under || path.startsWith(under + "/");
        if (matches && (!best || under.length > best.length)) {
          best = { page, section, length: under.length };
        }
      }
    }
  }
  return best ? { page: best.page, section: best.section } : null;
}

/** Is this the entry we are under? The same rule, for marking it. */
export function isHere(path: string, href: string): boolean {
  return (COVERS[href] ?? [href]).some((under) =>
    under === "/" ? path === "/" : path === under || path.startsWith(under + "/"),
  );
}
