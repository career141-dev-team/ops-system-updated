import { internalAction } from "../_generated/server";

/**
 * The thing that remembers to ask (15, Phase 1 step 19).
 *
 * The clock rules live in the app, not in here, because that is where they are
 * tested and where the mail and the senders are. So the scheduler's whole job
 * is to knock on the app's door every few minutes with the key.
 *
 * It never throws. A scheduled function that throws is retried and shouts in
 * the logs; a clock pass that was missed is picked up by the next one a few
 * minutes later, so a quiet failure with a returned reason is the right amount
 * of noise.
 */
export const askTheApp = internalAction({
  args: {},
  handler: async (): Promise<{ ok: boolean; reason: string | null }> => {
    const base = (process.env.OPS_APP_URL ?? "").trim().replace(/\/$/, "");
    const key = (process.env.OPS_CLOCK_KEY ?? "").trim();
    if (!base || !key) {
      return { ok: false, reason: "Not set up here: OPS_APP_URL and OPS_CLOCK_KEY are needed." };
    }
    try {
      const response = await fetch(base + "/api/clock", {
        method: "POST",
        headers: { "x-ops-clock-key": key },
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) return { ok: false, reason: "The app answered " + response.status + "." };
      return { ok: true, reason: null };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "The app could not be reached." };
    }
  },
});
