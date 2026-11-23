// Adds invented clients, each with positions, candidates and a CV set, to the LOCAL Ops backend.
// Refuses anything but 127.0.0.1. Safe to run twice: a client already there (same name key) is skipped.
// Run: set -a; . deploy/local/.env.backend.local; set +a; node deploy/local/seed-clients.mjs
const url = (process.env.CONVEX_SELF_HOSTED_URL || "http://127.0.0.1:3310").replace(/\/$/, "");
// Local by default. A Convex Cloud DEV deployment is allowed only by naming it: SEED_ALLOW_URL=<the same url>.
if (!/^http:\/\/127\.0\.0\.1[:/]/.test(url + "/") && process.env.SEED_ALLOW_URL?.replace(/\/$/, "") !== url) throw new Error("Local backend only: " + url);
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
const owner = (snap.members.find((m) => m.role === "ops_owner") || snap.members[0]).id;
const have = new Set(snap.clients.map((c) => c.nameKey));
const now = Date.now(), day = 86400000;
const nk = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const mail = (n, d) => n.toLowerCase().replace(/[^a-z]+/g, ".") + "@" + d;

const CLIENTS = [
  {
    name: "Lanka Tea Exporters", stage: "active", domain: "lankatea.example.test", city: "Colombo 2",
    contacts: [["Nimali Fernando", "hr", "+94 77 100 2001"], ["Suresh Kumar", "finance", "+94 77 100 2002"]],
    positions: [
      ["Finance Manager", "searching", ["Dilini Perera", "Kasun Wijesinghe", "Anushka Silva"]],
      ["Export Executive", "searching", ["Tharindu Jayasena", "Madushi Ranasinghe"]],
      ["Quality Assurance Lead", "searching", ["Ruwan Gunasekara", "Sanduni Herath"]],
    ],
  },
  {
    name: "Island Hotels Group", stage: "active", domain: "islandhotels.example.test", city: "Galle",
    contacts: [["Priyanka De Silva", "hr", "+94 77 100 3001"]],
    positions: [
      ["Front Office Manager", "searching", ["Chamara Bandara", "Ishara Weerasinghe", "Nadeesha Fonseka"]],
      ["Executive Chef", "searching", ["Hasitha Mendis", "Pubudu Liyanage"]],
    ],
  },
  {
    name: "Serendib Logistics", stage: "onboarding", domain: "serendiblogistics.example.test", city: "Negombo",
    contacts: [["Mohamed Rizwan", "hr", "+94 77 100 4001"]],
    positions: [["Fleet Operations Manager", "searching", ["Lahiru Senanayake", "Amila Rathnayake"]]],
  },
  {
    name: "Pearl Software Labs", stage: "lead", domain: "pearlsoft.example.test", city: "Colombo 7",
    contacts: [["Anjali Rajapaksa", "hr", "+94 77 100 5001"]],
    positions: [["Senior Software Engineer", "searching", ["Dinesh Cooray", "Sachini Abeysekera", "Yasiru Gamage"]]],
  },
];

let c = 0, p = 0, cand = 0, s = 0;
for (const [ci, co] of CLIENTS.entries()) {
  if (have.has(nk(co.name))) { console.log("Skipped (already there): " + co.name); continue; }
  const taClientId = "ta_dummy_" + nk(co.name).replace(/ /g, "_");
  const client = await call("mutation", "ops/data:addClient", {
    leadId: null, taClientId, name: co.name, nameKey: nk(co.name), stage: co.stage,
    billingName: co.name + " (Pvt) Ltd", billingEmail: "accounts@" + co.domain,
    billingAddress: (10 + ci) + " Example Road, " + co.city, groupName: co.name + " + Career 141",
    contacts: co.contacts.map(([n, role, phone]) => ({ name: n, email: mail(n, co.domain), phone, role })),
    notes: "Invented for local testing.", reason: null, ownerId: owner,
  });
  c++;
  for (const [pi, [title, stage, people]] of co.positions.entries()) {
    const pos = await call("mutation", "ops/data:addPosition", {
      requirementId: null, clientId: client.id, clientTaId: taClientId, openingTaId: "ta_dummy_j" + ci + pi, title, stage,
      primaryTaId: null, hundredPercentDay: null, taStatus: "Searching", jdApprovedAt: now - 12 * day,
      linkedInUrl: "https://www.linkedin.com/jobs/view/dummy" + ci + pi, linkedInPostedAt: now - 10 * day,
      depthStage: null, shortlistedTotal: people.length, pendingCount: people.length, depthCheckedAt: now - day,
      handedOverAt: now - (14 - pi) * day, closedAt: null, ownerId: owner,
    });
    p++;
    const manual = people.map((n, i) => ({
      id: "dummy_mc_" + ci + pi + i, name: n, email: mail(n, "example.test"), phone: "+94 71 " + (200 + ci * 10 + pi) + " " + (1000 + i * 37),
      note: "Invented: " + (6 + i * 3) + " years in a similar role.", cvFileId: null, addedBy: owner, at: now - (9 - i) * day,
    }));
    await call("mutation", "ops/data:patchPosition", {
      positionId: pos.id, by: owner, what: "position.dummyCandidates", reason: null,
      patch: { manualCandidates: manual, contacts: [{ name: mail("Hiring Lead", "x").split("@")[0], email: "hiring@" + co.domain, phone: "", role: "hiring manager" }] },
    });
    cand += manual.length;
    await call("mutation", "ops/data:addClientSet", {
      taRoundId: "ta_dummy_round" + ci + pi, openingTaId: "ta_dummy_j" + ci + pi, setNumber: 1, clientId: client.id, clientTaId: taClientId,
      name: co.name.toUpperCase() + " > " + title.toUpperCase() + " > SET 1", role: title, state: pi === 0 ? "ready" : "reviewing",
      candidates: people.map((n, i) => ({ applicationTaId: "ta_dummy_app" + ci + pi + i, name: n, fileId: null, problem: null })),
      dueAt: now + 3 * day, sentAt: null, sentMessageId: null, sentTo: [], receivedAt: null, reason: null, ownerId: owner,
    });
    s++;
  }
}
console.log(`Added ${c} clients, ${p} positions, ${cand} candidates, ${s} CV sets.`);
