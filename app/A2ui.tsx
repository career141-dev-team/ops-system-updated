"use client";

import type { A2uiNode, A2uiSurface } from "@/lib/a2ui";

/**
 * Draws an A2UI surface AURA sent (23 Nov), in the column's own look. The surface was checked when it was
 * stored (`parseSurface`, src/lib/a2ui.ts), so this only maps components to markup. A Button puts its words
 * into the chat as if typed - the one thing it can do.
 */
export default function A2ui({ ui, say }: { ui: string; say: (text: string) => void }) {
  let surface: A2uiSurface;
  try {
    surface = JSON.parse(ui) as A2uiSurface;
  } catch {
    return null;
  }
  const draw = (id: string, depth = 0): React.ReactNode => {
    const n: A2uiNode | undefined = surface[id];
    if (!n || depth > 8) return null;
    switch (n.component) {
      case "Text":
        return <p key={id} className={n.variant === "caption" ? "text-[12px] text-ink-faint" : "text-[13.5px] text-ink"}>{n.text}</p>;
      case "Row":
        return <div key={id} className="flex flex-wrap items-center gap-2">{n.children.map((k) => draw(k, depth + 1))}</div>;
      case "Column":
      case "List":
        return <div key={id} className="flex flex-col gap-2">{n.children.map((k) => draw(k, depth + 1))}</div>;
      case "Card":
        return (
          <div key={id} className="rounded-2xl border border-rule bg-surface px-3.5 py-2.5 shadow-[0_1px_2px_rgba(22,24,26,0.05)]">
            {draw(n.child, depth + 1)}
          </div>
        );
      case "Divider":
        return <div key={id} className="h-px bg-rule" />;
      case "Image":
        // eslint-disable-next-line @next/next/no-img-element
        return <img key={id} src={n.url} alt={n.description} className="max-h-40 rounded-xl object-cover" />;
      case "Button":
        return (
          <button
            key={id}
            type="button"
            onClick={() => say(n.say)}
            title={n.say}
            className={
              "w-fit rounded-full px-3 py-1 text-[12.5px] transition-colors " +
              (n.primary ? "bg-ink text-ink-inverse hover:opacity-90" : "border border-rule text-ink-soft hover:bg-sunk hover:text-ink")
            }
          >
            {surface[n.child]?.component === "Text" ? (surface[n.child] as { text: string }).text : n.say}
          </button>
        );
    }
  };
  return <div className="mt-2.5 flex flex-col gap-2">{draw("root")}</div>;
}
