import Link from "next/link";
import { redirect } from "next/navigation";

import { askTheDesk, recordAiUse } from "@/app/actions";
import { aiAccuracy, aiRunsNewestFirst, aiSpentToday, aiSwitches, desk, member as memberIn } from "@/data/desk";
import { AI_TASKS, type AiTask, anyKeySet, providerNow } from "@/lib/ai";
import { TASK_BUTTONS, notSaidInWords, type Answer } from "@/lib/aiTasks";
import { money } from "@/lib/money";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * The AI layer (15, Phase 9).
 *
 * One page for the whole layer: the box to ask it something, what each task
 * has cost, and how often its proposals were used as they came. The owner's
 * own rule from the register — costed, sampled, switchable — is what this
 * page is for, and it is deliberately dull: AI that nobody can audit is AI
 * nobody should trust.
 */
export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; asked?: string; answer?: string; runId?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, asked, answer, runId } = await searchParams;

  const db = await desk();
  const switches = aiSwitches(db);
  const spent = aiSpentToday(db);
  const accuracy = aiAccuracy(db);
  const runs = aiRunsNewestFirst(db).slice(0, 12);
  const got: Answer | null = answer ? (JSON.parse(answer) as Answer) : null;

  const card = "rounded-[28px] bg-surface px-7 py-[26px] shadow-card";
  const field = "w-full rounded-[10px] border border-rule bg-surface px-3.5 py-2.5 text-[14px]";
  const button = "self-start rounded-full bg-ink px-5 py-[11px] text-[14px] font-medium text-ink-inverse";
  const plain = "rounded-full border border-rule-strong bg-surface px-5 py-[11px] text-[14px] font-medium hover:bg-sunk";
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-1.5 p-1">
        <h1 className="t-display">The AI layer</h1>
        <p className="t-small text-ink-3">
          It proposes; a person decides. Nothing it writes reaches a client, the TA System or a money field without
          the approval this system already asks for. Every run is written down here with what it cost and what you did
          with it.
        </p>
      </div>

      {msg && <p className="rounded-[18px] bg-sunk px-4 py-3 t-small">{msg}</p>}

      {!anyKeySet() && (
        <p className="rounded-[18px] border border-warning bg-surface px-4 py-3 t-small">
          No model key is set, so the layer cannot ask anything. The owner puts an Anthropic or a DeepSeek key in the
          server&rsquo;s environment; the desk works exactly as it does now without one.
        </p>
      )}

      {!switches.on && anyKeySet() && (
        <p className="rounded-[18px] border border-warning bg-surface px-4 py-3 t-small">
          A key is set, but the layer is switched off. The ops lead turns on{" "}
          <Link href="/settings" className="text-brand hover:underline">
            switch.aiEnabled
          </Link>{" "}
          when they are ready.
        </p>
      )}

      <section className={card}>
        <h2 className="t-h2">Ask about the desk</h2>
        <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">
          It answers from our own rows and names what it used. It is read-only: it runs nothing, writes nothing and
          never touches money.
        </p>
        <form action={askTheDesk} className="mt-3 flex flex-col gap-2">
          <input
            name="question"
            placeholder="Which clients have a set out and have not answered?"
            className={field}
          />
          <button className={button}>Ask</button>
        </form>

        {asked && got && (
          <div className="mt-4 border-t border-rule pt-4">
            <p className="text-[12.5px] text-ink-faint">{asked}</p>
            <p className="mt-2 whitespace-pre-wrap text-[13.5px]">{got.answer}</p>
            {got.used?.length > 0 && (
              <p className="mt-2 text-[12px] text-ink-faint">From: {got.used.join("; ")}</p>
            )}
            {notSaidInWords(got.notSaid ?? []) && (
              <p className="mt-1 text-[12px] text-warning">{notSaidInWords(got.notSaid ?? [])}</p>
            )}
            {runId && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(["used", "edited", "ignored"] as const).map((outcome) => (
                  <form key={outcome} action={recordAiUse}>
                    <input type="hidden" name="runId" value={runId} />
                    <input type="hidden" name="outcome" value={outcome} />
                    <input type="hidden" name="back" value="/ai" />
                    <button className={plain}>
                      {outcome === "used" ? "That was right" : outcome === "edited" ? "Nearly" : "No use"}
                    </button>
                  </form>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="t-h2">What it costs, and whether it is any good</h2>
        <p className="mt-1 text-[13px]">
          {money(spent, "LKR")} today, against a cap of {money(switches.dailyBudget, "LKR")}. At the cap the layer
          stops rather than quietly spending.
        </p>
        {accuracy.map((row) => (
          <div key={row.task} className="border-t border-rule py-3">
            <p className="text-[13.5px]">
              {AI_TASKS[row.task as AiTask]?.what ?? row.task}
              {switches.tasks[row.task] === false && <span className="text-ink-faint"> · switched off</span>}
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{row.words}</p>
            <p className="mt-0.5 text-[12px] text-ink-faint">
              {providerNow(row.task as AiTask) === "none" ? "no key" : providerNow(row.task as AiTask)} · reads{" "}
              {AI_TASKS[row.task as AiTask]?.reads} · {money(row.cost, "LKR")} so far
            </p>
          </div>
        ))}
      </section>

      {can(me, "report.read") && (
        <section className={card}>
          <h2 className="t-h2">The last few runs</h2>
          {runs.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing has been asked yet.</p>}
          {runs.map((run) => (
            <div key={run.id} className="border-t border-rule py-2 first:border-t-0">
              <p className="text-[12.5px]">
                {TASK_BUTTONS[run.task as AiTask] ?? run.task} · {run.provider}
                {run.outcome && <span className="text-ink-soft"> → {run.outcome}</span>}
                {!run.ok && <span className="text-warning"> → nothing came back</span>}
              </p>
              <p className="text-[12px] text-ink-faint">
                {whenLocal(run.at)} · {memberIn(db, run.by)?.name ?? "somebody"} · {run.tokensIn}+{run.tokensOut}{" "}
                tokens · {money(run.cost, "LKR")} · {run.ms} ms
                {run.because && " · " + run.because}
              </p>
            </div>
          ))}
        </section>
      )}

      <p className="text-[12px] text-ink-faint">
        What this layer will never do, and why: no AI telephone calls (the owner&rsquo;s decision 7); no AI deciding a
        rejection, a hold or a decline; no AI sending anything to a client or a candidate; no AI writing to the TA
        System; no AI setting a money figure. Reading CVs, scoring and matching stay in the TA System, which already
        does them.
      </p>
    </div>
  );
}
