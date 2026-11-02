import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  bookIntroCall,
  checkLeadDuplicate,
  closeLead,
  decideLeadIndustry,
  markMeetingHeld,
  markMeetingNotHeld,
} from "@/app/actions";
import { desk, leadIn, meetingsForLead } from "@/data/desk";
import { SOURCE_MEANINGS, STATE_MEANINGS, type LeadState } from "@/lib/leads";
import {
  KIND_MEANINGS,
  MAX_REBOOKS,
  STATE_MEANINGS as MEETING_STATES,
  type MeetingKind,
  type MeetingState,
} from "@/lib/meetings";
import { people as taPeople } from "@/lib/ta";
import { can, refusal } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { fakeTa } from "@/lib/ta";

/**
 * One lead, and the decisions it is waiting on (15, Phase 2 steps 3 and 4).
 *
 * Edited in place, no overlays: what we know, then the two questions that have
 * to be answered before any work starts — are they already our client, and are
 * they banking or finance. Each answer says plainly what it will do before it
 * is given, because declining for the industry is permanent.
 */
export default async function LeadPage({
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

  const db = await desk();
  const lead = leadIn(db, id);
  if (!lead) notFound();

  const mayManage = can(member, "client.manage");
  const card = "mt-4 rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const button = "rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";
  const nameOf = (who: string | null) => (who ? db.members.find((m) => m.id === who)?.name ?? "somebody" : "nobody");
  const closed = lead.state.startsWith("closed") || lead.state === "declined_industry";
  const meetings = meetingsForLead(db, lead.id);
  const next = meetings.find((m) => m.state === "booked") ?? null;
  const taSide = await taPeople();
  const taLeads = taSide.ok ? taSide.data.filter((p) => p.isActive) : [];
  const whenLocal = (at: number) =>
    new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const when = (at: number) => new Date(at).toISOString().slice(0, 16).replace("T", " ");

  return (
    <div className="max-w-[760px]">
      <Link href="/leads" className="text-[12.5px] text-brand hover:underline">
        Back to leads
      </Link>
      <h1 className="mt-2 text-[17px] font-medium">{lead.company}</h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        {STATE_MEANINGS[lead.state as LeadState] ?? lead.state} · {SOURCE_MEANINGS[lead.source as keyof typeof SOURCE_MEANINGS] ?? lead.source} ·{" "}
        {nameOf(lead.ownerId)} owns it · came in {when(lead.createdAt)}
      </p>

      {msg && <p className="mt-3 rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What we know</h2>
        <div className="mt-2 flex flex-col gap-1 text-[13.5px]">
          <p>{lead.contactName || "No name given"}</p>
          <p className="text-ink-soft">
            {lead.contactEmail || "no email"} · {lead.contactPhone || "no number"}
          </p>
          <p className="text-ink-soft">
            {lead.industry || "industry not said"}
            {lead.website ? " · " + lead.website : ""}
          </p>
          {lead.notes && <p className="mt-1 whitespace-pre-wrap">{lead.notes}</p>}
          {lead.clientTaId && (
            <p className="mt-1 text-ink-soft">Already our client in the TA System ({lead.clientTaId}).</p>
          )}
          {lead.reason && <p className="mt-1">Reason recorded: {lead.reason}</p>}
        </div>
      </section>

      {!closed && (
        <>
          <section className={card}>
            <h2 className="text-[14.5px] font-medium">Are they already our client?</h2>
            <p className="mt-1 text-[13px] text-ink-soft">
              Asks the TA System for a company with this name. An exact match is linked and the lead skips straight to
              where it belongs; anything that only looks similar is listed for you to decide, because two client records
              for one company means two owners and two agreements.
            </p>
            {fakeTa() && (
              <p className="mt-1 text-[12px] text-ink-faint">
                The TA System is still a stand-in, so it answers with sample clients.
              </p>
            )}
            {mayManage ? (
              <form action={checkLeadDuplicate} className="mt-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <button className={button}>Check the TA System</button>
              </form>
            ) : (
              <p className="mt-2 text-[13px] text-ink-faint">{refusal("client.manage")}</p>
            )}
          </section>

          <section className={card}>
            <h2 className="text-[14.5px] font-medium">Banking or finance?</h2>
            {lead.industryFlagged ? (
              <p className="mt-1 text-[13px]">
                This looks like banking or finance, because of the word <strong>{lead.industryBecause}</strong>. We do
                not work in that industry, whatever the role.
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-ink-soft">
                Nothing about this one looks like banking or finance.
                {lead.industryConfirmedBy ? " " + nameOf(lead.industryConfirmedBy) + " looked and cleared it." : ""}
              </p>
            )}
            {mayManage && lead.industryFlagged && (
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={decideLeadIndustry}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="decision" value="confirm" />
                  <button className={button}>Yes — decline them</button>
                </form>
                <form action={decideLeadIndustry}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="decision" value="clear" />
                  <button className={button}>No — they are not</button>
                </form>
              </div>
            )}
            {lead.industryFlagged && (
              <p className="mt-2 text-[12px] text-ink-faint">
                Declining is permanent: the reason is saved and they are never invited back.
              </p>
            )}
          </section>

          <section className={card}>
            <h2 className="text-[14.5px] font-medium">The intro call</h2>
            <p className="mt-1 text-[13px] text-ink-soft">
              A TA lead is on every intro call. Booking it starts two reminders: the day before at nine, and an hour
              before.
            </p>

            {meetings.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Not booked yet.</p>}

            {meetings.map((meeting) => (
              <div key={meeting.id} className="mt-3 border-t border-rule pt-3 first:border-t-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[13.5px]">{KIND_MEANINGS[meeting.kind as MeetingKind] ?? meeting.kind}</span>
                  <span className="text-[13.5px]">{whenLocal(meeting.at)}</span>
                  <span className="text-[12px] text-ink-faint">
                    {MEETING_STATES[meeting.state as MeetingState] ?? meeting.state}
                    {meeting.rebookCount > 0 ? " · attempt " + meeting.rebookCount + " of " + MAX_REBOOKS : ""}
                  </span>
                </div>
                {meeting.reason && <p className="mt-1 text-[12.5px] text-ink-soft">{meeting.reason}</p>}
                {meeting.brief && (
                  <p className="mt-1 whitespace-pre-wrap text-[13px]">
                    <span className="text-ink-soft">What they said: </span>
                    {meeting.brief}
                  </p>
                )}
                {(meeting.role || meeting.packageSaid) && (
                  <p className="mt-1 text-[12.5px] text-ink-soft">
                    {meeting.role || "position not said"} · {meeting.packageSaid || "package not said"}
                  </p>
                )}

                {mayManage && meeting.state === "booked" && (
                  <div className="mt-3 flex flex-col gap-4">
                    <form action={markMeetingHeld} className="flex flex-col gap-2">
                      <input type="hidden" name="meetingId" value={meeting.id} />
                      <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                        It happened — what did they say?
                        <textarea name="brief" rows={3} className={field} />
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                          The position
                          <input name="role" className={field} />
                        </label>
                        <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                          The package they mentioned
                          <input name="packageSaid" className={field} />
                        </label>
                      </div>
                      <button className={button}>It was held</button>
                      <p className="text-[12px] text-ink-faint">
                        This is the only record of the brief until the opening exists, so it cannot be left empty. The
                        agreement clock starts when you save.
                      </p>
                    </form>

                    <form action={markMeetingNotHeld} className="flex flex-col gap-2 border-t border-rule pt-3">
                      <input type="hidden" name="meetingId" value={meeting.id} />
                      <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                        It did not happen — why?
                        <input name="reason" className={field} />
                      </label>
                      <label className="flex items-start gap-2 text-[13px]">
                        <input type="checkbox" name="clientReplied" className="mt-0.5" />
                        <span>
                          The client is still answering us
                          <span className="block text-[12px] text-ink-faint">
                            Leave this unticked if they have gone quiet. {MAX_REBOOKS} attempts with no reply closes the
                            lead.
                          </span>
                        </span>
                      </label>
                      <button className={button}>It was not held</button>
                    </form>
                  </div>
                )}
              </div>
            ))}

            {mayManage && !next && (
              <form action={bookIntroCall} className="mt-3 flex flex-col gap-3 border-t border-rule pt-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                    When (Colombo time)
                    <input type="datetime-local" name="at" required className={field} />
                  </label>
                  <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                    Which TA lead is joining
                    {taLeads.length > 0 ? (
                      <select name="taLeadId" className={field}>
                        {taLeads.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.fullName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input name="taLeadId" placeholder="their name" className={field} />
                    )}
                  </label>
                </div>
                <button className={button}>{meetings.length ? "Book it again" : "Book the intro call"}</button>
                {!taSide.ok && (
                  <p className="text-[12px] text-ink-faint">
                    The TA System could not be asked for its people ({taSide.reason}), so type the name.
                  </p>
                )}
              </form>
            )}
          </section>

          <section className={card}>
            <h2 className="text-[14.5px] font-medium">Close this lead</h2>
            {mayManage ? (
              <form action={closeLead} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                  Why it is closing
                  <select name="state" className={field} defaultValue="closed_other">
                    <option value="closed_silent">They stopped answering</option>
                    <option value="closed_other">Something else</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                  In your own words
                  <input name="reason" className={field} />
                </label>
                <button className={button}>Close it</button>
                <p className="text-[12px] text-ink-faint">Nothing closes without a reason written down.</p>
              </form>
            ) : (
              <p className="mt-2 text-[13px] text-ink-faint">{refusal("client.manage")}</p>
            )}
          </section>
        </>
      )}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What happened to it</h2>
        {db.audit
          .filter((entry) => entry.subjectType === "lead" && entry.subjectId === lead.id)
          .sort((a, b) => b.at - a.at)
          .map((entry) => (
            <div key={entry.id} className="border-t border-rule py-2 text-[13px] first:border-t-0">
              <span>{entry.action}</span>{" "}
              <span className="text-ink-soft">
                {nameOf(entry.actorId)} · {when(entry.at)}
                {entry.reason ? " · " + entry.reason : ""}
              </span>
            </div>
          ))}
      </section>
    </div>
  );
}
