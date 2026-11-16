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
  addClient,
  addInterview,
  addMember,
  addInvoice,
  addReference,
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
  clientsNewestFirst,
  patchClient,
  draftMessage,
  patchAgreement,
  cancelMeetingClocks,
  createTask,
  desk,
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
  queueTaWrite,
  readTaEvents,
  removeHoliday,
  fileInbound,
  markInboundActioned,
  readTheMailboxes,
  takeInbound,
  finishTask as finishTaskWrite,
  numberOf,
  recordReply as recordReplyWrite,
  runClocks,
  setSetting,
  saveTemplate,
  settleMessage,
  templateFor,
  startTimer,
  switchedOn,
} from "@/data/desk";
import { CHAT_COOKIE, CHAT_COOKIE_LIFE, addChatThread, chatLines, chatName, chatOpen, chatsOf, deleteChatThread, renameChatThread } from "@/data/chats";
import { DAY, HOUR, colomboDate, colomboDateInWords, nextNineAm } from "@/lib/calendar";
import { can, refusal } from "@/lib/roles";
import { gate, isRoutine, needsApproval } from "@/lib/messages";
import {
  addressesFrom,
  buildThreads,
  problemWithCompose,
  problemWithReply,
  replySubject,
  type Thread,
} from "@/lib/mailbox";
import { settingChange } from "@/lib/settingsRules";
import { groupPostIsManual, outreachLiveInEnv, sendEmail, sendWhatsApp, sendingEnabled, subjectWithReference } from "@/lib/senders";
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
import {
  briefText,
  problemWithHandover,
  problemWithImpractical,
  problemWithRequirement,
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
  problemWithLeaver,
  problemWithRefund,
  refundAmount,
} from "@/lib/guarantee";
import {
  WRITE_OFF_DAYS,
  balanceOf,
  feeInWords,
  invoiceLines,
  money,
  problemWithDojChange,
  problemWithNoShow,
  problemWithNoShowChoice,
  problemWithPayment,
  problemWithWriteOff,
} from "@/lib/money";
import {
  type InterviewState,
  MAX_SLOT_LOOPS,
  canMoveTo as canMoveInterviewTo,
  interviewersFrom,
  parseSlots,
  problemWithAttendance,
  problemWithInterviewBooking,
  problemWithNewSlots,
  problemWithAnswers,
  problemWithPick,
  problemWithReference,
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
  problemWithNewLead,
  routeLead,
} from "@/lib/leads";
import { clients as taClients, preparedCv } from "@/lib/ta";
import {
  type EsaFields,
  type EsaState,
  canMoveTo,
  chaseStep,
  defaultFields,
  expiresAt as esaExpiresAt,
  nextChaseAt,
  ESA_FIELDS,
  problemWithChanges,
  problemWithDraft,
  problemWithSigned,
} from "@/lib/esa";
import {
  type ClientStage,
  STAGE_MEANINGS,
  problemWithBilling,
  problemWithStageMove,
} from "@/lib/clients";
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
import type { Id, OpsDatabase, OpsFile, OpsMember, OpsMessage } from "@/data/types";
import { currentMember, realMember, signOut, VIEW_AS } from "@/lib/session";
import { previewRoleFrom } from "@/lib/roles";

/**
 * What the screens can do. Every one of them checks the role first, and every
 * refusal is a sentence a person can act on rather than a code.
 */

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

  if (!can(member, "settings.manage")) {
    redirect("/settings?msg=" + encodeURIComponent(refusal("settings.manage")));
  }
  const current = (await desk()).settings.find((s) => s.key === key);
  if (!current) redirect("/settings?msg=" + encodeURIComponent("There is no setting called " + key + "."));

  const decided = settingChange(key, current.value, raw, reason);
  if (!decided.ok) redirect("/settings?msg=" + encodeURIComponent(decided.message));

  await setSetting(key, decided.value, member.id, reason);
  revalidatePath("/settings");
  redirect("/settings?msg=" + encodeURIComponent(key + " is now " + String(decided.value) + "."));
}

/** Read the Ops mailbox now. Off until the credentials exist, and it says so. */
export async function readMailNow(): Promise<void> {
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
  redirect("/mail?msg=" + encodeURIComponent(said));
}

/**
 * A pretend arrival, so the screen can be built and shown before the mailbox
 * exists. Refused unless the development sign-in is on.
 */
export async function pretendMailArrives(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  if (!devSignInAllowed()) redirect("/mail?msg=" + encodeURIComponent("Pretend mail is for development only."));

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
    "/mail?msg=" +
      encodeURIComponent(r.filed ? "Filed by its reference. " + r.chasesStopped + " chases stopped." : "It arrived, and is waiting for you to file it."),
  );
}

export async function fileThisMail(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const inboundId = String(formData.get("inboundId") ?? "");
  const pair = String(formData.get("subject") ?? "");
  if (!pair.includes("|")) redirect("/mail?msg=" + encodeURIComponent("Choose what it belongs to first."));
  const [subjectType, subjectId] = pair.split("|");
  const stopped = await fileInbound(inboundId, subjectType, subjectId, member.id);
  revalidatePath("/mail");
  redirect("/mail?msg=" + encodeURIComponent(stopped ? "Filed. " + stopped + " chases stopped." : "Filed."));
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
  const backTo = String(formData.get("back") ?? "/mail");
  const back = (msg: string) => redirect(backTo + (backTo.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "message.approve")) back(refusal("message.approve"));

  const to = addressesFrom(String(formData.get("to") ?? ""));
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");
  const problem = problemWithCompose(to, subject, body);
  if (problem) back(problem);

  const about = String(formData.get("about") ?? "");
  const [subjectType, subjectId] = about.includes("|") ? about.split("|") : [null, null];
  const attachmentFileIds = formData
    .getAll("fileId")
    .map((value) => String(value))
    .filter(Boolean);

  const message = await draftMessage({
    channel: "email",
    to,
    subject: subject.trim(),
    body,
    templateKey: null,
    subjectType,
    subjectId,
    attachmentFileIds,
  });

  revalidatePath("/mail");
  redirect("/messages/" + message.id + "?msg=" + encodeURIComponent("Drafted. Nothing goes until you approve it."));
}

export async function markMailDone(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  await markInboundActioned(String(formData.get("inboundId") ?? ""), member.id);
  revalidatePath("/mail");
  redirect("/mail?msg=" + encodeURIComponent("Marked as dealt with."));
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

  if (!can(member, "template.edit")) {
    redirect(here + "?msg=" + encodeURIComponent(refusal("template.edit")));
  }

  const db = await desk();
  const template = templateFor(db, key);
  if (!template) redirect("/templates?msg=" + encodeURIComponent("That wording no longer exists."));

  const patch = {
    name: String(formData.get("name") ?? "").trim(),
    // A channel with nowhere to put a subject keeps the empty one it had.
    subject: template.channel === "email" ? String(formData.get("subject") ?? "").trim() : "",
    body: String(formData.get("body") ?? ""),
    approvedForAuto: template.channel === "internal" ? true : formData.get("approvedForAuto") === "on",
  };

  const problem = problemWith({ ...patch, channel: template.channel });
  if (problem) redirect(here + "?msg=" + encodeURIComponent(problem));

  await saveTemplate(key, patch, member.id);
  revalidatePath(here);
  revalidatePath("/templates");
  redirect(here + "?msg=" + encodeURIComponent("Saved. The next one sent uses this wording."));
}

export async function finishTask(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const taskId = String(formData.get("taskId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  if (!can(member, "task.do")) redirect("/tasks/" + taskId + "?msg=" + encodeURIComponent(refusal("task.do")));
  // The owner's rule: what happened is written down before it is closed.
  if (!outcome.trim()) {
    redirect("/tasks/" + taskId + "?msg=" + encodeURIComponent("Write one line about what happened first."));
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
async function approveOne(member: OpsMember, db: OpsDatabase, message: OpsMessage): Promise<string> {
  // Approved first, then the gate decides what really happens to it.
  const verdict = gate(
    { ...message, state: "approved" },
    {
      // Both have to agree: the environment may permit it and the desk must
      // have switched it on. A restored database carries the setting; it
      // cannot carry the environment (6 Nov).
      outreachLive: switchedOn(db, "switch.outreachLive") && outreachLiveInEnv(),
      testRecipient: (process.env.OPS_TEST_EMAIL ?? "").trim() || "test@example.test",
      doNotContact: [],
      sentToClientToday: 0,
      dailyCapPerClient: numberOf(db, "message.dailyCapPerClient", 4),
    },
  );

  if (!verdict.ok) {
    await settleMessage(message.id, member.id, verdict.state, message.to, verdict.note);
    return verdict.note;
  }

  // The gate said yes. Now it actually goes, from this person's own mailbox,
  // and whatever the sender says is recorded as it is - including "we do not
  // know whether it went", which is a real answer and not a failure to hide.
  const subject = subjectWithReference(message.subject, message.subjectType, message.subjectId);
  const outcome =
    message.channel === "group_post"
      ? groupPostIsManual()
      : message.channel === "whatsapp"
        ? await sendWhatsApp({ to: verdict.to[0], body: message.body, templateKey: message.templateKey })
        : await sendEmail({
            from: member.email,
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
  const said = [verdict.note, outcome.reason].filter(Boolean).join(" ") || null;
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
  const back = String(formData.get("back") ?? "").trim();
  // Only our own paths: a redirect to wherever a form said is an open door.
  return back.startsWith("/") && !back.startsWith("//") ? back : fallback;
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
  const back = (msg: string) => redirect("/calls?msg=" + encodeURIComponent(msg));
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
  const backPath = String(formData.get("back") ?? "").trim();
  const here = backPath.startsWith("/") ? backPath : "/leads";
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const input = {
    company: String(formData.get("company") ?? "").trim(),
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
    // until the ops lead moves it (owner's rule).
    ownerId: member.id,
    createdBy: member.id,
  });

  revalidatePath("/leads");
  revalidatePath("/clients");
  redirect("/leads/" + lead.id + "?msg=" + encodeURIComponent("Saved. Now check the two things below."));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const lead = leadIn(await desk(), leadId);
  if (!lead) back("That lead is gone.");
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
    const routed = routeLead({ industryFlagged: false, industryConfirmed: false, existing: found.exact });
    await patchLead(
      leadId,
      { clientTaId: found.exact.id, state: routed.state },
      member.id,
      "lead.linkedToClient",
      routed.because,
    );
    // They are a company we already have, so the client record starts here
    // rather than waiting for an agreement they may already have signed.
    await clientFromLead(
      await desk(),
      { ...(lead as NonNullable<typeof lead>), clientTaId: found.exact.id },
      found.exact.esaSignedAt ? "active" : "lead",
      member.id,
    );
    revalidatePath(here);
    revalidatePath("/clients");
    back("They are already our client. " + routed.because);
  }

  if (found.near.length) {
    back(
      "No exact match. These look close, so somebody has to decide: " +
        found.near.map((c) => c.name).join(" · "),
    );
  }
  back("Nobody like that in the TA System, so this is a new client.");
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  revalidatePath(here);
  const warning = warningAboutBooking(at, db.holidays.map((h) => h.date));
  back("Booked, with a reminder the day before and an hour before." + (warning ? " " + warning : ""));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  back(
    "Saved. The agreement is due in " + hours + " hours." +
      (missing.length ? " Still not known: " + missing.join(" and ") + "." : ""),
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!meeting) redirect("/leads?msg=" + encodeURIComponent("That meeting is gone."));

  const row = meeting as NonNullable<typeof meeting>;
  const why = String(formData.get("reason") ?? "").trim();
  if (why.length < 4) back("Write one line about why it did not happen.");
  const clientReplied = formData.get("clientReplied") === "on";

  const outcome = afterNotHeld(row.rebookCount, clientReplied);
  const now = Date.now();
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
    back(outcome.because);
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
  back(outcome.because);
}

/* \u2500\u2500 The client agreement (15, Phase 2 steps 9 to 18) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;
  if (agreementForLead(db, leadId)) back("There is already an agreement for this client.");

  const fields: EsaFields = {
    ...defaultFields({
      guaranteeDays: numberOf(db, "guarantee.days", 90),
      paymentDays: numberOf(db, "invoice.dueDays", 30),
      replacementWorkingDays: numberOf(db, "replacement.workingDays", 60),
      // The agreement says 50 (REFUND_PCT); a fallback of 25 once put the wrong
      // number into new agreements (16 Nov).
      refundPct: numberOf(db, "refund.pct", REFUND_PCT),
    }),
    companyName: row.company,
    signatoryName: row.contactName,
    signatoryEmail: row.contactEmail,
  };

  await addAgreement({
    leadId,
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
  });
  revalidatePath(here);
  back("Started. Fill in what is blank; it cannot be sent until the required fields are in.");
}

/** Saves the fields. Blank required ones are allowed here and block the send. */
export async function saveAgreementFields(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "");
  const db = await desk();
  const esa = agreementIn(db, esaId);
  const here = "/leads/" + (esa?.leadId ?? "");
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));

  const row = esa as NonNullable<typeof esa>;
  const fields: EsaFields = { ...row.fields };
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field.")) fields[key.slice("field.".length)] = String(value);
  }

  await patchAgreement(esaId, { fields }, member.id, "esa.fieldsSaved", null);
  revalidatePath(here);
  const problem = problemWithDraft(fields);
  back(problem ? "Saved. " + problem : "Saved. Everything required is in; it can go.");
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
  version: number,
  memberId: Id,
  now: number,
): Promise<{ error: string } | { wordFile: OpsFile; pdfFile: OpsFile | null; pdfReason: string }> {
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
  const fill = await fillDocx(Buffer.from(templateBytes), { ...esa.fields, effectiveDate: colomboDateInWords(now) });
  const holeProblem = problemWithFill(fill.missing, (key) => ESA_FIELDS.find((f) => f.key === key)?.label ?? key);
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
  if (!pdf.ok) return { wordFile, pdfFile: null, pdfReason: pdf.reason ?? "" };
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
  return { wordFile, pdfFile, pdfReason: "" };
}

/**
 * A look at the agreement before it is sent (16 Nov): fills it exactly as the
 * send would, keeps the files, and makes no message. The drafts show on the
 * lead as "Download filled draft".
 */
export async function previewAgreement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "");
  const db = await desk();
  const esa = agreementIn(db, esaId);
  const here = "/leads/" + (esa?.leadId ?? "");
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));
  const row = esa as NonNullable<typeof esa>;

  const problem = problemWithDraft(row.fields);
  if (problem) back(problem);
  const draft = await fillAgreementDraft(db, row, row.state === "negotiating" ? row.version + 1 : row.version, member.id, Date.now());
  if ("error" in draft) back(draft.error);
  const made = draft as Exclude<typeof draft, { error: string }>;
  revalidatePath(here);
  back(
    made.pdfFile
      ? "A filled draft is ready to download below. Nothing was sent."
      : "The Word draft is ready to download below. No PDF this time: " + made.pdfReason + " Nothing was sent.",
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));
  const row = esa as NonNullable<typeof esa>;

  if (!canMoveTo(row.state as EsaState, "sent")) back("An agreement in that state cannot be sent.");
  // A client who wanted changes gets the next version, not the same document
  // again: the version number moves, the chase starts from the beginning, and
  // the clocks of the version before it stop (3 Nov).
  const again = row.state === "negotiating";
  // Worked out before the patch: `row` is the record the patch writes to, so
  // reading row.version after it has moved said "version 3" on a version 2
  // (3 Nov, found by walking it).
  const version = again ? row.version + 1 : row.version;
  const problem = problemWithDraft(row.fields);
  if (problem) back(problem);

  const now = Date.now();
  const draft = await fillAgreementDraft(db, row, version, member.id, now);
  if ("error" in draft) back(draft.error);
  const made = draft as Exclude<typeof draft, { error: string }>;

  // A client gets the PDF, never the Word file: a Word file can be edited by
  // whoever receives it. No LibreOffice means no agreement goes out from here,
  // which is the right answer on a laptop.
  if (!made.pdfFile) back("The agreement was filled in but no PDF could be made. " + made.pdfReason);
  const pdfFile = made.pdfFile!;

  const cover = templateFor(db, "esa.cover");
  const to = String(row.fields.signatoryEmail ?? "").trim();
  const message = await draftMessage({
    channel: "email",
    to: [to],
    attachmentFileIds: [pdfFile.id],
    subject: cover?.subject?.replace("{{client}}", row.fields.companyName ?? "") || "Our agreement",
    body:
      (cover?.body ?? "Dear {{contact}},\n\nOur agreement is attached.\n\nKind regards,\nCareer 141")
        .replace("{{contact}}", row.fields.signatoryName ?? "")
        .replace("{{client}}", row.fields.companyName ?? ""),
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  back("Signed. Everyone has been told, and the Director has a day to countersign.");
}

/** The Director countersigned; the client gets their copy back (step 18). */
export async function recordAgreementCountersigned(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "");
  const db = await desk();
  const esa = agreementIn(db, esaId);
  const here = "/leads/" + (esa?.leadId ?? "");
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  if (!esa) redirect("/leads?msg=" + encodeURIComponent("That agreement is gone."));
  const row = esa as NonNullable<typeof esa>;

  const fileId = String(formData.get("fileId") ?? "").trim() || null;
  if (!fileId) back("Upload the countersigned copy first, on the Files screen.");
  if (!canMoveTo(row.state as EsaState, "countersigned")) back("That agreement is not waiting to be countersigned.");

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
  });

  revalidatePath(here);
  redirect(
    "/messages/" + message.id + "?msg=" + encodeURIComponent("Countersigned. Their copy is drafted — approve it to send it back."),
  );
}

/** Declined, by them or by us. The search is blocked and everyone is told (step 17). */
export async function declineAgreement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const esaId = String(formData.get("esaId") ?? "");
  const db = await desk();
  const esa = agreementIn(db, esaId);
  const here = "/leads/" + (esa?.leadId ?? "");
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  if (!clientIn(db, clientId)) redirect("/clients?msg=" + encodeURIComponent("That client is gone."));

  const details = {
    billingName: String(formData.get("billingName") ?? "").trim(),
    billingEmail: String(formData.get("billingEmail") ?? "").trim(),
    groupName: String(formData.get("groupName") ?? "").trim(),
  };
  const problem = problemWithBilling(details);
  if (problem) back(problem);

  await patchClient(
    clientId,
    { ...details, notes: String(formData.get("notes") ?? "").trim() },
    member.id,
    "client.detailsSaved",
    null,
  );
  revalidatePath(here);
  back("Saved.");
}

/** Live, quiet or finished. Going quiet needs a reason, like closing does. */
export async function moveClientStage(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const clientId = String(formData.get("clientId") ?? "");
  const here = "/clients/" + clientId;
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const backUrl = String(formData.get("back") ?? "").trim();
  const here = backUrl.startsWith("/") ? backUrl : "/clients/" + clientId;
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
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
  const backUrl = String(formData.get("back") ?? "").trim();
  const here = backUrl.startsWith("/") ? backUrl : "/clients/owners";
  const back = (msg: string) => redirect(here + (here.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) redirect("/sets?msg=" + encodeURIComponent("That set is gone."));
  const row = set as NonNullable<typeof set>;
  if (!canMoveSetTo(row.state as SetState, "sent")) back("A set in that state cannot be sent.");

  const answer = await taClients(row.clientTaId ? row.name.split(" > ")[0] : "");
  const theirs = answer.ok ? answer.data.find((c) => c.id === row.clientTaId) : undefined;
  const to = (theirs?.contacts ?? [])
    .filter((c) => (c.role ?? "").toLowerCase() === "hr" && c.email.trim())
    .map((c) => c.email.trim());

  const problem = problemWithSending(row.candidates, to, numberOf(db, "set.minCvs", MIN_CVS));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
export async function approveTheHold(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const holdId = String(formData.get("holdId") ?? "");
  const here = "/holds/" + holdId;
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
    to: set?.sentTo ?? [],
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;

  const esa = agreementForLead(db, leadId);
  if (esa?.state !== "signed" && esa?.state !== "countersigned") {
    back("No requirement meeting until the agreement is signed: that is where the search begins.");
  }

  const at = Date.parse(String(formData.get("at") ?? "") + ":00+05:30");
  const taLeadId = String(formData.get("taLeadId") ?? "");
  const problem = problemWithBooking({ at, taLeadId }, Date.now());
  if (problem) back(problem);

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

  const warning = warningAboutBooking(at, db.holidays.map((h) => h.date));
  revalidatePath(here);
  back("Booked, with a reminder the day before and an hour before." + (warning ? " " + warning : ""));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;

  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field.")) fields[key.slice("field.".length)] = String(value).trim();
  }

  const already = requirementForLead(db, leadId);
  const client = db.clients.find((c) => c.leadId === leadId) ?? null;
  const held = meetingsForLead(db, leadId).find((m) => m.kind === "requirement" && m.state === "held") ?? null;

  if (already) {
    await patchRequirement(already.id, { fields }, member.id, "requirement.saved", null);
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
  back(problem ? "Saved. " + problem : "Saved. It can go to the TA System now.");
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
 * Hand the requirement to the TA System (step 6).
 *
 * Two refusals first, and they are the point of the whole phase: no opening
 * before the agreement is signed, and no opening from a half-written
 * requirement. Then the write is **queued** - Ops never creates an opening
 * itself and never invents TA's id for it. TA's own `opening.created` event
 * fills the id in, which is also how a TA creating one by hand is noticed.
 */
export async function handOverToTa(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const leadId = String(formData.get("leadId") ?? "");
  const here = "/leads/" + leadId;
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const db = await desk();
  const lead = leadIn(db, leadId);
  if (!lead) back("That lead is gone.");
  const row = lead as NonNullable<typeof lead>;
  const requirement = requirementForLead(db, leadId);
  if (!requirement) back("Write the requirement down first.");
  const req = requirement as NonNullable<typeof requirement>;
  if (req.openedAt) back("This requirement has already gone to the TA System.");

  const esa = agreementForLead(db, leadId);
  const problem = problemWithHandover(esa?.state ?? null, req.fields);
  if (problem) back(problem);

  const client = db.clients.find((c) => c.leadId === leadId) ?? null;
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
  back(
    "Handed over. The opening is queued for the TA System; it appears on the position the moment TA confirms it, and the brief goes exactly as written.",
  );
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
      { primaryRecruiterId: primaryTaId, hundredPercentDay },
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

  revalidatePath("/positions/" + positionId);
  back("Requirement details saved.");
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect("/interviews?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const problem = problemWithNewSlots(row.slotLoops, numberOf(db, "interview.maxSlotLoops", MAX_SLOT_LOOPS));
  if (problem) back(problem);

  const to = interviewersFrom(String(formData.get("to") ?? "")).length
    ? interviewersFrom(String(formData.get("to") ?? ""))
    : row.interviewers;
  if (!to.length) back("Who do we ask? One address a line.");

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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const at = Date.parse(String(formData.get("at") ?? "") + ":00+05:30");
  if (!Number.isFinite(at)) back("Give the day and time they booked.");
  if (at < Date.now()) back("That time has gone.");

  await patchInterview(interviewId, { at, state: "agreed" }, member.id, "interview.clientBooked", null);
  await cancelClocksFor(db, "interview", interviewId, member.id, "They told us the date.", ["interview.report"]);
  revalidatePath(here);
  back("Noted. Now book it on our side so the reminders run.");
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) redirect("/interviews?msg=" + encodeURIComponent("That interview is gone."));
  const row = interview as NonNullable<typeof interview>;

  const wanted = {
    at: row.at ?? NaN,
    round: row.round,
    format: String(formData.get("format") ?? ""),
    interviewers: String(formData.get("interviewers") ?? ""),
    whereOrLink: String(formData.get("whereOrLink") ?? "").trim(),
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
  revalidatePath(here);
  revalidatePath("/interviews");
  redirect(
    "/messages/" +
      message.id +
      "?msg=" +
      encodeURIComponent(
        "Booked. The invite to the client's people is drafted, the TA System has been told, and the reminders are set.",
      ),
  );
}

/** Mark whether it happened (step 14). */
export async function markInterviewAttendance(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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

/** The client cancelled or moved it (step 13). */
export async function cancelInterview(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
    again ? { state: "slots", at: null, slots: [], slotAnswers: [], reason } : { state: "cancelled", reason },
    member.id,
    again ? "interview.rebooking" : "interview.cancelled",
    reason,
  );
  await cancelClocksFor(db, "interview", interviewId, member.id, "The interview is off.", null);
  await queueTaWrite(
    "/integrations/v1/interviews/" + (row.interviewTaId ?? row.applicationTaId) + "/cancel",
    { reason, rebooking: again },
    { type: "interview", id: interviewId },
  );
  revalidatePath(here);
  back(
    again
      ? "Off, and back to agreeing a time. The round is kept, and the TA System has been told."
      : "Cancelled, and the TA System has been told.",
  );
}

/** What the client decided after the interview (step 16). */
export async function recordRoundDecision(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const interviewId = String(formData.get("interviewId") ?? "");
  const here = "/interviews/" + interviewId;
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const answer = await markPlacementJoined(placementId, member.id);
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const placement = placementIn(db, placementId);
  if (!placement) redirect("/placements?msg=" + encodeURIComponent("That placement is gone."));
  const row = placement as NonNullable<typeof placement>;

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
  if (choice === "stop") {
    await createTask({
      kind: "check",
      title: "Close the position: " + row.candidateName + "'s was a no-show",
      body: "The client has stopped the search. Closing the adverts and the opening is the close checklist, which is Phase 7.",
      assigneeId: row.ownerId,
      dueAt: Date.now(),
      subjectType: "placement",
      subjectId: placementId,
      link: here,
    });
  }
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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

/** We lost them before they joined (step 6). */
export async function cancelPlacement(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const placementId = String(formData.get("placementId") ?? "");
  const here = "/placements/" + placementId;
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
 * Send the invoice (step 10).
 *
 * Accounts' own job, so it needs `money.manage`. The lines go in the body,
 * because the invoice document itself waits on a template from the owner -
 * the same rule as the agreement: we do not invent the paperwork a client
 * pays against.
 */
export async function sendInvoice(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const here = "/invoices/" + invoiceId;
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "money.manage")) back(refusal("money.manage"));
  const db = await desk();
  const invoice = invoiceIn(db, invoiceId);
  if (!invoice) redirect("/invoices?msg=" + encodeURIComponent("That invoice is gone."));
  const row = invoice as NonNullable<typeof invoice>;
  if (row.state !== "draft") back("That invoice has gone already.");

  const placement = row.placementId ? placementIn(db, row.placementId) : null;
  const client = row.clientId ? clientIn(db, row.clientId) : null;
  if (!client?.billingEmail) {
    back("This client has no billing address on their record. Put it there first, or the invoice has nowhere to go.");
  }

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

  const message = await draftMessage({
    channel: "email",
    to: [client?.billingEmail ?? ""].filter(Boolean),
    subject: fill(wording?.subject ?? "{{client}} - invoice {{invoiceNumber}}"),
    body: fill(wording?.body ?? "Dear {{contact}},\n\n{{invoice}}"),
    templateKey: "invoice.cover",
    subjectType: "invoice",
    subjectId: invoiceId,
  });

  const now = Date.now();
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "money.manage")) back(refusal("money.manage"));
  const db = await desk();
  const invoice = invoiceIn(db, invoiceId);
  if (!invoice) redirect("/invoices?msg=" + encodeURIComponent("That invoice is gone."));
  const row = invoice as NonNullable<typeof invoice>;

  const amount = Number(formData.get("amount") ?? 0);
  const method = String(formData.get("method") ?? "").trim() || "bank transfer";
  const note = String(formData.get("note") ?? "").trim();
  const owed = balanceOf(row);
  const problem = problemWithPayment(amount, owed);
  if (problem) back(problem);

  const now = Date.now();
  const payments = [...row.payments, { amount, paidAt: now, method, by: member.id, note: note || null }];
  const left = Math.round((row.amount + row.lateCharge - payments.reduce((s, p) => s + p.amount, 0)) * 100) / 100;
  const settled = left <= 0.5;

  await patchInvoice(
    invoiceId,
    {
      payments,
      state: settled ? "paid" : "partly_paid",
      paidAt: settled ? now : null,
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
        { feePaidAt: now },
        member.id,
        "guarantee.feePaid",
        "The fee is settled, so the guarantee holds.",
      );
    }
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "money.manage")) back(refusal("money.manage"));

  const reason = String(formData.get("reason") ?? "").trim();
  const settled = String(formData.get("settled") ?? "") === "yes";
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  await createTask({
    kind: "check",
    title: "Written off: " + row.number,
    body:
      "The guarantee does not apply to an unpaid fee, so it is void, and the position closes. The close checklist is Phase 7.",
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
    early ? reason + " (decided before the sixty working days were up)" : reason,
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));
  const db = await desk();
  const checklist = checklistIn(db, checklistId);
  if (!checklist) redirect("/closes?msg=" + encodeURIComponent("That close list is gone."));
  const row = checklist as NonNullable<typeof checklist>;
  if (row.completedAt) back("That position is closed already.");

  const now = Date.now();
  const items = row.items.map((item) =>
    item.key === key ? { ...item, doneAt: item.doneAt ? null : now, doneBy: item.doneAt ? null : member.id } : item,
  );
  if (!items.some((item) => item.key === key)) back("No such item on this list.");

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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
      : here + "?msg=" + encodeURIComponent("Nothing to close."),
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const here = "/sets/" + setId;
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "client.manage")) back(refusal("client.manage"));

  const who = String(formData.get("candidateName") ?? "").trim();
  const salary = Number(formData.get("monthlySalary") ?? 0);
  if (!who) back("Which candidate were they?");
  if (!Number.isFinite(salary) || salary <= 0) {
    back("What are they being paid a month? The surcharge is a share of the fee, so a number is needed - the requirement's salary if nobody knows better.");
  }

  const answer = await draftSurchargeInvoice(setId, who, salary, member.id);
  revalidatePath(here);
  revalidatePath("/invoices");
  if (!answer.ok) back(answer.what);
  redirect("/invoices/" + answer.invoiceId + "?msg=" + encodeURIComponent(answer.what + " Read it before it goes."));
}

/** We were wrong, or the client explained it: no surcharge. */
export async function dismissUnreportedHire(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const here = "/sets/" + setId;
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
  if (!can(member, "money.manage")) back(refusal("money.manage"));

  const amount = Number(formData.get("amount") ?? 0);
  const why = String(formData.get("why") ?? "").trim();
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
      "?runId=" +
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

/** Improve a draft we already wrote (step 9). */
export async function improveDraft(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const messageId = String(formData.get("messageId") ?? "");
  const here = "/messages/" + messageId;
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect(here + "?msg=" + encodeURIComponent(msg));
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
  const back = (msg: string) => redirect("/ai?msg=" + encodeURIComponent(msg));
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
  const said = (line: string) => redirect(back + confirmed(line));
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
  said("Saved. " + input.company + " is on the leads list with its two checks waiting.");
  void lead;
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
