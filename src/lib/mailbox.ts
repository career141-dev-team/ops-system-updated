/**
 * The mailbox: one conversation, both directions (24, section 7).
 *
 * The owner's goal, said plainly on 5 November: the desk should work inside
 * this system, not in Outlook. Reading what arrived was already here, and so
 * was sending - but every message belonged to a step of a flow, and there was
 * no way to read a conversation, answer it, or write to somebody about
 * nothing in particular. So people went back to Outlook, and the record of
 * what was said went with them.
 *
 * This is the rule half of the fix: how our outbound messages and the mail
 * that comes back are put together into threads, what a reply is allowed to
 * be, and what a new message needs before it can exist.
 *
 * Nothing here sends anything, and nothing here touches a database. The one
 * way out is unchanged: a draft, a person approving it, and the sender
 * (`messages.ts` and `senders.ts`), with the outbound lock underneath.
 */

/* ── What a thread is made of ───────────────────────────────────── */

export interface ThreadItem {
  /** Which way it went. */
  direction: "in" | "out";
  id: string;
  at: number;
  /** The person at the other end, as an address. */
  who: string;
  whoName: string;
  subject: string;
  body: string;
  /** Out only: drafted, approved, sent, blocked - as the message says. */
  state: string | null;
  /** The provider's own id, where we have it. */
  providerId: string | null;
  inReplyTo: string | null;
  attachments: number;
  /** In only: the file names the email carried. */
  attachmentNames: string[];
}

export interface Thread {
  /** Stable, and safe in a URL. */
  key: string;
  subject: string;
  /** Everyone we have written to or heard from on it. */
  with: string[];
  withName: string;
  /** What it is filed against, when it is filed. */
  about: { type: string; id: string } | null;
  clientId: string | null;
  items: ThreadItem[];
  lastAt: number;
  /** The last thing that happened was theirs, so the answer is ours. */
  waitingOnUs: boolean;
  /** Something on it is waiting for a person to approve it. */
  hasDraft: boolean;
  /** Something on it tried to go and did not. That is not the same thing. */
  hasTrouble: boolean;
}

/* ── Putting a thread together ──────────────────────────────────── */

/**
 * A subject with the reply and forward markers taken off.
 *
 * "RE: Re: FW: Head of finance" and "Head of finance" are one conversation,
 * and a person who sees them apart stops trusting the screen.
 */
export function normalSubject(subject: string): string {
  let text = (subject ?? "").trim();
  // Repeatedly, because mail clients stack them: "Re: FW: Re: ...".
  for (;;) {
    const shorter = text.replace(/^\s*(re|fw|fwd|ref)\s*(\[\d+\])?\s*:\s*/i, "");
    if (shorter === text) break;
    text = shorter;
  }
  return text.replace(/\s+/g, " ").trim();
}

/** The subject a reply goes out with: one "Re:", never two. */
export function replySubject(subject: string): string {
  const bare = normalSubject(subject);
  return bare ? "Re: " + bare : "Re:";
}

/** An address, compared the way a person would: case and spacing do not count. */
export function sameAddress(a: string, b: string): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

/**
 * Which thread something belongs to.
 *
 * Three keys, in order of how sure we are:
 *
 *   1. **What it is filed against.** If both ends know they are about the same
 *      agreement, that is the conversation, whatever the subject says.
 *   2. **The subject and the other party**, for everything else. Two different
 *      clients writing "Invoice" are not one thread.
 *   3. **Its own id**, when there is nothing else - a one-item thread is
 *      better than a wrong one.
 */
export function threadKeyOf(item: {
  about: { type: string; id: string } | null;
  subject: string;
  who: string;
  id: string;
}): string {
  if (item.about) return "about:" + item.about.type + ":" + item.about.id;
  const subject = normalSubject(item.subject).toLowerCase();
  const who = (item.who ?? "").trim().toLowerCase();
  if (subject || who) return "talk:" + subject + "|" + who;
  return "one:" + item.id;
}

/** States that are waiting for a person, and states that went wrong. */
const waitsForApproval = (state: string | null) => state === "draft" || state === "approved" || state === "queued";
const inTrouble = (state: string | null) => state === "blocked" || state === "failed";

export interface InboundLike {
  id: string;
  channel: string;
  from: string;
  fromName: string;
  receivedAt: number;
  subject: string;
  body: string;
  providerId: string;
  inReplyTo: string | null;
  subjectType: string | null;
  subjectId: string | null;
  clientId: string | null;
  /** Our own mail read back from Sent Items: a thread item going out, not a reply. */
  direction?: "in" | "out";
  to?: string[];
  attachments?: string[];
}

export interface OutboundLike {
  id: string;
  channel: string;
  to: string[];
  subject: string;
  body: string;
  state: string;
  subjectType: string | null;
  subjectId: string | null;
  providerMessageId: string | null;
  inReplyToProviderId?: string | null;
  attachmentFileIds: string[];
  sentAt: number | null;
  createdAt: number;
}

/**
 * Every conversation, newest first.
 *
 * Both directions in one list. A reply that carries `In-Reply-To` is joined to
 * the message it answers even when somebody rewrote the subject, which is the
 * one join we can be certain about.
 */
export function buildThreads(inbound: InboundLike[], outbound: OutboundLike[], channel = "email"): Thread[] {
  const items: (ThreadItem & { key: string; about: Thread["about"]; clientId: string | null })[] = [];

  for (const mail of inbound) {
    if (mail.channel !== channel) continue;
    const about = mail.subjectType && mail.subjectId ? { type: mail.subjectType, id: mail.subjectId } : null;
    const out = mail.direction === "out";
    const who = out ? (mail.to?.[0] ?? "") : mail.from;
    items.push({
      direction: out ? "out" : "in",
      id: mail.id,
      at: mail.receivedAt,
      who,
      whoName: out ? who : mail.fromName || mail.from,
      subject: mail.subject,
      body: mail.body,
      state: out ? "sent" : null,
      providerId: mail.providerId,
      inReplyTo: mail.inReplyTo,
      attachments: mail.attachments?.length ?? 0,
      attachmentNames: mail.attachments ?? [],
      key: threadKeyOf({ about, subject: mail.subject, who, id: mail.id }),
      about,
      clientId: mail.clientId,
    });
  }

  for (const message of outbound) {
    if (message.channel !== channel) continue;
    const about = message.subjectType && message.subjectId ? { type: message.subjectType, id: message.subjectId } : null;
    const who = message.to[0] ?? "";
    items.push({
      direction: "out",
      id: message.id,
      at: message.sentAt ?? message.createdAt,
      who,
      whoName: who,
      subject: message.subject,
      body: message.body,
      state: message.state,
      providerId: message.providerMessageId,
      inReplyTo: message.inReplyToProviderId ?? null,
      attachments: message.attachmentFileIds.length,
      attachmentNames: [],
      key: threadKeyOf({ about, subject: message.subject, who, id: message.id }),
      about,
      clientId: null,
    });
  }

  // A reply we can be certain about pulls its answer into the same thread,
  // whatever either subject says.
  const keyByProviderId = new Map<string, string>();
  for (const item of items) if (item.providerId) keyByProviderId.set(item.providerId, item.key);
  for (const item of items) {
    const joined = item.inReplyTo ? keyByProviderId.get(item.inReplyTo) : undefined;
    if (joined) item.key = joined;
  }

  const threads = new Map<string, Thread>();
  for (const item of items.sort((a, b) => a.at - b.at)) {
    const existing = threads.get(item.key);
    const { key, about, clientId, ...rest } = item;
    if (!existing) {
      threads.set(key, {
        key,
        subject: normalSubject(rest.subject) || "(no subject)",
        with: rest.who ? [rest.who] : [],
        withName: rest.whoName,
        about,
        clientId,
        items: [rest],
        lastAt: rest.at,
        waitingOnUs: rest.direction === "in",
        hasDraft: rest.direction === "out" && waitsForApproval(rest.state),
        hasTrouble: rest.direction === "out" && inTrouble(rest.state),
      });
      continue;
    }
    existing.items.push(rest);
    existing.lastAt = Math.max(existing.lastAt, rest.at);
    existing.waitingOnUs = rest.direction === "in";
    if (rest.direction === "out" && waitsForApproval(rest.state)) existing.hasDraft = true;
    if (rest.direction === "out" && inTrouble(rest.state)) existing.hasTrouble = true;
    if (rest.who && !existing.with.some((address) => sameAddress(address, rest.who))) existing.with.push(rest.who);
    if (!existing.about && about) existing.about = about;
    if (!existing.clientId && clientId) existing.clientId = clientId;
    if (rest.direction === "in") existing.withName = rest.whoName;
  }

  return [...threads.values()].sort((a, b) => b.lastAt - a.lastAt);
}

/** Where a reply goes: whoever wrote last, or whoever we wrote to. */
export function replyTo(thread: Thread): string[] {
  const lastIn = [...thread.items].reverse().find((item) => item.direction === "in");
  if (lastIn?.who) return [lastIn.who];
  return thread.with.slice(0, 1);
}

/** One line about a thread, for the list. */
export function threadInWords(thread: Thread, now: number): string {
  const last = thread.items[thread.items.length - 1];
  const days = Math.floor((now - thread.lastAt) / 86_400_000);
  const when = days <= 0 ? "today" : days === 1 ? "yesterday" : days + " days ago";
  if (thread.hasDraft) return "A draft is waiting for you to approve it.";
  if (thread.hasTrouble) {
    return "The last thing we wrote never went: it is " + (last?.state ?? "stuck") + ". Open it to see why.";
  }
  if (thread.waitingOnUs) return "They wrote " + when + ". Nobody has answered.";
  return "We wrote " + when + ".";
}

/* ── What a reply and a new message need ────────────────────────── */

/**
 * Why a reply cannot be drafted yet.
 *
 * Deliberately only two checks: somewhere to send it, and something to say.
 * Everything else - approval, the do-not-contact list, the daily cap, test
 * mode, the outbound lock - is already decided at the one door, and repeating
 * it here would mean two sets of rules to keep in step.
 */
export function problemWithReply(to: string[], body: string): string | null {
  if (to.filter((address) => address.includes("@")).length === 0) {
    return "There is no address to reply to. Write a new message instead, and say who it goes to.";
  }
  if (body.trim().length < 2) return "Write something first.";
  return null;
}

/** Why a new message cannot be drafted yet. */
export function problemWithCompose(to: string[], subject: string, body: string): string | null {
  const real = to.filter((address) => address.includes("@") && address.length <= 254);
  if (real.length === 0) return "Say who it goes to: one address, or several separated by commas.";
  if (real.length > 10) return "That is more than ten addresses. Send it to the people who need it.";
  if (subject.trim().length < 2) return "Give it a subject: it is what the reader sees first, and how a reply finds its way back.";
  if (body.trim().length < 2) return "Write something first.";
  return null;
}

/** Addresses as a person types them: commas, semicolons or spaces. */
export function addressesFrom(text: string): string[] {
  return (text ?? "")
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.includes("@"));
}
