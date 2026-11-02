import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { repo } from "@/data/store";
import { timeLeft } from "@/lib/timers";
import { currentMember } from "@/lib/session";
import { finishTask } from "@/app/actions";

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
  const task = repo.task(id);
  if (!task) notFound();

  const left = timeLeft(task.dueAt, Date.now());

  return (
    <div className="max-w-[640px]">
      <Link href="/" className="text-[12.5px] text-brand hover:underline">
        Back to your day
      </Link>
      <h1 className="mt-2 text-[17px] font-medium">{task.title}</h1>
      <p className="mt-0.5 text-[13px] text-ink-soft">
        {task.kind} · {left.text} · {task.state}
      </p>
      <p className="mt-3 text-[13.5px]">{task.body}</p>

      {msg && (
        <p className="mt-3 rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>
      )}

      {task.state === "open" ? (
        <form action={finishTask} className="mt-5 flex flex-col gap-3 border-t border-rule pt-4">
          <input type="hidden" name="taskId" value={task.id} />
          <label className="block">
            <span className="mb-1 block text-[12px] text-ink-soft">What happened?</span>
            <input
              name="outcome"
              placeholder="Will send slots on Friday"
              className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]"
            />
          </label>
          <button className="self-start rounded-full bg-brand px-4 py-1.5 text-[12.5px] font-medium text-white">
            Done
          </button>
        </form>
      ) : (
        <p className="mt-5 border-t border-rule pt-4 text-[13.5px] text-ink-soft">
          {task.outcome ?? "Closed."}
        </p>
      )}
    </div>
  );
}
