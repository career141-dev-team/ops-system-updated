/**
 * Makes and cancels the Teams meeting in an ops person's Outlook calendar (17 Nov).
 *
 * Uses the same Microsoft app registration as the mail (`graphToken`); the one
 * extra thing it needs is the `Calendars.ReadWrite` application permission.
 * Never throws: a refusal comes back as a sentence, because a booking must
 * still stand when Microsoft cannot make the link.
 *
 * `OPS_TEAMS_FAKE=on` answers with a made-up link and calls nobody, so a
 * laptop can never create a real meeting.
 */
import { SEND_TIME_LIMIT_MS, graphToken } from "./senders";
import { type OutlookEvent, mapEvents } from "./outlook";
import { type EventInput, eventFor, readEvent, sayGraphFailure } from "./teams";

const GRAPH = "https://graph.microsoft.com/v1.0";

export type CalendarOutcome =
  | { ok: true; eventId: string; joinUrl: string }
  | { ok: false; reason: string };

export function teamsFake(): boolean {
  return (process.env.OPS_TEAMS_FAKE ?? "").trim().toLowerCase() === "on";
}

export async function createTeamsEvent(organiserEmail: string, input: EventInput): Promise<CalendarOutcome> {
  if (teamsFake()) {
    const id = "fake-" + input.at;
    return { ok: true, eventId: id, joinUrl: input.online === false ? "" : "https://teams.example/fake/" + id };
  }
  try {
    const token = await graphToken();
    if (!token) return { ok: false, reason: "Microsoft is not set up on this machine (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET)." };
    const response = await fetch(GRAPH + "/users/" + encodeURIComponent(organiserEmail) + "/events", {
      method: "POST",
      headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify(eventFor(input)),
      signal: AbortSignal.timeout(SEND_TIME_LIMIT_MS),
    });
    if (!response.ok) return { ok: false, reason: sayGraphFailure(response.status, organiserEmail) };
    forgetCalendar(organiserEmail);
    const made = readEvent(await response.json(), input.online !== false);
    return made
      ? { ok: true, ...made }
      : { ok: false, reason: "Microsoft made the event but sent no Teams link back. Is the organiser licensed for Teams?" };
  } catch {
    return { ok: false, reason: "Microsoft did not answer in time." };
  }
}

export type TranscriptOutcome = { ok: true; vtt: string } | { ok: false; reason: string };

const FAKE_VTT = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
<v Recruiter (Career 141)>Tell me about the role you need filled.</v>

2
00:00:05.000 --> 00:00:12.000
<v Client>We need two delivery drivers for the Colombo office, starting in January, around ninety thousand a month. They report to the logistics manager.</v>
`;

/**
 * Finds the Teams meeting by its join link and fetches its newest transcript
 * as WebVTT (17 Nov). Needs `OnlineMeetingTranscript.Read.All` and a Teams
 * application access policy for the organiser; either missing comes back as a
 * sentence, not a crash.
 */
export async function fetchTranscript(organiserEmail: string, joinUrl: string): Promise<TranscriptOutcome> {
  if (teamsFake()) return { ok: true, vtt: FAKE_VTT };
  try {
    const token = await graphToken();
    if (!token) return { ok: false, reason: "Microsoft is not set up on this machine." };
    const base = GRAPH + "/users/" + encodeURIComponent(organiserEmail) + "/onlineMeetings";
    const headers = { authorization: "Bearer " + token };
    const signal = () => AbortSignal.timeout(SEND_TIME_LIMIT_MS);

    const found = await fetch(base + "?$filter=" + encodeURIComponent("JoinWebUrl eq '" + joinUrl.replace(/'/g, "''") + "'"), { headers, signal: signal() });
    if (!found.ok) return { ok: false, reason: sayTranscriptFailure(found.status) };
    const meeting = ((await found.json()) as { value?: { id: string }[] }).value?.[0];
    if (!meeting) return { ok: false, reason: "Microsoft has no meeting with that link. Was it made by hand?" };

    const list = await fetch(base + "/" + meeting.id + "/transcripts", { headers, signal: signal() });
    if (!list.ok) return { ok: false, reason: sayTranscriptFailure(list.status) };
    const all = ((await list.json()) as { value?: { id: string; createdDateTime?: string }[] }).value ?? [];
    const newest = [...all].sort((a, b) => (b.createdDateTime ?? "").localeCompare(a.createdDateTime ?? ""))[0];
    if (!newest) return { ok: false, reason: "Nobody started transcription in the meeting, so there is no transcript. Start it with More > Record and transcribe next time." };

    const content = await fetch(base + "/" + meeting.id + "/transcripts/" + newest.id + "/content?$format=text/vtt", { headers, signal: signal() });
    if (!content.ok) return { ok: false, reason: sayTranscriptFailure(content.status) };
    return { ok: true, vtt: await content.text() };
  } catch {
    return { ok: false, reason: "Microsoft did not answer in time." };
  }
}

function sayTranscriptFailure(status: number): string {
  if (status === 401 || status === 403) {
    return "Microsoft refused: the app needs the OnlineMeetingTranscript.Read.All permission, and a Teams application access policy for this organiser.";
  }
  if (status === 404) return "Microsoft has no transcript for that meeting yet. It can take a few minutes after the call ends.";
  return "Microsoft could not give the transcript (" + status + ").";
}

export const TEAMS_OFF = "Teams is switched off in Settings (switch.teamsEnabled), so the Outlook event was left as it is.";

/**
 * Cancels the event; the TA lead on it is told by Microsoft, nobody else.
 * `enabled` is switch.teamsEnabled: off, Graph is not called (fake mode is always allowed).
 * Returns null when it went (or nothing was needed), else a sentence.
 */
export async function cancelTeamsEvent(organiserEmail: string, eventId: string, enabled: boolean): Promise<CalendarOutcome | null> {
  if (teamsFake()) return null;
  if (!enabled) return { ok: false, reason: TEAMS_OFF };
  try {
    const token = await graphToken();
    if (!token) return { ok: false, reason: "Microsoft is not set up on this machine." };
    const response = await fetch(
      GRAPH + "/users/" + encodeURIComponent(organiserEmail) + "/events/" + encodeURIComponent(eventId) + "/cancel",
      {
        method: "POST",
        headers: { authorization: "Bearer " + token, "content-type": "application/json" },
        body: JSON.stringify({ comment: "This meeting was not held." }),
        signal: AbortSignal.timeout(SEND_TIME_LIMIT_MS),
      },
    );
    if (response.ok) forgetCalendar(organiserEmail);
    return response.ok ? null : { ok: false, reason: sayGraphFailure(response.status, organiserEmail) };
  } catch {
    return { ok: false, reason: "Microsoft did not answer in time." };
  }
}

export interface ListOutcome {
  events: OutlookEvent[];
  problem?: string;
}

const LIST_LIMIT_MS = 2500;
const CACHE_MS = 60_000;
const CACHE_MAX = 100;
const MAX_PAGES = 3;
const seen = new Map<string, { at: number; out: ListOutcome }>();

/** What the answers kept so far, for a test. */
export function calendarCacheSize(): number {
  return seen.size;
}

/** An event was made, moved or cancelled: what was kept for that mailbox is no longer true. */
export function forgetCalendar(email: string): void {
  for (const key of [...seen.keys()]) if (key.startsWith(email + "|")) seen.delete(key);
}

function keep(key: string, out: ListOutcome): void {
  const t = Date.now();
  for (const [k, v] of seen) if (t - v.at >= CACHE_MS) seen.delete(k);
  seen.set(key, { at: t, out });
  // The oldest go first once the cap is reached.
  while (seen.size > CACHE_MAX) seen.delete(seen.keys().next().value as string);
}

/**
 * One person's calendar between two instants, read-only (21 Nov). Never throws and
 * never waits more than 2.5s, so a page or a booking cannot hang on Microsoft.
 * Answers are kept for a minute per mailbox and range (at most 100 kept), and a booking, move or
 * cancel forgets that mailbox's. Follows Microsoft's next page up to three times.
 */
export async function listEvents(email: string, fromIso: string, toIso: string): Promise<ListOutcome> {
  if (teamsFake()) {
    const from = Date.parse(fromIso);
    const to = Date.parse(toIso);
    const at = (h: number, title: string): OutlookEvent => ({ id: "fake-ev-" + h, title, start: from + h * 3_600_000, end: from + (h + 1) * 3_600_000, joinUrl: "https://teams.example/fake/ev" + h, busy: true });
    // Working hours from the week's start (Monday 10:00, Wednesday 14:00 Colombo) so the laptop calendar looks real.
    return { events: [at(10, "Weekly sync"), at(48 + 14, "Pipeline review")].filter((e) => e.end <= to) };
  }
  const key = email + "|" + fromIso + "|" + toIso;
  const hit = seen.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.out;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIST_LIMIT_MS);
  let out: ListOutcome;
  try {
    const token = await graphToken();
    if (!token) return { events: [], problem: "Microsoft is not set up on this machine." };
    let url: string | null =
      GRAPH + "/users/" + encodeURIComponent(email) + "/calendarView?startDateTime=" + encodeURIComponent(fromIso) +
      "&endDateTime=" + encodeURIComponent(toIso) + "&$top=50&$orderby=start/dateTime" +
      "&$select=subject,start,end,isOnlineMeeting,onlineMeeting,sensitivity,showAs,webLink";
    const events: OutlookEvent[] = [];
    let problem: string | undefined;
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const response: Response = await fetch(url, {
        headers: { authorization: "Bearer " + token, prefer: 'outlook.timezone="UTC"' },
        signal: controller.signal,
      });
      if (!response.ok) {
        problem = sayGraphFailure(response.status, email);
        break;
      }
      const json = await response.json();
      events.push(...mapEvents(json));
      const next = (json as { "@odata.nextLink"?: unknown })["@odata.nextLink"];
      url = typeof next === "string" && next.startsWith(GRAPH + "/") ? next : null;
    }
    out = problem ? { events: [], problem } : { events };
  } catch {
    return { events: [], problem: "Microsoft did not answer in time." };
  } finally {
    clearTimeout(timer);
  }
  if (!out.problem) keep(key, out);
  return out;
}

/** Moves an event to a new start, keeping its length; a failure is a sentence, not a crash. `enabled` is switch.teamsEnabled. */
export async function moveTeamsEvent(organiserEmail: string, eventId: string, newStartIso: string, lengthMin: number, enabled: boolean): Promise<CalendarOutcome | null> {
  if (teamsFake()) return null;
  if (!enabled) return { ok: false, reason: TEAMS_OFF };
  try {
    const token = await graphToken();
    if (!token) return { ok: false, reason: "Microsoft is not set up on this machine." };
    const start = Date.parse(newStartIso);
    const response = await fetch(GRAPH + "/users/" + encodeURIComponent(organiserEmail) + "/events/" + encodeURIComponent(eventId), {
      method: "PATCH",
      headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify({
        start: { dateTime: new Date(start).toISOString().slice(0, 19), timeZone: "UTC" },
        end: { dateTime: new Date(start + lengthMin * 60_000).toISOString().slice(0, 19), timeZone: "UTC" },
      }),
      signal: AbortSignal.timeout(SEND_TIME_LIMIT_MS),
    });
    if (response.ok) forgetCalendar(organiserEmail);
    return response.ok ? null : { ok: false, reason: sayGraphFailure(response.status, organiserEmail) };
  } catch {
    return { ok: false, reason: "Microsoft did not answer in time." };
  }
}
