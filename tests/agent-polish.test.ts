/**
 * The chat's polish (9 Nov): every claim cited, the plan editable by typing,
 * and the next actions read off the desk.
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase, OpsMember } from "@/data/types";
import { editFrom, nextSteps, planFrom, planMark, resolveIntent, withEdit } from "@/lib/agent";

const NOW = Date.UTC(2026, 10, 9, 4, 0);
const HOUR = 3_600_000;
const owner = { id: "m_owner", role: "ops_owner", name: "Rushda", active: true } as unknown as OpsMember;
const accounts = { id: "m_acc", role: "accounts", name: "Accounts", active: true } as unknown as OpsMember;

function desk(): OpsDatabase {
  return {
    members: [owner, accounts],
    clients: [{ id: "cl_1", name: "Nippon Paint Lanka" }, { id: "cl_2", name: "Another Client, Pvt" }],
    leads: [{ id: "lead_1", company: "Lanka Tiles", contactName: "", state: "new" }],
    messages: [
      { id: "msg_1", state: "draft", subject: "Set 1", to: ["hr@nippon.test"], createdAt: NOW - HOUR },
      { id: "msg_2", state: "draft", subject: "Set 2", to: ["hr@nippon.test"], createdAt: NOW - 2 * HOUR },
    ],
    tasks: [{ id: "k_1", state: "open", assigneeId: "m_owner", title: "Ring Nippon", body: "", dueAt: NOW - HOUR }],
    inbound: [{ id: "in_1", readState: "new", from: "a@b.test", fromName: "A", subject: "Hi", receivedAt: NOW }],
    invoices: [{ id: "inv_1", number: "C141-2026-0001", state: "sent", clientId: "cl_1", amount: 450000 }],
    clientSets: [{ id: "cs_1", clientId: "cl_1", setNumber: 2, name: "NIPPON > SET 2", state: "ready", candidates: [] }],
    reports: [{ id: "rep_1", weekOf: "2026-11-09", state: "built" }],
    positions: [], interviews: [], placements: [], guarantees: [], holds: [], ads: [], closeChecklists: [], agreements: [],
  } as unknown as OpsDatabase;
}

const say = (intent: string, fields: Record<string, string>) => ({ intent, fields, question: "", notSaid: [] });

test("every row a plan claims about a record links to the page that proves it, and names the field it fills", () => {
  const got = resolveIntent(say("record_payment", { invoiceId: "C141-2026-0001", amount: "450000" }), desk(), accounts, NOW);
  assert.equal(got.kind, "proposal");
  if (got.kind !== "proposal") return;
  const rows = got.buttons[0].shows;
  assert.deepEqual(rows.find((r) => r.label === "Invoice"), { label: "Invoice", value: "C141-2026-0001", href: "/invoices/inv_1", field: "invoiceId" });
  assert.equal(rows.find((r) => r.label === "Client")?.href, "/clients/cl_1");
  assert.equal(rows.find((r) => r.label === "Amount")?.href, "", "a figure the person typed has no page, and says so by having none");
  assert.equal(rows.find((r) => r.label === "Amount")?.field, "amount");
  assert.deepEqual(got.intent.fields.invoiceId, "C141-2026-0001", "the plan keeps the words it was built from");
});

test("the plan keeps its intent, and one line of it changes by typing - by label or by field", () => {
  const first = resolveIntent(say("close_enquiry", { leadId: "lanka tiles", reason: "no reply" }), desk(), owner, NOW);
  assert.equal(first.kind, "proposal");
  if (first.kind !== "proposal") return;
  const kept = planFrom(planMark(first.intent));
  assert.ok(kept);
  const shows = first.buttons[0].shows;
  const edit = editFrom("Change reason to They hired somebody else", shows);
  assert.deepEqual(edit, { field: "reason", value: "They hired somebody else" });
  const again = resolveIntent(withEdit(kept!, edit!), desk(), owner, NOW);
  assert.equal(again.kind, "proposal");
  if (again.kind === "proposal") assert.equal(again.buttons[0].fields.reason, "They hired somebody else");
  assert.deepEqual(editFrom("Reason: budget", shows), { field: "reason", value: "budget" });
  assert.deepEqual(editFrom("actually the enquiry is Lanka Tiles", shows), { field: "leadId", value: "Lanka Tiles" });
  // An ordinary sentence is a new request, not an edit.
  assert.equal(editFrom("approve the last email", shows), null);
  assert.equal(editFrom("change the colour to blue", shows), null, "a line the plan does not have is not an edit");
  assert.equal(planFrom("feed:inbound:x"), null);
});

test("what comes next is read off the desk, most pressing first, at most three, inside the person's permissions", () => {
  const forOwner = nextSteps(desk(), owner, NOW);
  assert.equal(forOwner.length, 3);
  assert.deepEqual(forOwner.map((n) => n.say), ["finish my late task", "approve the last email", "mark the newest email done"]);
  assert.match(forOwner[1].label, /· 2$/);
  // Accounts has no task late and may approve, but may not review sets.
  const forAccounts = nextSteps(desk(), accounts, NOW);
  assert.ok(!forAccounts.some((n) => n.say.startsWith("review")), "a set is not accounts' work");
  // A quiet desk suggests nothing rather than something useless.
  const quiet = { ...desk(), messages: [], tasks: [], inbound: [], clientSets: [], reports: [] } as unknown as OpsDatabase;
  assert.deepEqual(nextSteps(quiet, owner, NOW), []);
});
