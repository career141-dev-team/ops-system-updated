/**
 * Aura's tools (docs/31): what the model may LOOK UP before it
 * proposes one action for a person to press.
 *
 * Pure over the loaded desk: nothing here writes, sends or reaches the TA
 * System. Three rules:
 *
 *   - Every read is filtered by `can()`: a person's assistant sees what the
 *     person could open on a screen, and no more.
 *   - Money never leaves here. Rows are picked field by field, so a fee, a
 *     salary or an invoice amount cannot ride along by accident.
 *   - `propose_action` goes through the same `resolveIntent` as the old chat:
 *     duplicates, industry flags, booking hours and permissions are the
 *     rules' job, never the model's. It ends the loop with a proposal, or
 *     hands the model a plain sentence to fix.
 *
 * `find_ta_lead` is declared here but answered by the action (it needs the
 * TA System's API, which is async and not a pure function of the desk).
 */

import type { OpsDatabase, OpsMember } from "@/data/types";
import type { ToolDef, ToolRun } from "@/lib/ai";
import { catalogueInWords, resolveIntent } from "@/lib/agent";
import { colomboDate, colomboHour } from "@/lib/calendar";
import { parseSurface } from "@/lib/a2ui";
import { can, seesWholeDesk } from "@/lib/roles";

const MAX_ROWS = 20;
const COLOMBO = "+05:30";
const MIN = 60_000;

export const AGENT_TOOLS: ToolDef[] = [
  {
    name: "find_client",
    description: "Look up our clients by part of the name. Returns id, name, stage and owner. Empty query lists some.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: [] },
  },
  {
    name: "find_lead",
    description: "Look up enquiries (leads) by company or contact name. Returns id, company, contact, state, source, owner.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: [] },
  },
  {
    name: "find_member",
    description: "Look up the people on our team by name. Returns id, name and role.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: [] },
  },
  {
    name: "find_position",
    description: "Look up positions (roles we are hiring for) by title or client. Returns id, title, client and stage.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: [] },
  },
  {
    name: "my_tasks",
    description: "The person's own open tasks, soonest due first.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "free_times",
    description:
      "Free half-hour starts on one day (Asia/Colombo, 09:00 to 21:00) for the person, from their meetings and interviews in Ops. Weekends and past times are left out.",
    input_schema: {
      type: "object",
      properties: { date: { type: "string", description: "yyyy-mm-dd" }, member: { type: "string", description: "A teammate's name; only if you may see the whole desk. Default: the person." } },
      required: ["date"],
    },
  },
  {
    name: "find_ta_lead",
    description: "Look up TA leads in the TA System by name. Returns the id to use as taLeadId.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: [] },
  },
  {
    name: "show_ui",
    description:
      "Finish with this when the answer is a list or a few records that read better as cards than as a sentence (clients, positions, tasks, free times). Display only: never use it for something to be done - that is propose_action. text is one short lead sentence. components is an A2UI v1.0 flat list: {id, component, ...} with one id \"root\". Allowed: Text {text, variant: body|caption}, Row/Column/List {children: [ids]}, Card {child: id}, Divider, Button {child: id of a Text, variant: default|primary, action: {event: {name: \"say\", context: {text: words to send as if typed}}}}. Literal strings only.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string" }, components: { type: "array", items: { type: "object" } } },
      required: ["text", "components"],
    },
  },
  {
    name: "propose_action",
    description:
      "Finish with this: the ONE action for the person to confirm. intent is a name from the list in the system prompt; fields are its fields, using names the desk can match (a company, a person's name, 'yyyy-mm-ddThh:mm' for times). Never guess a missing value.",
    input_schema: {
      type: "object",
      properties: { intent: { type: "string" }, fields: { type: "object", additionalProperties: { type: "string" } } },
      required: ["intent", "fields"],
    },
  },
];

export function agentSystemPrompt(member: OpsMember, today: string): string {
  return [
    "You are Aura, the assistant inside Career 141's Ops system, helping " + member.name + " (" + member.role.replace(/_/g, " ") + ").",
    "Today is " + today + ". All times are Asia/Colombo.",
    "Your job is to DO the task: use the tools to look up everything you need, then finish by calling propose_action once. A person then presses one confirm button; you never run anything yourself.",
    "Never ask the person for something you can look up (an id, a company, a teammate, a free time). Look it up.",
    "Ask ONE short question, in plain words with no tools, only when a value is truly missing and cannot be found (for example the contact's email).",
    "Never invent an id, email, phone number, time or money figure. Never mention fees, salaries or invoice amounts.",
    "If propose_action comes back with a problem, fix it with the tools or ask the one question it needs.",
    "Keep every reply short and plain. When a list or a few records read better as cards, finish with show_ui instead of words; never for an action.",
    "",
    "Actions you may propose (intent: what it does (fields)):",
    ...catalogueInWords(member).map((l) => "- " + l),
  ].join("\n");
}

function matches(query: unknown, ...parts: string[]): boolean {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  const hay = parts.join(" ").toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}

function rows(list: Record<string, string | number | null>[]): string {
  if (!list.length) return "Nothing found.";
  return JSON.stringify(list.slice(0, MAX_ROWS)) + (list.length > MAX_ROWS ? " (first " + MAX_ROWS + " of " + list.length + ")" : "");
}

export interface ToolContext {
  db: OpsDatabase;
  member: OpsMember;
  now: number;
  /** The action supplies this one: TA's API is async and lives outside the pure rules. */
  findTaLead?: (query: string) => Promise<string>;
}

const NOT_ALLOWED = "You are not allowed to look that up.";

/** Free half-hour starts for one Colombo day, as "HH:mm". Exported so a test can hold the arithmetic. */
export function freeStarts(db: OpsDatabase, memberId: string, date: string, now: number): string[] {
  const busy: [number, number][] = [];
  for (const m of db.meetings) {
    if (["cancelled", "not_held"].includes(m.state)) continue;
    if (m.bookedBy === memberId || m.organiserId === memberId) busy.push([m.at, m.at + (m.lengthMin ?? 30) * MIN]);
  }
  for (const i of db.interviews) {
    if (i.at === null || ["cancelled", "withdrew", "no_show"].includes(i.state)) continue;
    if (i.ownerId === memberId) busy.push([i.at, i.at + 60 * MIN]);
  }
  const day = new Date(date + "T12:00:00" + COLOMBO).getUTCDay();
  const weekend = !Number.isFinite(day) || day === 0 || day === 6;
  if (weekend) return [];
  const out: string[] = [];
  for (let h = 9; h < 21; h++) {
    for (const mm of ["00", "30"]) {
      const at = Date.parse(date + "T" + String(h).padStart(2, "0") + ":" + mm + ":00" + COLOMBO);
      if (at < now || colomboHour(at) < 9 || colomboHour(at) >= 21) continue;
      if (busy.some(([from, to]) => at < to && at + 30 * MIN > from)) continue;
      out.push(String(h).padStart(2, "0") + ":" + mm);
    }
  }
  return out;
}

/** Run one tool. Reads only; propose_action is the one that can stop the loop. */
export async function runAgentTool(ctx: ToolContext, name: string, input: Record<string, unknown>): Promise<ToolRun> {
  const { db, member, now } = ctx;
  const name_of = (id: string | null | undefined) => db.members.find((m) => m.id === id)?.name ?? "";
  switch (name) {
    case "find_client":
      if (!can(member, "client.manage")) return NOT_ALLOWED;
      return rows(
        db.clients
          .filter((c) => matches(input.query, c.name))
          .map((c) => ({ id: c.id, name: c.name, stage: c.stage, owner: name_of(c.ownerId) })),
      );
    case "find_lead":
      if (!can(member, "client.manage")) return NOT_ALLOWED;
      return rows(
        db.leads
          .filter((l) => matches(input.query, l.company, l.contactName))
          .map((l) => ({ id: l.id, company: l.company, contact: l.contactName, state: l.state, source: l.source, owner: name_of(l.ownerId) })),
      );
    case "find_member":
      return rows(
        db.members
          .filter((m) => m.active && matches(input.query, m.name))
          .map((m) => ({ id: m.id, name: m.name, role: m.role })),
      );
    case "find_position":
      if (!can(member, "client.manage")) return NOT_ALLOWED;
      return rows(
        db.positions
          .filter((p) => matches(input.query, p.title, db.clients.find((c) => c.id === p.clientId)?.name ?? ""))
          .map((p) => ({ id: p.id, title: p.title, client: db.clients.find((c) => c.id === p.clientId)?.name ?? "", stage: p.stage })),
      );
    case "my_tasks":
      if (!can(member, "task.do")) return NOT_ALLOWED;
      return rows(
        db.tasks
          .filter((t) => t.state === "open" && t.assigneeId === member.id)
          .sort((a, b) => a.dueAt - b.dueAt)
          .map((t) => ({ id: t.id, title: t.title, due: colomboDate(t.dueAt), late: t.dueAt < now ? "yes" : "no" })),
      );
    case "free_times": {
      const date = String(input.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Give the date as yyyy-mm-dd.";
      let who = member;
      const asked = String(input.member ?? "").trim();
      if (asked) {
        if (!seesWholeDesk(member)) return NOT_ALLOWED;
        const found = db.members.filter((m) => m.active && matches(asked, m.name));
        if (found.length !== 1) return found.length ? "Several people match: " + found.map((m) => m.name).join(", ") + "." : "No teammate by that name.";
        who = found[0];
      }
      const free = freeStarts(db, who.id, date, now);
      return free.length ? who.name + " is free from these starts on " + date + " (Colombo): " + free.join(", ") : who.name + " has nothing free on " + date + " (weekend, past or full).";
    }
    case "find_ta_lead":
      if (!can(member, "client.manage")) return NOT_ALLOWED;
      return ctx.findTaLead ? ctx.findTaLead(String(input.query ?? "")) : "The TA System is not reachable from here.";
    case "show_ui": {
      const got = parseSurface(input.components);
      if (!got.ok) return "Not drawn: " + got.why + " Fix it, or answer in words.";
      return { stop: true, value: { kind: "ui", text: String(input.text ?? "").trim(), ui: JSON.stringify(got.surface) } };
    }
    case "propose_action": {
      const fields: Record<string, string> = {};
      for (const [k, v] of Object.entries((input.fields ?? {}) as Record<string, unknown>)) if (v !== null && v !== undefined) fields[k] = String(v);
      const got = { intent: String(input.intent ?? ""), fields, question: "", notSaid: [] };
      const resolved = resolveIntent(got, db, member, now);
      if (resolved.kind === "proposal") return { stop: true, value: resolved };
      if (resolved.kind === "ask") return "Not ready: " + resolved.said + " Look it up with a tool, or ask the person one short question.";
      if (resolved.kind === "refuse") return "Refused: " + resolved.said + " Tell the person in one sentence.";
      return "That is a question, not an action. Answer in words.";
    }
    default:
      return "There is no tool called " + name + ".";
  }
}

/**
 * On the confirm card a TA lead is a name, not an id. The row stops being an editable line, because
 * "Change ... to ..." would put a name where the action needs the id.
 */
export function withTaNames<T extends ReturnType<typeof resolveIntent>>(resolved: T, people: { id: string; fullName: string }[]): T {
  if (resolved.kind !== "proposal") return resolved;
  const label: Record<string, string> = { taLeadId: "TA lead", primaryTaId: "Primary TA" };
  return {
    ...resolved,
    buttons: resolved.buttons.map((b) => ({
      ...b,
      shows: b.shows.map((s) => {
        const raw = b.fields[s.field];
        const who = label[s.field] && raw ? people.find((p) => p.id === raw)?.fullName : undefined;
        return who ? { ...s, label: label[s.field], value: who, field: "" } : s;
      }),
    })),
  };
}
