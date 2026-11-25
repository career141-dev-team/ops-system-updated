import { CLOCK_ACTOR, noteClockPass, pushOutbox, readTaEvents, readTheMailboxes, runClocks, runScoopPass, runScoopSummary, runWhatsAppScoopPass } from "@/data/desk";
import { readerEnabled } from "@/lib/graphMail";
import { SELF_CLOCK_EVERY_MS, onePass, selfClockWanted } from "@/lib/clockPass";

/**
 * One pass of everything that must happen without anybody asking: the clocks,
 * the writes waiting to reach the TA System, the events it has for us, and the
 * mailboxes. One function, so the scheduler's door (/api/clock) and the app's
 * own timer below run exactly the same pass.
 */
export async function clockPassOnce() {
  const clocks = await runClocks();
  const out = await pushOutbox();
  const events = await readTaEvents();
  // The mailboxes too (8 Nov, docs/31 part 2): a chase stopped by a reply read
  // here is stopped before the next clock pass sees it.
  const mail = readerEnabled() ? await readTheMailboxes(CLOCK_ACTOR) : { read: 0, filed: 0, ok: true };
  // The Scoop mailbox and the end-of-day summary (23 Nov). A failure here costs the Scoop, never the clocks above.
  let scoopAdded = 0;
  let waScoopAdded = 0;
  try {
    // CVs from the WhatsApp group (25 Nov): its own gate, the WhatsApp token, not the Microsoft mail one.
    waScoopAdded = (await runWhatsAppScoopPass(CLOCK_ACTOR)).added;
  } catch (error) {
    console.error("[clock] the WhatsApp Scoop pass failed:", error);
  }
  try {
    if (readerEnabled()) scoopAdded = (await runScoopPass(CLOCK_ACTOR)).added;
    await runScoopSummary(CLOCK_ACTOR);
  } catch (error) {
    console.error("[clock] the Scoop pass failed:", error);
  }
  return { ...clocks, writesSent: out.sent, writesWaiting: out.waiting, eventsRead: events.read, mailRead: mail.read, mailFiled: mail.filed, mailOk: mail.ok, scoopAdded, waScoopAdded };
}

const STARTED = Symbol.for("career141.ops.selfClock");

/**
 * The app's own timer, where no backend cron asks (11 Nov; see selfClockWanted).
 * Started once per server process - next dev reloads modules, so the flag lives
 * on globalThis. The first pass waits half a minute so starting up is not slowed.
 */
export function startSelfClock(): void {
  if (!selfClockWanted()) return;
  const g = globalThis as Record<symbol, unknown>;
  if (g[STARTED]) return;
  g[STARTED] = true;

  const tick = async () => {
    try {
      const answer = await onePass(clockPassOnce);
      if (answer.pass) await noteClockPass(JSON.stringify(answer.pass));
      else if (answer.reason) console.warn("[clock] " + answer.reason);
    } catch (error) {
      console.error("[clock] the pass failed:", error);
    }
  };
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), SELF_CLOCK_EVERY_MS).unref?.();
  }, 30_000).unref?.();
  console.log("[clock] running the clocks every " + SELF_CLOCK_EVERY_MS / 60_000 + " minutes on this server");
}
