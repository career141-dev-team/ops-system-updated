/**
 * The shell's own map (23, section 3; rewritten 4 Nov for 24).
 *
 * Five sections, two levels, nothing hidden behind a hover. It lives here
 * rather than in the layout so that one list decides the header, what a
 * section is called, what each page is *for*, and the counts beside them.
 *
 * Every page in the app is in exactly one section. A page that is in none is
 * a page nobody can find, which is how we ended up with twenty-four links in
 * a row.
 *
 * Two things changed on 4 November, both because the owner could not find the
 * features we had built:
 *
 * 1. Every page now says what it is for, in one line, and the header shows
 *    that line. A list of 24 words taught nobody anything; neither did a list
 *    of five.
 * 2. Clicking a section opens its pages where you are, instead of jumping you
 *    to the first one. You can look at what is in "Money" without leaving the
 *    lead you were reading.
 */

export interface NavPage {
  href: string;
  what: string;
  /** What this page is for, in one line. Shown in the header, under the name. */
  about: string;
  /** Needed to see it at all; everything else is for everybody. */
  needs?: "money.manage" | "settings.manage" | "report.read";
}

export interface NavSection {
  key: string;
  what: string;
  /** One line: what this part of the desk is for. */
  about: string;
  pages: NavPage[];
}

export const NAV: NavSection[] = [
  {
    key: "today",
    what: "Today",
    about: "What is waiting on you now, and what the system is about to do by itself",
    pages: [
      { href: "/", what: "Your day", about: "To approve, due today, late, and every clock that is running" },
      { href: "/mail", what: "Mail", about: "What came in to the boxes we read, and what still needs filing" },
      { href: "/calls", what: "Calls", about: "Calls the system asked for, and what was said on them" },
    ],
  },
  {
    key: "work",
    what: "The work",
    about: "Every enquiry and every position, in the stage it is really in",
    pages: [
      { href: "/work", what: "The board", about: "Where everything is, from the first enquiry to a closed position" },
      { href: "/leads", what: "Leads", about: "An enquiry from anywhere, through to a signed agreement" },
      { href: "/clients", what: "Clients", about: "Who they are, who owns them, where to invoice, their WhatsApp group" },
      { href: "/positions", what: "Positions", about: "What each client asked for, and the opening the TA System runs" },
      { href: "/sets", what: "CV sets", about: "Five CVs or more, drafted, approved, sent, and the clocks that follow" },
      { href: "/holds", what: "Holds", about: "A search paused because the client went quiet, reviewed every thirty days" },
      { href: "/interviews", what: "Interviews", about: "Times agreed, the invite, who turned up, and what the client decided" },
      { href: "/adverts", what: "Adverts", about: "TopJobs and LinkedIn: ordered, live, and closed after two weeks" },
      { href: "/talent-pulse", what: "Talent Pulse", about: "Tuesday's list of open roles, for marketing to post on Wednesday" },
    ],
  },
  {
    key: "money",
    what: "Money",
    about: "What a placement is worth, getting it paid, and the ninety days after",
    pages: [
      { href: "/placements", what: "Placements", about: "A hire from the TA System: the package, the joining day, the fee rule" },
      { href: "/invoices", what: "Invoices", about: "Drafted on the joining day, due in thirty, chased at 1% a month" },
      { href: "/guarantees", what: "Guarantees", about: "Ninety days from joining, valid only on a fee that is fully paid" },
      { href: "/closes", what: "Closing", about: "The checklist every ending goes through before a position is closed" },
    ],
  },
  {
    key: "setup",
    what: "Set up",
    about: "The tools behind the desk: the report, the numbers, the AI, and the switches",
    pages: [
      { href: "/reports", what: "Report", about: "Monday's active-positions report, read here before the Director gets it" },
      { href: "/numbers", what: "Numbers", about: "How long each step really takes, and what each number is made of", needs: "report.read" },
      { href: "/ai", what: "AI", about: "What the model is allowed to do, what it cost today, and how often it was right" },
      { href: "/templates", what: "What we send", about: "The wording of every routine notice, in one place" },
      { href: "/files", what: "Files", about: "The agreement template, and every CV exactly as the client got it" },
      { href: "/ta", what: "TA System", about: "The link to the recruiters: what we read, what we wrote, what is waiting" },
      { href: "/import", what: "First day", about: "The one-off import of clients, owners, people and holidays", needs: "settings.manage" },
      { href: "/settings", what: "Settings", about: "Every number the rules use, and the switches that stop things going out" },
      { href: "/health", what: "Health", about: "Everything the system does by itself, and when it last did it" },
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
  return pageAndSectionFor(path)?.section ?? NAV[0];
}

/** The page a path belongs to, and its section. Null where nothing matches. */
export function pageAndSectionFor(path: string): { page: NavPage; section: NavSection } | null {
  let best: { page: NavPage; section: NavSection; length: number } | null = null;
  for (const section of NAV) {
    for (const page of section.pages) {
      const matches = page.href === "/" ? path === "/" : path === page.href || path.startsWith(page.href + "/");
      if (matches && (!best || page.href.length > best.length)) best = { page, section, length: page.href.length };
    }
  }
  return best ? { page: best.page, section: best.section } : null;
}

/** Is this the page we are on? The same rule, for marking it. */
export function isHere(path: string, href: string): boolean {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}
