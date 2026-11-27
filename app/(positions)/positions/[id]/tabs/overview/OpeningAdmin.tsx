import Link from "next/link";

import { openCloseByHand, setOpeningPeople, setPositionBackup, setPositionOwner, setPositionPriority, setPositionSalary, setPositionTeam } from "@/app/actions";
import Icon from "@/app/Icon";
import { Contacts } from "@/app/ui/Contacts";
import { Avatar, Card, RelatedLinks, figmaField, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { depthInWords } from "@/lib/depth";
import { can } from "@/lib/roles";

import type { RoleCtx } from "../ctx";

/**
 * What the v6 overview does not draw but the desk still needs: who is on the opening, the extra
 * contacts, the 100% day, the close list and the other work for this client. One quiet card at the
 * foot of the page, reached from the "..." menu in the head. Every form is the one that was here before.
 */
export default function OpeningAdmin({ c, open = false }: { c: RoleCtx; /** Open on arrival: the "..." menu link asks for it. */ open?: boolean }) {
  const { position, opsOwnerName, backupName, mayManage, clientName, taPeopleList, primaryTaPerson, taName, checklist, related, waitingOn, whenDate } = c;
  const team = position.team ?? [];
  return (
    <details id="opening-admin" open={open} className="group scroll-mt-6">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[28px] bg-surface px-6 py-[18px] shadow-card [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="t-h3">People, contacts and closing</span>
          <span className="t-small text-ink-3">{position.openingTaId ? `Opening ${position.openingTaId}${position.taStatus ? " · TA says: " + position.taStatus : ""}` : "No opening ID yet: queued for the TA System."}</span>
        </span>
        <Icon name="chevron-right" size={18} className="shrink-0 text-ink-3 transition-transform group-open:rotate-90" />
      </summary>
      <div className="mt-3">
      <Card>
        <RelatedLinks items={related} active="opening" />

        {waitingOn.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-[18px] bg-sunk px-5 py-4">
            <span className="t-micro text-ink-3">WAITING ON · REMINDERS, CHASES AND TASKS</span>
            {waitingOn.slice(0, 8).map((w) => (
              <p key={w.key} className="t-small text-ink-2">
                <span className="text-ink">{w.text}</span> · {w.when}
              </p>
            ))}
          </div>
        )}

        <div className="grid gap-6 pg-lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <span className="t-micro text-ink-3">PEOPLE ON THIS OPENING</span>
            <ul className="flex flex-col divide-y divide-rule">
              {opsOwnerName && (
                <li className="flex items-center gap-2 py-2">
                  <Avatar name={opsOwnerName} size="28" tone="brand" />
                  <span className="t-body">{opsOwnerName}</span>
                  <span className="t-small text-ink-3">Ops owner</span>
                </li>
              )}
              {backupName && (
                <li className="flex items-center gap-2 py-2">
                  <Avatar name={backupName} size="28" tone="brand" />
                  <span className="t-body">{backupName}</span>
                  <span className="t-small text-ink-3">Backup Ops</span>
                </li>
              )}
              <li className="flex items-center gap-2 py-2">
                <Avatar name={primaryTaPerson?.fullName ?? taName} size="28" tone="info" />
                <span className="t-body">{primaryTaPerson?.fullName ?? (position.primaryTaId || "Not set")}</span>
                <span className="t-small text-ink-3">Primary TA</span>
              </li>
              {team.map((t) => {
                const person = (c.taSide.ok ? c.taSide.data : []).find((p) => p.id === t.taId);
                return (
                  <li key={t.taId} className="flex items-center gap-2 py-2">
                    <Avatar name={person?.fullName ?? t.taId} size="28" tone="neutral" />
                    <span className="t-body">{person?.fullName ?? t.taId}</span>
                    {mayManage && (
                      <form action={setOpeningPeople} className="ml-auto">
                        <input type="hidden" name="positionId" value={position.id} />
                        <input type="hidden" name="op" value="remove" />
                        <input type="hidden" name="taId" value={t.taId} />
                        <button type="submit" className="t-small text-ink-3 hover:text-danger">
                          Remove
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
            {mayManage && (
              <form action={setOpeningPeople} className="flex flex-col gap-2">
                <input type="hidden" name="positionId" value={position.id} />
                <input type="hidden" name="op" value="add" />
                <span className="t-small text-ink-3">Add people, as many as you like:</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {taPeopleList
                    .filter((p) => p.id !== position.primaryTaId && !team.some((t) => t.taId === p.id))
                    .map((p) => (
                      <label key={p.id} className="t-body flex items-center gap-1.5">
                        <input type="checkbox" name="taId" value={p.id} />
                        {p.fullName}
                      </label>
                    ))}
                </div>
                <button type="submit" className={pillSecondary + " self-start"}>
                  Add them to the opening
                </button>
              </form>
            )}
            {mayManage && (
              <form action={setPositionTeam} className="flex flex-wrap items-end gap-3 border-t border-rule pt-4">
                <input type="hidden" name="positionId" value={position.id} />
                <input type="hidden" name="back" value={`/positions/${position.id}?view=overview`} />
                <label className="t-small flex min-w-[200px] flex-1 flex-col gap-1 text-ink-3">
                  Primary TA
                  <select name="primaryTaId" className={figmaField} defaultValue={position.primaryTaId ?? ""}>
                    <option value="">leave as it is</option>
                    {taPeopleList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="t-small flex flex-col gap-1 text-ink-3">
                  The 100% day
                  <input type="date" name="hundredPercentDay" defaultValue={position.hundredPercentDay ?? ""} className={figmaField} />
                </label>
                <button type="submit" className={pillSecondary}>
                  Record it
                </button>
              </form>
            )}
            {mayManage && (
              <div className="flex flex-col gap-3 border-t border-rule pt-4">
                <form action={setPositionSalary} className="flex flex-wrap items-end gap-2.5">
                  <input type="hidden" name="positionId" value={position.id} />
                  <input type="hidden" name="back" value={`/positions/${position.id}?view=overview`} />
                  <label className="t-small flex min-w-[170px] flex-1 flex-col gap-1 text-ink-3">
                    Monthly salary (gives the value)
                    <input name="salaryMonthly" inputMode="decimal" defaultValue={position.salaryMonthly || ""} className={figmaField} />
                  </label>
                  <label className="t-small flex w-24 flex-col gap-1 text-ink-3">
                    Currency
                    <input name="currency" defaultValue={position.salaryCurrency ?? ""} placeholder="LKR" className={figmaField} />
                  </label>
                  <button type="submit" className={pillSecondary}>
                    Save salary
                  </button>
                </form>
                <form action={setPositionPriority} className="flex flex-wrap items-end gap-2.5">
                  <input type="hidden" name="positionId" value={position.id} />
                  <input type="hidden" name="back" value={`/positions/${position.id}?view=overview`} />
                  <label className="t-small flex min-w-[170px] flex-1 flex-col gap-1 text-ink-3">
                    Priority
                    <select name="priority" defaultValue={position.priority ?? ""} className={figmaField}>
                      <option value="">None</option>
                      <option value="P1">P1</option>
                      <option value="P2">P2</option>
                      <option value="P3">P3</option>
                    </select>
                  </label>
                  <button type="submit" className={pillSecondary}>
                    Save priority
                  </button>
                </form>
              </div>
            )}
            {can(c.me, "task.reassign") && (
              <div className="flex flex-col gap-3 border-t border-rule pt-4">
                <form action={setPositionOwner} className="flex flex-wrap items-end gap-2.5">
                  <input type="hidden" name="positionId" value={position.id} />
                  <input type="hidden" name="back" value={`/positions/${position.id}?view=overview`} />
                  <label className="t-small flex min-w-[170px] flex-1 flex-col gap-1 text-ink-3">
                    Main Ops
                    <select name="handlerId" defaultValue={position.ownerId} className={figmaField}>
                      {c.db.members
                        .filter((m) => m.active && (m.role === "ops_owner" || m.role === "ops_lead" || m.role === "admin"))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="t-small flex min-w-[160px] flex-1 flex-col gap-1 text-ink-3">
                    Reason
                    <input name="reason" required placeholder="Why changing Main Ops" className={figmaField} />
                  </label>
                  <button type="submit" className={pillSecondary}>
                    Save Main Ops
                  </button>
                </form>
                <form action={setPositionBackup} className="flex flex-wrap items-end gap-2.5">
                  <input type="hidden" name="positionId" value={position.id} />
                  <input type="hidden" name="back" value={`/positions/${position.id}?view=overview`} />
                  <label className="t-small flex min-w-[170px] flex-1 flex-col gap-1 text-ink-3">
                    Backup Ops
                    <select name="backupId" defaultValue={position.backupOwnerId ?? ""} className={figmaField}>
                      <option value="">None</option>
                      {c.db.members
                        .filter((m) => m.active && m.id !== position.ownerId && (m.role === "ops_owner" || m.role === "ops_lead" || m.role === "admin"))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="t-small flex min-w-[160px] flex-1 flex-col gap-1 text-ink-3">
                    Reason
                    <input name="reason" required placeholder="Why changing Backup Ops" className={figmaField} />
                  </label>
                  <button type="submit" className={pillSecondary}>
                    Save Backup Ops
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <Contacts
              scope="position"
              id={position.id}
              contacts={position.contacts ?? []}
              mayManage={mayManage}
              heading="EXTRA PEOPLE FOR THIS POSITION"
              hint={`Anyone about this role only, such as the team lead who is hiring. They are written to as well as ${clientName}'s standard contacts, who are on the client's page.`}
            />
            <div className="flex flex-col gap-2 border-t border-rule pt-4">
              <span className="t-micro text-ink-3">SHORTLIST DEPTH</span>
              <p className="t-body text-ink-2">{depthInWords(position)}</p>
              {position.depthStage === "hold_at_five" && (
                <p className="t-small text-warn">No more CVs go to this client until they interview some of the five. Only the Ops Lead can send a set anyway.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-rule pt-4">
          <span className="t-micro text-ink-3">CLOSING CHECKLIST</span>
          {checklist ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="t-body text-ink-2">
                {checklist.completedAt ? `Closed ${whenDate(checklist.completedAt)}.` : `Open: ${checklist.items.filter((i) => i.doneAt).length} of ${checklist.items.length} done.`}
              </p>
              <Link href={`/closes/${checklist.id}`} className={pillPrimary}>
                Open the closing checklist
              </Link>
            </div>
          ) : position.stage !== "closed" && position.openingTaId && mayManage ? (
            <form action={openCloseByHand} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="positionId" value={position.id} />
              <label className="t-small flex min-w-[260px] flex-col gap-1 text-ink-3">
                Why it is closing
                <select name="trigger" className={figmaField} defaultValue="client_stopped">
                  <option value="client_stopped">The client stopped the search</option>
                  <option value="impractical">The role was not practical at that salary</option>
                </select>
              </label>
              <button type="submit" className={pillSecondary}>
                Open the close list
              </button>
            </form>
          ) : (
            <p className="t-body text-ink-2">
              {position.openingTaId ? "The closing checklist opens by itself when the guarantee completes or a role is stopped." : "Waiting for TA to confirm the opening ID before a closing checklist can be opened."}
            </p>
          )}
        </div>
      </Card>
      </div>
    </details>
  );
}
