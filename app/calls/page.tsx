import { redirect } from "next/navigation";

import { recordCall } from "@/app/actions";
import { desk } from "@/data/desk";
import { CALL_PURPOSES, purposeInWords, telLink } from "@/lib/calls";
import { can, refusal } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * Calls (15, Phase 1 step 24).
 *
 * The owner's decision 7: calls stay human. Nothing here dials anybody and no
 * AI speaks to anybody — a call is a task with a number on it, and afterwards
 * a line about what was said. That line is the point: a call nobody wrote down
 * is a call that did not happen, which is how "Damad chased 29 September" ends
 * up being somebody's memory.
 *
 * One page: the calls waiting, the form, and what was said on the last few.
 */
export default async function CallsPage({ searchParams }: { searchParams: Promise<{ msg?: string; task?: string }> }) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { msg, task } = await searchParams;
  const mayDo = can(member, "task.do");

  const db = await desk();
  const waiting = db.tasks
    .filter((t) => t.kind === "call" && t.state === "open")
    .sort((a, b) => a.dueAt - b.dueAt);
  const calls = [...db.calls].sort((a, b) => b.at - a.at).slice(0, 15);
  const chosen = waiting.find((t) => t.id === task) ?? null;
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const nameOf = (id: string) => db.members.find((m) => m.id === id)?.name ?? "somebody";

  return (
    <div className="max-w-[860px]">
      <h1 className="text-[17px] font-medium">Calls</h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        A person rings; the system remembers who, why and what was said. Nothing here dials anybody.
      </p>

      {msg && <p className="mt-3 rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">Waiting to be called</h2>
        {waiting.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nobody is waiting on a call.</p>}
        {waiting.map((t) => (
          <div key={t.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0">
            <span className="text-[13.5px]">{t.title}</span>
            <span className="text-[12px] text-ink-faint">{nameOf(t.assigneeId)}</span>
            {t.subjectType && (
              <span className="text-[12px] text-ink-faint">
                {t.subjectType} {t.subjectId}
              </span>
            )}
            <a href={"/calls?task=" + t.id} className="ml-auto text-[12.5px] text-brand hover:underline">
              Write down this call
            </a>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">{chosen ? "What happened on this call" : "Write down a call"}</h2>
        {chosen && <p className="mt-1 text-[13px] text-ink-soft">{chosen.title}</p>}
        {mayDo ? (
          <form action={recordCall} className="mt-3 flex flex-col gap-3">
            {chosen && <input type="hidden" name="taskId" value={chosen.id} />}
            {chosen?.subjectType && <input type="hidden" name="subjectType" value={chosen.subjectType} />}
            {chosen?.subjectId && <input type="hidden" name="subjectId" value={chosen.subjectId} />}
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Number
                <input name="to" placeholder="077 123 4567" required className={field} />
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Whose number
                <input name="toName" placeholder="the client, the candidate" className={field} />
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Why
                <select name="purpose" className={field} defaultValue={chosen ? "feedback.chase" : "other"}>
                  {Object.entries(CALL_PURPOSES).map(([key, words]) => (
                    <option key={key} value={key}>
                      {words}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              Who you spoke to
              <input name="spokeTo" placeholder="a name, or that nobody answered" required className={field} />
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              What was said
              <textarea name="outcome" rows={3} required className={field} />
            </label>
            <button className="self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper">
              {chosen ? "Save and finish the task" : "Save"}
            </button>
          </form>
        ) : (
          <p className="mt-2 text-[13px] text-ink-faint">{refusal("task.do")}</p>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">The last calls</h2>
        {calls.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {calls.map((call) => {
          const dial = telLink(call.to);
          return (
            <div key={call.id} className="border-t border-rule py-3 first:border-t-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {dial ? (
                  <a href={dial} className="text-[13.5px] text-brand hover:underline">
                    {call.to}
                  </a>
                ) : (
                  <span className="text-[13.5px]">{call.to}</span>
                )}
                {call.toName && <span className="text-[12.5px]">{call.toName}</span>}
                <span className="text-[12px] text-ink-faint">{purposeInWords(call.purpose)}</span>
                <span className="ml-auto text-[12px] text-ink-faint">
                  {nameOf(call.by)} · {new Date(call.at).toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </div>
              <p className="mt-1 text-[13px]">
                <span className="text-ink-soft">{call.spokeTo || "nobody"} —</span> {call.outcome}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
