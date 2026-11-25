/**
 * Inbound WhatsApp (23 Nov, the ops team's feedback): what a client or a candidate writes to the Ops number lands
 * in the Inbox, filed to who it is from, instead of waiting for somebody to notice and copy it in.
 *
 * Meta's Cloud API posts to a webhook. Three things here are safety, not convenience:
 *   - **The signature.** Every post carries `X-Hub-Signature-256`, an HMAC of the exact bytes with the app secret.
 *     Nothing is read until it matches, and with no secret set nothing is accepted at all: an open door that
 *     writes into the inbox is how a stranger puts words in a client's mouth.
 *   - **The verify token** on Meta's one-time GET, so only the owner of the app can point it here.
 *   - **Exact matching only.** A number is matched to a person by its last nine digits and never guessed: a number
 *     that fits two people, or none, is filed as nobody's and left for a person.
 *
 * Pure: no database, no network. The desk records; this decides.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { phoneKey } from "@/lib/cvParse";

/** Does the signature header match this exact body? `sha256=<hex>`, constant time, false for anything else. */
export function signatureOk(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!appSecret || !header || !header.startsWith("sha256=")) return false;
  const want = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  const got = Buffer.from(header.slice("sha256=".length), "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Meta's one-time check: the challenge to answer with, or null when the token is wrong or none is set. */
export function challengeFor(query: URLSearchParams, token: string): string | null {
  if (!token || query.get("hub.mode") !== "subscribe" || query.get("hub.verify_token") !== token) return null;
  return query.get("hub.challenge");
}

export interface WaMessage {
  /** Meta's own id for the message (wamid...), so a retried post is never recorded twice. */
  id: string;
  /** The sender's number, digits only, with the country code. */
  from: string;
  name: string;
  at: number;
  text: string;
  /** What it was when it was not text: an image, a voice note. Nothing of it is kept. */
  kind: string;
  /** The group it was posted in (Meta's Groups API), or null for a 1:1 message. */
  groupId: string | null;
  /** Meta's id for the sender (BSUID). In a group `from` can be missing when the sender has a username and no number. */
  fromUserId: string;
  /** A file that came with it: kept only as Meta's media id, to be downloaded later. */
  document: { mediaId: string; filename: string; mime: string } | null;
}

/** What the webhook carried: the messages, and how many other things (delivery receipts, reactions) were left out. */
export function readWebhook(payload: unknown): { messages: WaMessage[]; ignored: number } {
  const messages: WaMessage[] = [];
  let ignored = 0;
  const entries = (payload as { entry?: unknown[] } | null)?.entry;
  if (!Array.isArray(entries)) return { messages, ignored };
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] }).changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: { messages?: unknown[]; statuses?: unknown[]; contacts?: { wa_id?: string; user_id?: string; profile?: { name?: string } }[] } }).value;
      ignored += Array.isArray(value?.statuses) ? value.statuses.length : 0;
      for (const raw of Array.isArray(value?.messages) ? value.messages : []) {
        const m = raw as { id?: string; from?: string; from_user_id?: string; group_id?: string; timestamp?: string; type?: string; text?: { body?: string }; document?: { id?: string; filename?: string; mime_type?: string; caption?: string } };
        const from = String(m.from ?? "").replace(/\D/g, "");
        const fromUserId = String(m.from_user_id ?? "");
        const groupId = m.group_id ? String(m.group_id) : null;
        // (25 Nov) In a group the sender may have a username and no number: keep it by its BSUID, so a CV posted there is not lost.
        if (!m.id || (!from && !(groupId && fromUserId))) {
          ignored += 1;
          continue;
        }
        const seconds = Number(m.timestamp);
        const kind = m.type ?? "text";
        messages.push({
          id: m.id,
          from,
          name: (value?.contacts ?? []).find((c) => (from && String(c.wa_id ?? "").replace(/\D/g, "") === from) || (fromUserId && c.user_id === fromUserId))?.profile?.name ?? "",
          at: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0,
          text: String((kind === "text" ? m.text?.body : kind === "document" ? m.document?.caption : "") ?? "").slice(0, 4000),
          kind,
          groupId,
          fromUserId,
          document: kind === "document" && m.document?.id ? { mediaId: m.document.id, filename: m.document.filename || "document", mime: m.document.mime_type || "" } : null,
        });
      }
    }
  }
  return { messages, ignored };
}

export interface GroupEvent { groupId: string; subject: string; inviteLink: string; error: string | null }

/** The "group made" answers in a webhook (group_lifecycle_update, type group_create). Meta's reply to the create call itself does not carry the id (25 Nov). */
export function readGroupEvents(payload: unknown): GroupEvent[] {
  const out: GroupEvent[] = [];
  const entries = (payload as { entry?: unknown[] } | null)?.entry;
  for (const entry of Array.isArray(entries) ? entries : []) {
    const changes = (entry as { changes?: unknown[] }).changes;
    for (const change of Array.isArray(changes) ? changes : []) {
      const c = change as { field?: string; value?: { groups?: unknown[] } };
      if (c.field !== "group_lifecycle_update") continue;
      for (const raw of Array.isArray(c.value?.groups) ? c.value.groups : []) {
        const g = raw as { type?: string; group_id?: string; subject?: string; invite_link?: string; errors?: { message?: string; title?: string; error_data?: { details?: string } }[] };
        if (g.type !== "group_create") continue;
        const e = g.errors?.[0];
        out.push({ groupId: String(g.group_id ?? ""), subject: String(g.subject ?? ""), inviteLink: String(g.invite_link ?? ""), error: g.errors?.length ? e?.error_data?.details || e?.message || e?.title || "WhatsApp would not make the group." : null });
      }
    }
  }
  return out;
}

export interface PhoneBook {
  clients: { id: string; name: string; leadId: string | null; contacts?: { name: string; phone: string }[] }[];
  leads: { id: string; company: string; contactName: string; contactPhone: string }[];
  applicants: { id: string; name: string; phone: string | null; vacancyId: string }[];
}

export type WaMatch =
  | { kind: "client"; id: string; name: string; clientId: string; note: string }
  | { kind: "lead"; id: string; name: string; clientId: null; note: string }
  | { kind: "applicant"; id: string; name: string; clientId: null; note: string }
  | { kind: "none"; id: null; name: string; clientId: null; note: string };

/**
 * Whose number it is. Clients' contacts first, then enquiries, then people applying to us. One match is an answer;
 * two different people is not, and neither is none: it is filed as nobody's, with the reason on it.
 */
export function matchPhone(wa: string, book: PhoneBook): WaMatch {
  const key = phoneKey(wa);
  const none = (note: string): WaMatch => ({ kind: "none", id: null, name: "", clientId: null, note });
  if (key.length < 9) return none("The number is too short to match.");
  // Each hit carries who it is: a company (a client's contact, or the enquiry it began as: one company, one
  // answer) or an applicant. Hits for two different ones are not an answer.
  const found: { who: string; match: WaMatch }[] = [];
  for (const c of book.clients) {
    const person = (c.contacts ?? []).find((p) => phoneKey(p.phone) === key);
    if (person) found.push({ who: "co:" + c.name.trim().toLowerCase(), match: { kind: "client", id: c.id, name: person.name + " at " + c.name, clientId: c.id, note: "From " + person.name + ", a contact of " + c.name + "." } });
  }
  for (const l of book.leads) {
    if (phoneKey(l.contactPhone) === key) found.push({ who: "co:" + l.company.trim().toLowerCase(), match: { kind: "lead", id: l.id, name: (l.contactName || "The contact") + " at " + l.company, clientId: null, note: "From the contact of the enquiry " + l.company + "." } });
  }
  for (const a of book.applicants) {
    if (a.phone && phoneKey(a.phone) === key) found.push({ who: "ap:" + a.id, match: { kind: "applicant", id: a.id, name: a.name, clientId: null, note: "From " + a.name + ", who applied to us." } });
  }
  if (!found.length) return none("The number is not one we know. Please file it.");
  const people = new Set(found.map((f) => f.who));
  if (people.size > 1) return none("The number fits more than one person: " + [...new Set(found.map((f) => f.match.name))].join(", ") + ". Please file it.");
  return (found.find((f) => f.match.kind === "client") ?? found[0]).match;
}
