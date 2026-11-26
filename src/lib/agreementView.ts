/**
 * The words of the client's Agreement view and of the send / chase popup (25 Nov, Figma 219:302 and 222:2),
 * worked out from the agreement's own fields. Pure: nothing here reads a database or sends anything.
 */
import { chaseDueAt, dueWords } from "@/lib/clientsBoard";
import { dayWords } from "@/lib/clientsView";
import { CHASE_PLAN, type EsaFields } from "@/lib/esa";

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const first = (name: string) => name.trim().split(/\s+/)[0] ?? "";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "one month", "two months", "1.5 months". */
export function monthsWords(months: string | undefined): string {
  const n = Number(months);
  if (!Number.isFinite(n) || n <= 0) return "one month";
  const word = Number.isInteger(n) && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
  return word + (n === 1 ? " month" : " months");
}

/** The three terms the owner reads first, as in the frame: "One month", "90 days", "30 days". */
export function termRows(fields: EsaFields): { label: string; value: string }[] {
  return [
    { label: "Fee", value: cap(monthsWords(fields.feeMonths)) },
    { label: "Guarantee", value: (fields.guaranteeDays || "90") + " days" },
    { label: "Payment", value: (fields.paymentDays || "30") + " days" },
    // 26 Nov (Nov 25 ops meeting): who the client is and what a non-Sri Lankan costs. Last, because coverNote reads rows 1 and 2 by position.
    { label: "Client", value: fields.clientType === "international" ? "International" : fields.clientType === "local" ? "Local" : "Not chosen" },
    // An agreement from before the field said "fee x 2", and the placement bills it as 2, so it reads 2 here too.
    { label: "Expat fee", value: cap(monthsWords(fields.expatFeeMonths || "2")) },
  ];
}

/** The three numbered clauses of the document page. */
export function clauses(fields: EsaFields): { title: string; text: string }[] {
  const basis = fields.feeBasis === "basic" ? "basic salary" : "salary";
  return [
    { title: "1. Fee", text: `Career141 charges ${monthsWords(fields.feeMonths)} of the placed person's ${basis} for each placement.` },
    { title: "2. Guarantee", text: `If the person leaves within ${fields.guaranteeDays || "90"} days, Career141 finds a replacement.` },
    { title: "3. Payment", text: `Each invoice is paid within ${fields.paymentDays || "30"} days of the person joining.` },
  ];
}

/** The cover email as the frame words it, for the contact and the call it follows. */
export function coverNote(o: { contact: string; owner: string; fields: EsaFields; callDate: string | null }): string {
  const t = termRows(o.fields);
  const how = `a fee of ${monthsWords(o.fields.feeMonths)} per placement, a ${t[1].value.replace(" days", " day")} guarantee, and payment within ${t[2].value}`;
  return [
    `Hi ${first(o.contact) || "there"},`,
    `${o.callDate ? `Thank you for the call on ${o.callDate}. As discussed, our` : "Our"} agreement is attached. The main terms are: ${how}.`,
    "Please sign and send it back. Call me if you would like to change anything.",
  ].join("\n\n");
}

export interface ChaseRow {
  kind: "sent" | "due" | "over";
  title: string;
  sub: string;
}

/**
 * The chase history of a sent agreement: each chase that went (with its day), then the next one, due or
 * not yet. Days are counted from the day the agreement was sent, by the owner's plan.
 */
export function chaseRows(esa: { sentAt: number | null; chaseStep: number }, now: number): ChaseRow[] {
  if (esa.sentAt === null) return [];
  const sentAt = esa.sentAt;
  const dayOf = (step: number) => CHASE_PLAN.filter((p) => p.step <= step).reduce((n, p) => n + p.afterDays, 0);
  const rows: ChaseRow[] = [];
  for (let i = 1; i <= esa.chaseStep && i <= CHASE_PLAN.length; i++) {
    rows.push({ kind: "sent", title: `Chase ${i} sent`, sub: `${dayWords(chaseDueAt(sentAt, i, CHASE_PLAN))}, day ${dayOf(i)}${i === esa.chaseStep ? ", still not signed" : ""}` });
  }
  const next = esa.chaseStep + 1;
  if (next > CHASE_PLAN.length) {
    rows.push({ kind: "over", title: "The chase has run out", sub: "Call them: the plan has no more steps." });
    return rows;
  }
  const due = dueWords(chaseDueAt(sentAt, next, CHASE_PLAN), now);
  const after = next + 1 <= CHASE_PLAN.length ? ` Chase ${next + 1} follows ${dayWords(chaseDueAt(sentAt, next + 1, CHASE_PLAN))}.` : "";
  rows.push({ kind: due.tone === "danger" ? "over" : "due", title: `Chase ${next} is ${due.text}`, sub: `Day ${dayOf(next)}.${after}` });
  return rows;
}
