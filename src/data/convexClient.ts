import "server-only";

/**
 * How the app talks to the Ops backend (2 Nov).
 *
 * Server-side only, with the admin key, exactly as the TA System does it: the
 * backend's functions are all internal, so nothing in a browser can call them
 * and the key never leaves the server.
 *
 * It is deliberately a thin HTTP call rather than a generated client, so the
 * store stays the only thing that knows where data lives, and the screens stay
 * the same whether they are reading the JSON file or this.
 */

function base(): string {
  const url = (process.env.CONVEX_SELF_HOSTED_URL ?? "").trim();
  if (!url) throw new Error("No Ops backend address is set (CONVEX_SELF_HOSTED_URL).");
  return url.replace(/\/$/, "");
}

function key(): string {
  const value = (process.env.CONVEX_SELF_HOSTED_ADMIN_KEY ?? "").trim();
  if (!value) throw new Error("No Ops backend key is set (CONVEX_SELF_HOSTED_ADMIN_KEY).");
  return value;
}

async function call<T>(kind: "query" | "mutation", path: string, args: Record<string, unknown>): Promise<T> {
  const response = await fetch(base() + "/api/" + kind, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Convex " + key() },
    body: JSON.stringify({ path, args, format: "json" }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("The Ops backend answered " + response.status + " for " + path + ".");
  }
  const body = (await response.json()) as { status: string; value?: T; errorMessage?: string };
  if (body.status !== "success") {
    throw new Error(body.errorMessage || "The Ops backend refused " + path + ".");
  }
  return body.value as T;
}

export function convexQuery<T>(path: string, args: Record<string, unknown> = {}): Promise<T> {
  return call<T>("query", path, args);
}

export function convexMutation<T>(path: string, args: Record<string, unknown> = {}): Promise<T> {
  return call<T>("mutation", path, args);
}

/** Which store the app is reading. `convex` needs both the address and the key. */
export function usingConvex(): boolean {
  if ((process.env.OPS_STORE ?? "json").toLowerCase() !== "convex") return false;
  return Boolean((process.env.CONVEX_SELF_HOSTED_URL ?? "").trim() && (process.env.CONVEX_SELF_HOSTED_ADMIN_KEY ?? "").trim());
}
