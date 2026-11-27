/**
 * Seeds Ops's editable `ta.roster` setting in a LOCAL JSON store only (27 Nov).
 * It never writes to a Convex backend: data changes on a server are migrations run by
 * the pipeline (AGENTS.md rule 7). On a server, the list is added from Account & help ->
 * TA list -> Change, or with "Sync from TA System".
 *
 * Usage (the screens' store is .data-ui):
 *   OPS_DATA_DIR=.data-ui node scripts/seed-ta-roster.mjs --dry-run
 *   OPS_DATA_DIR=.data-ui node scripts/seed-ta-roster.mjs
 */
import fs from "node:fs";
import path from "node:path";

const TA_ROSTER_KEY = "ta.roster";

// 16 complete entries supplied on 27 Nov (Shihab was truncated before email/role
// and can be added from Account & help -> TA list -> Change -> Add TA).
const INITIAL_ROSTER = [
  { id: "ta_dewmini", fullName: "Dewmini", email: "dewmini@career141.com", taRole: "ta", isActive: true },
  { id: "ta_fathima", fullName: "Fathima", email: "fathima@career141.com", taRole: "ta", isActive: true },
  { id: "ta_gajani", fullName: "Gajani", email: "gajani@career141.com", taRole: "ta", isActive: true },
  { id: "ta_haifa", fullName: "Haifa", email: "haifa@career141.com", taRole: "ta", isActive: true },
  { id: "ta_hassan", fullName: "Hassan", email: "hassan@career141.com", taRole: "ta", isActive: true },
  { id: "ta_jesmeen", fullName: "Jesmeen", email: "jesmeen@career141.com", taRole: "ta_lead", isActive: true },
  { id: "ta_priya", fullName: "Priya", email: "priya@career141.com", taRole: "ta", isActive: true },
  { id: "ta_rakshana", fullName: "Rakshana", email: "rakshana@career141.com", taRole: "ta", isActive: true },
  { id: "ta_rumana", fullName: "rumana", email: "rumana@career141.com", taRole: "ta", isActive: true },
  { id: "ta_samali", fullName: "Samali", email: "samali@career141.com", taRole: "ta", isActive: true },
  { id: "ta_sameera", fullName: "Sameera", email: "sameera@career141.com", taRole: "ta", isActive: true },
  { id: "ta_sanduni", fullName: "Sanduni", email: "sanduni@career141.com", taRole: "ta", isActive: true },
  { id: "ta_sanjeev", fullName: "Sanjeev", email: "sanjeev@career141.com", taRole: "admin", isActive: true },
  { id: "ta_shakya", fullName: "Shakya", email: "shakya@career141.com", taRole: "ta", isActive: true },
  { id: "ta_shamra", fullName: "Shamra", email: "shamra@career141.com", taRole: "ta_lead", isActive: true },
  { id: "ta_shareefdeenaslam", fullName: "shareefdeenaslam", email: "shareefdeenaslam@gmail.com", taRole: "ta", isActive: true },
];

const dryRun = process.argv.includes("--dry-run");
async function run() {
  if (dryRun) {
    process.stdout.write(
        `[dry-run] Would write ${INITIAL_ROSTER.length} TA records into opsSettings.${TA_ROSTER_KEY}:\n` +
        INITIAL_ROSTER.map((p) => `  - ${p.fullName} <${p.email}> (${p.taRole})`).join("\n") +
        "\n",
    );
    return;
  }

  const dataDir = process.env.OPS_DATA_DIR || path.join(process.cwd(), ".data");
  const filePath = path.join(dataDir, "ops.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON store file not found at ${filePath}. Start the local app once first or set OPS_DATA_DIR.`);
  }
  const db = JSON.parse(fs.readFileSync(filePath, "utf8"));
  db.settings = Array.isArray(db.settings) ? db.settings : [];
  const next = { key: TA_ROSTER_KEY, value: JSON.stringify(INITIAL_ROSTER), updatedBy: "migration", updatedAt: Date.now() };
  const idx = db.settings.findIndex((s) => s.key === TA_ROSTER_KEY);
  if (idx >= 0) db.settings[idx] = next;
  else db.settings.push(next);
  fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
  process.stdout.write(`Seeded ${INITIAL_ROSTER.length} TA records to ${filePath} (${TA_ROSTER_KEY}).\n`);
}

run().catch((err) => {
  process.stderr.write((err instanceof Error ? err.message : String(err)) + "\n");
  process.exit(1);
});
