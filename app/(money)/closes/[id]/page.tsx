import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { completeClose, tickCloseItem } from "@/app/actions";
import Icon from "@/app/Icon";
import { Card, PageTitle, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { checklistIn, clientIn, desk, member as memberIn, positionIn } from "@/data/desk";
import { CLOSE_TRIGGERS, problemWithCloseComplete } from "@/lib/guarantee";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * Frame 1:3365 — OP · Closing — [Role], [Client] (close the posts).
 */
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
  const clientName = client?.name ?? "Client";
  const placement =
    db.placements.find((pl) => pl.openingTaId === checklist.openingTaId && pl.state !== "cancelled") ?? null;
  const guarantee = placement
    ? db.guarantees.find((g) => g.placementId === placement.id) ?? null
    : null;

  const problem = problemWithCloseComplete(checklist.items);
  const mayManage = can(me, "client.manage");

  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const whenDate = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Close the posts"
        sub={`${position?.title ?? checklist.openingTaId} � ${clientName} � ${CLOSE_TRIGGERS[checklist.trigger] ?? checklist.trigger}`}
        right={
          <Link href={position ? `/positions/${position.id}` : "/closes"} className={pillSecondary}>
            {position ? "Back to the role" : "All closes"}
          </Link>
        }
      />

      {msg && <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">{msg}</div>}

      {/* Floating Checklist Card (1:3378) */}
      <Card>
        {checklist.items.map((item) => {
          const isDone = Boolean(item.doneAt);
          const roleBadge = item.whose === "ta" ? "TA" : "Ops";
          const subtitle = isDone
            ? `Closed ${item.doneAt ? whenLocal(item.doneAt) : ""}${
                item.doneBy ? ` · by ${memberIn(db, item.doneBy)?.name ?? "somebody"}` : ""
              }`
            : item.key === "opening"
              ? "Closes once the posts above are down"
              : item.whose === "ta"
                ? "The TA closes this one"
                : "Ops closes this one";

          return (
            <div
              key={item.key}
              className="flex flex-wrap items-center gap-3.5 border-b border-rule py-4 last:border-b-0"
            >
              {isDone ? (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ok text-ink-inverse">
                  <Icon name="check" size={12} />
                </span>
              ) : (
                <span className="size-5 shrink-0 rounded-full border-2 border-rule-strong" />
              )}

              {/* One line, the way the frame has it (249:14533): the thing, then who closes it. Who did it and when is on the tooltip. */}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5" title={subtitle}>
                <span className="text-[16px] leading-[26px] text-ink">{item.what}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sunk px-2.5 py-0.5 text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-soft">
                  <span aria-hidden="true" className={"size-[6px] rounded-full " + (roleBadge === "TA" ? "bg-info" : roleBadge === "Ops" ? "bg-success" : "bg-ink-faint")} />
                  {roleBadge}
                </span>
              </div>

              {isDone ? (
                <div className="flex items-center gap-2.5">
                  <span className="text-[14px] leading-[21px] text-ok">
                    Done
                  </span>
                  {!checklist.completedAt && mayManage && (
                    <form action={tickCloseItem}>
                      <input type="hidden" name="checklistId" value={checklist.id} />
                      <input type="hidden" name="key" value={item.key} />
                      <button
                        type="submit"
                        className="text-[11px] font-medium text-ink-faint hover:text-ink hover:underline"
                      >
                        Undo
                      </button>
                    </form>
                  )}
                </div>
              ) : !checklist.completedAt && mayManage ? (
                <form action={tickCloseItem}>
                  <input type="hidden" name="checklistId" value={checklist.id} />
                  <input type="hidden" name="key" value={item.key} />
                  <button
                    type="submit"
                    className={item.key === "opening" ? pillSecondary : pillPrimary}
                  >
                    {item.key === "opening" ? "Close opening" : "Mark closed"}
                  </button>
                </form>
              ) : (
                <span className="text-[14px] leading-[21px] text-ink-faint">Waiting</span>
              )}
            </div>
          );
        })}

        {!checklist.completedAt && mayManage && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
            {problem ? (
              <span className="text-[13px] text-warning">{problem}</span>
            ) : (
              <>
                <span className="text-[14px] text-ink-soft">
                  Every item is ticked — finish closing the position.
                </span>
                <form action={completeClose}>
                  <input type="hidden" name="checklistId" value={checklist.id} />
                  <button type="submit" className={pillPrimary}>
                    <Icon name="check" size={16} />
                    Everything is done — close the position
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {checklist.completedAt && (
          <div className="mt-2 border-t border-rule pt-4 text-[14px] font-medium text-ok">
            Closed {whenLocal(checklist.completedAt)}. Nothing of it is left running.
          </div>
        )}
      </Card>

      {/* Shield Callout Banner (1:3411): only while a guarantee is still running (18 Nov: shown for ended and void ones too). */}
      {guarantee && ["running", "warned", "replacing"].includes(guarantee.state) && (
        <div className="flex items-center gap-2.5 rounded-[16px] bg-sunk px-4 py-3.5">
          <Icon name="shield" size={18} className="shrink-0 text-ink-soft" />
          <span className="text-[14px] leading-[22px] text-ink-soft">
            Closing the posts doesn’t end the guarantee — it keeps running until {whenDate(guarantee.endsAt)}. The invoice and payment records are kept.
          </span>
        </div>
      )}
    </div>
  );
}
