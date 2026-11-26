/**
 * The Clients screens of the v6 design (19 Nov): which column an enquiry or an agreement sits in,
 * and the words on a client card. Pure, so each case is a test; the pages only read the desk.
 */

export type EnquiryColumn = "new" | "intro" | "send";
export type AgreementColumn = "send" | "chasing" | "changes" | "signed" | "done";

const OUT = ["sent", "chasing", "negotiating", "signed", "countersigned"];

/** The enquiry column a lead is in, or null when it is closed or past the enquiry (its agreement is out). */
export function enquiryColumn(
  lead: { state: string; industryFlagged: boolean; industryConfirmedBy: string | null },
  meetings: { kind: string; state: string }[],
  esaState: string | null,
): EnquiryColumn | null {
  if (lead.state.startsWith("closed") || lead.state === "declined_industry") return null;
  if (esaState && OUT.includes(esaState)) return null;
  if (esaState === "draft") return "send";
  const intro = meetings.filter((m) => m.kind === "intro");
  if (intro.some((m) => m.state === "held")) return "send";
  if (lead.state === "waiting_agreement") return "send";
  if (lead.state === "requirement" || lead.state === "handed_over") return null;
  if (lead.state === "intro_call" || intro.some((m) => m.state === "booked")) return "intro";
  // 26 Nov (Nov 25 ops meeting): no Checks tab; a flagged lead waits in New with a badge.
  return "new";
}

const DAY = 86_400_000;

/** The agreement column, or null for declined and expired ones (they leave the board). Done stays for 30 days. */
export function agreementColumn(
  esa: { state: string; countersignedAt: number | null },
  now: number,
): AgreementColumn | null {
  if (esa.state === "draft") return "send";
  if (esa.state === "sent" || esa.state === "chasing") return "chasing";
  if (esa.state === "negotiating") return "changes";
  if (esa.state === "signed") return "signed";
  if (esa.state === "countersigned") return esa.countersignedAt && now - esa.countersignedAt > 30 * DAY ? null : "done";
  return null;
}

/** When chase `step` falls due: the plan's days added up from the day it was sent (the clock re-times from each chase). */
export function chaseDueAt(sentAt: number, step: number, plan: { step: number; afterDays: number }[]): number {
  return sentAt + plan.filter((p) => p.step <= step).reduce((n, p) => n + p.afterDays, 0) * DAY;
}

/** "due today", "overdue", or "due Fri 20 Nov" for a chase date. */
export function dueWords(dueAt: number, now: number): { text: string; tone: "danger" | "warn" | "info" } {
  const day = (t: number) => Math.floor((t + 5.5 * 3_600_000) / DAY);
  const diff = day(dueAt) - day(now);
  if (diff < 0) return { text: "overdue", tone: "danger" };
  if (diff === 0) return { text: "due today", tone: "warn" };
  const label = new Date(dueAt + 5.5 * 3_600_000).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return { text: "due " + label, tone: "info" };
}

/** "2 roles", "1 role", "No roles". */
export const rolesWords = (n: number): string => (n === 0 ? "No roles" : n + (n === 1 ? " role" : " roles"));

/** "last talk today" / "2 days ago" / "no talk yet", from the day counts in Colombo. */
export function lastTalkWords(at: number | null, now: number): string {
  if (at === null) return "no talk logged yet";
  const day = (t: number) => Math.floor((t + 5.5 * 3_600_000) / DAY);
  const d = day(now) - day(at);
  return "last talk " + (d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago");
}

/** Two letters for a company tile: "Hill Country Tea" is HT; one word takes its first two letters. */
export function tileLetters(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length === 0) return "–";
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[w.length - 1][0]).toUpperCase();
}

export interface ContactRow {
  name: string;
  role: string;
  email: string;
  phone: string;
}

/** The client's contacts: the standing ones on its record, else the person on the enquiry, else none. */
export function contactsOf(
  client: { contacts?: ContactRow[] },
  lead: { contactName: string; contactEmail: string; contactPhone: string } | null,
): ContactRow[] {
  if (client.contacts?.length) return client.contacts;
  if (lead && (lead.contactName || lead.contactEmail)) {
    return [{ name: lead.contactName || lead.contactEmail, role: "", email: lead.contactEmail, phone: lead.contactPhone }];
  }
  return [];
}

/** Quiet: nothing logged for more than `days` days (or never). */
export const isQuiet = (lastTalk: number | null, now: number, days = 3): boolean => lastTalk === null || now - lastTalk > days * DAY;
