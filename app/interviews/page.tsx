import Link from "next/link";
import { redirect } from "next/navigation";

import { startInterview } from "@/app/actions";
import { desk, interviewsNewestFirst, positionsNewestFirst, runClocks } from "@/data/desk";
import { interviewInWords } from "@/lib/interviews";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * Interviews (15, Phase 5).
 *
 * Three lists, because they are three different jobs: the ones still being
 * agreed, the ones booked, and the ones held that the client has not decided
 * on. Everything a person has to do is on the interview's own page.
 */
export default async function InterviewsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const all = interviewsNewestFirst(db);
  const agreeing = all.filter((i) => i.state === "slots" || i.state === "agreed");
  const booked = all.filter((i) => i.state === "booked" || i.state === "reconfirmed");
  const waiting = all.filter((i) => i.state === "attended" && !i.decision);
  const done = all.filter(
    (i) => (i.state === "attended" && i.decision) || i.state === "cancelled" || i.state === "no_show",
  );
  const openings = positionsNewestFirst(db).filter((p) => p.openingTaId && p.stage !== "closed");

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";

  const list = (title: string, rows: typeof all, empty: string) => (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14.5px] font-medium">{title}</h2>
        <span className="text-[12.5px] text-ink-soft">{rows.length}</span>
      </div>
      {rows.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">{empty}</p>}
      {rows.map((interview) => (
        <div key={interview.id} className={row}>
          <div className="min-w-0 flex-1">
            <Link href={"/interviews/" + interview.id} className="text-[13.5px] text-brand hover:underline">
              {interview.candidateName}
            </Link>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{interviewInWords(interview, now)}</p>
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h1 className="text-[17px] font-medium">Interviews</h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          The client&rsquo;s side of an interview: the times, the booking, the invite to the interviewers, the
          day-before reminder, and what the client decided. The candidate stays the TA&rsquo;s — they invite them,
          phone them afterwards, and we never write to a candidate.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {list("Agreeing a time", agreeing, "None waiting on a time.")}
      {list("Booked", booked, "Nothing booked.")}
      {list("Held, waiting on the client", waiting, "Nothing waiting on a client’s decision.")}

      {can(me, "client.manage") && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Start an interview</h2>
          <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">
            For a candidate the client has shortlisted. The candidate&rsquo;s id and name are the TA System&rsquo;s —
            copy them from the set — and who agrees the time is the first decision.
          </p>
          <form action={startInterview} className="mt-3 flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              The opening
              <select name="openingTaId" className={field} defaultValue="">
                <option value="">— pick one —</option>
                {openings.map((p) => (
                  <option key={p.id} value={p.openingTaId ?? ""}>
                    {p.title} · {p.openingTaId}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
                The candidate&rsquo;s id in TA
                <input name="applicationTaId" placeholder="ta_a1" className={field} />
              </label>
              <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
                Their name
                <input name="candidateName" className={field} />
              </label>
              <label className="flex w-[90px] flex-col gap-1 text-[12.5px] text-ink-soft">
                Round
                <input name="round" type="number" min={1} defaultValue={1} className={field} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              Who agrees the time
              <select name="scheduler" className={field} defaultValue="us">
                <option value="us">We do — we ask the client for times</option>
                <option value="client">The client books it and tells us the date</option>
              </select>
            </label>
            <button className={button}>Start it</button>
          </form>
        </section>
      )}

      {done.length > 0 && list("Finished", done, "")}
    </div>
  );
}
