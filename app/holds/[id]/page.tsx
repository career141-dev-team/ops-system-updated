import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { approveTheHold, liftTheHold } from "@/app/actions";
import { clientIn, clientSetIn, desk, holdIn, member as memberIn } from "@/data/desk";
import { HOLD_MEANINGS, type HoldState } from "@/lib/clientFeedback";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** One hold: why it was proposed, the notice, and how it ends. */
export default async function HoldPage({
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
  const hold = holdIn(db, id);
  if (!hold) notFound();

  const mayManage = can(me, "client.manage");
  const client = hold.clientId ? clientIn(db, hold.clientId) : null;
  const set = hold.setId ? clientSetIn(db, hold.setId) : null;
  const theirAudit = db.audit.filter((a) => a.subjectType === "hold" && a.subjectId === hold.id);
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <div>
        <Link href="/holds" className="text-[12.5px] text-brand hover:underline">
          Back to held positions
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">{client?.name ?? hold.openingTaId}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {HOLD_MEANINGS[hold.state as HoldState] ?? hold.state} · {memberIn(db, hold.ownerId)?.name ?? "nobody"} owns
          it
          {set && (
            <>
              {" · "}
              <Link href={"/sets/" + set.id} className="text-brand hover:underline">
                {set.name}
              </Link>
            </>
          )}
        </p>
        <p className="mt-1 text-[13px]">{hold.reason}</p>
        {hold.liftedReason && <p className="mt-1 text-[13px]">Lifted: {hold.liftedReason}</p>}
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What happens when it goes on</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          The client is told, in a notice you approve like any other message. The TA System is told to stop working the
          opening. Nothing is lost and nothing closes: somebody is asked about it again in thirty days, and it ends only
          when a person ends it.
        </p>
        {hold.state === "on_hold" && (
          <p className="mt-2 text-[12.5px] text-ink-soft">
            On hold since {hold.heldAt ? whenLocal(hold.heldAt) : "—"}
            {hold.reviewAt ? " · next looked at " + whenLocal(hold.reviewAt) : ""}
            {hold.noticeMessageId && (
              <>
                {" · "}
                <Link href={"/messages/" + hold.noticeMessageId} className="text-brand hover:underline">
                  the notice
                </Link>
              </>
            )}
          </p>
        )}
      </section>

      {hold.state === "proposed" && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Put it on hold</h2>
          <form action={approveTheHold} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="holdId" value={hold.id} />
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              Why, in your words (the clock&apos;s own wording is kept if you leave this)
              <input name="reason" defaultValue="" placeholder={hold.reason} className={field} />
            </label>
            <button className={button}>Draft the notice and hold it</button>
          </form>
        </section>
      )}

      {hold.state !== "lifted" && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Lift it</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Any word from the client is enough. The TA System is told the opening is open again, and the feedback chase
            starts again from today.
          </p>
          <form action={liftTheHold} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="holdId" value={hold.id} />
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              What changed?
              <input name="reason" className={field} />
            </label>
            <button className={plain}>Lift the hold</button>
          </form>
        </section>
      )}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What happened to it</h2>
        {theirAudit.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {theirAudit.map((entry, i) => (
          <div key={entry.at + ":" + i} className="border-t border-rule py-2 first:border-t-0">
            <p className="text-[13px]">{entry.action}</p>
            <p className="mt-0.5 text-[12px] text-ink-soft">
              {whenLocal(entry.at)}
              {entry.reason ? " · " + entry.reason : ""}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
