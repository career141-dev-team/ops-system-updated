/** Invented Team news for the local run only (OPS_DEV_SIGNIN=on), so the layout can be checked. Never used in production. */
import type { NewsItem } from "@/lib/inboxChannels";

export function sampleNews(now: number): NewsItem[] {
  const h = 3_600_000;
  return [
    { id: "n1", kind: "Signed", tone: "good", by: "Sample person", at: now - 1 * h, text: "Sample client: the agreement is signed (invented).", about: "Sample role", href: null },
    { id: "n2", kind: "Booked", tone: "info", by: "Sample person", at: now - 2 * h, text: "A sample candidate is booked for round 2 (invented).", about: "Sample role", href: null },
    { id: "n3", kind: "Offer", tone: "warn", by: "Sample person", at: now - 30 * h, text: "A sample offer reply is overdue (invented).", about: "Sample role", href: null },
  ];
}
