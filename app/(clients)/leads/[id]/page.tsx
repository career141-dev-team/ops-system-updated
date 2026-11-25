import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  bookIntroCall,
  bookRequirementMeeting,
  checkLeadDuplicate,
  chooseLeadMatch,
  markLeadNewClient,
  closeLead,
  decideLeadIndustry,
  declineAgreement,
  dictateRequirement,
  readRequirementFromCall,
  draftNextChase,
  markMeetingHeld,
  markMeetingNotHeld,
  openEarly,
  previewAgreement,
  recordAgreementCountersigned,
  recordAgreementSigned,
  recordChangesWanted,
  saveRequirement,
  sendAgreement,
  startAgreement,
} from "@/app/actions";
import AiOffer from "@/app/AiOffer";
import Sheet from "@/app/(clients)/Sheet";
import Dictate from "@/app/Dictate";
import Icon from "@/app/Icon";
import RequirementDecisionClient from "@/app/(clients)/leads/[id]/RequirementDecisionClient";
import {
  Avatar,
  BackBar,
  FoldRow,
  NextStepCard,
  
  RelatedLinks,
  StatusChip,
  ViewPills,
  figmaField,
  figmaLabel,
  pillDanger,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import {
  agreementForLead,
  aiSwitches,
  desk,
  leadIn,
  meetingsForLead,
  member as memberIn,
  numberOf,
  requirementForLead,
  switchedOn,
  templateFor,
} from "@/data/desk";
import { currentTemplate, safeName } from "@/lib/files";
import { REFUND_PCT } from "@/lib/guarantee";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { type DictatedRequirement } from "@/lib/aiTasks";
import {
  type EsaState,
  STATE_MEANINGS as ESA_STATES,
  chaseStep,
  ESA_FIELDS,
  agreementVersions,
  coverEmail,
  missingFields,
  nextDraftVersion,
  startingFields,
  whereItStands,
} from "@/lib/esa";
import { SOURCE_MEANINGS, STATE_MEANINGS, existingClientOf, introSatisfied, type LeadState } from "@/lib/leads";
import {
  KIND_MEANINGS,
  MAX_REBOOKS,
  STATE_MEANINGS as MEETING_STATES,
  type MeetingKind,
  type MeetingState,
} from "@/lib/meetings";
import { positionStanding, relatedWork } from "@/data/journeyOf";
import { STAGES } from "@/lib/journey";
import { doneLine, flowOf } from "@/lib/leadFlow";
import {
  LEAD_STEPS,
  LEAD_STEP_LABELS,
  type LeadStep,
  askedStep,
  leadJourney,
  stepToShow,
} from "@/lib/leadJourney";
import { meetingWeek } from "@/lib/calendarBoard";
import { outlookNote } from "@/lib/outlookNote";
import { teamsFake } from "@/lib/graphCalendar";
import { KeepFields } from "@/app/ui/KeepFields";
import { AgreementVersions, DraftDocument } from "@/app/ui/AgreementVersions";
import { FieldList } from "@/app/ui/FieldList";
import { MeetingOutcome } from "@/app/ui/MeetingOutcome";
import { Answer, SubmitButton } from "@/app/ui/SubmitButton";
import { AgreementFieldsForm } from "./AgreementFieldsForm";
import { CoverEmailPreview } from "./CoverEmailPreview";
import { MeetingBookingForm } from "./MeetingBookingForm";
import { leadNextStep } from "@/lib/nextStep";
import { actionInWords } from "@/lib/auditWords";
import { REQUIREMENT_FIELDS, briefText, handoverChecklist, missingFields as requirementBlanksOf, requirementLocked } from "@/lib/requirements";
import { can, refusal } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { fakeTa, people as taPeople } from "@/lib/ta";

/**
 * Unified Lead Record & Sub-views:
 *   - Frame 1:484  — CL · Lead — Lankaweave Textiles (agreement in progress / default lead)
 *   - Frame 1:3443 — CL · Lead — Sapphire Finance (decline / industry check)
 *   - Frame 1:666  — CL · Agreement — Orion Pharmaceuticals (countersign / agreement view, ?view=agreement)
 *   - Frame 1:2050 — CL · Requirement meeting — Delmege Interiors (open the position, ?view=requirement)
 */
function renderInviteOutcome(inv: { state: string; to: string[]; note: string | null } | undefined) {
  if (!inv) return null;
  if (inv.state === "sent") {
    return (
      <p className="text-[13px] text-ink-soft">
        Invite sent to {inv.to.join(", ")}
        {inv.note ? ` — ${inv.note}` : ""}
      </p>
    );
  }
  if (inv.state === "draft") {
    return (
      <p className="text-[13px] text-ink-soft">
        Invite waiting in To approve (for {inv.to.join(", ")}).
      </p>
    );
  }
  return (
    <p className="text-[13px] text-warn">
      Invite not sent ({inv.state}): {inv.note ?? "no reason recorded."}
    </p>
  );
}

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; at?: string; proposed?: string; runId?: string; view?: string; step?: string; near?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { id } = await params;
  const { msg, at, proposed: proposedJson, view, step: stepParam, near: nearJson } = await searchParams;

  const db = await desk();
  const lead = leadIn(db, id);
  if (!lead) notFound();

  const mayManage = can(member, "client.manage");
  const dictated: DictatedRequirement | null = proposedJson
    ? (JSON.parse(proposedJson) as DictatedRequirement)
    : null;
  // The close matches from "Check the TA System"; a bad link just shows none.
  let nearMatches: { id: string; name: string }[] = [];
  try {
    const parsed: unknown = nearJson ? JSON.parse(nearJson) : [];
    if (Array.isArray(parsed)) nearMatches = parsed.filter((c) => typeof c?.id === "string" && typeof c?.name === "string");
  } catch {}
  const aiOn = anyKeySet() && aiSwitches(db).on;
  const whyAiOff = aiOffReason(anyKeySet(), aiSwitches(db).on);

  const nameOf = (who: string | null) =>
    who ? (memberIn(db, who)?.name ?? "somebody") : "nobody";
  const ownerName = nameOf(lead.ownerId);
  const closed = lead.state.startsWith("closed") || lead.state === "declined_industry";

  const meetings = meetingsForLead(db, lead.id);
  const nextBooked = meetings.find((m) => m.state === "booked") ?? null;
  const introMeetings = meetings.filter((m) => m.kind === "intro");
  const requirementMeeting = meetings.find((m) => m.kind === "requirement") ?? null;

  const teamsOn = teamsFake() || switchedOn(db, "switch.teamsEnabled");
  const taSide = await taPeople();
  const taPeopleList = taSide.ok ? taSide.data.filter((p) => p.isActive) : [];

  const now = Date.now();
  const whenLocal = (at: number) =>
    new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const whenDate = (at: number) =>
    new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);

  const esa = agreementForLead(db, lead.id);
  // What a new agreement would start from, so the intro call's form opens filled in.
  const startAgreementFields = startingFields(
    {
      guaranteeDays: numberOf(db, "guarantee.days", 90),
      paymentDays: numberOf(db, "invoice.dueDays", 30),
      replacementWorkingDays: numberOf(db, "replacement.workingDays", 60),
      refundPct: numberOf(db, "refund.pct", REFUND_PCT),
    },
    lead,
  );
  // A Director's lead, or a client we already had, has no intro call (and maybe no agreement) to do.
  const known = existingClientOf(lead, meetings, esa);
  const introHeldOrSkipped = known.skipsIntro || meetings.some((m) => m.kind === "intro" && m.state === "held");
  const coverPreview = esa ? coverEmail(templateFor(db, "esa.cover"), esa.fields) : null;
  const esaMissing = esa ? missingFields(esa.fields) : [];
  const esaTemplate = currentTemplate(db.files, "esa_draft");
  const nextChase = esa ? chaseStep(esa.chaseStep + 1) : null;
  const agreementDone = esa?.state === "signed" || esa?.state === "countersigned" || known.signedOnFile;

  const requirement = requirementForLead(db, lead.id);
  const requirementBlanks = requirement ? requirementBlanksOf(requirement.fields) : [];
  // The opening waits for the client's signed copy and a complete requirement (owner, 17 Nov evening),
  // unless this lead was marked "open it now" for a client we trust.
  // A finished step is shown, not edited (owner, 17 Nov evening).
  const requirementDone = !!requirement && requirementLocked(requirement.fields);
  const openedEarly = !!lead.openEarlyAt;
  // The opening's own gate is the action's: the button shows exactly when handOverToTa would accept (22 Nov).
  const introAccepted = introSatisfied({ meetings, esa, skipsIntro: known.skipsIntro });
  const checklist = handoverChecklist({
    intro: { meetings, esa, skipsIntro: known.skipsIntro },
    esaState: known.signedOnFile ? "signed" : (esa?.state ?? null),
    requirementBlanks: requirementBlanks.map((f) => f.label.toLowerCase()),
    openEarly: openedEarly,
    fields: requirement?.fields ?? {},
  });
  const openingReady = introAccepted && agreementDone && !!requirement && requirementBlanks.length === 0;
  const roleKnown = !!(requirement?.fields.title ?? "").trim() && !!(requirement?.fields.headcount ?? "").trim();
  const position = requirement
    ? (db.positions.find((p) => p.requirementId === requirement.id) ?? null)
    : null;

  const signedFiles = db.files.filter((f) => f.kind === "esa_signed");
  const countersignedFiles = db.files.filter((f) => f.kind === "esa_countersigned");
  const draftFiles = esa
    ? db.files.filter(
        (f) => (f.subjectType === "esa" && f.subjectId === esa.id) || f.id === esa.signedFileId || f.id === esa.countersignedFileId,
      )
    : [];
  const newestDraft = esa ? (agreementVersions(draftFiles)[0] ?? null) : null;
  // The cover email that went (or is waiting to go) with the ESA, for the record on the intro step.
  const sentEmail = esa?.sentMessageId ? (db.messages.find((m) => m.id === esa.sentMessageId) ?? null) : null;

  const step = leadNextStep(lead, {
    meetings,
    esa,
    requirement,
    position,
    requiredFields: REQUIREMENT_FIELDS.filter((f) => f.required).map((f) => f.key),
  });

  // Progress comes from what has happened (src/lib/leadJourney.ts), never from the
  // step being viewed; the step only marks "you are here".
  const requirementMeetingHeld = meetings.some(
    (m) => (m.kind === "requirement" || m.alsoRequirement) && m.state === "held",
  );
  const progress = leadJourney({
    closed,
    leadState: lead.state,
    clientTaId: lead.clientTaId,
    industryFlagged: lead.industryFlagged,
    industryConfirmedBy: lead.industryConfirmedBy,
    skipsIntro: known.skipsIntro,
    agreementOnFile: known.signedOnFile,
    introBooked: meetings.some((m) => m.kind === "intro" && m.state === "booked"),
    introHeld: meetings.some((m) => m.kind === "intro" && m.state === "held"),
    positionExists: !!position,
    openEarly: !!lead.openEarlyAt,
    esaState: esa?.state ?? null,
    requirementStarted:
      Object.values(requirement?.fields ?? {}).some((v) => (v ?? "").trim()) ||
      meetings.some((m) => m.kind === "requirement" && m.state === "booked") ||
      requirementMeetingHeld,
    requirementDone: !!requirement && requirementBlanks.length === 0,
  });

  // One step at a time (17 Nov): the step a link asks for, or the first not finished.
  const shown = stepToShow(askedStep(stepParam, view), progress);
  const flagged = lead.industryFlagged && !lead.industryConfirmedBy && !closed;
  const activeView: "enquiry" | "decline" | "intro" | "opening" | "agreement" | "requirement" =
    shown === "enquiry" ? (flagged || view === "decline" ? "decline" : "enquiry") : shown;
  const stepHref = (to: LeadStep) => `/leads/${lead.id}?step=${to}`;
  // The global "up next" card shows only on the step it is about.
  const upNextOn: LeadStep | null =
    step.at === "duplicate" || step.at === "industry" || step.at === "closed"
      ? "enquiry"
      : step.at === "intro"
        ? "intro"
        : step.at === "opening"
          ? "opening"
          : null;

  // The pieces of this client's work that exist, as plain links (18 Nov: no progress bar), and the five
  // sections of this lead as free tabs; the ones the backend says are next carry a small dot.
  const related = relatedWork(db, { leadId: lead.id });
  // After the opening the work goes on the opening's own page; this says where it stands (the Work board's answer).
  const standing = position ? positionStanding(db, position) : null;
  const standingWhat = standing ? (STAGES.find((s) => s.key === standing.stage)?.what ?? standing.stage) : "";
  // The dot is the backend's own answer (leadNextStep), the same one the card says, so the two cannot differ.
  const nextAt: LeadStep | null =
    step.at === "duplicate" || step.at === "industry" ? "enquiry" : (LEAD_STEPS.find((s) => s === step.at) ?? null);

  // The flow (18 Nov): the step now, a second one beside it, and one line for each finished step.
  const flow = flowOf(progress);
  const heldIntro = meetings.filter((m) => m.kind === "intro" && m.state === "held").sort((a, b) => (b.heldAt ?? 0) - (a.heldAt ?? 0))[0];
  const doneFacts = {
    existingClient: !!lead.clientTaId && known.skipsIntro && lead.source !== "director",
    skipsIntro: known.skipsIntro,
    introHeldAt: heldIntro?.heldAt ?? null,
    esaSentAt: esa?.sentAt ?? null,
    esaSignedAt: esa?.signedAt ?? null,
    countersigned: esa?.state === "countersigned",
    signedOnFile: known.signedOnFile,
    roleTitle: requirement?.fields.title ?? "",
    openingTaId: position?.openingTaId ?? null,
  };
  const alsoCards = flow.alsoNow
    .filter((s) => s !== shown)
    .map((s) => ({
      step: s,
      line:
        s === "requirement"
          ? requirementBlanks.length && requirement
            ? requirementBlanks.length + (requirementBlanks.length === 1 ? " field is" : " fields are") + " still blank"
            : requirementMeeting
              ? "The requirement meeting is booked"
              : "Book the requirement meeting: it runs beside the agreement"
          : esa
            ? "The agreement is " + esa.state
            : "The agreement has not been started",
      button: s === "requirement" ? "Work on the requirement" : "Open the agreement",
    }));

  const sourceText =
    SOURCE_MEANINGS[lead.source as keyof typeof SOURCE_MEANINGS] ?? lead.source;
  const defaultTargetDate = new Date(now + 21 * 86_400_000).toISOString().slice(0, 10);

  return (
    <Sheet width={1080}>
      {/* Top BackBar */}
      <BackBar
        href={activeView === "agreement" || activeView === "requirement" ? `/leads/${lead.id}` : "/clients"}
        label={
          activeView === "agreement" || activeView === "requirement"
            ? lead.company
            : "Clients"
        }
        right={
          <div className="flex items-center gap-2.5">
            {activeView === "agreement" && esa && (
              <StatusChip
                label={
                  esa.state === "signed"
                    ? "Signed by client"
                    : esa.state === "countersigned"
                      ? "Countersigned"
                      : ESA_STATES[esa.state as EsaState] ?? esa.state
                }
                tone={
                  esa.state === "signed" || esa.state === "countersigned"
                    ? "ok"
                    : esa.state === "negotiating"
                      ? "warn"
                      : "brand"
                }
              />
            )}
            {activeView === "requirement" && (
              <StatusChip
                label={
                  requirementMeeting?.state === "held"
                    ? "Held " + whenDate(requirementMeeting.heldAt ?? requirementMeeting.at) + (requirementMeeting.lengthMin ? " · " + requirementMeeting.lengthMin + " min" : "")
                    : requirementMeeting
                      ? "Booked · " + whenDate(requirementMeeting.at)
                      : "Ready for brief"
                }
                tone="ok"
              />
            )}
            <Avatar name={ownerName} size="32" />
            <details className="relative">
              <summary
                aria-label="More lead actions"
                className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full bg-sunk text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden"
              >
                <Icon name="more" size={16} />
              </summary>
              <div className="absolute right-0 top-10 z-20 flex w-56 flex-col gap-1 rounded-[18px] bg-surface p-2 shadow-float">
                <Link
                  href={`/leads/${lead.id}`}
                  className="rounded-lg px-3 py-1.5 text-[13px] text-ink-soft hover:bg-sunk hover:text-ink"
                >
                  Lead overview
                </Link>
                <Link
                  href={`/leads/${lead.id}?view=agreement`}
                  className="rounded-lg px-3 py-1.5 text-[13px] text-ink-soft hover:bg-sunk hover:text-ink"
                >
                  Agreement view
                </Link>
                <Link
                  href={`/leads/${lead.id}?view=requirement`}
                  className="rounded-lg px-3 py-1.5 text-[13px] text-ink-soft hover:bg-sunk hover:text-ink"
                >
                  Requirement meeting view
                </Link>
                <Link
                  href={`/leads/${lead.id}?view=decline`}
                  className="rounded-lg px-3 py-1.5 text-[13px] text-danger hover:bg-danger-soft"
                >
                  Industry decline check
                </Link>
                {/* The list had a "Who owns what" button; the Figma frame has none (16 Nov), so it lives here and on a client's menu. */}
                <Link
                  href="/clients/owners"
                  className="rounded-lg px-3 py-1.5 text-[13px] text-brand hover:bg-sunk"
                >
                  Who owns what
                </Link>
              </div>
            </details>
          </div>
        }
      />

      {/* Header + 8-step Journey Bar */}
      <div className="flex flex-col gap-3.5">
        {activeView === "agreement" ? (
          <div className="flex flex-col gap-1">
            <span className={figmaLabel}>
              Employment Services Agreement · version {esa?.version ?? 1}
            </span>
            <h1 className="text-[40px] font-light leading-[50px] text-ink">Agreement</h1>
            <p className="text-[16px] font-normal leading-[26px] text-ink-soft">
              {lead.company}
              {esa?.sentAt ? " · Sent " + whenDate(esa.sentAt) : ""}
              {esa?.fields.signatoryName ? " · Signed by " + esa.fields.signatoryName : ""}
            </p>
          </div>
        ) : activeView === "requirement" ? (
          <div className="flex flex-col gap-1">
            <span className={figmaLabel}>
              {lead.company} · with {ownerName}
              {taPeopleList[0] ? ` + ${taPeopleList[0].fullName} (TA lead)` : ""}
            </span>
            <h1 className="text-[40px] font-light leading-[50px] text-ink">
              Requirement meeting
            </h1>
            <p className="text-[16px] font-normal leading-[26px] text-ink-soft">
              {requirement?.fields.title || lead.notes || "Role brief"} ·{" "}
              {requirement?.fields.locations || "Location to confirm"} ·{" "}
              {requirement?.fields.headcount
                ? `${requirement.fields.headcount} opening`
                : "1 opening"}{" "}
              · {requirement?.fields.salary || "Package to confirm"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className={figmaLabel}>Lead · {sourceText}</span>
            <h1 className="text-[40px] font-light leading-[50px] text-ink">
              {lead.company}
            </h1>
            <p className="text-[16px] font-normal leading-[26px] text-ink-soft">
              {lead.industry || "Industry not specified"}
              {lead.contactName ? ` · ${lead.contactName}` : ""}
              {lead.contactEmail ? ` · ${lead.contactEmail}` : ""}
              {lead.contactPhone ? ` · ${lead.contactPhone}` : ""}
            </p>
          </div>
        )}

        {position && standing && (
          <p className="text-[14px] text-ink-soft">
            Where it is now:{" "}
            <Link href={`/positions/${position.id}`} className="font-medium text-ink underline">
              {standingWhat}
            </Link>
            {standing.loop ? " · " + standing.loop.line : ""}
          </p>
        )}
        <RelatedLinks items={related} active="lead" />
        <ViewPills
          items={LEAD_STEPS.map((s) => ({
            key: s,
            label: LEAD_STEP_LABELS[s],
            href: stepHref(s),
            mark: s === nextAt,
          }))}
          active={shown}
        />
        {position && !agreementDone && !closed && (
          <p className="text-[13px] text-warn">
            Working without a signed agreement since {whenDate(position.handedOverAt ?? now)}
            {esa ? ": it is out and being chased." : ": the agreement has not been started yet."}
          </p>
        )}
      </div>

      {msg && !at && (
        <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">{msg}</p>
      )}

      {/* =====================================================================
          VIEW 1: AGREEMENT (Figma Frame 1:666 — CL · Agreement — countersign)
         ===================================================================== */}
      {activeView === "agreement" && (
        <>
          {!esa ? (
            <NextStepCard
              title="Start the Employment Services Agreement"
              clock={{ label: "Within 2h of intro call", tone: "warn", icon: "clock" }}
              body="The agreement is filled from the standard terms in Settings and the company details on this lead. Once started, review the fields and send the PDF to the client."
              byItself="Starts the 5-step chase and the 14-day close timer when sent."
            >
              {mayManage && (
                <form action={startAgreement} className="pt-1">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <button type="submit" className={pillPrimary}>
                    Start the agreement
                  </button>
                </form>
              )}
            </NextStepCard>
          ) : esa.state === "signed" ? (
            <NextStepCard
              title="Upload the countersigned copy"
              clock={{ label: "Due today", tone: "warn", icon: "clock" }}
              body={`${esa.fields.signatoryName || lead.contactName || "The client"} signed and returned the agreement${esa.signedAt ? " on " + whenDate(esa.signedAt) : ""}, with the company seal. Once the Director countersigns, upload it here — the client gets their copy. The opening is made when the requirement is complete too.`}
              byItself="Stopped automatically when their signed copy arrived: the 5-step chase and the 14-day close timer."
            >
              {mayManage && (
                <form
                  action={recordAgreementCountersigned}
                  className="flex flex-wrap items-center gap-3 pt-1"
                >
                  <input type="hidden" name="esaId" value={esa.id} />
                  <select
                    name="fileId"
                    defaultValue={countersignedFiles[0]?.id ?? ""}
                    className="rounded-full bg-sunk px-4 py-2.5 text-[14px] text-ink outline-none"
                  >
                    <option value="">— pick countersigned PDF —</option>
                    {countersignedFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={pillPrimary}>
                    Upload countersigned PDF
                  </button>
                  <Link href="/files" className={pillSecondary}>
                    Ask Director to sign
                  </Link>
                  <a href="#versions-card" className="px-3 py-2 text-[14px] font-medium text-brand hover:underline">
                    Return for seal / date
                  </a>
                </form>
              )}
            </NextStepCard>
          ) : esa.state === "countersigned" ? (
            <NextStepCard
              title="Agreement countersigned — finish the requirement"
              clock={{ label: "Countersigned", tone: "ok", icon: "check" }}
              body="Both sides have signed the Employment Services Agreement and the client record is active. Finish the requirement; then the opening can be created and handed to TA."
            >
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link
                  href={`/leads/${lead.id}?view=requirement`}
                  className={pillPrimary}
                >
                  Open requirement meeting
                </Link>
              </div>
            </NextStepCard>
          ) : esa.state === "sent" || esa.state === "chasing" ? (
            <NextStepCard
              title={`Follow up on the agreement — ${nextChase ? nextChase.what : "chase due"}`}
              clock={{
                label: esa.sentAt
                  ? `Day ${Math.max(1, Math.round((now - esa.sentAt) / 86_400_000))} of 14`
                  : "Waiting on client",
                tone: "warn",
                icon: "clock",
              }}
              body={whereItStands({ ...esa, state: esa.state as EsaState }, now)}
              byItself="Stopped automatically if they reply. Closes after 14 days if unsigned."
            >
              {mayManage && (
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <form action={draftNextChase}>
                    <input type="hidden" name="esaId" value={esa.id} />
                    <button type="submit" className={pillPrimary}>
                      Approve &amp; send
                    </button>
                  </form>
                  <a href="#versions-card" className={pillSecondary}>
                    Record signed copy
                  </a>
                  <a href="#versions-card" className="px-3 py-2 text-[14px] font-medium text-brand hover:underline">
                    They want changes
                  </a>
                </div>
              )}
            </NextStepCard>
          ) : esa.state === "draft" ? (
            <NextStepCard
              title="The ESA has not been sent yet"
              clock={{ label: "Within 2h of intro call", tone: "warn", icon: "clock" }}
              body="It goes at the end of the intro call: the details from the call, the ESA as the client will get it, and its email, then Send. This step is for what comes back: the signed copy, or changes they want."
            >
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link href={stepHref("intro") + "#esa-document"} className={pillPrimary}>
                  Go to the intro call to send it
                </Link>
              </div>
            </NextStepCard>
          ) : (
            <NextStepCard
              title={`Agree the changes and send version ${esa.version + 1}`}
              clock={{ label: "Within 2h of intro call", tone: "warn", icon: "clock" }}
              body={
                esaMissing.length > 0
                  ? `Still blank: ${esaMissing.map((f) => f.label.toLowerCase()).join(", ")}. Fill the terms below before sending — a draft never goes out with placeholders.`
                  : "Change the details below, look at the new draft and its email, then send the next version."
              }
              byItself="Sending starts the 5-step chase and the 14-day close timer again."
            >
              {mayManage && (
                <form action={sendAgreement} className="pt-1">
                  <input type="hidden" name="esaId" value={esa.id} />
                  <SubmitButton id="send-esa-again" className={pillPrimary}>
                    {`Send version ${esa.version + 1}`}
                  </SubmitButton>
                </form>
              )}
            </NextStepCard>
          )}

          {mayManage && esa && esa.state === "negotiating" && (
            <CoverEmailPreview
              esaId={esa.id}
              to={String(esa.fields.signatoryEmail ?? "").trim()}
              attachment={"Agreement - " + safeName(String(esa.fields.companyName ?? "client")) + " - v" + nextDraftVersion(draftFiles) + ".pdf"}
              email={coverPreview!}
              edited={!!(esa.fields.coverSubject && esa.fields.coverBody)}
              returnTo="agreement"
            />
          )}

          {/* Two-column TERMS + VERSIONS cards (Figma 1:699) */}
          <div className="grid grid-cols-1 gap-4 pg-lg:grid-cols-2">
            {/* Left card: TERMS (Figma 1:700) */}
            <div
              id="terms-card"
              className="flex flex-col gap-3.5 rounded-[24px] bg-sunk px-6 py-[22px]"
            >
              <span className={figmaLabel}>TERMS</span>
              <div className="flex flex-col">
                <div className="flex items-center justify-between py-2.5 text-[14px]">
                  <span className="text-ink-soft">Fee</span>
                  <span className="font-medium text-ink">
                    {esa?.fields.feeMonths || "1"} month(s) {esa?.fields.feeBasis || "gross"} salary · paid within{" "}
                    {esa?.fields.paymentDays || "30"} days
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-rule py-2.5 text-[14px]">
                  <span className="text-ink-soft">Guarantee</span>
                  <span className="font-medium text-ink">
                    {esa?.fields.guaranteeDays || "90"} days
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-rule py-2.5 text-[14px]">
                  <span className="text-ink-soft">Replacement</span>
                  <span className="font-medium text-ink">
                    {esa?.fields.replacementWorkingDays || "60"} working days ·{" "}
                    {esa?.fields.refundPct || numberOf(db, "refund.pct", REFUND_PCT)}% refund if unfilled
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-rule py-2.5 text-[14px]">
                  <span className="text-ink-soft">Inactive after</span>
                  <span className="font-medium text-ink">12 months without an opening</span>
                </div>
              </div>

              {esa && agreementDone && (
                <div className="flex flex-col gap-3 border-t border-rule pt-3">
                  <span className={figmaLabel}>THE AGREEMENT DETAILS</span>
                  <FieldList items={ESA_FIELDS.map((f) => ({ label: f.label, value: esa.fields[f.key] }))} />
                </div>
              )}

              {esa && mayManage && !agreementDone && (
                <details
                  open={esa.state === "negotiating"}
                  className="border-t border-rule pt-3"
                >
                  <summary className="cursor-pointer text-[13px] font-medium text-brand hover:underline">
                    Edit agreement fields
                  </summary>
                  <div className="mt-3">
                    <AgreementFieldsForm leadId={lead.id} esa={esa} returnTo="agreement" />
                  </div>
                  {!esaTemplate && (
                    <p className="mt-2 text-[12.5px] text-ink-soft">
                      Note: Upload the master Word template on{" "}
                      <Link href="/files" className="text-brand underline">
                        Files
                      </Link>{" "}
                      as &ldquo;Agreement, drafted&rdquo; before generating the PDF.
                    </p>
                  )}
                  {esaTemplate && (
                    <form action={previewAgreement} className="mt-3 flex flex-col gap-2">
                      <input type="hidden" name="esaId" value={esa.id} />
                      <button type="submit" className={pillSecondary + " self-start"}>
                        Make a filled draft to look at
                      </button>
                      <p className="text-[12.5px] text-ink-soft">
                        Fills the template with the saved fields, the way the send would. Nothing is sent.
                      </p>
                    </form>
                  )}
                </details>
              )}
            </div>

            {/* Right card: VERSIONS (Figma 1:719) */}
            <div
              id="versions-card"
              className="flex flex-col gap-3.5 rounded-[24px] bg-sunk px-6 py-[22px]"
            >
              <span className={figmaLabel}>VERSIONS</span>
              <div className="flex flex-col">
                {esa ? (
                  <AgreementVersions esa={esa} files={draftFiles} />
                ) : (
                  <p className="text-[14px] text-ink-soft">Nothing drafted yet.</p>
                )}
                {esa?.reason && (
                  <div className="flex items-center justify-between border-t border-rule py-2.5 text-[14px]">
                    <span className="font-medium text-ink">Changes asked for</span>
                    <span className="text-ink-soft">{esa.reason}</span>
                  </div>
                )}
              </div>

              {esa &&
                (esa.state === "sent" || esa.state === "chasing") &&
                mayManage && (
                  <div className="flex flex-col gap-3 border-t border-rule pt-3">
                    <details open>
                      <summary className="cursor-pointer text-[13px] font-medium text-brand hover:underline">
                        Record signed copy from client
                      </summary>
                      <form
                        action={recordAgreementSigned}
                        className="mt-2.5 flex flex-col gap-2.5"
                      >
                        <input type="hidden" name="esaId" value={esa.id} />
                        <select
                          name="fileId"
                          defaultValue={signedFiles[0]?.id ?? ""}
                          className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                        >
                          <option value="">— pick the uploaded signed file —</option>
                          {signedFiles.map((file) => (
                            <option key={file.id} value={file.id}>
                              {file.name}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-start gap-2 text-[13px] text-ink">
                          <input type="checkbox" name="checked" className="mt-1" />
                          <span>I have looked at it: signed, dated and sealed</span>
                        </label>
                        <button type="submit" className={pillPrimary + " self-start"}>
                          It is signed
                        </button>
                      </form>
                    </details>

                    <details>
                      <summary className="cursor-pointer text-[13px] font-medium text-ink-soft hover:text-ink">
                        They want changes before signing
                      </summary>
                      <form
                        action={recordChangesWanted}
                        className="mt-2.5 flex flex-col gap-2.5"
                      >
                        <input type="hidden" name="esaId" value={esa.id} />
                        <textarea
                          name="what"
                          rows={2}
                          placeholder="What changes did they ask for?"
                          className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                        />
                        <button type="submit" className={pillSecondary + " self-start"}>
                          They want changes
                        </button>
                      </form>
                    </details>

                    <details>
                      <summary className="cursor-pointer text-[13px] font-medium text-danger hover:underline">
                        Decline agreement
                      </summary>
                      <form
                        action={declineAgreement}
                        className="mt-2.5 flex flex-col gap-2.5"
                      >
                        <input type="hidden" name="esaId" value={esa.id} />
                        <input
                          name="reason"
                          placeholder="Why will they not sign?"
                          className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                        />
                        <button type="submit" className={pillDanger + " self-start"}>
                          No agreement
                        </button>
                      </form>
                    </details>
                  </div>
                )}
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          VIEW 2: REQUIREMENT MEETING (Figma Frame 1:2050 — CL · Requirement meeting)
         ===================================================================== */}
      {activeView === "requirement" && (
        <>
          {/* Two-column WHAT WE HEARD + WHAT HAPPENS NEXT (Figma 1:2112) */}
          <div className="grid grid-cols-1 gap-4 pg-lg:grid-cols-2">
            {/* Left card: WHAT WE HEARD (Figma 1:2113) */}
            <div className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5">
              <span className={figmaLabel}>WHAT WE HEARD</span>
              <p className="text-[14px] leading-[21px] text-ink">
                {requirement && Object.values(requirement.fields).some(Boolean)
                  ? briefText(requirement.fields)
                  : lead.notes ||
                    "Capture the role title, package, experience, must-have skills, and notice period below before opening the position."}
              </p>
              <p className="inline-flex items-center gap-1.5 text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">
                <Icon name="sparkle" size={14} className="text-brand" />
                <span>Dictated after the call · AURA tidied it</span>
              </p>

              {requirementBlanks.length > 0 && (
                <p className="text-[12.5px] text-warning">
                  Still blank:{" "}
                  {requirementBlanks.map((f) => f.label.toLowerCase()).join(", ")}.
                </p>
              )}

              {requirementDone && requirement && (
                <div className="flex flex-col gap-3 border-t border-rule pt-3">
                  <span className={figmaLabel}>THE REQUIREMENT, AS AGREED</span>
                  <FieldList items={REQUIREMENT_FIELDS.map((f) => ({ label: f.label, value: requirement.fields[f.key] }))} />
                </div>
              )}

              {mayManage && !requirementDone && (
                <details
                  open={!requirement || requirementBlanks.length > 0}
                  className="border-t border-rule pt-3"
                >
                  <summary className="cursor-pointer text-[13px] font-medium text-brand hover:underline">
                    Edit requirement fields or dictate brief
                  </summary>

                  {aiOn &&
                    meetings
                      .filter((m) => m.state === "held" && m.graphEventId)
                      .map((m) => (
                        <form
                          key={m.id}
                          action={readRequirementFromCall}
                          className="mt-3 flex flex-wrap items-center gap-2 rounded-[16px] bg-surface p-3"
                        >
                          <input type="hidden" name="meetingId" value={m.id} />
                          <span className="text-[13px] text-ink-soft">
                            The {KIND_MEANINGS[m.kind as MeetingKind]?.toLowerCase() ?? m.kind} on {whenLocal(m.at)} was on Teams.
                            If somebody started transcription in it:
                          </span>
                          <button type="submit" className={pillSecondary}>
                            Read the call&rsquo;s transcript into the fields
                          </button>
                        </form>
                      ))}

                  {!aiOn && (
                    <div className="mt-2">
                      <AiOffer
                        label="Say the brief instead of typing it"
                        why={whyAiOff ?? ""}
                      />
                    </div>
                  )}

                  {aiOn && (
                    <form
                      action={dictateRequirement}
                      className="mt-3 flex flex-col gap-2 rounded-[16px] bg-surface p-3"
                    >
                      <input type="hidden" name="leadId" value={lead.id} />
                      <label className="flex flex-col gap-1">
                        <span className={figmaLabel}>Say the brief instead of typing it</span>
                        <textarea
                          name="said"
                          rows={2}
                          className="rounded-[10px] bg-sunk px-3 py-2 text-[14px] text-ink outline-none"
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Dictate into="said" label="Press and speak" />
                        <button type="submit" className={pillSecondary}>
                          Put it into the fields
                        </button>
                      </div>
                    </form>
                  )}

                  <form action={saveRequirement} className="mt-3 flex flex-col gap-3">
                    <KeepFields id="requirement-fields" />
                    <input type="hidden" name="leadId" value={lead.id} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {REQUIREMENT_FIELDS.map((f) => (
                        <label
                          key={f.key}
                          className={
                            "flex flex-col gap-1 " +
                            (f.key === "jdNotes" || f.key === "insights" || f.key === "incumbentNote"
                              ? "sm:col-span-2"
                              : "")
                          }
                        >
                          <span className={figmaLabel}>
                            {f.label}
                            {f.required ? "" : " (optional)"}
                          </span>
                          {f.key === "jdNotes" || f.key === "insights" || f.key === "incumbentNote" ? (
                            <textarea
                              name={"field." + f.key}
                              rows={2}
                              defaultValue={
                                requirement?.fields[f.key] ??
                                dictated?.[f.key as keyof typeof dictated] ??
                                ""
                              }
                              className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                            />
                          ) : (
                            <input
                              name={"field." + f.key}
                              defaultValue={
                                requirement?.fields[f.key] ??
                                dictated?.[f.key as keyof typeof dictated] ??
                                ""
                              }
                              className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                            />
                          )}
                        </label>
                      ))}
                    </div>
                    <button type="submit" className={pillSecondary + " self-start"}>
                      Save the requirement
                    </button>
                  </form>
                </details>
              )}
            </div>

            {/* Right card: WHAT HAPPENS NEXT (Figma 1:2122) */}
            <div
              id="book-requirement-meeting"
              className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5"
            >
              <span className={figmaLabel}>WHAT HAPPENS NEXT</span>
              <p className="text-[14px] leading-[21px] text-ink-soft">
                Opening is created in the TA System with this brief.
                <br />
                Primary TA gets the role; the 2-day clock to the first CV set starts.
                <br />
                Talent Pulse report is due within 10 working days if the role needs market intelligence.
              </p>

              {position && (
                <div className="pt-1">
                  <Link
                    href={`/positions/${position.id}`}
                    className="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand hover:underline"
                  >
                    <span>Open position: {position.title}</span>
                    <Icon name="arrow-right" size={14} />
                  </Link>
                </div>
              )}

              {requirementMeeting && (
                <div className="flex flex-col gap-1 border-t border-rule pt-3 text-[13px] text-ink-soft">
                  <p>
                    <span className="font-medium text-ink">Requirement meeting:</span>{" "}
                    {whenDate(requirementMeeting.at)} · {requirementMeeting.state}
                  </p>
                  {requirementMeeting.joinUrl && (
                    <p>
                      Join link:{" "}
                      <a href={requirementMeeting.joinUrl} className="text-brand hover:underline">
                        {requirementMeeting.joinUrl}
                      </a>
                    </p>
                  )}
                  {requirementMeeting.teamsProblem && (
                    <p className="text-warn">No Teams link was made: {requirementMeeting.teamsProblem}</p>
                  )}
                  {(() => {
                    const inv = db.messages.find(
                      (m) => m.subjectType === "meeting" && m.subjectId === requirementMeeting.id,
                    );
                    return renderInviteOutcome(inv);
                  })()}
                </div>
              )}

              {mayManage && !requirementDone && (
                <details open={!requirementMeeting} className="border-t border-rule pt-3">
                  <summary className="cursor-pointer text-[13px] font-medium text-brand hover:underline">
                    {requirementMeeting
                      ? "Rebook requirement meeting"
                      : "Book the requirement meeting"}
                  </summary>
                  <MeetingBookingForm
                    action={bookRequirementMeeting}
                    leadId={lead.id}
                    contact={{ name: lead.contactName, email: lead.contactEmail }}
                    taPeople={taPeopleList}
                    members={db.members}
                    organiserId={lead.ownerId}
                    teamsOn={teamsOn}
                    submitLabel="Book the requirement meeting"
                  />
                </details>
              )}
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          VIEW 3: INDUSTRY DECLINE (Figma Frame 1:3443 — CL · Lead — Sapphire Finance)
         ===================================================================== */}
      {activeView === "decline" && (
        <>
          <NextStepCard
            title="This looks like a company we don’t take on"
            clock={{ label: "Today", tone: "danger", icon: "alert" }}
            body={`${lead.company} is in banking and financial services${lead.industryBecause ? ` (${lead.industryBecause})` : ""}. Under our rules, we decline finance-industry leads — even when the role itself is not in finance. Confirm to send a polite decline and close the lead.`}
            byItself="Checked against the TA System: not an existing client. Flagged by the industry check when the form arrived."
          >
            {!flagged && (
              <p className="pt-1 text-[14px] text-ink">
                Decided
                {lead.industryConfirmedBy ? " by " + nameOf(lead.industryConfirmedBy) : ""}:{" "}
                {lead.state === "declined_industry" ? "declined, because of the industry." : "not finance, so it carried on."}
              </p>
            )}
            {mayManage && flagged && (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <form action={decideLeadIndustry}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="decision" value="confirm" />
                  <button type="submit" className={pillDanger}>
                    Decline and send reply
                  </button>
                </form>
                <form action={decideLeadIndustry}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="decision" value="clear" />
                  <button type="submit" className={pillSecondary}>
                    It’s not finance — keep going
                  </button>
                </form>
              </div>
            )}
          </NextStepCard>

          <FoldRow
            title="Other ways a lead ends"
            summary="Unreachable · DeclinedESA · Role not practical · Other (needs a reason)"
          >
            <div className="flex flex-col gap-4">
              {mayManage ? (
                <form action={closeLead} className="flex flex-col gap-3">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className={figmaLabel}>Why it is closing</span>
                      <select name="state" defaultValue="closed_other" className={figmaField}>
                        <option value="closed_silent">They stopped answering</option>
                        <option value="closed_other">Something else</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={figmaLabel}>Reason</span>
                      <input
                        name="reason"
                        required
                        placeholder="Nothing closes without a reason written down"
                        className={figmaField}
                      />
                    </label>
                  </div>
                  <button type="submit" className={pillSecondary + " self-start"}>
                    Close lead
                  </button>
                </form>
              ) : (
                <p className="text-[14px] text-ink-faint">{refusal("client.manage")}</p>
              )}
            </div>
          </FoldRow>
        </>
      )}

      {/* =====================================================================
          VIEW 4: DEFAULT LEAD VIEW (Figma Frame 1:484 — CL · Lead — Lankaweave Textiles)
         ===================================================================== */}
      {(activeView === "enquiry" || activeView === "intro" || activeView === "opening") && (
        <>
          {upNextOn === shown && (
          <NextStepCard
            title={
              esa && (esa.state === "sent" || esa.state === "chasing")
                ? `Follow up on the agreement — ${nextChase ? nextChase.what.toLowerCase() : "chase due"}`
                : step.where
            }
            clock={
              step.clock
                ? {
                    label: step.clock,
                    tone: step.clock.includes("ago") ? "danger" : "warn",
                    icon: "clock",
                  }
                : esa?.sentAt
                  ? {
                      label: `Day ${Math.max(1, Math.round((now - esa.sentAt) / 86_400_000))} of 14`,
                      tone: "warn",
                      icon: "clock",
                    }
                  : { label: "In progress", tone: "neutral", icon: "clock" }
            }
            body={step.waiting}
            byItself={
              esa && (esa.state === "sent" || esa.state === "chasing")
                ? `Sent the agreement ${whenDate(esa.sentAt ?? lead.createdAt)}. Stopped automatically if they reply. Closes after 14 days if unsigned.`
                : "Every step is recorded on this lead and synced with the TA System."
            }
          >
            {!closed && mayManage && (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {esa && (esa.state === "sent" || esa.state === "chasing") ? (
                  <>
                    <form action={draftNextChase}>
                      <input type="hidden" name="esaId" value={esa.id} />
                      <button type="submit" className={pillPrimary}>
                        Approve &amp; send
                      </button>
                    </form>
                    <Link
                      href={`/leads/${lead.id}?view=agreement`}
                      className={pillSecondary}
                    >
                      Edit draft
                    </Link>
                    <Link
                      href={`/leads/${lead.id}?view=agreement#versions-card`}
                      className="px-3 py-2 text-[14px] font-medium text-brand hover:underline"
                    >
                      They replied — pause chase
                    </Link>
                  </>
                ) : esa && esa.state === "signed" ? (
                  <>
                    <Link
                      href={`/leads/${lead.id}?view=agreement`}
                      className={pillPrimary}
                    >
                      Upload countersigned PDF
                    </Link>
                    <Link
                      href={`/leads/${lead.id}?view=requirement`}
                      className={pillSecondary}
                    >
                      Requirement meeting
                    </Link>
                  </>
                ) : step.at === "duplicate" ? (
                  <form action={checkLeadDuplicate}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <button type="submit" className={pillPrimary}>
                      Check the TA System
                    </button>
                  </form>
                ) : step.at === "agreement" && !esa ? (
                  <>
                    <form action={startAgreement}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button type="submit" className={pillPrimary}>
                        Start the agreement
                      </button>
                    </form>
                    <Link
                      href={`/leads/${lead.id}?view=agreement`}
                      className={pillSecondary}
                    >
                      Open agreement view
                    </Link>
                  </>
                ) : step.at === "agreement" && esa ? (
                  <Link
                    href={`/leads/${lead.id}?view=agreement`}
                    className={pillPrimary}
                  >
                    Open agreement
                  </Link>
                ) : step.at === "requirement" ? (
                  <Link
                    href={`/leads/${lead.id}?view=requirement`}
                    className={pillPrimary}
                  >
                    Open requirement meeting
                  </Link>
                ) : null}
              </div>
            )}
          </NextStepCard>
          )}

          {activeView === "enquiry" && (
            <div className="flex flex-col gap-4 rounded-[24px] bg-sunk px-6 py-5">
              <span className={figmaLabel}>THE ENQUIRY · {sourceText} · {whenDate(lead.createdAt)}</span>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 text-[14px] sm:grid-cols-2">
                  <div>
                    <span className={figmaLabel}>Contact</span>
                    <p className="mt-1 text-ink">
                      {lead.contactName || "No name given"} ·{" "}
                      {lead.contactEmail || "no email"} ·{" "}
                      {lead.contactPhone || "no phone"}
                    </p>
                  </div>
                  <div>
                    <span className={figmaLabel}>Industry &amp; website</span>
                    <p className="mt-1 text-ink">
                      {lead.industry || "Not specified"}
                      {lead.website ? ` · ${lead.website}` : ""}
                    </p>
                  </div>
                  {lead.notes && (
                    <div className="sm:col-span-2">
                      <span className={figmaLabel}>What they asked for</span>
                      <p className="mt-1 whitespace-pre-wrap text-ink">{lead.notes}</p>
                    </div>
                  )}
                </div>

                {mayManage && step.at !== "duplicate" && progress[0] !== "done" && (
                  <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-3">
                    <form action={checkLeadDuplicate}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button type="submit" className={pillSecondary}>
                        Check the TA System
                      </button>
                    </form>
                    {fakeTa() && (
                      <span className="text-[12.5px] text-ink-faint">
                        Stand-in TA System active in local mode.
                      </span>
                    )}
                  </div>
                )}

                {mayManage && progress[0] !== "done" && nearMatches.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-rule pt-3">
                    <span className={figmaLabel}>Close matches in the TA System</span>
                    {nearMatches.map((c) => (
                      <form key={c.id} action={chooseLeadMatch} className="flex flex-wrap items-center gap-3 text-[14px]">
                        <input type="hidden" name="leadId" value={lead.id} />
                        <input type="hidden" name="taClientId" value={c.id} />
                        <span className="text-ink">{c.name}</span>
                        <button type="submit" className={pillSecondary}>It is this one</button>
                      </form>
                    ))}
                    <form action={markLeadNewClient}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button type="submit" className={pillSecondary}>None of these: a new client</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === "intro" && (
            <div className="flex flex-col gap-4 rounded-[24px] bg-sunk px-6 py-5">
              <span className={figmaLabel}>THE INTRO CALL · THE TA LEAD JOINS EVERY ONE</span>
              <div className="flex flex-col gap-4">
                {meetings.filter((m) => m.kind === "intro").map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex flex-col gap-2 border-b border-rule pb-3 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[14px]">
                      <span className="font-medium text-ink">
                        {KIND_MEANINGS[meeting.kind as MeetingKind] ?? meeting.kind}
                      </span>
                      <span className="text-ink-soft">{whenLocal(meeting.at)}</span>
                      <StatusChip
                        label={
                          (MEETING_STATES[meeting.state as MeetingState] ??
                            meeting.state) +
                          (meeting.rebookCount > 0
                            ? ` · attempt ${meeting.rebookCount} of ${MAX_REBOOKS}`
                            : "")
                        }
                        tone={meeting.state === "held" ? "ok" : "neutral"}
                      />
                    </div>
                    {meeting.state === "booked" && (meeting.joinUrl || meeting.teamsProblem) && (
                      <p className="text-[13px] text-ink-soft">
                        {meeting.joinUrl ? (
                          <>
                            Join link:{" "}
                            <a href={meeting.joinUrl} className="text-brand hover:underline">
                              {meeting.joinUrl}
                            </a>
                          </>
                        ) : null}
                        {meeting.teamsProblem ? (
                          <span className="text-warn"> No Teams link was made: {meeting.teamsProblem}</span>
                        ) : null}
                      </p>
                    )}
                    {meeting.state === "booked" && (
                      // 22 Nov: staff booked an intro call and said it was not in their calendar. It is on the Ops Calendar page whatever Outlook did.
                      <p className="text-[13px] text-ink-soft">
                        {(() => {
                          const w = meeting.at ? meetingWeek(now, meeting.at) : null;
                          if (!w) return null;
                          return w.sunday ? (
                            "The Ops Calendar shows Monday to Saturday, so this Sunday call is not on it."
                          ) : (
                            <>
                              On the{" "}
                              <Link href={w.offset ? "/calendar?weekOffset=" + w.offset : "/calendar"} className="text-brand hover:underline">
                                Ops Calendar, in the week of {w.mondayLabel}
                              </Link>{" "}
                              (Team view).
                            </>
                          );
                        })()}{" "}
                        {outlookNote({ graphEventId: meeting.graphEventId, organiserName: nameOf(meeting.organiserId ?? null) })}
                      </p>
                    )}
                    {meeting.state === "booked" &&
                      renderInviteOutcome(
                        db.messages.find(
                          (m) => m.subjectType === "meeting" && m.subjectId === meeting.id,
                        ),
                      )}
                    {meeting.state !== "booked" && (meeting.lengthMin || meeting.organiserId || meeting.attendees?.length) && (
                      <p className="text-[13px] text-ink-soft">
                        {[
                          meeting.lengthMin ? meeting.lengthMin + " minutes" : null,
                          meeting.organiserId ? "in " + nameOf(meeting.organiserId) + "'s calendar" : null,
                          meeting.attendees?.length ? "link to " + meeting.attendees.map((a) => a.name || a.email).join(", ") : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {meeting.brief && (
                      <p className="text-[14px] text-ink-soft">
                        What they said: <span className="text-ink">{meeting.brief}</span>
                      </p>
                    )}
                    {(meeting.role || meeting.packageSaid) && (
                      <p className="text-[13px] text-ink-soft">
                        {meeting.role || "Position not specified"} ·{" "}
                        {meeting.packageSaid || "Package not specified"}
                      </p>
                    )}

                    {mayManage && meeting.state === "booked" && (
                      <MeetingOutcome
                        meetingId={meeting.id}
                        held={
                        <form action={markMeetingHeld} className="flex flex-col gap-2.5">
                          <KeepFields id="meeting-held" />
                          <input type="hidden" name="meetingId" value={meeting.id} />
                          <span className={figmaLabel}>
                            It happened — what did they say?
                          </span>
                          <textarea
                            name="brief"
                            rows={2}
                            required
                            placeholder="Brief from the call (required)"
                            className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              name="role"
                              placeholder="The position"
                              className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                            />
                            <input
                              name="packageSaid"
                              placeholder="Package mentioned"
                              className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                            />
                          </div>
                          <SubmitButton id={"held-" + meeting.id} answerAt="call-held" className={pillPrimary + " self-start"}>
                            It was held
                          </SubmitButton>
                        </form>
                        }
                        notHeld={
                        <form
                          action={markMeetingNotHeld}
                          className="flex flex-col gap-2.5"
                        >
                          <input type="hidden" name="meetingId" value={meeting.id} />
                          <KeepFields id="meeting-not-held" />
                          <span className={figmaLabel}>It did not happen — why?</span>
                          <input
                            name="reason"
                            required
                            placeholder="Reason it was not held"
                            className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                          />
                          <label className="flex items-center gap-2 text-[13px] text-ink">
                            <input type="checkbox" name="clientReplied" />
                            <span>The client is still answering us</span>
                          </label>
                          <SubmitButton id={"not-held-" + meeting.id} className={pillSecondary + " self-start"}>
                            It was not held
                          </SubmitButton>
                        </form>
                        }
                      />
                    )}
                  </div>
                ))}

                {mayManage && !known.skipsIntro && !nextBooked && !meetings.some((m) => m.kind === "intro" && m.state === "held") && (
                  <MeetingBookingForm
                    action={bookIntroCall}
                    leadId={lead.id}
                    contact={{ name: lead.contactName, email: lead.contactEmail }}
                    taPeople={taPeopleList}
                    members={db.members}
                    organiserId={lead.ownerId}
                    teamsOn={teamsOn}
                    submitLabel={meetings.length ? "Book it again" : "Book the intro call"}
                    primary
                    offerAlsoRequirement
                  />
                )}
              </div>
            </div>
          )}

          {/* The end of the intro call (owner, 17 Nov): once it was held, the agreement's details,
              the ESA itself, the email that carries it, and Send. Then the opening. */}
          {activeView === "intro" && mayManage && !introHeldOrSkipped && (
            <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink-soft">
              Once the call is marked as held, the agreement&rsquo;s details, the ESA and its email appear here.
            </p>
          )}

          {activeView === "intro" && mayManage && introHeldOrSkipped && (!esa || esa.state === "draft") && (
            <>
              <div className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5">
                <span className={figmaLabel}>1 · THE AGREEMENT DETAILS, FROM THE CALL</span>
                <Answer id="call-held" />
                <AgreementFieldsForm leadId={lead.id} esa={esa ?? { id: "", fields: startAgreementFields }} returnTo="intro" />
              </div>

              <div id="esa-document" className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5">
                <span className={figmaLabel}>2 · THE ESA, AS THE CLIENT WILL GET IT</span>
                {!esaTemplate ? (
                  <p className="text-[14px] text-ink-soft">
                    Upload the ESA template on{" "}
                    <Link href="/files" className="text-brand underline">
                      Files
                    </Link>{" "}
                    as &ldquo;Agreement, drafted&rdquo;, and the draft can be made.
                  </p>
                ) : esa && newestDraft ? (
                  <DraftDocument file={newestDraft.file} version={newestDraft.version} />
                ) : (
                  <p className="text-[14px] text-ink-soft">
                    {esaMissing.length > 0 && esa
                      ? "Still blank: " + esaMissing.map((f) => f.label.toLowerCase()).join(", ") + ". Fill them in and press Save and make the draft."
                      : "Press Save and make the draft above, and the ESA shows here."}
                  </p>
                )}
                {esa && <AgreementVersions esa={esa} files={draftFiles} />}
                <p className="text-[12.5px] text-ink-soft">
                  Something to change? Edit the details above and press Save and make the draft. It becomes the next version.
                </p>
              </div>

              {esa && (
                <>
                  <CoverEmailPreview
                    esaId={esa.id}
                    to={String(esa.fields.signatoryEmail ?? "").trim()}
                    attachment={"Agreement - " + safeName(String(esa.fields.companyName ?? "client")) + " - v" + nextDraftVersion(draftFiles) + ".pdf"}
                    email={coverPreview!}
                    edited={!!(esa.fields.coverSubject && esa.fields.coverBody)}
                    returnTo="intro"
                    step="3"
                  />
                  <form action={sendAgreement} className="flex flex-col gap-2 rounded-[24px] bg-sunk px-6 py-5">
                    <span className={figmaLabel}>4 · SEND THE ESA</span>
                    <input type="hidden" name="esaId" value={esa.id} />
                    <input type="hidden" name="returnTo" value="intro" />
                    <p className="text-[14px] text-ink-soft">
                      Makes the final PDF from these details and drafts the email above with it attached, for you to approve. The chase and the two weeks start when it goes.
                    </p>
                    <SubmitButton id="send-esa" className={pillPrimary + " self-start"}>
                      Send the ESA
                    </SubmitButton>
                  </form>
                </>
              )}
            </>
          )}

          {activeView === "intro" && esa && esa.state !== "draft" && (
            <div className="flex flex-col gap-2 rounded-[24px] bg-sunk px-6 py-5">
              <span className={figmaLabel}>THE ESA</span>
              <p className="text-[14px] text-ink">
                {esa.sentAt ? "Sent " + whenDate(esa.sentAt) + " (version " + esa.version + "). " : ""}
                {ESA_STATES[esa.state as EsaState] ?? esa.state}.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Link href={stepHref("agreement")} className={pillPrimary}>
                  Next: the agreement and the requirement
                </Link>
                <Link href={stepHref("requirement")} className={pillSecondary}>
                  The requirement
                </Link>
              </div>
            </div>
          )}

          {activeView === "intro" && esa && esa.state !== "draft" && (
            <>
              <div className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5">
                <span className={figmaLabel}>THE AGREEMENT DETAILS, AS SENT</span>
                <FieldList items={ESA_FIELDS.map((f) => ({ label: f.label, value: esa.fields[f.key] }))} />
              </div>

              <div className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5">
                <span className={figmaLabel}>THE ESA, AS THE CLIENT GOT IT</span>
                {newestDraft && <DraftDocument file={newestDraft.file} version={newestDraft.version} />}
                <AgreementVersions esa={esa} files={draftFiles} />
              </div>

              {sentEmail && (
                <div className="flex flex-col gap-2 rounded-[24px] bg-sunk px-6 py-5">
                  <span className={figmaLabel}>THE EMAIL THAT WENT WITH IT</span>
                  <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1 text-[14px]">
                    <dt className="text-ink-soft">To</dt>
                    <dd className="text-ink">{sentEmail.to.join(", ")}</dd>
                    <dt className="text-ink-soft">Subject</dt>
                    <dd className="text-ink">{sentEmail.subject}</dd>
                    <dt className="text-ink-soft">Status</dt>
                    <dd className="text-ink">
                      {sentEmail.sentAt ? "Sent " + whenLocal(sentEmail.sentAt) : "Drafted, waiting for a person to approve it"}
                    </dd>
                  </dl>
                  <p className="whitespace-pre-wrap rounded-[10px] bg-surface px-3 py-2 font-mono text-[13.5px] leading-[1.55] text-ink">
                    {sentEmail.body}
                  </p>
                </div>
              )}
            </>
          )}

          {activeView === "opening" && (
            <>
          {!position && (
            // 22 Nov: staff saved the requirement and saw no role on Positions; the role is made only when all of these hold.
            <div className="flex flex-col gap-2 rounded-[16px] bg-sunk px-4 py-3 text-[14px]">
              <span className={figmaLabel}>BEFORE THIS BECOMES A ROLE ON POSITIONS</span>
              <ul className="flex flex-col gap-1">
                {checklist.items.map((item) => (
                  <li key={item.step} className={item.done ? "text-ink-soft" : "text-ink"}>
                    <span aria-hidden="true">{item.done ? "✓ " : "○ "}</span>
                    <span className="sr-only">{item.done ? "Done: " : "Still needed: "}</span>
                    {item.label}
                    {!item.done && (
                      <>
                        {". "}
                        <Link href={stepHref(item.step)} className="font-medium text-brand underline">
                          Go to it
                        </Link>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {checklist.ready && (
                <p className="text-[13px] text-ink-soft">Then hand it to the TA System with the button below.</p>
              )}
            </div>
          )}
          {!position && !introAccepted && (
            <p className="rounded-[16px] bg-warn-soft px-4 py-3 text-[14px] text-warn">
              The intro call is not held and the agreement has not gone out yet, so the opening cannot be opened.{" "}
              <Link href={stepHref("intro")} className="font-medium underline">
                Go to the intro call
              </Link>
            </p>
          )}
          {!position && introAccepted && !openingReady && !openedEarly && mayManage && (
            <div className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5">
              <form action={openEarly} className="flex flex-col gap-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <span className={figmaLabel}>A CLIENT WE TRUST? OPEN IT NOW, WITHOUT WAITING</span>
                <input
                  name="reason"
                  placeholder="Why this client can be opened for without waiting, and who agreed (kept with the lead)"
                  className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                />
                <SubmitButton id="open-early" className={pillSecondary + " self-start"}>
                  Open it now, without waiting
                </SubmitButton>
              </form>
            </div>
          )}
          {!position && openedEarly && (
            <div className="flex flex-col gap-2 rounded-[16px] bg-warn-soft px-4 py-3 text-[14px] text-warn">
              <p>
                Trusted: marked to open without waiting, by {nameOf(lead.openEarlyBy ?? null)} on {whenDate(lead.openEarlyAt ?? now)}:{" "}
                {lead.openEarlyReason}
              </p>
              {mayManage && (
                <form action={openEarly}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="undo" value="1" />
                  <SubmitButton id="undo-open-early" className={pillSecondary + " self-start"}>
                    Take it back
                  </SubmitButton>
                </form>
              )}
            </div>
          )}
          {position ? (
            <div className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5">
              <span className={figmaLabel}>THE OPENING</span>
              <p className="text-[18px] text-ink">{position.title}</p>
              <p className="text-[14px] text-ink-soft">
                {position.openingTaId
                  ? "Open in the TA System as " + position.openingTaId + "."
                  : "Handed over. It appears here the moment the TA System creates it."}
              </p>
              <Link href={`/positions/${position.id}`} className={pillPrimary + " self-start"}>
                Open the position
              </Link>
            </div>
          ) : !introAccepted || !(openingReady || openedEarly) ? null : (
            <>
              {mayManage && !roleKnown && (
                <form action={saveRequirement} className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5">
                  <KeepFields id="opening-role" />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="step" value="opening" />
                  <span className={figmaLabel}>THE ROLE: A NAME AND A NUMBER ARE ENOUGH TO OPEN IT</span>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto]">
                    <input
                      name="field.title"
                      required
                      defaultValue={requirement?.fields.title ?? ""}
                      placeholder="Position title"
                      className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                    />
                    <input
                      name="field.headcount"
                      required
                      inputMode="numeric"
                      defaultValue={requirement?.fields.headcount ?? ""}
                      placeholder="How many"
                      className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                    />
                    <SubmitButton id="save-role" className={pillSecondary}>
                      Save the role
                    </SubmitButton>
                  </div>
                </form>
              )}
          <NextStepCard
            eyebrow="DECISION"
            title="Can we fill this role as asked?"
            clock={{ label: "Decide today", tone: "warn", icon: "clock" }}
            body="Check the package and skills against the market before we commit the team. If yes, pick the Primary TA and the 100% target date — the opening is created in the TA System from the role you saved above."
          >
            {mayManage ? (
              <RequirementDecisionClient
                leadId={lead.id}
                taPeople={taPeopleList}
                defaultDate={defaultTargetDate}
                rebookHref={stepHref("requirement") + "#book-requirement-meeting"}
              />
            ) : (
              <p className="text-[14px] text-ink-faint">{refusal("client.manage")}</p>
            )}
          </NextStepCard>

            </>
          )}
            </>
          )}
        </>
      )}

      {activeView !== "decline" && (
        <>
          {/* A dot was clicked and it is not the step the work is at: one way back, and no Back/Skip row (18 Nov). */}
          {flow.now && shown !== flow.now && (
            <Link href={`/leads/${lead.id}`} className={pillSecondary + " self-start"}>
              ← Back to what is next: {LEAD_STEP_LABELS[flow.now].toLowerCase()}
            </Link>
          )}
          {!flow.now && position && (
            <Link href={`/positions/${position.id}`} className={pillPrimary + " self-start"}>
              Next: the opening →
            </Link>
          )}

          {/* The second thing current at once (the requirement beside the agreement), as a small card. */}
          {alsoCards.map((card) => (
            <div key={card.step} className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-sunk px-5 py-4">
              <div className="flex flex-col gap-0.5">
                <span className={figmaLabel}>ALSO HAPPENING · {LEAD_STEP_LABELS[card.step].toUpperCase()}</span>
                <span className="text-[14px] text-ink">{card.line}</span>
              </div>
              <Link href={stepHref(card.step)} className={pillSecondary}>
                {card.button}
              </Link>
            </div>
          ))}

          {/* What is finished, one quiet line each; a click opens its record. */}
          {flow.done.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className={figmaLabel}>DONE SO FAR</span>
              {flow.done.map((doneStep) => (
                <Link
                  key={doneStep}
                  href={stepHref(doneStep)}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-t border-rule py-2 text-[13.5px] first:border-t-0 hover:opacity-80"
                >
                  <span className="font-medium text-ink-soft">{LEAD_STEP_LABELS[doneStep]}</span>
                  <span className="text-ink-faint">{doneLine(doneStep, doneFacts)}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {/* Fold 5: Close lead & audit */}
            <FoldRow
              title="Close this lead"
              summary={
                closed
                  ? `Closed · ${STATE_MEANINGS[lead.state as LeadState] ?? lead.state}`
                  : "Only if it is not going ahead · what happened to it"
              }
            >
              <div className="flex flex-col gap-4">
                {!closed && mayManage && (
                  <form action={closeLead} className="flex flex-col gap-3">
                    <p className="text-[13px] text-ink-soft">
                      This closes the lead. Use it only if it is not going ahead - nothing closes without a reason.
                    </p>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1">
                        <span className={figmaLabel}>Why it is closing</span>
                        <select
                          name="state"
                          defaultValue="closed_other"
                          className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                        >
                          <option value="closed_silent">They stopped answering</option>
                          <option value="closed_other">Something else</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className={figmaLabel}>In your own words</span>
                        <input
                          name="reason"
                          required
                          placeholder="Nothing closes without a reason"
                          className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                        />
                      </label>
                    </div>
                    <button type="submit" className={pillSecondary + " self-start"}>
                      Close it
                    </button>
                  </form>
                )}

                <div className="flex flex-col gap-1.5 border-t border-rule pt-3">
                  <span className={figmaLabel}>What happened to it</span>
                  {db.audit
                    .filter(
                      (entry) =>
                        entry.subjectType === "lead" && entry.subjectId === lead.id,
                    )
                    .sort((a, b) => b.at - a.at)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 border-t border-rule py-1.5 text-[13px] first:border-t-0"
                      >
                        <span className="font-medium text-ink">{actionInWords(entry.action)}</span>
                        <span className="text-ink-soft">
                          {nameOf(entry.actorId)} · {whenLocal(entry.at)}
                          {entry.reason ? ` · ${entry.reason}` : ""}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </FoldRow>
          </div>
        </>
      )}
    </Sheet>
  );
}
