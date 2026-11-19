"use server";

import { redirect } from "next/navigation";

import { decideRefund, decideRefundCustom, writeOffInvoice } from "@/app/actions";
import { desk, invoiceIn, patchClient } from "@/data/desk";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

const WRITE_OFF_REASONS: Record<string, string> = {
  closed: "Client closed down",
  refuses: "Client refuses to pay",
  unreachable: "Cannot reach the client",
  disputed: "Disputed the fee",
};

function backTo(formData: FormData, msg: string): never {
  const back = String(formData.get("back") ?? "/invoices");
  const safe = back.startsWith("/") && !back.startsWith("//") ? back : "/invoices";
  redirect(safe + (safe.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg));
}

export async function writeOffWithReason(formData: FormData): Promise<void> {
  const kind = String(formData.get("kind") ?? "");
  const other = String(formData.get("other") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const said = kind === "other" ? other : WRITE_OFF_REASONS[kind] ?? "";
  if (!said) backTo(formData, kind === "other" ? "Write the reason in the box." : "Pick the reason first.");

  const invoiceId = String(formData.get("invoiceId") ?? "");
  const fullReason = note ? said + ". " + note : said;

  // Optionally mark the client dormant in the same write-off flow (19 Nov).
  if (formData.get("markDormant") === "on") {
    const member = await currentMember();
    if (member && can(member, "client.manage")) {
      const db = await desk();
      const inv = invoiceIn(db, invoiceId);
      if (inv?.clientId) {
        await patchClient(inv.clientId, { stage: "dormant" }, member.id, "client.dormantOnWriteOff", fullReason);
      }
    }
  }

  const out = new FormData();
  out.set("invoiceId", invoiceId);
  out.set("reason", fullReason);
  if (formData.get("back")) out.set("back", String(formData.get("back")));
  await writeOffInvoice(out);
}

export async function decideRefundWithAnswer(formData: FormData): Promise<void> {
  const answer = String(formData.get("answer") ?? "yes").trim();
  const words = String(formData.get("words") ?? "").trim();
  const date = String(formData.get("answeredOn") ?? "").trim();
  if (!words) backTo(formData, "Paste his words first. A refund is read about years later.");

  const fullReason = (date ? "Answer of " + date + ": " : "Answer: ") + words;
  const out = new FormData();
  out.set("guaranteeId", String(formData.get("guaranteeId") ?? ""));
  out.set("reason", fullReason);
  if (formData.get("back")) out.set("back", String(formData.get("back")));

  if (answer === "other" || answer === "no") {
    out.set("answer", answer);
    if (formData.get("customAmount")) out.set("customAmount", String(formData.get("customAmount")));
    await decideRefundCustom(out);
    return;
  }

  if (formData.get("early")) out.set("early", "yes");
  await decideRefund(out);
}
