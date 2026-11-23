import "server-only";

import { convexMutation, convexQuery, usingConvex } from "./convexClient";
import { samplePlacements } from "@/data/samplePlacements";
import { SAMPLE_PREFIX, sampleOpenings } from "./sampleOpenings";
import { sampleDesk } from "./sampleDesk";
import { repo } from "./store";
import { seed } from "./seed";
import { firstRunDesk, wantsSampleDesk } from "@/lib/firstRun";
import { cvText } from "./cvText";
import { putBytes } from "./fileStore";
import { duplicateOf, matchVacancy, readCv, type CvFields } from "@/lib/cvParse";
import { cvFieldsPrompt, type CvFieldsSaid } from "@/lib/aiTasks";
import { keyFor, mimeFor, safeName, sha256 } from "@/lib/files";
import { problemWithCv, problemWithCvBytes } from "@/lib/hiring";
import { MAX_PER_BATCH, PER_PASS, batchesOf, batchesOn, isScoopSender, keyOf as scoopKeyOf, newBatch, nextSummaryAt, sendersFrom, summaryOf, type ScoopBatch } from "@/lib/scoop";
import { graphScoopSource, scoopProblem, type ScoopSource } from "@/lib/graphMail";
import { matchPhone, type WaMessage } from "@/lib/whatsapp";
import { cancelTeamsEvent } from "@/lib/graphCalendar";
import type {
  Id,
  OpsBaseline,
  OpsCallLog,
  OpsClient,
  OpsClientSet,
  OpsHold,
  OpsPosition,
  OpsRequirement,
  OpsAd,
  OpsAiRun,
  OpsChatRow,
  OpsCloseChecklist,
  OpsGuarantee,
  OpsInterview,
  OpsInvoice,
  OpsMember,
  OpsPlacement,
  OpsReferenceRequest,
  OpsReport,
  OpsTalentPulseIssue,
  OpsDatabase,
  OpsEsa,
  OpsEvent,
  OpsFile,
  OpsInbound,
  OpsLead,
  OpsMeeting,
  OpsMessage,
  OpsOutboxItem,
  OpsTask,
  OpsTeamNote,
  OpsTemplate,
  OpsTimer,
  OpsVacancy,
  OpsApplicant,
} from "./types";
import { DAY, colomboDate, colomboDateInWords, nextNineAm } from "@/lib/calendar";
import { endOfWorkDay } from "@/lib/taskMove";
import {
  AI_TASKS,
  type AiSwitches,
  type AiTask,
  DAILY_BUDGET,
  type Proposal,
  ask,
  nothing,
  problemWithRunning,
  providerNow,
} from "@/lib/ai";
import { escalationFor } from "@/lib/escalation";
import { cancelledByReply } from "@/lib/timers";
import { type TickAction, tick } from "@/lib/tick";
import { isRoutine, messageInWords, messageTitle } from "@/lib/messages";
import { clockInWords } from "@/lib/timers";
import type { DayItem } from "@/lib/whatFirst";
import { chaseDraft, chaseStep, nextChaseAt } from "@/lib/esa";
import { dueFromEsa, setName } from "@/lib/clientSets";
import { nextTuesdayNineAm, weekOf } from "@/lib/adverts";
import { clientForLead, problemWithInvoiceBilling } from "@/lib/clients";
import {
  CLOSE_TRIGGERS,
  GUARANTEE_DAYS,
  REPLACEMENT_WORKING_DAYS,
  WARN_DAY,
  closeItemsFor,
  endsOn,
  replacementDeadline,
  verdictOnLeaver,
  warnOn,
} from "@/lib/guarantee";
import {
  DUE_DAYS,
  LATE_PCT_PER_MONTH,
  WRITE_OFF_DAYS,
  balanceOf,
  dueOn,
  feeAmount,
  feeInWords,
  invoiceNumber,
  joinClocks,
  lateCharge,
  missingPlacementFields,
  money,
  monthsLate,
} from "@/lib/money";
import {
  NOTICE_DAYS,
  NOTICE_HOURS,
  noticeStanding,
  reconfirmAt,
  isOff,
} from "@/lib/interviews";
import {
  type ReportRowRecord,
  daysBetween,
  nextMondayEightAm,
  reportWeekOf,
} from "@/lib/reports";
import {
  DEPTH_MEANINGS,
  HOLD_AT,
  SEARCH_AGAIN_AT,
  countDepth,
  depthVerdict,
  depthApplies,
} from "@/lib/depth";
import {
  HOLD_AFTER_DAYS,
  OWNERSHIP_WORKING_DAYS,
  holdDueAt,
  nextFeedbackStep,
  ownershipWindow,
  silentDays,
} from "@/lib/clientFeedback";
import { type InboundMail, type MailCursor, readAllMailboxes } from "@/lib/graphMail";
import { normalSubject } from "@/lib/mailbox";
import { matchInbound, stopsChasing } from "@/lib/mailMatch";
import { dueNow, keyFor as outboxKeyFor, nextTryAt, shouldGiveUp } from "@/lib/outbox";
import { cursorAfter, whatWeDoWithIt } from "@/lib/taEvents";
import {
  clientSet as taClientSet,
  eventsAfter,
  opening as taOpening,
  people as taPeople,
  pipeline as taPipeline,
  placement as taPlacement,
  write as taWrite,
  type TaClientSet,
  type TaOpening,
  type TaPlacement,
} from "@/lib/ta";

/**
 * The desk, from wherever it is kept (2 Nov).
 *
 * One API for the screens, two places behind it: the JSON file that the tests
 * and the screens-only run use, and the Ops Convex backend. The records are the
 * same shape in both, so a page never knows or cares which it is reading — the
 * TA System's own arrangement, and the reason its screens could be built before
 * its backend existed.
 *
 * The rules stay in `src/lib`: this only reads and writes.
 */

export async function desk(): Promise<OpsDatabase> {
  if (!usingConvex()) return repo.all();

  const snapshot = await convexQuery<OpsDatabase>("ops/data:snapshot");
  // A brand new backend has no numbers, so the rules would have nothing to read.
  // It gets the real defaults once, never overwritten; the invented sample desk
  // only where the run asks for it (22 Nov: a live backend that starts empty must
  // not fill with sample clients).
  if (snapshot.settings.length === 0) {
    const sample = firstRunDesk(seed(), wantsSampleDesk(process.env));
    // The sample refers to people by id; the backend makes its own, so the
    // clocks and tasks name the role they belong to and it joins them up.
    const roleOf = (memberId: string) => sample.members.find((m) => m.id === memberId)?.role ?? "ops_owner";
    await convexMutation("ops/data:seed", {
      members: sample.members.map(({ name, email, role, active, taUserId }) => ({ name, email, role, active, taUserId })),
      settings: sample.settings.map(({ key, value }) => ({ key, value })),
      holidays: sample.holidays,
      templates: sample.templates.map(({ key, channel, name, subject, body, approvedForAuto }) => ({
        key,
        channel,
        name,
        subject,
        body,
        approvedForAuto,
      })),
      timers: sample.timers.map(({ id, ownerId, ...rest }) => ({ ...rest, ownerRole: roleOf(ownerId) })),
      tasks: sample.tasks.map(({ kind, title, body, assigneeId, dueAt, subjectType, subjectId, createdAt }) => ({
        kind,
        title,
        body,
        ownerRole: roleOf(assigneeId),
        dueAt,
        subjectType,
        subjectId,
        createdAt,
      })),
      messages: sample.messages.map(({ channel, to, subject, body, templateKey, subjectType, subjectId, createdAt }) => ({
        channel,
        to,
        subject,
        body,
        templateKey,
        subjectType,
        subjectId,
        createdAt,
      })),
    });
    return convexQuery<OpsDatabase>("ops/data:snapshot");
  }
  return snapshot;
}

/** Leaves somebody something to do. The clocks make most of these; a screen can too. */
export async function createTask(
  input: Omit<OpsTask, "id" | "state" | "outcome" | "doneBy" | "doneAt" | "createdAt">,
): Promise<void> {
  if (!usingConvex()) {
    repo.createTask(input);
    return;
  }
  await convexMutation("ops/data:createTask", input);
}

export async function startTimer(input: Omit<OpsTimer, "id" | "state" | "firedAt">): Promise<void> {
  return startTimerNow(input);
}

async function startTimerNow(input: Omit<OpsTimer, "id" | "state" | "firedAt">): Promise<void> {
  if (!usingConvex()) {
    repo.startTimer(input);
    return;
  }
  await convexMutation("ops/data:startTimer", { ...input });
}

export async function finishTask(taskId: Id, by: Id, outcome: string): Promise<void> {
  if (!usingConvex()) {
    repo.finishTask(taskId, by, outcome);
    return;
  }
  await convexMutation("ops/data:finishTask", { taskId, by, outcome });
}

export async function editMessage(messageId: Id, patch: Pick<OpsMessage, "subject" | "body">, by: Id): Promise<void> {
  if (!usingConvex()) {
    repo.editMessage(messageId, patch, by);
    return;
  }
  await convexMutation("ops/data:editMessage", { messageId, subject: patch.subject, body: patch.body, by });
}

export async function settleMessage(
  messageId: Id,
  by: Id,
  // "approved" settles a group post: a person has it to post, and nothing
  // sent it (3 Nov).
  state: Extract<OpsMessage["state"], "sent" | "failed" | "blocked" | "queued" | "approved">,
  to: string[],
  note: string | null,
  /** What the mail server called it, once a sender knows. */
  providerMessageId?: string | null,
): Promise<void> {
  if (!usingConvex()) {
    repo.settleMessage(messageId, by, state, to, note, providerMessageId);
    return;
  }
  await convexMutation("ops/data:settleMessage", { messageId, by, state, to, note, providerMessageId });
}

export async function setSetting(key: string, value: string | number | boolean, by: Id, reason: string): Promise<void> {
  if (!usingConvex()) {
    repo.setSetting(key, value, by, reason);
    return;
  }
  await convexMutation("ops/data:setSetting", { key, value, by, reason });
}

/** Remembers the last scheduled pass, so the health screen can show it. */
export async function noteClockPass(value: string): Promise<void> {
  if (!usingConvex()) {
    repo.noteClockPass(value);
    return;
  }
  await convexMutation("ops/data:noteClockPass", { value });
}

/**
 * One pass of the clocks. The decisions are made here, by the same rules the
 * tests cover, and the backend only applies them — so what fires on the laptop
 * and what fires on the server cannot drift apart.
 */
export async function runClocks(now = Date.now()): Promise<{ warned: number; fired: number; escalated: number }> {
  // The desk is read before the pass writes anything, so we know which clocks
  // are about to fire. That is what lets a clock draft its own chase instead
  // of only leaving a task for somebody to remember (3 Nov).
  const before = await desk();
  const firing = switchedOn(before, "switch.timersEnabled")
    ? tick(before.timers, now).filter((a) => a.state === "fired")
    : [];

  if (!usingConvex()) {
    const answer = repo.runClocks(now);
    await afterFired(before.timers, firing, now);
    return answer;
  }

  const db = before;
  if (!switchedOn(db, "switch.timersEnabled")) return { warned: 0, fired: 0, escalated: 0 };

  const actions = tick(db.timers, now);
  const rules = {
    leadAfterHours: numberOf(db, "escalation.leadAfterHours", 24),
    directorAfterHours: numberOf(db, "escalation.directorAfterHours", 72),
  };
  const escalations = db.tasks
    .map((task) => {
      const move = escalationFor(task, db.members, rules, now);
      return move ? { taskId: task.id, toMemberId: move.toMemberId, note: move.note } : null;
    })
    .filter((x): x is { taskId: string; toMemberId: string; note: string } => x !== null);

  if (!actions.length && !escalations.length) return { warned: 0, fired: 0, escalated: 0 };

  const answer = await convexMutation<{ warned: number; fired: number; escalated: number }>("ops/data:applyTick", {
    warned: actions.filter((a) => a.state === "warned").map((a) => a.timerId),
    fired: actions.filter((a) => a.state === "fired").map((a) => a.timerId),
    firedAt: now,
    tasks: actions.map((a) => a.task).filter((t): t is NonNullable<typeof t> => t !== null),
    escalations,
  });
  await afterFired(db.timers, firing, now);
  return answer;
}

/**
 * What a fired clock does for you, beyond leaving a task (3 Nov).
 *
 * One line per kind of clock. Everything a clock can do by itself goes here,
 * so the clock pass stays one pass and a person is left with the thing to
 * read rather than the thing to remember. Phases 3 to 7 each add their own.
 */
const AFTER_FIRED: Record<string, (timer: OpsTimer, now: number) => Promise<void>> = {
  "esa.chase": async (timer, now) => {
    await chaseTheAgreement(timer.subjectId, timer.ownerId, now);
  },
  // The client has said nothing about a set for a day: ask once, in writing,
  // and draft it so a person only reads and approves (15, Phase 4 step 10).
  "feedback.chase": async (timer, now) => {
    await chaseTheFeedback(timer.subjectId, timer.ownerId, now);
  },
  // Two weeks of silence: the notice is drafted and a hold proposed. Nothing
  // goes on hold, and nothing is sent, until a person approves (step 12).
  "silence.hold": async (timer, now) => {
    await proposeTheHold(timer.subjectId, timer.ownerId, now);
  },
  // Tuesday morning: this week's Talent Pulse is compiled and the next
  // Tuesday's clock is set, so the rhythm keeps itself (step 14).
  "talentpulse.compile": async (timer, now) => {
    await compileTalentPulse(timer.ownerId, now);
  },
  // Monday morning: this week's report is built and next Monday is set
  // (Phase 7 step 9).
  "report.weekly": async (timer, now) => {
    await buildWeeklyReport(timer.ownerId, now);
  },
  // The day before an interview: the client's reminder is drafted and the TA
  // is asked to reconfirm the candidate (Phase 5 step 10).
  "interview.reconfirm": async (timer, now) => {
    await remindAboutInterview(timer.subjectId, now);
  },
  // Waiting on the client's times, or on a date they owe us: a chase is
  // drafted for a person to approve (plan B3).
  "slots.chase": async (timer, now) => {
    await chaseForSlots(timer.subjectId, now);
  },
  "interview.report": async (timer, now) => {
    await chaseForDate(timer.subjectId, now);
  },
  // Thirty days after the first working day, and every month after that: the
  // late charge is recomputed and the chase drafted (Phase 6 steps 13 and 14).
  "invoice.due": async (timer, now) => {
    await chaseThePayment(timer.subjectId, now);
  },
  "invoice.chase": async (timer, now) => {
    await chaseThePayment(timer.subjectId, now);
  },
  // Day 75, day 90, and the sixty working days to replace somebody
  // (Phase 7 steps 2, 3 and 6).
  "guarantee.warn": async (timer, now) => {
    await warnAboutGuarantee(timer.subjectId, now);
  },
  "guarantee.end": async (timer, now) => {
    await endGuaranteeClean(timer.subjectId, now);
  },
  "replacement.deadline": async (timer, now) => {
    await askAboutRefund(timer.subjectId, now);
  },
  // Two weeks live and the TopJobs advert comes down (Phase 3 step 12).
  "ad.close": async (timer, now) => {
    await askAboutClosingAd(timer.subjectId, now);
  },
  // Three months after a set went: was anybody in it hired without our being
  // told? The clock asks; a person decides (Phase 4, Phase 6 step 15).
  "hire.unreported": async (timer, now) => {
    await askAboutUnreportedHire(timer.subjectId, now);
  },
};

async function afterFired(timers: OpsTimer[], firing: TickAction[], now: number): Promise<void> {
  for (const action of firing) {
    const timer = timers.find((t) => t.id === action.timerId);
    const handler = timer ? AFTER_FIRED[timer.kind] : undefined;
    if (!timer || !handler) continue;
    try {
      await handler(timer, now);
    } catch {
      // A handler that cannot finish must not stop the rest of the pass. The
      // clock has already fired and left its task, so the work is still in
      // front of a person; it is only the drafting that did not happen.
    }
  }
}

/**
 * Draft the next chase on an agreement (15, Phase 2 step 13).
 *
 * Two doors, one road: the button on the lead page and the clock when it
 * fires. Until 3 Nov only the button existed, so a chase sat waiting for
 * somebody to remember it - which is the one thing the clocks are for.
 */
export async function chaseTheAgreement(
  esaId: Id,
  by: Id,
  now = Date.now(),
): Promise<{ ok: boolean; what: string; messageId: Id | null }> {
  const db = await desk();
  const esa = agreementIn(db, esaId);
  if (!esa) return { ok: false, what: "That agreement is gone.", messageId: null };
  // A signed, declined or expired agreement is not chased. Its clocks are
  // cancelled when it settles, but a pass already in flight must not write to
  // a finished agreement.
  if (esa.state !== "sent" && esa.state !== "chasing") {
    return { ok: false, what: "That agreement is not waiting for a signature.", messageId: null };
  }

  const plan = chaseStep(esa.chaseStep + 1);
  if (!plan) return { ok: false, what: "The chase has run out. Somebody has to call them.", messageId: null };

  if (plan.channel === "call") {
    await createTask({
      kind: "call",
      title: "Call about the agreement: " + (esa.fields.companyName ?? "a client"),
      body: "Five written chases and no signature. The owner's plan says a call now.",
      assigneeId: esa.ownerId,
      dueAt: now,
      subjectType: "esa",
      subjectId: esaId,
      link: "/leads/" + esa.leadId,
    });
    await patchAgreement(esaId, { state: "chasing", chaseStep: plan.step }, by, "esa.chaseCall", plan.what);
    return { ok: true, what: "A call task is on your list. Write down what they say.", messageId: null };
  }

  const draft = chaseDraft(
    plan,
    esa.fields,
    templateFor(db, plan.templateKey),
    leadIn(db, esa.leadId)?.contactPhone ?? null,
  );
  if ("problem" in draft) return { ok: false, what: draft.problem, messageId: null };

  const message = await draftMessage({
    channel: plan.channel,
    to: [draft.to],
    subject: draft.subject,
    body: draft.body,
    templateKey: plan.templateKey,
    subjectType: "esa",
    subjectId: esaId,
  });

  await patchAgreement(esaId, { state: "chasing", chaseStep: plan.step }, by, "esa.chaseDrafted", plan.what);
  const following = nextChaseAt(plan.step, now);
  if (following) {
    await startTimer({
      kind: "esa.chase",
      subjectType: "esa",
      subjectId: esaId,
      startsAt: now,
      dueAt: following.dueAt,
      warnAt: null,
      ownerId: esa.ownerId,
      payload: { label: String(esa.fields.companyName ?? ""), step: String(following.step) },
    });
  }
  return { ok: true, what: plan.what + " is drafted. Read it, then approve it.", messageId: message.id };
}

/** The client answered, so every chase for that subject stops. */
export async function recordReply(subjectType: string, subjectId: Id, by: Id): Promise<number> {
  if (!usingConvex()) return repo.recordReply(subjectType, subjectId, by);

  const db = await convexQuery<OpsDatabase>("ops/data:snapshot");
  const stopping = cancelledByReply(db.timers, subjectType, subjectId);
  if (!stopping.length) return 0;
  await convexMutation("ops/data:cancelTimers", { timerIds: stopping.map((t) => t.id), by });
  return stopping.length;
}

/**
 * One pass of the Ops mailbox (15, Phase 1 steps 18 and 19).
 *
 * Read, match, record, and stop the chasing for anything that was certainly a
 * reply. Everything it cannot place waits in "needs filing" rather than being
 * guessed at. Recording is keyed on the mail server's own id, so a second pass
 * over the same mailbox records nothing twice.
 */
/** The clock pass as an actor: the audit and the timeline read it as "by itself". */
export const CLOCK_ACTOR = "clock";

/** Setting key prefix: how far the reader got in each mailbox (the box's address follows). */
const MAIL_REACHED = "mail.reached.";

export async function readTheMailboxes(
  by: Id,
  now = Date.now(),
): Promise<{ ok: boolean; reason?: string; read: number; already: number; filed: number; waiting: number; chasesStopped: number; ignored: number }> {
  // Each box carries on from the newest thing we already have from it, or from
  // how far the last read got if that is later (16 Nov): our own and machine
  // mail is dropped and never stored, so a page of it left the start where it
  // was and the same page was read, and dropped, every pass. A box we have
  // never read starts from the reader's own short window.
  const since: Record<string, MailCursor> = {};
  const db = await desk();
  for (const i of db.inbound) {
    // "From" this second, not after it: what shares the second is told apart by
    // id, here by recordInbound's own check (16 Nov).
    if (i.mailbox && i.direction !== "out" && i.receivedAt > (since[i.mailbox]?.at ?? 0)) since[i.mailbox] = { at: i.receivedAt, ids: [] };
  }
  const saved: Record<string, MailCursor> = {};
  for (const s of db.settings) {
    if (!s.key.startsWith(MAIL_REACHED)) continue;
    const box = s.key.slice(MAIL_REACHED.length);
    const [time, ids] = String(s.value).split("|");
    const at = Number(time);
    if (!Number.isFinite(at)) continue;
    saved[box] = { at, ids: ids ? ids.split(",") : [] };
    if (at >= (since[box]?.at ?? 0)) since[box] = saved[box];
  }
  const { mail, problems, ignored, reached } = await readAllMailboxes(since);
  const taken = await takeInbound(mail, by, now);
  // Only after the mail is recorded: a pass that fails part-way must read the
  // same page again rather than skip it.
  for (const [box, cursor] of Object.entries(reached)) {
    const before = saved[box];
    if (!before || cursor.at > before.at || cursor.ids.length !== before.ids.length) {
      await noteSetting(MAIL_REACHED + box, cursor.at + "|" + cursor.ids.join(","));
    }
  }
  // Some boxes may be readable and others not; say so rather than claiming
  // either a clean run or a total failure.
  return { ...taken, ignored, ok: problems.length === 0, reason: problems.join(" ") || undefined };
}

/** Is this Sent Items mail the copy of a message this system sent? Same id, or same subject and recipient within ten minutes. */
function ourSend(m: OpsMessage, item: InboundMail): boolean {
  if (m.providerMessageId && m.providerMessageId === item.providerId) return true;
  const near = Math.abs((m.sentAt ?? m.createdAt) - item.receivedAt) < 10 * 60_000;
  const same = normalSubject(m.subject).toLowerCase() === normalSubject(item.subject).toLowerCase();
  const to = (item.to ?? []).map((a) => a.toLowerCase());
  return near && same && m.to.some((a) => to.includes(a.toLowerCase()));
}

/** The same pass over mail from anywhere, so it can be tested and demonstrated. */
export async function takeInbound(
  mail: InboundMail[],
  by: Id,
  now = Date.now(),
): Promise<{ ok: boolean; read: number; already: number; filed: number; waiting: number; chasesStopped: number }> {
  const db = await desk();
  const known = {
    // Only messages whose real server id we kept. This used to make the id up
    // from our own row id, which no mail server has ever heard of, so the rule
    // could never match a single real reply (2 Nov).
    threads: db.messages
      .filter((m) => m.subjectType && m.subjectId && m.providerMessageId)
      .map((m) => ({
        providerMessageId: m.providerMessageId as string,
        subjectType: m.subjectType as string,
        subjectId: m.subjectId as string,
      })),
    // Client contacts: until the TA System's window opens, the address we
    // keep on our own client record (9 Nov). A client with a real address is
    // a company we write to, so mail from that company's domain is theirs; a
    // domain two clients share is still asked about, never guessed (mailMatch).
    contacts: db.clients
      .filter((c) => c.stage !== "closed" && c.billingEmail.includes("@"))
      .map((c) => ({ email: c.billingEmail, clientId: c.id })),
    // One entry per thing we have written about, keeping the subject line we
    // used, so a reply carrying the house form "CLIENT > ROLE > SET n" can be
    // read against it. The newest message for a thing wins, since that is the
    // wording the client is looking at.
    subjects: [
      ...new Map(
        db.messages
          .filter((m) => m.subjectType && m.subjectId)
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((m) => [
            (m.subjectType as string) + "|" + (m.subjectId as string),
            {
              // The real case, not a lower-cased copy. The matcher already
              // compares case-insensitively, and a lower-cased "clientset"
              // came back out of the match and then failed to find the
              // "clientSet" clock it was supposed to stop - so a client who
              // replied was chased anyway (found by the run-through, 2 Nov).
              subjectType: m.subjectType as string,
              subjectId: m.subjectId as string,
              subject: m.subject,
            },
          ]),
      ).values(),
    ],
  };

  let read = 0;
  let already = 0;
  let filed = 0;
  let waiting = 0;
  let chasesStopped = 0;

  // Our own sends, to tell their copy in Sent Items from a mail we never made.
  const sentByUs = db.messages.filter((m) => m.state === "sent");

  for (const item of mail) {
    const out = item.direction === "out";
    // Sent Items also holds what this system sent. That already has its place
    // in the thread; a second copy would show it twice.
    if (out && sentByUs.some((m) => ourSend(m, item))) {
      already += 1;
      continue;
    }
    // A sent mail is matched on who it went to, as the other party.
    const match = matchInbound(out ? { ...item, from: item.to?.[0] ?? "" } : item, known);
    const row = {
      channel: "email" as const,
      mailbox: item.mailbox,
      from: item.from,
      fromName: item.fromName,
      receivedAt: item.receivedAt,
      subject: item.subject,
      body: item.body,
      providerId: item.providerId,
      inReplyTo: item.inReplyTo,
      matchedBy: match.method,
      subjectType: match.subjectType,
      subjectId: match.subjectId,
      clientId: match.clientId,
      note: match.note,
      ...(out ? { direction: "out" as const, to: item.to ?? [] } : {}),
      ...(item.attachments?.length ? { attachments: item.attachments } : {}),
    };

    const saved = usingConvex()
      ? await convexMutation<{ id: string; already: boolean }>("ops/data:recordInbound", row)
      : repo.recordInbound(row);
    if (saved.already) {
      already += 1;
      continue;
    }
    // Our own mail is filed for reading and is never a client answering: it
    // must not stop a chase, and it never waits in "needs filing".
    if (out) continue;
    read += 1;

    if (match.subjectId) filed += 1;
    else waiting += 1;

    if (stopsChasing(match) && match.subjectType && match.subjectId) {
      chasesStopped += await recordReply(match.subjectType, match.subjectId, by);
    }
  }

  // `read` is what was new, not what was handed in: the readers pass the same
  // email again whenever a window overlaps, and a screen saying "read 25" when
  // nothing arrived is a screen nobody can trust (found by the run-through).
  return { ok: true, read, already, filed, waiting, chasesStopped };
}

export async function fileInbound(inboundId: Id, subjectType: string, subjectId: Id, by: Id): Promise<number> {
  if (usingConvex()) {
    await convexMutation("ops/data:fileInbound", { inboundId, subjectType, subjectId, by });
  } else {
    repo.fileInbound(inboundId, subjectType, subjectId, by);
  }
  // Filing it by hand is still the client answering, so the chasing stops.
  return recordReply(subjectType, subjectId, by);
}

export async function markInboundActioned(inboundId: Id, by: Id): Promise<void> {
  if (usingConvex()) {
    await convexMutation("ops/data:markInboundActioned", { inboundId, by });
    return;
  }
  repo.markInboundActioned(inboundId, by);
}

export function inboundWaiting(db: OpsDatabase): OpsInbound[] {
  return db.inbound.filter((i) => i.readState === "new").sort((a, b) => b.receivedAt - a.receivedAt);
}

export function inboundRecent(db: OpsDatabase): OpsInbound[] {
  return db.inbound.filter((i) => i.direction !== "out").sort((a, b) => b.receivedAt - a.receivedAt).slice(0, 20);
}

/** Save a template's wording. Refused unless the screen checked the role first. */
export async function saveTemplate(
  key: string,
  patch: { name: string; subject: string; body: string; approvedForAuto: boolean },
  by: Id,
): Promise<void> {
  if (!usingConvex()) {
    repo.saveTemplate(key, patch, by);
    return;
  }
  await convexMutation("ops/data:saveTemplate", { key, ...patch, by });
}

/** One template by its key, or nothing when the wording has not been written yet. */
export function templateFor(db: OpsDatabase, key: string): OpsTemplate | null {
  return db.templates.find((t) => t.key === key) ?? null;
}

/**
 * Records a file that is already stored. Returns the row, because the screen
 * needs its id to make a link.
 */
export async function addFile(input: Omit<OpsFile, "id" | "uploadedAt">): Promise<OpsFile> {
  if (!usingConvex()) return repo.addFile(input);
  return convexMutation<OpsFile>("ops/data:addFile", input);
}

export function fileIn(db: OpsDatabase, fileId: Id): OpsFile | null {
  return db.files.find((f) => f.id === fileId) ?? null;
}

export function filesNewestFirst(db: OpsDatabase): OpsFile[] {
  return [...db.files].sort((a, b) => b.uploadedAt - a.uploadedAt);
}

/* ── Leads: the front door (15, Phase 2) ───────────────────────── */

export async function addLead(input: Omit<OpsLead, "id" | "createdAt" | "updatedAt">): Promise<OpsLead> {
  if (!usingConvex()) return repo.addLead(input);
  return convexMutation<OpsLead>("ops/data:addLead", input);
}

export async function patchLead(
  leadId: Id,
  patch: Partial<OpsLead>,
  by: Id,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchLead(leadId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchLead", { leadId, patch, by, what, reason });
}

export function leadIn(db: OpsDatabase, leadId: Id): OpsLead | null {
  return db.leads.find((l) => l.id === leadId) ?? null;
}

export function leadsNewestFirst(db: OpsDatabase): OpsLead[] {
  return [...db.leads].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Ask the client for their feedback (15, Phase 4 step 10).
 *
 * Drafted, never sent: it goes to the same people the set went to, and a
 * person approves it like every other client message. After the owner's stop
 * day nothing more is drafted - a silent client is left to the hold clock
 * rather than chased for ever - and the next step is a call by a person,
 * because that is what the owner's ladder says.
 */
export async function chaseTheFeedback(
  setId: Id,
  by: Id,
  now = Date.now(),
): Promise<{ ok: boolean; what: string; messageId: Id | null }> {
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) return { ok: false, what: "That set is gone.", messageId: null };
  if (set.state !== "sent") return { ok: false, what: "That set has not gone out.", messageId: null };
  if (set.receivedAt === null) return { ok: false, what: "We do not know when they received it.", messageId: null };
  // Anything the client has decided counts as having heard from them.
  const heardAt = set.candidates.reduce<number | null>((latest, c) => {
    const at = c.decidedAt ?? c.claimedAt ?? null;
    return at && (!latest || at > latest) ? at : latest;
  }, null);

  const silent = silentDays(set.receivedAt, heardAt, now);
  const step = nextFeedbackStep(silent, {
    chaseDays: numberOf(db, "feedback.chaseDays", 1),
    stopAfterSilentDays: numberOf(db, "feedback.stopAfterSilentDays", 4),
  });

  if (step.what === "wait") return { ok: false, what: step.because, messageId: null };

  if (step.what === "stop") {
    await createTask({
      kind: "check",
      title: "Stopped chasing: " + set.name,
      body: step.because + " The hold clock is still running and will propose a notice.",
      assigneeId: set.ownerId,
      dueAt: now,
      subjectType: "clientSet",
      subjectId: setId,
      link: "/sets/" + setId,
    });
    return { ok: true, what: step.because, messageId: null };
  }

  if (step.what === "call") {
    await createTask({
      kind: "call",
      title: "Ring them about the feedback: " + set.name,
      body: step.because + " Write down what they say; that is what records the feedback.",
      assigneeId: set.ownerId,
      dueAt: now,
      subjectType: "clientSet",
      subjectId: setId,
      link: "/sets/" + setId,
    });
    // One more day and the ops lead is told, which is the owner's escalation.
    await startTimer({
      kind: "feedback.call",
      subjectType: "clientSet",
      subjectId: setId,
      startsAt: now,
      dueAt: now + numberOf(db, "feedback.callAfterDays", 1) * 86_400_000,
      warnAt: null,
      ownerId: db.members.find((m) => m.active && m.role === "ops_lead")?.id ?? set.ownerId,
      payload: { label: set.name },
    });
    return { ok: true, what: step.because, messageId: null };
  }

  const wording = templateFor(db, "feedback.chase");
  const to = set.sentTo;
  if (!to.length) return { ok: false, what: "Nobody is recorded as having been sent the set.", messageId: null };
  const client = set.clientId ? clientIn(db, set.clientId) : null;
  const fill = (text: string) =>
    text
      .replace(/\{\{client\}\}/g, client?.name ?? set.name.split(" > ")[0])
      .replace(/\{\{position\}\}/g, set.role)
      .replace(/\{\{setNumber\}\}/g, String(set.setNumber))
      .replace(/\{\{contact\}\}/g, "all")
      .replace(/\{\{opsPerson\}\}/g, member(db, set.ownerId)?.name ?? "Career 141");

  const message = await draftMessage({
    channel: "email",
    to,
    subject: fill(wording?.subject ?? "{{client}} > {{position}} > SET {{setNumber}}"),
    body: fill(wording?.body ?? ["Dear all,", "", "Any feedback on the CVs we sent?", "", "Career 141"].join("\n")),
    templateKey: "feedback.chase",
    subjectType: "clientSet",
    subjectId: setId,
  });
  await createTask({
    kind: "approve",
    title: "Approve the feedback chase: " + set.name,
    body: step.because,
    assigneeId: set.ownerId,
    dueAt: now,
    subjectType: "message",
    subjectId: message.id,
    link: "/messages/" + message.id,
  });
  return { ok: true, what: step.because, messageId: message.id };
}

/**
 * Two weeks of silence (15, Phase 4 step 12).
 *
 * The notice is drafted and a hold is proposed; neither takes effect until a
 * person approves the message. The owner's decision 6: a hold never closes by
 * itself, so it also sets the thirty-day review from the start.
 */
export async function proposeTheHold(
  setId: Id,
  by: Id,
  now = Date.now(),
): Promise<{ ok: boolean; what: string; holdId: Id | null }> {
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) return { ok: false, what: "That set is gone.", holdId: null };
  if (liveHoldFor(db, set.openingTaId)) {
    return { ok: false, what: "That position is already on hold.", holdId: null };
  }
  const heard = set.candidates.some((c) => c.decidedAt || c.claimedAt);
  if (heard) return { ok: false, what: "The client has answered, so there is nothing to hold.", holdId: null };

  const hold = await addHold({
    openingTaId: set.openingTaId,
    setId,
    clientId: set.clientId,
    state: "proposed",
    reason: "Two weeks from the day they received " + set.name + " with nothing back.",
    liftedReason: null,
    noticeMessageId: null,
    proposedAt: now,
    heldAt: null,
    liftedAt: null,
    reviewAt: null,
    ownerId: set.ownerId,
  });
  await createTask({
    kind: "decide",
    title: "Put it on hold? " + set.name,
    body:
      "Two weeks since they received the set and nothing has come back. Approving the notice puts the position on hold and tells the client; it never closes by itself.",
    assigneeId: set.ownerId,
    dueAt: now,
    subjectType: "hold",
    subjectId: hold.id,
    link: "/holds/" + hold.id,
  });
  return { ok: true, what: "A hold is proposed, with its notice to approve.", holdId: hold.id };
}

/* ── Holds: a position the client has gone quiet on (step 12) ── */

export async function addHold(input: Omit<OpsHold, "id" | "createdAt" | "updatedAt">): Promise<OpsHold> {
  if (!usingConvex()) return repo.addHold(input);
  return (await convexMutation<OpsHold>("ops/data:addHold", input)) as OpsHold;
}

export async function patchHold(
  holdId: Id,
  patch: Partial<OpsHold>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchHold(holdId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchHold", { holdId, patch, by, what, reason });
}

export function holdIn(db: OpsDatabase, holdId: Id): OpsHold | null {
  return db.holds.find((h) => h.id === holdId) ?? null;
}

export function liveHoldFor(db: OpsDatabase, openingTaId: string): OpsHold | null {
  return db.holds.find((h) => h.openingTaId === openingTaId && h.state !== "lifted") ?? null;
}

export function holdsNewestFirst(db: OpsDatabase): OpsHold[] {
  return [...db.holds].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * The clocks that start when the client receives a set (step 6).
 *
 * They all count from receipt, never from sending, and they start in one place
 * so a corrected receipt date can restart them together.
 */
/**
 * Sets whose three-month question has come due and nobody has answered: no surcharge drafted and not dismissed
 * (18 Nov: the list showed every *running* clock, i.e. sets not three months old yet, as "flagged").
 */
export function unreportedToAsk(db: OpsDatabase): OpsTimer[] {
  return db.timers.filter(
    (t) =>
      t.kind === "hire.unreported" &&
      t.subjectType === "clientSet" &&
      t.state === "fired" &&
      !db.invoices.some((inv) => inv.setId === t.subjectId && inv.kind === "surcharge") &&
      !db.audit.some((a) => a.subjectType === "clientSet" && a.subjectId === t.subjectId && a.action === "clientSet.unreportedDismissed"),
  );
}

export async function startReceiptClocks(
  db: OpsDatabase,
  set: OpsClientSet,
  receivedAt: number,
  /** Only these kinds (a corrected receipt restarts only the clocks still running). */
  only: string[] | null = null,
): Promise<void> {
  const startTimer = async (input: Parameters<typeof startTimerNow>[0]) => {
    if (!only || only.includes(input.kind)) await startTimerNow(input);
  };
  const holidays = db.holidays.map((h) => h.date);
  const window = ownershipWindow(receivedAt, holidays, numberOf(db, "set.ownershipWorkingDays", OWNERSHIP_WORKING_DAYS));
  const label = set.name;

  await startTimer({
    kind: "set.ownership",
    subjectType: "clientSet",
    subjectId: set.id,
    startsAt: receivedAt,
    dueAt: window.closesAt,
    warnAt: window.warnAt,
    ownerId: set.ownerId,
    payload: { label },
  });
  await startTimer({
    kind: "feedback.chase",
    subjectType: "clientSet",
    subjectId: set.id,
    startsAt: receivedAt,
    dueAt: receivedAt + numberOf(db, "feedback.chaseDays", 1) * 86_400_000,
    warnAt: null,
    ownerId: set.ownerId,
    payload: { label },
  });
  await startTimer({
    kind: "silence.hold",
    subjectType: "clientSet",
    subjectId: set.id,
    startsAt: receivedAt,
    dueAt: holdDueAt(receivedAt, numberOf(db, "hold.afterDays", HOLD_AFTER_DAYS)),
    warnAt: null,
    ownerId: set.ownerId,
    payload: { label },
  });
  // Three months (the setting), and the agreement's surcharge if they hired
  // from it without telling us (step 18). 18 Nov: it was a fixed 90 days.
  const unreportedAt = new Date(receivedAt);
  unreportedAt.setUTCMonth(unreportedAt.getUTCMonth() + numberOf(db, "hire.unreportedMonths", 3));
  await startTimer({
    kind: "hire.unreported",
    subjectType: "clientSet",
    subjectId: set.id,
    startsAt: receivedAt,
    dueAt: unreportedAt.getTime(),
    warnAt: null,
    ownerId: set.ownerId,
    payload: { label },
  });
}

/**
 * The client got the set on another day: the clocks still running start again from then (18 Nov: the date was
 * saved but the clocks kept counting from the old one). One that already fired is not fired twice.
 */
export async function restartReceiptClocks(set: OpsClientSet, receivedAt: number, by: Id): Promise<string[]> {
  const db = await desk();
  const kinds = ["set.ownership", "feedback.chase", "silence.hold", "hire.unreported"];
  const running = db.timers
    .filter((t) => t.subjectType === "clientSet" && t.subjectId === set.id && kinds.includes(t.kind))
    .filter((t) => t.state === "running" || t.state === "warned")
    .map((t) => t.kind);
  if (!running.length) return [];
  await cancelClocksFor(db, "clientSet", set.id, by, "The receipt date was corrected.", running);
  await startReceiptClocks(db, set, receivedAt, running);
  return running;
}

/* ── Requirements and positions (15, Phase 3) ─────────────────── */

export async function addRequirement(input: Omit<OpsRequirement, "id" | "createdAt" | "updatedAt">): Promise<OpsRequirement> {
  if (!usingConvex()) return repo.addRequirement(input);
  return (await convexMutation<OpsRequirement>("ops/data:addRequirement", input)) as OpsRequirement;
}

export async function patchRequirement(
  requirementId: Id,
  patch: Partial<OpsRequirement>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchRequirement(requirementId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchRequirement", { requirementId, patch, by, what, reason });
}

export function requirementIn(db: OpsDatabase, requirementId: Id): OpsRequirement | null {
  return db.requirements.find((r) => r.id === requirementId) ?? null;
}

export function requirementForLead(db: OpsDatabase, leadId: Id): OpsRequirement | null {
  return db.requirements.filter((r) => r.leadId === leadId).sort((a, b) => b.version - a.version)[0] ?? null;
}

export async function addPosition(input: Omit<OpsPosition, "id" | "createdAt" | "updatedAt">): Promise<OpsPosition> {
  if (!usingConvex()) return repo.addPosition(input);
  return (await convexMutation<OpsPosition>("ops/data:addPosition", input)) as OpsPosition;
}

export async function patchPosition(
  positionId: Id,
  patch: Partial<OpsPosition>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchPosition(positionId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchPosition", { positionId, patch, by, what, reason });
}

export function positionIn(db: OpsDatabase, positionId: Id): OpsPosition | null {
  return db.positions.find((p) => p.id === positionId) ?? null;
}

export function positionForOpening(db: OpsDatabase, openingTaId: string): OpsPosition | null {
  return db.positions.find((p) => p.openingTaId === openingTaId) ?? null;
}

export function positionsNewestFirst(db: OpsDatabase): OpsPosition[] {
  return [...db.positions].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * TA says an opening exists (15, Phase 3 step 7).
 *
 * Two cases, and they must not be confused. Either we handed a requirement
 * over and this is TA confirming it — then the position we already have gains
 * its opening id — or a TA created an opening by hand for a client we know,
 * and somebody has to link a requirement to it. Either way Ops never invents
 * an opening id.
 */
export async function takeOpeningCreated(data: Record<string, unknown>, now = Date.now()): Promise<OpsPosition | null> {
  const openingTaId = String(data.openingId ?? "").trim();
  const clientTaId = String(data.clientId ?? "").trim();
  if (!openingTaId) return null;

  const db = await desk();
  if (positionForOpening(db, openingTaId)) return null;

  const title = String(data.title ?? "").trim();
  // Ours, if we handed one over for this client and it is still waiting for an
  // id. The oldest waiting one, because they were handed over in order.
  const waiting = db.positions
    .filter((p) => p.openingTaId === null && p.clientTaId === clientTaId)
    .sort((a, b) => a.handedOverAt - b.handedOverAt)[0];

  if (waiting) {
    await patchPosition(
      waiting.id,
      { openingTaId, stage: "searching", taStatus: "open" },
      null,
      "position.openingConfirmed",
      "TA created opening " + openingTaId,
    );
    await createTask({
      kind: "check",
      title: "The opening is live in TA: " + (title || waiting.title),
      body: "TA has created it from our requirement. Nothing to do unless the TA asks something.",
      assigneeId: waiting.ownerId,
      dueAt: now,
      subjectType: "position",
      subjectId: waiting.id,
      link: "/positions/" + waiting.id,
    });
    return { ...waiting, openingTaId, stage: "searching" };
  }

  // Not ours: a TA opened it directly. We still want it on the client's page,
  // with somebody asked to link a requirement so the brief is not lost.
  const client = db.clients.find((c) => c.taClientId === clientTaId) ?? null;
  if (!client) return null;
  const made = await addPosition({
    requirementId: null,
    clientId: client.id,
    clientTaId,
    openingTaId,
    title: title || openingTaId,
    stage: "searching",
    primaryTaId: data.primaryRecruiterId ? String(data.primaryRecruiterId) : null,
    hundredPercentDay: null,
    taStatus: "open",
    jdApprovedAt: null,
    linkedInUrl: null,
    linkedInPostedAt: null,
    depthStage: null,
    shortlistedTotal: null,
    pendingCount: null,
    depthCheckedAt: null,
    handedOverAt: now,
    closedAt: null,
    ownerId: client.ownerId,
  });
  await createTask({
    kind: "record",
    title: "Link a requirement: " + made.title,
    body:
      "A TA created this opening in the TA System for a client of ours, so Ops has no requirement behind it. Write down what the client asked for, or link the meeting it came from.",
    assigneeId: client.ownerId,
    dueAt: now,
    subjectType: "position",
    subjectId: made.id,
    link: "/positions/" + made.id,
  });
  return made;
}

/**
 * TA has told us something about an opening we hold (step 8).
 *
 * Only the facts Ops shows a client are kept: the stage, whether the JD is
 * approved, and when it closed. TA stays the owner of the opening.
 */
export async function takeOpeningUpdate(type: string, data: Record<string, unknown>, now = Date.now()): Promise<void> {
  const openingTaId = String(data.openingId ?? "").trim();
  if (!openingTaId) return;
  const db = await desk();
  const position = positionForOpening(db, openingTaId);
  if (!position) return;

  if (type === "opening.jd_approved") {
    await patchPosition(position.id, { jdApprovedAt: now }, null, "position.jdApproved", null);
    return;
  }
  if (type === "opening.closed") {
    await patchPosition(
      position.id,
      { stage: "closed", taStatus: "closed", closedAt: now },
      null,
      "position.closed",
      String(data.reason ?? "") || null,
    );
    return;
  }
  if (type === "opening.working_stage_changed") {
    const stage = String(data.workingStage ?? "");
    await patchPosition(position.id, { taStatus: stage || position.taStatus }, null, "position.workingStage", stage || null);
    return;
  }
  const status = String(data.status ?? "").trim();
  if (status) {
    await patchPosition(
      position.id,
      { taStatus: status, stage: status === "on_hold" ? "on_hold" : status === "closed" ? "closed" : "searching" },
      null,
      "position.updated",
      status,
    );
  }
}

/* ── Talent Pulse, every Tuesday (15, Phase 3 step 14) ────────── */

export async function addIssue(input: Omit<OpsTalentPulseIssue, "id" | "createdAt" | "updatedAt">): Promise<OpsTalentPulseIssue> {
  if (!usingConvex()) return repo.addIssue(input);
  return (await convexMutation<OpsTalentPulseIssue>("ops/data:addIssue", input)) as OpsTalentPulseIssue;
}

export async function patchIssue(
  issueId: Id,
  patch: Partial<OpsTalentPulseIssue>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchIssue(issueId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchIssue", { issueId, patch, by, what, reason });
}

export function issueIn(db: OpsDatabase, issueId: Id): OpsTalentPulseIssue | null {
  return db.talentPulse.find((i) => i.id === issueId) ?? null;
}

export function issuesNewestFirst(db: OpsDatabase): OpsTalentPulseIssue[] {
  return [...db.talentPulse].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Compile this week's Talent Pulse (step 14).
 *
 * Every position being searched goes in, with the line the TA writes about it
 * left empty on purpose: the newsletter is nothing without those lines, and
 * an empty one is a question for the TA rather than something to invent.
 *
 * One issue per Tuesday. Asking twice gives the issue that already exists, so
 * the clock and the button cannot make two.
 */
export async function compileTalentPulse(by: Id, now = Date.now()): Promise<OpsTalentPulseIssue | null> {
  const db = await desk();
  const week = weekOf(now);
  const already = db.talentPulse.find((i) => i.weekOf === week);
  if (already) return already;

  const open = db.positions.filter((p) => p.stage === "searching");
  const owner = db.members.find((m) => m.active && m.role === "ops_lead")?.id ?? by;
  const issue = await addIssue({
    weekOf: week,
    state: "compiling",
    lines: open.map((p) => ({
      positionId: p.id,
      openingTaId: p.openingTaId,
      title: p.title,
      client: (p.clientId ? clientIn(db, p.clientId)?.name : null) ?? p.clientTaId,
      note: "",
      applyAddress: "",
    })),
    postedAt: null,
    postedBy: null,
    ownerId: owner,
  });

  await createTask({
    kind: "record",
    title: "Talent Pulse for " + week + ": " + open.length + (open.length === 1 ? " position" : " positions"),
    body:
      open.length === 0
        ? "Nothing is being searched this week, so there is nothing to put in it."
        : "Each role needs one line from its TA, and an apply address so a CV knows which role it came from. Then it goes to marketing to post tomorrow.",
    assigneeId: owner,
    dueAt: now,
    subjectType: "talentPulse",
    subjectId: issue.id,
    link: "/talent-pulse",
  });

  // Next Tuesday, from this one: the rhythm keeps itself.
  await startTimer({
    kind: "talentpulse.compile",
    subjectType: "talentPulse",
    subjectId: issue.id,
    startsAt: now,
    dueAt: nextTuesdayNineAm(now),
    warnAt: null,
    ownerId: owner,
    payload: { label: "Talent Pulse" },
  });
  return issue;
}

/**
 * Three months after a set went out: was anybody in it hired? (15, Phase 4.)
 *
 * The clock only asks. Nobody is invoiced because a clock fired - a person
 * checks with the client and with TA, and the surcharge goes only when
 * somebody says they are sure, because the whole point of it is that we were
 * not told and might be wrong about why.
 */
export async function askAboutUnreportedHire(setId: Id, now = Date.now()): Promise<void> {
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) return;
  // A set whose candidates we know were placed is not a question.
  const placed = db.placements.some((p) => p.openingTaId === set.openingTaId && p.state !== "cancelled");
  if (placed) return;

  const months = numberOf(db, "hire.unreportedMonths", 3);
  await createTask({
    kind: "decide",
    title: "Three months on: was anybody from " + set.name + " hired?",
    body:
      "The set went out " +
      months +
      " months ago and nothing came back. Ask the client, and look at the candidates on LinkedIn.\n\n" +
      "If one of them is working there, the agreement provides for a surcharge of " +
      numberOf(db, "hire.surchargePct", 50) +
      "% of the fee. Confirm it on the set's page - and if we are wrong, dismiss it with a reason. Nobody is invoiced by a clock.",
    assigneeId: set.ownerId,
    dueAt: now,
    subjectType: "clientSet",
    subjectId: setId,
    link: "/sets/" + setId,
  });
}

/**
 * The surcharge invoice for a hire we were never told about (15, Phase 6 step 15).
 *
 * The salary is typed in by a person, because a client who did not tell us
 * they hired somebody has not told us the package either. It is the
 * requirement's salary unless somebody knows better, and whatever is used is
 * written on the invoice so the client can argue with the number rather than
 * with us.
 */
export async function draftSurchargeInvoice(
  setId: Id,
  candidateName: string,
  monthlySalary: number,
  by: Id,
  now = Date.now(),
  hiredStartDate: string | null = null,
): Promise<{ ok: boolean; what: string; invoiceId: Id | null }> {
  const db = await desk();
  const set = clientSetIn(db, setId);
  if (!set) return { ok: false, what: "That set is gone.", invoiceId: null };
  const already = db.invoices.find((i) => i.setId === setId && i.kind === "surcharge");
  if (already) {
    return { ok: false, what: "A surcharge for this set has already been raised.", invoiceId: already.id };
  }

  const position = positionForSet(db, set);
  const client = set.clientId ? clientIn(db, set.clientId) : null;
  const agreement = client?.leadId
    ? [...db.agreements].reverse().find((a) => a.leadId === client.leadId && (a.state === "signed" || a.state === "countersigned"))
    : null;
  const feeMonths = Number(agreement?.fields.feeMonths ?? 1) || 1;
  const feeBasis = String(agreement?.fields.feeBasis ?? "gross");
  const pct = numberOf(db, "hire.surchargePct", 50);
  const fee = feeAmount({ feeMonths, feeBasis }, monthlySalary);
  const amount = Math.round(fee * (pct / 100) * 100) / 100;

  const invoice = await addInvoice({
    number: invoiceNumber(textOf(db, "invoice.series", "C141"), db.invoices.length, now),
    kind: "surcharge",
    about:
      candidateName +
      " (" +
      (position?.title ?? set.role) +
      "), hired without our being told - " +
      pct +
      "% of " +
      feeInWords({ feeMonths, feeBasis }) +
      " of " +
      money(monthlySalary, "LKR"),
    setId,
    againstInvoiceId: null,
    placementId: null,
    clientId: set.clientId,
    state: "draft",
    amount,
    currency: "LKR",
    lateCharge: 0,
    lateMonths: 0,
    disputed: false,
    disputedReason: null,
    payments: [],
    sentAt: null,
    sentMessageId: null,
    dueAt: dueOn(now, numberOf(db, "invoice.dueDays", DUE_DAYS)),
    paidAt: null,
    writtenOffAt: null,
    reason: null,
    hiredStartDate,
    ownerId: db.members.find((m) => m.active && m.role === "accounts")?.id ?? by,
  });

  await createTask({
    kind: "approve",
    title: "A surcharge invoice: " + invoice.number,
    body:
      "For " +
      candidateName +
      ", who was hired without our being told. Read it before it goes - this one starts an argument if the facts are wrong.",
    assigneeId: invoice.ownerId,
    dueAt: now,
    subjectType: "invoice",
    subjectId: invoice.id,
    link: "/invoices/" + invoice.id,
  });
  return { ok: true, what: "Surcharge " + invoice.number + " drafted: " + money(amount, "LKR") + ".", invoiceId: invoice.id };
}

/**
 * A credit note (15, Phase 6 step 16).
 *
 * For a refund under the guarantee, or a correction to an invoice we got
 * wrong. It is its own row rather than a negative payment, because what the
 * client holds is a document of its own and the two have to agree.
 */
export async function draftCreditNote(
  againstInvoiceId: Id,
  amount: number,
  why: string,
  by: Id,
  now = Date.now(),
): Promise<{ ok: boolean; what: string; invoiceId: Id | null }> {
  const db = await desk();
  const against = invoiceIn(db, againstInvoiceId);
  if (!against) return { ok: false, what: "That invoice is gone.", invoiceId: null };

  const note = await addInvoice({
    number: invoiceNumber(textOf(db, "invoice.series", "C141"), db.invoices.length, now) + "-CN",
    kind: "credit_note",
    about: "Credit note against " + against.number + ". " + why,
    setId: null,
    againstInvoiceId,
    placementId: against.placementId,
    clientId: against.clientId,
    state: "draft",
    amount,
    currency: against.currency,
    lateCharge: 0,
    lateMonths: 0,
    disputed: false,
    disputedReason: null,
    payments: [],
    sentAt: null,
    sentMessageId: null,
    dueAt: null,
    paidAt: null,
    writtenOffAt: null,
    reason: why,
    ownerId: db.members.find((m) => m.active && m.role === "accounts")?.id ?? by,
  });
  await createTask({
    kind: "approve",
    title: "A credit note: " + note.number,
    body: money(amount, against.currency) + " against " + against.number + ".\n\n" + why,
    assigneeId: note.ownerId,
    dueAt: now,
    subjectType: "invoice",
    subjectId: note.id,
    link: "/invoices/" + note.id,
  });
  return { ok: true, what: "Credit note " + note.number + " drafted.", invoiceId: note.id };
}

/* ── The AI layer (15, Phase 9) ────────────────────────────────── */

/** One line of the desk assistant's thread (8 Nov, docs/31). */
export async function addChatRow(input: Omit<OpsChatRow, "id">): Promise<OpsChatRow> {
  if (!usingConvex()) return repo.addChatRow(input);
  return (await convexMutation<OpsChatRow>("ops/data:addChatRow", input)) as OpsChatRow;
}

export async function updateChatRow(rowId: Id, patch: Partial<Pick<OpsChatRow, "state" | "text" | "actionName">>): Promise<void> {
  if (!usingConvex()) {
    repo.updateChatRow(rowId, patch);
    return;
  }
  await convexMutation("ops/data:updateChatRow", { rowId, ...patch });
}

/** What is pinned at the top of the chat: the desk's state in four chips, the same counts Your day shows. */
export function pinsOf(db: OpsDatabase, memberId: Id, now: number): { label: string; value: string; late?: boolean }[] {
  const drafts = db.messages.filter((m) => m.state === "draft").length;
  const own = db.members.find((m) => m.id === memberId)?.email.toLowerCase();
  const fresh = db.inbound.filter((i) => i.readState === "new" && (!own || i.mailbox.toLowerCase() === own)).length;
  const mine = db.tasks.filter((t) => t.state === "open" && t.assigneeId === memberId);
  const late = mine.filter((t) => t.dueAt < now).length;
  return [
    { label: "To approve", value: String(drafts) },
    { label: "Your new email", value: String(fresh) },
    { label: "Your tasks", value: String(mine.length) },
    { label: "Late", value: String(late), late: late > 0 },
  ];
}

/** This person's thread, oldest first, the newest `limit` lines. */
export function chatFor(db: OpsDatabase, memberId: Id, limit = 80): OpsChatRow[] {
  return db.chat.filter((r) => r.memberId === memberId).sort((a, b) => a.at - b.at).slice(-limit);
}

export async function addAiRun(input: Omit<OpsAiRun, "id">): Promise<OpsAiRun> {
  if (!usingConvex()) return repo.addAiRun(input);
  return (await convexMutation<OpsAiRun>("ops/data:addAiRun", input)) as OpsAiRun;
}

export async function recordAiOutcome(runId: Id, outcome: string, kept: unknown, by: Id): Promise<void> {
  if (!usingConvex()) {
    repo.recordAiOutcome(runId, outcome, kept, by);
    return;
  }
  await convexMutation("ops/data:recordAiOutcome", { runId, outcome, kept, by });
}

export function aiRunIn(db: OpsDatabase, runId: Id): OpsAiRun | null {
  return db.aiRuns.find((r) => r.id === runId) ?? null;
}

export function aiRunsNewestFirst(db: OpsDatabase): OpsAiRun[] {
  return [...db.aiRuns].sort((a, b) => b.at - a.at);
}

/** What the layer has spent since midnight, Colombo. */
export function aiSpentToday(db: OpsDatabase, now = Date.now()): number {
  const today = colomboDate(now);
  const spent = db.aiRuns.filter((r) => colomboDate(r.at) === today).reduce((sum, r) => sum + r.cost, 0);
  return Math.round(spent * 100) / 100;
}

/** The switches as the layer reads them, settings and keys together. */
export function aiSwitches(db: OpsDatabase, now = Date.now()): AiSwitches {
  const tasks: Record<string, boolean> = {};
  for (const task of Object.keys(AI_TASKS)) {
    const value = db.settings.find((s) => s.key === "ai.task." + task)?.value;
    tasks[task] = value !== false;
  }
  return {
    on: switchedOn(db, "switch.aiEnabled"),
    tasks,
    dailyBudget: numberOf(db, "ai.dailyBudget", DAILY_BUDGET),
    spentToday: aiSpentToday(db, now),
  };
}

/**
 * Everything waiting on this person today, as one list the rules can order
 * (8 Nov, UX order 6). Built here and nowhere else, so the day page and the
 * "why first" action read the same list and cannot disagree.
 */
export function dayItems(db: OpsDatabase, memberId: Id, now: number): DayItem[] {
  const items: DayItem[] = [];
  for (const m of draftsWaiting(db)) {
    const routine = isRoutine(m, m.templateKey ? templateFor(db, m.templateKey) : null);
    items.push({ said: messageTitle(m) + " - " + messageInWords(m), href: "/messages/" + m.id, kind: routine ? "routine" : "draft", at: m.createdAt });
  }
  for (const t of openTasksFor(db, memberId)) {
    if (t.dueAt < now) items.push({ said: t.title, href: "/tasks/" + t.id, kind: "late", at: t.dueAt });
    else if (t.dueAt < now + DAY) items.push({ said: t.title, href: "/tasks/" + t.id, kind: "due", at: t.dueAt });
  }
  for (const timer of liveTimersFor(db, memberId)) {
    if (timer.dueAt < now + DAY) items.push({ said: timer.payload.label ?? clockInWords(timer.kind), href: "/", kind: "clock", at: timer.dueAt });
  }
  // Mail as one line rather than one per email (9 Nov): your own box, or
  // the whole desk for the ops lead and the Director - each email once.
  const me = db.members.find((m) => m.id === memberId);
  const own = me?.email.toLowerCase();
  const whole = me ? me.role === "ops_lead" || me.role === "director_ops" : false;
  const waitingRows = db.inbound.filter((i) => i.readState === "new" && (whole || (own && i.mailbox.toLowerCase() === own)));
  const waiting = [...new Map(waitingRows.map((i) => [i.from + "|" + i.subject + "|" + i.receivedAt, i])).values()];
  if (waiting.length) {
    const oldest = waiting.reduce((n, i) => Math.min(n, i.receivedAt), now);
    const where = whole ? "across the desk" : "in your mailbox";
    items.push({ said: waiting.length + (waiting.length === 1 ? " email " + where + " waits" : " emails " + where + " wait") + " for an answer", href: whole ? "/mail?box=all" : "/mail?box=mine", kind: "mail", at: oldest });
  }
  return items;
}

/** The line the model wrote for this person, day and first thing, if it has - one run, read back since. */
export function whyFirstKept(db: OpsDatabase, key: string): string | null {
  const run = db.aiRuns
    .filter((r) => r.subjectType === "whatfirst" && r.subjectId === key && r.ok)
    .sort((a, b) => b.at - a.at)[0];
  const got = run?.proposed as { because?: string } | undefined;
  return got?.because?.trim() || null;
}

/**
 * Run one AI task and write it down (steps 1 to 4, 17 and 19).
 *
 * The only way the rest of the system asks a model anything. It checks the
 * switches and the budget first, asks once, records the run whatever
 * happened, and hands back a proposal - which is a suggestion with an id, so
 * what the person then does with it can be recorded against it.
 *
 * It is called from an action a person pressed or from the clock pass, never
 * while a screen renders: the Claude subscription is a pool, and a page that
 * spends on every render empties it by lunchtime (3 Nov).
 */
export async function runAi<T>(
  task: AiTask,
  built: { system: string; prompt: string; maxTokens?: number },
  by: Id,
  about: { type: string; id: Id } | null = null,
  read: string[] = [],
  now = Date.now(),
): Promise<{ proposal: Proposal<T>; runId: Id | null; problem: string | null }> {
  const db = await desk();
  const provider = providerNow(task);
  const problem = problemWithRunning(task, provider, aiSwitches(db, now));
  if (problem) return { proposal: nothing<T>(task, problem, provider), runId: null, problem };

  const proposal = await ask<T>({ task, system: built.system, prompt: built.prompt, read, maxTokens: built.maxTokens });
  const run = await addAiRun({
    task,
    provider: proposal.provider,
    model: proposal.model,
    read,
    proposed: proposal.data,
    outcome: null,
    kept: null,
    ok: proposal.ok,
    because: proposal.because,
    tokensIn: proposal.tokensIn,
    tokensOut: proposal.tokensOut,
    cost: proposal.cost,
    ms: proposal.ms,
    subjectType: about?.type ?? null,
    subjectId: about?.id ?? null,
    by,
    at: now,
  });
  return { proposal, runId: run.id, problem: proposal.ok ? null : proposal.because };
}

/**
 * How often each task's proposals are changed (step 16).
 *
 * Accuracy, not impressions: the share of proposals a person used as they
 * were. A task whose proposals are nearly always edited is a prompt to fix,
 * and the screen says so plainly rather than hiding it behind a number.
 */
export function aiAccuracy(db: OpsDatabase): {
  task: string;
  runs: number;
  used: number;
  edited: number;
  ignored: number;
  cost: number;
  words: string;
}[] {
  return Object.keys(AI_TASKS).map((task) => {
    const runs = db.aiRuns.filter((r) => r.task === task);
    const decided = runs.filter((r) => r.outcome);
    const used = decided.filter((r) => r.outcome === "used").length;
    const edited = decided.filter((r) => r.outcome === "edited").length;
    const ignored = decided.filter((r) => r.outcome === "ignored").length;
    const cost = Math.round(runs.reduce((sum, r) => sum + r.cost, 0) * 100) / 100;
    let words: string;
    if (!runs.length) words = "Never used yet";
    else if (!decided.length) words = runs.length + " asked, none decided on yet";
    else {
      const share = Math.round((used / decided.length) * 100);
      words =
        runs.length +
        " asked · " +
        share +
        "% used as they came" +
        (edited ? ", " + edited + " edited" : "") +
        (ignored ? ", " + ignored + " ignored" : "") +
        (share < 50 && decided.length >= 4 ? " · worth fixing the prompt, or switching this one off" : "");
    }
    return { task, runs: runs.length, used, edited, ignored, cost, words };
  });
}

/* ── Paid adverts: TopJobs (15, Phase 3 step 12) ───────────────── */

export async function addAd(input: Omit<OpsAd, "id" | "createdAt" | "updatedAt">): Promise<OpsAd> {
  if (!usingConvex()) return repo.addAd(input);
  return (await convexMutation<OpsAd>("ops/data:addAd", input)) as OpsAd;
}

export async function patchAd(
  adId: Id,
  patch: Partial<OpsAd>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchAd(adId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchAd", { adId, patch, by, what, reason });
}

export function adIn(db: OpsDatabase, adId: Id): OpsAd | null {
  return db.ads.find((a) => a.id === adId) ?? null;
}

export function adsNewestFirst(db: OpsDatabase): OpsAd[] {
  return [...db.ads].sort((a, b) => b.requestedAt - a.requestedAt);
}

export function liveAdFor(db: OpsDatabase, openingTaId: string): OpsAd | null {
  return (
    db.ads.find((a) => a.openingTaId === openingTaId && a.state !== "closed" && a.state !== "dropped") ?? null
  );
}

/**
 * Two weeks are up: the advert comes down (step 12).
 *
 * TopJobs tells ops when it closes and ops tells the TA; the clock is here so
 * that an advert nobody took down is noticed by us rather than by a candidate
 * applying to a job that has gone.
 */
export async function askAboutClosingAd(adId: Id, now = Date.now()): Promise<void> {
  const db = await desk();
  const ad = adIn(db, adId);
  if (!ad || ad.state !== "live") return;
  await createTask({
    kind: "check",
    title: "The TopJobs advert is two weeks old: " + ad.title,
    body:
      "It should come down now. TopJobs usually tells us; if they have not, ask them. Then tick it closed here and the TA System is told, so nobody is left applying to a job that has gone.",
    assigneeId: ad.ownerId,
    dueAt: now,
    subjectType: "ad",
    subjectId: adId,
    link: "/adverts/" + adId,
  });
}

/* ── Guarantees and the close checklist (15, Phase 7) ──────────── */

export async function addGuarantee(
  input: Omit<OpsGuarantee, "id" | "createdAt" | "updatedAt">,
): Promise<OpsGuarantee> {
  if (!usingConvex()) return repo.addGuarantee(input);
  return (await convexMutation<OpsGuarantee>("ops/data:addGuarantee", input)) as OpsGuarantee;
}

export async function patchGuarantee(
  guaranteeId: Id,
  patch: Partial<OpsGuarantee>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchGuarantee(guaranteeId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchGuarantee", { guaranteeId, patch, by, what, reason });
}

export function guaranteeIn(db: OpsDatabase, guaranteeId: Id): OpsGuarantee | null {
  return db.guarantees.find((g) => g.id === guaranteeId) ?? null;
}

export function guaranteesNewestFirst(db: OpsDatabase): OpsGuarantee[] {
  return [...db.guarantees].sort((a, b) => b.startsAt - a.startsAt);
}

/** The live guarantee for a placement, or for an opening being replaced. */
export function guaranteeForPlacement(db: OpsDatabase, placementId: Id): OpsGuarantee | null {
  return [...db.guarantees].reverse().find((g) => g.placementId === placementId) ?? null;
}

export function replacingGuaranteeFor(db: OpsDatabase, openingTaId: string): OpsGuarantee | null {
  return db.guarantees.find((g) => g.openingTaId === openingTaId && g.state === "replacing") ?? null;
}

export async function addChecklist(
  input: Omit<OpsCloseChecklist, "id" | "createdAt" | "updatedAt">,
): Promise<OpsCloseChecklist> {
  if (!usingConvex()) return repo.addChecklist(input);
  return (await convexMutation<OpsCloseChecklist>("ops/data:addChecklist", input)) as OpsCloseChecklist;
}

export async function patchChecklist(
  checklistId: Id,
  patch: Partial<OpsCloseChecklist>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchChecklist(checklistId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchChecklist", { checklistId, patch, by, what, reason });
}

export function checklistIn(db: OpsDatabase, checklistId: Id): OpsCloseChecklist | null {
  return db.closeChecklists.find((c) => c.id === checklistId) ?? null;
}

export function checklistsNewestFirst(db: OpsDatabase): OpsCloseChecklist[] {
  return [...db.closeChecklists].sort((a, b) => b.createdAt - a.createdAt);
}

export function openChecklistFor(db: OpsDatabase, openingTaId: string): OpsCloseChecklist | null {
  return db.closeChecklists.find((c) => c.openingTaId === openingTaId && !c.completedAt) ?? null;
}

/**
 * Start the guarantee (step 2).
 *
 * Ninety days from the day they joined, for every hire, whether or not the
 * fee has been paid yet - because the clock is from joining and the payment
 * can come later. Whether it is honoured is a different question, asked the
 * day somebody leaves.
 *
 * A replacement gets its own guarantee and no invoice, which is the owner's
 * rule.
 */
export async function startGuarantee(
  placementId: Id,
  now = Date.now(),
): Promise<OpsGuarantee | null> {
  const db = await desk();
  const placement = placementIn(db, placementId);
  if (!placement || !placement.joinedAt) return null;
  const already = db.guarantees.find((g) => g.placementId === placementId);
  if (already) return already;

  const days = numberOf(db, "guarantee.days", GUARANTEE_DAYS);
  const invoice = placement.invoiceId ? invoiceIn(db, placement.invoiceId) : null;
  const guarantee = await addGuarantee({
    placementId,
    openingTaId: placement.openingTaId,
    clientId: placement.clientId,
    candidateName: placement.candidateName,
    state: "running",
    startsAt: placement.joinedAt,
    endsAt: endsOn(placement.joinedAt, days),
    // A replacement is covered by the fee already paid on the first hire.
    feePaidAt: invoice?.paidAt ?? (placement.isReplacementOf ? now : null),
    leftAt: null,
    reason: null,
    deadlineAt: null,
    replacedByPlacementId: null,
    refundPct: null,
    refundAmount: null,
    decidedBy: null,
    decidedAt: null,
    ownerId: placement.ownerId,
  });

  await startTimer({
    kind: "guarantee.warn",
    subjectType: "guarantee",
    subjectId: guarantee.id,
    startsAt: now,
    dueAt: warnOn(placement.joinedAt, numberOf(db, "guarantee.warnDay", WARN_DAY)),
    warnAt: null,
    ownerId: guarantee.ownerId,
    payload: { label: placement.candidateName },
  });
  await startTimer({
    kind: "guarantee.end",
    subjectType: "guarantee",
    subjectId: guarantee.id,
    startsAt: now,
    dueAt: guarantee.endsAt,
    warnAt: null,
    ownerId: guarantee.ownerId,
    payload: { label: placement.candidateName },
  });
  return guarantee;
}

/**
 * Day 75: the warning (step 2).
 *
 * Fifteen days left is the owner's own number. Nothing is sent to anybody -
 * it is a look at the person while there is still time to do something if
 * they are wobbling.
 */
export async function warnAboutGuarantee(guaranteeId: Id, now = Date.now()): Promise<void> {
  const db = await desk();
  const guarantee = guaranteeIn(db, guaranteeId);
  if (!guarantee || guarantee.state !== "running") return;
  await patchGuarantee(guaranteeId, { state: "warned" }, null, "guarantee.warned", null);
  await createTask({
    kind: "check",
    title: "Fifteen days of guarantee left: " + guarantee.candidateName,
    body:
      "Ask the TA how they are getting on, and the client if there is anything to know. A leaver found on day 76 costs us a replacement; one found now may not leave at all.",
    assigneeId: guarantee.ownerId,
    dueAt: now,
    subjectType: "guarantee",
    subjectId: guaranteeId,
    link: "/guarantees/" + guaranteeId,
  });
}

/**
 * Day 90 with nobody having left: a clean end (step 3).
 *
 * The guarantee ends and the close checklist is made, because this is the
 * ordinary way a position finishes and the things that get forgotten are
 * forgotten here.
 */
export async function endGuaranteeClean(guaranteeId: Id, now = Date.now()): Promise<void> {
  const db = await desk();
  const guarantee = guaranteeIn(db, guaranteeId);
  if (!guarantee) return;
  if (guarantee.state !== "running" && guarantee.state !== "warned") return;

  await patchGuarantee(guaranteeId, { state: "ended_clean" }, null, "guarantee.endedClean", null);
  await cancelClocksFor(db, "guarantee", guaranteeId, guarantee.ownerId, "The guarantee has ended.", null);
  const tell = db.members.filter((m) => m.active && (m.role === "accounts" || m.id === guarantee.ownerId));
  await draftMessage({
    channel: "internal",
    to: tell.map((m) => m.email).filter(Boolean),
    subject: "Guarantee ended cleanly: " + guarantee.candidateName,
    body:
      guarantee.candidateName +
      " has been in the job ninety days. Nothing is owed either way, and the position closes.",
    templateKey: "guarantee.ended",
    subjectType: "guarantee",
    subjectId: guaranteeId,
  });
  await openCloseChecklist(guarantee.openingTaId, "ended_clean", guarantee.ownerId, now);
}

/**
 * Somebody left inside the ninety days (step 4).
 *
 * One question decides everything: was the fee paid in full? If it was not,
 * there was no guarantee to honour and the position simply closes. If it
 * was, the same position reopens and a replacement comes first - with sixty
 * working days to finalise one.
 */
export async function markLeaver(
  guaranteeId: Id,
  leftAt: number,
  reason: string,
  by: Id | null,
  now = Date.now(),
): Promise<{ ok: boolean; what: string }> {
  const db = await desk();
  const guarantee = guaranteeIn(db, guaranteeId);
  if (!guarantee) return { ok: false, what: "That guarantee is gone." };
  if (guarantee.state !== "running" && guarantee.state !== "warned") {
    return { ok: false, what: "That guarantee is not running any more." };
  }

  const verdict = verdictOnLeaver(guarantee.feePaidAt);
  const deadlineAt =
    verdict.state === "replacing"
      ? replacementDeadline(
          leftAt,
          numberOf(db, "replacement.workingDays", REPLACEMENT_WORKING_DAYS),
          db.holidays.map((h) => h.date),
        )
      : null;

  await patchGuarantee(
    guaranteeId,
    { state: verdict.state, leftAt, reason, deadlineAt },
    by,
    "guarantee." + verdict.state,
    reason,
  );
  await cancelClocksFor(db, "guarantee", guaranteeId, by ?? guarantee.ownerId, "They have left.", null);
  await queueTaWrite(
    "/integrations/v1/placements/" + (placementIn(db, guarantee.placementId)?.placementTaId ?? "") + "/left",
    { leftAt, reason, guaranteeHolds: verdict.state === "replacing" },
    { type: "guarantee", id: guaranteeId },
  );

  if (verdict.state === "void") {
    await openCloseChecklist(guarantee.openingTaId, "void", by ?? guarantee.ownerId, now);
    return { ok: true, what: verdict.because };
  }

  // The search reopens on TA's side, because TA holds the pipeline.
  await queueTaWrite(
    "/integrations/v1/openings/" + guarantee.openingTaId + "/status",
    { status: "open", reason: "replacement under the guarantee" },
    { type: "guarantee", id: guaranteeId },
  );
  await startTimer({
    kind: "replacement.deadline",
    subjectType: "guarantee",
    subjectId: guaranteeId,
    startsAt: now,
    dueAt: deadlineAt ?? now,
    warnAt: null,
    ownerId: guarantee.ownerId,
    payload: { label: guarantee.candidateName },
  });
  await createTask({
    kind: "check",
    title: "A replacement for " + guarantee.candidateName,
    body:
      verdict.because +
      "\n\nThe TA System has been asked to reopen the position. Sixty working days to finalise a replacement; after that it is the Director's decision, not a timeout.",
    assigneeId: guarantee.ownerId,
    dueAt: now,
    subjectType: "guarantee",
    subjectId: guaranteeId,
    link: "/guarantees/" + guaranteeId,
  });
  return { ok: true, what: verdict.because };
}

/**
 * The sixty working days have run out (step 6).
 *
 * Nothing is refunded by a clock. The question goes to the Director of
 * Operations, who decides - and the owner's rule is that a refund is a
 * decision, never a default.
 */
export async function askAboutRefund(guaranteeId: Id, now = Date.now()): Promise<void> {
  const db = await desk();
  const guarantee = guaranteeIn(db, guaranteeId);
  if (!guarantee || guarantee.state !== "replacing") return;
  await createTask({
    kind: "decide",
    title: "No replacement for " + guarantee.candidateName + " - refund?",
    body:
      "Sixty working days have gone since they left and there is no replacement. The agreement refunds part of the fee, by decision. Replacing them is still the better answer if it is possible at all.",
    assigneeId: db.members.find((m) => m.active && m.role === "director_ops")?.id ?? guarantee.ownerId,
    dueAt: now,
    subjectType: "guarantee",
    subjectId: guaranteeId,
    link: "/guarantees/" + guaranteeId,
  });
}

/**
 * A replacement was placed (step 5).
 *
 * Called when a placement arrives for an opening whose guarantee is looking
 * for one. The old guarantee is closed as replaced, the new placement is
 * marked a replacement so nothing is invoiced, and the new guarantee starts
 * from the new joining day.
 */
export async function takeReplacement(
  placementId: Id,
  openingTaId: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await desk();
  const guarantee = replacingGuaranteeFor(db, openingTaId);
  if (!guarantee) return false;
  await patchPlacement(
    placementId,
    { isReplacementOf: guarantee.placementId },
    null,
    "placement.isReplacement",
    "Under the guarantee for " + guarantee.candidateName + ", so nothing is invoiced.",
  );
  await patchGuarantee(
    guarantee.id,
    { state: "replaced", replacedByPlacementId: placementId },
    null,
    "guarantee.replaced",
    null,
  );
  await cancelClocksFor(db, "guarantee", guarantee.id, guarantee.ownerId, "They have been replaced.", null);
  await createTask({
    kind: "check",
    title: "Replacement placed for " + guarantee.candidateName,
    body:
      "Nothing is invoiced for this one - it is the replacement under the guarantee - and a new ninety days starts the day they join.",
    assigneeId: guarantee.ownerId,
    dueAt: now,
    subjectType: "guarantee",
    subjectId: guarantee.id,
    link: "/guarantees/" + guarantee.id,
  });
  return true;
}

/**
 * Open the close checklist (step 11).
 *
 * One per opening at a time. The items are the things that get forgotten, and
 * only the ones this position really had: no LinkedIn post means no item
 * about closing one.
 */
/* ── The Openings sample, for testing on a laptop (18 Nov) ─────────── */

/**
 * Loads the invented Openings desk (src/data/sampleOpenings.ts) into the laptop's store and starts the clocks its
 * states imply, through the same starters the real flow uses. The JSON store only: the file is copied aside first.
 */
export async function loadOpeningsSample(ownerId: Id, now = Date.now()): Promise<{ ok: true; backup: string; counts: Record<string, number> } | { ok: false; why: string }> {
  if (usingConvex()) return { ok: false, why: "The Openings sample is for the laptop run (sh deploy/local/start-ui.sh), not the Convex backend." };
  if (repo.all().clients.some((c) => c.id.startsWith(SAMPLE_PREFIX))) return { ok: false, why: "The Openings sample is already loaded." };
  const rows = sampleOpenings(now, ownerId);
  // The Placements sample rides along (18 Nov): one placed job for each placement, invoice and guarantee state.
  const money = samplePlacements(now, ownerId);
  rows.positions.push(...money.positions);
  rows.closeChecklists.push(...money.closeChecklists);
  // The staged desk (19 Nov): leads at every step, agreements in every state, every interview and hold state, the inbox.
  const staged = sampleDesk(now, ownerId, repo.all().holidays.map((h) => h.date));
  const { clockSetIds, ...stagedRows } = staged;
  const merged: Record<string, unknown[]> = {
    ...(rows as unknown as Record<string, unknown[]>),
    placements: money.placements,
    invoices: money.invoices,
    guarantees: money.guarantees,
  };
  for (const [key, list] of Object.entries(stagedRows)) merged[key] = [...(merged[key] ?? []), ...list];
  const backup = repo.addSample(merged as Partial<Record<keyof OpsDatabase, unknown[]>>);
  const counts = Object.fromEntries(Object.entries(merged).map(([key, list]) => [key, list.length]));
  const db = repo.all();
  // Agreements that were sent and are being chased have their next chase clock, as chasing one by hand would start.
  for (const esa of staged.agreements) {
    if ((esa.state !== "sent" && esa.state !== "chasing") || !esa.sentAt) continue;
    // A client who replied is not chased (the staged "client replied" example).
    if (staged.inbound.some((m) => m.subjectId === esa.id)) continue;
    const next = nextChaseAt(esa.chaseStep, esa.chaseStep ? esa.updatedAt : esa.sentAt);
    if (next) await startTimer({ kind: "esa.chase", subjectType: "esa", subjectId: esa.id, startsAt: esa.sentAt, dueAt: next.dueAt, warnAt: null, ownerId, payload: { label: String(esa.fields.companyName ?? ""), step: String(next.step) } });
  }
  for (const set of staged.clientSets) {
    if (clockSetIds.includes(set.id) && set.receivedAt) await startReceiptClocks(db, set, set.receivedAt);
    if (set.state === "reviewing" && set.dueAt) {
      await startTimer({ kind: "set.due", subjectType: "clientSet", subjectId: set.id, startsAt: now, dueAt: set.dueAt, warnAt: set.dueAt - 86_400_000, ownerId, payload: { label: set.name } });
    }
  }
  for (const set of rows.clientSets) {
    if (set.state === "sent" && set.receivedAt) await startReceiptClocks(db, set, set.receivedAt);
    if (set.state === "ready" && set.dueAt) {
      await startTimer({ kind: "set.due", subjectType: "clientSet", subjectId: set.id, startsAt: now, dueAt: set.dueAt, warnAt: set.dueAt - 86_400_000, ownerId, payload: { label: set.name } });
    }
  }
  // The clocks those states would have running, so "move a clock to now" has them (only ones still ahead).
  for (const placement of money.placements) {
    if (placement.state === "placed" && placement.joinDate && placement.joinDate > now) await startJoinClocks(placement, now);
  }
  for (const inv of money.invoices) {
    if (!["sent", "partly_paid"].includes(inv.state) || inv.kind === "credit_note" || !inv.dueAt) continue;
    // Not due yet: the due clock. Overdue: the next monthly chase.
    const dueAt = inv.dueAt > now ? inv.dueAt : now + 30 * 86_400_000 - ((now - inv.dueAt) % (30 * 86_400_000));
    await startTimer({ kind: inv.dueAt > now ? "invoice.due" : "invoice.chase", subjectType: "invoice", subjectId: inv.id, startsAt: inv.sentAt ?? now, dueAt, warnAt: null, ownerId, payload: { label: inv.number } });
  }
  for (const g of money.guarantees) {
    if (g.state === "running") {
      await startTimer({ kind: "guarantee.warn", subjectType: "guarantee", subjectId: g.id, startsAt: g.startsAt, dueAt: warnOn(g.startsAt, numberOf(db, "guarantee.warnDay", WARN_DAY)), warnAt: null, ownerId, payload: { label: g.candidateName } });
    }
    if (g.state === "running" || g.state === "warned") {
      await startTimer({ kind: "guarantee.end", subjectType: "guarantee", subjectId: g.id, startsAt: g.startsAt, dueAt: g.endsAt, warnAt: null, ownerId, payload: { label: g.candidateName } });
    }
    if (g.state === "replacing" && g.deadlineAt) {
      await startTimer({ kind: "replacement.deadline", subjectType: "guarantee", subjectId: g.id, startsAt: g.leftAt ?? now, dueAt: g.deadlineAt, warnAt: null, ownerId, payload: { label: g.candidateName } });
    }
  }
  for (const ad of rows.ads) {
    if (ad.state === "live" && ad.closesAt) {
      await startTimer({ kind: "ad.close", subjectType: "ad", subjectId: ad.id, startsAt: ad.liveAt ?? now, dueAt: ad.closesAt, warnAt: null, ownerId, payload: { label: ad.title } });
    }
  }
  return { ok: true, backup, counts };
}

/** Takes the sample out again, and everything that hung off it; the stand-in TA forgets what it remembered. */
export async function removeOpeningsSample(): Promise<{ ok: true; gone: number } | { ok: false; why: string }> {
  if (usingConvex()) return { ok: false, why: "The Openings sample is for the laptop run, not the Convex backend." };
  const { fakeTaForget } = await import("@/data/fakeTa");
  fakeTaForget();
  return { ok: true, gone: repo.removeSample(SAMPLE_PREFIX) };
}

/** Dev only: a running clock comes due now, and the clocks run, so its step happens on the spot. */
export async function moveClockToNow(timerId: Id, now = Date.now()): Promise<{ ok: boolean; why?: string }> {
  if (usingConvex()) return { ok: false, why: "Moving a clock is for the laptop run only." };
  repo.moveTimerToNow(timerId, now);
  await runClocks(now);
  return { ok: true };
}

export async function openCloseChecklist(
  openingTaId: string,
  trigger: string,
  by: Id,
  now = Date.now(),
): Promise<OpsCloseChecklist | null> {
  if (!openingTaId) return null;
  const db = await desk();
  const already = openChecklistFor(db, openingTaId);
  if (already) return already;
  const position = positionForOpening(db, openingTaId);

  const checklist = await addChecklist({
    openingTaId,
    positionId: position?.id ?? null,
    clientId: position?.clientId ?? null,
    trigger,
    // "Close the TopJobs advert" belongs on the list whenever an advert ran for this opening (18 Nov: it never did).
    items: closeItemsFor(
      { linkedInUrl: position?.linkedInUrl ?? null },
      db.ads.some((ad) => ad.openingTaId === openingTaId && ["ordered", "live", "closed"].includes(ad.state)),
    ),
    completedAt: null,
    ownerId: position?.ownerId ?? by,
  });
  await createTask({
    kind: "check",
    title: "Close the position: " + (position?.title ?? openingTaId),
    body:
      (CLOSE_TRIGGERS[trigger] ?? trigger) +
      ".\n\nThe list is on the close page. Nothing is closed until every item is ticked, because this is where the adverts get left up.",
    assigneeId: checklist.ownerId,
    dueAt: now,
    subjectType: "close",
    subjectId: checklist.id,
    link: "/closes/" + checklist.id,
  });
  return checklist;
}

/* ── Placements, invoices and payments (15, Phase 6) ───────────── */

export async function addPlacement(
  input: Omit<OpsPlacement, "id" | "createdAt" | "updatedAt">,
): Promise<OpsPlacement> {
  if (!usingConvex()) return repo.addPlacement(input);
  return (await convexMutation<OpsPlacement>("ops/data:addPlacement", input)) as OpsPlacement;
}

export async function patchPlacement(
  placementId: Id,
  patch: Partial<OpsPlacement>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchPlacement(placementId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchPlacement", { placementId, patch, by, what, reason });
}

export function placementIn(db: OpsDatabase, placementId: Id): OpsPlacement | null {
  return db.placements.find((p) => p.id === placementId) ?? null;
}

export function placementsNewestFirst(db: OpsDatabase): OpsPlacement[] {
  return [...db.placements].sort((a, b) => (b.joinDate ?? b.createdAt) - (a.joinDate ?? a.createdAt));
}

export async function addInvoice(input: Omit<OpsInvoice, "id" | "createdAt" | "updatedAt">): Promise<OpsInvoice> {
  if (!usingConvex()) return repo.addInvoice(input);
  return (await convexMutation<OpsInvoice>("ops/data:addInvoice", input)) as OpsInvoice;
}

export async function patchInvoice(
  invoiceId: Id,
  patch: Partial<OpsInvoice>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchInvoice(invoiceId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchInvoice", { invoiceId, patch, by, what, reason });
}

export function invoiceIn(db: OpsDatabase, invoiceId: Id): OpsInvoice | null {
  return db.invoices.find((i) => i.id === invoiceId) ?? null;
}

export function invoicesNewestFirst(db: OpsDatabase): OpsInvoice[] {
  return [...db.invoices].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Take a placement from TA, the day it happens (step 3).
 *
 * The owner's own complaint, in the owner's words: Asma learns about a
 * placement months later. So the day TA places somebody, accounts and the ops
 * owner are told, and the agreement's fee rule is copied onto the placement -
 * an agreement changed next year must not change an invoice already sent.
 *
 * TA's placement id is the one thing both sides agree on, so the same event
 * twice is one placement.
 */
export async function takePlacement(
  data: Record<string, unknown>,
  now = Date.now(),
): Promise<OpsPlacement | null> {
  const placementTaId = String(data.placementId ?? "").trim();
  if (!placementTaId) return null;
  const db = await desk();
  const already = db.placements.find((p) => p.placementTaId === placementTaId);
  if (already) return already;

  const answer = await taPlacement(placementTaId);
  if (!answer.ok) return null;
  return takePlacementFrom(placementTaId, answer.data, now);
}

/** The second half of a placement arriving; see takeClientSetReadyWith. */
export async function takePlacementFrom(
  placementTaId: string,
  theirs: TaPlacement,
  now = Date.now(),
): Promise<OpsPlacement | null> {
  const db = await desk();
  const already = db.placements.find((p) => p.placementTaId === placementTaId);
  if (already) return already;
  const position = theirs.openingId ? positionForOpening(db, theirs.openingId) : null;
  const client = position?.clientId ? clientIn(db, position.clientId) : null;

  // The fee rule off the signed agreement (the client's signature is enough since 17 Nov; the countersignature
  // follows), not off today's settings.
  const agreement = client?.leadId
    ? [...db.agreements].reverse().find((a) => a.leadId === client.leadId && (a.state === "signed" || a.state === "countersigned"))
    : null;
  const feeMonths = Number(agreement?.fields.feeMonths ?? 1) || 1;
  const feeBasis = String(agreement?.fields.feeBasis ?? "gross");

  const placement = await addPlacement({
    placementTaId,
    applicationTaId: theirs.applicationId ?? "",
    openingTaId: theirs.openingId ?? "",
    positionId: position?.id ?? null,
    clientId: client?.id ?? null,
    candidateName: theirs.candidateName ?? placementTaId,
    state: "placed",
    monthlySalary: theirs.placedSalary ?? null,
    // TA gives the basis and a free-text package, not the split. When the salary
    // it gave is already "basic" we know the basic; otherwise it stays unknown
    // and Accounts fills it in (16 Nov).
    basicSalary: theirs.salaryBasis === "basic" ? (theirs.placedSalary ?? null) : null,
    allowances: 0,
    package: theirs.package ?? "",
    currency: theirs.currency || "LKR",
    offerLetterFileRef: theirs.offerLetterFileId ?? null,
    joinDate: theirs.joinDateMs ?? null,
    joinedAt: null,
    dojHistory: [],
    feeMonths,
    feeBasis,
    isReplacementOf: null,
    invoiceId: null,
    reason: null,
    noShowChoice: null,
    ownerId: position?.ownerId ?? db.members.find((m) => m.active && m.role === "ops_owner")?.id ?? "m_owner",
  });

  // The same-day notice, which is the whole point of this step. Internal, so
  // it needs nobody's approval - it never leaves the company.
  const accounts = db.members.filter((m) => m.active && (m.role === "accounts" || m.id === placement.ownerId));
  await draftMessage({
    channel: "internal",
    to: accounts.map((m) => m.email).filter(Boolean),
    subject: "Placed today: " + placement.candidateName + (position ? " - " + position.title : ""),
    body: [
      placement.candidateName + " has been placed" + (client ? " at " + client.name : "") + ".",
      "",
      "Package: " + (placement.monthlySalary ? money(placement.monthlySalary, placement.currency) + " a month" : "not given"),
      "Joining: " + (placement.joinDate ? colomboDateInWords(placement.joinDate) : "not given"),
      "Fee: " + feeInWords({ feeMonths, feeBasis }),
      "",
      "The invoice is drafted on the day they join, due thirty days after their first working day.",
    ].join("\n"),
    templateKey: "placement.notice",
    subjectType: "placement",
    subjectId: placement.id,
  });

  // Anything TA could not give us stops the invoice later, so it is asked for
  // now rather than on the joining day.
  const missing = missingPlacementFields(placement);
  if (missing.length) {
    await createTask({
      kind: "record",
      title: "Missing from the placement: " + missing.join(", "),
      body:
        "The TA System sent this placement without " +
        missing.join(" and ") +
        ". The invoice cannot be built without the package, so it is asked for now rather than on the joining day.",
      assigneeId: placement.ownerId,
      dueAt: now,
      subjectType: "placement",
      subjectId: placement.id,
      link: "/placements/" + placement.id,
    });
  }

  // A placement on an opening whose guarantee is looking for a replacement is
  // that replacement: nothing is invoiced for it (Phase 7 step 5).
  await takeReplacement(placement.id, placement.openingTaId, now);
  await startJoinClocks(placement, now);
  return placement;
}

/**
 * TA says they joined, or never turned up (step 7 and step 8).
 *
 * Joining starts two things at once: the fee invoice, and the ninety-day
 * guarantee (which is Phase 7). A no-show starts neither - there is no fee
 * because there was no placement - and the client has to choose between a
 * replacement and stopping.
 */
export async function takePlacementOutcome(
  type: string,
  data: Record<string, unknown>,
  now = Date.now(),
): Promise<void> {
  const placementTaId = String(data.placementId ?? "").trim();
  if (!placementTaId) return;
  const db = await desk();
  const placement = db.placements.find((p) => p.placementTaId === placementTaId);
  if (!placement) return;
  if (placement.state !== "placed") return;

  if (type === "placement.joined") {
    await markPlacementJoined(placement.id, null, now);
    return;
  }
  await patchPlacement(
    placement.id,
    { state: "no_show", reason: String(data.reason ?? "").trim() || "Did not turn up." },
    null,
    "placement.noShow",
    "From the TA System.",
  );
  await cancelClocksFor(db, "placement", placement.id, placement.ownerId, "They never joined.", null);
  await createTask({
    kind: "decide",
    title: "A no-show: " + placement.candidateName,
    body:
      "They did not turn up. Nothing is invoiced and nothing is refunded - the owner's rule - so the client chooses between a replacement and stopping. Draft them the choice.",
    assigneeId: placement.ownerId,
    dueAt: now,
    subjectType: "placement",
    subjectId: placement.id,
    link: "/placements/" + placement.id,
  });
}

/**
 * They joined (step 7).
 *
 * One door for both ways in: TA's own event, and the button on the joining
 * day when the TA phones them and tells us. The invoice follows at once,
 * because thirty days runs from the first working day whether or not anybody
 * remembered to draft it.
 */
export async function markPlacementJoined(
  placementId: Id,
  by: Id | null,
  now = Date.now(),
): Promise<{ ok: boolean; what: string }> {
  const db = await desk();
  const placement = placementIn(db, placementId);
  if (!placement) return { ok: false, what: "That placement is gone." };
  if (placement.state === "joined") return { ok: false, what: "They are already down as joined." };
  if (placement.state !== "placed") return { ok: false, what: "That placement is not waiting to join." };

  await patchPlacement(placementId, { state: "joined", joinedAt: now }, by, "placement.joined", null);
  await cancelClocksFor(db, "placement", placementId, by ?? placement.ownerId, "They joined.", null);

  const invoiced = await draftFeeInvoice(placementId, by ?? placement.ownerId, now);
  // Ninety days from today, whatever happens with the money (Phase 7 step 2).
  const guarantee = await startGuarantee(placementId, now);
  return {
    ok: true,
    what:
      "Down as joined. " +
      invoiced.what +
      (guarantee ? " The ninety-day guarantee runs to " + colomboDateInWords(guarantee.endsAt) + "." : ""),
  };
}

/** The reminders before the joining day, and the check on the morning (step 7). */
export async function startJoinClocks(placement: OpsPlacement, now = Date.now()): Promise<void> {
  if (!placement.joinDate) return;
  for (const clock of joinClocks(placement.joinDate, now)) {
    await startTimer({
      kind: clock.kind,
      subjectType: "placement",
      subjectId: placement.id,
      startsAt: now,
      dueAt: clock.dueAt,
      warnAt: null,
      ownerId: placement.ownerId,
      payload: { label: placement.candidateName },
    });
  }
}

/**
 * The invoice for a fee (step 9).
 *
 * Drafted the day they join, not the day they were placed: the agreement
 * counts thirty days from the first working day. A replacement under the
 * guarantee is not invoiced again, which is the owner's rule.
 *
 * The invoice document itself waits on a template from the owner, exactly as
 * the agreement did. Until then the lines go in the body of the email, which
 * is a real invoice a client can pay against and not a made-up form.
 */
export async function draftFeeInvoice(
  placementId: Id,
  by: Id,
  now = Date.now(),
): Promise<{ ok: boolean; what: string; invoiceId: Id | null }> {
  const db = await desk();
  const placement = placementIn(db, placementId);
  if (!placement) return { ok: false, what: "That placement is gone.", invoiceId: null };
  if (placement.invoiceId) {
    return { ok: false, what: "This placement has already been invoiced.", invoiceId: placement.invoiceId };
  }
  if (placement.isReplacementOf) {
    return {
      ok: false,
      what: "A replacement under the guarantee is not invoiced again. Nothing to send.",
      invoiceId: null,
    };
  }
  if (placement.state !== "joined") {
    return { ok: false, what: "The fee is invoiced when they join, not before.", invoiceId: null };
  }
  const missing = missingPlacementFields(placement);
  if (missing.length) {
    return { ok: false, what: "Still missing " + missing.join(" and ") + ". Ask the TA System for it.", invoiceId: null };
  }

  // FigJam: "Billing address exists?" - No means fix the client's billing
  // record, not draft an invoice that has nowhere to go (16 Nov).
  const client = placement.clientId ? clientIn(db, placement.clientId) : null;
  const billing = client
    ? problemWithInvoiceBilling(client)
    : "This placement has no client record. Link it to a client with a billing name, address and email first.";
  if (billing) return { ok: false, what: billing, invoiceId: null };

  const rule = { feeMonths: placement.feeMonths, feeBasis: placement.feeBasis };
  const amount = feeAmount(rule, placement.monthlySalary ?? 0, placement);
  const invoice = await addInvoice({
    number: invoiceNumber(textOf(db, "invoice.series", "C141"), db.invoices.length, now),
    kind: "fee",
    about: null,
    setId: null,
    againstInvoiceId: null,
    placementId,
    clientId: placement.clientId,
    state: "draft",
    amount,
    currency: placement.currency,
    lateCharge: 0,
    lateMonths: 0,
    disputed: false,
    disputedReason: null,
    payments: [],
    sentAt: null,
    sentMessageId: null,
    dueAt: dueOn(placement.joinedAt ?? now, numberOf(db, "invoice.dueDays", DUE_DAYS)),
    paidAt: null,
    writtenOffAt: null,
    reason: null,
    ownerId: db.members.find((m) => m.active && m.role === "accounts")?.id ?? by,
  });
  await patchPlacement(placementId, { invoiceId: invoice.id }, by, "placement.invoiced", invoice.number);

  await createTask({
    kind: "approve",
    title: "Invoice " + invoice.number + ": " + placement.candidateName,
    body:
      "They joined, so the fee is due thirty days from their first working day. Read the invoice, then approve it and it goes to the client's billing address.",
    assigneeId: invoice.ownerId,
    dueAt: now,
    subjectType: "invoice",
    subjectId: invoice.id,
    link: "/invoices/" + invoice.id,
  });
  return { ok: true, what: "Invoice " + invoice.number + " is drafted for accounts.", invoiceId: invoice.id };
}

/**
 * The payment chase (step 13).
 *
 * Fired by the clock when an invoice is past due and still owed. The late
 * charge is recomputed first - the agreement's monthly rate, compounded, as the agreement words
 * it - and nothing is charged on an invoice the client disputes in good
 * faith, also from the agreement.
 */
export async function chaseThePayment(
  invoiceId: Id,
  now = Date.now(),
): Promise<{ ok: boolean; what: string }> {
  const db = await desk();
  const invoice = invoiceIn(db, invoiceId);
  if (!invoice) return { ok: false, what: "That invoice is gone." };
  if (invoice.state !== "sent" && invoice.state !== "partly_paid") {
    return { ok: false, what: "That invoice is not waiting for money." };
  }
  if (!invoice.dueAt || invoice.dueAt > now) return { ok: false, what: "It is not due yet." };

  const months = monthsLate(invoice.dueAt, now);
  const charge = lateCharge(
    invoice.amount,
    months,
    numberOf(db, "invoice.latePctPerMonth", LATE_PCT_PER_MONTH),
    switchedOn(db, "invoice.lateCompounded"),
    invoice.disputed,
  );
  await patchInvoice(
    invoiceId,
    { lateMonths: months, lateCharge: charge },
    null,
    "invoice.lateCharged",
    invoice.disputed ? "Disputed in good faith, so nothing is charged." : months + " months late",
  );

  const dueAt = invoice.dueAt;
  const client = invoice.clientId ? clientIn(db, invoice.clientId) : null;
  const to = [client?.billingEmail, ...(client?.billingEmail ? [] : [])].filter((one): one is string => Boolean(one));
  const wording = templateFor(db, "invoice.chase");
  const fresh = { ...invoice, lateCharge: charge };
  const fill = (text: string) =>
    text
      .replace(/\{\{client\}\}/g, client?.name ?? "")
      .replace(/\{\{invoiceNumber\}\}/g, invoice.number)
      .replace(/\{\{amount\}\}/g, money(balanceOf(fresh), invoice.currency))
      .replace(/\{\{daysLate\}\}/g, String(Math.floor((now - dueAt) / 86_400_000)));

  const message = await draftMessage({
    channel: "email",
    to,
    subject: fill(wording?.subject ?? "Invoice {{invoiceNumber}} - still outstanding"),
    body: fill(
      wording?.body ??
        "Dear all,\n\nInvoice {{invoiceNumber}} is {{daysLate}} days past its due date. {{amount}} is outstanding.\n\nKind regards\nCareer 141",
    ),
    templateKey: "invoice.chase",
    subjectType: "invoice",
    subjectId: invoiceId,
  });

  await createTask({
    kind: "approve",
    title: "Chase invoice " + invoice.number,
    body:
      (invoice.disputed
        ? "The client disputes this one, so no late charge is added. "
        : months
          ? "Late by " + months + (months === 1 ? " month" : " months") + ", so the charge is now " + money(charge, invoice.currency) + ". "
          : "") + "The chase is drafted - read it before it goes.",
    assigneeId: invoice.ownerId,
    dueAt: now,
    subjectType: "invoice",
    subjectId: invoiceId,
    link: "/messages/" + message.id,
  });

  // The next chase is a month away, and goes on until it is paid or written
  // off. Nothing collects itself; the clock only keeps asking.
  await startTimer({
    kind: "invoice.chase",
    subjectType: "invoice",
    subjectId: invoiceId,
    startsAt: now,
    dueAt: now + 30 * 86_400_000,
    warnAt: null,
    ownerId: invoice.ownerId,
    payload: { label: invoice.number },
  });

  // Long enough unpaid and somebody has to decide, rather than the chase
  // running for ever (step 14).
  const writeOffAfter = numberOf(db, "invoice.writeOffDays", WRITE_OFF_DAYS);
  if (Math.floor((now - dueAt) / 86_400_000) >= writeOffAfter) {
    await createTask({
      kind: "decide",
      title: "Write off invoice " + invoice.number + "?",
      body:
        "It has been more than " +
        writeOffAfter +
        " days. Writing it off voids the guarantee and closes the position, so it is the Director's call, not a habit.",
      assigneeId: db.members.find((m) => m.active && m.role === "director_ops")?.id ?? invoice.ownerId,
      dueAt: now,
      subjectType: "invoice",
      subjectId: invoiceId,
      link: "/invoices/" + invoiceId,
    });
  }
  return { ok: true, what: "The chase is drafted. " + money(balanceOf(fresh), invoice.currency) + " outstanding." };
}

/* ── Interviews and references (15, Phase 5) ───────────────────── */

export async function addInterview(
  input: Omit<OpsInterview, "id" | "createdAt" | "updatedAt">,
): Promise<OpsInterview> {
  if (!usingConvex()) return repo.addInterview(input);
  return (await convexMutation<OpsInterview>("ops/data:addInterview", input)) as OpsInterview;
}

export async function patchInterview(
  interviewId: Id,
  patch: Partial<OpsInterview>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchInterview(interviewId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchInterview", { interviewId, patch, by, what, reason });
}

export function interviewIn(db: OpsDatabase, interviewId: Id): OpsInterview | null {
  return db.interviews.find((i) => i.id === interviewId) ?? null;
}

export function interviewsNewestFirst(db: OpsDatabase): OpsInterview[] {
  return [...db.interviews].sort((a, b) => (b.at ?? b.createdAt) - (a.at ?? a.createdAt));
}

/** The live interview for one application, if there is one. */
export function liveInterviewFor(db: OpsDatabase, applicationTaId: string): OpsInterview | null {
  return (
    db.interviews.find(
      (i) => i.applicationTaId === applicationTaId && i.state !== "attended" && !isOff(i.state),
    ) ?? null
  );
}

/**
 * The newest interview for one application, held or not.
 *
 * The TA phones the candidate **after** the interview, so their feedback and
 * TA's own outcome both arrive once it is already marked held: looking only
 * for a live one dropped them on the floor (found by the whole-flow test,
 * 4 Nov).
 */
export function interviewForApplication(db: OpsDatabase, applicationTaId: string): OpsInterview | null {
  return (
    [...db.interviews]
      .reverse()
      .find((i) => i.applicationTaId === applicationTaId && !isOff(i.state)) ?? null
  );
}

export async function addReference(
  input: Omit<OpsReferenceRequest, "id" | "createdAt" | "updatedAt">,
): Promise<OpsReferenceRequest> {
  if (!usingConvex()) return repo.addReference(input);
  return (await convexMutation<OpsReferenceRequest>("ops/data:addReference", input)) as OpsReferenceRequest;
}

export async function patchReference(
  referenceId: Id,
  patch: Partial<OpsReferenceRequest>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchReference(referenceId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchReference", { referenceId, patch, by, what, reason });
}

export function referenceIn(db: OpsDatabase, referenceId: Id): OpsReferenceRequest | null {
  return db.references.find((r) => r.id === referenceId) ?? null;
}

export function referenceForApplication(db: OpsDatabase, applicationTaId: string): OpsReferenceRequest | null {
  return [...db.references].reverse().find((r) => r.applicationTaId === applicationTaId) ?? null;
}

/**
 * The clocks a booked interview starts (step 10).
 *
 * Two, and they do different work. The day before at nine the client is
 * reminded and the TA is asked to reconfirm the candidate - the owner's rule,
 * because a candidate who has gone quiet is better found the day before than
 * on the morning. At the interview time itself somebody is asked whether it
 * actually happened, or an interview nobody attended is only noticed when the
 * client complains.
 */
export async function startInterviewClocks(interview: OpsInterview, now = Date.now()): Promise<void> {
  if (!interview.at) return;
  const label = interview.candidateName + ", round " + interview.round;
  const reconfirm = reconfirmAt(interview.at);
  if (reconfirm > now) {
    await startTimer({
      kind: "interview.reconfirm",
      subjectType: "interview",
      subjectId: interview.id,
      startsAt: now,
      dueAt: reconfirm,
      warnAt: null,
      ownerId: interview.ownerId,
      payload: { label },
    });
  }
  await startTimer({
    kind: "interview.day",
    subjectType: "interview",
    subjectId: interview.id,
    startsAt: now,
    dueAt: interview.at,
    warnAt: null,
    ownerId: interview.ownerId,
    payload: { label },
  });
}

/**
 * The day before: remind the client, and ask the TA about the candidate.
 *
 * The reminder to the client is drafted like everything else. The TA's half is
 * a task, because reconfirming the candidate is the TA's own work and their
 * channels, never ours.
 */
export async function remindAboutInterview(
  interviewId: Id,
  now = Date.now(),
): Promise<{ ok: boolean; what: string }> {
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) return { ok: false, what: "That interview is gone." };
  if (interview.state !== "booked" && interview.state !== "reconfirmed") {
    return { ok: false, what: "That interview is not booked any more." };
  }

  const wording = templateFor(db, "interview.reminder");
  const when = interview.at ? colomboDateInWords(interview.at) : "tomorrow";
  const fill = (text: string) =>
    text
      .replace(/\{\{candidate\}\}/g, interview.candidateName)
      .replace(/\{\{when\}\}/g, when)
      .replace(/\{\{whereOrLink\}\}/g, interview.whereOrLink);

  const message = await draftMessage({
    channel: "email",
    to: interview.interviewers,
    subject: fill(wording?.subject ?? "Tomorrow: {{candidate}}"),
    body: fill(
      wording?.body ??
        "Dear all,\n\n{{candidate}} is with you {{when}}.\n\n{{whereOrLink}}\n\nKind regards\nCareer 141",
    ),
    templateKey: "interview.reminder",
    subjectType: "interview",
    subjectId: interviewId,
  });

  await createTask({
    kind: "check",
    title: "Ask the TA to reconfirm: " + interview.candidateName,
    body:
      "The interview is tomorrow. The TA reconfirms the candidate through their own channels - we never write to a candidate.\n\nIf the candidate has gone quiet, the client has to be told today, not in the morning.",
    assigneeId: interview.ownerId,
    dueAt: now,
    subjectType: "interview",
    subjectId: interviewId,
    link: "/interviews/" + interviewId,
  });
  return { ok: true, what: "The client's reminder is drafted and the TA has been asked. Message " + message.id };
}

/**
 * A written chase to the client's people about an interview (16 Nov, plan B3).
 *
 * Two clocks used to leave only a task: `slots.chase` was never started and
 * `interview.report` only said "ask them". Now each also drafts the email, so
 * a person reads and approves instead of writing from nothing. A draft only -
 * nothing is sent from here, and a client who has already answered is not chased.
 */
async function draftInterviewChase(
  interviewId: Id,
  kind: "slots" | "date",
  now: number,
): Promise<{ ok: boolean; what: string; messageId: Id | null }> {
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) return { ok: false, what: "That interview is gone.", messageId: null };
  const waiting =
    kind === "slots"
      ? interview.state === "slots" && interview.slots.length === 0
      : interview.at === null && (interview.state === "slots" || interview.state === "agreed");
  if (!waiting) return { ok: false, what: "The client has already answered.", messageId: null };
  if (!interview.interviewers.length) {
    return { ok: false, what: "Nobody is named to chase. The task says who to ask.", messageId: null };
  }
  const owner = member(db, interview.ownerId)?.name ?? "Career 141";
  const message = await draftMessage({
    channel: "email",
    to: interview.interviewers,
    subject:
      kind === "slots"
        ? interview.candidateName + " - interview times"
        : interview.candidateName + " - the interview date",
    body:
      "Dear all,\n\n" +
      (kind === "slots"
        ? "A gentle reminder: we are still waiting for times that suit you to interview " + interview.candidateName + "."
        : "A gentle reminder: could you tell us the date you have booked for " + interview.candidateName + "'s interview, so we can prepare them?") +
      "\n\nKind regards\n" +
      owner,
    templateKey: null,
    subjectType: "interview",
    subjectId: interviewId,
  });
  return { ok: true, what: "The chase is drafted. Message " + message.id, messageId: message.id };
}

export function chaseForSlots(interviewId: Id, now = Date.now()) {
  return draftInterviewChase(interviewId, "slots", now);
}

export function chaseForDate(interviewId: Id, now = Date.now()) {
  return draftInterviewChase(interviewId, "date", now);
}

/**
 * Draft the drop-out notice (step 11).
 *
 * Raised by TA's own event when a candidate pulls out, and by the button when
 * somebody hears it first. The notice goes whatever the hour, but how late it
 * is said in the task, because the owner's promise is a day's warning.
 */
export async function noticeCandidateOut(
  interviewId: Id,
  reason: string,
  by: Id | null,
  now = Date.now(),
): Promise<{ ok: boolean; what: string; messageId: Id | null }> {
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) return { ok: false, what: "That interview is gone.", messageId: null };
  if (isOff(interview.state) || interview.state === "attended") {
    return { ok: false, what: "That interview is already finished.", messageId: null };
  }

  const standing = interview.at
    ? noticeStanding(interview.at, now, numberOf(db, "interview.noticeDays", NOTICE_DAYS), numberOf(db, "interview.noticeHours", NOTICE_HOURS))
    : { ok: true, late: false, what: "No time was agreed yet, so nobody is waiting for them." };

  const wording = templateFor(db, "interview.dropout_notice");
  const fill = (text: string) =>
    text
      .replace(/\{\{candidate\}\}/g, interview.candidateName)
      .replace(/\{\{when\}\}/g, interview.at ? colomboDateInWords(interview.at) : "the agreed time")
      .replace(/\{\{reason\}\}/g, reason)
      // The template signs off with the ops person's name. Nothing filled it
      // in, so the draft read "{{opsPerson}}" - found in the mailbox on
      // 5 November, where a whole conversation can be read at once.
      .replace(/\{\{opsPerson\}\}/g, member(db, interview.ownerId)?.name ?? "Career 141");

  const message = await draftMessage({
    channel: "email",
    to: interview.interviewers,
    subject: fill(wording?.subject ?? "{{candidate}} - interview {{when}}"),
    body: fill(
      wording?.body ??
        "Dear all,\n\n{{candidate}} is no longer able to attend {{when}}. We are sorry for the short notice and are putting a back-up in front of you.\n\nKind regards\nCareer 141",
    ),
    templateKey: "interview.dropout_notice",
    subjectType: "interview",
    subjectId: interviewId,
  });

  await patchInterview(
    interviewId,
    { state: "withdrew", reason: reason },
    by,
    "interview.candidateOut",
    reason,
  );
  await cancelClocksFor(db, "interview", interviewId, by ?? interview.ownerId, "The candidate came out of it.", null);
  // The Teams meeting goes with them (23 Nov): it was left in the organiser's calendar, with a join link for nobody.
  let calendarNote = "";
  if (interview.calendarEventId) {
    const organiser = interview.calendarOrganiser || member(db, interview.ownerId)?.email || "";
    const gone = await cancelTeamsEvent(organiser, interview.calendarEventId, switchedOn(db, "switch.teamsEnabled"));
    if (gone && !gone.ok) calendarNote = "\n\nThe Outlook event could not be cancelled, so cancel it by hand: " + gone.reason;
    else await patchInterview(interviewId, { calendarEventId: null, calendarOrganiser: null, calendarLengthMin: null }, by, "interview.calendarCleared", null);
  }
  await createTask({
    kind: "check",
    title: "A back-up for " + interview.candidateName,
    body:
      standing.what + calendarNote +
      "\n\nThe notice to the client is drafted and waiting for you. Then ask the TA for the back-up they kept: the position cannot sit on one candidate.",
    assigneeId: interview.ownerId,
    dueAt: now,
    subjectType: "interview",
    subjectId: interviewId,
    link: "/messages/" + message.id,
  });
  return { ok: true, what: standing.what, messageId: message.id };
}

/**
 * The candidate's feedback, which TA collects, drafted for the client (step 15).
 *
 * The TA phones the candidate after five; this is what we do with what they
 * say. Drafted, never sent by itself, and the owner approves it the next
 * morning rather than at night.
 */
export async function draftCandidateFeedback(
  interviewId: Id,
  feedback: string,
  now = Date.now(),
): Promise<{ ok: boolean; what: string }> {
  const db = await desk();
  const interview = interviewIn(db, interviewId);
  if (!interview) return { ok: false, what: "That interview is gone." };

  const wording = templateFor(db, "interview.client_feedback");
  const fill = (text: string) =>
    text
      .replace(/\{\{candidate\}\}/g, interview.candidateName)
      .replace(/\{\{feedback\}\}/g, feedback)
      .replace(/\{\{round\}\}/g, String(interview.round));

  const message = await draftMessage({
    channel: "email",
    to: interview.interviewers,
    subject: fill(wording?.subject ?? "{{candidate}} - after the interview"),
    body: fill(
      wording?.body ??
        "Dear all,\n\nWe spoke to {{candidate}} after round {{round}}.\n\n{{feedback}}\n\nMay we have your own feedback when you have it?\n\nKind regards\nCareer 141",
    ),
    templateKey: "interview.client_feedback",
    subjectType: "interview",
    subjectId: interviewId,
  });

  await patchInterview(interviewId, { candidateFeedback: feedback }, null, "interview.candidateFeedback", null);
  await createTask({
    kind: "approve",
    title: "The candidate's feedback, for the client: " + interview.candidateName,
    body: "The TA has spoken to the candidate. The message to the client is drafted - read it in the morning, then approve it.",
    assigneeId: interview.ownerId,
    dueAt: nextNineAm(now),
    subjectType: "interview",
    subjectId: interviewId,
    link: "/messages/" + message.id,
  });
  return { ok: true, what: "Drafted for the client, waiting for the morning." };
}

/**
 * What TA tells us about an interview (steps 11, 12, 15 and 17).
 *
 * Matched on TA's own application id, because that is the one thing both
 * sides agree on. An event about an interview we do not have is recorded and
 * left alone: TA may have booked it itself, and inventing a row from one
 * event would mean two interviews for one meeting.
 */
export async function takeInterviewEvent(
  type: string,
  data: Record<string, unknown>,
  now = Date.now(),
): Promise<void> {
  const applicationTaId = String(data.applicationId ?? "").trim();
  if (!applicationTaId) return;
  const db = await desk();

  if (type === "reference.reported") {
    const asked = referenceForApplication(db, applicationTaId);
    const report = String(data.report ?? "").trim();
    if (!asked || !report) return;
    await patchReference(asked.id, { state: "reported", report, reportedAt: now }, null, "reference.reported", null);
    await createTask({
      kind: "approve",
      title: "A reference is back: " + asked.candidateName,
      body: "The TA has spoken to the referee. Read what was said, then pass it to the client as it is.",
      assigneeId: asked.ownerId,
      dueAt: now,
      subjectType: "reference",
      subjectId: asked.id,
      link: "/interviews?reference=" + asked.id,
    });
    return;
  }

  // Feedback and an outcome come after the interview; a reconfirm or a
  // drop-out can only be about one that has not happened yet.
  const interview =
    type === "interview.feedback" || type === "interview.outcome"
      ? interviewForApplication(db, applicationTaId)
      : liveInterviewFor(db, applicationTaId);
  if (!interview) return;

  if (type === "interview.confirmed") {
    await patchInterview(interview.id, { state: "reconfirmed" }, null, "interview.reconfirmed", "TA reconfirmed the candidate.");
    return;
  }
  if (type === "interview.candidate_out") {
    await noticeCandidateOut(
      interview.id,
      String(data.reason ?? "").trim() || "The candidate withdrew.",
      null,
      now,
    );
    return;
  }
  if (type === "interview.feedback") {
    const said = String(data.feedback ?? "").trim();
    if (said) await draftCandidateFeedback(interview.id, said, now);
    return;
  }
  if (type === "interview.outcome") {
    const outcome = String(data.outcome ?? "").trim();
    if (outcome === "no_show" || outcome === "attended") {
      await patchInterview(
        interview.id,
        { state: outcome, attendedAt: outcome === "attended" ? now : null },
        null,
        "interview." + outcome,
        "From the TA System.",
      );
    }
  }
}

/* ── The weekly report (15, Phase 3 step 18, Phase 7 step 9) ───── */

export async function addReport(input: Omit<OpsReport, "id" | "createdAt" | "updatedAt">): Promise<OpsReport> {
  if (!usingConvex()) return repo.addReport(input);
  return (await convexMutation<OpsReport>("ops/data:addReport", input)) as OpsReport;
}

export async function patchReport(
  reportId: Id,
  patch: Partial<OpsReport>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchReport(reportId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchReport", { reportId, patch, by, what, reason });
}

export function reportIn(db: OpsDatabase, reportId: Id): OpsReport | null {
  return db.reports.find((r) => r.id === reportId) ?? null;
}

export function reportsNewestFirst(db: OpsDatabase): OpsReport[] {
  return [...db.reports].sort((a, b) => b.builtAt - a.builtAt);
}

/**
 * Build this Monday's report (Phase 7 step 9).
 *
 * One line per open position, each read from TA's own pipeline and from our
 * own rows. A position TA cannot be read for keeps its line and says so: the
 * Director needs to know the picture is short, not be shown a zero.
 *
 * Asking twice in one week gives the same report back, so the clock and the
 * button on the screen cannot make two.
 */
export async function buildWeeklyReport(by: Id, now = Date.now()): Promise<OpsReport | null> {
  const db = await desk();
  const week = reportWeekOf(now);
  const already = db.reports.find((r) => r.kind === "activePositions" && r.weekOf === week);
  if (already) return already;

  const open = db.positions.filter((p) => p.stage !== "closed");
  const people = await taPeople();
  const nameOf = (taId: string | null) =>
    (people.ok && taId ? people.data.find((u) => u.id === taId)?.fullName : null) ?? taId ?? "nobody yet";

  const rows: ReportRowRecord[] = [];
  for (const position of open) {
    // Their sets, newest first, and what has come back on the newest one.
    const theirSets = db.clientSets
      .filter((s) => s.openingTaId === position.openingTaId && s.state === "sent")
      .sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0));
    const newest = theirSets[0] ?? null;
    const decisions = newest ? newest.candidates.filter((c) => c.decision).length : 0;
    const held = position.openingTaId ? liveHoldFor(db, position.openingTaId) : null;

    let counts: Record<string, number> | null = null;
    let shortlisted: number | null = null;
    if (position.openingTaId) {
      const answer = await taPipeline(position.openingTaId);
      if (answer.ok) {
        counts = (answer.data.counts ?? {}) as Record<string, number>;
        shortlisted = countDepth(answer.data.applications ?? []).shortlistedTotal;
      }
    }

    rows.push({
      positionId: position.id,
      openingTaId: position.openingTaId,
      client: (position.clientId ? clientIn(db, position.clientId)?.name : null) ?? position.clientTaId,
      title: position.title,
      primaryTa: nameOf(position.primaryTaId),
      // The raw stage: the report turns it into the Director's words itself.
      stage: position.stage,
      daysOpen: daysBetween(position.handedOverAt, now),
      counts,
      shortlisted,
      setsSent: theirSets.length,
      lastSentAt: newest?.sentAt ?? null,
      daysWaitingOnClient: newest?.receivedAt ? daysBetween(newest.receivedAt, now) : null,
      decisionsIn: decisions,
      onHold: Boolean(held),
      depth: position.depthStage,
      advertised: Boolean(position.linkedInUrl),
    });
  }

  const unread = rows.filter((r) => r.counts === null).length;
  const owner = db.members.find((m) => m.active && m.role === "ops_lead")?.id ?? by;
  const report = await addReport({
    kind: "activePositions",
    weekOf: week,
    state: rows.length ? "review" : "building",
    rows,
    note: unread
      ? unread + (unread === 1 ? " position" : " positions") + " could not be read from the TA System."
      : null,
    builtAt: now,
    approvedBy: null,
    approvedAt: null,
    messageId: null,
    sentAt: null,
    ownerId: owner,
  });

  await createTask({
    kind: "record",
    title: "Read the weekly report for " + week,
    body: rows.length
      ? "One line per open position, built from the TA System and our own rows. Read it, correct nothing silently - if a line is wrong, say so on the position - then approve it and the Director's email is drafted."
      : "No position is open, so there is nothing in it. Nothing goes to the Director.",
    assigneeId: owner,
    // 22 Nov: it was due "now", so it showed "Late" before anyone could read it.
    // The working day it lands on is the time to read it.
    dueAt: endOfWorkDay(now),
    subjectType: "report",
    subjectId: report.id,
    link: "/reports/" + report.id,
  });

  // Next Monday, from this one: the rhythm keeps itself, exactly as Talent
  // Pulse does on a Tuesday.
  await startTimer({
    kind: "report.weekly",
    subjectType: "report",
    subjectId: report.id,
    startsAt: now,
    dueAt: nextMondayEightAm(now),
    warnAt: null,
    ownerId: owner,
    payload: { label: "The weekly report" },
  });
  return report;
}

/**
 * Count the client's shortlist, and decide (15, Phase 4 steps 14 and 15).
 *
 * Run after every client decision and every stage move TA tells us about. The
 * counting is TA's - we read their pipeline rather than keep our own tally,
 * because two tallies always disagree in the end - and the decision is the
 * owner's two rules: hold at five, or search again at three.
 *
 * It never throws: a pipeline we cannot read leaves the last count standing,
 * which is better than a wrong one.
 */
export async function evaluateDepth(
  positionId: Id,
  now = Date.now(),
): Promise<{ ok: boolean; what: string; stage: string | null }> {
  const db = await desk();
  const position = positionIn(db, positionId);
  if (!position) return { ok: false, what: "That position is gone.", stage: null };
  if (!position.openingTaId) {
    return { ok: false, what: "TA has not confirmed the opening yet, so there is no pipeline to count.", stage: null };
  }

  const answer = await taPipeline(position.openingTaId);
  if (!answer.ok) return { ok: false, what: "Could not read the pipeline: " + answer.reason, stage: position.depthStage };

  const depth = countDepth(answer.data.applications ?? []);
  const setsSent = db.clientSets.filter((cs) => cs.openingTaId === position.openingTaId && cs.state === "sent").length;
  if (!depthApplies(setsSent, depth)) {
    return { ok: true, what: "Nothing is in front of the client yet, so the depth rules wait.", stage: position.depthStage };
  }
  const verdict = depthVerdict(depth, numberOf(db, "depth.holdAt", HOLD_AT), numberOf(db, "depth.searchAgainAt", SEARCH_AGAIN_AT));
  // Read before the patch: the store hands back the row it keeps, so after a
  // patch this object already says the new stage (the aliasing trap, 3 Nov).
  const was = position.depthStage;
  const changed = was !== verdict.stage;

  await patchPosition(
    positionId,
    {
      depthStage: verdict.stage,
      shortlistedTotal: depth.shortlistedTotal,
      pendingCount: depth.pending,
      depthCheckedAt: now,
    },
    null,
    changed ? "position.depth." + verdict.stage : "position.depthCounted",
    verdict.because,
  );

  if (!changed) return { ok: true, what: verdict.because, stage: verdict.stage };

  // TA decides how its own people work, so this is told, never set: the
  // working stage goes through the API and the TA is belled about it.
  if (verdict.taWorkingStage) {
    await queueTaWrite(
      "/integrations/v1/openings/" + position.openingTaId + "/working-stage",
      { workingStage: verdict.taWorkingStage, because: verdict.because },
      { type: "position", id: positionId },
    );
  }
  if (verdict.stage === "hold_at_five") {
    await queueTaWrite(
      "/integrations/v1/openings/" + position.openingTaId + "/status",
      { status: "on_hold", reason: "five shortlisted" },
      { type: "position", id: positionId },
    );
  } else if (was === "hold_at_five") {
    // Below five again: the hold lifts of its own accord, because the count is
    // the whole reason it was there (15, Phase 4 step 14).
    await queueTaWrite(
      "/integrations/v1/openings/" + position.openingTaId + "/status",
      { status: "open", reason: "below five shortlisted again" },
      { type: "position", id: positionId },
    );
  }
  await createTask({
    kind: "check",
    title: DEPTH_MEANINGS[verdict.stage] + ": " + position.title,
    body: verdict.because + "\n\nThe TA System has been told; nothing else to do unless the TA asks something.",
    assigneeId: position.ownerId,
    dueAt: now,
    subjectType: "position",
    subjectId: positionId,
    link: "/positions/" + positionId,
  });
  return { ok: true, what: verdict.because, stage: verdict.stage };
}

/** The position behind a set, when TA has confirmed its opening. */
export function positionForSet(db: OpsDatabase, set: OpsClientSet): OpsPosition | null {
  return db.positions.find((p) => p.openingTaId === set.openingTaId) ?? null;
}

/* ── Client sets: what the client is sent (15, Phase 4) ───────── */

export async function addClientSet(input: Omit<OpsClientSet, "id" | "createdAt" | "updatedAt">): Promise<OpsClientSet> {
  if (!usingConvex()) return repo.addClientSet(input);
  return (await convexMutation<OpsClientSet>("ops/data:addClientSet", input)) as OpsClientSet;
}

export async function patchClientSet(
  setId: Id,
  patch: Partial<OpsClientSet>,
  by: Id | null,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchClientSet(setId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchClientSet", { setId, patch, by, what, reason });
}

export function clientSetIn(db: OpsDatabase, setId: Id): OpsClientSet | null {
  return db.clientSets.find((r) => r.id === setId) ?? null;
}

export function clientSetsNewestFirst(db: OpsDatabase): OpsClientSet[] {
  return [...db.clientSets].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * TA says a round is ready (15, Phase 4 step 2).
 *
 * The round itself is read from TA, because the event carries only its
 * numbers. The due date comes from the day the agreement was signed - that is
 * what the client was promised - and a clock watches it, so a set nobody sends
 * becomes somebody's task instead of a quiet failure.
 *
 * Nothing here throws: the events reader must not stop because one set could
 * not be fetched. A second event for the same round changes nothing.
 */
export async function takeClientSetReady(data: Record<string, unknown>, now = Date.now()): Promise<OpsClientSet | null> {
  const openingTaId = String(data.openingId ?? "").trim();
  const setNumber = Number(data.setNumber ?? 0);
  if (!openingTaId || !setNumber) return null;

  const db = await desk();
  const already = db.clientSets.find((r) => r.openingTaId === openingTaId && r.setNumber === setNumber);
  if (already) return already;

  const [round, job] = await Promise.all([taClientSet(openingTaId, setNumber), taOpening(openingTaId)]);
  if (!round.ok || !job.ok) return null;
  return takeClientSetReadyWith(openingTaId, setNumber, round.data, job.data, now);
}

/**
 * The second half of a set arriving: what TA said is already in hand (fetched,
 * or invented by the stand-in panel at /dev/ta), and this makes the set, its
 * due date and its clock on our side.
 */
export async function takeClientSetReadyWith(
  openingTaId: string,
  setNumber: number,
  round: TaClientSet,
  job: TaOpening,
  now = Date.now(),
): Promise<OpsClientSet | null> {
  const db = await desk();
  const already = db.clientSets.find((r) => r.openingTaId === openingTaId && r.setNumber === setNumber);
  if (already) return already;

  const client = db.clients.find((c) => c.taClientId === job.clientId) ?? null;
  const esa = client?.leadId ? agreementForLead(db, client.leadId) : null;
  const signedAt = esa?.signedAt ?? esa?.sentAt ?? null;
  const dueAt = signedAt
    ? dueFromEsa(signedAt, setNumber, numberOf(db, "set.firstDays", 7), numberOf(db, "set.laterDays", 14))
    : null;
  // Whoever owns the client owns the set. With no client record yet - the
  // agreement may have been signed before Ops existed - it goes to the ops
  // lead rather than to nobody.
  const ownerId =
    client?.ownerId ?? db.members.find((m) => m.active && m.role === "ops_lead")?.id ?? db.members[0]?.id ?? "";

  const row = await addClientSet({
    taRoundId: round.id,
    openingTaId,
    setNumber,
    clientId: client?.id ?? null,
    clientTaId: job.clientId,
    name: setName(client?.name ?? job.clientId, job.title, setNumber),
    role: job.title,
    state: "ready",
    candidates: (round.applications ?? []).map((a) => ({
      applicationTaId: a.id,
      name: a.name,
      fileId: null,
      problem: a.preparedCv ? null : "TA has no prepared CV for this one yet.",
    })),
    dueAt,
    sentAt: null,
    sentMessageId: null,
    sentTo: [],
    receivedAt: null,
    reason: null,
    ownerId,
  });

  if (dueAt) {
    await startTimer({
      kind: "set.due",
      subjectType: "clientSet",
      subjectId: row.id,
      startsAt: now,
      dueAt,
      warnAt: dueAt - 86_400_000,
      ownerId,
      payload: { label: row.name },
    });
  }
  await createTask({
    kind: "approve",
    title: "A set is ready to go: " + row.name,
    body:
      "TA has prepared " +
      row.candidates.length +
      " CVs. Read them, then send the set to the client." +
      (dueAt ? "" : "\n\nNo due date: this client has no signed agreement on our side."),
    assigneeId: ownerId,
    dueAt: now,
    subjectType: "clientSet",
    subjectId: row.id,
    link: "/sets/" + row.id,
  });
  return row;
}

/* ── Clients: the company, once they are ours (step 19) ───────── */

export async function addClient(input: Omit<OpsClient, "id" | "createdAt" | "updatedAt">): Promise<OpsClient> {
  if (!usingConvex()) return repo.addClient(input);
  return (await convexMutation<OpsClient>("ops/data:addClient", input)) as OpsClient;
}

export async function patchClient(
  clientId: Id,
  patch: Partial<OpsClient>,
  by: Id,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchClient(clientId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchClient", { clientId, patch, by, what, reason });
}

export function clientIn(db: OpsDatabase, clientId: Id): OpsClient | null {
  return db.clients.find((c) => c.id === clientId) ?? null;
}

export { clientForLead };

export function clientsNewestFirst(db: OpsDatabase): OpsClient[] {
  return [...db.clients].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * The client record, made once and then found (step 19).
 *
 * Two things make a client: an exact match against a company the TA System
 * already has, and an agreement countersigned. Both can happen to the same
 * lead, in either order, so this never makes a second record for a company we
 * already hold - two records would mean two owners and two agreements, which
 * is the fault on the board.
 */
export async function clientFromLead(
  db: OpsDatabase,
  lead: OpsLead,
  stage: string,
  by: Id,
): Promise<OpsClient> {
  const already =
    clientForLead(db, lead.id) ??
    db.clients.find((c) => c.nameKey === lead.nameKey) ??
    (lead.clientTaId ? db.clients.find((c) => c.taClientId === lead.clientTaId) : undefined) ??
    null;
  if (already) {
    // The stage only ever moves forward here; a person moves it back.
    const patch: Partial<OpsClient> = {};
    if (already.taClientId === null && lead.clientTaId) patch.taClientId = lead.clientTaId;
    if (already.leadId === null) patch.leadId = lead.id;
    // lead -> onboarding -> active (23 Nov: a client made as a lead when the agreement went out stayed under Leads).
    if (already.stage !== stage && (stage === "active" || (stage === "onboarding" && already.stage === "lead"))) patch.stage = stage;
    if (Object.keys(patch).length) {
      // The audit says what happened, not that something did: a client turning
      // active is the countersignature, and reads that way a year later.
      await patchClient(already.id, patch, by, patch.stage === "active" ? "client.agreementDone" : "client.updated", null);
    }
    return { ...already, ...patch };
  }
  return addClient({
    leadId: lead.id,
    taClientId: lead.clientTaId,
    name: lead.company,
    nameKey: lead.nameKey,
    stage,
    billingName: "",
    billingEmail: "",
    billingAddress: "",
    groupName: "",
    contacts: lead.contactEmail.trim()
      ? [{ name: lead.contactName.trim() || lead.company, email: lead.contactEmail.trim(), phone: lead.contactPhone.trim(), role: "hr" }]
      : [],
    notes: "",
    reason: null,
    ownerId: lead.ownerId,
  });
}

/* ── The client agreement ───────────────────────────────────── */

export async function addAgreement(input: Omit<OpsEsa, "id" | "createdAt" | "updatedAt">): Promise<OpsEsa> {
  if (!usingConvex()) return repo.addAgreement(input);
  return convexMutation<OpsEsa>("ops/data:addAgreement", input);
}

export async function patchAgreement(
  esaId: Id,
  patch: Partial<OpsEsa>,
  by: Id,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchAgreement(esaId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchAgreement", { esaId, patch, by, what, reason });
}

export function agreementForLead(db: OpsDatabase, leadId: Id): OpsEsa | null {
  return db.agreements.filter((e) => e.leadId === leadId).sort((a, b) => b.version - a.version)[0] ?? null;
}

export function agreementIn(db: OpsDatabase, esaId: Id): OpsEsa | null {
  return db.agreements.find((e) => e.id === esaId) ?? null;
}

/** Writes a message into the one way out, as a draft for somebody to approve. */
export async function draftMessage(
  input: Omit<
    OpsMessage,
    "id" | "state" | "approvedBy" | "approvedAt" | "sentAt" | "providerMessageId" | "note" | "createdAt" | "attachmentFileIds"
  > & { attachmentFileIds?: Id[] },
): Promise<OpsMessage> {
  if (!usingConvex()) return repo.draftMessage(input);
  return convexMutation<OpsMessage>("ops/data:draftMessage", input);
}

/* ── Meetings ──────────────────────────────────────────── */

export async function addMeeting(input: Omit<OpsMeeting, "id" | "createdAt" | "updatedAt">): Promise<OpsMeeting> {
  if (!usingConvex()) return repo.addMeeting(input);
  return convexMutation<OpsMeeting>("ops/data:addMeeting", input);
}

export async function patchMeeting(
  meetingId: Id,
  patch: Partial<OpsMeeting>,
  by: Id,
  what: string,
  reason: string | null = null,
): Promise<void> {
  if (!usingConvex()) {
    repo.patchMeeting(meetingId, patch, by, what, reason);
    return;
  }
  await convexMutation("ops/data:patchMeeting", { meetingId, patch, by, what, reason });
}

export function meetingsForLead(db: OpsDatabase, leadId: Id): OpsMeeting[] {
  return db.meetings.filter((m) => m.leadId === leadId).sort((a, b) => b.at - a.at);
}

export function meetingIn(db: OpsDatabase, meetingId: Id): OpsMeeting | null {
  return db.meetings.find((m) => m.id === meetingId) ?? null;
}

/**
 * Stops every live clock on one thing.
 *
 * A client's reply only ever stopped the chases, which is right - the CV
 * ownership window and the guarantee keep running whatever a client says. But
 * a thing that is *settled* has no clocks left worth running: a signed
 * agreement still had the two-week "nobody has signed" clock ticking, and it
 * would have fired a fortnight later on an agreement that was signed (found in
 * the browser, 2 Nov).
 */
export async function cancelClocksFor(
  db: OpsDatabase,
  subjectType: string,
  subjectId: Id,
  by: Id,
  reason: string,
  /** Only these kinds, when some clocks have to keep running. */
  kinds: string[] | null = null,
): Promise<number> {
  const live = db.timers
    .filter((t) => t.subjectType === subjectType && t.subjectId === subjectId)
    .filter((t) => !kinds || kinds.includes(t.kind))
    .filter((t) => t.state === "running" || t.state === "warned");
  if (!live.length) return 0;
  if (!usingConvex()) {
    repo.cancelTimers(
      live.map((t) => t.id),
      by,
      reason,
    );
    return live.length;
  }
  await convexMutation("ops/data:cancelTimers", { timerIds: live.map((t) => t.id), by });
  return live.length;
}

/** Stops the clocks on a meeting that is over, however it ended. */
export async function cancelMeetingClocks(db: OpsDatabase, meetingId: Id, by: Id): Promise<number> {
  const live = db.timers
    .filter((t) => t.subjectType === "meeting" && t.subjectId === meetingId)
    .filter((t) => t.state === "running" || t.state === "warned");
  if (!live.length) return 0;
  if (!usingConvex()) {
    repo.cancelTimers(
      live.map((t) => t.id),
      by,
      "The meeting is over.",
    );
    return live.length;
  }
  await convexMutation("ops/data:cancelTimers", { timerIds: live.map((t) => t.id), by });
  return live.length;
}

/* ── Calls, holidays and the baseline ─────────────────────────────── */

export async function logCall(input: Omit<OpsCallLog, "id" | "at">): Promise<void> {
  if (!usingConvex()) {
    repo.logCall(input);
    return;
  }
  await convexMutation("ops/data:logCall", input);
}

export async function addMember(input: Omit<OpsMember, "id">, by: Id): Promise<OpsMember> {
  if (!usingConvex()) return repo.addMember(input, by);
  return (await convexMutation<OpsMember>("ops/data:addMember", { ...input, by })) as OpsMember;
}

export async function patchMember(
  memberId: Id,
  patch: Partial<Pick<OpsMember, "name" | "role" | "active">>,
  by: Id,
  what: string,
  reason: string | null = null,
): Promise<boolean> {
  if (!usingConvex()) return repo.patchMember(memberId, patch, by, what, reason);
  const res = await convexMutation<{ ok: boolean }>("ops/data:patchMember", { memberId, patch, by, what, reason });
  return Boolean(res?.ok);
}

export async function addHolidays(days: { date: string; name: string }[], by: Id): Promise<number> {
  if (!usingConvex()) return repo.addHolidays(days, by);
  return convexMutation<number>("ops/data:addHolidays", { days, by });
}

export async function removeHoliday(date: string, by: Id): Promise<void> {
  if (!usingConvex()) {
    repo.removeHoliday(date, by);
    return;
  }
  await convexMutation("ops/data:removeHoliday", { date, by });
}

export async function addBaseline(input: Omit<OpsBaseline, "id" | "at">): Promise<void> {
  if (!usingConvex()) {
    repo.addBaseline(input);
    return;
  }
  await convexMutation("ops/data:addBaseline", input);
}

/* ── Writes to the TA System, through the outbox ───────────────────── */

/**
 * Queues a write. Nothing is sent from here: the sending is a separate pass,
 * so a screen is never left waiting on another machine, and a write is never
 * lost because somebody closed a tab.
 */
export async function queueTaWrite(
  path: string,
  body: Record<string, unknown>,
  subject: { type: string; id: Id } | null = null,
): Promise<OpsOutboxItem> {
  const input = {
    path,
    body,
    idempotencyKey: outboxKeyFor(path, body),
    subjectType: subject?.type ?? null,
    subjectId: subject?.id ?? null,
  };
  if (!usingConvex()) return repo.queueWrite(input);
  return convexMutation<OpsOutboxItem>("ops/data:queueWrite", input);
}

/**
 * Tries every write that is due (15, Phase 1 step 21).
 *
 * Run by the same scheduled pass as the clocks. A write that cannot go stays
 * queued with a longer wait each time; after twelve tries it stops and says a
 * person has to do it by hand, because retrying silently for ever is how
 * something gets forgotten.
 */
export async function pushOutbox(now = Date.now(), standIn = false): Promise<{ sent: number; waiting: number; gaveUp: number }> {
  const db = await desk();
  // The ops lead's own switch, which lives in the settings rather than in the
  // environment: holding the TA link must not need a deploy. Nothing is lost
  // while it is off - the writes stay queued (4 Nov, Phase 8 step 8).
  // `standIn` is the dev panel's "TA reads the queue now" (18 Nov): only ever honoured when the TA System is the
  // stand-in, so nothing can reach the real one through it.
  const { fakeTa } = await import("@/lib/ta");
  if (!switchedOn(db, "switch.taWritesEnabled") && !(standIn && fakeTa())) {
    return { sent: 0, waiting: dueNow(db.outbox, now).length, gaveUp: 0 };
  }
  const due = dueNow(db.outbox, now);
  let sent = 0;
  let waiting = 0;
  let gaveUp = 0;

  for (const item of due) {
    const outcome = await taWrite(item.path, item.body, item.idempotencyKey);
    if (outcome.ok) {
      sent += 1;
      await recordOutboxTry(item.id, { ok: true });
      continue;
    }
    const attempts = item.attempts + 1;
    if (shouldGiveUp(attempts)) {
      gaveUp += 1;
      await recordOutboxTry(item.id, { ok: false, error: outcome.reason, state: "failed", nextTryAt: null });
      continue;
    }
    waiting += 1;
    await recordOutboxTry(item.id, { ok: false, error: outcome.reason, nextTryAt: nextTryAt(attempts, now) });
  }
  return { sent, waiting, gaveUp };
}

async function recordOutboxTry(
  itemId: Id,
  result: { ok: boolean; error?: string; nextTryAt?: number | null; state?: OpsOutboxItem["state"] },
): Promise<void> {
  if (!usingConvex()) {
    repo.recordOutboxTry(itemId, result);
    return;
  }
  await convexMutation("ops/data:recordOutboxTry", {
    itemId,
    ok: result.ok,
    error: result.error ?? null,
    nextTryAt: result.nextTryAt ?? null,
    state: result.state ?? null,
  });
}

/* ── Events from the TA System ──────────────────────────────── */

export const EVENTS_CURSOR = "ta.eventsCursor";
export const EVENTS_READ_AT = "ta.eventsReadAt";

/**
 * One pass of the events reader (15, Part E3).
 *
 * Reads from where we got to, records each event once, and moves the cursor
 * only as far as the events that were handled. In this phase handling means
 * recording which phase will act on it, so the reader is proved now and the
 * handlers can be added later without touching it.
 */
export async function readTaEvents(now = Date.now()): Promise<{ read: number; kept: number; reason: string | null }> {
  const db = await desk();
  const cursor = settingValue(db, EVENTS_CURSOR) ?? "";
  const batch = await eventsAfter(cursor);
  if (!batch.ok) return { read: 0, kept: 0, reason: batch.reason };

  const handled: { taEventId: string; handledAt: number | null }[] = [];
  let kept = 0;
  for (const event of batch.data.events) {
    const row = {
      taEventId: event.id,
      type: event.type,
      data: event.data,
      handledAt: now,
      attempts: 1,
      lastError: null,
      note: whatWeDoWithIt(event.type),
    };
    const added = usingConvex()
      ? await convexMutation<OpsEvent | null>("ops/data:addEvent", row)
      : repo.addEvent(row);
    if (added) kept += 1;
    // Some events are not only recorded: a set TA says is ready becomes a set
    // on our side, with its due date and its clock (15, Phase 4 step 2).
    if (event.type === "client_set.ready") await takeClientSetReady(event.data, now);
    // TA owns the openings, so Ops learns about them here rather than
    // guessing (15, Phase 3 steps 7 and 8).
    if (event.type === "opening.created") await takeOpeningCreated(event.data, now);
    // A candidate moving stage in TA changes how deep the client's shortlist
    // is, which is what the owner's two rules turn on (step 14).
    if (event.type === "application.stage_changed") {
      const opening = String(event.data.openingId ?? "");
      const db2 = await desk();
      const position = opening ? positionForOpening(db2, opening) : null;
      if (position) await evaluateDepth(position.id, now);
    }
    // A TA closing an opening by hand still leaves our own things open, so
    // the checklist is made with only the items that are ours (Phase 7 step 14).
    if (event.type === "opening.closed") {
      const opening = String(event.data.openingId ?? "").trim();
      if (opening) await openCloseChecklist(opening, "ta_closed", "m_owner", now);
    }
    // A placement is the day the money starts (Phase 6 step 3).
    if (event.type === "placement.created") await takePlacement(event.data, now);
    if (event.type === "placement.joined" || event.type === "placement.no_show") {
      await takePlacementOutcome(event.type, event.data, now);
    }
    // What TA tells us about an interview (Phase 5 steps 11, 12 and 15). Ops
    // never writes to a candidate, so each of these is either a state we
    // record or a message to the client that a person then approves.
    if (event.type.startsWith("interview.") || event.type === "reference.reported") {
      await takeInterviewEvent(event.type, event.data, now);
    }
    if (
      event.type === "opening.updated" ||
      event.type === "opening.jd_approved" ||
      event.type === "opening.closed" ||
      event.type === "opening.working_stage_changed"
    ) {
      await takeOpeningUpdate(event.type, event.data, now);
    }
    // The cursor is the event's time, not its id (9 Nov): the live TA route
    // takes \`after\` in milliseconds and refuses anything else with a 400,
    // so the second read after the first real run was refused.
    handled.push({ taEventId: String(event.at), handledAt: now });
  }

  const moved = cursorAfter(handled, cursor);
  if (moved !== cursor) await noteSetting(EVENTS_CURSOR, moved);
  await noteSetting(EVENTS_READ_AT, String(now));
  return { read: batch.data.events.length, kept, reason: null };
}

/** A setting the system keeps for itself. Not audited: it changes every pass. */
async function noteSetting(key: string, value: string): Promise<void> {
  if (!usingConvex()) {
    repo.noteSystemSetting(key, value);
    return;
  }
  await convexMutation("ops/data:noteSystemSetting", { key, value });
}

export function outboxWaiting(db: OpsDatabase): OpsOutboxItem[] {
  return db.outbox.filter((o) => o.state !== "sent").sort((a, b) => a.createdAt - b.createdAt);
}

export function eventsNewestFirst(db: OpsDatabase): OpsEvent[] {
  return [...db.events].sort((a, b) => b.receivedAt - a.receivedAt);
}

export function settingValue(db: OpsDatabase, key: string): string | null {
  const value = db.settings.find((s) => s.key === key)?.value;
  return value === undefined ? null : String(value);
}

/* ── Reading one desk, without asking for it twice ───────────────────────── */

export function numberOf(db: OpsDatabase, key: string, fallback: number): number {
  const value = db.settings.find((s) => s.key === key)?.value;
  return typeof value === "number" ? value : fallback;
}

/** A setting that is words rather than a number, like the invoice series. */
export function textOf(db: OpsDatabase, key: string, fallback: string): string {
  const value = db.settings.find((s) => s.key === key)?.value;
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function switchedOn(db: OpsDatabase, key: string): boolean {
  return db.settings.find((s) => s.key === key)?.value === true;
}

export function member(db: OpsDatabase, memberId: Id) {
  return db.members.find((m) => m.id === memberId) ?? null;
}

export function activeMembers(db: OpsDatabase) {
  return db.members.filter((m) => m.active);
}

export function draftsWaiting(db: OpsDatabase): OpsMessage[] {
  return db.messages.filter((m) => m.state === "draft").sort((a, b) => a.createdAt - b.createdAt);
}

export function openTasksFor(db: OpsDatabase, memberId: Id): OpsTask[] {
  return db.tasks.filter((t) => t.state === "open" && t.assigneeId === memberId).sort((a, b) => a.dueAt - b.dueAt);
}

export function liveTimersFor(db: OpsDatabase, memberId: Id): OpsTimer[] {
  return db.timers
    .filter((t) => (t.state === "running" || t.state === "warned") && t.ownerId === memberId)
    .sort((a, b) => a.dueAt - b.dueAt);
}

export function liveTimers(db: OpsDatabase): OpsTimer[] {
  return db.timers.filter((t) => t.state === "running" || t.state === "warned");
}

export async function snoozeTask(taskId: Id, dueAt: number, by: Id, reason: string | null): Promise<void> {
  if (usingConvex()) {
    await convexMutation("ops/data:snoozeTask", { taskId, dueAt, by, reason });
    return;
  }
  repo.snoozeTask(taskId, dueAt, by, reason);
}

export async function addAuditNote(entry: {
  actorId: Id | null;
  action: string;
  subjectType: string;
  subjectId: Id;
  before?: string | null;
  after?: string | null;
  reason?: string | null;
}): Promise<void> {
  const full = {
    actorId: entry.actorId,
    action: entry.action,
    subjectType: entry.subjectType,
    subjectId: entry.subjectId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reason: entry.reason ?? null,
  };
  if (usingConvex()) {
    await convexMutation("ops/data:addAuditNote", full);
    return;
  }
  repo.addAuditNote(full);
}

export async function addTeamNote(authorId: Id, body: string): Promise<OpsTeamNote> {
  if (usingConvex()) {
    return (await convexMutation("ops/data:addTeamNote", { authorId, body })) as OpsTeamNote;
  }
  return repo.addTeamNote(authorId, body);
}

export async function removeTeamNote(noteId: Id, actorId: Id): Promise<void> {
  if (usingConvex()) {
    await convexMutation("ops/data:removeTeamNote", { noteId, actorId });
    return;
  }
  repo.removeTeamNote(noteId, actorId);
}

export async function addVacancy(input: { title: string; places: number; checks: string[]; ownerId: Id }): Promise<OpsVacancy> {
  if (usingConvex()) {
    return (await convexMutation("ops/data:addVacancy", input)) as OpsVacancy;
  }
  return repo.addVacancy(input);
}

export async function patchVacancy(vacancyId: Id, patch: Partial<OpsVacancy>, by: Id, action: string, reason: string | null): Promise<void> {
  if (usingConvex()) {
    await convexMutation("ops/data:patchVacancy", { vacancyId, patch, by, action, reason });
    return;
  }
  repo.patchVacancy(vacancyId, patch, by, action, reason);
}

export async function addApplicant(input: { vacancyId: Id; name: string; source: string; phone: string | null; email: string | null; by: Id }): Promise<OpsApplicant> {
  if (usingConvex()) {
    return (await convexMutation("ops/data:addApplicant", input)) as OpsApplicant;
  }
  return repo.addApplicant(input);
}

export async function patchApplicant(applicantId: Id, patch: Partial<OpsApplicant>, by: Id, action: string, reason: string | null): Promise<void> {
  if (usingConvex()) {
    await convexMutation("ops/data:patchApplicant", { applicantId, patch, by, action, reason });
    return;
  }
  repo.patchApplicant(applicantId, patch, by, action, reason);
}


/* ── Scoops: CVs read into internal hiring (23 Nov, the ops team's feedback) ─────────── */

/** The vacancy a CV goes to when nothing says which. People can be told apart later; they are never lost. */
export const UNSORTED_VACANCY = "Scoop: to sort";

export interface CvResult {
  name: string;
  status: "added" | "duplicate" | "unreadable";
  applicantId?: string;
  /** For a duplicate, whom it matched; for an unreadable one, why. */
  why?: string;
  /** Fields the CV did not give, so a person knows what to type. */
  missing?: string[];
}

async function unsortedVacancy(db: OpsDatabase, by: Id): Promise<Id> {
  const have = db.vacancies.find((v) => v.title === UNSORTED_VACANCY);
  if (have) return have.id;
  return (await addVacancy({ title: UNSORTED_VACANCY, places: 1, checks: [], ownerId: by })).id;
}

/**
 * One CV file into internal hiring. The file is kept (never overwritten, hashed), its text is read, the five fields
 * are found, and a person is made of it: in the vacancy asked for, else the one its position matches, else the
 * unsorted one. Somebody already on file (same email, NIC or number, or the very same file) is not added twice.
 * A scan with no text still makes a person, named from the file, so a CV is never lost for being unreadable.
 */
export async function ingestCv(
  file: { name: string; bytes: Uint8Array },
  ctx: { by: Id; scoopId: string; vacancyId?: Id | null; now?: number },
): Promise<CvResult> {
  const now = ctx.now ?? Date.now();
  const bad = problemWithCv({ name: file.name, size: file.bytes.length }) ?? problemWithCvBytes(file.bytes);
  if (bad) return { name: file.name, status: "unreadable", why: bad };

  const db = await desk();
  const hash = sha256(file.bytes);
  const same = db.files.find((f) => f.kind === "cv" && f.sha256 === hash && f.subjectType === "applicant");
  if (same) {
    const of = db.applicants.find((a) => a.id === same.subjectId);
    return { name: file.name, status: "duplicate", why: "The same file is already on " + (of?.name ?? "somebody") + "." };
  }

  const read = await cvText(file.bytes, file.name);
  let ai: { name?: string; targetPosition?: string } | null = null;
  if (read.text.replace(/\s+/g, "").length > 40) {
    const answer = await runAi<CvFieldsSaid>("cv.fields", cvFieldsPrompt(read.text.slice(0, 6000)), ctx.by, { type: "scoop", id: ctx.scoopId }, ["a CV"], now);
    if (answer.proposal.ok && answer.proposal.data) ai = answer.proposal.data;
  }
  const cv = readCv(read.text, ai);
  const fields: CvFields = cv.fields;

  const match = duplicateOf(fields, db.applicants.map((a) => ({ id: a.id, email: a.email, phone: a.phone, nic: a.nic ?? null, name: a.name })));
  if (match) return { name: file.name, status: "duplicate", why: "Already on file: " + match.name + "." };

  const open = db.vacancies.filter((v) => v.status === "open" && v.title !== UNSORTED_VACANCY);
  const vacancyId = ctx.vacancyId ?? matchVacancy(fields.targetPosition, open) ?? (await unsortedVacancy(db, ctx.by));
  const person = await addApplicant({
    vacancyId,
    name: fields.name || file.name.replace(/\.[A-Za-z0-9]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 80) || "Unnamed CV",
    source: "Scoop",
    phone: fields.phone || null,
    email: fields.email || null,
    by: ctx.by,
  });
  const key = keyFor("cv", "applicant", person.id, file.name, now);
  const mime = mimeFor(file.name);
  await putBytes(key, file.bytes, mime);
  const kept = await addFile({ kind: "cv", key, name: safeName(file.name), size: file.bytes.length, mime, sha256: hash, subjectType: "applicant", subjectId: person.id, madeFrom: null, uploadedBy: ctx.by });
  const unread = cv.scanned || read.why;
  await patchApplicant(
    person.id,
    {
      cvFileId: kept.id,
      nic: fields.nic || null,
      targetPosition: fields.targetPosition || null,
      scoopId: ctx.scoopId,
      detail: unread ? "CV could not be read: " + (read.why ?? "it is a scan") + " Type the details in." : "CV came " + colomboDate(now) + (cv.missing.length ? " · not found: " + cv.missing.join(", ") : ""),
    },
    ctx.by,
    "applicant.fromScoop",
    "Read from " + safeName(file.name),
  );
  return unread
    ? { name: file.name, status: "unreadable", applicantId: person.id, why: read.why ?? "It is a scan with no text, so the details are to be typed.", missing: cv.missing }
    : { name: file.name, status: "added", applicantId: person.id, missing: cv.missing };
}

async function saveBatch(batch: ScoopBatch): Promise<void> {
  await noteSetting(scoopKeyOf(batch.id), JSON.stringify(batch));
}

export function scoopBatches(db: OpsDatabase): ScoopBatch[] {
  return batchesOf(db.settings);
}

function tallyResult(batch: ScoopBatch, r: CvResult): void {
  if (r.applicantId) batch.applicantIds.push(r.applicantId);
  if (r.status === "duplicate") batch.duplicates.push({ name: r.name, of: r.why ?? "" });
  if (r.status === "unreadable") batch.unreadable.push({ name: r.name, why: r.why ?? "" });
}

/** CVs added by hand, all at once: the same reading as a Scoop by email, so nobody has to wait for the mailbox. */
export async function ingestScoopFiles(files: { name: string; bytes: Uint8Array }[], by: Id, vacancyId: Id | null, now = Date.now()): Promise<ScoopBatch> {
  const batch = newBatch({ id: "upload-" + now, at: now, source: "upload", found: Math.min(files.length, MAX_PER_BATCH) });
  for (const file of files.slice(0, MAX_PER_BATCH)) {
    tallyResult(batch, await ingestCv(file, { by, scoopId: batch.id, vacancyId, now }));
  }
  batch.complete = true;
  await saveBatch(batch);
  return batch;
}

/** Where the Scoop mailbox and its senders are named: the settings first (an Ops lead can change them), then the environment. */
export function scoopConfig(db: OpsDatabase): { mailbox: string; senders: string[] } {
  return {
    mailbox: textOf(db, "scoop.mailbox", (process.env.OPS_SCOOP_MAILBOX ?? "").trim()),
    senders: sendersFrom(textOf(db, "scoop.senders", process.env.OPS_SCOOP_SENDERS ?? "")),
  };
}

const SCOOP_REACHED = "scoop.reached";

/**
 * One pass over the Scoop mailbox: take the next few files off the next Scoop email. A Scoop of sixty is spread
 * over passes (PER_PASS a pass) so none runs long; each pass carries on from where the last one stopped, and the
 * mailbox's cursor moves past an email only when every file on it has been handled.
 */
export async function runScoopPass(by: Id, now = Date.now(), source?: ScoopSource): Promise<{ ok: boolean; reason?: string; handled: number; added: number }> {
  const db = await desk();
  const config = scoopConfig(db);
  const problem = source ? null : scoopProblem(config.mailbox, config.senders);
  if (problem) return { ok: false, reason: problem, handled: 0, added: 0 };
  const src = source ?? graphScoopSource(config.mailbox, config.senders, isScoopSender);

  const reached = Number(textOf(db, SCOOP_REACHED, "")) || now - 2 * 86_400_000;
  const listed = await src.messages(reached);
  if (!listed.ok) return { ok: false, reason: listed.reason, handled: 0, added: 0 };

  let budget = PER_PASS;
  let handled = 0;
  let added = 0;
  for (const message of listed.messages) {
    const stored = scoopBatches(await desk()).find((b) => b.id === message.id);
    if (stored?.complete) {
      await noteSetting(SCOOP_REACHED, String(message.at));
      continue;
    }
    const files = (await src.attachments(message.id)).filter((a) => problemWithCv({ name: a.name, size: a.size }) === null).slice(0, MAX_PER_BATCH);
    const batch = stored ?? newBatch({ id: message.id, at: message.at, source: "mail", mailbox: config.mailbox, from: message.from, subject: message.subject, found: files.length });
    batch.found = files.length;
    for (const f of files) {
      if (budget <= 0) break;
      if (batch.done.includes(f.id)) continue;
      const bytes = await src.bytes(message.id, f.id);
      budget -= 1;
      handled += 1;
      const result: CvResult = bytes ? await ingestCv({ name: f.name, bytes }, { by, scoopId: batch.id, now: message.at }) : { name: f.name, status: "unreadable", why: "The file could not be taken from the email." };
      if (result.status === "added") added += 1;
      tallyResult(batch, result);
      batch.done.push(f.id);
      await saveBatch(batch);
    }
    batch.complete = files.every((f) => batch.done.includes(f.id));
    await saveBatch(batch);
    if (!batch.complete) break; // carry on with this one next pass; never skip past an unfinished email
    await noteSetting(SCOOP_REACHED, String(message.at));
  }
  return { ok: true, handled, added };
}

const SUMMARISED_ON = "scoop.summarisedOn";

/**
 * The end of the day's report on each Scoop that came in (17:30 Colombo on a working day), once a day: one task for
 * the Ops lead with a few lines per batch. Read off the applicants as they stand, so a call made this afternoon counts.
 * Quiet on a day with no Scoop. Asked for on every clock pass, and does nothing until its time and nothing twice.
 */
export async function runScoopSummary(by: Id, now = Date.now()): Promise<{ made: boolean; batches: number }> {
  const db = await desk();
  const today = colomboDate(now);
  if (textOf(db, SUMMARISED_ON, "") === today) return { made: false, batches: 0 };
  const due = nextSummaryAt(Date.parse(today + "T00:00:00+05:30") - 1, db.holidays.map((h) => h.date));
  if (colomboDate(due) !== today || now < due) return { made: false, batches: 0 };

  const batches = batchesOn(scoopBatches(db), now).filter((b) => b.complete || b.applicantIds.length > 0);
  await noteSetting(SUMMARISED_ON, today);
  if (!batches.length) return { made: false, batches: 0 };

  const people = db.applicants.map((a) => ({ id: a.id, name: a.name, stage: a.stage, tries: a.tries, interviewAt: a.interviewAt, rejectReason: a.rejectReason, rejectedAtStage: a.rejectedAtStage ?? null, repliedAt: a.repliedAt ?? null }));
  const body = batches
    .map((b) => (b.source === "mail" ? (b.subject || "A Scoop") + " (from " + (b.from || "email") + ")" : "CVs added by hand") + "\n" + summaryOf(b, people).lines.join("\n"))
    .join("\n\n");
  const owner = db.members.find((m) => m.active && m.role === "ops_lead")?.id ?? by;
  await createTask({
    kind: "record",
    title: "Scoop summary for " + colomboDateInWords(now),
    body,
    assigneeId: owner,
    dueAt: now,
    subjectType: null,
    subjectId: null,
    link: "/hiring?view=scoops",
  });
  for (const b of batches) await saveBatch({ ...b, summarisedAt: now });
  return { made: true, batches: batches.length };
}


/* ── Inbound WhatsApp (23 Nov, the ops team's feedback) ─────────────────────────────── */

/**
 * What came in on the Ops WhatsApp number, recorded and filed to whose number it is.
 *
 * Recorded once by Meta's own message id, so a webhook retry adds nothing. A number that is exactly one known
 * person's is filed to them: a client's contact (and, as with a reply by email, the chasing of that client stops),
 * an enquiry's contact, or an applicant to us (who is marked as having replied, so a Scoop's summary counts them
 * as responded). Anything else is filed as nobody's, with the reason on it, and waits for a person. Nothing is sent.
 */
export async function takeWhatsApp(messages: WaMessage[], by: Id, now = Date.now()): Promise<{ recorded: number; already: number; filed: number; waiting: number; chasesStopped: number }> {
  let recorded = 0;
  let already = 0;
  let filed = 0;
  let waiting = 0;
  let chasesStopped = 0;
  for (const m of messages) {
    const db = await desk();
    const match = matchPhone(m.from, {
      clients: db.clients.filter((c) => c.stage !== "closed").map((c) => ({ id: c.id, name: c.name, leadId: c.leadId, contacts: c.contacts })),
      leads: db.leads.map((l) => ({ id: l.id, company: l.company, contactName: l.contactName, contactPhone: l.contactPhone })),
      applicants: db.applicants.map((a) => ({ id: a.id, name: a.name, phone: a.phone, vacancyId: a.vacancyId })),
    });
    const subjectType = match.kind === "none" ? null : match.kind === "applicant" ? "applicant" : match.kind === "lead" ? "lead" : "client";
    const row = {
      channel: "whatsapp" as const,
      mailbox: "whatsapp",
      from: "+" + m.from,
      // Whose number it is, in our words, when we know; else what they call themselves on WhatsApp.
      fromName: match.kind !== "none" ? match.name : m.name,
      receivedAt: m.at || now,
      subject: "WhatsApp from " + (match.name || m.name || "+" + m.from),
      // A picture or a voice note is not kept; the person is told it came, and what kind.
      body: m.text || "[" + m.kind + ": open it in WhatsApp]",
      providerId: m.id,
      inReplyTo: null,
      matchedBy: match.kind === "none" ? ("none" as const) : ("phone" as const),
      subjectType,
      subjectId: match.id,
      clientId: match.clientId,
      note: match.note,
    };
    const saved = usingConvex() ? await convexMutation<{ id: string; already: boolean }>("ops/data:recordInbound", row) : repo.recordInbound(row);
    if (saved.already) {
      already += 1;
      continue;
    }
    recorded += 1;
    if (match.kind === "none") {
      waiting += 1;
      continue;
    }
    filed += 1;
    if (match.kind === "applicant") {
      await patchApplicant(match.id, { repliedAt: row.receivedAt }, by, "applicant.repliedOnWhatsApp", null);
    } else if (match.kind === "client") {
      // A client who replies is not chased: the agreement's chase and the CV sets' feedback chases stop.
      const client = db.clients.find((c) => c.id === match.id);
      const esa = client?.leadId ? agreementForLead(db, client.leadId) : null;
      if (esa) chasesStopped += await recordReply("esa", esa.id, by);
      for (const set of db.clientSets.filter((s) => s.clientId === match.id)) chasesStopped += await recordReply("clientSet", set.id, by);
    }
  }
  return { recorded, already, filed, waiting, chasesStopped };
}
