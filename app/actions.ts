"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addFile,
  desk,
  editMessage,
  fileIn,
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
import { HOUR } from "@/lib/calendar";
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
  const counted = r.read + " read, " + r.filed + " filed, " + r.waiting + " waiting for you, " + r.chasesStopped + " chases stopped.";
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
