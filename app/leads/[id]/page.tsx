import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { checkLeadDuplicate, closeLead, decideLeadIndustry } from "@/app/actions";
import { desk, leadIn } from "@/data/desk";
import { SOURCE_MEANINGS, STATE_MEANINGS, type LeadState } from "@/lib/leads";
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
