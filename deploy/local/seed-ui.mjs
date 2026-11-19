// Loads (or, with --remove, takes out) the staged dummy data without clicking: the same loader as the button on /dev/ta.
//   node deploy/local/seed-ui.mjs            load into OPS_DATA_DIR (default .data-ui)
//   node deploy/local/seed-ui.mjs --remove   take out exactly the smp_ rows; your own rows stay
// Laptop JSON store only. Nothing is sent, nothing real is touched; the store is copied aside before loading.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

if (!process.env.OPS_SEED_CHILD) {
  // The same way tests/run.mjs runs TypeScript: strip types, plus the @/ alias hook.
  const rel = (p) => "./" + path.relative(root, p).split(path.sep).join("/");
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", "--import", rel(path.join(root, "tests", "alias.mjs")), rel(fileURLToPath(import.meta.url)), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: root,
      env: {
        ...process.env,
        OPS_SEED_CHILD: "1",
        OPS_STORE: "json",
        OPS_TEST_RUN: "1",
        OPS_DATA_DIR: path.resolve(root, process.env.OPS_DATA_DIR || ".data-ui"),
        OPS_TA_FAKE: "on",
      },
    },
  );
  process.exit(r.status ?? 1);
}

const { loadOpeningsSample, removeOpeningsSample } = await import("@/data/desk");
const { repo } = await import("@/data/store");

console.log("Store: " + process.env.OPS_DATA_DIR);
if (process.argv.includes("--remove")) {
  const done = await removeOpeningsSample();
  console.log(done.ok ? "Removed the staged dummy data (" + done.gone + " rows). Your own rows are untouched." : done.why);
  process.exit(done.ok ? 0 : 1);
}

const owner = repo.all().members.find((m) => m.role === "ops_owner") ?? repo.all().members[0];
const done = await loadOpeningsSample(owner.id);
if (!done.ok) {
  console.log(done.why);
  process.exit(1);
}
console.log("Loaded the staged dummy data, owned by " + owner.name + ". Your data before it is copied to " + done.backup);
for (const [key, n] of Object.entries(done.counts).sort()) if (n > 0) console.log("  " + key.padEnd(18) + n);
console.log("Timers started: " + repo.all().timers.filter((t) => String(t.subjectId).startsWith("smp_")).length);
