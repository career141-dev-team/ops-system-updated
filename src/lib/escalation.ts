/**
 * Who is told next when nothing happens (15, Phase 1 step 15).
 *
 * The owner's rule of 1 November: a client chase escalates to the ops lead
 * after one more day. The plan adds the Director of Operations after three
 * days, and only for money and the guarantee, because those are the ones that
 * cost real money if they sit.
 *
 * It escalates once per step, never in a loop, and never to the person who is
 * already holding it.
 */

import type { OpsMember, OpsTask } from "@/data/types";

const HOUR = 3_600_000;

/** The kinds where a delay costs money, so a director hears about them. */
const MONEY_SUBJECTS = ["invoice", "payment", "guarantee", "refund", "placement"];

export interface EscalationRules {
  leadAfterHours: number;
  directorAfterHours: number;
}

export interface Escalation {
  toMemberId: string;
  note: string;
}

export function escalationFor(
  task: Pick<OpsTask, "state" | "dueAt" | "assigneeId" | "subjectType" | "title">,
  members: Pick<OpsMember, "id" | "role" | "active">[],
  rules: EscalationRules,
  now: number,
): Escalation | null {
  if (task.state !== "open") return null;
  const lateHours = (now - task.dueAt) / HOUR;
  if (lateHours < rules.leadAfterHours) return null;

  const pick = (role: OpsMember["role"]) => members.find((m) => m.active && m.role === role) ?? null;
  const moneyish = MONEY_SUBJECTS.includes((task.subjectType ?? "").toLowerCase());

  // Only ever up (9 Nov). A late money task went to the Director, and the
  // next pass's lead rule sent it back down to the lead, then up again -
  // every five minutes, 49 times for one task on the laptop, each time
  // writing "Passed on" into its body. Whoever holds it now is the floor.
  const holder = members.find((m) => m.id === task.assigneeId);
  if (holder?.role === "director_ops") return null;

  if (moneyish && lateHours >= rules.directorAfterHours) {
    const director = pick("director_ops");
    if (director && director.id !== task.assigneeId) {
      return {
        toMemberId: director.id,
        note: "Nobody has done this for " + Math.floor(lateHours) + " hours, and it is about money.",
      };
    }
  }

  const lead = pick("ops_lead");
  if (lead && lead.id !== task.assigneeId && holder?.role !== "ops_lead") {
    return {
      toMemberId: lead.id,
      note: "Nobody has done this for " + Math.floor(lateHours) + " hours.",
    };
  }

  // The lead already holds it, or there is no lead: there is nobody above to tell.
  return null;
}
