"use server";

import { redirect } from "next/navigation";

import { decideRefund, writeOffInvoice } from "@/app/actions";

/**
 * The two panels ask in the frame's words (a reason chip and a note; an answer, a date and his words),
 * the existing actions want one `reason`. These put the words together and hand over to the action, so
 * every rule in it (reason needed, 30 days, Director only) still applies. They read nothing else.
 */

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
  const out = new FormData();
  out.set("invoiceId", String(formData.get("invoiceId") ?? ""));
  out.set("reason", note ? said + ". " + note : said);
  await writeOffInvoice(out);
}

export async function decideRefundWithAnswer(formData: FormData): Promise<void> {
  const words = String(formData.get("words") ?? "").trim();
  const date = String(formData.get("answeredOn") ?? "").trim();
  if (!words) backTo(formData, "Paste his words first. A refund is read about years later.");
  const out = new FormData();
  out.set("guaranteeId", String(formData.get("guaranteeId") ?? ""));
  out.set("reason", (date ? "Answer of " + date + ": " : "Answer: ") + words);
  if (formData.get("early")) out.set("early", "yes");
  await decideRefund(out);
}
