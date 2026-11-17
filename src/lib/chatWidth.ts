/** Where the AURA column starts, how narrow and how wide it may be (CSS px, before the page's 90% scale), and its cookie. */
export const CHAT_WIDTH = { start: 384, min: 320, max: 720, cookie: "ops_chat_width" } as const;

/** The width to draw: the cookie's number when it is one, kept inside what the column can be. */
export function chatWidthFrom(cookie: string | undefined): number {
  const n = Number(cookie);
  return Math.min(CHAT_WIDTH.max, Math.max(CHAT_WIDTH.min, Number.isFinite(n) && n > 0 ? Math.round(n) : CHAT_WIDTH.start));
}
