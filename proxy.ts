import { NextResponse, type NextRequest } from "next/server";

/**
 * A password in front of the laptop app when it is shared through a tunnel
 * (10 Nov: the owner sends his lead a link to the real-data store on his
 * laptop, for review only). Off unless OPS_PREVIEW_PASSWORD is set, and never
 * asked on localhost, so working on the laptop is unchanged. The real-data
 * store is a month of real client mail: a tunnel link without this is open
 * to anyone who finds it.
 */
export function proxy(request: NextRequest) {
  const password = process.env.OPS_PREVIEW_PASSWORD;
  const host = request.headers.get("host") ?? "";
  if (!password || /^(localhost|127\.0\.0\.1)(:|$)/.test(host)) return NextResponse.next();
  const auth = request.headers.get("authorization") ?? "";
  const given = auth.startsWith("Basic ") ? atob(auth.slice(6)).split(":").slice(1).join(":") : "";
  if (given === password) return NextResponse.next();
  return new NextResponse("A password is needed.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Career 141 Ops (preview)"' },
  });
}

export const config = { matcher: "/((?!_next/static|_next/image|favicon.ico).*)" };
