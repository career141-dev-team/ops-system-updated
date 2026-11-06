import "server-only";

/**
 * Reading the Ops mailbox (15, Phase 1 step 18).
 *
 * The mailboxes are Microsoft 365 — checked on 2 Nov: career141.com's mail
 * records point at Microsoft and the sender policy names their servers — so
 * this reads through Graph, exactly as the TA System reads linkedin@, cv@ and
 * job@.
 *
 * **Many mailboxes, not one** (owner, 2 Nov). The first design assumed a single
 * ops@ address that everyone would be asked to use. The desk does not work that
 * way and does not need to: the as-is flow shows the habit already exists, with
 * each person writing from their own Outlook and copying a shared box — the CV
 * set goes "CLIENT > ROLE > SET n" copying cv@, the interview invite goes from
 * interviews@ copying opsteam@, the weekly report from joborders@, and a website
 * lead from hello@. So nobody is asked to change anything. We read the boxes
 * they already use, plus each ops person's own, and every email we record
 * remembers which box it arrived in.
 *
 * Reading the sender's own box is the part that matters, and it is not optional.
 * A copied box only shows the message going out; the client's reply follows the
 * person who sent it. The TA System settled this already: it reads the signed-in
 * person's mailbox, the shortlist inbox and job@ together (src/app/actions.ts,
 * the reply reader), which is also why Microsoft already allows this app to read
 * staff mailboxes in this tenant.
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

import { isOurs, machineMail } from "./mailMatch";

export interface InboundMail {
  /** Which of our mailboxes it arrived in. */
  mailbox: string;
  providerId: string;
  from: string;
  fromName: string;
  receivedAt: number;
  subject: string;
  body: string;
  inReplyTo: string | null;
}

export type ReadResult =
  | { ok: true; mail: InboundMail[]; mailbox: string; /** Newsletters and the like, left out on purpose. */ ignored: number; ms: number }
  | { ok: false; mailbox: string; reason: string };

/** How many to take in one pass, and how long the whole pass may take. */
export const BATCH = 25;
export const TIME_LIMIT_MS = 15_000;

/**
 * The mailboxes we read, in order. Set as a comma-separated list, so a shared
 * box and a person's own box are the same kind of thing to this code.
 */
export function mailboxes(): string[] {
  return (process.env.OPS_MAILBOXES ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

/**
 * Our own email domains. Mail from these is our own copy, never a client
 * replying to us.
 */
export function ourDomains(): string[] {
  return (process.env.OPS_OUR_DOMAINS ?? "career141.com")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

/**
 * How far back the very first read of a box goes. Bounded on purpose: a box
 * that has been in use for years holds thousands of old threads, and filing
 * history we were never part of is noise, not work. The TA System learned the
 * same lesson the other way round — its mailboxes read only from the moment a
 * lead switched them on.
 */
export const FIRST_READ_DAYS = 2;
export function defaultSince(now = Date.now()): number {
  return now - FIRST_READ_DAYS * 24 * 3_600_000;
}

/** For the screen's heading: what we read, in words. */
export function mailboxesInWords(): string {
  const list = mailboxes();
  if (!list.length) return "no mailbox is named yet";
  if (list.length === 1) return list[0];
  return list.length + " mailboxes: " + list.join(", ");
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
 * One mailbox's recent mail, oldest first so a burst is worked through in order
 * and none of it waits for ever.
 *
 * Three things here were wrong on the first try and are worth keeping written
 * down (2 Nov, found by reading this back rather than by an incident):
 *
 *   **Every folder, not the inbox.** `/messages` covers the whole mailbox. A
 *   person who has used a box for years has Outlook rules, and a reply filed
 *   into a client's folder was invisible while this read `/mailFolders/inbox`.
 *
 *   **Read or unread makes no difference.** This filtered `isRead eq false`,
 *   which is harmless for a shared box nobody opens and useless for a person's
 *   own inbox: they read their mail in Outlook within the minute, and we would
 *   never see it again.
 *
 *   **Our own mail is not a client replying.** Reading every folder means
 *   reading Sent Items, so anything from one of our own domains is dropped
 *   here. `isOurs` in mailMatch.ts says what counts as ours.
 *
 * Instead of read-or-unread, it asks for what arrived since a time we give it,
 * which is the newest thing we already recorded for that box. So a pass always
 * moves forward and nothing is read twice or skipped, however busy the box is.
 */
export async function readOneMailbox(address: string, since: number): Promise<ReadResult> {
  if (!readerEnabled()) return { ok: false, mailbox: address, reason: "Reading the mailboxes is switched off." };
  if (!graphReady()) return { ok: false, mailbox: address, reason: "The mailbox credentials are not set yet." };

  const started = Date.now();
  const stop = AbortSignal.timeout(TIME_LIMIT_MS);
  try {
    const access = await token();
    if (!access) return { ok: false, mailbox: address, reason: "Microsoft would not give us a token." };

    const url =
      "https://graph.microsoft.com/v1.0/users/" +
      encodeURIComponent(address) +
      "/messages?$top=" +
      BATCH +
      "&$orderby=receivedDateTime asc&$filter=receivedDateTime ge " +
      new Date(since).toISOString() +
      "&$select=id,subject,receivedDateTime,bodyPreview,body,from,internetMessageHeaders";

    const response = await fetch(url, { headers: { authorization: "Bearer " + access }, signal: stop });
    if (!response.ok) {
      // 404 here usually means the app has not been allowed to read this one
      // mailbox, which is worth saying plainly rather than "failed".
      const why = response.status === 404 ? "we are not allowed to read it, or it does not exist" : "Microsoft answered " + response.status;
      return { ok: false, mailbox: address, reason: address + ": " + why + "." };
    }
    const json = (await response.json()) as { value?: GraphMessage[] };

    // Our own people first, then anything no person sent (6 Nov). The second
    // one is counted rather than silently dropped: the screen says how many
    // and why, because quietly losing a client's email would be far worse
    // than showing a newsletter.
    let ignored = 0;
    const mail: InboundMail[] = (json.value ?? [])
      .filter((m) => !isOurs(m.from?.emailAddress?.address ?? "", ourDomains()))
      .filter((m) => {
        const why = machineMail({
          from: m.from?.emailAddress?.address ?? "",
          headers: m.internetMessageHeaders ?? [],
        });
        if (why) ignored += 1;
        return !why;
      })
      .map((m) => ({
      mailbox: address,
      providerId: m.id,
      from: m.from?.emailAddress?.address ?? "",
      fromName: m.from?.emailAddress?.name ?? "",
      receivedAt: m.receivedDateTime ? Date.parse(m.receivedDateTime) : Date.now(),
      subject: m.subject ?? "",
      body: (m.body?.content ?? m.bodyPreview ?? "").slice(0, 20_000),
      inReplyTo:
        m.internetMessageHeaders?.find((h) => h.name.toLowerCase() === "in-reply-to")?.value ?? null,
      }));

    return { ok: true, mail, mailbox: address, ignored, ms: Date.now() - started };
  } catch (e) {
    const timedOut = (e as Error)?.name === "TimeoutError";
    return {
      ok: false,
      mailbox: address,
      reason: address + (timedOut ? " did not answer in time." : " could not be read."),
    };
  }
}

/**
 * Every named mailbox, one after another. One that cannot be read does not
 * stop the others: its reason is carried back so the screen can show which
 * box is unhappy and which are fine.
 */
export async function readAllMailboxes(
  since: Record<string, number> = {},
): Promise<{ mail: InboundMail[]; problems: string[]; read: string[]; ignored: number }> {
  const mail: InboundMail[] = [];
  const problems: string[] = [];
  const read: string[] = [];
  let ignored = 0;
  const list = mailboxes();
  if (!list.length) return { mail, problems: ["No mailbox is named yet (OPS_MAILBOXES)."], read, ignored };

  for (const address of list) {
    const result = await readOneMailbox(address, since[address] ?? defaultSince());
    if (result.ok) {
      mail.push(...result.mail);
      ignored += result.ignored;
      read.push(address);
    } else {
      problems.push(result.reason);
    }
  }
  return { mail, problems, read, ignored };
}

/**
 * A pretend arrival, for building the screens before the mailbox exists. It is
 * refused unless development sign-in is on, so it can never invent mail on a
 * real desk.
 */
export function fakeArrival(over: Partial<InboundMail> = {}): InboundMail {
  const now = Date.now();
  return {
    mailbox: mailboxes()[0] ?? "a test mailbox",
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
