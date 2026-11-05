import Link from "next/link";
import { redirect } from "next/navigation";

import { startInterview } from "@/app/actions";
import { desk, interviewsNewestFirst, member as memberIn, positionsNewestFirst, runClocks } from "@/data/desk";
import { LIST_HEAD, ListRow, Table, Toolbar } from "@/app/ui";
import { SORTS, day, foundInWords, listed, type Listed } from "@/lib/listing";
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
export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; sort?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q, sort } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const all = interviewsNewestFirst(db);
  const rows: Listed[] = all.map((interview) => {
    const owner = memberIn(db, interview.ownerId)?.name ?? "nobody";
    return {
      id: interview.id,
      href: "/interviews/" + interview.id,
      title: interview.candidateName,
      words: [owner, interview.openingTaId, interview.applicationTaId, interview.state],
      says: interviewInWords(interview, now),
      at: interview.at ?? interview.createdAt,
      late: interview.state === "slots" && interview.slotLoops >= 3,
      who: owner,
      chips: [
        { what: "round " + interview.round, tone: "quiet" as const },
        { what: interview.state.replace(/_/g, " "), tone: interview.state === "attended" ? ("done" as const) : ("quiet" as const) },
        ...(interview.decision ? [{ what: interview.decision, tone: "brand" as const }] : []),
      ],
    };
  });
  const shown = listed(rows, q, sort);

  const openings = positionsNewestFirst(db).filter((p) => p.openingTaId && p.stage !== "closed");

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-[14.5px] font-medium">Interviews</h2>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          The client&rsquo;s side of an interview: the times, the booking, the invite to the interviewers, the
          day-before reminder, and what the client decided. The candidate stays the TA&rsquo;s — they invite them,
          phone them afterwards, and we never write to a candidate.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <Toolbar action="/interviews" q={q} sort={sort} sorts={SORTS} found={foundInWords(shown.length, rows.length, q)} />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          {rows.length === 0
            ? "Nobody has been interviewed yet. An interview starts when the client shortlists somebody from a set and a time is agreed."
            : foundInWords(0, rows.length, q)}
        </p>
      ) : (
        <Table head={LIST_HEAD}>
          {shown.map((row) => (
            <ListRow
              key={row.id}
              href={row.href}
              title={row.title}
              says={row.says}
              chips={row.chips}
              who={row.who}
              when={day(row.at)}
              late={row.late}
            />
          ))}
        </Table>
      )}

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

    </div>
  );
}
