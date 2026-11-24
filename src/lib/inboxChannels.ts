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
  /** Where "Record" goes: the set's role page, the applicant's vacancy or the client's page, or null when nobody's. */
  recordHref: string | null;
  /** The inbound row, so the reply can be marked dealt with. */
  inboundId: string;
}
export interface WaReady {
  id: string;
  who: string;
  at: number;
  text: string;
  /** The message's subject, shown beside the name ("Chase 2 for SET 2"); empty when it has none. */
  label: string;
  state: "draft" | "approved";
}
export interface WhatsAppView {
  replies: WaReply[];
  ready: WaReady[];
}

export function whatsappView(db: OpsDatabase): WhatsAppView {
  const replies = db.inbound
    // Not dealt with: new (nobody's yet) or filed to somebody (23 Nov: a reply filed by its number still waits to be read).
    .filter((i) => i.channel === "whatsapp" && (i.direction ?? "in") === "in" && i.readState !== "actioned")
    .sort((a, b) => b.receivedAt - a.receivedAt)
    .map((i): WaReply => {
      const set = i.subjectType === "clientSet" ? db.clientSets.find((s) => s.id === i.subjectId) : undefined;
      const position = set ? db.positions.find((p) => p.openingTaId === set.openingTaId) : undefined;
      const applicant = i.subjectType === "applicant" ? db.applicants.find((a) => a.id === i.subjectId) : undefined;
      const vacancy = applicant ? db.vacancies.find((v) => v.id === applicant.vacancyId) : undefined;
      const client = i.subjectType === "client" ? db.clients.find((c) => c.id === i.subjectId) : undefined;
      return {
        id: i.id,
        who: i.fromName || i.from,
        at: i.receivedAt,
        quote: i.body.trim(),
        about: set ? set.name : applicant ? "Applied: " + (vacancy?.title ?? "internal hiring") : client ? client.name : i.note || null,
        recordHref: position ? `/positions/${position.id}?view=sets&panel=record-answer&on=${set!.id}` : applicant ? `/hiring/${applicant.vacancyId}` : client ? `/clients/${client.id}` : null,
        // The mail "done" action works on any inbound row, so a reply can be cleared once it is dealt with.
        inboundId: i.id,
      };
    });
  const ready = db.messages
    .filter((m) => m.channel === "whatsapp" && (m.state === "draft" || m.state === "approved"))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((m): WaReady => ({ id: m.id, who: m.to[0] ?? "Unknown", at: m.createdAt, text: m.body.trim(), label: (m.subject ?? "").trim(), state: m.state as "draft" | "approved" }));
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
  /** Set on team notes only: who may delete it (22 Nov). */
  authorId?: string;
}

const MILESTONES: Record<string, { kind: string; tone: "good" | "info" | "warn"; verb: string }> = {
  "esa.signed": { kind: "Signed", tone: "good", verb: "Agreement signed" },
  "esa.countersigned": { kind: "Signed", tone: "good", verb: "Agreement countersigned" },
  "interview.booked": { kind: "Interview", tone: "info", verb: "Interview booked" },
  "placement.created": { kind: "Offer", tone: "good", verb: "Placement recorded" },
  "placement.joined": { kind: "Joined", tone: "good", verb: "Candidate joined" },
  "invoice.paid": { kind: "Paid", tone: "good", verb: "Invoice paid" },
  "vacancy.created": { kind: "Hiring", tone: "info", verb: "Internal vacancy opened" },
  "applicant.decided": { kind: "Hiring", tone: "good", verb: "Hiring decision recorded" },
};

/** The team's live feed: posted team notes merged with major desk milestones, newest first. */
export function teamNewsView(db: OpsDatabase): NewsItem[] {
  const nameOf = (id: string | null) =>
    id ? (db.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Team") : "System";

  const notes: NewsItem[] = (db.teamNotes ?? []).map((n) => ({
    id: n.id,
    kind: "Note",
    tone: "info",
    by: nameOf(n.authorId),
    authorId: n.authorId,
    at: n.createdAt,
    text: n.body,
    about: null,
    href: null,
  }));

  const events: NewsItem[] = (db.audit ?? [])
    .filter((a) => Boolean(MILESTONES[a.action]))
    .slice(-40)
    .map((a) => {
      const meta = MILESTONES[a.action]!;
      const detail = a.reason || a.after || "";
      return {
        id: a.id,
        kind: meta.kind,
        tone: meta.tone,
        by: nameOf(a.actorId),
        at: a.at,
        text: detail ? `${meta.verb}: ${detail}` : meta.verb,
        about: a.subjectType,
        href: null,
      };
    });

  return [...notes, ...events].sort((a, b) => b.at - a.at);
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
