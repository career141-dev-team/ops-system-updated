/**
 * The Convex schema against the types the app believes (6 Nov).
 *
 * Found by running the app on the real store for the first time: every screen
 * worked on the JSON file and `/mail` was a 500 on Convex, because
 * `attachmentFileIds` was `v.optional` in the schema while the TypeScript type
 * says `Id[]`. A row written without it comes back with no field at all, the
 * mapper is a plain spread, and the mailbox read `.length` of undefined.
 *
 * It is a whole class of fault, not one bug: anything optional in the schema
 * and required in the type breaks only on the real store, and only on the page
 * that happens to touch it. There are few enough optional fields to name them,
 * so this names them. Adding another is a deliberate act, and it fails here
 * until somebody says why.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const types = readFileSync(join(process.cwd(), "src", "data", "types.ts"), "utf8");

/** Each one is optional in the type too, so the app already expects nothing. */
// slotAnswers (16 Nov): older interviews have none, and the page reads it as "not told", never as free.
// direction, to, attachments (16 Nov): mail read before Sent Items and file names were kept has none.
// reschedules (16 Nov): an interview that never moved has no history, and the page reads that as none.
const MAY_BE_OPTIONAL = ["inReplyToProviderId", "thread", "ui", "slotAnswers", "direction", "to", "attachments", "reschedules",
  // Teams (17 Nov): a meeting booked before it has none of these, and the page reads that as "no link".
  "alsoRequirement", "strategies", "contacts", "manualCandidates", "calendarEventId", "calendarOrganiser", "calendarLengthMin", "lengthMin", "organiserId", "attendees", "joinUrl", "graphEventId", "teamsProblem",
  // "Open it now, without waiting" (17 Nov): a lead that was never marked has none of these.
  "openEarlyBy", "openEarlyAt", "openEarlyReason",
  // People on an opening besides the Primary TA (17 Nov): an opening made before has none.
  "team",
  // Candidate phone on placements & start date on unreported-hire surcharge invoices (19 Nov).
  "candidatePhone", "hiredStartDate",
  // The stage an internal-hiring applicant was in when rejected (23 Nov): a row from before has none.
  "rejectedAtStage",
  // A Scoop CV (23 Nov): read from the CV, or asked on the call.
  "nic", "targetPosition", "packageSaid", "laptop", "scoopId", "repliedAt"];

test("only the fields we have thought about are optional in the schema", () => {
  const optional = [...schema.matchAll(/^\s+([a-zA-Z][a-zA-Z0-9]*): v\.optional\(/gm)].map((m) => m[1]);
  const surprises = optional.filter((name) => !MAY_BE_OPTIONAL.includes(name));
  assert.deepEqual(
    surprises,
    [],
    "optional in convex/schema.ts and not on the list: " +
      surprises.join(", ") +
      ". A field the app's type calls required must be required here, or the page that reads it is a 500 on the real store and fine on the JSON one.",
  );
});

test("every field the schema may leave out is optional in the type as well", () => {
  for (const name of MAY_BE_OPTIONAL) {
    // `name?: ...` in the interface. Anything else and the app would trust a
    // value the database is allowed not to have.
    assert.match(
      types,
      new RegExp("\\b" + name + "\\?:"),
      name + " may be missing from a Convex row, so src/data/types.ts has to say it is optional",
    );
  }
});

test("attachmentFileIds is required, which is the fault this file exists for", () => {
  assert.match(schema, /attachmentFileIds: v\.array\(v\.string\(\)\)/);
  assert.doesNotMatch(schema, /attachmentFileIds: v\.optional/);
  assert.match(types, /attachmentFileIds: Id\[\]/);
});

test("nothing in the schema is named after a product we do not use", () => {
  // clerkUserId sat here until 6 Nov, read by nothing, from when the plan
  // assumed Clerk. Sign-in is Microsoft, and it matches on the email address.
  assert.doesNotMatch(schema, /clerk/i);
});
