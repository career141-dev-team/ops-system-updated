import Link from "next/link";
import { redirect } from "next/navigation";

import { savePositionRequirement, setPositionBackup, setPositionOwner, setPositionPriority, setPositionSalary } from "@/app/actions";
import { Card, DataTable, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import PopupBox from "@/app/ui/PopupBox";
import { desk, taRosterPeople } from "@/data/desk";
import { filterPositionRows, moneyText, positionRows } from "@/lib/clientPositionTable";
import { clientTotals, clientsLine } from "@/lib/clientsView";
import { closeHref, panelHref } from "@/lib/panel";
import { COUNT_TITLES, countItems, isCountKind, type CountKind } from "@/lib/positionCounts";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { ClientsHead, Msg } from "../../parts";

export const dynamic = "force-dynamic";

type SP = { msg?: string; q?: string; ops?: string; handler?: string; type?: string; min?: string; max?: string; currency?: string; priority?: string; backup?: string; panel?: string; on?: string; k?: string };

/**
 * Clients, positions (23 Nov, the ops team's feedback): every client's positions with the package and the
 * Ops person handling each, and an Edit on each row. It replaces the sheet the team kept by hand.
 *
 * 26 Nov (Nov 25 ops meeting): main and backup Ops, TAs, the counts (each one opens the list behind it),
 * value, priority, and filters on client type, value, priority and backup. Filters are GET params, so a link shares them.
 */
export default async function ClientPositionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const sp = await searchParams;
  const { msg, q = "", ops = "", handler = "", type = "", min = "", max = "", currency = "", priority = "", backup = "" } = sp;
  const db = await desk();
  const totals = clientTotals(db, Date.now());
  const ta = await taRosterPeople(db);
  const taList = ta.ok ? ta.data : [];
  const all = positionRows(db, (id) => taList.find((p) => p.id === id)?.fullName ?? null);
  const currencies = [...new Set(all.filter((r) => r.value !== null).map((r) => r.currency || "LKR"))].sort();
  // With only one currency there is nothing to choose, and the range is in that one.
  const inCurrency = currency || (currencies.length === 1 ? currencies[0] : "LKR");
  const rows = filterPositionRows(all, q, handler, { ops, type, min, max, currency: inCurrency, priority, backup });
  const popupRow = sp.panel === "count" && sp.on && sp.k && isCountKind(sp.k) ? (all.find((r) => r.positionId === sp.on) ?? null) : null;
  const editRow = sp.panel === "edit" && sp.on ? (all.find((r) => r.positionId === sp.on) ?? null) : null;
  const mayEdit = can(me, "client.manage");
  const mayMove = can(me, "task.reassign");
  const team = db.members.filter((m) => m.active && (m.role === "ops_owner" || m.role === "ops_lead" || m.role === "admin"));
  const filters: Record<string, string> = { ...(q ? { q } : {}), ...(ops ? { ops } : {}), ...(handler ? { handler } : {}), ...(type ? { type } : {}), ...(min ? { min } : {}), ...(max ? { max } : {}), ...(currency ? { currency } : {}), ...(priority ? { priority } : {}), ...(backup ? { backup } : {}) };
  const anyFilter = Object.keys(filters).length > 0;
  const here = "/clients/positions" + (anyFilter ? "?" + new URLSearchParams(filters).toString() : "");
  // A count is a link that opens the list behind it; a zero is plain text.
  const count = (r: (typeof rows)[number], k: CountKind) =>
    r.counts[k] > 0 ? (
      <Link key={k} href={panelHref("/clients/positions", filters, "count", r.positionId) + "&k=" + k} scroll={false} className="text-brand hover:underline">
        {r.counts[k]}
      </Link>
    ) : (
      <span key={k} className="text-ink-3">0</span>
    );
  const sel = "rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none";
  const teamOptions = (skip = "") =>
    team
      .filter((m) => m.id !== skip)
      .map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ));

  return (
    <div className="flex flex-col gap-[22px]">
      <ClientsHead tab="positions" line={clientsLine(totals)} counts={{ ...totals, positions: all.length }} q={q} filter={undefined} />
      <Msg msg={msg} />
      <Card className="gap-4 !p-6">
        <form method="get" action="/clients/positions" className="flex flex-wrap items-end gap-3">
          {q && <input type="hidden" name="q" value={q} />}
          <label className="flex flex-col gap-1">
            <span className="t-small text-ink-3">Ops person</span>
            <select name="ops" defaultValue={ops} className={sel}>
              <option value="">Anyone</option>
              {teamOptions()}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="t-small text-ink-3">Ops (main)</span>
            <select name="handler" defaultValue={handler} className={sel}>
              <option value="">Everyone</option>
              {teamOptions()}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="t-small text-ink-3">Backup ops</span>
            <select name="backup" defaultValue={backup} className={sel}>
              <option value="">Anyone</option>
              {teamOptions()}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="t-small text-ink-3">Client</span>
            <select name="type" defaultValue={type} className={sel}>
              <option value="">Local and international</option>
              <option value="local">Local</option>
              <option value="international">International</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="t-small text-ink-3">Priority</span>
            <select name="priority" defaultValue={priority} className={sel}>
              <option value="">Any</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </label>
          {currencies.length > 1 && (
            <label className="flex flex-col gap-1">
              <span className="t-small text-ink-3">Value currency</span>
              <select name="currency" defaultValue={inCurrency} className={sel}>
                {[...new Set(["LKR", ...currencies])].map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="t-small text-ink-3">Value from ({inCurrency})</span>
            <input name="min" type="number" min="0" defaultValue={min} className={sel + " w-28"} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="t-small text-ink-3">Value to ({inCurrency})</span>
            <input name="max" type="number" min="0" defaultValue={max} className={sel + " w-28"} />
          </label>
          <button type="submit" className={pillSecondary}>
            Filter
          </button>
          {anyFilter && (
            <Link href="/clients/positions" className="t-small pb-2 text-ink-3 hover:underline">
              Clear
            </Link>
          )}
        </form>
        <p className="t-small text-ink-3">
          {rows.length} of {all.length} {all.length === 1 ? "position" : "positions"}
        </p>
        <DataTable
          columns={["CLIENT", "POSITION", "OPS", "BACKUP OPS", "TA(S)", "SETS", "1ST", "2ND", "FINAL", "DROPOUT", "OFFERED", "JOINED", "VALUE", "PRIORITY", ""].map((label) => ({ label }))}
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
              r.handler,
              r.backup,
              r.tas,
              count(r, "sets"),
              count(r, "i1"),
              count(r, "i2"),
              count(r, "ifinal"),
              count(r, "dropout"),
              count(r, "offered"),
              count(r, "joined"),
              <span key="v" className="flex flex-col">
                <span>{moneyText(r.value, r.currency)}</span>
                {r.pack && <span className="t-small text-ink-3">{r.pack}{r.packFrom === "placement" ? " (as placed)" : ""}</span>}
              </span>,
              r.priority,
              mayEdit ? (
                <Link key="e" href={panelHref("/clients/positions", filters, "edit", r.positionId)} scroll={false} className="t-label text-brand hover:underline">
                  Edit
                </Link>
              ) : (
                ""
              ),
            ],
          }))}
          empty={<p className="t-body text-ink-3">{all.length === 0 ? "A position appears here when it is handed to the TA System." : "No position matches. Clear the filter or the search."}</p>}
        />
      </Card>
      {popupRow && sp.k && isCountKind(sp.k) && (
        <PopupBox title={COUNT_TITLES[sp.k]} sub={popupRow.client + " · " + popupRow.position} closeHref={closeHref("/clients/positions", { ...sp, k: undefined })}>
          <ul className="flex flex-col divide-y divide-rule">
            {countItems(db, popupRow.positionId, sp.k).map((it) => (
              <li key={it.id} className="flex flex-col py-2.5">
                <Link href={it.href} className="t-body-m hover:underline">
                  {it.title}
                </Link>
                <span className="t-small text-ink-3">{it.line}</span>
              </li>
            ))}
          </ul>
        </PopupBox>
      )}
      {editRow && mayEdit && (
        <PopupBox
          title="Edit position"
          sub={editRow.client + " · " + editRow.position}
          closeHref={closeHref("/clients/positions", filters)}
        >
          <div className="flex flex-col gap-5">
            <form action={savePositionRequirement} className="flex flex-col gap-2">
              <input type="hidden" name="positionId" value={editRow.positionId} />
              <input type="hidden" name="back" value={here} />
              <span className="t-small text-ink-3">Package</span>
              {editRow.hasRequirement && !editRow.packLocked ? (
                <>
                  <input name="field.salary" defaultValue={editRow.pack} required className={panelInput} />
                  <button type="submit" className={pillPrimary + " w-fit"}>
                    Save the package
                  </button>
                </>
              ) : (
                <p className="t-small text-ink-3">
                  {editRow.packLocked ? "The requirement is complete and locked, so a change goes through the client." : "There is no requirement to change yet. It is written on the position's Requirement tab."}
                </p>
              )}
            </form>
            <form action={setPositionSalary} className="flex flex-col gap-2 border-t border-rule pt-4">
              <input type="hidden" name="positionId" value={editRow.positionId} />
              <input type="hidden" name="back" value={here} />
              <span className="t-small text-ink-3">Monthly salary (gives the value)</span>
              <div className="flex gap-2">
                <input name="salaryMonthly" inputMode="decimal" defaultValue={editRow.salaryMonthly || ""} placeholder="Monthly" className={panelInput} />
                <input name="currency" defaultValue={editRow.currency} placeholder="LKR" className={panelInput + " !w-24"} />
              </div>
              <button type="submit" className={pillSecondary + " w-fit"}>
                Save the salary
              </button>
            </form>
            <form action={setPositionPriority} className="flex flex-col gap-2 border-t border-rule pt-4">
              <input type="hidden" name="positionId" value={editRow.positionId} />
              <input type="hidden" name="back" value={here} />
              <span className="t-small text-ink-3">Priority</span>
              <select name="priority" defaultValue={editRow.priority} className={panelInput}>
                <option value="">None</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
              <button type="submit" className={pillSecondary + " w-fit"}>
                Save the priority
              </button>
            </form>
            {mayMove ? (
              <>
                <form action={setPositionOwner} className="flex flex-col gap-2 border-t border-rule pt-4">
                  <input type="hidden" name="positionId" value={editRow.positionId} />
                  <input type="hidden" name="back" value={here} />
                  <span className="t-small text-ink-3">Ops (main)</span>
                  <select name="handlerId" defaultValue={editRow.handlerId} className={panelInput}>
                    {teamOptions()}
                  </select>
                  <input name="reason" required placeholder="Why it is moving" className={panelInput} />
                  <button type="submit" className={pillSecondary + " w-fit"}>
                    Change the main Ops
                  </button>
                </form>
                <form action={setPositionBackup} className="flex flex-col gap-2 border-t border-rule pt-4">
                  <input type="hidden" name="positionId" value={editRow.positionId} />
                  <input type="hidden" name="back" value={here} />
                  <span className="t-small text-ink-3">Backup ops</span>
                  <select name="backupId" defaultValue={editRow.backupId} className={panelInput}>
                    <option value="">No backup</option>
                    {teamOptions(editRow.handlerId)}
                  </select>
                  <input name="reason" required placeholder="Why it is changing" className={panelInput} />
                  <button type="submit" className={pillSecondary + " w-fit"}>
                    Change the backup
                  </button>
                </form>
              </>
            ) : (
              <p className="t-small border-t border-rule pt-4 text-ink-3">The Ops lead changes who handles a position.</p>
            )}
          </div>
        </PopupBox>
      )}
    </div>
  );
}
