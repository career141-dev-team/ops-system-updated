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
  /**
   * "out" is our own mail read back from Sent Items (16 Nov): it is filed into
   * its thread for reading and never counts as a client answering.
   */
  direction?: "in" | "out";
  /** Out only: who it went to. */
  to?: string[];
  /** File names, when the message had any (inline pictures left out). */
  attachments?: string[];
}

/**
 * How far a mailbox was read: the newest receivedDateTime and the ids of the
 * messages seen at exactly that second (16 Nov). Graph times have one-second
 * resolution, so "after this time" can skip a message that shares the second
 * with the last one read; "from this time, minus the ids already seen" cannot.
 */
export interface MailCursor {
  at: number;
  ids: string[];
}
/** More than this at one second is not kept; the pass would re-read the surplus. */
export const MAX_CURSOR_IDS = 100;

export type ReadResult =
  | {
      ok: true;
      mail: InboundMail[];
      mailbox: string;
      /** Newsletters and the like, left out on purpose. */
      ignored: number;
      ms: number;
      /**
       * How far the page reached before anything was left out, and whether it
       * was a full page (9 Nov). The reader drops our own and machine mail
       * after fetching, so a page of internal mail looks empty; whoever pages
       * through a box must step by this, not by what was kept.
       */
      reachedAt: number;
      pageFull: boolean;
      /** Graph's own link to the next page, followed instead of asking again by time. */
      next: string | null;
      /** Ids of what the page held at `reachedAt`, kept before anything was left out. */
      tail: string[];
    }
  | { ok: false; mailbox: string; reason: string };

/** How many to take in one pass, and how long the whole pass may take. */
export const BATCH = 25;
export const TIME_LIMIT_MS = 15_000;
/** Full pages with nothing to keep that one pass reads past; the rest waits for the next pass. */
export const MAX_EMPTY_PAGES = 3;

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
  toRecipients?: { emailAddress?: { address?: string } }[];
  hasAttachments?: boolean;
};

/** Where to read: everything but Sent Items (the default), or Sent Items alone. */
export type Folder = "all" | "sent";

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
export async function readOneMailbox(
  address: string,
  since: number,
  timeLimitMs = TIME_LIMIT_MS,
  opts: { folder?: Folder; next?: string | null; seen?: string[] } = {},
): Promise<ReadResult> {
  const sent = opts.folder === "sent";
  const seen = new Set(opts.seen ?? []);
  if (!readerEnabled()) return { ok: false, mailbox: address, reason: "Reading the mailboxes is switched off." };
  if (!graphReady()) return { ok: false, mailbox: address, reason: "The mailbox credentials are not set yet." };

  const started = Date.now();
  // The clock keeps its 15 seconds (the backend's six-action rule); a month's
  // import asks for longer, because a page of full emails is heavy (9 Nov).
  const stop = AbortSignal.timeout(timeLimitMs);
  try {
    const access = await token();
    if (!access) return { ok: false, mailbox: address, reason: "Microsoft would not give us a token." };

    const url =
      opts.next ||
      "https://graph.microsoft.com/v1.0/users/" +
      encodeURIComponent(address) +
      (sent ? "/mailFolders/sentitems" : "") +
      "/messages?$top=" +
      BATCH +
      "&$orderby=receivedDateTime asc&$filter=receivedDateTime ge " +
      new Date(since).toISOString() +
      "&$select=id,subject,receivedDateTime,bodyPreview,body,from,toRecipients,hasAttachments,internetMessageHeaders";

    const response = await fetch(url, { headers: { authorization: "Bearer " + access }, signal: stop });
    if (!response.ok) {
      // 404 here usually means the app has not been allowed to read this one
      // mailbox, which is worth saying plainly rather than "failed".
      const why =
        response.status === 404
          ? "we are not allowed to read it, or it does not exist"
          : response.status === 429
            ? "Microsoft asked us to slow down (429)"
            : "Microsoft answered " + response.status;
      return { ok: false, mailbox: address, reason: address + ": " + why + "." };
    }
    const json = (await response.json()) as { value?: GraphMessage[]; "@odata.nextLink"?: string };
    const page = json.value ?? [];
    const timeOf = (m: GraphMessage) => (m.receivedDateTime ? Date.parse(m.receivedDateTime) : 0);
    const reachedAt = page.reduce((n, m) => Math.max(n, timeOf(m)), since);
    // Same second as where we started: the ids already seen there still count.
    const tail = [...new Set([...(reachedAt === since ? [...seen] : []), ...page.filter((m) => timeOf(m) === reachedAt).map((m) => m.id)])];

    // Our own people first, then anything no person sent (6 Nov). The second
    // one is counted rather than silently dropped: the screen says how many
    // and why, because quietly losing a client's email would be far worse
    // than showing a newsletter.
    let ignored = 0;
    const fresh = page.filter((m) => !seen.has(m.id));
    const mail: InboundMail[] = fresh
      // Sent Items is all ours by definition: it is kept, as "out".
      .filter((m) => sent || !isOurs(m.from?.emailAddress?.address ?? "", ourDomains()))
      .filter((m) => {
        if (sent) return true;
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
        ...(sent
          ? { direction: "out" as const, to: (m.toRecipients ?? []).map((r) => r.emailAddress?.address ?? "").filter(Boolean) }
          : {}),
      }));

    // Names only for messages that have files, and only for the ones we keep.
    for (const item of mail) {
      if (!page.find((m) => m.id === item.providerId)?.hasAttachments) continue;
      item.attachments = await attachmentNames(address, item.providerId, access, stop);
    }

    return { ok: true, mail, mailbox: address, ignored, ms: Date.now() - started, reachedAt,
      pageFull: page.length >= BATCH,
      next: json["@odata.nextLink"] ?? null,
      tail: tail.slice(0, MAX_CURSOR_IDS),
    };
  } catch (e) {
    const timedOut = (e as Error)?.name === "TimeoutError";
    return {
      ok: false,
      mailbox: address,
      // Say why (9 Nov): "could not be read" hid seven different failures.
      reason: address + (timedOut ? " did not answer in time." : " could not be read: " + String((e as Error)?.message ?? e).slice(0, 160)),
    };
  }
}

/** The file names on one message. A failure here costs the names, never the email. */
async function attachmentNames(address: string, id: string, access: string, signal: AbortSignal): Promise<string[]> {
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(address) + "/messages/" + encodeURIComponent(id) + "/attachments?$select=name,isInline",
      { headers: { authorization: "Bearer " + access }, signal },
    );
    if (!response.ok) return [];
    const json = (await response.json()) as { value?: { name?: string; isInline?: boolean }[] };
    return (json.value ?? []).filter((a) => a.name && !a.isInline).map((a) => String(a.name).slice(0, 200));
  } catch {
    return [];
  }
}

/**
 * Every named mailbox, one after another. One that cannot be read does not
 * stop the others: its reason is carried back so the screen can show which
 * box is unhappy and which are fine.
 */
export async function readAllMailboxes(
  since: Record<string, MailCursor | number> = {},
): Promise<{ mail: InboundMail[]; problems: string[]; read: string[]; ignored: number; reached: Record<string, MailCursor> }> {
  const mail: InboundMail[] = [];
  const problems: string[] = [];
  const read: string[] = [];
  const reached: Record<string, MailCursor> = {};
  let ignored = 0;
  const list = mailboxes();
  if (!list.length) return { mail, problems: ["No mailbox is named yet (OPS_MAILBOXES)."], read, ignored, reached };

  // Each box twice: what came in, and Sent Items (16 Nov). Sent has its own
  // cursor, under the box's address plus "#sent".
  for (const address of list) {
    const before = problems.length;
    for (const folder of ["all", "sent"] as const) {
      // One reason per box: if the inbox could not be read, Sent Items cannot either.
      if (folder === "sent" && problems.length > before) break;
      const key = folder === "sent" ? address + SENT : address;
      const start = since[key];
      const cursor: MailCursor = typeof start === "number" ? { at: start, ids: [] } : (start ?? { at: defaultSince(), ids: [] });
      let next: string | null = null;
      let at = cursor.at;
      let ids = cursor.ids;
      // A full page that kept nothing (our own and machine mail) is followed to
      // the next one in the same pass, a few at most, so a run of it cannot hide
      // a client's reply for hours. A page that kept something stops here and
      // the rest waits for the next pass. Pages are followed by Graph's own
      // nextLink, not by asking again "after this time", which skipped whatever
      // shared the last second.
      for (let page = 1; page <= MAX_EMPTY_PAGES + 1; page++) {
        const result: ReadResult = await readOneMailbox(address, at, TIME_LIMIT_MS, { folder, next, seen: ids });
        if (!result.ok) {
          problems.push(result.reason);
          break;
        }
        mail.push(...result.mail);
        ignored += result.ignored;
        if (page === 1 && folder === "all") read.push(address);
        at = result.reachedAt;
        ids = result.tail;
        reached[key] = { at, ids };
        next = result.next;
        if (!next || !result.pageFull || result.mail.length > 0) break;
      }
    }
  }
  return { mail, problems, read, ignored, reached };
}

/** Suffix on a box's address for the cursor of its Sent Items. */
export const SENT = "#sent";

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

/* ── The Scoop mailbox (23 Nov, the ops team's feedback) ─────────────
 *
 * A Scoop is fifty or sixty CVs in one email from one of our own people, which the ordinary reader drops on
 * purpose (our own mail is not a client replying). So this reads one named mailbox for mail from the people
 * named as Scoop senders, and takes the files off it. It is a source behind a small interface, so the pass that
 * uses it is tested with a fake mailbox and never needs a Microsoft key to be checked.
 */

export interface ScoopMessage {
  id: string;
  at: number;
  from: string;
  subject: string;
}
export interface ScoopAttachment {
  id: string;
  name: string;
  size: number;
}
export interface ScoopSource {
  /** Messages with files that arrived at or after `since`, oldest first, from the Scoop senders only. */
  messages(since: number): Promise<{ ok: true; messages: ScoopMessage[] } | { ok: false; reason: string }>;
  attachments(messageId: string): Promise<ScoopAttachment[]>;
  bytes(messageId: string, attachmentId: string): Promise<Uint8Array | null>;
}

/** Why the Scoop mailbox cannot be read, or null when it can. Microsoft keys, the mail switch, a mailbox, senders. */
export function scoopProblem(mailbox: string, senders: string[]): string | null {
  if (!readerEnabled()) return "Mail reading is off (OPS_MAIL_READ), so no Scoop is read from email.";
  if (!graphReady()) return "Microsoft is not set up here, so no Scoop is read from email.";
  if (!mailbox.trim()) return "No Scoop mailbox is named yet (setting scoop.mailbox or OPS_SCOOP_MAILBOX).";
  if (!senders.length) return "Nobody is named as a Scoop sender yet (setting scoop.senders or OPS_SCOOP_SENDERS).";
  return null;
}

const GRAPH = "https://graph.microsoft.com/v1.0/users/";

export function graphScoopSource(address: string, senders: string[], isSender: (from: string, senders: string[]) => boolean): ScoopSource {
  let cached: string | null = null;
  const access = async () => (cached ??= await token());
  const get = async (url: string) => {
    const t = await access();
    if (!t) return null;
    return fetch(url, { headers: { authorization: "Bearer " + t }, signal: AbortSignal.timeout(20_000) });
  };
  return {
    async messages(since) {
      try {
        const filter = "receivedDateTime ge " + new Date(since).toISOString() + " and hasAttachments eq true";
        const url = GRAPH + encodeURIComponent(address) + "/messages?$filter=" + encodeURIComponent(filter) + "&$orderby=" + encodeURIComponent("receivedDateTime asc") + "&$select=id,subject,receivedDateTime,from&$top=25";
        const r = await get(url);
        if (!r) return { ok: false, reason: "Microsoft did not give a token." };
        if (!r.ok) return { ok: false, reason: address + " could not be read: " + r.status };
        const json = (await r.json()) as { value?: GraphMessage[] };
        const messages = (json.value ?? [])
          .map((m) => ({ id: m.id, at: Date.parse(m.receivedDateTime ?? ""), from: (m.from?.emailAddress?.address ?? "").toLowerCase(), subject: m.subject ?? "" }))
          .filter((m) => Number.isFinite(m.at) && isSender(m.from, senders));
        return { ok: true, messages };
      } catch (e) {
        return { ok: false, reason: address + " could not be read: " + String((e as Error)?.message ?? e).slice(0, 120) };
      }
    },
    async attachments(messageId) {
      try {
        const r = await get(GRAPH + encodeURIComponent(address) + "/messages/" + encodeURIComponent(messageId) + "/attachments?$select=id,name,size,isInline,contentType");
        if (!r?.ok) return [];
        const json = (await r.json()) as { value?: { id: string; name?: string; size?: number; isInline?: boolean }[] };
        return (json.value ?? []).filter((a) => a.name && !a.isInline).map((a) => ({ id: a.id, name: String(a.name).slice(0, 200), size: a.size ?? 0 }));
      } catch {
        return [];
      }
    },
    async bytes(messageId, attachmentId) {
      try {
        const r = await get(GRAPH + encodeURIComponent(address) + "/messages/" + encodeURIComponent(messageId) + "/attachments/" + encodeURIComponent(attachmentId) + "/$value");
        return r?.ok ? new Uint8Array(await r.arrayBuffer()) : null;
      } catch {
        return null;
      }
    },
  };
}
