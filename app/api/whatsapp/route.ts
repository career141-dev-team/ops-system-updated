import { CLOCK_ACTOR, takeWhatsApp } from "@/data/desk";
import { challengeFor, readWebhook, signatureOk } from "@/lib/whatsapp";

/**
 * The door Meta's WhatsApp Cloud API knocks on (23 Nov, the ops team's feedback): what a client or a candidate
 * writes to the Ops number is filed in the Inbox. The rules are in src/lib/whatsapp.ts; this only reads the bytes.
 *
 *   GET   Meta's one-time check when the webhook is saved: answered with the challenge only if
 *         `hub.verify_token` is OPS_WHATSAPP_VERIFY_TOKEN.
 *   POST  A message, signed with the app secret (`X-Hub-Signature-256`). With no OPS_WHATSAPP_APP_SECRET set
 *         nothing is accepted at all; a post that does not match its signature is refused and nothing is read.
 *
 * What it answers, and why: 200 for any properly signed post, even one with nothing we keep (a delivery receipt),
 * because Meta retries anything else for days; 401 for a bad or missing signature; 503 while the secret is not set,
 * so the door is visibly shut rather than quietly open.
 */
export async function GET(request: Request): Promise<Response> {
  const token = (process.env.OPS_WHATSAPP_VERIFY_TOKEN ?? "").trim();
  const challenge = challengeFor(new URL(request.url).searchParams, token);
  return challenge === null ? new Response("Not accepted.", { status: 403 }) : new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
}

export async function POST(request: Request): Promise<Response> {
  const secret = (process.env.OPS_WHATSAPP_APP_SECRET ?? "").trim();
  if (!secret) return Response.json({ ok: false, reason: "WhatsApp is not set up here yet (OPS_WHATSAPP_APP_SECRET)." }, { status: 503 });

  // The signature is over the exact bytes, so the body is read as text before it is parsed.
  const raw = await request.text();
  if (!signatureOk(raw, request.headers.get("x-hub-signature-256"), secret)) {
    return Response.json({ ok: false, reason: "The signature does not match." }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ ok: true, recorded: 0 }, { status: 200 });
  }
  const { messages, ignored } = readWebhook(payload);
  const taken = messages.length ? await takeWhatsApp(messages, CLOCK_ACTOR) : { recorded: 0, already: 0, filed: 0, waiting: 0, chasesStopped: 0 };
  return Response.json({ ok: true, ignored, ...taken }, { status: 200 });
}
