/**
 * The check-in message and what can go in it (25 Nov, Figma 222:1040): three things the sender can tick, and the
 * message follows the ticks. Pure: nothing here reads a database or sends anything.
 */
import type { OpsDatabase } from "@/data/types";
import { dayWords } from "@/lib/clientsView";

const DAY = 86_400_000;
const first = (name: string) => name.trim().split(/\s+/)[0] ?? "";

export type CheckInPart = "settling" | "places" | "better";

/** The newest person who joined this client in the last 30 days, or null. */
export function recentJoiner(db: Pick<OpsDatabase, "placements">, clientId: string, now: number): { name: string; joined: string } | null {
  const rows = db.placements
    .filter((p) => p.clientId === clientId && p.state === "joined" && p.joinedAt !== null && now - p.joinedAt <= 30 * DAY && p.joinedAt <= now)
    .sort((a, b) => (b.joinedAt ?? 0) - (a.joinedAt ?? 0));
  const p = rows[0];
  return p ? { name: p.candidateName, joined: dayWords(p.joinedAt!) } : null;
}

/** How long since the last talk, in the words of the left rail: "Last talk Fri 13 Nov, 5 days ago". */
export function lastTalkLine(quietDays: number | null, now: number): string {
  if (quietDays === null) return "No call or message is written down yet";
  if (quietDays === 0) return "Last talk today";
  return "Last talk " + dayWords(now - quietDays * DAY) + ", " + quietDays + (quietDays === 1 ? " day" : " days") + " ago";
}

/** The message, from the contact's and sender's first names and the parts that are ticked. */
export function checkInMessage(o: {
  contact: string | null;
  sender: string;
  parts: CheckInPart[];
  settling: { name: string; joined: string } | null;
  roles: string[];
}): string {
  const who = o.contact ? " " + first(o.contact) : "";
  const lines = ["Hi" + who + ", this is " + first(o.sender) + " from Career141. I wanted to check in."];
  if (o.parts.includes("settling") && o.settling) lines.push("How is " + first(o.settling.name) + " settling in since joining on " + o.settling.joined + "?");
  if (o.parts.includes("places") && o.roles.length) {
    lines.push("We still have " + o.roles.length + (o.roles.length === 1 ? " role" : " roles") + " open (" + o.roles.join(", ") + "), so please tell me if you would like more CVs.");
  }
  if (o.parts.includes("better")) lines.push("Is there anything we can do better?");
  lines.push("Thank you!");
  return lines.join("\n\n");
}
