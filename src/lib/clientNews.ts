/**
 * "What changed on my clients today" (v6 frame G4).
 *
 * The audit is written for the audit: `lead.introCallBooked`, `timer.fired`, `ai.used`. A person
 * wants a sentence about a client. This turns only the entries that are about a client into one,
 * and drops the rest (clocks starting, tasks being made, the model being asked), so the page is
 * short and every line can be read once. Pure: no database, nothing sent.
 */
import type { OpsAuditEntry, OpsDatabase } from "../data/types";

export type NewsTone = "danger" | "warn" | "info" | "brand" | "quiet";
export interface NewsLine {
  id: string;
  at: number;
  text: string;
  tone: NewsTone;
  subjectType: string;
  subjectId: string;
}

type Db = Pick<OpsDatabase, "audit" | "clientSets" | "placements" | "leads" | "clients" | "inbound">;

const firstClause = (name: string) => name.split(">")[0]?.trim() || name;

/** One sentence for an audit entry, or null when it is not about a client. */
function sentenceFor(db: Db, e: OpsAuditEntry): { text: string; tone: NewsTone } | null {
  const reason = e.reason?.trim() || null;
  switch (e.action) {
    case "clientSet.sent":
      return { text: reason ?? "A CV set went to the client.", tone: "info" };
    case "clientSet.ready": {
      const set = db.clientSets.find((s) => s.id === e.subjectId);
      return { text: (set ? firstClause(set.name) + ": " : "") + "a CV set is ready to send.", tone: "warn" };
    }
    case "placement.taken": {
      const pl = db.placements.find((p) => p.id === e.subjectId);
      const client = pl?.clientId ? db.clients.find((c) => c.id === pl.clientId)?.name : null;
      return { text: (e.after || pl?.candidateName || "A candidate") + " was placed" + (client ? " at " + client : "") + ".", tone: "brand" };
    }
    case "placement.joined":
      return { text: reason ?? "A candidate joined.", tone: "brand" };
    case "lead.created":
      return { text: (e.after ? e.after.split("·")[0].trim() : "A company") + " asked about us.", tone: "info" };
    case "lead.introCallBooked": {
      const lead = db.leads.find((l) => l.id === e.subjectId);
      return { text: "Intro call booked with " + (lead?.company ?? "a new enquiry") + ".", tone: "info" };
    }
    case "client.created":
      return { text: reason ?? (e.after ? e.after + " is now a client." : "A new client was added."), tone: "brand" };
    default:
      return null;
  }
}

/** The client's own words arriving, as a line: "Anjali Mendis (Serendib Foods) wrote: SET 2". */
function mailLines(db: Db): NewsLine[] {
  return db.inbound
    .filter((m) => m.direction !== "out" && m.clientId)
    .map((m) => {
      const client = db.clients.find((c) => c.id === m.clientId)?.name;
      return {
        id: "mail:" + m.id,
        at: m.receivedAt,
        text: (m.fromName || m.from) + (client ? " (" + client + ")" : "") + " wrote: " + (m.subject || "no subject"),
        tone: "info" as NewsTone,
        subjectType: "inbound",
        subjectId: m.id,
      };
    });
}

/** Newest first, at most `limit`. */
export function clientNews(db: Db, limit = 30): NewsLine[] {
  const fromAudit = db.audit.flatMap((e): NewsLine[] => {
    const s = sentenceFor(db, e);
    return s ? [{ id: "audit:" + e.id, at: e.at, text: s.text, tone: s.tone, subjectType: e.subjectType, subjectId: e.subjectId }] : [];
  });
  return [...fromAudit, ...mailLines(db)].sort((a, b) => b.at - a.at).slice(0, limit);
}
