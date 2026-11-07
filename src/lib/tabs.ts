/**
 * One tab bar per area (25, section 2).
 *
 * The rule the owner asked for: three levels and never four. The sidebar has
 * eight entries; each entry's area has **one** tab bar; inside a tab there
 * are plain sections. These lists are the bars, in one file, so a page cannot
 * invent a second one and two areas cannot disagree about what belongs to
 * them.
 *
 * Nothing here touches a database.
 */

export interface Tab {
  key: string;
  what: string;
  href: string;
}

/** Inbox: what came in, and what we owe somebody a call about. */
export const INBOX_TABS: Tab[] = [
  { key: "mail", what: "Conversations", href: "/mail" },
  { key: "calls", what: "Calls", href: "/calls" },
];

/** Clients: a company we work for, and one that is not one yet. */
export const CLIENT_TABS: Tab[] = [
  { key: "clients", what: "Clients", href: "/clients" },
  { key: "leads", what: "Enquiries", href: "/leads" },
];

/** Positions: what was asked for, and Tuesday's list of the same. */
export const POSITION_TABS: Tab[] = [
  { key: "positions", what: "Positions", href: "/positions" },
  { key: "talent-pulse", what: "Talent Pulse", href: "/talent-pulse" },
];

/** Money: the four faces of a fee, in the order they happen. */
export const MONEY_TABS: Tab[] = [
  { key: "placements", what: "Placements", href: "/placements" },
  { key: "invoices", what: "Invoices", href: "/invoices" },
  { key: "guarantees", what: "Guarantees", href: "/guarantees" },
  { key: "closes", what: "Closing", href: "/closes" },
];

/** Reports: what goes out on Monday, and what the desk is really doing. */
export const REPORT_TABS: Tab[] = [
  { key: "reports", what: "Weekly report", href: "/reports" },
  { key: "numbers", what: "Numbers", href: "/numbers" },
];

/** Settings: everything set up once and then left alone. */
export const SETTINGS_TABS: Tab[] = [
  { key: "settings", what: "Switches & numbers", href: "/settings" },
  { key: "templates", what: "What we send", href: "/templates" },
  { key: "files", what: "Files", href: "/files" },
  { key: "holidays", what: "People & holidays", href: "/holidays" },
  { key: "ta", what: "TA System", href: "/ta" },
  { key: "ai", what: "AI", href: "/ai" },
  { key: "import", what: "First day", href: "/import" },
  { key: "health", what: "Health", href: "/health" },
];

/** One position, and its faces. The id is the page; these are its tabs. */
export function positionTabs(id: string): Tab[] {
  const at = (tab: string) => "/positions/" + id + (tab ? "?tab=" + tab : "");
  return [
    { key: "overview", what: "Overview", href: at("") },
    { key: "sets", what: "CV sets", href: at("sets") },
    { key: "interviews", what: "Interviews", href: at("interviews") },
    { key: "adverts", what: "Advertising", href: at("adverts") },
    { key: "messages", what: "Messages", href: at("messages") },
    { key: "history", what: "History", href: at("history") },
  ];
}

/** One client, and theirs. */
export function clientTabs(id: string): Tab[] {
  const at = (tab: string) => "/clients/" + id + (tab ? "?tab=" + tab : "");
  return [
    { key: "overview", what: "Overview", href: at("") },
    { key: "positions", what: "Positions", href: at("positions") },
    { key: "agreement", what: "Agreement", href: at("agreement") },
    { key: "people", what: "People & group", href: at("people") },
    { key: "messages", what: "Messages", href: at("messages") },
    { key: "money", what: "Money", href: at("money") },
    // Everything that happened with them, in order (UX order 4).
    { key: "history", what: "History", href: at("history") },
  ];
}

/** Which tab a `?tab=` names, or the first one. */
export function tabFrom(tabs: Tab[], said: string | undefined): string {
  return tabs.some((tab) => tab.key === said) ? (said as string) : tabs[0].key;
}
