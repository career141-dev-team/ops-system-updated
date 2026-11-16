/**
 * The client record (15, Phase 2 step 19).
 *
 * The faults on the board these rules exist for: one company with two client
 * records and so two owners, an invoice sent to whoever hired rather than
 * whoever pays, and a client who went quiet with nobody able to say why.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  STAGE_MEANINGS,
  canMoveStage,
  problemWithBilling,
  problemWithInvoiceBilling,
  problemWithStageMove,
  whereTheyStand,
} from "@/lib/clients";

test("a client only moves where it makes sense to", () => {
  assert.equal(canMoveStage("lead", "onboarding"), true);
  assert.equal(canMoveStage("onboarding", "active"), true);
  assert.equal(canMoveStage("active", "dormant"), true);
  assert.equal(canMoveStage("dormant", "active"), true, "a quiet client comes back");
  assert.equal(canMoveStage("closed", "active"), true, "so does a finished one");
  assert.equal(canMoveStage("active", "lead"), false, "they have a signed agreement behind them");
  assert.equal(canMoveStage("lead", "dormant"), false, "nothing was ever running");
});

test("going quiet needs a reason, as much as closing does", () => {
  assert.match(problemWithStageMove("active", "dormant", "") ?? "", /write why/i);
  assert.match(problemWithStageMove("active", "closed", "   ") ?? "", /write why/i);
  assert.equal(problemWithStageMove("active", "dormant", "No positions since July."), null);
  // Coming back does not need one: the work itself is the reason.
  assert.equal(problemWithStageMove("dormant", "active", ""), null);
  assert.match(problemWithStageMove("active", "active", "x") ?? "", /already there/i);
  // The stage meanings are sentences of their own: one of them lower-cased
  // read "a client who is “quiet. nothing open”", so they are quoted as written.
  const refused = problemWithStageMove("active", "lead", "x") ?? "";
  assert.match(refused, /cannot be moved there/i);
  assert.match(refused, /Agreement done/, "it says where they are now, as written");
});

test("a billing address that is not an address is refused", () => {
  assert.equal(problemWithBilling({ billingName: "", billingEmail: "", groupName: "" }), null, "blank is allowed");
  assert.match(
    problemWithBilling({ billingName: "Accounts", billingEmail: "accounts.example.test", groupName: "" }) ?? "",
    /does not look like an email/i,
  );
  assert.match(
    problemWithBilling({ billingName: "", billingEmail: "accounts@example.test", groupName: "" }) ?? "",
    /say who the billing contact is/i,
  );
  assert.equal(
    problemWithBilling({ billingName: "Accounts", billingEmail: "accounts@example.test", groupName: "SAMPLE" }),
    null,
  );
});

test("one line says where they stand and what is missing", () => {
  const line = whereTheyStand({ stage: "active", billingEmail: "", groupName: "", reason: null });
  assert.match(line, /we work for them/i);
  assert.match(line, /no billing contact/);
  assert.match(line, /no WhatsApp group/);
  const done = whereTheyStand({
    stage: "active",
    billingEmail: "a@b.test",
    groupName: "SAMPLE",
    reason: null,
  });
  assert.equal(done, STAGE_MEANINGS.active);
  assert.match(
    whereTheyStand({ stage: "dormant", billingEmail: "a@b.test", groupName: "G", reason: "Quiet since July." }),
    /Quiet since July\./,
  );
});

test("one company never gets two client records", async () => {
  // Two records means two owners and two agreements, which is the fault on the
  // board. The TA match and the countersignature can both happen to the same
  // lead, in either order.
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-clients-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const lead = repo.addLead({
    company: "SAMPLE CLIENT (Pvt) Ltd",
    nameKey: "sample client (pvt) ltd",
    contactName: "Sample contact",
    contactEmail: "hr@example.test",
    contactPhone: "+94 77 000 0000",
    source: "email",
    industry: "Manufacturing",
    website: "",
    notes: "",
    industryFlagged: false,
    industryBecause: null,
    industryConfirmedBy: null,
    state: "waiting_agreement",
    reason: null,
    doNotInvite: false,
    clientTaId: null,
    ownerId: "m_owner",
    createdBy: "m_owner",
  });

  const first = await desk.clientFromLead(await desk.desk(), lead, "onboarding", "m_owner");
  assert.equal(first.stage, "onboarding");
  assert.equal(first.ownerId, "m_owner", "the lead's owner owns the client");

  const second = await desk.clientFromLead(
    await desk.desk(),
    { ...lead, clientTaId: "ta_c1" },
    "active",
    "m_owner",
  );
  assert.equal(second.id, first.id, "the same company, the same record");
  assert.equal(repo.all().clients.length, 1);

  const stored = repo.all().clients[0];
  assert.equal(stored.stage, "active", "the countersignature moved them on");
  assert.equal(stored.taClientId, "ta_c1", "and filled in which TA client they are");
});

test("a client made from a company we already had keeps its own owner", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-clients-owner-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const client = repo.addClient({
    leadId: null,
    taClientId: "ta_c9",
    name: "SAMPLE OLD CLIENT",
    nameKey: "sample old client",
    stage: "active",
    billingName: "",
    billingEmail: "",
    billingAddress: "",
    groupName: "",
    notes: "",
    reason: null,
    ownerId: "m_owner",
  });

  await desk.patchClient(client.id, { ownerId: "m_lead" }, "m_lead", "client.ownerMoved", "Owner on leave.");
  const after = repo.all().clients[0];
  assert.equal(after.ownerId, "m_lead");
  const entry = repo.audit().find((a) => a.action === "client.ownerMoved");
  assert(entry, "the move is written down");
  assert.equal(entry.before, "m_owner", "who had it");
  assert.equal(entry.after, "m_lead", "who has it now");
  assert.equal(entry.reason, "Owner on leave.");
});

test("an invoice is not drafted without billing name, address and email (16 Nov)", () => {
  assert.equal(problemWithInvoiceBilling({ billingName: "A", billingAddress: "1 Road", billingEmail: "a@b.test" }), null);
  const none = problemWithInvoiceBilling({ billingName: "", billingAddress: " ", billingEmail: "" }) ?? "";
  assert.match(none, /billing name, billing address, billing email/);
  assert.match(problemWithInvoiceBilling({ billingName: "A", billingEmail: "a@b.test" }) ?? "", /billing address/);
});
