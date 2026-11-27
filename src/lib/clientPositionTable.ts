/**
 * The checks on who handles a position, and how its value is written (23 Nov; the Clients > Positions
 * table that also lived here was removed on 27 Nov).
 *
 * Pure: nothing is saved from here.
 */
/** Why a handler change is refused, or null. A handler must be a member of the team, and the reason is kept. */
export function problemWithNewHandler(newId: string, currentId: string, members: { id: string; active: boolean }[], reason: string): string | null {
  const m = members.find((x) => x.id === newId);
  if (!m || !m.active) return "Pick somebody on the team.";
  if (newId === currentId) return "That person already handles it.";
  if (reason.trim().length < 4) return "Say why the handler is changing. It is kept with the change.";
  return null;
}

/** Why a backup is refused, or null. Blank removes the backup, so it is not asked here. */
export function problemWithNewBackup(backupId: string, mainId: string, members: { id: string; active: boolean; role: string }[]): string | null {
  const m = members.find((x) => x.id === backupId);
  if (!m || !m.active || !["ops_owner", "ops_lead", "admin"].includes(m.role)) return "Pick an active Ops person.";
  if (backupId === mainId) return "The backup has to be somebody other than the main Ops person.";
  return null;
}

/** "LKR 1,200,000", or "—". */
export function moneyText(value: number | null, currency: string): string {
  return value === null ? "—" : (currency ? currency + " " : "") + value.toLocaleString("en-US");
}
