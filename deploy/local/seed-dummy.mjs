// Adds invented leads, an agreement, clients and positions to the LOCAL Ops
// backend so the screens have something to show. Refuses anything but 127.0.0.1.
// Run: set -a; . deploy/local/.env.backend.local; set +a; node deploy/local/seed-dummy.mjs
const url = (process.env.CONVEX_SELF_HOSTED_URL || "http://127.0.0.1:3310").replace(/\/$/, "");
if (!/^http:\/\/127\.0\.0\.1[:/]/.test(url + "/")) throw new Error("Local backend only: " + url);
const key = process.env.LOCAL_ADMIN_KEY || process.env.CONVEX_SELF_HOSTED_ADMIN_KEY;
if (!key) throw new Error("No admin key (LOCAL_ADMIN_KEY).");

async function call(kind, path, args = {}) {
  const r = await fetch(`${url}/api/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Convex " + key },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  const b = await r.json();
  if (b.status !== "success") throw new Error(path + ": " + (b.errorMessage || r.status));
  return b.value;
}

const snap = await call("query", "ops/data:snapshot");
if (snap.leads.length > 0) { console.log("Leads already exist; nothing added."); process.exit(0); }
const owner = (snap.members.find((m) => m.role === "ops_owner") || snap.members[0]).id;
const now = Date.now(), day = 86400000;

const lead = (company, state, extra = {}) => call("mutation", "ops/data:addLead", {
  company, nameKey: company.toLowerCase(), contactName: "Dummy Contact",
  contactEmail: company.toLowerCase().replace(/\W+/g, "") + "@example.test", contactPhone: "+94770000000",
  source: "website", industry: "Manufacturing", website: "www.example.test", notes: "Invented for local testing.",
  industryFlagged: false, industryBecause: null, industryConfirmedBy: null, state, reason: null,
  doNotInvite: false, clientTaId: null, ownerId: owner, createdBy: owner, ...extra,
});

await lead("Dummy Foods", "new");
await lead("Dummy Textiles", "intro_call");
const waiting = await lead("Dummy Logistics", "waiting_agreement");
const won = await lead("Dummy Hotels", "requirement", { clientTaId: "ta_dummy_hotels" });
await lead("Dummy Bank", "declined_industry", { industryFlagged: true, industryBecause: "Banking" });

await call("mutation", "ops/data:addAgreement", {
  leadId: waiting.id, clientTaId: null, state: "draft", version: 1,
  fields: { companyName: "Dummy Logistics (Pvt) Ltd", feeMonths: "1", feeBasis: "gross", guaranteeDays: "90", paymentDays: "30", replacementWorkingDays: "60", refundPct: "50" },
  draftFileId: null, sentAt: null, sentMessageId: null, chaseStep: 0, expiresAt: null, signedAt: null,
  signedFileId: null, countersignedAt: null, countersignedFileId: null, reason: null, ownerId: owner,
});
await call("mutation", "ops/data:addAgreement", {
  leadId: won.id, clientTaId: "ta_dummy_hotels", state: "countersigned", version: 1,
  fields: { companyName: "Dummy Hotels (Pvt) Ltd", feeMonths: "1", feeBasis: "gross", guaranteeDays: "90", paymentDays: "30", replacementWorkingDays: "60", refundPct: "50" },
  draftFileId: null, sentAt: now - 10 * day, sentMessageId: null, chaseStep: 0, expiresAt: null, signedAt: now - 5 * day,
  signedFileId: null, countersignedAt: now - 4 * day, countersignedFileId: null, reason: null, ownerId: owner,
});

const client = await call("mutation", "ops/data:addClient", {
  leadId: won.id, taClientId: "ta_dummy_hotels", name: "Dummy Hotels", nameKey: "dummy hotels", stage: "active",
  billingName: "Dummy Hotels (Pvt) Ltd", billingEmail: "accounts@example.test", billingAddress: "1 Example Street, Colombo", groupName: "", notes: "Invented.", reason: null, ownerId: owner,
});
for (const title of ["Head of Finance", "Front Office Manager"]) {
  await call("mutation", "ops/data:addPosition", {
    requirementId: null, clientId: client.id, clientTaId: "ta_dummy_hotels", openingTaId: null, title, stage: "searching",
    primaryTaId: null, hundredPercentDay: null, taStatus: null, jdApprovedAt: null, linkedInUrl: null, linkedInPostedAt: null,
    depthStage: null, shortlistedTotal: null, pendingCount: null, depthCheckedAt: null, handedOverAt: now - 3 * day, closedAt: null, ownerId: owner,
  });
}
console.log("Added 5 leads, 2 agreements, 1 client, 2 positions.");
