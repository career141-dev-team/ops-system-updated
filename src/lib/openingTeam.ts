/**
 * The people on an opening (owner, 17 Nov evening): the Primary TA, and everyone else the TA lead
 * adds, now or later. Ops keeps the list and sends it to the TA System.
 *
 * Nothing here touches a database or sends anything.
 */

/** Why this list of people cannot be saved, in words a person can act on. */
export function problemWithTeam(primaryTaId: string | null, memberIds: string[]): string | null {
  if (memberIds.some((id) => !id.trim())) return "One of the people has no id. Pick them again from the list.";
  if (new Set(memberIds).size !== memberIds.length) return "Somebody is on the list twice.";
  if (primaryTaId && memberIds.includes(primaryTaId)) {
    return "The Primary TA is already on the opening. Change the Primary TA above if somebody else leads it.";
  }
  return null;
}

/** The list after adding some people: those already there are kept once, in the order they came. */
export function withPeople(current: string[], add: string[], primaryTaId: string | null): string[] {
  const out = [...current];
  for (const id of add.map((x) => x.trim()).filter(Boolean)) {
    if (id !== primaryTaId && !out.includes(id)) out.push(id);
  }
  return out;
}
