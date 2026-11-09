/**
 * The feed (8 Nov, docs/31 part 2): what arrived by itself, as lines in
 * the chat with their own buttons.
 *
 * The owner's point: everything comes in through email and the clocks,
 * and the person should not have to go looking. So every new email, every
 * clock that ran out, every task the desk made for you and every event
 * from the TA System becomes a line in the thread, the moment the poll
 * sees it. Nothing here writes; the route that polls keeps what it finds
 * as chat rows so a line appears once and stays.
 *
 * A line's `key` is the row it came from, so it is never written twice.
 */

import type { OpsDatabase } from "@/data/types";
import type { ChatButton } from "@/lib/agent";
import { whatWeDoWithIt } from "@/lib/taEvents";
import { clockInWords } from "@/lib/timers";

export interface FeedLine {
  /** Where it came from: "inbound:<id>", "timer:<id>", "task:<id>", "event:<id>". */
  key: string;
  at: number;
  text: string;
  buttons: ChatButton[];
  /** Where to go to see it, when there is a page. */
  open: string | null;
}

/** Everything that arrived for this person after `after`, oldest first. */
export function feedSince(db: OpsDatabase, memberId: string, after: number, now: number): FeedLine[] {
  const lines: FeedLine[] = [];

  for (const mail of db.inbound) {
    if (mail.receivedAt <= after || mail.readState !== "new") continue;
    const from = mail.fromName || mail.from;
    const client = mail.clientId ? db.clients.find((c) => c.id === mail.clientId)?.name : null;
    lines.push({
      key: "inbound:" + mail.id,
      at: mail.receivedAt,
      text: "Email from " + from + (client ? " (" + client + ")" : "") + ": " + mail.subject,
      buttons: [
        {
          label: "Mark it done",
          action: "markMailDone",
          fields: { inboundId: mail.id },
          shows: [
            { label: "Email from", value: from, href: "/mail", field: "inboundId" },
            { label: "Subject", value: mail.subject, href: "", field: "inboundId" },
          ],
        },
      ],
      open: "/mail",
    });
  }

  for (const entry of db.audit) {
    if (entry.at <= after) continue;
    if (entry.action === "timer.fired") {
      const timer = db.timers.find((t) => t.id === entry.subjectId);
      if (!timer || timer.ownerId !== memberId) continue;
      lines.push({
        key: "timer:" + timer.id,
        at: entry.at,
        text: "A clock ran out: " + (timer.payload.label ?? clockInWords(timer.kind)) + ".",
        buttons: [],
        open: "/",
      });
    }
    if (entry.action === "task.created" || entry.action === "task.escalated") {
      const task = db.tasks.find((t) => t.id === entry.subjectId);
      if (!task || task.assigneeId !== memberId) continue;
      lines.push({
        key: "task:" + task.id + ":" + entry.action,
        at: entry.at,
        text: (entry.action === "task.escalated" ? "Passed to you: " : "New task for you: ") + task.title,
        buttons: [],
        open: "/tasks/" + task.id,
      });
    }
  }

  for (const event of db.events) {
    if (event.receivedAt <= after) continue;
    lines.push({
      key: "event:" + event.id,
      at: event.receivedAt,
      text: "From the TA System: " + event.type + " - " + whatWeDoWithIt(event.type),
      buttons: [],
      open: "/ta",
    });
  }

  return lines.filter((l) => l.at <= now).sort((a, b) => a.at - b.at);
}

/** The chat row's mark for a feed line, so the same line is never kept twice. */
export function feedMark(key: string): string {
  return "feed:" + key;
}
