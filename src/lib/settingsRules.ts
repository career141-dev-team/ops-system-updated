/**
 * What a settings change is allowed to do (2 Nov).
 *
 * Two rules learned the moment the screen was first clicked:
 *
 *   **A switch is flipped, not set.** The new value used to travel from the
 *   page in a hidden field, so whatever arrived decided the answer. Now the
 *   server inverts what it already holds and ignores the page entirely.
 *
 *   **Outreach is never switched on from a screen.** It is the one setting
 *   that lets a real message reach a real client, and the rule the TA System
 *   lives by is that it is turned on by the owner at release time, by hand, not
 *   by a button somebody can press by accident. The same rule here.
 */

export const LOCKED_SETTINGS = ["switch.outreachLive"];

export type SettingChange =
  | { ok: true; value: string | number | boolean }
  | { ok: false; message: string };

export function settingChange(
  key: string,
  current: string | number | boolean,
  raw: string,
  reason: string,
): SettingChange {
  if (!reason.trim()) {
    return { ok: false, message: "Say why it is changing before you save it." };
  }

  if (LOCKED_SETTINGS.includes(key)) {
    return {
      ok: false,
      message:
        "Outreach is switched on by the owner when the system is released, not from this screen. " +
        "While it is off, every message goes to the test address instead of the client.",
    };
  }

  if (typeof current === "boolean") {
    // Flipped, never set: nothing the page sends can decide this.
    return { ok: true, value: !current };
  }

  if (typeof current === "number") {
    // An empty box is not zero. It used to be, because Number("") is 0, which
    // would have quietly set a limit to nothing.
    if (!raw.trim()) return { ok: false, message: key + " cannot be left empty." };
    const value = Number(raw.trim());
    if (!Number.isFinite(value)) return { ok: false, message: key + " has to be a number." };
    if (value < 0) return { ok: false, message: key + " cannot be less than nothing." };
    return { ok: true, value };
  }

  const text = raw.trim();
  // Empty interviewers means "the leadership on the team list".
  if (!text && key !== "hiring.interviewers") return { ok: false, message: key + " cannot be left empty." };
  return { ok: true, value: text };
}
