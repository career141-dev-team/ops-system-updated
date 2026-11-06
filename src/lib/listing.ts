/**
 * Searching and sorting a list (25, section 7).
 *
 * The owner's first reference screen is a table: a search box, a "sorted by",
 * a filter, and columns you can scan down. These are the rules behind it,
 * kept here so every list page behaves the same way - one way to type a
 * search, one way to sort, one way to say what is late.
 *
 * Deliberately plain. No fuzzy matching and no ranking: a person types part
 * of a name and expects the rows with that in them, in the order they asked
 * for. Anything cleverer is a thing to argue with.
 *
 * Nothing here touches a database.
 */

/** A row as a list page holds it, whatever kind of thing it is. */
export interface Listed {
  id: string;
  href: string;
  /** What a person reads first, and searches by. */
  title: string;
  /** Everything else searchable: the client, the owner, a number. */
  words: string[];
  /** The one line of plain words under or beside the name. */
  says: string;
  /** For the second column and the ordering. */
  at: number;
  late: boolean;
  /** The small chips: a state, a count, a kind. */
  chips: { what: string; tone?: "quiet" | "brand" | "late" | "careful" | "done" }[];
  who: string;
}

/** A search as a person types it: case and spacing do not count. */
export function matches(row: Listed, said: string): boolean {
  const q = said.trim().toLowerCase();
  if (!q) return true;
  // Every word has to appear somewhere: "nippon finance" finds the finance
  // role at Nippon, not everything at Nippon and everything in finance.
  const hay = [row.title, row.says, ...row.words].join(" ").toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export type SortKey = "newest" | "oldest" | "late" | "name";

export const SORTS: { key: SortKey; what: string }[] = [
  { key: "late", what: "What is late" },
  { key: "newest", what: "Newest" },
  { key: "oldest", what: "Oldest" },
  { key: "name", what: "Name" },
];

export function sortKeyFrom(said: string | undefined): SortKey {
  return SORTS.some((sort) => sort.key === said) ? (said as SortKey) : "late";
}

export function sortRows(rows: Listed[], by: SortKey): Listed[] {
  const out = [...rows];
  if (by === "name") return out.sort((a, b) => a.title.localeCompare(b.title));
  if (by === "oldest") return out.sort((a, b) => a.at - b.at);
  if (by === "newest") return out.sort((a, b) => b.at - a.at);
  // The default, and the only one that is about the work rather than the
  // clock: late first, and the one that has waited longest at the top of it.
  return out.sort((a, b) => (a.late === b.late ? a.at - b.at : a.late ? -1 : 1));
}

/** The whole thing: what a page shows, from what a page holds. */
export function listed(rows: Listed[], said: string | undefined, by: string | undefined): Listed[] {
  return sortRows(rows.filter((row) => matches(row, said ?? "")), sortKeyFrom(by));
}

/** A date as a column shows it: short, and in Colombo's own day. */
export function day(at: number | null): string {
  if (!at) return "—";
  return new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

/** What a search found, in words, so an empty table is never a blank page. */
export function foundInWords(shown: number, all: number, said: string | undefined): string {
  const q = (said ?? "").trim();
  if (!q) return all + (all === 1 ? " row" : " rows");
  if (shown === 0) return "Nothing matches “" + q + "”. The search looks at the name, the one-line summary, the client and the owner.";
  return shown + " of " + all + " match “" + q + "”";
}
