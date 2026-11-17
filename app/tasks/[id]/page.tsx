import { notFound, redirect } from "next/navigation";

import { desk } from "@/data/desk";
import { timeLeft } from "@/lib/timers";
import { currentMember } from "@/lib/session";
import { finishTask } from "@/app/actions";
import { BackBar, PageBox, figmaField, figmaLabel, pillPrimary } from "@/app/ui/figma";

/** One task, on its own page: what it is, when it is due, what happened. */
export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { id } = await params;
  const { msg } = await searchParams;
  const task = (await desk()).tasks.find((t) => t.id === id);
  if (!task) notFound();

  const left = timeLeft(task.dueAt, Date.now());

  return (
    // Drawn like the other record pages (17 Nov): it was the last page still in the first skeleton's style.
    <PageBox width="880" className="gap-5">
      <BackBar href="/" label="My Work" />
      <div className="flex flex-col gap-1">
        <p className="text-[14px] leading-[21px] text-ink-faint">
          Task · <span className={left.tone === "late" ? "text-danger" : ""}>{left.text}</span> · {task.state}
        </p>
        <h1 className="text-[32px] font-light leading-[42px] text-ink">{task.title}</h1>
      </div>
      <p className="whitespace-pre-wrap text-[16px] leading-[26px] text-ink-soft">{task.body}</p>

      {msg && (
        <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">{msg}</p>
      )}

      {task.state === "open" ? (
        <form action={finishTask} className="flex flex-col gap-3 rounded-[24px] bg-surface p-6 shadow-float">
          <input type="hidden" name="taskId" value={task.id} />
          <label className={figmaLabel}>
            What happened?
            <input name="outcome" placeholder="Will send slots on Friday" className={figmaField} />
          </label>
          <button className={pillPrimary + " self-start"}>Done</button>
        </form>
      ) : (
        <p className="rounded-[20px] bg-sunk px-5 py-4 text-[16px] leading-[26px] text-ink-soft">{task.outcome ?? "Closed."}</p>
      )}
    </PageBox>
  );
}
