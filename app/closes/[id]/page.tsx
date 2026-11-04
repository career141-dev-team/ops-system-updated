import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { completeClose, tickCloseItem } from "@/app/actions";
import { checklistIn, clientIn, desk, member as memberIn, positionIn } from "@/data/desk";
import { CLOSE_TRIGGERS, closeInWords, problemWithCloseComplete } from "@/lib/guarantee";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** One close: the items, each ticked by whoever can actually do it. */
export default async function ClosePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const { msg } = await searchParams;

  const db = await desk();
  const checklist = checklistIn(db, id);
  if (!checklist) notFound();
  const position = checklist.positionId ? positionIn(db, checklist.positionId) : null;
  const client = checklist.clientId ? clientIn(db, checklist.clientId) : null;
  const problem = problemWithCloseComplete(checklist.items);
  const mayManage = can(me, "client.manage");

  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";
  const plain = "rounded-full border border-rule-strong px-3 py-1 text-[12px] hover:bg-paper";

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <div>
        <Link href="/closes" className="text-[12.5px] text-brand hover:underline">
          Back to the closes
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">{position?.title ?? checklist.openingTaId}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {closeInWords(checklist)} · {memberIn(db, checklist.ownerId)?.name ?? "nobody"} owns it
          {client && (
            <>
              {" · "}
              <Link href={"/clients/" + client.id} className="text-brand hover:underline">
                {client.name}
              </Link>
            </>
          )}
        </p>
        <p className="mt-1 text-[12.5px] text-ink-faint">{CLOSE_TRIGGERS[checklist.trigger] ?? checklist.trigger}</p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">The list</h2>
        {checklist.items.map((item) => (
          <div
            key={item.key}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0"
          >
            <div className="min-w-0 flex-1">
              <p className={"text-[13.5px]" + (item.doneAt ? " text-ink-faint line-through" : "")}>{item.what}</p>
              <p className="mt-0.5 text-[12px] text-ink-faint">
                {item.whose === "ta" ? "The TA does this one" : "Ours"}
                {item.doneAt && " · ticked " + whenLocal(item.doneAt)}
                {item.doneBy && " by " + (memberIn(db, item.doneBy)?.name ?? "somebody")}
              </p>
            </div>
            {!checklist.completedAt && mayManage && (
              <form action={tickCloseItem}>
                <input type="hidden" name="checklistId" value={checklist.id} />
                <input type="hidden" name="key" value={item.key} />
                <button className={plain}>{item.doneAt ? "Untick" : "Tick"}</button>
              </form>
            )}
          </div>
        ))}
        <p className="mt-3 text-[12px] text-ink-faint">
          Ticking &ldquo;close the opening&rdquo; asks the TA System to close it. That is deliberately an item of its
          own: an opening closed while a post is still live is how somebody applies to a job that has gone.
        </p>
      </section>

      {!checklist.completedAt && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Finish it</h2>
          {problem ? (
            <p className="mt-2 text-[13px] text-warning">{problem}</p>
          ) : (
            <form action={completeClose} className="mt-3 flex flex-col">
              <input type="hidden" name="checklistId" value={checklist.id} />
              <button className={button}>Everything is done — close the position</button>
            </form>
          )}
        </section>
      )}

      {checklist.completedAt && (
        <p className="text-[13px] text-ink-soft">Closed {whenLocal(checklist.completedAt)}. Nothing of it is left running.</p>
      )}
    </div>
  );
}
