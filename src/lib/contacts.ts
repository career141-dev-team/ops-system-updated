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
