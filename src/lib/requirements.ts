import { introSatisfied } from "@/lib/leads";

/**
 * The requirement, and handing it to the TA System (15, Phase 3).
 *
 * This is the fault on the owner's board in one line: **"the requirement was
 * in the TA lead's head."** A client explains the role on a call, somebody
 * remembers most of it, and the opening that reaches the TAs is a sentence.
 * Then the CVs are wrong and nobody can say why.
 *
 * So the requirement is written down here, in named fields, and the opening in
 * TA is built from those fields and nothing else. Two rules follow, and both
 * are refusals rather than warnings:
 *
 *   - **No opening without a signed agreement.** The owner's rule: the search
 *     is blocked until the client has signed.
 *   - **No opening without the requirement.** A blank field is named on screen
 *     and the hand-over refuses, exactly as the agreement's blank fields do.
 *
 * Nothing here touches a database or sends anything.
 */

export interface RequirementField {
  key: string;
  label: string;
  required: boolean;
  why: string;
}

/**
 * What the TAs actually need to start.
 *
 * Each one is here because the board says its absence cost us something: a
 * role at the wrong level, CVs from the wrong city, a package nobody could
 * quote, a brief too thin to search from.
 */
export const REQUIREMENT_FIELDS: RequirementField[] = [
  { key: "title", label: "The position", required: true, why: "What the opening in TA is called." },
  { key: "level", label: "Level", required: true, why: "Executive, manager, head - the ladder TA ranks on." },
  { key: "salary", label: "Package", required: true, why: "What they will actually pay, in their words." },
  { key: "locations", label: "Where", required: true, why: "The city or cities. CVs from the wrong one waste everybody." },
  { key: "headcount", label: "How many", required: true, why: "One opening can be for more than one person." },
  { key: "jdNotes", label: "The brief", required: true, why: "What they said the job is. TA drafts the JD from this." },
  { key: "insights", label: "Anything else said on the call", required: false, why: "Why the last person left, who they report to, what they will not accept." },
  { key: "reportsTo", label: "Reports to", required: false, why: "Asked by every candidate at interview." },
  { key: "incumbentNote", label: "Incumbent / reference profile", required: false, why: "Who did the job before, or who the client has in mind: a note TA reads before sourcing." },
];

export type RequirementFields = Record<string, string>;

export function missingFields(fields: RequirementFields): RequirementField[] {
  return REQUIREMENT_FIELDS.filter((f) => f.required && !(fields[f.key] ?? "").trim());
}

export function problemWithRequirement(fields: RequirementFields): string | null {
  const missing = missingFields(fields);
  if (!missing.length) return null;
  return "Still blank: " + missing.map((f) => f.label.toLowerCase()).join(", ") + ".";
}

/**
 * The requirement as one block of text for the TA System.
 *
 * TA reads a brief with its own extractor, and it reads labelled lines best -
 * the same shape the desk already types into an email. Built here so the
 * opening and the JD draft start from exactly what the client said.
 */
export function briefText(fields: RequirementFields): string {
  const lines: string[] = [];
  const add = (label: string, key: string) => {
    const value = (fields[key] ?? "").trim();
    if (value) lines.push(label + ": " + value);
  };
  add("Position", "title");
  add("Level", "level");
  add("Headcount", "headcount");
  add("Location", "locations");
  add("Package", "salary");
  add("Reports to", "reportsTo");
  add("Incumbent / reference profile", "incumbentNote");
  const brief = (fields.jdNotes ?? "").trim();
  if (brief) lines.push("", "Brief:", brief);
  const extra = (fields.insights ?? "").trim();
  if (extra) lines.push("", "From the meeting:", extra);
  return lines.join("\n");
}

/* ── The role that is not worth searching for (step 4) ─────────── */

/**
 * Why "impractical" needs more than a tick.
 *
 * The owner's rule is that nothing closes without a reason, and this one also
 * ends with a reply to a client and an invitation back - so both the reason
 * and the date have to be real.
 */
export function problemWithImpractical(reason: string, inviteBackAt: number | null, now: number): string | null {
  if (reason.trim().length < 10) {
    return "Write why the role cannot be filled at that package. The client is told this, in kinder words.";
  }
  if (inviteBackAt === null) return "Pick a date to invite them back. A no today is not a no for ever.";
  if (inviteBackAt <= now) return "That date has passed. Pick one in the future.";
  return null;
}

/* ── The position, once TA has the opening (steps 6 to 9) ──────── */

export type PositionStage = "handed_over" | "searching" | "on_hold" | "closed";

export const STAGE_MEANINGS: Record<PositionStage, string> = {
  handed_over: "Handed to TA, waiting for the opening",
  searching: "Open in the TA System",
  on_hold: "On hold",
  closed: "Closed",
};

/**
 * A requirement whose required fields are all written is finished and locked (owner, 17 Nov
 * evening): it is shown, and the forms for it are gone, on the page and in the action.
 * Changes after that go through the client and a new requirement meeting, not an edit.
 */
export function requirementLocked(fields: RequirementFields): boolean {
  return missingFields(fields).length === 0;
}

/**
 * Why the opening cannot be created in TA yet.
 *
 * TA cannot do without the position's name and how many people, so those two are
 * always needed. (Whether the agreement and the requirement are done first is
 * `problemWithOpening`, below.)
 */
export function problemWithHandover(fields: RequirementFields): string | null {
  const blank = (key: string) => !(fields[key] ?? "").trim();
  if (blank("title")) return "Write the position's title first: TA cannot open a role with no name.";
  if (blank("headcount")) return "Say how many people they want. TA cannot open a role without a number.";
  return null;
}

/**
 * Whether the opening may be created now (owner, 17 Nov evening).
 *
 * The 17 Nov morning rule opened roles right after the intro call, and the TA System filled with
 * openings for companies that never agreed to the ESA. So the opening waits for the client's
 * signed copy and a complete requirement; the Director's countersignature need not be there.
 * A client we trust is the exception: on that one lead a person chose "open it now" with a
 * reason, and only the role's name and number are then needed.
 */
export function problemWithOpening(input: {
  esaState: string | null;
  requirementBlanks: string[];
  openEarly: boolean;
  fields: RequirementFields;
}): string | null {
  if (!input.openEarly) {
    const signed = agreementSigned(input.esaState);
    const missing: string[] = [];
    if (!signed) missing.push("the client has not signed the agreement yet");
    if (input.requirementBlanks.length) missing.push("the requirement still has blanks: " + input.requirementBlanks.join(", "));
    if (missing.length) {
      return "Not yet: " + missing.join("; and ") + ". If this is a client you trust, choose \"Open it now, without waiting\" and say why.";
    }
  }
  return problemWithHandover(input.fields);
}

/** Why "open it now, without waiting" needs words: it is the one way past the agreement. */
export function problemWithEarlyOpening(reason: string): string | null {
  if (reason.trim().length < 10) return "Say why this client can be opened for without waiting (a trusted client, who agreed it). It is kept with the lead.";
  return null;
}

/** What the hand-over says on screen once it has happened. */
export function handoverInWords(
  position: { stage: string; openingTaId: string | null; primaryTaId: string | null; hundredPercentDay: string | null },
  queued: boolean,
): string {
  if (!position.openingTaId) {
    return queued
      ? "Handed over. The opening is queued for the TA System and appears here the moment TA confirms it."
      : "Handed over, but nothing is queued for TA - somebody must look at why.";
  }
  const bits = [STAGE_MEANINGS[position.stage as PositionStage] ?? position.stage, "opening " + position.openingTaId];
  if (position.primaryTaId) bits.push("primary TA set");
  if (position.hundredPercentDay) bits.push("100% day " + position.hundredPercentDay);
  return bits.join(" · ");
}

/** One answer to "has the client signed", shared by the hand-over and its checklist so they cannot drift. */
export function agreementSigned(esaState: string | null): boolean {
  return esaState === "signed" || esaState === "countersigned";
}

/**
 * "Before this becomes a role on Positions" (22 Nov): staff saved a requirement and saw no role,
 * because the role is only made when handOverToTa passes. Each line is one of its conditions;
 * the requirement line asks `problemWithOpening` itself, so the checklist and the refusal agree.
 */
export function handoverChecklist(input: {
  intro: { meetings: { state: string }[]; esa: { state: string } | null; skipsIntro: boolean };
  esaState: string | null;
  requirementBlanks: string[];
  openEarly: boolean;
  fields: RequirementFields;
}): { items: { step: "intro" | "agreement" | "requirement"; label: string; done: boolean }[]; ready: boolean } {
  const introDone = introSatisfied(input.intro);
  const named = problemWithHandover(input.fields) === null;
  // Opened early, the signature and the blanks are waived; claiming them would be false.
  const items = [
    { step: "intro" as const, label: "The intro call is held (or the agreement has gone out)", done: introDone },
    input.openEarly
      ? { step: "agreement" as const, label: "Marked to open without waiting (agreement not needed yet)", done: true }
      : { step: "agreement" as const, label: "The client has signed the agreement", done: agreementSigned(input.esaState) },
    input.openEarly
      ? { step: "requirement" as const, label: "The role's name and how many are written", done: named }
      : { step: "requirement" as const, label: "The requirement is complete", done: named && input.requirementBlanks.length === 0 },
  ];
  return { items, ready: introDone && problemWithOpening(input) === null };
}

/**
 * "New position" (23 Nov, the owner): a position for a client we already have, written straight on the
 * Positions page. The agreement is not asked for here (the client page says when it is not signed, and CVs
 * do not go to the client without it); what TA cannot do without is the name, the number and the package.
 */
export function problemWithNewPosition(fields: RequirementFields, clientFound: boolean): string | null {
  if (!clientFound) return "Pick the client this position is for.";
  const handover = problemWithHandover(fields);
  if (handover) return handover;
  if (!(fields.salary ?? "").trim()) return "Write the package details: TA and every candidate ask for them first.";
  return null;
}

/** A currency as it is stored: " lkr" is "LKR". */
export function currencyCode(text: string): string {
  return text.trim().toUpperCase().slice(0, 5);
}

/**
 * The monthly salary typed on "New position" or the positions table (26 Nov, Ops lead): optional, a plain positive number, so the value
 * of a position can be worked out later. "350,000" and "350 000" are read; anything else is refused, never guessed.
 */
export function parseMonthlySalary(text: string): { ok: true; value: number | undefined } | { ok: false; problem: string } {
  const t = text.trim().replace(/[,\s]/g, "");
  if (!t) return { ok: true, value: undefined };
  const n = Number(t);
  if (!/^\d+(\.\d+)?$/.test(t) || !Number.isFinite(n) || n <= 0) return { ok: false, problem: "The monthly salary must be a number, like 350000." };
  return { ok: true, value: n };
}
