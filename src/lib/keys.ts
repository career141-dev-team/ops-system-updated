/**
 * The keyboard (8 Nov, UX order 8): J/K to move, A to approve, Enter to
 * open, / to search. Last of the eight, because keys only help once
 * everything else is right.
 *
 * The rule is small and pure so it can be tested without a browser: which
 * key means what, and when a key means nothing because the person is
 * typing. A letter pressed inside a box is a letter, never a command - the
 * one mistake that makes people switch shortcuts off.
 */

export type KeyAct = "next" | "prev" | "approve" | "open" | "edit" | "skip" | "search";

export interface KeyPress {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  /** Where the key landed: the tag, and whether it is a box somebody types in. */
  target?: { tagName?: string; isContentEditable?: boolean } | null;
}

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function keyActFor(press: KeyPress): KeyAct | null {
  if (press.ctrlKey || press.metaKey || press.altKey) return null;
  const tag = (press.target?.tagName ?? "").toUpperCase();
  if (TYPING.has(tag) || press.target?.isContentEditable) return null;
  switch (press.key) {
    case "j": case "J": case "ArrowDown": return "next";
    case "k": case "K": case "ArrowUp": return "prev";
    case "a": case "A": return "approve";
    case "e": case "E": return "edit";
    case "s": case "S": return "skip";
    case "Enter": case "o": case "O": return "open";
    case "/": return "search";
  }
  return null;
}

/** The row to land on: the next or previous, stopping at the ends, and the first when none is chosen. */
export function rowAfter(current: number, count: number, act: "next" | "prev"): number | null {
  if (count === 0) return null;
  if (current < 0) return 0;
  const to = act === "next" ? current + 1 : current - 1;
  return Math.min(Math.max(to, 0), count - 1);
}

/** Said once on the day page for anyone who did not know; a phone has no keys. */
export const KEYS_IN_WORDS = "Keys: J and K move, A approves, Enter opens, / finds";
