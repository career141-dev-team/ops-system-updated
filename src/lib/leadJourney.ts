/**
 * The lead's progress bar: Enquiry, Intro call, Opening, Agreement, Requirement.
 *
 * Worked out only from what has actually happened, never from the tab being
 * looked at. Since the supervisor review (17 Nov) the order is: the intro call,
 * then the opening is opened and the agreement goes out at the same time, and
 * the requirement is settled in a meeting (which can be the intro call itself).
 * So the Agreement and the Requirement are one stage run side by side: both can
 * be current at once, and neither is "skipped" because the other moved first.
 *
 *   - done      the work of that step is finished
 *   - skipped   not finished, but a step in a later stage has already started
 *   - current   what is to do now (every unfinished step of the first open stage)
 *   - upcoming  nothing to do yet
 *
 * Pure: no database, nothing sent.
 */

export type JourneyState = "done" | "current" | "upcoming" | "skipped";

/** Enquiry, Intro call, Opening, then Agreement and Requirement together. */
const STAGE_OF_STEP = [0, 1, 2, 3, 3];

export function leadJourney(p: {
  closed: boolean;
  leadState: string;
  clientTaId: string | null;
  industryFlagged: boolean;
  industryConfirmedBy: string | null;
  /** A Director's lead skips the intro call by design. */
  skipsIntro: boolean;
  introBooked: boolean;
  introHeld: boolean;
  /** The opening was opened (a position exists), signed or not. */
  positionExists: boolean;
  esaState: string | null;
  /** Any requirement field written, or a requirement meeting booked or held. */
  requirementStarted: boolean;
  /** Every required requirement field is filled. */
  requirementDone: boolean;
}): JourneyState[] {
  const checked =
    !(p.leadState === "new" && !p.clientTaId) && !(p.industryFlagged && !p.industryConfirmedBy);
  const signed = p.esaState === "signed" || p.esaState === "countersigned";

  const done = [checked, p.introHeld || p.skipsIntro, p.positionExists, signed, p.requirementDone];
  const started = [
    checked,
    p.introBooked || p.introHeld,
    p.positionExists,
    p.esaState !== null,
    p.requirementStarted || p.requirementDone,
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
