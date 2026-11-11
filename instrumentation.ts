/**
 * Runs once when the server starts. Here it starts the app's own clock where
 * no backend cron asks for one (the JSON store: the laptop and the Railway
 * preview). Node only - the clocks read the store from disk.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startSelfClock } = await import("./src/data/selfClock");
  startSelfClock();
}
