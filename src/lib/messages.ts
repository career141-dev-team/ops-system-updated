/**
 * The gate every outgoing message passes (15, Phase 1 step 16).
 *
 * Ops writes to real clients. The rules the owner set are absolute: a person
 * approves anything that reaches a client, nothing goes out while outreach is
 * off except to the test address, a do-not-contact record is never written to,
 * and one client is never written to more times in a day than the cap. All of
 * that is decided here, before a sender is ever called.
 */

import type { MessageState, OpsMessage } from "@/data/types";

export interface SendContext {
  /** False in development and on the preview. Nothing real goes out. */
  outreachLive: boolean;
  /** Where a blocked message is shown as going instead. */
  testRecipient: string | null;
  /** Addresses or numbers never to be written to. */
  doNotContact: string[];
  /** How many messages already went to this client today. */
  sentToClientToday: number;
  dailyCapPerClient: number;
}

export type GateResult =
  | { ok: true; to: string[]; note: string | null }
  | { ok: false; state: Extract<MessageState, "blocked" | "failed">; note: string };

/** Nothing is sent that a person has not approved. */
export function needsApproval(message: Pick<OpsMessage, "state" | "channel">): boolean {
  if (message.channel === "internal") return false;
  return message.state === "draft";
}

export function gate(message: Pick<OpsMessage, "to" | "channel" | "state">, ctx: SendContext): GateResult {
  if (message.channel === "internal") return { ok: true, to: message.to, note: null };

  if (message.state !== "approved") {
    return { ok: false, state: "blocked", note: "Nobody has approved this message yet." };
  }

  const recipients = message.to.map((t) => t.trim()).filter(Boolean);
  if (!recipients.length) {
    return { ok: false, state: "failed", note: "There is nobody to send this to." };
  }

  const stop = recipients.find((r) => ctx.doNotContact.some((d) => d.toLowerCase() === r.toLowerCase()));
  if (stop) {
    return { ok: false, state: "blocked", note: stop + " is on the do-not-contact list." };
  }

  if (ctx.sentToClientToday >= ctx.dailyCapPerClient) {
    return {
      ok: false,
      state: "blocked",
      note: "This client has already had " + ctx.dailyCapPerClient + " messages today.",
    };
  }

  if (!ctx.outreachLive) {
    if (!ctx.testRecipient) {
      return { ok: false, state: "blocked", note: "Test mode, and no test address is set." };
    }
    return {
      ok: true,
      to: [ctx.testRecipient],
      note: "Test mode: sent to " + ctx.testRecipient + " instead of " + recipients.join(", ") + ".",
    };
  }

  return { ok: true, to: recipients, note: null };
}

/** Fills a template's holes. A hole left unfilled stops the send. */
export function fillTemplate(body: string, values: Record<string, string>): { text: string; missing: string[] } {
  const missing: string[] = [];
  const text = body.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined || value.trim() === "") {
      missing.push(key);
      return "{{" + key + "}}";
    }
    return value;
  });
  return { text, missing };
}
