/**
 * What to do now (23, sections 2 and 4).
 *
 * The screens grew a form per feature, so a lead's page showed nine of them
 * at once and said nothing about which one mattered. This works that out from
 * the rows themselves - one function per kind of thing, pure, so the card at
 * the top of a page cannot drift from what the buttons will really allow.
 *
 * Three rules it follows:
 *
 *   - **One step, named.** The card says the next thing, not a list of
 *     everything possible. The rest of the page is still there, below.
 *   - **Whose move it is.** Ours, the client's, the Director's or TA's -
 *     because "waiting" with no "on whom" is what makes a desk feel stuck.
 *   - **What happens by itself.** If a clock will act, the card says what and
 *     when, in words (the owner's rule: the clock is visible wherever one
 *     runs).
 *
 * Nothing here touches a database.
 */

const DAY = 86_400_000;

export interface Step {
  /** Which part of the page to open: the key a screen matches on. */
  at: string;
  /** What is waiting, and on whom. One sentence. */
  waiting: string;
  /** Where this thing is, in a few words. */
  where: string;
  /** What will happen by itself, and when. */
  clock: string | null;
}

function inDays(at: number | null, now: number): string {
  if (!at) return "";
  const days = Math.round((at - now) / DAY);
  if (days > 1) return "in " + days + " days";
  if (days === 1) return "tomorrow";
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  return Math.abs(days) + " days ago";
}

export interface LeadLike {
  state: string;
  company: string;
  industryFlagged: boolean;
  industryConfirmedBy: string | null;
  clientTaId: string | null;
  reason: string | null;
}

export interface MeetingLike {
  kind: string;
  state: string;
  at: number;
  /** Our own attempts to book it: the third unanswered one closes the lead. */
  rebookCount: number;
}

export interface EsaLike {
  state: string;
  version: number;
  chaseStep: number;
  sentAt: number | null;
  expiresAt: number | null;
  signedAt: number | null;
}

export interface RequirementLike {
  fields: Record<string, string>;
}

export interface PositionLike {
  openingTaId: string | null;
  title: string;
}

/**
 * The lead's own ladder: duplicate, industry, intro call, agreement,
 * requirement, hand-over.
 */
export function leadNextStep(
  lead: LeadLike,
  parts: {
    meetings: MeetingLike[];
    esa: EsaLike | null;
    requirement: RequirementLike | null;
    position: PositionLike | null;
    requiredFields: string[];
  },
  now = Date.now(),
): Step {
  const { meetings, esa, requirement, position, requiredFields } = parts;
  const intro = meetings.filter((m) => m.kind === "intro");
  const reqMeeting = meetings.filter((m) => m.kind === "requirement");
  const booked = (list: MeetingLike[]) => list.find((m) => m.state === "booked") ?? null;
  const held = (list: MeetingLike[]) => list.some((m) => m.state === "held");

  if (lead.state === "declined_industry") {
    return {
      at: "closed",
      waiting: "Nothing: this one was declined because of what they do.",
      where: "Declined · " + (lead.reason ?? "no reason written down"),
      clock: null,
    };
  }
  if (lead.state.startsWith("closed")) {
    return {
      at: "closed",
      waiting: "Nothing: this lead is closed.",
      where: "Closed · " + (lead.reason ?? "no reason written down"),
      clock: null,
    };
  }

  // 1. Is this somebody we already have?
  if (!lead.clientTaId && lead.state === "new") {
    return {
      at: "duplicate",
      waiting: "Check whether they are already our client, before anything else happens.",
      where: "A new lead, nothing done yet",
      clock: null,
    };
  }

  // 2. The banking and finance rule.
  if (lead.industryFlagged && !lead.industryConfirmedBy) {
    return {
      at: "industry",
      waiting: "Somebody has to say whether this really is banking or finance - we do not take those.",
      where: "Flagged by the industry rule",
      clock: null,
    };
  }

  // 3. The intro call.
  if (!held(intro)) {
    const next = booked(intro);
    if (next) {
      return {
        at: "intro",
        waiting: "The intro call is booked for " + inDays(next.at, now) + ". Mark whether it happened.",
        where: "Waiting on the call",
        clock: "A reminder goes the day before, and again on the morning.",
      };
    }
    const tries = intro.reduce((most, m) => Math.max(most, m.rebookCount), 0);
    return {
      at: "intro",
      waiting:
        tries > 0
          ? "Book the intro call again - " + tries + " attempts so far, and three with no reply closes the lead."
          : "Book the intro call. The TA lead comes to it too.",
      where: tries > 0 ? "Rebooking the intro call" : "Ready for the intro call",
      clock: tries > 0 ? "After three attempts with no reply the lead closes itself, with the reason." : null,
    };
  }

  // 4. The agreement.
  if (!esa) {
    return {
      at: "agreement",
      waiting: "Start the agreement. It goes out within two hours of the call, which is the promise.",
      where: "The call is held; no agreement yet",
      clock: null,
    };
  }
  if (esa.state === "draft") {
    return {
      at: "agreement",
      waiting: "Fill in the agreement's fields and send it. Every hole in the template is a required field.",
      where: "Agreement drafted, version " + esa.version,
      clock: null,
    };
  }
  if (esa.state === "sent" || esa.state === "chasing") {
    return {
      at: "agreement",
      waiting:
        esa.chaseStep > 0
          ? "Chased " + esa.chaseStep + " times and still not signed. The next chase is drafted for you to read."
          : "Waiting on them to sign. Nothing to do unless they reply.",
      where: "Sent " + inDays(esa.sentAt, now) + ", version " + esa.version,
      clock:
        "The chase goes by itself: email, WhatsApp, email, WhatsApp, email, then a call" +
        (esa.expiresAt ? ", and it declines " + inDays(esa.expiresAt, now) + " if nothing comes back." : "."),
    };
  }
  if (esa.state === "changes") {
    return {
      at: "agreement",
      waiting: "They want changes. Agree the terms, write them into the fields, then send the next version.",
      where: "In negotiation, version " + esa.version,
      clock: esa.expiresAt ? "The two weeks keep running: it declines " + inDays(esa.expiresAt, now) + "." : null,
    };
  }
  if (esa.state === "signed") {
    return {
      at: "agreement",
      waiting: "They have signed. The Director countersigns, and then the client record is made.",
      where: "Signed " + inDays(esa.signedAt, now) + ", waiting on the Director",
      clock: "One reminder goes to the Director tomorrow.",
    };
  }
  if (esa.state === "declined" || esa.state === "expired") {
    return {
      at: "closed",
      waiting: "Nothing: the agreement " + (esa.state === "expired" ? "ran out of time" : "was declined") + ".",
      where: "No agreement on this lead",
      clock: null,
    };
  }

  // 5. The requirement meeting, which cannot happen before the agreement.
  if (!held(reqMeeting)) {
    const next = booked(reqMeeting);
    if (next) {
      return {
        at: "requirement",
        waiting: "The requirement meeting is " + inDays(next.at, now) + ". Mark whether it happened.",
        where: "Agreement countersigned; waiting on the meeting",
        clock: "A reminder goes the day before.",
      };
    }
    return {
      at: "requirement",
      waiting: "Book the requirement meeting. No position is opened before it happens.",
      where: "Agreement countersigned",
      clock: null,
    };
  }

  // 6. The requirement itself, and the hand-over.
  const blanks = requiredFields.filter((key) => !(requirement?.fields[key] ?? "").trim());
  if (blanks.length) {
    return {
      at: "requirement",
      waiting:
        "Write down what they asked for: " +
        blanks.length +
        (blanks.length === 1 ? " field is" : " fields are") +
        " still blank, and TA cannot be given half a requirement.",
      where: "The meeting is held",
      clock: null,
    };
  }
  if (!position) {
    return {
      at: "requirement",
      waiting: "Hand it to the TA System. The opening is created on their side, not ours.",
      where: "The requirement is written down in full",
      clock: null,
    };
  }
  if (!position.openingTaId) {
    return {
      at: "requirement",
      waiting: "Nothing: the TA System is creating the opening. It confirms with its own event.",
      where: "Handed over, waiting on TA",
      clock: "Their event will fill in the opening, and a task will say so.",
    };
  }
  return {
    at: "requirement",
    waiting: "Nothing here: the search is the TA System's now. The position is where to look.",
    where: "Opening " + position.openingTaId + " · " + position.title,
    clock: null,
  };
}

export interface ClientLike {
  stage: string;
  name: string;
  billingEmail: string;
  groupName: string;
}

/**
 * A client's own next step.
 *
 * A client record is not a queue of tasks - the work happens on their
 * positions and sets - so this says what is missing from the record itself,
 * and otherwise points at where the work is.
 */
export function clientNextStep(
  client: ClientLike,
  parts: {
    positions: { stage: string; title: string }[];
    sets: { state: string }[];
    owing: { number: string }[];
    holds: { state: string }[];
  },
): Step {
  const { positions, sets, owing, holds } = parts;
  const open = positions.filter((p) => p.stage !== "closed");
  const held = holds.filter((h) => h.state === "held" || h.state === "proposed");

  if (client.stage === "closed" || client.stage === "dormant") {
    return {
      at: "record",
      waiting: "Nothing: this client is " + client.stage + ".",
      where: "No work running for them",
      clock: null,
    };
  }
  if (!client.billingEmail.trim()) {
    return {
      at: "record",
      waiting: "Put their billing address on the record - an invoice has nowhere to go without it.",
      where: "Active, but we could not bill them",
      clock: null,
    };
  }
  if (held.length) {
    return {
      at: "holds",
      waiting:
        held.length === 1
          ? "One position is held because they went quiet. It is reviewed every thirty days until somebody ends it."
          : held.length + " positions are held because they went quiet.",
      where: "Active · " + open.length + " open " + (open.length === 1 ? "position" : "positions"),
      clock: "The owner gets a task about each hold every thirty days. A hold never closes by itself.",
    };
  }
  if (owing.length) {
    return {
      at: "money",
      waiting:
        owing.length === 1
          ? "Invoice " + owing[0].number + " is still owed. Accounts chases it; nothing here is overdue on your side."
          : owing.length + " invoices are still owed.",
      where: "Active · " + open.length + " open " + (open.length === 1 ? "position" : "positions"),
      clock: "The chase is drafted by its own clock, a month at a time.",
    };
  }
  if (!open.length) {
    return {
      at: "record",
      waiting: "Nothing is open for them. If they are finished with us, move them to dormant with a reason.",
      where: "Active, with nothing running",
      clock: null,
    };
  }
  const waitingSets = sets.filter((s) => s.state === "sent").length;
  if (!client.groupName.trim() && sets.length) {
    return {
      at: "record",
      waiting: "Their WhatsApp group is not written down, so the next set's post does not know where to go.",
      where: "Active · " + open.length + " open " + (open.length === 1 ? "position" : "positions"),
      clock: null,
    };
  }
  return {
    at: "record",
    waiting:
      "Nothing on the record itself. The work is on their " +
      (open.length === 1 ? "position" : open.length + " positions") +
      (waitingSets ? " and the " + waitingSets + " " + (waitingSets === 1 ? "set" : "sets") + " they are holding." : "."),
    where: "Active",
    clock: null,
  };
}
