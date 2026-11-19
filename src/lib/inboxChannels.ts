/**
 * The Inbox's WhatsApp and Team news views (Figma I2 132:2, I3 133:384), as plain view-models.
 *
 * WhatsApp: Ops cannot read WhatsApp yet, but the desk already holds what could be shown - a client reply
 * stored as an inbound row with channel "whatsapp", and messages drafted for WhatsApp that a person copies
 * by hand. Team news has no store at all, so it is always empty until one exists.
 * Pure: no database, nothing sent, so every case is testable.
 */
import type { OpsDatabase } from "@/data/types";

export interface WaReply {
  id: string;
  who: string;
  at: number;
  quote: string;
  /** What it is about, in words; null when it is not filed. */
  about: string | null;
  /** Where "Record" goes: the set's role page, or null when we cannot tell which role. */
  recordHref: string | null;
}
export interface WaReady {
  id: string;
  who: string;
  at: number;
  text: string;
  state: "draft" | "approved";
}
export interface WhatsAppView {
  replies: WaReply[];
  ready: WaReady[];
}

export function whatsappView(db: OpsDatabase): WhatsAppView {
  const replies = db.inbound
    .filter((i) => i.channel === "whatsapp" && (i.direction ?? "in") === "in" && i.readState === "new")
    .sort((a, b) => b.receivedAt - a.receivedAt)
    .map((i): WaReply => {
      const set = i.subjectType === "clientSet" ? db.clientSets.find((s) => s.id === i.subjectId) : undefined;
      const position = set ? db.positions.find((p) => p.openingTaId === set.openingTaId) : undefined;
      return {
        id: i.id,
        who: i.fromName || i.from,
        at: i.receivedAt,
        quote: i.body.trim(),
        about: set ? set.name : null,
        recordHref: position ? `/positions/${position.id}?view=sets&panel=record-answer&on=${set!.id}` : null,
      };
    });
  const ready = db.messages
    .filter((m) => m.channel === "whatsapp" && (m.state === "draft" || m.state === "approved"))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((m): WaReady => ({ id: m.id, who: m.to[0] ?? "Unknown", at: m.createdAt, text: m.body.trim(), state: m.state as "draft" | "approved" }));
  return { replies, ready };
}

/** One line of Team news. */
export interface NewsItem {
  id: string;
  kind: string;
  tone: "good" | "info" | "warn";
  by: string;
  at: number;
  text: string;
  about: string | null;
  href: string | null;
}

/** The team's own feed. Nothing stores it yet, so this is empty; the screen then says so. */
export function teamNewsView(_db: OpsDatabase): NewsItem[] {
  return [];
}

/** Items grouped by Colombo day, newest first. `label` is for the caller to turn into words. */
export function groupByDay(items: NewsItem[]): { day: string; items: NewsItem[] }[] {
  const days = new Map<string, NewsItem[]>();
  for (const item of [...items].sort((a, b) => b.at - a.at)) {
    const day = new Date(item.at + 5.5 * 3_600_000).toISOString().slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), item]);
  }
  return [...days].map(([day, list]) => ({ day, items: list }));
}
