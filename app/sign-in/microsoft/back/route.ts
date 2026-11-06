import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { desk } from "@/data/desk";
import { startSession } from "@/lib/session";
import {
  claimsOf,
  emailOf,
  problemWithClaims,
  signInConfigFrom,
  tokenRequestBody,
  tokenUrl,
  whoMayIn,
} from "@/lib/signIn";

/** Microsoft can hang like anything else. A door that hangs is a door nobody gets through. */
const TIME_LIMIT_MS = 15_000;

function back(why: string): NextResponse {
  const home = process.env.OPS_APP_URL ?? "http://127.0.0.1:3300";
  const url = new URL("/sign-in", home);
  url.searchParams.set("problem", why);
  return NextResponse.redirect(url);
}

/**
 * Coming back from Microsoft (6 Nov).
 *
 * Every refusal lands back on the sign-in screen with a sentence, because the
 * person is standing in front of it. Nothing here decides *who may come in* -
 * that is `whoMayIn`, tested on its own - and nothing here trusts anything the
 * browser carried: the code is exchanged by us, with our secret, over TLS.
 */
export async function GET(request: Request) {
  const cfg = signInConfigFrom(process.env);
  if (!cfg) return back("Microsoft sign-in is not set up on this machine.");

  const asked = new URL(request.url).searchParams;
  const jar = await cookies();
  const started = jar.get("ops_sign_in")?.value;
  jar.delete("ops_sign_in");

  // Microsoft says what went wrong in its own words; the person should see them.
  const refused = asked.get("error_description") ?? asked.get("error");
  if (refused) return back(refused);

  if (!started) return back("That sign-in took too long. Start again.");
  let kept: { state?: string; nonce?: string; verifier?: string };
  try {
    kept = JSON.parse(started) as typeof kept;
  } catch {
    return back("That sign-in could not be read. Start again.");
  }

  if (!kept.state || asked.get("state") !== kept.state) {
    return back("That sign-in did not start in this browser. Start again.");
  }
  const code = asked.get("code");
  if (!code || !kept.verifier || !kept.nonce) return back("Microsoft sent no sign-in code.");

  let idToken = "";
  try {
    const stop = AbortSignal.timeout(TIME_LIMIT_MS);
    const response = await fetch(tokenUrl(cfg), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: tokenRequestBody(cfg, code, kept.verifier),
      signal: stop,
    });
    const body = (await response.json()) as { id_token?: string; error_description?: string };
    if (!response.ok) return back(body.error_description ?? "Microsoft refused the sign-in.");
    idToken = body.id_token ?? "";
  } catch {
    return back("Microsoft could not be reached. Try again in a moment.");
  }

  const claims = claimsOf(idToken);
  const wrong = problemWithClaims(claims, {
    clientId: cfg.clientId,
    tenant: cfg.tenant,
    nonce: kept.nonce,
    now: Date.now(),
  });
  if (wrong) return back(wrong);

  const door = whoMayIn(emailOf(claims), (await desk()).members);
  if (!door.ok) return back(door.why);

  await startSession(door.memberId);
  return NextResponse.redirect(new URL("/", process.env.OPS_APP_URL ?? "http://127.0.0.1:3300"));
}
