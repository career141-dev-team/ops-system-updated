import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { decideRefund, markRefunded, recordLeaver } from "@/app/actions";
import { clientIn, desk, guaranteeIn, invoiceIn, member as memberIn, placementIn } from "@/data/desk";
import {
  GUARANTEE_MEANINGS,
  type GuaranteeState,
  daysLeftInWords,
  guaranteeInWords,
  refundAmount,
} from "@/lib/guarantee";
import { money } from "@/lib/money";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** One guarantee: the clock, the leaver, the replacement, the decision. */
export default async function GuaranteePage({
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
  const guarantee = guaranteeIn(db, id);
  if (!guarantee) notFound();
  const placement = placementIn(db, guarantee.placementId);
  const client = guarantee.clientId ? clientIn(db, guarantee.clientId) : null;
  const invoice = placement?.invoiceId ? invoiceIn(db, placement.invoiceId) : null;
  const paid = invoice ? invoice.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
  const theirAudit = db.audit.filter((a) => a.subjectType === "guarantee" && a.subjectId === id).slice(0, 12);

  const day = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";

  return (
    <div className="flex max-w-[800px] flex-col gap-4">
      <div>
        <Link href="/guarantees" className="text-[12.5px] text-brand hover:underline">
          Back to the guarantees
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">{guarantee.candidateName}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {guaranteeInWords(guarantee, now, db.holidays.map((h) => h.date))} · {memberIn(db, guarantee.ownerId)?.name ?? "nobody"} owns it
          {client && (
            <>
              {" · "}
              <Link href={"/clients/" + client.id} className="text-brand hover:underline">
                {client.name}
              </Link>
            </>
          )}
        </p>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          Joined {day(guarantee.startsAt)} · ninety days to {day(guarantee.endsAt)}
          {placement && (
            <>
              {" · "}
              <Link href={"/placements/" + placement.id} className="text-brand hover:underline">
                the placement
              </Link>
            </>
          )}
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">Does it hold?</h2>
        {guarantee.feePaidAt ? (
          <p className="mt-2 text-[13px]">
            The fee was paid in full on {day(guarantee.feePaidAt)}, so the guarantee holds: a replacement if somebody
            leaves.
          </p>
        ) : (
          <p className="mt-2 text-[13px] text-warning">
            The fee is not paid in full, so as things stand the guarantee does not apply — if they left today, nothing
            would be replaced and nothing refunded. It starts holding the day the fee is settled.
          </p>
        )}
        {(guarantee.state === "running" || guarantee.state === "warned") && (
          <p className="mt-2 text-[12.5px] text-ink-faint">
            {daysLeftInWords(guarantee.endsAt, now)}. The warning comes on day 75, so a wobble is heard while there is
            still time.
          </p>
        )}
      </section>

      {(guarantee.state === "running" || guarantee.state === "warned") && can(me, "client.manage") && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">They have left</h2>
          <form action={recordLeaver} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="guaranteeId" value={guarantee.id} />
            <label className="flex min-w-[160px] flex-col gap-1 text-[12.5px] text-ink-soft">
              The day they left
              <input name="leftAt" type="date" className={field} />
            </label>
            <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
              Why, as far as anybody knows
              <input name="reason" className={field} />
            </label>
            <button className={plain}>Record it</button>
          </form>
          <p className="mt-2 text-[12px] text-ink-faint">
            What happens next turns on one thing: whether the fee was paid. Paid means the position reopens and a
            replacement comes first, with sixty working days to finalise one.
          </p>
        </section>
      )}

      {guarantee.state === "replacing" && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Replacing them</h2>
          <p className="mt-2 text-[13px]">
            Left {guarantee.leftAt ? day(guarantee.leftAt) : "—"}: {guarantee.reason}
          </p>
          {guarantee.deadlineAt && (
            <p className="mt-1 text-[13px] text-ink-soft">
              Sixty working days to finalise a replacement, which runs to {day(guarantee.deadlineAt)}.
            </p>
          )}
          <p className="mt-2 text-[12.5px] text-ink-faint">
            The TA System has been asked to reopen the position. A replacement placed on it is not invoiced again, and
            starts its own ninety days.
          </p>

          {can(me, "refund.decide") && (
            <form action={decideRefund} className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
              <input type="hidden" name="guaranteeId" value={guarantee.id} />
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Decide a refund instead — the reason, which is read years later
                <input name="reason" className={field} />
              </label>
              <p className="text-[12px] text-ink-faint">
                The agreement says 50% of the fee paid, which would be{" "}
                {money(refundAmount(paid), invoice?.currency ?? "LKR")}. Replacement first: this is yours to decide,
                and the clock running out only puts the question.
              </p>
              {guarantee.deadlineAt && now < guarantee.deadlineAt && (
                <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                  <input type="checkbox" name="early" value="yes" /> I am deciding before the sixty working days are
                  up
                </label>
              )}
              <button className={plain}>Decide a refund</button>
            </form>
          )}
        </section>
      )}

      {guarantee.state === "refund_pending" && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">The refund</h2>
          <p className="mt-2 text-[13px]">
            {guarantee.refundPct}% of what was paid:{" "}
            {money(guarantee.refundAmount ?? 0, invoice?.currency ?? "LKR")}, decided by{" "}
            {memberIn(db, guarantee.decidedBy ?? "")?.name ?? "the Director"} on{" "}
            {guarantee.decidedAt ? day(guarantee.decidedAt) : "—"}.
          </p>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            Accounts raises the credit note. The credit note document waits on a template from the owner, the same as
            the invoice.
          </p>
          {can(me, "money.manage") && (
            <form action={markRefunded} className="mt-3 flex flex-col">
              <input type="hidden" name="guaranteeId" value={guarantee.id} />
              <button className={plain}>The refund has gone</button>
            </form>
          )}
        </section>
      )}

      {guarantee.state === "void" && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Void</h2>
          <p className="mt-2 text-[13px]">
            They left on {guarantee.leftAt ? day(guarantee.leftAt) : "—"} and the fee was never paid in full, so there
            was no guarantee to honour: nothing replaced and nothing refunded. {guarantee.reason}
          </p>
        </section>
      )}

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
        <p className="mt-2 text-[12px] text-ink-faint">
          {GUARANTEE_MEANINGS[guarantee.state as GuaranteeState] ?? guarantee.state}
        </p>
      </section>
    </div>
  );
}
