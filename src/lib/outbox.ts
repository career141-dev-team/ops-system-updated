/**
 * When a write to the TA System is tried again (15, Phase 1 step 21).
 *
 * The API is on another machine and will sometimes be down, restarting or
 * mid-release. A write must not be lost and must not be repeated into two
 * openings, so: every write carries a key the TA side treats as "the same
 * intention", and a failed write waits longer each time rather than hammering
 * a system that is already struggling.
 *
 * Pure rules, so every case is tested.
 */

const MINUTE = 60_000;

/** One, five, fifteen, thirty minutes, then every hour. */
export function waitAfter(attempts: number): number {
  const steps = [1, 5, 15, 30];
  return (steps[attempts - 1] ?? 60) * MINUTE;
}

export function nextTryAt(attempts: number, now: number): number {
  return now + waitAfter(attempts);
}

/**
 * After this many tries it stops and a person is told.
 *
 * Twelve tries spans about nine hours, which covers a release, a restart and a
 * night. Longer than that is not a hiccup, and a write still sitting there is
 * something somebody has to know about rather than something to keep retrying
 * for ever.
 */
export const GIVE_UP_AFTER = 12;

export function shouldGiveUp(attempts: number): boolean {
  return attempts >= GIVE_UP_AFTER;
}

/** The writes worth trying now: queued, and past their waiting time. */
export function dueNow<T extends { state: string; nextTryAt: number | null }>(items: T[], now: number): T[] {
  return items.filter((item) => item.state === "queued" && (item.nextTryAt === null || item.nextTryAt <= now));
}

/**
 * The key for one intention.
 *
 * It must be the same for a repeat of the same write and different for a
 * genuinely new one, so it is built from the path and what is being written —
 * never from the time, which would make every retry look new.
 */
export function keyFor(path: string, body: Record<string, unknown>): string {
  const shape = JSON.stringify(body, Object.keys(body).sort());
  let hash = 0;
  for (const text of [path, shape]) {
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") + "-" + (hash >>> 0).toString(36);
}

/** What the screen says about one waiting write. */
export function outboxInWords(item: { state: string; attempts: number; lastError: string | null }): string {
  if (item.state === "sent") return "Sent.";
  if (item.state === "failed") {
    return "Given up after " + item.attempts + " tries. " + (item.lastError ?? "") + " Somebody has to do this by hand.";
  }
  if (item.attempts === 0) return "Waiting to go.";
  return "Tried " + item.attempts + " times. " + (item.lastError ?? "");
}
