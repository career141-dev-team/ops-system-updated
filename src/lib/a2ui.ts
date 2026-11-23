/**
 * What AURA may draw in the chat, as A2UI v1.0 (a2ui.org) component lists (23 Nov, the owner).
 *
 * The model sends the flat `updateComponents` list - `{ id, component: "Text", text }`, children by id, the
 * top one `id: "root"` - and this keeps only a small part of the basic catalog, drawn with the column's own
 * styles. Why our own and not `@a2ui/react`: it wants zod 3 and this project is on zod 4, and the rules below
 * are ours to hold, not a library's.
 *
 * Display only. A Button can do one thing: put words into the chat as if typed (`action.event.name` "say",
 * `context.text`). Those words go through the same rules as typing, so any change still comes back as the
 * "Here is what I will do" card with its own confirm button. Nothing here runs an action.
 *
 * A Table is our own addition to the basic catalog (23 Nov, ops team: "show the interviews as a table in the chat"):
 * `{id, component: "Table", columns: [words], rows: [[words]]}`, literal strings, drawn compactly. v1.0 lets a
 * client add components of its own; this one is ours.
 *
 * shortcut: literal strings only - no `@path` data binding and no templates, since AURA sends no data model.
 * Add them if a surface ever needs to update in place.
 */

export type A2uiNode =
  | { id: string; component: "Text"; text: string; variant: "body" | "caption" }
  | { id: string; component: "Row" | "Column" | "List"; children: string[] }
  | { id: string; component: "Card"; child: string }
  | { id: string; component: "Divider" }
  | { id: string; component: "Image"; url: string; description: string }
  | { id: string; component: "Button"; child: string; say: string; primary: boolean }
  | { id: string; component: "Table"; columns: string[]; rows: string[][] };

export type A2uiSurface = Record<string, A2uiNode>;

const MAX_NODES = 60;
const MAX_DEPTH = 8;
const MAX_TEXT = 600;
/** A chat is a narrow column: a table in it stays compact. */
export const TABLE_MAX_COLUMNS = 6;
export const TABLE_MAX_ROWS = 30;
const MAX_CELL = 80;

const str = (v: unknown, max = MAX_TEXT): string | null => (typeof v === "string" && v.trim() ? v.slice(0, max) : null);
const ids = (v: unknown): string[] | null => (Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null);

/** One component as the model sent it, or null when it is not one we draw. */
function node(raw: unknown): A2uiNode | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const id = str(c.id, 64);
  if (!id) return null;
  switch (c.component) {
    case "Text": {
      const text = str(c.text);
      return text ? { id, component: "Text", text, variant: c.variant === "caption" ? "caption" : "body" } : null;
    }
    case "Row":
    case "Column":
    case "List": {
      const children = ids(c.children);
      return children ? { id, component: c.component, children } : null;
    }
    case "Card": {
      const child = str(c.child, 64);
      return child ? { id, component: "Card", child } : null;
    }
    case "Divider":
      return { id, component: "Divider" };
    case "Image": {
      // Our own pictures only: a path on this site, never another host.
      const url = str(c.url, 300);
      return url && url.startsWith("/") && !url.startsWith("//") ? { id, component: "Image", url, description: str(c.description, 120) ?? "" } : null;
    }
    case "Button": {
      const child = str(c.child, 64);
      const event = (c.action as { event?: { name?: unknown; context?: { text?: unknown } } } | undefined)?.event;
      const say = event?.name === "say" ? str(event.context?.text, 300) : null;
      return child && say ? { id, component: "Button", child, say, primary: c.variant === "primary" } : null;
    }
    case "Table": {
      const columns = Array.isArray(c.columns) ? c.columns.map((x) => str(x, MAX_CELL)).filter((x): x is string => x !== null).slice(0, TABLE_MAX_COLUMNS) : [];
      if (!columns.length || !Array.isArray(c.rows)) return null;
      // Every row is as wide as the columns: a short one is padded, a long one cut, and a cell is plain words.
      const rows = c.rows
        .filter((r): r is unknown[] => Array.isArray(r))
        .slice(0, TABLE_MAX_ROWS)
        .map((r) => columns.map((_, i) => (typeof r[i] === "string" || typeof r[i] === "number" ? String(r[i]).slice(0, MAX_CELL) : "")));
      return rows.length ? { id, component: "Table", columns, rows } : null;
    }
    default:
      return null;
  }
}

const kids = (n: A2uiNode): string[] =>
  n.component === "Row" || n.component === "Column" || n.component === "List" ? n.children : n.component === "Card" || n.component === "Button" ? [n.child] : [];

/**
 * The surface to draw, or a sentence saying why not (the model is told it and can try again).
 * Unknown components are dropped, and so is any child that points at one; a missing root, a loop
 * or too much is refused whole.
 */
export function parseSurface(components: unknown): { ok: true; surface: A2uiSurface } | { ok: false; why: string } {
  if (!Array.isArray(components) || !components.length) return { ok: false, why: "Send components as a list." };
  if (components.length > MAX_NODES) return { ok: false, why: "Too many components; keep it under " + MAX_NODES + "." };
  const surface: A2uiSurface = {};
  for (const raw of components) {
    const n = node(raw);
    if (n && !surface[n.id]) surface[n.id] = n;
  }
  if (!surface.root) return { ok: false, why: 'There must be a component with id "root" that we can draw.' };
  // Children that point nowhere are dropped; a Card or Button whose one child is gone goes too.
  for (const n of Object.values(surface)) if ("children" in n) n.children = n.children.filter((k) => surface[k]);
  for (const n of Object.values(surface)) if ((n.component === "Card" || n.component === "Button") && !surface[n.child]) delete surface[n.id];
  if (!surface.root) return { ok: false, why: "The root's only child could not be drawn." };

  // Walk from the root: no loops, not too deep, and a Button holds only words (no button in a button).
  const walk = (id: string, path: string[], inButton: boolean): string | null => {
    if (path.includes(id)) return "A component contains itself.";
    if (path.length >= MAX_DEPTH) return "Nested too deep; keep it under " + MAX_DEPTH + " levels.";
    const n = surface[id];
    if (!n) return null;
    if (inButton && n.component !== "Text") return "A Button's child must be a Text.";
    for (const k of kids(n)) {
      const why = walk(k, [...path, id], inButton || n.component === "Button");
      if (why) return why;
    }
    return null;
  };
  const why = walk("root", [], false);
  return why ? { ok: false, why } : { ok: true, surface };
}
