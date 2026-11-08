/**
 * The desk assistant: words into the actions the desk already has
 * (8 Nov, docs/31).
 *
 * The owner's ask: a chat that does the work. A person types "approve the
 * last email"; the system shows one line and a button; the click runs it.
 * Two rules keep that safe, and both live here where a test can hold them:
 *
 *   - **The model never executes.** It turns words into an intent and its
 *     fields, as JSON. Everything after that is rules: which action, which
 *     row, whose permission, what the button says.
 *   - **The rules never guess silently.** "The last email" names the draft
 *     it picked, in the button. A client that is not a whole name is asked
 *     about, not assumed. A money figure comes from the row, never from the
 *     words, unless the field is the person's own entry (a payment received)
 *     and then the figure is on the button before anything runs.
 *
 * The button runs the SAME server action the screen runs, with the same
 * FormData, through the same gate. The chat adds no power; it adds a way in.
 */

import type { OpsDatabase, OpsMember } from "@/data/types";
import { LEAD_SOURCES } from "@/lib/leads";
import { type Capability, can, refusal } from "@/lib/roles";
import { clientNamed } from "@/lib/quickAdd";

/** The server actions the chat may run. `actions.ts` must provide every one (the type makes it). */
export const RUNNABLE_NAMES = [
  "approveAndSend",
  "approveAllRoutine",
  "markMailDone",
  "fileThisMail",
  "finishTask",
  "recordCall",
  "quickAdd",
  "writeNewMessage",
  "recordPayment",
  "sendInvoice",
] as const;
export type Runnable = (typeof RUNNABLE_NAMES)[number];

/** Where a field's value comes from when the words are resolved against the desk. */
export type FieldFrom = "text" | "client" | "draft" | "task" | "invoice" | "email" | "money" | "inbound" | "choice";

export interface AgentField {
  /** The FormData name the action reads. */
  name: string;
  from: FieldFrom;
  required: boolean;
  /** How the desk asks for it when it is missing. */
  asks: string;
  choices?: readonly string[];
}

export interface AgentAction {
  /** The intent name the model answers with. */
  name: string;
  /** What it does, for the model and for "here is what I can". */
  says: string;
  action: Runnable;
  needs: Capability | null;
  money: boolean;
  fields: AgentField[];
  /** Fixed FormData the screen would also send. */
  fixed?: Record<string, string>;
}

export const AGENT_ACTIONS: AgentAction[] = [
  {
    name: "approve_draft",
    says: "Approve one waiting draft and send it (the newest when none is named)",
    action: "approveAndSend",
    needs: "message.approve",
    money: false,
    fields: [{ name: "messageId", from: "draft", required: true, asks: "Which draft? Say a word from its subject, or 'the last one'." }],
  },
  {
    name: "approve_all_routine",
    says: "Approve every routine notice waiting (drafts from a template a person approved once)",
    action: "approveAllRoutine",
    needs: "message.approve",
    money: false,
    fields: [],
  },
  {
    name: "mark_mail_done",
    says: "Mark an email that arrived as dealt with",
    action: "markMailDone",
    needs: "inbox.read",
    money: false,
    fields: [{ name: "inboundId", from: "inbound", required: true, asks: "Which email? Say who it is from, or 'the newest'." }],
  },
  {
    name: "file_mail",
    says: "File an email that arrived under a client",
    action: "fileThisMail",
    needs: "inbox.read",
    money: false,
    fields: [
      { name: "inboundId", from: "inbound", required: true, asks: "Which email? Say who it is from, or 'the newest'." },
      { name: "subject", from: "client", required: true, asks: "Which client should it be filed under?" },
    ],
  },
  {
    name: "finish_task",
    says: "Mark one of your tasks done, with what happened",
    action: "finishTask",
    needs: "task.do",
    money: false,
    fields: [
      { name: "taskId", from: "task", required: true, asks: "Which task? Say a word from it, or 'the late one'." },
      { name: "outcome", from: "text", required: true, asks: "What happened? One line." },
    ],
  },
  {
    name: "log_call",
    says: "Write down a phone call you made",
    action: "recordCall",
    needs: "task.do",
    money: false,
    fields: [
      { name: "to", from: "text", required: true, asks: "What number did you call?" },
      { name: "spokeTo", from: "text", required: true, asks: "Who did you speak to, or did nobody answer?" },
      { name: "outcome", from: "text", required: true, asks: "What was said? One line." },
      { name: "about", from: "client", required: false, asks: "Which client was it about?" },
    ],
    fixed: { purpose: "other" },
  },
  {
    name: "keep_note",
    says: "Keep a note for yourself; it is on Your day tomorrow morning",
    action: "quickAdd",
    needs: null,
    money: false,
    fields: [
      { name: "text", from: "text", required: true, asks: "What is the note?" },
      { name: "about", from: "client", required: false, asks: "Which client is it about?" },
    ],
    fixed: { kind: "note" },
  },
  {
    name: "new_enquiry",
    says: "Save a new enquiry from a company that got in touch",
    action: "quickAdd",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "company", from: "text", required: true, asks: "Which company?" },
      { name: "contactName", from: "text", required: false, asks: "Who got in touch?" },
      { name: "contactPhone", from: "text", required: false, asks: "Their number?" },
      { name: "contactEmail", from: "email", required: false, asks: "Their email?" },
      { name: "source", from: "choice", required: false, asks: "Where did it come from?", choices: LEAD_SOURCES },
    ],
    fixed: { kind: "enquiry" },
  },
  {
    name: "write_email",
    says: "Write an email to somebody; it is drafted and waits for approval, nothing sends from here",
    action: "writeNewMessage",
    needs: "message.approve",
    money: false,
    fields: [
      { name: "to", from: "email", required: true, asks: "To which address?" },
      { name: "subject", from: "text", required: true, asks: "What is the subject?" },
      { name: "body", from: "text", required: true, asks: "What should it say?" },
    ],
  },
  {
    name: "record_payment",
    says: "Record money received against an invoice",
    action: "recordPayment",
    needs: "money.manage",
    money: true,
    fields: [
      { name: "invoiceId", from: "invoice", required: true, asks: "Which invoice? Say its number, or the client's name." },
      { name: "amount", from: "money", required: true, asks: "How much was received?" },
      { name: "method", from: "text", required: false, asks: "How was it paid?" },
    ],
  },
  {
    name: "send_invoice",
    says: "Send a drafted invoice to the client's billing address",
    action: "sendInvoice",
    needs: "money.manage",
    money: true,
    fields: [{ name: "invoiceId", from: "invoice", required: true, asks: "Which invoice? Say its number, or the client's name." }],
  },
];

/** For the prompt, and for "here is what I can". */
export function catalogueInWords(member?: OpsMember): string[] {
  return AGENT_ACTIONS.filter((a) => !member || !a.needs || can(member, a.needs)).map(
    (a) => a.name + ": " + a.says + (a.fields.length ? " (fields: " + a.fields.map((f) => f.name).join(", ") + ")" : ""),
  );
}

/** What the model answers with. */
export interface AgentIntent {
  intent: string;
  fields: Record<string, string>;
  question: string;
  notSaid: string[];
}

export interface ChatButton {
  label: string;
  action: Runnable;
  fields: Record<string, string>;
  /** "Here is what I will do", as label and value rows, read before pressing. */
  shows: { label: string; value: string }[];
}

export type Resolved =
  | { kind: "proposal"; said: string; buttons: ChatButton[] }
  | { kind: "ask"; said: string }
  | { kind: "refuse"; said: string }
  | { kind: "question" };

const LAST = /\b(last|latest|newest|recent|that|this)\b/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9@.]+/).filter((w) => w.length > 1);
}
function hasAllWords(hay: string, needle: string): boolean {
  const h = hay.toLowerCase();
  return words(needle).every((w) => h.includes(w));
}
function lkr(n: number): string {
  return "LKR " + Math.round(n).toLocaleString("en-US");
}

/**
 * Words into a proposal, against the desk as it is now.
 *
 * Every required field must resolve to one row, or the desk asks one
 * question instead of acting. Nothing here writes.
 */
export function resolveIntent(got: AgentIntent, db: OpsDatabase, member: OpsMember, now: number): Resolved {
  if (got.intent === "question") return { kind: "question" };
  const action = AGENT_ACTIONS.find((a) => a.name === got.intent);
  if (!action) return refuseIntent(got.intent, member);
  if (action.needs && !can(member, action.needs)) return { kind: "refuse", said: refusal(action.needs) };

  const out: Record<string, string> = { ...(action.fixed ?? {}) };
  const names: string[] = [];
  const shows: { label: string; value: string }[] = [];
  const show = (label: string, value: string) => shows.push({ label, value });

  for (const field of action.fields) {
    const raw = (got.fields[field.name] ?? "").trim();
    switch (field.from) {
      case "text": {
        if (!raw && field.required) return { kind: "ask", said: field.asks };
        if (raw) {
          out[field.name] = raw;
          show(field.name === "to" ? "To" : field.name === "outcome" ? "What was said" : field.name === "text" ? "Note" : field.name === "body" ? "Message" : field.name[0].toUpperCase() + field.name.slice(1), raw);
        }
        break;
      }
      case "email": {
        if (!raw && field.required) return { kind: "ask", said: field.asks };
        if (raw && !EMAIL.test(raw)) return { kind: "ask", said: `"${raw}" does not look like an email address. ${field.asks}` };
        if (raw) {
          out[field.name] = raw;
          show("Email", raw);
        }
        break;
      }
      case "choice": {
        const pick = field.choices?.find((c) => c === raw.toLowerCase());
        if (raw && !pick) return { kind: "ask", said: field.asks + " One of: " + (field.choices ?? []).join(", ") + "." };
        if (pick) {
          out[field.name] = pick;
          show("From", pick);
        }
        break;
      }
      case "client": {
        if (!raw) {
          if (field.required) return { kind: "ask", said: field.asks + " I know: " + db.clients.slice(0, 6).map((c) => c.name).join(", ") + "." };
          break;
        }
        const client = clientNamed(raw, db.clients) ?? db.clients.find((c) => hasAllWords(c.name, raw));
        if (!client) {
          const near = db.clients.filter((c) => words(raw).some((w) => c.name.toLowerCase().includes(w))).slice(0, 4);
          return { kind: "ask", said: `I do not know a client called "${raw}".` + (near.length ? " Did you mean: " + near.map((c) => c.name).join(", ") + "?" : "") };
        }
        // fileThisMail wants "type|id"; recordCall and quickAdd want the name or the id.
        out[field.name] = field.name === "subject" ? "client|" + client.id : action.action === "recordCall" ? client.id : client.name;
        if (action.action === "recordCall") {
          out.subjectType = "client";
          out.subjectId = client.id;
          out.toName = client.name;
          delete out.about;
        }
        names.push(client.name);
        show("Client", client.name);
        break;
      }
      case "draft": {
        const drafts = db.messages.filter((m) => m.state === "draft").sort((a, b) => b.createdAt - a.createdAt);
        if (!drafts.length) return { kind: "refuse", said: "Nothing is waiting for approval." };
        const pick = !raw || LAST.test(raw) ? drafts[0] : drafts.find((m) => hasAllWords(m.subject + " " + m.to.join(" "), raw));
        if (!pick) return { kind: "ask", said: `No waiting draft matches "${raw}". ` + field.asks };
        out[field.name] = pick.id;
        names.push(pick.subject + " to " + pick.to.join(", "));
        show("Draft", pick.subject);
        show("To", pick.to.join(", "));
        break;
      }
      case "task": {
        const mine = db.tasks.filter((t) => t.state === "open" && t.assigneeId === member.id).sort((a, b) => a.dueAt - b.dueAt);
        if (!mine.length) return { kind: "refuse", said: "You have no open tasks." };
        const pick = /\blate\b/i.test(raw) ? mine.find((t) => t.dueAt < now) : !raw || LAST.test(raw) ? mine[0] : mine.find((t) => hasAllWords(t.title + " " + t.body, raw));
        if (!pick) return { kind: "ask", said: `None of your tasks matches "${raw}". ` + field.asks };
        out[field.name] = pick.id;
        names.push(pick.title);
        show("Task", pick.title);
        break;
      }
      case "inbound": {
        const fresh = db.inbound.filter((i) => i.readState === "new").sort((a, b) => b.receivedAt - a.receivedAt);
        if (!fresh.length) return { kind: "refuse", said: "No new email is waiting." };
        const pick = !raw || LAST.test(raw) ? fresh[0] : fresh.find((i) => hasAllWords(i.from + " " + i.fromName + " " + i.subject, raw));
        if (!pick) return { kind: "ask", said: `No new email matches "${raw}". ` + field.asks };
        out[field.name] = pick.id;
        names.push((pick.fromName || pick.from) + ": " + pick.subject);
        show("Email from", pick.fromName || pick.from);
        show("Subject", pick.subject);
        break;
      }
      case "invoice": {
        const open = db.invoices.filter((i) => i.state === "draft" || i.state === "sent" || i.state === "partly_paid" || i.state === "disputed");
        let pick = open.find((i) => raw && i.number.toLowerCase() === raw.toLowerCase());
        if (!pick && raw) {
          const client = clientNamed(raw, db.clients) ?? db.clients.find((c) => hasAllWords(c.name, raw));
          const theirs = client ? open.filter((i) => i.clientId === client.id) : [];
          if (theirs.length === 1) pick = theirs[0];
          if (theirs.length > 1) return { kind: "ask", said: `${client?.name} has ${theirs.length} open invoices: ` + theirs.map((i) => i.number).join(", ") + ". Which one?" };
        }
        if (!pick) return { kind: "ask", said: field.asks + (open.length ? " Open: " + open.slice(0, 5).map((i) => i.number).join(", ") + "." : " None is open.") };
        out[field.name] = pick.id;
        names.push(pick.number + " (" + (db.clients.find((c) => c.id === pick!.clientId)?.name ?? "client unknown") + ", " + lkr(pick.amount) + ")");
        show("Invoice", pick.number);
        show("Client", db.clients.find((c) => c.id === pick!.clientId)?.name ?? "unknown");
        show("Invoice total", lkr(pick.amount));
        break;
      }
      case "money": {
        const n = Number(raw.replace(/[^0-9.]/g, ""));
        if (!raw || !Number.isFinite(n) || n <= 0) return { kind: "ask", said: field.asks };
        out[field.name] = String(n);
        names.push(lkr(n));
        show("Amount received", lkr(n));
        break;
      }
    }
  }

  const label = buttonLabel(action, out, names);
  const said = action.money
    ? "This is money. Check the line before you press it."
    : action.action === "writeNewMessage"
      ? "I will draft it. It waits for your approval on the mail screen; nothing sends from here."
      : "Ready when you are.";
  return { kind: "proposal", said, buttons: [{ label, action: action.action, fields: out, shows }] };
}

function buttonLabel(action: AgentAction, out: Record<string, string>, names: string[]): string {
  switch (action.name) {
    case "approve_draft": return "Approve and send: " + names[0];
    case "approve_all_routine": return "Approve every routine notice";
    case "mark_mail_done": return "Mark done: " + names[0];
    case "file_mail": return "File " + names[0] + " under " + names[1];
    case "finish_task": return "Finish: " + names[0];
    case "log_call": return "Write down the call to " + out.to + (names[0] ? " about " + names[0] : "");
    case "keep_note": return "Keep the note" + (names[0] ? " under " + names[0] : "");
    case "new_enquiry": return "Save the enquiry from " + out.company;
    case "write_email": return "Draft an email to " + out.to + ": " + out.subject;
    case "record_payment": return "Record " + names[1] + " against " + names[0];
    case "send_invoice": return "Send invoice " + names[0];
  }
  return action.says;
}

export function refuseIntent(intent: string, member: OpsMember): Resolved {
  const offers = catalogueInWords(member).slice(0, 3).map((line) => line.split(":")[1]?.split("(")[0].trim());
  return {
    kind: "refuse",
    said: (intent ? `I cannot do "${intent}". ` : "") + "Here is what I can: " + offers.join("; ") + ".",
  };
}
