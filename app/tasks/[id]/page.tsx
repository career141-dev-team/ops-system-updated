import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { finishTask } from "@/app/actions";
import { Card, PageTitle, PanelField, panelInput, pillPrimary } from "@/app/ui/figma";
import { desk } from "@/data/desk";
import { contextOf, firstLines } from "@/lib/myWorkView";
import { currentMember } from "@/lib/session";
import { timeLeft } from "@/lib/timers";

/** One task, on its own page: what it is, when it is due, and the one line that closes it. */
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
  const db = await desk();
  const task = db.tasks.find((t) => t.id === id);
  if (!task) notFound();

  const left = timeLeft(task.dueAt, Date.now());
  const about = contextOf(db, task);
  const sub = [about.client, about.role].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title={task.title}
        sub={
          <>
            {sub ? sub + " · " : ""}
            <span className={left.tone === "late" ? "text-danger" : ""}>{left.text}</span> · {task.state}
          </>
        }
        right={
          <Link href="/?view=tasks" className="t-body-m rounded-full border border-rule bg-surface px-4 py-2.5 hover:bg-sunk">
            All tasks
          </Link>
        }
      />
      {msg && <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">{msg}</p>}
      <Card title="What to do" sub={firstLines(task.body) || undefined} className="max-w-[880px]">
        {task.body && <p className="t-body whitespace-pre-wrap text-ink-2">{task.body}</p>}
        {task.link && (
          <Link href={task.link} className="t-body-m self-start underline">
            Open the record
          </Link>
        )}
        {task.state === "open" ? (
          <form action={finishTask} className="flex flex-col gap-3">
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="back" value="/?view=tasks" />
            <PanelField label="What happened?" hint="Nothing closes without a line about what happened.">
              <input name="outcome" placeholder="Will send slots on Friday" className={panelInput} />
            </PanelField>
            <button className={pillPrimary + " self-start"}>Done</button>
          </form>
        ) : (
          <p className="rounded-[18px] bg-sunk px-5 py-4 text-[14px] text-ink-2">{task.outcome ?? "Closed."}</p>
        )}
      </Card>
    </div>
  );
}
