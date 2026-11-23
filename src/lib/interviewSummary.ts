/**
 * The interview summary (23 Nov, the ops team's feedback): the table that replaces the Excel tracker,
 * beside the Calendar. One row per interview, client or internal, with the words the team uses for
 * mode and status. Pure: it reads the desk's rows and draws nothing.
 *
 * Status in the team's four words, plus the three ways an interview can end that are not one of them:
 *   Scheduled (a time is agreed, booked or reconfirmed), Pending (still agreeing a time), Attended,
 *   Withdrew (the candidate pulled out). The client cancelling and nobody coming keep their own words,
 *   so the table never calls a client's decision a candidate's.
 */
import { colomboDate } from "@/lib/calendar";
import type { OpsDatabase } from "@/data/types";

export type SummaryStatus = "Scheduled" | "Pending" | "Attended" | "Withdrew" | "No-show" | "Cancelled";
export const SUMMARY_STATUSES: SummaryStatus[] = ["Scheduled", "Pending", "Attended", "Withdrew", "No-show", "Cancelled"];

export type SummaryMode = "On-site" | "Online" | "Phone";
export const SUMMARY_MODES: SummaryMode[] = ["On-site", "Online", "Phone"];

export interface SummaryRow {
  id: string;
  kind: "client" | "internal";
  client: string;
  candidate: string;
  /** Position and round, the "details" under the name. */
  detail: string;
  mode: SummaryMode | null;
  at: number | null;
  status: SummaryStatus;
  href: string;
}

export function statusOf(state: string): SummaryStatus {
  switch (state) {
    case "attended":
      return "Attended";
    case "withdrew":
      return "Withdrew";
    case "no_show":
      return "No-show";
    case "cancelled":
      return "Cancelled";
    case "slots":
      return "Pending";
    default:
      return "Scheduled";
  }
}

function modeOf(format: string): SummaryMode | null {
  if (format === "online") return "Online";
  if (format === "onsite") return "On-site";
  if (format === "phone") return "Phone";
  return null;
}

/** Every interview on the desk, newest time first; ones with no time yet come first, as they need somebody. */
export function summaryRows(db: OpsDatabase, now: number): SummaryRow[] {
  const rows: SummaryRow[] = db.interviews.map((iv) => {
    const position = iv.positionId ? db.positions.find((p) => p.id === iv.positionId) : db.positions.find((p) => p.openingTaId === iv.openingTaId);
    const clientId = iv.clientId ?? position?.clientId ?? null;
    const client = clientId ? db.clients.find((c) => c.id === clientId)?.name : null;
    return {
      id: iv.id,
      kind: "client",
      client: client ?? "Client",
      candidate: iv.candidateName,
      detail: [position?.title, "round " + iv.round].filter(Boolean).join(" · "),
      mode: modeOf(iv.format),
      at: iv.at,
      status: statusOf(iv.state),
      href: "/interviews/" + iv.id,
    };
  });
  for (const a of db.applicants) {
    if (!a.interviewAt) continue;
    const vacancy = db.vacancies.find((v) => v.id === a.vacancyId);
    rows.push({
      id: a.id,
      kind: "internal",
      client: "Career 141 (internal)",
      candidate: a.name,
      detail: vacancy?.title ?? "Internal vacancy",
      mode: a.joinUrl ? "Online" : a.place ? "On-site" : null,
      at: a.interviewAt,
      status: a.interviewAt > now ? "Scheduled" : "Attended",
      href: "/hiring/" + a.vacancyId,
    });
  }
  const key = (r: SummaryRow) => r.at ?? Number.MAX_SAFE_INTEGER;
  return rows.sort((x, y) => key(y) - key(x));
}

export interface SummaryFilter {
  client?: string;
  mode?: string;
  status?: string;
  /** Colombo dates, YYYY-MM-DD, both ends included. */
  from?: string;
  to?: string;
}

/** The rows that match. An empty filter keeps everything; a row with no time yet is dropped by a date range, since it has no date. */
export function filterSummary(rows: SummaryRow[], f: SummaryFilter): SummaryRow[] {
  const client = (f.client ?? "").trim().toLowerCase();
  return rows.filter((r) => {
    if (client && !r.client.toLowerCase().includes(client)) return false;
    if (f.mode && r.mode !== f.mode) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.from || f.to) {
      if (r.at === null) return false;
      const day = colomboDate(r.at);
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
    }
    return true;
  });
}
