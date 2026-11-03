/**
 * Calls stay human (15, Phase 1 step 24; owner's decision 7 of 1 November).
 *
 * There is no telephony here and no AI calling anybody: a call is a task with
 * a number to ring and a line about what was said afterwards. That is the
 * whole feature, and it is deliberate — the owner decided calls are a person's
 * job. What this file holds is the number tidying, the `tel:` link a phone can
 * dial, and the rule that a call is not finished until somebody writes what
 * happened.
 */

/** Sri Lanka. A local number starting 0 is the same number as +94 without it. */
const COUNTRY = "+94";

/**
 * A number as a phone can dial it.
 *
 * Numbers reach us typed by people: "077 123 4567", "0771234567",
 * "+94 77 123 4567", "94771234567". They are all one number, and a `tel:` link
 * must carry no spaces or brackets.
 */
export function tidyPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits.length >= 10 ? digits : null;
  if (digits.startsWith("94") && digits.length >= 11) return "+" + digits;
  if (digits.startsWith("0") && digits.length >= 9) return COUNTRY + digits.slice(1);
  // Anything else is kept as typed rather than guessed at: a wrong country
  // code dials a stranger.
  return digits.length >= 9 ? digits : null;
}

export function telLink(raw: string): string | null {
  const tidy = tidyPhone(raw);
  return tidy ? "tel:" + tidy : null;
}

/** Why we are ringing. The screen shows these words; the task carries them. */
export const CALL_PURPOSES: Record<string, string> = {
  "esa.stuck": "The agreement is stuck and emails have not worked",
  "feedback.chase": "The client has not sent feedback on a set",
  "interview.reconfirm": "Reconfirm an interview with the candidate or the client",
  "joining.day": "Joining day: check the person started",
  "invoice.chase": "The invoice is unpaid and the chase emails have not worked",
  other: "Something else",
};

export function purposeInWords(purpose: string): string {
  return CALL_PURPOSES[purpose] ?? purpose;
}

/**
 * Why this call cannot be written down yet, or nothing if it can.
 *
 * The owner's standing rule is that nothing closes without a reason, and a
 * call is the one thing the system cannot see for itself: if nobody writes
 * what was said, the call may as well not have happened.
 */
export function problemWithCall(input: { to: string; spokeTo: string; outcome: string }): string | null {
  if (!tidyPhone(input.to)) return "That does not look like a phone number.";
  if (!input.spokeTo.trim()) return "Write who you spoke to, or that nobody answered.";
  const outcome = input.outcome.trim();
  if (!outcome) return "Write one line about what was said.";
  if (outcome.length < 4) return "Write a little more about what was said.";
  return null;
}
