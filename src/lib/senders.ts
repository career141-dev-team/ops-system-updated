import "server-only";

/**
 * The two senders: email through Microsoft Graph, WhatsApp through Meta
 * (15, Part F1 and F2).
 *
 * These are the only two places in Ops where something actually leaves the
 * building, and they are deliberately dull. Everything that decides *whether*
 * to send has already happened in `messages.ts` — approval, the do-not-contact
 * list, the daily cap, test mode. By the time a sender is called the decision
 * is made, so a sender only does the sending, and says plainly what happened.
 *
 * Three rules all three layers agree on, which is the point of having three:
 *
 *   **Off by default.** `OPS_SEND` must say `on`. Unset, a sender returns a
 *   reason a person can read, and the message is recorded as blocked rather
 *   than quietly dropped.
 *   **A hard time limit, and no retry.** A send that hangs must not take the
 *   screen with it, and a retried send is how a client gets the same email
 *   twice (the TA System's 2 Oct double reply).
 *   **An allow-list under everything.** Even with sending on, `OPS_OUTBOUND_LOCK`
 *   permits only named addresses and numbers. This is the layer that makes a
 *   preview safe to click around in, because the database will one day hold
 *   real client contacts.
 *
 * Sending from the person, not from a shared box, is the mailbox decision of
 * 2 Nov: the client sees Rushda and replies to Rushda, and the common box is
 * copied so the thread is not hers alone. The reader reads both.
 */

import { referenceFor } from "./mailMatch";

export interface SendOutcome {
  ok: boolean;
  /** What the mail server or Meta called the message. Kept for reply matching. */
  providerMessageId: string | null;
  /** Said on the screen, whether it went or not. */
  reason: string | null;
}

export const SEND_TIME_LIMIT_MS = 20_000;

/** Sending is off until somebody says otherwise, on every deployment. */
export function sendingEnabled(): boolean {
  return (process.env.OPS_SEND ?? "").trim().toLowerCase() === "on";
}

const list = (name: string) =>
  (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * The environment's own veto on reaching real people (6 Nov).
 *
 * Test mode has always been real - `switch.outreachLive` in Settings, which
 * sends every client message to the test address instead - but that switch
 * lives in the database, so it travels with the data. Restore a production
 * backup onto a laptop to rehearse the restore, as 22 tells you to, and the
 * switch arrives saying "on".
 *
 * So the environment gets a veto the data cannot carry. Both have to agree:
 * this says the machine may talk to the outside world at all, the setting says
 * the desk is doing it for real. Off here and every client message goes to the
 * test address, whatever the database thinks.
 *
 * This is also the switch `.env.example`, 15 and 22 have named all along, while
 * nothing read it. Now something does.
 */
export function outreachLiveInEnv(): boolean {
  return (process.env.OPS_OUTREACH_LIVE ?? "").trim().toLowerCase() === "on";
}

/**
 * Which of the two is off, said on the Health screen.
 *
 * "Test mode" on its own sends somebody looking in the wrong place: the
 * setting and the environment are in different buildings, and a person
 * checking one never thinks of the other.
 */
export function outreachInWords(inEnv: boolean, onTheDesk: boolean): string {
  if (inEnv && onTheDesk) return "on - real clients receive what we send";
  if (!inEnv && !onTheDesk) return "test mode - neither this machine nor the desk has it on";
  if (!inEnv) return "test mode - the desk has it on, but this machine does not permit it (OPS_OUTREACH_LIVE)";
  return "test mode - this machine permits it, but the desk has not switched it on (switch.outreachLive)";
}

export function outboundLocked(): boolean {
  return (process.env.OPS_OUTBOUND_LOCK ?? "").trim().toLowerCase() === "on";
}

/** Every address must be allowed, not just the first one. */
export function emailAllowed(to: string[]): boolean {
  if (!outboundLocked()) return true;
  const allowed = list("OPS_OUTBOUND_ALLOW_EMAILS").map((a) => a.toLowerCase());
  return to.length > 0 && to.every((address) => allowed.includes(address.trim().toLowerCase()));
}

/**
 * Compared on the last nine digits: one number is written +94 77…, 94 77… and
 * 077… by three different people. Copied from the TA System's outbound guard,
 * which learned this on real numbers.
 */
export function phoneAllowed(to: string): boolean {
  if (!outboundLocked()) return true;
  const digits = (s: string) => s.replace(/\D/g, "");
  const d = digits(to);
  if (d.length < 7) return false;
  return list("OPS_OUTBOUND_ALLOW_PHONES").some((a) => {
    const allowed = digits(a);
    return allowed.length >= 7 && allowed.slice(-9) === d.slice(-9);
  });
}

/**
 * Our reference goes in every subject we send, because it is the one thing that
 * matches a reply back with certainty. Added here rather than at drafting time
 * so it cannot be edited out of a draft by accident.
 */
export function subjectWithReference(subject: string, subjectType: string | null, subjectId: string | null): string {
  if (!subjectType || !subjectId) return subject;
  if (/\[C141-[^\]]*\]/i.test(subject)) return subject;
  return (subject + " " + referenceFor(subjectType, subjectId)).trim();
}

/* ── Email, through Microsoft Graph ──────────────────────────────────────── */

const GRAPH = "https://graph.microsoft.com/v1.0";

export async function graphToken(): Promise<string | null> {
  const tenant = process.env.MS_TENANT_ID ?? "";
  const id = process.env.MS_CLIENT_ID ?? "";
  const secret = process.env.MS_CLIENT_SECRET ?? "";
  if (!tenant || !id || !secret) return null;

  const response = await fetch("https://login.microsoftonline.com/" + tenant + "/oauth2/v2.0/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    signal: AbortSignal.timeout(SEND_TIME_LIMIT_MS),
  });
  if (!response.ok) return null;
  return ((await response.json()) as { access_token?: string }).access_token ?? null;
}

export interface EmailToSend {
  /** The ops person's own mailbox. The client sees them, and replies to them. */
  from: string;
  to: string[];
  subject: string;
  body: string;
  /** Files that go with it, read from the file registry (3 Nov). */
  attachments?: { name: string; mime: string; bytes: Uint8Array }[];
  /**
   * The message this one answers (5 Nov).
   *
   * Without it a reply arrives as a new email beside the conversation, which
   * is exactly what made people go back to Outlook. Microsoft threads on the
   * headers, so they are set on the draft rather than on the send.
   */
  inReplyTo?: string | null;
}

/**
 * The biggest file Microsoft takes in one go.
 *
 * Over this a send needs an upload session, which is a different dance. An
 * agreement is a few hundred kilobytes, so rather than build the dance now
 * this refuses and says so.
 */
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

/**
 * Sends as a draft and then sends the draft, rather than Graph's one-step
 * `sendMail`.
 *
 * `sendMail` returns nothing at all, so there would be no way to learn what
 * the message was called — and without that, a reply can never be matched to
 * its thread. Creating the draft hands back the whole message, including
 * `internetMessageId`, which is exactly what a client's reply quotes in
 * `In-Reply-To`. The id we used to invent instead was the first loophole found
 * on 2 Nov.
 */
export async function sendEmail(mail: EmailToSend): Promise<SendOutcome> {
  if (!sendingEnabled()) return { ok: false, providerMessageId: null, reason: "Sending is switched off (OPS_SEND)." };
  if (!mail.from) return { ok: false, providerMessageId: null, reason: "Nobody is named as the sender." };
  if (!emailAllowed(mail.to)) {
    return { ok: false, providerMessageId: null, reason: "The outbound lock allows only named addresses, and these are not on it." };
  }

  const stop = AbortSignal.timeout(SEND_TIME_LIMIT_MS);
  try {
    const token = await graphToken();
    if (!token) return { ok: false, providerMessageId: null, reason: "Microsoft would not give us a token." };
    const auth = { authorization: "Bearer " + token, "content-type": "application/json" };
    const mailbox = GRAPH + "/users/" + encodeURIComponent(mail.from);

    // The common box is copied, so a client thread is never one person's alone.
    const copyTo = (process.env.OPS_COMMON_MAILBOX ?? "").trim();
    const draft = await fetch(mailbox + "/messages", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        subject: mail.subject,
        body: { contentType: "Text", content: mail.body },
        toRecipients: mail.to.map((address) => ({ emailAddress: { address } })),
        ccRecipients: copyTo && !mail.to.includes(copyTo) ? [{ emailAddress: { address: copyTo } }] : [],
        ...(mail.inReplyTo
          ? {
              internetMessageHeaders: [
                { name: "In-Reply-To", value: mail.inReplyTo },
                { name: "References", value: mail.inReplyTo },
              ],
            }
          : {}),
      }),
      signal: stop,
    });
    if (!draft.ok) {
      return { ok: false, providerMessageId: null, reason: "Microsoft refused the draft (" + draft.status + ")." };
    }
    const created = (await draft.json()) as { id?: string; internetMessageId?: string };
    if (!created.id) return { ok: false, providerMessageId: null, reason: "Microsoft made a draft without naming it." };

    // The files go onto the draft, before it is sent. If one will not attach the
    // send stops: a cover email with no agreement attached is worse than none.
    for (const file of mail.attachments ?? []) {
      if (file.bytes.byteLength > MAX_ATTACHMENT_BYTES) {
        return {
          ok: false,
          providerMessageId: null,
          reason: file.name + " is too big to attach (over " + MAX_ATTACHMENT_BYTES / 1024 / 1024 + " MB).",
        };
      }
      const added = await fetch(mailbox + "/messages/" + encodeURIComponent(created.id) + "/attachments", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: file.name,
          contentType: file.mime,
          contentBytes: Buffer.from(file.bytes).toString("base64"),
        }),
        signal: stop,
      });
      if (!added.ok) {
        return { ok: false, providerMessageId: null, reason: "Microsoft would not take " + file.name + " (" + added.status + ")." };
      }
    }

    const sent = await fetch(mailbox + "/messages/" + encodeURIComponent(created.id) + "/send", {
      method: "POST",
      headers: auth,
      signal: stop,
    });
    if (!sent.ok) {
      // The draft is left in the mailbox on purpose: a person can see what
      // nearly went out, which is better than a vanished message.
      return { ok: false, providerMessageId: null, reason: "Microsoft would not send it (" + sent.status + ")." };
    }
    return { ok: true, providerMessageId: created.internetMessageId ?? null, reason: null };
  } catch (e) {
    const timedOut = (e as Error)?.name === "TimeoutError";
    // Never retried here. A send that timed out may well have gone.
    return {
      ok: false,
      providerMessageId: null,
      reason: timedOut ? "Microsoft did not answer in time, so we do not know whether it went." : "The email could not be sent.",
    };
  }
}

/* ── WhatsApp, through the Meta Cloud API ────────────────────────────────── */

export interface WhatsAppToSend {
  to: string;
  body: string;
  /** An approved template name. Outside the 24-hour window Meta allows only these. */
  templateKey: string | null;
}

export async function sendWhatsApp(message: WhatsAppToSend): Promise<SendOutcome> {
  if (!sendingEnabled()) return { ok: false, providerMessageId: null, reason: "Sending is switched off (OPS_SEND)." };
  if (!phoneAllowed(message.to)) {
    return { ok: false, providerMessageId: null, reason: "The outbound lock allows only named numbers, and this is not one." };
  }

  const numberId = (process.env.OPS_WHATSAPP_NUMBER_ID ?? "").trim();
  const token = (process.env.OPS_WHATSAPP_TOKEN ?? "").trim();
  if (!numberId || !token) {
    return { ok: false, providerMessageId: null, reason: "The Ops WhatsApp number is not set up yet." };
  }

  try {
    // ponytail: a template is sent with no variables, which is all Phase 1
    // needs. Variables arrive with the templates themselves in Phase 2.
    const payload = message.templateKey
      ? {
          messaging_product: "whatsapp",
          to: message.to,
          type: "template",
          template: { name: message.templateKey, language: { code: "en" } },
        }
      : { messaging_product: "whatsapp", to: message.to, type: "text", text: { body: message.body } };

    const response = await fetch("https://graph.facebook.com/v21.0/" + encodeURIComponent(numberId) + "/messages", {
      method: "POST",
      headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(SEND_TIME_LIMIT_MS),
    });
    const answer = (await response.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!response.ok) {
      return {
        ok: false,
        providerMessageId: null,
        reason: "WhatsApp refused it: " + (answer.error?.message ?? response.status) + ".",
      };
    }
    return { ok: true, providerMessageId: answer.messages?.[0]?.id ?? null, reason: null };
  } catch (e) {
    const timedOut = (e as Error)?.name === "TimeoutError";
    return {
      ok: false,
      providerMessageId: null,
      reason: timedOut ? "WhatsApp did not answer in time, so we do not know whether it went." : "The WhatsApp message could not be sent.",
    };
  }
}

/* ── The CV WhatsApp group, made and managed through Meta's Groups API (25 Nov) ───────────────────────── */

type Env = Record<string, string | undefined>;
export interface GroupJoinRequest { id: string; waId: string; userId: string; username: string; at: number }
export type GroupCall<T = unknown> = ({ ok: true } & T) | { ok: false; reason: string };

/**
 * One call to the Groups API, never throwing. `changes` marks a call that alters things at Meta: it needs OPS_SEND
 * and the number id as well as the token. Never call POST /<group>/invite_link: it resets the link and kills the old one.
 */
async function groupCall(method: "GET" | "POST" | "DELETE", path: string, body: unknown, changes: boolean, env: Env, fetcher: typeof fetch): Promise<GroupCall<{ answer: Record<string, unknown> }>> {
  const token = (env.OPS_WHATSAPP_TOKEN ?? "").trim();
  if (changes && (env.OPS_SEND ?? "").trim().toLowerCase() !== "on") return { ok: false, reason: "Sending is switched off (OPS_SEND)." };
  if (!token || (changes && !(env.OPS_WHATSAPP_NUMBER_ID ?? "").trim())) return { ok: false, reason: "The Ops WhatsApp number is not set up yet." };
  try {
    const response = await fetcher("https://graph.facebook.com/v21.0/" + path, {
      method,
      headers: { authorization: "Bearer " + token, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(SEND_TIME_LIMIT_MS),
    });
    const answer = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string } };
    if (!response.ok) return { ok: false, reason: "WhatsApp refused it: " + (answer.error?.message ?? response.status) + "." };
    return { ok: true, answer };
  } catch (e) {
    return { ok: false, reason: (e as Error)?.name === "TimeoutError" ? "WhatsApp did not answer in time, so we do not know whether it worked." : "WhatsApp could not be reached." };
  }
}

/** Asks WhatsApp to make the group. The id and the invite link come later, by webhook (group_lifecycle_update). */
export async function createWhatsAppGroup(subject: string, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<GroupCall> {
  const s = subject.trim();
  if (!s || s.length > 128) return { ok: false, reason: "The group needs a name of 1 to 128 characters." };
  const r = await groupCall("POST", encodeURIComponent((env.OPS_WHATSAPP_NUMBER_ID ?? "").trim()) + "/groups", { messaging_product: "whatsapp", subject: s, join_approval_mode: "approval_required" }, true, env, fetcher);
  return r.ok ? { ok: true } : r;
}

export async function getGroupInviteLink(groupId: string, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<GroupCall<{ link: string }>> {
  const r = await groupCall("GET", encodeURIComponent(groupId) + "/invite_link", null, false, env, fetcher);
  if (!r.ok) return r;
  const link = String(r.answer.invite_link ?? "");
  return link ? { ok: true, link } : { ok: false, reason: "WhatsApp gave no invite link." };
}

export async function listGroupJoinRequests(groupId: string, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<GroupCall<{ requests: GroupJoinRequest[] }>> {
  const r = await groupCall("GET", encodeURIComponent(groupId) + "/join_requests", null, false, env, fetcher);
  if (!r.ok) return r;
  const data = Array.isArray(r.answer.data) ? (r.answer.data as Record<string, unknown>[]) : [];
  const requests = data
    .filter((d) => d.join_request_id)
    .map((d) => ({ id: String(d.join_request_id), waId: String(d.wa_id ?? ""), userId: String(d.user_id ?? ""), username: String(d.username ?? ""), at: Number(d.creation_timestamp) * 1000 || 0 }));
  return { ok: true, requests };
}

/** Lets somebody in, or turns them away. Meta answers 200 even when one request failed, so the failed list is read. */
export async function answerGroupJoinRequest(groupId: string, joinRequestId: string, approve: boolean, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<GroupCall> {
  const r = await groupCall(approve ? "POST" : "DELETE", encodeURIComponent(groupId) + "/join_requests", { messaging_product: "whatsapp", join_requests: [joinRequestId] }, true, env, fetcher);
  if (!r.ok) return r;
  const failed = Array.isArray(r.answer.failed_join_requests) ? (r.answer.failed_join_requests as { errors?: { message?: string }[] }[]) : [];
  return failed.length ? { ok: false, reason: "WhatsApp could not do it: " + (failed[0].errors?.[0]?.message ?? "no reason given") + "." } : { ok: true };
}

export type MediaFetch =
  | { ok: true; bytes: Uint8Array; mime: string }
  | { ok: false; reason: string; notSetUp: boolean };

const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
// lookaside.fbsbx.com is where Meta's media URLs usually point.
const MEDIA_HOST_OK = /(^|\.)(whatsapp\.net|fbcdn\.net|fbsbx\.com|facebook\.com)$/;

/**
 * Downloads a file someone sent to the Ops WhatsApp number (25 Nov). It sends
 * nothing to anybody, so it needs neither the OPS_SEND switch nor the phone
 * allow-list. Meta's flow is two calls: the media id gives a short-lived
 * address, and the address gives the bytes; both need the token.
 */
export async function fetchWhatsAppMedia(
  mediaId: string,
  env: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
): Promise<MediaFetch> {
  const token = (env.OPS_WHATSAPP_TOKEN ?? "").trim();
  if (!token) {
    return { ok: false, notSetUp: true, reason: "The Ops WhatsApp number is not set up yet (OPS_WHATSAPP_TOKEN)." };
  }
  const fail = (reason: string): MediaFetch => ({ ok: false, notSetUp: false, reason });
  if (!mediaId.trim()) return fail("There is no file to fetch.");
  const tooBig = fail("The file is over 10 MB, which is more than we take.");

  try {
    const headers = { authorization: "Bearer " + token };
    const meta = await fetcher("https://graph.facebook.com/v21.0/" + encodeURIComponent(mediaId), {
      headers,
      signal: AbortSignal.timeout(SEND_TIME_LIMIT_MS),
    });
    const info = (await meta.json().catch(() => ({}))) as {
      url?: string;
      mime_type?: string;
      file_size?: number;
      error?: { message?: string };
    };
    if (!meta.ok || !info.url) {
      return fail("WhatsApp would not give the file: " + (info.error?.message ?? meta.status) + ".");
    }
    if (Number(info.file_size) > MEDIA_MAX_BYTES) return tooBig;

    // The token goes only to Meta's own hosts, never to whatever address came back.
    let host = "";
    try {
      const u = new URL(info.url);
      if (u.protocol === "https:") host = u.hostname.toLowerCase();
    } catch {
      /* host stays empty and is refused below */
    }
    if (!MEDIA_HOST_OK.test(host)) return fail("WhatsApp gave a download address we do not trust.");

    const file = await fetcher(info.url, { headers, signal: AbortSignal.timeout(SEND_TIME_LIMIT_MS) });
    if (!file.ok) return fail("WhatsApp would not give the file: " + file.status + ".");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > MEDIA_MAX_BYTES) return tooBig;
    return { ok: true, bytes, mime: info.mime_type || file.headers.get("content-type") || "" };
  } catch (e) {
    const timedOut = (e as Error)?.name === "TimeoutError";
    return fail(timedOut ? "WhatsApp did not answer in time." : "The file could not be fetched from WhatsApp.");
  }
}

/**
 * A group post is not sent by anybody: Meta's API cannot write to a group
 * (Part F2). The text is drafted, a person posts it from their phone and ticks
 * it off. Saying so here keeps the gap visible instead of looking like a
 * sender that silently does nothing.
 */
export function groupPostIsManual(): SendOutcome {
  return {
    ok: true,
    providerMessageId: null,
    reason:
      "Post it from your phone. This group was made on somebody's phone, and " +
      "Meta gives no way for the system to join one it did not create (6 Nov).",
  };
}

/**
 * The mailbox a member's mail goes out from: the dev sender when dev sign-in is
 * active and one is set, else the member's own address (17 Nov).
 */
export function senderMailbox(memberEmail: string, devSignIn: boolean, env: Record<string, string | undefined> = process.env): string {
  const dev = (env.OPS_DEV_SENDER_EMAIL ?? "").trim();
  return devSignIn && dev ? dev : memberEmail;
}

/** The email half of the Health page as plain lines: the sender mailbox, and only a count of the allowed addresses (never the list). */
export function healthLines(env: Record<string, string | undefined>, sender: string): string[] {
  const on = (k: string) => (env[k] ?? "").trim().toLowerCase() === "on";
  const allowed = (env.OPS_OUTBOUND_ALLOW_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean).length;
  return [
    "Sending: " + (on("OPS_SEND") ? "on" : "switched off (OPS_SEND)"),
    "Sender mailbox: " + (sender || "none"),
    "Outbound lock: " + (on("OPS_OUTBOUND_LOCK") ? "on, " + allowed + " address" + (allowed === 1 ? "" : "es") + " allowed" : "off"),
  ];
}
