import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  approveTheHold,
  liftTheHold,
  moveClientOwner,
  moveClientStage,
  saveClientDetails,
  summariseClient,
} from "@/app/actions";
import AiOffer from "@/app/AiOffer";
import Icon from "@/app/Icon";
import { Contacts } from "@/app/ui/Contacts";
import {
  Avatar,
  BackBar,
  FoldRow,
  NextStepCard,
  PageBox,
  StatTile,
  StatusChip,
  ViewPills,
  figmaField,
  figmaLabel,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import {
  activeMembers,
  agreementForLead,
  aiSwitches,
  clientIn,
  desk,
  leadIn,
  member as memberIn,
} from "@/data/desk";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { notSaidInWords, type Summary } from "@/lib/aiTasks";
import { STAGE_MEANINGS, type ClientStage, canMoveStage } from "@/lib/clients";
import { ESA_FIELDS, STATE_MEANINGS as ESA_STATES, type EsaState } from "@/lib/esa";
import { buildThreads, threadInWords } from "@/lib/mailbox";
import { balanceOf, money } from "@/lib/money";
import { clientNextStep } from "@/lib/nextStep";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { byDay, subjectsOfClient, timeline } from "@/lib/timeline";

/**
 * Unified Client Record (Figma Frames 1:587, 1:3545, 1:3510):
 *   - Frame 1:587  — CL · Client — Meridian Foods (overview)
 *   - Frame 1:3545 — CL · Client — Meridian Foods (Activity)
 *   - Frame 1:3510 — CL · Client on hold — Silverline Motors (no feedback 30 days)
 *   - Contacts, Agreements, and Openings views inside the same PageBox.
 */
export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    msg?: string;
    tab?: string;
    view?: string;
    kind?: string;
    q?: string;
    summary?: string;
    runId?: string;
  }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const {
    msg,
    tab,
    view: viewParam,
    kind = "all",
    q = "",
    summary: summaryJson,
  } = await searchParams;

  const db = await desk();
  const client = clientIn(db, id);
  if (!client) notFound();

  const now = Date.now();
  const owner = memberIn(db, client.ownerId);
  const ownerName = owner?.name ?? "Unassigned";
  const lead = client.leadId ? leadIn(db, client.leadId) : null;
  const esa = client.leadId ? agreementForLead(db, client.leadId) : null;
  const mayManage = can(me, "client.manage");
  const mayMoveOwner = can(me, "task.reassign");
  const stages = (Object.keys(STAGE_MEANINGS) as ClientStage[]).filter((s) =>
    canMoveStage(client.stage as ClientStage, s),
  );

  const clientHolds = db.holds.filter((h) => h.clientId === client.id && h.state !== "lifted");
  const activeHold = clientHolds[0] ?? null;

  // Map legacy ?tab= or new ?view= into our 5 Figma views (+ hold)
  const rawView = viewParam ?? tab ?? (activeHold ? "hold" : "overview");
  const activeView: "overview" | "contacts" | "agreements" | "openings" | "activity" | "hold" =
    rawView === "people" || rawView === "contacts"
      ? "contacts"
      : rawView === "agreement" || rawView === "agreements"
        ? "agreements"
        : rawView === "positions" || rawView === "openings"
          ? "openings"
          : rawView === "history" || rawView === "activity" || rawView === "messages" || rawView === "money"
            ? "activity"
            : rawView === "hold"
              ? "hold"
              : "overview";

  const theirPositions = db.positions.filter((p) => p.clientId === client.id);
  const openPositions = theirPositions.filter((p) => p.stage !== "closed");
  const theirSets = db.clientSets.filter((cs) => cs.clientId === client.id);
  const theirMoney = db.invoices.filter((row) => row.clientId === client.id);
  const owingInvoices = theirMoney.filter(
    (i) => i.state === "sent" || i.state === "partly_paid",
  );
  const totalOwed = owingInvoices.reduce((sum, inv) => sum + balanceOf(inv), 0);

  const guaranteesRunning = db.guarantees.filter((g) => {
    const pl = db.placements.find((p) => p.id === g.placementId);
    const pos = pl ? theirPositions.find((p) => p.openingTaId === pl.openingTaId) : null;
    return Boolean(pos && g.state === "running");
  });

  const theirIds = new Set<string>([
    client.id,
    ...db.leads.filter((l) => l.clientTaId === client.taClientId).map((l) => l.id),
    ...theirSets.map((c) => c.id),
    ...theirMoney.map((i) => i.id),
    ...theirPositions.map((p) => p.id),
  ]);
  const theirThreads = buildThreads(db.inbound, db.messages).filter(
    (thread) => thread.clientId === client.id || (thread.about && theirIds.has(thread.about.id)),
  );

  const step = clientNextStep(client, {
    positions: theirPositions,
    sets: theirSets,
    owing: owingInvoices,
    holds: db.holds.filter((h) => h.clientId === client.id),
    unanswered: new Set(
      db.inbound
        .filter((row) => row.clientId === client.id && row.readState === "new")
        .map((row) => row.from + "|" + row.subject + "|" + row.receivedAt),
    ).size,
  });

  const history = byDay(
    timeline(db, subjectsOfClient(db, client), (who) =>
      who ? (memberIn(db, who)?.name ?? null) : null,
    ),
  );
  const summary: Summary | null = summaryJson ? (JSON.parse(summaryJson) as Summary) : null;
  const aiOn = anyKeySet() && aiSwitches(db).on;
  const whyAiOff = aiOffReason(anyKeySet(), aiSwitches(db).on);

  const sinceYear = new Date(client.createdAt).getFullYear();
  const subtitleParts = [
    lead?.industry || "Client",
    client.billingName ? `${client.billingName}${client.billingEmail ? ` (${client.billingEmail})` : ""}` : null,
    client.groupName ? `WhatsApp: ${client.groupName}` : null,
  ].filter(Boolean);

  const viewPills = [
    { key: "overview", label: "Overview", href: `/clients/${client.id}?view=overview` },
    { key: "contacts", label: "Contacts", href: `/clients/${client.id}?view=contacts` },
    { key: "agreements", label: "Agreements", href: `/clients/${client.id}?view=agreements` },
    {
      key: "openings",
      label: "Openings",
      count: theirPositions.length,
      href: `/clients/${client.id}?view=openings`,
    },
    { key: "activity", label: "Activity", href: `/clients/${client.id}?view=activity` },
    ...(activeHold || client.stage === "on_hold"
      ? [{ key: "hold", label: "On hold", href: `/clients/${client.id}?view=hold` }]
      : []),
  ];

  // Filter timeline entries for Activity view (1:3545)
  const queryLower = q.trim().toLowerCase();
  const allEntries = history.flatMap((g) =>
    g.entries.map((e) => ({ ...e, dayLabel: g.day })),
  );
  const filteredEntries = allEntries.filter((entry) => {
    if (
      queryLower &&
      !entry.said.toLowerCase().includes(queryLower) &&
      !entry.about.toLowerCase().includes(queryLower) &&
      !(entry.because ?? "").toLowerCase().includes(queryLower)
    ) {
      return false;
    }
    if (kind === "messages") {
      return (
        entry.about.toLowerCase().includes("message") ||
        entry.said.toLowerCase().includes("sent") ||
        entry.said.toLowerCase().includes("email") ||
        entry.said.toLowerCase().includes("whatsapp")
      );
    }
    if (kind === "decisions") {
      return (
        entry.said.toLowerCase().includes("signed") ||
        entry.said.toLowerCase().includes("approved") ||
        entry.said.toLowerCase().includes("moved") ||
        entry.said.toLowerCase().includes("hold") ||
        entry.said.toLowerCase().includes("selected")
      );
    }
    if (kind === "money") {
      return (
        entry.about.toLowerCase().includes("invoice") ||
        entry.said.toLowerCase().includes("invoice") ||
        entry.said.toLowerCase().includes("paid") ||
        entry.said.toLowerCase().includes("fee")
      );
    }
    return true;
  });

  const weekAgo = now - 7 * 86_400_000;
  const thisWeekEntries = filteredEntries.filter((e) => e.at >= weekAgo);
  const earlierEntries = filteredEntries.filter((e) => e.at < weekAgo);

  const readySet = theirSets.find((s) => s.state === "ready" || s.state === "reviewing");

  return (
    <PageBox width="1080" className="gap-7">
      {/* Top BackBar (Figma 1:591 / 1:3514) */}
      <BackBar
        href="/clients"
        label="Clients"
        right={
          <div className="flex items-center gap-2.5">
            {(activeHold || client.stage === "on_hold") && (
              <StatusChip label="On hold" tone="warn" />
            )}
            <Avatar name={ownerName} size="32" />
            <details className="relative">
              <summary
                aria-label="More client actions"
                className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full bg-sunk text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden"
              >
                <Icon name="more" size={16} />
              </summary>
              <div className="absolute right-0 top-10 z-20 flex w-56 flex-col gap-1 rounded-[18px] bg-surface p-2 shadow-float">
                <Link
                  href={`/clients/${client.id}?view=overview`}
                  className="rounded-lg px-3 py-1.5 text-[13px] text-ink-soft hover:bg-sunk hover:text-ink"
                >
                  Overview
                </Link>
                <Link
                  href={`/clients/${client.id}?view=contacts`}
                  className="rounded-lg px-3 py-1.5 text-[13px] text-ink-soft hover:bg-sunk hover:text-ink"
                >
                  Contacts &amp; billing
                </Link>
                <Link
                  href={`/clients/${client.id}?view=activity`}
                  className="rounded-lg px-3 py-1.5 text-[13px] text-ink-soft hover:bg-sunk hover:text-ink"
                >
                  Activity timeline
                </Link>
                <Link
                  href="/clients/owners"
                  className="rounded-lg px-3 py-1.5 text-[13px] text-brand hover:bg-sunk"
                >
                  Move owner
                </Link>
              </div>
            </details>
          </div>
        }
      />

      {/* Header + ViewPills (Figma 1:604) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className={figmaLabel}>
            {activeView === "hold" ? `Client · ${ownerName}` : `Client since ${sinceYear}`}
          </span>
          <h1 className="text-[40px] font-light leading-[50px] text-ink">
            {client.name}
          </h1>
          <p className="text-[16px] font-normal leading-[26px] text-ink-soft">
            {subtitleParts.join(" · ")}
          </p>
        </div>

        <ViewPills items={viewPills} active={activeView} />
      </div>

      {msg && (
        <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">{msg}</p>
      )}

      {/* =====================================================================
          HOLD VIEW (Figma Frame 1:3510 — CL · Client on hold — Silverline Motors)
         ===================================================================== */}
      {activeView === "hold" && (
        <>
          <NextStepCard
            title={
              activeHold?.state === "proposed"
                ? `No feedback for 30 days — put ${client.name} on hold?`
                : `${client.name} is on hold — review or lift when they reply`
            }
            clock={{ label: "30 days", tone: "warn", icon: "clock" }}
            body={
              activeHold
                ? `${activeHold.reason}. Putting a client on hold pauses TA work and sends them a polite notice — it never closes the role on its own. We check back in 30 days.`
                : "A client who has gone quiet goes on hold with a notice they receive, and never closes automatically."
            }
            byItself="Hold never closes a client automatically — a person decides after the 30-day review."
          >
            {activeHold && mayManage && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {activeHold.state === "proposed" ? (
                  <>
                    <form action={approveTheHold} className="flex flex-wrap items-center gap-2.5">
                      <input type="hidden" name="holdId" value={activeHold.id} />
                      <input type="hidden" name="reason" value={activeHold.reason} />
                      <button type="submit" className={pillPrimary}>
                        Approve &amp; send hold notice
                      </button>
                    </form>
                    <form action={liftTheHold} className="flex flex-wrap items-center gap-2.5">
                      <input type="hidden" name="holdId" value={activeHold.id} />
                      <input
                        type="hidden"
                        name="reason"
                        value="Keeping open — calling the client first."
                      />
                      <button type="submit" className={pillSecondary}>
                        Keep open — call them first
                      </button>
                    </form>
                    {activeHold.noticeMessageId && (
                      <Link
                        href={`/messages/${activeHold.noticeMessageId}`}
                        className="px-3 py-2 text-[14px] font-medium text-brand hover:underline"
                      >
                        Edit notice
                      </Link>
                    )}
                  </>
                ) : (
                  <form action={liftTheHold} className="flex flex-wrap items-center gap-2.5">
                    <input type="hidden" name="holdId" value={activeHold.id} />
                    <input
                      name="reason"
                      required
                      placeholder="What changed? (e.g. client replied with feedback)"
                      className="rounded-full bg-sunk px-4 py-2.5 text-[14px] text-ink outline-none sm:w-80"
                    />
                    <button type="submit" className={pillPrimary}>
                      Lift the hold
                    </button>
                  </form>
                )}
              </div>
            )}
          </NextStepCard>

          <div className="flex flex-col gap-2.5">
            {theirPositions.map((pos) => {
              const setsForPos = theirSets.filter(
                (s) => s.openingTaId === pos.openingTaId,
              );
              const totalCvs = setsForPos.reduce(
                (n, s) => n + s.candidates.length,
                0,
              );
              return (
                <FoldRow
                  key={pos.id}
                  title={`Opening · ${pos.title}`}
                  summary={`Set ${setsForPos.length || 1} (${totalCvs} CVs) · ${pos.stage}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                    <span className="text-ink-soft">
                      Opening ID: {pos.openingTaId || "Pending TA sync"} · Stage: {pos.stage}
                    </span>
                    <Link
                      href={`/positions/${pos.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      Open position →
                    </Link>
                  </div>
                </FoldRow>
              );
            })}

            <FoldRow
              title="If they come back"
              summary="Any reply reopens the client and restarts the feedback clock from that day"
            >
              <div className="flex flex-col gap-3">
                <p className="text-[14px] text-ink-soft">
                  Any word from the client is enough. The TA System is told the opening is open again, and the feedback chase starts again from today.
                </p>
                {activeHold && mayManage && (
                  <form action={liftTheHold} className="flex flex-wrap items-center gap-2.5">
                    <input type="hidden" name="holdId" value={activeHold.id} />
                    <input
                      name="reason"
                      required
                      placeholder="How did they come back?"
                      className={figmaField + " max-w-md"}
                    />
                    <button type="submit" className={pillSecondary}>
                      Lift the hold
                    </button>
                  </form>
                )}
              </div>
            </FoldRow>
          </div>
        </>
      )}

      {/* =====================================================================
          OVERVIEW VIEW (Figma Frame 1:587 — CL · Client — Meridian Foods)
         ===================================================================== */}
      {activeView === "overview" && (
        <>
          {/* Hero NextStepCard (Figma 1:615) */}
          <NextStepCard
            title={
              readySet
                ? `${readySet.name} (${readySet.candidates.length} CVs) is ready to send`
                : step.where
            }
            clock={
              step.clock
                ? {
                    label: step.clock,
                    tone: step.clock.includes("ago") ? "danger" : "warn",
                    icon: "clock",
                  }
                : { label: "Up to date", tone: "ok", icon: "check" }
            }
            body={step.waiting}
          >
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {readySet ? (
                <>
                  <Link href={`/sets/${readySet.id}`} className={pillPrimary}>
                    Review &amp; send
                  </Link>
                  {openPositions[0] && (
                    <Link
                      href={`/positions/${openPositions[0].id}`}
                      className={pillSecondary}
                    >
                      Open the position
                    </Link>
                  )}
                </>
              ) : activeHold ? (
                <Link
                  href={`/clients/${client.id}?view=hold`}
                  className={pillPrimary}
                >
                  Review hold
                </Link>
              ) : owingInvoices[0] ? (
                <Link
                  href={`/invoices/${owingInvoices[0].id}`}
                  className={pillPrimary}
                >
                  View unpaid invoice
                </Link>
              ) : openPositions[0] ? (
                <Link
                  href={`/positions/${openPositions[0].id}`}
                  className={pillPrimary}
                >
                  Open the position
                </Link>
              ) : lead ? (
                <Link href={`/leads/${lead.id}`} className={pillSecondary}>
                  View original enquiry
                </Link>
              ) : null}
            </div>
          </NextStepCard>

          {/* 3 Stat Tiles (Figma 1:626) */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <StatTile
              value={String(openPositions.length)}
              label={openPositions.length === 1 ? "opening" : "openings"}
            />
            <StatTile
              value={String(guaranteesRunning.length)}
              label={
                guaranteesRunning.length === 1
                  ? "placement in guarantee"
                  : "placements in guarantee"
              }
            />
            <StatTile
              value={
                totalOwed > 0
                  ? totalOwed >= 1000
                    ? `LKR ${Math.round(totalOwed / 1000)}k`
                    : money(totalOwed)
                  : "LKR 0"
              }
              label={
                owingInvoices[0]
                  ? `owed · ${owingInvoices[0].number}`
                  : "owed · all paid"
              }
            />
          </div>

          {/* OPENINGS list (Figma 1:640) */}
          <div className="flex flex-col gap-2">
            <span className={figmaLabel}>OPENINGS</span>
            {theirPositions.length === 0 ? (
              <p className="rounded-[24px] bg-sunk px-6 py-5 text-[14px] text-ink-soft">
                No openings yet. An opening appears here once a requirement meeting is held and handed to the TA System.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {theirPositions.map((position) => {
                  const posSets = theirSets.filter(
                    (s) => s.openingTaId === position.openingTaId,
                  );
                  const readyForPos = posSets.find(
                    (s) => s.state === "ready" || s.state === "reviewing",
                  );
                  const daysOpen = Math.max(
                    1,
                    Math.round((now - position.createdAt) / 86_400_000),
                  );
                  return (
                    <Link
                      key={position.id}
                      href={`/positions/${position.id}`}
                      className="flex items-center gap-3.5 rounded-[16px] px-2 py-[9px] transition-colors hover:bg-sunk"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft">
                        <Icon name="briefcase" size={18} />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[16px] font-medium leading-[26px] text-ink">
                          {position.title}
                        </span>
                        <span className="text-[14px] font-normal leading-[21px] text-ink-soft">
                          {position.stage.replace(/_/g, " ")} ·{" "}
                          {posSets.length > 0
                            ? `${posSets.length} ${posSets.length === 1 ? "set" : "sets"}`
                            : "sourcing"}
                        </span>
                      </div>
                      <span
                        className={
                          "text-[14px] font-medium leading-[21px] " +
                          (readyForPos ? "text-warning" : "text-ink-soft")
                        }
                      >
                        {readyForPos ? "Due today" : `Day ${daysOpen}`}
                      </span>
                      <Icon
                        name="chevron-right"
                        size={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Collapsible Folds for AURA summary, Threads, and Stage/Owner management */}
          <div className="flex flex-col gap-2.5">
            <FoldRow
              title="Where this client stands (AURA summary)"
              summary={
                summary
                  ? "Summary generated from client records"
                  : "Agreements, positions, sets, invoices and holds in one paragraph"
              }
              defaultOpen={Boolean(summary)}
            >
              <div className="flex flex-col gap-3">
                {!aiOn ? (
                  <AiOffer label="Summarise their history" why={whyAiOff ?? ""} />
                ) : (
                  <form action={summariseClient}>
                    <input type="hidden" name="clientId" value={client.id} />
                    <button type="submit" className={pillSecondary}>
                      Summarise their history
                    </button>
                  </form>
                )}
                {summary && (
                  <div className="flex flex-col gap-1.5 text-[14px]">
                    <p className="whitespace-pre-wrap text-ink">{summary.summary}</p>
                    {summary.points?.map((point, i) => (
                      <p key={i} className="text-ink-soft">
                        · {point}
                      </p>
                    ))}
                    {notSaidInWords(summary.notSaid ?? []) && (
                      <p className="text-[13px] text-warning">
                        {notSaidInWords(summary.notSaid ?? [])}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </FoldRow>

            <FoldRow
              title="Manage stage & owner"
              summary={`${STAGE_MEANINGS[client.stage as ClientStage] ?? client.stage} · ${ownerName} owns them`}
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {mayManage && stages.length > 0 && (
                  <form action={moveClientStage} className="flex flex-col gap-3">
                    <input type="hidden" name="clientId" value={client.id} />
                    <span className={figmaLabel}>Move stage</span>
                    <select
                      name="stage"
                      defaultValue={stages[0]}
                      className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                    >
                      {stages.map((stage) => (
                        <option key={stage} value={stage}>
                          {STAGE_MEANINGS[stage]}
                        </option>
                      ))}
                    </select>
                    <input
                      name="reason"
                      placeholder="Why are they moving?"
                      className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                    />
                    <button type="submit" className={pillSecondary + " self-start"}>
                      Move them
                    </button>
                  </form>
                )}

                {mayMoveOwner && (
                  <form action={moveClientOwner} className="flex flex-col gap-3">
                    <input type="hidden" name="clientId" value={client.id} />
                    <span className={figmaLabel}>Move owner</span>
                    <select
                      name="ownerId"
                      defaultValue=""
                      className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                    >
                      <option value="">— pick new owner —</option>
                      {activeMembers(db)
                        .filter((m) => m.id !== client.ownerId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                    <input
                      name="reason"
                      placeholder="Why is the owner changing?"
                      className="rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none"
                    />
                    <button type="submit" className={pillSecondary + " self-start"}>
                      Move the owner
                    </button>
                  </form>
                )}
              </div>
            </FoldRow>
          </div>
        </>
      )}

      {activeView === "contacts" && (
        <Contacts
          scope="client"
          id={client.id}
          contacts={client.contacts ?? []}
          mayManage={mayManage}
          heading="PEOPLE WE WRITE TO"
          hint="Their standard contacts get everything: CV sets, interview times, meeting invites. A person marked hr receives the CV sets. A position can name extra people on its own page."
        />
      )}

      {/* =====================================================================
          CONTACTS VIEW
         ===================================================================== */}
      {activeView === "contacts" && (
        <div className="flex flex-col gap-5 rounded-[24px] bg-sunk p-6">
          <div className="flex flex-col gap-1">
            <span className={figmaLabel}>CONTACTS &amp; BILLING</span>
            <p className="text-[14px] text-ink-soft">
              Who we invoice and which WhatsApp group is theirs, kept on the client record so every set and invoice reaches the right person.
            </p>
          </div>

          {mayManage ? (
            <form action={saveClientDetails} className="flex flex-col gap-4">
              <input type="hidden" name="clientId" value={client.id} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={figmaLabel}>Billing contact</span>
                  <input
                    name="billingName"
                    defaultValue={client.billingName}
                    className="rounded-[10px] bg-surface px-3.5 py-3 text-[16px] text-ink outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={figmaLabel}>Their email</span>
                  <input
                    name="billingEmail"
                    defaultValue={client.billingEmail}
                    className="rounded-[10px] bg-surface px-3.5 py-3 text-[16px] text-ink outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={figmaLabel}>Billing address</span>
                  <input
                    name="billingAddress"
                    defaultValue={client.billingAddress ?? ""}
                    className="rounded-[10px] bg-surface px-3.5 py-3 text-[16px] text-ink outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={figmaLabel}>WhatsApp group</span>
                  <input
                    name="groupName"
                    defaultValue={client.groupName}
                    className="rounded-[10px] bg-surface px-3.5 py-3 text-[16px] text-ink outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={figmaLabel}>Anything worth knowing</span>
                  <input
                    name="notes"
                    defaultValue={client.notes}
                    className="rounded-[10px] bg-surface px-3.5 py-3 text-[16px] text-ink outline-none"
                  />
                </label>
              </div>
              <button type="submit" className={pillPrimary + " self-start"}>
                Save details
              </button>
            </form>
          ) : (
            <p className="text-[14px] text-ink-soft">
              {client.billingName || "No billing contact"} · {client.billingEmail || "No email"} ·{" "}
              {client.billingAddress || "No billing address"} ·{" "}
              {client.groupName || "No WhatsApp group"}
            </p>
          )}
        </div>
      )}

      {/* =====================================================================
          AGREEMENTS VIEW
         ===================================================================== */}
      {activeView === "agreements" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3.5 rounded-[24px] bg-sunk px-6 py-[22px]">
            <span className={figmaLabel}>TERMS</span>
            {esa ? (
              <div className="flex flex-col">
                {ESA_FIELDS.map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between border-t border-rule py-2.5 text-[14px] first:border-t-0"
                  >
                    <span className="text-ink-soft">{f.label}</span>
                    <span className="font-medium text-ink">{esa.fields[f.key] || "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-ink-soft">
                Standard Career 141 terms (signed before Ops or via TA System).
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3.5 rounded-[24px] bg-sunk px-6 py-[22px]">
            <span className={figmaLabel}>AGREEMENT RECORD</span>
            {esa ? (
              <div className="flex flex-col gap-3 text-[14px]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">Version {esa.version}</span>
                  <StatusChip
                    label={ESA_STATES[esa.state as EsaState] ?? esa.state}
                    tone={
                      esa.state === "signed" || esa.state === "countersigned"
                        ? "ok"
                        : "brand"
                    }
                  />
                </div>
                {lead && (
                  <Link
                    href={`/leads/${lead.id}?view=agreement`}
                    className={pillSecondary + " self-start"}
                  >
                    Open full agreement view
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-[14px] text-ink-soft">
                No separate Ops agreement file on record; linked directly from the TA System ({client.taClientId || "local"}).
              </p>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          OPENINGS VIEW
         ===================================================================== */}
      {activeView === "openings" && (
        <div className="flex flex-col gap-3">
          <span className={figmaLabel}>ALL OPENINGS ({theirPositions.length})</span>
          {theirPositions.length === 0 ? (
            <p className="rounded-[24px] bg-sunk px-6 py-6 text-[14px] text-ink-soft">
              They have not asked us to fill anything yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {theirPositions.map((position) => (
                <Link
                  key={position.id}
                  href={`/positions/${position.id}`}
                  className="flex items-center gap-3.5 rounded-[16px] bg-sunk px-4 py-3.5 transition-colors hover:bg-rule/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft">
                    <Icon name="briefcase" size={18} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[16px] font-medium leading-[26px] text-ink">
                      {position.title}
                    </span>
                    <span className="text-[14px] text-ink-soft">
                      {position.openingTaId
                        ? `Opening ${position.openingTaId}`
                        : "Waiting for TA System"}
                    </span>
                  </div>
                  <StatusChip
                    label={position.stage}
                    tone={position.stage === "closed" ? "neutral" : "brand"}
                  />
                  <Icon name="chevron-right" size={16} className="text-ink-faint" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          ACTIVITY VIEW (Figma Frame 1:3545 — CL · Client — Meridian Foods (Activity))
         ===================================================================== */}
      {activeView === "activity" && (
        <div className="flex flex-col gap-6">
          {/* Sub-filter pills + search bar (Figma 1:3566) */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <ViewPills
              active={kind}
              items={[
                {
                  key: "all",
                  label: "Everything",
                  href: `/clients/${client.id}?view=activity&kind=all`,
                },
                {
                  key: "messages",
                  label: "Messages",
                  href: `/clients/${client.id}?view=activity&kind=messages`,
                },
                {
                  key: "decisions",
                  label: "Decisions",
                  href: `/clients/${client.id}?view=activity&kind=decisions`,
                },
                {
                  key: "money",
                  label: "Money",
                  href: `/clients/${client.id}?view=activity&kind=money`,
                },
              ]}
            />

            <form
              action={`/clients/${client.id}`}
              className="flex h-[46px] w-[260px] items-center gap-2.5 rounded-full bg-sunk pl-4 pr-3 sm:w-[300px]"
            >
              <input type="hidden" name="view" value="activity" />
              {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
              <Icon name="search" size={18} className="shrink-0 text-ink-faint" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search what happened"
                aria-label="Search what happened"
                className="min-w-0 flex-1 bg-transparent text-[14px] leading-[21px] text-ink outline-none placeholder:text-ink-faint"
              />
            </form>
          </div>

          {/* Vertical Rail Timeline (Figma 1:3576) */}
          {filteredEntries.length === 0 ? (
            <p className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              Nothing recorded matching that filter yet.
            </p>
          ) : (
            <div className="flex flex-col gap-7">
              {[
                { label: "THIS WEEK", items: thisWeekEntries },
                { label: "EARLIER", items: earlierEntries },
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div key={group.label} className="flex flex-col gap-4">
                    <span className={figmaLabel}>{group.label}</span>
                    <div className="relative flex flex-col gap-5 pl-6">
                      {/* Vertical rail line */}
                      <span
                        aria-hidden="true"
                        className="absolute bottom-2 left-[4px] top-2 w-[2px] bg-rule"
                      />
                      {group.items.map((entry) => {
                        const lower = entry.said.toLowerCase();
                        const dotTone =
                          lower.includes("signed") ||
                          lower.includes("joined") ||
                          lower.includes("paid")
                            ? "bg-ok"
                            : lower.includes("due") ||
                                lower.includes("chase") ||
                                lower.includes("hold")
                              ? "bg-warning"
                              : lower.includes("sent") || lower.includes("set")
                                ? "bg-brand"
                                : "bg-ink-faint";
                        const timeStr = new Date(entry.at + 5.5 * 3_600_000)
                          .toISOString()
                          .slice(11, 16);

                        return (
                          <div key={entry.id} className="relative flex flex-col gap-0.5">
                            <span
                              aria-hidden="true"
                              className={`absolute -left-[24px] top-1.5 size-2.5 rounded-full ${dotTone}`}
                            />
                            <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">
                              {entry.dayLabel} · {timeStr}
                            </span>
                            <p className="text-[16px] font-normal leading-[26px] text-ink">
                              {entry.said}
                            </p>
                            <p className="text-[14px] font-normal leading-[21px] text-ink-soft">
                              {entry.about}
                              {entry.by ? ` · ${entry.by}` : " · Automatic"}
                              {entry.because && !entry.said.includes(entry.because)
                                ? ` · ${entry.because}`
                                : ""}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {theirThreads.length > 0 && (
            <FoldRow
              title="Email & WhatsApp conversations"
              summary={`${theirThreads.length} ${theirThreads.length === 1 ? "thread" : "threads"}`}
            >
              <div className="flex flex-col gap-2">
                {theirThreads.map((thread) => (
                  <div
                    key={thread.key}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-t border-rule py-2 text-[14px] first:border-t-0"
                  >
                    <Link
                      href={"/mail/" + encodeURIComponent(thread.key)}
                      className="font-medium text-brand hover:underline"
                    >
                      {thread.subject}
                    </Link>
                    <span className="text-[13px] text-ink-soft">
                      {thread.withName} · {threadInWords(thread, now)}
                    </span>
                  </div>
                ))}
              </div>
            </FoldRow>
          )}
        </div>
      )}
    </PageBox>
  );
}
