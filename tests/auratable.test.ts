/**
 * Aura answers in tables (23 Nov): the Table component's limits, the three lookups it is fed by (candidates,
 * interviews, Scoops), and that nothing private rides along.
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase, OpsMember } from "@/data/types";
import { TABLE_MAX_COLUMNS, TABLE_MAX_ROWS, parseSurface } from "@/lib/a2ui";
import { runAgentTool } from "@/lib/agentTools";
import { keyOf, newBatch } from "@/lib/scoop";

const NOW = Date.UTC(2026, 10, 25, 4, 30); // Wed 25 Nov 2026, 10:00 Colombo
const DAY = 86_400_000;
const owner = { id: "m_owner", role: "ops_owner", name: "Rushda", email: "r@x.test", active: true } as unknown as OpsMember;
const mkt = { id: "m_mkt", role: "marketing", name: "Mark", email: "m@x.test", active: true } as unknown as OpsMember;

function desk(): OpsDatabase {
  const batch = { ...newBatch({ id: "msg-1", at: NOW - 3_600_000, source: "mail", from: "sir@career141.com", subject: "50 CVs for Recruiters", found: 3 }), applicantIds: ["a1", "a2", "a3"], complete: true };
  return {
    members: [owner, mkt],
    clients: [{ id: "c1", name: "Acme Ltd" }],
    positions: [{ id: "p1", openingTaId: "o1", clientId: "c1", title: "Head of sales" }],
    vacancies: [{ id: "v1", title: "Recruitment Consultant" }],
    applicants: [
      { id: "a1", vacancyId: "v1", name: "Nimal Perera", stage: "new", tries: 0, phone: "077 123 4567", nic: "912345678V", targetPosition: "Recruitment Consultant", detail: "CV came", interviewAt: null, rejectReason: null },
      { id: "a2", vacancyId: "v1", name: "Kamala de Silva", stage: "interview", tries: 1, phone: "071 555 0100", nic: "199112345678", targetPosition: "Recruitment Consultant", detail: "Fri", interviewAt: NOW + DAY, rejectReason: null, joinUrl: "https://teams.example/x" },
      { id: "a3", vacancyId: "v1", name: "Sunil Fernando", stage: "rejected", tries: 0, phone: null, nic: null, targetPosition: null, detail: "Rejected", interviewAt: null, rejectReason: "Not our sector", rejectedAtStage: "call" },
    ],
    interviews: [
      { id: "i1", candidateName: "Tharindu Silva", clientId: "c1", positionId: "p1", openingTaId: "o1", state: "booked", round: 2, format: "online", at: NOW + 2 * DAY },
      { id: "i2", candidateName: "Lahiru Bandara", clientId: "c1", positionId: "p1", openingTaId: "o1", state: "withdrew", round: 1, format: "onsite", at: NOW - DAY },
    ],
    settings: [{ key: keyOf(batch.id), value: JSON.stringify(batch) }],
    tasks: [],
    meetings: [],
  } as unknown as OpsDatabase;
}
const ctx = (member: OpsMember) => ({ db: desk(), member, now: NOW });

test("a table in the chat keeps to a few columns and rows, pads short rows and cuts long ones", () => {
  const wide = Array.from({ length: 9 }, (_, i) => "Col" + i);
  const many = Array.from({ length: 50 }, (_, i) => ["row" + i, i, null, "x".repeat(200)]);
  const got = parseSurface([{ id: "root", component: "Table", columns: wide, rows: [["only one"], ...many] }]);
  assert.ok(got.ok);
  if (!got.ok) return;
  const t = got.surface.root;
  assert.equal(t.component, "Table");
  if (t.component !== "Table") return;
  assert.equal(t.columns.length, TABLE_MAX_COLUMNS);
  assert.equal(t.rows.length, TABLE_MAX_ROWS);
  assert.ok(t.rows.every((r) => r.length === TABLE_MAX_COLUMNS), "every row is as wide as the columns");
  assert.deepEqual(t.rows[0].slice(0, 2), ["only one", ""]);
  assert.equal(t.rows[2][1], "1", "a number is shown as words");
  assert.ok(t.rows[1].every((c) => c.length <= 80));
  assert.equal(parseSurface([{ id: "root", component: "Table", columns: [], rows: [["x"]] }]).ok, false);
  assert.equal(parseSurface([{ id: "root", component: "Table", columns: ["A"], rows: [] }]).ok, false);
});

test("candidates are looked up for the team, by stage, and never with the NIC", async () => {
  const all = String(await runAgentTool(ctx(owner), "find_candidates", {}));
  assert.match(all, /Nimal Perera/);
  assert.doesNotMatch(all, /912345678V|199112345678|nic/i, "an NIC is never in an answer");
  const calls = String(await runAgentTool(ctx(owner), "find_candidates", { stage: "call" }));
  assert.match(calls, /Nimal Perera/, "new CVs count as to call");
  assert.doesNotMatch(calls, /Kamala/);
  assert.match(String(await runAgentTool(ctx(owner), "find_candidates", { query: "consultant", stage: "rejected" })), /Sunil Fernando/);
  assert.equal(await runAgentTool(ctx(mkt), "find_candidates", {}), "You are not allowed to look that up.");
});

test("interviews are looked up client and internal, by status, mode, dates and words", async () => {
  const all = String(await runAgentTool(ctx(owner), "find_interviews", {}));
  for (const who of ["Tharindu Silva", "Lahiru Bandara", "Kamala de Silva"]) assert.match(all, new RegExp(who));
  assert.match(String(await runAgentTool(ctx(owner), "find_interviews", { status: "Withdrew" })), /Lahiru/);
  assert.doesNotMatch(String(await runAgentTool(ctx(owner), "find_interviews", { status: "Withdrew" })), /Tharindu/);
  assert.match(String(await runAgentTool(ctx(owner), "find_interviews", { mode: "Online", query: "silva" })), /Tharindu/);
  assert.match(String(await runAgentTool(ctx(owner), "find_interviews", { query: "acme" })), /Tharindu/);
  assert.equal(String(await runAgentTool(ctx(owner), "find_interviews", { query: "nobody" })), "Nothing found.");
  assert.equal(await runAgentTool(ctx(mkt), "find_interviews", {}), "You are not allowed to look that up.");
});

test("Scoop status says how each batch stands", async () => {
  const out = JSON.parse(String(await runAgentTool(ctx(owner), "scoop_status", {}))) as Record<string, unknown>[];
  assert.equal(out.length, 1);
  assert.deepEqual([out[0].cvs, out[0].responded, out[0].no_answer, out[0].not_called, out[0].interviews], [3, 1, 0, 1, 1]);
  assert.equal(out[0].scoop, "50 CVs for Recruiters");
  assert.equal(await runAgentTool(ctx(mkt), "scoop_status", {}), "You are not allowed to look that up.");
});

test("show_table finishes with a drawing, and a bad table comes back as words to fix", async () => {
  const run = await runAgentTool(ctx(owner), "show_table", { text: "Two interviews.", columns: ["Candidate", "Status"], rows: [["Tharindu Silva", "Scheduled"], ["Lahiru Bandara", "Withdrew"]] });
  assert.ok(typeof run !== "string" && run.stop);
  if (typeof run === "string" || !run.stop) return;
  const v = run.value as { kind: string; text: string; ui: string };
  assert.equal(v.kind, "ui");
  assert.equal(v.text, "Two interviews.");
  assert.equal((JSON.parse(v.ui) as { root: { rows: string[][] } }).root.rows.length, 2);
  assert.match(String(await runAgentTool(ctx(owner), "show_table", { text: "x", columns: [], rows: [] })), /^Not drawn: /);
});
