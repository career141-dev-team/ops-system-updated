"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addBaseline,
  addFile,
  addHolidays,
  addLead,
  addMeeting,
  cancelMeetingClocks,
  createTask,
  desk,
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
import { HOUR, nextNineAm } from "@/lib/calendar";
import { can, refusal } from "@/lib/roles";
import { gate, needsApproval } from "@/lib/messages";
import { settingChange } from "@/lib/settingsRules";
import { groupPostIsManual, sendEmail, sendWhatsApp, sendingEnabled, subjectWithReference } from "@/lib/senders";
import { problemWith } from "@/lib/templates";
import { fakeArrival } from "@/lib/graphMail";
import { putBytes, readBytes } from "@/data/fileStore";
import { docxToPdf } from "@/lib/docxToPdf";
import {
  type FileKind,
  canBecomePdf,
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
import { parseHolidayLines } from "@/lib/holidays";
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
import { clients as taClients } from "@/lib/ta";
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
import { currentMember } from "@/lib/session";

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
    (r.already ? ", " + r.already + " we had already" : "") + ".";
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
  redirect("/");
}

export async function saveDraft(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const messageId = String(formData.get("messageId") ?? "");
  await editMessage(messageId, { subject: String(formData.get("subject") ?? ""), body: String(formData.get("body") ?? "") }, member.id);
  revalidatePath("/messages/" + messageId);
  redirect("/messages/" + messageId + "?msg=" + encodeURIComponent("Saved."));
}

export async function approveAndSend(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const messageId = String(formData.get("messageId") ?? "");
  const here = "/messages/" + messageId;

  if (!can(member, "message.approve")) {
    redirect(here + "?msg=" + encodeURIComponent(refusal("message.approve")));
  }
  const db = await desk();
  const message = db.messages.find((m) => m.id === messageId);
  if (!message) redirect("/?msg=" + encodeURIComponent("That message no longer exists."));
  if (!needsApproval(message)) {
    redirect(here + "?msg=" + encodeURIComponent("That message has already been settled."));
  }

  // Approved first, then the gate decides what really happens to it.
  const verdict = gate(
    { ...message, state: "approved" },
    {
      outreachLive: switchedOn(db, "switch.outreachLive"),
      testRecipient: (process.env.OPS_TEST_EMAIL ?? "").trim() || "test@example.test",
      doNotContact: [],
      sentToClientToday: 0,
      dailyCapPerClient: numberOf(db, "message.dailyCapPerClient", 4),
    },
  );

  if (!verdict.ok) {
    await settleMessage(messageId, member.id, verdict.state, message.to, verdict.note);
    redirect(here + "?msg=" + encodeURIComponent(verdict.note));
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
        : await sendEmail({ from: member.email, to: verdict.to, subject, body: message.body });

  // Test mode's note matters as much as the sender's, so both are kept.
  const said = [verdict.note, outcome.reason].filter(Boolean).join(" ") || null;
  await settleMessage(
    messageId,
    member.id,
    // Switched off on purpose is not the same as a send that went wrong. A
    // preview with no credentials would otherwise report every message as
    // failed, which hides the real failures when they come.
    outcome.ok ? "sent" : sendingEnabled() ? "failed" : "blocked",
    verdict.to,
    said,
    outcome.providerMessageId,
  );
  revalidatePath("/");
  redirect(here + "?msg=" + encodeURIComponent(said ?? "Sent."));
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
  const back = (msg: string) => redirect("/leads?msg=" + encodeURIComponent(msg));
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
    revalidatePath(here);
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
