/**
 * The shell's own map.
 *
 * 19 Nov: the v6 design (Figma "OPS New Design", page "v6 · Screens", frame 128:2). One bar
 * of eight: My work, Inbox, Calendar, Clients, Positions, Internal hiring, Accounts, Settings.
 * The promise that held for the sidebar and the earlier bars holds still: every page in the app
 * is under exactly one entry. A page that is in none is a page nobody can find; a test fails if
 * one goes missing. The old pages (sets, holds, placements, guarantees, reports...) are faces of
 * an entry now, so COVERS keeps them attached for the counts and for the marking.
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
  /** The small heading above the group. Empty for the only one. */
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
      { href: "/", what: "My work", about: "One thing at a time: what is late, what needs you, and what to approve" },
      { href: "/mail", what: "Inbox", about: "Every conversation, email and WhatsApp, and the team's news" },
      { href: "/calendar", what: "Calendar", about: "Interviews and meetings by the week, and who still has to confirm" },
      { href: "/clients", what: "Clients", about: "The companies we work for, their agreements, and the enquiries that are not one yet" },
      { href: "/positions", what: "Positions", about: "What each client asked for, and everything the search does for it" },
      { href: "/hiring", what: "Internal interview", about: "Career 141's own hiring" },
      { href: "/invoices", what: "Accounts", about: "The fee invoiced, the money in, the late ones, and closing a position", needs: "money.manage" },
      { href: "/settings", what: "Settings", about: "The switches, the wording, the people, the files and the links", needs: "settings.manage" },
    ],
  },
];

/**
 * The pages an entry covers, for the counts and for marking the bar.
 *
 * A late invoice still has to show against Accounts, and a CV set against Positions, so a page
 * says what it covers rather than the bar guessing. Reports and numbers sit under Positions
 * (the plan, 19 Nov); the old Placements and Guarantees lists are tabs of a position.
 */
export const COVERS: Record<string, string[]> = {
  "/": ["/", "/tasks", "/calls"],
  "/mail": ["/mail", "/messages"],
  "/calendar": ["/calendar", "/interviews"],
  "/clients": ["/clients", "/leads"],
  "/positions": [
    "/positions",
    "/sets",
    "/holds",
    "/adverts",
    "/talent-pulse",
    "/placements",
    "/guarantees",
    "/candidates",
    "/work",
    "/reports",
    "/numbers",
  ],
  "/hiring": ["/hiring"],
  "/invoices": ["/invoices", "/closes", "/money"],
  "/settings": ["/settings", "/templates", "/files", "/ta", "/import", "/health", "/ai", "/holidays", "/baseline"],
};

/** The group a path is in. The longest matching page wins, so / is only ever the day itself. */
export function sectionFor(path: string): NavSection {
  return pageAndSectionFor(path)?.section ?? NAV[0];
}

/**
 * The page a path belongs to, and its group.
 *
 * An entry covers more than its own path: /sets/abc is the Positions entry, because a CV set is
 * a face of a position and not a place of its own. What each entry covers is in COVERS, so one
 * list decides both the marking and the counts.
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

/**
 * The pages a phone is for (frame PH1, 181:284): the bottom bar says My work, Inbox, Search
 * and Add. Search is the find page and Add opens the same list the + opens on the desk.
 * Everything else is reached from those, or from the profile; nothing is gone.
 */
export const PHONE_PAGES = ["/", "/mail", "/find"] as const;
/** The one phone-bar page that is not a bar entry, with its words. */
export const PHONE_ONLY: Record<string, { what: string; about: string }> = {
  "/find": { what: "Search", about: "Find a client, a position, a person or an invoice, or ask AURA" },
};
