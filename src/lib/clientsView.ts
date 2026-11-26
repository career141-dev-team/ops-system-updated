/**
 * What the Clients screens of the v6 design show (19 Nov): the cards of C1, the board of C2, the board of C3
 * and the rail beside them. Pure: it reads a desk snapshot and answers with plain rows, so every case is a test
 * and the pages only draw. Nothing here sends anything; "copy" texts are drafts a person pastes themselves.
 */
import type { OpsClient, OpsDatabase, OpsEsa, OpsLead, OpsMeeting } from "@/data/types";
import { agoShort, sourceShort } from "@/lib/clientCards";
import { clientAgreementNotSigned, clientForLead } from "@/lib/clients";
import {
  type AgreementColumn,
  type EnquiryColumn,
  agreementColumn,
  chaseDueAt,
  dueWords,
  enquiryColumn,
  lastTalkWords,
  rolesWords,
  tileLetters,
} from "@/lib/clientsBoard";
import { CHASE_PLAN, chaseDraft, chaseStep } from "@/lib/esa";
import { duplicateMatch } from "@/lib/leads";

export type Tone = "brand" | "warn" | "danger" | "info" | "neutral";
const DAY = 86_400_000;
const colombo = (t: number) => new Date(t + 5.5 * 3_600_000);
/** "Fri 20 Nov". */
export const dayWords = (t: number): string =>
  colombo(t).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
/** "14:00" in Colombo. */
export const clockWords = (t: number): string => colombo(t).toISOString().slice(11, 16);
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

export interface Person {
  name: string;
  email: string;
  phone: string;
  role: string;
}

/** Who we write to at a client: the HR contact, else the first one, else the person on the lead it came in as. */
export function contactOf(client: Pick<OpsClient, "contacts">, lead: Pick<OpsLead, "contactName" | "contactEmail" | "contactPhone"> | null): Person | null {
  const list = (client.contacts ?? []).filter((c) => c.name || c.email || c.phone);
  const one = list.find((c) => c.role === "hr") ?? list[0];
  if (one) return one;
  if (lead && (lead.contactName || lead.contactEmail || lead.contactPhone))
    return { name: lead.contactName, email: lead.contactEmail, phone: lead.contactPhone, role: "" };
  return null;
}

/** The newest talk with a client: a call written down, a mail either way, or a message of ours that went. */
export function lastTalkAt(db: OpsDatabase, client: OpsClient): number | null {
  const ids = new Set<string>([client.id]);
  if (client.leadId) {
    ids.add(client.leadId);
    for (const a of db.agreements) if (a.leadId === client.leadId) ids.add(a.id);
  }
  const times: number[] = [];
  for (const c of db.calls) if (c.subjectId && ids.has(c.subjectId)) times.push(c.at);
  for (const m of db.inbound) if (m.clientId === client.id) times.push(m.receivedAt);
  for (const m of db.messages) if (m.state === "sent" && m.sentAt && m.subjectId && ids.has(m.subjectId)) times.push(m.sentAt);
  return times.length ? Math.max(...times) : null;
}

/** True when the client wrote to us after the agreement went: a client who replies is not chased. */
export function repliedSince(db: OpsDatabase, client: Pick<OpsClient, "id">, since: number | null): boolean {
  return since !== null && db.inbound.some((m) => m.clientId === client.id && m.direction !== "out" && m.receivedAt > since);
}

export interface Copyable {
  label: string;
  text: string;
}

/** The next written chase of an agreement as a draft to copy, or null when it is not chased by writing (or the client replied). */
export function chaseCopy(db: OpsDatabase, esa: OpsEsa, replied: boolean, phone: string | null): (Copyable & { step: number }) | null {
  if (replied || (esa.state !== "sent" && esa.state !== "chasing")) return null;
  const plan = chaseStep(esa.chaseStep + 1);
  if (!plan || plan.channel === "call") return null;
  const wording = db.templates.find((t) => t.key === plan.templateKey) ?? null;
  const draft = chaseDraft(plan, esa.fields, wording, phone);
  if ("problem" in draft) return null;
  return { label: "Copy chase " + plan.step, text: draft.body, step: plan.step };
}

/** A plain check-in line for a quiet client. Copied by a person; the system sends nothing. */
export function checkInText(person: Person | null, owner: string): string {
  const who = person ? firstName(person.name) : "";
  return (
    "Hello" + (who ? " " + who : "") + ", I wanted to check in. Is there anything you need from us this week, or anything to change on the roles we are working on? Thank you, " + firstName(owner)
  );
}

export interface ClientCard {
  id: string;
  href: string;
  name: string;
  tile: string;
  tileTone: "brand" | "warn" | "neutral";
  owner: string;
  ownerId: string;
  stage: string;
  person: Person | null;
  status: { text: string; tone: Tone };
  line: string;
  quietDays: number | null;
  copy: (Copyable & { kind: "chase" | "checkin" }) | null;
  /** The opening in its words: for the check-in panel. */
  openRoles: { id: string; title: string }[];
  esa: OpsEsa | null;
  needsYou: boolean;
  /** No signed or countersigned ESA on the client's own lead or any lead its positions came from (26 Nov). */
  agreementNotSigned: boolean;
  /** The agreement is signed (or the client is one of ours from before Ops had agreements). */
  signed: boolean;
  /** Every position this client has given us, closed ones too. */
  positionsGiven: number;
}

/**
 * Signed means the agreement is signed or countersigned. A client with no agreement on file counts as signed
 * only when it is already active: those are clients from before Ops, whose card already says "Agreement signed".
 */
export function isSigned(esa: { state: string } | null, stage: string): boolean {
  if (esa) return esa.state === "signed" || esa.state === "countersigned";
  return stage === "active";
}

const QUIET_AFTER = 3;

/** One card per client that is not closed, in the order the desk lists them. */
export function clientCards(db: OpsDatabase, now: number): ClientCard[] {
  const nameOf = (id: string | null) => db.members.find((m) => m.id === id)?.name ?? "Unassigned";
  return db.clients
    .filter((c) => c.stage !== "closed")
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((client) => {
      const lead = client.leadId ? (db.leads.find((l) => l.id === client.leadId) ?? null) : null;
      const esa = client.leadId ? (db.agreements.find((a) => a.leadId === client.leadId) ?? null) : null;
      const owner = nameOf(client.ownerId);
      const person = contactOf(client, lead);
      const talk = lastTalkAt(db, client);
      const quietDays = talk === null ? null : Math.max(0, Math.floor((now + 5.5 * 3_600_000) / DAY) - Math.floor((talk + 5.5 * 3_600_000) / DAY));
      const roles = db.positions.filter((p) => p.clientId === client.id && p.stage !== "closed");
      const replied = repliedSince(db, client, esa?.sentAt ?? null);

      let status: ClientCard["status"] = { text: "No openings yet", tone: "neutral" };
      let tileTone: ClientCard["tileTone"] = "neutral";
      let copy: ClientCard["copy"] = null;
      let needsYou = false;
      if (esa && (esa.state === "sent" || esa.state === "chasing") && esa.sentAt) {
        const next = chaseStep(esa.chaseStep + 1);
        if (next) {
          const due = dueWords(chaseDueAt(esa.sentAt, next.step, CHASE_PLAN), now);
          const late = due.tone !== "info";
          status = late ? { text: "Chase " + next.step + " " + due.text, tone: due.tone } : { text: "Next chase " + due.text.replace("due ", ""), tone: "info" };
          tileTone = late ? "warn" : "neutral";
          needsYou = late && !replied;
          const c = late ? chaseCopy(db, esa, replied, person?.phone ?? null) : null;
          if (c) copy = { label: c.label, text: c.text, kind: "chase" };
        } else status = { text: "Chase has run out: call them", tone: "danger" };
      } else if (esa?.state === "negotiating") {
        status = { text: "Changes wanted", tone: "warn" };
        tileTone = "warn";
        needsYou = true;
      } else if (esa?.state === "signed") {
        status = { text: "Signed, waiting for the Director", tone: "info" };
      } else if (esa?.state === "countersigned" || client.stage === "active") {
        status = { text: "Agreement signed", tone: "brand" };
        tileTone = "brand";
      } else if (esa?.state === "draft") {
        status = { text: "Agreement not sent yet", tone: "warn" };
      } else if (client.stage === "dormant") {
        status = { text: "Quiet: nothing open", tone: "neutral" };
      }
      if (!copy && quietDays !== null && quietDays > QUIET_AFTER && client.stage !== "lead") {
        copy = { label: "Copy a check-in", text: checkInText(person, owner), kind: "checkin" };
      }
      return {
        id: client.id,
        href: "/clients/" + client.id,
        name: client.name,
        tile: tileLetters(client.name),
        tileTone,
        owner: firstName(owner),
        ownerId: client.ownerId,
        stage: client.stage,
        person,
        status,
        line: rolesWords(roles.length) + " · " + lastTalkWords(talk, now),
        quietDays,
        copy,
        openRoles: roles.map((p) => ({ id: p.id, title: p.title })),
        esa,
        needsYou,
        agreementNotSigned: clientAgreementNotSigned(db, client.id),
        signed: isSigned(esa, client.stage),
        positionsGiven: db.positions.filter((p) => p.clientId === client.id).length,
      };
    });
}

export type ClientFilter = "signed" | "notsigned" | "active" | "quiet" | "leads" | "dormant" | "mine";
export const CLIENT_FILTERS: { key: ClientFilter; label: string }[] = [
  { key: "signed", label: "Signed" },
  { key: "notsigned", label: "Not signed" },
  { key: "active", label: "Active" },
  { key: "quiet", label: "Quiet" },
  { key: "leads", label: "Leads" },
  { key: "dormant", label: "Dormant" },
  { key: "mine", label: "Mine" },
];

/**
 * Narrows the cards to one filter and a search ("Client or contact"). With no filter chosen the list is the signed
 * clients (Ops lead, 25 Nov); a search with no filter looks across everyone, so a client still unsigned can be found by name.
 */
export function filterCards(cards: ClientCard[], filter: string, q: string, meId: string): ClientCard[] {
  const s = q.trim().toLowerCase();
  return cards.filter((c) => {
    if (s && ![c.name, c.person?.name, c.person?.email].some((v) => (v ?? "").toLowerCase().includes(s))) return false;
    // A client with an open position is in work, whatever its stage says (23 Nov: a new client's first position
    // used to stay hidden under Leads).
    if (filter === "signed" || (!filter && !s)) return c.signed;
    if (filter === "notsigned") return !c.signed;
    if (filter === "active") return c.stage === "active" || c.stage === "onboarding" || c.openRoles.length > 0;
    if (filter === "quiet") return c.quietDays !== null && c.quietDays > QUIET_AFTER;
    if (filter === "leads") return c.stage === "lead" && c.openRoles.length === 0;
    if (filter === "dormant") return c.stage === "dormant";
    if (filter === "mine") return c.ownerId === meId;
    return true;
  });
}

export interface EnquiryCard {
  id: string;
  href: string;
  company: string;
  tile: string;
  tileTone: "brand" | "warn" | "info" | "neutral";
  line: string;
  state: { text: string; tone: Tone };
  note: string;
  column: EnquiryColumn;
  /** The call, when one is booked. */
  meeting: OpsMeeting | null;
  /** A client of ours the name may be: for the check. */
  match: { name: string; since: number; taClientId: string | null } | null;
  contact: Person | null;
  /** Badges for the checks still open: shown on the card in New (26 Nov, Nov 25 ops meeting: the Checks tab went). */
  flags: { text: string; panel: "check-enquiry" | "duplicate-check" }[];
}

/** Every open enquiry placed in its column, newest first. A new one that is flagged or looks like a client of ours carries a badge. */
export function enquiryCards(db: OpsDatabase, now: number): EnquiryCard[] {
  const clients = db.clients.map((c) => ({ id: c.id, name: c.name, nameKey: c.nameKey, esaSignedAt: null as number | null, since: c.createdAt, taClientId: c.taClientId }));
  const out: EnquiryCard[] = [];
  for (const lead of db.leads.slice().sort((a, b) => b.createdAt - a.createdAt)) {
    const meetings = db.meetings.filter((m) => m.leadId === lead.id);
    const esa = db.agreements.find((a) => a.leadId === lead.id) ?? null;
    const column = enquiryColumn(lead, meetings, esa?.state ?? null);
    if (!column) continue;
    const found = column === "new" && !lead.clientTaId ? duplicateMatch(lead.company, clients) : { exact: null, near: [] as typeof clients };
    const hitLike = found.exact ?? found.near[0] ?? null;
    const hit = hitLike ? (clients.find((c) => c.id === hitLike.id) ?? null) : null;
    const intro = meetings.filter((m) => m.kind === "intro");
    const booked = intro.find((m) => m.state === "booked") ?? null;
    const held = intro.filter((m) => m.state === "held").sort((a, b) => (b.heldAt ?? 0) - (a.heldAt ?? 0))[0] ?? null;
    let state: EnquiryCard["state"];
    let tileTone: EnquiryCard["tileTone"] = "neutral";
    const flagged = lead.industryFlagged && !lead.industryConfirmedBy;
    const flags: EnquiryCard["flags"] = [];
    if (column === "new") {
      if (flagged) flags.push({ text: "Banking/finance check", panel: "check-enquiry" });
      if (hit) flags.push({ text: "Possible duplicate", panel: "duplicate-check" });
    }
    if (column === "new") {
      if (flagged || hit) tileTone = "warn";
      state = flagged
        ? { text: "Banking or finance? " + (lead.industryBecause ? "It says “" + lead.industryBecause + "”" : "Check it"), tone: "warn" }
        : hit
          ? { text: "May be the same as " + hit.name + ", client since " + new Date(hit.since).getUTCFullYear(), tone: "warn" }
          : { text: "New, not checked yet", tone: "warn" };
    } else if (column === "intro") {
      tileTone = booked ? "info" : "neutral";
      state = booked ? { text: "Call booked " + dayWords(booked.at) + ", " + clockWords(booked.at), tone: "info" } : { text: "Call not booked", tone: "warn" };
    } else {
      tileTone = "brand";
      state = held?.heldAt ? { text: "Call held " + dayWords(held.heldAt).replace(/^\w+ /, "") + ", checks clear", tone: "brand" } : { text: "Checks clear, agreement to send", tone: "brand" };
    }
    out.push({
      id: lead.id,
      href: "/leads/" + lead.id,
      company: lead.company,
      tile: tileLetters(lead.company),
      tileTone,
      line: sourceShort(lead.source) + " · " + agoShort(lead.createdAt, now),
      state,
      note: lead.notes.split("\n")[0].slice(0, 80),
      column,
      meeting: booked,
      match: hit ? { name: hit.name, since: hit.since, taClientId: hit.taClientId } : null,
      flags,
      contact: lead.contactName || lead.contactEmail || lead.contactPhone ? { name: lead.contactName, email: lead.contactEmail, phone: lead.contactPhone, role: "" } : null,
    });
  }
  return out;
}

export interface AgreementCard {
  id: string;
  leadId: string;
  company: string;
  tile: string;
  kind: string;
  line: string;
  state: { text: string; tone: Tone };
  extra: string;
  column: AgreementColumn;
  copy: (Copyable & { step: number }) | null;
  due: { step: number; at: number; tone: Tone } | null;
  clientId: string | null;
}

/** Every agreement on the board in its column, the ones that need a person first. */
export function agreementCards(db: OpsDatabase, now: number): AgreementCard[] {
  const out: AgreementCard[] = [];
  for (const esa of db.agreements.slice().sort((a, b) => b.updatedAt - a.updatedAt)) {
    const column = agreementColumn(esa, now);
    if (!column) continue;
    const lead = db.leads.find((l) => l.id === esa.leadId) ?? null;
    const client = clientForLead(db, esa.leadId);
    const company = esa.fields.companyName || lead?.company || client?.name || "Client";
    const person = client ? contactOf(client, lead) : null;
    const replied = client ? repliedSince(db, client, esa.sentAt) : false;
    let state: AgreementCard["state"] = { text: "Not sent yet", tone: "warn" };
    let extra = "";
    let copy: AgreementCard["copy"] = null;
    let due: AgreementCard["due"] = null;
    if (column === "chasing" && esa.sentAt) {
      const next = chaseStep(esa.chaseStep + 1);
      if (next) {
        const at = chaseDueAt(esa.sentAt, next.step, CHASE_PLAN);
        const d = dueWords(at, now);
        due = { step: next.step, at, tone: d.tone };
        state = d.tone === "info" ? { text: "Next chase " + d.text.replace("due ", ""), tone: "info" } : { text: "Chase " + next.step + " is " + d.text, tone: d.tone };
        if (d.tone !== "info") copy = chaseCopy(db, esa, replied, person?.phone ?? esa.fields.signatoryPhone ?? null);
        extra = "chase " + next.step + " of " + CHASE_PLAN.length;
      } else state = { text: "Chase has run out: call them", tone: "danger" };
      if (!extra) extra = "chase " + CHASE_PLAN.length + " of " + CHASE_PLAN.length;
    } else if (column === "changes") {
      state = { text: esa.reason ? esa.reason.slice(0, 70) : "They want changes", tone: "warn" };
    } else if (column === "signed") {
      state = { text: "Waiting for the Director to countersign", tone: "info" };
    } else if (column === "done") {
      state = { text: "Countersigned " + (esa.countersignedAt ? dayWords(esa.countersignedAt).replace(/^\w+ /, "") : ""), tone: "brand" };
    }
    const when = esa.sentAt ?? esa.createdAt;
    out.push({
      id: esa.id,
      leadId: esa.leadId,
      company,
      tile: tileLetters(company),
      kind: esa.sentAt ? "Sent " + dayWords(when).replace(/^\w+ /, "") : "Draft v" + esa.version,
      line: esa.sentAt ? "Sent " + dayWords(esa.sentAt).replace(/^\w+ /, "") : "Call held, draft ready",
      state,
      extra,
      column,
      copy,
      due,
      clientId: client?.id ?? null,
    });
  }
  return out;
}

/** Counts for the tabs and the page line, from one place. */
export function clientTotals(db: OpsDatabase, now: number) {
  const clients = db.clients.filter((c) => c.stage !== "closed");
  const enquiries = enquiryCards(db, now);
  const agreements = agreementCards(db, now).filter((a) => a.column !== "done");
  const owners = [...new Set(clients.map((c) => db.members.find((m) => m.id === c.ownerId)?.name).filter((n): n is string => !!n).map(firstName))];
  return { clients: clients.length, enquiries: enquiries.length, agreements: agreements.length, positions: db.positions.length, owners, enquiryCards: enquiries };
}

/** The line under "Clients": 22 active clients · 6 enquiries · 6 agreements open · owners ... */
export function clientsLine(t: { clients: number; enquiries: number; agreements: number; owners: string[] }): string {
  return (
    t.clients + (t.clients === 1 ? " client" : " clients") + " · " + t.enquiries + (t.enquiries === 1 ? " enquiry" : " enquiries") + " · " + t.agreements + (t.agreements === 1 ? " agreement open" : " agreements open") + (t.owners.length ? " · owners " + t.owners.join(", ") : "")
  );
}

/** The days of this week, Monday to Saturday, each with the count of booked intro calls on it. */
export function weekStrip(meetings: { at: number; state: string }[], now: number): { label: string; day: number; today: boolean; calls: number }[] {
  const c = colombo(now);
  const monday = Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()) - ((c.getUTCDay() + 6) % 7) * DAY;
  return Array.from({ length: 6 }, (_, i) => {
    const start = monday + i * DAY;
    const d = new Date(start);
    const calls = meetings.filter((m) => m.state === "booked" && colombo(m.at).getTime() >= start && colombo(m.at).getTime() < start + DAY).length;
    return {
      label: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
      day: d.getUTCDate(),
      today: Math.floor(colombo(now).getTime() / DAY) * DAY === start,
      calls,
    };
  });
}

/**
 * The dark "Where it stands" card for the client list (25 Nov): the count in words, then one row for each client
 * who needs the Ops person today (the most urgent five), each with why. No drafts to copy here any more.
 */
export function standsClients(cards: ClientCard[]): { head: string; body: string; people: { id: string; name: string; why: string }[]; more: number } {
  const need = cards.filter((c) => c.needsYou);
  const quiet = cards.filter((c) => c.quietDays !== null && c.quietDays > QUIET_AFTER);
  const head = need.length ? need.length + (need.length === 1 ? " client needs" : " clients need") + " you today." : "Nothing needs you today.";
  const body = quiet.length ? quiet.length + (quiet.length === 1 ? " client has" : " clients have") + " been quiet for more than " + QUIET_AFTER + " days." : "";
  const people = need.slice(0, 5).map((c) => ({ id: c.id, name: c.name, why: c.status.text }));
  return { head, body, people, more: Math.max(0, need.length - people.length) };
}

/** "Day 2: first reminder by email" for each step of the owner's chase plan (days are counted from sending). */
export function chaseLadder(): { n: number; text: string }[] {
  let day = 0;
  return CHASE_PLAN.map((p) => {
    day += p.afterDays;
    return { n: p.step, text: "Day " + day + ": " + p.what.charAt(0).toLowerCase() + p.what.slice(1) };
  });
}

export interface Talk {
  id: string;
  at: number;
  text: string;
  kind: "call" | "chat" | "mail";
}

/** The last `n` talks with a client, newest first: calls written down, mail either way, and our messages that went. */
export function talksOf(db: OpsDatabase, client: OpsClient, n: number): Talk[] {
  const ids = new Set<string>([client.id]);
  if (client.leadId) {
    ids.add(client.leadId);
    for (const a of db.agreements) if (a.leadId === client.leadId) ids.add(a.id);
  }
  const rows: Talk[] = [];
  for (const c of db.calls)
    if (c.subjectId && ids.has(c.subjectId)) rows.push({ id: c.id, at: c.at, kind: "call", text: "Call with " + (c.spokeTo || c.toName || "them") + (c.outcome ? ": " + c.outcome : "") });
  for (const m of db.inbound)
    if (m.clientId === client.id)
      rows.push({ id: m.id, at: m.receivedAt, kind: m.channel === "whatsapp" ? "chat" : "mail", text: m.direction === "out" ? "We wrote: " + m.subject : (m.fromName || m.from) + " wrote: " + m.subject });
  for (const m of db.messages)
    if (m.state === "sent" && m.sentAt && m.subjectId && ids.has(m.subjectId))
      rows.push({ id: m.id, at: m.sentAt, kind: m.channel === "whatsapp" ? "chat" : "mail", text: "We sent: " + (m.subject || m.body.slice(0, 60)) });
  return rows.sort((a, b) => b.at - a.at).slice(0, n);
}
