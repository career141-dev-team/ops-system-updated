import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { clerkConfigured } from "@/lib/clerkAuth";

/**
 * Next.js 16 request proxy:
 * 1. Optional preview tunnel Basic-Auth guard when OPS_PREVIEW_PASSWORD is set (non-localhost).
 * 2. Clerk middleware when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY & CLERK_SECRET_KEY are configured,
 *    so Server Components and Server Actions can call `await auth()` / `await currentUser()`.
 */
function previewGuard(request: NextRequest): NextResponse | null {
  const password = process.env.OPS_PREVIEW_PASSWORD;
  const host = request.headers.get("host") ?? "";
  if (!password || /^(localhost|127\.0\.0\.1)(:|$)/.test(host)) return null;
  const auth = request.headers.get("authorization") ?? "";
  const given = auth.startsWith("Basic ") ? atob(auth.slice(6)).split(":").slice(1).join(":") : "";
  if (given === password) return null;
  return new NextResponse("A password is needed.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Career 141 Ops (preview)"' },
  });
}

const withClerk = clerkMiddleware();

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const blocked = previewGuard(request);
  if (blocked) return blocked;
  if (clerkConfigured(process.env)) {
    return withClerk(request, event);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
