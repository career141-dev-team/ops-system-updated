/**
 * What the Health screen says about the three integrations that are built and not yet live (23 Nov): Microsoft
 * (mail, Teams and the calendar), the Scoop mailbox, and WhatsApp. In plain words, one line each, saying what is
 * missing rather than only that something is.
 *
 * Microsoft's app-only token lists the permissions an admin granted it in its `roles` claim, so "Check Microsoft"
 * can name exactly which one is missing without making a single extra call. The token itself is never kept or shown.
 *
 * Pure: no network, no database.
 */

/** The application permissions the desk uses, what each is for, and which grants satisfy it (any one of them). */
export const PERMISSIONS: { what: string; any: string[] }[] = [
  { what: "Reading the mailboxes, and a Scoop's attachments", any: ["Mail.Read", "Mail.ReadWrite"] },
  { what: "Making the draft a message is sent from (to be confirmed against the tenant)", any: ["Mail.ReadWrite"] },
  { what: "Sending mail", any: ["Mail.Send"] },
  { what: "Teams meetings and the calendar", any: ["Calendars.ReadWrite"] },
  { what: "Reading a meeting's transcript", any: ["OnlineMeetingTranscript.Read.All"] },
];

/** The roles claim of a Graph token, or none when it is not a token we can read. Never throws. */
export function decodeRoles(token: string): string[] {
  try {
    const part = token.split(".")[1] ?? "";
    const json = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as { roles?: unknown };
    return Array.isArray(json.roles) ? json.roles.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return [];
  }
}

/** One line per need: granted, or the permission to ask the admin for. */
export function permissionLines(roles: string[]): string[] {
  return PERMISSIONS.map((p) => {
    const granted = p.any.find((a) => roles.includes(a));
    return p.what + ": " + (granted ? "granted (" + granted + ")" : "NOT granted, ask for " + p.any.join(" or "));
  });
}

/** The one sentence "Check Microsoft" answers with: how many are granted, and which are not. */
export function permissionSentence(roles: string[]): string {
  if (!roles.length) return "Microsoft gave a token, but it lists no application permissions: nothing has been granted with admin consent yet.";
  const lines = permissionLines(roles);
  const missing = lines.filter((l) => l.includes("NOT granted"));
  return missing.length ? "Microsoft gave a token. " + missing.join(". ") + "." : "Microsoft gave a token and every permission the desk uses is granted.";
}

export function whatsappLines(env: Record<string, string | undefined>, inbound: { count: number; lastAt: number | null }, now: number): string[] {
  const set = (k: string) => Boolean((env[k] ?? "").trim());
  const sending = set("OPS_WHATSAPP_NUMBER_ID") && set("OPS_WHATSAPP_TOKEN");
  const receiving = set("OPS_WHATSAPP_APP_SECRET") && set("OPS_WHATSAPP_VERIFY_TOKEN");
  const ago = inbound.lastAt === null ? "" : Math.max(0, Math.floor((now - inbound.lastAt) / 3_600_000)) < 1 ? ", the last within the hour" : ", the last " + Math.floor((now - inbound.lastAt) / 3_600_000) + " hours ago";
  return [
    "Sending: " + (sending ? "the Ops number is set up (it still needs OPS_SEND on)" : "the Ops number is not set up (OPS_WHATSAPP_NUMBER_ID, OPS_WHATSAPP_TOKEN)"),
    "Receiving: " + (receiving ? "the webhook is ready at /api/whatsapp" : "shut, so nothing is accepted" + (set("OPS_WHATSAPP_APP_SECRET") ? "" : " (OPS_WHATSAPP_APP_SECRET)") + (set("OPS_WHATSAPP_VERIFY_TOKEN") ? "" : " (OPS_WHATSAPP_VERIFY_TOKEN)")),
    inbound.count ? inbound.count + " message" + (inbound.count === 1 ? "" : "s") + " received" + ago : "No message has been received yet",
  ];
}

export function scoopLines(config: { mailbox: string; senders: string[] }, mailReading: boolean, batches: number, reachedAt: number | null): string[] {
  return [
    "Scoop mailbox: " + (config.mailbox || "not set (Settings, or OPS_SCOOP_MAILBOX)"),
    "Scoop senders: " + (config.senders.length ? config.senders.join(", ") : "nobody named yet (Settings, or OPS_SCOOP_SENDERS)"),
    "Reading it: " + (mailReading ? "on" : "switched off (OPS_MAIL_READ), so a Scoop by email is not read; one added by hand still is"),
    batches + (batches === 1 ? " Scoop" : " Scoops") + " so far" + (reachedAt ? ", the mailbox read up to " + new Date(reachedAt + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ") + " Colombo" : ""),
  ];
}
