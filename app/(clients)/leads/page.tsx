import Link from "next/link";
import { redirect } from "next/navigation";

import { createLead } from "@/app/actions";
import { agreementForLead, desk, leadIn, leadsNewestFirst, meetingsForLead, member as memberIn, requirementForLead } from "@/data/desk";
import { leadNextStep } from "@/lib/nextStep";
import { REQUIREMENT_FIELDS } from "@/lib/requirements";
import { whereItStands } from "@/lib/esa";
import { KIND_MEANINGS, type MeetingKind, meetingsAhead, whenInWords } from "@/lib/meetings";
import { LEAD_SOURCES, SOURCE_MEANINGS, STATE_MEANINGS, type LeadState } from "@/lib/leads";
import { can, refusal } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * Leads (15, Phase 2 steps 2 to 4).
 *
 * The front door of the business, and the first screen of Phase 2. One page:
 * everything that has come in, and the form to write down a new one — because
 * a lead usually arrives while somebody is on the phone, and a second screen
 * to click through is a lead typed on paper instead.
 *
 * Two things are shown on every row without opening it: whether the industry
 * rule has flagged it, and whether anybody has decided yet.
 */
export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { msg } = await searchParams;
  const mayManage = can(member, "client.manage");

  const db = await desk();
  const leads = leadsNewestFirst(db);
  // One line per lead, from the same rule its own page uses: where it is, and
  // whose move it is (24, section 3). A state name alone said neither.
  const required = REQUIREMENT_FIELDS.filter((f) => f.required).map((f) => f.key);
  const stepFor = (lead: (typeof leads)[number]) => {
    const requirement = requirementForLead(db, lead.id);
    return leadNextStep(lead, {
      meetings: meetingsForLead(db, lead.id),
      esa: agreementForLead(db, lead.id),
      requirement,
      position: requirement ? db.positions.find((p) => p.requirementId === requirement.id) ?? null : null,
      requiredFields: required,
    });
  };
  const waiting = leads.filter((l) => l.state === "new");
  const working = leads.filter((l) => ["intro_call", "waiting_agreement", "requirement"].includes(l.state));
  const closed = leads.filter((l) => l.state.startsWith("closed") || l.state === "declined_industry");
  // The two views the desk asks for every morning (step 20): who are we
  // meeting, and which agreements are still not back. Both are the whole
  // desk's, not one person's - anybody can see that something has stalled.
  const now = Date.now();
  const ahead = meetingsAhead(db.meetings, now);
  const unsigned = db.agreements
    .filter((e) => ["sent", "chasing", "negotiating", "expired"].includes(e.state))
    .sort((a, b) => (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity));
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const nameOf = (id: string) => db.members.find((m) => m.id === id)?.name ?? "somebody";

  const row = (lead: (typeof leads)[number]) => (
    <div key={lead.id} className="border-t border-rule py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link href={"/leads/" + lead.id} className="text-[13.5px] text-brand hover:underline">
          {lead.company}
        </Link>
        <span className="text-[12px] text-ink-faint">
          {SOURCE_MEANINGS[lead.source as keyof typeof SOURCE_MEANINGS] ?? lead.source}
        </span>
        {lead.industryFlagged && (
          <span className="rounded-full border border-rule px-2 py-0.5 text-[11.5px]">
            banking or finance? · {lead.industryBecause}
          </span>
        )}
        {lead.clientTaId && <span className="text-[12px] text-ink-faint">already our client</span>}
        <span className="ml-auto text-right text-[12px] text-ink-faint">
          {STATE_MEANINGS[lead.state as LeadState] ?? lead.state}
          {" · "}
          {nameOf(lead.ownerId)}
        </span>
      </div>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">{stepFor(lead).waiting}</p>
    </div>
  );

  return (
    <div className="max-w-[860px]">
      <h2 className="text-[14.5px] font-medium">Leads</h2>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        A company has asked us to find somebody. Four things get checked: are they already ours, are they banking or
        finance, do they have a signed agreement, and who owns them. At the top: what is booked, and what has not come
        back.
      </p>

      {msg && <p className="mt-3 rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">
          Meetings booked
          <span className="ml-2 text-[12px] font-normal text-ink-faint">{ahead.length}</span>
        </h2>
        {ahead.length === 0 && (
          <p className="mt-2 text-[13px] text-ink-soft">Nothing booked in the next week.</p>
        )}
        {ahead.map((meeting) => {
          const theirLead = leadIn(db, meeting.leadId);
          const late = meeting.at < now;
          return (
            <div
              key={meeting.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0"
            >
              <span className={"text-[12.5px] " + (late ? "text-danger" : "text-ink-soft")}>
                {whenInWords(meeting.at, now)}
              </span>
              <Link href={"/leads/" + (theirLead?.id ?? "")} className="text-[13.5px] text-brand hover:underline">
                {theirLead?.company ?? "a lead that is gone"}
              </Link>
              <span className="text-[12px] text-ink-faint">
                {KIND_MEANINGS[meeting.kind as MeetingKind] ?? meeting.kind}
              </span>
              <span className="ml-auto text-[12px] text-ink-faint">
                {theirLead ? nameOf(theirLead.ownerId) : ""}
              </span>
            </div>
          );
        })}
      </section>

      <section className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">
          Agreements not back yet
          <span className="ml-2 text-[12px] font-normal text-ink-faint">{unsigned.length}</span>
        </h2>
        {unsigned.length === 0 && (
          <p className="mt-2 text-[13px] text-ink-soft">Nothing waiting on a signature.</p>
        )}
        {unsigned.map((esa) => {
          const theirLead = leadIn(db, esa.leadId);
          const over = esa.expiresAt !== null && esa.expiresAt < now;
          return (
            <div key={esa.id} className="border-t border-rule py-3 first:border-t-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <Link href={"/leads/" + esa.leadId} className="text-[13.5px] text-brand hover:underline">
                  {theirLead?.company ?? String(esa.fields.companyName ?? "a client")}
                </Link>
                <span className="text-[12px] text-ink-faint">version {esa.version}</span>
                <span className="ml-auto text-[12px] text-ink-faint">
                  {memberIn(db, esa.ownerId)?.name ?? "nobody"}
                </span>
              </div>
              <p className={"mt-0.5 text-[12.5px] " + (over ? "text-danger" : "text-ink-soft")}>
                {whereItStands({ ...esa, state: esa.state as Parameters<typeof whereItStands>[0]["state"] }, now)}
              </p>
            </div>
          );
        })}
      </section>

      <section className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">
          Nobody has looked yet
          <span className="ml-2 text-[12px] font-normal text-ink-faint">{waiting.length}</span>
        </h2>
        {waiting.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing waiting.</p>}
        {waiting.map(row)}
      </section>

      <section className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">
          In hand
          <span className="ml-2 text-[12px] font-normal text-ink-faint">{working.length}</span>
        </h2>
        {working.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing in hand.</p>}
        {/* By the state it is in: waiting on a call is not the same work as
            waiting on a signature, and one list hid the difference. */}
        {(["intro_call", "waiting_agreement", "requirement"] as LeadState[]).map((state) => {
          const theirs = working.filter((l) => l.state === state);
          if (!theirs.length) return null;
          return (
            <div key={state} className="mt-3 first:mt-2">
              <p className="text-[12.5px] text-ink-soft">
                {STATE_MEANINGS[state]}
                <span className="ml-2 text-ink-faint">{theirs.length}</span>
              </p>
              {theirs.map(row)}
            </div>
          );
        })}
      </section>

      <section className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">Write down a new lead</h2>
        {mayManage ? (
          <form action={createLead} className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                The company
                <input name="company" required className={field} />
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Where it came from
                <select name="source" className={field} defaultValue="call">
                  {LEAD_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {SOURCE_MEANINGS[source]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Who we spoke to
                <input name="contactName" className={field} />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Their email
                <input name="contactEmail" className={field} />
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Their number
                <input name="contactPhone" placeholder="077 123 4567" className={field} />
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                What they do
                <input name="industry" placeholder="manufacturing, hotels…" className={field} />
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Website
                <input name="website" className={field} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              What they asked for
              <textarea name="notes" rows={3} className={field} />
            </label>
            <button className="self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper">
              Save the lead
            </button>
            <p className="text-[12px] text-ink-faint">
              An email or a number is enough — one way to reply. You own the lead until the ops lead moves it.
            </p>
          </form>
        ) : (
          <p className="mt-2 text-[13px] text-ink-faint">{refusal("client.manage")}</p>
        )}
      </section>

      {closed.length > 0 && (
        <section className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
          <h2 className="text-[14.5px] font-medium">
            Closed
            <span className="ml-2 text-[12px] font-normal text-ink-faint">{closed.length}</span>
          </h2>
          {closed.map((lead) => (
            <div key={lead.id} className="border-t border-rule py-3 first:border-t-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <Link href={"/leads/" + lead.id} className="text-[13.5px] text-brand hover:underline">
                  {lead.company}
                </Link>
                <span className="text-[12px] text-ink-faint">{STATE_MEANINGS[lead.state as LeadState] ?? lead.state}</span>
                {lead.doNotInvite && <span className="text-[12px] text-ink-faint">never invited back</span>}
              </div>
              {lead.reason && <p className="mt-1 text-[12.5px] text-ink-soft">{lead.reason}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
