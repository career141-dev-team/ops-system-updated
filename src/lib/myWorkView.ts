/**
 * The four My work views as one pure view-model (19 Nov, v6 frames W1 to W4).
 *
 * Everything the screen shows is computed here from the desk's data and nothing else: no database,
 * nothing sent. A row type with no source is absent, never invented.
 */

import type { OpsCallLog, OpsClient, OpsClientSet, OpsDatabase, OpsInterview, OpsMessage, OpsPosition, OpsTask } from "../data/types";
import { telLink, tidyPhone } from "./calls";
import { DRAFT_KINDS, draftKind, isRoutine, messageInWords, messageTitle } from "./messages";
import { lateInWords } from "./myWork";

const DAY_MS = 86_400_000;
const OFFSET = 5.5 * 3_600_000;
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Thu 19 Nov", in Colombo: the date line under the greeting. */
export function dayShort(at: number): string {
  const d = new Date(at + OFFSET);
  return SHORT_DAYS[d.getUTCDay()] + " " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
}

/** "09:30", in Colombo. */
export function clockOf(at: number): string {
  return new Date(at + OFFSET).toISOString().slice(11, 16);
}

/** Midnight at the start of the Colombo day, and of the next one. */
export function dayBounds(now: number): { start: number; end: number } {
  const start = Math.floor((now + OFFSET) / DAY_MS) * DAY_MS - OFFSET;
  return { start, end: start + DAY_MS };
}

export type Tone = "danger" | "warn" | "info" | "ink";
export interface WorkButton {
  label: string;
  href: string;
  primary?: boolean;
}
export interface WorkRow {
  key: string;
  tone: Tone;
  /** "Late · 1 day", "Needs you", "09:30". */
  tag: string;
  title: string;
  line: string;
  button: WorkButton | null;
  /** The task behind the row, when there is one. */
  taskId: string | null;
  at: number;
}
export interface BoardCard extends WorkRow {
  due: string;
  sub: string;
  /** The system made it with a deadline: moving it later needs a reason. */
  system: boolean;
}

interface Context {
  client: string | null;
  role: string | null;
  position: OpsPosition | null;
  interview: OpsInterview | null;
  set: OpsClientSet | null;
  clientRow: OpsClient | null;
}

/** Who and what a record is about. Parts are null when the record cannot be found. */
export function contextOf(db: OpsDatabase, t: { subjectType: string | null; subjectId: string | null }): Context {
  const none: Context = { client: null, role: null, position: null, interview: null, set: null, clientRow: null };
  const id = t.subjectId;
  if (!t.subjectType || !id) return none;
  const clientNamed = (cid: string | null) => (cid ? (db.clients.find((c) => c.id === cid) ?? null) : null);
  if (t.subjectType === "interview") {
    const interview = db.interviews.find((i) => i.id === id) ?? null;
    const position = interview?.positionId ? (db.positions.find((p) => p.id === interview.positionId) ?? null) : null;
    const clientRow = clientNamed(interview?.clientId ?? position?.clientId ?? null);
    return { ...none, interview, position, clientRow, client: clientRow?.name ?? null, role: position?.title ?? null };
  }
  if (t.subjectType === "clientSet") {
    const set = db.clientSets.find((s) => s.id === id) ?? null;
    const position = set ? (db.positions.find((p) => p.openingTaId === set.openingTaId) ?? null) : null;
    const clientRow = clientNamed(set?.clientId ?? position?.clientId ?? null);
    return { ...none, set, position, clientRow, client: clientRow?.name ?? set?.name.split(">")[0]?.trim() ?? null, role: set?.role ?? position?.title ?? null };
  }
  if (t.subjectType === "position") {
    const position = db.positions.find((p) => p.id === id) ?? null;
    const clientRow = clientNamed(position?.clientId ?? null);
    return { ...none, position, clientRow, client: clientRow?.name ?? null, role: position?.title ?? null };
  }
  if (t.subjectType === "placement") {
    const placement = db.placements.find((x) => x.id === id) ?? null;
    const position = placement?.positionId ? (db.positions.find((p) => p.id === placement.positionId) ?? null) : null;
    const clientRow = clientNamed(placement?.clientId ?? position?.clientId ?? null);
    return { ...none, position, clientRow, client: clientRow?.name ?? null, role: position?.title ?? null };
  }
  if (t.subjectType === "client") {
    const clientRow = clientNamed(id);
    return { ...none, clientRow, client: clientRow?.name ?? null };
  }
  if (t.subjectType === "lead") return { ...none, client: db.leads.find((l) => l.id === id)?.company ?? null };
  return none;
}

/** The board column a task sits in. "Waits for" is a task about waiting on somebody else's answer. */
export function bucketOf(t: Pick<OpsTask, "title" | "dueAt">, now: number): "late" | "today" | "waits" | "later" {
  if (/^(waits?|waiting) for\b/i.test(t.title.trim())) return "waits";
  if (t.dueAt < now) return "late";
  return t.dueAt < dayBounds(now).end ? "today" : "later";
}

/** The first sentence or two of a body: the line under a title. */
export function firstLines(body: string, n = 1): string {
  const flat = (body.split(/\n\s*\n/)[0] ?? "").replace(/\s+/g, " ").trim();
  const parts = flat.match(/[^.!?]+[.!?]+(\s|$)/g);
  return ((parts ? parts.slice(0, n).join("") : flat) || "").trim();
}

/** The one button a task gets, and where it goes. Falls back to the task's own page, never to nothing. */
export function buttonFor(t: OpsTask, ctx: Context, panel: (name: string, id: string) => string): WorkButton {
  if (t.kind === "call") return { label: "Call", href: panel("call-client", t.id), primary: true };
  const base = ctx.position ? "/positions/" + ctx.position.id : null;
  if (t.subjectType === "interview" && t.subjectId && base && ctx.interview) {
    const needsTime = ctx.interview.state === "slots" || ctx.interview.state === "agreed";
    if (/reconfirm/i.test(t.title)) return { label: "Reconfirm", href: base + "?view=interviews&panel=reconfirm&on=" + t.subjectId };
    if (needsTime) return { label: "Find a time", href: base + "?view=interviews&panel=find-a-time&on=" + t.subjectId };
  }
  if (t.subjectType === "clientSet" && base) {
    if (/chase/i.test(t.title)) return { label: "Approve chase", href: base + "?view=sets&panel=chase-client&on=" + t.subjectId };
    return { label: "Open the set", href: base + "?view=sets" };
  }
  // Flow list (W1): a joining's own states open on the role's Offer and joining tab.
  if (t.subjectType === "placement" && t.subjectId && base) {
    const on = "&on=" + t.subjectId;
    if (/no-show/i.test(t.title)) return { label: "Did not join", href: base + "?view=offer&panel=did-not-join" + on };
    if (/missing/i.test(t.title)) return { label: "Record the address", href: base + "?view=offer&panel=record-address" + on };
  }
  // A chase of an unsigned agreement opens the chase drawer on Agreements (C3); the old link had no `on`, so nothing opened.
  if (t.subjectType === "esa" && t.subjectId) return { label: "Chase the agreement", href: "/clients/agreements?panel=chase-agreement&on=" + t.subjectId };
  if (t.subjectType === "lead" && /agreement/i.test(t.title)) return { label: "Chase the agreement", href: t.link ?? "/clients/agreements" };
  return { label: t.kind === "approve" ? "Approve" : "Open", href: t.link ?? "/tasks/" + t.id };
}

/** The system made it for a deadline (it is about a record): the one definition the card flag and the move rule share. */
export const isSystemTask = (t: { subjectType: string | null }): boolean => t.subjectType !== null;

const SOURCES: Record<string, string> = {
  report: "From the weekly report",
  talentPulse: "From Talent Pulse",
  esa: "From a client agreement",
  invoice: "From an invoice",
  guarantee: "From a guarantee",
  placement: "From a placement",
  lead: "From a lead",
  client: "From a client",
  position: "From a position",
  clientSet: "From a CV set",
  interview: "From an interview",
  ad: "From an advert",
  hold: "From a hold",
  message: "From a message",
  reference: "From a reference check",
  close: "From closing a position",
  timer: "From a timer",
  meeting: "From a meeting",
  chat: "From AURA",
};

/**
 * The line under a board card: where the task came from (22 Nov: "where did
 * these 2 late tasks come from?" - every card without a person said "Free
 * task", even the ones the system made). The client or role when the record
 * is found, else what kind of record it is about; "Free task" only when
 * nothing is attached.
 */
export function taskSource(t: Pick<OpsTask, "subjectType" | "link">, who: string): string {
  if (who) return who;
  if (t.subjectType) return SOURCES[t.subjectType] ?? "From the system";
  return t.link ? "From the system" : "Free task";
}

const days = (at: number, now: number) => lateInWords(at, now).replace(/ late$/, "").replace(/^A day$/, "1 day");
const lateTag = (at: number, now: number) => "Late · " + days(at, now);

export interface WorkView {
  counts: { today: number; approve: number; calls: number; tasks: number };
  late: number;
  oldestLate: string | null;
  doFirst: WorkRow[];
  /** Tasks that wait on somebody else or fall after today: the "not due today" footnote. */
  waitsCount: number;
  calls: WorkRow[];
  doneCalls: { key: string; at: number; who: string; line: string }[];
  board: Record<"late" | "today" | "waits" | "later", BoardCard[]>;
  nextLater: string | null;
  meetings: { key: string; at: number; title: string; client: string | null; sub: string }[];
  timeline: { key: string; at: number; title: string; sub: string }[];
  clientsToday: { name: string; line: string; tone: Tone }[];
  drafts: OpsMessage[];
  routine: OpsMessage[];
}

/** `mail` is the "emails wait" item from desk.dayItems, so the page can fold it into Do first. */
export function workView(
  db: OpsDatabase,
  memberId: string,
  now: number,
  panel: (name: string, id: string) => string,
  mail: { said: string; at: number } | null = null,
): WorkView {
  const { start, end } = dayBounds(now);
  const mine = db.tasks.filter((t) => t.state === "open" && t.assigneeId === memberId).sort((a, b) => a.dueAt - b.dueAt);
  const drafts = db.messages.filter((m) => m.state === "draft").sort((a, b) => a.createdAt - b.createdAt);
  const routine = drafts.filter((m) => isRoutine(m, m.templateKey ? (db.templates.find((x) => x.key === m.templateKey) ?? null) : null));
  const ctxs = new Map(mine.map((t) => [t.id, contextOf(db, t)]));
  const who = (t: OpsTask) => [ctxs.get(t.id)?.client, ctxs.get(t.id)?.role].filter(Boolean).join(" · ");

  const asRow = (t: OpsTask): WorkRow => {
    const late = bucketOf(t, now) === "late";
    return {
      key: t.id,
      tone: late ? "danger" : "warn",
      tag: late ? lateTag(t.dueAt, now) : "Needs you",
      title: who(t) || t.title,
      line: who(t) ? [t.title, firstLines(t.body)].filter(Boolean).join(". ") : firstLines(t.body),
      button: buttonFor(t, ctxs.get(t.id)!, panel),
      taskId: t.id,
      at: t.dueAt,
    };
  };

  const buckets = { late: [] as OpsTask[], today: [] as OpsTask[], waits: [] as OpsTask[], later: [] as OpsTask[] };
  for (const t of mine) buckets[bucketOf(t, now)].push(t);

  const doFirst: WorkRow[] = [...buckets.late.map(asRow), ...buckets.today.map(asRow)];
  if (drafts.length)
    doFirst.push({
      key: "drafts",
      tone: "warn",
      tag: "Needs you",
      title: drafts.length + (drafts.length === 1 ? " draft waits" : " drafts wait") + " for you",
      line: "Nothing reaches a client until you say so.",
      button: { label: "Approve", href: "/?view=approve" },
      taskId: null,
      at: drafts[0].createdAt,
    });
  if (mail)
    doFirst.push({ key: "mail", tone: "warn", tag: "Needs you", title: mail.said, line: "People who wrote to you are waiting for an answer.", button: { label: "Read the mail", href: "/mail" }, taskId: null, at: mail.at });
  doFirst.sort((a, b) => (a.tone === b.tone ? a.at - b.at : a.tone === "danger" ? -1 : 1));

  const callTasks = mine.filter((t) => t.kind === "call");
  const calls: WorkRow[] = callTasks.map((t) => {
    const late = t.dueAt < now;
    return {
      key: t.id,
      tone: late ? "danger" : "warn",
      tag: late ? lateTag(t.dueAt, now) : t.dueAt < end ? clockOf(t.dueAt) : dayShort(t.dueAt),
      title: t.title,
      line: [ctxs.get(t.id)?.client, firstLines(t.body)].filter(Boolean).join(" · "),
      button: { label: "Call", href: panel("call-client", t.id), primary: true },
      taskId: t.id,
      at: t.dueAt,
    };
  });
  const doneCalls = db.calls
    .filter((c: OpsCallLog) => c.by === memberId && c.at >= start && c.at < end)
    .sort((a, b) => a.at - b.at)
    .map((c) => ({ key: c.id, at: c.at, who: c.toName || c.spokeTo || c.to, line: [c.spokeTo, c.outcome].filter(Boolean).join(" · ") }));

  const board: WorkView["board"] = { late: [], today: [], waits: [], later: [] };
  for (const k of ["late", "today", "waits", "later"] as const)
    board[k] = buckets[k].map((t) => ({
      ...asRow(t),
      title: t.title,
      line: t.body,
      sub: taskSource(t, who(t)),
      system: isSystemTask(t),
      due: k === "late" ? lateTag(t.dueAt, now) : k === "today" ? (t.dueAt >= start ? "Today · " + clockOf(t.dueAt) : "Today") : dayShort(t.dueAt),
    }));
  const nextLater = buckets.later[0] ? dayShort(buckets.later[0].dueAt) : null;

  const meetings = db.interviews
    .filter((i) => i.at !== null && i.at >= start && i.at < end && (i.state === "booked" || i.state === "reconfirmed"))
    .sort((a, b) => (a.at as number) - (b.at as number))
    .map((i) => {
      const c = contextOf(db, { subjectType: "interview", subjectId: i.id });
      return { key: i.id, at: i.at as number, title: "Interview · " + i.candidateName, client: c.client, sub: [c.client, c.role, "round " + i.round].filter(Boolean).join(" · ") };
    });
  const timeline = [
    ...meetings.map((m) => ({ key: m.key, at: m.at, title: m.title, sub: m.sub })),
    ...callTasks.filter((t) => t.dueAt >= now && t.dueAt < end).map((t) => ({ key: t.id, at: t.dueAt, title: t.title, sub: ctxs.get(t.id)?.client ?? "" })),
  ].sort((a, b) => a.at - b.at);

  const seen = new Map<string, { name: string; line: string; tone: Tone }>();
  for (const t of [...buckets.late, ...buckets.today]) {
    const c = ctxs.get(t.id)!;
    if (c.client && !seen.has(c.client)) seen.set(c.client, { name: c.client, line: t.title, tone: bucketOf(t, now) === "late" ? "danger" : "warn" });
  }
  for (const m of meetings) if (m.client && !seen.has(m.client)) seen.set(m.client, { name: m.client, line: m.title + " at " + clockOf(m.at), tone: "info" });

  const oldest = buckets.late[0];
  return {
    counts: { today: doFirst.length, approve: drafts.length, calls: callTasks.length, tasks: mine.length },
    late: buckets.late.length,
    oldestLate: oldest ? days(oldest.dueAt, now) : null,
    doFirst,
    waitsCount: buckets.waits.length + buckets.later.length,
    calls,
    doneCalls,
    board,
    nextLater,
    meetings,
    timeline,
    clientsToday: [...seen.values()].slice(0, 5),
    drafts,
    routine,
  };
}

/** The headline of the dark "Where it stands" card. */
export function standsLine(late: number, needs: number): string {
  if (late > 0) return late + " late" + (needs > 0 ? ", then " + needs + " need you." : ".");
  if (needs > 0) return needs + (needs === 1 ? " needs you today." : " need you today.");
  return "Nothing is waiting on you.";
}

/** Draft kinds as the To approve tiles count them. */
export function draftCounts(drafts: OpsMessage[]): { key: string; what: string; count: number }[] {
  return DRAFT_KINDS.map((k) => ({ ...k, count: drafts.filter((m) => draftKind(m) === k.key).length }));
}

/** A draft row's title and channel line. */
export function draftLine(m: OpsMessage): { title: string; line: string } {
  return { title: messageTitle(m), line: messageInWords(m) };
}

/** The call panel: who is rung, why now, what to ask, who is still undecided. Real records only. */
export function callContext(db: OpsDatabase, t: OpsTask, now: number) {
  const c = contextOf(db, t);
  const lead = t.subjectType === "lead" ? db.leads.find((l) => l.id === t.subjectId) : null;
  const person =
    c.clientRow?.contacts?.[0] ??
    (lead ? { name: lead.contactName, email: lead.contactEmail, phone: lead.contactPhone, role: "" } : null) ??
    (c.clientRow ? { name: c.clientRow.name, email: "", phone: "", role: "" } : null);
  const open = c.set ? c.set.candidates.filter((x) => !x.decision) : [];
  const setName = c.set?.name.split(">").pop()?.trim() ?? "";
  const why: string[] = [];
  if (c.set?.sentAt) why.push("Day " + (Math.floor((now - c.set.sentAt) / DAY_MS) + 1) + ": the client has had " + (setName || "the set") + " since " + dayShort(c.set.sentAt));
  if (c.set && open.length) why.push(open.length + (open.length === 1 ? " person" : " people") + " without an answer");
  const sent = db.messages
    .filter((m) => m.subjectType === t.subjectType && m.subjectId === t.subjectId && m.state === "sent" && m.sentAt)
    .sort((a, b) => (b.sentAt as number) - (a.sentAt as number))[0];
  if (sent) why.push("Last message sent " + dayShort(sent.sentAt as number) + ": " + messageTitle(sent));
  const last = db.calls.filter((x) => x.subjectType === t.subjectType && x.subjectId === t.subjectId).sort((a, b) => b.at - a.at)[0];
  if (last) why.push("Last call " + dayShort(last.at) + ": " + last.spokeTo + (last.outcome ? ' - "' + last.outcome + '"' : ""));
  if (why.length === 0) why.push(firstLines(t.body) || t.title);
  const names = open.map((x) => x.name);
  const ask = names.length ? ["Has the client decided on " + (names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0]) + "?"] : [];
  const purpose =
    t.subjectType === "esa" || t.subjectType === "lead" ? "esa.stuck"
    : t.subjectType === "interview" ? "interview.reconfirm"
    : t.subjectType === "invoice" ? "invoice.chase"
    : t.subjectType === "clientSet" ? "feedback.chase"
    : "other";
  return {
    ctx: c,
    person,
    phone: person?.phone ? tidyPhone(person.phone) : null,
    tel: person?.phone ? telLink(person.phone) : null,
    why,
    ask,
    open,
    purpose,
    sub: [c.client, c.role, setName].filter(Boolean).join(" > "),
  };
}
