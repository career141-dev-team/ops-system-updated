/**
 * The lead's progress bar: Enquiry, Intro call, Agreement, Requirement, Opening.
 *
 * Worked out only from what has actually happened, never from the tab being
 * looked at. The order (owner, 17 Nov evening): the intro call ends with the ESA
 * sent, then the Agreement (signed) and the Requirement (complete) run side by
 * side, and only then is the Opening created. (The supervisor's morning order put
 * the opening first and filled the TA System with companies that never signed.)
 * A lead marked "open it now" is the exception: its opening may come first, and
 * the agreement and requirement then stay current rather than "skipped".
 * Agreement and Requirement are one stage: both can be current at once, and
 * neither is "skipped" because the other moved first.
 *
 *   - done      the work of that step is finished
 *   - skipped   not finished, but a step in a later stage has already started
 *   - current   what is to do now (every unfinished step of the first open stage)
 *   - upcoming  nothing to do yet
 *
 * Pure: no database, nothing sent.
 */

export type JourneyState = "done" | "current" | "upcoming" | "skipped";

/** Enquiry, Intro call, then Agreement and Requirement together, then the Opening. */
const STAGE_OF_STEP = [0, 1, 2, 2, 3];

export function leadJourney(p: {
  closed: boolean;
  leadState: string;
  clientTaId: string | null;
  industryFlagged: boolean;
  industryConfirmedBy: string | null;
  /** No intro call to do: a Director's lead, or a client we already had (`existingClientOf`). */
  skipsIntro: boolean;
  introBooked: boolean;
  introHeld: boolean;
  /** A client we already had, with a signed agreement on file (`existingClientOf`). */
  agreementOnFile?: boolean;
  /** The opening was opened (a position exists), signed or not. */
  positionExists: boolean;
  /** The lead was marked "open it now, without waiting" (a trusted client). */
  openEarly?: boolean;
  esaState: string | null;
  /** Any requirement field written, or a requirement meeting booked or held. */
  requirementStarted: boolean;
  /** Every required requirement field is filled. */
  requirementDone: boolean;
}): JourneyState[] {
  const checked =
    !(p.leadState === "new" && !p.clientTaId) && !(p.industryFlagged && !p.industryConfirmedBy);
  const signed = p.esaState === "signed" || p.esaState === "countersigned" || !!p.agreementOnFile;

  // The intro call ends with the ESA sent to the client (owner, 17 Nov): held is not enough.
  const esaOut = p.esaState !== null && p.esaState !== "draft";
  const done = [checked, (p.introHeld && esaOut) || p.skipsIntro, signed, p.requirementDone, p.positionExists];
  const started = [
    checked,
    p.introBooked || p.introHeld,
    // Drafting and sending the ESA are the end of the intro call (owner, 17 Nov); the agreement
    // stage starts when the client answers it: changes asked for, or signed.
    ["negotiating", "signed", "countersigned"].includes(p.esaState ?? ""),
    p.requirementStarted || p.requirementDone,
    // An opening made early on purpose does not turn the unfinished agreement and requirement into "skipped".
    p.positionExists && !p.openEarly,
  ];
  const furthest = Math.max(...started.map((on, i) => (on ? STAGE_OF_STEP[i] : -1)));

  const open = done.map((isDone, i) => !isDone && STAGE_OF_STEP[i] >= furthest);
  const firstOpen = open.indexOf(true);
  const currentStage = p.closed || firstOpen < 0 ? -1 : STAGE_OF_STEP[firstOpen];

  return done.map((isDone, i) => {
    if (isDone) return "done";
    if (STAGE_OF_STEP[i] < furthest) return "skipped";
    return STAGE_OF_STEP[i] === currentStage ? "current" : "upcoming";
  });
}

/**
 * What the bar shows when the page is on one step (17 Nov): the viewed step is
 * ringed, and an earlier step that is still not done shows the warning "!", so
 * "you are on the opening and the intro call is still open" can be read at a
 * glance. Done steps stay done.
 */
export function barStates(states: JourneyState[], shownIndex: number): JourneyState[] {
  return states.map((state, i) => {
    if (state === "done") return state;
    if (i < shownIndex) return "skipped";
    if (i === shownIndex && state === "upcoming") return "current";
    return state;
  });
}

/* ── One step at a time (17 Nov) ───────────────────────────────────── */

export type LeadStep = "enquiry" | "intro" | "agreement" | "requirement" | "opening";

/** The lead page's steps, in order; the same five as the bar's first five. */
export const LEAD_STEPS: LeadStep[] = ["enquiry", "intro", "agreement", "requirement", "opening"];

export const LEAD_STEP_LABELS: Record<LeadStep, string> = {
  enquiry: "Enquiry",
  intro: "Intro call",
  opening: "Opening",
  agreement: "Agreement",
  requirement: "Requirement",
};

function isLeadStep(value: string | null | undefined): value is LeadStep {
  return LEAD_STEPS.includes(value as LeadStep);
}

/**
 * The step a link asks for: \`?step=\`, or an older \`?view=\` link from a task, an
 * email or another screen (agreement, requirement, and the industry decline
 * check, which is part of the enquiry).
 */
export function askedStep(step: string | null | undefined, view: string | null | undefined): LeadStep | null {
  if (isLeadStep(step)) return step;
  if (view === "agreement" || view === "requirement") return view;
  if (view === "decline") return "enquiry";
  return null;
}

/**
 * Which step the page shows: the one asked for, or else the step the work is at
 * now (the first "current"), so a lead opens where it was left. It used to take
 * the first step not done, so one old gap (an intro call jumped over) sent a lead
 * that was already at the requirement back to the start every time (18 Nov).
 * With no current step it falls back to the first not done, and a lead with
 * every step done opens on the last.
 */
export function stepToShow(asked: LeadStep | null, states: JourneyState[]): LeadStep {
  if (asked) return asked;
  const now = states.indexOf("current");
  const first = now !== -1 ? now : states.findIndex((state) => state !== "done");
  return LEAD_STEPS[first === -1 ? LEAD_STEPS.length - 1 : first];
}

export function stepAfter(step: LeadStep): LeadStep | null {
  return LEAD_STEPS[LEAD_STEPS.indexOf(step) + 1] ?? null;
}

export function stepBefore(step: LeadStep): LeadStep | null {
  return LEAD_STEPS[LEAD_STEPS.indexOf(step) - 1] ?? null;
}

/**
 * The last four steps of the bar, from what exists on the opening: the search
 * and interviews are done once somebody is placed, joining is done once they
 * joined, the invoice is the thing to do from the joining day until it is paid,
 * and the guarantee is current while it runs and done once it ended.
 * They were hard-coded "upcoming" on the lead page, so the bar never went green
 * past the requirement (17 Nov). The invoice step was added on 18 Nov: the owner
 * counts sending it as part of the guarantee stage, and nothing on the bar said so.
 */
export function tailJourney(p: {
  openingConfirmed: boolean;
  placed: boolean;
  joined: boolean;
  /** The fee invoice's state, or null when none is raised yet. */
  invoice?: string | null;
  guarantee: string | null;
}): [JourneyState, JourneyState, JourneyState, JourneyState] {
  const running = ["running", "warned", "replacing", "refund_pending"];
  const invoiceDone = p.invoice === "paid" || p.invoice === "written_off";
  return [
    p.placed ? "done" : p.openingConfirmed ? "current" : "upcoming",
    p.joined ? "done" : p.placed ? "current" : "upcoming",
    invoiceDone ? "done" : p.joined ? "current" : "upcoming",
    !p.guarantee ? "upcoming" : running.includes(p.guarantee) ? "current" : "done",
  ];
}

export interface JourneyItem {
  label: string;
  state: JourneyState;
  href?: string;
  note?: string;
  viewing?: boolean;
  together?: string;
}

/**
 * The same bar for every page from the opening on (18 Nov): the opening, the placement, the
 * invoice and the guarantee each drew their own list of steps, with other names, so the
 * journey changed shape as a person moved through it. Everything before the opening is done
 * by definition (an opening exists), except an agreement that was not signed: that one stays
 * an open ring, because the opening was made early on purpose.
 */
export function openingJourney(p: {
  leadId: string | null;
  positionId: string;
  agreementSigned: boolean;
  openingConfirmed: boolean;
  searchNote?: string;
  tail: [JourneyState, JourneyState, JourneyState, JourneyState];
  placementId: string | null;
  invoiceId: string | null;
  guaranteeId: string | null;
  viewing?: "opening" | "search" | "joining" | "invoice" | "guarantee";
}): JourneyItem[] {
  const lead = (step: LeadStep) => (p.leadId ? `/leads/${p.leadId}?step=${step}` : undefined);
  const at = (key: NonNullable<typeof p.viewing>) => p.viewing === key;
  return [
    { label: "Enquiry", state: "done", href: lead("enquiry") },
    { label: "Intro call", state: "done", href: lead("intro") },
    { label: "Agreement", state: p.agreementSigned ? "done" : "skipped", href: lead("agreement"), together: "side by side" },
    { label: "Requirement", state: "done", href: lead("requirement"), together: "side by side" },
    { label: "Opening", state: p.openingConfirmed ? "done" : "current", href: `/positions/${p.positionId}`, viewing: at("opening") },
    { label: "Search & interviews", state: p.tail[0], note: p.searchNote, href: `/positions/${p.positionId}?view=candidates`, viewing: at("search") },
    { label: "Joining", state: p.tail[1], href: p.placementId ? `/placements/${p.placementId}` : undefined, viewing: at("joining") },
    {
      label: "Invoice",
      state: p.tail[2],
      href: p.invoiceId ? `/invoices/${p.invoiceId}` : p.placementId ? `/placements/${p.placementId}?view=finance` : undefined,
      viewing: at("invoice"),
    },
    { label: "Guarantee", state: p.tail[3], href: p.guaranteeId ? `/guarantees/${p.guaranteeId}` : undefined, viewing: at("guarantee") },
  ];
}
