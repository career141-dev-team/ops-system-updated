/**
 * The Inbox and Call screens' sorting (17 Nov, Figma 395:11299 and 396:11347).
 *
 * The frames draw an email client: folders down the side, a list, the one chosen. Ops has no stars and no labels of
 * its own, so the folders here are the ones its data can answer honestly - what is new, what is waiting on us, what
 * is drafted, what went, what is dealt with - and the "labels" are what a conversation or a call is filed to.
 * Pure, so every rule has a test.
 */

export const MAIL_FOLDERS = [
  { key: "inbox", label: "Inbox" },
  { key: "unread", label: "Unread" },
  { key: "waiting", label: "Waiting on us" },
  { key: "drafts", label: "Drafts" },
  { key: "sent", label: "Sent" },
  { key: "archived", label: "Archived" },
] as const;
export type MailFolder = (typeof MAIL_FOLDERS)[number]["key"];

export const LABELS = [
  { key: "clients", label: "Clients" },
  { key: "openings", label: "Openings" },
  { key: "money", label: "Money" },
] as const;
export type Label = (typeof LABELS)[number]["key"];

/** What a record type is filed under, for the label chips. */
export function labelFor(type: string | null | undefined): Label | null {
  if (!type) return null;
  if (["client", "lead", "esa", "agreement"].includes(type)) return "clients";
  if (["position", "clientSet", "interview", "reference", "requirement", "hold", "advert"].includes(type)) return "openings";
  if (["invoice", "placement", "guarantee", "close"].includes(type)) return "money";
  return null;
}

interface ThreadLike {
  items: { direction: "in" | "out"; id: string; state: string | null }[];
  waitingOnUs: boolean;
  hasDraft: boolean;
  about: { type: string; id: string } | null;
}

/** Is this conversation in that folder? `readState` is each email that came in, by its id. */
export function inFolder(thread: ThreadLike, folder: string, readState: Map<string, string>): boolean {
  const ins = thread.items.filter((i) => i.direction === "in");
  const archived = ins.length > 0 && ins.every((i) => readState.get(i.id) === "actioned");
  if (folder === "archived") return archived;
  if (folder === "sent") return thread.items.some((i) => i.direction === "out" && i.state === "sent");
  if (folder === "drafts") return thread.hasDraft;
  if (folder === "unread") return ins.some((i) => readState.get(i.id) === "new");
  if (folder === "waiting") return thread.waitingOnUs && !archived;
  // The inbox: somebody wrote to us, and it is not dealt with yet.
  return ins.length > 0 && !archived;
}

export function matchesWords(words: string, ...parts: (string | null | undefined)[]): boolean {
  const said = words.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = parts.filter(Boolean).join(" ").toLowerCase();
  return said.every((w) => hay.includes(w));
}

/** "Today", "Yesterday" or "Earlier", in Colombo's days: the call history's headings. */
export function dayGroup(at: number, now: number): "Today" | "Yesterday" | "Earlier" {
  const day = (t: number) => Math.floor((t + 5.5 * 3_600_000) / 86_400_000);
  const d = day(now) - day(at);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : "Earlier";
}

/** Where a record opens, from its type and id. */
export function subjectHref(type: string | null | undefined, id: string | null | undefined): string | null {
  if (!type || !id) return null;
  const at: Record<string, string> = {
    client: "/clients/",
    lead: "/leads/",
    position: "/positions/",
    clientSet: "/sets/",
    interview: "/interviews/",
    placement: "/placements/",
    invoice: "/invoices/",
    guarantee: "/guarantees/",
    hold: "/holds/",
    close: "/closes/",
    task: "/tasks/",
  };
  return at[type] ? at[type] + id : null;
}
