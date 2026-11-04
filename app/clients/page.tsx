import Link from "next/link";
import { redirect } from "next/navigation";

import { clientsNewestFirst, desk, member as memberIn } from "@/data/desk";
import { STAGE_MEANINGS, type ClientStage } from "@/lib/clients";
import { clientNextStep } from "@/lib/nextStep";
import { currentMember } from "@/lib/session";

/**
 * The clients: the companies we work for (15, Phase 2 step 19).
 *
 * A lead is somebody who asked; a client is a company with an agreement
 * behind them. One record each, one owner each, and the two things that live
 * in somebody's inbox today - who we invoice and which WhatsApp group is
 * theirs - kept here instead.
 */
export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  const db = await desk();
  const clients = clientsNewestFirst(db);
  // The same rule the client's own page uses, so the list cannot say one
  // thing and the page another (24, section 3).
  const stepFor = (client: (typeof clients)[number]) =>
    clientNextStep(client, {
      positions: db.positions.filter((p) => p.clientId === client.id),
      sets: db.clientSets.filter((c) => c.clientId === client.id),
      owing: db.invoices.filter(
        (i) => i.clientId === client.id && (i.state === "sent" || i.state === "partly_paid"),
      ),
      holds: db.holds.filter((h) => h.clientId === client.id),
    });
  const order: ClientStage[] = ["active", "onboarding", "lead", "dormant", "closed"];

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[17px] font-medium">Clients</h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          A company we work for. The record is made when they turn out to be a client the TA System already has, or
          when the agreement is countersigned — nobody types one by hand.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {clients.length === 0 && (
        <section className={card}>
          <p className="text-[13px] text-ink-soft">
            No clients yet. The first one appears the moment an agreement is countersigned.
          </p>
        </section>
      )}

      {order.map((stage) => {
        const theirs = clients.filter((c) => c.stage === stage);
        if (!theirs.length) return null;
        return (
          <section key={stage} className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[14.5px] font-medium">{STAGE_MEANINGS[stage]}</h2>
              <span className="text-[12.5px] text-ink-soft">{theirs.length}</span>
            </div>
            {theirs.map((client) => (
              <div key={client.id} className={row}>
                <div className="min-w-0 flex-1">
                  <Link href={"/clients/" + client.id} className="text-[13.5px] text-brand hover:underline">
                    {client.name}
                  </Link>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">{stepFor(client).waiting}</p>
                </div>
                <span className="text-[12.5px] text-ink-soft">
                  {memberIn(db, client.ownerId)?.name ?? "nobody"}
                </span>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
