import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  bookIntroCall,
  bookRequirementMeeting,
  checkLeadDuplicate,
  closeLead,
  decideLeadIndustry,
  declineAgreement,
  dictateRequirement,
  draftNextChase,
  markMeetingHeld,
  markMeetingNotHeld,
  previewAgreement,
  recordAgreementCountersigned,
  recordAgreementSigned,
  recordChangesWanted,
  saveAgreementFields,
  saveRequirement,
  sendAgreement,
  startAgreement,
} from "@/app/actions";
import AiOffer from "@/app/AiOffer";
import Dictate from "@/app/Dictate";
import Icon from "@/app/Icon";
import RequirementDecisionClient from "@/app/(clients)/leads/[id]/RequirementDecisionClient";
import {
  Avatar,
  BackBar,
  FoldRow,
  JourneyBar,
   type JourneyStep,
  NextStepCard,
  PageBox,
  StatusChip,
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
} from "@/data/desk";
import { currentTemplate } from "@/lib/files";
import { REFUND_PCT } from "@/lib/guarantee";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { type DictatedRequirement } from "@/lib/aiTasks";
import {
  ESA_FIELDS,
  type EsaState,
  STATE_MEANINGS as ESA_STATES,
  chaseStep,
  missingFields,
  whereItStands,
} from "@/lib/esa";
import { SOURCE_MEANINGS, STATE_MEANINGS, type LeadState } from "@/lib/leads";
import {
  KIND_MEANINGS,
  MAX_REBOOKS,
  STATE_MEANINGS as MEETING_STATES,
  type MeetingKind,
  type MeetingState,
} from "@/lib/meetings";
import { leadNextStep } from "@/lib/nextStep";
import { REQUIREMENT_FIELDS, briefText, missingFields as requirementBlanksOf } from "@/lib/requirements";
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
export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; proposed?: string; runId?: string; view?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { id } = await params;
  const { msg, proposed: proposedJson, view } = await searchParams;

  const db = await desk();
  const lead = leadIn(db, id);
  if (!lead) notFound();

  const mayManage = can(member, "client.manage");
  const dictated: DictatedRequirement | null = proposedJson
    ? (JSON.parse(proposedJson) as DictatedRequirement)
    : null;
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

  const taSide = await taPeople();
  const taPeopleList = taSide.ok ? taSide.data.filter((p) => p.isActive) : [];

  const now = Date.now();
  const whenLocal = (at: number) =>
    new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const whenDate = (at: number) =>
    new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);

  const esa = agreementForLead(db, lead.id);
  const esaMissing = esa ? missingFields(esa.fields) : [];
  const esaTemplate = currentTemplate(db.files, "esa_draft");
  const nextChase = esa ? chaseStep(esa.chaseStep + 1) : null;
  const agreementDone = esa?.state === "signed" || esa?.state === "countersigned";

  const requirement = requirementForLead(db, lead.id);
  const requirementBlanks = requirement ? requirementBlanksOf(requirement.fields) : [];
  const position = requirement
    ? (db.positions.find((p) => p.requirementId === requirement.id) ?? null)
    : null;

  const signedFiles = db.files.filter((f) => f.kind === "esa_signed");
  const countersignedFiles = db.files.filter((f) => f.kind === "esa_countersigned");
  const draftFiles = esa
    ? db.files.filter((f) => f.subjectType === "esa" && f.subjectId === esa.id)
    : [];

  const step = leadNextStep(lead, {
    meetings,
    esa,
    requirement,
    position,
    requiredFields: REQUIREMENT_FIELDS.filter((f) => f.required).map((f) => f.key),
  });

  // Determine which view is shown
  const activeView: "lead" | "decline" | "agreement" | "requirement" =
    view === "agreement"
      ? "agreement"
      : view === "requirement"
        ? "requirement"
        : view === "decline" || (lead.industryFlagged && !lead.industryConfirmedBy && !closed)
          ? "decline"
          : "lead";

  // Build 8-step JourneyBar
  const journeySteps: JourneyStep[] = [
    {
      label: "Enquiry",
      state:
        activeView === "decline" || (lead.state === "new" && activeView === "lead")
          ? "current"
          : "done",
      href: `/leads/${lead.id}`,
    },
    {
      label: "Agreement",
      state:
        activeView === "agreement"
          ? "current"
          : agreementDone
            ? "done"
            : lead.state === "waiting_agreement" || lead.state === "intro_call"
              ? "current"
              : "upcoming",
      href: `/leads/${lead.id}?view=agreement`,
    },
    {
      label: "Requirement",
      state:
        activeView === "requirement"
          ? "current"
          : position
            ? "done"
            : lead.state === "requirement"
              ? "current"
              : "upcoming",
      href: `/leads/${lead.id}?view=requirement`,
    },
    {
      label: "Opening",
      state: position ? "done" : "upcoming",
      href: position ? `/positions/${position.id}` : undefined,
    },
    { label: "CVs", state: "upcoming" },
    { label: "Interviews", state: "upcoming" },
    { label: "Placement", state: "upcoming" },
    { label: "Guarantee", state: "upcoming" },
  ];

  const sourceText =
    SOURCE_MEANINGS[lead.source as keyof typeof SOURCE_MEANINGS] ?? lead.source;
  const defaultTargetDate = new Date(now + 21 * 86_400_000).toISOString().slice(0, 10);

  return (
    <PageBox width="1080" className="gap-7">
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
                    ? "Held today · 28 min"
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
              {requirement?.fields.roleTitle || lead.notes || "Role brief"} ·{" "}
              {requirement?.fields.workLocation || "Colombo"} ·{" "}
              {requirement?.fields.headcount
                ? `${requirement.fields.headcount} opening`
                : "1 opening"}{" "}
              · {requirement?.fields.salaryPackage || "Package to confirm"}
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

        <JourneyBar steps={journeySteps} />
      </div>

      {msg && (
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
              body={`${esa.fields.signatoryName || lead.contactName || "The client"} signed and returned the agreement${esa.signedAt ? " on " + whenDate(esa.signedAt) : ""}, with the company seal. Once the Director countersigns, upload it here — the client gets their copy and the requirement meeting opens.`}
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
              title="Agreement countersigned — open the requirement meeting"
              clock={{ label: "Countersigned", tone: "ok", icon: "check" }}
              body="Both sides have signed the Employment Services Agreement and the client record is active. Proceed to the requirement meeting to capture the brief and hand over the position to TA."
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
          ) : (
            <NextStepCard
              title={
                esa.state === "negotiating"
                  ? `Agree the changes and send version ${esa.version + 1}`
                  : "Check the terms and send the agreement"
              }
              clock={{ label: "Within 2h of intro call", tone: "warn", icon: "clock" }}
              body={
                esaMissing.length > 0
                  ? `Still blank: ${esaMissing.map((f) => f.label.toLowerCase()).join(", ")}. Fill the terms below before sending — a draft never goes out with placeholders.`
                  : "All required agreement fields are filled in. Generate the PDF and draft the cover email for approval."
              }
              byItself="Sending starts the 5-step chase and the 14-day close timer."
            >
              {mayManage && (
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <form action={sendAgreement}>
                    <input type="hidden" name="esaId" value={esa.id} />
                    <button type="submit" className={pillPrimary}>
                      {esa.state === "negotiating"
                        ? `Draft cover email & send v${esa.version + 1}`
                        : "Draft the cover email and send"}
                    </button>
                  </form>
                  <a href="#terms-card" className={pillSecondary}>
                    Edit terms
                  </a>
                </div>
              )}
            </NextStepCard>
          )}

          {/* Two-column TERMS + VERSIONS cards (Figma 1:699) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                    {esa?.fields.feeClause || "8.33% (one month’s gross) · min LKR 50,000"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-rule py-2.5 text-[14px]">
                  <span className="text-ink-soft">Guarantee</span>
                  <span className="font-medium text-ink">
                    {esa?.fields.guaranteeDays || "90"} days (standard)
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

              {esa && mayManage && (
                <details
                  open={esa.state === "draft" || esa.state === "negotiating"}
                  className="border-t border-rule pt-3"
                >
                  <summary className="cursor-pointer text-[13px] font-medium text-brand hover:underline">
                    Edit agreement fields
                  </summary>
                  <form action={saveAgreementFields} className="mt-3 flex flex-col gap-3">
                    <input type="hidden" name="esaId" value={esa.id} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {ESA_FIELDS.map((field) => (
                        <label
                          key={field.key}
                          className={
                            "flex flex-col gap-1 " +
                            (field.key === "notes" ? "sm:col-span-2" : "")
                          }
                        >
                          <span className={figmaLabel}>
                            {field.label}
                            {field.required ? "" : " (optional)"}
                          </span>
                          <input
                            name={"field." + field.key}
                            defaultValue={esa.fields[field.key] ?? ""}
                            className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                          />
                        </label>
                      ))}
                    </div>
                    {!esaTemplate && (
                      <p className="text-[12.5px] text-ink-soft">
                        Note: Upload the master Word template on{" "}
                        <Link href="/files" className="text-brand underline">
                          Files
                        </Link>{" "}
                        as &ldquo;Agreement, drafted&rdquo; before generating the PDF.
                      </p>
                    )}
                    <button type="submit" className={pillSecondary + " self-start"}>
                      Save the fields
                    </button>
                  </form>
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
                  {draftFiles.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1 text-[13px]">
                      {[...draftFiles]
                        .sort((a, b) => b.uploadedAt - a.uploadedAt)
                        .map((f) => (
                          <Link key={f.id} href={`/api/files/${f.id}`} className="text-brand hover:underline">
                            Download filled draft: {f.name}
                          </Link>
                        ))}
                    </div>
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
                <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]">
                  <span className="font-medium text-ink">
                    v{esa?.version ?? 1}
                    {esa?.state === "signed" || esa?.state === "countersigned"
                      ? " · signed"
                      : ""}
                  </span>
                  <span className="text-ink-soft">
                    {esa?.sentAt ? `Sent ${whenDate(esa.sentAt)}` : "Draft"}
                    {esa?.signedAt ? ` · signed ${whenDate(esa.signedAt)} · sealed` : ""}
                  </span>
                  {esa?.signedFileId || esa?.draftFileId || draftFiles[0] ? (
                    <Link
                      href={`/api/files/${esa?.signedFileId ?? esa?.draftFileId ?? draftFiles[0]?.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      Open PDF
                    </Link>
                  ) : (
                    <Link href="/files" className="font-medium text-brand hover:underline">
                      Files
                    </Link>
                  )}
                </div>

                {esa && esa.version > 1 && (
                  <div className="flex items-center justify-between border-t border-rule py-2.5 text-[14px]">
                    <span className="font-medium text-ink">v1</span>
                    <span className="text-ink-soft">
                      {esa.reason || "Client asked to revise payment window"}
                    </span>
                  </div>
                )}

                {esa?.reason && (
                  <div className="flex items-center justify-between border-t border-rule py-2.5 text-[14px]">
                    <span className="font-medium text-ink">Negotiation meeting</span>
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
          <NextStepCard
            eyebrow="DECISION"
            title="Can we fill this role as asked?"
            clock={{ label: "Decide today", tone: "warn", icon: "clock" }}
            body="Check the package and skills against the market before we commit the team. If yes, pick the Primary TA and the 100% target date — the opening is created in the TA System from what you captured below."
          >
            {mayManage ? (
              <RequirementDecisionClient
                leadId={lead.id}
                taPeople={taPeopleList}
                defaultDate={defaultTargetDate}
                rebookHref="#book-requirement-meeting"
              />
            ) : (
              <p className="text-[14px] text-ink-faint">{refusal("client.manage")}</p>
            )}
          </NextStepCard>

          {/* Two-column WHAT WE HEARD + WHAT HAPPENS NEXT (Figma 1:2112) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

              {mayManage && (
                <details
                  open={!requirement || requirementBlanks.length > 0}
                  className="border-t border-rule pt-3"
                >
                  <summary className="cursor-pointer text-[13px] font-medium text-brand hover:underline">
                    Edit requirement fields or dictate brief
                  </summary>

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
                        <Dictate into="said" label="Hold a moment and speak" />
                        <button type="submit" className={pillSecondary}>
                          Put it into the fields
                        </button>
                      </div>
                    </form>
                  )}

                  <form action={saveRequirement} className="mt-3 flex flex-col gap-3">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {REQUIREMENT_FIELDS.map((f) => (
                        <label
                          key={f.key}
                          className={
                            "flex flex-col gap-1 " +
                            (f.key === "jdNotes" || f.key === "insights"
                              ? "sm:col-span-2"
                              : "")
                          }
                        >
                          <span className={figmaLabel}>
                            {f.label}
                            {f.required ? "" : " (optional)"}
                          </span>
                          {f.key === "jdNotes" || f.key === "insights" ? (
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

              {mayManage && (
                <details open={!requirementMeeting} className="border-t border-rule pt-3">
                  <summary className="cursor-pointer text-[13px] font-medium text-brand hover:underline">
                    {requirementMeeting
                      ? "Rebook requirement meeting"
                      : "Book the requirement meeting"}
                  </summary>
                  <form
                    action={bookRequirementMeeting}
                    className="mt-3 flex flex-col gap-3"
                  >
                    <input type="hidden" name="leadId" value={lead.id} />
                    <label className="flex flex-col gap-1">
                      <span className={figmaLabel}>Meeting link or address (goes in the drafted invite)</span>
                      <input
                        name="link"
                        placeholder="https://teams.microsoft.com/..."
                        className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1">
                        <span className={figmaLabel}>When (Colombo time)</span>
                        <input
                          type="datetime-local"
                          name="at"
                          required
                          className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className={figmaLabel}>Which TA lead is joining</span>
                        {taPeopleList.length > 0 ? (
                          <select
                            name="taLeadId"
                            className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                          >
                            {taPeopleList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.fullName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            name="taLeadId"
                            placeholder="TA lead name"
                            className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                          />
                        )}
                      </label>
                    </div>
                    <button type="submit" className={pillSecondary + " self-start"}>
                      Book the requirement meeting
                    </button>
                  </form>
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
            {mayManage && (
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
      {activeView === "lead" && (
        <>
          {/* Hero Next Step Card (Figma 1:510) */}
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

          {/* 4 Collapsible Fold Rows (Figma 1:531) */}
          <div className="flex flex-col gap-2.5">
            {/* Fold 1: Enquiry */}
            <FoldRow
              title="Enquiry"
              summary={`${sourceText} · ${whenDate(lead.createdAt)} · ${lead.clientTaId ? "In TA System (" + lead.clientTaId + ")" : "Not in TA System"} · ${lead.industryFlagged && !lead.industryConfirmedBy ? "Flagged for industry" : "Industry OK"}`}
              defaultOpen={step.at === "duplicate"}
            >
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

                {mayManage && (
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
              </div>
            </FoldRow>

            {/* Fold 2: Intro call */}
            <FoldRow
              title="Intro call"
              summary={
                introMeetings.length > 0
                  ? introMeetings
                      .map(
                        (m) =>
                          `${MEETING_STATES[m.state as MeetingState] ?? m.state} ${whenDate(m.at)}${m.brief ? ` — “${m.brief.slice(0, 64)}”` : ""}`,
                      )
                      .join(" · ")
                  : "Not booked yet · TA lead joins every intro call"
              }
              defaultOpen={step.at === "intro"}
            >
              <div className="flex flex-col gap-4">
                {meetings.map((meeting) => (
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
                      <div className="mt-2 grid grid-cols-1 gap-4 border-t border-rule pt-3 lg:grid-cols-2">
                        <form action={markMeetingHeld} className="flex flex-col gap-2.5">
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
                          <button type="submit" className={pillPrimary + " self-start"}>
                            It was held
                          </button>
                        </form>

                        <form
                          action={markMeetingNotHeld}
                          className="flex flex-col gap-2.5"
                        >
                          <input type="hidden" name="meetingId" value={meeting.id} />
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
                          <button type="submit" className={pillSecondary + " self-start"}>
                            It was not held
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}

                {mayManage && !nextBooked && (
                  <form action={bookIntroCall} className="flex flex-col gap-3">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <label className="flex flex-col gap-1">
                      <span className={figmaLabel}>Meeting link or address (goes in the drafted invite)</span>
                      <input
                        name="link"
                        placeholder="https://teams.microsoft.com/..."
                        className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1">
                        <span className={figmaLabel}>When (Colombo time)</span>
                        <input
                          type="datetime-local"
                          name="at"
                          required
                          className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className={figmaLabel}>Which TA lead is joining</span>
                        {taPeopleList.length > 0 ? (
                          <select
                            name="taLeadId"
                            className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                          >
                            {taPeopleList.map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.fullName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            name="taLeadId"
                            placeholder="TA lead name"
                            className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                          />
                        )}
                      </label>
                    </div>
                    <button type="submit" className={pillPrimary + " self-start"}>
                      {meetings.length ? "Book it again" : "Book the intro call"}
                    </button>
                  </form>
                )}
              </div>
            </FoldRow>

            {/* Fold 3: Agreement */}
            <FoldRow
              title="Agreement"
              summary={
                esa
                  ? `ESA v${esa.version} · ${whereItStands({ ...esa, state: esa.state as EsaState }, now)}`
                  : "Not started yet · due within 2 hours of the intro call"
              }
              defaultOpen={step.at === "agreement"}
            >
              <div className="flex flex-col gap-3">
                <p className="text-[14px] text-ink-soft">
                  {esa
                    ? `${ESA_STATES[esa.state as EsaState] ?? esa.state} · version ${esa.version}.`
                    : "Start the Employment Services Agreement to fill the client’s terms and send the PDF."}
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href={`/leads/${lead.id}?view=agreement`}
                    className={pillPrimary}
                  >
                    Open full agreement view
                  </Link>
                  {!esa && mayManage && (
                    <form action={startAgreement}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button type="submit" className={pillSecondary}>
                        Start the agreement
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </FoldRow>

            {/* Fold 4: Requirement meeting */}
            <FoldRow
              title="Requirement meeting"
              summary={
                position
                  ? `Handed over to TA · ${position.title}`
                  : requirement
                    ? "Brief captured · ready to open position"
                    : "Unlocks once the agreement is signed and countersigned"
              }
              defaultOpen={step.at === "requirement"}
            >
              <div className="flex flex-col gap-3">
                <p className="text-[14px] text-ink-soft">
                  {agreementDone
                    ? "The agreement is signed. Capture the requirement brief and hand over the position to TA."
                    : "Nothing starts here until the agreement is signed — that is the rule that stops us working without terms."}
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href={`/leads/${lead.id}?view=requirement`}
                    className={agreementDone ? pillPrimary : pillSecondary}
                  >
                    Open requirement meeting view
                  </Link>
                  {position && (
                    <Link
                      href={`/positions/${position.id}`}
                      className={pillSecondary}
                    >
                      View opening
                    </Link>
                  )}
                </div>
              </div>
            </FoldRow>

            {/* Fold 5: Close lead & audit */}
            <FoldRow
              title="Close this lead or view history"
              summary={
                closed
                  ? `Closed · ${STATE_MEANINGS[lead.state as LeadState] ?? lead.state}`
                  : "Close with a reason · audit log"
              }
            >
              <div className="flex flex-col gap-4">
                {!closed && mayManage && (
                  <form action={closeLead} className="flex flex-col gap-3">
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
                        <span className="font-medium text-ink">{entry.action}</span>
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
    </PageBox>
  );
}
