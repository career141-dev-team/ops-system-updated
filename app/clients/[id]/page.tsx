import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { moveClientOwner, moveClientStage, saveClientDetails } from "@/app/actions";
import { activeMembers, agreementForLead, clientIn, desk, leadIn, member as memberIn } from "@/data/desk";
import { STAGE_MEANINGS, type ClientStage, canMoveStage } from "@/lib/clients";
import { STATE_MEANINGS as ESA_STATES, type EsaState } from "@/lib/esa";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** One client, on its own page: who owns them, who pays, where they are. */
export default async function ClientPage({
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
  const client = clientIn(db, id);
  if (!client) notFound();

  const owner = memberIn(db, client.ownerId);
  const lead = client.leadId ? leadIn(db, client.leadId) : null;
  const esa = client.leadId ? agreementForLead(db, client.leadId) : null;
  const mayManage = can(me, "client.manage");
  const mayMoveOwner = can(me, "task.reassign");
  const stages = (Object.keys(STAGE_MEANINGS) as ClientStage[]).filter((s) =>
    canMoveStage(client.stage as ClientStage, s),
  );
  const theirAudit = db.audit.filter((a) => a.subjectType === "client" && a.subjectId === client.id);

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <div>
        <Link href="/clients" className="text-[12.5px] text-brand hover:underline">
          Back to clients
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">{client.name}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {STAGE_MEANINGS[client.stage as ClientStage] ?? client.stage} · {owner?.name ?? "nobody"} owns them
          {client.taClientId ? " · in the TA System" : " · not in the TA System yet"}
        </p>
        {client.reason && <p className="mt-1 text-[13px]">{client.reason}</p>}
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">Where they came from</h2>
        {lead ? (
          <p className="mt-1 text-[13px] text-ink-soft">
            <Link href={"/leads/" + lead.id} className="text-brand hover:underline">
              The lead
            </Link>{" "}
            · {lead.source} · {lead.contactName} · {lead.contactEmail}
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-ink-soft">
            No lead of ours: they were already a client of the TA System.
          </p>
        )}
        {esa && (
          <p className="mt-1 text-[13px] text-ink-soft">
            The agreement: {ESA_STATES[esa.state as EsaState] ?? esa.state} · version {esa.version}
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">Who we invoice, and their group</h2>
        {!mayManage && <p className="mt-1 text-[13px] text-ink-soft">Only an ops person changes these.</p>}
        {mayManage && (
          <form action={saveClientDetails} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="clientId" value={client.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Billing contact
                <input name="billingName" defaultValue={client.billingName} className={field} />
                <span className="text-[11.5px] text-ink-faint">The person who pays, not the person who hires.</span>
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Their email
                <input name="billingEmail" defaultValue={client.billingEmail} className={field} />
                <span className="text-[11.5px] text-ink-faint">Where the invoice and its chase go.</span>
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                WhatsApp group
                <input name="groupName" defaultValue={client.groupName} className={field} />
                <span className="text-[11.5px] text-ink-faint">
                  The group&apos;s name, so the sets go to the right one.
                </span>
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Anything worth knowing
                <input name="notes" defaultValue={client.notes} className={field} />
                <span className="text-[11.5px] text-ink-faint">Kept with the client, not in your head.</span>
              </label>
            </div>
            <button className={button}>Save</button>
          </form>
        )}
      </section>

      {mayManage && stages.length > 0 && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Move them</h2>
          <form action={moveClientStage} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="clientId" value={client.id} />
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              To
              <select name="stage" className={field} defaultValue={stages[0]}>
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_MEANINGS[stage]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              Why
              <input name="reason" className={field} />
            </label>
            <button className={button}>Move them</button>
            <p className="text-[12px] text-ink-faint">
              Going quiet needs a reason as much as closing does: in three months somebody will ask why.
            </p>
          </form>
        </section>
      )}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">Who owns them</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          One ops person owns each client. {owner?.name ?? "Nobody"} owns this one
          {mayMoveOwner ? "" : ", and only the ops lead can move it"}.
        </p>
        {mayMoveOwner && (
          <form action={moveClientOwner} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="clientId" value={client.id} />
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              To
              <select name="ownerId" className={field} defaultValue="">
                <option value="">— pick somebody —</option>
                {activeMembers(db)
                  .filter((m) => m.id !== client.ownerId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              Why
              <input name="reason" className={field} />
            </label>
            <button className={button}>Move the owner</button>
            <p className="text-[12px] text-ink-faint">
              They get a task saying the client is theirs, and the TA System is told through the outbox.
            </p>
          </form>
        )}
      </section>

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What happened to them</h2>
        {theirAudit.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {theirAudit.map((entry, i) => (
          <div key={entry.at + ":" + i} className="border-t border-rule py-2 first:border-t-0">
            <p className="text-[13px]">{entry.action}</p>
            <p className="mt-0.5 text-[12px] text-ink-soft">
              {new Date(entry.at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ")}
              {entry.reason ? " · " + entry.reason : ""}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
