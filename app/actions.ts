"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { repo } from "@/data/store";
import { HOUR } from "@/lib/calendar";
import { can, refusal } from "@/lib/roles";
import { gate, needsApproval } from "@/lib/messages";
import { settingChange } from "@/lib/settingsRules";
import { currentMember } from "@/lib/session";

/**
 * What the screens can do. Every one of them checks the role first, and every
 * refusal is a sentence a person can act on rather than a code.
 */

export async function startTestClock(): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  repo.startTimer({
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
  const result = repo.runClocks();
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
  const stopped = repo.recordReply(subjectType, subjectId, member.id);
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
  const current = repo.setting(key);
  if (!current) redirect("/settings?msg=" + encodeURIComponent("There is no setting called " + key + "."));

  const decided = settingChange(key, current.value, raw, reason);
  if (!decided.ok) redirect("/settings?msg=" + encodeURIComponent(decided.message));

  repo.setSetting(key, decided.value, member.id, reason);
  revalidatePath("/settings");
  redirect("/settings?msg=" + encodeURIComponent(key + " is now " + String(decided.value) + "."));
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
  repo.finishTask(taskId, member.id, outcome);
  revalidatePath("/");
  redirect("/");
}

export async function saveDraft(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const messageId = String(formData.get("messageId") ?? "");
  repo.editMessage(messageId, { subject: String(formData.get("subject") ?? ""), body: String(formData.get("body") ?? "") }, member.id);
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
  const message = repo.message(messageId);
  if (!message) redirect("/?msg=" + encodeURIComponent("That message no longer exists."));
  if (!needsApproval(message)) {
    redirect(here + "?msg=" + encodeURIComponent("That message has already been settled."));
  }

  // Approved first, then the gate decides what really happens to it.
  const verdict = gate(
    { ...message, state: "approved" },
    {
      outreachLive: repo.setting("switch.outreachLive")?.value === true,
      testRecipient: (process.env.OPS_TEST_EMAIL ?? "").trim() || "test@example.test",
      doNotContact: [],
      sentToClientToday: 0,
      dailyCapPerClient: Number(repo.setting("message.dailyCapPerClient")?.value ?? 4),
    },
  );

  if (!verdict.ok) {
    repo.settleMessage(messageId, member.id, verdict.state, message.to, verdict.note);
    redirect(here + "?msg=" + encodeURIComponent(verdict.note));
  }

  // Nothing is actually sent yet: the senders arrive with M1's mail step. The
  // record says plainly what happened, which is what the screen shows.
  repo.settleMessage(messageId, member.id, "sent", verdict.to, verdict.note);
  revalidatePath("/");
  redirect(here + "?msg=" + encodeURIComponent(verdict.note ?? "Sent."));
}
