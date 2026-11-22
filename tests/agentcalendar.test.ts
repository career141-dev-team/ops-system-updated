/**
 * The Outlook calendar helpers, the model's plain error sentences, the price maths and the TA-lead names
 * on the confirm card. No real Microsoft or Anthropic: fetch is replaced for the length of each test.
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase, OpsMember } from "@/data/types";
import { AGENT_PRICE_PER_MTOK, askWithTools, costOfAgent, nextStep, sayModelStatus, type AgentResponse } from "@/lib/ai";
import { resolveIntent } from "@/lib/agent";
import { withTaNames } from "@/lib/agentTools";
import {
  TEAMS_OFF,
  calendarCacheSize,
  cancelTeamsEvent,
  forgetCalendar,
  listEvents,
  moveTeamsEvent,
} from "@/lib/graphCalendar";

const realFetch = globalThis.fetch;
const env = (patch: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
};
const live = () => env({ OPS_TEAMS_FAKE: undefined, MS_TENANT_ID: "t", MS_CLIENT_ID: "c", MS_CLIENT_SECRET: "s" });
const ev = (id: string, hour: number) => ({
  id,
  subject: id,
  start: { dateTime: "2026-11-23T" + String(hour).padStart(2, "0") + ":00:00" },
  end: { dateTime: "2026-11-23T" + String(hour + 1).padStart(2, "0") + ":00:00" },
});
/** Microsoft's two doors: the token, and whatever the test wants the calendar to say. */
const microsoft = (calendar: (url: string) => unknown, calls: string[] = []) =>
  (async (url: string) => {
    calls.push(String(url));
    const body = String(url).includes("login.microsoftonline.com") ? { access_token: "tok" } : calendar(String(url));
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;

test("fake mode lists two events inside the range, and none outside it", async () => {
  env({ OPS_TEAMS_FAKE: "on" });
  const from = Date.parse("2026-11-23T00:00:00Z");
  const week = await listEvents("a@x.test", new Date(from).toISOString(), new Date(from + 7 * 86_400_000).toISOString());
  assert.equal(week.events.length, 2);
  const day = await listEvents("a@x.test", new Date(from).toISOString(), new Date(from + 86_400_000).toISOString());
  assert.equal(day.events.length, 1);
  env({ OPS_TEAMS_FAKE: undefined });
});

test("the calendar cache is capped, forgotten after a change, and follows the next page", async () => {
  live();
  const calls: string[] = [];
  globalThis.fetch = microsoft((url) => {
    if (url.includes("page2")) return { value: [ev("two", 11)] };
    return { value: [ev("one", 9)], "@odata.nextLink": "https://graph.microsoft.com/v1.0/users/n/calendarView?page2" };
  }, calls);
  try {
    const paged = await listEvents("paged@x.test", "2026-11-23T00:00:00Z", "2026-11-24T00:00:00Z");
    assert.deepEqual(paged.events.map((e) => e.id), ["one", "two"]);

    const before = calls.length;
    await listEvents("paged@x.test", "2026-11-23T00:00:00Z", "2026-11-24T00:00:00Z");
    assert.equal(calls.length, before, "the second read comes from the cache");
    forgetCalendar("paged@x.test");
    await listEvents("paged@x.test", "2026-11-23T00:00:00Z", "2026-11-24T00:00:00Z");
    assert.ok(calls.length > before, "after a change it asks Microsoft again");

    for (let i = 0; i < 130; i++) await listEvents("p" + i + "@x.test", "2026-11-23T00:00:00Z", "2026-11-24T00:00:00Z");
    assert.ok(calendarCacheSize() <= 100);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("moving or cancelling with Teams switched off says so and never calls Microsoft", async () => {
  live();
  const calls: string[] = [];
  globalThis.fetch = microsoft(() => ({}), calls);
  try {
    const moved = await moveTeamsEvent("o@x.test", "ev1", "2026-11-24T05:00:00Z", 60, false);
    const cancelled = await cancelTeamsEvent("o@x.test", "ev1", false);
    assert.deepEqual(moved, { ok: false, reason: TEAMS_OFF });
    assert.deepEqual(cancelled, { ok: false, reason: TEAMS_OFF });
    assert.equal(calls.length, 0);
    // Switched on, it does call Microsoft (the stand-in answers 200).
    assert.equal(await cancelTeamsEvent("o@x.test", "ev1", true), null);
    assert.ok(calls.length > 0);
    // Fake mode is always allowed and never calls anybody.
    env({ OPS_TEAMS_FAKE: "on" });
    calls.length = 0;
    assert.equal(await moveTeamsEvent("o@x.test", "ev1", "2026-11-24T05:00:00Z", 60, false), null);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = realFetch;
    env({ OPS_TEAMS_FAKE: undefined });
  }
});

test("the price: Haiku 5.5 at 30 in / 150 out, cache reads at a tenth of the input price", () => {
  assert.deepEqual(AGENT_PRICE_PER_MTOK, { in: 30, out: 150 });
  assert.equal(costOfAgent(1_000_000, 1_000_000), 180);
  assert.equal(costOfAgent(0, 0, 10_000_000), 30);
  assert.equal(costOfAgent(1_000_000, 1_000_000, 10_000_000), 210);
});

test("a model error is one plain sentence per kind, and a busy model is tried once more", async () => {
  assert.match(sayModelStatus(401), /key was refused/);
  assert.match(sayModelStatus(403), /key was refused/);
  assert.match(sayModelStatus(429), /busy/);
  assert.match(sayModelStatus(529), /busy/);
  assert.match(sayModelStatus(503), /problem on its side/);

  const base = { system: "s", messages: [{ role: "user" as const, content: "go" }], tools: [], apiKey: "k", runTool: () => "rows", sleep: async () => {} };
  const bodies: string[] = [];
  const answers = [new Response("overloaded secret", { status: 529 }), new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }), { status: 200 })];
  const retried = await askWithTools({ ...base, fetch: (async (_u: string, init: { body: string }) => { bodies.push(init.body); return answers.shift(); }) as unknown as typeof fetch });
  assert.deepEqual([retried.outcome, retried.text], ["done", "ok"]);
  const sent = JSON.parse(bodies[0]);
  assert.equal(sent.max_tokens, 4096);
  assert.deepEqual(sent.output_config, { effort: "low" });

  const still = await askWithTools({ ...base, fetch: (async () => new Response("raw body with a secret", { status: 529 })) as unknown as typeof fetch });
  assert.equal(still.outcome, "failed");
  assert.equal(still.text, sayModelStatus(529));
  assert.doesNotMatch(still.text, /secret/);
  const refused = await askWithTools({ ...base, fetch: (async () => new Response("bad key", { status: 401 })) as unknown as typeof fetch });
  assert.equal(refused.text, sayModelStatus(401));
});

test("pause_turn goes on, and the guard is told what the chat has cost so far", async () => {
  assert.deepEqual(nextStep({ stop_reason: "pause_turn" } as AgentResponse), { kind: "pause" });
  const queue: AgentResponse[] = [
    { content: [{ type: "text", text: "..." }], stop_reason: "pause_turn", usage: { input_tokens: 1_000_000, output_tokens: 0 } },
    { content: [{ type: "text", text: "fin" }], stop_reason: "end_turn" },
  ];
  const seen: number[] = [];
  const r = await askWithTools({
    system: "s", messages: [{ role: "user", content: "go" }], tools: [], apiKey: "k", runTool: () => "x",
    guard: (spent) => { seen.push(spent); return null; },
    fetch: (async () => new Response(JSON.stringify(queue.shift()), { status: 200 })) as unknown as typeof fetch,
  });
  assert.equal(r.text, "fin");
  assert.deepEqual(seen, [0, 30]);
  const stopped = await askWithTools({
    system: "s", messages: [{ role: "user", content: "go" }], tools: [], apiKey: "k", runTool: () => "x",
    guard: (spent) => (spent >= 30 ? "The daily budget is used up." : null),
    fetch: (async () => new Response(JSON.stringify({ content: [{ type: "text", text: "." }], stop_reason: "pause_turn", usage: { input_tokens: 1_000_000 } }), { status: 200 })) as unknown as typeof fetch,
  });
  assert.deepEqual([stopped.outcome, stopped.text], ["blocked", "The daily budget is used up."]);
});

test("a TA lead is shown by name on the confirm card, and that line is not editable", () => {
  const owner = { id: "m_o", role: "ops_owner", name: "R", email: "r@x.test", active: true } as unknown as OpsMember;
  const db = { leads: [{ id: "ld_1", company: "Lanka Tiles", contactName: "N", state: "new" }], members: [owner], clients: [], agreements: [], positions: [] } as unknown as OpsDatabase;
  const now = Date.parse("2026-11-21T04:00:00Z");
  const r = resolveIntent({ intent: "book_requirement_meeting", fields: { leadId: "Lanka Tiles", at: "2026-11-23T10:00", taLeadId: "ta_9" }, question: "", notSaid: [] }, db, owner, now);
  assert.equal(r.kind, "proposal");
  const named = withTaNames(r, [{ id: "ta_9", fullName: "Kasun Perera" }]);
  assert.equal(named.kind === "proposal" && named.buttons[0].fields.taLeadId, "ta_9", "the action still gets the id");
  const row = named.kind === "proposal" ? named.buttons[0].shows.find((s) => s.value === "Kasun Perera") : undefined;
  assert.equal(row?.label, "TA lead");
  assert.equal(row?.field, "");
  const unknown = withTaNames(r, []);
  assert.ok(unknown.kind === "proposal" && unknown.buttons[0].shows.some((s) => s.value === "ta_9"));
});
