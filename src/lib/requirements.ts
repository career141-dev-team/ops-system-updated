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
 * Why the opening cannot be created in TA yet.
 *
 * The first check is the owner's hard rule: no search before the agreement is
 * signed. The second is this phase's own: TA cannot be handed a requirement
 * that is half written, because the TAs would fill the gaps by guessing.
 */
export function problemWithHandover(esaState: string | null, fields: RequirementFields): string | null {
  if (esaState !== "signed" && esaState !== "countersigned") {
    return esaState === null
      ? "This client has no agreement on our side, so no opening can be created."
      : "The agreement is not signed yet, so the search is blocked. Nothing goes to TA until it is.";
  }
  return problemWithRequirement(fields);
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
