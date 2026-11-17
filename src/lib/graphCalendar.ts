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

/** Cancels the event; the TA lead on it is told by Microsoft, nobody else. */
export async function cancelTeamsEvent(organiserEmail: string, eventId: string): Promise<CalendarOutcome | null> {
  if (teamsFake()) return null;
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
    return response.ok ? null : { ok: false, reason: sayGraphFailure(response.status, organiserEmail) };
  } catch {
    return { ok: false, reason: "Microsoft did not answer in time." };
  }
}
