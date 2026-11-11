/**
 * The clocks run on their own (15, Phase 1 step 19).
 *
 * Until now a pass only happened when somebody opened the inbox or pressed the
 * button, so on a quiet day nothing fired at all - which defeats the point of
 * clocks that are supposed to remember for us. A scheduler now asks for a pass
 * every few minutes through /api/clock.
 *
 * This file holds the three things that are easy to get wrong about that: only
 * the scheduler may ask, only one pass runs at a time, and a pass that hangs
 * does not hold the next one up for ever. It takes the work as an argument so
 * every case can be tested without a database.
 */

export const CLOCK_TIME_LIMIT_MS = 20_000;

export interface PassResult {
  warned: number;
  fired: number;
  escalated: number;
}

export interface ClockPass extends PassResult {
  /** When the pass finished. */
  at: number;
  /** How long it took, so a slow pass is visible before it becomes a timeout. */
  ms: number;
}

/** No key set means nobody may ask, including anyone who guesses an empty one. */
export function keyAccepted(given: string | null): boolean {
  const want = (process.env.OPS_CLOCK_KEY ?? "").trim();
  if (!want) return false;
  return given !== null && given.trim() === want;
}

/** Nothing can ask for a pass until the key exists, so this says whether it can. */
export function clockSchedulerReady(): boolean {
  return (process.env.OPS_CLOCK_KEY ?? "").trim().length > 0;
}

/**
 * Whether this app should run its own pass every few minutes (11 Nov).
 *
 * On the Convex store the backend's cron asks /api/clock every five minutes.
 * On the JSON store - the laptop and the Railway preview - nothing asked, so
 * the clocks ran only when somebody opened Positions or Money or pressed
 * "Run the clocks now", and the owner rightly asked whether we had a clock
 * feature at all. Now the app times itself there. OPS_SELF_CLOCK=off stops it.
 */
export function selfClockWanted(env: Record<string, string | undefined> = process.env): boolean {
  if ((env.OPS_SELF_CLOCK ?? "").toLowerCase() === "off") return false;
  return (env.OPS_STORE ?? "json").toLowerCase() !== "convex";
}

export const SELF_CLOCK_EVERY_MS = 5 * 60_000;

/**
 * The two clock buttons on Your day are for testing, not for the desk
 * (owner, 11 Nov: "run the clock is not a button in the UI"). Shown only
 * where somebody switched the test tools on.
 */
export function testToolsShown(env: Record<string, string | undefined> = process.env): boolean {
  return (env.OPS_TEST_TOOLS ?? "").toLowerCase() === "on";
}

let running = false;

export interface PassAnswer {
  ok: boolean;
  pass: ClockPass | null;
  reason: string | null;
}

/**
 * Where the last pass is kept.
 *
 * It was a variable in this file first, which was wrong: the door the
 * scheduler knocks on and the health screen are separate pieces of the app and
 * do not share memory, so the screen said no pass had ever run while passes
 * were running every few minutes. It is a settings row now, which both can
 * read and which survives a restart (2 Nov).
 */
export const CLOCK_PASS_KEY = "clock.lastPass";

/** Reads the row back, and says nothing rather than guessing if it is odd. */
export function parsePass(value: unknown): ClockPass | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const p = JSON.parse(value) as Partial<ClockPass>;
    if (typeof p.at !== "number") return null;
    return {
      at: p.at,
      ms: typeof p.ms === "number" ? p.ms : 0,
      warned: p.warned ?? 0,
      fired: p.fired ?? 0,
      escalated: p.escalated ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * One pass, at most one at a time.
 *
 * A scheduler that fires every few minutes will eventually fire while the last
 * pass is still going - a slow backend, a long list - and two passes over the
 * same clocks would fire some of them twice. The second caller is told to come
 * back rather than queued, because the next tick is a minute away anyway.
 *
 * The guard is only released when the work really settles, so a hung pass keeps
 * the door shut; the caller gets an answer after the time limit either way.
 */
export async function onePass(
  work: () => Promise<PassResult>,
  now = Date.now(),
  limitMs = CLOCK_TIME_LIMIT_MS,
): Promise<PassAnswer> {
  if (running) return { ok: false, pass: null, reason: "A pass is still running. Nothing was done twice." };
  running = true;
  const started = now;
  const done = work().finally(() => {
    running = false;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tooLong = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), limitMs);
  });
  try {
    const result = await Promise.race([done, tooLong]);
    if (!result) {
      return { ok: false, pass: null, reason: "The pass took longer than " + limitMs / 1000 + " seconds. It is still going." };
    }
    const pass: ClockPass = { ...result, at: Date.now(), ms: Date.now() - started };
    return { ok: true, pass, reason: null };
  } catch (error) {
    return { ok: false, pass: null, reason: error instanceof Error ? error.message : "The pass failed." };
  } finally {
    clearTimeout(timer);
  }
}

/** What the last pass did, in the words the health screen shows. */
export function passInWords(pass: ClockPass | null, now = Date.now()): string {
  if (!pass) return "No pass has ever run. The scheduler should ask for one every few minutes.";
  const mins = Math.round((now - pass.at) / 60_000);
  const ago = mins < 1 ? "less than a minute ago" : mins === 1 ? "a minute ago" : mins + " minutes ago";
  const count = (n: number, one: string, many: string) => n + " " + (n === 1 ? one : many);
  // A pass every five minutes means a gap of half an hour is not a quiet day,
  // it is a scheduler that has stopped - and a stopped scheduler is the one
  // fault here nobody would otherwise notice.
  const late = mins >= 30 ? " The scheduler looks like it has stopped." : "";
  return (
    ago +
    ": " +
    count(pass.fired, "clock finished", "clocks finished") +
    ", " +
    count(pass.warned, "is close", "are close") +
    ", " +
    count(pass.escalated, "task passed on", "tasks passed on") +
    " (" +
    pass.ms +
    " ms)." +
    late
  );
}
