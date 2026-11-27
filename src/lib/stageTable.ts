/**
 * The candidate table as a file or as text to paste (Ops lead, 25 Nov). Kept apart from `setTracking.ts` because the
 * export screen is a client component and must not pull in the TA System code that rule reads candidates through.
 */
import { csvDate, csvRows } from "@/lib/exports";
import { shortDay } from "@/lib/setsBoard";

export interface TrackRow {
  id: string;
  name: string;
  setNumber: number | null;
  stage: string;
  feedback: string;
  feedbackAt: number | null;
}

/** Rows left after a person removes candidates from the export. */
export function stageRowsWithout(rows: TrackRow[], removedIds: Iterable<string>): TrackRow[] {
  const removed = new Set(removedIds);
  return rows.filter((row) => !removed.has(row.id));
}

const HEADER = ["Candidate", "Set", "Stage", "Last feedback", "Feedback date"];
const cells = (r: TrackRow) => [r.name, r.setNumber === null ? "" : "Set " + r.setNumber, r.stage, r.feedback, r.feedbackAt ? shortDay(r.feedbackAt) : ""];

/** The rows as a CSV, header included. */
export function stageRowsCsv(rows: TrackRow[]): string {
  return csvRows(HEADER, rows.map((r) => [...cells(r).slice(0, 4), r.feedbackAt ? csvDate(r.feedbackAt) : ""]));
}

/** The rows as text for pasting into a spreadsheet or a WhatsApp message: tab-separated. */
export function stageRowsTsv(rows: TrackRow[]): string {
  return [HEADER, ...rows.map(cells)].map((r) => r.map((c) => c.replace(/[\t\r\n]+/g, " ")).join("\t")).join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** The rows as an HTML table, for pasting into an email. */
export function stageRowsHtml(rows: TrackRow[]): string {
  const row = (r: string[], tag: "th" | "td") => "<tr>" + r.map((c) => `<${tag} style="border:1px solid #ccc;padding:4px 8px;text-align:left">${esc(c)}</${tag}>`).join("") + "</tr>";
  return `<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px">${row(HEADER, "th")}${rows.map((r) => row(cells(r), "td")).join("")}</table>`;
}

