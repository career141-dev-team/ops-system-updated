import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { cancelPlacement, changeJoinDate, markJoined, markNoShow, recordNoShowChoice } from "@/app/actions";
import { clientIn, desk, invoiceIn, member as memberIn, placementIn, positionIn } from "@/data/desk";
import { NO_SHOW_CHOICES, feeInWords, invoiceInWords, missingPlacementFields, money, placementInWords } from "@/lib/money";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** One placement: the joining day, what happened, and the money it starts. */
export default async function PlacementPage({
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

  const now = Date.now();
  const db = await desk();
  const placement = placementIn(db, id);
  if (!placement) notFound();
  const position = placement.positionId ? positionIn(db, placement.positionId) : null;
  const client = placement.clientId ? clientIn(db, placement.clientId) : null;
  const invoice = placement.invoiceId ? invoiceIn(db, placement.invoiceId) : null;
  const missing = missingPlacementFields(placement);
  const theirAudit = db.audit.filter((a) => a.subjectType === "placement" && a.subjectId === id).slice(0, 12);
  const mayManage = can(me, "client.manage");

  const day = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";

  return (
    <div className="flex max-w-[800px] flex-col gap-4">
      <div>
        <Link href="/placements" className="text-[12.5px] text-brand hover:underline">
          Back to the placements
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">{placement.candidateName}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {placementInWords(placement, now)} · {memberIn(db, placement.ownerId)?.name ?? "nobody"} owns it
          {position && (
            <>
              {" · "}
              <Link href={"/positions/" + position.id} className="text-brand hover:underline">
                {position.title}
              </Link>
            </>
          )}
          {client && (
            <>
              {" · "}
              <Link href={"/clients/" + client.id} className="text-brand hover:underline">
                {client.name}
              </Link>
            </>
          )}
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What the TA System sent</h2>
        <p className="mt-2 text-[13px]">
          Package:{" "}
          {placement.monthlySalary ? money(placement.monthlySalary, placement.currency) + " a month" : "not given"}
        </p>
        <p className="mt-1 text-[13px]">
          Offer letter: {placement.offerLetterFileRef ? "with the placement in TA" : "not given"}
        </p>
        <p className="mt-1 text-[13px]">
          Joining day: {placement.joinDate ? day(placement.joinDate) : "not given"}
          {placement.joinedAt && " · joined " + day(placement.joinedAt)}
        </p>
        <p className="mt-1 text-[13px]">
          Fee: {feeInWords(placement)} — from the agreement as it stood the day they were placed
        </p>
        {missing.length > 0 && (
          <p className="mt-2 text-[12.5px] text-warning">
            Missing: {missing.join(", ")}. The invoice cannot be built without the package, so this is asked of the TA
            System rather than guessed.
          </p>
        )}
        {placement.dojHistory.length > 0 && (
          <div className="mt-3 border-t border-rule pt-3">
            <p className="text-[12.5px] text-ink-soft">
              The joining day has moved {placement.dojHistory.length}{" "}
              {placement.dojHistory.length === 1 ? "time" : "times"}:
            </p>
            {placement.dojHistory.map((move, i) => (
              <p key={i} className="mt-1 text-[12px] text-ink-faint">
                {move.from ? day(move.from) : "—"} → {day(move.to)} · {move.reason}
              </p>
            ))}
          </div>
        )}
      </section>

      {placement.state === "placed" && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">The joining day</h2>
          <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">
            The TA phones them on the morning. Marking them joined drafts the invoice at once, because the thirty days
            run from their first working day whether or not anybody remembered.
          </p>

          <form action={markJoined} className="mt-3 flex flex-col">
            <input type="hidden" name="placementId" value={placement.id} />
            <button className={button}>They joined</button>
          </form>

          <form action={markNoShow} className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
            <input type="hidden" name="placementId" value={placement.id} />
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              They never turned up — what happened?
              <input name="reason" className={field} />
            </label>
            <p className="text-[12px] text-ink-faint">
              Nothing is invoiced and nothing is refunded. The client chooses a replacement or stopping, and that
              choice is drafted for them.
            </p>
            <button className={plain}>Mark a no-show</button>
          </form>

          <form action={changeJoinDate} className="mt-4 flex flex-wrap items-end gap-2 border-t border-rule pt-4">
            <input type="hidden" name="placementId" value={placement.id} />
            <label className="flex min-w-[170px] flex-col gap-1 text-[12.5px] text-ink-soft">
              The day moved to
              <input name="joinDate" type="date" className={field} />
            </label>
            <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
              Why
              <input name="reason" className={field} />
            </label>
            <button className={plain}>Move it</button>
          </form>

          <form action={cancelPlacement} className="mt-4 flex flex-wrap items-end gap-2 border-t border-rule pt-4">
            <input type="hidden" name="placementId" value={placement.id} />
            <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
              We lost them before joining — why
              <input name="reason" className={field} />
            </label>
            <button className={plain}>Cancel the placement</button>
          </form>
        </section>
      )}

      {placement.state === "no_show" && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">What the client chose</h2>
          {placement.noShowChoice ? (
            <p className="mt-2 text-[13px]">{NO_SHOW_CHOICES[placement.noShowChoice] ?? placement.noShowChoice}</p>
          ) : (
            <form action={recordNoShowChoice} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="placementId" value={placement.id} />
              <label className="flex min-w-[260px] flex-col gap-1 text-[12.5px] text-ink-soft">
                They asked for
                <select name="choice" className={field} defaultValue="replace">
                  {Object.entries(NO_SHOW_CHOICES).map(([key, what]) => (
                    <option key={key} value={key}>
                      {what}
                    </option>
                  ))}
                </select>
              </label>
              <button className={plain}>Record it</button>
            </form>
          )}
          {placement.reason && <p className="mt-2 text-[12.5px] text-ink-faint">{placement.reason}</p>}
        </section>
      )}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">The money</h2>
        {placement.isReplacementOf ? (
          <p className="mt-2 text-[13px] text-ink-soft">
            A replacement under the guarantee: nothing is invoiced again, and the guarantee starts afresh.
          </p>
        ) : invoice ? (
          <p className="mt-2 text-[13px]">
            <Link href={"/invoices/" + invoice.id} className="text-brand hover:underline">
              {invoice.number}
            </Link>{" "}
            <span className="text-ink-soft">— {invoiceInWords(invoice, now)}</span>
          </p>
        ) : (
          <p className="mt-2 text-[13px] text-ink-soft">
            Nothing invoiced yet. The fee is drafted the day they join, due thirty days from their first working day.
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What happened to it</h2>
        {theirAudit.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {theirAudit.map((entry) => (
          <div key={entry.id} className="border-t border-rule py-2 first:border-t-0">
            <p className="text-[12.5px]">
              {entry.action}
              {entry.after && <span className="text-ink-soft"> → {entry.after}</span>}
            </p>
            <p className="text-[12px] text-ink-faint">
              {whenLocal(entry.at)}
              {entry.reason && " · " + entry.reason}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
