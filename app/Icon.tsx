/**
 * The line icons (6 Nov).
 *
 * The owner asked for line icons rather than filled ones, and he is right for
 * this system: a filled glyph is a picture competing with the words, and the
 * words are what carry the meaning here. A hairline stroke sits beside a
 * label the way a rule sits beside a row - present, and quiet.
 *
 * So: one stroke weight, `currentColor`, no fill anywhere. Each one inherits
 * the colour of the thing it sits in, which is what makes the selected entry
 * in the sidebar go green without a second rule for the icon.
 *
 * They are drawn here rather than loaded. Nine shapes are smaller than any
 * icon package, they never need a network, and an icon that cannot load is an
 * empty square in the only navigation the app has.
 */

export type IconName =
  | "day"
  | "work"
  | "inbox"
  | "clients"
  | "positions"
  | "money"
  | "reports"
  | "settings"
  | "search"
  | "bell"
  | "plus"
  | "menu"
  | "chat";

/** 24x24, stroked, never filled. The paths are the whole of each icon. */
const PATHS: Record<IconName, React.ReactNode> = {
  // Add: the plainest plus there is, because it sits beside eight pictures already.
  plus: <path d="M12 5v14M5 12h14" />,
  // The menu: three lines, the one picture everybody already reads.
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  // The chat: one speech shape, the way every phone draws it.
  chat: <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6z" />,
  // A day: a calendar with today marked.
  day: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8.5 15.5l2 2 4-4" />
    </>
  ),
  // The board: columns of work, which is what /work is.
  work: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="9.5" y="4" width="5" height="11" rx="1.5" />
      <rect x="16" y="4" width="5" height="7" rx="1.5" />
    </>
  ),
  // Conversations: an envelope, because that is what arrives.
  inbox: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 7l7.3 5.4a2 2 0 0 0 2.4 0L20.5 7" />
    </>
  ),
  // A client is a company.
  clients: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5V21" />
      <path d="M15 10h3.5A1.5 1.5 0 0 1 20 11.5V21" />
      <path d="M8 8h4M8 12h4M8 16h4" />
    </>
  ),
  // A position is a role somebody is hired into.
  positions: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M3 13h18" />
    </>
  ),
  // Money: a note, not a coin. Invoices and fees, not cash.
  money: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v4M18 10v4" />
    </>
  ),
  // Reports: what the numbers did.
  reports: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16.5v-4M12.5 16.5v-8M17 16.5v-5.5" />
    </>
  ),
  // Settings: the things that are set once and left.
  settings: (
    <>
      <path d="M5 7h14M5 12h14M5 17h14" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  // What is waiting on you, kept live (UX order 3).
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  // Find anything.
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
};

export default function Icon({
  name,
  className = "",
  size = 16,
}: {
  name: IconName;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Every one of these sits next to its own word, so the word is the
      // label and the icon is decoration a screen reader should skip.
      aria-hidden="true"
      focusable="false"
      className={"shrink-0 " + className}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Which icon belongs to which sidebar entry, by its own href. */
export const ICON_FOR: Record<string, IconName> = {
  "/": "day",
  "/work": "work",
  "/mail": "inbox",
  "/chat": "chat",
  "/clients": "clients",
  "/positions": "positions",
  "/money": "money",
  "/reports": "reports",
  "/settings": "settings",
};
