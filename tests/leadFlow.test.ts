/** The lead page as a flow: one step now, one beside it, and the done ones in a line each. */
import assert from "node:assert/strict";
import test from "node:test";

import { doneLine, flowOf } from "@/lib/leadFlow";

test("one step now, the second current one beside it, and the finished ones", () => {
  assert.deepEqual(flowOf(["done", "current", "upcoming", "upcoming", "upcoming"]), {
    now: "intro",
    alsoNow: [],
    done: ["enquiry"],
  });
  // The agreement and the requirement run together.
  assert.deepEqual(flowOf(["done", "done", "current", "current", "upcoming"]), {
    now: "agreement",
    alsoNow: ["requirement"],
    done: ["enquiry", "intro"],
  });
  // A step passed over is neither now nor done: it waits under "something different".
  assert.deepEqual(flowOf(["done", "skipped", "done", "current", "upcoming"]).now, "requirement");
  // Closed, or all done: nothing is now.
  assert.equal(flowOf(["done", "done", "done", "done", "done"]).now, null);
});

test("a finished step says what happened, in one line", () => {
  const facts = {
    existingClient: false,
    skipsIntro: false,
    introHeldAt: Date.UTC(2026, 10, 14, 5),
    esaSentAt: Date.UTC(2026, 10, 14, 8),
    esaSignedAt: Date.UTC(2026, 10, 16, 5),
    countersigned: false,
    signedOnFile: false,
    roleTitle: "Driver",
    openingTaId: null,
  };
  assert.equal(doneLine("enquiry", facts), "Checked: a new client");
  assert.equal(doneLine("intro", facts), "Held 14 November 2026 · agreement sent 14 November 2026");
  assert.equal(doneLine("agreement", facts), "Signed 16 November 2026 · countersignature to follow");
  assert.equal(doneLine("requirement", facts), "Complete: Driver");
  assert.match(doneLine("opening", facts), /waiting for its opening/);

  const existing = { ...facts, existingClient: true, skipsIntro: true, introHeldAt: null, signedOnFile: true };
  assert.equal(doneLine("enquiry", existing), "Checked: already our client");
  assert.equal(doneLine("intro", existing), "No intro call needed");
  assert.equal(doneLine("agreement", existing), "Signed before, on file");
});
