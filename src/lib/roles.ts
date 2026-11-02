/**
 * Who may do what (15, D2 roles; owner's rule: one ops owner per client).
 *
 * The web app and the backend must agree, which is exactly where the TA System
 * drifted for a year, so there is one list and both sides read it (2 Nov).
 */

import type { OpsMember, OpsRole } from "@/data/types";

export type Capability =
  | "inbox.read"
  | "task.do"
  | "task.reassign"
  | "message.approve"
  | "client.manage"
  | "money.manage"
  | "refund.decide"
  | "settings.manage"
  | "template.edit"
  | "file.keep"
  | "advert.manage"
  | "report.read";

const MATRIX: Record<OpsRole, Capability[]> = {
  ops_owner: ["inbox.read", "task.do", "message.approve", "client.manage", "advert.manage", "file.keep", "report.read"],
  ops_lead: [
    "inbox.read",
    "task.do",
    "task.reassign",
    "message.approve",
    "client.manage",
    "money.manage",
    "settings.manage",
    "template.edit",
    "advert.manage",
    "file.keep",
    "report.read",
  ],
  accounts: ["inbox.read", "task.do", "message.approve", "money.manage", "file.keep", "report.read"],
  director_ops: ["inbox.read", "task.do", "money.manage", "refund.decide", "file.keep", "report.read"],
  marketing: ["inbox.read", "task.do", "advert.manage", "file.keep"],
  director_ro: ["report.read"],
  ta_lead_ro: ["report.read"],
};

export function can(member: Pick<OpsMember, "role" | "active">, capability: Capability): boolean {
  if (!member.active) return false;
  return MATRIX[member.role].includes(capability);
}

/** Plain words for a refusal, so a screen never says "forbidden". */
export function refusal(capability: Capability): string {
  switch (capability) {
    case "money.manage":
      return "Invoices and payments are kept by accounts, the ops lead or a director.";
    case "refund.decide":
      return "Only the Director of Operations decides a refund.";
    case "settings.manage":
      return "Only the ops lead can change the settings.";
    case "template.edit":
      return "Only the ops lead can change the wording we send.";
    case "file.keep":
      return "A read-only account cannot keep files. Ask the ops owner for this client.";
    case "task.reassign":
      return "Only the ops lead can pass a task to someone else.";
    case "client.manage":
      return "Only an ops person or the ops lead can change client records.";
    default:
      return "Your role does not include that.";
  }
}

export const ROLE_LABEL: Record<OpsRole, string> = {
  ops_owner: "Ops owner",
  ops_lead: "Ops lead",
  accounts: "Accounts",
  director_ops: "Director of Operations",
  marketing: "Marketing",
  director_ro: "Director (read only)",
  ta_lead_ro: "TA lead (read only)",
};
