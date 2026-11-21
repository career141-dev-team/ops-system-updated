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
  admin: [
    "inbox.read",
    "task.do",
    "task.reassign",
    "message.approve",
    "client.manage",
    "money.manage",
    "refund.decide",
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
  ops_owner: "Ops person",
  ops_lead: "Ops lead",
  admin: "Admin",
  accounts: "Accounts",
  director_ops: "Director of Operations",
  marketing: "Marketing",
  director_ro: "Director (read only)",
  ta_lead_ro: "TA lead (read only)",
};

/** The three active access levels offered when adding or managing Ops team members (20 Nov). */
export const ASSIGNABLE_ROLES: OpsRole[] = ["ops_owner", "ops_lead", "admin"];

/**
 * Who opens on the whole desk rather than their own box (9 Nov, the owner:
 * "show all for the ops admin"). Admins, the ops lead, and the Director of
 * Operations run the desk, so their mail page and their day count
 * everyone's mail; an ops person opens on their own and is one click from
 * the rest. Nothing is hidden from anybody either way: this is only where
 * a page starts.
 */
export function seesWholeDesk(member: Pick<OpsMember, "role">): boolean {
  return member.role === "admin" || member.role === "ops_lead" || member.role === "director_ops";
}

/**
 * View as (16 Nov, the owner): a person may preview the desk as a role, but never
 * as one that can do more than their own.
 *
 * "Can do more" is every capability they lack, and also the whole desk: the ops lead and
 * the Director open on everyone's mail, which is not in the matrix but is still more
 * to see. The cookie that holds the choice is never trusted - `previewRoleFrom` is asked
 * again on every request - so a cookie somebody wrote for themselves gains nothing.
 */
export const ROLES = Object.keys(MATRIX) as OpsRole[];

export function canPreview(real: OpsRole, as: OpsRole): boolean {
  if (real === as) return true;
  if (seesWholeDesk({ role: as }) && !seesWholeDesk({ role: real })) return false;
  return MATRIX[as].every((c) => MATRIX[real].includes(c));
}

/** The roles this role may pick, their own first. */
export function previewList(real: OpsRole): OpsRole[] {
  return [real, ...ROLES.filter((r) => r !== real && canPreview(real, r))];
}

/** The role a cookie asks to preview, or null when it is nothing, their own, or not allowed. */
export function previewRoleFrom(real: OpsRole, cookie: string | undefined): OpsRole | null {
  const as = ROLES.find((r) => r === cookie);
  return as && as !== real && canPreview(real, as) ? as : null;
}
