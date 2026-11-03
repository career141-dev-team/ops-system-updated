import { noteClockPass, pushOutbox, readTaEvents, runClocks } from "@/data/desk";
import { keyAccepted, onePass } from "@/lib/clockPass";

/**
 * The door the scheduler knocks on (15, Phase 1 step 19).
 *
 * One pass of the clocks, asked for from outside the screens:
 *
 *   curl -X POST -H "x-ops-clock-key: <the key>" http://127.0.0.1:3000/api/clock
 *
 * It needs the key in a header, never in the address, so a pass never ends up
 * in a web server log. With no OPS_CLOCK_KEY set, nobody may ask at all.
 */
export async function POST(request: Request): Promise<Response> {
  if (!keyAccepted(request.headers.get("x-ops-clock-key"))) {
    return Response.json(
      { ok: false, reason: "This needs the clock key in the x-ops-clock-key header." },
      { status: 401 },
    );
  }
  // One pass does all three things that must happen without anybody asking:
  // the clocks, the writes waiting to reach the TA System, and the events it
  // has for us. They are one pass because they share the "only one at a time"
  // guard, and because a client reply read by one of them should stop a chase
  // before the next clock pass sees it.
  const answer = await onePass(async () => {
    const clocks = await runClocks();
    const out = await pushOutbox();
    const events = await readTaEvents();
    return { ...clocks, writesSent: out.sent, writesWaiting: out.waiting, eventsRead: events.read };
  });
  if (answer.pass) await noteClockPass(JSON.stringify(answer.pass));
  // 409 for "a pass is already going": the scheduler should come back, not
  // treat it as a fault and start alerting.
  return Response.json(answer, { status: answer.ok ? 200 : 409 });
}
