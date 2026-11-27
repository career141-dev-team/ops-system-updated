/**
 * Internal hiring (v6 H1 and H2, 19 Nov): Career141's own vacancies and the people applying.
 *
 * The desk holds vacancies and applicants now (`opsVacancies`, `opsApplicants`), and `hiringView` reads them. The
 * invented `hiringSample` is used only on a laptop run with no real vacancy, to check the layout. Nothing here
 * saves anything: the writes are the actions in app/actions.ts.
 *
 * `hiringView` is the one place that reads the desk; everything below is pure.
 */
import { COLOMBO_OFFSET_MS, DAY, isWorkingDay } from "@/lib/calendar";
import { dayWord } from "@/lib/calendarBoard";
import { extensionOf, problemWithUpload } from "@/lib/files";

export type ApplicantStage = "new" | "call" | "fits" | "interview" | "decision" | "hired" | "rejected"
  | "non_responsive" | "not_interested" | "shortlisted" | "offered" | "declined";

export type HiringSection = "calling" | "interviews" | "shortlisted_offered";

export function sectionOfStage(stage: ApplicantStage): HiringSection | null {
  if (stage === "new" || stage === "call" || stage === "fits") return "calling";
  if (stage === "interview") return "interviews";
  if (stage === "shortlisted" || stage === "offered" || stage === "decision") return "shortlisted_offered";
  return null;
}

/** Internal interviews run in up to three rounds (owner, 27 Nov). A row with none recorded is on the first. */
export const LAST_ROUND = 3;
export function roundOf(a: { interviewRound?: number | null }): number {
  return Math.min(LAST_ROUND, Math.max(1, a.interviewRound ?? 1));
}

/** The vacancy board, left to right. Hired and closed people are listed under it. */
export function pipelineColumns<T extends { stage: ApplicantStage; interviewRound?: number | null }>(applicants: T[]): { key: string; label: string; items: T[] }[] {
  const inStage = (...stages: ApplicantStage[]) => applicants.filter((a) => stages.includes(a.stage));
  return [
    { key: "call", label: "Call", items: inStage("new", "call", "fits") },
    ...[1, 2, 3].map((n) => ({ key: "interview" + n, label: "Interview " + n, items: inStage("interview").filter((a) => roundOf(a) === n) })),
    { key: "shortlisted", label: "Shortlisted", items: inStage("shortlisted", "decision") },
    { key: "offered", label: "Offered", items: inStage("offered") },
  ];
}

/** A later round starts with nobody to see them: passing clears the interviewer, and booking writes one. */
export function needsBooking(a: { stage: ApplicantStage; interviewRound?: number | null; draft?: { interviewer?: string } }): boolean {
  return a.stage === "interview" && roundOf(a) > 1 && !a.draft?.interviewer;
}

/** Why "Next round" is refused, or null. `shownRound` is the round the form was drawn for, so a second submit cannot skip one. */
export function problemWithNextRound(a: { stage: string; interviewRound?: number | null }, shownRound: number): string | null {
  if (a.stage !== "interview") return "Only somebody in an interview round can move to the next one.";
  if (roundOf(a) !== shownRound) return "That round is already recorded.";
  if (roundOf(a) >= LAST_ROUND) return "That was the last round. Pick Pass to shortlist them.";
  return null;
}

/** The panel a card's button opens, by the stage it sits in. */
export const STAGE_ACTION: Partial<Record<ApplicantStage, { label: string; panel: "call" | "book-interview" | "add-result" | "decide" | "reject" }>> = {
  new: { label: "Call", panel: "call" },
  call: { label: "Call", panel: "call" },
  fits: { label: "Book an interview", panel: "book-interview" },
  interview: { label: "Add the result", panel: "add-result" },
  decision: { label: "Decide", panel: "decide" },
  shortlisted: { label: "Make offer / decide", panel: "decide" },
  offered: { label: "Record offer outcome", panel: "decide" },
  // Not dead ends (26 Nov): another call reopens them.
  non_responsive: { label: "Call", panel: "call" },
  not_interested: { label: "Call", panel: "call" },
};

export interface Applicant {
  id: string;
  name: string;
  source: string;
  phone: string | null;
  stage: ApplicantStage;
  /** When the CV came, or the last step happened: how long they have waited counts from here. */
  since: number;
  /** The one line on the card ("CV came 18 Nov", "No answer 17 Nov · try 2 of 3"). */
  detail: string;
  /** Called and tried so far, of 3. */
  tries?: number;
  interviewRound?: number | null;
  /** The kept CV file (22 Nov: hiring had nowhere to put one); null until someone adds it. */
  cvFileId?: string | null;
  /** Why they were rejected and the stage they were in then (23 Nov), so the rejected list can say which kind. */
  rejectReason?: string | null;
  rejectedAtStage?: string | null;
  /** What a Scoop CV gives, and what Ops fills after the call (23 Nov). */
  email?: string | null;
  nic?: string | null;
  targetPosition?: string | null;
  packageSaid?: string | null;
  laptop?: string | null;
  /** Nov 25 meeting (PR 7): caller who claimed this applicant, and call answers. */
  callerId?: string | null;
  currentSalary?: string | null;
  expectedSalary?: string | null;
  availability?: string | null;
  notInterestedReason?: string | null;
  /** What the later panels draw their messages from; absent until it is known. */
  draft?: { interviewAt?: number; interviewer?: string; place?: string; startDate?: string; salary?: string; replyBy?: string; interviewers?: string };
}

export type VacancySource = "scoop" | "job_post" | "referral";

export interface Vacancy {
  id: string;
  title: string;
  places: number;
  filled: number;
  postedAt: number;
  status: "open" | "on_hold";
  source?: VacancySource;
  sourceDetail?: string;
  /** On hold: since when, who restarts it, and the CVs kept meanwhile. */
  hold?: { since: number; who: string; keptCvs: number };
  applicants: Applicant[];
  /** The 6 things to check on the first call. */
  checks: string[];
  /** Who is free to interview and when, per round, as the team entered it. */
  freeTimes?: { who: string; round: string; times: number[] }[];
}

export interface InternalSlot {
  at: number;
  name: string;
  line: string;
}

export interface HiringView {
  vacancies: Vacancy[];
  slots: InternalSlot[];
  hiredThisMonth: { title: string; at: number }[];
}

export const EMPTY_HIRING: HiringView = { vacancies: [], slots: [], hiredThisMonth: [] };

/**
 * The view of internal hiring (19 Nov).
 *
 * Reads real `db.vacancies` and `db.applicants` when present; falls back to `sample` only when
 * no real vacancies exist yet (so dev preview and existing tests continue working cleanly).
 */
export function hiringView(db: unknown, sample: HiringView | null): HiringView {
  const snap = db as { vacancies?: import("@/data/types").OpsVacancy[]; applicants?: import("@/data/types").OpsApplicant[] } | null;
  if (snap?.vacancies && snap.vacancies.length > 0) {
    const apps = snap.applicants ?? [];
    const vacancies: Vacancy[] = snap.vacancies.map((v) => {
      const mine = apps.filter((a) => a.vacancyId === v.id);
      return {
        id: v.id,
        title: v.title,
        places: v.places,
        filled: v.filled,
        postedAt: v.postedAt,
        status: v.status,
        ...(v.source ? { source: v.source } : {}),
        ...(v.sourceDetail ? { sourceDetail: v.sourceDetail } : {}),
        checks: v.checks,
        applicants: mine.map((a) => ({
          id: a.id,
          name: a.name,
          source: a.source,
          phone: a.phone,
          stage: a.stage,
          since: a.updatedAt,
          detail: a.detail,
          tries: a.tries,
          interviewRound: a.interviewRound ?? null,
          cvFileId: a.cvFileId,
          rejectReason: a.rejectReason,
          rejectedAtStage: a.rejectedAtStage ?? null,
          email: a.email,
          nic: a.nic ?? null,
          targetPosition: a.targetPosition ?? null,
          packageSaid: a.packageSaid ?? null,
          laptop: a.laptop ?? null,
          callerId: a.callerId ?? null,
          currentSalary: a.currentSalary ?? null,
          expectedSalary: a.expectedSalary ?? null,
          availability: a.availability ?? null,
          notInterestedReason: a.notInterestedReason ?? null,
          draft: {
            interviewAt: a.interviewAt ?? undefined,
            interviewer: a.interviewer ?? undefined,
            place: a.place ?? undefined,
            startDate: a.startDate ?? undefined,
            salary: a.salary ?? undefined,
          },
        })),
      };
    });
    const slots: InternalSlot[] = apps
      .filter((a) => ["interview", "shortlisted", "offered", "decision"].includes(a.stage) && a.interviewAt)
      .map((a) => {
        const v = snap.vacancies!.find((x) => x.id === a.vacancyId);
        return {
          at: a.interviewAt!,
          name: a.name,
          line: [v?.title, a.place, a.interviewer].filter(Boolean).join(" · "),
          vacancyId: a.vacancyId,
        };
      })
      .sort((a, b) => a.at - b.at);
    const hiredThisMonth = apps
      .filter((a) => a.stage === "hired")
      .map((a) => {
        const v = snap.vacancies!.find((x) => x.id === a.vacancyId);
        return { title: v?.title ?? a.name, at: a.updatedAt };
      });
    return { vacancies, slots, hiredThisMonth };
  }
  return sample ?? EMPTY_HIRING;
}

export function problemWithVacancy(title: string, places: number, source?: VacancySource, sourceDetail = ""): string | null {
  if (title.trim().length < 2) return "Write the vacancy title.";
  if (source === "referral" && sourceDetail.trim().length < 2) return "Write who referred it.";
  if (!Number.isInteger(places) || places < 1 || places > 50) return "Places must be a whole number from 1 to 50.";
  return null;
}

export function problemWithApplicant(name: string, source: string): string | null {
  if (name.trim().length < 2) return "Write the applicant's full name.";
  if (!source.trim()) return "Say where this CV came from.";
  return null;
}

/** The most a CV may be (22 Nov). Below the 25 MB the file store allows: a CV is text; a bigger one is a scan. */
export const MAX_CV_BYTES = 10 * 1024 * 1024;

/** A CV is a document the team reads: PDF or Word, within the size above (22 Nov). */
export function problemWithCv(file: { name: string; size: number }): string | null {
  const ext = extensionOf(file.name);
  if (ext && ![".pdf", ".doc", ".docx"].includes(ext)) return "A CV must be a PDF or a Word file.";
  if (file.size > MAX_CV_BYTES) return "That CV is bigger than 10 MB. Save it smaller, or as a PDF, and add it again.";
  return problemWithUpload(file);
}

/** The name can lie; the first bytes cannot: %PDF, PK (docx) or D0CF11E0 (old .doc). */
export function problemWithCvBytes(bytes: Uint8Array): string | null {
  const is = (...b: number[]) => b.every((x, i) => bytes[i] === x);
  return is(0x25, 0x50, 0x44, 0x46) || is(0x50, 0x4b) || is(0xd0, 0xcf, 0x11, 0xe0) ? null : "That file is not a real PDF or Word file. Open it, save it again as a PDF, and add it again.";
}

/** The call result that closes the applicant without an interview (22 Nov, ops team: "can we reject without an interview?"). */
export const CALL_NOT_FIT = "Talked - not a fit";

export const NOT_INTERESTED_REASONS = ["Too expensive", "Got another offer", "Other"] as const;

/** Leadership never makes the first call; only active ops team members can claim/call applicants (26 Nov). */
export function isHiringCaller(member: { role: string; active: boolean }): boolean {
  return member.active && (member.role === "ops_owner" || member.role === "ops_lead" || member.role === "admin");
}

/** Human-readable vacancy source badge ("Scoop 1", "Job post · TopJobs", "Referral · Asma"). */
export function vacancySourceLabel(v: { source?: VacancySource; sourceDetail?: string }): string {
  if (!v.source) return "";
  const detail = (v.sourceDetail ?? "").trim();
  if (v.source === "scoop") return detail || "Scoop";
  if (v.source === "job_post") return detail ? `Job post · ${detail}` : "Job post";
  return detail ? `Referral · ${detail}` : "Referral";
}

/** Filter applicants by claimed callerId when "Mine" is active. */
export function filterByCaller<T extends { callerId?: string | null }>(applicants: T[], callerId: string | null): T[] {
  if (!callerId) return applicants;
  return applicants.filter((a) => a.callerId === callerId);
}

/** Next working day at 16:00 Colombo time (the default leadership interview slot, 26 Nov). */
export function defaultHiringInterviewAt(now: number, holidays: string[] = []): number {
  const local = new Date(now + COLOMBO_OFFSET_MS);
  for (let offset = 1; offset <= 14; offset++) {
    const dayStartUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + offset) - COLOMBO_OFFSET_MS;
    if (isWorkingDay(dayStartUtc, holidays)) {
      return dayStartUtc + 16 * 3_600_000;
    }
  }
  return now + DAY;
}

/** Format a timestamp as `YYYY-MM-DDTHH:MM` in Colombo time for `<input type="datetime-local">`. */
export function colomboDateTimeInput(at: number): string {
  return new Date(at + COLOMBO_OFFSET_MS).toISOString().slice(0, 16);
}

/** Leadership interviewers from `hiring.interviewers` setting, falling back to active director_ops / ops_lead members. */
export function hiringInterviewersFrom(settingValue: string, members: { name: string; role: string; active: boolean }[]): string[] {
  const fromSetting = settingValue
    .split(",")
    .map((s) => s.trim())
    // Desks seeded before 26 Nov hold job titles here, which were written into candidate email as names.
    .filter((s) => s && s !== "Director of Operations" && s !== "Ops Lead");
  if (fromSetting.length > 0) return fromSetting;
  return members
    .filter((m) => m.active && (m.role === "director_ops" || m.role === "ops_lead"))
    .map((m) => m.name);
}

/** Not a fit rejects, so it needs a reason like every other reject; Not interested needs a reason too (26 Nov). */
export function problemWithHiringCall(result: string, note: string, notInterestedReason = ""): string | null {
  if (result === CALL_NOT_FIT && note.trim().length < 4) return "Write the reason in the note before marking not a fit.";
  if (result === "Not interested") {
    if (!notInterestedReason.trim()) return "Pick why they are not interested.";
    if (notInterestedReason === "Other" && note.trim().length < 4) return "Write the reason in the note when picking Other.";
  }
  return null;
}

/** Calling somebody who was closed as non-responsive or not interested reopens them, with three fresh tries. */
export function triesSoFar(stage: string, tries: number): number {
  return stage === "non_responsive" || stage === "not_interested" ? 0 : tries;
}

/** Interview invite drafts for this applicant that must not be approved once the booking changes or they are closed. */
export function staleInvites<M extends { state: string; templateKey?: string | null; subjectType: string | null; subjectId: string | null }>(messages: M[], applicantId: string): M[] {
  return messages.filter((m) => m.state === "draft" && m.templateKey === "hiring.interview_invite" && m.subjectType === "applicant" && m.subjectId === applicantId);
}

/** Pure stage transition for a screening call outcome (26 Nov). */
export function callOutcomeTransition(input: {
  result: string;
  currentTries: number;
  note: string;
  notInterestedReason?: string;
}): { stage: ApplicantStage; tries: number; detail: string; notInterestedReason?: string; rejectReason?: string | null } {
  const tries = input.currentTries + 1;
  const note = input.note.trim();
  if (input.result === CALL_NOT_FIT) {
    return { stage: "rejected", tries, detail: `Rejected after call: ${note}`, rejectReason: note };
  }
  if (input.result === "Not interested") {
    const why = input.notInterestedReason === "Other" && note ? note : (input.notInterestedReason || note);
    return { stage: "not_interested", tries, detail: `Not interested · ${why}`, notInterestedReason: why };
  }
  if (input.result === "Non-responsive") {
    return { stage: "non_responsive", tries, detail: `Non-responsive · ${tries} ${tries === 1 ? "try" : "tries"}` };
  }
  if (input.result === "Scheduled" || input.result === "Talked" || input.result === "Fits") {
    return { stage: "fits", tries, detail: `Scheduled / fits${note ? " — " + note : ""}` };
  }
  if (tries >= 3) {
    return { stage: "non_responsive", tries, detail: "Non-responsive · 3 of 3 tries" };
  }
  // The choice on the form already says "(try 1 of 3)"; it is said once.
  return { stage: "call", tries, detail: `${input.result.replace(/\s*\(try [^)]*\)/, "")} · try ${tries} of 3` };
}

/**
 * "2026-11-22T10:45" typed on the form is Colombo time (22 Nov). It was read in the server's own
 * zone, so on a UTC server every interview was saved 5h30 late. (The exact "Sun 05:15" the team
 * reported was not reproduced.) NaN when it is not a date.
 */
export function colomboLocalToMs(typed: string): number {
  const t = typed.trim();
  return Date.parse(t + (/T\d\d:\d\d$/.test(t) ? ":00" : "") + "+05:30");
}

export function problemWithHiringDecision(decision: string, reason: string): string | null {
  if (!["hire", "hold", "reject", "offer", "accept", "decline"].includes(decision)) {
    return "Pick Offer, Accept, Decline, Hire, Hold, or Reject.";
  }
  if ((decision === "reject" || decision === "decline") && reason.trim().length < 4) {
    return decision === "decline" ? "Write why the offer was declined." : "Write the reason before rejecting.";
  }
  return null;
}

/** A closed applicant takes no further decision (a second Accept would fill a second place); offers only after the interview. */
export function problemWithDecisionStage(decision: string, stage: ApplicantStage): string | null {
  if (stage === "hired" || stage === "rejected" || stage === "declined") return "That applicant is already closed.";
  if (decision !== "reject" && stage !== "shortlisted" && stage !== "offered" && stage !== "decision") return "Only a shortlisted or offered applicant can take that decision.";
  return null;
}

/** Pure transition for Shortlisted -> Offered -> Accepted / Declined (26 Nov). */
export function offerOutcomeTransition(input: {
  decision: string;
  startDate: string | null;
  salary: string | null;
  reason: string;
  currentStage?: ApplicantStage;
}): { stage: ApplicantStage; incrementsFilled: boolean; detail: string; rejectReason: string | null } {
  if (input.decision === "offer") {
    return {
      stage: "offered",
      incrementsFilled: false,
      detail: `Offered${input.salary ? " · " + input.salary : ""}${input.startDate ? " · starts " + input.startDate : ""}`,
      rejectReason: null,
    };
  }
  if (input.decision === "accept" || input.decision === "hire") {
    return {
      stage: "hired",
      incrementsFilled: true,
      detail: `Accepted${input.startDate ? " · starts " + input.startDate : ""}`,
      rejectReason: null,
    };
  }
  if (input.decision === "decline") {
    return {
      stage: "declined",
      incrementsFilled: false,
      detail: `Declined: ${input.reason}`,
      rejectReason: input.reason,
    };
  }
  if (input.decision === "reject") {
    return {
      stage: "rejected",
      incrementsFilled: false,
      detail: `Rejected: ${input.reason}`,
      rejectReason: input.reason,
    };
  }
  // Hold leaves them where they are: an offer already made stays made.
  const stage = input.currentStage ?? "shortlisted";
  const detail = stage === "offered" ? "Offered · on hold" : stage === "decision" ? "Decision · on hold" : "Shortlisted · on hold";
  return { stage, incrementsFilled: false, detail, rejectReason: null };
}

/**
 * Which kind of rejection it was (23 Nov): somebody turned away before an interview is a screening
 * reject, after it a final reject. A row from before the stage was kept has none, and counts as screening
 * only if it never reached an interview, which is all we can say.
 */
export type RejectKind = "screening" | "final";
export const REJECT_KIND_LABEL: Record<RejectKind, string> = { screening: "Screening reject", final: "Final reject" };

export function rejectKind(atStage: string | null | undefined): RejectKind {
  return atStage === "interview" || atStage === "decision" || atStage === "shortlisted" || atStage === "offered" ? "final" : "screening";
}

/** The rejected people of a vacancy, split by kind, newest first. */
export function rejectedByKind(applicants: Applicant[]): Record<RejectKind, Applicant[]> {
  const out: Record<RejectKind, Applicant[]> = { screening: [], final: [] };
  for (const a of applicants.filter((x) => x.stage === "rejected").sort((x, y) => y.since - x.since)) {
    out[rejectKind(a.rejectedAtStage)].push(a);
  }
  return out;
}

export function countOf(v: Vacancy, stage: ApplicantStage): number {
  return v.applicants.filter((a) => a.stage === stage).length;
}

export function vacancyById(view: HiringView, id: string): Vacancy | null {
  return view.vacancies.find((v) => v.id === id) ?? null;
}

/** The CVs nobody has looked at, the calls to make (new and called-but-no-answer), the rest as they stand. */
export function totals(view: HiringView, now: number) {
  const open = view.vacancies.filter((v) => v.status === "open");
  const all = open.flatMap((v) => v.applicants);
  const toCallList = all.filter((a) => a.stage === "call" || a.stage === "new");
  const oldest = toCallList.length ? Math.max(...toCallList.map((a) => daysSince(a.since, now))) : 0;
  const interviews = all.filter((a) => a.stage === "interview");
  const monthStart = startOfMonth(now);
  const hired = view.hiredThisMonth.filter((h) => h.at >= monthStart).sort((a, b) => b.at - a.at);
  return {
    newCvs: all.filter((a) => a.stage === "new").length,
    newCvVacancies: open.filter((v) => countOf(v, "new") > 0).length,
    toCall: toCallList.length,
    oldestDays: oldest,
    interview: interviews.length,
    // Waiting for us: shortlisted waits for an offer. Offered waits for the candidate.
    decision: all.filter((a) => a.stage === "decision" || a.stage === "shortlisted").length,
    hiredThisMonth: hired.length,
    lastHire: hired[0] ?? null,
  };
}

/** Whole Colombo days from `from` to `to`, never negative. */
export function daysSince(from: number, to: number): number {
  const day = (t: number) => Math.floor((t + COLOMBO_OFFSET_MS) / DAY);
  return Math.max(0, day(to) - day(from));
}

/** The interviews of this Colombo week, Monday to Sunday. The view holds every week's. */
export function slotsThisWeek(slots: InternalSlot[], now: number): InternalSlot[] {
  const d = new Date(now + COLOMBO_OFFSET_MS);
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)) - COLOMBO_OFFSET_MS;
  return slots.filter((s) => s.at >= monday && s.at < monday + 7 * DAY);
}

function startOfMonth(now: number): number {
  const d = new Date(now + COLOMBO_OFFSET_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - COLOMBO_OFFSET_MS;
}

/** The dark card on the right of the vacancies: the one thing that stands, in a sentence. */
export function whereItStands(view: HiringView, now: number): { headline: string; body: string; open: { id: string; title: string } | null } {
  const t = totals(view, now);
  if (view.vacancies.length === 0) return { headline: "No vacancies yet.", body: "Add a vacancy and the people applying for it will wait here.", open: null };
  const open = view.vacancies.filter((v) => v.status === "open");
  const busiest = [...open].sort((a, b) => countOf(b, "call") + countOf(b, "new") - (countOf(a, "call") + countOf(a, "new")))[0] ?? null;
  const onHold = view.vacancies.filter((v) => v.status === "on_hold");
  const parts: string[] = [];
  if (busiest && t.toCall > 0) parts.push(`${countOf(busiest, "call") + countOf(busiest, "new")} of them applied for ${busiest.title}.`);
  if (t.decision > 0) parts.push(`${t.decision} ${t.decision === 1 ? "decision is" : "decisions are"} waiting for you.`);
  if (onHold.length) parts.push(`${onHold.map((v) => v.title).join(" and ")} ${onHold.length === 1 ? "is" : "are"} on hold.`);
  return {
    headline: t.toCall === 0 ? "Nobody waits for a call." : `${t.toCall} ${t.toCall === 1 ? "person waits" : "people wait"} for a call.`,
    body: parts.join(" "),
    open: busiest ? { id: busiest.id, title: busiest.title } : null,
  };
}

/** The "Why now" lines of a panel, from what is known. Only things that are true are said. */
export function whyNow(v: Vacancy, a: Applicant, now: number): string[] {
  const lines: string[] = [];
  const waited = daysSince(a.since, now);
  if (a.stage === "new" || a.stage === "call") {
    lines.push(`The CV came in on ${dayWord(a.since)}, through ${a.source}`);
    lines.push(a.tries ? `Try ${a.tries} of 3` : "Try 1 of 3. Nobody has called yet");
    if (v.checks.length) lines.push(`The role needs ${v.checks.length} things checked before an interview`);
  } else if (a.stage === "fits") {
    lines.push(`Called on ${dayWord(a.since)} and fits`);
    lines.push(waited === 0 ? "No interview time yet" : `Has waited ${waited} ${waited === 1 ? "day" : "days"} with no interview time yet`);
  } else if (a.stage === "interview") {
    lines.push(`Add this after the interview on ${dayWord(a.since)}`);
    lines.push("Add the result the same day so the next step is not lost");
  } else if (a.stage === "decision") {
    lines.push(`Waiting for a decision for ${waited} ${waited === 1 ? "day" : "days"}`);
  }
  lines.push(`${v.title} has ${v.places} ${v.places === 1 ? "place" : "places"} and ${v.filled === 0 ? "none is" : v.filled + " " + (v.filled === 1 ? "is" : "are")} filled`);
  return lines;
}

/** The words on the first line of a vacancy card: "2 places · 28 applicants · posted 3 Nov". */
export function vacancyLine(v: Vacancy): string {
  const places = `${v.places} ${v.places === 1 ? "place" : "places"}`;
  const src = vacancySourceLabel(v);
  const head = src ? `${src} · ${places}` : places;
  if (v.status === "on_hold" && v.hold) return `${head} · ${v.hold.keptCvs} CVs kept · on hold since ${dayWord(v.hold.since).slice(4)}`;
  return `${head} · ${v.applicants.length} applicants · posted ${dayWord(v.postedAt).slice(4)}`;
}

/** Drafts the team copies by hand. A draft is only made when every fact in it is known; otherwise null. */
export function inviteMessage(a: Applicant, role: string): string | null {
  const d = a.draft;
  if (!d?.interviewAt || !d.interviewer || !d.place) return null;
  const when = `${dayWord(d.interviewAt)} at ${new Date(d.interviewAt + COLOMBO_OFFSET_MS).toISOString().slice(11, 16)}`;
  return `Hello ${first(a.name)}, we would like to meet you for an interview for ${role}, with ${d.interviewer} on ${when} at ${d.place}. Please reply to confirm. Thank you`;
}

export function rejectMessage(a: Applicant, role: string, afterCall = false): string {
  return `Hello ${first(a.name)}, thank you for ${afterCall ? "speaking with us" : "meeting us"} for ${role}. We will not go further this time. We wish you well. Thank you`;
}

export function offerLetter(a: Applicant, role: string): string | null {
  const d = a.draft;
  if (!d?.startDate || !d.salary || !d.replyBy) return null;
  return `Dear ${first(a.name)}, we are pleased to offer you the post of ${role} at Career141, starting ${d.startDate}, at ${d.salary}. Please sign and return this letter by ${d.replyBy}. Thank you`;
}

export function first(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** The fields the real backend must hold; the screens' forms stay disabled until then. */
export const HIRING_BACKEND_GAPS = "vacancies, applicants, calls, interviews, results and decisions";

/** The laptop answer is one of three, so the table can be counted: yes, no, or not asked yet. */
export const LAPTOP_ANSWERS = ["", "Yes", "No"] as const;

/** What is wrong with the details typed after a call, or null. Every field is optional; one that is typed must look right. */
export function problemWithApplicantDetails(d: { email: string; nic: string; phone: string; laptop: string }): string | null {
  if (d.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) return "That email address does not look like one.";
  if (d.nic.trim() && !/^(\d{9}[VvXx]|(19|20)\d{10})$/.test(d.nic.trim())) return "An NIC is nine digits and a V, or twelve digits.";
  if (d.phone.trim() && d.phone.replace(/\D/g, "").length < 9) return "That phone number is too short.";
  if (!(LAPTOP_ANSWERS as readonly string[]).includes(d.laptop)) return "Laptop is Yes, No, or left empty.";
  return null;
}
