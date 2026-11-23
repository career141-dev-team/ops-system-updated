/**
 * Pure validation rules for the v6 panel actions (19 Nov):
 * manual chases, ESA invite-back dates, custom/declined refund decisions,
 * immutable history corrections, and team notes.
 *
 * Pure: no database, no I/O, so every case is unit-tested.
 */

export function problemWithManualChase(channel: string, note: string): string | null {
  const c = channel.trim();
  if (!["email", "whatsapp", "phone"].includes(c)) return "Pick how you chased them (email, WhatsApp, or phone).";
  if (note.trim().length < 3) return "Write a short note of what you sent or heard.";
  return null;
}

export function problemWithInviteBack(dateStr: string, now: number): { ok: true; dueAt: number } | { ok: false; message: string } {
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { ok: false, message: "Pick a valid invite-back date." };
  // 09:00 Colombo (UTC+05:30) = 03:30 UTC
  const dueAt = Date.parse(`${trimmed}T03:30:00.000Z`);
  if (Number.isNaN(dueAt)) return { ok: false, message: "Pick a valid invite-back date." };
  if (dueAt < now - 24 * 3_600_000) return { ok: false, message: "Pick a date from today onwards." };
  return { ok: true, dueAt };
}

export function problemWithRefundDecision(input: {
  answer: string;
  customAmount?: number | null;
  paid: number;
  reason: string;
}): string | null {
  if (!["yes", "other", "no"].includes(input.answer)) return "Pick Yes, Other amount, or No.";
  if (input.answer === "other") {
    const amt = Number(input.customAmount);
    if (!Number.isFinite(amt) || amt <= 0) return "Enter a valid refund amount greater than zero.";
    if (input.paid > 0 && amt > input.paid) return "The refund cannot be more than what was paid.";
    if (input.reason.trim().length < 4) return "Write the reason for the custom refund amount.";
  }
  if (input.answer === "no" && input.reason.trim().length < 4) {
    return "Write why the refund was declined.";
  }
  return null;
}

export function problemWithHistoryCorrection(note: string): string | null {
  const n = note.trim();
  if (n.length < 4) return "Write what needs correcting (at least 4 characters).";
  if (n.length > 500) return "Keep the correction note under 500 characters.";
  return null;
}

/**
 * A repeat post: same author, same text, within ten minutes (22 Nov). On 21 Nov the post button had
 * no waiting state, so a slow post was clicked again and the same note showed 4+ times over ~10 min.
 */
export function isRepeatTeamNote(
  notes: { authorId: string; body: string; createdAt: number }[],
  authorId: string,
  body: string,
  now: number,
): boolean {
  const b = body.trim();
  return notes.some((n) => n.authorId === authorId && n.body.trim() === b && now - n.createdAt < 600_000);
}

/**
 * The author may delete a team note (22 Nov), and so may anyone who runs the desk (23 Nov: the ops team
 * had no way to take down a note that was out of date or posted by somebody who had left).
 */
export function canDeleteTeamNote(note: { authorId: string } | undefined, memberId: string, mayModerate = false): boolean {
  return !!note && (note.authorId === memberId || mayModerate);
}

export function problemWithTeamNote(body: string): string | null {
  const b = body.trim();
  if (b.length < 2) return "Write a note before posting.";
  if (b.length > 1000) return "Keep a team note under 1,000 characters.";
  return null;
}
