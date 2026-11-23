/**
 * A lead, from arriving to being routed (15, Phase 2 steps 2 to 5).
 *
 * This is the front door of the whole business: a company asks us to find
 * somebody. Four questions get asked of every one, in this order, and they are
 * the rules in this file:
 *
 *   1. Is this a company we already have? (A second client record is how the
 *      same company ends up with two owners and two agreements.)
 *   2. Is it banking or finance? (The owner's standing rule: declined for
 *      good, whatever the role, and never invited back.)
 *   3. Do they already have a signed agreement? (Then there is no intro call
 *      and no agreement to chase - straight to the requirement meeting.)
 *   4. Otherwise: an intro call.
 *
 * Nothing here touches a database, so every case is tested.
 */

/** Where a lead came from. The website one arrives on its own; the rest are typed. */
// director, linkedin and walk_in are the sources the New lead form offers (Figma 249:13655); the form used to send
// values this list did not hold, so a lead could not be saved from it at all.
export const LEAD_SOURCES = ["website", "whatsapp", "call", "email", "referral", "director", "linkedin", "walk_in", "other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const SOURCE_MEANINGS: Record<LeadSource, string> = {
  website: "The website form",
  whatsapp: "WhatsApp",
  call: "A phone call",
  email: "An email to one of us",
  referral: "Somebody we know passed them on",
  director: "The Director brought them in",
  linkedin: "We reached out on LinkedIn",
  walk_in: "They walked in",
  other: "Somewhere else",
};

export type LeadState =
  | "new"
  | "intro_call"
  | "waiting_agreement"
  | "requirement"
  | "handed_over"
  | "declined_industry"
  | "closed_silent"
  | "closed_other";

export const STATE_MEANINGS: Record<LeadState, string> = {
  new: "Just arrived, nobody has looked yet",
  intro_call: "An intro call is the next thing",
  waiting_agreement: "Waiting on the agreement",
  requirement: "Agreement done — the requirement meeting is next",
  handed_over: "The opening is made; the agreement and the requirement run side by side",
  declined_industry: "Declined: banking or finance",
  closed_silent: "Closed: they stopped answering",
  closed_other: "Closed for another reason",
};

/**
 * The same company name, in the one shape we compare on.
 *
 * Exactly what the TA System does to a client's name
 * (`convex/ta/backfill.ts: clientKey`), because a lead is matched against TA's
 * clients across the API — two different shapes would mean a company we
 * already have looking new.
 */
export function nameKey(name: string): string {
  return (name ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Banking and finance, flagged on the words in front of us.
 *
 * The owner's rule is that these are declined for good, so this proposes and a
 * person confirms; it never declines by itself. The words are the ones that
 * actually appear in Sri Lankan company names and in what a client writes
 * about themselves.
 */
const INDUSTRY_WORDS = [
  "bank",
  "banking",
  "finance",
  "financial",
  "leasing",
  "microfinance",
  "micro finance",
  "insurance",
  "assurance",
  "stockbroker",
  "stock broking",
  "securities",
  "asset management",
  "wealth management",
  "investment bank",
  "credit union",
  "money changer",
  "pawning",
];

/** Words that look like the list but are not that industry. */
const NOT_REALLY = ["blood bank", "food bank", "data bank", "bank of ideas", "riverbank", "bankside"];

export interface IndustryFlag {
  flagged: boolean;
  /** The word that caused it, so a person can judge the proposal. */
  because: string | null;
}

export function flagIndustry(text: {
  company: string;
  industry?: string;
  website?: string;
  /** Read no more: what they want hiring says nothing about their business. */
  notes?: string;
}): IndustryFlag {
  // The company's name and what they say they do - never what they are asking
  // for. A tile maker whose enquiry says "we need a finance manager" was
  // flagged as a finance company, and once the website form started posting
  // leads by itself that was going to happen to every finance vacancy
  // (3 Nov, found by walking it).
  const prose = [text.company, text.industry].filter(Boolean).join(" ").toLowerCase();
  // A web address has no spaces in it - "xleasing.lk", "lbfinance.lk" - so the
  // word is looked for inside it rather than as a word of its own.
  const web = (text.website ?? "").toLowerCase();
  for (const phrase of NOT_REALLY) {
    if (prose.includes(phrase)) return { flagged: false, because: null };
  }
  for (const word of INDUSTRY_WORDS) {
    // Whole words in prose: "urbanisation" is not a bank. An ending is allowed
    // ("financially", "bankers"), because that is the same industry.
    const inProse = new RegExp("(^|[^a-z])" + word.replace(/ /g, "[ -]?") + "[a-z]{0,3}([^a-z]|$)").test(prose);
    if (inProse || (web && web.includes(word.replace(/ /g, "")))) return { flagged: true, because: word };
  }
  return { flagged: false, because: null };
}

export interface NewLead {
  company: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  source: string;
}

/** Why this lead cannot be saved yet, or nothing when it can. */
export function problemWithNewLead(lead: NewLead): string | null {
  if (!lead.company.trim()) return "Write the company's name.";
  if (lead.company.trim().length < 2) return "That company name is too short to be one.";
  if (!(LEAD_SOURCES as readonly string[]).includes(lead.source)) return "Say where this lead came from.";
  const hasEmail = lead.contactEmail.trim().length > 0;
  const hasPhone = lead.contactPhone.trim().length > 0;
  // A lead nobody can answer is not a lead. One way to reach them is enough,
  // because a phone call often comes with no address and the website form
  // sometimes comes with no number.
  if (!hasEmail && !hasPhone) return "Give an email address or a phone number, so somebody can reply.";
  if (hasEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.contactEmail.trim())) {
    return "That email address does not look like one.";
  }
  return null;
}

/**
 * "Add a client" (23 Nov, the owner): a client is added by hand, with no enquiry or discovery step in front.
 * Same rules as a lead for the name and for one way to reach them; no source, since nobody enquired.
 */
export function problemWithNewClient(
  c: { company: string; contactEmail: string; contactPhone: string; billingEmail: string },
  sameNameExists: boolean,
): string | null {
  const reach = problemWithNewLead({ ...c, source: LEAD_SOURCES[0] } as never);
  if (reach) return reach;
  if (c.billingEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.billingEmail.trim())) {
    return "The billing email address does not look like one.";
  }
  // One company, one record, one owner.
  if (sameNameExists) return "We already have a client with that name. Find them in Clients instead of adding them twice.";
  return null;
}

export interface ClientLike {
  id: string;
  name: string;
  nameKey: string;
  esaSignedAt: number | null;
}

export interface DuplicateMatch {
  /** The same company, beyond doubt. */
  exact: ClientLike | null;
  /** Could be the same company. A person decides; we never link these alone. */
  near: ClientLike[];
}

/**
 * Is this company already ours?
 *
 * An exact key match is linked without asking. Anything else is only offered:
 * "Lanka Hospitals" and "Lanka Hospital Diagnostics" are two different
 * companies, and guessing wrong puts a lead on somebody else's client.
 */
export function duplicateMatch(company: string, clients: ClientLike[]): DuplicateMatch {
  const key = nameKey(company);
  if (!key) return { exact: null, near: [] };
  const exact = clients.find((c) => c.nameKey === key) ?? null;
  if (exact) return { exact, near: [] };

  const words = key.split(" ").filter((w) => w.length > 2);
  const near = clients.filter((c) => {
    if (c.nameKey === key) return false;
    if (c.nameKey.startsWith(key) || key.startsWith(c.nameKey)) return true;
    // Two of the same long words is enough to be worth a look.
    const theirs = c.nameKey.split(" ").filter((w) => w.length > 2);
    const shared = words.filter((w) => theirs.includes(w));
    return shared.length >= 2;
  });
  return { exact: null, near: near.slice(0, 5) };
}

export interface Routing {
  state: LeadState;
  /** What the screen says is happening, in the words a person would use. */
  because: string;
}

/**
 * What happens to this lead next (the four questions, in order).
 *
 * Industry comes before everything else that could start work: a banking lead
 * with a signed agreement from years ago is still declined.
 */
export function routeLead(input: {
  industryFlagged: boolean;
  industryConfirmed: boolean;
  existing: ClientLike | null;
}): Routing {
  if (input.industryFlagged && input.industryConfirmed) {
    return { state: "declined_industry", because: "Banking and finance are declined, whatever the role." };
  }
  if (input.existing?.esaSignedAt) {
    return {
      state: "requirement",
      because: "They are already a client with a signed agreement, so there is no intro call and no agreement to chase.",
    };
  }
  if (input.existing) {
    return {
      state: "waiting_agreement",
      because: "We have worked with them before, but there is no signed agreement on file.",
    };
  }
  return { state: "intro_call", because: "A new client: the intro call comes first." };
}

/**
 * A lead that has no intro call to do, and one that has no agreement to do (18 Nov).
 *
 * A Director's lead skips the call by design. A client we already had is linked at
 * the enquiry (routeLead sends it to "waiting_agreement", or to "requirement" when
 * an agreement is signed on file) and never books an intro call. A new client only
 * gets its TA id once countersigned, after a held call, so "linked, and no intro
 * meeting ever" is the existing client. One rule, used by the bar, the next-step
 * card, the page and the hand-over; it was written in three places before.
 */
export function existingClientOf(
  lead: { state: string; clientTaId: string | null; source?: string },
  meetings: { kind: string }[],
  esa: { state: string } | null,
): { skipsIntro: boolean; signedOnFile: boolean } {
  const existing =
    !!lead.clientTaId &&
    !meetings.some((m) => m.kind === "intro") &&
    ["requirement", "waiting_agreement", "handed_over"].includes(lead.state);
  return {
    skipsIntro: lead.source === "director" || existing,
    signedOnFile: existing && !esa && ["requirement", "handed_over"].includes(lead.state),
  };
}

/**
 * The one intro rule (22 Nov), exactly what handOverToTa accepts: any meeting held, or an
 * agreement that has gone out (a draft has not), or a lead that skips the intro. The lead page
 * and the checklist use this too, so the button shows exactly when the action would accept.
 */
export function introSatisfied(input: {
  meetings: { state: string }[];
  esa: { state: string } | null;
  skipsIntro: boolean;
}): boolean {
  const talked = input.meetings.some((m) => m.state === "held");
  const goneOut = !!input.esa && input.esa.state !== "draft";
  return talked || goneOut || input.skipsIntro;
}

/** The owner's rule: nothing closes without a reason written down first. */
export function problemWithClosing(state: LeadState, reason: string): string | null {
  const closing: LeadState[] = ["declined_industry", "closed_silent", "closed_other"];
  if (!closing.includes(state)) return null;
  if (reason.trim().length < 4) return "Write why this lead is closing. Nothing closes without a reason.";
  return null;
}

export type LeadSection = "new" | "agreement" | "opening" | "closed";

const AGREEMENT_OUT = ["draft", "sent", "chasing", "negotiating", "signed", "countersigned"];

/**
 * Which part of the Leads screen a lead belongs to (17 Nov).
 *
 * The count and each list used to be worked out separately, so a lead in a
 * state one list did not name (`handed_over`, or one whose agreement was
 * already countersigned) was counted and shown nowhere. One rule now decides,
 * every state lands somewhere, and an unknown one is treated as new rather
 * than dropped.
 */
export function leadSection(state: string, esaState: string | null): LeadSection {
  if (state.startsWith("closed") || state === "declined_industry") return "closed";
  if (state === "handed_over") return "opening";
  if (state === "waiting_agreement" || state === "requirement") return "agreement";
  if (esaState && AGREEMENT_OUT.includes(esaState)) return "agreement";
  return "new";
}

/** A lead that is declined for the industry is never invited back. */
export function neverInviteBack(state: LeadState): boolean {
  return state === "declined_industry";
}

/**
 * A lead for a company that is already our client ("Direct client", Figma 331:2976).
 *
 * The client was picked from our own list, so nothing needs asking the TA System: it routes the way an
 * exact match does (`routeLead`) - to the requirement meeting when their agreement is signed, to waiting
 * on the agreement when it is not. An active client is one whose agreement was countersigned.
 */
export function directClientRouting(client: { name: string; nameKey: string; stage: string; taClientId: string | null; id: string }): {
  state: LeadState;
  because: string;
  existing: ClientLike;
} {
  const existing: ClientLike = {
    id: client.taClientId ?? client.id,
    name: client.name,
    nameKey: client.nameKey,
    esaSignedAt: client.stage === "active" ? 1 : null,
  };
  const routed = routeLead({ industryFlagged: false, industryConfirmed: false, existing });
  return { state: routed.state, because: routed.because, existing };
}
