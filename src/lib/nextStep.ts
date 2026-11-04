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
  // "on_hold" is what the rows actually say (HoldState). This looked for
  // "held" and so never saw a held client at all - found walking the search
  // screens on 4 November.
  const held = holds.filter((h) => h.state === "on_hold" || h.state === "proposed");

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

/* ── The search: a set, a hold, an interview (24, step 4) ──────── */

export interface SetLike {
  state: string;
  name: string;
  candidates: {
    name: string;
    fileId: string | null;
    problem: string | null;
    claimedAt?: number | null;
    decision?: string | null;
  }[];
  dueAt: number | null;
  sentAt: number | null;
  receivedAt: number | null;
  reason: string | null;
}

/**
 * A set's own next step.
 *
 * This is the hardest card on the desk, because once a set is received four
 * clocks run at once: CV ownership, the feedback chase, the two weeks before
 * a hold, and three months for an unreported hire. The card names the one
 * step and the nearest clock; the page lists the rest below it. Four
 * countdowns in a row is a dashboard, which the owner has refused twice.
 */
export function setNextStep(
  set: SetLike,
  parts: {
    minCvs: number;
    /** When the client's claim window shuts, if it is still open. */
    ownershipClosesAt: number | null;
    /** What the feedback rule says to do about the silence. */
    feedback: { what: string; because: string } | null;
    /** A hold on this position: "proposed", "held", or nothing. */
    holdState: string | null;
  },
  now: number,
): Step {
  const ready = set.candidates.filter((c) => !c.problem && c.fileId);
  const missing = set.candidates.filter((c) => c.problem || !c.fileId);
  const undecided = set.candidates.filter((c) => !c.decision);

  if (set.state === "withdrawn") {
    return {
      at: "closed",
      where: "Pulled back",
      waiting: "Nothing: this set was pulled back and never went." + (set.reason ? " " + set.reason : ""),
      clock: null,
    };
  }

  if (set.state === "ready") {
    return {
      at: "review",
      where: "TA says it is ready",
      waiting: "Read it before it goes. Nothing reaches the client until you have.",
      clock: set.dueAt ? "Due at the client " + inDays(set.dueAt, now) + ", counted from the day they signed." : null,
    };
  }

  if (set.state === "reviewing") {
    if (ready.length < parts.minCvs) {
      return {
        at: "candidates",
        where: "Being read before it goes",
        waiting:
          ready.length +
          " of " +
          parts.minCvs +
          " CVs are ready, so it cannot go yet" +
          (missing.length
            ? ": " +
              missing.map((c) => c.name).join(", ") +
              " " +
              (missing.length === 1 ? "has" : "have") +
              " no CV."
            : "."),
        clock: set.dueAt ? "Due at the client " + inDays(set.dueAt, now) + "." : null,
      };
    }
    return {
      at: "send",
      where: "Ready to go",
      waiting: "Send it to the client's own people. It goes as a draft you approve, with every CV attached.",
      clock: set.dueAt ? "Due at the client " + inDays(set.dueAt, now) + "." : null,
    };
  }

  // Sent, but nobody has said when it landed. Every clock after this counts
  // from that day, so none of them has started.
  if (!set.receivedAt) {
    return {
      at: "received",
      where: "Sent " + inDays(set.sentAt, now),
      waiting:
        "Say the day the client received it. Every clock after this counts from that day, so none of them is running.",
      clock: null,
    };
  }

  const ownership = parts.ownershipClosesAt
    ? "They can still say they already had one of these CVs: that window shuts " +
      inDays(parts.ownershipClosesAt, now) +
      ", and after it a claim is refused."
    : null;

  if (parts.holdState === "proposed") {
    return {
      at: "hold",
      where: "With the client, gone quiet",
      waiting: "A clock has proposed a hold. It only holds once you approve the notice the client gets.",
      clock: "Nothing is held, or let go, without a person.",
    };
  }

  if (parts.holdState === "on_hold") {
    return {
      at: "hold",
      where: "On hold",
      waiting: "Nothing on this set: the position is held until the client comes back.",
      clock: "The hold is looked at again every thirty days. It never closes by itself.",
    };
  }

  if (undecided.length === 0) {
    return {
      at: "decisions",
      where: "Every candidate answered",
      waiting:
        "Nothing here. The work is on the position now - the depth rule decides whether the search carries on.",
      clock: ownership,
    };
  }

  const step = parts.feedback;
  if (step?.what === "chase") {
    return {
      at: "feedback",
      where: "With the client",
      waiting:
        "Ask once, in writing: " +
        undecided.length +
        " of " +
        set.candidates.length +
        " candidates still have no answer.",
      clock: "The chase is drafted for you to approve; nothing goes out on its own.",
    };
  }
  if (step?.what === "call") {
    return {
      at: "feedback",
      where: "With the client, chased once",
      waiting: "Ring them today. " + step.because,
      clock: "After this we stop asking, and the hold clock decides.",
    };
  }
  if (step?.what === "stop") {
    return {
      at: "feedback",
      where: "With the client, silent",
      waiting: "Stop asking. " + step.because,
      clock: "A hold will be proposed for you to approve; it is never put on by itself.",
    };
  }

  return {
    at: "feedback",
    where: "With the client",
    waiting: "Waiting on them: " + undecided.length + " of " + set.candidates.length + " candidates have no answer yet.",
    clock: ownership,
  };
}

export interface HoldLike {
  state: string;
  reason: string;
  liftedReason: string | null;
  heldAt: number | null;
  liftedAt: number | null;
  reviewAt: number | null;
  noticeMessageId: string | null;
}

/**
 * A hold's own next step.
 *
 * The owner's decision 6, said in one card: a silent client's hold never
 * closes by itself, and a person is asked about it again every thirty days.
 */
export function holdNextStep(hold: HoldLike, now: number): Step {
  if (hold.state === "lifted") {
    return {
      at: "closed",
      where: "Lifted " + inDays(hold.liftedAt, now),
      waiting: "Nothing: the search is running again." + (hold.liftedReason ? " " + hold.liftedReason : ""),
      clock: null,
    };
  }

  if (hold.state === "proposed") {
    return {
      at: "approve",
      where: "Proposed by a clock",
      waiting:
        "Approve the notice the client gets, and it goes on hold. " +
        (hold.noticeMessageId ? "The notice is drafted and waiting for you." : "Nothing is drafted yet."),
      clock: "Nothing holds a position by itself: it waits here until a person decides.",
    };
  }

  return {
    at: "review",
    where: "Held since " + inDays(hold.heldAt, now),
    waiting: "Nothing today, unless the client has come back. Then lift it, with a reason.",
    clock: hold.reviewAt
      ? "You will be asked about it again " + inDays(hold.reviewAt, now) + ". It never closes by itself."
      : "It never closes by itself.",
  };
}

export interface InterviewLike {
  state: string;
  scheduler: string;
  round: number;
  slots: number[];
  slotLoops: number;
  at: number | null;
  whereOrLink: string;
  interviewers: string[];
  decision: string | null;
  reason: string | null;
  candidateFeedback: string | null;
}

/**
 * An interview's own next step.
 *
 * The client's side only: the candidate is the TA System's, and this card
 * never says a word about chasing them. Four forms used to sit open on this
 * page at once (24, section 1).
 */
export function interviewNextStep(
  interview: InterviewLike,
  parts: {
    maxSlotLoops: number;
    /** A reference the client asked for: "asked", "reported", or nothing. */
    reference: { state: string } | null;
  },
  now: number,
): Step {
  const round = "Round " + interview.round;

  if (interview.state === "cancelled") {
    return {
      at: "closed",
      where: "Cancelled",
      waiting:
        "Nothing." +
        (interview.reason ? " " + interview.reason : "") +
        " The round is kept: a new time starts a new interview.",
      clock: null,
    };
  }

  if (interview.state === "no_show") {
    return {
      at: "slots",
      where: "Nobody came",
      waiting: "Agree a new time, or tell the TA this one is over. Nothing was sent to anybody by itself.",
      clock: null,
    };
  }

  if (interview.state === "attended") {
    if (!interview.decision) {
      return {
        at: "decision",
        where: round + " held " + inDays(interview.at, now),
        waiting: "Waiting on the client's decision, in their own words.",
        clock: interview.candidateFeedback
          ? "The TA's own feedback is in, and the client's copy was drafted the next morning."
          : "The TA System sends us what the candidate said; we draft the client's copy the next morning.",
      };
    }
    if (parts.reference?.state === "asked") {
      return {
        at: "reference",
        where: round + " · " + interview.decision,
        waiting:
          "The client asked for a reference. The TA rings the referee and writes down what was said, word for word.",
        clock: null,
      };
    }
    return {
      at: "decision",
      where: round + " · " + interview.decision,
      waiting: "Nothing here: the decision is recorded and the depth has been counted again.",
      clock: null,
    };
  }

  if (interview.state === "slots") {
    if (interview.scheduler === "client") {
      return {
        at: "booking",
        where: "Waiting for the client's date",
        waiting: "The client books it themselves. Record the date as soon as they tell you.",
        clock: "A clock asks them for it, and asks you again if nothing comes back.",
      };
    }
    if (interview.slotLoops >= parts.maxSlotLoops) {
      return {
        at: "slots",
        where: "Three rounds of times, no answer",
        waiting: "Stop asking. Tell the TA, who finds a back-up candidate.",
        clock: null,
      };
    }
    if (interview.slots.length === 0) {
      return {
        at: "slots",
        where: "Agreeing a time",
        waiting: "Ask the client for times. The TA asks the candidate once you have them.",
        clock: null,
      };
    }
    return {
      at: "slots",
      where: interview.slots.length + " times offered",
      waiting: "The TA is asking the candidate. Record which one they picked.",
      clock: null,
    };
  }

  if (interview.state === "agreed") {
    const missing = !interview.whereOrLink
      ? "a link or an address"
      : interview.interviewers.length === 0
        ? "who is interviewing"
        : null;
    return {
      at: "book",
      where: "A time is agreed",
      waiting: missing
        ? "Book it. It will refuse until you give it " + missing + "."
        : "Book it. The invite is drafted for you to approve, and the TA is told.",
      clock: null,
    };
  }

  // Booked, or booked and reconfirmed.
  return {
    at: "booked",
    where: round + (interview.state === "reconfirmed" ? " · reconfirmed" : "") + " · " + inDays(interview.at, now),
    waiting:
      "Nothing until it happens. If the candidate drops out, say so here: the client is told at once, and how late it is goes in the notice.",
    clock:
      interview.state === "reconfirmed"
        ? "The interview's own clock runs on the day: mark who turned up."
        : "A reminder goes at nine the morning before, and the interview's own clock runs on the day.",
  };
}
