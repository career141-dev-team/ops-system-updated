import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { openCloseByHand, recordLinkedInPost, requestAd, setPositionTeam } from "@/app/actions";
import {
  clientIn,
  desk,
  liveAdFor,
  liveHoldFor,
  member as memberIn,
  outboxWaiting,
  positionIn,
  requirementIn,
} from "@/data/desk";
import { adInWords } from "@/lib/adverts";
import { depthInWords } from "@/lib/depth";
import NextStep from "@/app/NextStep";
import Part from "@/app/Part";
import { Card, Chip, Empty, Tabs } from "@/app/ui";
import { positionTabs, tabFrom } from "@/lib/tabs";
import { buildThreads, threadInWords } from "@/lib/mailbox";
import { positionNextStep } from "@/lib/nextStep";
import { REQUIREMENT_FIELDS, STAGE_MEANINGS, type PositionStage, briefText, handoverInWords } from "@/lib/requirements";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { byDay, subjectsOfPosition, timeline } from "@/lib/timeline";
import { people as taPeople } from "@/lib/ta";

/** One position: the requirement behind it, and what TA has done with it. */
export default async function PositionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; tab?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const { msg, tab } = await searchParams;

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
  // Everything the search did for this position - its sets, interviews,
  // placement, invoice, guarantee, adverts - in order, in words (UX order 4).
  const history = byDay(timeline(db, subjectsOfPosition(db, position), (who) => (who ? (memberIn(db, who)?.name ?? null) : null)));
  const entries = history.reduce((n, g) => n + g.entries.length, 0);
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

  // What to do now (24, step 6). One question this page has to answer, which
  // "searching" never did: whose move is it, ours or the TA System's?
  const hold = position.openingTaId ? liveHoldFor(db, position.openingTaId) : null;
  const setsSent = db.clientSets.filter((c) => c.openingTaId === position.openingTaId && c.state === "sent").length;
  const here = tabFrom(positionTabs(position.id), tab);
  // The two faces of a position that used to be top-level places of their
  // own (25, section 6). They are listed here and open as their own pages.
  const itsSets = db.clientSets
    .filter((row) => row.openingTaId === position.openingTaId)
    .sort((a, b) => a.setNumber - b.setNumber);
  const itsInterviews = db.interviews
    .filter((row) => row.openingTaId === position.openingTaId)
    .sort((a, b) => (b.at ?? b.createdAt) - (a.at ?? a.createdAt));
  const step = positionNextStep(
    position,
    { queued, depthSaid: position.openingTaId ? depthInWords(position) : null, holdState: hold ? hold.state : null, setsSent },
    Date.now(),
  );

  // Everything said to the client about this position, including about the
  // sets that went out on it (24, section 7).
  const aboutIds = new Set<string>([
    position.id,
    ...db.clientSets.filter((c) => c.openingTaId === position.openingTaId).map((c) => c.id),
  ]);
  const itsThreads = buildThreads(db.inbound, db.messages).filter(
    (thread) => thread.about !== null && aboutIds.has(thread.about.id),
  );

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

      {/* The header above and the card here never change between tabs: moving
          to another face of this position must not lose what you came to do
          (25, section 5). */}
      <NextStep where={step.where} waiting={step.waiting} clock={step.clock} />

      <Tabs tabs={positionTabs(position.id)} here={here} />

      <Part
        title="What the client asked for"
        tab="overview"
        here={here}
        says={"The six fields, and the brief TA reads"}
        open={false}
      >
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
      </Part>

      <Part
        title="The TA side"
        tab="overview"
        here={here}
        says={position.primaryTaId ? "Primary TA set" : "No primary TA yet"}
        open={step.at === "team" || step.at === "queued"}
      >
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
      </Part>

      <Part
        title="How deep the client's shortlist is"
        tab="overview"
        here={here}
        says={(position.stage === "closed" ? "As it stood when it closed: " : "") + depthInWords(position)}
        open={step.at === "hold" || step.at === "search"}
      >
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
      </Part>

      <Part
        title="Where it is advertised"
        tab="adverts"
        here={here}
        says={position.linkedInUrl ? "On LinkedIn" + (ad ? ", and a paid advert" : "") : "Not on LinkedIn yet"}
        open={step.at === "adverts"}
      >
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
      </Part>

      <Part
        title="What the client was told"
        tab="messages"
        here={here}
        says={
          itsThreads.length === 0
            ? "Nothing yet"
            : itsThreads.length + (itsThreads.length === 1 ? " conversation" : " conversations")
        }
        open={false}
      >
        {itsThreads.length === 0 ? (
          <p className="text-[13px] text-ink-soft">Nothing has gone to the client about this position yet.</p>
        ) : (
          itsThreads.map((thread) => (
            <div key={thread.key} className="border-t border-rule py-2.5 first:border-t-0">
              <Link href={"/mail/" + encodeURIComponent(thread.key)} className="text-[13.5px] text-brand hover:underline">
                {thread.subject}
              </Link>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                {thread.withName} · {threadInWords(thread, Date.now())}
              </p>
            </div>
          ))
        )}
      </Part>

      {position.stage !== "closed" && position.openingTaId && can(me, "client.manage") && (
        <Part
          title="Closing it"
          tab="overview"
          here={here}
          says={"Only when everything on the close list is ticked"}
          open={false}
        >
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
        </Part>
      )}

      {here === "sets" && (
        <Card
          title="CV sets"
          says={itsSets.length + (itsSets.length === 1 ? " set" : " sets") + " on this position"}
        >
          {itsSets.length === 0 ? (
            <Empty what="No set has gone yet. One appears here the moment the TA System says five CVs are ready, with its due date counted from the day the agreement was signed." />
          ) : (
            <div className="flex flex-col">
              {itsSets.map((set) => (
                <Link
                  key={set.id}
                  href={"/sets/" + set.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule py-2.5 first:border-t-0 hover:bg-sunk"
                >
                  <span className="text-[13.5px] text-brand">{set.name}</span>
                  <Chip tone={set.state === "sent" ? "done" : "quiet"}>{set.state}</Chip>
                  <span className="text-[12.5px] text-ink-soft">
                    {set.candidates.length} {set.candidates.length === 1 ? "candidate" : "candidates"}
                    {set.receivedAt ? " · received" : set.sentAt ? " · sent" : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      {here === "interviews" && (
        <Card
          title="Interviews"
          says={itsInterviews.length + (itsInterviews.length === 1 ? " round" : " rounds") + " so far"}
        >
          {itsInterviews.length === 0 ? (
            <Empty what="Nobody has been interviewed yet. An interview appears here when the client shortlists somebody from a set and a time is agreed." />
          ) : (
            <div className="flex flex-col">
              {itsInterviews.map((interview) => (
                <Link
                  key={interview.id}
                  href={"/interviews/" + interview.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule py-2.5 first:border-t-0 hover:bg-sunk"
                >
                  <span className="text-[13.5px] text-brand">{interview.candidateName}</span>
                  <Chip tone="quiet">round {interview.round}</Chip>
                  <span className="text-[12.5px] text-ink-soft">
                    {interview.state}
                    {interview.decision ? " · " + interview.decision : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      <Part
        title="What happened with it"
        tab="history"
        here={here}
        says={entries === 0 ? "nothing yet" : entries + (entries === 1 ? " thing, in order" : " things, in order")}
        open={true}
      >
        {entries === 0 && (
          <p className="mt-2 text-[13px] text-ink-soft">
            Nothing yet. The first line appears the moment anything is done with this position - a set sent,
            an interview booked, a clock started.
          </p>
        )}
        {history.map((group) => (
          <div key={group.day} className="mt-3">
            <p className="text-[11.5px] uppercase tracking-[0.06em] text-ink-faint">{group.day}</p>
            {group.entries.map((entry) => (
              <div key={entry.id} className="flex gap-3 border-t border-rule py-2.5 first:border-t-0">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-rule-strong" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px]">{entry.said}</p>
                  <p className="mt-0.5 text-[12px] text-ink-soft">
                    {new Date(entry.at + 5.5 * 3_600_000).toISOString().slice(11, 16)}
                    {" · "}
                    {entry.about}
                    {entry.by ? " · " + entry.by : " · by itself"}
                    {entry.because && !entry.said.includes(entry.because) ? " · " + entry.because : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </Part>
    </div>
  );
}
