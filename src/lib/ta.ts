/**
 * The window to the TA System (15, Part E; Phase 1 step 20).
 *
 * Ops reads the TA System through its API and keeps no copy. Two switches guard
 * it, reads and writes separately, and both are off until the TA side of the
 * API exists, so the screens show "not connected yet" rather than inventing
 * numbers. Every call is logged with how long it took.
 */

export interface TaPerson {
  id: string;
  fullName: string;
  email: string;
  taRole: string | null;
  isActive: boolean;
}

export type TaResult<T> =
  | { ok: true; data: T; ms: number }
  | { ok: false; reason: string };

function base(): string | null {
  const url = (process.env.OPS_TA_BASE_URL ?? "").trim();
  return url || null;
}

export function readsEnabled(): boolean {
  return (process.env.OPS_TA_READS_ENABLED ?? "").toLowerCase() === "on";
}

export function writesEnabled(): boolean {
  return (process.env.OPS_TA_WRITES_ENABLED ?? "").toLowerCase() === "on";
}

async function read<T>(path: string): Promise<TaResult<T>> {
  if (!readsEnabled()) return { ok: false, reason: "Reading the TA System is switched off." };
  const root = base();
  if (!root) return { ok: false, reason: "No TA System address is set yet." };
  const token = (process.env.OPS_TA_TOKEN ?? "").trim();
  if (!token) return { ok: false, reason: "No TA System token is set yet." };

  const started = Date.now();
  try {
    const response = await fetch(root.replace(/\/$/, "") + path, {
      headers: { authorization: "Bearer " + token },
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, reason: "The TA System answered " + response.status + "." };
    return { ok: true, data: (await response.json()) as T, ms: Date.now() - started };
  } catch {
    return { ok: false, reason: "The TA System could not be reached." };
  }
}

/** The desk's people. The first read we use, because it proves the window works. */
export function people(): Promise<TaResult<TaPerson[]>> {
  return read<TaPerson[]>("/integrations/v1/people");
}
