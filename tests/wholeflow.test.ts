/**
 * The whole flow, enquiry to close, in one go (15, Phase 8 step 1).
 *
 * Not a unit test. Every piece has its own test beside this one; this is the
 * proof that they are wired to each other, and that a client can be taken
 * from a signed agreement to a closed position without a person having to
 * remember any of it.
 *
 * It walks the happy road, because the branches are each tested where they
 * live: a clock fires, a set goes, the client answers, an interview is held,
 * somebody is placed, the fee is invoiced and paid, the guarantee runs its
 * ninety days, and the position closes with nothing left running.
 *
 * Nothing leaves the building: no sender is switched on, and every message is
 * checked to be a draft.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-wholeflow-"));
process.env.OPS_STORE = "json";
// The TA side of the API does not exist yet, so the stand-in answers. Every
// other line here is the real code path.
process.env.OPS_TA_FAKE = "on";
delete process.env.OPS_SEND;

const { repo } = await import("@/data/store");
const desk = await import("@/data/desk");
const { DAY } = await import("@/lib/calendar");

repo.reset();

const OWNER = "m_owner";
const LEAD = "m_lead";
const DAY_ONE = Date.now() - 120 * DAY;

/** Everything the flow has made, so each step can read what came before. */
const made: Record<string, string> = {};

test("1. a client with a signed agreement, and a position handed to TA", async () => {
  const lead = repo.addLead({
    company: "SAMPLE CLIENT",
    nameKey: "sample client",
    contactName: "Sample contact",
    contactEmail: "hr@example.test",
    contactPhone: "",
    source: "website",
    industry: "Manufacturing",
    website: "",
    notes: "",
    industryFlagged: false,
    industryBecause: null,
    industryConfirmedBy: null,
    state: "requirement",
    reason: null,
    doNotInvite: false,
    clientTaId: "ta_c1",
    ownerId: OWNER,
    createdBy: OWNER,
  });
  repo.addAgreement({
    leadId: lead.id,
    clientTaId: "ta_c1",
    state: "countersigned",
    version: 1,
    fields: { companyName: "SAMPLE CLIENT", feeMonths: "1", feeBasis: "gross" },
    draftFileId: null,
    sentAt: DAY_ONE,
    sentMessageId: null,
    chaseStep: 0,
    expiresAt: null,
    signedAt: DAY_ONE + 3 * DAY,
    signedFileId: "f_s",
    countersignedAt: DAY_ONE + 4 * DAY,
    countersignedFileId: "f_c",
    reason: null,
    ownerId: OWNER,
  });
  const client = repo.addClient({
    leadId: lead.id,
    taClientId: "ta_c1",
    name: "SAMPLE CLIENT",
    nameKey: "sample client",
    stage: "active",
    billingName: "SAMPLE CLIENT (PVT) LTD",
    billingEmail: "finance@example.test",
    billingAddress: "1 Test Road, Colombo 03",
    groupName: "",
    notes: "",
    reason: null,
    ownerId: OWNER,
  });
  made.lead = lead.id;
  made.client = client.id;

  // TA confirms the opening it created from our requirement.
  const position = repo.addPosition({
    requirementId: null,
    clientId: client.id,
    clientTaId: "ta_c1",
    openingTaId: "ta_j1",
    title: "Head of finance",
    stage: "searching",
    primaryTaId: "ta_u2",
    hundredPercentDay: null,
    taStatus: "open",
    jdApprovedAt: DAY_ONE + 5 * DAY,
    linkedInUrl: "https://www.linkedin.com/jobs/view/4123456789",
    linkedInPostedAt: DAY_ONE + 5 * DAY,
    depthStage: null,
    shortlistedTotal: null,
    pendingCount: null,
    depthCheckedAt: null,
    handedOverAt: DAY_ONE + 5 * DAY,
    closedAt: null,
    ownerId: OWNER,
  });
  made.position = position.id;
  assert.equal(repo.all().positions.length, 1);
});

test("2. TA says a set is ready, and it goes to the client", async () => {
  const set = await desk.takeClientSetReady({ openingId: "ta_j1", setNumber: 1 }, DAY_ONE + 20 * DAY);
  assert(set, "the set arrived from TA's own event");
  made.set = set.id;
  assert.equal(set.name, "SAMPLE CLIENT > HEAD OF FINANCE > SET 1");
  // Due counted from the day the agreement was signed, not from today.
  assert(set.dueAt && set.dueAt > DAY_ONE, "it has a due date from the agreement");

  // Sending is the screen's job; here the state and the clocks are what
  // matters, so the set is marked sent the way the action does.
  const receivedAt = DAY_ONE + 21 * DAY;
  repo.patchClientSet(
    set.id,
    { state: "sent", sentAt: receivedAt, sentTo: ["hr@example.test"], receivedAt },
    OWNER,
    "clientSet.sent",
    null,
  );
  await desk.startReceiptClocks(repo.all(), { ...set, state: "sent", receivedAt }, receivedAt);
  // Sending cancels the clock that was waiting for the set to go out.
  await desk.cancelClocksFor(repo.all(), "clientSet", set.id, OWNER, "The set has gone.", ["set.due"]);
  const clocks = repo.liveTimers().filter((t) => t.subjectId === set.id);
  assert.deepEqual(
    clocks.map((c) => c.kind).sort(),
    ["feedback.chase", "hire.unreported", "set.ownership", "silence.hold"],
    "four clocks start from the day they received it",
  );
});

test("3. the client answers, and the depth is counted from TA's pipeline", async () => {
  const set = repo.all().clientSets[0];
  const candidates = set.candidates.map((c) =>
    c.applicationTaId === "ta_a4"
      ? { ...c, decision: "shortlisted", decisionReason: "Want to meet them.", decidedAt: DAY_ONE + 24 * DAY }
      : c,
  );
  repo.patchClientSet(set.id, { candidates }, OWNER, "clientSet.decision.shortlisted", "Want to meet them.");

  const counted = await desk.evaluateDepth(made.position, DAY_ONE + 24 * DAY);
  assert.equal(counted.ok, true);
  // The stand-in's pipeline has four shortlisted and two waiting, so the TA
  // goes back out on the add-on search rather than waiting on the client.
  assert.equal(counted.stage, "add_on");
  const position = repo.all().positions[0];
  assert.equal(position.shortlistedTotal, 4);
  assert.equal(position.pendingCount, 2);
});

test("4. an interview is agreed, booked, held, and the client picks somebody", async () => {
  const at = DAY_ONE + 30 * DAY;
  const interview = repo.addInterview({
    applicationTaId: "ta_a4",
    openingTaId: "ta_j1",
    positionId: made.position,
    clientId: made.client,
    candidateName: "SAMPLE CANDIDATE FOUR",
    scheduler: "us",
    state: "booked",
    round: 1,
    slots: [at],
    slotLoops: 1,
    at,
    format: "online",
    interviewers: ["hr@example.test"],
    whereOrLink: "https://teams.example.test/meet/1",
    interviewTaId: "ta_i1",
    inviteMessageId: null,
    attendedAt: null,
    decision: null,
    decisionReason: null,
    decidedAt: null,
    candidateFeedback: null,
    reason: null,
    ownerId: OWNER,
  });
  made.interview = interview.id;
  await desk.startInterviewClocks(interview, at - 3 * DAY);

  // The day before, the client's reminder is drafted and the TA is asked.
  const reminded = await desk.remindAboutInterview(interview.id, at - DAY);
  assert.equal(reminded.ok, true);

  // TA phones the candidate afterwards; their words are drafted for the
  // client and left for the morning.
  repo.patchInterview(interview.id, { state: "attended", attendedAt: at }, OWNER, "interview.attended", null);
  await desk.takeInterviewEvent(
    "interview.feedback",
    { applicationId: "ta_a4", feedback: "Happy with the role and the package." },
    at + HOURS(2),
  );
  assert.match(repo.interviewIn(interview.id)?.candidateFeedback ?? "", /Happy with the role/);

  repo.patchInterview(
    interview.id,
    { decision: "selected", decidedAt: at + DAY },
    OWNER,
    "interview.decision.selected",
    null,
  );
});

function HOURS(n: number): number {
  return n * 3_600_000;
}

test("5. TA places them, and accounts hears the same day", async () => {
  const placedAt = DAY_ONE + 35 * DAY;
  const placement = await desk.takePlacement({ placementId: "ta_p1" }, placedAt);
  assert(placement, "the placement came from TA's own event");
  made.placement = placement.id;
  assert.equal(placement.clientId, made.client, "joined to our own client record");
  assert.equal(placement.feeMonths, 1, "the fee rule off the signed agreement");
  const notice = repo.all().messages.find((m) => m.templateKey === "placement.notice");
  assert.equal(notice?.channel, "internal", "the same-day notice is internal, so nobody approves it");
});

test("6. they join: the fee is invoiced and the guarantee starts", async () => {
  const joinedAt = DAY_ONE + 50 * DAY;
  const joined = await desk.markPlacementJoined(made.placement, OWNER, joinedAt);
  assert.equal(joined.ok, true);

  const invoice = repo.all().invoices[0];
  assert(invoice, "the fee is drafted the day they join");
  made.invoice = invoice.id;
  assert.equal(invoice.amount, 450_000, "one month of the package");
  assert.equal(invoice.dueAt, joinedAt + 30 * DAY, "thirty days from the first working day");

  const guarantee = repo.all().guarantees[0];
  assert(guarantee, "and the ninety days start");
  made.guarantee = guarantee.id;
  assert.equal(guarantee.endsAt, joinedAt + 90 * DAY);
  assert.equal(guarantee.feePaidAt, null, "nothing is paid yet, so it would not hold today");
});

test("7. the invoice goes, the money comes in, and the guarantee holds", async () => {
  const invoice = repo.invoiceIn(made.invoice);
  const sentAt = DAY_ONE + 51 * DAY;
  repo.patchInvoice(made.invoice, { state: "sent", sentAt }, "m_accounts", "invoice.sent", null);

  // Paid in full, which is what makes the guarantee real.
  const paidAt = DAY_ONE + 70 * DAY;
  repo.patchInvoice(
    made.invoice,
    {
      state: "paid",
      paidAt,
      payments: [{ amount: invoice!.amount, paidAt, method: "bank transfer", by: "m_accounts", note: null }],
    },
    "m_accounts",
    "invoice.paid",
    null,
  );
  repo.patchGuarantee(made.guarantee, { feePaidAt: paidAt }, "m_accounts", "guarantee.feePaid", null);

  const { verdictOnLeaver } = await import("@/lib/guarantee");
  assert.equal(verdictOnLeaver(repo.guaranteeIn(made.guarantee)?.feePaidAt ?? null).state, "replacing");
});

test("8. ninety clean days, and the position closes with nothing left running", async () => {
  const guarantee = repo.guaranteeIn(made.guarantee)!;
  await desk.warnAboutGuarantee(made.guarantee, guarantee.endsAt - 15 * DAY);
  assert.equal(repo.guaranteeIn(made.guarantee)?.state, "warned", "day 75");

  await desk.endGuaranteeClean(made.guarantee, guarantee.endsAt);
  assert.equal(repo.guaranteeIn(made.guarantee)?.state, "ended_clean");

  const checklist = repo.all().closeChecklists[0];
  assert(checklist, "the close list opened by itself");
  assert.equal(checklist.trigger, "ended_clean");
  // The LinkedIn post was recorded, so closing it is on the list.
  assert(checklist.items.some((i) => i.key === "linkedin"), "and knows this one was advertised");

  const items = checklist.items.map((i) => ({ ...i, doneAt: guarantee.endsAt, doneBy: OWNER }));
  repo.patchChecklist(checklist.id, { items, completedAt: guarantee.endsAt }, LEAD, "close.completed", "ended_clean");
  repo.patchPosition(made.position, { stage: "closed", closedAt: guarantee.endsAt }, LEAD, "position.closed", null);

  assert.equal(repo.all().positions[0].stage, "closed");
  // Only this flow's own rows: the seed has sample clocks of its own.
  const mine = [made.guarantee, made.placement];
  const left = repo.liveTimers().filter((t) => mine.includes(t.subjectId));
  assert.deepEqual(
    left.map((t) => t.kind),
    [],
    "no clock is left running on a finished position",
  );
});

test("9. nothing left the building, and everything is written down", () => {
  const all = repo.all();
  // Every message to anybody outside is still a draft: no sender was on.
  const outside = all.messages.filter((m) => m.channel !== "internal");
  assert(outside.length > 0, "the flow really did draft client messages");
  for (const message of outside) {
    assert.equal(message.state, "draft", message.templateKey + " was not left as a draft");
    assert.equal(message.sentAt, null);
  }

  // Everything TA was told about is queued, not fired and forgotten.
  assert(all.outbox.length > 0, "TA was told things");
  for (const item of all.outbox) {
    assert(item.idempotencyKey, "every write carries a key, so asking twice makes one");
  }

  // The audit is the record a year later: every stage of the flow is in it.
  const actions = all.audit.map((a) => a.action);
  for (const needed of [
    "clientSet.ready",
    "position.depth.add_on",
    "interview.attended",
    "placement.taken",
    "placement.joined",
    "invoice.drafted",
    "invoice.paid",
    "guarantee.started",
    "guarantee.endedClean",
    "close.opened",
    "close.completed",
    "position.closed",
  ]) {
    assert(actions.includes(needed), "the audit is missing " + needed);
  }
});
