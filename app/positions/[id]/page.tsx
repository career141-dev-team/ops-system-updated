import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { openCloseByHand, recordLinkedInPost, requestAd, setPositionTeam } from "@/app/actions";
import {
  clientIn,
  desk,
  liveAdFor,
  member as memberIn,
  outboxWaiting,
  positionIn,
  requirementIn,
} from "@/data/desk";
import { adInWords } from "@/lib/adverts";
import { depthInWords } from "@/lib/depth";
import { REQUIREMENT_FIELDS, STAGE_MEANINGS, type PositionStage, briefText, handoverInWords } from "@/lib/requirements";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { people as taPeople } from "@/lib/ta";

/** One position: the requirement behind it, and what TA has done with it. */
export default async function PositionPage({
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
  const position = positionIn(db, id);
  if (!position) notFound();

  const mayManage = can(me, "client.manage");
  const client = position.clientId ? clientIn(db, position.clientId) : null;
  const requirement = position.requirementId ? requirementIn(db, position.requirementId) : null;
  // Is the opening still sitting in the outbox, waiting for TA?
  const queued = outboxWaiting(db).some((o) => o.subjectType === "position" && o.subjectId === position.id);
  const taSide = await taPeople();
  const taPeopleList = taSide.ok ? taSide.data.filter((p) => p.isActive) : [];
  const ad = position.openingTaId ? liveAdFor(db, position.openingTaId) : null;
  const theirAudit = db.audit.filter((a) => a.subjectType === "position" && a.subjectId === position.id);
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <div>
        <Link href="/positions" className="text-[12.5px] text-brand hover:underline">
          Back to positions
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">{position.title}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {STAGE_MEANINGS[position.stage as PositionStage] ?? position.stage} ·{" "}
          {memberIn(db, position.ownerId)?.name ?? "nobody"} owns it
          {client && (
            <>
              {" · "}
              <Link href={"/clients/" + client.id} className="text-brand hover:underline">
                {client.name}
              </Link>
            </>
          )}
        </p>
        <p className="mt-1 text-[13px]">{handoverInWords(position, queued)}</p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What the client asked for</h2>
        {!requirement && (
          <p className="mt-1 text-[13px] text-ink-soft">
            No requirement behind this one: a TA created the opening directly. Somebody should write down what the
            client asked for, or there is nothing to answer them with.
          </p>
        )}
        {requirement && (
          <>
            <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {REQUIREMENT_FIELDS.filter((f) => (requirement.fields[f.key] ?? "").trim()).map((f) => (
                <div key={f.key}>
                  <dt className="text-[12px] text-ink-faint">{f.label}</dt>
                  <dd className="whitespace-pre-wrap text-[13.5px]">{requirement.fields[f.key]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12px] text-ink-faint">What went to the TA System, exactly as written:</p>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-rule bg-paper px-3 py-2 text-[12.5px]">
              {briefText(requirement.fields)}
            </pre>
          </>
        )}
      </section>

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">The TA side</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          {position.openingTaId
            ? "Opening " + position.openingTaId + (position.taStatus ? " · TA says: " + position.taStatus : "")
            : "No opening id yet. TA has not confirmed it, so there is nothing to show from their side."}
          {position.jdApprovedAt ? " · the JD was approved " + whenLocal(position.jdApprovedAt) : ""}
        </p>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          Primary TA: {position.primaryTaId ?? "not set"} · 100% day: {position.hundredPercentDay ?? "not set"}
        </p>
        <p className="mt-2 text-[12px] text-ink-faint">
          The TA lead decides both of these and can change the 100% day daily. Ops records it and tells the TA System;
          it never decides it.
        </p>
        {mayManage && (
          <form action={setPositionTeam} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="positionId" value={position.id} />
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              Primary TA
              <select name="primaryTaId" className={field} defaultValue={position.primaryTaId ?? ""}>
                <option value="">— leave as it is —</option>
                {taPeopleList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              The 100% day
              <input
                type="date"
                name="hundredPercentDay"
                defaultValue={position.hundredPercentDay ?? ""}
                className={field}
              />
            </label>
            <button className={plain}>Record it</button>
          </form>
        )}
      </section>

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">How deep the client&rsquo;s shortlist is</h2>
        <p className="mt-1 text-[13px]">{depthInWords(position)}</p>
        {position.depthCheckedAt && (
          <p className="mt-1 text-[12px] text-ink-faint">Counted {whenLocal(position.depthCheckedAt)}, from TA&rsquo;s own pipeline.</p>
        )}
        {position.depthStage === "hold_at_five" && (
          <p className="mt-2 text-[12.5px]">
            No more CVs go to this client until they interview some of the five. Only the ops lead can send a set
            anyway.
          </p>
        )}
        <p className="mt-2 text-[12px] text-ink-faint">
          It is counted after every client decision and every stage move the TA System tells us about, so nobody has
          to keep a tally.
        </p>
      </section>

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">Where it is advertised</h2>
        {position.linkedInUrl ? (
          <p className="mt-1 text-[13px]">
            On LinkedIn since {position.linkedInPostedAt ? whenLocal(position.linkedInPostedAt) : "—"} ·{" "}
            <a href={position.linkedInUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              the post
            </a>
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-ink-soft">
            No LinkedIn post recorded. The TA posts it — it is the first advert and it is mandatory — and the TA System
            will not let the opening go Live until the link is on it.
          </p>
        )}
        {can(me, "advert.manage") && (
          <form action={recordLinkedInPost} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="positionId" value={position.id} />
            <label className="flex min-w-[280px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
              The link to the LinkedIn post
              <input name="url" placeholder="https://www.linkedin.com/jobs/view/..." className={field} />
            </label>
            <button className={plain}>Record it</button>
          </form>
        )}
        {ad ? (
          <p className="mt-3 text-[13px]">
            TopJobs:{" "}
            <Link href={"/adverts/" + ad.id} className="text-brand hover:underline">
              {adInWords(ad, Date.now())}
            </Link>
          </p>
        ) : (
          can(me, "advert.manage") &&
          position.openingTaId && (
            <form action={requestAd} className="mt-3 flex flex-wrap items-end gap-2 border-t border-rule pt-3">
              <input type="hidden" name="positionId" value={position.id} />
              <label className="flex min-w-[260px] flex-col gap-1 text-[12.5px] text-ink-soft">
                TopJobs, the one that costs money
                <select name="kind" className={field} defaultValue="single">
                  <option value="single">The single advert &mdash; LKR 5,400</option>
                  <option value="hr_and_marketing">HR and marketing &mdash; LKR 12,700</option>
                </select>
              </label>
              <button className={plain}>Ask for it</button>
            </form>
          )
        )}
        <p className="mt-2 text-[12px] text-ink-faint">
          Talent Pulse compiles itself every Tuesday. TopJobs is asked for here, marketing makes the flyer, and it
          comes down two weeks after it goes live.
        </p>
      </section>

      {position.stage !== "closed" && position.openingTaId && can(me, "client.manage") && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Closing it</h2>
          <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">
            A guarantee ending, a refund or a write-off opens the close list by itself. This is for the other way: the
            client has stopped, or the role was never practical.
          </p>
          <form action={openCloseByHand} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="positionId" value={position.id} />
            <label className="flex min-w-[260px] flex-col gap-1 text-[12.5px] text-ink-soft">
              Why it is closing
              <select name="trigger" className={field} defaultValue="client_stopped">
                <option value="client_stopped">The client stopped the search</option>
                <option value="impractical">The role was not practical at that salary</option>
              </select>
            </label>
            <button className={plain}>Open the close list</button>
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
