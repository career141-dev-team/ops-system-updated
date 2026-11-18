/**
 * The lead page as a flow (18 Nov): one thing to do now, what runs beside it,
 * and what is already done, each said in one line.
 *
 * The owner's point: the bar of eight steps, its yellow "!" and a page per step
 * made the ops person work out for themselves what was next. The page now shows
 * the step that is current, the second one when two run together (the agreement
 * and the requirement), and a quiet line for each finished step. Nothing here
 * decides a stage: the states come from `leadJourney`, so the two cannot differ.
 *
 * Pure: no database, nothing sent.
 */

import { colomboDateInWords } from "@/lib/calendar";
import { LEAD_STEPS, type JourneyState, type LeadStep } from "@/lib/leadJourney";

export interface Flow {
  /** The one step to work on; null once everything is done, or the lead is closed. */
  now: LeadStep | null;
  /** A step current at the same time (the requirement beside the agreement). */
  alsoNow: LeadStep[];
  /** Finished steps, in order. */
  done: LeadStep[];
}

export function flowOf(states: JourneyState[]): Flow {
  const current = LEAD_STEPS.filter((_, i) => states[i] === "current");
  return {
    now: current[0] ?? null,
    alsoNow: current.slice(1),
    done: LEAD_STEPS.filter((_, i) => states[i] === "done"),
  };
}

export interface DoneFacts {
  /** Linked to a client we already had at the enquiry. */
  existingClient: boolean;
  skipsIntro: boolean;
  introHeldAt: number | null;
  esaSentAt: number | null;
  esaSignedAt: number | null;
  countersigned: boolean;
  signedOnFile: boolean;
  roleTitle: string;
  openingTaId: string | null;
}

/** What a finished step says, in one line, so the page can show it without opening it. */
export function doneLine(step: LeadStep, f: DoneFacts): string {
  const on = (at: number | null) => (at ? colomboDateInWords(at) : "");
  switch (step) {
    case "enquiry":
      return f.existingClient ? "Checked: already our client" : "Checked: a new client";
    case "intro":
      if (f.skipsIntro && !f.introHeldAt) return "No intro call needed";
      return "Held " + on(f.introHeldAt) + (f.esaSentAt ? " · agreement sent " + on(f.esaSentAt) : "");
    case "agreement":
      if (f.signedOnFile) return "Signed before, on file";
      return "Signed " + on(f.esaSignedAt) + (f.countersigned ? " · countersigned" : " · countersignature to follow");
    case "requirement":
      return "Complete" + (f.roleTitle.trim() ? ": " + f.roleTitle.trim() : "");
    case "opening":
      return f.openingTaId ? "Opened in the TA System: " + f.openingTaId : "Handed to the TA System, waiting for its opening";
  }
}
