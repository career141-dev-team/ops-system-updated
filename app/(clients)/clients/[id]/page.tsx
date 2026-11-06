import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { moveClientOwner, moveClientStage, saveClientDetails, summariseClient } from "@/app/actions";
import { activeMembers, agreementForLead, aiSwitches, clientIn, desk, leadIn, member as memberIn } from "@/data/desk";
import NextStep from "@/app/NextStep";
import Part from "@/app/Part";
import { Card, Chip, Empty, Tabs } from "@/app/ui";
import { clientTabs, tabFrom } from "@/lib/tabs";
import { buildThreads, threadInWords } from "@/lib/mailbox";
import AiOffer from "@/app/AiOffer";
import { clientNextStep } from "@/lib/nextStep";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { notSaidInWords, type Summary } from "@/lib/aiTasks";
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
  searchParams: Promise<{ msg?: string; tab?: string; summary?: string; runId?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const { msg, tab, summary: summaryJson, runId } = await searchParams;

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
  const summary: Summary | null = summaryJson ? (JSON.parse(summaryJson) as Summary) : null;
  const aiOn = anyKeySet() && aiSwitches(db).on;
  const whyAiOff = aiOffReason(anyKeySet(), aiSwitches(db).on);
  const here = tabFrom(clientTabs(client.id), tab);
  // The faces of a client that used to be somewhere else entirely.
  const theirMoney = db.invoices.filter((row) => row.clientId === client.id);

  // What we have sent them, and what they sent back (24, section 7). Theirs
  // is anything filed against the client itself or against one of their own
  // things - so "what did we say to them?" is one place, not Outlook.
  const theirIds = new Set<string>([
    client.id,
    ...db.leads.filter((l) => l.clientTaId === client.taClientId).map((l) => l.id),
    ...db.clientSets.filter((c) => c.clientId === client.id).map((c) => c.id),
    ...db.invoices.filter((i) => i.clientId === client.id).map((i) => i.id),
    ...db.positions.filter((p) => p.clientId === client.id).map((p) => p.id),
  ]);
  const theirThreads = buildThreads(db.inbound, db.messages).filter(
    (thread) => thread.clientId === client.id || (thread.about && theirIds.has(thread.about.id)),
  );


  // What to do now, from their own rows (23, section 4).
  const theirPositions = db.positions.filter((p) => p.clientId === client.id);
  const theirSets = db.clientSets.filter((cs) => cs.clientId === client.id);
  const step = clientNextStep(client, {
    positions: theirPositions,
    sets: theirSets,
    owing: db.invoices.filter(
      (i) => i.clientId === client.id && (i.state === "sent" || i.state === "partly_paid"),
    ),
    holds: db.holds.filter((h) => h.clientId === client.id),
  });

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

      <NextStep where={step.where} waiting={step.waiting} clock={step.clock} />

      <Tabs tabs={clientTabs(client.id)} here={here} />

      {!aiOn && <AiOffer label="Summarise their history" why={whyAiOff ?? ""} />}

      {aiOn && (
        <section className="rounded-2xl border border-rule bg-surface px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[14.5px] font-medium">Where this client stands</h2>
            <form action={summariseClient}>
              <input type="hidden" name="clientId" value={client.id} />
              <button className="rounded-full border border-rule-strong px-3 py-1 text-[12px] hover:bg-paper">
                Summarise their history
              </button>
            </form>
          </div>
          {summary ? (
            <>
              <p className="mt-2 whitespace-pre-wrap text-[13.5px]">{summary.summary}</p>
              {summary.points?.map((point, i) => (
                <p key={i} className="mt-1 text-[13px] text-ink-soft">
                  &middot; {point}
                </p>
              ))}
              {notSaidInWords(summary.notSaid ?? []) && (
                <p className="mt-2 text-[12px] text-warning">{notSaidInWords(summary.notSaid ?? [])}</p>
              )}
              <p className="mt-2 text-[12px] text-ink-faint">
                Written from this client&rsquo;s own rows on this system, nothing else. Check it against the record
                below before you repeat it to anybody.
              </p>
            </>
          ) : (
            <p className="mt-2 text-[13px] text-ink-soft">
              Their agreements, positions, sets, invoices and holds in a paragraph, from our own rows. It is a reading
              aid, not a record.
            </p>
          )}
        </section>
      )}

      {here === "positions" && (
        <Card
          title="Positions"
          says={theirPositions.length + (theirPositions.length === 1 ? " position" : " positions")}
        >
          {theirPositions.length === 0 ? (
            <Empty what="They have not asked us to fill anything yet. A position appears here when a requirement meeting is held and the role is handed to the TA System." />
          ) : (
            <div className="flex flex-col">
              {theirPositions.map((position) => (
                <Link
                  key={position.id}
                  href={"/positions/" + position.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule py-2.5 first:border-t-0 hover:bg-sunk"
                >
                  <span className="text-[13.5px] text-brand">{position.title}</span>
                  <Chip tone={position.stage === "closed" ? "quiet" : "brand"}>{position.stage}</Chip>
                  <span className="text-[12.5px] text-ink-soft">
                    {position.openingTaId ? "opening " + position.openingTaId : "waiting for the TA System"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      {here === "agreement" && (
        <Card title="The agreement" says={esa ? esa.state : "None on file"}>
          {esa ? (
            <div className="flex flex-col gap-1 text-[13px]">
              <p>
                Version {esa.version} · {ESA_STATES[esa.state as EsaState] ?? esa.state}
              </p>
              {lead && (
                <p className="text-[12.5px] text-ink-soft">
                  It was agreed on{" "}
                  <Link href={"/leads/" + lead.id} className="text-brand hover:underline">
                    their enquiry
                  </Link>
                  , where its chases and versions are.
                </p>
              )}
            </div>
          ) : (
            <Empty what="No agreement is on file for them here. A client that came from the TA System may have signed one before this system existed; a new one is drafted from their enquiry." />
          )}
        </Card>
      )}

      {here === "money" && (
        <Card
          title="Money"
          says={theirMoney.length + (theirMoney.length === 1 ? " invoice" : " invoices")}
        >
          {theirMoney.length === 0 ? (
            <Empty what="Nothing has been invoiced to them. A fee is drafted the day somebody joins, and appears here with the thirty days it is due in." />
          ) : (
            <div className="flex flex-col">
              {theirMoney.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={"/invoices/" + invoice.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule py-2.5 first:border-t-0 hover:bg-sunk"
                >
                  <span className="text-[13.5px] text-brand">{invoice.number}</span>
                  <Chip tone={invoice.state === "paid" ? "done" : invoice.disputed ? "careful" : "quiet"}>
                    {invoice.state}
                  </Chip>
                  <span className="text-[12.5px] text-ink-soft">{invoice.kind}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      <Part
        title="What we have said to them"
        tab="messages"
        here={here}
        says={
          theirThreads.length === 0
            ? "Nothing yet"
            : theirThreads.length + (theirThreads.length === 1 ? " conversation" : " conversations")
        }
        open={false}
      >
        {theirThreads.length === 0 ? (
          <p className="text-[13px] text-ink-soft">
            Nothing has gone to them from this system yet, and nothing has come back.
          </p>
        ) : (
          theirThreads.map((thread) => (
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

      {here === "overview" && (
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
      )}

      {here === "people" && (
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
      )}

      {mayManage && stages.length > 0 && here === "overview" && (
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

      {here === "overview" && (
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
      )}

      {here === "overview" && (
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
      )}
    </div>
  );
}
