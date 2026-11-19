/**
 * The role page's Interviews tab (v6 R1, 19 Nov): which column an interview sits in, how a time reads
 * ("Fri 20 Nov, 10:00"), and the plain messages to copy. Pure: no database, nothing sent.
 */
import { COLOMBO_OFFSET_MS, DAY } from "@/lib/calendar";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

/** "Fri 20 Nov, 10:00", Colombo time. */
export function slotWords(at: number): string {
  const d = new Date(at + COLOMBO_OFFSET_MS);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "20 Nov", Colombo time. */
export function dayWords(at: number): string {
  const d = new Date(at + COLOMBO_OFFSET_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** The value of a datetime-local field for an instant, Colombo time. */
export function localInput(at: number): string {
  return new Date(at + COLOMBO_OFFSET_MS).toISOString().slice(0, 16);
}

export type BoardColumn = "needs" | "booked" | "waiting" | "done";

export const COLUMN_TITLES: Record<BoardColumn, string> = {
  needs: "Needs a time",
  booked: "Booked",
  waiting: "Waiting for the decision",
  done: "Done",
};

/** Where an interview sits: no time yet, booked, held with no decision, or finished. */
export function columnOf(iv: { state: string; decision: string | null }): BoardColumn {
  if (iv.state === "slots" || iv.state === "agreed") return "needs";
  if (iv.state === "booked" || iv.state === "reconfirmed") return "booked";
  if (iv.state === "attended" && !iv.decision) return "waiting";
  return "done";
}

export function ordinalRound(round: number): string {
  return round === 1 ? "1st round" : round === 2 ? "2nd round" : round === 3 ? "3rd round" : round + "th round";
}

/** The Colombo calendar day number, so "today" and "tomorrow" ignore the hour. */
const dayNumber = (at: number) => Math.floor((at + COLOMBO_OFFSET_MS) / DAY);

/** "Reconfirm today" on the day (or the day before) a booked interview, else null. */
export function reconfirmNote(iv: { state: string; at: number | null }, now: number): string | null {
  if (iv.state !== "booked" || iv.at === null) return null;
  const days = dayNumber(iv.at) - dayNumber(now);
  if (days < 0) return null;
  return days === 0 ? "Reconfirm today" : days === 1 ? "Reconfirm today, it is tomorrow" : null;
}

/** Slots both sides gave, as far as Ops was told: offered, and the candidate said free. */
export function timesThatFit(iv: { slots: number[]; slotAnswers?: { at: number; free: boolean }[] }): number[] {
  return iv.slots.filter((at) => iv.slotAnswers?.find((a) => a.at === at)?.free === true);
}

export function confirmationText(p: { candidate: string; client: string; at: number; where: string; opsPerson: string }): string {
  const first = p.candidate.split(" ")[0] || p.candidate;
  return `Hello ${first}, your interview with ${p.client} is on ${slotWords(p.at).replace(",", " at")}${p.where ? ", " + p.where : ""}. Thank you, ${p.opsPerson}`;
}

export function reconfirmText(p: { candidate: string; client: string; at: number; where: string }): string {
  const first = p.candidate.split(" ")[0] || p.candidate;
  return `Hi ${first}, your interview with ${p.client} is ${slotWords(p.at).replace(",", " at")}${p.where ? ", " + p.where : ""}. Please reply to confirm you can come.`;
}

export function clientBooksText(p: { client: string; contact: string; candidate: string; phone: string; opsPerson: string }): string {
  const c = p.contact.split(" ")[0] || p.contact;
  const first = p.candidate.split(" ")[0] || p.candidate;
  return `Hello ${c}, ${first} can take your call.${p.phone ? " The number is " + p.phone + "." : ""} Please tell us the date you agree. Thank you, ${p.opsPerson}`;
}
