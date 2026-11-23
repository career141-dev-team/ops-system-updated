import Link from "next/link";
import { redirect } from "next/navigation";

import { savePositionRequirement, setPositionOwner } from "@/app/actions";
import { Card, DataTable, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { desk } from "@/data/desk";
import { filterPositionRows, positionRows } from "@/lib/clientPositionTable";
import { clientTotals, clientsLine } from "@/lib/clientsView";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { ClientsHead, Msg } from "../../parts";

type SP = { msg?: string; q?: string; handler?: string };

/**
 * Clients, positions (23 Nov, the ops team's feedback): every client's positions with the package and the
 * Ops person handling each, and an Edit on each row. It replaces the sheet the team kept by hand.
 */
export default async function ClientPositionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q = "", handler = "" } = await searchParams;
  const db = await desk();
  const totals = clientTotals(db, Date.now());
  const all = positionRows(db);
  const rows = filterPositionRows(all, q, handler);
  const mayEdit = can(me, "client.manage");
  const mayMove = can(me, "task.reassign");
  const team = db.members.filter((m) => m.active && (m.role === "ops_owner" || m.role === "ops_lead" || m.role === "admin"));
  const here = "/clients/positions" + (q || handler ? "?" + new URLSearchParams({ ...(q ? { q } : {}), ...(handler ? { handler } : {}) }).toString() : "");

  return (
    <div className="flex flex-col gap-[22px]">
      <ClientsHead tab="positions" line={clientsLine(totals)} counts={totals} q={q} filter={undefined} />
      <Msg msg={msg} />
      <Card className="gap-4 !p-6">
        <form method="get" action="/clients/positions" className="flex flex-wrap items-end gap-3">
          {q && <input type="hidden" name="q" value={q} />}
          <label className="flex flex-col gap-1">
            <span className="t-small text-ink-3">Ops handler</span>
            <select name="handler" defaultValue={handler} className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none">
              <option value="">Everyone</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={pillSecondary}>
            Filter
          </button>
          {(q || handler) && (
            <Link href="/clients/positions" className="t-small pb-2 text-ink-3 hover:underline">
              Clear
            </Link>
          )}
        </form>
        <p className="t-small text-ink-3">
          {rows.length} of {all.length} {all.length === 1 ? "position" : "positions"}
        </p>
        <DataTable
          columns={[{ label: "CLIENT" }, { label: "POSITION" }, { label: "PACKAGE" }, { label: "OPS HANDLER" }, { label: "" }]}
          rows={rows.map((r) => ({
            key: r.positionId,
            cells: [
              r.clientId ? (
                <Link key="c" href={"/clients/" + r.clientId} className="hover:underline">
                  {r.client}
                </Link>
              ) : (
                r.client
              ),
              <Link key="p" href={"/positions/" + r.positionId} className="t-body-m hover:underline">
                {r.position}
              </Link>,
              r.pack ? (
                <span key="k" className="flex flex-col">
                  <span>{r.pack}</span>
                  {r.packFrom === "placement" && <span className="t-small text-ink-3">as placed</span>}
                </span>
              ) : (
                <span key="k" className="text-ink-3">Not written down</span>
              ),
              r.handler,
              mayEdit ? (
                <details key="e" className="relative">
                  <summary className="t-label cursor-pointer list-none text-brand hover:underline [&::-webkit-details-marker]:hidden">Edit</summary>
                  <div className="mt-2 flex min-w-[280px] flex-col gap-4 rounded-[14px] border border-rule bg-surface p-4">
                    <form action={savePositionRequirement} className="flex flex-col gap-2">
                      <input type="hidden" name="positionId" value={r.positionId} />
                      <input type="hidden" name="back" value={here} />
                      <span className="t-small text-ink-3">Package</span>
                      {r.hasRequirement && !r.packLocked ? (
                        <>
                          <input name="field.salary" defaultValue={r.pack} required className={panelInput} />
                          <button type="submit" className={pillPrimary + " w-fit"}>
                            Save the package
                          </button>
                        </>
                      ) : (
                        <p className="t-small text-ink-3">
                          {r.packLocked ? "The requirement is complete and locked, so a change goes through the client." : "There is no requirement to change yet. It is written on the position's Requirement tab."}
                        </p>
                      )}
                    </form>
                    {mayMove ? (
                      <form action={setPositionOwner} className="flex flex-col gap-2">
                        <input type="hidden" name="positionId" value={r.positionId} />
                        <input type="hidden" name="back" value={here} />
                        <span className="t-small text-ink-3">Ops handler</span>
                        <select name="handlerId" defaultValue={r.handlerId} className={panelInput}>
                          {team.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <input name="reason" required placeholder="Why it is moving" className={panelInput} />
                        <button type="submit" className={pillSecondary + " w-fit"}>
                          Change the handler
                        </button>
                      </form>
                    ) : (
                      <p className="t-small text-ink-3">The Ops lead changes who handles a position.</p>
                    )}
                  </div>
                </details>
              ) : (
                ""
              ),
            ],
          }))}
          empty={<p className="t-body text-ink-3">{all.length === 0 ? "A position appears here when it is handed to the TA System." : "No position matches. Clear the filter or the search."}</p>}
        />
      </Card>
    </div>
  );
}
