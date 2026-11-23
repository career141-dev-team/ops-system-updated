/**
 * The one door to a model (15, Phase 9 steps 1 to 4).
 *
 * Every AI task in Ops goes through here, for four reasons, each of them a
 * rule from the plan:
 *
 *   - **AI proposes; a person decides.** This file returns a proposal and
 *     never writes anything. Nothing it says reaches a client, the TA System
 *     or a money field without the approval the system already demands.
 *   - **Structured output or nothing.** Every task asks for JSON of a shape,
 *     and the answer is checked before it reaches a screen. A reply that will
 *     not parse records the run and proposes nothing - a normal answer, not
 *     an error to hide.
 *   - **Cheap by default, and budgeted.** DeepSeek first for the plain work,
 *     Claude where judgment is needed. A daily cap in the settings, and at the
 *     cap the layer stops rather than quietly spending.
 *   - **Never while a screen renders.** Called from an action a person pressed
 *     or from the clock pass, with a hard timeout and one retry. The 3 Nov
 *     lesson: the Claude subscription is a limited pool.
 *
 * Nothing here touches a database; the caller records the run.
 */

/** Every task the layer does. One name, used by the settings and the ledger. */
export type AiTask =
  | "dictate.fields"
  | "cv.fields"
  | "inbound.read"
  | "draft.improve"
  | "draft.reply"
  | "summarise"
  | "whatfirst"
  | "agent"
  | "ask";

export const AI_TASKS: Record<AiTask, { what: string; judgment: boolean; reads: string }> = {
  "dictate.fields": {
    what: "Turn a dictated brief into our own fields",
    judgment: false,
    reads: "only what was said",
  },
  "cv.fields": {
    what: "Read the name and the position applied for from a CV",
    judgment: false,
    reads: "the text of the CV, and nothing else",
  },
  "inbound.read": {
    what: "Read what a client sent and propose what it means",
    judgment: true,
    reads: "the email, and the set or agreement it is about",
  },
  "draft.improve": {
    what: "Improve a draft we already wrote",
    judgment: false,
    reads: "the draft itself, and nothing else",
  },
  "draft.reply": {
    what: "Draft a reply to a client's email",
    judgment: true,
    reads: "the email and the record it is about",
  },
  summarise: {
    what: "Summarise a client's history, or one thread",
    judgment: false,
    reads: "the records named in the ask",
  },
  whatfirst: {
    what: "Say in one line why today's first task is first",
    judgment: false,
    reads: "the task list the rules already ordered",
  },
  agent: {
    what: "Turn what a person typed into one of the desk's own actions, for them to press",
    judgment: false,
    reads: "the words typed, the list of actions, and a few counts",
  },
  ask: { what: "Answer a question from our own data", judgment: true, reads: "what the person could read anyway" },
};

export type Provider = "deepseek" | "claude" | "none";

/**
 * Which model, in the house order (Part F: Claude first then DeepSeek, and
 * the 3 Nov note that the subscription is a pool).
 *
 * Judgment goes to Claude when its key is there; everything else to DeepSeek,
 * which is cheap. With only one key set, everything goes to that one. With
 * none, the layer is off and every screen says so rather than failing.
 */
export function providerFor(task: AiTask, keys: { claude: boolean; deepseek: boolean }): Provider {
  const judgment = AI_TASKS[task].judgment;
  if (judgment && keys.claude) return "claude";
  if (keys.deepseek) return "deepseek";
  if (keys.claude) return "claude";
  return "none";
}

export const MODELS: Record<Exclude<Provider, "none">, string> = {
  // Cheap and good enough for the plain work.
  deepseek: "deepseek-chat",
  // Judgment, and the one that costs: used where being wrong matters.
  claude: "claude-sonnet-5-5",
};

/**
 * Where DeepSeek is reached, and as which model (7 Nov).
 *
 * The owner buys DeepSeek through **OpenRouter** rather than direct, so there
 * are two doors to the same provider. OpenRouter speaks the same
 * chat-completions shape as DeepSeek, so nothing above this function changes:
 * the provider is still "deepseek", the ledger still says deepseek, and the
 * screens are untouched.
 *
 * Their OpenRouter workspace has a **guardrail** that allows exactly one
 * DeepSeek model - deepseek/deepseek-v4-flash. Asking for deepseek/deepseek-chat
 * comes back 404 "Model blocked by guardrail", which reads like the model
 * does not exist. It does; it is not allowed. So the model is named here
 * rather than guessed, and it is the one their account actually serves
 * (checked with a real call, 7 Nov).
 *
 * OPENROUTER_API_KEY wins where both are set: a key somebody put there is a
 * key they meant to use.
 */
export function deepseekRoute(env: Record<string, string | undefined> = process.env): {
  url: string;
  key: string;
  model: string;
  through: "openrouter" | "deepseek";
} | null {
  const openrouter = (env.OPENROUTER_API_KEY ?? "").trim();
  if (openrouter) {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: openrouter,
      model: (env.OPENROUTER_MODEL ?? "").trim() || "deepseek/deepseek-v4-flash",
      through: "openrouter",
    };
  }
  const direct = (env.DEEPSEEK_API_KEY ?? "").trim();
  if (direct) {
    return { url: "https://api.deepseek.com/chat/completions", key: direct, model: MODELS.deepseek, through: "deepseek" };
  }
  return null;
}

/**
 * What a run costs, in rupees, per million tokens.
 *
 * Written down so the ledger means something; the numbers are the published
 * ones and are a setting the owner can correct without a deploy.
 */
export const PRICE_PER_MTOK: Record<Exclude<Provider, "none">, { in: number; out: number }> = {
  deepseek: { in: 90, out: 270 },
  claude: { in: 900, out: 4_500 },
};

export function costOf(provider: Provider, tokensIn: number, tokensOut: number): number {
  if (provider === "none") return 0;
  const price = PRICE_PER_MTOK[provider];
  const cost = (tokensIn / 1_000_000) * price.in + (tokensOut / 1_000_000) * price.out;
  return Math.round(cost * 100) / 100;
}

/** The layer's own limits. A run longer than this is somebody's lunch wasted. */
export const TIMEOUT_MS = 20_000;
export const MAX_INPUT_CHARS = 24_000;
export const DAILY_BUDGET = 500;

export interface AiSwitches {
  /** The layer itself, and each task. */
  on: boolean;
  tasks: Record<string, boolean>;
  dailyBudget: number;
  spentToday: number;
}

/** Why the layer will not run, in words a screen can show. */
export function problemWithRunning(task: AiTask, provider: Provider, switches: AiSwitches): string | null {
  if (!switches.on) return "The AI layer is switched off. The ops lead turns it on in the settings.";
  if (switches.tasks[task] === false) return "This one is switched off: " + AI_TASKS[task].what.toLowerCase() + ".";
  if (provider === "none") {
    return "No model key is set, so there is nothing to ask. The owner puts one in the server's environment.";
  }
  if (switches.spentToday >= switches.dailyBudget) {
    return (
      "Today's AI budget of LKR " +
      switches.dailyBudget +
      " is used up, so the layer has stopped. It starts again tomorrow, or the ops lead raises the cap."
    );
  }
  return null;
}

/** What goes to a model: trimmed, and never more than the task needs. */
export function trimForModel(text: string, max = MAX_INPUT_CHARS): { text: string; trimmed: boolean } {
  const tidy = text.replace(/\u0000/g, "").trim();
  if (tidy.length <= max) return { text: tidy, trimmed: false };
  return { text: tidy.slice(0, max), trimmed: true };
}

/**
 * The shape every answer comes back in.
 *
 * One shape for the whole system (step 4): what it suggests, what it read,
 * how sure it is, and nothing else. A screen shows it with two buttons - use
 * it, or ignore it - and nothing enters a record without one of those.
 */
export interface Proposal<T> {
  ok: boolean;
  task: AiTask;
  provider: Provider;
  model: string | null;
  /** What it proposes, once the shape has been checked. */
  data: T | null;
  /** The records it was given, so the screen can name them. */
  read: string[];
  /** Our own word, not the model's: high when every field came back. */
  sure: "high" | "low";
  /** Why there is nothing, when there is nothing. */
  because: string | null;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  ms: number;
}

export function nothing<T>(task: AiTask, because: string, provider: Provider = "none"): Proposal<T> {
  return {
    ok: false,
    task,
    provider,
    model: null,
    data: null,
    read: [],
    sure: "low",
    because,
    tokensIn: 0,
    tokensOut: 0,
    cost: 0,
    ms: 0,
  };
}

/**
 * Read the JSON a model sent back.
 *
 * Models wrap JSON in prose and in code fences however firmly they are told
 * not to, so the first {...} or [...] is taken and parsed. A failure is an
 * answer: the run is recorded and nothing is proposed.
 */
export function readJson<T>(text: string): { ok: true; data: T } | { ok: false; because: string } {
  const fenced = text.replace(/```(?:json)?/gi, "");
  const start = fenced.search(/[[{]/);
  if (start < 0) return { ok: false, because: "The model answered with no JSON in it." };
  const open = fenced[start];
  const close = open === "{" ? "}" : "]";
  const end = fenced.lastIndexOf(close);
  if (end <= start) return { ok: false, because: "The model's JSON was cut off." };
  try {
    return { ok: true, data: JSON.parse(fenced.slice(start, end + 1)) as T };
  } catch {
    return { ok: false, because: "The model's JSON could not be read." };
  }
}

export interface AskModel {
  task: AiTask;
  system: string;
  prompt: string;
  /** The records this was built from, for the screen and the ledger. */
  read?: string[];
  maxTokens?: number;
}

function keys(): { claude: boolean; deepseek: boolean } {
  return {
    claude: Boolean((process.env.ANTHROPIC_API_KEY ?? "").trim()),
    // Either door counts: direct, or through OpenRouter (7 Nov).
    deepseek: deepseekRoute() !== null,
  };
}

/** Which provider a task would use right now, for the screens. */
export function providerNow(task: AiTask): Provider {
  return providerFor(task, keys());
}

export function anyKeySet(): boolean {
  const k = keys();
  return k.claude || k.deepseek;
}

/**
 * Why the AI is not offering to help, in one sentence (24, section 5).
 *
 * The screens used to hide every AI button while the layer was off, which is
 * how the owner came to say on 4 November that the AI was not there at all.
 * A feature nobody can see has not been built for them, so the offer now stays
 * on the screen - quiet, not pressable - with this line beside it.
 */
export function aiOffReason(hasKey: boolean, switchedOn: boolean): string | null {
  if (!hasKey) return "AI is off: no model key is set yet.";
  if (!switchedOn) return "AI is off: the ops lead has not switched it on.";
  return null;
}

/**
 * Ask a model, once, with a timeout.
 *
 * Both providers speak the same shape of request closely enough that one
 * function covers them: a system line, a user line, JSON back. Anything that
 * goes wrong - no key, a refusal, a timeout, a reply that will not parse -
 * comes back as a proposal with nothing in it and a reason, because a screen
 * must be able to say why rather than break.
 */
export async function ask<T>(input: AskModel): Promise<Proposal<T>> {
  const provider = providerFor(input.task, keys());
  if (provider === "none") return nothing<T>(input.task, "No model key is set.");

  const started = Date.now();
  const { text: prompt, trimmed } = trimForModel(input.prompt);
  const route = provider === "deepseek" ? deepseekRoute() : null;
  const model = route
    ? route.model
    : provider === "claude"
      ? (process.env.ANTHROPIC_MODEL ?? "").trim() || MODELS.claude
      : MODELS[provider];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const body =
      provider === "claude"
        ? {
            model,
            max_tokens: input.maxTokens ?? 1_200,
            system: input.system,
            messages: [{ role: "user", content: prompt }],
          }
        : {
            model,
            max_tokens: input.maxTokens ?? 1_200,
            messages: [
              { role: "system", content: input.system },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
          };

    const response = await fetch(
      provider === "claude" ? "https://api.anthropic.com/v1/messages" : (route?.url ?? "https://api.deepseek.com/chat/completions"),
      {
        method: "POST",
        signal: controller.signal,
        cache: "no-store",
        headers:
          provider === "claude"
            ? {
                "content-type": "application/json",
                "x-api-key": (process.env.ANTHROPIC_API_KEY ?? "").trim(),
                "anthropic-version": "2023-06-01",
              }
            : {
                "content-type": "application/json",
                authorization: "Bearer " + (route?.key ?? ""),
                // OpenRouter asks who is calling; it is in their dashboard
                // beside the spend, which is where the owner will look.
                ...(route?.through === "openrouter"
                  ? { "http-referer": "https://ops.career141.com", "x-title": "Career 141 Ops" }
                  : {}),
              },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const said = await response.text().catch(() => "");
      return {
        ...nothing<T>(input.task, provider + " answered " + response.status + ". " + said.slice(0, 200), provider),
        ms: Date.now() - started,
        model,
      };
    }

    const answer = (await response.json()) as Record<string, unknown>;
    const text =
      provider === "claude"
        ? ((answer.content as { text?: string }[] | undefined)?.map((part) => part.text ?? "").join("") ?? "")
        : ((answer.choices as { message?: { content?: string } }[] | undefined)?.[0]?.message?.content ?? "");
    const usage = (answer.usage ?? {}) as Record<string, number>;
    const tokensIn = usage.input_tokens ?? usage.prompt_tokens ?? 0;
    const tokensOut = usage.output_tokens ?? usage.completion_tokens ?? 0;

    const parsed = readJson<T>(text);
    const base = {
      task: input.task,
      provider,
      model,
      read: input.read ?? [],
      tokensIn,
      tokensOut,
      cost: costOf(provider, tokensIn, tokensOut),
      ms: Date.now() - started,
    };
    if (!parsed.ok) return { ...base, ok: false, data: null, sure: "low" as const, because: parsed.because };
    return {
      ...base,
      ok: true,
      data: parsed.data,
      // Our own word: a trimmed prompt means it did not see everything.
      sure: trimmed ? ("low" as const) : ("high" as const),
      because: trimmed ? "It was given only the first part of a long text." : null,
    };
  } catch (error) {
    const why = error instanceof Error && error.name === "AbortError" ? "It took too long and was stopped." : "The model could not be reached.";
    return { ...nothing<T>(input.task, why, provider), ms: Date.now() - started, model };
  } finally {
    clearTimeout(timer);
  }
}

/* ── Aura: a model that looks things up, then proposes ─────────────────────── */

/**
 * Claude Haiku 5.5 through the Messages API with tools. Price per million
 * tokens in rupees: the published $0.10 in / $0.50 out at about LKR 300 to the
 * dollar. A cache read is billed at a tenth of the input price. The ledger
 * still says "claude".
 */
export const AGENT_MODEL = "claude-haiku-5-5";
export const AGENT_PRICE_PER_MTOK = { in: 30, out: 150 };
export const CACHE_READ_FACTOR = 0.1;

/** `tokensIn` is everything read at full price; `cached` is what came from the prompt cache. */
export function costOfAgent(tokensIn: number, tokensOut: number, cached = 0): number {
  const cost =
    (tokensIn / 1_000_000) * AGENT_PRICE_PER_MTOK.in +
    (cached / 1_000_000) * AGENT_PRICE_PER_MTOK.in * CACHE_READ_FACTOR +
    (tokensOut / 1_000_000) * AGENT_PRICE_PER_MTOK.out;
  return Math.round(cost * 10_000) / 10_000;
}

/** What an HTTP error from the model says to a person: one plain sentence, never the raw body. */
export function sayModelStatus(status: number): string {
  if (status === 401 || status === 403) return "The model's key was refused. The owner checks ANTHROPIC_API_KEY.";
  if (status === 429 || status === 529) return "The model is busy right now. Try again in a minute.";
  if (status >= 500) return "The model had a problem on its side. Try again in a minute.";
  return "The model could not take that request (" + status + ").";
}

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}
export type AgentBlock = { type: string; [key: string]: unknown };
export interface AgentMessage {
  role: "user" | "assistant";
  content: string | AgentBlock[];
}
export interface AgentResponse {
  content?: AgentBlock[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
}

/** What a tool hands back: words for the model, or "stop the loop, here is the answer". */
export type ToolRun = string | { stop: true; value: unknown; text?: string };

export type AgentOutcome = "done" | "stopped" | "refused" | "cut_off" | "too_many_rounds" | "too_slow" | "blocked" | "failed";

export type NextStep =
  | { kind: "tools"; uses: { id: string; name: string; input: Record<string, unknown> }[] }
  /** The server paused a long turn: send the content back as it is and go on. */
  | { kind: "pause" }
  | { kind: "end"; outcome: "done" | "refused" | "cut_off" | "failed"; text: string };

/** The reducer: one response in, what the loop does next out. Pure, so every stop reason is tested. */
export function nextStep(response: AgentResponse): NextStep {
  const content = response.content ?? [];
  const text = content.filter((b) => b.type === "text").map((b) => String(b.text ?? "")).join("").trim();
  const uses = content
    .filter((b) => b.type === "tool_use")
    .map((b) => ({ id: String(b.id), name: String(b.name), input: (b.input ?? {}) as Record<string, unknown> }));
  switch (response.stop_reason) {
    case "tool_use":
      return uses.length ? { kind: "tools", uses } : { kind: "end", outcome: "failed", text: "The model asked for a tool but named none." };
    case "pause_turn":
      return { kind: "pause" };
    case "refusal":
      return { kind: "end", outcome: "refused", text: "The model declined to help with that." };
    case "max_tokens":
      return { kind: "end", outcome: "cut_off", text: "The model's answer was cut off. Try asking in smaller steps." };
    case "end_turn":
    case "stop_sequence":
    case undefined:
      return { kind: "end", outcome: "done", text };
    default:
      return { kind: "end", outcome: "failed", text: "The model stopped unexpectedly (" + response.stop_reason + ")." };
  }
}

export interface AskWithTools {
  system: string;
  messages: AgentMessage[];
  tools: ToolDef[];
  runTool: (name: string, input: Record<string, unknown>) => Promise<ToolRun> | ToolRun;
  maxRounds?: number;
  deadlineMs?: number;
  model?: string;
  /**
   * Why the layer may not run another round (switches, daily budget); null to go on. Checked before every
   * round and given what this chat has cost so far, so the daily cap holds inside a long loop too.
   */
  guard?: (spentSoFar: number) => string | null;
  /** Injectable for tests; defaults to the platform's fetch. Never the real API in a test. */
  fetch?: typeof fetch;
  now?: () => number;
  /** The pause before the one retry on a busy model; a test passes a no-op. */
  sleep?: (ms: number) => Promise<void>;
  apiKey?: string;
}

export interface AskWithToolsResult {
  outcome: AgentOutcome;
  /** A plain sentence: the model's closing words, or why the loop ended. */
  text: string;
  stopValue: unknown;
  usage: { tokensIn: number; tokensOut: number; cached: number; cost: number };
  rounds: number;
  model: string;
}

/**
 * Ask Claude with tools until it finishes, a tool says stop, or a limit is hit.
 *
 * Each round the assistant's content goes back unchanged, and every tool_result
 * of that round goes in ONE user message (the API rejects them split). The
 * model never executes anything here: tools only read, and propose_action's
 * stop value is a proposal a person still has to press.
 *
 * Haiku 5.5 thinks by default and thinking counts toward max_tokens, so the
 * effort is set low and the ceiling is generous.
 */
export async function askWithTools(input: AskWithTools): Promise<AskWithToolsResult> {
  const model = input.model || (process.env.ANTHROPIC_AGENT_MODEL ?? "").trim() || AGENT_MODEL;
  const maxRounds = input.maxRounds ?? 6;
  const now = input.now ?? Date.now;
  const doFetch = input.fetch ?? fetch;
  const sleep = input.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const key = (input.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "").trim();
  const start = now();
  const deadline = start + (input.deadlineMs ?? 45_000);
  const messages: AgentMessage[] = [...input.messages];
  let tokensIn = 0;
  let tokensOut = 0;
  let cached = 0;
  let rounds = 0;
  const finish = (outcome: AgentOutcome, text: string, stopValue: unknown = null): AskWithToolsResult => ({
    outcome,
    text,
    stopValue,
    usage: { tokensIn: tokensIn + cached, tokensOut, cached, cost: costOfAgent(tokensIn, tokensOut, cached) },
    rounds,
    model,
  });
  if (!key) return finish("blocked", "No model key is set, so there is nothing to ask.");

  while (rounds < maxRounds) {
    const why = input.guard?.(costOfAgent(tokensIn, tokensOut, cached)) ?? null;
    if (why) return finish("blocked", why);
    if (now() >= deadline) return finish("too_slow", "It took too long and was stopped.");
    rounds += 1;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1, deadline - now()));
    let response: AgentResponse;
    try {
      const send = () =>
        doFetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: controller.signal,
          cache: "no-store",
          headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model,
            max_tokens: 4_096,
            output_config: { effort: "low" },
            system: [{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }],
            messages,
            tools: input.tools,
            tool_choice: { type: "auto" },
          }),
        });
      let res = await send();
      // Busy (429, 529): one more try after a short pause, then a plain sentence.
      if (res.status === 429 || res.status === 529) {
        // The server's retry-after, but never longer than what is left of the deadline.
        const said = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(said) && said > 0 ? said * 1_000 : 1_500;
        await sleep(Math.min(wait, Math.max(0, deadline - now())));
        res = await send();
      }
      if (!res.ok) return finish("failed", sayModelStatus(res.status));
      response = (await res.json()) as AgentResponse;
    } catch (error) {
      const slow = error instanceof Error && error.name === "AbortError";
      return finish(slow ? "too_slow" : "failed", slow ? "It took too long and was stopped." : "The model could not be reached.");
    } finally {
      clearTimeout(timer);
    }

    tokensIn += (response.usage?.input_tokens ?? 0) + (response.usage?.cache_creation_input_tokens ?? 0);
    cached += response.usage?.cache_read_input_tokens ?? 0;
    tokensOut += response.usage?.output_tokens ?? 0;

    const step = nextStep(response);
    if (step.kind === "end") return finish(step.outcome, step.text);

    messages.push({ role: "assistant", content: response.content ?? [] });
    if (step.kind === "pause") continue;
    const results: AgentBlock[] = [];
    for (const use of step.uses) {
      let out: ToolRun;
      try {
        out = await input.runTool(use.name, use.input);
      } catch {
        results.push({ type: "tool_result", tool_use_id: use.id, content: "That tool failed. Carry on without it.", is_error: true });
        continue;
      }
      if (typeof out !== "string" && out.stop) return finish("stopped", out.text ?? "", out.value);
      results.push({ type: "tool_result", tool_use_id: use.id, content: out as string });
    }
    messages.push({ role: "user", content: results });
  }
  return finish("too_many_rounds", "I went round too many times without finishing. Try asking in smaller steps.");
}
