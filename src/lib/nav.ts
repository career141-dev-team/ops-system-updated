/**
 * The shell's own map.
 *
 * 13 Nov: a top bar again, from the approved Figma design ("Ops System",
 * component "Top nav"). Across the bar, what the design shows: My Work,
 * Clients, Openings, Interviews, Placements. Its description also names
 * Candidates (which stays in the TA System), Finance and Reports, but the
 * design hides those three, so Finance and Reports sit behind the profile
 * with the rest. The sidebar this replaces (5 Nov) had the same promise, and it
 * holds: every page in the app is under exactly one entry. A page that is in
 * none is a page nobody can find; a test fails if one goes missing.
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
    // Across the top bar, in the design's order.
    key: "workspaces",
    what: "",
    about: "What is waiting on you now, and the records the desk keeps",
    pages: [
      { href: "/", what: "My Work", about: "One thing at a time: what is next, what is waiting, and what to approve" },
      { href: "/clients", what: "Clients", about: "The companies we work for, and the enquiries that are not one yet" },
      { href: "/positions", what: "Openings", about: "What each client asked for, and everything the search does for it" },
      { href: "/interviews", what: "Interviews", about: "Agreeing a time, booked, held, and waiting on the client's decision" },
      { href: "/placements", what: "Placements", about: "Who joins when, who joined, and the ninety days of guarantee after" },
    ],
  },
  {
    // Behind the profile ("Settings, Help, Sign out live in the profile page").
    key: "more",
    what: "More",
    about: "The board, the inbox, and setting the desk up",
    pages: [
      { href: "/candidates", what: "Candidates", about: "The people in our openings, read from the TA System" },
      { href: "/work", what: "The work", about: "Every enquiry and position in the stage it is really in" },
      { href: "/mail", what: "Inbox", about: "Every conversation, email and WhatsApp, and the calls we were asked to make" },
      // Finance and Reports are in the Figma "Top nav" but hidden there, so
      // they live here until the design shows them (13 Nov).
      { href: "/invoices", what: "Finance", about: "The fee invoiced, the money in, the late ones, and closing a position" },
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
  "/positions": ["/positions", "/sets", "/holds", "/adverts", "/talent-pulse"],
  "/interviews": ["/interviews"],
  // The money area keeps its one tab bar; the design names two of its faces.
  "/placements": ["/money", "/placements", "/guarantees"],
  "/invoices": ["/invoices", "/closes"],
  "/reports": ["/reports", "/numbers"],
  "/settings": ["/settings", "/templates", "/files", "/ta", "/import", "/health", "/ai", "/holidays", "/baseline"],
  "/mail": ["/mail", "/calls", "/messages", "/tasks"],
  "/work": ["/work", "/find"],
  "/candidates": ["/candidates"],
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

/** The pages that are in no entry but still say where you are (16 Nov, the notch above the page). */
const OTHER_TITLES: Record<string, string> = { "/account": "Account", "/notifications": "Notifications", "/chat": "AURA" };

/**
 * The name on the tab above the page: the entry the path is under, so it always matches the
 * highlighted pill in the bar, or - for a page in none - its own name. Null when there is none.
 */
export function workspaceTitle(path: string): string | null {
  const own = pageAndSectionFor(path)?.page.what;
  // The frames call the Reports tab "Report" (249:10250).
  if (own) return own === "Reports" ? "Report" : own;
  const other = Object.keys(OTHER_TITLES).find((p) => path === p || path.startsWith(p + "/"));
  return other ? OTHER_TITLES[other] : null;
}

/** Is this the entry we are under? The same rule, for marking it. */
export function isHere(path: string, href: string): boolean {
  // Candidates sits under My Work in the frames (249:11300), though it has its own tab name.
  if (href === "/" && (path === "/candidates" || path.startsWith("/candidates/"))) return true;
  return (COVERS[href] ?? [href]).some((under) =>
    under === "/" ? path === "/" : path === under || path.startsWith(under + "/"),
  );
}

/**
 * The four pages a phone is for (UX order 7), along its bottom bar. The desk
 * is for reading CVs and approving drafts; the phone is for the call that
 * just came in and the reply that just landed. Everything else is behind
 * the menu, one tap away, not gone.
 */
// The owner chose Chat over Clients for the phone (8 Nov); Clients is in the Everything menu.
export const PHONE_PAGES = ["/", "/mail", "/chat", "/work"] as const;
/** The one phone-bar page that is not a sidebar entry, with its words. */
export const PHONE_ONLY: Record<string, { what: string; about: string }> = {
  "/chat": { what: "AURA", about: "Ask, and get it done - every action behind a button you press" },
};
