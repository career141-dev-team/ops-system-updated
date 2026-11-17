import type { OpsDatabase } from "@/data/types";
import { boardStatus } from "@/lib/interviews";

/**
 * The people on the desk (16 Nov, Figma 249:11300).
 *
 * Candidates live in the TA System. Ops holds no table of them, so this is a window: everyone who
 * is in one of our CV sets or has an interview, joined by name, with where they stand on each
 * opening. Nothing is invented - no salary, no notice, no years: Ops was never told them.
 */

export interface CandidateApplication {
  /** The opening, for the link to its own page. */
  positionId: string | null;
  openingTaId: string;
  applicationTaId: string;
  title: string;
  clientName: string;
  status: string;
  tone: "ok" | "warn" | "violet" | "info" | "danger" | "quiet";
  setName: string | null;
  fileId: string | null;
  decision: string | null;
}

export interface CandidateRow {
  key: string;
  name: string;
  initials: string;
  applications: CandidateApplication[];
}

export type CandidateFilter = "shortlisted" | "multi" | "interview";

const keyOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")).toUpperCase();
}

export function candidatesOnDesk(db: OpsDatabase): CandidateRow[] {
  const people = new Map<string, CandidateRow>();
  const place = (openingTaId: string) => {
    const position = db.positions.find((p) => p.openingTaId === openingTaId) ?? null;
    const client = position?.clientId ? db.clients.find((c) => c.id === position.clientId) : null;
    return { position, title: position?.title ?? openingTaId, clientName: client?.name ?? "Client" };
  };
  const add = (name: string, app: CandidateApplication) => {
    const key = keyOf(name);
    if (!key) return;
    const person = people.get(key) ?? { key, name: name.trim(), initials: initialsOf(name), applications: [] };
    // One line per opening: an interview says more than the set it came from, so it replaces it.
    const at = person.applications.findIndex((a) => a.openingTaId === app.openingTaId);
    if (at === -1) person.applications.push(app);
    else if (app.tone !== "quiet" || person.applications[at].status.startsWith("In ")) person.applications[at] = { ...person.applications[at], ...app, fileId: app.fileId ?? person.applications[at].fileId, decision: app.decision ?? person.applications[at].decision, setName: app.setName ?? person.applications[at].setName };
    people.set(key, person);
  };

  for (const set of db.clientSets) {
    const where = place(set.openingTaId);
    for (const c of set.candidates) {
      const rejected = c.decision === "rejected" || c.claimVerdict === "dropped";
      add(c.name, {
        positionId: where.position?.id ?? null,
        openingTaId: set.openingTaId,
        applicationTaId: c.applicationTaId,
        title: where.title,
        clientName: where.clientName,
        status:
          c.decision === "shortlisted" ? "Shortlisted by the client"
          : rejected ? (c.claimVerdict === "dropped" ? "Dropped · client had the CV" : "Not taken by the client")
          : set.state === "sent" ? "With the client"
          : "In CV set " + set.setNumber,
        tone: c.decision === "shortlisted" ? "ok" : rejected ? "quiet" : set.state === "sent" ? "violet" : "info",
        setName: set.name,
        fileId: c.fileId,
        decision: c.decision ?? null,
      });
    }
  }
  for (const iv of db.interviews) {
    const where = place(iv.openingTaId);
    const s = boardStatus(iv);
    add(iv.candidateName, {
      positionId: iv.positionId ?? where.position?.id ?? null,
      openingTaId: iv.openingTaId,
      applicationTaId: iv.applicationTaId,
      title: where.title,
      clientName: where.clientName,
      status: "Interview · " + s.label,
      tone: s.tone,
      setName: null,
      fileId: null,
      decision: iv.decision,
    });
  }
  return [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** The words on a tile: the role, and how many openings or where they stand. */
export function tileLines(p: CandidateRow): [string, string] {
  const first = p.applications[0];
  return [first?.title ?? "", p.applications.length > 1 ? p.applications.length + " openings" : (first?.status ?? "")];
}

export function searchCandidates(rows: CandidateRow[], q: string, filter: string | null): CandidateRow[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((p) => {
    if (filter === "shortlisted" && !p.applications.some((a) => a.decision === "shortlisted")) return false;
    if (filter === "multi" && p.applications.length < 2) return false;
    if (filter === "interview" && !p.applications.some((a) => a.status.startsWith("Interview"))) return false;
    const hay = (p.name + " " + p.applications.map((a) => a.title + " " + a.clientName).join(" ")).toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
