/**
 * The words on a card in the Clients directory (16 Nov, Figma 249:11696): a short eyebrow, a status
 * with a coloured dot, and when. Pure, so each case is a test.
 */

const SOURCE_SHORT: Record<string, string> = {
  website: "Website form",
  whatsapp: "WhatsApp",
  call: "Phone call",
  email: "Email",
  referral: "Referral",
  other: "Other",
};

export const sourceShort = (source: string): string => SOURCE_SHORT[source] ?? source;

/** Where an agreement is, in two words, for the top of its card. */
export function agreementEyebrow(state: string): string {
  return (
    { draft: "Drafted", sent: "Out for signing", chasing: "Being chased", negotiating: "Wants changes", signed: "Signed back" }[state] ?? "Agreement"
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2h ago", "Today", "Yesterday", "Mon", then the date: how long ago, as short as it can be said. */
export function agoShort(at: number, now: number): string {
  const colombo = (t: number) => new Date(t + 5.5 * 3_600_000);
  const minutes = Math.max(0, Math.round((now - at) / 60_000));
  if (minutes < 60) return "Just now";
  if (minutes < 6 * 60) return Math.floor(minutes / 60) + "h ago";
  const days = Math.round((Date.UTC(...ymd(colombo(now))) - Date.UTC(...ymd(colombo(at)))) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return WEEKDAYS[colombo(at).getUTCDay()];
  return colombo(at).getUTCDate() + " " + colombo(at).toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
}

function ymd(d: Date): [number, number, number] {
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}

/** The dot beside the status: red when somebody is waiting, amber when it is ours to do, blue when it is booked. */
export function dotTone(opts: { late: boolean; booked: boolean; ours: boolean }): "danger" | "warn" | "info" | "quiet" {
  return opts.late ? "danger" : opts.ours ? "warn" : opts.booked ? "info" : "quiet";
}
