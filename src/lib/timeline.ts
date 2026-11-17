/**
 * The timeline: everything that happened, in order, in words (7 Nov, UX
 * order 4).
 *
 * "What happened with Nippon?" is the first question when the phone rings,
 * and the answer was spread over seven tabs and an audit list that printed
 * `client.created` and a timestamp. The audit already has every fact - who,
 * what, before, after, why, when. What it lacked was two things: it was
 * filtered to the record itself, so a client's page knew nothing of their
 * positions, sets, interviews or invoices; and it was raw.
 *
 * So two rules, pure and tested:
 *
 *   - **what belongs to a client, or to a position** - the whole tree under
 *     it, found by the links the rows already carry;
 *   - **what each entry says** - one plain sentence, newest first.
 *
 * Nothing here is new information. It is the record, read out in order.
 */

import type { OpsAuditEntry, OpsClient, OpsDatabase, OpsPosition } from "@/data/types";

export interface TimelineEntry {
  id: string;
  at: number;
  /** One line, in the desk's own words. */
  said: string;
  /** Who did it, or null when a clock or a reader did. */
  by: string | null;
  /** Why, when a reason was given. */
  because: string | null;
  /** What kind of thing it was about, for the small label beside the line. */
  about: string;
}

/** Every row's id that belongs to a client, the client itself included. */
export function subjectsOfClient(db: OpsDatabase, client: Pick<OpsClient, "id" | "leadId" | "taClientId">): Set<string> {
  const ids = new Set<string>([client.id]);
  const leads = db.leads.filter((l) => l.id === client.leadId || (client.taClientId && l.clientTaId === client.taClientId));
  for (const lead of leads) {
    ids.add(lead.id);
    for (const m of db.meetings) if (m.leadId === lead.id) ids.add(m.id);
    for (const e of db.agreements) if (e.leadId === lead.id) ids.add(e.id);
    for (const r of db.requirements) if (r.leadId === lead.id) ids.add(r.id);
  }
  const mine = <T extends { id: string; clientId: string | null }>(rows: T[]) =>
    rows.filter((r) => r.clientId === client.id).forEach((r) => ids.add(r.id));
  mine(db.positions);
  mine(db.clientSets);
  mine(db.holds);
  mine(db.interviews);
  mine(db.placements);
  mine(db.invoices);
  mine(db.guarantees);
  mine(db.ads);
  mine(db.closeChecklists);
  return ids;
}

/** Every row's id that belongs to a position, the position itself included. */
export function subjectsOfPosition(db: OpsDatabase, position: Pick<OpsPosition, "id" | "openingTaId">): Set<string> {
  const ids = new Set<string>([position.id]);
  const opening = position.openingTaId;
  const mine = <T extends { id: string; positionId?: string | null; openingTaId?: string | null }>(rows: T[]) =>
    rows
      .filter((r) => r.positionId === position.id || (opening && r.openingTaId === opening))
      .forEach((r) => ids.add(r.id));
  mine(db.clientSets);
  mine(db.holds);
  mine(db.interviews);
  mine(db.placements);
  mine(db.guarantees);
  mine(db.ads);
  mine(db.closeChecklists);
  // An invoice hangs off its placement, not the position.
  for (const inv of db.invoices) if (inv.placementId && ids.has(inv.placementId)) ids.add(inv.id);
  return ids;
}

/**
 * Every row's id that is about one candidate on one opening: the sets that
 * hold them, their interviews and their reference (16 Nov). Matched on TA's
 * application id, and on the name for an interview typed in by hand.
 */
export function subjectsOfCandidate(
  db: OpsDatabase,
  who: { applicationTaId: string; name: string; openingTaId: string },
): Set<string> {
  const ids = new Set<string>();
  for (const s of db.clientSets) if (s.candidates.some((c) => c.applicationTaId === who.applicationTaId)) ids.add(s.id);
  for (const iv of db.interviews) {
    if (
      iv.applicationTaId === who.applicationTaId ||
      (iv.openingTaId === who.openingTaId && iv.candidateName.toLowerCase() === who.name.toLowerCase())
    ) {
      ids.add(iv.id);
    }
  }
  for (const r of db.references) if (r.applicationTaId === who.applicationTaId) ids.add(r.id);
  return ids;
}

export interface FeedbackEntry {
  at: number;
  kind: "internal" | "client" | "round" | "candidate" | "reference";
  /** The label beside the line. */
  label: string;
  said: string;
  by: string | null;
}

/**
 * Everything anybody has said about one candidate, newest first (owner, 16 Nov):
 * our own interview, what the client decided about the CV, each round's
 * decision, what the candidate told the TA, and the reference. Nothing new is
 * stored for it; the facts live on the set, the interview and the reference,
 * and a candidate who failed our interview is read back from the audit, since
 * the set no longer holds them.
 */
export function feedbackLog(
  db: OpsDatabase,
  who: { applicationTaId: string; name: string; openingTaId: string },
  nameOf: (actorId: string | null) => string | null,
): FeedbackEntry[] {
  const out: FeedbackEntry[] = [];
  const words = (s: string) => s.replace(/_/g, " ");
  for (const set of db.clientSets) {
    const c = set.candidates.find((x) => x.applicationTaId === who.applicationTaId);
    if (c?.internalInterview) {
      const i = c.internalInterview;
      out.push({
        at: i.at,
        kind: "internal",
        label: "Our interview",
        said: (i.outcome === "pass" ? "Passed" : i.outcome === "fail" ? "Failed" : "On hold") + (i.notes ? `: ${i.notes}` : "."),
        by: nameOf(i.by),
      });
    }
    if (c?.decision && c.decidedAt) {
      out.push({
        at: c.decidedAt,
        kind: "client",
        label: `The client, ${set.name}`,
        said: words(c.decision) + (c.decisionReason ? `: ${c.decisionReason}` : "."),
        by: null,
      });
    }
  }
  // A candidate who failed our interview is no longer in any set; the audit still has them, as "Name: notes".
  const sets = new Set(db.clientSets.filter((s) => s.openingTaId === who.openingTaId).map((s) => s.id));
  for (const a of db.audit) {
    if (a.action !== "clientSet.internalInterview.fail" || !sets.has(a.subjectId)) continue;
    const prefix = who.name + ": ";
    if (a.reason?.startsWith(prefix)) {
      out.push({ at: a.at, kind: "internal", label: "Our interview", said: "Failed: " + a.reason.slice(prefix.length), by: nameOf(a.actorId) });
    }
  }
  const mine = subjectsOfCandidate(db, who);
  for (const iv of db.interviews) {
    if (!mine.has(iv.id)) continue;
    if (iv.decision) {
      out.push({
        at: iv.decidedAt ?? iv.updatedAt,
        kind: "round",
        label: `Round ${iv.round}`,
        said: words(iv.decision) + (iv.decisionReason ? `: ${iv.decisionReason}` : "."),
        by: null,
      });
    }
    if (iv.candidateFeedback) {
      const heard = db.audit.find((a) => a.subjectId === iv.id && a.action === "interview.candidateFeedback");
      out.push({
        at: heard?.at ?? iv.updatedAt,
        kind: "candidate",
        label: `The candidate, round ${iv.round}`,
        said: iv.candidateFeedback,
        by: null,
      });
    }
  }
  for (const r of db.references) {
    if (!mine.has(r.id)) continue;
    out.push({
      at: r.reportedAt ?? r.requestedAt,
      kind: "reference",
      label: "Reference",
      said:
        (r.report ? r.report : "Asked for, no answer yet.") +
        (r.decision ? ` Client: ${words(r.decision)}${r.reason ? ` (${r.reason})` : ""}.` : ""),
      by: null,
    });
  }
  return out.sort((a, b) => b.at - a.at);
}

/** The audit rows about any of those subjects, newest first. */
export function gather(db: OpsDatabase, subjects: Set<string>): OpsAuditEntry[] {
  return db.audit.filter((a) => subjects.has(a.subjectId)).sort((a, b) => b.at - a.at);
}

const WHAT: Record<string, string> = {
  lead: "the enquiry",
  meeting: "the intro call",
  esa: "the agreement",
  agreement: "the agreement",
  requirement: "the requirement",
  client: "the client",
  position: "the position",
  clientset: "a CV set",
  clientSet: "a CV set",
  hold: "the hold",
  interview: "an interview",
  placement: "the placement",
  invoice: "the invoice",
  guarantee: "the guarantee",
  close: "the close list",
  ad: "the advert",
  message: "a message",
  task: "a task",
  timer: "a clock",
  inbound: "a reply",
  outbox: "the TA System",
  reference: "the reference",
  report: "the report",
  talentPulse: "Talent Pulse",
  file: "a file",
  setting: "a setting",
  member: "a person",
};

/** The sentence for each action the desk writes. A function when the tail or the row matters. */
type Words = string | ((e: Pick<OpsAuditEntry, "after" | "reason">, tail: string) => string);
const SAID: Record<string, Words> = {
  // the enquiry
  "lead.created": (e) => "The enquiry came in" + (e.after ? ` from ${e.after}` : "") + ".",
  "lead.linkedToClient": "The enquiry was matched to a client we already have.",
  "lead.declinedIndustry": "Declined: banking or finance.",
  "lead.industryCleared": "The industry flag was cleared.",
  "lead.introCallBooked": "The intro call was booked.",
  "lead.openedEarly": (e) => "Marked to open without waiting for the agreement" + (e.reason ? `: ${e.reason}` : "") + ".",
  "lead.openedEarlyUndone": "Open-without-waiting was taken back.",
  "lead.callHeld": "The intro call was held.",
  "lead.inviteBack": "A date was set to invite them back.",
  "lead.agreementDone": "The agreement was done.",
  "lead.handedOver": "The enquiry was handed to the search.",
  "lead.closed": "The enquiry was closed.",
  "lead.closedSilent": "The enquiry was closed: no reply.",
  "lead.closedImpractical": "The enquiry was closed: the role was not practical.",
  "lead.closedNoAgreement": "The enquiry was closed: no agreement after two weeks.",
  "meeting.booked": (e) => "The intro call was booked" + (e.after ? ` for ${e.after}` : "") + ".",
  "meeting.held": "The meeting was held.",
  "meeting.notHeld": "The meeting did not happen.",
  "meeting.rebook": "The meeting was rebooked.",
  "call.logged": (e) => "A call was written down" + (e.after ? `: ${e.after}` : "."),
  // the agreement
  "esa.started": "The agreement was drafted and the clock started.",
  "esa.fieldsSaved": "The agreement's details were saved.",
  "esa.coverSaved": "The cover email was edited.",
  "esa.sent": "The agreement was sent.",
  "esa.sentAgain": "The agreement was sent again.",
  "esa.chaseDrafted": "A chase for the agreement was drafted.",
  "esa.stuck": "The agreement is stuck; a call was asked for.",
  "esa.negotiating": "The client asked for changes.",
  "esa.signed": "The client signed the agreement.",
  "esa.countersigned": "The Director countersigned.",
  "esa.declined": "The agreement was declined.",
  "requirement.saved": "The requirement was written down.",
  "requirement.impractical": "The role was judged not practical for the salary.",
  "requirement.handedOver": "The requirement was handed to TA.",
  // the client
  "client.created": "They became a client.",
  "client.agreementDone": "Their agreement is done.",
  "client.detailsSaved": "Their details were saved.",
  "client.ownerMoved": "Their ops owner was moved.",
  "client.stageMoved": "They were moved.",
  // the position
  "position.handedOver": "The position was handed to the TA System.",
  "position.openingConfirmed": "The TA System confirmed the opening.",
  "position.teamSet": "The primary TA and the 100% day were set.",
  "position.peopleChanged": "The people on the opening were changed.",
  "position.linkedInRecorded": "The LinkedIn post was recorded.",
  "position.jdApproved": "The JD was approved.",
  "position.workingStage": "The 100% day changed.",
  "position.depthCounted": "The pipeline depth was counted.",
  "position.depth.hold_at_five": "Five shortlisted: the search was held.",
  "position.depth.add_on": "Three or fewer waiting: the TA was sent back out.",
  "position.depth.resume": "Below five again: the search resumed.",
  "position.closed": "The position was closed.",
  // adverts
  "ad.requested": "An advert was requested.",
  "ad.flyerReady": "The flyer is ready.",
  "ad.ordered": "The advert was ordered.",
  "ad.live": "The advert went live.",
  "ad.closed": "The advert closed.",
  "ad.dropped": "The advert was dropped.",
  "talentPulse.compiled": "Talent Pulse was compiled.",
  "talentPulse.lineSaved": "A Talent Pulse line was saved.",
  "talentPulse.posted": "Talent Pulse was posted.",
  // the set and the client's side
  "clientSet.ready": "A CV set is ready from the TA System.",
  "clientSet.reviewed": "The CV set was reviewed.",
  "clientSet.sent": "The CV set was sent to the client.",
  "clientSet.received": "The client received the CV set.",
  "clientSet.candidateDropped": "A candidate was taken out of the set.",
  "clientSet.unreportedDismissed": "The unreported-hire question was dismissed.",
  "clientSet.decision": (_e, tail) => `The client's decision: ${tail.replace(/_/g, " ")}.`,
  "clientSet.internalInterview": (e, tail) =>
    `Our own interview ${tail === "pass" ? "passed" : tail === "fail" ? "failed (out of the set)" : "is on hold"}` +
    (e.reason ? `: ${e.reason}` : "."),
  "clientSet.claim":(_e, tail) => `A CV was claimed: ${tail.replace(/_/g, " ")}.`,
  "hold.proposed": (e) => "A hold was proposed" + (e.reason ? `: ${e.reason}` : "."),
  "hold.held": "The client was put on hold.",
  "hold.review": "The hold came up for review.",
  "hold.lifted": "The hold was lifted.",
  // interviews
  "interview.started": "An interview was started.",
  "interview.slotsRequested": "Interview times were asked for.",
  "interview.slotsFromClient": "The client gave interview times.",
  "interview.agreed": "An interview time was agreed.",
  "interview.booked": "The interview was booked.",
  "interview.clientBooked": "The client booked the interview themselves.",
  "interview.reconfirmed": "The interview was reconfirmed.",
  "interview.attended": "The candidate attended.",
  "interview.candidateOut": "The candidate dropped out.",
  "interview.cancelled": "The interview was cancelled.",
  "interview.rebooking": "The interview is being rebooked.",
  "interview.candidateFeedback": "The candidate's feedback came in.",
  "interview.decision": (_e, tail) => `The client's decision after the interview: ${tail.replace(/_/g, " ")}.`,
  "reference.requested": "A reference was asked for.",
  "reference.reported": "The referee answered.",
  "reference.relayed": "The reference was passed to the client word for word.",
  "reference.cleared": "The client cleared the reference.",
  // placement and money
  "placement.taken": "The placement came in from the TA System.",
  "placement.dojChanged": "The joining day was moved.",
  "placement.joined": "The candidate joined.",
  "placement.noShow": "The candidate did not turn up on the joining day.",
  "placement.noShowChoice": (_e, tail) => `After the no-show the client chose to ${tail.replace(/_/g, " ")}.`,
  "placement.invoiced": (e) => "The placement was invoiced" + (e.reason ? ` (${e.reason})` : "") + ".",
  "placement.cancelled": "The placement was cancelled.",
  "invoice.drafted": "The invoice was drafted.",
  "invoice.sent": "The invoice was sent.",
  "invoice.partlyPaid": "Part of the invoice was paid.",
  "invoice.paid": "The invoice was paid in full.",
  "invoice.disputed": "The invoice was disputed.",
  "invoice.disputeSettled": "The dispute was settled.",
  "invoice.lateCharged": "Late interest was added.",
  "invoice.writtenOff": "The invoice was written off.",
  "guarantee.started": "The ninety-day guarantee started.",
  "guarantee.feePaid": "The fee was paid, so the guarantee holds.",
  "guarantee.warned": "The day-75 warning went out.",
  "guarantee.replacing": "The candidate left; a replacement is being found.",
  "guarantee.replaced": "The replacement started.",
  "guarantee.refundDecided": "A refund was decided.",
  "guarantee.refunded": "The refund was made.",
  "guarantee.endedClean": "The guarantee ended clean.",
  "guarantee.ended": "The guarantee ended.",
  "close.opened": "The close list was opened.",
  "close.itemTicked": (e) => "A close item was ticked" + (e.reason ? `: ${e.reason}` : "."),
  "close.completed": "The close list was completed.",
  // the desk itself
  "task.created": (e) => "A task was set" + (e.after ? `: ${e.after}` : "."),
  "task.done": (e) => "A task was done" + (e.after ? `: ${e.after}` : "."),
  "task.escalated": (e) => "A task was escalated" + (e.reason ? ` - ${e.reason}` : "."),
  "message.drafted": (e) => "A message was drafted" + (e.after ? ` (${e.after})` : "."),
  "message.edited": "A message was edited.",
  "inbound.recorded": (e) => "A reply arrived" + (e.after ? ` from ${e.after}` : "."),
  "inbound.read": "A reply was read.",
  "inbound.filed": "A reply was filed here.",
  "inbound.actioned": "A reply was dealt with.",
  "outbox.queued": "A change was queued for the TA System.",
  "outbox.sent": "The change reached the TA System.",
  "outbox.waiting": "The TA System could not be reached; it will be tried again.",
  "outbox.givenUp": "The TA System was not told; somebody must do it by hand.",
  "timer.started": (e) => "A clock started" + (e.after ? `: ${e.after}` : "."),
  "timer.fired": "A clock ran out.",
  "timer.cancelled": "A clock was stopped.",
  "report.built": "The weekly report was built.",
  "report.approved": "The weekly report was approved.",
  "setting.changed": (e) => "A setting was changed" + (e.after ? `: ${e.after}` : "") + ".",
  "file.kept": "A file was kept.",
};

/**
 * One sentence per entry. The action names are the desk's own dotted verbs;
 * `a.b.c` is looked up whole, then as `a.b` with `c` as the tail (the
 * client's decision, the no-show choice). An action nobody has written words
 * for still reads: a state move says "went from X to Y", anything else is
 * shown as it is - a strange line is better than a line that lies - and the
 * test holds the list of what is written.
 */
export function entryInWords(entry: Pick<OpsAuditEntry, "action" | "subjectType" | "before" | "after" | "reason">): string {
  const about = WHAT[entry.subjectType] ?? entry.subjectType;
  const parts = entry.action.split(".");
  for (let n = parts.length; n >= 1; n--) {
    const words = SAID[parts.slice(0, n).join(".")];
    if (words === undefined) continue;
    if (typeof words === "string") {
      if (n === parts.length) return words;
      continue; // a fixed sentence only matches the whole action
    }
    return words(entry, parts.slice(n).join("."));
  }
  const [head, ...rest] = parts;
  if (head === "message" && rest.length) return `A message was ${rest.join(" ").replace(/_/g, " ")}` + (entry.reason ? ` - ${entry.reason}` : ".");
  if (head === "ai" && rest.length) return `The AI ${rest.join(" ").replace(/_/g, " ")}.`;
  if (entry.before && entry.after && entry.before !== entry.after) {
    return `${about[0].toUpperCase()}${about.slice(1)} went from ${entry.before.replace(/_/g, " ")} to ${entry.after.replace(/_/g, " ")}.`;
  }
  return `${entry.action} on ${about}` + (entry.after ? `: ${entry.after}` : "") + ".";
}

/** True when no sentence is written for it, so the test can hold the list. */
export function isRawAction(action: string): boolean {
  return entryInWords({ action, subjectType: "x", before: null, after: null, reason: null }).startsWith(action + " on ");
}

export function timeline(
  db: OpsDatabase,
  subjects: Set<string>,
  nameOf: (actorId: string | null) => string | null,
): TimelineEntry[] {
  return gather(db, subjects).map((entry) => ({
    id: entry.id,
    at: entry.at,
    said: entryInWords(entry),
    by: nameOf(entry.actorId),
    because: entry.reason,
    about: WHAT[entry.subjectType] ?? entry.subjectType,
  }));
}

/** A day, Colombo time, the way the rest of the app writes one. */
export function dayOf(at: number): string {
  return new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

/** Entries grouped by day, newest day first, so a long history reads as days rather than a wall. */
export function byDay(entries: TimelineEntry[]): { day: string; entries: TimelineEntry[] }[] {
  const days: { day: string; entries: TimelineEntry[] }[] = [];
  for (const entry of entries) {
    const day = dayOf(entry.at);
    const last = days[days.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }
  return days;
}
