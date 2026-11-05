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
    ],
  },
  {
    key: "workspace",
    what: "Workspace",
    about: "What came in, and what you owe somebody",
    pages: [
      { href: "/mail", what: "Inbox", about: "Every conversation, email and WhatsApp, and the replies to them" },
      { href: "/calls", what: "Calls", about: "Calls the system asked for, and what was said on them" },
      { href: "/reports", what: "Report", about: "Monday's active-positions report, read here before the Director gets it" },
    ],
  },
  {
    key: "records",
    what: "Records",
    about: "All of one kind, when you want to compare them",
    pages: [
      { href: "/leads", what: "Leads", about: "An enquiry from anywhere, through to a signed agreement" },
      { href: "/clients", what: "Clients", about: "Who they are, who owns them, where to invoice, their WhatsApp group" },
      { href: "/positions", what: "Positions", about: "What each client asked for, and the opening the TA System runs" },
      { href: "/sets", what: "CV sets", about: "Five CVs or more, drafted, approved, sent, and the clocks that follow" },
      { href: "/interviews", what: "Interviews", about: "Times agreed, the invite, who turned up, and what the client decided" },
      { href: "/placements", what: "Placements", about: "A hire from the TA System: the package, the joining day, the fee rule" },
      { href: "/invoices", what: "Invoices", about: "Drafted on the joining day, due in thirty, chased at 1% a month" },
      { href: "/guarantees", what: "Guarantees", about: "Ninety days from joining, valid only on a fee that is fully paid" },
      { href: "/holds", what: "Holds", about: "A search paused because the client went quiet, reviewed every thirty days" },
      { href: "/closes", what: "Closing", about: "The checklist every ending goes through before a position is closed" },
      { href: "/adverts", what: "Adverts", about: "TopJobs and LinkedIn: ordered, live, and closed after two weeks" },
      { href: "/talent-pulse", what: "Talent Pulse", about: "Tuesday's list of open roles, for marketing to post on Wednesday" },
    ],
  },
  {
    key: "tools",
    what: "Tools",
    about: "The numbers, the wording, and the switches",
    pages: [
      { href: "/numbers", what: "Numbers", about: "How long each step really takes, and what each number is made of", needs: "report.read" },
      { href: "/ai", what: "AI", about: "What the model may do, what it cost today, and how often it was right" },
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
 * Which group a path is in.
 *
 * The longest matching page wins, so /sets/abc is the sets page and / is only
 * ever the day itself.
 */
export function sectionFor(path: string): NavSection {
  return pageAndSectionFor(path)?.section ?? NAV[0];
}

/** The page a path belongs to, and its group. Null where nothing matches. */
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
