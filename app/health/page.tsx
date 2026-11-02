import { redirect } from "next/navigation";

import { repo } from "@/data/store";
import { currentMember } from "@/lib/session";
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
  const audit = repo.audit().slice(0, 10);
  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";

  return (
    <div className="flex max-w-[860px] flex-col gap-3">
      <h1 className="text-[17px] font-medium">Health</h1>

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">The window to the TA System</h2>
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
        <h2 className="text-[14.5px] font-medium">Clocks</h2>
        <p className="mt-2 text-[13.5px]">
          {repo.liveTimers().length} running, {repo.timers().length} in all.
        </p>
      </section>

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">The last ten changes</h2>
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
