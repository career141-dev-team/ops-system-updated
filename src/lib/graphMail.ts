import "server-only";

/**
 * Reading the Ops mailbox (15, Phase 1 step 18).
 *
 * The mailboxes are Microsoft 365 — checked on 2 Nov: career141.com's mail
 * records point at Microsoft and the sender policy names their servers — so
 * this reads through Graph, exactly as the TA System reads linkedin@, cv@ and
 * job@.
 *
 * Two guards the TA System paid for in incidents:
 *
 *   **A hard time limit.** A read that hangs used to fill the backend's few
 *   action slots and take the end-of-day emails down with it (6 Oct).
 *   **A batch cap.** Listing a whole mailbox with bodies ran it out of memory
 *   and left linkedin@ unread for eighteen days (5 to 23 Oct).
 *
 * It is off until the credentials exist. Off means off: it returns a plain
 * reason, and the screen says so rather than showing an empty inbox that looks
 * like good news.
 */

export interface InboundMail {
  providerId: string;
  from: string;
  fromName: string;
  receivedAt: number;
  subject: string;
  body: string;
  inReplyTo: string | null;
}

export type ReadResult =
  | { ok: true; mail: InboundMail[]; mailbox: string; ms: number }
  | { ok: false; reason: string };

/** How many to take in one pass, and how long the whole pass may take. */
export const BATCH = 25;
export const TIME_LIMIT_MS = 15_000;

export function mailbox(): string {
  return (process.env.OPS_MAILBOX ?? "ops@career141.com").trim();
}

export function readerEnabled(): boolean {
  return (process.env.OPS_MAIL_READ ?? "").toLowerCase() === "on";
}

function graphReady(): boolean {
  return Boolean(
    (process.env.MS_TENANT_ID ?? "").trim() &&
      (process.env.MS_CLIENT_ID ?? "").trim() &&
      (process.env.MS_CLIENT_SECRET ?? "").trim(),
  );
}

async function token(): Promise<string | null> {
  const tenant = (process.env.MS_TENANT_ID ?? "").trim();
  const body = new URLSearchParams({
    client_id: (process.env.MS_CLIENT_ID ?? "").trim(),
    client_secret: (process.env.MS_CLIENT_SECRET ?? "").trim(),
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const response = await fetch("https://login.microsoftonline.com/" + tenant + "/oauth2/v2.0/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { access_token?: string };
  return json.access_token ?? null;
}

type GraphMessage = {
  id: string;
  subject?: string;
  receivedDateTime?: string;
  bodyPreview?: string;
  body?: { content?: string };
  internetMessageHeaders?: { name: string; value: string }[];
  from?: { emailAddress?: { address?: string; name?: string } };
};

/**
 * The unread mail in the Ops mailbox, oldest first so a burst is worked
 * through in order and none of it waits for ever.
 */
export async function readMailbox(): Promise<ReadResult> {
  if (!readerEnabled()) return { ok: false, reason: "Reading the Ops mailbox is switched off." };
  if (!graphReady()) return { ok: false, reason: "The mailbox credentials are not set yet." };

  const started = Date.now();
  const stop = AbortSignal.timeout(TIME_LIMIT_MS);
  try {
    const access = await token();
    if (!access) return { ok: false, reason: "Microsoft would not give us a token." };

    const url =
      "https://graph.microsoft.com/v1.0/users/" +
      encodeURIComponent(mailbox()) +
      "/mailFolders/inbox/messages?$top=" +
      BATCH +
      "&$orderby=receivedDateTime asc&$filter=isRead eq false" +
      "&$select=id,subject,receivedDateTime,bodyPreview,body,from,internetMessageHeaders";

    const response = await fetch(url, { headers: { authorization: "Bearer " + access }, signal: stop });
    if (!response.ok) return { ok: false, reason: "Microsoft answered " + response.status + "." };
    const json = (await response.json()) as { value?: GraphMessage[] };

    const mail: InboundMail[] = (json.value ?? []).map((m) => ({
      providerId: m.id,
      from: m.from?.emailAddress?.address ?? "",
      fromName: m.from?.emailAddress?.name ?? "",
      receivedAt: m.receivedDateTime ? Date.parse(m.receivedDateTime) : Date.now(),
      subject: m.subject ?? "",
      body: (m.body?.content ?? m.bodyPreview ?? "").slice(0, 20_000),
      inReplyTo:
        m.internetMessageHeaders?.find((h) => h.name.toLowerCase() === "in-reply-to")?.value ?? null,
    }));

    return { ok: true, mail, mailbox: mailbox(), ms: Date.now() - started };
  } catch (e) {
    const timedOut = (e as Error)?.name === "TimeoutError";
    return { ok: false, reason: timedOut ? "The mailbox did not answer in time." : "The mailbox could not be read." };
  }
}

/**
 * A pretend arrival, for building the screens before the mailbox exists. It is
 * refused unless development sign-in is on, so it can never invent mail on a
 * real desk.
 */
export function fakeArrival(over: Partial<InboundMail> = {}): InboundMail {
  const now = Date.now();
  return {
    providerId: "fake-" + Math.random().toString(36).slice(2, 10),
    from: "hr@sampleclient.test",
    fromName: "Sample client contact",
    receivedAt: now,
    subject: "Re: SAMPLE CLIENT A > Head of engineering > set 2",
    body: "Thank you, we will come back to you on these by Friday.",
    inReplyTo: null,
    ...over,
  };
}
