"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import Icon from "@/app/Icon";
import type { FindItem } from "@/app/api/find/route";

interface FindResponse {
  ok: boolean;
  actions: FindItem[];
  people: FindItem[];
  roles: FindItem[];
  recent: FindItem[];
}

/**
 * G1 · Find or do (Figma 3:5968): instant command palette & desk search opened by `/` or clicking
 * "Search or ask AURA" in the top bar. Keyboard-first (↑/↓/Enter/Esc) with full fallback to `/find`.
 */
export default function FindOrDo() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [data, setData] = useState<FindResponse | null>(null);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global `/` shortcut opens G1 when not typing in an input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement | null)?.isContentEditable) {
          return;
        }
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input when opened.
  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQ("");
      setCursor(0);
    }
  }, [open]);

  // Fetch matching items whenever open or query changes.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/find?q=" + encodeURIComponent(q), { cache: "no-store" });
        if (!res.ok || !alive) return;
        const json = (await res.json()) as FindResponse;
        if (alive && json.ok) {
          setData(json);
          setCursor(0);
        }
      } catch {
        // Offline or network hiccup — ignore quietly.
      }
    }, q ? 120 : 0);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [open, q]);

  const flat: FindItem[] = data
    ? [
        ...data.actions,
        ...data.people,
        ...data.roles,
        ...data.recent,
        ...(q.trim()
          ? [{ id: "full-find", title: `Search everything for "${q.trim()}"`, sub: "Open full results on /find", href: "/find?q=" + encodeURIComponent(q.trim()) }]
          : []),
      ]
    : [];

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (flat.length ? (c + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (flat.length ? (c - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flat[cursor];
      if (target) go(target.href);
      else if (q.trim()) go("/find?q=" + encodeURIComponent(q.trim()));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  let runningIdx = 0;
  const renderSection = (label: string, items: FindItem[], kind: "action" | "person" | "role" | "recent") => {
    if (!items.length) return null;
    return (
      <div className="flex flex-col gap-1">
        <p className="t-micro px-3 pt-2 text-ink-3">{label}</p>
        {items.map((item) => {
          const idx = runningIdx++;
          const active = idx === cursor;
          return (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => setCursor(idx)}
              onClick={() => go(item.href)}
              className={
                "flex w-full cursor-pointer items-center gap-3.5 rounded-[14px] px-3 py-2.5 text-left transition-colors " +
                (active ? "bg-sunk" : "hover:bg-sunk/60")
              }
            >
              {kind === "person" ? (
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-sunk text-[12px] font-medium text-ink-2">
                  {item.initials || "?"}
                </span>
              ) : (
                <span
                  className={
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-full " +
                    (kind === "action" ? "bg-bg-brand text-brand" : "bg-sunk text-ink-2")
                  }
                >
                  <Icon name={kind === "action" ? "calendar" : kind === "role" ? "briefcase" : "clock"} size={16} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="t-body-m block truncate text-ink">{item.title}</span>
                <span className="t-small block truncate text-ink-3">{item.sub}</span>
              </span>
              {active && <span className="t-small shrink-0 text-ink-3">Enter</span>}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the desk or ask AURA"
        className="mr-0.5 flex h-11 w-[200px] shrink-0 cursor-pointer items-center gap-2.5 rounded-full bg-sunk px-4 text-left transition-colors hover:bg-shell 2xl:w-[300px]"
      >
        <span className="t-body min-w-0 flex-1 truncate text-ink-3">Search or ask AURA</span>
        <kbd className="t-label hidden rounded-[6px] border border-rule px-[7px] py-px font-sans text-ink-3 2xl:inline">/</kbd>
        <Icon name="search" size={16} className="text-ink-3 2xl:hidden" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Find or do"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 px-4 pt-[12vh]"
        >
          <div className="flex w-full max-w-[680px] flex-col overflow-hidden rounded-[24px] bg-surface shadow-float">
            <div className="flex items-center gap-3 border-b border-rule px-5 py-4">
              <Icon name="search" size={18} className="shrink-0 text-ink-3" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search clients, people, roles, or type an action…"
                className="t-body min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="t-label cursor-pointer rounded-[8px] border border-rule px-2 py-0.5 text-ink-3 hover:bg-sunk"
              >
                esc
              </button>
            </div>

            <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-3">
              {!data ? (
                <p className="t-small px-3 py-4 text-ink-3">Loading…</p>
              ) : flat.length === 0 ? (
                <p className="t-small px-3 py-4 text-ink-3">No direct match. Press Enter to search all records.</p>
              ) : (
                <>
                  {renderSection("Actions", data.actions, "action")}
                  {renderSection("People", data.people, "person")}
                  {renderSection("Roles", data.roles, "role")}
                  {renderSection("Recent", data.recent, "recent")}
                  {q.trim() && (
                    <button
                      type="button"
                      onClick={() => go("/find?q=" + encodeURIComponent(q.trim()))}
                      className="t-label mt-1 flex w-full cursor-pointer items-center justify-between rounded-[12px] border-t border-rule px-3 py-2.5 text-brand hover:bg-sunk"
                    >
                      <span>See all results for &ldquo;{q.trim()}&rdquo;</span>
                      <span>→</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
