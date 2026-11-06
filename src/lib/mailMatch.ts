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
 *   3. **The house subject**, "CLIENT > ROLE > SET n". This is the desk's own
 *      form, written by hand in Outlook for years (c719), and the TA System
 *      already reads it. It is kept alongside the reference rather than
 *      instead of it: the reference only ever appears on mail the system sent,
 *      and most set mail is still typed by a person. It must name a set number
 *      and lead to exactly one thing we know about, or it does not count.
 *   4. **The sender's address**, matched against a client's known contacts.
 *      That tells us the client but not which of their things, so it is filed
 *      to the client and left for a person to place.
 *   5. **Nothing.** It waits in "needs filing". Nobody is guessed at.
 *
 * The TA System learned this the hard way with candidate mail: a reply matched
 * by subject text alone went to the wrong opening.
 */

export type MatchMethod = "reference" | "thread" | "house" | "domain" | "none";

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

/**
 * What a house subject says. Both forms the desk uses are read:
 *
 *   "LANKA HOSPITAL > PA TO CFO > SET 02"        the hand-written form
 *   "SET 2 - LANKA HOSPITAL - PA TO CFO - 5 CVs" the form the TA app sends
 *
 * Reply prefixes, a "REVISED -" marker and our own reference are taken off
 * first, because a reply carries all three.
 */
export interface HouseSubject {
  client: string;
  position: string;
  setNumber: number;
}

export function stripReplyPrefixes(subject: string): string {
  let out = (subject ?? "").trim();
  for (;;) {
    const next = out
      .replace(/^\s*(?:re|fw|fwd|aw|antwort)\s*:\s*/i, "")
      .replace(/^\s*revised\s*[-–—:]\s*/i, "")
      .trim();
    if (next === out) return out;
    out = next;
  }
}

/** For comparing names: case, spacing and punctuation carry no meaning here. */
export function sameName(a: string, b: string): boolean {
  const flat = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]/g, "");
  const left = flat(a);
  return left.length >= 2 && left === flat(b);
}

const SET_PART = /^set\s*0*(\d{1,3})$/i;

export function houseSubject(subject: string): HouseSubject | null {
  const clean = stripReplyPrefixes((subject ?? "").replace(/\[C141-[^\]]*\]/gi, " ")).trim();
  if (!clean) return null;

  // Either separator, and never both: "A > B > SET 1" or "SET 1 - A - B - 3 CVs".
  const parts = (clean.includes(">") ? clean.split(">") : clean.split(/\s[-–—]\s/))
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;

  let setNumber: number | null = null;
  const rest: string[] = [];
  for (const part of parts) {
    const found = SET_PART.exec(part);
    if (found && setNumber === null) setNumber = Number(found[1]);
    else if (!/^\d+\s*cvs?$/i.test(part)) rest.push(part);
  }
  // No set number is not a house subject. A client writing "your shortlist"
  // must not be matched by two words that happen to look like a name.
  if (setNumber === null || rest.length < 2) return null;

  const [client, position] = rest;
  if (client.length < 2 || position.length < 2) return null;
  return { client, position, setNumber };
}

export function matchInbound(
  mail: InboundLike,
  known: {
    threads: KnownThread[];
    contacts: KnownContact[];
    /** What we have written about, with the subject line we used for it. */
    subjects: { subjectType: string; subjectId: string; subject?: string }[];
  },
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

  const house = houseSubject(mail.subject);
  if (house) {
    const hits = known.subjects.filter((k) => {
      const theirs = houseSubject(k.subject ?? "");
      return (
        theirs !== null &&
        theirs.setNumber === house.setNumber &&
        sameName(theirs.client, house.client) &&
        sameName(theirs.position, house.position)
      );
    });
    if (hits.length === 1) {
      return {
        method: "house",
        subjectType: hits[0].subjectType,
        subjectId: hits[0].subjectId,
        clientId: null,
        note: 'The subject names it: "' + house.client + " > " + house.position + " > set " + house.setNumber + '".',
      };
    }
    if (hits.length > 1) {
      // Two things we know about read the same. Picking one is the mistake the
      // TA System made with candidate mail matched on subject text alone.
      return {
        method: "none",
        subjectType: null,
        subjectId: null,
        clientId: null,
        note: "The subject matches more than one of our sets. Please file it.",
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
  return match.method === "reference" || match.method === "thread" || match.method === "house";
}

/**
 * Mail no person sent, and none expects an answer to (6 Nov).
 *
 * Found the first time the reader was pointed at the real boxes: 34 messages
 * came in, and 14 of them were LinkedIn newsletters, AWS billing, a GITEX
 * mailing and cold sales mail. Most of that was in one ops person's own box,
 * which is exactly the box card c719 says to read, because that is where a
 * client's reply lands. Read it whole and the desk's inbox is unusable on the
 * first morning, and somebody goes back to Outlook - the one outcome this
 * system exists to prevent.
 *
 * The test is the mail's own headers rather than a list of senders to
 * remember. Anything bulk enough to carry an unsubscribe link, or marked as
 * machine-sent, is machine-sent whoever it is from, and a list of newsletter
 * domains is a list somebody has to keep.
 *
 * It returns the reason rather than a flag, because the screen says how many
 * were left out and why. Quietly dropping a client's email would be far worse
 * than showing a newsletter.
 */
const NEVER_REPLIES = [
  "noreply",
  "no-reply",
  "no_reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "postmaster",
  "bounce",
  "bounces",
];

export function machineMail(mail: {
  from: string;
  headers?: { name: string; value: string }[];
}): string | null {
  const from = (mail.from ?? "").trim().toLowerCase();
  const local = from.split("@")[0] ?? "";
  // The word on its own, or with a +tag, and nothing looser: a test written
  // from the real boxes caught "postmaster.general@" being thrown away as
  // machine mail when it is a person (6 Nov). Anything beyond an exact match
  // is guessing, and the headers below catch the rest without guessing.
  // The word on its own, or followed by + or - and a tag:
  // "no-reply-_eVZfV_J5kKKwglOL5ixfQ@" is three of the real messages, and
  // "+tag" is the standard way of sub-addressing.
  //
  // A dot is deliberately **not** a separator here. It is how people write
  // their own names, and the test caught this rule twice: first swallowing
  // "postmaster.general@", a person, and then doing it again when the dot was
  // let back in. Showing a newsletter costs a glance; dropping a client's
  // email costs the client.
  if (NEVER_REPLIES.some((word) => local === word || /^[+-]/.test(local.slice(word.length)) && local.startsWith(word))) {
    return "sent from " + from + ", which nobody can reply to";
  }

  const header = (name: string) =>
    (mail.headers ?? []).find((h) => (h.name ?? "").toLowerCase() === name)?.value?.trim().toLowerCase() ?? "";

  // One unsubscribe link and it was sent to a list, not to us.
  if (header("list-unsubscribe")) return "a mailing with an unsubscribe link";

  const precedence = header("precedence");
  if (["bulk", "list", "junk"].includes(precedence)) return "marked as " + precedence + " mail";

  // Out-of-office and other automatic replies say so in the standard way.
  const auto = header("auto-submitted");
  if (auto && auto !== "no") return "an automatic reply";
  if (header("x-auto-response-suppress")) return "an automatic message";

  return null;
}
