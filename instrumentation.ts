/**
 * Runs once when the server starts. Here it starts the app's own clock where
 * no backend cron asks for one (the JSON store: the laptop and the Railway
 * preview). Node only - the clocks read the store from disk.
 */
export async function register() {
  // The import sits inside the check, not after an early return: webpack only
  // drops it from the edge build this way, and the edge has no node:fs (13 Nov).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSelfClock } = await import("./src/data/selfClock");
    startSelfClock();
  }
}
