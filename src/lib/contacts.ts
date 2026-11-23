/**
 * Who to write to at a client, for one position (17 Nov, supervisor review).
 *
 * A client has standard contacts, who get everything. A position can name one
 * or more extra people for that role only, such as the team lead who is hiring,
 * and anything about that role goes to them as well. Before this, a set went
 * only to the HR people TA had on its client record, and nobody at Ops could
 * add anyone.
 *
 * Pure: no database, nothing sent.
 */

export interface ContactRow {
  name: string;
  email: string;
  phone: string;
  /** "hr" is a standard contact who receives sets; anything else is kept and copied. */
  role: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Why a contact cannot be saved, or nothing when it can. */
export function problemWithContact(row: { name: string; email: string }): string | null {
  if (!row.name.trim()) return "Write the person's name.";
  if (!EMAIL.test(row.email.trim())) return "That is not an email address.";
  return null;
}

function usable(rows: { name?: string | null; email?: string | null; phone?: string | null; role?: string | null }[]): ContactRow[] {
  return rows
    .filter((c) => c.email && EMAIL.test(c.email.trim()))
    .map((c) => ({
      name: (c.name ?? "").trim(),
      email: (c.email ?? "").trim(),
      phone: (c.phone ?? "").trim(),
      role: (c.role ?? "").trim().toLowerCase(),
    }));
}

/**
 * The people to write to about this position: its own named people first, then
 * the client's standard contacts (ours, or TA's where ours is empty), with the
 * same address never twice.
 */
export function contactsFor(parts: {
  position?: ContactRow[] | null;
  client?: ContactRow[] | null;
  /** TA's own contacts for the client, used only when Ops has none of its own. */
  ta?: { name?: string | null; email?: string | null; phone?: string | null; role?: string | null }[] | null;
}): ContactRow[] {
  const ours = usable(parts.client ?? []);
  const standard = ours.length ? ours : usable(parts.ta ?? []);
  const seen = new Set<string>();
  const out: ContactRow[] = [];
  for (const row of [...usable(parts.position ?? []), ...standard]) {
    const key = row.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/**
 * Who a CV set goes to: the position's own people, and the standard contacts
 * marked "hr". Everyone else on the client's list is kept for reference.
 */
export function setRecipients(parts: Parameters<typeof contactsFor>[0]): string[] {
  const positionOnly = new Set(usable(parts.position ?? []).map((c) => c.email.toLowerCase()));
  return contactsFor(parts)
    .filter((c) => positionOnly.has(c.email.toLowerCase()) || c.role === "hr")
    .map((c) => c.email);
}

/**
 * One contact edited in place (23 Nov): somebody leaves and their replacement takes the row, or a
 * phone number changes. The address is how a row is found, and it may itself change as long as it is
 * not another row's. "Make primary" moves the row to the front and marks it hr, which is how the
 * client's Contact Point and the CV sets pick who to write to.
 */
export function contactsAfterEdit(
  contacts: ContactRow[],
  originalEmail: string,
  person: ContactRow,
  makePrimary: boolean,
): { contacts: ContactRow[] } | { problem: string } {
  const bad = problemWithContact(person);
  if (bad) return { problem: bad };
  const at = contacts.findIndex((c) => c.email.toLowerCase() === originalEmail.trim().toLowerCase());
  if (at < 0) return { problem: "That contact is gone. Reload the page." };
  const clash = contacts.some((c, i) => i !== at && c.email.toLowerCase() === person.email.trim().toLowerCase());
  if (clash) return { problem: "That address is already on the list for somebody else." };
  const edited: ContactRow = {
    name: person.name.trim(),
    email: person.email.trim(),
    phone: person.phone.trim(),
    role: makePrimary ? "hr" : person.role.trim().toLowerCase() || contacts[at].role,
  };
  const rest = contacts.filter((_, i) => i !== at);
  return { contacts: makePrimary ? [edited, ...rest] : [...rest.slice(0, at), edited, ...rest.slice(at)] };
}
