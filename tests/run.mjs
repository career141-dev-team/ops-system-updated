/**
 * Runs every `*.test.ts` in this folder, each in its own process so one crash
 * cannot take the suite with it. Same shape as the TA System's runner.
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv[2] ?? "";
const files = readdirSync(here)
  .filter((f) => f.endsWith(".test.ts"))
  .filter((f) => !only || f.includes(only))
  .sort();

/**
 * Which store the suites run against (6 Nov).
 *
 * `json` always, unless somebody deliberately says otherwise, because CI has
 * no backend and a suite that quietly needs one is a suite that quietly stops
 * running. The name is its own, not OPS_STORE: this runner used to force
 * `json` on every child whatever the environment said, so `OPS_STORE=convex
 * node tests/run.mjs` ran on JSON and printed "All suites passed" - a green
 * run that proved nothing, which is how 45 suites appeared to pass against a
 * backend they never touched.
 *
 * Asking for convex and not having one is a failure, never a fall back to
 * json. That is the whole point.
 */
const store = (process.env.OPS_TEST_STORE ?? "json").trim().toLowerCase();
if (store !== "json" && store !== "convex") {
  process.stdout.write('OPS_TEST_STORE is "' + store + '". It is json or convex.\n');
  process.exit(1);
}
if (store === "convex") {
  const missing = ["CONVEX_SELF_HOSTED_URL", "CONVEX_SELF_HOSTED_ADMIN_KEY"].filter((k) => !(process.env[k] ?? "").trim());
  if (missing.length) {
    process.stdout.write("OPS_TEST_STORE=convex needs " + missing.join(" and ") + ".\n");
    process.exit(1);
  }
  process.stdout.write("Running against the Convex backend at " + process.env.CONVEX_SELF_HOSTED_URL + "\n");
} else {
  process.stdout.write("Running against the JSON store. OPS_TEST_STORE=convex runs the same suites on a backend.\n");
}

let failed = 0;
const bad = [];
const rel = (p) => "./" + path.relative(path.resolve(here, ".."), p).split(path.sep).join("/");
for (const file of files) {
  const label = file.replace(".test.ts", "");
  process.stdout.write("\n== " + label + " " + "=".repeat(Math.max(0, 60 - label.length)) + "\n");
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", "--import", rel(path.join(here, "alias.mjs")), rel(path.join(here, file))],
    {
      stdio: "inherit",
      cwd: path.resolve(here, ".."),
      // A test backend that starts empty gets the sample desk, as it did before 22 Nov.
      env: { ...process.env, OPS_STORE: store, OPS_TEST_RUN: "1", OPS_SAMPLE_DESK: "on" },
    },
  );
  if (r.status !== 0) { failed++; bad.push(label); }
}

process.stdout.write(
  failed === 0
    ? "\nAll " + files.length + " suites passed, on the " + store + " store.\n"
    : "\n" + failed + " of " + files.length + " suites failed: " + bad.join(", ") + "\n",
);
process.exit(failed ? 1 : 0);
