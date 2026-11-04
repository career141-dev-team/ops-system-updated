/**
 * The shell's own map (23, section 3).
 *
 * Five sections, two levels, nothing hidden behind a hover. It lives here
 * rather than in the layout so that one list decides the header, what a
 * section is called, and - later - the counts on the day page.
 *
 * Every page in the app is in exactly one section. A page that is in none is
 * a page nobody can find, which is how we ended up with twenty-four links in
 * a row.
 */

export interface NavPage {
  href: string;
  what: string;
  /** Needed to see it at all; everything else is for everybody. */
  needs?: "money.manage" | "settings.manage" | "report.read";
}

export interface NavSection {
  key: string;
  what: string;
  /** One line, for the day page's own summary later. */
  about: string;
  pages: NavPage[];
}

export const NAV: NavSection[] = [
  {
    key: "today",
    what: "Today",
    about: "What is waiting on you now",
    pages: [
      { href: "/", what: "Your day" },
      { href: "/mail", what: "Mail" },
      { href: "/calls", what: "Calls" },
    ],
  },
  {
    key: "clients",
    what: "Clients",
    about: "Who we work for, and what they asked for",
    pages: [
      { href: "/leads", what: "Leads" },
      { href: "/clients", what: "Clients" },
      { href: "/positions", what: "Positions" },
      { href: "/adverts", what: "Adverts" },
      { href: "/talent-pulse", what: "Talent Pulse" },
    ],
  },
  {
    key: "search",
    what: "The search",
    about: "CVs with the client, and the interviews",
    pages: [
      { href: "/sets", what: "CV sets" },
      { href: "/holds", what: "Holds" },
      { href: "/interviews", what: "Interviews" },
    ],
  },
  {
    key: "money",
    what: "Money",
    about: "Placements, fees and the guarantee",
    pages: [
      { href: "/placements", what: "Placements" },
      { href: "/invoices", what: "Invoices" },
      { href: "/guarantees", what: "Guarantees" },
      { href: "/closes", what: "Closing" },
    ],
  },
  {
    key: "setup",
    what: "Set up",
    about: "The report, the numbers and the tools",
    pages: [
      { href: "/reports", what: "Report" },
      { href: "/numbers", what: "Numbers", needs: "report.read" },
      { href: "/ai", what: "AI" },
      { href: "/templates", what: "What we send" },
      { href: "/files", what: "Files" },
      { href: "/ta", what: "TA System" },
      { href: "/import", what: "First day", needs: "settings.manage" },
      { href: "/settings", what: "Settings" },
      { href: "/health", what: "Health" },
    ],
  },
];

/**
 * Which section a path is in.
 *
 * The longest matching page wins, so /sets/abc is in the search and / is only
 * ever the day itself.
 */
export function sectionFor(path: string): NavSection {
  let best: { section: NavSection; length: number } | null = null;
  for (const section of NAV) {
    for (const page of section.pages) {
      const matches = page.href === "/" ? path === "/" : path === page.href || path.startsWith(page.href + "/");
      if (matches && (!best || page.href.length > best.length)) best = { section, length: page.href.length };
    }
  }
  return best?.section ?? NAV[0];
}

/** Is this the page we are on? The same rule, for marking it. */
export function isHere(path: string, href: string): boolean {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}
