/**
 * A lead from the website form (15, Phase 2 step 6; owner's decision 2).
 *
 * Nobody types this one in: the website posts it, so there is no person at the
 * screen to correct a field or notice that it is rubbish. Everything that
 * arrives therefore gets checked here first, and what cannot be used is
 * refused with a reason the website can log rather than written down as a
 * lead nobody can answer.
 *
 * Two things the form must survive: somebody pressing Send twice, and the
 * bots that fill in every field on every form on the internet.
 *
 * Nothing here touches a database or sends anything.
 */

/** What we accept, whatever the form calls its fields. */
export interface WebLeadIn {
  company?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  industry?: unknown;
  website?: unknown;
  notes?: unknown;
  /** A field no person can see. Filled in means a bot filled it in. */
  honeypot?: unknown;
}

export interface WebLead {
  company: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  industry: string;
  website: string;
  notes: string;
}

/** The longest anything is kept. A form field with a novel in it is not a lead. */
const LONGEST = 2000;

function text(value: unknown, limit = 200): string {
  if (typeof value !== "string") return "";
  // Line breaks in a company name are a paste accident; in the notes they are
  // the message, so only the length is held down.
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

/** The arriving form, tidied into the shape a lead is written in. */
export function readWebLead(body: WebLeadIn): WebLead {
  return {
    company: text(body.company, 200),
    contactName: text(body.contactName, 120),
    contactEmail: text(body.contactEmail, 160).toLowerCase(),
    contactPhone: text(body.contactPhone, 40),
    industry: text(body.industry, 120),
    website: text(body.website, 200),
    notes: typeof body.notes === "string" ? body.notes.trim().slice(0, LONGEST) : "",
  };
}

/**
 * Whether this looks like a bot rather than a company.
 *
 * Kept deliberately dull: a hidden field that a person cannot see and so
 * cannot fill in, and a link farm in the message. Anything cleverer than this
 * starts refusing real clients, which costs far more than reading a few
 * rubbish leads.
 */
export function looksLikeABot(body: WebLeadIn, lead: WebLead): string | null {
  if (text(body.honeypot, 50)) return "The hidden field was filled in.";
  const links = (lead.notes.match(/https?:\/\//g) ?? []).length;
  if (links >= 5) return "The message is a list of links.";
  return null;
}

/** Why this cannot be written down as a lead, in words the website can log. */
export function problemWithWebLead(lead: WebLead): string | null {
  if (!lead.company) return "The company's name is missing.";
  if (lead.company.length < 2) return "The company's name is too short to be one.";
  if (!lead.contactEmail && !lead.contactPhone) {
    return "Neither an email address nor a phone number came with it, so nobody could reply.";
  }
  if (lead.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.contactEmail)) {
    return "That email address does not look like one.";
  }
  return null;
}

/**
 * The same form sent twice.
 *
 * People double-click Send, and a form that times out gets resubmitted. Two
 * leads for one enquiry means two owners ringing the same company, so a lead
 * with the same company and the same way of reaching them, inside the window,
 * is the one that already arrived.
 */
export const SAME_AGAIN_WITHIN_MS = 10 * 60 * 1000;

export function alreadyArrived<T extends { nameKey: string; contactEmail: string; contactPhone: string; source: string; createdAt: number }>(
  leads: T[],
  lead: { nameKey: string; contactEmail: string; contactPhone: string },
  now: number,
): T | null {
  return (
    leads.find(
      (l) =>
        l.source === "website" &&
        l.nameKey === lead.nameKey &&
        now - l.createdAt <= SAME_AGAIN_WITHIN_MS &&
        ((lead.contactEmail && l.contactEmail.toLowerCase() === lead.contactEmail) ||
          (lead.contactPhone && l.contactPhone === lead.contactPhone)),
    ) ?? null
  );
}

/**
 * Whose lead it is.
 *
 * One ops person owns each client, and a lead that arrives at four in the
 * morning still needs a name on it. The one holding the fewest leads takes it,
 * which spreads them without anybody deciding; the ops lead can move it
 * afterwards like any other.
 */
export function whoTakesIt<T extends { id: string; role: string; active: boolean }>(
  members: T[],
  leads: { ownerId: string }[],
): T | null {
  const owners = members.filter((m) => m.active && m.role === "ops_owner");
  if (!owners.length) return members.find((m) => m.active && m.role === "ops_lead") ?? null;
  const count = (id: string) => leads.filter((l) => l.ownerId === id).length;
  return [...owners].sort((a, b) => count(a.id) - count(b.id) || a.id.localeCompare(b.id))[0];
}

/** The key the website must send. With none set, nobody may post at all. */
export function keyAccepted(given: string | null): boolean {
  const want = (process.env.OPS_WEB_LEAD_KEY ?? "").trim();
  if (!want) return false;
  return given !== null && given.trim() === want;
}
