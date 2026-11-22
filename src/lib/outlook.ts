/**
 * A person's own Outlook calendar, read-only (21 Nov).
 *
 * Pure: turns Graph's calendarView answer into plain events and says when a
 * booking would land on top of one. `graphCalendar.ts` does the talking.
 * A private event shows as "Busy" with no link, so nothing sensitive reaches
 * a screen or a warning.
 */
export interface OutlookEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  joinUrl?: string;
  busy: boolean;
}

// Asked for in UTC, so Graph answers "2026-11-20T05:00:00.0000000" with no zone; read it as UTC.
function utcMs(raw: unknown): number {
  const text = typeof raw === "string" ? raw : "";
  return Date.parse(/Z|[+-]\d\d:\d\d$/.test(text) ? text : text + "Z");
}

export function mapEvents(json: unknown): OutlookEvent[] {
  const list = (json as { value?: unknown[] } | null)?.value;
  if (!Array.isArray(list)) return [];
  const out: OutlookEvent[] = [];
  for (const raw of list) {
    const e = (raw ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const start = utcMs(e.start?.dateTime);
    const end = utcMs(e.end?.dateTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || typeof e.id !== "string") continue;
    const hidden = e.sensitivity === "private" || e.sensitivity === "confidential" || e.sensitivity === "personal";
    const joinUrl = !hidden && e.isOnlineMeeting && typeof e.onlineMeeting?.joinUrl === "string" ? e.onlineMeeting.joinUrl : undefined;
    out.push({
      id: e.id,
      title: hidden ? "Busy" : String(e.subject ?? "").trim() || "(no title)",
      start,
      end,
      ...(joinUrl ? { joinUrl } : {}),
      busy: e.showAs === undefined || ["busy", "oof", "tentative", "workingElsewhere"].includes(e.showAs),
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

function clock(ms: number): string {
  return new Date(ms + 5.5 * 3_600_000).toISOString().slice(11, 16);
}

/** The first busy event the booking overlaps, as a sentence; events that only touch do not clash. */
export function clashWith(atIso: number, lengthMin: number, events: OutlookEvent[]): string | null {
  const end = atIso + lengthMin * 60_000;
  const hit = events.find((e) => e.busy && e.start < end && e.end > atIso);
  return hit ? `You have "${hit.title}" in Outlook at ${clock(hit.start)} - ${clock(hit.end)}.` : null;
}
