import { redirect } from "next/navigation";

import { mailboxesInWords, readerEnabled } from "@/lib/graphMail";
import { outboundLocked, outreachInWords, outreachLiveInEnv, sendingEnabled } from "@/lib/senders";
import { CLOCK_PASS_KEY, clockSchedulerReady, parsePass, passInWords } from "@/lib/clockPass";
import { desk, liveTimers, switchedOn } from "@/data/desk";
import { usingConvex } from "@/data/convexClient";
import { currentMember, devSignInAllowed } from "@/lib/session";
import { people, readsEnabled, writesEnabled } from "@/lib/ta";

/**
 * Is anything broken? (15, Phase 1 step 21.)
 *
 * The window to the TA System, the switches, and the last few changes anyone
 * made. It says "switched off" plainly rather than showing a zero that could be
 * mistaken for an answer.
 */
export default async function HealthPage() {
  const member = await currentMember();
  if (!member) redirect("/sign-in");

  const ta = await people();
  const db = await desk();
  const audit = [...db.audit].sort((a, b) => b.at - a.at).slice(0, 10);
  const lastClockPass = parsePass(db.settings.find((s) => s.key === CLOCK_PASS_KEY)?.value);
  const card = "rounded-[28px] bg-surface px-7 py-[26px] shadow-card";

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-1.5 p-1">
        <h1 className="t-display">Health</h1>
      </div>

      <section className={card}>
        <h2 className="t-h2">The window to the TA System</h2>
        <div className="mt-2 flex flex-col gap-1 text-[13.5px]">
          <p>Reading: {readsEnabled() ? "on" : "switched off"}</p>
          <p>Writing: {writesEnabled() ? "on" : "switched off"}</p>
          <p className="text-ink-soft">
            {ta.ok
              ? ta.data.length + " people read from the TA System in " + ta.ms + " ms"
              : ta.reason}
          </p>
        </div>
      </section>

      <section className={card}>
        <h2 className="t-h2">What can leave the building</h2>
        <div className="mt-2 flex flex-col gap-1 text-[13.5px]">
          <p>Sending: {sendingEnabled() ? "on" : "switched off"}</p>
          <p>Outreach to real clients: {outreachInWords(outreachLiveInEnv(), switchedOn(db, "switch.outreachLive"))}</p>
          <p>
            Dev sender:{" "}
            {devSignInAllowed()
              ? (process.env.OPS_DEV_SENDER_EMAIL ?? "").trim() || "not set (uses the signed-in member's address)"
              : "inactive (not in dev sign-in)"}
          </p>
          <p>
            Microsoft credentials:{" "}
            {process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET
              ? "present"
              : "missing"}
          </p>
          <p>Reading the mailboxes: {readerEnabled() ? "on" : "switched off"}</p>
          <p className="text-ink-soft">
            {mailboxesInWords()}
            {outboundLocked() ? " · the outbound lock allows only named addresses and numbers" : ""}
          </p>
        </div>
      </section>

      <section className={card}>
        <h2 className="t-h2">Where the desk is kept</h2>
        <p className="mt-2 text-[13.5px]">
          {usingConvex() ? "The Ops backend." : "A file on this machine, with invented sample data."}
        </p>
      </section>

      <section className={card}>
        <h2 className="t-h2">Clocks</h2>
        <p className="mt-2 text-[13.5px]">
          {liveTimers(db).length} running, {db.timers.length} in all.
        </p>
        <p className="mt-2 text-[13.5px]">
          Running on their own: {clockSchedulerReady() ? "on" : "switched off (no OPS_CLOCK_KEY)"}
        </p>
        <p className="mt-1 text-[13px] text-ink-soft">{passInWords(lastClockPass)}</p>
      </section>

      <section className={card}>
        <h2 className="t-h2">The last ten changes</h2>
        {audit.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {audit.map((entry) => (
          <div key={entry.id} className="border-t border-rule py-2 text-[13px] first:border-t-0">
            <span className="text-ink">{entry.action}</span>{" "}
            <span className="text-ink-soft">
              {entry.subjectType} {entry.subjectId}
              {entry.reason ? " · " + entry.reason : ""}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
