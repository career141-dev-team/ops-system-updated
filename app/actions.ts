"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addAgreement,
  addBaseline,
  cancelClocksFor,
  addFile,
  addHolidays,
  addLead,
  addChatRow,
  chatFor,
  updateChatRow,
  dayItems,
  whyFirstKept,
  addMeeting,
  agreementForLead,
  addPosition,
  addRequirement,
  compileTalentPulse,
  issueIn,
  agreementIn,
  chaseTheAgreement,
  clientFromLead,
  clientIn,
  clientSetIn,
  holdIn,
  patchClientSet,
  patchHold,
  patchIssue,
  patchPosition,
  patchRequirement,
  addAd,
  addAiRun,
  addApplicant,
  addAuditNote,
  addClient,
  addInterview,
  addMember,
  patchMember,
  addInvoice,
  addReference,
  addTeamNote,
  removeTeamNote,
  addVacancy,
  patchApplicant,
  ingestScoopFiles,
  patchVacancy,
  snoozeTask as snoozeTaskInDesk,
  buildWeeklyReport,
  adIn,
  aiRunIn,
  member as deskMember,
  checklistIn,
  evaluateDepth,
  positionForSet,
  draftCandidateFeedback,
  draftCreditNote,
  draftSurchargeInvoice,
  guaranteeForPlacement,
  guaranteeIn,
  interviewIn,
  invoiceIn,
  liveAdFor,
  liveInterviewFor,
  noticeCandidateOut,
  markLeaver,
  markPlacementJoined,
  openCloseChecklist,
  openTasksFor,
  patchInterview,
  patchAd,
  recordAiOutcome,
  runAi,
  aiSwitches,
  patchChecklist,
  patchGuarantee,
  patchInvoice,
  patchPlacement,
  patchReference,
  patchReport,
  placementIn,
  positionForOpening,
  positionIn,
  referenceForApplication,
  referenceIn,
  reportIn,
  startInterviewClocks,
  startJoinClocks,
  requirementForLead,
  startReceiptClocks,
  restartReceiptClocks,
  clientsNewestFirst,
  patchClient,
  draftMessage,
  patchAgreement,
  cancelMeetingClocks,
  createTask,
  desk,
  draftFeeInvoice,
  draftsWaiting,
  leadIn,
  meetingIn,
  meetingsForLead,
  patchLead,
  patchMeeting,
  editMessage,
  fileIn,
  logCall,
  pushOutbox,
  takeOpeningUpdate,
  queueTaWrite,
  readTaEvents,
  removeHoliday,
  fileInbound,
  markInboundActioned,
  readTheMailboxes,
  takeInbound,
  takeClientSetReadyWith,
  takeInterviewEvent,
  takeOpeningCreated,
  takePlacementFrom,
  takePlacementOutcome,
  finishTask as finishTaskWrite,
  numberOf,
  recordReply as recordReplyWrite,
  runClocks,
  setSetting,
  saveTemplate,
  settleMessage,
  templateFor,
  textOf,
  startTimer,
  switchedOn,
  clientForLead,
  addHold,
  liveHoldFor,
} from "@/data/desk";
import { CHAT_COOKIE, CHAT_COOKIE_LIFE, addChatThread, chatLines, chatName, chatOpen, chatsOf, deleteChatThread, renameChatThread } from "@/data/chats";
import { DAY, HOUR, colomboDate, colomboDateInWords, nextNineAm } from "@/lib/calendar";
import { moveTarget, problemWithMove, problemWithMover } from "@/lib/taskMove";
import { can, refusal } from "@/lib/roles";
import { safeBack, withMsg } from "@/lib/back";
import { CALL_NOT_FIT, colomboLocalToMs, problemWithApplicantDetails, problemWithApplicant, problemWithHiringCall, problemWithCv, problemWithCvBytes, problemWithHiringDecision, problemWithVacancy } from "@/lib/hiring";
import {
  problemWithHistoryCorrection,
  problemWithInviteBack,
  problemWithManualChase,
  problemWithRefundDecision,
  problemWithTeamNote,
  isRepeatTeamNote,
  canDeleteTeamNote,
} from "@/lib/panelActions";
import { doNotContactFrom, gate, isRoutine, needsApproval, sentToday } from "@/lib/messages";
import {
  addressesFrom,
  buildThreads,
  problemWithCompose,
  problemWithReply,
  replySubject,
  type Thread,
} from "@/lib/mailbox";
import { settingChange } from "@/lib/settingsRules";
import { askWithTools, problemWithRunning } from "@/lib/ai";
import { agentSystemPrompt, AGENT_TOOLS, runAgentTool, withTaNames } from "@/lib/agentTools";
import { graphToken, senderMailbox, groupPostIsManual, outreachLiveInEnv, sendEmail, sendWhatsApp, sendingEnabled, subjectWithReference } from "@/lib/senders";
import { problemWith } from "@/lib/templates";
import { fakeArrival } from "@/lib/graphMail";
import { putBytes, readBytes } from "@/data/fileStore";
import { fillDocx, problemWithFill } from "@/lib/docxFill";
import {
  AD_DAYS,
  type AdState,
  adClosesOn,
  canMoveAdTo,
  problemWithAdLive,
  problemWithAdOrder,
  problemWithAdRequest,
  problemWithFlyer,
  problemWithIssue,
  problemWithLinkedIn,
  tidyLinkedIn,
} from "@/lib/adverts";
import { problemWithTeam, withPeople } from "@/lib/openingTeam";
import { invoiceSheet, nextInvoiceVersion } from "@/lib/invoiceDoc";
import { drawInvoicePdf, problemWithBank } from "@/lib/invoicePdf";
import {
  briefText,
  problemWithNewPosition,
  missingFields as requirementMissing,
  problemWithEarlyOpening,
  problemWithImpractical,
  problemWithOpening,
  problemWithRequirement,
  requirementLocked,
} from "@/lib/requirements";
import {
  HOLD_REVIEW_DAYS,
  OWNERSHIP_WORKING_DAYS,
  claimVerdict,
  ownershipWindow,
  problemWithDecision,
  problemWithHold,
  problemWithLift,
} from "@/lib/clientFeedback";
import {
  MIN_CVS,
  type SetState,
  canMoveTo as canMoveSetTo,
  problemWithInternalInterview,
  problemWithSending,
} from "@/lib/clientSets";
import { docxToPdf } from "@/lib/docxToPdf";
import {
  type FileKind,
  canBecomePdf,
  currentTemplate,
  isFileKind,
  keyFor,
  mimeFor,
  pdfNameFor,
  problemWithUpload,
  safeName,
  sha256,
} from "@/lib/files";
import { referenceFor } from "@/lib/mailMatch";
import { problemWithCall, tidyPhone } from "@/lib/calls";
import { decodeRoles, permissionSentence } from "@/lib/integrationHealth";
import { MAX_PER_BATCH } from "@/lib/scoop";
import { problemWithNewHandler } from "@/lib/clientPositionTable";
import { type QuickKind, QUICK_KINDS, clientNamed, noteToTask, problemWithNote } from "@/lib/quickAdd";
import { whatFirst, whatFirstKey } from "@/lib/whatFirst";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import { cookies } from "next/headers";
import { type ChatButton, type Runnable, answerPending, asQuestion, catalogueInWords, editFrom, pendingFrom, pendingMark, planFrom, planMark, resolveIntent, wantsOut, withEdit } from "@/lib/agent";
import { HOLD_AT, problemWithAnotherSet } from "@/lib/depth";
import { problemWithReport, recipientsFrom, reportText } from "@/lib/reports";
import {
  type Answer,
  type DictatedRequirement,
  IMPROVE_WORDS,
  type ImproveHow,
  type ImprovedDraft,
  type InboundRead,
  type Summary,
  askPrompt,
  dictateRequirementPrompt,
  transcriptRequirementPrompt,
  improveDraftPrompt,
  inboundReadPrompt,
  notSaidInWords,
  summarisePrompt,
  type AgentSaid,
  agentPrompt,
  type WhyFirst,
  whyFirstPrompt,
} from "@/lib/aiTasks";
import {
  CLOSE_TRIGGERS,
  REFUND_PCT,
  problemWithCloseComplete,
  problemWithTick,
  problemWithLeaver,
  problemWithRefund,
  refundAmount,
} from "@/lib/guarantee";
import {
  WRITE_OFF_DAYS,
  balanceOf,
  feeAmount,
  feeInWords,
  invoiceLines,
  money,
  problemWithDojChange,
  problemWithNoShow,
  problemWithSalarySplit,
  problemWithNoShowChoice,
  paymentDate,
  problemWithPayment,
  problemWithPaymentOn,
  problemWithWriteOff,
} from "@/lib/money";
import {
  type InterviewState,
  MAX_SLOT_LOOPS,
  canMoveTo as canMoveInterviewTo,
  FORMAT_MEANINGS,
  interviewersFrom,
  parseSlots,
  problemWithAttendance,
  problemWithInterviewBooking,
  problemWithNewSlots,
  problemWithAnswers,
  problemWithPick,
  problemWithReference,
  problemWithReschedule,
  problemWithRelay,
  problemWithRoundDecision,
  problemWithSlots,
} from "@/lib/interviews";
import { parseHolidayLines } from "@/lib/holidays";
import {
  IMPORT_KINDS,
  type ImportKind,
  planImport,
  planInWords,
  problemWithImport,
} from "@/lib/importer";
import { MEASURES } from "@/lib/baseline";
import {
  type LeadState,
  duplicateMatch,
  flagIndustry,
  nameKey,
  neverInviteBack,
  problemWithClosing,
  directClientRouting,
  existingClientOf,
  introSatisfied,
  problemWithNewClient,
  problemWithNewLead,
  routeLead,
} from "@/lib/leads";
import { clients as taClients, fakeTa, people as taPeople, preparedCv } from "@/lib/ta";
import { cancelTeamsEvent, createTeamsEvent, fetchTranscript, listEvents, moveTeamsEvent, teamsFake } from "@/lib/graphCalendar";
import { clashWith } from "@/lib/outlook";
import { trimForAi, vttToText } from "@/lib/transcript";
import { stampCountersignature } from "@/lib/countersign";
import { type ContactRow, contactsFor, problemWithContact, setRecipients } from "@/lib/contacts";
import {
  type Attendee,
  DEFAULT_LENGTH,
  attendeesFrom,
  canAutoSendInvite,
  isStandInTeamsLink,
  problemWithAttendees,
  problemWithLength,
} from "@/lib/teams";
import { tryBuildStrategyAdditions } from "@/lib/strategies";
import {
  type EsaFields,
  type EsaState,
  canMoveTo,
  chaseStep,
  coverEmail,
  defaultFields,
  expiresAt as esaExpiresAt,
  nextChaseAt,
  nextDraftVersion,
  startingFields,
  ESA_FIELDS,
  WORDED_HOLES,
  holeValues,
  problemWithChanges,
  problemWithDraft,
  problemWithSigned,
} from "@/lib/esa";
import {
  type ClientStage,
  STAGE_MEANINGS,
  callKindFor,
  problemWithBilling,
  problemWithClientRename,
  problemWithInvoiceBilling,
  problemWithStageMove,
} from "@/lib/clients";
import { invoiceHoles, problemWithInvoiceFill } from "@/lib/invoiceDoc";
import {
  afterNotHeld,
  agreementDueAt,
  missingFromHeld,
  problemWithBooking,
  problemWithHeld,
  remindersFor,
  warningAboutBooking,
} from "@/lib/meetings";
import { devSignInAllowed } from "@/lib/session";
import type { Id, OpsClient, OpsDatabase, OpsFile, OpsInterview, OpsLead, OpsMember, OpsMessage } from "@/data/types";
import { buildInvite, colomboWhen, type InviteInput } from "@/lib/ics";
import { currentMember, realMember, signOut, VIEW_AS } from "@/lib/session";
import { previewRoleFrom } from "@/lib/roles";

/**
 * What the screens can do. Every one of them checks the role first, and every
 * refusal is a sentence a person can act on rather than a code.
 */


/**
 * The way back to a lead step after a button (17 Nov). With the button's own id (`at`,
 * a hidden field), the page comes back scrolled to that button with the answer beside
 * it, instead of at the top with a banner (app/ui/SubmitButton.tsx).
 */
function leadBack(here: string, step: string, msg: string, formData: FormData): string {
  return answerBack(here + "?step=" + step, msg, formData);
}

/**
 * A step is finished (18 Nov): go to the bare lead page, which opens on the step the work is at now,
 * so the person never has to find what comes next. An error keeps `leadBack` and stays where it was.
 */
function leadMoved(here: string, msg: string, formData: FormData): string {
  return answerBack(here, msg, formData);
}

/** The same for a page that has no steps (a placement, an invoice): the answer comes back beside the button. */
function answerBack(url: string, msg: string, formData: FormData): string {
  const at = String(formData.get("at") ?? "");
  const ok = /^[a-z0-9-]{1,64}$/.test(at);
  return withMsg(backTo(formData, url), msg) + (ok ? "&at=" + at + "#" + at : "");
}

export async function startTestClock(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  await startTimer({
    kind: "test.clock",
    subjectType: "test",
    subjectId: "test",
    startsAt: Date.now(),
    dueAt: Date.now() + 2 * HOUR,
    warnAt: Date.now() + HOUR,
    ownerId: member.id,
    payload: { label: "Test clock, started by " + member.name },
  });
  revalidatePath("/");
}

/** The clocks run on every visit to the inbox; this is the same pass by hand. */
export async function runClocksNow(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const result = await runClocks();
  revalidatePath("/");
  const said =
    result.fired || result.warned || result.escalated
      ? result.fired + " clocks finished, " + result.warned + " are close, " + result.escalated + " tasks passed on."
      : "Nothing was due.";
  redirect("/?msg=" + encodeURIComponent(said));
}

/** The client answered, so the chasing stops. */
export async function recordReply(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const subjectType = String(formData.get("subjectType") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const back = String(formData.get("back") ?? "/");
  const stopped = await recordReplyWrite(subjectType, subjectId, member.id);
  revalidatePath("/");
  redirect(
    back +
      "?msg=" +
      encodeURIComponent(
        stopped ? "Noted. " + stopped + " chase" + (stopped === 1 ? "" : "s") + " stopped." : "Noted. There was no chase running.",
      ),
  );
}

/** Only the ops lead, and never without saying why (owner's standing rule). */
export async function changeSetting(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const key = String(formData.get("key") ?? "");
  const raw = String(formData.get("value") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const go = (msg: string): never => redirect(landed(formData, "/settings", msg));

  if (!can(member, "settings.manage")) {
    return redirect(landed(formData, "/settings", refusal("settings.manage")));
  }
  const current = (await desk()).settings.find((s) => s.key === key);
  if (!current) return redirect(landed(formData, "/settings", "There is no setting called " + key + "."));

  const decided = settingChange(key, current.value, raw, reason);
  if (!decided.ok) return redirect(landed(formData, "/settings", decided.message));

  await setSetting(key, decided.value, member.id, reason);
  revalidatePath("/settings");
  return redirect(landed(formData, "/settings", key + " is now " + String(decided.value) + "."));
}

/** Saves who covers a team member while they are on leave (S2 Settings · Templates and people). */
export async function saveCover(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const go = (msg: string): never => redirect(landed(formData, "/settings?view=templates", msg));
  if (!can(member, "settings.manage")) go(refusal("settings.manage"));

  const awayId = String(formData.get("awayId") ?? "").trim();
  const coverId = String(formData.get("coverId") ?? "").trim();
  const until = String(formData.get("until") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!awayId) go("Pick who is away.");
  if (reason.length < 3) go("Write a short reason for this cover change.");

  const db = await desk();
  const away = db.members.find((m) => m.id === awayId);
  if (!away) go("That team member no longer exists.");
  if (coverId && coverId === awayId) go("Somebody else has to cover.");
  const cover = coverId ? db.members.find((m) => m.id === coverId) : null;
  if (coverId && !cover) go("Pick a team member who is active.");

  const val = cover ? JSON.stringify({ coverId: cover.id, until }) : "";
  await setSetting("cover." + awayId, val, member.id, reason);
  revalidatePath("/settings");
  go(cover ? `${cover.name} now covers ${away!.name}${until ? " until " + until : ""}.` : `Cover cleared for ${away!.name}.`);
}

/** Read the Ops mailbox now. Off until the credentials exist, and it says so. */
export async function readMailNow(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const r = await readTheMailboxes(member.id);
  const counted =
    r.read + " new, " + r.filed + " filed, " + r.waiting + " waiting for you, " + r.chasesStopped + " chases stopped" +
    (r.already ? ", " + r.already + " we had already" : "") +
    // Said out loud: a person should know the reader left things out, and
    // roughly how much, rather than wondering where an email went (6 Nov).
    (r.ignored ? ", " + r.ignored + " newsletters and automatic messages left out" : "") + ".";
  const said = r.ok ? counted : (r.reason ?? "The mailboxes could not be read.") + " " + counted;
  revalidatePath("/mail");
  redirect(landed(formData, "/mail", said));
}

/* ── The stand-in TA System panel (/dev/ta, 17 Nov) ─────────────────────────
 *
 * Several steps of the flow wait for the TA System to say something: that an
 * opening exists, that a set of CVs is ready, what a candidate said after an
 * interview, that somebody was placed or joined. Until the real API answers,
 * these buttons say it with invented data, through the very same handlers the
 * real events go through. Refused unless the development sign-in AND the
 * stand-in TA System are both on, so they can never run against the real one.
 */
function devTaOnly(): void {
  if (!devSignInAllowed() || !fakeTa()) {
    redirect("/?msg=" + encodeURIComponent("The stand-in TA System panel is for development only."));
  }
}

function devTaBack(message: string): never {
  revalidatePath("/dev/ta");
  redirect("/dev/ta?msg=" + encodeURIComponent(message));
}

/** TA creates the opening Ops handed over (the oldest one waiting for this client). */
export async function devTaCreateOpening(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  devTaOnly();
  const db = await desk();
  const position = positionIn(db, String(formData.get("positionId") ?? ""));
  if (!position || position.openingTaId) devTaBack("That opening is not waiting for TA.");
  const waiting = position as NonNullable<typeof position>;
  const made = await takeOpeningCreated({
    openingId: "ta_dev_" + waiting.id.replace(/^pos_/, ""),
    clientId: waiting.clientTaId,
    title: waiting.title,
    primaryRecruiterId: "ta_u2",
  });
  revalidatePath("/positions");
  devTaBack(made ? "TA created the opening (invented id " + made.openingTaId + ")." : "Nothing was waiting for that client.");
}

/** TA says a set of five CVs is ready. */
export async function devTaSendSet(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  devTaOnly();
  const db = await desk();
  const position = positionIn(db, String(formData.get("positionId") ?? ""));
  if (!position?.openingTaId) devTaBack("The opening has to exist in TA first.");
  const row = position as NonNullable<typeof position>;
  const opening = row.openingTaId as string;
  const setNumber = db.clientSets.filter((c) => c.openingTaId === opening).length + 1;
  const base = opening.replace(/^ta_dev_/, "");
  const names = ["ONE", "TWO", "THREE", "FOUR", "FIVE"];
  const made = await takeClientSetReadyWith(
    opening,
    setNumber,
    {
      id: "ta_round_" + base + "_" + setNumber,
      setNumber,
      openingId: opening,
      applicationIds: names.map((n) => "ta_dev_" + base + "_s" + setNumber + n.toLowerCase()),
      applications: names.map((n) => ({
        id: "ta_dev_" + base + "_s" + setNumber + n.toLowerCase(),
        name: "SAMPLE CANDIDATE " + n + " (SET " + setNumber + ")",
        preparedCv: true,
      })),
      dispatch: "ready",
      status: "ready",
      sentAt: null,
      receivedAt: null,
    },
    {
      id: opening,
      title: row.title,
      clientId: row.clientTaId,
      status: "open",
      primaryRecruiterId: "ta_u2",
      taLeadId: "ta_u1",
      headcount: 1,
      assignedAt: row.handedOverAt,
    },
  );
  if (made) {
    const { fakeTaAddApps } = await import("@/data/fakeTa");
    fakeTaAddApps(
      opening,
      names.map((n) => ({
        id: "ta_dev_" + base + "_s" + setNumber + n.toLowerCase(),
        candidateName: "SAMPLE CANDIDATE " + n + " (SET " + setNumber + ")",
        currentStage: "screened",
        setNumber,
        backupForApplicationId: null,
      })),
    );
  }
  revalidatePath("/sets");
  devTaBack(made ? "TA says set " + setNumber + " is ready: five invented candidates, each with a sample CV." : "That set was already there.");
}

/** What TA tells Ops about an interview. */
export async function devTaInterviewEvent(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  devTaOnly();
  const db = await desk();
  const interview = interviewIn(db, String(formData.get("interviewId") ?? ""));
  if (!interview) devTaBack("That interview is gone.");
  const row = interview as NonNullable<typeof interview>;
  const type = String(formData.get("type") ?? "");
  const samples: Record<string, Record<string, unknown>> = {
    "interview.confirmed": {},
    "interview.feedback": {
      feedback: "Keen on the role and the team. Asked about growth and the reporting line. Notice period is one month and the salary ask is in range. (Invented, for testing.)",
    },
    "interview.outcome": { outcome: "attended" },
    "interview.outcome:no_show": { outcome: "no_show" },
    "interview.candidate_out": { reason: "They accepted another offer. (Invented, for testing.)" },
  };
  const key = String(formData.get("sample") ?? type);
  if (!(key in samples)) devTaBack("That is not an event the stand-in can send.");
  await takeInterviewEvent(type, { applicationId: row.applicationTaId, ...samples[key] });
  revalidatePath("/interviews/" + row.id);
  devTaBack("TA sent " + type + " for " + row.candidateName + ".");
}

/** TA places a candidate: the day the money starts. */
export async function devTaPlace(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  devTaOnly();
  const db = await desk();
  const position = positionIn(db, String(formData.get("positionId") ?? ""));
  if (!position?.openingTaId) devTaBack("The opening has to exist in TA first.");
  const row = position as NonNullable<typeof position>;
  const applicationId = String(formData.get("applicationId") ?? "");
  if (!applicationId) devTaBack("Pick who is placed.");
  // One placement per candidate, as TA has (18 Nov: a second click made a second placement).
  if (db.placements.some((p) => p.applicationTaId === applicationId && p.state !== "cancelled")) devTaBack("They are placed already.");
  // "offer": TA has placed them but the join date and offer letter are not in yet, so the Offer state can be tested.
  const offerOnly = String(formData.get("how") ?? "") === "offer";
  const name =
    db.clientSets.flatMap((c) => c.candidates).find((c) => c.applicationTaId === applicationId)?.name ?? "SAMPLE CANDIDATE";
  const placementId = "ta_pl_dev_" + Date.now().toString(36);
  const made = await takePlacementFrom(placementId, {
    id: placementId,
    applicationId,
    openingId: row.openingTaId as string,
    clientId: row.clientTaId,
    candidateName: name,
    placedSalary: 450_000,
    currency: "LKR",
    salaryBasis: "gross",
    package: "LKR 450,000 a month, plus fuel and a phone allowance. (Invented, for testing.)",
    offerLetterFileId: offerOnly ? null : "ta_file_offer_1",
    joinDateMs: offerOnly ? null : Date.now() + 14 * 86_400_000,
    joinConfirmedAt: null,
    fellThroughAt: null,
    fellThroughReason: null,
  });
  revalidatePath("/placements");
  devTaBack(made ? name + (offerOnly ? " has an offer; no join date or offer letter yet." : " is placed. Joining in a fortnight.") : "Nothing was made.");
}

/** TA says they joined, or never turned up. */
export async function devTaJoined(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  devTaOnly();
  const db = await desk();
  const placement = db.placements.find((p) => p.id === String(formData.get("placementId") ?? ""));
  if (!placement) devTaBack("That placement is gone.");
  const row = placement as NonNullable<typeof placement>;
  const noShow = formData.get("outcome") === "no_show";
  await takePlacementOutcome(noShow ? "placement.no_show" : "placement.joined", { placementId: row.placementTaId });
  revalidatePath("/placements");
  if (noShow) devTaBack(row.candidateName + " did not turn up.");
  // Say what really happened: an invoice is not drafted for a client with no
  // billing details on their record (the rule), and that is worth seeing here.
  const after = await desk();
  const invoice = after.invoices.find((i) => i.placementId === row.id);
  const guarantee = after.guarantees.find((g) => g.placementId === row.id);
  devTaBack(
    row.candidateName +
      " joined. " +
      (invoice ? "Invoice " + invoice.number + " is drafted. " : "No invoice yet: the client needs billing details on their record first. ") +
      (guarantee ? "The guarantee is running." : "No guarantee started."),
  );
}

/* ── The dev panel's Openings tools (18 Nov): the sample, the clocks, and what TA would say ── */

/** Loads the invented Openings desk, copying the store aside first. */
export async function devLoadOpeningsSample(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  devTaOnly();
  const { loadOpeningsSample } = await import("@/data/desk");
  const done = await loadOpeningsSample(member.id);
  revalidatePath("/positions");
  devTaBack(done.ok ? "The staged dummy data is loaded: " + Object.entries(done.counts).filter(([, n]) => n > 0).map(([key, n]) => n + " " + key).join(", ") + ". Your data before it is copied to " + done.backup : done.why);
}

/** Takes the sample out again. */
export async function devRemoveOpeningsSample(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  devTaOnly();
  const { removeOpeningsSample } = await import("@/data/desk");
  const done = await removeOpeningsSample();
  revalidatePath("/positions");
  devTaBack(done.ok ? "The staged dummy data is out (" + done.gone + " rows)." : done.why);
}

/** A clock comes due now, so its step happens without waiting days. */
export async function devMoveClock(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  devTaOnly();
  const { moveClockToNow } = await import("@/data/desk");
  const done = await moveClockToNow(String(formData.get("timerId") ?? ""));
  devTaBack(done.ok ? "The clock came due and the clocks ran. See what it did on the opening, My Work or the bell." : done.why ?? "Could not move it.");
}

/** TA moves a candidate to another stage, and Ops counts the shortlist again (application.stage_changed). */
export async function devTaStage(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  devTaOnly();
  const positionId = String(formData.get("positionId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!applicationId || !stage) devTaBack("Choose a candidate and a stage.");
  const { fakeTaSetStage } = await import("@/data/fakeTa");
  fakeTaSetStage(applicationId, stage);
  const depth = await evaluateDepth(positionId);
  revalidatePath("/positions/" + positionId);
  devTaBack("TA moved them to " + stage.replace(/_/g, " ") + ". " + depth.what);
}

/** TA approves the JD, or closes the opening: the same handlers as their events. */
export async function devTaOpening(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  devTaOnly();
  const position = positionIn(await desk(), String(formData.get("positionId") ?? ""));
  if (!position?.openingTaId) devTaBack("The opening has to exist in TA first.");
  const opening = (position as NonNullable<typeof position>).openingTaId as string;
  const type = String(formData.get("type") ?? "");
  if (type === "opening.closed") {
    await openCloseChecklist(opening, "ta_closed", member.id);
    await takeOpeningUpdate("opening.closed", { openingId: opening, reason: "Closed by TA (stand-in)." });
    revalidatePath("/closes");
    devTaBack("TA closed the opening. The closing checklist is open on the opening's page.");
  }
  await takeOpeningUpdate("opening.jd_approved", { openingId: opening });
  devTaBack("TA approved the JD.");
}

/** TA reads the queue now: every waiting write goes to the stand-in, and every shortlist is counted again. */
export async function devTaPushQueue(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  devTaOnly();
  const result = await pushOutbox(Date.now(), true);
  for (const p of (await desk()).positions.filter((p) => p.openingTaId && p.stage !== "closed")) await evaluateDepth(p.id);
  revalidatePath("/positions");
  devTaBack(result.sent + " writes went to the stand-in TA; " + result.waiting + " still waiting. Every shortlist was counted again.");
}

/**
 * A pretend arrival, so the screen can be built and shown before the mailbox
 * exists. Refused unless the development sign-in is on.
 */
export async function pretendMailArrives(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  if (!devSignInAllowed()) redirect(landed(formData, "/mail", "Pretend mail is for development only."));

  const kind = String(formData.get("kind") ?? "reply");
  const db = await desk();
  const sent = db.messages.find((m) => m.subjectType && m.subjectId);
  const subject =
    kind === "reply" && sent
      ? "Re: " + sent.subject + " " + referenceFor(sent.subjectType as string, sent.subjectId as string)
      : "A question about our search";

  const r = await takeInbound([fakeArrival({ subject })], member.id);
  revalidatePath("/mail");
  redirect(
    landed(
      formData,
      "/mail",
      r.filed ? "Filed by its reference. " + r.chasesStopped + " chases stopped." : "It arrived, and is waiting for you to file it.",
    ),
  );
}

/** Back to the inbox view the person was on (17 Nov: the three-pane inbox), ready for "msg=". Only ever an inbox path. */
function mailBack(formData: FormData): string {
  const asked = String(formData.get("back") ?? "");
  const here = asked.startsWith("/mail") && !asked.startsWith("//") ? asked : "/mail";
  return here + (here.includes("?") ? "&" : "?");
}

export async function fileThisMail(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const inboundId = String(formData.get("inboundId") ?? "");
  const pair = String(formData.get("subject") ?? "");
  const here = mailBack(formData);
  if (!pair.includes("|")) redirect(here + "msg=" + encodeURIComponent("Choose what it belongs to first."));
  const [subjectType, subjectId] = pair.split("|");
  const stopped = await fileInbound(inboundId, subjectType, subjectId, member.id);
  revalidatePath("/mail");
  redirect(here + "msg=" + encodeURIComponent(stopped ? "Filed. " + stopped + " chases stopped." : "Filed."));
}

/* ── The mailbox: answering, and writing (24, section 7) ────────── */

/**
 * Reply to a conversation.
 *
 * It drafts, like everything else that leaves this building: the reply is a
 * message in the same state as any other, and nothing goes until a person
 * approves it. What this adds is the thread - the provider id of the message
 * being answered travels with it, so the client sees it under the email they
 * wrote rather than as a new one.
 */
export async function replyInThread(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const threadKey = String(formData.get("threadKey") ?? "");
  // My Work's Messages view answers in place (14 Nov), so it says where to come back to.
  const here = backTo(formData, "/mail/" + encodeURIComponent(threadKey));
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "message.approve")) back(refusal("message.approve"));

  const to = addressesFrom(String(formData.get("to") ?? ""));
  const body = String(formData.get("body") ?? "");
  const subject = String(formData.get("subject") ?? "");
  const problem = problemWithReply(to, body);
  if (problem) back(problem);

  const db = await desk();
  const threads = buildThreads(db.inbound, db.messages);
  const thread = threads.find((t) => t.key === threadKey);
  if (!thread) redirect("/mail?msg=" + encodeURIComponent("That conversation is gone."));
  const answering = [...(thread as Thread).items].reverse().find((item) => item.direction === "in");

  await draftMessage({
    channel: "email",
    to,
    subject: subject.trim() || replySubject((thread as Thread).subject),
    body,
    templateKey: null,
    subjectType: (thread as Thread).about?.type ?? null,
    subjectId: (thread as Thread).about?.id ?? null,
    inReplyToProviderId: answering?.providerId ?? null,
  });

  revalidatePath(here);
  revalidatePath("/mail");
  back("Drafted. Read it once more, then approve it to send.");
}

/**
 * Write to somebody, about nothing in particular.
 *
 * The one message that belongs to no step of the flow, and the reason people
 * still had Outlook open. It can be tied to a client or a position so that it
 * is findable afterwards, and it can carry files we already hold - because an
 * attachment pulled off somebody's laptop is how a client gets the wrong CV.
 */
export async function writeNewMessage(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const dest = backTo(formData, "/mail");
  const back = (msg: string) => redirect(withMsg(dest, msg));
  if (!can(member, "message.approve")) back(refusal("message.approve"));

  const channelRaw = String(formData.get("channel") ?? "email");
  const channel: "email" | "whatsapp" = channelRaw === "whatsapp" ? "whatsapp" : "email";
  const to = channel === "whatsapp"
    ? [String(formData.get("to") ?? "").trim()].filter(Boolean)
    : addressesFrom(String(formData.get("to") ?? ""));
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");
  if (channel === "email") {
    const problem = problemWithCompose(to, subject, body);
    if (problem) back(problem);
  } else {
    if (!to.length) back("Enter a phone number or WhatsApp recipient.");
    if (!body.trim()) back("Write the message first.");
  }

  const about = String(formData.get("about") ?? "");
  const [subjectType, subjectId] = about.includes("|") ? about.split("|") : [null, null];
  const attachmentFileIds = formData
    .getAll("fileId")
    .map((value) => String(value))
    .filter(Boolean);

  const message = await draftMessage({
    channel,
    to,
    subject: subject.trim(),
    body,
    templateKey: null,
    subjectType,
    subjectId,
    attachmentFileIds,
  });

  revalidatePath("/mail");
  revalidatePath(dest.split("?")[0] || "/");
  if (formData.get("sendNow") === "1") {
    const db = await desk();
    const said = await approveOne(member, db, message);
    redirect(dest + confirmed(said, dest));
  }
  if (formData.get("back")) {
    redirect(withMsg(dest, "Drafted. Nothing goes until you approve it."));
  }
  redirect("/messages/" + message.id + "?msg=" + encodeURIComponent("Drafted. Nothing goes until you approve it."));
}

export async function markMailDone(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  await markInboundActioned(String(formData.get("inboundId") ?? ""), member.id);
  revalidatePath("/mail");
  redirect(mailBack(formData) + "msg=" + encodeURIComponent("Archived: marked as dealt with."));
}

/**
 * Save a template's wording. The ops lead only, and refused outright when the
 * wording could not work — an email with no subject, a blank nobody can fill —
 * because the alternative is finding out when a client gets it.
 */
export async function saveTemplateWording(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const key = String(formData.get("key") ?? "");
  const here = "/templates/" + encodeURIComponent(key);
  const go = (msg: string): never => redirect(landed(formData, here, msg));

  if (!can(member, "template.edit")) {
    go(refusal("template.edit"));
  }

  const db = await desk();
  const template = templateFor(db, key);
  if (!template) redirect(landed(formData, "/templates", "That wording no longer exists."));

  const patch = {
    name: String(formData.get("name") ?? template!.name).trim(),
    // A channel with nowhere to put a subject keeps the empty one it had.
    subject: template!.channel === "email" ? String(formData.get("subject") ?? template!.subject).trim() : "",
    body: String(formData.get("body") ?? ""),
    approvedForAuto: template!.channel === "internal" ? true : formData.get("approvedForAuto") === "on",
  };

  const problem = problemWith({ ...patch, channel: template!.channel });
  if (problem) go(problem);

  await saveTemplate(key, patch, member.id);
  revalidatePath(here);
  revalidatePath("/templates");
  revalidatePath("/settings");
  go("Saved. The next one sent uses this wording.");
}

export async function finishTask(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const taskId = String(formData.get("taskId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  if (!can(member, "task.do")) redirect(landed(formData, "/tasks/" + taskId, refusal("task.do")));
  // The owner's rule: what happened is written down before it is closed.
  if (!outcome.trim()) {
    redirect(landed(formData, "/tasks/" + taskId, "Write one line about what happened first."));
  }
  await finishTaskWrite(taskId, member.id, outcome);
  revalidatePath("/");
  redirect(backTo(formData, "/"));
}

export async function saveDraft(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const messageId = String(formData.get("messageId") ?? "");
  await editMessage(messageId, { subject: String(formData.get("subject") ?? ""), body: String(formData.get("body") ?? "") }, member.id);
  revalidatePath("/messages/" + messageId);
  redirect("/messages/" + messageId + "?msg=" + encodeURIComponent("Saved."));
}

/**
 * Use `OPS_DEV_SENDER_EMAIL` only when dev sign-in is active, so a laptop can
 * send from one real Microsoft 365 mailbox instead of `@example.test` (17 Nov).
 */
function senderAddressFor(fallbackEmail: string): string {
  return senderMailbox(fallbackEmail, devSignInAllowed());
}

/** Health page: can we get a Microsoft token at all? Nothing runs on render; this is a button. */
export async function healthCheckMicrosoft(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  if (!can(member, "settings.manage")) redirect(withMsg("/health", refusal("settings.manage")));
  let said: string;
  try {
    // The token lists the permissions an admin granted (its roles), so the answer can say which one is missing (23 Nov).
    const token = await graphToken();
    said = token ? permissionSentence(decodeRoles(token)) : "Microsoft would not give us a token (credentials missing or refused).";
  } catch {
    said = "Microsoft could not be reached.";
  }
  redirect(withMsg("/health", said));
}

/** Health page: one test email to the member's own address, through sendEmail (OPS_SEND and the outbound lock apply). */
export async function healthSendTestEmail(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  if (!can(member, "settings.manage")) redirect(withMsg("/health", refusal("settings.manage")));
  const outcome = await sendEmail({
    from: senderAddressFor(member.email),
    to: [member.email],
    subject: "Ops test email",
    body: "This is a test from the Ops Health page. Nothing needs doing.",
  });
  redirect(withMsg("/health", outcome.ok ? "Test email sent to " + member.email + "." : (outcome.reason ?? "The test email did not go.")));
}

/**
 * One draft through the gate and out, and the sentence that says what
 * happened (7 Nov, UX order 2).
 *
 * Pulled out of approveAndSend so that approving from the day page, from the
 * message's own page, and approving every routine notice at once are the
 * same code path with the same gate - a second way to approve that skipped
 * the gate would be the hole in the one rule this system has.
 *
 * It returns the sentence instead of redirecting, because the caller knows
 * where the person is standing.
 */
async function approveOne(
  member: OpsMember,
  db: OpsDatabase,
  message: OpsMessage,
  options?: { from?: string; notePrefix?: string },
): Promise<string> {
  // Read the sent messages fresh: approving every routine notice at once
  // calls this in a loop, and a snapshot from before the loop would never
  // count the ones that just went (16 Nov, plan B3).
  const fresh = await desk();
  // Approved first, then the gate decides what really happens to it.
  const verdict = gate(
    { ...message, state: "approved" },
    {
      // Both have to agree: the environment may permit it and the desk must
      // have switched it on. A restored database carries the setting; it
      // cannot carry the environment (6 Nov).
      outreachLive: switchedOn(db, "switch.outreachLive") && outreachLiveInEnv(),
      testRecipient: (process.env.OPS_TEST_EMAIL ?? "").trim() || "test@example.test",
      doNotContact: doNotContactFrom(fresh.leads),
      sentToClientToday: sentToday(fresh.messages, message.to),
      dailyCapPerClient: numberOf(db, "message.dailyCapPerClient", 4),
    },
  );

  if (!verdict.ok) {
    const said = [options?.notePrefix, verdict.note].filter(Boolean).join(" ") || verdict.note;
    await settleMessage(message.id, member.id, verdict.state, message.to, said);
    return said;
  }

  // The gate said yes. Now it actually goes, from the sender's mailbox,
  // and whatever the sender says is recorded as it is - including "we do not
  // know whether it went", which is a real answer and not a failure to hide.
  const subject = subjectWithReference(message.subject, message.subjectType, message.subjectId);
  const outcome =
    message.channel === "group_post"
      ? groupPostIsManual()
      : message.channel === "whatsapp"
        ? await sendWhatsApp({ to: verdict.to[0], body: message.body, templateKey: message.templateKey })
        : await sendEmail({
            from: options?.from ?? senderAddressFor(member.email),
            to: verdict.to,
            subject,
            body: message.body,
            // The agreement, the invoice and the offer letter travel with
            // their message. A file whose bytes are gone stops the send
            // rather than sending the covering note alone.
            attachments: await filesFor(db, message.attachmentFileIds),
            inReplyTo: message.inReplyToProviderId ?? null,
          });

  // Test mode's note matters as much as the sender's, so both are kept.
  const said = [options?.notePrefix, verdict.note, outcome.reason].filter(Boolean).join(" ") || null;
  await settleMessage(
    message.id,
    member.id,
    // Switched off on purpose is not the same as a send that went wrong. A
    // preview with no credentials would otherwise report every message as
    // failed, which hides the real failures when they come.
    // A group post is never "sent": nobody sent it. It stops at approved,
    // which is the truth - a person has it to post (3 Nov, in the browser).
    message.channel === "group_post"
      ? "approved"
      : outcome.ok
        ? "sent"
        : sendingEnabled()
          ? "failed"
          : "blocked",
    verdict.to,
    said,
    outcome.providerMessageId,
  );
  return said ?? "Sent.";
}

/**
 * The query that carries a three-second confirmation (7 Nov).
 *
 * `at` is the moment, not information: two identical confirmations in a row
 * - approve two drafts to the same address, and the gate says the same
 * sentence twice - gave the toast the same `did` twice, React saw an
 * unchanged dependency, and the second one never showed. The walk found it.
 * A timestamp beside it changes every time, so every confirmation is new.
 */
function confirmed(said: string, after = ""): string {
  // `after` is the path it lands on: one that already has a query needs & not ?.
  return (after.includes("?") ? "&" : "?") + "did=" + encodeURIComponent(said) + "&at=" + Date.now();
}

/** Where a form came from, so the person lands back where they were standing. */
function backTo(formData: FormData, fallback: string): string {
  return safeBack(formData.get("back"), fallback);
}

/** The page an action answers on: where the form stood (`back`), else `fallback`, with the message joined on. */
function landed(formData: FormData, fallback: string, msg: string): string {
  return withMsg(backTo(formData, fallback), msg);
}

export async function approveAndSend(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const messageId = String(formData.get("messageId") ?? "");
  const here = backTo(formData, "/messages/" + messageId);

  if (!can(member, "message.approve")) {
    redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(refusal("message.approve")));
  }
  const db = await desk();
  const message = db.messages.find((m) => m.id === messageId);
  if (!message) redirect("/?msg=" + encodeURIComponent("That message no longer exists."));
  if (!needsApproval(message)) {
    redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent("That message has already been settled."));
  }

  const said = await approveOne(member, db, message);
  revalidatePath("/");
  // `did` is the three-second confirmation; `msg` stays the banner that
  // waits to be read. Approving sends, so there is no Undo on this one.
  redirect(here + confirmed(said, here));
}

/**
 * Every routine notice at once (7 Nov, UX order 2).
 *
 * Nineteen drafts was thirty-eight clicks. Most of a morning's pile is
 * reminders from a template somebody approved once, and the owner's rule
 * says those may go unread. So one button, and it takes exactly the drafts
 * `isRoutine` says it may - the same gate, one at a time, each written down
 * as it goes. Nothing hand-written, nothing about one position, is touched.
 */
export async function approveAllRoutine(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const here = backTo(formData, "/");
  if (!can(member, "message.approve")) {
    redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(refusal("message.approve")));
  }

  const db = await desk();
  const routine = draftsWaiting(db).filter((m) => isRoutine(m, m.templateKey ? templateFor(db, m.templateKey) : null));
  if (routine.length === 0) {
    redirect(here + confirmed("Nothing routine is waiting: every draft here needs a person to read it.", here));
  }

  let went = 0;
  let held = 0;
  for (const message of routine) {
    const said = await approveOne(member, db, message);
    // A gate refusal says "blocked" or names a hole; a send says "Sent." or
    // what the sender said. Counting them apart is what makes the sentence
    // honest about a batch where some went and some did not.
    if (/^Sent|went|sent to/i.test(said)) went += 1;
    else held += 1;
  }
  revalidatePath("/");
  const sentence =
    went + (went === 1 ? " routine notice" : " routine notices") + " approved and sent" +
    (held ? ", " + held + " held back by the gate - open them to see why" : "") + ".";
  redirect(here + confirmed(sentence, here));
}

/**
 * Keeps a file (15, Phase 1 step 23).
 *
 * The bytes go to storage first and the registry row second, so a row in the
 * list always leads to a file. The hash is taken as it arrives: it is what
 * answers "is this the document we really sent" a year later.
 */
export async function keepFile(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect("/files?msg=" + encodeURIComponent(msg));
  if (!can(member, "file.keep")) back(refusal("file.keep"));

  const upload = formData.get("file");
  if (!(upload instanceof File)) back("No file was chosen.");
  const file = upload as File;
  const problem = problemWithUpload({ name: file.name, size: file.size });
  if (problem) back(problem);

  const kindAsked = String(formData.get("kind") ?? "other");
  const kind = isFileKind(kindAsked) ? kindAsked : "other";
  const subjectType = String(formData.get("subjectType") ?? "").trim() || null;
  const subjectId = String(formData.get("subjectId") ?? "").trim() || null;
  // Half a label is no label: a subject needs both parts to find anything.
  if ((subjectType && !subjectId) || (subjectId && !subjectType)) {
    back("A file filed under something needs both what it belongs to and which one.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const key = keyFor(kind, subjectType, subjectId, file.name);
  const mime = mimeFor(file.name);
  await putBytes(key, bytes, mime);
  await addFile({
    kind,
    key,
    name: safeName(file.name),
    size: bytes.length,
    mime,
    sha256: sha256(bytes),
    subjectType,
    subjectId,
    madeFrom: null,
    uploadedBy: member.id,
  });
  revalidatePath("/files");
  back("Kept " + safeName(file.name) + ".");
}

/**
 * Makes a PDF of a Word document and keeps that too.
 *
 * The Word file is left alone, because it is the template that was filled and
 * the PDF is what goes out. On a machine without LibreOffice this says so
 * plainly instead of failing.
 */
export async function makePdfOfFile(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect("/files?msg=" + encodeURIComponent(msg));
  if (!can(member, "file.keep")) back(refusal("file.keep"));

  const fileId = String(formData.get("fileId") ?? "");
  const db = await desk();
  const row = fileIn(db, fileId);
  if (!row) back("That file is not in the list any more.");
  const source = row as NonNullable<typeof row>;
  if (!canBecomePdf(source.name)) back("A PDF can only be made from a Word document.");

  const bytes = await readBytes(source.key);
  if (!bytes) back("The file itself is missing from storage, so no PDF can be made.");

  const made = await docxToPdf(bytes as Uint8Array, source.name);
  if (!made.ok || !made.bytes) back(made.reason ?? "The conversion failed.");

  const pdf = made.bytes as Uint8Array;
  const name = pdfNameFor(source.name);
  const key = keyFor(source.kind as FileKind, source.subjectType, source.subjectId, name);
  await putBytes(key, pdf, "application/pdf");
  await addFile({
    kind: source.kind,
    key,
    name,
    size: pdf.length,
    mime: "application/pdf",
    sha256: sha256(pdf),
    subjectType: source.subjectType,
    subjectId: source.subjectId,
    madeFrom: source.id,
    uploadedBy: member.id,
  });
  revalidatePath("/files");
  back("Made " + name + ".");
}

/**
 * Writes down a call somebody made (15, Phase 1 step 24).
 *
 * Nothing here dials anything: the owner decided calls stay human, so this is
 * the record of what a person did. If the call answers a call task, that task
 * is finished with the same words, because writing it twice is how one of the
 * two ends up empty.
 */
export async function recordCall(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect(landed(formData, "/calls", msg));
  if (!can(member, "task.do")) back(refusal("task.do"));

  const input = {
    to: String(formData.get("to") ?? "").trim(),
    spokeTo: String(formData.get("spokeTo") ?? "").trim(),
    outcome: String(formData.get("outcome") ?? "").trim(),
  };
  const problem = problemWithCall(input);
  if (problem) back(problem);

  const taskId = String(formData.get("taskId") ?? "").trim() || null;
  const subjectType = String(formData.get("subjectType") ?? "").trim() || null;
  const subjectId = String(formData.get("subjectId") ?? "").trim() || null;

  await logCall({
    taskId,
    to: tidyPhone(input.to) ?? input.to,
    toName: String(formData.get("toName") ?? "").trim(),
    purpose: String(formData.get("purpose") ?? "other"),
    spokeTo: input.spokeTo,
    outcome: input.outcome,
    subjectType,
    subjectId,
    by: member.id,
  });

  if (taskId) await finishTaskWrite(taskId, member.id, "Called " + input.spokeTo + ": " + input.outcome);
  revalidatePath("/calls");
  revalidatePath("/");
  back("Written down." + (taskId ? " The call task is finished." : ""));
}

/** Adds the holidays somebody pasted in (15, Phase 1 step 10). */
export async function addHolidayList(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect("/holidays?msg=" + encodeURIComponent(msg));
  if (!can(member, "settings.manage")) back(refusal("settings.manage"));

  const { days, problems } = parseHolidayLines(String(formData.get("pasted") ?? ""));
  if (days.length === 0) {
    back("Nothing in that could be read as a date. One line each: 2027-01-15, Thai Pongal.");
  }
  const added = await addHolidays(days, member.id);
  revalidatePath("/holidays");
  back(
    added + " of " + days.length + " added." +
      (problems.length ? " These lines were not dates: " + problems.slice(0, 3).join(" · ") : ""),
  );
}

export async function dropHoliday(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect("/holidays?msg=" + encodeURIComponent(msg));
  if (!can(member, "settings.manage")) back(refusal("settings.manage"));
  const date = String(formData.get("date") ?? "");
  await removeHoliday(date, member.id);
  revalidatePath("/holidays");
  back(date + " is a working day again.");
}

/**
 * Records one of today's numbers (15, Phase 1 step 0).
 *
 * The owner's instruction was to measure before changing anything, so the
 * weekly report can one day say what changed. These come out of the archive by
 * hand: there is no system to read them from.
 */
export async function recordBaseline(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect("/baseline?msg=" + encodeURIComponent(msg));
  if (!can(member, "report.read")) back(refusal("report.read"));

  const measure = String(formData.get("measure") ?? "");
  if (!MEASURES[measure]) back("Pick what is being measured.");
  const period = String(formData.get("period") ?? "").trim();
  if (!period) back("Say which months this covers, so a later number can be compared with it.");
  const value = Number(String(formData.get("value") ?? ""));
  if (!Number.isFinite(value) || value < 0) back("That is not a number.");

  await addBaseline({
    measure,
    period,
    value,
    note: String(formData.get("note") ?? "").trim(),
    by: member.id,
  });
  revalidatePath("/baseline");
  back("Recorded. " + MEASURES[measure].name + " for " + period + ": " + value + " " + MEASURES[measure].unit + ".");
}

/** Tries every waiting write now, instead of waiting for the next pass. */
export async function pushOutboxNow(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const result = await pushOutbox();
  revalidatePath("/ta");
  redirect(
    "/ta?msg=" +
      encodeURIComponent(
        result.sent + " went, " + result.waiting + " are waiting, " + result.gaveUp + " given up on.",
      ),
  );
}

/** Reads the TA System's events now, instead of waiting for the next pass. */
export async function readEventsNow(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const result = await readTaEvents();
  revalidatePath("/ta");
  redirect(
    "/ta?msg=" +
      encodeURIComponent(
        result.reason ? result.reason : result.read + " read, " + result.kept + " new.",
      ),
  );
}

/**
 * Queues a harmless write, to prove the outbox end to end.
 *
 * Phase 1 has no business writes yet - the first real one is "create the
 * opening in TA" in Phase 3 - so without this there would be no way to show
 * that queueing, trying, waiting and the key all work. It is a notice to
 * ourselves, and it says so.
 */
export async function queueTestWrite(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  if (!can(member, "settings.manage")) {
    redirect("/ta?msg=" + encodeURIComponent(refusal("settings.manage")));
  }
  const item = await queueTaWrite(
    "/integrations/v1/notify",
    {
      userId: member.taUserId ?? "unknown",
      type: "ops_test",
      title: "Ops is talking to the TA System",
      body: "A test write queued by " + member.name + " while building Phase 1.",
    },
    null,
  );
  revalidatePath("/ta");
  redirect("/ta?msg=" + encodeURIComponent("Queued. Its key is " + item.idempotencyKey + "; queueing it again changes nothing."));
}

/**
 * A new lead (15, Phase 2 step 2).
 *
 * The lead is saved first and routed second, on purpose: a company that rang
 * us exists whether or not we can reach the TA System to check whether they
 * are already a client. The industry flag is proposed here from the words in
 * front of us, and waits for a person - the owner's rule is that banking and
 * finance are declined, not that a keyword declines them.
 */
export async function createLead(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const here = backTo(formData, "/leads");
  const back = (msg: string) => redirect(withMsg(here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  // "Direct client" (Figma 331:2976): the company is one of our own clients, picked from the list. The name
  // comes from our record, not from the form, so a typed or altered name can never make a second client.
  const directId = String(formData.get("clientId") ?? "").trim();
  const direct = directId ? clientIn(await desk(), directId) : null;
  if (directId && !direct) back("That client is gone. Pick one from the list again.");

  const input = {
    company: direct ? direct.name : String(formData.get("company") ?? "").trim(),
    contactName: String(formData.get("contactName") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    contactPhone: String(formData.get("contactPhone") ?? "").trim(),
    source: String(formData.get("source") ?? ""),
  };
  const problem = problemWithNewLead(input);
  if (problem) back(problem);

  const industry = String(formData.get("industry") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const flag = flagIndustry({ company: input.company, industry, website, notes });

  const lead = await addLead({
    ...input,
    nameKey: nameKey(input.company),
    industry,
    website,
    notes,
    industryFlagged: flag.flagged,
    industryBecause: flag.because,
    industryConfirmedBy: null,
    state: "new",
    reason: null,
    doNotInvite: false,
    clientTaId: null,
    // One ops person owns each client, and the person taking the lead owns it
    // until the ops lead moves it (owner's rule). A direct client's lead goes to its own owner.
    ownerId: direct ? direct.ownerId : member.id,
    createdBy: member.id,
  });

  if (direct) {
    const routed = directClientRouting(direct);
    await patchLead(
      lead.id,
      { clientTaId: direct.taClientId, state: routed.state },
      member.id,
      "lead.linkedToClient",
      "Direct client: " + routed.because,
    );
    await clientFromLead(await desk(), { ...lead, clientTaId: direct.taClientId }, direct.stage, member.id);
    revalidatePath("/leads");
    revalidatePath("/clients");
    redirect("/leads/" + lead.id + "?msg=" + encodeURIComponent("Saved. " + routed.because));
  }

  revalidatePath("/leads");
  revalidatePath("/clients");
  redirect("/leads/" + lead.id + "?msg=" + encodeURIComponent("Saved. Now check the two things below."));
}

/**
 * Every client has one working lead (23 Nov, the owner): the record the calls, the requirement and the
 * agreement hang on, so a client added by hand uses the same steps as one that came in as an enquiry.
 * It is the client's own `leadId`; an older client without one gets it made the first time it is needed.
 */
async function workingLeadFor(client: OpsClient, member: OpsMember, state: string): Promise<OpsLead> {
  const db = await desk();
  const there = client.leadId ? leadIn(db, client.leadId) : null;
  if (there) return there;
  const first = (client.contacts ?? [])[0];
  const lead = await addLead({
    company: client.name,
    nameKey: client.nameKey,
    contactName: first?.name ?? "",
    contactEmail: first?.email ?? "",
    contactPhone: first?.phone ?? "",
    source: "other",
    industry: "",
    website: "",
    notes: "",
    industryFlagged: false,
    industryBecause: null,
    industryConfirmedBy: null,
    state,
    reason: null,
    doNotInvite: false,
    clientTaId: client.taClientId,
    ownerId: client.ownerId,
    createdBy: member.id,
  });
  await patchClient(client.id, { leadId: lead.id }, member.id, "client.updated", null);
  return lead;
}

/**
 * "Add a client" (23 Nov, the owner): the client record is made straight away, at "lead" (known, nothing
 * agreed), with its working lead, and the intro call is booked in the same form when a time is given. The
 * intro call is also where the requirement is taken. The agreement is sent from the client's own page.
 */
export async function createClient(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect(withMsg("/leads/new", msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const f = (k: string) => String(formData.get(k) ?? "").trim();
  const company = f("company");
  const contactEmail = f("contactEmail");
  const contactPhone = f("contactPhone");
  const billingEmail = f("billingEmail");
  const key = nameKey(company);
  const problem = problemWithNewClient(
    { company, contactEmail, contactPhone, billingEmail },
    (await desk()).clients.some((c) => c.nameKey === key),
  );
  if (problem) back(problem);

  const industry = f("industry");
  const flag = flagIndustry({ company, industry, website: f("website") });
  if (flag.flagged) back("We do not work with banking and finance (\"" + flag.because + "\"). Ask the Director before adding them.");

  // The call is checked before anything is saved, so a bad time never leaves a half-made client behind.
  const wantsCall = f("at") !== "";
  if (wantsCall) {
    const bad = problemWithBooking({ at: Date.parse(f("at") + ":00+05:30"), taLeadId: f("taLeadId") }, Date.now());
    if (bad) back(bad);
  }

  const client = await addClient({
    leadId: null,
    taClientId: null,
    name: company,
    nameKey: key,
    stage: "lead",
    billingName: f("billingName"),
    billingEmail,
    billingAddress: f("billingAddress"),
    groupName: "",
    contacts: [{ name: f("contactName") || company, email: contactEmail, phone: contactPhone, role: "hr" }],
    notes: [industry, f("website")].filter(Boolean).join(" · "),
    reason: null,
    ownerId: member.id,
  });
  const lead = await workingLeadFor(client, member, "new");
  revalidatePath("/clients");
  const page = "/clients/" + client.id;
  if (wantsCall) {
    formData.set("alsoRequirement", "on");
    await bookIntro(formData, member, lead.id, (msg) => redirect(withMsg(page, "Saved. " + company + " is now a client. " + msg)));
  }
  redirect(withMsg(page, "Saved. " + company + " is now a client. Book the intro call from here when it is arranged."));
}

/**
 * Is this company already ours? (15, Phase 2 step 3.)
 *
 * An exact match is linked; anything that merely looks similar is listed for a
 * person to decide. Two client records for one company is how the same company
 * ends up with two owners and two agreements.
 */
export async function checkLeadDuplicate(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(leadBack(here, "enquiry", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const lead = leadIn(await desk(), leadId);
  if (!lead) back("That lead is gone.");
  if (!atEnquiry(lead as NonNullable<typeof lead>)) back(ALREADY_CHECKED);
  const company = (lead as NonNullable<typeof lead>).company;

  const answer = await taClients(company);
  if (!answer.ok) back("Could not ask the TA System: " + answer.reason);

  const found = duplicateMatch(
    company,
    (answer.ok ? answer.data : []).map((c) => ({
      id: c.id,
      name: c.name,
      nameKey: c.nameKey,
      esaSignedAt: c.esaSignedAt,
    })),
  );

  if (found.exact) {
    const routed = await linkLeadToClient(lead as NonNullable<typeof lead>, found.exact, member.id);
    revalidatePath(here);
    redirect(leadMoved(here, "They are already our client. " + routed.because, formData));
  }

  if (found.near.length) {
    // The matches ride on the link so the page can offer "it's this one" and "none of these":
    // without them a lead with only a near match could never finish its enquiry (18 Nov).
    const near = encodeURIComponent(JSON.stringify(found.near.map((c) => ({ id: c.id, name: c.name }))));
    redirect(
      leadBack(here, "enquiry", "No exact match. These look close, so somebody has to decide: pick one, or say none of them.", formData) +
        "&near=" +
        near,
    );
  }
  // No match is an answer, and it has to be written down: with the lead left as
  // "new" the enquiry could never finish and nothing after it could start.
  const fresh = routeLead({ industryFlagged: false, industryConfirmed: false, existing: null });
  await patchLead(leadId, { state: fresh.state }, member.id, "lead.checkedNewClient", fresh.because);
  revalidatePath(here);
  redirect(leadMoved(here, "Nobody like that in the TA System, so this is a new client. " + fresh.because, formData));
}

/**
 * The TA check is answered once (18 Nov). A stale tab, or Back after the intro call was
 * booked, must not send a lead that moved on - or a closed one - back to the start.
 */
function atEnquiry(lead: { state: string; clientTaId: string | null }): boolean {
  return lead.state === "new" && !lead.clientTaId;
}
const ALREADY_CHECKED = "This lead was already checked against the TA System, so nothing changed.";

/** Links a lead to a client we already have, and starts the client record from it. */
async function linkLeadToClient(
  lead: NonNullable<ReturnType<typeof leadIn>>,
  existing: { id: string; name: string; nameKey: string; esaSignedAt: number | null },
  memberId: string,
) {
  const routed = routeLead({ industryFlagged: false, industryConfirmed: false, existing });
  await patchLead(lead.id, { clientTaId: existing.id, state: routed.state }, memberId, "lead.linkedToClient", routed.because);
  // They are a company we already have, so the client record starts here
  // rather than waiting for an agreement they may already have signed.
  await clientFromLead(await desk(), { ...lead, clientTaId: existing.id }, existing.esaSignedAt ? "active" : "lead", memberId);
  revalidatePath("/clients");
  return routed;
}

/** "It's this one": a person picked one of the near matches. The id is checked against TA again, not trusted. */
export async function chooseLeadMatch(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(leadBack(here, "enquiry", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const lead = leadIn(await desk(), leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;
  if (!atEnquiry(row)) back(ALREADY_CHECKED);
  const answer = await taClients(row.company);
  if (!answer.ok) back("Could not ask the TA System: " + answer.reason);
  const picked = (answer.ok ? answer.data : []).find((c) => c.id === String(formData.get("taClientId") ?? ""));
  if (!picked) back("That client was not in the TA System's answer. Check again.");
  const routed = await linkLeadToClient(row, picked!, member.id);
  revalidatePath(here);
  redirect(leadMoved(here, "Linked to " + picked!.name + ". " + routed.because, formData));
}

/** "None of these": a person looked at the near matches and says this is a new client. */
export async function markLeadNewClient(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(leadBack(here, "enquiry", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const lead = leadIn(await desk(), leadId);
  if (!lead) back("That lead is gone.");
  if (!atEnquiry(lead as NonNullable<typeof lead>)) back(ALREADY_CHECKED);
  const fresh = routeLead({ industryFlagged: false, industryConfirmed: false, existing: null });
  await patchLead(leadId, { state: fresh.state }, member.id, "lead.checkedNewClient", "A person looked at the close matches: none is them.");
  revalidatePath(here);
  redirect(leadMoved(here, "A new client. " + fresh.because, formData));
}

/**
 * The industry decision (15, Phase 2 step 4).
 *
 * Confirming it declines the lead for good and marks it never to be invited
 * back, which is the owner's standing rule. Saying it is not that industry
 * clears the flag and says who cleared it, because that is a judgement
 * somebody made.
 */
export async function decideLeadIndustry(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(leadBack(here, "enquiry", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const confirmed = String(formData.get("decision") ?? "") === "confirm";
  const lead = leadIn(await desk(), leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;

  if (!confirmed) {
    await patchLead(
      leadId,
      { industryFlagged: false, industryBecause: null, industryConfirmedBy: member.id },
      member.id,
      "lead.industryCleared",
      "Not banking or finance: " + member.name + " looked.",
    );
    revalidatePath(here);
    back("Cleared. This is not banking or finance.");
  }

  const routed = routeLead({ industryFlagged: true, industryConfirmed: true, existing: null });
  const reason = "Banking and finance are declined, whatever the role" + (row.industryBecause ? " (" + row.industryBecause + ")" : "") + ".";
  await patchLead(
    leadId,
    { state: routed.state, reason, doNotInvite: true, industryConfirmedBy: member.id },
    member.id,
    "lead.declinedIndustry",
    reason,
  );
  revalidatePath(here);
  revalidatePath("/leads");
  back("Declined, and marked never to be invited back. The decline notice is drafted when the templates for it exist.");
}

/** Closes a lead, with a reason. Nothing closes without one (owner's rule). */
export async function closeLead(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const state = String(formData.get("state") ?? "closed_other") as LeadState;
  const reason = String(formData.get("reason") ?? "");
  const problem = problemWithClosing(state, reason);
  if (problem) back(problem);

  await patchLead(
    leadId,
    { state, reason: reason.trim(), doNotInvite: neverInviteBack(state) },
    member.id,
    "lead.closed",
    reason.trim(),
  );
  revalidatePath(here);
  revalidatePath("/leads");
  back("Closed, with the reason written down.");
}

/**
 * Reads the Teams part of a booking form and, when asked, makes the meeting in
 * the organiser's Outlook calendar (17 Nov).
 *
 * Never blocks the booking: when Microsoft cannot make the link the meeting
 * still stands, `problem` says why in a sentence, and a pasted link is used.
 * Clients are not put on the Outlook event (Exchange would email them
 * unapproved); they get the link in the drafted invite.
 */
async function teamsPartOf(
  formData: FormData,
  member: OpsMember,
  lead: { company: string; contactName?: string; contactEmail?: string },
  kind: "intro" | "requirement",
  at: number,
  taLeadId: string,
): Promise<{
  lengthMin: number;
  organiserId: string;
  attendees: Attendee[];
  link: string;
  graphEventId: string | null;
  problem: string | null;
  refusal: string | null;
}> {
  const db = await desk();
  const pasted = String(formData.get("link") ?? "").trim();
  const lengthMin = Number(formData.get("lengthMin") ?? DEFAULT_LENGTH) || DEFAULT_LENGTH;
  const organiser = db.members.find((m) => m.id === String(formData.get("organiserId") ?? "")) ?? member;
  // Aura's one-click booking (21 Nov) posts no attendee rows: the lead's own contact is who the link goes to.
  const typed = formData.has("attendeeEmail");
  const attendees = typed
    ? attendeesFrom(formData.getAll("attendeeName").map(String), formData.getAll("attendeeEmail").map(String))
    : attendeesFrom([lead.contactName ?? ""], [lead.contactEmail ?? ""]);
  const none = { lengthMin, organiserId: organiser.id, attendees, link: pasted, graphEventId: null, problem: null, refusal: null };

  const badLength = problemWithLength(lengthMin);
  const badPeople = attendees.length || !pasted ? problemWithAttendees(attendees) : null;
  if (badLength || badPeople) return { ...none, refusal: badLength ?? badPeople };
  if (formData.get("makeTeams") !== "on" || pasted) return none; // a pasted link wins

  if (!teamsFake() && !switchedOn(db, "switch.teamsEnabled")) {
    return { ...none, problem: "Teams is switched off in Settings (switch.teamsEnabled), so paste a link." };
  }
  const people = await taPeople();
  const taLead = people.ok ? people.data.find((p) => p.id === taLeadId) : null;
  const made = await createTeamsEvent(organiser.email, {
    company: lead.company,
    kind,
    at,
    lengthMin,
    internalAttendees: taLead ? [{ name: taLead.fullName, email: taLead.email }] : [],
  });
  if (!made.ok) return { ...none, problem: made.reason };
  return { ...none, link: made.joinUrl, graphEventId: made.eventId };
}

/**
 * A sentence if the booking lands on something in this person's Outlook, else "" (21 Nov).
 * Warn only: it never refuses a booking, and it asks Microsoft only when Teams is on (or faked).
 */
async function outlookClash(db: OpsDatabase, email: string, at: number, lengthMin: number): Promise<string> {
  if (!Number.isFinite(at) || (!teamsFake() && !switchedOn(db, "switch.teamsEnabled"))) return "";
  const seen = await listEvents(email, new Date(at).toISOString(), new Date(at + lengthMin * 60_000).toISOString());
  const clash = clashWith(at, lengthMin, seen.events);
  return clash ? " " + clash : "";
}

/**
 * Books the intro call (15, Phase 2 step 7).
 *
 * The TA lead is on every intro call, which is the owner's rule, so the
 * booking asks who. Two reminders are started with it - the day before at
 * nine, and an hour before - because a meeting nobody remembers is the
 * commonest way a lead goes quiet.
 */
export async function bookIntroCall(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  await bookIntro(formData, member, leadId, (msg) => redirect(leadBack(here, "intro", msg, formData)));
}

/**
 * The booking itself, shared by the lead page and by "Add a client" (23 Nov): a client added by hand books
 * its intro call in the same form, through its working lead (`workingLeadFor`), so the reminders, the Teams
 * meeting, the invite draft and the rest of the lead's steps all work unchanged. `back` answers and ends.
 */
async function bookIntro(formData: FormData, member: OpsMember, leadId: string, back: (msg: string) => never): Promise<void> {
  const here = "/leads/" + leadId;
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");

  // A datetime-local field gives "2026-11-05T10:30" in the person's own clock,
  // which is Colombo for everyone who uses this.
  const typed = String(formData.get("at") ?? "").trim();
  const at = typed ? Date.parse(typed + ":00+05:30") : 0;
  const taLeadId = String(formData.get("taLeadId") ?? "").trim();
  const now = Date.now();

  const problem = problemWithBooking({ at, taLeadId }, now);
  if (problem) back(problem);
  const teams = await teamsPartOf(formData, member, lead as NonNullable<typeof lead>, "intro", at, taLeadId);
  if (teams.refusal) back(teams.refusal);

  // The count of attempts belongs to the lead, not to one booking: a new
  // booking carries it forward, or three attempts would never be reached and a
  // client who had gone quiet would be rebooked for ever (found in the
  // browser, 2 Nov).
  const triedBefore = meetingsForLead(db, leadId).reduce((most, m) => Math.max(most, m.rebookCount), 0);

  const meeting = await addMeeting({
    leadId,
    kind: "intro",
    at,
    state: "booked",
    taLeadId,
    rebookCount: triedBefore,
    brief: "",
    role: "",
    packageSaid: "",
    reason: null,
    bookedBy: member.id,
    heldAt: null,
    alsoRequirement: formData.get("alsoRequirement") === "on",
    lengthMin: teams.lengthMin,
    organiserId: teams.organiserId,
    attendees: teams.attendees,
    joinUrl: teams.link || null,
    graphEventId: teams.graphEventId,
    teamsProblem: teams.problem,
  });

  for (const reminder of remindersFor(at, now)) {
    await startTimer({
      kind: reminder.kind,
      subjectType: "meeting",
      subjectId: meeting.id,
      startsAt: now,
      dueAt: reminder.dueAt,
      warnAt: null,
      ownerId: member.id,
      payload: { label: (lead as NonNullable<typeof lead>).company },
    });
  }

  await patchLead(leadId, { state: "intro_call" }, member.id, "lead.introCallBooked", null);
  const invite = await draftMeetingInvite(
    member,
    lead as NonNullable<typeof lead>,
    { id: meeting.id, kind: "intro", at },
    teams.link,
    teams.attendees,
  );
  const inviteSentence = await sendBookingInvite(
    member,
    db,
    teams.organiserId,
    invite,
    teams.link,
    formData.get("sendNow") === "on",
  );
  revalidatePath(here);
  const warning = warningAboutBooking(at, db.holidays.map((h) => h.date));
  const clash = await outlookClash(db, db.members.find((m) => m.id === teams.organiserId)?.email ?? member.email, at, teams.lengthMin);
  back(
    "Booked, with a reminder the day before and an hour before. It is on the Interviews calendar." +
      (teams.graphEventId ? " The Teams meeting is in the organiser's Outlook calendar." : "") +
      (teams.problem ? " No Teams link was made: " + teams.problem : "") +
      inviteSentence +
      (warning ? " " + warning : "") +
      clash,
  );
}

/**
 * The call happened (15, Phase 2 step 8).
 *
 * The brief is required. "The requirement was in the TA lead's head" is on the
 * owner's problem list, and a call that can be closed with an empty box is how
 * it stays there. Marking it held starts the agreement clock - two hours, from
 * the settings - because the agreement going out late is the first place the
 * business loses time.
 */
export async function markMeetingHeld(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const meetingId = String(formData.get("meetingId") ?? "");
  const db = await desk();
  const meeting = meetingIn(db, meetingId);
  const here = "/leads/" + (meeting?.leadId ?? "");
  const back = (msg: string) => redirect(leadBack(here, "intro", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!meeting) redirect("/leads?msg=" + encodeURIComponent("That meeting is gone."));

  const notes = {
    brief: String(formData.get("brief") ?? ""),
    role: String(formData.get("role") ?? ""),
    packageSaid: String(formData.get("packageSaid") ?? ""),
  };
  const problem = problemWithHeld(notes);
  if (problem) back(problem);

  const now = Date.now();
  const row = meeting as NonNullable<typeof meeting>;
  await patchMeeting(
    meetingId,
    { ...notes, state: "held", heldAt: now },
    member.id,
    "meeting.held",
    notes.brief.trim().slice(0, 200),
  );
  await cancelMeetingClocks(db, meetingId, member.id);

  const hours = numberOf(db, "esa.sendHours", 2);
  await startTimer({
    kind: "esa.send",
    subjectType: "lead",
    subjectId: row.leadId,
    startsAt: now,
    dueAt: agreementDueAt(now, hours),
    warnAt: null,
    ownerId: member.id,
    payload: { label: leadIn(db, row.leadId)?.company ?? "" },
  });
  await patchLead(row.leadId, { state: "waiting_agreement" }, member.id, "lead.callHeld", null);

  // The TA lead needs the brief, not a summary of it. Two ways, because the TA
  // lead is a person in the TA System and may have no Ops account at all:
  //
  //  * a task here, to whoever of ours is that same person (matched on their
  //    TA account), or else to the lead's owner, who has to pass it on. It was
  //    assigned to the TA System's own id first, which is nobody in Ops - so
  //    the task would have sat where no screen shows it (found in the browser);
  //  * a notice to them in the TA System, queued through the outbox, so it
  //    reaches them where they work.
  const ours = db.members.find((m) => m.taUserId && m.taUserId === row.taLeadId) ?? null;
  await createTask({
    kind: "record",
    title: "The brief from the intro call",
    body:
      notes.brief.trim() +
      (ours ? "" : "\n\nPass this to the TA lead: we have no Ops account matched to them."),
    assigneeId: ours?.id ?? leadIn(db, row.leadId)?.ownerId ?? member.id,
    dueAt: now,
    subjectType: "lead",
    subjectId: row.leadId,
    link: "/leads/" + row.leadId,
  });
  if (row.taLeadId) {
    await queueTaWrite(
      "/integrations/v1/notify",
      {
        userId: row.taLeadId,
        type: "ops_brief",
        title: "Intro call held: " + (leadIn(db, row.leadId)?.company ?? "a client"),
        body: notes.brief.trim(),
      },
      { type: "lead", id: row.leadId },
    );
  }

  revalidatePath(here);
  const missing = missingFromHeld(notes);
  redirect(
    leadMoved(
      here,
      "Saved. The agreement is due in " + hours + " hours." +
        (missing.length ? " Still not known: " + missing.join(" and ") + "." : ""),
      formData,
    ),
  );
}

/**
 * The call did not happen (15, Phase 2 step 8).
 *
 * Rebooking continues while the client is still answering. Three attempts with
 * no reply closes the lead with a reason - the owner's rule. The reason is
 * always written down, whichever way it goes.
 */
export async function markMeetingNotHeld(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const meetingId = String(formData.get("meetingId") ?? "");
  const db = await desk();
  const meeting = meetingIn(db, meetingId);
  const here = "/leads/" + (meeting?.leadId ?? "");
  const back = (msg: string) => redirect(leadBack(here, "intro", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!meeting) redirect("/leads?msg=" + encodeURIComponent("That meeting is gone."));

  const row = meeting as NonNullable<typeof meeting>;
  const why = String(formData.get("reason") ?? "").trim();
  if (why.length < 4) back("Write one line about why it did not happen.");
  const clientReplied = formData.get("clientReplied") === "on";

  const outcome = afterNotHeld(row.rebookCount, clientReplied);
  const now = Date.now();
  // The Outlook event goes too, so nobody turns up to a meeting that was dropped.
  let calendarNote = "";
  if (row.graphEventId) {
    const organiser = db.members.find((m) => m.id === row.organiserId);
    const cancelled = organiser ? await cancelTeamsEvent(organiser.email, row.graphEventId, switchedOn(db, "switch.teamsEnabled")) : null;
    if (cancelled && !cancelled.ok) calendarNote = " The Outlook meeting could not be cancelled: " + cancelled.reason;
  }
  await patchMeeting(
    meetingId,
    { state: "not_held", rebookCount: outcome.rebookCount, reason: why },
    member.id,
    "meeting.notHeld",
    why,
  );
  await cancelMeetingClocks(db, meetingId, member.id);

  if (outcome.action === "close") {
    await patchLead(
      row.leadId,
      { state: "closed_silent", reason: outcome.because + " " + why },
      member.id,
      "lead.closedSilent",
      outcome.because,
    );
    revalidatePath(here);
    revalidatePath("/leads");
    back(outcome.because + calendarNote);
  }

  // A draft to the client that the meeting did not go ahead; a person approves it, nothing is sent here (21 Nov).
  const lead = leadIn(db, row.leadId);
  const to = row.attendees?.length ? row.attendees.map((x) => x.email) : interviewersFrom(lead?.contactEmail ?? "");
  let draftNote = "";
  if (lead && to.length) {
    const what = row.kind === "intro" ? "introductory call" : "requirement meeting";
    await draftMessage({
      channel: "email",
      to,
      subject: "Our " + what + " on " + colomboWhen(row.at),
      body:
        "Dear " + (lead.contactName || "all") + ",\n\nWe are sorry that our " + what + " planned for " + colomboWhen(row.at) +
        " did not go ahead. We will be in touch with a new time shortly; if one suits you better, reply and we will fit around it." +
        "\n\nKind regards\n" + member.name,
      templateKey: null,
      attachmentFileIds: [],
      subjectType: "meeting",
      subjectId: row.id,
    });
    draftNote = " A note to the client is drafted in To approve.";
  }
  await createTask({
    kind: "call",
    title: "Book the intro call again",
    body: outcome.because + " What happened last time: " + why,
    assigneeId: member.id,
    dueAt: nextNineAm(now),
    subjectType: "lead",
    subjectId: row.leadId,
    link: "/leads/" + row.leadId,
  });
  revalidatePath(here);
  back(outcome.because + calendarNote + draftNote);
}

/* \u2500\u2500 The client agreement (15, Phase 2 steps 9 to 18) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

function blankAgreement(row: NonNullable<ReturnType<typeof leadIn>>, fields: EsaFields) {
  return {
    leadId: row.id,
    clientTaId: row.clientTaId,
    state: "draft",
    version: 1,
    fields,
    draftFileId: null,
    sentAt: null,
    sentMessageId: null,
    chaseStep: 0,
    expiresAt: null,
    signedAt: null,
    signedFileId: null,
    countersignedAt: null,
    countersignedFileId: null,
    reason: null,
    ownerId: row.ownerId,
  };
}

function newAgreementFields(db: Awaited<ReturnType<typeof desk>>, row: NonNullable<ReturnType<typeof leadIn>>): EsaFields {
  return startingFields(
    {
      guaranteeDays: numberOf(db, "guarantee.days", 90),
      paymentDays: numberOf(db, "invoice.dueDays", 30),
      replacementWorkingDays: numberOf(db, "replacement.workingDays", 60),
      // The ESA says 25 (clause 6.6, REFUND_PCT); a wrong fallback once put the
      // wrong number into new agreements (16 Nov).
      refundPct: numberOf(db, "refund.pct", REFUND_PCT),
    },
    row,
  );
}

/**
 * Starts the agreement for a lead.
 *
 * The numbers come from the settings, not from the code, so a client on a
 * different guarantee is a settings change. What we know about the company
 * from the lead is filled in, and the rest is the ops owner's to complete.
 */
export async function startAgreement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(leadBack(here, "agreement", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;
  if (agreementForLead(db, leadId)) back("There is already an agreement for this client.");

  await addAgreement(blankAgreement(row, newAgreementFields(db, row)));
  revalidatePath(here);
  back("Started. Fill in what is blank; it cannot be sent until the required fields are in.");
}

/**
 * Saves the fields. Blank required ones are allowed here and block the send.
 *
 * Also the intro call's form (17 Nov): with no agreement yet, it starts one from
 * the lead and saves into it, so the details are typed once, where the ops
 * person learns them. `returnTo` is the page they were on.
 */
export async function saveAgreementFields(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const db = await desk();
  const esaId = String(formData.get("esaId") ?? "");
  const lead = leadIn(db, String(formData.get("leadId") ?? ""));
  const esa = esaId ? agreementIn(db, esaId) : lead ? agreementForLead(db, lead.id) : null;
  const leadId = esa?.leadId ?? lead?.id ?? "";
  const step = formData.get("returnTo") === "intro" ? "intro" : "agreement";
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(leadBack(here, step, msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa && !lead) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));
  // A sent agreement is changed by a new version, not by editing what the client has.
  if (esa && !["draft", "negotiating"].includes(esa.state)) back("This agreement has gone out. Ask for changes to send a new version.");

  const fields: EsaFields = { ...(esa?.fields ?? newAgreementFields(db, lead as NonNullable<typeof lead>)) };
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field.")) fields[key.slice("field.".length)] = String(value);
  }

  if (esa) await patchAgreement(esa.id, { fields }, member.id, "esa.fieldsSaved", null);
  else await addAgreement(blankAgreement(lead as NonNullable<typeof lead>, fields));
  revalidatePath(here);
  const problem = problemWithDraft(fields);
  if (problem) back("Saved. " + problem);

  // "Save and make the draft": one click from an edited detail to the next version (17 Nov).
  if (formData.get("makeDraft")) {
    const fresh = await desk();
    const saved = agreementForLead(fresh, leadId);
    if (saved) {
      const made = await fillAgreementDraft(fresh, saved, member.id, Date.now());
      revalidatePath(here);
      if ("error" in made) back("Saved. " + made.error);
      const done = made as Exclude<typeof made, { error: string }>;
      back("Saved, and version " + done.version + " is drafted. Open it below. Nothing was sent.");
    }
  }
  back("Saved. Everything required is in; it can go.");
}

/**
 * The agreement as a document: the newest template, its holes filled from the
 * fields, stored as Word and (when LibreOffice is there) as PDF (16 Nov).
 *
 * One function for the send and the preview, so what a person looks at before
 * sending is exactly what would go. It makes no message and moves no state.
 * A hole nothing fills stops it: the owner's incident is a draft that went to a
 * client with placeholders still in it.
 */
async function fillAgreementDraft(
  db: Awaited<ReturnType<typeof desk>>,
  esa: NonNullable<ReturnType<typeof agreementIn>>,
  memberId: Id,
  now: number,
): Promise<{ error: string } | { version: number; wordFile: OpsFile; pdfFile: OpsFile | null; pdfReason: string }> {
  // Every draft is the next version; the earlier ones stay listed (17 Nov).
  const version = nextDraftVersion(db.files.filter((f) => f.subjectType === "esa" && f.subjectId === esa.id));
  // The owner's template, uploaded on the files screen as kind "Agreement,
  // drafted". Without it there is no document to attach, and a cover email
  // with nothing attached is worse than no email.
  const template = currentTemplate(db.files, "esa_draft");
  if (!template) {
    return {
      error:
        "The agreement template is not here yet. Upload the ESA as a Word file on the Files screen, as “Agreement, drafted”, and this can go.",
    };
  }
  const templateBytes = await readBytes(template.key);
  if (!templateBytes) return { error: "The template file is registered but its bytes are gone. Upload it again on the Files screen." };
  const fill = await fillDocx(Buffer.from(templateBytes), { ...holeValues(esa.fields), effectiveDate: colomboDateInWords(now) });
  const holeProblem = problemWithFill(
    fill.missing,
    (key) => ESA_FIELDS.find((f) => f.key === (WORDED_HOLES[key] ?? key))?.label ?? key,
  );
  if (holeProblem) return { error: holeProblem };

  const base = "Agreement - " + safeName(String(esa.fields.companyName ?? "client")) + " - v" + version;
  const wordKey = keyFor("esa_draft", "esa", esa.id, base + ".docx", now);
  await putBytes(wordKey, fill.bytes!, mimeFor(base + ".docx"));
  const wordFile = await addFile({
    kind: "esa_draft",
    key: wordKey,
    name: base + ".docx",
    size: fill.bytes!.byteLength,
    mime: mimeFor(base + ".docx"),
    sha256: sha256(fill.bytes!),
    subjectType: "esa",
    subjectId: esa.id,
    madeFrom: template.id,
    uploadedBy: memberId,
  });

  const pdf = await docxToPdf(fill.bytes!, base + ".docx");
  if (!pdf.ok) return { version, wordFile, pdfFile: null, pdfReason: pdf.reason ?? "" };
  const pdfKey = keyFor("esa_draft", "esa", esa.id, base + ".pdf", now);
  await putBytes(pdfKey, pdf.bytes!, "application/pdf");
  const pdfFile = await addFile({
    kind: "esa_draft",
    key: pdfKey,
    name: base + ".pdf",
    size: pdf.bytes!.byteLength,
    mime: "application/pdf",
    sha256: sha256(pdf.bytes!),
    subjectType: "esa",
    subjectId: esa.id,
    madeFrom: wordFile.id,
    uploadedBy: memberId,
  });
  return { version, wordFile, pdfFile, pdfReason: "" };
}

/**
 * Saves the cover email the person edited, or puts the standard wording back.
 * Kept with the agreement's fields, so the intro call and the send see the same text.
 */
export async function saveCoverEmail(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const db = await desk();
  const esa = agreementIn(db, String(formData.get("esaId") ?? ""));
  const step = formData.get("returnTo") === "intro" ? "intro" : "agreement";
  const here = "/leads/" + (esa?.leadId ?? "");
  const back = (msg: string) => redirect(leadBack(here, step, msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));
  const row = esa as NonNullable<typeof esa>;
  if (!["draft", "negotiating"].includes(row.state)) back("This agreement has gone out. Ask for changes to send a new version.");

  const fields: EsaFields = { ...row.fields };
  if (formData.get("reset")) {
    delete fields.coverSubject;
    delete fields.coverBody;
  } else {
    fields.coverSubject = String(formData.get("subject") ?? "").trim();
    fields.coverBody = String(formData.get("body") ?? "").trim();
    if (!fields.coverSubject || !fields.coverBody) back("The email needs a subject and some words. Use reset to get the standard wording back.");
    const problem = coverEmail(templateFor(db, "esa.cover"), fields);
    if ("problem" in problem) back(problem.problem);
  }
  await patchAgreement(row.id, { fields }, member.id, "esa.coverSaved", null);
  revalidatePath(here);
  back(formData.get("reset") ? "The standard cover email is back." : "Saved. This is the email that will go.");
}

/**
 * A look at the agreement before it is sent (16 Nov): fills it exactly as the
 * send would, keeps the files, and makes no message. The drafts show on the
 * lead under Versions, each with Open in a new tab.
 */
export async function previewAgreement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "");
  const db = await desk();
  const esa = agreementIn(db, esaId);
  const here = "/leads/" + (esa?.leadId ?? "");
  const step = formData.get("returnTo") === "intro" ? "intro" : "agreement";
  const back = (msg: string) => redirect(leadBack(here, step, msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));
  const row = esa as NonNullable<typeof esa>;

  const problem = problemWithDraft(row.fields);
  if (problem) back(problem);
  const draft = await fillAgreementDraft(db, row, member.id, Date.now());
  if ("error" in draft) back(draft.error);
  const made = draft as Exclude<typeof draft, { error: string }>;
  revalidatePath(here);
  back(
    made.pdfFile
      ? "A filled draft is ready to open below, in Versions. Nothing was sent."
      : "The Word draft is ready to open below, in Versions. No PDF this time: " + made.pdfReason + " Nothing was sent.",
  );
}

/**
 * Sends the agreement (15, Phase 2 step 11).
 *
 * Three things have to be true: every required field is filled, the owner's
 * agreement template exists as a file, and a person approves the cover email.
 * The template is the piece we do not have yet - the real ESA as a Word file
 * with its variable fields - so until it is uploaded this refuses and says so,
 * rather than inventing an agreement of our own.
 *
 * Sending starts two clocks: the first chase, and the two weeks after which an
 * unsigned agreement is given up on.
 */
export async function sendAgreement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "");
  const db = await desk();
  const esa = agreementIn(db, esaId);
  const here = "/leads/" + (esa?.leadId ?? "");
  const back = (msg: string) => redirect(leadBack(here, formData.get("returnTo") === "intro" ? "intro" : "agreement", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));
  const row = esa as NonNullable<typeof esa>;

  if (!canMoveTo(row.state as EsaState, "sent")) back("An agreement in that state cannot be sent.");
  // A client who wanted changes gets the next version, not the same document
  // again: the version number moves, the chase starts from the beginning, and
  // the clocks of the version before it stop (3 Nov).
  const again = row.state === "negotiating";
  const problem = problemWithDraft(row.fields);
  if (problem) back(problem);
  // Checked before any file is made, so a broken cover leaves nothing behind.
  const cover = coverEmail(templateFor(db, "esa.cover"), row.fields);
  if ("problem" in cover) back(cover.problem);
  const coverText = cover as { subject: string; body: string };

  const now = Date.now();
  const draft = await fillAgreementDraft(db, row, member.id, now);
  if ("error" in draft) back(draft.error);
  const made = draft as Exclude<typeof draft, { error: string }>;
  // The number of the file that goes: one past the last drafted, so earlier previews stay as they were.
  const version = made.version;

  // A client gets the PDF, never the Word file: a Word file can be edited by
  // whoever receives it. No LibreOffice means no agreement goes out from here,
  // which is the right answer on a laptop.
  if (!made.pdfFile) back("The agreement was filled in but no PDF could be made. " + made.pdfReason);
  const pdfFile = made.pdfFile!;

  const to = String(row.fields.signatoryEmail ?? "").trim();
  const message = await draftMessage({
    channel: "email",
    to: [to],
    attachmentFileIds: [pdfFile.id],
    subject: coverText.subject,
    body: coverText.body,
    templateKey: "esa.cover",
    subjectType: "esa",
    subjectId: esaId,
  });

  const days = numberOf(db, "esa.declineDays", 14);
  if (again) await cancelClocksFor(db, "esa", esaId, member.id, "A new version of the agreement is going out.");
  await patchAgreement(
    esaId,
    {
      state: "sent",
      version,
      draftFileId: pdfFile.id,
      chaseStep: 0,
      sentAt: now,
      sentMessageId: message.id,
      expiresAt: esaExpiresAt(now, days),
    },
    member.id,
    again ? "esa.sentAgain" : "esa.sent",
    again ? "Version " + version : null,
  );

  // The company becomes a record of its own the moment an agreement is out:
  // onboarding, not yet a client we work for.
  const theirLead = leadIn(db, row.leadId);
  if (theirLead) await clientFromLead(db, theirLead, "onboarding", member.id);

  const first = nextChaseAt(0, now);
  if (first) {
    await startTimer({
      kind: "esa.chase",
      subjectType: "esa",
      subjectId: esaId,
      startsAt: now,
      dueAt: first.dueAt,
      warnAt: null,
      ownerId: member.id,
      payload: { label: String(row.fields.companyName ?? ""), step: String(first.step) },
    });
  }
  await startTimer({
    kind: "esa.decline",
    subjectType: "esa",
    subjectId: esaId,
    startsAt: now,
    dueAt: esaExpiresAt(now, days),
    warnAt: null,
    ownerId: member.id,
    payload: { label: String(row.fields.companyName ?? "") },
  });

  revalidatePath(here);
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent(
        again
          ? "Version " + version + " is drafted, with the two weeks and the chase starting again. Read it, then approve it."
          : "The cover email is drafted. Read it, then approve it to send.",
      ),
  );
}

/**
 * They want changes (15, Phase 2 step 16).
 *
 * The chase stops, because a client who is talking to us is not a client who
 * is ignoring us, and a meeting goes on the owner's list so the terms are
 * agreed by a person and written down. The two weeks keep running: they are
 * the outer limit from sending, and if they run out somebody decides.
 */
export async function recordChangesWanted(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "");
  const db = await desk();
  const esa = agreementIn(db, esaId);
  const here = "/leads/" + (esa?.leadId ?? "");
  const back = (msg: string) => redirect(leadBack(here, "agreement", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));
  const row = esa as NonNullable<typeof esa>;

  const what = String(formData.get("what") ?? "").trim();
  const problem = problemWithChanges(what);
  if (problem) back(problem);
  if (!canMoveTo(row.state as EsaState, "negotiating")) back("An agreement in that state is not being negotiated.");

  await patchAgreement(esaId, { state: "negotiating", reason: what }, member.id, "esa.negotiating", what);
  const stopped = await cancelClocksFor(db, "esa", esaId, member.id, "The client wants changes.", ["esa.chase"]);
  await createTask({
    kind: "record",
    title: "Agree the changes: " + String(row.fields.companyName ?? "a client"),
    body:
      "They want changes before signing: " +
      what +
      "\n\nAgree the terms with them, write them into the fields, then send the next version.",
    assigneeId: row.ownerId,
    dueAt: Date.now(),
    subjectType: "esa",
    subjectId: esaId,
    link: "/leads/" + row.leadId,
  });
  revalidatePath(here);
  back(
    stopped
      ? "Noted, and the chasing has stopped. Change the fields, then send the next version."
      : "Noted. Change the fields, then send the next version.",
  );
}

/**
 * Drafts the next chase (15, Phase 2 step 13).
 *
 * The plan is the owner's: email, WhatsApp, email, WhatsApp, email, then a
 * call by a person. Each one is drafted for approval, never sent on its own,
 * and a reply from the client stops the rest.
 */
export async function draftNextChase(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "");
  const db = await desk();
  const esa = agreementIn(db, esaId);
  const here = "/leads/" + (esa?.leadId ?? "");
  const back = (msg: string) => redirect(leadBack(here, "agreement", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));

  // The drafting itself is in `chaseTheAgreement`, because the clock does
  // exactly the same thing when it fires (3 Nov). This is only the door.
  const answer = await chaseTheAgreement(esaId, member.id);
  revalidatePath(here);
  if (!answer.ok || !answer.messageId) back(answer.what);
  redirect("/messages/" + answer.messageId + "?msg=" + encodeURIComponent(answer.what));
}

/**
 * The signed copy came back (15, Phase 2 step 15).
 *
 * A copy came back unsealed once and had to be resent, so this asks for the
 * file and for somebody to say they looked at it. Everyone who needs to know
 * is told the same day - that is the fix for a signed agreement reaching the
 * Director months later - and the countersign clock starts.
 */
export async function recordAgreementSigned(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "");
  const db = await desk();
  const esa = agreementIn(db, esaId);
  const here = "/leads/" + (esa?.leadId ?? "");
  const back = (msg: string) => redirect(leadBack(here, "agreement", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));
  const row = esa as NonNullable<typeof esa>;

  const fileId = String(formData.get("fileId") ?? "").trim() || null;
  const problem = problemWithSigned({ fileId, checked: formData.get("checked") === "on" });
  if (problem) back(problem);
  if (!canMoveTo(row.state as EsaState, "signed")) back("An agreement in that state cannot be marked signed.");

  const now = Date.now();
  await patchAgreement(esaId, { state: "signed", signedAt: now, signedFileId: fileId }, member.id, "esa.signed", null);
  // Every clock on it stops, not only the chases: the two-week "nobody has
  // signed" clock kept running and would have fired on a signed agreement.
  await cancelClocksFor(db, "esa", esaId, member.id, "The agreement is signed.");

  const company = String(row.fields.companyName ?? "a client");

  // 17 Nov: the Director's signature is stamped on at once, nothing waits for a
  // person to countersign, and a person only reviews and sends the email.
  const auto = fileId ? await countersignAutomatically(db, member, esaId, fileId) : null;
  if (auto?.ok) {
    const fresh = agreementIn(await desk(), esaId) as NonNullable<ReturnType<typeof agreementIn>>;
    const messageId = await finishCountersign(db, member, fresh, auto.fileId);
    await createTask({
      kind: "check",
      title: "Review and send the countersigned agreement: " + company,
      body: "The client has signed and the Director's signature is on it. Read their copy and approve it to send it back.",
      assigneeId: member.id,
      dueAt: now,
      subjectType: "esa",
      subjectId: esaId,
      link: "/messages/" + messageId,
    });
    revalidatePath(here);
    redirect(
      "/messages/" + messageId + "?msg=" + encodeURIComponent("Signed, and countersigned with the Director's signature. Read their copy and approve it to send it back."),
    );
  }

  for (const person of db.members.filter((m) => m.active && ["ops_lead", "director_ops", "ta_lead_ro"].includes(m.role))) {
    await createTask({
      kind: "check",
      title: "Agreement signed: " + company,
      body: "The client has signed. The Director countersigns next, and the search can be set up.",
      assigneeId: person.id,
      dueAt: now,
      subjectType: "esa",
      subjectId: esaId,
      link: "/leads/" + row.leadId,
    });
  }

  await startTimer({
    kind: "esa.countersign",
    subjectType: "esa",
    subjectId: esaId,
    startsAt: now,
    dueAt: now + numberOf(db, "esa.countersignDays", 1) * 24 * HOUR,
    warnAt: null,
    ownerId: member.id,
    payload: { label: company },
  });

  revalidatePath(here);
  redirect(
    leadMoved(
      here,
      "Signed. Everyone has been told, and the Director has a day to countersign." +
        (auto && !auto.ok ? " " + auto.reason : ""),
      formData,
    ),
  );
}

/** The Director countersigned; the client gets their copy back (step 18). */
export async function recordAgreementCountersigned(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "");
  const db = await desk();
  const esa = agreementIn(db, esaId);
  const here = "/leads/" + (esa?.leadId ?? "");
  const back = (msg: string) => redirect(leadBack(here, "agreement", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));
  const row = esa as NonNullable<typeof esa>;

  const fileId = String(formData.get("fileId") ?? "").trim() || null;
  if (!fileId) back("Upload the countersigned copy first, on the Files screen.");
  if (!canMoveTo(row.state as EsaState, "countersigned")) back("That agreement is not waiting to be countersigned.");

  const messageId = await finishCountersign(db, member, row, fileId as string);
  revalidatePath(here);
  redirect(
    "/messages/" + messageId + "?msg=" + encodeURIComponent("Countersigned. Their copy is drafted — approve it to send it back."),
  );
}

/**
 * Everything that follows a countersign, whoever made the countersigned copy:
 * the agreement's state, the client record, and the cover email as a draft.
 * Shared by the manual upload above and the automatic stamp below.
 */
async function finishCountersign(
  db: Awaited<ReturnType<typeof desk>>,
  member: OpsMember,
  row: NonNullable<ReturnType<typeof agreementIn>>,
  fileId: string,
): Promise<string> {
  const esaId = row.id;
  const now = Date.now();
  await patchAgreement(
    esaId,
    { state: "countersigned", countersignedAt: now, countersignedFileId: fileId },
    member.id,
    "esa.countersigned",
    null,
  );
  await cancelClocksFor(db, "esa", esaId, member.id, "The agreement is countersigned.");
  await patchLead(row.leadId, { state: "requirement" }, member.id, "lead.agreementDone", null);
  // Signed by both: they are a client we work for, and everything from the
  // requirement meeting on hangs off this record.
  const signedLead = leadIn(db, row.leadId);
  if (signedLead) {
    await clientFromLead(db, { ...signedLead, clientTaId: row.clientTaId ?? signedLead.clientTaId }, "active", member.id);
    revalidatePath("/clients");
  }

  const message = await draftMessage({
    channel: "email",
    to: [String(row.fields.signatoryEmail ?? "").trim()],
    subject: "Our countersigned agreement",
    body:
      "Dear " +
      String(row.fields.signatoryName ?? "") +
      ",\n\nOur countersigned agreement is attached. We will come back to you to arrange the requirement meeting.\n\nKind regards\nCareer 141",
    templateKey: "esa.countersigned.cover",
    subjectType: "esa",
    subjectId: esaId,
    attachmentFileIds: [fileId],
  });
  return message.id;
}

/**
 * Stamps the Director's stored signature on the client's signed copy and keeps
 * the result as the countersigned file (17 Nov). Returns the new file's id, or
 * a sentence saying why it could not, so the page can fall back to the manual
 * upload instead of failing.
 */
async function countersignAutomatically(
  db: Awaited<ReturnType<typeof desk>>,
  member: OpsMember,
  esaId: string,
  signedFileId: string,
): Promise<{ ok: true; fileId: string } | { ok: false; reason: string }> {
  const signatureFile = [...db.files]
    .filter((f) => f.kind === "director_signature")
    .sort((a, b) => b.uploadedAt - a.uploadedAt)[0];
  if (!signatureFile) {
    return { ok: false, reason: "No signature picture for the Director is on the Files screen yet, so it was not countersigned for them." };
  }
  const signed = fileIn(db, signedFileId);
  if (!signed || !/\.pdf$/i.test(signed.name)) {
    return { ok: false, reason: "The signed copy is not a PDF, so it cannot be stamped." };
  }
  const [signedBytes, signatureBytes] = await Promise.all([readBytes(signed.key), readBytes(signatureFile.key)]);
  if (!signedBytes || !signatureBytes) return { ok: false, reason: "The signed copy or the signature could not be read from storage." };

  const stamped = await stampCountersignature(signedBytes, signatureBytes, {
    name: "Director of Operations",
    when: colomboDateInWords(Date.now()),
  });
  if (!stamped.ok) return stamped;

  const name = signed.name.replace(/\.pdf$/i, "") + " (countersigned).pdf";
  const key = keyFor("esa_countersigned", "esa", esaId, name);
  await putBytes(key, stamped.bytes, "application/pdf");
  const file = await addFile({
    kind: "esa_countersigned",
    key,
    name,
    size: stamped.bytes.byteLength,
    mime: "application/pdf",
    sha256: sha256(stamped.bytes),
    subjectType: "esa",
    subjectId: esaId,
    madeFrom: signed.id,
    uploadedBy: member.id,
  });
  return { ok: true, fileId: file.id };
}

/** Declined, by them or by us. The search is blocked and everyone is told (step 17). */
export async function declineAgreement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "");
  const db = await desk();
  const esa = agreementIn(db, esaId);
  const here = "/leads/" + (esa?.leadId ?? "");
  const back = (msg: string) => redirect(leadBack(here, "agreement", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));
  const row = esa as NonNullable<typeof esa>;

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 4) back("Write why it is declined. Nothing closes without a reason.");

  await patchAgreement(esaId, { state: "declined", reason }, member.id, "esa.declined", reason);
  await cancelClocksFor(db, "esa", esaId, member.id, "The agreement is declined.");
  await patchLead(
    row.leadId,
    { state: "closed_other", reason: "No signed agreement: " + reason },
    member.id,
    "lead.closedNoAgreement",
    reason,
  );
  for (const person of db.members.filter((m) => m.active && ["ops_lead", "ta_lead_ro"].includes(m.role))) {
    await createTask({
      kind: "check",
      title: "No agreement: " + String(row.fields.companyName ?? "a client"),
      body: "The agreement is declined, so no work starts for this client. " + reason,
      assigneeId: person.id,
      dueAt: Date.now(),
      subjectType: "esa",
      subjectId: esaId,
      link: "/leads/" + row.leadId,
    });
  }
  revalidatePath(here);
  revalidatePath("/leads");
  back("Declined, and the team has been told the search is blocked.");
}

/** The bytes of the files a message carries, in the order they were added. */
async function filesFor(
  db: Awaited<ReturnType<typeof desk>>,
  fileIds: string[],
): Promise<{ name: string; mime: string; bytes: Uint8Array }[]> {
  const out: { name: string; mime: string; bytes: Uint8Array }[] = [];
  for (const fileId of fileIds ?? []) {
    const file = fileIn(db, fileId);
    if (!file) continue;
    const bytes = await readBytes(file.key);
    if (!bytes) continue;
    out.push({ name: file.name, mime: file.mime, bytes });
  }
  return out;
}

/**
 * Keeps a calendar invite as a file and returns its id, for a draft to carry (16 Nov, plan B2).
 * The email is still a draft a person approves; the .ics only travels with it.
 */
async function keepInvite(
  invite: InviteInput,
  subjectType: string,
  subjectId: string,
  uploadedBy: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(buildInvite(invite));
  const name = "invite.ics";
  const key = keyFor("invite", subjectType, subjectId, name);
  await putBytes(key, bytes, "text/calendar");
  const file = await addFile({
    kind: "invite",
    key,
    name,
    size: bytes.byteLength,
    mime: "text/calendar",
    sha256: sha256(bytes),
    subjectType,
    subjectId,
    madeFrom: null,
    uploadedBy,
  });
  return file.id;
}

function interviewInvite(
  iv: Pick<OpsInterview, "id" | "candidateName" | "round" | "at" | "whereOrLink" | "interviewers" | "reschedules">,
  member: OpsMember,
): InviteInput {
  return {
    uid: "interview-" + iv.id + "@ops.career141.com",
    startsAt: iv.at ?? 0,
    summary: "Interview: " + iv.candidateName + ", round " + iv.round,
    location: iv.whereOrLink,
    url: /^https?:\/\//.test(iv.whereOrLink) ? iv.whereOrLink : undefined,
    organizer: { name: member.name, email: member.email },
    attendees: iv.interviewers,
    sequence: iv.reschedules?.length ?? 0,
  };
}

/**
 * The invite email to a client's contact for an intro call or a requirement meeting.
 * A draft, with the .ics attached. No address on the lead means no draft, and the caller says so.
 */
async function draftMeetingInvite(
  member: OpsMember,
  lead: { company: string; contactName: string; contactEmail: string },
  meeting: { id: string; kind: string; at: number },
  link: string,
  attendees: Attendee[] = [],
): Promise<string | null> {
  // The people the booking named; the lead's one contact when it named none.
  const to = attendees.length ? attendees.map((a) => a.email) : interviewersFrom(lead.contactEmail);
  if (!to.length) return null;
  const what = meeting.kind === "intro" ? "introductory call" : "requirement meeting";
  const fileId = await keepInvite(
    {
      uid: "meeting-" + meeting.id + "@ops.career141.com",
      startsAt: meeting.at,
      summary: "Career 141 and " + lead.company + ": " + what,
      location: link || undefined,
      url: /^https?:\/\//.test(link) ? link : undefined,
      organizer: { name: member.name, email: member.email },
      attendees: to,
    },
    "meeting",
    meeting.id,
    member.id,
  );
  const message = await draftMessage({
    channel: "email",
    to,
    subject: "Our " + what + ", " + colomboWhen(meeting.at),
    body:
      "Dear " +
      (lead.contactName || "all") +
      ",\n\nOur " +
      what +
      " is on " +
      colomboWhen(meeting.at) +
      "." +
      (link ? "\n\nJoin on Microsoft Teams:\n" + link : "") +
      "\n\nThe calendar invite is attached.\n\nKind regards\n" +
      member.name,
    templateKey: null,
    attachmentFileIds: [fileId],
    subjectType: "meeting",
    subjectId: meeting.id,
  });
  return message.id;
}

/**
 * Auto-send a booked meeting's drafted invite through the same outbound gate as
 * a manual approval, from the organiser's mailbox (or dev sender override).
 * Never throws or rolls back the booking if the gate blocks or Microsoft refuses.
 */
async function sendBookingInvite(
  member: OpsMember,
  db: OpsDatabase,
  organiserId: string,
  inviteId: string | null,
  link: string,
  sendNow: boolean,
): Promise<string> {
  if (!inviteId) return " Add the contact's email to get an invite drafted.";
  const fresh = await desk();
  const msg = fresh.messages.find((m) => m.id === inviteId);
  if (!msg) return " The invite is drafted in To approve.";
  const check = canAutoSendInvite({
    hasLink: Boolean(link),
    linkIsStandIn: isStandInTeamsLink(link),
    recipients: msg.to,
    sendNow,
    outreachLive: switchedOn(db, "switch.outreachLive") && outreachLiveInEnv(),
  });
  if (!check.ok) return " " + check.reason;
  const organiser = fresh.members.find((m) => m.id === organiserId) ?? member;
  const outcome = await approveOne(member, fresh, msg, {
    from: senderAddressFor(organiser.email),
    notePrefix: "Sent automatically on booking.",
  });
  return " " + outcome;
}

/* ── The client record (15, Phase 2 step 19) ─────────────────── */

/**
 * Who we invoice, and which WhatsApp group is theirs.
 *
 * Both of these live in somebody's inbox today, which is why an invoice has
 * gone to the wrong person and a set has been posted in the wrong group.
 */
export async function saveClientDetails(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const clientId = String(formData.get("clientId") ?? "");
  const here = "/clients/" + clientId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  if (!clientIn(db, clientId)) redirect("/clients?msg=" + encodeURIComponent("That client is gone."));

  // The name can be changed here (23 Nov); an empty field leaves it as it is.
  const newName = String(formData.get("name") ?? "").trim();
  const was = clientIn(db, clientId) as NonNullable<ReturnType<typeof clientIn>>;
  const renamed = newName && newName !== was.name;
  if (renamed) {
    const bad = problemWithClientRename(newName, db.clients.some((c) => c.id !== clientId && c.nameKey === nameKey(newName)));
    if (bad) back(bad);
  }

  const details = {
    billingName: String(formData.get("billingName") ?? "").trim(),
    billingEmail: String(formData.get("billingEmail") ?? "").trim(),
    billingAddress: String(formData.get("billingAddress") ?? "").trim(),
    groupName: String(formData.get("groupName") ?? "").trim(),
  };
  const problem = problemWithBilling(details);
  if (problem) back(problem);

  await patchClient(
    clientId,
    { ...details, ...(renamed ? { name: newName, nameKey: nameKey(newName) } : {}), notes: String(formData.get("notes") ?? "").trim() },
    member.id,
    renamed ? "client.renamed" : "client.detailsSaved",
    null,
  );
  revalidatePath(here);
  back("Saved.");
}

/**
 * Change which Ops person handles a position (23 Nov, the client and position table). A position's handler
 * could not be changed from anywhere before, so when somebody went on leave their roles stayed on them.
 * The reassign right is the Ops lead's, like moving a client between people, and the reason is kept.
 */
export async function setPositionOwner(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = backTo(formData, "/clients/positions");
  const back = (msg: string) => redirect(withMsg(here, msg));
  if (!can(member, "task.reassign")) back(refusal("task.reassign"));
  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) back("That position is gone.");
  const row = position as NonNullable<typeof position>;
  const newId = String(formData.get("handlerId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithNewHandler(newId, row.ownerId, db.members, reason);
  if (problem) back(problem);

  await patchPosition(positionId, { ownerId: newId }, member.id, "position.handlerChanged", reason + " (was " + (db.members.find((m) => m.id === row.ownerId)?.name ?? row.ownerId) + ")");
  await createTask({
    kind: "check",
    title: "You now handle " + row.title,
    body: "It was moved to you: " + reason,
    assigneeId: newId,
    dueAt: Date.now(),
    subjectType: "position",
    subjectId: positionId,
    link: "/positions/" + positionId,
  });
  revalidatePath("/clients/positions");
  revalidatePath("/positions");
  revalidatePath("/positions/" + positionId);
  redirect(here + confirmed("Now handled by " + (db.members.find((m) => m.id === newId)?.name ?? "them") + ".", here));
}

/** Live, quiet or finished. Going quiet needs a reason, like closing does. */
export async function moveClientStage(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const clientId = String(formData.get("clientId") ?? "");
  const here = "/clients/" + clientId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const client = clientIn(db, clientId);
  if (!client) redirect("/clients?msg=" + encodeURIComponent("That client is gone."));
  const row = client as NonNullable<typeof client>;

  const to = String(formData.get("stage") ?? "") as ClientStage;
  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithStageMove(row.stage as ClientStage, to, reason);
  if (problem) back(problem);

  await patchClient(clientId, { stage: to, reason: reason || null }, member.id, "client.stageMoved", reason || null);
  revalidatePath(here);
  revalidatePath("/clients");
  back("Moved. " + STAGE_MEANINGS[to] + ".");
}

/**
 * One ops person owns each client, and only the ops lead moves them.
 *
 * The TA System has to be told, because it shows the ops owner beside the
 * client: it goes in the outbox, so a TA System that is down does not stop the
 * move here.
 */
export async function moveClientOwner(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const clientId = String(formData.get("clientId") ?? "");
  const here = backTo(formData, "/clients/" + clientId);
  const back = (msg: string) => redirect(withMsg(here, msg));
  if (!can(member, "task.reassign")) back("Only the ops lead moves a client to another owner.");
  const db = await desk();
  const client = clientIn(db, clientId);
  if (!client) redirect("/clients?msg=" + encodeURIComponent("That client is gone."));
  const row = client as NonNullable<typeof client>;

  const toId = String(formData.get("ownerId") ?? "");
  const to = db.members.find((m) => m.id === toId && m.active);
  if (!to) back("Pick somebody who is here.");
  if (toId === row.ownerId) back("They already own this client.");
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 4) back("Write why it is moving. The last owner will want to know.");

  await patchClient(clientId, { ownerId: toId }, member.id, "client.ownerMoved", reason);
  await createTask({
    kind: "check",
    title: "You now own " + row.name,
    body: "Moved to you by " + member.name + ": " + reason,
    assigneeId: toId,
    dueAt: Date.now(),
    subjectType: "client",
    subjectId: clientId,
    link: "/clients/" + clientId,
  });
  if (row.taClientId) {
    await queueTaWrite(
      "/integrations/v1/clients/" + row.taClientId,
      { opsOwnerEmail: to?.email ?? "", opsOwnerName: to?.name ?? "" },
      { type: "client", id: clientId },
    );
  }
  revalidatePath(here);
  revalidatePath("/clients");
  revalidatePath("/clients/owners");
  back("Moved to " + (to?.name ?? "them") + ", and the TA System will be told.");
}

/** Assigns a lead (and any agreement behind it) to an Ops owner from Who owns what. */
export async function assignLeadOwner(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = backTo(formData, "/clients/owners");
  const back = (msg: string) => redirect(withMsg(here, msg));
  if (!can(member, "task.reassign")) back("Only the ops lead assigns a lead to another owner.");
  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;

  const toId = String(formData.get("ownerId") ?? "");
  const to = db.members.find((m) => m.id === toId && m.active);
  if (!to) back("Pick somebody who is here.");
  const target = to as NonNullable<typeof to>;

  await patchLead(leadId, { ownerId: toId }, member.id, "lead.ownerAssigned", "Assigned to " + target.name);
  const esa = agreementForLead(db, leadId);
  if (esa) {
    await patchAgreement(esa.id, { ownerId: toId }, member.id, "esa.ownerAssigned", "Assigned to " + target.name);
  }
  await createTask({
    kind: "check",
    title: "New lead assigned: " + row.company,
    body: "Assigned to you by " + member.name + ". Check if they are already our client and book the intro call.",
    assigneeId: toId,
    dueAt: Date.now(),
    subjectType: "lead",
    subjectId: leadId,
    link: "/leads/" + leadId,
  });
  revalidatePath("/leads/" + leadId);
  revalidatePath("/leads");
  revalidatePath("/clients");
  revalidatePath("/clients/owners");
  back("Assigned " + row.company + " to " + target.name + ".");
}

/* ── The CVs that go to the client (15, Phase 4 steps 3 and 4) ── */

/**
 * Read the set before it goes (step 3).
 *
 * Every prepared CV is fetched from TA once and kept as our own file. The
 * email the client gets has to be reproducible a year later: TA can replace a
 * prepared CV, and what the client actually received must not change with it.
 *
 * A CV already kept is not fetched again. A candidate TA has no prepared CV
 * for is named on the screen rather than quietly dropped.
 */
export async function reviewClientSet(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const here = "/sets/" + setId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) redirect("/sets?msg=" + encodeURIComponent("That set is gone."));
  const row = set as NonNullable<typeof set>;
  if (row.state === "sent") back("That set has gone already.");

  const now = Date.now();
  let fetched = 0;
  const candidates = [];
  for (const who of row.candidates) {
    if (who.fileId && fileIn(db, who.fileId)) {
      candidates.push(who);
      continue;
    }
    const answer = await preparedCv(who.applicationTaId);
    if (!answer.ok) {
      candidates.push({ ...who, fileId: null, problem: answer.reason });
      continue;
    }
    const name = safeName(who.name) + " - Career 141.pdf";
    const key = keyFor("cv", "clientSet", setId, name, now);
    await putBytes(key, answer.data.bytes, answer.data.mime);
    const kept = await addFile({
      kind: "cv",
      key,
      name,
      size: answer.data.bytes.byteLength,
      mime: answer.data.mime,
      sha256: sha256(answer.data.bytes),
      subjectType: "clientSet",
      subjectId: setId,
      madeFrom: null,
      uploadedBy: member.id,
    });
    fetched += 1;
    candidates.push({ ...who, fileId: kept.id, problem: null });
  }

  await patchClientSet(
    setId,
    { candidates, state: row.state === "ready" ? "reviewing" : row.state },
    member.id,
    "clientSet.reviewed",
    null,
  );
  revalidatePath(here);
  const missing = candidates.filter((c) => !c.fileId).length;
  back(
    (fetched ? fetched + (fetched === 1 ? " CV" : " CVs") + " kept. " : "Nothing new to fetch. ") +
      (missing ? missing + " still has no CV; see below." : "Every CV is here."),
  );
}

/**
 * Send the set to the client (step 4).
 *
 * It goes to the client's own people - whoever TA has marked "hr" - with the
 * ops owner copied, as a drafted email a person approves. The CVs travel with
 * it. The clock the client's seven working days run on starts from the day
 * they received it, which defaults to today and can be corrected.
 *
 * TA is told the round has gone, through the outbox, so a TA System that is
 * down does not stop the client being served.
 */
export async function sendClientSet(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const here = "/sets/" + setId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) redirect("/sets?msg=" + encodeURIComponent("That set is gone."));
  const row = set as NonNullable<typeof set>;
  if (!canMoveSetTo(row.state as SetState, "sent")) back("A set in that state cannot be sent.");

  const answer = await taClients(row.clientTaId ? row.name.split(" > ")[0] : "");
  const theirs = answer.ok ? answer.data.find((c) => c.id === row.clientTaId) : undefined;
  // The position's own people and the client's standard contacts (17 Nov); TA's
  // HR contacts only when Ops has none of its own.
  const to = setRecipients({
    position: positionForSet(db, row)?.contacts,
    client: row.clientId ? clientIn(db, row.clientId)?.contacts : null,
    ta: theirs?.contacts,
  });

  const problem = problemWithSending(
    row.candidates,
    to,
    numberOf(db, "set.minCvs", MIN_CVS),
    // On unless somebody switched it off: a desk that never had the setting still gets the rule.
    db.settings.find((s) => s.key === "set.requireInternalInterview")?.value !== false,
  );
  if (problem) back(problem);

  // The owner's hold at five (step 15): a client already sitting on five
  // shortlisted gets no sixth CV, because that is how a client stops reading
  // them. The ops lead can override it, and the override goes to the audit.
  const held = problemWithAnotherSet(
    positionForSet(db, row)?.depthStage ?? null,
    numberOf(db, "depth.holdAt", HOLD_AT),
  );
  if (held && !can(member, "task.reassign")) back(held);

  const wording = templateFor(db, "set.cover");
  const fill = (text: string) =>
    text
      .replace(/\{\{client\}\}/g, theirs?.name ?? row.name.split(" > ")[0])
      .replace(/\{\{position\}\}/g, row.role)
      .replace(/\{\{setNumber\}\}/g, String(row.setNumber))
      .replace(/\{\{cvCount\}\}/g, String(row.candidates.length))
      .replace(/\{\{contact\}\}/g, (theirs?.contacts ?? []).find((c) => (c.role ?? "") === "hr")?.name ?? "all")
      .replace(/\{\{opsPerson\}\}/g, member.name);

  const message = await draftMessage({
    channel: "email",
    to,
    subject: fill(wording?.subject ?? "{{client}} > {{position}} > SET {{setNumber}}"),
    body: fill(wording?.body ?? "Dear {{contact}},\n\n{{cvCount}} CVs are attached.\n\nKind regards\nCareer 141"),
    templateKey: "set.cover",
    subjectType: "clientSet",
    subjectId: setId,
    attachmentFileIds: row.candidates.map((c) => c.fileId).filter((id): id is string => id !== null),
  });

  const now = Date.now();
  await patchClientSet(
    setId,
    { state: "sent", sentAt: now, sentMessageId: message.id, sentTo: to, receivedAt: now },
    member.id,
    "clientSet.sent",
    held ? "The ops lead sent it anyway: " + held : null,
  );
  await cancelClocksFor(db, "clientSet", setId, member.id, "The set has gone.", ["set.due"]);
  // Everything after a set counts from the day the client received it (step 6):
  // seven working days of CV ownership, the feedback chase, the two weeks before
  // a hold, and the three months before an unreported hire is asked about.
  await startReceiptClocks(db, { ...row, state: "sent", receivedAt: now }, now);

  // The client's WhatsApp group (step 13). Nothing can post to a WhatsApp
  // group - Meta's API cannot write to one - so the text is drafted and a
  // person posts it from their phone. If the group does not exist yet, making
  // it is the task the first set leaves behind.
  const client = db.clients.find((c) => c.taClientId === row.clientTaId) ?? null;
  const groupWording = templateFor(db, "set.group_post");
  const post = await draftMessage({
    channel: "group_post",
    to: client?.groupName.trim() ? [client.groupName.trim()] : [],
    subject: "",
    body: fill(
      groupWording?.body ?? "{{client}} > {{position}} > SET {{setNumber}}\n\n{{cvCount}} CVs are in your email.",
    ),
    templateKey: "set.group_post",
    subjectType: "clientSet",
    subjectId: setId,
  });
  if (!client?.groupName.trim()) {
    await createTask({
      kind: "check",
      title: "Make the WhatsApp group: " + (client?.name ?? theirs?.name ?? row.name.split(" > ")[0]),
      body:
        "The first set has gone, so the group is made now and the set posted in it. The post is already drafted and waiting.\n\n" +
        "Then write the group's name on the client's page, so the next set's post knows where it goes.",
      assigneeId: row.ownerId,
      dueAt: now,
      subjectType: "clientSet",
      subjectId: setId,
      link: "/messages/" + post.id,
    });
  }

  await queueTaWrite(
    "/integrations/v1/client-sets/" + row.taRoundId + "/sent",
    { sentAt: now, receivedAt: now, sentTo: to },
    { type: "clientSet", id: setId },
  );
  revalidatePath(here);
  revalidatePath("/sets");
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent(
        "The set is drafted with " +
          row.candidates.length +
          " CVs attached. Read it, then approve it. The group post is drafted too." +
          (held ? " The hold at five was overridden." : ""),
      ),
  );
}

/** The client got it on a different day; the clocks after it count from this. */
export async function recordSetReceived(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const here = "/sets/" + setId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) redirect("/sets?msg=" + encodeURIComponent("That set is gone."));
  const row = set as NonNullable<typeof set>;

  const when = Date.parse(String(formData.get("receivedAt") ?? "") + ":00+05:30");
  if (!Number.isFinite(when)) back("Give the day and time they received it.");
  if (when > Date.now() + HOUR) back("That is in the future.");
  if (row.sentAt && when < row.sentAt - HOUR) back("They cannot have received it before it was sent.");

  await patchClientSet(setId, { receivedAt: when }, member.id, "clientSet.received", null);
  await restartReceiptClocks({ ...row, receivedAt: when }, when, member.id);
  revalidatePath(here);
  back("Noted. Everything after this counts from then.");
}

/**
 * Take a candidate out of the set (15, Phase 4 step 3).
 *
 * The usual reason is that TA has no prepared CV for them, and the set must
 * not wait for one. Taking them out needs a reason, like everything else that
 * drops somebody, and the set still has to hold the minimum afterwards.
 */
export async function dropFromClientSet(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const who = String(formData.get("applicationTaId") ?? "");
  const here = "/sets/" + setId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) redirect("/sets?msg=" + encodeURIComponent("That set is gone."));
  const row = set as NonNullable<typeof set>;
  if (row.state === "sent") back("That set has gone already; this one is history.");

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 4) back("Write why they are coming out of the set.");
  const taken = row.candidates.find((c) => c.applicationTaId === who);
  if (!taken) back("Nobody in this set by that id.");

  // Worked out before the patch: the store hands back the same record the
  // patch writes to, so counting afterwards counts the new list and the
  // message said "short of 5" about a set of exactly five (3 Nov).
  const left = row.candidates.filter((c) => c.applicationTaId !== who);
  const minimum = numberOf(db, "set.minCvs", MIN_CVS);
  await patchClientSet(
    setId,
    { candidates: left },
    member.id,
    "clientSet.candidateDropped",
    (taken?.name ?? who) + ": " + reason,
  );
  revalidatePath(here);
  back(
    (taken?.name ?? "They") +
      " is out of this set. " +
      (left.length < minimum
        ? "It is now short of " + minimum + ", so it cannot go until TA adds somebody."
        : "The set can still go: " + left.length + " CVs."),
  );
}

/**
 * Our own interview of a candidate, before their CV goes to the client
 * (owner, 16 Nov). A pass lets the CV go; a hold keeps the set from going; a
 * fail takes the candidate out of the set, with the notes as the reason. The
 * result is on the audit either way, which is where the feedback log reads a
 * failed candidate from (they are no longer in the set).
 */
export async function recordInternalInterview(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const who = String(formData.get("applicationTaId") ?? "");
  // Back to the page the form was on (own paths only, see backTo).
  const here = backTo(formData, "/sets/" + setId);
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) redirect("/sets?msg=" + encodeURIComponent("That set is gone."));
  const row = set as NonNullable<typeof set>;
  if (row.state === "sent") back("That set has gone already; the interview comes before it goes.");

  const outcome = String(formData.get("outcome") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const problem = problemWithInternalInterview(outcome, notes);
  if (problem) back(problem);
  const taken = row.candidates.find((c) => c.applicationTaId === who);
  if (!taken) back("Nobody in this set by that id.");

  const now = Date.now();
  const done = { by: member.id, at: now, outcome: outcome as "pass" | "hold" | "fail", notes };
  const candidates =
    outcome === "fail"
      ? row.candidates.filter((c) => c.applicationTaId !== who)
      : row.candidates.map((c) => (c.applicationTaId === who ? { ...c, internalInterview: done } : c));
  await patchClientSet(
    setId,
    { candidates },
    member.id,
    "clientSet.internalInterview." + outcome,
    // "Name: notes", the same shape as a candidate dropped, so a failed candidate can be found again.
    (taken?.name ?? who) + ": " + notes,
  );
  revalidatePath("/sets/" + setId);
  back(
    outcome === "fail"
      ? (taken?.name ?? "They") + " failed our interview and is out of the set."
      : "Recorded: " + (taken?.name ?? "they") + (outcome === "pass" ? " passed." : " is on hold."),
  );
}

/* ── After the set has gone (15, Phase 4 steps 7 to 13) ──────── */

/**
 * The client says they already had this candidate (step 7).
 *
 * Inside the seven working days we take their word and the candidate comes out
 * of the set — their record against ours, and arguing costs more than the fee.
 * After the window it is refused, which is the whole point of counting it. The
 * reply is drafted either way, and TA is told when a candidate becomes theirs.
 */
export async function recordCvClaim(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const who = String(formData.get("applicationTaId") ?? "");
  const here = "/sets/" + setId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) redirect("/sets?msg=" + encodeURIComponent("That set is gone."));
  const row = set as NonNullable<typeof set>;
  if (row.receivedAt === null) back("We do not know when they received this set, so the window cannot be counted.");

  const taken = row.candidates.find((c) => c.applicationTaId === who);
  if (!taken) back("Nobody in this set by that id.");
  if (taken?.claimedAt) back("That claim is already recorded.");

  const now = Date.now();
  const window = ownershipWindow(
    row.receivedAt as number,
    db.holidays.map((h) => h.date),
    numberOf(db, "set.ownershipWorkingDays", OWNERSHIP_WORKING_DAYS),
  );
  const answer = claimVerdict(window.closesAt, now);
  const client = row.clientId ? clientIn(db, row.clientId) : null;

  const candidates = row.candidates.map((c) =>
    c.applicationTaId === who
      ? { ...c, claimedAt: now, claimVerdict: answer.verdict, claimReason: answer.because }
      : c,
  );
  await patchClientSet(setId, { candidates }, member.id, "clientSet.claim." + answer.verdict, answer.because);

  // Their candidate now, so TA must know: the search must not keep working on
  // somebody the client owns.
  if (answer.verdict === "dropped") {
    await queueTaWrite(
      "/integrations/v1/applications/" + who + "/client-owned",
      { claimedAt: now, setId, because: answer.because },
      { type: "clientSet", id: setId },
    );
  }

  const wording = templateFor(db, answer.templateKey);
  const fill = (text: string) =>
    text
      .replace(/\{\{client\}\}/g, client?.name ?? row.name.split(" > ")[0])
      .replace(/\{\{position\}\}/g, row.role)
      .replace(/\{\{setNumber\}\}/g, String(row.setNumber))
      .replace(/\{\{candidate\}\}/g, taken?.name ?? "the candidate")
      .replace(/\{\{closedOn\}\}/g, colomboDateInWords(window.closesAt))
      .replace(/\{\{contact\}\}/g, "all")
      .replace(/\{\{opsPerson\}\}/g, member.name);

  const message = await draftMessage({
    channel: "email",
    to: row.sentTo,
    subject: fill(wording?.subject ?? "{{client}} > {{position}} > SET {{setNumber}}"),
    body: fill(wording?.body ?? "Dear all,"),
    templateKey: answer.templateKey,
    subjectType: "clientSet",
    subjectId: setId,
  });
  revalidatePath(here);
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent(
        answer.verdict === "dropped"
          ? "Recorded as theirs, and the TA System will be told. The reply is drafted - read it, then approve it."
          : "Recorded as refused: the window had closed. The reply is drafted - read it before it goes.",
      ),
  );
}

/**
 * What the client decided about one candidate (step 9).
 *
 * Typed in by a person for now, from a group message, a call or an email. The
 * reason is the client's own words, which is what the owner's rule means, and
 * TA is told so it can move the stage and send its own rejection notice.
 */
export async function recordClientDecision(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const who = String(formData.get("applicationTaId") ?? "");
  const here = "/sets/" + setId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) redirect("/sets?msg=" + encodeURIComponent("That set is gone."));
  const row = set as NonNullable<typeof set>;

  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithDecision(decision, reason);
  if (problem) back(problem);
  if (!row.candidates.some((c) => c.applicationTaId === who)) back("Nobody in this set by that id.");

  const now = Date.now();
  const candidates = row.candidates.map((c) =>
    c.applicationTaId === who ? { ...c, decision, decisionReason: reason, decidedAt: now } : c,
  );
  await patchClientSet(setId, { candidates }, member.id, "clientSet.decision." + decision, reason);

  // The client has spoken, so nothing about this set is chased any more.
  const stopped = await cancelClocksFor(db, "clientSet", setId, member.id, "The client has answered.", [
    "feedback.chase",
    "feedback.call",
    "silence.hold",
  ]);

  await queueTaWrite(
    "/integrations/v1/applications/" + who + "/client-decision",
    { decision, reason, decidedAt: now, setId, roundId: row.taRoundId },
    { type: "clientSet", id: setId },
  );

  // Every decision changes how deep the client's shortlist is, which is what
  // the owner's two rules turn on (steps 14 and 15). It is counted here, from
  // TA's own pipeline, rather than remembered by anybody.
  const position = positionForSet(db, row);
  const depth = position ? await evaluateDepth(position.id, now) : null;

  revalidatePath(here);
  revalidatePath("/positions");
  back(
    "Recorded in their words, and the TA System will be told." +
      (depth?.ok ? " " + depth.what : "") +
      (stopped ? " " + stopped + (stopped === 1 ? " clock" : " clocks") + " stopped: they have answered." : ""),
  );
}

/**
 * Approve the hold, which is what puts it on (step 12).
 *
 * The notice to the client is drafted here, and the position only counts as
 * held once a person has approved it. The thirty-day review starts at the same
 * time, because the owner's rule is that a hold never closes by itself.
 */
/**
 * Put a position on hold by hand (23 Nov: the Hold button did nothing, because a hold was only ever
 * proposed by the clock after a set went quiet). It records the hold the same way the clock's proposal
 * would, then hands it to approveTheHold, so the notice, the TA write and the thirty-day review are
 * exactly the same, and the notice still waits for a person to approve it.
 */
export async function holdByHand(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = backTo(formData, "/positions/" + positionId);
  const back = (msg: string) => redirect(withMsg(here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;
  if (!row.openingTaId) back("TA has not confirmed this opening yet, so there is nothing to pause. Try again once it has.");
  if (liveHoldFor(db, row.openingTaId ?? "")) back("This position is already on hold.");
  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithHold(reason);
  if (problem) back(problem);

  const hold = await addHold({
    openingTaId: row.openingTaId as string,
    setId: null,
    clientId: row.clientId,
    state: "proposed",
    reason,
    liftedReason: null,
    noticeMessageId: null,
    proposedAt: Date.now(),
    heldAt: null,
    liftedAt: null,
    reviewAt: null,
    ownerId: row.ownerId,
  });
  const next = new FormData();
  next.set("holdId", hold.id);
  next.set("reason", reason);
  await approveTheHold(next);
}

export async function approveTheHold(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const holdId = String(formData.get("holdId") ?? "");
  const here = "/holds/" + holdId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const hold = holdIn(db, holdId);
  if (!hold) redirect("/holds?msg=" + encodeURIComponent("That hold is gone."));
  const row = hold as NonNullable<typeof hold>;
  if (row.state !== "proposed") back("That hold is not waiting to be approved.");

  const reason = String(formData.get("reason") ?? "").trim() || row.reason;
  const problem = problemWithHold(reason);
  if (problem) back(problem);

  const set = row.setId ? clientSetIn(db, row.setId) : null;
  const client = row.clientId ? clientIn(db, row.clientId) : null;
  const wording = templateFor(db, "inactive.notice");
  const fill = (text: string) =>
    text
      .replace(/\{\{client\}\}/g, client?.name ?? "")
      .replace(/\{\{position\}\}/g, set?.role ?? "the role")
      .replace(/\{\{contact\}\}/g, "all")
      .replace(/\{\{opsPerson\}\}/g, member.name);

  const message = await draftMessage({
    channel: "email",
    // A hold made by hand has no set to read the recipients from: write to the client's standard contacts.
    to: set?.sentTo?.length ? set.sentTo : (client?.contacts ?? []).filter((c) => c.role === "hr").map((c) => c.email),
    subject: fill(wording?.subject ?? "{{client}} > {{position}} - on hold"),
    body: fill(wording?.body ?? "Dear all,"),
    templateKey: "inactive.notice",
    subjectType: "hold",
    subjectId: holdId,
  });

  const now = Date.now();
  await patchHold(
    holdId,
    {
      state: "on_hold",
      reason,
      heldAt: now,
      noticeMessageId: message.id,
      reviewAt: now + numberOf(db, "hold.reviewDays", HOLD_REVIEW_DAYS) * 86_400_000,
    },
    member.id,
    "hold.held",
    reason,
  );
  // TA stops working the opening, and is told why.
  await queueTaWrite(
    "/integrations/v1/openings/" + row.openingTaId + "/status",
    { status: "on_hold", reason: "client inactive: " + reason },
    { type: "hold", id: holdId },
  );
  await startTimer({
    kind: "hold.review",
    subjectType: "hold",
    subjectId: holdId,
    startsAt: now,
    dueAt: now + numberOf(db, "hold.reviewDays", HOLD_REVIEW_DAYS) * 86_400_000,
    warnAt: null,
    ownerId: row.ownerId,
    payload: { label: set?.name ?? row.openingTaId },
  });
  revalidatePath(here);
  revalidatePath("/holds");
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent("On hold, and the TA System will be told. The notice is drafted - read it, then approve it."),
  );
}

/** The client came back, or somebody decided: the search is on again (step 13). */
export async function liftTheHold(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const holdId = String(formData.get("holdId") ?? "");
  const here = "/holds/" + holdId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const hold = holdIn(db, holdId);
  if (!hold) redirect("/holds?msg=" + encodeURIComponent("That hold is gone."));
  const row = hold as NonNullable<typeof hold>;
  if (row.state === "lifted") back("That hold is already lifted.");

  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithLift(reason);
  if (problem) back(problem);

  const now = Date.now();
  await patchHold(
    holdId,
    { state: "lifted", liftedReason: reason, liftedAt: now, reviewAt: null },
    member.id,
    "hold.lifted",
    reason,
  );
  await cancelClocksFor(db, "hold", holdId, member.id, "The hold is lifted.");
  await queueTaWrite(
    "/integrations/v1/openings/" + row.openingTaId + "/status",
    { status: "open", reason: "hold lifted: " + reason },
    { type: "hold", id: holdId },
  );
  // The feedback chase starts again from today, as it would after a new set.
  const set = row.setId ? clientSetIn(db, row.setId) : null;
  if (set) {
    await startTimer({
      kind: "feedback.chase",
      subjectType: "clientSet",
      subjectId: set.id,
      startsAt: now,
      dueAt: now + numberOf(db, "feedback.chaseDays", 1) * 86_400_000,
      warnAt: null,
      ownerId: set.ownerId,
      payload: { label: set.name },
    });
  }
  revalidatePath(here);
  revalidatePath("/holds");
  back("Lifted. The TA System will be told, and the feedback chase starts again from today.");
}

/* ── The requirement, and handing it to TA (15, Phase 3) ─────── */

/**
 * Book the requirement meeting (step 2).
 *
 * The same machinery as the intro call - a TA lead on it, two reminders, three
 * unanswered attempts closing the lead - because it is the same kind of
 * meeting with a different purpose. The owner's rule: no work starts on a
 * position until this has actually happened.
 */
export async function bookRequirementMeeting(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  await bookRequirement(formData, member, leadId, (msg) => redirect(leadBack(here, "requirement", msg, formData)));
}

/**
 * The call booked from a client's own page (23 Nov): an intro call for a client we have not worked for yet,
 * a requirement call for one opening a new role. Both go through the client's working lead, so everything
 * the lead page does with a call (held, brief, invite, reminders) works on it.
 */
export async function bookClientCall(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const clientId = String(formData.get("clientId") ?? "");
  const page = "/clients/" + clientId;
  const back = (msg: string) => redirect(withMsg(page, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const client = clientIn(db, clientId);
  if (!client) redirect("/clients?msg=" + encodeURIComponent("That client is gone."));
  const row = client as NonNullable<typeof client>;
  const kind = callKindFor({ stage: row.stage, hasPosition: db.positions.some((p) => p.clientId === row.id), heldCall: row.leadId ? meetingsForLead(db, row.leadId).some((m) => m.heldAt !== null) : false });
  const lead = await workingLeadFor(row, member, kind === "intro" ? "new" : "requirement");
  formData.set("leadId", lead.id);
  if (kind === "intro") await bookIntro(formData, member, lead.id, back);
  else await bookRequirement(formData, member, lead.id, back);
}

async function bookRequirement(formData: FormData, member: OpsMember, leadId: string, back: (msg: string) => never): Promise<void> {
  const here = "/leads/" + leadId;
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;

  const at = Date.parse(String(formData.get("at") ?? "") + ":00+05:30");
  const taLeadId = String(formData.get("taLeadId") ?? "");
  const problem = problemWithBooking({ at, taLeadId }, Date.now());
  if (problem) back(problem);
  const teams = await teamsPartOf(formData, member, row, "requirement", at, taLeadId);
  if (teams.refusal) back(teams.refusal);

  const meeting = await addMeeting({
    leadId,
    kind: "requirement",
    at,
    state: "booked",
    taLeadId,
    rebookCount: 0,
    brief: "",
    role: "",
    packageSaid: "",
    reason: null,
    bookedBy: member.id,
    heldAt: null,
    lengthMin: teams.lengthMin,
    organiserId: teams.organiserId,
    attendees: teams.attendees,
    joinUrl: teams.link || null,
    graphEventId: teams.graphEventId,
    teamsProblem: teams.problem,
  });

  for (const reminder of remindersFor(at, Date.now())) {
    await startTimer({
      kind: reminder.kind,
      subjectType: "meeting",
      subjectId: meeting.id,
      startsAt: Date.now(),
      dueAt: reminder.dueAt,
      warnAt: null,
      ownerId: row.ownerId,
      payload: { label: row.company + ", the requirement meeting" },
    });
  }
  await queueTaWrite(
    "/integrations/v1/notify",
    {
      toUserId: taLeadId,
      title: "Requirement meeting booked: " + row.company,
      body: "The client has signed. The requirement meeting is on " + colomboDateInWords(at) + ".",
    },
    { type: "meeting", id: meeting.id },
  );

  const invite = await draftMeetingInvite(
    member,
    row,
    { id: meeting.id, kind: "requirement", at },
    teams.link,
    teams.attendees,
  );
  const inviteSentence = await sendBookingInvite(
    member,
    db,
    teams.organiserId,
    invite,
    teams.link,
    formData.get("sendNow") === "on",
  );
  const warning = warningAboutBooking(at, db.holidays.map((h) => h.date));
  const clash = await outlookClash(db, db.members.find((m) => m.id === teams.organiserId)?.email ?? member.email, at, teams.lengthMin);
  revalidatePath(here);
  back(
    "Booked, with a reminder the day before and an hour before. It is on the Interviews calendar." +
      (teams.graphEventId ? " The Teams meeting is in the organiser's Outlook calendar." : "") +
      (teams.problem ? " No Teams link was made: " + teams.problem : "") +
      inviteSentence +
      (warning ? " " + warning : "") +
      clash,
  );
}

/**
 * Write down what the client asked for (step 3).
 *
 * Saved whether or not it is complete, because a half-written requirement is
 * still better than a remembered one - but it cannot be handed to TA until
 * every required field is in, and the screen names what is missing.
 */
export async function saveRequirement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const stepAfter = String(formData.get("step") ?? "").trim() || "requirement";
  const back = (msg: string) => redirect(leadBack(here, stepAfter, msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;

  const already = requirementForLead(db, leadId);
  // A finished requirement is shown, not edited (owner, 17 Nov evening); the screen has no form for it,
  // and this is the refusal for anything posted anyway.
  if (already && requirementLocked(already.fields)) back("The requirement is complete and locked. It is shown as agreed; a change goes through the client.");
  // Fields the form did not send stay as they were: the opening step sends only
  // the title and the headcount, and must not wipe the rest of the brief.
  const fields: Record<string, string> = { ...(already?.fields ?? {}) };
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field.")) fields[key.slice("field.".length)] = String(value).trim();
  }

  const client = clientForLead(db, leadId);
  // A requirement meeting, or an intro call that was also one (17 Nov).
  const held =
    meetingsForLead(db, leadId).find(
      (m) => (m.kind === "requirement" || m.alsoRequirement) && m.state === "held",
    ) ?? null;

  if (already) {
    await patchRequirement(already.id, { fields }, member.id, "requirement.saved", null);
    // The opening was opened early, so what is written in now has to reach it.
    // TA has no endpoint for this yet (an additive one is a ta-system PR): until
    // there is, the write waits in the outbox and nothing is lost.
    const opened = db.positions.find((p) => p.requirementId === already.id);
    if (opened) await queueOpeningDetails(opened, fields);
  } else {
    await addRequirement({
      leadId,
      clientId: client?.id ?? null,
      clientTaId: row.clientTaId ?? client?.taClientId ?? "",
      meetingId: held?.id ?? null,
      version: 1,
      fields,
      practical: true,
      reason: null,
      inviteBackAt: null,
      openedAt: null,
      ownerId: row.ownerId,
    });
  }
  revalidatePath(here);
  const problem = problemWithRequirement(fields);
  if (problem) back("Saved. " + problem);
  redirect(leadMoved(here, "Saved. It can go to the TA System now.", formData));
}

/**
 * The role cannot be filled at that package (step 4).
 *
 * A polite reply is drafted, the lead closes with its reason, and a date is
 * set to ask them again - because a salary that is wrong today is often right
 * next year, and the board's complaint is that we simply never went back.
 */
export async function markRoleImpractical(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(leadBack(here, "opening", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;

  const reason = String(formData.get("reason") ?? "").trim();
  const inviteBackAt = Date.parse(String(formData.get("inviteBackAt") ?? "") + "T09:00:00+05:30");
  const now = Date.now();
  const problem = problemWithImpractical(reason, Number.isFinite(inviteBackAt) ? inviteBackAt : null, now);
  if (problem) back(problem);

  const requirement = requirementForLead(db, leadId);
  if (requirement) {
    await patchRequirement(
      requirement.id,
      { practical: false, reason, inviteBackAt },
      member.id,
      "requirement.impractical",
      reason,
    );
  }

  const wording = templateFor(db, "role.impractical.reply");
  const message = await draftMessage({
    channel: "email",
    to: [row.contactEmail].filter(Boolean),
    subject: (wording?.subject ?? "{{client}} · the role we discussed").replace(/\{\{client\}\}/g, row.company),
    body: (wording?.body ?? ["Dear {{contact}},", "", "Thank you for your time.", "", "Kind regards", "Career 141"].join("\n"))
      .replace(/\{\{contact\}\}/g, row.contactName)
      .replace(/\{\{client\}\}/g, row.company),
    templateKey: "role.impractical.reply",
    subjectType: "lead",
    subjectId: leadId,
  });

  await patchLead(leadId, { state: "closed_other", reason: "Role not practical: " + reason }, member.id, "lead.closedImpractical", reason);
  await startTimer({
    kind: "lead.inviteBack",
    subjectType: "lead",
    subjectId: leadId,
    startsAt: now,
    dueAt: inviteBackAt,
    warnAt: null,
    ownerId: row.ownerId,
    payload: { label: row.company },
  });
  revalidatePath(here);
  revalidatePath("/leads");
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent(
        "Closed with its reason, and we will be asked to invite them back on " + colomboDateInWords(inviteBackAt) + ". The reply is drafted - read it before it goes.",
      ),
  );
}

/**
 * "Open it now, without waiting" (owner, 17 Nov evening): for a client we trust, one lead
 * is allowed an opening before the agreement is signed and the requirement is complete.
 * It needs a reason, which is kept with the lead and shown on it. It can be taken back
 * while no opening exists.
 */
export async function openEarly(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(leadBack(here, "opening", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;
  const requirement = requirementForLead(db, leadId);
  if (requirement?.openedAt) back("The opening already exists.");

  if (formData.get("undo")) {
    await patchLead(leadId, { openEarlyBy: null, openEarlyAt: null, openEarlyReason: null }, member.id, "lead.openedEarlyUndone", null);
    revalidatePath(here);
    back("Taken back. The opening waits for the signed agreement and the requirement again.");
  }

  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithEarlyOpening(reason);
  if (problem) back(problem);
  if (row.state.startsWith("closed") || row.state === "declined_industry") back("This lead is closed.");

  await patchLead(leadId, { openEarlyBy: member.id, openEarlyAt: Date.now(), openEarlyReason: reason }, member.id, "lead.openedEarly", reason);
  revalidatePath(here);
  back("Done. The opening can be created now: write the role's name and how many, then open it.");
}

/**
 * Hand the requirement to the TA System (step 6).
 *
 * The opening is created only when the client has signed and the requirement is
 * complete, unless this lead was marked "open it now" (`openEarly`); see
 * `problemWithOpening`. Then the write is **queued** - Ops never creates an opening
 * itself and never invents TA's id for it. TA's own `opening.created` event
 * fills the id in, which is also how a TA creating one by hand is noticed.
 */
export async function handOverToTa(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(leadBack(here, "opening", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;
  const requirement = requirementForLead(db, leadId);
  if (!requirement) back("Write the requirement down first.");
  const req = requirement as NonNullable<typeof requirement>;
  if (req.openedAt) back("This requirement has already gone to the TA System.");

  // After the intro call, and (owner, 17 Nov evening) once the client has signed and the
  // requirement is complete, unless this lead was marked "open it now".
  const esa = agreementForLead(db, leadId);
  const leadMeetings = meetingsForLead(db, leadId);
  // A Director's lead, or a client we already had, has no intro call; one signed before has no agreement here (18 Nov).
  const known = existingClientOf(row, leadMeetings, esa);
  // A draft made from the intro call's own form (17 Nov) is not an agreement that has gone out (see introSatisfied).
  if (!introSatisfied({ meetings: leadMeetings, esa, skipsIntro: known.skipsIntro })) back("Hold the intro call first: the opening is opened after it.");
  const problem = problemWithOpening({
    esaState: known.signedOnFile ? "signed" : (esa?.state ?? null),
    requirementBlanks: requirementMissing(req.fields).map((f) => f.label.toLowerCase()),
    openEarly: !!row.openEarlyAt,
    fields: req.fields,
  });
  if (problem) back(problem);

  const client = clientForLead(db, leadId);
  const now = Date.now();
  const title = (req.fields.title ?? "").trim();

  // Our side of the opening, with no TA id yet: TA answers with that, through
  // its event, and the screen says so plainly in the meantime.
  const position = await addPosition({
    requirementId: req.id,
    clientId: client?.id ?? null,
    clientTaId: req.clientTaId || client?.taClientId || "",
    openingTaId: null,
    title,
    stage: "handed_over",
    primaryTaId: String(formData.get("primaryTaId") ?? "") || null,
    hundredPercentDay: String(formData.get("hundredPercentDay") ?? "") || null,
    taStatus: null,
    jdApprovedAt: null,
    linkedInUrl: null,
    linkedInPostedAt: null,
    depthStage: null,
    shortlistedTotal: null,
    pendingCount: null,
    depthCheckedAt: null,
    handedOverAt: now,
    closedAt: null,
    ownerId: row.ownerId,
  });

  await queueTaWrite(
    "/integrations/v1/openings",
    {
      clientId: req.clientTaId || client?.taClientId || "",
      title,
      brief: briefText(req.fields),
      headcount: Number(req.fields.headcount ?? 1) || 1,
      level: req.fields.level ?? "",
      locations: req.fields.locations ?? "",
      package: req.fields.salary ?? "",
      primaryRecruiterId: position.primaryTaId,
      hundredPercentDay: position.hundredPercentDay,
      requirementReceivedAt: req.createdAt,
      opsPositionId: position.id,
    },
    { type: "position", id: position.id },
  );

  await patchRequirement(req.id, { openedAt: now }, member.id, "requirement.handedOver", null);
  await patchLead(leadId, { state: "handed_over" }, member.id, "lead.handedOver", null);
  revalidatePath(here);
  revalidatePath("/positions");
  redirect(
    leadMoved(
      here,
      "Handed over. The opening is queued for the TA System; it appears on the position the moment TA confirms it, and the brief goes exactly as written.",
      formData,
    ),
  );
}

/**
 * "New position" (23 Nov, the owner): a position for a client, made on the Positions page or from the
 * client's page. It writes the requirement (from a held call when one is picked) and the position, and
 * queues the opening for TA the same way the hand-over does. It does not wait for the agreement.
 */
export async function createPosition(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect(withMsg(backTo(formData, "/positions"), msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const f = (k: string) => String(formData.get(k) ?? "").trim();
  const db = await desk();
  const client = clientIn(db, f("clientId"));
  const fields: Record<string, string> = {
    title: f("title"),
    level: f("designation"),
    salary: f("package"),
    locations: f("locations"),
    headcount: f("headcount") || "1",
    jdNotes: f("brief"),
    incumbentNote: f("incumbentNote"),
  };
  const problem = problemWithNewPosition(fields, Boolean(client));
  if (problem) back(problem);
  const row = client as NonNullable<typeof client>;

  const lead = await workingLeadFor(row, member, "requirement");
  const meetingId = f("meetingId") || null;
  const version = (requirementForLead(db, lead.id)?.version ?? 0) + 1;
  const requirement = await addRequirement({
    leadId: lead.id,
    clientId: row.id,
    clientTaId: row.taClientId ?? "",
    meetingId,
    version,
    fields,
    practical: true,
    reason: null,
    inviteBackAt: null,
    openedAt: Date.now(),
    ownerId: row.ownerId,
  });
  const now = Date.now();
  const position = await addPosition({
    requirementId: requirement.id,
    clientId: row.id,
    clientTaId: row.taClientId ?? "",
    openingTaId: null,
    title: fields.title,
    stage: "handed_over",
    primaryTaId: null,
    hundredPercentDay: null,
    taStatus: null,
    jdApprovedAt: null,
    linkedInUrl: null,
    linkedInPostedAt: null,
    depthStage: null,
    shortlistedTotal: null,
    pendingCount: null,
    depthCheckedAt: null,
    handedOverAt: now,
    closedAt: null,
    ownerId: row.ownerId,
  });
  await queueTaWrite(
    "/integrations/v1/openings",
    {
      clientId: row.taClientId ?? "",
      title: fields.title,
      brief: briefText(fields),
      headcount: Number(fields.headcount) || 1,
      level: fields.level,
      locations: fields.locations,
      package: fields.salary,
      primaryRecruiterId: null,
      hundredPercentDay: null,
      requirementReceivedAt: requirement.createdAt,
      opsPositionId: position.id,
    },
    { type: "position", id: position.id },
  );
  revalidatePath("/positions");
  revalidatePath("/clients");
  revalidatePath("/clients/" + row.id);
  redirect(
    "/positions/" + position.id + "?msg=" + encodeURIComponent("Saved. " + fields.title + " for " + row.name + " is queued for the TA System." + (agreementForLead(db, lead.id)?.state === "countersigned" || agreementForLead(db, lead.id)?.state === "signed" ? "" : " The agreement is not signed yet, so no CVs go to them until it is.")),
  );
}

/**
 * Adds a candidate by hand to a position (17 Nov, supervisor review), for when
 * the TA link is down or the person is not in the TA System. They stay in Ops
 * only and are always shown as "added by hand, not in TA". Nothing is sent to
 * TA for them, and they cannot be put in a CV set until TA can hold them.
 */
export async function addManualCandidate(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = "/positions/" + positionId + "?view=candidates";
  const back = (msg: string) => redirect(here + "&msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (name.length < 2) back("Write the candidate's name.");
  if (!email && !phone) back("Give an email or a phone number, so somebody can reach them.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("That is not an email address.");
  const cv = String(formData.get("cvFileId") ?? "").trim() || null;
  if (cv && !fileIn(db, cv)) back("That CV is not on the Files screen.");
  const have = row.manualCandidates ?? [];
  if (have.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.email.toLowerCase() === email.toLowerCase())) {
    back("They are already on this opening.");
  }

  const manualCandidates = [
    ...have,
    { id: "mc_" + Date.now().toString(36), name, email, phone, note, cvFileId: cv, addedBy: member.id, at: Date.now() },
  ];
  await patchPosition(positionId, { manualCandidates }, member.id, "position.candidateAddedByHand", name);
  revalidatePath("/positions/" + positionId);
  back(name + " added, marked as added by hand and not in the TA System.");
}

export async function removeManualCandidate(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = "/positions/" + positionId + "?view=candidates";
  const back = (msg: string) => redirect(here + "&msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const position = positionIn(await desk(), positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;
  const id = String(formData.get("candidateId") ?? "");
  const manualCandidates = (row.manualCandidates ?? []).filter((c) => c.id !== id);
  await patchPosition(positionId, { manualCandidates }, member.id, "position.candidateRemovedByHand", id);
  revalidatePath("/positions/" + positionId);
  back("Removed.");
}

/**
 * Gives Ops members or TA people on the job one or more strategies from the TA
 * list (17 Nov). Supports both multi-select (`pick`) and single-select (`strategy`).
 */
export async function addStrategy(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = "/positions/" + positionId + "?view=advertising";
  const back = (msg: string) => redirect(here + "&msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;

  const picked = formData.getAll("pick").map((v) => String(v).trim()).filter(Boolean);
  const picks =
    picked.length > 0
      ? picked.map((strategy) => ({
          strategy,
          ownerId: String(formData.get("owner." + strategy) ?? "") || member.id,
          note: String(formData.get("note." + strategy) ?? "").trim(),
        }))
      : (() => {
          const single = String(formData.get("strategy") ?? formData.get("text") ?? "").trim();
          return single
            ? [
                {
                  strategy: single,
                  ownerId: String(formData.get("ownerId") ?? "") || member.id,
                  note: String(formData.get("note") ?? "").trim(),
                },
              ]
            : [];
        })();

  const taSide = await taPeople();
  const validTaIds = taSide.ok ? taSide.data.filter((p) => p.isActive).map((p) => p.id) : [];

  const result = tryBuildStrategyAdditions(
    picks,
    db.members.filter((m) => m.active).map((m) => m.id),
    validTaIds,
    row.strategies ?? [],
    Date.now(),
  );
  if (!result.ok) {
    back(result.reason);
    return;
  }

  const strategies = [...(row.strategies ?? []), ...result.added];
  await patchPosition(
    positionId,
    { strategies },
    member.id,
    "position.strategyAdded",
    result.added.map((s) => s.text).join(", "),
  );
  revalidatePath("/positions/" + positionId);
  back(result.added.length === 1 ? "Strategy added." : result.added.length + " strategies added.");
}

export async function removeStrategy(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = "/positions/" + positionId + "?view=advertising";
  const back = (msg: string) => redirect(here + "&msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const position = positionIn(await desk(), positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;
  const strategyId = String(formData.get("strategyId") ?? "");
  const strategies = (row.strategies ?? []).filter((s) => s.id !== strategyId);
  await patchPosition(positionId, { strategies }, member.id, "position.strategyRemoved", null);
  revalidatePath("/positions/" + positionId);
  back("Strategy removed.");
}

/**
 * Adds a person to a client's standard contacts, or to one position's own list
 * (17 Nov). The same address is never kept twice.
 */
export async function saveContact(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const scope = String(formData.get("scope") ?? "") === "position" ? "position" : "client";
  const id = String(formData.get("id") ?? "");
  const here = scope === "position" ? "/positions/" + id : "/clients/" + id;
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const holder = scope === "position" ? positionIn(db, id) : clientIn(db, id);
  if (!holder) redirect("/" + scope + "s?msg=" + encodeURIComponent("That " + scope + " is gone."));

  const person = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim().toLowerCase() || "hr",
  };
  const problem = problemWithContact(person);
  if (problem) back(problem);
  const have = (holder as { contacts?: typeof person[] }).contacts ?? [];
  if (have.some((c) => c.email.toLowerCase() === person.email.toLowerCase())) back("That address is already on the list.");

  const contacts = [...have, person];
  if (scope === "position") await patchPosition(id, { contacts }, member.id, "position.contactAdded", person.email);
  else await patchClient(id, { contacts }, member.id, "client.contactAdded", person.email);
  revalidatePath(here);
  back(person.name + " added.");
}

/**
 * Change one of a client's (or a position's) contacts in place (23 Nov): somebody leaves and somebody else
 * takes their place, or a number changes. The row is found by its old address.
 */
export async function editContact(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const scope = String(formData.get("scope") ?? "") === "position" ? "position" : "client";
  const id = String(formData.get("id") ?? "");
  const here = scope === "position" ? "/positions/" + id : "/clients/" + id + "?view=contacts";
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const holder = scope === "position" ? positionIn(db, id) : clientIn(db, id);
  if (!holder) redirect("/" + scope + "s?msg=" + encodeURIComponent("That " + scope + " is gone."));
  const person = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim().toLowerCase() || "hr",
  };
  const problem = problemWithContact(person);
  if (problem) back(problem);
  const oldEmail = String(formData.get("oldEmail") ?? "").toLowerCase();
  const have = (holder as { contacts?: typeof person[] }).contacts ?? [];
  if (!have.some((c) => c.email.toLowerCase() === oldEmail)) back("That contact is not on the list any more.");
  if (person.email.toLowerCase() !== oldEmail && have.some((c) => c.email.toLowerCase() === person.email.toLowerCase())) back("That address is already on the list.");

  const contacts = have.map((c) => (c.email.toLowerCase() === oldEmail ? person : c));
  if (scope === "position") await patchPosition(id, { contacts }, member.id, "position.contactEdited", person.email);
  else await patchClient(id, { contacts }, member.id, "client.contactEdited", oldEmail + " -> " + person.email);
  revalidatePath(here);
  back(person.name + " saved.");
}

export async function removeContact(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const scope = String(formData.get("scope") ?? "") === "position" ? "position" : "client";
  const id = String(formData.get("id") ?? "");
  const here = scope === "position" ? "/positions/" + id : "/clients/" + id;
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const holder = scope === "position" ? positionIn(db, id) : clientIn(db, id);
  if (!holder) redirect("/" + scope + "s?msg=" + encodeURIComponent("That " + scope + " is gone."));
  const email = String(formData.get("email") ?? "").toLowerCase();
  const contacts = ((holder as { contacts?: ContactRow[] }).contacts ?? []).filter(
    (c) => c.email.toLowerCase() !== email,
  );
  if (scope === "position") await patchPosition(id, { contacts }, member.id, "position.contactRemoved", email);
  else await patchClient(id, { contacts }, member.id, "client.contactRemoved", email);
  revalidatePath(here);
  back("Removed.");
}

/** The TA lead picks the primary TA and the 100% day; Ops records it (step 5). */
export async function setPositionTeam(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = backTo(formData, "/positions/" + positionId);
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;

  const primaryTaId = String(formData.get("primaryTaId") ?? "").trim() || null;
  const hundredPercentDay = String(formData.get("hundredPercentDay") ?? "").trim() || null;
  if (!primaryTaId && !hundredPercentDay) back("Nothing to change.");

  await patchPosition(
    positionId,
    { primaryTaId: primaryTaId ?? row.primaryTaId, hundredPercentDay: hundredPercentDay ?? row.hundredPercentDay },
    member.id,
    "position.teamSet",
    null,
  );
  // The TA lead's decision belongs in TA, which is where the TAs read it.
  if (row.openingTaId) {
    await queueTaWrite(
      "/integrations/v1/openings/" + row.openingTaId + "/team",
      { primaryRecruiterId: primaryTaId, memberIds: (row.team ?? []).map((t) => t.taId), hundredPercentDay },
      { type: "position", id: positionId },
    );
  }
  revalidatePath("/positions/" + positionId);
  back(
    row.openingTaId
      ? "Recorded, and the TA System will be told."
      : "Recorded. It goes to the TA System with the opening once TA confirms it.",
  );
}

/**
 * The TA lead adds people to the opening, or takes them off (owner, 17 Nov evening). Several can be
 * added at once, and more later. Ops keeps the list and sends it, with the Primary TA, to the TA System.
 * TA does not read `memberIds` yet: that is an additive change in the TA repository, so until it is
 * made the write waits in the outbox and Ops' own list is the record.
 */
export async function setOpeningPeople(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = backTo(formData, "/positions/" + positionId + "?view=overview");
  const back = (msg: string) => redirect(withMsg(here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;

  const current = row.team ?? [];
  const picked = formData.getAll("taId").map((v) => String(v));
  let next = current;
  if (formData.get("op") === "remove") {
    next = current.filter((t) => !picked.includes(t.taId));
  } else {
    if (!picked.length) back("Pick at least one person to add.");
    const ids = withPeople(current.map((t) => t.taId), picked, row.primaryTaId);
    next = ids.map((id) => current.find((t) => t.taId === id) ?? { taId: id, addedBy: member.id, addedAt: Date.now() });
  }
  const problem = problemWithTeam(row.primaryTaId, next.map((t) => t.taId));
  if (problem) back(problem);

  await patchPosition(positionId, { team: next }, member.id, "position.peopleChanged", null);
  if (row.openingTaId) {
    await queueTaWrite(
      "/integrations/v1/openings/" + row.openingTaId + "/team",
      { primaryRecruiterId: row.primaryTaId, memberIds: next.map((t) => t.taId), hundredPercentDay: row.hundredPercentDay },
      { type: "position", id: positionId },
    );
  }
  revalidatePath("/positions/" + positionId);
  back(row.openingTaId ? "Saved, and the TA System will be told." : "Saved. It goes to the TA System with the opening once TA confirms it.");
}

/** What the requirement says now, for the TA System's opening. It waits in the outbox until TA has the endpoint. */
async function queueOpeningDetails(opened: { id: string; openingTaId: string | null }, fields: Record<string, string>): Promise<void> {
  await queueTaWrite(
    "/integrations/v1/openings/details",
    {
      opsPositionId: opened.id,
      openingId: opened.openingTaId,
      brief: briefText(fields),
      level: fields.level ?? "",
      locations: fields.locations ?? "",
      package: fields.salary ?? "",
      headcount: Number(fields.headcount ?? 1) || 1,
    },
    { type: "position", id: opened.id },
  );
}

/** Update or create the requirement fields directly from the position's Requirement & JD sub-view. */
export async function savePositionRequirement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = backTo(formData, "/positions/" + positionId + "?view=jd");
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;
  const existing = row.requirementId ? db.requirements.find((r) => r.id === row.requirementId) ?? null : null;
  // The same lock as on the lead (18 Nov: this door edited a locked requirement and TA never heard).
  if (existing && requirementLocked(existing.fields)) back("The requirement is complete and locked. It is shown as agreed; a change goes through the client.");

  const fields: Record<string, string> = { ...(existing?.fields ?? {}) };
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field.")) fields[key.slice("field.".length)] = String(value).trim();
  }
  if (!fields.title) fields.title = row.title;

  if (existing) {
    await patchRequirement(existing.id, { fields }, member.id, "requirement.saved", null);
  } else {
    const client = row.clientId ? clientIn(db, row.clientId) : null;
    const created = await addRequirement({
      leadId: client?.leadId ?? "",
      clientId: row.clientId,
      clientTaId: row.clientTaId,
      meetingId: null,
      version: 1,
      fields,
      practical: true,
      reason: null,
      inviteBackAt: null,
      openedAt: row.handedOverAt ?? Date.now(),
      ownerId: row.ownerId,
    });
    await patchPosition(positionId, { requirementId: created.id }, member.id, "position.requirementLinked", null);
  }

  await queueOpeningDetails(row, fields);
  revalidatePath("/positions/" + positionId);
  back("Requirement details saved, and the TA System will be told.");
}

/** Approve the JD on a position and record jdApprovedAt so advertising opens. */
export async function approvePositionJd(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = backTo(formData, "/positions/" + positionId + "?view=jd");
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;

  const now = Date.now();
  await patchPosition(
    positionId,
    {
      jdApprovedAt: now,
      stage: row.stage === "handed_over" ? "searching" : row.stage,
    },
    member.id,
    "position.jdApproved",
    null,
  );
  if (row.openingTaId) {
    await queueTaWrite(
      "/integrations/v1/openings/" + row.openingTaId + "/jd-approved",
      { jdApprovedAt: now, approvedByEmail: member.email },
      { type: "position", id: positionId },
    );
  }
  revalidatePath("/positions/" + positionId);
  revalidatePath("/positions");
  back("JD approved. Advertising is now open.");
}

/* ── Where the job is advertised (15, Phase 3 steps 14 to 16) ── */

/**
 * The LinkedIn post the TA made (step 16).
 *
 * The TA posts it; Ops holds the link, because the TA System will not let an
 * opening go Live without one and because a client asking "where is my role
 * advertised?" is answered from somebody's memory today. A wrong link is worse
 * than none - it looks done - so only a real LinkedIn post address is taken.
 */
export async function recordLinkedInPost(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = backTo(formData, "/positions/" + positionId);
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "advert.manage")) back("Recording an advert is for ops or marketing.");
  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;

  const url = String(formData.get("url") ?? "");
  const problem = problemWithLinkedIn(url);
  if (problem) back(problem);

  const tidy = tidyLinkedIn(url);
  const now = Date.now();
  await patchPosition(
    positionId,
    { linkedInUrl: tidy, linkedInPostedAt: now },
    member.id,
    "position.linkedInRecorded",
    tidy,
  );
  // TA needs it on the opening: that is what unlocks Live on their side.
  if (row.openingTaId) {
    await queueTaWrite(
      "/integrations/v1/openings/" + row.openingTaId + "/posts",
      { channel: "linkedin", url: tidy, postedAt: now },
      { type: "position", id: positionId },
    );
  }
  revalidatePath("/positions/" + positionId);
  back(
    row.openingTaId
      ? "Recorded, and the TA System will be told - that is what lets the opening go Live."
      : "Recorded. It goes to the TA System with the opening once TA confirms it.",
  );
}

/** Compile this week's Talent Pulse now, rather than waiting for Tuesday. */
export async function compileTalentPulseNow(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect("/talent-pulse?msg=" + encodeURIComponent(msg));
  if (!can(member, "advert.manage")) back("Talent Pulse is for ops or marketing.");

  const issue = await compileTalentPulse(member.id);
  revalidatePath("/talent-pulse");
  back(
    issue
      ? "This week's issue is ready to fill in: " +
          issue.lines.length +
          (issue.lines.length === 1 ? " position" : " positions") +
          ". Next Tuesday it compiles itself."
      : "Nothing to compile.",
  );
}

/** The TA's line about one role, and where applications for it go. */
export async function saveTalentPulseLine(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const issueId = String(formData.get("issueId") ?? "");
  const positionId = String(formData.get("positionId") ?? "");
  const back = (msg: string) => redirect("/talent-pulse?msg=" + encodeURIComponent(msg));
  if (!can(member, "advert.manage")) back("Talent Pulse is for ops or marketing.");
  const db = await desk();
  const issue = issueIn(db, issueId);
  if (!issue) back("That issue is gone.");
  const row = issue as NonNullable<typeof issue>;
  if (row.state === "posted") back("That issue has been posted; this one is history.");

  const note = String(formData.get("note") ?? "").trim();
  const applyAddress = String(formData.get("applyAddress") ?? "").trim();
  const lines = row.lines.map((l) => (l.positionId === positionId ? { ...l, note, applyAddress } : l));
  if (lines.every((l, i) => l.note === row.lines[i].note && l.applyAddress === row.lines[i].applyAddress)) {
    back("Nothing changed.");
  }

  await patchIssue(issueId, { lines }, member.id, "talentPulse.lineSaved", null);
  revalidatePath("/talent-pulse");
  const left = lines.filter((l) => !l.note).length;
  back(left ? "Saved. " + left + " still with no line." : "Saved. Every role has its line; it can go to marketing.");
}

/** It has gone out. Marketing posts it; Ops records the day it happened. */
export async function markTalentPulsePosted(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const issueId = String(formData.get("issueId") ?? "");
  const back = (msg: string) => redirect("/talent-pulse?msg=" + encodeURIComponent(msg));
  if (!can(member, "advert.manage")) back("Talent Pulse is for ops or marketing.");
  const db = await desk();
  const issue = issueIn(db, issueId);
  if (!issue) back("That issue is gone.");
  const row = issue as NonNullable<typeof issue>;
  if (row.state === "posted") back("Already recorded as posted.");

  const problem = problemWithIssue(row.lines);
  if (problem) back(problem);

  await patchIssue(
    issueId,
    { state: "posted", postedAt: Date.now(), postedBy: member.id },
    member.id,
    "talentPulse.posted",
    null,
  );
  revalidatePath("/talent-pulse");
  back("Recorded as posted. Next Tuesday's issue compiles itself.");
}

/* ── The weekly report (15, Phase 7 step 9) ───────────────────── */

/**
 * Build this Monday's report now.
 *
 * The clock does this at eight on a Monday. The button is for the week it has
 * not come round yet, and for the TA lead who wants it again after a change -
 * it gives back the same report rather than making a second one.
 */
export async function buildWeeklyReportNow(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect("/reports?msg=" + encodeURIComponent(msg));
  if (!can(member, "report.read")) back(refusal("report.read"));

  const report = await buildWeeklyReport(member.id);
  revalidatePath("/reports");
  if (!report) back("Nothing to report on.");
  const row = report as NonNullable<typeof report>;
  redirect(
    "/reports/" +
      row.id +
      "?msg=" +
      encodeURIComponent(
        row.rows.length
          ? "The report for " + row.weekOf + " is built. Read it, then approve it."
          : "No position is open, so this week's report is empty. Nothing goes to the Director.",
      ),
  );
}

/**
 * Approve the report, which drafts the Director's email.
 *
 * The owner's rule: the report is the TA lead's to review. Only after that is
 * anything written to the Director, and even then it is a draft a person
 * sends - the same one way out as every other client or Director message.
 */
export async function approveWeeklyReport(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const reportId = String(formData.get("reportId") ?? "");
  const here = "/reports/" + reportId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "report.read")) back(refusal("report.read"));
  const db = await desk();
  const report = reportIn(db, reportId);
  if (!report) redirect("/reports?msg=" + encodeURIComponent("That report is gone."));
  const row = report as NonNullable<typeof report>;
  if (row.state !== "review") back("That report is not waiting to be read.");

  const problem = problemWithReport(row.rows);
  if (problem) back(problem);

  const to = recipientsFrom(db.settings.find((s) => s.key === "report.recipients")?.value);
  if (!to.length) {
    back("Nobody is set to receive the report. Put the Director's address in the settings first.");
  }

  const text = reportText(row.weekOf, row.rows);
  const wording = templateFor(db, "report.weekly");
  const fill = (what: string) =>
    what
      .replace(/\{\{weekOf\}\}/g, row.weekOf)
      .replace(/\{\{report\}\}/g, text)
      .replace(/\{\{opsPerson\}\}/g, member.name);

  const message = await draftMessage({
    channel: "email",
    to,
    subject: fill(wording?.subject ?? "Career 141 - active positions, week of {{weekOf}}"),
    body: fill(wording?.body ?? "Dear Mr Azeem,\n\n{{report}}\n\nKind regards\n{{opsPerson}}"),
    templateKey: "report.weekly",
    subjectType: "report",
    subjectId: reportId,
  });

  const now = Date.now();
  await patchReport(
    reportId,
    { state: "approved", approvedBy: member.id, approvedAt: now, messageId: message.id },
    member.id,
    "report.approved",
    row.note,
  );
  // The clock that built it has done its work; next Monday's is already set.
  await cancelClocksFor(db, "report", reportId, member.id, "The report has been read.", null);
  revalidatePath(here);
  revalidatePath("/reports");
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent("The Director's email is drafted. Read it, then approve it and it goes."),
  );
}

/* ── Interviews and references (15, Phase 5) ──────────────────── */

/**
 * Start an interview for a candidate the client shortlisted (steps 2 and 6).
 *
 * Who schedules is the first decision and the owner's: we agree the time, or
 * the client books it and tells us. The two are different work, so it is
 * asked once here rather than guessed later.
 */
export async function startInterview(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect(landed(formData, "/interviews", msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const applicationTaId = String(formData.get("applicationTaId") ?? "").trim();
  const openingTaId = String(formData.get("openingTaId") ?? "").trim();
  const candidateName = String(formData.get("candidateName") ?? "").trim();
  const scheduler = String(formData.get("scheduler") ?? "");
  if (!applicationTaId || !openingTaId) back("Which candidate, on which opening?");
  if (!candidateName) back("Write the candidate's name as the TA System has it.");
  if (scheduler !== "us" && scheduler !== "client") back("Say who agrees the time: us, or the client.");

  const db = await desk();
  if (liveInterviewFor(db, applicationTaId)) {
    back("That candidate already has an interview on the go. Finish or cancel it first.");
  }
  const position = positionForOpening(db, openingTaId);
  const now = Date.now();
  const interview = await addInterview({
    applicationTaId,
    openingTaId,
    positionId: position?.id ?? null,
    clientId: position?.clientId ?? null,
    candidateName,
    scheduler,
    state: "slots",
    round: Math.max(1, Number(formData.get("round") ?? 1)),
    slots: [],
    slotLoops: 0,
    at: null,
    format: "online",
    interviewers: [],
    whereOrLink: "",
    interviewTaId: null,
    inviteMessageId: null,
    attendedAt: null,
    decision: null,
    decisionReason: null,
    decidedAt: null,
    candidateFeedback: null,
    reason: null,
    ownerId: position?.ownerId ?? member.id,
  });

  // The client who books it themselves owes us a date, and a client who never
  // sends it is the oldest hole in this flow - so a clock asks for it.
  if (scheduler === "client") {
    await startTimer({
      kind: "interview.report",
      subjectType: "interview",
      subjectId: interview.id,
      startsAt: now,
      dueAt: now + numberOf(db, "interview.reportReminderDays", 2) * DAY,
      warnAt: null,
      ownerId: interview.ownerId,
      payload: { label: candidateName },
    });
  }
  revalidatePath("/interviews");
  redirect(
    "/interviews/" +
      interview.id +
      "?msg=" +
      encodeURIComponent(
        scheduler === "us"
          ? "Started. Ask the client for times."
          : "Started. The client books it; a clock will ask if they do not tell us the date.",
      ),
  );
}

/** Ask the client for times (step 3). */
export async function requestInterviewSlots(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const problem = problemWithNewSlots(row.slotLoops, numberOf(db, "interview.maxSlotLoops", MAX_SLOT_LOOPS));
  if (problem) back(problem);

  const typed = interviewersFrom(String(formData.get("to") ?? ""));
  const interviewPosition = row.positionId ? positionIn(db, row.positionId) : null;
  const to = typed.length
    ? typed
    : row.interviewers.length
      ? row.interviewers
      : contactsFor({
          position: interviewPosition?.contacts,
          client: interviewPosition?.clientId ? clientIn(db, interviewPosition.clientId)?.contacts : null,
        }).map((c) => c.email);
  if (!to.length) back("Who do we ask? One address a line, or add the client's contacts on their page.");

  const wording = templateFor(db, "interview.slots_request");
  const fill = (text: string) =>
    text
      .replace(/\{\{candidate\}\}/g, row.candidateName)
      .replace(/\{\{position\}\}/g, positionIn(db, row.positionId ?? "")?.title ?? "the role")
      .replace(/\{\{contact\}\}/g, "all")
      .replace(/\{\{opsPerson\}\}/g, member.name);

  const message = await draftMessage({
    channel: "email",
    to,
    subject: fill(wording?.subject ?? "{{candidate}} - interview times"),
    body: fill(wording?.body ?? "Dear {{contact}},\n\nWhich times suit you for {{candidate}}?"),
    templateKey: "interview.slots_request",
    subjectType: "interview",
    subjectId: interviewId,
  });

  await patchInterview(
    interviewId,
    { slotLoops: row.slotLoops + 1, interviewers: to, state: "slots" },
    member.id,
    "interview.slotsRequested",
    null,
  );
  // We now wait on the client's times; a clock drafts the chase if they stay
  // quiet (plan B3). A second request replaces the first clock.
  await cancelClocksFor(db, "interview", interviewId, member.id, "Asked again.", ["slots.chase"]);
  await startTimer({
    kind: "slots.chase",
    subjectType: "interview",
    subjectId: interviewId,
    startsAt: Date.now(),
    dueAt: Date.now() + numberOf(db, "interview.slotsChaseDays", 2) * DAY,
    warnAt: null,
    ownerId: row.ownerId,
    payload: { label: row.candidateName },
  });
  revalidatePath(here);
  redirect(
    "/messages/" + message.id + "?msg=" + encodeURIComponent("The request is drafted. Read it, then approve it."),
  );
}

/** The times the client offered, typed in from their reply (step 3). */
export async function recordInterviewSlots(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const text = String(formData.get("slots") ?? "");
  const problem = problemWithSlots(text);
  if (problem) back(problem);
  const { slots } = parseSlots(text);

  // New times are new questions: what the candidate said about the old ones no longer applies.
  await patchInterview(interviewId, { slots, slotAnswers: [] }, member.id, "interview.slotsFromClient", null);
  await cancelClocksFor(db, "interview", interviewId, member.id, "The client sent times.", ["slots.chase"]);
  // The candidate's half is the TA's: they ask, through their own channels.
  await createTask({
    kind: "check",
    title: "Ask the candidate which time suits: " + row.candidateName,
    body:
      slots.map((at) => "- " + colomboDateInWords(at) + " " + new Date(at + 5.5 * HOUR).toISOString().slice(11, 16)).join("\n") +
      "\n\nThe TA asks the candidate - we never write to one. Then record which one they took.",
    assigneeId: row.ownerId,
    dueAt: Date.now(),
    subjectType: "interview",
    subjectId: interviewId,
    link: here,
  });
  revalidatePath(here);
  back(slots.length + (slots.length === 1 ? " time recorded." : " times recorded.") + " The TA asks the candidate now.");
}

/** The candidate took one of the times (step 4). */
export async function recordCandidatePick(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const at = Number(formData.get("at") ?? 0);
  const problem = problemWithPick(at, row.slots);
  if (problem) back(problem);
  if (!canMoveInterviewTo(row.state as InterviewState, "agreed")) back("That interview is not agreeing a time.");

  await patchInterview(interviewId, { at, state: "agreed" }, member.id, "interview.agreed", null);
  revalidatePath(here);
  back("Agreed. Now book it: who is interviewing, and where or the link.");
}

/**
 * What the TA heard from the candidate about each time the client offered (16 Nov): free, busy or
 * not asked. Written by hand, never guessed; the interview page shows it on the time tiles.
 */
export async function recordSlotAnswers(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const answers = row.slots.flatMap((at) => {
    const said = String(formData.get("answer_" + at) ?? "");
    return said === "free" || said === "busy" ? [{ at, free: said === "free" }] : [];
  });
  const problem = problemWithAnswers(answers, row.slots);
  if (problem) back(problem);

  await patchInterview(interviewId, { slotAnswers: answers }, member.id, "interview.slot_answers", null);
  revalidatePath(here);
  back("Saved. The times now show what the candidate said.");
}

/** The client told us the date they booked themselves (step 6). */
export async function recordClientBooking(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const at = Date.parse(String(formData.get("at") ?? "") + ":00+05:30");
  if (!Number.isFinite(at)) back("Give the day and time they booked.");
  if (at < Date.now()) back("That time has gone.");

  // 17 Nov: when the client schedules it, they send their own invite, so all we
  // keep is what kind of interview it is and where. Nothing is put in a calendar.
  const typedFormat = String(formData.get("format") ?? "");
  const typedWhere = String(formData.get("whereOrLink") ?? "").trim();
  await patchInterview(
    interviewId,
    {
      at,
      state: "agreed",
      ...(typedFormat in FORMAT_MEANINGS ? { format: typedFormat } : {}),
      ...(typedWhere ? { whereOrLink: typedWhere } : {}),
    },
    member.id,
    "interview.clientBooked",
    null,
  );
  await cancelClocksFor(db, "interview", interviewId, member.id, "They told us the date.", ["interview.report", "slots.chase"]);

  // Two people have to be told, and neither is told by itself.
  await createTask({
    kind: "call",
    title: "Confirm the time with the client: " + row.candidateName,
    body: "They booked it themselves for " + colomboWhen(at) + ". Confirm with their people that it stands, then book it here so the reminders run.",
    assigneeId: member.id,
    dueAt: Date.now() + DAY,
    subjectType: "interview",
    subjectId: interviewId,
    link: here,
  });
  const taPerson = (row.positionId ? positionIn(db, row.positionId)?.primaryTaId : null) ?? null;
  if (taPerson) {
    await queueTaWrite(
      "/integrations/v1/notify",
      {
        toUserId: taPerson,
        title: "Client booked an interview: " + row.candidateName,
        body: "It is on " + colomboWhen(at) + ". Please confirm the time with the candidate.",
      },
      { type: "interview", id: interviewId },
    );
  }
  revalidatePath(here);
  back("Noted. Now book it on our side so the reminders run. A task is set to confirm it with the client" + (taPerson ? ", and the TA is asked to confirm with the candidate." : "."));
}

/**
 * Book it (steps 7 to 10).
 *
 * Three things happen at once, and all three matter: TA is told so its own
 * interview row exists, the client's people get a drafted invite, and the two
 * clocks start. The Teams link is pasted in by a person for now - making the
 * meeting from the Ops mailbox needs a calendar permission the owner has yet
 * to grant, and a made-up link is worse than an asked-for one.
 */
export async function bookInterview(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const format = String(formData.get("format") ?? "");
  let whereOrLink = String(formData.get("whereOrLink") ?? "").trim();

  // 17 Nov: when we are the ones scheduling, the meeting is made in the ops
  // person's own calendar - a Teams meeting for an online interview, a plain
  // event with the address for one at their office. A pasted link still wins,
  // and a Microsoft failure never stops the booking.
  let calendarEventId: string | null = null;
  const interviewLength = Number(formData.get("lengthMin") ?? 60) || 60;
  let calendarNote = "";
  const wantsCalendar =
    formData.get("makeTeams") === "on" && Number.isFinite(row.at ?? NaN) && (format === "online" || format === "onsite");
  if (wantsCalendar && !(format === "online" && whereOrLink)) {
    // Check everything else first, so a refused booking leaves no orphan event
    // in somebody's calendar. The link does not exist yet, so a stand-in is used.
    const early = problemWithInterviewBooking({
      at: row.at ?? NaN,
      round: row.round,
      format,
      interviewers: String(formData.get("interviewers") ?? ""),
      whereOrLink: whereOrLink || (format === "online" ? "pending" : ""),
    });
    if (early) back(early);
    if (!teamsFake() && !switchedOn(db, "switch.teamsEnabled")) {
      calendarNote = " Teams is switched off in Settings, so nothing was put in a calendar.";
    } else {
      const clientName = (row.clientId ? clientIn(db, row.clientId)?.name : null) ?? "the client";
      const made = await createTeamsEvent(member.email, {
        company: clientName,
        kind: "interview",
        subject: "Interview: " + row.candidateName + ", round " + row.round,
        at: row.at as number,
        lengthMin: interviewLength,
        online: format === "online",
        location: format === "onsite" ? whereOrLink : undefined,
        internalAttendees: [],
      });
      if (made.ok) {
        calendarEventId = made.eventId;
        if (format === "online") whereOrLink = made.joinUrl;
      } else {
        calendarNote = " No calendar event was made: " + made.reason;
      }
    }
  }

  const wanted = {
    at: row.at ?? NaN,
    round: row.round,
    format,
    interviewers: String(formData.get("interviewers") ?? ""),
    whereOrLink,
  };
  const problem = problemWithInterviewBooking(wanted);
  if (problem) back(problem);
  if (!canMoveInterviewTo(row.state as InterviewState, "booked")) back("Agree a time first.");

  const interviewers = interviewersFrom(wanted.interviewers);
  const wording = templateFor(db, "interview.invite");
  const fill = (text: string) =>
    text
      .replace(/\{\{candidate\}\}/g, row.candidateName)
      .replace(/\{\{when\}\}/g, colomboDateInWords(wanted.at) + ", " + new Date(wanted.at + 5.5 * HOUR).toISOString().slice(11, 16))
      .replace(/\{\{round\}\}/g, String(row.round))
      .replace(/\{\{whereOrLink\}\}/g, wanted.whereOrLink)
      .replace(/\{\{opsPerson\}\}/g, member.name);

  const message = await draftMessage({
    channel: "email",
    to: interviewers,
    subject: fill(wording?.subject ?? "Interview: {{candidate}}, {{when}}"),
    body: fill(wording?.body ?? "Dear all,\n\n{{candidate}} is confirmed for {{when}}.\n\n{{whereOrLink}}"),
    attachmentFileIds: [
      await keepInvite(
        interviewInvite({ ...row, at: wanted.at, whereOrLink: wanted.whereOrLink, interviewers }, member),
        "interview",
        interviewId,
        member.id,
      ),
    ],
    templateKey: "interview.invite",
    subjectType: "interview",
    subjectId: interviewId,
  });

  await patchInterview(
    interviewId,
    {
      state: "booked",
      format: wanted.format,
      interviewers,
      whereOrLink: wanted.whereOrLink,
      inviteMessageId: message.id,
      calendarEventId,
      // Whose calendar it is in and how long, so a move or a cancel reaches the right event later.
      calendarOrganiser: calendarEventId ? member.email : null,
      calendarLengthMin: calendarEventId ? interviewLength : null,
    },
    member.id,
    "interview.booked",
    null,
  );
  // TA keeps its own interview row and invites the candidate; we never do.
  await queueTaWrite(
    "/integrations/v1/interviews",
    {
      applicationId: row.applicationTaId,
      openingId: row.openingTaId,
      scheduledAt: wanted.at,
      round: row.round,
      interviewFormat: wanted.format,
      interviewers,
      teamsLink: wanted.format === "online" ? wanted.whereOrLink : null,
      coordinatedBy: "ops",
    },
    { type: "interview", id: interviewId },
  );
  await startInterviewClocks({ ...row, at: wanted.at, ownerId: row.ownerId }, Date.now());
  const clash = await outlookClash(db, member.email, wanted.at, Number(formData.get("lengthMin") ?? 60) || 60);
  revalidatePath(here);
  revalidatePath("/interviews");
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent(
        "Booked. The invite to the client's people is drafted, the TA System has been told, and the reminders are set." +
          (calendarEventId ? " It is in your calendar." : "") +
          calendarNote +
          clash,
      ),
  );
}

/**
 * Types in what the candidate told us, when the TA System's own feedback did
 * not arrive (17 Nov). It follows the same road as TA's: the client's copy is
 * drafted for a person to approve, and nothing goes by itself.
 */
export async function recordCandidateFeedbackByHand(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = backTo(formData, "/interviews/" + interviewId);
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;
  if (row.candidateFeedback) back("The candidate's feedback is already recorded.");

  const said = String(formData.get("feedback") ?? "").trim();
  if (said.length < 10) back("Write what the candidate said, in a sentence or two.");
  const done = await draftCandidateFeedback(interviewId, said);
  revalidatePath("/interviews/" + interviewId);
  back(done.ok ? "Saved. The message to the client is drafted; read it and approve it." : done.what);
}

/** Mark whether it happened (step 14). */
export async function markInterviewAttendance(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const came = String(formData.get("came") ?? "");
  if (came !== "attended" && came !== "no_show") back("Did they come, or not?");
  const problem = problemWithAttendance(row.state, row.at ?? 0);
  if (problem) back(problem);
  const reason = String(formData.get("reason") ?? "").trim();
  // A no-show needs a reason, like every other thing that goes wrong here.
  if (came === "no_show" && reason.length < 4) back("Write what happened, as far as anybody knows.");

  const now = Date.now();
  await patchInterview(
    interviewId,
    { state: came, attendedAt: came === "attended" ? now : null, reason: reason || null },
    member.id,
    "interview." + came,
    reason || null,
  );
  await cancelClocksFor(db, "interview", interviewId, member.id, "The interview has happened.", null);
  await queueTaWrite(
    "/integrations/v1/interviews/" + (row.interviewTaId ?? row.applicationTaId) + "/attendance",
    { outcome: came, reason: reason || null, markedAt: now },
    { type: "interview", id: interviewId },
  );
  revalidatePath(here);
  back(
    came === "attended"
      ? "Marked as held. The TA phones the candidate after five; their feedback arrives here."
      : "Marked as a no-show, and the TA System has been told.",
  );
}

/** The candidate pulled out (step 11), heard by us rather than by TA. */
export async function recordCandidateOut(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 4) back("Write why they are out of it.");
  const answer = await noticeCandidateOut(interviewId, reason, member.id);
  if (!answer.ok) back(answer.what);
  revalidatePath(here);
  redirect(
    "/messages/" +
      answer.messageId +
      "?msg=" +
      encodeURIComponent(answer.what + " The notice to the client is drafted - read it, then approve it."),
  );
}

/**
 * A booked interview moved to a new agreed time (16 Nov, plan B1).
 *
 * The round stays, the move goes into `reschedules`, the old clocks stop and
 * new ones start from the new time, and the client's people get an updated
 * invite as a DRAFT. TA hears through the same interview write that booking
 * uses (it is keyed on the application, opening and round), so no new TA
 * endpoint is involved. Cancel-and-rebook stays for "ask for new times".
 */
export async function rescheduleInterview(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const to = Date.parse(String(formData.get("at") ?? "") + ":00+05:30");
  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithReschedule({ state: row.state, from: row.at, to, reason });
  if (problem) back(problem);
  const whereOrLink = String(formData.get("whereOrLink") ?? "").trim() || row.whereOrLink;

  const now = Date.now();
  const from = row.at ?? to;
  const reschedules = [...(row.reschedules ?? []), { from, to, by: member.id, at: now, reason }];
  await patchInterview(
    interviewId,
    // Back to "booked": a reconfirmation was for the old time.
    { at: to, state: "booked", whereOrLink, reschedules },
    member.id,
    "interview.rescheduled",
    reason,
  );
  // The Outlook event follows the move; a refusal is a note and never undoes the change (21 Nov).
  // The event sits in the organiser's calendar (stored at booking), not necessarily the mover's; 60 min only for rows booked before the length was kept.
  let calendarNote = "";
  if (row.calendarEventId) {
    const moved = await moveTeamsEvent(
      row.calendarOrganiser || member.email,
      row.calendarEventId,
      new Date(to).toISOString(),
      row.calendarLengthMin || 60,
      switchedOn(db, "switch.teamsEnabled"),
    );
    if (moved && !moved.ok) calendarNote = " The Outlook event could not be moved: " + moved.reason;
  }
  await cancelClocksFor(db, "interview", interviewId, member.id, "The interview moved.", null);
  await startInterviewClocks({ ...row, at: to }, now);

  const message = await draftMessage({
    channel: "email",
    to: row.interviewers,
    subject: "Moved: " + row.candidateName + ", now " + colomboDateInWords(to),
    body:
      "Dear all,\n\n" +
      row.candidateName +
      "'s interview (round " +
      row.round +
      ") has moved from " +
      colomboDateInWords(from) +
      ", " +
      new Date(from + 5.5 * HOUR).toISOString().slice(11, 16) +
      " to " +
      colomboDateInWords(to) +
      ", " +
      new Date(to + 5.5 * HOUR).toISOString().slice(11, 16) +
      ".\n\n" +
      whereOrLink +
      "\n\nKind regards\n" +
      member.name,
    // Same UID, one more SEQUENCE: the client's calendar moves the entry instead of adding a second.
    attachmentFileIds: [
      await keepInvite(
        interviewInvite({ ...row, at: to, whereOrLink, reschedules }, member),
        "interview",
        interviewId,
        member.id,
      ),
    ],
    templateKey: null,
    subjectType: "interview",
    subjectId: interviewId,
  });
  await patchInterview(interviewId, { inviteMessageId: message.id }, member.id, "interview.inviteRedrafted", null);

  await queueTaWrite(
    "/integrations/v1/interviews",
    {
      applicationId: row.applicationTaId,
      openingId: row.openingTaId,
      scheduledAt: to,
      round: row.round,
      interviewFormat: row.format,
      interviewers: row.interviewers,
      teamsLink: row.format === "online" ? whereOrLink : null,
      coordinatedBy: "ops",
    },
    { type: "interview", id: interviewId },
  );
  revalidatePath(here);
  revalidatePath("/interviews");
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent("Moved. The updated invite is drafted, the TA System has been told, and the reminders are reset." + calendarNote),
  );
}

/** The client cancelled or moved it (step 13). */
export async function cancelInterview(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 4) back("Write why it is off.");
  const again = String(formData.get("again") ?? "") === "yes";

  await patchInterview(
    interviewId,
    // Rebooking keeps the round: a candidate who was at round two is still at
    // round two after the client moves the date.
    again
      ? { state: "slots", at: null, slots: [], slotAnswers: [], reason }
      : { state: "cancelled", reason },
    member.id,
    again ? "interview.rebooking" : "interview.cancelled",
    reason,
  );
  let calendarNote = "";
  if (row.calendarEventId) {
    const cancelled = await cancelTeamsEvent(row.calendarOrganiser || member.email, row.calendarEventId, switchedOn(db, "switch.teamsEnabled"));
    if (cancelled && !cancelled.ok) {
      // The id stays, so the event can still be found and cancelled by hand.
      calendarNote = " The Outlook event could not be cancelled: " + cancelled.reason;
    } else {
      await patchInterview(interviewId, { calendarEventId: null, calendarOrganiser: null, calendarLengthMin: null }, member.id, "interview.calendarCleared", null);
    }
  }
  await cancelClocksFor(db, "interview", interviewId, member.id, "The interview is off.", null);
  await queueTaWrite(
    "/integrations/v1/interviews/" + (row.interviewTaId ?? row.applicationTaId) + "/cancel",
    { reason, rebooking: again },
    { type: "interview", id: interviewId },
  );
  revalidatePath(here);
  back(
    again
      ? "Off, and back to agreeing a time. The round is kept, and the TA System has been told." + calendarNote
      : "Cancelled, and the TA System has been told." + calendarNote,
  );
}

/** What the client decided after the interview (step 16). */
export async function recordRoundDecision(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;
  if (row.state !== "attended") back("The client decides after the interview, not before it.");

  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithRoundDecision(decision, reason);
  if (problem) back(problem);

  const now = Date.now();
  await patchInterview(
    interviewId,
    { decision, decisionReason: reason || null, decidedAt: now },
    member.id,
    "interview.decision." + decision,
    reason || null,
  );
  await queueTaWrite(
    "/integrations/v1/interviews/" + (row.interviewTaId ?? row.applicationTaId) + "/client-decision",
    { decision, reason: reason || null, decidedAt: now },
    { type: "interview", id: interviewId },
  );

  // A rejection changes how deep the shortlist is, so it is counted again.
  let depth = "";
  if (decision === "rejected" && row.positionId) {
    const counted = await evaluateDepth(row.positionId, now);
    if (counted.ok) depth = " " + counted.what;
  }
  if (decision === "next") {
    await createTask({
      kind: "check",
      title: "Round " + (row.round + 1) + " for " + row.candidateName,
      body: "The client wants another round. Start it from the candidate's row - the round goes up, and the times are agreed again.",
      assigneeId: row.ownerId,
      dueAt: now,
      subjectType: "interview",
      subjectId: interviewId,
      link: "/interviews",
    });
  }
  if (decision === "selected") {
    await createTask({
      kind: "decide",
      title: "Selected: " + row.candidateName,
      body: "The client has chosen them. Ask whether they want a reference check - it only happens when they ask. The offer itself is the TA System's.",
      assigneeId: row.ownerId,
      dueAt: now,
      subjectType: "interview",
      subjectId: interviewId,
      link: "/interviews/" + interviewId,
    });
  }
  revalidatePath(here);
  back("Recorded, and the TA System will be told." + depth);
}

/** A reference check, only because the client asked (step 17). */
export async function requestReference(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const asked = String(formData.get("clientAsked") ?? "") === "yes";
  const problem = problemWithReference(asked, row.candidateName);
  if (problem) back(problem);
  if (referenceForApplication(db, row.applicationTaId)) back("A reference has already been asked for.");

  const now = Date.now();
  const reference = await addReference({
    applicationTaId: row.applicationTaId,
    openingTaId: row.openingTaId,
    candidateName: row.candidateName,
    state: "requested",
    report: null,
    requestedAt: now,
    reportedAt: null,
    relayMessageId: null,
    decision: null,
    reason: null,
    ownerId: row.ownerId,
  });
  await queueTaWrite(
    "/integrations/v1/reference-requests",
    { applicationId: row.applicationTaId, openingId: row.openingTaId, askedBy: "client", requestedAt: now },
    { type: "reference", id: reference.id },
  );
  await createTask({
    kind: "check",
    title: "The TA phones the referee: " + row.candidateName,
    body: "The client asked for a reference. The TA phones the referee directly - no form, no score - and writes down what was said. It comes back here.",
    assigneeId: row.ownerId,
    dueAt: now,
    subjectType: "reference",
    subjectId: reference.id,
    link: here,
  });
  revalidatePath(here);
  back("Asked of the TA. What the referee says comes back here, and we pass it on as it is.");
}

/** What the referee said, typed in when TA reports it by hand. */
export async function recordReferenceReport(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const referenceId = String(formData.get("referenceId") ?? "");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const reference = referenceIn(db, referenceId);
  if (!reference) back("That reference is gone.");
  const row = reference as NonNullable<typeof reference>;

  const report = String(formData.get("report") ?? "").trim();
  const problem = problemWithRelay(report);
  if (problem) back(problem);

  await patchReference(referenceId, { state: "reported", report, reportedAt: Date.now() }, member.id, "reference.reported", null);
  revalidatePath(here);
  back("Written down as it was said. Now pass it to the client.");
}

/** Pass the reference on, as it was said (step 17). */
export async function relayReference(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const referenceId = String(formData.get("referenceId") ?? "");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const reference = referenceIn(db, referenceId);
  if (!reference) back("That reference is gone.");
  const row = reference as NonNullable<typeof reference>;
  if (row.state !== "reported") back("Nothing has come back from the TA yet.");
  const problem = problemWithRelay(row.report ?? "");
  if (problem) back(problem);

  const interview = interviewIn(db, interviewId);
  const to = interview?.interviewers ?? [];
  if (!to.length) back("Nobody to send it to. The interview has no interviewers on it.");

  const wording = templateFor(db, "reference.relay");
  const fill = (text: string) =>
    text
      .replace(/\{\{candidate\}\}/g, row.candidateName)
      .replace(/\{\{report\}\}/g, row.report ?? "")
      .replace(/\{\{opsPerson\}\}/g, member.name);

  const message = await draftMessage({
    channel: "email",
    to,
    subject: fill(wording?.subject ?? "{{candidate}} - reference"),
    body: fill(wording?.body ?? "Dear all,\n\n{{report}}"),
    templateKey: "reference.relay",
    subjectType: "reference",
    subjectId: referenceId,
  });

  await patchReference(referenceId, { state: "relayed", relayMessageId: message.id }, member.id, "reference.relayed", null);
  revalidatePath(here);
  redirect("/messages/" + message.id + "?msg=" + encodeURIComponent("Drafted word for word. Read it, then approve it."));
}

/** The client's answer to the reference: happy, or dropped (step 17). */
export async function recordReferenceDecision(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const referenceId = String(formData.get("referenceId") ?? "");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const reference = referenceIn(db, referenceId);
  if (!reference) back("That reference is gone.");
  const row = reference as NonNullable<typeof reference>;

  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (decision !== "cleared" && decision !== "dropped") back("Cleared, or dropped?");
  if (decision === "dropped" && reason.length < 4) back("Write why they dropped them, in the client's words.");

  await patchReference(
    referenceId,
    { state: decision, decision, reason: reason || null },
    member.id,
    "reference." + decision,
    reason || null,
  );

  // A dropped candidate changes the shortlist, so it is counted again.
  let depth = "";
  const interview = interviewIn(db, interviewId);
  if (decision === "dropped" && interview?.positionId) {
    const counted = await evaluateDepth(interview.positionId, Date.now());
    if (counted.ok) depth = " " + counted.what;
  }
  revalidatePath(here);
  back(
    decision === "cleared"
      ? "Cleared. The offer is the TA System's work from here."
      : "Dropped, with their reason." + depth,
  );
}

/* ── Placements, invoices and payments (15, Phase 6) ──────────── */

/** They joined. The button for when the TA phones them and tells us. */
export async function markJoined(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const placementId = String(formData.get("placementId") ?? "");
  const here = "/placements/" + placementId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const placement = placementIn(db, placementId);
  if (!placement) redirect("/placements?msg=" + encodeURIComponent("That placement is gone."));
  const row = placement as NonNullable<typeof placement>;
  const now = Date.now();
  // They joined on the join date when it has passed, not on the day somebody clicked (18 Nov): the guarantee
  // counts from it. A join date still ahead means they started early, today.
  const joinedAt = row.joinDate && row.joinDate <= now ? row.joinDate : now;
  const answer = await markPlacementJoined(placementId, member.id, joinedAt);
  // TA hears it from us when it was told by phone, as it does for a no-show or a new date (18 Nov).
  if (answer.ok) {
    await queueTaWrite(
      "/integrations/v1/placements/" + row.placementTaId + "/joined",
      { joinedAt },
      { type: "placement", id: placementId },
    );
  }
  revalidatePath(here);
  revalidatePath("/placements");
  back(answer.what);
}

/** They never turned up (step 8). */
export async function markNoShow(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const placementId = String(formData.get("placementId") ?? "");
  const here = "/placements/" + placementId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const placement = placementIn(db, placementId);
  if (!placement) redirect("/placements?msg=" + encodeURIComponent("That placement is gone."));
  const row = placement as NonNullable<typeof placement>;
  if (row.state !== "placed") back("That placement is not waiting to join.");

  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithNoShow(reason);
  if (problem) back(problem);

  const now = Date.now();
  await patchPlacement(placementId, { state: "no_show", reason }, member.id, "placement.noShow", reason);
  await cancelClocksFor(db, "placement", placementId, member.id, "They never joined.", null);

  // The client has to choose, and nothing is invoiced either way.
  const client = row.clientId ? clientIn(db, row.clientId) : null;
  const wording = templateFor(db, "placement.noshow_options");
  const fill = (text: string) =>
    text
      .replace(/\{\{candidate\}\}/g, row.candidateName)
      .replace(/\{\{position\}\}/g, positionIn(db, row.positionId ?? "")?.title ?? "the role")
      .replace(/\{\{joinDate\}\}/g, row.joinDate ? colomboDateInWords(row.joinDate) : "the agreed day")
      .replace(/\{\{opsPerson\}\}/g, member.name);

  const message = await draftMessage({
    channel: "email",
    to: client?.billingEmail ? [client.billingEmail] : [],
    subject: fill(wording?.subject ?? "{{candidate}} - {{position}}"),
    body: fill(wording?.body ?? "Dear all,\n\n{{candidate}} did not start with you."),
    templateKey: "placement.noshow_options",
    subjectType: "placement",
    subjectId: placementId,
  });
  await queueTaWrite(
    "/integrations/v1/placements/" + row.placementTaId + "/no-show",
    { reason, markedAt: now },
    { type: "placement", id: placementId },
  );
  revalidatePath(here);
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent(
        "Down as a no-show, and the TA System has been told. Nothing is invoiced. The client's choice is drafted - read it, then approve it.",
      ),
  );
}

/** What the client chose after a no-show: a replacement, or stop. */
export async function recordNoShowChoice(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const placementId = String(formData.get("placementId") ?? "");
  const here = "/placements/" + placementId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const placement = placementIn(db, placementId);
  if (!placement) redirect("/placements?msg=" + encodeURIComponent("That placement is gone."));
  const row = placement as NonNullable<typeof placement>;

  // Only a no-show has a choice, and only one (18 Nov: any placement took one, and it could be changed).
  if (row.state !== "no_show") back("Only a no-show has this choice.");
  if (row.noShowChoice) back("The client's choice is recorded already: " + row.noShowChoice + ".");
  const choice = String(formData.get("choice") ?? "");
  const problem = problemWithNoShowChoice(choice);
  if (problem) back(problem);

  await patchPlacement(placementId, { noShowChoice: choice }, member.id, "placement.noShowChoice." + choice, null);
  // The search reopening is TA's: they hold the pipeline and the back-ups.
  await queueTaWrite(
    "/integrations/v1/openings/" + row.openingTaId + "/status",
    { status: choice === "replace" ? "open" : "closed", reason: "no-show, client chose to " + choice },
    { type: "placement", id: placementId },
  );
  // The close checklist opens, with its own task (18 Nov: it was only a task saying the checklist was to come).
  if (choice === "stop") await openCloseChecklist(row.openingTaId, "client_stopped", member.id);
  revalidatePath(here);
  back(
    choice === "replace"
      ? "Noted: a replacement. The TA System has been asked to reopen the search."
      : "Noted: they have stopped. Nothing is invoiced, and the position closes.",
  );
}

/** The joining day moved (step 5). */
export async function changeJoinDate(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const placementId = String(formData.get("placementId") ?? "");
  const here = "/placements/" + placementId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const placement = placementIn(db, placementId);
  if (!placement) redirect("/placements?msg=" + encodeURIComponent("That placement is gone."));
  const row = placement as NonNullable<typeof placement>;
  if (row.state !== "placed") back("That placement is not waiting to join any more.");

  const when = Date.parse(String(formData.get("joinDate") ?? "") + "T09:00:00+05:30");
  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithDojChange(when, reason);
  if (problem) back(problem);
  // Counted before the patch: the store hands back the row the patch writes
  // to, so afterwards this already includes the move being made (3 Nov).
  const movesBefore = row.dojHistory.length;

  const now = Date.now();
  await patchPlacement(
    placementId,
    {
      joinDate: when,
      // Every move is kept: a joining day that slips twice is the thing we
      // watch for, and it cannot be seen if the old date is overwritten.
      dojHistory: [...row.dojHistory, { from: row.joinDate, to: when, reason, at: now, by: member.id }],
    },
    member.id,
    "placement.dojChanged",
    reason,
  );
  await cancelClocksFor(db, "placement", placementId, member.id, "The joining day moved.", null);
  await startJoinClocks({ ...row, joinDate: when }, now);
  await queueTaWrite(
    "/integrations/v1/placements/" + row.placementTaId + "/join-date",
    { joinDateMs: when, reason },
    { type: "placement", id: placementId },
  );
  revalidatePath(here);
  back(
    "Moved to " +
      colomboDateInWords(when) +
      ". The reminders are reset and the TA System has been told." +
      (movesBefore ? " That is move " + (movesBefore + 1) + " for this one." : ""),
  );
}

/**
 * Correct the basic / allowances split behind the fee (16 Nov).
 *
 * TA gives one salary and a free-text package, not the split, so Accounts or
 * the ops lead fills it in. The fee follows it, so a reason is mandatory and
 * goes to the audit. A draft invoice is re-priced; one already sent is not
 * touched - that is a credit note, a separate document.
 */
export async function correctSalarySplit(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const placementId = String(formData.get("placementId") ?? "");
  const here = "/placements/" + placementId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "money.manage") && !can(member, "client.manage")) back(refusal("money.manage"));
  const db = await desk();
  const placement = placementIn(db, placementId);
  if (!placement) redirect("/placements?msg=" + encodeURIComponent("That placement is gone."));
  const row = placement as NonNullable<typeof placement>;

  const basic = Number(String(formData.get("basicSalary") ?? "").replace(/,/g, ""));
  const allowances = Number(String(formData.get("allowances") ?? "0").replace(/,/g, "") || "0");
  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithSalarySplit(basic, allowances, reason);
  if (problem) back(problem);

  const invoice = row.invoiceId ? invoiceIn(db, row.invoiceId) : null;
  if (invoice && invoice.state !== "draft") {
    back("The invoice has gone to the client. Change it with a credit note, not by editing the salary.");
  }

  await patchPlacement(placementId, { basicSalary: basic, allowances }, member.id, "placement.salarySplit", reason);
  if (invoice) {
    const amount = feeAmount(
      { feeMonths: row.feeMonths, feeBasis: row.feeBasis },
      row.monthlySalary ?? 0,
      { basicSalary: basic, allowances },
    );
    await patchInvoice(invoice.id, { amount }, member.id, "invoice.repriced", reason);
  }
  revalidatePath(here);
  revalidatePath("/invoices");
  back("Saved. The fee now follows basic " + money(basic, row.currency) + " and allowances " + money(allowances, row.currency) + ".");
}

/** We lost them before they joined (step 6). */
export async function cancelPlacement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const placementId = String(formData.get("placementId") ?? "");
  const here = "/placements/" + placementId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const placement = placementIn(db, placementId);
  if (!placement) redirect("/placements?msg=" + encodeURIComponent("That placement is gone."));
  const row = placement as NonNullable<typeof placement>;
  if (row.state !== "placed") back("That placement is not waiting to join.");

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 4) back("Write what happened. A lost candidate is read about later.");

  await patchPlacement(placementId, { state: "cancelled", reason }, member.id, "placement.cancelled", reason);
  await cancelClocksFor(db, "placement", placementId, member.id, "The placement is off.", null);
  await queueTaWrite(
    "/integrations/v1/placements/" + row.placementTaId + "/cancel",
    { reason, cancelledAt: Date.now() },
    { type: "placement", id: placementId },
  );
  revalidatePath(here);
  back("Cancelled, and the TA System has been told so it can reopen its own path. Nothing is invoiced.");
}

/**
 * The invoice as a document (owner, 17 Nov): the owner's Word invoice with its holes filled from the invoice,
 * its placement and the client's billing record, stored as Word and (when LibreOffice is there) as PDF. Each
 * make is the next version. One function for the preview and the send, so they cannot differ. A hole nothing
 * fills stops it and is named. `none` when no template has been uploaded.
 */
async function fillInvoiceDocument(
  db: Awaited<ReturnType<typeof desk>>,
  row: NonNullable<ReturnType<typeof invoiceIn>>,
  memberId: Id,
  now: number,
): Promise<{ error: string } | { version: number; wordFile: OpsFile | null; pdfFile: OpsFile | null; pdfReason: string }> {
  const placement = row.placementId ? placementIn(db, row.placementId) : null;
  const client = row.clientId ? clientIn(db, row.clientId) : null;
  const input = {
    number: row.number,
    amount: row.amount,
    lateCharge: row.lateCharge,
    currency: row.currency,
    dueAt: row.dueAt,
    reason: row.reason,
    againstNumber: row.againstInvoiceId ? (invoiceIn(db, row.againstInvoiceId)?.number ?? null) : null,
    now,
    client: client ?? { billingName: "" },
    placement,
    about: row.about,
    kind: row.kind,
    positionTitle: positionIn(db, placement?.positionId ?? "")?.title ?? "",
  };
  const version = nextInvoiceVersion(db.files.filter((f) => f.subjectType === "invoice" && f.subjectId === row.id));
  const base = safeName((row.kind === "credit_note" ? "Credit note " : "Invoice ") + row.number) + " - v" + version;
  const store = async (name: string, bytes: Uint8Array, mime: string, madeFrom: Id | null) => {
    const key = keyFor("invoice", "invoice", row.id, name, now);
    await putBytes(key, bytes, mime);
    return addFile({
      kind: "invoice",
      key,
      name,
      size: bytes.byteLength,
      mime,
      sha256: sha256(bytes),
      subjectType: "invoice",
      subjectId: row.id,
      madeFrom,
      uploadedBy: memberId,
    });
  };

  // An invoice template uploaded as a Word file still wins (the owner's own layout, filled and turned into a
  // PDF by LibreOffice on the server). Without one, the invoice is drawn in code to the owner's design.
  const docTemplate = currentTemplate(db.files, row.kind === "credit_note" ? "credit_note_template" : "invoice_template");
  if (docTemplate) {
    const templateBytes = await readBytes(docTemplate.key);
    if (!templateBytes) return { error: "The invoice template is registered but its bytes are gone. Upload it again on the Files screen." };
    const filled = await fillDocx(Buffer.from(templateBytes), invoiceHoles(input));
    const holeProblem = problemWithInvoiceFill(filled.missing);
    if (holeProblem) return { error: holeProblem };
    const wordFile = await store(base + ".docx", filled.bytes!, mimeFor(base + ".docx"), docTemplate.id);
    const pdf = await docxToPdf(filled.bytes!, base + ".docx");
    if (!pdf.ok) return { version, wordFile, pdfFile: null, pdfReason: pdf.reason ?? "" };
    const pdfFile = await store(base + ".pdf", pdf.bytes!, "application/pdf", wordFile.id);
    return { version, wordFile, pdfFile, pdfReason: "" };
  }

  const bank = bankDetails(db);
  const bankProblem = problemWithBank(bank);
  if (bankProblem) return { error: bankProblem };
  const drawn = await drawInvoicePdf(invoiceSheet(input, bank));
  const pdfFile = await store(base + ".pdf", drawn, "application/pdf", null);
  return { version, wordFile: null, pdfFile, pdfReason: "" };
}

/** The owner's bank details for the invoice, as kept in Settings (never in the code). */
function bankDetails(db: Awaited<ReturnType<typeof desk>>) {
  return {
    bank: textOf(db, "bank.name", ""),
    accountName: textOf(db, "bank.accountName", ""),
    accountNo: textOf(db, "bank.accountNo", ""),
    branch: textOf(db, "bank.branch", ""),
    swift: textOf(db, "bank.swift", ""),
  };
}

/** The bank details for the invoice, typed once on the Settings screen (owner, 17 Nov). */
export async function saveBankDetails(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect(answerBack("/settings", msg, formData));
  if (!can(member, "settings.manage")) back(refusal("settings.manage"));
  const bank = {
    bank: String(formData.get("bank") ?? "").trim(),
    accountName: String(formData.get("accountName") ?? "").trim(),
    accountNo: String(formData.get("accountNo") ?? "").trim(),
    branch: String(formData.get("branch") ?? "").trim(),
    swift: String(formData.get("swift") ?? "").trim(),
  };
  const problem = problemWithBank(bank);
  if (problem) back(problem);
  await setSetting("bank.name", bank.bank, member.id, "Bank details for invoices");
  await setSetting("bank.accountName", bank.accountName, member.id, "Bank details for invoices");
  await setSetting("bank.accountNo", bank.accountNo, member.id, "Bank details for invoices");
  await setSetting("bank.branch", bank.branch, member.id, "Bank details for invoices");
  await setSetting("bank.swift", bank.swift, member.id, "Bank details for invoices");
  revalidatePath("/settings");
  back("Saved. Every new invoice carries these.");
}

/**
 * A look at the invoice before it is sent (owner, 17 Nov): fills it exactly as the send would and keeps the
 * files, with no message and no change of state. Each press is the next version; change the record it comes
 * from (the client's billing details, the placement's salary split) and make it again.
 */
export async function previewInvoice(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const here = "/invoices/" + invoiceId;
  const back = (msg: string) => redirect(answerBack(here, msg, formData));
  if (!can(member, "money.manage")) back(refusal("money.manage"));
  const db = await desk();
  const invoice = invoiceIn(db, invoiceId);
  if (!invoice) redirect("/invoices?msg=" + encodeURIComponent("That invoice is gone."));
  const row = invoice as NonNullable<typeof invoice>;
  if (row.state !== "draft") back("That invoice has gone: its document is the one that was sent.");

  const made = await fillInvoiceDocument(db, row, member.id, Date.now());
  if ("error" in made) back(made.error);
  else {
    revalidatePath(here);
    back(
      made.pdfFile
        ? "Version " + made.version + " of the invoice is ready below. Nothing was sent."
        : "Version " + made.version + " is ready below as a reading copy. No PDF this time: " + made.pdfReason + " Nothing was sent.",
    );
  }
}

/**
 * Draft the fee invoice for a joined placement that has none (owner, 17 Nov). It is drafted by itself the day
 * they join, but a draft that was refused then (no billing address on the client, no package) used to stay
 * refused for good, because nothing asked again. The answer says what is still missing.
 */
export async function draftInvoiceForPlacement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const placementId = String(formData.get("placementId") ?? "");
  const here = "/placements/" + placementId;
  const back = (msg: string) => redirect(answerBack(here, msg, formData));
  if (!can(member, "money.manage") && !can(member, "client.manage")) back(refusal("money.manage"));

  const result = await draftFeeInvoice(placementId, member.id);
  revalidatePath(here);
  revalidatePath("/invoices");
  if (!result.ok) back(result.what);
  redirect("/invoices/" + result.invoiceId + "?msg=" + encodeURIComponent("The invoice is drafted. Look at it, then send it."));
}

/**
 * Send the invoice (step 10).
 *
 * Accounts' own job, so it needs `money.manage`. With an invoice template
 * uploaded the filled PDF is attached; without one the lines go in the body,
 * because we do not invent the paperwork a client pays against.
 */
export async function sendInvoice(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const here = "/invoices/" + invoiceId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "money.manage")) back(refusal("money.manage"));
  const db = await desk();
  const invoice = invoiceIn(db, invoiceId);
  if (!invoice) redirect("/invoices?msg=" + encodeURIComponent("That invoice is gone."));
  const row = invoice as NonNullable<typeof invoice>;
  if (row.state !== "draft") back("That invoice has gone already.");

  const placement = row.placementId ? placementIn(db, row.placementId) : null;
  const client = row.clientId ? clientIn(db, row.clientId) : null;
  // FigJam: "Billing address exists?" - No goes to fixing the client record.
  const billingProblem = client
    ? problemWithInvoiceBilling(client)
    : "This invoice has no client record. Link it to a client first.";
  if (billingProblem) back(billingProblem);

  const lines = invoiceLines({
    number: row.number,
    // A surcharge and a credit note have no placement: what they are about is
    // written on the invoice itself.
    candidateName: placement?.candidateName ?? row.about ?? "",
    positionTitle: positionIn(db, placement?.positionId ?? "")?.title ?? "",
    clientName: client?.billingName || client?.name || "",
    feeWords: feeInWords({ feeMonths: placement?.feeMonths ?? 1, feeBasis: placement?.feeBasis ?? "gross" }),
    monthlySalary: placement?.monthlySalary ?? 0,
    amount: row.amount,
    lateCharge: row.lateCharge,
    payments: row.payments,
    joinedAt: placement?.joinedAt ?? null,
    dueAt: row.dueAt,
    currency: row.currency,
  });

  const wording = templateFor(
    db,
    row.kind === "surcharge" ? "invoice.surcharge" : row.kind === "credit_note" ? "invoice.credit_note" : "invoice.cover",
  );
  const fill = (text: string) =>
    text
      .replace(/\{\{client\}\}/g, client?.name ?? "")
      .replace(/\{\{contact\}\}/g, "all")
      .replace(/\{\{candidate\}\}/g, placement?.candidateName ?? "")
      .replace(/\{\{invoiceNumber\}\}/g, row.number)
      .replace(/\{\{invoice\}\}/g, lines)
      .replace(/\{\{dueDate\}\}/g, row.dueAt ? colomboDateInWords(row.dueAt) : "thirty days from the first working day")
      .replace(/\{\{surchargePct\}\}/g, String(numberOf(db, "hire.surchargePct", 50)))
      .replace(/\{\{amount\}\}/g, money(row.amount, row.currency))
      .replace(/\{\{why\}\}/g, row.reason ?? "")
      .replace(/\{\{invoiceNumber\}\}/g, row.number)
      .replace(/\{\{sentDate\}\}/g, row.setId ? (clientSetIn(db, row.setId)?.sentAt ? colomboDateInWords(clientSetIn(db, row.setId)!.sentAt!) : "the day we sent it") : "")
      .replace(/\{\{opsPerson\}\}/g, member.name);

  // The invoice document (16 Nov): when the owner has uploaded a template, fill it, make the PDF and
  // attach that. Without one the lines stay in the email body, as before - we never draw an invoice of our
  // own. The same function makes the preview on the invoice page, so what was looked at is what goes.
  const now = Date.now();
  const attachmentFileIds: string[] = [];
  const made = await fillInvoiceDocument(db, row, member.id, now);
  if ("error" in made) back(made.error);
  else {
    if (!made.pdfFile) back("The invoice was filled in but no PDF could be made. " + made.pdfReason);
    attachmentFileIds.push(made.pdfFile!.id);
  }

  const message = await draftMessage({
    channel: "email",
    to: [client?.billingEmail ?? ""].filter(Boolean),
    attachmentFileIds,
    subject: fill(wording?.subject ?? "{{client}} - invoice {{invoiceNumber}}"),
    body: fill(wording?.body ?? "Dear {{contact}},\n\n{{invoice}}"),
    templateKey: "invoice.cover",
    subjectType: "invoice",
    subjectId: invoiceId,
  });

  await patchInvoice(
    invoiceId,
    { state: "sent", sentAt: now, sentMessageId: message.id },
    member.id,
    "invoice.sent",
    null,
  );
  // The clock that asks for the money, counted from the due date.
  if (row.dueAt) {
    await startTimer({
      kind: "invoice.due",
      subjectType: "invoice",
      subjectId: invoiceId,
      startsAt: now,
      dueAt: row.dueAt,
      warnAt: null,
      ownerId: row.ownerId,
      payload: { label: row.number },
    });
  }
  await queueTaWrite(
    "/integrations/v1/placements/" + (placement?.placementTaId ?? "") + "/invoice-state",
    { state: "sent", invoiceNumber: row.number, amount: row.amount, dueAt: row.dueAt },
    { type: "invoice", id: invoiceId },
  );
  revalidatePath(here);
  revalidatePath("/invoices");
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent("The invoice is drafted for the billing address. Read it, then approve it and it goes."),
  );
}

/** Money in (step 12). */
export async function recordPayment(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const here = "/invoices/" + invoiceId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "money.manage")) back(refusal("money.manage"));
  const db = await desk();
  const invoice = invoiceIn(db, invoiceId);
  if (!invoice) redirect("/invoices?msg=" + encodeURIComponent("That invoice is gone."));
  const row = invoice as NonNullable<typeof invoice>;

  const amount = Number(formData.get("amount") ?? 0);
  const method = String(formData.get("method") ?? "").trim() || "bank transfer";
  // The bank reference and the day it arrived come from the form (they used to be dropped).
  const reference = String(formData.get("reference") ?? "").trim();
  const noteText = String(formData.get("note") ?? "").trim();
  const note = [reference ? "Ref " + reference : "", noteText].filter(Boolean).join(" · ");
  const owed = balanceOf(row);
  const notNow = problemWithPaymentOn(row.state);
  if (notNow) back(notNow);
  const problem = problemWithPayment(amount, owed);
  if (problem) back(problem);
  const now = Date.now();
  const received = paymentDate(String(formData.get("receivedAt") ?? ""), now);
  if (received.problem) back(received.problem);
  const payments = [...row.payments, { amount, paidAt: received.at, method, by: member.id, note: note || null }];
  const left = Math.round((row.amount + row.lateCharge - payments.reduce((s, p) => s + p.amount, 0)) * 100) / 100;
  const settled = left <= 0.5;

  await patchInvoice(
    invoiceId,
    {
      payments,
      state: settled ? "paid" : "partly_paid",
      paidAt: settled ? received.at : null,
    },
    member.id,
    settled ? "invoice.paid" : "invoice.partlyPaid",
    money(amount, row.currency) + " by " + method,
  );

  if (settled) {
    // Nothing chases a paid invoice.
    await cancelClocksFor(db, "invoice", invoiceId, member.id, "It is paid.", null);
    const placement = row.placementId ? placementIn(db, row.placementId) : null;
    // The guarantee only holds on a fee fully paid, and the fee is always
    // paid after it started - the invoice is drafted the day they join. So
    // the day it is settled is written onto the guarantee, or every leaver
    // would read as void (found while walking Phase 7).
    const guarantee = placement ? guaranteeForPlacement(db, placement.id) : null;
    if (guarantee && !guarantee.feePaidAt) {
      await patchGuarantee(
        guarantee.id,
        // The day the money arrived, not the day somebody typed it in (18 Nov).
        { feePaidAt: received.at },
        member.id,
        "guarantee.feePaid",
        "The fee is settled, so the guarantee holds.",
      );
    }
    // TA hears it is paid, as it heard it was sent (18 Nov).
    await queueTaWrite(
      "/integrations/v1/placements/" + (placement?.placementTaId ?? "") + "/invoice-state",
      { state: "paid", invoiceNumber: row.number, amount: row.amount + row.lateCharge, paidAt: received.at },
      { type: "invoice", id: invoiceId },
    );
    const tell = db.members.filter((m) => m.active && (m.role === "accounts" || m.id === placement?.ownerId));
    await draftMessage({
      channel: "internal",
      to: tell.map((m) => m.email).filter(Boolean),
      subject: "Fee collected: " + row.number,
      body:
        money(row.amount + row.lateCharge, row.currency) +
        " is in for " +
        (placement?.candidateName ?? row.number) +
        ".\n\nThe guarantee only holds while the fee is fully paid, so this is the day it really starts.",
      templateKey: "invoice.collected",
      subjectType: "invoice",
      subjectId: invoiceId,
    });
  }
  revalidatePath(here);
  revalidatePath("/invoices");
  back(
    settled
      ? "Paid in full. Accounts and the ops owner have been told, and nothing chases it any more."
      : money(left, row.currency) + " still owed.",
  );
}

/** The client says the invoice is wrong (the agreement's own exception). */
export async function markInvoiceDisputed(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const here = "/invoices/" + invoiceId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "money.manage")) back(refusal("money.manage"));

  const reason = String(formData.get("reason") ?? "").trim();
  const settled = String(formData.get("settled") ?? "") === "yes";
  // It never looked the invoice up (18 Nov): a dispute only stands on one the client owes.
  const db = await desk();
  const invoice = invoiceIn(db, invoiceId);
  if (!invoice) redirect("/invoices?msg=" + encodeURIComponent("That invoice is gone."));
  const row = invoice as NonNullable<typeof invoice>;
  if (!settled && !["sent", "partly_paid"].includes(row.state)) back("Only an invoice the client has and still owes on can be disputed.");
  if (settled && !row.disputed) back("That invoice is not disputed.");
  if (!settled && row.disputed) back("That invoice is disputed already.");
  if (!settled && reason.length < 4) back("Write what they say is wrong with it.");

  await patchInvoice(
    invoiceId,
    settled
      ? { disputed: false, disputedReason: null }
      : { disputed: true, disputedReason: reason, lateCharge: 0 },
    member.id,
    settled ? "invoice.disputeSettled" : "invoice.disputed",
    settled ? "The dispute is settled." : reason,
  );
  revalidatePath(here);
  back(
    settled
      ? "The dispute is settled, so the late charge runs again from now."
      : "Marked as disputed in good faith: no late charge while it stands. That is the agreement's own wording.",
  );
}

/** Write it off (step 14). The Director's call, not a habit. */
export async function writeOffInvoice(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const here = "/invoices/" + invoiceId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "refund.decide") && !can(member, "money.manage")) back(refusal("money.manage"));
  const db = await desk();
  const invoice = invoiceIn(db, invoiceId);
  if (!invoice) redirect("/invoices?msg=" + encodeURIComponent("That invoice is gone."));
  const row = invoice as NonNullable<typeof invoice>;
  if (row.state === "paid") back("That one is paid.");
  if (row.state === "written_off") back("That one is already written off.");

  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithWriteOff(row.dueAt ?? Date.now(), reason, Date.now(), numberOf(db, "invoice.writeOffDays", WRITE_OFF_DAYS));
  // Only the Director of Operations may write one off early, which is the
  // same shape as the refund decision.
  if (problem && !can(member, "refund.decide")) back(problem);

  const now = Date.now();
  await patchInvoice(
    invoiceId,
    { state: "written_off", writtenOffAt: now, reason },
    member.id,
    "invoice.writtenOff",
    reason,
  );
  await cancelClocksFor(db, "invoice", invoiceId, member.id, "It has been written off.", null);
  const placement = row.placementId ? placementIn(db, row.placementId) : null;
  // It said the guarantee is void and the position closes, and did neither (18 Nov).
  const guarantee = placement ? guaranteeForPlacement(db, placement.id) : null;
  if (guarantee && guarantee.state !== "void" && guarantee.state !== "ended_clean") {
    await patchGuarantee(guarantee.id, { state: "void", reason }, member.id, "guarantee.void", "The fee was written off.");
    await cancelClocksFor(db, "guarantee", guarantee.id, member.id, "The fee was written off.", null);
  }
  if (placement) await openCloseChecklist(placement.openingTaId, "written_off", member.id, now);
  await createTask({
    kind: "check",
    title: "Written off: " + row.number,
    body:
      "The guarantee does not apply to an unpaid fee, so it is void, and the position closes. The close checklist is open.",
    assigneeId: placement?.ownerId ?? member.id,
    dueAt: now,
    subjectType: "invoice",
    subjectId: invoiceId,
    link: here,
  });
  revalidatePath(here);
  back("Written off, with your reason. The guarantee is void and the position closes.");
}

/* ── Guarantees and the close (15, Phase 7) ───────────────────── */

/** Somebody left inside the ninety days (step 4). */
export async function recordLeaver(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const guaranteeId = String(formData.get("guaranteeId") ?? "");
  const here = "/guarantees/" + guaranteeId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const guarantee = guaranteeIn(db, guaranteeId);
  if (!guarantee) redirect("/guarantees?msg=" + encodeURIComponent("That guarantee is gone."));
  const row = guarantee as NonNullable<typeof guarantee>;

  const leftAt = Date.parse(String(formData.get("leftAt") ?? "") + "T17:00:00+05:30");
  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithLeaver(leftAt, reason, row.startsAt);
  if (problem) back(problem);

  const answer = await markLeaver(guaranteeId, leftAt, reason, member.id);
  revalidatePath(here);
  revalidatePath("/guarantees");
  back(answer.what);
}

/**
 * The refund decision (step 6).
 *
 * The Director of Operations', and nobody else's: `refund.decide` is the one
 * capability only that role has. The credit note itself is accounts' work and
 * is drafted here so the money and the decision never drift apart.
 */
export async function decideRefund(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const guaranteeId = String(formData.get("guaranteeId") ?? "");
  const here = "/guarantees/" + guaranteeId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "refund.decide")) back(refusal("refund.decide"));
  const db = await desk();
  const guarantee = guaranteeIn(db, guaranteeId);
  if (!guarantee) redirect("/guarantees?msg=" + encodeURIComponent("That guarantee is gone."));
  const row = guarantee as NonNullable<typeof guarantee>;

  const reason = String(formData.get("reason") ?? "").trim();
  const early = String(formData.get("early") ?? "") === "yes";
  const problem = problemWithRefund(
    row.state,
    reason,
    row.deadlineAt,
    Date.now(),
    db.holidays.map((h) => h.date),
    early,
  );
  if (problem) back(problem);

  const pct = numberOf(db, "refund.pct", REFUND_PCT);
  const placement = placementIn(db, row.placementId);
  const invoice = placement?.invoiceId ? invoiceIn(db, placement.invoiceId) : null;
  const paid = invoice ? invoice.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
  const amount = refundAmount(paid, pct);

  const now = Date.now();
  await patchGuarantee(
    guaranteeId,
    { state: "refund_pending", refundPct: pct, refundAmount: amount, decidedBy: member.id, decidedAt: now },
    member.id,
    "guarantee.refundDecided",
    // Deciding before the sixty days are up is allowed and is written down as
    // what it was: a decision, not a deadline.
    early ? reason + " (decided before the replacement window was up)" : reason,
  );
  await cancelClocksFor(db, "guarantee", guaranteeId, member.id, "The decision is made.", null);
  await createTask({
    kind: "approve",
    title: "A credit note for " + money(amount, invoice?.currency ?? "LKR"),
    body:
      "The Director of Operations has decided a " +
      pct +
      "% refund for " +
      row.candidateName +
      ".\n\nReason given: " +
      reason +
      "\n\nAccounts raises the credit note and sends it. The invoice document and the credit note both wait on a template from the owner, so for now this goes as a letter.",
    assigneeId: db.members.find((m) => m.active && m.role === "accounts")?.id ?? member.id,
    dueAt: now,
    subjectType: "guarantee",
    subjectId: guaranteeId,
    link: here,
  });
  revalidatePath(here);
  back(
    "Decided: " +
      pct +
      "% of what was paid, " +
      money(amount, invoice?.currency ?? "LKR") +
      ". Accounts has the credit note to raise.",
  );
}

/** The refund has gone out, so the position closes (step 6). */
export async function markRefunded(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const guaranteeId = String(formData.get("guaranteeId") ?? "");
  const here = "/guarantees/" + guaranteeId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "money.manage")) back(refusal("money.manage"));
  const db = await desk();
  const guarantee = guaranteeIn(db, guaranteeId);
  if (!guarantee) redirect("/guarantees?msg=" + encodeURIComponent("That guarantee is gone."));
  const row = guarantee as NonNullable<typeof guarantee>;
  if (row.state !== "refund_pending") back("No refund has been decided on this one.");

  await patchGuarantee(guaranteeId, { state: "refunded" }, member.id, "guarantee.refunded", null);
  await openCloseChecklist(row.openingTaId, "refunded", member.id);
  revalidatePath(here);
  back("Recorded as refunded. The close list for the position is open.");
}

/** Tick one item off the close list (step 11). */
export async function tickCloseItem(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const checklistId = String(formData.get("checklistId") ?? "");
  const key = String(formData.get("key") ?? "");
  const here = "/closes/" + checklistId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const checklist = checklistIn(db, checklistId);
  if (!checklist) redirect("/closes?msg=" + encodeURIComponent("That close list is gone."));
  const row = checklist as NonNullable<typeof checklist>;
  if (row.completedAt) back("That position is closed already.");

  const refused = problemWithTick(row.items, key);
  if (refused) back(refused);
  const now = Date.now();
  const items = row.items.map((item) =>
    item.key === key ? { ...item, doneAt: item.doneAt ? null : now, doneBy: item.doneAt ? null : member.id } : item,
  );

  await patchChecklist(checklistId, { items }, member.id, "close.itemTicked", key);
  // Closing the opening is ours to do through the API, and only once the
  // adverts are down - an opening closed with a live post is how a candidate
  // applies to a job that has gone.
  if (key === "opening" && items.find((item) => item.key === "opening")?.doneAt) {
    await queueTaWrite(
      "/integrations/v1/openings/" + row.openingTaId + "/status",
      { status: "closed", reason: row.trigger },
      { type: "close", id: checklistId },
    );
  }
  revalidatePath(here);
  back("Ticked.");
}

/** Everything is done, so the position really is closed (step 13). */
export async function completeClose(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const checklistId = String(formData.get("checklistId") ?? "");
  const here = "/closes/" + checklistId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const checklist = checklistIn(db, checklistId);
  if (!checklist) redirect("/closes?msg=" + encodeURIComponent("That close list is gone."));
  const row = checklist as NonNullable<typeof checklist>;
  if (row.completedAt) back("That one is closed already.");

  const problem = problemWithCloseComplete(row.items);
  if (problem) back(problem);

  const now = Date.now();
  await patchChecklist(checklistId, { completedAt: now }, member.id, "close.completed", CLOSE_TRIGGERS[row.trigger] ?? row.trigger);
  if (row.positionId) {
    await patchPosition(row.positionId, { stage: "closed", closedAt: now }, member.id, "position.closed", row.trigger);
  }

  // The client's own record: still active if anything else is open for them,
  // otherwise nothing is running and the record says so (step 15).
  if (row.clientId) {
    const theirs = db.positions.filter(
      (p) => p.clientId === row.clientId && p.id !== row.positionId && p.stage !== "closed",
    );
    if (!theirs.length) {
      await createTask({
        kind: "check",
        title: "Nothing open for this client any more",
        body:
          "Their last position has closed. Nothing happens automatically - if they are finished with us, move the client to dormant with a reason; if not, leave them active.",
        assigneeId: row.ownerId,
        dueAt: now,
        subjectType: "client",
        subjectId: row.clientId,
        link: "/clients/" + row.clientId,
      });
    }
  }
  revalidatePath(here);
  revalidatePath("/closes");
  back("Closed. The position is finished and nothing of it is left running.");
}

/** Close a position by hand, when none of the clocks did it (step 12). */
export async function openCloseByHand(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = "/positions/" + positionId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;
  if (!row.openingTaId) back("TA has not confirmed this opening yet, so there is nothing to close there.");

  const trigger = String(formData.get("trigger") ?? "client_stopped");
  if (!(trigger in CLOSE_TRIGGERS)) back("Why is it closing?");

  const checklist = await openCloseChecklist(row.openingTaId ?? "", trigger, member.id);
  revalidatePath(here);
  redirect(
    checklist
      ? "/closes/" + checklist.id + "?msg=" + encodeURIComponent("The close list is open. Nothing closes until every item is ticked.")
      : landed(formData, here, "Nothing to close."),
  );
}

/* ── The first-day import (15, Phase 8 step 11) ───────────────── */

/**
 * Import a sheet: a dry run first, then for real.
 *
 * The same code builds both, so what you read in the dry run is what lands.
 * Nothing is written until the file has been looked at, and running a file
 * twice adds nothing - every row is recognised by its own key.
 */
export async function runImport(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = (msg: string) => redirect("/import?msg=" + encodeURIComponent(msg));
  // The role list, the client list and the holidays are the ops lead's.
  if (!can(member, "settings.manage")) back(refusal("settings.manage"));

  const kind = String(formData.get("kind") ?? "") as ImportKind;
  if (!(kind in IMPORT_KINDS)) back("What is being imported?");
  const text = String(formData.get("sheet") ?? "");
  if (!text.trim()) back("Paste the sheet first, header row and all.");
  const forReal = String(formData.get("forReal") ?? "") === "yes";

  const db = await desk();
  const existing =
    kind === "clients"
      ? db.clients.map((c) => c.taClientId)
      : kind === "holidays"
        ? db.holidays.map((h) => h.date)
        : db.members.map((m) => m.email);
  const plan = planImport(kind, text, existing.filter(Boolean) as string[]);

  if (!forReal) {
    // The dry run writes nothing at all; it only says what it would do.
    back(
      "Dry run: " +
        planInWords(plan) +
        (plan.problems.length
          ? ". " + plan.problems.map((p) => "line " + p.line + ": " + p.what).join(" ")
          : ". Nothing is wrong with it - run it for real when you are ready."),
    );
  }

  const problem = problemWithImport(plan, true);
  if (problem) back(problem);

  let added = 0;
  if (kind === "holidays") {
    added = await addHolidays(
      plan.toAdd.map((row) => ({ date: row.values.date, name: row.values.name })),
      member.id,
    );
  }
  if (kind === "members") {
    for (const row of plan.toAdd) {
      await addMember(
        {
          name: row.values.name,
          email: row.values.email,
          role: row.values.role as OpsMember["role"],
          active: true,
          taUserId: null,
        },
        member.id,
      );
      added += 1;
    }
  }
  if (kind === "clients") {
    for (const row of plan.toAdd) {
      const owner = db.members.find((m) => m.email.toLowerCase() === (row.values.owneremail ?? "").toLowerCase());
      await addClient({
        leadId: null,
        taClientId: row.values.taclientid,
        name: row.values.company,
        nameKey: row.values.company.trim().toLowerCase(),
        stage: row.values.stage || "active",
        billingName: row.values.billingname ?? "",
        billingEmail: row.values.billingemail ?? "",
        billingAddress: "",
        groupName: "",
        // An owner we cannot match is the ops lead's to sort out, so the
        // record says so instead of looking as though it was meant.
        notes: owner
          ? "Imported on the first day."
          : "Imported on the first day. No ops person matched " +
            (row.values.owneremail || "the owner column") +
            ", so this one is the ops lead's until somebody takes it.",
        reason: null,
        ownerId: owner?.id ?? member.id,
      });
      added += 1;
    }
  }

  revalidatePath("/import");
  back(
    added +
      (added === 1 ? " row added" : " rows added") +
      ", " +
      plan.already.length +
      " already here" +
      (plan.problems.length ? ", " + plan.problems.length + " left for the sheet to be fixed" : "") +
      ".",
  );
}

/* ── TopJobs (15, Phase 3 steps 12 and 13) ────────────────────── */

/** A TA or the owner asks for the paid advert. */
export async function requestAd(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "");
  const here = "/positions/" + positionId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "advert.manage")) back("TopJobs is for ops or marketing.");
  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) redirect("/positions?msg=" + encodeURIComponent("That position is gone."));
  const row = position as NonNullable<typeof position>;
  if (!row.openingTaId) back("TA has not confirmed this opening yet.");
  if (liveAdFor(db, row.openingTaId ?? "")) back("There is already a TopJobs advert on the go for this one.");

  const kind = String(formData.get("kind") ?? "");
  const problem = problemWithAdRequest(row.title, kind);
  if (problem) back(problem);

  const now = Date.now();
  const ad = await addAd({
    channel: "topjobs",
    openingTaId: row.openingTaId ?? "",
    positionId: row.id,
    clientId: row.clientId,
    title: row.title,
    state: "requested",
    kind,
    cost: null,
    flyerFileId: null,
    applyAlias: null,
    orderMessageId: null,
    requestedAt: now,
    orderedAt: null,
    liveAt: null,
    closesAt: null,
    closedAt: null,
    cvCount: null,
    reason: null,
    ownerId: row.ownerId,
  });

  // TA routes an apply address for this advert, so a CV that comes in through
  // TopJobs is filed by TA with the source known. No CV passes through Ops.
  await queueTaWrite(
    "/integrations/v1/openings/" + row.openingTaId + "/posts",
    { channel: "portal", source: "topjobs", requestedAt: now },
    { type: "ad", id: ad.id },
  );
  await createTask({
    kind: "record",
    title: "A flyer for TopJobs: " + row.title,
    body:
      "TopJobs takes an image, not a job description (the owner's note). Marketing makes the flyer, it is kept on the Files screen, and then the order can go.\n\n" +
      (kind === "hr_and_marketing"
        ? "The HR and marketing advert: LKR 12,700 on the board."
        : "The single advert: LKR 5,400 on the board."),
    assigneeId: db.members.find((m) => m.active && m.role === "marketing")?.id ?? row.ownerId,
    dueAt: now,
    subjectType: "ad",
    subjectId: ad.id,
    link: "/adverts/" + ad.id,
  });
  revalidatePath("/adverts");
  redirect("/adverts/" + ad.id + "?msg=" + encodeURIComponent("Asked for. Marketing has the flyer to make."));
}

/** Marketing's flyer is ready and kept on the Files screen. */
export async function recordAdFlyer(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const adId = String(formData.get("adId") ?? "");
  const here = "/adverts/" + adId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "advert.manage")) back("TopJobs is for ops or marketing.");
  const db = await desk();
  const ad = adIn(db, adId);
  if (!ad) redirect("/adverts?msg=" + encodeURIComponent("That advert is gone."));
  const row = ad as NonNullable<typeof ad>;

  const fileId = String(formData.get("flyerFileId") ?? "").trim() || null;
  const problem = problemWithFlyer(fileId);
  if (problem) back(problem);
  if (!canMoveAdTo(row.state as AdState, "flyer")) back("That advert is past the flyer.");

  await patchAd(adId, { flyerFileId: fileId, state: "flyer" }, member.id, "ad.flyerReady", null);
  revalidatePath(here);
  back("The flyer is on it. The order to TopJobs can go now.");
}

/** The order to TopJobs: a drafted email with the flyer on it. */
export async function orderAd(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const adId = String(formData.get("adId") ?? "");
  const here = "/adverts/" + adId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "advert.manage")) back("TopJobs is for ops or marketing.");
  const db = await desk();
  const ad = adIn(db, adId);
  if (!ad) redirect("/adverts?msg=" + encodeURIComponent("That advert is gone."));
  const row = ad as NonNullable<typeof ad>;

  const to = interviewersFrom(String(formData.get("to") ?? ""));
  const cost = Number(formData.get("cost") ?? 0);
  const alias = String(formData.get("applyAlias") ?? "").trim() || null;
  const problem = problemWithAdOrder(row.flyerFileId, to, cost);
  if (problem) back(problem);
  if (!canMoveAdTo(row.state as AdState, "ordered")) back("That advert cannot be ordered from where it is.");

  const client = row.clientId ? clientIn(db, row.clientId) : null;
  const wording = templateFor(db, "topjobs.order");
  const fill = (text: string) =>
    text
      .replace(/\{\{position\}\}/g, row.title)
      .replace(/\{\{client\}\}/g, client?.name ?? "our client")
      .replace(/\{\{applyAlias\}\}/g, alias ?? "the address on the flyer")
      .replace(/\{\{opsPerson\}\}/g, member.name);

  const message = await draftMessage({
    channel: "email",
    to,
    subject: fill(wording?.subject ?? "Advert order: {{position}}"),
    body: fill(
      wording?.body ??
        "Dear TopJobs,\n\nPlease run the attached advert for {{position}}. Applications to {{applyAlias}}.\n\nKind regards\n{{opsPerson}}\nCareer 141",
    ),
    templateKey: "topjobs.order",
    subjectType: "ad",
    subjectId: adId,
    attachmentFileIds: row.flyerFileId ? [row.flyerFileId] : [],
  });

  await patchAd(
    adId,
    { state: "ordered", cost, applyAlias: alias, orderedAt: Date.now(), orderMessageId: message.id },
    member.id,
    "ad.ordered",
    money(cost, "LKR"),
  );
  revalidatePath(here);
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent("The order is drafted with the flyer attached. Read it, then approve it."),
  );
}

/** TopJobs says it is live, which starts the two weeks. */
export async function markAdLive(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const adId = String(formData.get("adId") ?? "");
  const here = "/adverts/" + adId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "advert.manage")) back("TopJobs is for ops or marketing.");
  const db = await desk();
  const ad = adIn(db, adId);
  if (!ad) redirect("/adverts?msg=" + encodeURIComponent("That advert is gone."));
  const row = ad as NonNullable<typeof ad>;

  const at = Date.parse(String(formData.get("liveAt") ?? "") + "T09:00:00+05:30");
  const problem = problemWithAdLive(at, row.orderedAt);
  if (problem) back(problem);
  if (!canMoveAdTo(row.state as AdState, "live")) back("That advert is not waiting to go live.");

  const closesAt = adClosesOn(at, numberOf(db, "ad.days", AD_DAYS));
  const now = Date.now();
  await patchAd(adId, { state: "live", liveAt: at, closesAt }, member.id, "ad.live", null);
  await startTimer({
    kind: "ad.close",
    subjectType: "ad",
    subjectId: adId,
    startsAt: now,
    dueAt: closesAt,
    warnAt: null,
    ownerId: row.ownerId,
    payload: { label: row.title },
  });
  // TA records the advert channel on its own opening, which is what makes the
  // CV counts and the "where did this come from" answer true on their side.
  await queueTaWrite(
    "/integrations/v1/openings/" + row.openingTaId + "/ad-channel",
    { channel: "topjobs", state: "live", liveAt: at, closesAt, cost: row.cost, applyAlias: row.applyAlias },
    { type: "ad", id: adId },
  );
  revalidatePath(here);
  back("Live, and the TA System has been told. It comes down in two weeks; a clock will ask.");
}

/** It has come down. */
export async function markAdClosed(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const adId = String(formData.get("adId") ?? "");
  const here = "/adverts/" + adId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "advert.manage")) back("TopJobs is for ops or marketing.");
  const db = await desk();
  const ad = adIn(db, adId);
  if (!ad) redirect("/adverts?msg=" + encodeURIComponent("That advert is gone."));
  const row = ad as NonNullable<typeof ad>;
  if (!canMoveAdTo(row.state as AdState, "closed")) back("That advert is not live.");

  const cvCount = Number(formData.get("cvCount") ?? NaN);
  const now = Date.now();
  await patchAd(
    adId,
    { state: "closed", closedAt: now, cvCount: Number.isFinite(cvCount) ? cvCount : row.cvCount },
    member.id,
    "ad.closed",
    null,
  );
  await cancelClocksFor(db, "ad", adId, member.id, "The advert has come down.", null);
  await queueTaWrite(
    "/integrations/v1/openings/" + row.openingTaId + "/ad-channel",
    { channel: "topjobs", state: "closed", closedAt: now, cvCount: Number.isFinite(cvCount) ? cvCount : null },
    { type: "ad", id: adId },
  );
  revalidatePath(here);
  back(
    "Closed, and the TA System has been told." +
      (Number.isFinite(cvCount) ? " " + cvCount + " CVs against it, which is what judges the next one." : ""),
  );
}

/** Dropped before it ran - a reason, like everything else that stops. */
export async function dropAd(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const adId = String(formData.get("adId") ?? "");
  const here = "/adverts/" + adId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "advert.manage")) back("TopJobs is for ops or marketing.");

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 4) back("Write why it is not running.");
  const db = await desk();
  const ad = adIn(db, adId);
  if (!ad) redirect("/adverts?msg=" + encodeURIComponent("That advert is gone."));
  if (!canMoveAdTo(ad.state as AdState, "dropped")) back("That advert is already live or closed.");

  await patchAd(adId, { state: "dropped", reason }, member.id, "ad.dropped", reason);
  await cancelClocksFor(db, "ad", adId, member.id, "The advert was dropped.", null);
  revalidatePath(here);
  back("Dropped, with your reason. Nothing was ordered.");
}

/* ── The unreported hire, and credit notes (15, Phase 6 steps 15 and 16) ─ */

/** Somebody in a set was hired and nobody told us. */
export async function confirmUnreportedHire(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  // Back to the page the form was on (18 Nov: from the unreported-hires page a refusal landed on the set).
  const here = backTo(formData, "/sets/" + setId);
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const who = String(formData.get("candidateName") ?? "").trim();
  const salary = Number(formData.get("monthlySalary") ?? 0);
  const hiredStartDate = String(formData.get("hiredStartDate") ?? "").trim() || null;
  if (!who) back("Which candidate were they?");
  if (!Number.isFinite(salary) || salary <= 0) {
    back("What are they being paid a month? The surcharge is a share of the fee, so a number is needed - the requirement's salary if nobody knows better.");
  }

  const answer = await draftSurchargeInvoice(setId, who, salary, member.id, Date.now(), hiredStartDate);
  revalidatePath(here);
  revalidatePath("/invoices");
  if (!answer.ok) back(answer.what);
  // Asked and answered: the three-month question stops (18 Nov: only "dismiss" stopped it).
  await cancelClocksFor(await desk(), "clientSet", setId, member.id, "They hired from it; the surcharge is drafted.", ["hire.unreported"]);
  redirect("/invoices/" + answer.invoiceId + "?msg=" + encodeURIComponent(answer.what + " Read it before it goes."));
}

/** We were wrong, or the client explained it: no surcharge. */
export async function dismissUnreportedHire(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const here = "/sets/" + setId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 4) back("Write what they said, or how we know. This one is read if it comes up again.");
  const db = await desk();
  await patchClientSet(setId, {}, member.id, "clientSet.unreportedDismissed", reason);
  await cancelClocksFor(db, "clientSet", setId, member.id, "Asked and answered.", ["hire.unreported"]);
  revalidatePath(here);
  back("Noted, and nothing is invoiced. The three-month question is closed for this set.");
}

/** A credit note: a refund under the guarantee, or a correction. */
export async function raiseCreditNote(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const here = "/invoices/" + invoiceId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "money.manage")) back(refusal("money.manage"));

  const amount = Number(formData.get("amount") ?? 0);
  // The form's field is "reason" (18 Nov: this read "why", so every credit note was refused as having no reason).
  const why = String(formData.get("reason") ?? formData.get("why") ?? "").trim();
  const db = await desk();
  const against = invoiceIn(db, invoiceId);
  if (!against) back("That invoice is gone.");
  if (!Number.isFinite(amount) || amount <= 0) back("How much is being credited?");
  if (amount > (against as NonNullable<typeof against>).amount + 0.5) {
    back("That is more than the invoice itself. Credit the invoice, not more than it.");
  }
  if (why.length < 4) back("Write why. A credit note with no reason is the one the auditor asks about.");

  const answer = await draftCreditNote(invoiceId, amount, why, member.id);
  revalidatePath(here);
  revalidatePath("/invoices");
  if (!answer.ok) back(answer.what);
  redirect("/invoices/" + answer.invoiceId + "?msg=" + encodeURIComponent(answer.what + " Read it before it goes."));
}

/* ── The AI layer (15, Phase 9) ───────────────────────────────── */

/**
 * Dictation into the requirement's fields (steps 5 to 7).
 *
 * The speaking itself is the browser's own: no model, no key, no cost. What
 * comes here is the text it heard, and the model's only job is to put it into
 * our fields - leaving empty what was not said, and saying which those were.
 * Nothing is saved: the fields are filled in on the screen for a person to
 * correct and then press save.
 */
export async function dictateRequirement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(leadBack(here, "requirement", msg, formData));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const said = String(formData.get("said") ?? "").trim();
  if (said.length < 20) back("Nothing was dictated. Hold the microphone and say the brief, then press this.");

  const answer = await runAi<DictatedRequirement>(
    "dictate.fields",
    dictateRequirementPrompt(said),
    member.id,
    { type: "lead", id: leadId },
    ["what was dictated"],
  );
  if (!answer.proposal.ok || !answer.proposal.data) {
    back(answer.problem ?? "Nothing came back. Type it in instead; the fields are below.");
  }
  const got = answer.proposal.data as DictatedRequirement;
  // The proposal goes back on the URL, so the fields are filled in and a
  // person corrects them before anything is saved.
  redirect(
    here +
      "?step=requirement&runId=" +
      encodeURIComponent(answer.runId ?? "") +
      "&proposed=" +
      encodeURIComponent(JSON.stringify(got)) +
      "&msg=" +
      encodeURIComponent(
        "Filled in from what you said. Read every field before you save it." +
          (notSaidInWords(got.notSaid ?? "" ? got.notSaid : []) ? " " + notSaidInWords(got.notSaid) : ""),
      ),
  );
}

/**
 * The requirement from a Teams call's transcript (17 Nov, supervisor review).
 *
 * Reads the transcript Microsoft kept of a held meeting, keeps it as a file,
 * and has the model propose the requirement fields from what the client said.
 * Nothing is saved: the fields are filled in on the screen for a person to
 * check, exactly as with dictation. A meeting has a transcript only if somebody
 * started transcription in it.
 */
export async function readRequirementFromCall(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const meetingId = String(formData.get("meetingId") ?? "");
  const db = await desk();
  const meeting = meetingIn(db, meetingId);
  const leadId = meeting?.leadId ?? "";
  const here = "/leads/" + leadId + "?view=requirement";
  const back = (msg: string) => redirect(here + "&msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!meeting) redirect("/leads?msg=" + encodeURIComponent("That meeting is gone."));
  const row = meeting as NonNullable<typeof meeting>;

  if (!teamsFake() && !switchedOn(db, "switch.transcriptsEnabled")) {
    back("Reading call transcripts is switched off in Settings (switch.transcriptsEnabled).");
  }
  const organiser = db.members.find((m) => m.id === row.organiserId);
  if (!row.joinUrl || !organiser || !row.graphEventId) {
    back("This meeting was not made by Ops, so there is no Teams meeting to read a transcript from.");
  }
  const got = await fetchTranscript((organiser as NonNullable<typeof organiser>).email, row.joinUrl as string);
  if (!got.ok) back(got.reason);
  const text = vttToText((got as { ok: true; vtt: string }).vtt);
  if (text.length < 40) back("The transcript is empty. Was transcription started in the meeting?");

  // Kept as the source of what was proposed: a requirement can be asked about a year on.
  const bytes = new TextEncoder().encode((got as { ok: true; vtt: string }).vtt);
  const name = "transcript-" + colomboDate(row.at) + ".vtt";
  const key = keyFor("meeting_transcript", "meeting", row.id, name);
  await putBytes(key, bytes, "text/vtt");
  await addFile({
    kind: "meeting_transcript",
    key,
    name,
    size: bytes.byteLength,
    mime: "text/vtt",
    sha256: sha256(bytes),
    subjectType: "meeting",
    subjectId: row.id,
    madeFrom: null,
    uploadedBy: member.id,
  });

  const answer = await runAi<DictatedRequirement>(
    "dictate.fields",
    transcriptRequirementPrompt(trimForAi(text)),
    member.id,
    { type: "lead", id: leadId },
    ["the call transcript"],
  );
  if (!answer.proposal.ok || !answer.proposal.data) {
    back(answer.problem ?? "Nothing came back. The transcript is kept; type the fields in instead.");
  }
  const proposed = answer.proposal.data as DictatedRequirement;
  redirect(
    here +
      "&runId=" +
      encodeURIComponent(answer.runId ?? "") +
      "&proposed=" +
      encodeURIComponent(JSON.stringify(proposed)) +
      "&msg=" +
      encodeURIComponent(
        "Filled in from the call's transcript. Read every field before you save it." +
          (proposed.notSaid?.length ? " " + notSaidInWords(proposed.notSaid) : ""),
      ),
  );
}

/** Improve a draft we already wrote (step 9). */
export async function improveDraft(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const messageId = String(formData.get("messageId") ?? "");
  const here = "/messages/" + messageId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "message.approve")) back(refusal("message.approve"));
  const db = await desk();
  const message = db.messages.find((m) => m.id === messageId);
  if (!message) redirect("/?msg=" + encodeURIComponent("That message is gone."));
  if (!needsApproval(message)) back("That message has gone already.");

  const how = String(formData.get("how") ?? "rewrite") as ImproveHow;
  if (!(how in IMPROVE_WORDS)) back("Improve it how?");

  const answer = await runAi<ImprovedDraft>(
    "draft.improve",
    improveDraftPrompt(message.subject, message.body, how),
    member.id,
    { type: "message", id: messageId },
    ["the draft itself"],
  );
  if (!answer.proposal.ok || !answer.proposal.data) back(answer.problem ?? "Nothing came back; the draft is unchanged.");
  const got = answer.proposal.data as ImprovedDraft;

  // The draft is not replaced: the new words are offered beside it, and the
  // person presses use it. Nothing a model wrote goes out unseen.
  redirect(
    here +
      "?runId=" +
      encodeURIComponent(answer.runId ?? "") +
      "&proposed=" +
      encodeURIComponent(JSON.stringify(got)) +
      "&msg=" +
      encodeURIComponent(IMPROVE_WORDS[how] + ": read it, then use it or ignore it."),
  );
}

/** Use the improved draft, or leave it. Either way it is recorded. */
export async function useImprovedDraft(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const messageId = String(formData.get("messageId") ?? "");
  const here = "/messages/" + messageId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "message.approve")) back(refusal("message.approve"));

  const runId = String(formData.get("runId") ?? "");
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");
  const use = String(formData.get("use") ?? "") === "yes";

  if (!use) {
    if (runId) await recordAiOutcome(runId, "ignored", null, member.id);
    back("Left as it was.");
  }
  await editMessage(messageId, { subject, body }, member.id);
  if (runId) {
    // What was really saved is kept beside what was proposed: that is the
    // accuracy sample, and it is why "edited" is a different outcome.
    const db = await desk();
    const run = aiRunIn(db, runId);
    const proposed = (run?.proposed ?? null) as ImprovedDraft | null;
    const same = proposed && proposed.subject === subject && proposed.body === body;
    await recordAiOutcome(runId, same ? "used" : "edited", { subject, body }, member.id);
  }
  revalidatePath(here);
  back("Saved. It still waits for you to approve it before it goes.");
}

/**
 * Read what a client sent (step 8).
 *
 * The reader proposes what the email means - decisions per candidate in the
 * client's own words, times offered, a claim, a cancellation - and leaves a
 * person to confirm it. It decides nothing: the owner's rule is that a
 * rejection carries the client's wording, and this is how that wording gets
 * in without being retyped.
 */
export async function readInbound(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const inboundId = String(formData.get("inboundId") ?? "");
  const here = backTo(formData, "/mail");
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const mail = db.inbound.find((m) => m.id === inboundId);
  if (!mail) back("That email is gone.");
  const row = mail as NonNullable<typeof mail>;

  const set = row.subjectType === "clientSet" && row.subjectId ? clientSetIn(db, row.subjectId) : null;
  const about = set ? set.name : (row.subjectType ?? "an email nobody has matched yet");
  const candidates = set ? set.candidates.map((c) => c.name) : [];

  const answer = await runAi<InboundRead>(
    "inbound.read",
    inboundReadPrompt(row.body, about, candidates),
    member.id,
    { type: "inbound", id: inboundId },
    [about],
  );
  if (!answer.proposal.ok || !answer.proposal.data) back(answer.problem ?? "Nothing came back. Read it yourself.");
  const got = answer.proposal.data as InboundRead;

  await createTask({
    kind: "approve",
    title: "Confirm what the client said: " + about,
    body:
      got.summary +
      "\n\n" +
      (got.decisions ?? [])
        .map((d) => "- " + d.name + ": " + d.decision + ' ("' + d.theirWords + '")')
        .join("\n") +
      ((got.slots ?? []).length ? "\n\nTimes offered: " + got.slots.join("; ") : "") +
      "\n\nNothing has been recorded. Open the set and confirm each one - the words above are theirs, so they can be" +
      " used as the reason.",
    assigneeId: set?.ownerId ?? member.id,
    dueAt: Date.now(),
    subjectType: set ? "clientSet" : "inbound",
    subjectId: set?.id ?? inboundId,
    link: set ? "/sets/" + set.id : "/mail",
  });
  revalidatePath(here);
  back(
    "Read: " +
      got.summary +
      " A task is on the list to confirm it. Nothing has been recorded yet." +
      (notSaidInWords(got.notSaid ?? []) ? " " + notSaidInWords(got.notSaid ?? []) : ""),
  );
}

/** Summarise a client's history (step 11). */
export async function summariseClient(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const clientId = String(formData.get("clientId") ?? "");
  const here = "/clients/" + clientId;
  const back = (msg: string) => redirect(landed(formData, here, msg));
  if (!can(member, "report.read")) back(refusal("report.read"));
  const db = await desk();
  const client = clientIn(db, clientId);
  if (!client) back("That client is gone.");
  const row = client as NonNullable<typeof client>;

  // Only what this person could read anyway, and only what the task needs
  // (step 18): the states and the dates, not the documents.
  const rows: string[] = [];
  rows.push("Client: " + row.name + ", " + row.stage + ", owned by " + (deskMember(db, row.ownerId)?.name ?? "nobody"));
  for (const esa of db.agreements.filter((a) => a.leadId === row.leadId)) {
    rows.push("Agreement: " + esa.state + ", version " + esa.version + (esa.signedAt ? ", signed" : ", not signed"));
  }
  for (const position of db.positions.filter((p) => p.clientId === row.id)) {
    rows.push("Position: " + position.title + ", " + position.stage + (position.depthStage ? ", " + position.depthStage : ""));
  }
  for (const set of db.clientSets.filter((s) => s.clientId === row.id)) {
    rows.push(
      "Set " + set.setNumber + ": " + set.state + ", " + set.candidates.length + " CVs, " +
        set.candidates.filter((c) => c.decision).length + " decided",
    );
  }
  for (const invoice of db.invoices.filter((i) => i.clientId === row.id)) {
    rows.push("Invoice " + invoice.number + ": " + invoice.state + ", " + money(invoice.amount, invoice.currency));
  }
  for (const hold of db.holds.filter((h) => h.clientId === row.id)) {
    rows.push("Hold: " + hold.state + (hold.reason ? ", " + hold.reason : ""));
  }

  const answer = await runAi<Summary>(
    "summarise",
    summarisePrompt(row.name, rows),
    member.id,
    { type: "client", id: clientId },
    [rows.length + " rows of this client's own record"],
  );
  if (!answer.proposal.ok || !answer.proposal.data) back(answer.problem ?? "Nothing came back.");
  const got = answer.proposal.data as Summary;
  redirect(
    here +
      "?runId=" +
      encodeURIComponent(answer.runId ?? "") +
      "&summary=" +
      encodeURIComponent(JSON.stringify(got)) +
      "&msg=" +
      encodeURIComponent("Summarised from " + rows.length + " of their own rows."),
  );
}

/**
 * The ask box (step 13).
 *
 * Read-only: it answers from the desk's own rows, inside what this person
 * could read anyway, and names what it used. It runs nothing, writes nothing
 * and never touches money - the box that *does* things is step 14 and is not
 * built, on purpose.
 */
export async function askTheDesk(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const question = String(formData.get("question") ?? "").trim();
  const back = (msg: string) => redirect(landed(formData, "/ai", msg));
  if (!can(member, "inbox.read")) back(refusal("inbox.read"));
  if (question.length < 5) back("What is the question?");

  const db = await desk();
  // The rows it may use: counts and states, never a document's text.
  const rows = [
    "Today is " + colomboDate(Date.now()) + " in Colombo.",
    "Leads: " + db.leads.length + ", of which " + db.leads.filter((l) => l.state !== "closed").length + " open.",
    "Clients: " + db.clients.map((c) => c.name + " (" + c.stage + ")").join("; "),
    "Positions: " + db.positions.map((p) => p.title + " (" + p.stage + ")").join("; "),
    "Sets: " + db.clientSets.map((s) => s.name + " (" + s.state + ")").join("; "),
    "Interviews: " + db.interviews.map((i) => i.candidateName + " (" + i.state + ")").join("; "),
    "Placements: " + db.placements.map((p) => p.candidateName + " (" + p.state + ")").join("; "),
    "Invoices: " + db.invoices.map((i) => i.number + " " + i.state + " " + money(i.amount, i.currency)).join("; "),
    "Guarantees: " + db.guarantees.map((g) => g.candidateName + " (" + g.state + ")").join("; "),
    "Open tasks for this person: " + openTasksFor(db, member.id).map((t) => t.title).join("; "),
  ];

  const answer = await runAi<Answer>("ask", askPrompt(question, rows), member.id, null, ["the desk's own rows"]);
  if (!answer.proposal.ok || !answer.proposal.data) back(answer.problem ?? "Nothing came back.");
  const got = answer.proposal.data as Answer;
  redirect(
    "/ai?asked=" +
      encodeURIComponent(question) +
      "&answer=" +
      encodeURIComponent(JSON.stringify(got)) +
      "&runId=" +
      encodeURIComponent(answer.runId ?? ""),
  );
}

/** Used it, or did not: the accuracy sample (step 16). */
export async function recordAiUse(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const runId = String(formData.get("runId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const back = String(formData.get("back") ?? "/ai");
  if (!["used", "edited", "ignored"].includes(outcome)) redirect(back);
  if (runId) await recordAiOutcome(runId, outcome, null, member.id);
  redirect(back + (back.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent("Noted. It is in the AI record."));
}

/**
 * Quick-add from anywhere (7 Nov, UX order 5).
 *
 * A call, a note or an enquiry from the sidebar, saved through the same
 * writes the full screens use, and the person sent back to the page they
 * were standing on with the three-second line. Nothing new is stored: a
 * call is the call log, an enquiry is a lead, and a note is a task to
 * yourself due the next nine in the morning.
 *
 * A refusal comes back as the same line, because the sidebar has no banner
 * of its own and the browser already refused the empty fields before the
 * form was sent. The server's rule is the backstop, not the first check.
 */
export async function quickAdd(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = backTo(formData, "/");
  const said = (line: string) => redirect(back + confirmed(line, back));
  const kind = String(formData.get("kind") ?? "") as QuickKind;
  if (!(QUICK_KINDS as readonly string[]).includes(kind)) said("Not saved: that is not a thing the desk keeps.");

  const db = await desk();
  const client = clientNamed(String(formData.get("about") ?? ""), db.clients);
  const about = client ? { subjectType: "client", subjectId: client.id, link: "/clients/" + client.id } : null;

  if (kind === "call") {
    if (!can(member, "task.do")) said("Not saved: " + refusal("task.do"));
    const input = {
      to: String(formData.get("to") ?? "").trim(),
      spokeTo: String(formData.get("spokeTo") ?? "").trim(),
      outcome: String(formData.get("outcome") ?? "").trim(),
    };
    const problem = problemWithCall(input);
    if (problem) said("Not saved: " + problem);
    await logCall({
      taskId: null,
      to: tidyPhone(input.to) ?? input.to,
      toName: client?.name ?? "",
      purpose: "other",
      spokeTo: input.spokeTo,
      outcome: input.outcome,
      subjectType: about?.subjectType ?? null,
      subjectId: about?.subjectId ?? null,
      by: member.id,
    });
    revalidatePath("/calls");
    said("Written down." + (client ? " Filed under " + client.name + "." : ""));
  }

  if (kind === "note") {
    const text = String(formData.get("text") ?? "");
    const problem = problemWithNote(text);
    if (problem) said("Not saved: " + problem);
    await createTask(noteToTask(text, member.id, Date.now(), about));
    revalidatePath("/");
    said("Kept. It is on Your day tomorrow morning." + (client ? " Filed under " + client.name + "." : ""));
  }

  // An enquiry: the same lead as /leads, with its two checks waiting on its page.
  if (!can(member, "client.manage")) said("Not saved: " + refusal("client.manage"));
  const input = {
    company: String(formData.get("company") ?? "").trim(),
    contactName: String(formData.get("contactName") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    contactPhone: String(formData.get("contactPhone") ?? "").trim(),
    source: String(formData.get("source") ?? "call"),
  };
  const problem = problemWithNewLead(input);
  if (problem) said("Not saved: " + problem);
  const flag = flagIndustry({ company: input.company, industry: "", website: "", notes: "" });
  const lead = await addLead({
    ...input,
    nameKey: nameKey(input.company),
    industry: "",
    website: "",
    notes: "",
    industryFlagged: flag.flagged,
    industryBecause: flag.because,
    industryConfirmedBy: null,
    state: "new",
    reason: null,
    doNotInvite: false,
    clientTaId: null,
    ownerId: member.id,
    createdBy: member.id,
  });
  revalidatePath("/leads");
  // A company we already know goes straight to the check that decides it (package D, 19 Nov).
  const known = duplicateMatch(input.company, db.clients.map((c) => ({ id: c.id, name: c.name, nameKey: c.nameKey, esaSignedAt: null })));
  if (known.exact || known.near.length) redirect("/leads?panel=duplicate-check&on=" + lead.id);
  said("Saved. " + input.company + " is on the leads list with its two checks waiting.");
}

/**
 * Why today's first thing is first, in the model's one line (8 Nov, UX
 * order 6; Phase 9 step 12).
 *
 * The order is the rules' and is already on the screen before this is
 * pressed. The model is handed the first thing and the rest and asked only
 * why; it cannot reorder anything. It runs from a press, never from a
 * render (the 3 Nov rule), and is kept per person, day and first thing, so
 * the second visit reads the same line for nothing.
 */
export async function explainFirst(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const now = Date.now();
  const db = await desk();
  const day = whatFirst(dayItems(db, member.id, now));
  if (!day) redirect("/" + confirmed("Nothing is waiting, so there is nothing to put first."));
  const key = whatFirstKey(member.id, colomboDate(now), day.first);
  if (whyFirstKept(db, key)) redirect("/");
  const answer = await runAi<WhyFirst>(
    "whatfirst",
    whyFirstPrompt(day.first.said, day.others.map((o) => o.said), colomboDateInWords(now)),
    member.id,
    { type: "whatfirst", id: key },
    [day.others.length + 1 + " things on your day, in the rules' order"],
    now,
  );
  revalidatePath("/");
  redirect("/" + (answer.problem ? confirmed("No line: " + answer.problem) : ""));
}

/* ── The desk assistant (8 Nov, docs/31) ───────────────────────── */

/**
 * The actions the chat may press, by name. The type is the catalogue's own
 * list, so adding an intent that names an action not here fails to compile
 * rather than failing at three in the afternoon.
 */
const RUNNABLE: Record<Runnable, (fd: FormData) => Promise<void>> = {
  approveAndSend,
  approveAllRoutine,
  markMailDone,
  fileThisMail,
  finishTask,
  recordCall,
  quickAdd,
  writeNewMessage,
  recordPayment,
  sendInvoice,
  readMailNow,
  runClocksNow,
  closeLead,
  startAgreement,
  sendAgreement,
  draftNextChase,
  recordChangesWanted,
  declineAgreement,
  moveClientStage,
  moveClientOwner,
  recordLinkedInPost,
  reviewClientSet,
  sendClientSet,
  recordSetReceived,
  recordClientDecision,
  approveTheHold,
  liftTheHold,
  requestInterviewSlots,
  recordInterviewSlots,
  recordCandidatePick,
  recordClientBooking,
  bookInterview,
  markInterviewAttendance,
  recordCandidateOut,
  cancelInterview,
  recordRoundDecision,
  requestReference,
  markJoined,
  markNoShow,
  recordNoShowChoice,
  changeJoinDate,
  cancelPlacement,
  markInvoiceDisputed,
  writeOffInvoice,
  raiseCreditNote,
  recordLeaver,
  decideRefund,
  markRefunded,
  completeClose,
  requestAd,
  markAdLive,
  markAdClosed,
  dropAd,
  buildWeeklyReportNow,
  approveWeeklyReport,
  compileTalentPulseNow,
  summariseClient,
  createLead,
  assignLeadOwner,
  bookIntroCall,
  bookRequirementMeeting,
  handOverToTa,
};

/**
 * What a person typed, turned into one line and a button (or a question,
 * or a refusal). The person's row is written before the model is asked, so
 * the thread shows what was said even when the model is slow or down. A
 * question goes the ask box's way and the answer comes back as a line.
 */
export async function chatSay(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = backTo(formData, "/chat");
  if (!can(member, "inbox.read")) redirect(back + confirmed("Not allowed: " + refusal("inbox.read")));
  const said = String(formData.get("text") ?? "").trim();
  if (!said) redirect(back);
  const now = Date.now();
  // The chat it goes into (9 Nov): the one open, or a new one named from these words.
  const jar = await cookies();
  // From AURA's composer on My Work (13 Nov): open the column, so the answer
  // is beside the page rather than somewhere the person has to go and find.
  if (formData.get("openColumn") === "1") {
    jar.set("ops_chat_open", "1", { path: "/", sameSite: "lax", maxAge: 365 * 24 * 60 * 60 });
  }
  const before = await desk();
  let thread = chatOpen(before, member.id, jar.get(CHAT_COOKIE)?.value);
  if (thread === null) {
    thread = (await addChatThread({ memberId: member.id, name: chatName(said), at: now })).id;
    jar.set(CHAT_COOKIE, thread, CHAT_COOKIE_LIFE);
  } else if (before.chatThreads.find((t) => t.id === thread)?.name === "New chat") {
    await renameChatThread(thread, chatName(said));
  }
  await addChatRow({ thread, memberId: member.id, who: "person", text: said, buttons: [], state: "said", actionName: null, runId: null, at: now });

  let db = await desk();
  const mine = chatLines(db, member.id, thread, 50);
  const lastDesk = [...mine].reverse().find((r) => r.who === "desk");

  // The editable plan (9 Nov): "change reason to …" against the proposal
  // still waiting is that one line changed, the same intent resolved again
  // by the same rules - no model, and the old plan kept, marked replaced.
  const plan = lastDesk?.state === "proposed" ? planFrom(lastDesk.actionName) : null;
  const edit = plan && lastDesk ? editFrom(said, lastDesk.buttons[0]?.shows ?? []) : null;
  if (plan && edit && lastDesk) {
    await updateChatRow(lastDesk.id, { state: "said", actionName: null });
    const resolved = resolveIntent(withEdit(plan, edit), db, member, now);
    await sayResolved(member.id, thread, resolved.kind === "question" ? { kind: "refuse", said: "That edit reads as a question. Say the new value." } : resolved, lastDesk.runId);
    revalidatePath(back);
    redirect(back);
  }

  // A proposal nobody pressed, now that they have typed something else, is
  // the ledger's "ignored" - the accuracy the /ai screen reads (part 4).
  for (const row of mine) {
    if (row.who === "desk" && row.state === "proposed" && row.runId && row.id !== lastDesk?.id) {
      await recordAiOutcome(row.runId, "ignored", null, member.id);
    }
  }
  if (lastDesk?.state === "proposed" && lastDesk.runId) await recordAiOutcome(lastDesk.runId, "ignored", null, member.id);

  // The missing-field turn (part 3): the desk asked one question; what was
  // typed is the answer, the same intent resolved again, no model between.
  const pending = pendingFrom(lastDesk?.actionName ?? null);
  if (pending && lastDesk) {
    if (wantsOut(said)) {
      await updateChatRow(lastDesk.id, { actionName: null, state: "done" });
      await addChatRow({ thread, memberId: member.id, who: "desk", text: "Left it. Say what you want done.", buttons: [], state: "done", actionName: null, runId: null, at: Date.now() });
      revalidatePath(back);
      redirect(back);
    }
    await updateChatRow(lastDesk.id, { actionName: null, state: "done" });
    const resolved = resolveIntent(answerPending(pending, said), db, member, now);
    // The run that started the questions is the one the answer belongs to, so a press counts as its "used".
    await sayResolved(member.id, thread, resolved.kind === "question" ? { kind: "refuse", said: "That reads as a question, not the answer. Say what you want done." } : resolved, lastDesk.runId);
    revalidatePath(back);
    redirect(back);
  }

  // Aura: with an Anthropic key, Claude Haiku looks things up with tools and ends on ONE
  // proposal; the button and chatDo are exactly the old ones. No key: the old path below, unchanged.
  if ((process.env.ANTHROPIC_API_KEY ?? "").trim()) {
    const switches = aiSwitches(db, now);
    const stopped = problemWithRunning("agent", "claude", switches);
    if (stopped) {
      await addChatRow({ thread, memberId: member.id, who: "desk", text: stopped, buttons: [], state: "refused", actionName: null, runId: null, at: Date.now() });
      revalidatePath(back);
      redirect(back);
    }
    // The chat so far as alternating turns, starting and ending with the person.
    const turns: { role: "user" | "assistant"; content: string }[] = [];
    for (const r of mine.slice(-8)) {
      const role = r.who === "person" ? "user" : "assistant";
      const last = turns[turns.length - 1];
      if (last && last.role === role) last.content += " " + r.text;
      else turns.push({ role, content: r.text });
    }
    while (turns.length && turns[0].role !== "user") turns.shift();
    const result = await askWithTools({
      system: agentSystemPrompt(member, colomboDate(now)),
      messages: turns,
      tools: AGENT_TOOLS,
      guard: (spent) => problemWithRunning("agent", "claude", { ...switches, spentToday: switches.spentToday + spent }),
      runTool: (name, input) =>
        runAgentTool(
          {
            db,
            member,
            now,
            findTaLead: async (query) => {
              const found = await taPeople();
              if (!found.ok) return "The TA System could not be read: " + found.reason;
              const q = query.trim().toLowerCase();
              const hits = found.data.filter((p) => p.isActive && (!q || p.fullName.toLowerCase().includes(q)));
              return hits.length ? JSON.stringify(hits.slice(0, 20).map((p) => ({ id: p.id, name: p.fullName }))) : "Nothing found.";
            },
          },
          name,
          input,
        ),
    });
    // show_ui stops with a drawing, not a proposal (23 Nov): words plus an A2UI surface, nothing to press but "say".
    const drawn = result.outcome === "stopped" && (result.stopValue as { kind?: string })?.kind === "ui" ? (result.stopValue as { text: string; ui: string }) : null;
    const proposal = result.outcome === "stopped" && !drawn ? (result.stopValue as ReturnType<typeof resolveIntent>) : null;
    // One ledger row for the whole chat turn, with the summed usage, as runAi writes one.
    const worked = result.outcome === "stopped" || result.outcome === "done";
    const run = await addAiRun({
      task: "agent",
      provider: "claude",
      model: result.model,
      read: ["the words typed, and what the tools looked up"],
      proposed: proposal && proposal.kind === "proposal" ? proposal.intent : null,
      outcome: null,
      kept: null,
      ok: worked,
      because: worked ? null : result.text,
      tokensIn: result.usage.tokensIn,
      tokensOut: result.usage.tokensOut,
      cost: result.usage.cost,
      ms: Date.now() - now,
      subjectType: "chat",
      subjectId: member.id,
      by: member.id,
      at: now,
    });
    if (drawn) {
      await addChatRow({ thread, memberId: member.id, who: "desk", text: drawn.text || "Here it is.", buttons: [], state: "done", actionName: null, runId: run.id, at: Date.now(), ui: drawn.ui });
    } else if (proposal && proposal.kind === "proposal") {
      // A TA lead is shown by name, not by the id the tool found.
      await sayResolved(member.id, thread, proposal, run.id);
    } else {
      const text = result.text || "I could not work that out. Try saying it another way.";
      await addChatRow({ thread, memberId: member.id, who: "desk", text, buttons: [], state: result.outcome === "done" ? "done" : "refused", actionName: null, runId: run.id, at: Date.now() });
    }
    revalidatePath(back);
    redirect(back);
  }

  const context = [
    "Today is " + colomboDateInWords(now) + ".",
    db.messages.filter((m) => m.state === "draft").length + " drafts wait for approval.",
    db.inbound.filter((i) => i.readState === "new").length + " new emails.",
    "Clients: " + db.clients.map((c) => c.name).join("; ") + ".",
  ];
  const answer = await runAi<AgentSaid>("agent", agentPrompt(said, catalogueInWords(), context), member.id, { type: "chat", id: member.id }, ["the words typed and the counts"], now);
  const line = (text: string, state: "proposed" | "refused" | "done", buttons: ChatButton[] = []) =>
    addChatRow({ thread, memberId: member.id, who: "desk", text, buttons, state, actionName: null, runId: answer.runId, at: Date.now() });

  // The model answered with nothing usable (no key, the cap, no JSON): the
  // person still gets the offers, and the ledger has why.
  if (!answer.proposal.ok || !answer.proposal.data) {
    const why = (answer.problem ?? "nothing came back").replace(/\.+$/, "");
    const offers = resolveIntent({ intent: "", fields: {}, question: "", notSaid: [] }, db, member, now);
    // "No JSON" is the model's fault, not news to the person: say it plainly.
    const head = /json/i.test(why) ? "I did not understand that." : "I could not work that out (" + why + ").";
    await line(head + " " + (offers.kind === "refuse" ? offers.said : ""), "refused");
    revalidatePath(back);
    redirect(back);
  }
  const got = answer.proposal.data as AgentSaid;
  db = await desk();
  const resolved = resolveIntent(asQuestion({ intent: got.intent ?? "", fields: got.fields ?? {}, question: got.question ?? "", notSaid: got.notSaid ?? [] }, said), db, member, now);
  if (resolved.kind === "question") {
    const rows = [
      "Today is " + colomboDate(now) + " in Colombo.",
      "Clients: " + db.clients.map((c) => c.name + " (" + c.stage + ")").join("; "),
      "Positions: " + db.positions.map((p) => p.title + " (" + p.stage + ")").join("; "),
      "Drafts waiting: " + db.messages.filter((m) => m.state === "draft").length,
      // With the due day (11 Nov): titles alone could not say what is late.
      "Your open tasks: " +
        db.tasks
          .filter((t) => t.state === "open" && t.assigneeId === member.id)
          .map((t) => t.title + " (due " + colomboDate(t.dueAt) + (t.dueAt < now ? ", late" : "") + ")")
          .join("; "),
    ];
    const asked = await runAi<Answer>("ask", askPrompt(said, rows), member.id, { type: "chat", id: member.id }, ["the desk's own rows"], now);
    const got = asked.proposal.ok && asked.proposal.data ? (asked.proposal.data as Answer) : null;
    // Every claim cited (9 Nov): the rows the answer says it used, and what it
    // did not find, so a person can tell an answer from a guess.
    const text = got
      ? got.answer +
        (got.used?.length ? "\n↗ From: " + got.used.join(", ") + "|" : "\n↗ From: the desk's own counts|") +
        (got.notSaid?.length ? "\n↗ Not found: " + got.notSaid.join(", ") + "|" : "")
      : "I could not answer: " + (asked.problem ?? "nothing came back") + ".";
    await line(text, "done");
  } else {
    await sayResolved(member.id, thread, resolved, answer.runId);
  }
  revalidatePath(back);
  redirect(back);
}

/** A resolved intent as the desk's row: a proposal with its buttons, a question that waits for its answer, or a refusal. */
async function sayResolved(memberId: string, thread: string, resolved: Exclude<ReturnType<typeof resolveIntent>, { kind: "question" }>, runId: string | null): Promise<void> {
  const at = Date.now();
  if (resolved.kind === "proposal") {
    // A TA lead is shown by name on every card, however the proposal arrived (first ask, edit, or answer).
    if (resolved.buttons.some((b) => b.fields.taLeadId || b.fields.primaryTaId)) {
      const people = await taPeople();
      if (people.ok) resolved = withTaNames(resolved, people.data);
    }
    await addChatRow({ thread, memberId, who: "desk", text: resolved.said, buttons: resolved.buttons, state: "proposed", actionName: planMark(resolved.intent), runId, at });
  } else if (resolved.kind === "ask") {
    // The question carries what it is waiting for, so the next words answer it.
    await addChatRow({ thread, memberId, who: "desk", text: resolved.said, buttons: [], state: "done", actionName: pendingMark(resolved.pending, resolved.field), runId, at });
  } else {
    await addChatRow({ thread, memberId, who: "desk", text: resolved.said, buttons: [], state: "refused", actionName: null, runId, at });
  }
}

/**
 * A button pressed: the row's action runs exactly as the screen would run
 * it, with the same FormData, through the same gate. Every action ends in a
 * redirect carrying ?msg= or ?did=, so the result is read off the URL the
 * action would have landed on, and written into the thread.
 */
export async function chatDo(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = backTo(formData, "/chat");
  const db = await desk();
  const rowId = String(formData.get("rowId") ?? "");
  const which = Number(formData.get("button") ?? "0");
  const row = chatFor(db, member.id, 1000).find((r) => r.id === rowId);
  const button = row?.buttons[which];
  if (!row || !button || row.state !== "proposed") redirect(back + confirmed("That button has already been used."));
  const run = RUNNABLE[button.action as Runnable];
  if (!run) redirect(back + confirmed("That action is not one the chat may run."));

  await updateChatRow(row.id, { state: "running", actionName: button.action });
  if (row.runId) await recordAiOutcome(row.runId, "used", button, member.id);
  const fd = new FormData();
  for (const [k, val] of Object.entries(button.fields)) fd.set(k, val);
  fd.set("back", back);

  let result = "Done.";
  let refused = false;
  try {
    await run(fd);
  } catch (error) {
    if (!isRedirectError(error)) {
      await updateChatRow(row.id, { state: "refused", text: row.text + "\n\nIt failed: " + (error instanceof Error ? error.message : String(error)) });
      revalidatePath(back);
      redirect(back);
    }
    const url = new URL(getURLFromRedirectError(error), "http://ops.local");
    const msg = url.searchParams.get("did") ?? url.searchParams.get("msg");
    if (msg) result = msg;
    refused = /^(not |refused|cannot|could not|no )/i.test(result) || /not allowed|refus|cannot/i.test(result);
  }
  // The result cites the records it touched (9 Nov): the rows of the plan
  // that have a page, so "Done" can be checked with one click.
  const cites = button.shows.filter((x) => x.href).slice(0, 2).map((x) => "\n↗ " + x.label + ": " + x.value + "|" + x.href).join("");
  await updateChatRow(row.id, { state: refused ? "refused" : "done", text: row.text + "\n\n" + (refused ? "Not done: " : "") + result + cites });
  revalidatePath(back);
  redirect(back + confirmed(result));
}

/** New chat: the next words start one, named from them. */
export async function newChat(formData: FormData): Promise<void> {
  (await cookies()).set(CHAT_COOKIE, "new", CHAT_COOKIE_LIFE);
  redirect(backTo(formData, "/chat"));
}

/** Open one of your chats from the list. */
export async function openChat(formData: FormData): Promise<void> {
  (await cookies()).set(CHAT_COOKIE, String(formData.get("thread") ?? ""), CHAT_COOKIE_LIFE);
  redirect(backTo(formData, "/chat"));
}

/** Rename one of your own chats. */
export async function renameChat(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = backTo(formData, "/chat");
  const thread = String(formData.get("thread") ?? "");
  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!name) redirect(back + confirmed("Not renamed: the name is empty."));
  if (!chatsOf(await desk(), member.id).some((c) => c.id === thread && c.id)) redirect(back + confirmed("Not renamed: that chat is not yours."));
  await renameChatThread(thread, name);
  revalidatePath(back);
  redirect(back + confirmed("Renamed."));
}

/** Delete one of your own chats and every line of it. What a button did stays done; the AI ledger keeps its rows. */
export async function deleteChat(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const back = backTo(formData, "/chat");
  const thread = String(formData.get("thread") ?? "");
  if (!chatsOf(await desk(), member.id).some((c) => c.id === thread)) redirect(back + confirmed("Not deleted: that chat is not yours."));
  await deleteChatThread(member.id, thread);
  const jar = await cookies();
  if (jar.get(CHAT_COOKIE)?.value === thread) jar.delete(CHAT_COOKIE);
  revalidatePath(back);
  redirect(back + confirmed("Chat deleted."));
}

/** Sign out for real (16 Nov): the cookies go, then the sign-in page. It was a link that left them behind. */
export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/sign-in");
}

/**
 * Light or dark (16 Nov, the owner). A cookie, so the page is drawn in it from the first byte.
 * No redirect: the profile card stays open while the theme changes behind it.
 */
export async function setTheme(theme: "dark" | "light"): Promise<void> {
  const jar = await cookies();
  jar.set("ops_theme", theme === "dark" ? "dark" : "light", { path: "/", sameSite: "lax", maxAge: 365 * 24 * 60 * 60 });
}

/**
 * View as (16 Nov): look at the desk as a role with no more powers than yours, until you sign out.
 * Your own role clears it. Anything else is refused here and ignored again on every request.
 */
export async function viewAs(formData: FormData): Promise<void> {
  const real = await realMember();
  if (!real) redirect("/sign-in");
  const jar = await cookies();
  const as = previewRoleFrom(real.role, String(formData.get("role") ?? ""));
  if (as) jar.set(VIEW_AS, as, { httpOnly: true, path: "/", sameSite: "lax" });
  else jar.delete(VIEW_AS);
  redirect(backTo(formData, "/"));
}

/** The desk's column, open or shut, kept in a cookie so the page renders it without a flicker. */
export async function toggleChat(formData: FormData): Promise<void> {
  const jar = await cookies();
  const open = jar.get("ops_chat_open")?.value === "1";
  jar.set("ops_chat_open", open ? "0" : "1", { path: "/", sameSite: "lax", maxAge: 365 * 24 * 60 * 60 });
  redirect(backTo(formData, "/"));
}

/* ── Backend gap actions (19 Nov): snooze, manual chases, invite-back, reconfirm, HR/TA logs, refunds, dormant, phone, history, team news, internal hiring ── */

/**
 * Move an open task to Today, Tomorrow or a date (22 Nov: the board could only push
 * tasks later, so a Talent Pulse task under Later could not be pulled to Today).
 * Pulling earlier is always allowed; a task the system made with a deadline needs a
 * reason to go later (src/lib/taskMove.ts). Same audit row as the old snooze.
 */
export async function snoozeTaskAction(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const taskId = String(formData.get("taskId") ?? "").trim();
  const dest = backTo(formData, "/?view=tasks");
  if (!taskId) redirect(withMsg(dest, "Which task?"));
  const db = await desk();
  const task = db.tasks.find((t) => t.id === taskId && t.state === "open");
  if (!task) redirect(withMsg(dest, "That task is already finished or gone."));
  const whose = problemWithMover(task, member.id, can(member, "task.do"), can(member, "task.reassign"));
  if (whose) redirect(withMsg(dest, whose));
  const now = Date.now();
  const target = moveTarget(String(formData.get("to") ?? "tomorrow"), String(formData.get("date") ?? ""), now);
  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithMove(task, target, reason, now);
  if (problem) redirect(withMsg(dest, problem));
  await snoozeTaskInDesk(taskId, target as number, member.id, reason || "Moved from the task board.");
  revalidatePath("/");
  redirect(dest + confirmed("Moved to " + colomboDateInWords(target as number) + ".", dest));
}

/** Manually mark a candidate as reconfirmed for a booked interview (R1 Interviews). */
export async function recordCandidateReconfirm(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "").trim();
  const dest = backTo(formData, "/calendar");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const db = await desk();
  const iv = interviewIn(db, interviewId);
  if (!iv) redirect(withMsg(dest, "That interview is gone."));
  const note = String(formData.get("note") ?? "").trim() || "Candidate reconfirmed by Ops.";
  await patchInterview(interviewId, { state: "reconfirmed" }, member.id, "interview.candidateReconfirmed", note);
  if (iv.positionId) revalidatePath("/positions/" + iv.positionId);
  revalidatePath("/calendar");
  redirect(dest + confirmed("Candidate reconfirmation recorded.", dest));
}

/** Log a manual chase sent by hand (WhatsApp / phone / email) on an ESA or CV set. */
export async function logManualChase(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const subjectType = String(formData.get("subjectType") ?? "").trim();
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const channel = String(formData.get("channel") ?? "whatsapp").trim();
  const note = String(formData.get("note") ?? "").trim();
  const dest = backTo(formData, "/");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const problem = problemWithManualChase(channel, note);
  if (problem) redirect(withMsg(dest, problem));

  const db = await desk();
  if (subjectType === "esa") {
    const esa = agreementIn(db, subjectId);
    if (!esa) redirect(withMsg(dest, "That agreement is gone."));
    await patchAgreement(esa.id, { chaseStep: esa.chaseStep + 1 }, member.id, "esa.manualChase", `[${channel}] ${note}`);
    revalidatePath("/clients/agreements");
    redirect(dest + confirmed(`Logged manual chase ${esa.chaseStep + 1}.`, dest));
  }
  if (subjectType === "clientSet") {
    const set = clientSetIn(db, subjectId);
    if (!set) redirect(withMsg(dest, "That CV set is gone."));
    await addAuditNote({
      actorId: member.id,
      action: "clientSet.manualChase",
      subjectType: "clientSet",
      subjectId: set.id,
      after: channel,
      reason: note,
    });
    const pos = positionForSet(db, set);
    if (pos) revalidatePath("/positions/" + pos.id);
    redirect(dest + confirmed("Manual chase recorded.", dest));
  }
  redirect(withMsg(dest, "Unknown subject for manual chase."));
}

/** Schedule an invite-back reminder on a declined or expired agreement (C3 Agreements). */
export async function scheduleEsaInviteBack(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "").trim();
  const dateStr = String(formData.get("inviteBackOn") ?? "").trim();
  const dest = backTo(formData, "/clients/agreements");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const checked = problemWithInviteBack(dateStr, Date.now());
  if (!checked.ok) redirect(withMsg(dest, checked.message));

  const db = await desk();
  const esa = agreementIn(db, esaId);
  if (!esa) redirect(withMsg(dest, "That agreement is gone."));
  const lead = leadIn(db, esa.leadId);
  const company = lead?.company ?? "Client";
  await startTimer({
    kind: "esa.invite_back",
    subjectType: "esa",
    subjectId: esa.id,
    ownerId: esa.ownerId,
    startsAt: Date.now(),
    dueAt: checked.dueAt,
    warnAt: checked.dueAt - DAY,
    payload: { inviteBackOn: dateStr },
  });
  await createTask({
    kind: "check",
    title: `Invite ${company} back`,
    body: `Reminder set for ${dateStr} after agreement was declined or expired.`,
    assigneeId: esa.ownerId,
    dueAt: checked.dueAt,
    subjectType: "esa",
    subjectId: esa.id,
    link: "/leads/" + esa.leadId,
  });
  await addAuditNote({
    actorId: member.id,
    action: "esa.inviteBackSet",
    subjectType: "esa",
    subjectId: esa.id,
    after: dateStr,
    reason: `Invite-back reminder set for ${dateStr}.`,
  });
  revalidatePath("/clients/agreements");
  revalidatePath("/");
  redirect(dest + confirmed(`Invite-back reminder set for ${dateStr}.`, dest));
}

/** Log client HR follow-up answer from P1 ChaseHrPanel. */
export async function logHrFollowUp(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const dest = backTo(formData, "/positions");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  if (!answer) redirect(withMsg(dest, "Pick what the client HR answered."));
  const db = await desk();
  const pos = positionIn(db, positionId);
  if (!pos) redirect(withMsg(dest, "That position is gone."));
  await addAuditNote({
    actorId: member.id,
    action: "position.hrFollowUp",
    subjectType: "position",
    subjectId: pos.id,
    after: answer,
    reason: note || answer,
  });
  revalidatePath("/positions");
  revalidatePath("/positions/" + pos.id);
  redirect(dest + confirmed(`Saved: ${answer}.`, dest));
}

/** Log TA CV chase + promised date from P1 AskTaPanel. */
export async function logTaCvChase(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const positionId = String(formData.get("positionId") ?? "").trim();
  const promisedOn = String(formData.get("promisedOn") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const dest = backTo(formData, "/positions");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const db = await desk();
  const pos = positionIn(db, positionId);
  if (!pos) redirect(withMsg(dest, "That position is gone."));
  const dueAt = /^\d{4}-\d{2}-\d{2}$/.test(promisedOn) ? Date.parse(`${promisedOn}T03:30:00.000Z`) : nextNineAm(Date.now());
  await createTask({
    kind: "check",
    title: `Check CVs promised for ${pos.title}`,
    body: note || (promisedOn ? `TA promised CVs by ${promisedOn}.` : "Follow up with TA on CVs."),
    assigneeId: pos.ownerId,
    dueAt,
    subjectType: "position",
    subjectId: pos.id,
    link: "/positions/" + pos.id + "?view=sets",
  });
  await addAuditNote({
    actorId: member.id,
    action: "position.taChased",
    subjectType: "position",
    subjectId: pos.id,
    after: promisedOn || "tomorrow",
    reason: note || "Asked TA for CVs.",
  });
  revalidatePath("/positions");
  revalidatePath("/");
  redirect(dest + confirmed("Saved TA follow-up and reminder.", dest));
}

/** Save candidate phone number on a placement (R4 Offer & Joining). */
export async function savePlacementPhone(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const placementId = String(formData.get("placementId") ?? "").trim();
  const phone = String(formData.get("candidatePhone") ?? "").trim();
  const dest = backTo(formData, "/positions");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const db = await desk();
  const pl = placementIn(db, placementId);
  if (!pl) redirect(withMsg(dest, "That placement is gone."));
  await patchPlacement(pl.id, { candidatePhone: phone || null }, member.id, "placement.phoneSaved", phone ? "Candidate phone saved." : "Candidate phone cleared.");
  if (pl.positionId) revalidatePath("/positions/" + pl.positionId);
  redirect(dest + confirmed("Candidate phone saved.", dest));
}

/** Append an immutable correction note against a History audit row (R7 History). */
export async function recordHistoryCorrection(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const auditId = String(formData.get("auditId") ?? "").trim();
  const subjectType = String(formData.get("subjectType") ?? "position").trim();
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const dest = backTo(formData, "/positions");
  const problem = problemWithHistoryCorrection(note);
  if (problem) redirect(withMsg(dest, problem));
  await addAuditNote({
    actorId: member.id,
    action: "audit.correction",
    subjectType,
    subjectId,
    before: auditId || null,
    after: note,
    reason: `Correction to ${auditId || "record"}: ${note}`,
  });
  revalidatePath(dest.split("?")[0] || "/");
  redirect(dest + confirmed("Correction recorded in history.", dest));
}

/** Handle custom-amount or declined ("no") refund decisions by the Director (A2 Accounts). */
export async function decideRefundCustom(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const dest = backTo(formData, "/invoices/payment");
  if (!can(member, "refund.decide")) redirect(withMsg(dest, refusal("refund.decide")));
  const guaranteeId = String(formData.get("guaranteeId") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const customRaw = String(formData.get("customAmount") ?? "").trim();
  const customAmount = customRaw ? Number(customRaw) : null;
  const reason = String(formData.get("reason") ?? "").trim();

  const db = await desk();
  const g = guaranteeIn(db, guaranteeId);
  if (!g) redirect(withMsg(dest, "That guarantee is gone."));
  const pl = placementIn(db, g.placementId);
  const inv = pl?.invoiceId ? invoiceIn(db, pl.invoiceId) : null;
  const paid = inv ? inv.payments.reduce((s, p) => s + p.amount, 0) : 0;
  const problem = problemWithRefundDecision({ answer, customAmount, paid, reason });
  if (problem) redirect(withMsg(dest, problem));

  if (answer === "no") {
    await patchGuarantee(g.id, { state: "refund_declined", decidedBy: member.id, decidedAt: Date.now(), refundAmount: 0 }, member.id, "guarantee.refundDeclined", reason);
    revalidatePath("/invoices/payment");
    redirect(dest + confirmed("Refund declined and recorded.", dest));
  }
  await patchGuarantee(
    g.id,
    { state: "refund_pending", decidedBy: member.id, decidedAt: Date.now(), refundAmount: customAmount },
    member.id,
    "guarantee.refundCustom",
    reason,
  );
  revalidatePath("/invoices/payment");
  redirect(dest + confirmed(`Custom refund (${customAmount}) approved and recorded.`, dest));
}

/** Post a team note in Inbox -> Team news (I3). */
export async function postTeamNote(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const body = String(formData.get("body") ?? "").trim();
  const dest = backTo(formData, "/mail?view=news");
  const problem = problemWithTeamNote(body);
  if (problem) redirect(withMsg(dest, problem));
  // A repeat click is not saved again, and the answer says so (22 Nov).
  if (isRepeatTeamNote((await desk()).teamNotes ?? [], member.id, body, Date.now())) redirect(dest + confirmed("That note is already posted.", dest));
  await addTeamNote(member.id, body);
  revalidatePath("/mail");
  redirect(dest + confirmed("Posted to Team news.", dest));
}

/** Delete your own team note (22 Nov). */
export async function deleteTeamNote(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const dest = backTo(formData, "/mail?view=news");
  const noteId = String(formData.get("id") ?? "");
  const note = ((await desk()).teamNotes ?? []).find((n) => n.id === noteId);
  if (!note) redirect(dest + confirmed("That note is already deleted.", dest));
  if (!canDeleteTeamNote(note, member.id, can(member, "task.reassign"))) redirect(withMsg(dest, "You can only delete your own notes."));
  await removeTeamNote(noteId, member.id);
  revalidatePath("/mail");
  redirect(dest + confirmed("Note deleted.", dest));
}

/** Internal hiring: create a new Career141 vacancy (H1). */
export async function createVacancy(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const dest = backTo(formData, "/hiring");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const title = String(formData.get("title") ?? "").trim();
  const places = Number(formData.get("places") ?? 1);
  const checksRaw = String(formData.get("checks") ?? "");
  const checks = checksRaw.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
  const problem = problemWithVacancy(title, places);
  if (problem) redirect(withMsg(dest, problem));
  const v = await addVacancy({ title, places, checks, ownerId: member.id });
  revalidatePath("/hiring");
  redirect(`/hiring/${v.id}?msg=` + encodeURIComponent(`Vacancy "${v.title}" opened.`));
}

/** Internal hiring: add an applicant to a vacancy (H2). */
export async function addHiringApplicant(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const vacancyId = String(formData.get("vacancyId") ?? "").trim();
  const dest = backTo(formData, vacancyId ? `/hiring/${vacancyId}` : "/hiring");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const name = String(formData.get("name") ?? "").trim();
  const source = String(formData.get("source") ?? "LinkedIn").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const cv = formData.get("cv");
  const file = cv instanceof File && cv.size > 0 ? cv : null;
  const bytes = file ? new Uint8Array(await file.arrayBuffer()) : null;
  const problem = problemWithApplicant(name, source) ?? (file && bytes ? problemWithCv(file) ?? problemWithCvBytes(bytes) : null);
  if (problem) redirect(withMsg(dest, problem));
  const added = await addApplicant({ vacancyId, name, source, phone, email, by: member.id });
  if (file && bytes) await keepApplicantCv(member.id, added.id, file, bytes);
  revalidatePath(`/hiring/${vacancyId}`);
  revalidatePath("/hiring");
  redirect(dest + confirmed(`${name} added.`, dest));
}

/**
 * A Scoop added by hand (23 Nov, the ops team's feedback): any number of CVs at once, read into internal hiring the
 * same way a Scoop by email is. The vacancy is picked, or left to be matched by the position each CV says it is for.
 */
export async function addScoop(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const dest = backTo(formData, "/hiring?view=scoops");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const picked = formData.getAll("cvs").filter((f): f is File => f instanceof File && f.size > 0);
  if (!picked.length) redirect(withMsg(dest, "Choose the CVs first. A PDF or Word file each."));
  if (picked.length > MAX_PER_BATCH) redirect(withMsg(dest, "That is " + picked.length + " files. Add at most " + MAX_PER_BATCH + " at a time."));
  const vacancyId = String(formData.get("vacancyId") ?? "").trim() || null;
  if (vacancyId && !(await desk()).vacancies.some((v) => v.id === vacancyId)) redirect(withMsg(dest, "That vacancy is gone."));

  const files = await Promise.all(picked.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
  const batch = await ingestScoopFiles(files, member.id, vacancyId);
  revalidatePath("/hiring");
  const bits = [batch.applicantIds.length + " added", batch.duplicates.length ? batch.duplicates.length + " already on file" : "", batch.unreadable.length ? batch.unreadable.length + " could not be read" : ""].filter(Boolean);
  redirect(dest + confirmed("Read " + files.length + (files.length === 1 ? " CV: " : " CVs: ") + bits.join(", ") + ".", dest));
}

/**
 * The details of one applicant, typed or corrected after the call (23 Nov): the phone and email and NIC a CV did
 * not give, the position applied for, the package they asked for, and whether they have a laptop. Every field is
 * optional. The vacancy can be changed too, which is how a CV held under "to sort" finds its place.
 */
export async function saveApplicantDetails(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const applicantId = String(formData.get("applicantId") ?? "").trim();
  const vacancyId = String(formData.get("vacancyId") ?? "").trim();
  const dest = backTo(formData, vacancyId ? `/hiring/${vacancyId}` : "/hiring");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const db = await desk();
  const person = db.applicants.find((a) => a.id === applicantId);
  if (!person) redirect(withMsg(dest, "That applicant is gone."));
  const row = person as NonNullable<typeof person>;

  const text = (k: string) => String(formData.get(k) ?? "").trim();
  const d = { email: text("email"), nic: text("nic"), phone: text("phone"), laptop: text("laptop") };
  const problem = problemWithApplicantDetails(d);
  if (problem) redirect(withMsg(dest, problem));
  const moveTo = text("moveTo");
  if (moveTo && !db.vacancies.some((v) => v.id === moveTo)) redirect(withMsg(dest, "That vacancy is gone."));

  await patchApplicant(
    applicantId,
    {
      email: d.email || null,
      nic: d.nic ? d.nic.toUpperCase() : null,
      phone: d.phone || null,
      laptop: d.laptop || null,
      targetPosition: text("targetPosition") || null,
      packageSaid: text("packageSaid") || null,
      ...(moveTo && moveTo !== row.vacancyId ? { vacancyId: moveTo } : {}),
    },
    member.id,
    "applicant.detailsSaved",
    moveTo && moveTo !== row.vacancyId ? "Moved to another vacancy" : null,
  );
  revalidatePath("/hiring");
  revalidatePath("/hiring/" + row.vacancyId);
  if (moveTo && moveTo !== row.vacancyId) revalidatePath("/hiring/" + moveTo);
  redirect((moveTo && moveTo !== row.vacancyId ? "/hiring/" + moveTo : dest) + confirmed("Saved.", dest));
}

/** Keeps an applicant's CV in the file store (as keepFile does) and points the applicant at it (22 Nov). */
async function keepApplicantCv(by: string, applicantId: string, file: File, bytes: Uint8Array): Promise<void> {
  const key = keyFor("cv", "applicant", applicantId, file.name);
  const mime = mimeFor(file.name);
  await putBytes(key, bytes, mime);
  const row = await addFile({ kind: "cv", key, name: safeName(file.name), size: bytes.length, mime, sha256: sha256(bytes), subjectType: "applicant", subjectId: applicantId, madeFrom: null, uploadedBy: by });
  await patchApplicant(applicantId, { cvFileId: row.id }, by, "applicant.cvKept", safeName(file.name));
}

/** Internal hiring: add or replace an applicant's CV from the call drawer (22 Nov). */
export async function addApplicantCv(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const applicantId = String(formData.get("applicantId") ?? "").trim();
  const vacancyId = String(formData.get("vacancyId") ?? "").trim();
  const dest = backTo(formData, vacancyId ? `/hiring/${vacancyId}` : "/hiring");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const cv = formData.get("cv");
  if (!(cv instanceof File) || cv.size === 0) redirect(withMsg(dest, "Choose the CV file first."));
  const file = cv as File;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const problem = problemWithCv(file) ?? problemWithCvBytes(bytes);
  if (problem) redirect(withMsg(dest, problem));
  const db = await desk();
  if (!db.applicants.some((a) => a.id === applicantId && a.vacancyId === vacancyId)) redirect(withMsg(dest, "That applicant is gone."));
  await keepApplicantCv(member.id, applicantId, file, bytes);
  revalidatePath(`/hiring/${vacancyId}`);
  redirect(dest + confirmed("CV saved.", dest));
}

/**
 * A rejected applicant's interview that has not happened yet leaves a Teams meeting behind (23 Nov): cancel it, so
 * nobody joins an interview with a person we have turned down. Returns a sentence for what could not be done.
 */
async function dropApplicantEvent(db: Awaited<ReturnType<typeof desk>>, person: { id: string; graphEventId?: string | null; interviewAt: number | null } | undefined, member: { id: string; email: string }): Promise<string> {
  if (!person?.graphEventId || !(person.interviewAt && person.interviewAt > Date.now())) return "";
  const gone = await cancelTeamsEvent(member.email, person.graphEventId, switchedOn(db, "switch.teamsEnabled"));
  if (gone && !gone.ok) return " The Outlook event could not be cancelled, so cancel it by hand: " + gone.reason;
  await patchApplicant(person.id, { graphEventId: null, joinUrl: null }, member.id, "applicant.calendarCleared", null);
  return "";
}

/** Internal hiring: log screening call result (H2 -> Call panel). */
export async function recordHiringCall(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const applicantId = String(formData.get("applicantId") ?? "").trim();
  const vacancyId = String(formData.get("vacancyId") ?? "").trim();
  const dest = backTo(formData, vacancyId ? `/hiring/${vacancyId}` : "/hiring");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const result = String(formData.get("result") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!result) redirect(withMsg(dest, "Pick the call result."));

  const db = await desk();
  const app = db.applicants.find((a) => a.id === applicantId);
  if (!app) redirect(withMsg(dest, "That applicant is gone."));
  const problem = problemWithHiringCall(result, note);
  if (problem) redirect(withMsg(dest, problem));
  const tries = app.tries + 1;
  if (result === CALL_NOT_FIT) {
    await patchApplicant(applicantId, { stage: "rejected", rejectedAtStage: app.stage, tries, rejectReason: note, notes: note, detail: `Rejected after call: ${note}` }, member.id, "applicant.called", `Not a fit: ${note}`);
    const dropped = await dropApplicantEvent(db, app, member);
    revalidatePath(`/hiring/${vacancyId}`);
    revalidatePath("/hiring");
    redirect(dest + confirmed("Marked rejected." + dropped, dest));
  }
  const isFits = result === "Talked" || result === "Fits";
  const nextStage = isFits ? "fits" : "call";
  const detail = isFits ? `Called · fits${note ? " — " + note : ""}` : `${result} · try ${Math.min(tries, 3)} of 3`;
  await patchApplicant(applicantId, { stage: nextStage, tries, detail, notes: note || app.notes }, member.id, "applicant.called", detail);
  revalidatePath(`/hiring/${vacancyId}`);
  revalidatePath("/hiring");
  redirect(dest + confirmed("Call result saved.", dest));
}

/** Internal hiring: book an internal interview (H2 -> Book an interview panel). */
export async function bookHiringInterview(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const applicantId = String(formData.get("applicantId") ?? "").trim();
  const vacancyId = String(formData.get("vacancyId") ?? "").trim();
  const dest = backTo(formData, vacancyId ? `/hiring/${vacancyId}` : "/hiring");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const whenRaw = String(formData.get("interviewAt") ?? "").trim();
  const place = String(formData.get("place") ?? "Office").trim();
  const interviewer = String(formData.get("interviewer") ?? member.name).trim();
  const interviewAt = whenRaw ? colomboLocalToMs(whenRaw) : NaN;
  if (Number.isNaN(interviewAt)) redirect(withMsg(dest, "Pick a valid interview date and time."));
  // An online interview gets a Teams link in the booker's calendar, the same way client interviews do (21 Nov).
  let joinUrl: string | null = null;
  let graphEventId: string | null = null;
  let teamsNote = "";
  const db = await desk();
  // A booking that is moved, or stops being online, must not leave the old event in the calendar.
  let keepOld = false;
  const earlier = (db.applicants ?? []).find((a) => a.id === applicantId)?.graphEventId;
  if (earlier) {
    const gone = await cancelTeamsEvent(member.email, earlier, switchedOn(db, "switch.teamsEnabled"));
    if (gone && !gone.ok) {
      // The old event is still there: keep its id so it can be found, and make no second one.
      keepOld = true;
      teamsNote = " The earlier Outlook event could not be cancelled, so it was kept as it is: " + gone.reason;
    }
  }
  if (place.toLowerCase() === "online" && !keepOld) {
    if (!teamsFake() && !switchedOn(db, "switch.teamsEnabled")) {
      teamsNote = " Teams is switched off in Settings, so no link was made.";
    } else {
      const who = (db.applicants ?? []).find((a) => a.id === applicantId)?.name ?? "candidate";
      const made = await createTeamsEvent(member.email, {
        company: "Career 141",
        kind: "interview",
        subject: "Interview: " + who,
        at: interviewAt,
        lengthMin: 60,
        internalAttendees: [],
      });
      if (made.ok) {
        joinUrl = made.joinUrl;
        graphEventId = made.eventId;
      } else {
        teamsNote = " No Teams link was made: " + made.reason;
      }
    }
  }
  await patchApplicant(
    applicantId,
    { stage: "interview", interviewAt, place, interviewer, detail: `Interview · ${place}`, ...(keepOld ? {} : { joinUrl, graphEventId }) },
    member.id,
    "applicant.interviewBooked",
    `Booked with ${interviewer} (${place})`,
  );
  revalidatePath(`/hiring/${vacancyId}`);
  revalidatePath("/calendar");
  redirect(dest + confirmed("Internal interview booked and added to Calendar." + (joinUrl ? " The Teams link is saved on it." : "") + teamsNote, dest));
}

/** Internal hiring: record interview result (H2 -> Add the result panel). */
export async function recordHiringResult(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const applicantId = String(formData.get("applicantId") ?? "").trim();
  const vacancyId = String(formData.get("vacancyId") ?? "").trim();
  const dest = backTo(formData, vacancyId ? `/hiring/${vacancyId}` : "/hiring");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const result = String(formData.get("result") ?? "").trim().toLowerCase();
  const reason = String(formData.get("reason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const scoreRaw = Number(formData.get("score") ?? 0);
  const score = scoreRaw >= 1 && scoreRaw <= 5 ? scoreRaw : null;
  if (!["pass", "hold", "fail"].includes(result)) redirect(withMsg(dest, "Pick Pass, Hold, or Fail."));
  if (result === "fail" && reason.length < 4) redirect(withMsg(dest, "Write the reason before marking Fail."));

  const nextStage = result === "pass" ? "decision" : result === "fail" ? "rejected" : "interview";
  await patchApplicant(
    applicantId,
    {
      stage: nextStage,
      score,
      notes: notes || null,
      rejectReason: result === "fail" ? reason : null,
      ...(result === "fail" ? { rejectedAtStage: "interview" } : {}),
      detail: result === "pass" ? "Passed interview" : result === "fail" ? `Failed: ${reason}` : "On hold after interview",
    },
    member.id,
    "applicant.resultRecorded",
    reason || notes || result,
  );
  revalidatePath(`/hiring/${vacancyId}`);
  revalidatePath("/hiring");
  redirect(dest + confirmed("Interview result saved.", dest));
}

/** Internal hiring: final decision — Hire, Hold, or Reject (H2 -> Decide panel). */
export async function decideHiringApplicant(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const applicantId = String(formData.get("applicantId") ?? "").trim();
  const vacancyId = String(formData.get("vacancyId") ?? "").trim();
  const dest = backTo(formData, vacancyId ? `/hiring/${vacancyId}` : "/hiring");
  if (!can(member, "client.manage")) redirect(withMsg(dest, refusal("client.manage")));
  const decision = String(formData.get("decision") ?? "").trim().toLowerCase();
  const startDate = String(formData.get("start") ?? "").trim() || null;
  const salary = String(formData.get("salary") ?? "").trim() || null;
  const reason = String(formData.get("reason") ?? "").trim();
  const problem = problemWithHiringDecision(decision, reason);
  if (problem) redirect(withMsg(dest, problem));

  const db = await desk();
  const vac = db.vacancies.find((v) => v.id === vacancyId);
  const nextStage = decision === "hire" ? "hired" : decision === "reject" ? "rejected" : "decision";
  const before = db.applicants.find((a) => a.id === applicantId);
  await patchApplicant(
    applicantId,
    {
      stage: nextStage,
      ...(decision === "reject" ? { rejectedAtStage: before?.stage ?? null } : {}),
      startDate,
      salary,
      rejectReason: decision === "reject" ? reason : null,
      detail: decision === "hire" ? `Hired${startDate ? " · starts " + startDate : ""}` : decision === "reject" ? `Rejected: ${reason}` : "Decision on hold",
    },
    member.id,
    "applicant.decided",
    reason || `${decision}${salary ? " (" + salary + ")" : ""}`,
  );
  if (decision === "hire" && vac) {
    await patchVacancy(vac.id, { filled: vac.filled + 1 }, member.id, "vacancy.filledIncremented", "Applicant hired.");
  }
  const dropped = decision === "reject" ? await dropApplicantEvent(db, before, member) : "";
  revalidatePath(`/hiring/${vacancyId}`);
  revalidatePath("/hiring");
  redirect(dest + confirmed((decision === "hire" ? "Marked hired." : decision === "reject" ? "Marked rejected." : "Kept on hold.") + dropped, dest));
}

/** Add an Ops person, Ops lead, or Admin to the team allow-list (20 Nov, Settings -> Templates and people). */
export async function addOpsMember(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const dest = backTo(formData, "/settings?view=templates");
  if (!can(member, "settings.manage")) redirect(withMsg(dest, refusal("settings.manage")));

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "").trim();
  if (name.length < 2) redirect(withMsg(dest, "Write the person's full name."));
  if (!email.includes("@")) redirect(withMsg(dest, "Write a valid email address."));
  if (role !== "ops_owner" && role !== "ops_lead" && role !== "admin") {
    redirect(withMsg(dest, "Pick Ops person, Ops lead, or Admin."));
  }
  if (role === "admin" && member.role !== "admin") {
    redirect(withMsg(dest, "Only an Admin can grant Admin access."));
  }

  const db = await desk();
  if (db.members.some((m) => m.email.trim().toLowerCase() === email)) {
    redirect(withMsg(dest, `${email} is already on the team.`));
  }
  await addMember({ name, email, role, active: true, taUserId: null }, member.id);
  revalidatePath("/settings");
  revalidatePath("/account");
  redirect(dest + confirmed(`${name} added.`, dest));
}

/** Invite a person by email via Clerk AND add them to the Ops allow-list (20 Nov, Account & help). */
export async function inviteOpsMember(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const dest = backTo(formData, "/account");
  if (!can(member, "settings.manage")) redirect(withMsg(dest, refusal("settings.manage")));

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "").trim();
  if (name.length < 2) redirect(withMsg(dest, "Write the person's full name."));
  if (!email.includes("@")) redirect(withMsg(dest, "Write a valid email address."));
  if (role !== "ops_owner" && role !== "ops_lead" && role !== "admin") {
    redirect(withMsg(dest, "Pick Ops person, Ops lead, or Admin."));
  }
  if (role === "admin" && member.role !== "admin") {
    redirect(withMsg(dest, "Only an Admin can invite an Admin."));
  }

  const db = await desk();
  const existing = db.members.find((m) => m.email.trim().toLowerCase() === email);
  if (existing) {
    if (existing.role === "admin" && member.role !== "admin") {
      redirect(withMsg(dest, "Only an Admin can change an Admin account."));
    }
    await patchMember(existing.id, { name, role, active: true }, member.id, "member.updated", "Re-invited via Account & help.");
  } else {
    await addMember({ name, email, role, active: true, taUserId: null }, member.id);
  }

  let inviteNote = `${name} added to Ops.`;
  if ((process.env.CLERK_SECRET_KEY ?? "").trim()) {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const { headers } = await import("next/headers");
      const client = await clerkClient();
      let appUrl = (process.env.OPS_APP_URL ?? "").trim().replace(/\/+$/, "");
      if (!appUrl) {
        const h = await headers();
        const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
        const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
        if (host) appUrl = `${proto}://${host}`;
      }
      await client.invitations.createInvitation({
        emailAddress: email,
        ...(appUrl ? { redirectUrl: appUrl + "/sign-up" } : {}),
        ignoreExisting: true,
      });
      inviteNote = `Invitation emailed to ${email} via Clerk and added to Ops.`;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Clerk invitation could not be sent";
      inviteNote = `${name} added to Ops, but Clerk invite email failed: ${detail}. They can still sign in if they already have a Clerk account.`;
    }
  }

  revalidatePath("/account");
  revalidatePath("/settings");
  redirect(dest + confirmed(inviteNote, dest));
}

/** Update a team member's role or active status (20 Nov, Account & help). */
export async function updateOpsMember(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const dest = backTo(formData, "/account");
  if (!can(member, "settings.manage")) redirect(withMsg(dest, refusal("settings.manage")));

  const targetId = String(formData.get("memberId") ?? "").trim();
  const intent = String(formData.get("intent") ?? "role").trim();
  const db = await desk();
  const target = db.members.find((m) => m.id === targetId);
  if (!target) redirect(withMsg(dest, "That person is not on the list."));
  if (target.role === "admin" && member.role !== "admin") {
    redirect(withMsg(dest, "Only an Admin can modify an Admin account."));
  }

  if (intent === "toggle") {
    if (target.id === member.id) {
      redirect(withMsg(dest, "You cannot deactivate your own account."));
    }
    const nextActive = !target.active;
    if (!nextActive && target.role === "admin") {
      const otherAdmins = db.members.filter((m) => m.active && m.role === "admin" && m.id !== target.id);
      if (otherAdmins.length === 0) {
        redirect(withMsg(dest, "Cannot deactivate the last active Admin."));
      }
    }
    await patchMember(
      target.id,
      { active: nextActive },
      member.id,
      nextActive ? "member.reactivated" : "member.deactivated",
      nextActive ? "Reactivated from Account & help." : "Deactivated from Account & help.",
    );
    revalidatePath("/account");
    revalidatePath("/settings");
    redirect(dest + confirmed(`${target.name} ${nextActive ? "reactivated" : "deactivated"}.`, dest));
  }

  const nextRole = String(formData.get("role") ?? "").trim();
  if (nextRole !== "ops_owner" && nextRole !== "ops_lead" && nextRole !== "admin") {
    redirect(withMsg(dest, "Pick Ops person, Ops lead, or Admin."));
  }
  if (nextRole === "admin" && member.role !== "admin") {
    redirect(withMsg(dest, "Only an Admin can grant Admin access."));
  }
  if (target.role === "admin" && nextRole !== "admin") {
    const otherAdmins = db.members.filter((m) => m.active && m.role === "admin" && m.id !== target.id);
    if (otherAdmins.length === 0) {
      redirect(withMsg(dest, "Cannot demote the last active Admin."));
    }
  }
  await patchMember(target.id, { role: nextRole }, member.id, "member.roleChanged", `Changed role to ${nextRole}.`);
  revalidatePath("/account");
  revalidatePath("/settings");
  redirect(dest + confirmed(`${target.name}'s access updated.`, dest));
}
