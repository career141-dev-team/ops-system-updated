import "server-only";

import { convexMutation, usingConvex } from "./convexClient";
import { repo } from "./store";
import type { OpsTaCall } from "./types";

/**
 * Records one call to the TA System.
 *
 * Its own file because the TA client is read by screens and must not import
 * the store at the top: which store is in use is decided when the call
 * happens, not when the module loads.
 */
export async function logTaCall(entry: Omit<OpsTaCall, "id" | "at">): Promise<void> {
  try {
    if (!usingConvex()) {
      repo.logTaCall(entry);
      return;
    }
    await convexMutation("ops/data:logTaCall", entry);
  } catch {
    // A call that worked must not be reported as failed because writing the
    // note failed. The note is for us, not for the client.
  }
}
