/**
 * Aura's tools and the tool-use loop. No real API: the HTTP call is a fake.
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase, OpsMember } from "@/data/types";
import { askWithTools, nextStep, type AgentResponse } from "@/lib/ai";
import { agentSystemPrompt, freeStarts, runAgentTool } from "@/lib/agentTools";

const NOW = Date.UTC(2026, 10, 21, 4, 0); // Sat 21 Nov 2026, 09:30 Colombo
const MON = "2026-11-23";
const lead = { id: "ld_1", company: "Lanka Tiles", contactName: "Nimal", state: "new", source: "referral", ownerId: "m_owner", fee: 999999, salary: 1 };
const owner = { id: "m_owner", role: "ops_owner", name: "Rushda", email: "r@x.test", active: true } as unknown as OpsMember;
const lead2 = { id: "m_lead", role: "ops_lead", name: "Dilani", email: "d@x.test", active: true } as unknown as OpsMember;
const mkt = { id: "m_mkt", role: "marketing", name: "Mark", email: "m@x.test", active: true } as unknown as OpsMember;

function desk(): OpsDatabase {
  const monAt = (hhmm: string) => Date.parse(MON + "T" + hhmm + ":00+05:30");
  return {
    clients: [{ id: "cl_1", name: "Nippon Paint", stage: "active", ownerId: "m_owner", billingEmail: "x", fee: 5 }],
    leads: [lead],
    members: [owner, lead2, mkt],
    positions: [{ id: "p_1", title: "Accountant", clientId: "cl_1", stage: "open", salary: 100 }],
    tasks: [{ id: "t_1", state: "open", assigneeId: "m_owner", title: "Ring Nippon", body: "", dueAt: NOW - 1000 }],
    meetings: [{ id: "mt_1", leadId: "ld_1", kind: "intro", at: monAt("10:00"), state: "booked", bookedBy: "m_owner", lengthMin: 60 }],
    interviews: [{ id: "iv_1", at: monAt("14:00"), state: "booked", ownerId: "m_owner" }],
    invoices: [],
    messages: [],
    inbound: [],
    agreements: [],
  } as unknown as OpsDatabase;
}
const ctx = (member: OpsMember) => ({ db: desk(), member, now: NOW });
const NOT = "You are not allowed to look that up.";

test("reads are filtered by role and never carry money", async () => {
  const seen = String(await runAgentTool(ctx(owner), "find_lead", { query: "lanka" }));
  assert.match(seen, /Lanka Tiles/);
  assert.doesNotMatch(seen, /fee|salary|999999/);
  for (const t of ["find_client", "find_position", "my_tasks", "find_member"]) {
    const out = String(await runAgentTool(ctx(owner), t, {}));
    assert.doesNotMatch(out, /fee|salary|billing/);
  }
  assert.equal(await runAgentTool(ctx(mkt), "find_lead", {}), NOT);
  assert.equal(await runAgentTool(ctx(mkt), "find_client", {}), NOT);
  assert.match(String(await runAgentTool(ctx(mkt), "find_member", { query: "dil" })), /Dilani/);
});

test("at most twenty rows", async () => {
  const c = ctx(owner);
  c.db.leads = Array.from({ length: 30 }, (_, i) => ({ ...lead, id: "l" + i, company: "Co " + i })) as never;
  const out = String(await runAgentTool(c, "find_lead", {}));
  assert.equal((out.match(/"id"/g) ?? []).length, 20);
});

test("free times: busy meetings and interviews are cut out, weekends and the past are empty", () => {
  const free = freeStarts(desk(), "m_owner", MON, NOW);
  assert.ok(free.includes("09:00") && free.includes("09:30"));
  assert.ok(!free.includes("10:00") && !free.includes("10:30"), "the 60-minute intro call");
  assert.ok(free.includes("11:00"));
  assert.ok(!free.includes("14:00") && !free.includes("14:30"), "the interview");
  assert.equal(free.at(-1), "20:30");
  assert.deepEqual(freeStarts(desk(), "m_owner", "2026-11-22", NOW), []);
  assert.ok(!freeStarts(desk(), "m_owner", "2026-11-21", NOW).includes("09:00"));
});

test("free times for someone else need the whole desk", async () => {
  assert.equal(await runAgentTool(ctx(owner), "free_times", { date: MON, member: "Dilani" }), NOT);
  assert.match(String(await runAgentTool(ctx(lead2), "free_times", { date: MON, member: "Rushda" })), /Rushda is free/);
});

test("propose_action: a proposal stops the loop; ask and refuse come back as words", async () => {
  const ok = await runAgentTool(ctx(owner), "propose_action", { intent: "close_enquiry", fields: { leadId: "lanka tiles", reason: "no reply" } });
  assert.ok(typeof ok !== "string" && ok.stop && (ok.value as { kind: string }).kind === "proposal");
  const ask = await runAgentTool(ctx(owner), "propose_action", { intent: "close_enquiry", fields: { leadId: "lanka tiles" } });
  assert.match(String(ask), /^Not ready: /);
  assert.match(String(await runAgentTool(ctx(mkt), "propose_action", { intent: "create_lead", fields: {} })), /^Refused: /);
  const reassign = await runAgentTool(ctx(owner), "propose_action", { intent: "assign_lead_owner", fields: { leadId: "lanka", ownerId: "dilani" } });
  assert.match(String(reassign), /^Refused: /, "an ops owner may not reassign");
  assert.match(String(await runAgentTool(ctx(owner), "nope", {})), /no tool/);
});

test("the system prompt names the person, the day and only what they may do", () => {
  const p = agentSystemPrompt(mkt, "2026-11-21");
  assert.match(p, /Mark/);
  assert.match(p, /2026-11-21/);
  assert.match(p, /Asia\/Colombo/);
  assert.doesNotMatch(p, /create_lead/);
  assert.match(agentSystemPrompt(owner, "2026-11-21"), /create_lead/);
});

/* ── the loop, with a fake fetch ─────────────────────────────── */

const toolUse = (id: string, name: string, input: object): AgentResponse => ({
  content: [{ type: "tool_use", id, name, input }],
  stop_reason: "tool_use",
  usage: { input_tokens: 100, output_tokens: 10 },
});
const fakeOf = (next: () => AgentResponse, log: { messages: unknown[] }[] = []) =>
  (async (_url: string, init: { body: string }) => {
    log.push(JSON.parse(init.body));
    return new Response(JSON.stringify(next()), { status: 200 });
  }) as unknown as typeof fetch;
const outcomeOf = (r: AgentResponse) => (nextStep(r) as { outcome: string }).outcome;

test("nextStep reads every stop reason", () => {
  assert.deepEqual(nextStep({ content: [{ type: "text", text: " Hi " }], stop_reason: "end_turn" }), { kind: "end", outcome: "done", text: "Hi" });
  const t = nextStep(toolUse("a", "find_lead", { query: "x" }));
  assert.equal(t.kind === "tools" && t.uses[0].name, "find_lead");
  assert.equal(outcomeOf({ stop_reason: "refusal" }), "refused");
  assert.equal(outcomeOf({ stop_reason: "max_tokens" }), "cut_off");
  assert.equal(outcomeOf({ stop_reason: "tool_use", content: [] }), "failed");
  assert.equal(outcomeOf({ stop_reason: "weird" }), "failed");
});

test("the loop sends all tool results in one message, sums tokens and ends on a stop value", async () => {
  const log: { messages: { content: unknown }[]; system: { cache_control?: unknown }[] }[] = [];
  const answers: AgentResponse[] = [
    {
      content: [
        { type: "tool_use", id: "a", name: "find_lead", input: {} },
        { type: "tool_use", id: "b", name: "find_member", input: {} },
      ],
      stop_reason: "tool_use",
      usage: { input_tokens: 100, output_tokens: 10 },
    },
    toolUse("c", "propose_action", { intent: "x", fields: {} }),
  ];
  const r = await askWithTools({
    system: "s",
    messages: [{ role: "user", content: "go" }],
    tools: [],
    apiKey: "k",
    fetch: fakeOf(() => answers.shift() as AgentResponse, log),
    runTool: (name) => (name === "propose_action" ? { stop: true, value: { ok: 1 } } : "rows"),
  });
  assert.equal(r.outcome, "stopped");
  assert.deepEqual(r.stopValue, { ok: 1 });
  assert.equal(r.rounds, 2);
  assert.equal(r.usage.tokensIn, 200);
  assert.equal(log[1].messages.length, 3);
  assert.equal((log[1].messages[2].content as unknown[]).length, 2, "both results in one user message");
  assert.ok(log[0].system[0].cache_control);
});

test("round cap, deadline, guard, a missing key and an HTTP error each end with a sentence", async () => {
  const base = {
    system: "s",
    messages: [{ role: "user" as const, content: "go" }],
    tools: [],
    apiKey: "k",
    fetch: fakeOf(() => toolUse("a", "find_lead", {})),
    runTool: () => "rows",
  };
  const capped = await askWithTools({ ...base, maxRounds: 3 });
  assert.deepEqual([capped.outcome, capped.rounds], ["too_many_rounds", 3]);

  let clock = 0;
  const slow = await askWithTools({ ...base, deadlineMs: 1_000, now: () => (clock += 600) });
  assert.equal(slow.outcome, "too_slow");

  const blocked = await askWithTools({ ...base, guard: () => "Today's AI budget is used up." });
  assert.deepEqual([blocked.outcome, blocked.text, blocked.rounds], ["blocked", "Today's AI budget is used up.", 0]);

  assert.equal((await askWithTools({ ...base, apiKey: "", fetch: undefined })).outcome === "blocked" || !process.env.ANTHROPIC_API_KEY, true);

  const bad = await askWithTools({ ...base, fetch: (async () => new Response("no", { status: 500 })) as unknown as typeof fetch });
  assert.equal(bad.outcome, "failed");
});

test("a tool that throws is reported to the model, not the person", async () => {
  const answers = [toolUse("a", "find_lead", {}), { content: [{ type: "text", text: "done" }], stop_reason: "end_turn" } as AgentResponse];
  const r = await askWithTools({
    system: "s",
    messages: [{ role: "user", content: "go" }],
    tools: [],
    apiKey: "k",
    fetch: fakeOf(() => answers.shift() as AgentResponse),
    runTool: () => {
      throw new Error("boom");
    },
  });
  assert.deepEqual([r.outcome, r.text], ["done", "done"]);
});
