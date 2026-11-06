import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authorizeUrl, pkce, signInConfigFrom } from "@/lib/signIn";

/**
 * Off to Microsoft (6 Nov).
 *
 * The state and the nonce are kept in a short-lived cookie rather than on the
 * server, because they only have to survive one redirect and the server has no
 * session to hang them on yet. Ten minutes is longer than anybody takes to
 * type a password and short enough that an abandoned attempt is not lying
 * around at the end of the day.
 */
export async function GET() {
  const cfg = signInConfigFrom(process.env);
  if (!cfg) {
    return NextResponse.redirect(new URL("/sign-in", process.env.OPS_APP_URL ?? "http://127.0.0.1:3300"));
  }

  const state = randomBytes(16).toString("base64url");
  const nonce = randomBytes(16).toString("base64url");
  const { verifier, challenge } = pkce();

  const jar = await cookies();
  jar.set("ops_sign_in", JSON.stringify({ state, nonce, verifier }), {
    httpOnly: true,
    sameSite: "lax",
    secure: cfg.redirectUri.startsWith("https://"),
    path: "/sign-in",
    maxAge: 600,
  });

  return NextResponse.redirect(authorizeUrl(cfg, { state, nonce, challenge }));
}
