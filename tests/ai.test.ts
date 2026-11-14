/**
 * The AI layer (15, Phase 9).
 *
 * The tests that matter here are the refusals: with no key, with the layer
 * off, with a task off, past the budget - and the proof that a model's answer
 * is checked before it reaches a screen, and that nothing it says is saved by
 * itself.
 *
 * No test calls a model. The door is a pure function given keys and switches;
 * the asking itself is the one part a laptop cannot prove, and it is kept to
 * one function on purpose.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_TASKS,
  type AiSwitches,
  type AiTask,
  DAILY_BUDGET,
  MODELS,
  deepseekRoute,
  aiOffReason,
  PRICE_PER_MTOK,
  costOf,
  nothing,
  problemWithRunning,
  providerFor,
  readJson,
  trimForModel,
} from "@/lib/ai";
import {
  IMPROVE_WORDS,
  improveDraftPrompt,
  inboundReadPrompt,
  dictateRequirementPrompt,
  notSaidInWords,
  askPrompt,
} from "@/lib/aiTasks";

const switches = (over: Partial<AiSwitches> = {}): AiSwitches => ({
  on: true,
  tasks: {},
  dailyBudget: DAILY_BUDGET,
  spentToday: 0,
  ...over,
});

test("judgment goes to Claude, the plain work to DeepSeek, and with no key nowhere", () => {
  const both = { claude: true, deepseek: true };
  // Reading what a client meant is judgment; tidying a draft is not.
  assert.equal(providerFor("inbound.read", both), "claude");
  assert.equal(providerFor("ask", both), "claude");
  assert.equal(providerFor("draft.improve", both), "deepseek");
  assert.equal(providerFor("summarise", both), "deepseek");
  assert.equal(providerFor("dictate.fields", both), "deepseek");

  // One key only: everything goes to the one that exists.
  assert.equal(providerFor("inbound.read", { claude: false, deepseek: true }), "deepseek");
  assert.equal(providerFor("draft.improve", { claude: true, deepseek: false }), "claude");
  assert.equal(providerFor("inbound.read", { claude: false, deepseek: false }), "none");

  // Each task says what it reads, which is the privacy rule in one line.
  for (const task of Object.keys(AI_TASKS)) {
    assert(AI_TASKS[task as AiTask].reads.length > 4, task + " does not say what it reads");
  }
  assert(MODELS.claude.startsWith("claude-"));
  assert(MODELS.deepseek.startsWith("deepseek-"));
});

test("every refusal is a sentence a screen can show", () => {
  assert.equal(problemWithRunning("ask", "claude", switches()), null);

  assert.match(problemWithRunning("ask", "claude", switches({ on: false })) ?? "", /switched off/);
  assert.match(
    problemWithRunning("draft.improve", "deepseek", switches({ tasks: { "draft.improve": false } })) ?? "",
    /This one is switched off/,
  );
  assert.match(problemWithRunning("ask", "none", switches()) ?? "", /No model key is set/);
  // The cap stops it, and says when it starts again.
  const broke = problemWithRunning("ask", "claude", switches({ spentToday: 500, dailyBudget: 500 })) ?? "";
  assert.match(broke, /budget of LKR 500 is used up/);
  assert.match(broke, /starts again tomorrow/);
});

test("what a run costs is arithmetic, not a guess", () => {
  // A million in and a million out, at the published prices.
  assert.equal(costOf("deepseek", 1_000_000, 1_000_000), PRICE_PER_MTOK.deepseek.in + PRICE_PER_MTOK.deepseek.out);
  assert.equal(costOf("claude", 1_000_000, 0), PRICE_PER_MTOK.claude.in);
  // A real small run: a thousand in, five hundred out, on the cheap one.
  assert.equal(costOf("deepseek", 1_000, 500), 0.23);
  assert.equal(costOf("none", 10_000, 10_000), 0, "nothing was asked, so nothing was spent");
});

test("a model's answer is read, and a bad one proposes nothing", () => {
  const good = readJson<{ title: string }>('{"title":"Head of finance"}');
  assert(good.ok && good.data.title === "Head of finance");

  // Models fence their JSON and chat around it however firmly told not to.
  const fenced = readJson<{ a: number }>('Here you go:\n```json\n{"a":1}\n```\nHope that helps.');
  assert(fenced.ok && fenced.data.a === 1);
  const arrayed = readJson<number[]>("[1,2,3]");
  assert(arrayed.ok && arrayed.data.length === 3);

  // And a bad one is an answer, not an error to hide.
  const bad = readJson("no json at all");
  assert.equal(bad.ok, false);
  assert.match(bad.ok === false ? bad.because : "", /no JSON/);
  assert.equal(readJson('{"a":').ok, false);

  const none = nothing<{ x: 1 }>("ask", "No model key is set.");
  assert.equal(none.ok, false);
  assert.equal(none.data, null);
  assert.equal(none.cost, 0);
});

test("a long text is trimmed, and the proposal says it only saw part", () => {
  const short = trimForModel("a short brief");
  assert.equal(short.trimmed, false);
  const long = trimForModel("x".repeat(40_000), 1_000);
  assert.equal(long.trimmed, true);
  assert.equal(long.text.length, 1_000);
  // A null byte in a pasted email would break the request.
  assert.equal(trimForModel("a\u0000b").text, "ab");
});

test("every prompt forbids inventing, and asks for the client's own words", () => {
  const dictate = dictateRequirementPrompt("they want a finance manager in Colombo");
  assert.match(dictate.system, /Never invent/);
  assert.match(dictate.system, /notSaid/);
  assert.match(dictate.prompt, /finance manager/);

  const inbound = inboundReadPrompt("We will take Nimal.", "SAMPLE CLIENT > SET 1", ["Nimal", "Kamal"]);
  assert.match(inbound.system, /theirWords is the client's own sentence/);
  assert.match(inbound.system, /never decide|You never decide/i);
  assert.match(inbound.prompt, /Nimal, Kamal/);

  // Improving a draft must not change a fact or a placeholder.
  const improve = improveDraftPrompt("Subject", "Dear {{contact}}, five CVs are attached.", "shorter");
  assert.match(improve.system, /Change no fact/);
  assert.match(improve.system, /\{\{placeholder\}\}/);
  assert.deepEqual(Object.keys(IMPROVE_WORDS).sort(), ["formal", "rewrite", "shorter", "sinhala", "warmer"]);

  // The ask box may not guess a number.
  assert.match(askPrompt("how many sets are out?", ["Sets: two"]).system, /never guess a number/);
});

test("what it did not find is said plainly, and nothing is filled in for it", () => {
  assert.equal(notSaidInWords([]), null);
  const said = notSaidInWords(["salary", "headcount"]) ?? "";
  assert.match(said, /did not find: salary, headcount/);
  assert.match(said, /Nothing was invented/);
});

test("with no key the layer refuses, writes nothing, and the desk is untouched", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-ai-"));
  process.env.OPS_STORE = "json";
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  // The layer is off in the seed, which is how it ships.
  assert.equal(desk.aiSwitches(repo.all()).on, false);

  const answer = await desk.runAi("summarise", { system: "s", prompt: "p" }, "m_owner");
  assert.equal(answer.proposal.ok, false);
  assert.equal(answer.runId, null, "a refusal is not a run and costs nothing");
  assert.match(answer.problem ?? "", /switched off/);
  assert.equal(repo.all().aiRuns.length, 0);

  // On, but still no key: a different sentence, still nothing spent.
  repo.setSetting("switch.aiEnabled", true, "m_lead", "Trying the layer.");
  const noKey = await desk.runAi("summarise", { system: "s", prompt: "p" }, "m_owner");
  assert.match(noKey.problem ?? "", /No model key/);
  assert.equal(repo.all().aiRuns.length, 0);
  assert.equal(desk.aiSpentToday(repo.all()), 0);
});

test("the ledger is what accuracy and spend are read from", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-ai2-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const run = (task: string, cost: number, at = now) =>
    repo.addAiRun({
      task,
      provider: "deepseek",
      model: "deepseek-chat",
      read: ["a draft"],
      proposed: { body: "x" },
      outcome: null,
      kept: null,
      ok: true,
      because: null,
      tokensIn: 1_000,
      tokensOut: 500,
      cost,
      ms: 900,
      subjectType: "message",
      subjectId: "msg_1",
      by: "m_owner",
      at,
    });

  const a = run("draft.improve", 0.23);
  const b = run("draft.improve", 0.23);
  run("draft.improve", 0.23);
  run("draft.improve", 0.23);
  // Yesterday's run is not today's spend.
  run("summarise", 10, now - 2 * 86_400_000);

  assert.equal(desk.aiSpentToday(repo.all(), now), 0.92, "four runs today, yesterday's left out");

  // Three edited out of four used is a prompt worth fixing, and it says so.
  await desk.recordAiOutcome(a.id, "used", null, "m_owner");
  await desk.recordAiOutcome(b.id, "edited", { body: "mine" }, "m_owner");
  const third = repo.all().aiRuns[2];
  const fourth = repo.all().aiRuns[3];
  await desk.recordAiOutcome(third.id, "edited", { body: "mine" }, "m_owner");
  await desk.recordAiOutcome(fourth.id, "ignored", null, "m_owner");

  const rows = desk.aiAccuracy(repo.all());
  const improve = rows.find((r) => r.task === "draft.improve");
  assert.equal(improve?.runs, 4);
  assert.equal(improve?.used, 1);
  assert.equal(improve?.edited, 2);
  assert.match(improve?.words ?? "", /25% used as they came/);
  assert.match(improve?.words ?? "", /worth fixing the prompt/);

  // A task nobody has used says so rather than showing a nought.
  assert.match(rows.find((r) => r.task === "whatfirst")?.words ?? "", /Never used yet/);

  // Every decision is in the audit, because that is a person's act.
  const audit = repo.all().audit.filter((e) => e.action.startsWith("ai."));
  assert.equal(audit.length, 4);
  assert(audit.every((e) => e.actorId === "m_owner"));
});

test("a run against a stubbed model: the request, the cost, and a bad answer", async () => {
  // The one part a laptop could not otherwise prove: that the door really
  // sends what it says it sends, records what came back, and treats an answer
  // it cannot read as an answer. `fetch` is stubbed; no model is called.
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-ai3-"));
  process.env.OPS_STORE = "json";
  process.env.DEEPSEEK_API_KEY = "test-key-not-a-real-one";
  delete process.env.ANTHROPIC_API_KEY;
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();
  repo.setSetting("switch.aiEnabled", true, "m_lead", "Trying the layer.");

  const asked: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    asked.push({
      url: String(url),
      body: JSON.parse(String(init?.body ?? "{}")),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '```json\n{"summary":"They are slow to answer.","points":["One set out"],"notSaid":[]}\n```' } }],
        usage: { prompt_tokens: 2_000, completion_tokens: 400 },
      }),
      text: async () => "",
    } as unknown as Response;
  }) as typeof globalThis.fetch;

  try {
    const answer = await desk.runAi<{ summary: string }>(
      "summarise",
      { system: "the house rules", prompt: "the rows" },
      "m_owner",
      { type: "client", id: "cl_1" },
      ["5 rows of their own record"],
    );

    // It went to the cheap one, with the key in the right header and JSON asked for.
    assert.equal(asked.length, 1);
    assert.match(asked[0].url, /deepseek/);
    assert.equal(asked[0].headers.authorization, "Bearer test-key-not-a-real-one");
    assert.equal((asked[0].body as { response_format?: { type: string } }).response_format?.type, "json_object");

    // The fenced JSON was read, and the proposal carries what it read.
    assert.equal(answer.proposal.ok, true);
    assert.equal(answer.proposal.data?.summary, "They are slow to answer.");
    assert.deepEqual(answer.proposal.read, ["5 rows of their own record"]);

    // And the run is in the ledger, costed from the tokens it really used.
    const run = repo.all().aiRuns[0];
    assert.equal(run.task, "summarise");
    assert.equal(run.tokensIn, 2_000);
    assert.equal(run.tokensOut, 400);
    assert.equal(run.cost, 0.29);
    assert.equal(run.outcome, null, "nobody has decided about it yet");
    assert.equal(run.subjectId, "cl_1");
    assert.equal(desk.aiSpentToday(repo.all()), 0.29);

    // An answer that is not JSON is recorded and proposes nothing.
    globalThis.fetch = (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "Sure! Here is a summary." } }], usage: {} }),
        text: async () => "",
      }) as unknown as Response) as typeof globalThis.fetch;
    const bad = await desk.runAi("summarise", { system: "s", prompt: "p" }, "m_owner");
    assert.equal(bad.proposal.ok, false);
    assert.match(bad.problem ?? "", /no JSON/);
    assert.equal(repo.all().aiRuns.length, 2, "a failed read is still a run, and still written down");
    assert.equal(repo.all().aiRuns[1].ok, false);

    // A refusal from the provider is a sentence, not a crash.
    globalThis.fetch = (async () =>
      ({ ok: false, status: 401, json: async () => ({}), text: async () => "bad key" }) as unknown as Response) as typeof globalThis.fetch;
    const refused = await desk.runAi("summarise", { system: "s", prompt: "p" }, "m_owner");
    assert.equal(refused.proposal.ok, false);
    assert.match(refused.problem ?? "", /answered 401/);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.DEEPSEEK_API_KEY;
  }
});

test("the screens are told why the AI is not offering to help", () => {
  // The offer stays on the screen when the layer is off, so the sentence
  // beside it has to be true and short (24, section 5).
  assert.equal(aiOffReason(false, false), "AI is off: no model key is set yet.");
  assert.equal(aiOffReason(false, true), "AI is off: no model key is set yet.");
  assert.equal(aiOffReason(true, false), "AI is off: the ops lead has not switched it on.");
  assert.equal(aiOffReason(true, true), null, "nothing to say when it is working");
});

/* ── Two doors to DeepSeek (7 Nov) ──────────────────────────────── */

test("DeepSeek is reached through OpenRouter when that key is set", () => {
  // The owner buys DeepSeek through OpenRouter rather than direct, so there
  // are two doors to one provider. Everything above this stays "deepseek":
  // the ledger, the pricing and the screens are untouched.
  const through = deepseekRoute({ OPENROUTER_API_KEY: "sk-or-test" });
  assert.equal(through?.through, "openrouter");
  assert.match(through?.url ?? "", /openrouter\.ai/);
  assert.equal(through?.key, "sk-or-test");

  // Their workspace guardrail allows exactly one DeepSeek model. Asking for
  // deepseek/deepseek-chat comes back 404 "Model blocked by guardrail", which
  // reads like the model does not exist - it does, it is not allowed. So the
  // one their account really serves is named rather than guessed.
  assert.equal(through?.model, "deepseek/deepseek-v4-flash");

  // And it can be corrected without a deploy if the guardrail changes.
  assert.equal(
    deepseekRoute({ OPENROUTER_API_KEY: "k", OPENROUTER_MODEL: "deepseek/other" })?.model,
    "deepseek/other",
  );
});

test("the direct door still works, and a key somebody set is the one used", () => {
  const direct = deepseekRoute({ DEEPSEEK_API_KEY: "sk-ds" });
  assert.equal(direct?.through, "deepseek");
  assert.match(direct?.url ?? "", /api\.deepseek\.com/);
  assert.equal(direct?.model, MODELS.deepseek);

  // Both set: OpenRouter wins, because a key somebody put there is a key they
  // meant to use.
  assert.equal(deepseekRoute({ OPENROUTER_API_KEY: "k", DEEPSEEK_API_KEY: "d" })?.through, "openrouter");

  // Neither: the layer is off and says so, rather than calling nothing.
  assert.equal(deepseekRoute({}), null);
  assert.equal(deepseekRoute({ OPENROUTER_API_KEY: "   " }), null, "whitespace is not a key");
});
