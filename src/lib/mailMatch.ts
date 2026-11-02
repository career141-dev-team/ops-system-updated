/**
 * Which client, and which thing, an incoming email belongs to (15, Phase 1
 * steps 17 and 19).
 *
 * This is the piece the whole client side leans on. A reply that is filed
 * against the right set stops that set's chase, lands in the right person's
 * inbox and is read against the right candidates. A reply that is filed wrongly
 * is worse than one that is not filed at all, so the rules go from certain to
 * merely likely, and stop rather than guess:
 *
 *   1. **Our own reference** in the subject. We put it there when we sent, so a
 *      reply that carries it is certain.
 *   2. **The thread**, through the mail headers. Also ours, also certain.
 *   3. **The sender's address**, matched against a client's known contacts.
 *      That tells us the client but not which of their things, so it is filed
 *      to the client and left for a person to place.
 *   4. **Nothing.** It waits in "needs filing". Nobody is guessed at.
 *
 * The TA System learned this the hard way with candidate mail: a reply matched
 * by subject text alone went to the wrong opening.
 */

export type MatchMethod = "reference" | "thread" | "domain" | "none";

export interface InboundLike {
  from: string;
  subject: string;
  /** The `In-Reply-To` or `References` header, when the mail client sent one. */
  inReplyTo?: string | null;
}

export interface KnownThread {
  /** The id of the message we sent, as the mail server gave it back to us. */
  providerMessageId: string;
  subjectType: string;
  subjectId: string;
}

export interface KnownContact {
  email: string;
  clientId: string;
}

export interface Match {
  method: MatchMethod;
  subjectType: string | null;
  subjectId: string | null;
  clientId: string | null;
  /** Said in plain words on the screen, so a person can see why. */
  note: string;
}

/**
 * The tail of an id, as it appears inside a reference.
 *
 * Ids are not all the same shape: the sample desk uses `cs_1`, the backend
 * uses a long random string. Punctuation is dropped so the code stays easy to
 * read in a subject line and survives a mail client re-wrapping it.
 */
export function tailOf(subjectId: string): string {
  return subjectId.replace(/[^A-Za-z0-9]/g, "").slice(-8).toLowerCase();
}

/** The code we put in a subject so a reply can find its way home. */
export function referenceFor(subjectType: string, subjectId: string): string {
  return "[C141-" + subjectType.toUpperCase() + "-" + tailOf(subjectId).toUpperCase() + "]";
}

/** The reference inside a subject line, if it carries one. */
export function referenceIn(subject: string): { subjectType: string; tail: string } | null {
  const found = /\[C141-([A-Z]+)-([A-Za-z0-9]{1,16})\]/.exec(subject);
  if (!found) return null;
  return { subjectType: found[1].toLowerCase(), tail: found[2].toLowerCase() };
}

/** Everything after the @, lower-cased. Empty when the address is nonsense. */
export function domainOf(address: string): string {
  const at = address.trim().toLowerCase().lastIndexOf("@");
  return at === -1 ? "" : address.trim().toLowerCase().slice(at + 1);
}

/** Addresses of ours never count as a client replying to us. */
export function isOurs(address: string, ourDomains: string[]): boolean {
  const domain = domainOf(address);
  return ourDomains.some((d) => d.trim().toLowerCase() === domain);
}

export function matchInbound(
  mail: InboundLike,
  known: { threads: KnownThread[]; contacts: KnownContact[]; subjects: { subjectType: string; subjectId: string }[] },
): Match {
  const reference = referenceIn(mail.subject);
  if (reference) {
    const hit = known.subjects.find(
      (s) => s.subjectType.toLowerCase() === reference.subjectType && tailOf(s.subjectId) === reference.tail,
    );
    if (hit) {
      return {
        method: "reference",
        subjectType: hit.subjectType,
        subjectId: hit.subjectId,
        clientId: null,
        note: "Our reference was in the subject.",
      };
    }
    // The reference is ours but names something that no longer exists. That is
    // worth saying rather than quietly falling through to a weaker rule.
    return {
      method: "none",
      subjectType: null,
      subjectId: null,
      clientId: null,
      note: "The subject carries a reference we do not recognise. Please file it.",
    };
  }

  if (mail.inReplyTo) {
    const thread = known.threads.find((t) => t.providerMessageId === mail.inReplyTo);
    if (thread) {
      return {
        method: "thread",
        subjectType: thread.subjectType,
        subjectId: thread.subjectId,
        clientId: null,
        note: "It is a reply to a message we sent.",
      };
    }
  }

  const domain = domainOf(mail.from);
  if (domain) {
    const contacts = known.contacts.filter((c) => domainOf(c.email) === domain);
    const clients = [...new Set(contacts.map((c) => c.clientId))];
    if (clients.length === 1) {
      return {
        method: "domain",
        subjectType: null,
        subjectId: null,
        clientId: clients[0],
        note: "We know this sender's company, but not which of their positions. Please place it.",
      };
    }
    if (clients.length > 1) {
      // Two clients at one domain: a group, or a holding company. Guessing
      // between them is exactly the mistake worth avoiding.
      return {
        method: "none",
        subjectType: null,
        subjectId: null,
        clientId: null,
        note: "More than one client uses this email domain. Please file it.",
      };
    }
  }

  return {
    method: "none",
    subjectType: null,
    subjectId: null,
    clientId: null,
    note: "We do not recognise the sender. Please file it.",
  };
}

/** A reply we filed against something is a reply: the chasing for it stops. */
export function stopsChasing(match: Match): boolean {
  return match.method === "reference" || match.method === "thread";
}
