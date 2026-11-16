import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  approvePositionJd,
  openCloseByHand,
  recordLinkedInPost,
  requestAd,
  savePositionRequirement,
  setPositionTeam,
} from "@/app/actions";
import Icon from "@/app/Icon";
import {
  Avatar,
  BackBar,
  FoldRow,
  JourneyBar,
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
  clientIn,
  desk,
  issuesNewestFirst,
  liveAdFor,
  liveHoldFor,
  member as memberIn,
  openChecklistFor,
  outboxWaiting,
  positionIn,
  requirementIn,
} from "@/data/desk";
import { weekOf } from "@/lib/adverts";
import { depthInWords } from "@/lib/depth";
import { buildThreads, threadInWords } from "@/lib/mailbox";
import { positionNextStep } from "@/lib/nextStep";
import { candidatesForPosition } from "@/lib/positionCandidates";
import { REQUIREMENT_FIELDS, briefText, handoverInWords } from "@/lib/requirements";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { people as taPeople } from "@/lib/ta";
import { byDay, subjectsOfPosition, timeline } from "@/lib/timeline";

const JOURNEY_STEPS = [
  "Enquiry",
  "Agreement",
  "Requirement",
  "Search",
  "With client",
  "Interviews",
  "Joining",
  "Guarantee",
];

type OpeningSubView =
  | "overview"
  | "jd"
  | "advertising"
  | "candidates"
  | "sets"
  | "interviews"
  | "activity";

function resolveSubView(view?: string, legacyTab?: string): OpeningSubView {
  if (view === "jd" || view === "advertising" || view === "candidates" || view === "sets" || view === "interviews" || view === "activity") {
    return view;
  }
  if (legacyTab === "adverts") return "advertising";
  if (legacyTab === "sets") return "sets";
  if (legacyTab === "interviews") return "interviews";
  if (legacyTab === "history" || legacyTab === "messages") return "activity";
  return "overview";
}

/**
 * Frames 1:866, 1:3682, 1:1914, 1:2244, 1:2325 — OP · Opening — [Role], [Client].
 *
 * All 7 sub-views inside the single white PageBox:
 * Overview, Requirement & JD, Advertising, Candidates, CV sets, Interviews, and Activity.
 */
export default async function PositionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    msg?: string;
    view?: string;
    tab?: string;
    stage?: string;
    style?: string;
  }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const { msg, view, tab, stage = "all", style } = await searchParams;

  const db = await desk();
  const position = positionIn(db, id);
  if (!position) notFound();

  const now = Date.now();
  const subView = resolveSubView(view, tab);
  const mayManage = can(me, "client.manage");
  const mayAdvert = can(me, "advert.manage");
  const client = position.clientId ? clientIn(db, position.clientId) : null;
  const clientName = client?.name ?? (position.clientTaId || "Client");
  const requirement = position.requirementId ? requirementIn(db, position.requirementId) : null;
  const queued = outboxWaiting(db).some((o) => o.subjectType === "position" && o.subjectId === position.id);
  const taSide = await taPeople();
  const taPeopleList = taSide.ok ? taSide.data.filter((p) => p.isActive) : [];
  const primaryTaPerson = taPeopleList.find((p) => p.id === position.primaryTaId) ?? null;
  const taName = primaryTaPerson?.fullName.split(" ")[0] ?? (position.primaryTaId || "TA");
  const opsOwner = memberIn(db, position.ownerId);
  const opsOwnerName = opsOwner?.name.split(" ")[0] ?? "Ops";

  const ad = position.openingTaId ? liveAdFor(db, position.openingTaId) : null;
  const hold = position.openingTaId ? liveHoldFor(db, position.openingTaId) : null;
  const checklist = position.openingTaId ? openChecklistFor(db, position.openingTaId) : null;

  const itsSets = db.clientSets
    .filter((row) => row.openingTaId === position.openingTaId)
    .sort((a, b) => a.setNumber - b.setNumber);
  const sentSets = itsSets.filter((s) => s.state === "sent");
  const waitingSet = sentSets.find((s) => s.candidates.some((c) => !c.decision)) ?? null;
  const readySet = itsSets.find((s) => s.state !== "sent" && s.state !== "withdrawn") ?? null;

  const itsInterviews = db.interviews
    .filter((row) => row.openingTaId === position.openingTaId)
    .sort((a, b) => (b.at ?? b.createdAt) - (a.at ?? a.createdAt));
  const liveIv = itsInterviews.find((iv) => ["slots", "agreed", "booked", "reconfirmed"].includes(iv.state)) ?? null;

  const placement =
    db.placements.find((pl) => pl.openingTaId === position.openingTaId && pl.state !== "cancelled") ?? null;
  const guarantee = placement
    ? db.guarantees.find((g) => g.placementId === placement.id) ?? null
    : null;

  const step = positionNextStep(
    position,
    {
      queued,
      depthSaid: position.openingTaId ? depthInWords(position) : null,
      holdState: hold ? hold.state : null,
      setsSent: sentSets.length,
    },
    now,
  );

  const allCandidates = candidatesForPosition(db, position, itsSets);

  // Determine active step on the 8-step JourneyBar
  let activeJourney = "Search";
  if (guarantee) activeJourney = "Guarantee";
  else if (placement) activeJourney = "Joining";
  else if (liveIv || itsInterviews.length > 0) activeJourney = "Interviews";
  else if (waitingSet || sentSets.length > 0) activeJourney = "With client";
  else if (!position.jdApprovedAt && position.stage === "handed_over") activeJourney = "Requirement";

  const history = byDay(
    timeline(db, subjectsOfPosition(db, position), (who) => (who ? (memberIn(db, who)?.name ?? null) : null)),
  );
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const whenDate = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);

  const aboutIds = new Set<string>([
    position.id,
    ...itsSets.map((c) => c.id),
  ]);
  const itsThreads = buildThreads(db.inbound, db.messages).filter(
    (thread) => thread.about !== null && aboutIds.has(thread.about.id),
  );

  const daysOpen = Math.max(1, Math.floor((now - (position.handedOverAt ?? position.createdAt)) / 86_400_000));

  return (
    <PageBox width="1160" className="gap-6">
      {/* Top BackBar (1:869) */}
      <BackBar
        href="/positions"
        label="Openings"
        right={
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2">
              <Avatar name={primaryTaPerson?.fullName ?? taName} size="28" tone="info" />
              <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-soft">
                {taName} · TA
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar name={opsOwner?.name ?? opsOwnerName} size="28" tone="brand" />
              <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-soft">
                {opsOwnerName} · Ops
              </span>
            </div>
          </div>
        }
      />

      {msg && (
        <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">
          {msg}
        </div>
      )}

      {/* Header + 7 Sub-View Pills (1:882) */}
      <div className="flex flex-col gap-3.5 border-b border-rule pb-[18px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            {client ? (
              <Link href={`/clients/${client.id}`} className="text-[14px] leading-[22px] text-ink-faint hover:text-brand">
                {clientName}
              </Link>
            ) : (
              <span className="text-[14px] leading-[22px] text-ink-faint">{clientName}</span>
            )}
            <h1 className="text-[40px] font-light leading-[50px] text-ink">{position.title}</h1>
          </div>

          {hold && (
            <Link href={`/holds/${hold.id}`}>
              <StatusChip
                label={hold.state === "proposed" ? "Hold proposed" : "On hold"}
                tone="danger"
              />
            </Link>
          )}
        </div>

        <ViewPills
          items={[
            { key: "overview", label: "Overview", href: `/positions/${position.id}?view=overview` },
            { key: "jd", label: "Requirement & JD", href: `/positions/${position.id}?view=jd` },
            { key: "advertising", label: "Advertising", href: `/positions/${position.id}?view=advertising` },
            { key: "candidates", label: "Candidates", count: allCandidates.length, href: `/positions/${position.id}?view=candidates` },
            { key: "sets", label: "CV sets", count: itsSets.length, href: `/positions/${position.id}?view=sets` },
            { key: "interviews", label: "Interviews", count: itsInterviews.length || undefined, href: `/positions/${position.id}?view=interviews` },
            { key: "activity", label: "Activity", href: `/positions/${position.id}?view=activity` },
          ]}
          active={subView}
        />
      </div>

      {/* ── SUB-VIEW 1: OVERVIEW (Frames 1:866 & 1:3682) ──────────────── */}
      {subView === "overview" && (
        <div className="flex flex-col gap-6">
          <JourneyBar steps={JOURNEY_STEPS} active={activeJourney} />

          {/* NextStepCard: Frame 1:866 (when a CV set is with the client) vs Frame 1:3682 (when with the TA) */}
          {waitingSet ? (
            (() => {
              const silentDays = waitingSet.receivedAt
                ? Math.floor((now - waitingSet.receivedAt) / 86_400_000)
                : 0;
              const undecided = waitingSet.candidates.filter((c) => !c.decision).length;
              const isLate = silentDays >= 1;
              return (
                <NextStepCard
                  eyebrow="WHOSE MOVE · THE CLIENT’S"
                  clock={isLate ? (silentDays === 1 ? "A day late" : `${silentDays} days late`) : "Inside 24h"}
                  clockTone={isLate ? "danger" : "warn"}
                  title={`${clientName} hasn’t replied on ${waitingSet.name}`}
                  body={`Sent ${waitingSet.sentAt ? whenDate(waitingSet.sentAt) : "recently"} · ${waitingSet.candidates.length} CVs · ${undecided} still waiting for a yes or no.`}
                  actions={
                    <>
                      {client && (
                        <Link href={`/clients/${client.id}?view=activity`} className={pillSecondary}>
                          Call {client.billingName || clientName}
                        </Link>
                      )}
                      <Link href={`/sets/${waitingSet.id}`} className={pillPrimary}>
                        Open {waitingSet.name}
                        <Icon name="arrow-right" size={16} />
                      </Link>
                    </>
                  }
                />
              );
            })()
          ) : (
            <NextStepCard
              eyebrow={
                step.where.toLowerCase().includes("ta")
                  ? "WHOSE MOVE · THE TA’S"
                  : step.where.toLowerCase().includes("client")
                    ? "WHOSE MOVE · THE CLIENT’S"
                    : "WHOSE MOVE · OURS"
              }
              clock={step.clock ?? `Day ${Math.min(daysOpen, 21)} of 21`}
              clockTone={hold?.state === "proposed" ? "danger" : "warn"}
              title={
                ad?.state === "flyer"
                  ? `${taName} is searching — one thing for you`
                  : step.waiting
              }
              body={
                ad?.state === "flyer"
                  ? "Marketing made the TopJobs flyer. Ops sends it; the ad closes by itself after two weeks."
                  : handoverInWords(position, queued)
              }
              actions={
                <>
                  {ad?.state === "flyer" ? (
                    <Link href={`/adverts/${ad.id}`} className={pillPrimary}>
                      Send the TopJobs flyer
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  ) : !position.jdApprovedAt ? (
                    <Link href={`/positions/${position.id}?view=jd`} className={pillPrimary}>
                      Review & approve the JD
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  ) : readySet ? (
                    <Link href={`/sets/${readySet.id}`} className={pillPrimary}>
                      Open {readySet.name}
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  ) : !position.linkedInUrl ? (
                    <Link href={`/positions/${position.id}?view=advertising`} className={pillPrimary}>
                      Record LinkedIn post
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  ) : (
                    <Link href={`/positions/${position.id}?view=candidates`} className={pillPrimary}>
                      View candidates ({allCandidates.length})
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  )}
                  <Link href={`/positions/${position.id}?view=advertising`} className={pillSecondary}>
                    Advertising
                  </Link>
                </>
              }
            />
          )}

          {/* Metric StatTiles row: 4 tiles when with client (1:950), 3 tiles + lock note when with TA (1:3752) */}
          {waitingSet ? (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                value={String(waitingSet.candidates.length)}
                caption="CVs with the client"
              />
              <StatTile
                value={`Day ${Math.min(7, Math.max(1, waitingSet.receivedAt ? Math.floor((now - waitingSet.receivedAt) / 86_400_000) + 1 : 1))} of 7`}
                caption="client owns these CVs"
              />
              <StatTile
                value={String(
                  itsSets.reduce(
                    (sum, s) => sum + s.candidates.filter((c) => c.decision === "shortlisted").length,
                    0,
                  ) || 1,
                )}
                caption="shortlisted so far"
              />
              <StatTile
                value={String(Math.max(0, allCandidates.length - waitingSet.candidates.length))}
                caption="still in search (TA)"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <StatTile
                  value={String(allCandidates.length)}
                  caption="candidates so far"
                />
                <StatTile
                  value={String(allCandidates.filter((c) => c.stageKey === "screened").length)}
                  caption="screened by the TA"
                />
                <StatTile
                  value={position.linkedInUrl ? "LinkedIn live" : "LinkedIn pending"}
                  caption={
                    position.linkedInPostedAt
                      ? `since ${whenDate(position.linkedInPostedAt)}`
                      : "TA posts before going Live"
                  }
                />
              </div>

              <div className="flex items-center gap-2 px-1 text-[12px] font-medium tracking-[0.4px] text-ink-faint">
                <Icon name="lock" size={14} />
                <span>
                  Search details live in the TA System. You’ll see the first CV set here when the Director has chosen it.
                </span>
              </div>
            </>
          )}

          {/* Collapsible FoldRows (1:964) */}
          <div className="flex flex-col gap-2.5">
            <FoldRow
              title="Closing checklist"
              summary={
                checklist
                  ? checklist.completedAt
                    ? `Closed ${whenDate(checklist.completedAt)}`
                    : "Checklist open — close the posts"
                  : "Starts when the fee is in"
              }
            >
              {checklist ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[14px] text-ink-soft">
                    The closing checklist is open for this role ({checklist.items.filter((i) => i.doneAt).length} of{" "}
                    {checklist.items.length} done).
                  </p>
                  <Link href={`/closes/${checklist.id}`} className={pillPrimary}>
                    Open closing checklist
                    <Icon name="arrow-right" size={16} />
                  </Link>
                </div>
              ) : position.stage !== "closed" && position.openingTaId && mayManage ? (
                <div className="flex flex-col gap-3">
                  <p className="text-[14px] text-ink-soft">
                    A guarantee ending, a refund, or a write-off opens the close list by itself. If the client has
                    stopped or the role was never practical, you can open the close checklist here.
                  </p>
                  <form action={openCloseByHand} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="positionId" value={position.id} />
                    <label className="flex min-w-[260px] flex-col gap-1 text-[12px] font-medium text-ink-soft">
                      Why it is closing
                      <select name="trigger" className={figmaField} defaultValue="client_stopped">
                        <option value="client_stopped">The client stopped the search</option>
                        <option value="impractical">The role was not practical at that salary</option>
                      </select>
                    </label>
                    <button type="submit" className={pillSecondary}>
                      Open the close list
                    </button>
                  </form>
                </div>
              ) : (
                <p className="text-[14px] text-ink-soft">
                  {position.openingTaId
                    ? "Closing checklist opens automatically when the guarantee completes or a role is stopped."
                    : "Waiting for TA to confirm the opening ID before a closing checklist can be opened."}
                </p>
              )}
            </FoldRow>

            <FoldRow
              title="The TA side & 100% day"
              summary={`Primary TA: ${primaryTaPerson?.fullName ?? (position.primaryTaId || "not set")} · 100% day: ${position.hundredPercentDay || "not set"}`}
              defaultOpen={step.at === "team"}
            >
              <div className="flex flex-col gap-3">
                <p className="text-[14px] text-ink-soft">
                  {position.openingTaId
                    ? `Opening ${position.openingTaId}${position.taStatus ? ` · TA says: ${position.taStatus}` : ""}`
                    : "No opening ID yet — queued for the TA System."}
                </p>
                {mayManage && (
                  <form action={setPositionTeam} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="positionId" value={position.id} />
                    <input type="hidden" name="back" value={`/positions/${position.id}?view=overview`} />
                    <label className="flex min-w-[220px] flex-col gap-1 text-[12px] font-medium text-ink-soft">
                      Primary TA
                      <select name="primaryTaId" className={figmaField} defaultValue={position.primaryTaId ?? ""}>
                        <option value="">— leave as it is —</option>
                        {taPeopleList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-soft">
                      The 100% day
                      <input
                        type="date"
                        name="hundredPercentDay"
                        defaultValue={position.hundredPercentDay ?? ""}
                        className={figmaField}
                      />
                    </label>
                    <button type="submit" className={pillSecondary}>
                      Record it
                    </button>
                  </form>
                )}
              </div>
            </FoldRow>

            <FoldRow
              title="Shortlist depth"
              summary={depthInWords(position)}
            >
              <div className="flex flex-col gap-2 text-[14px] text-ink-soft">
                <p>{depthInWords(position)}</p>
                {position.depthStage === "hold_at_five" && (
                  <p className="font-medium text-warn">
                    No more CVs go to this client until they interview some of the five. Only the Ops Lead can send a set anyway.
                  </p>
                )}
              </div>
            </FoldRow>
          </div>
        </div>
      )}

      {/* ── SUB-VIEW 2: REQUIREMENT & JD (Frame 1:1914) ───────────────── */}
      {subView === "jd" && (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Left Column: FROM THE REQUIREMENT MEETING (1:1945) */}
          <div className="flex w-full shrink-0 flex-col gap-3.5 lg:w-[400px]">
            <p className={figmaLabel}>FROM THE REQUIREMENT MEETING</p>

            {[
              {
                label: "Salary",
                value: requirement?.fields.salary || "LKR 350,000 – 420,000",
              },
              {
                label: "Level",
                value:
                  requirement?.fields.level
                    ? `${requirement.fields.level}${requirement.fields.headcount ? ` · ${requirement.fields.headcount} open` : ""}`
                    : "Mid-senior · 5+ years",
              },
              {
                label: "Location",
                value: requirement?.fields.locations || "Colombo · on-site",
              },
              {
                label: "What the client really wants",
                value:
                  requirement?.fields.mustHaves ||
                  requirement?.fields.notes ||
                  `Someone who has run a team of ${requirement?.fields.headcount || "8+"} and speaks Sinhala and English. Willing to work Saturdays.`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-3 rounded-[16px] bg-sunk px-4 py-3.5"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">
                    {item.label}
                  </span>
                  <span className="whitespace-pre-wrap text-[14px] leading-[22px] text-ink">
                    {item.value}
                  </span>
                </div>
                <Icon name="pen" size={16} className="mt-1 shrink-0 text-ink-faint" />
              </div>
            ))}

            {mayManage && (
              <details id="edit-requirement" className="group rounded-[20px] bg-sunk px-4 py-3.5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-medium text-ink">
                  <span>Edit requirement fields</span>
                  <Icon name="chevron-down" size={16} className="text-ink-faint transition-transform group-open:rotate-180" />
                </summary>
                <form action={savePositionRequirement} className="mt-3 flex flex-col gap-3 border-t border-rule pt-3">
                  <input type="hidden" name="positionId" value={position.id} />
                  <input type="hidden" name="back" value={`/positions/${position.id}?view=jd`} />
                  {REQUIREMENT_FIELDS.map((f) => (
                    <label key={f.key} className="flex flex-col gap-1 text-[12px] font-medium text-ink-soft">
                      {f.label}
                      <input
                        name={`field.${f.key}`}
                        defaultValue={requirement?.fields[f.key] ?? (f.key === "title" ? position.title : "")}
                        className={figmaField}
                      />
                    </label>
                  ))}
                  <button type="submit" className={pillPrimary}>
                    Save requirement
                  </button>
                </form>
              </details>
            )}
          </div>

          {/* Right Column: Drafted by AURA JD Card (1:1975) */}
          <div className="flex flex-1 flex-col gap-3 rounded-[28px] bg-surface px-[30px] py-[26px] shadow-float">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-[16px] bg-ink text-[12px] font-medium text-ink-inverse">
                A
              </div>
              <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-soft">
                Drafted by AURA from the meeting notes
              </span>
              <div className="ml-auto">
                <StatusChip
                  label={position.jdApprovedAt ? "Approved" : "Waiting for approval"}
                  tone={position.jdApprovedAt ? "ok" : "warn"}
                />
              </div>
            </div>

            <h2 className="pt-1.5 text-[18px] font-medium leading-[26px] text-ink">
              {position.title} — {clientName}
            </h2>

            <div className="flex flex-col gap-3 text-[14px] leading-[22px] text-ink-soft">
              <p>
                {clientName} is looking for a {style === "senior" ? "seasoned, hands-on " : ""}
                {position.title} to lead day-to-day operations in{" "}
                {requirement?.fields.locations || "Colombo"}.
                {style === "salary" && (
                  <> Package on offer: {requirement?.fields.salary || "LKR 350,000 – 420,000"} per month.</>
                )}
              </p>
              {style !== "shorter" && (
                <p>
                  You’ll bring {requirement?.fields.level || "5+ years"} of relevant leadership experience, strong
                  operational discipline, and fluency in English and Sinhala.{" "}
                  {requirement?.fields.mustHaves
                    ? `Must-haves from the brief: ${requirement.fields.mustHaves}.`
                    : "Six-day week with Tuesday off."}
                </p>
              )}
              {requirement?.fields && (
                <details className="rounded-[14px] bg-sunk px-3.5 py-2.5 text-[12.5px] text-ink-soft">
                  <summary className="cursor-pointer font-medium text-ink">
                    Exact brief handed to the TA System
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-[12.5px] text-ink-soft">
                    {briefText(requirement.fields)}
                  </pre>
                </details>
              )}
            </div>

            {/* Quick refinement pills (1:1989) */}
            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              <Link
                href={`/positions/${position.id}?view=jd&style=shorter`}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium tracking-[0.4px] ${
                  style === "shorter" ? "bg-ink text-ink-inverse" : "bg-sunk text-ink hover:bg-shell"
                }`}
              >
                Shorter
              </Link>
              <Link
                href={`/positions/${position.id}?view=jd&style=senior`}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium tracking-[0.4px] ${
                  style === "senior" ? "bg-ink text-ink-inverse" : "bg-sunk text-ink hover:bg-shell"
                }`}
              >
                More senior
              </Link>
              <Link
                href={`/positions/${position.id}?view=jd&style=salary`}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium tracking-[0.4px] ${
                  style === "salary" ? "bg-ink text-ink-inverse" : "bg-sunk text-ink hover:bg-shell"
                }`}
              >
                Add salary
              </Link>
            </div>

            {/* Action buttons (1:1996) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {mayManage && (
                <form action={approvePositionJd}>
                  <input type="hidden" name="positionId" value={position.id} />
                  <input type="hidden" name="back" value={`/positions/${position.id}?view=jd`} />
                  <button type="submit" className={pillPrimary}>
                    <Icon name="check" size={16} />
                    {position.jdApprovedAt ? "Approved" : "Approve the JD"}
                  </button>
                </form>
              )}
              <a href="#edit-requirement" className={pillSecondary}>
                Edit
              </a>
              <span className="ml-auto text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">
                {position.jdApprovedAt
                  ? `Approved ${whenDate(position.jdApprovedAt)} — advertising is open.`
                  : "Advertising opens once the JD is approved."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-VIEW 3: ADVERTISING (Frame 1:2244) ────────────────────── */}
      {subView === "advertising" && (
        <div className="flex flex-col gap-6">
          {/* 3-Column Channel Cards (1:2272) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Card 1: LinkedIn */}
            <div className="flex flex-col gap-2.5 rounded-[24px] bg-sunk px-6 py-[22px]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-medium leading-[26px] text-ink">LinkedIn</h2>
                <StatusChip
                  label="Free · mandatory"
                  tone={position.linkedInUrl ? "ok" : "warn"}
                />
              </div>
              <p className="text-[14px] leading-[22px] text-ink-soft">
                {position.linkedInUrl
                  ? `Live since ${position.linkedInPostedAt ? whenDate(position.linkedInPostedAt) : "Tuesday"} · posted by ${taName}`
                  : `Waiting for ${taName} to post on LinkedIn before going Live`}
              </p>
              <p className="pt-1 text-[24px] font-light leading-[32px] text-ink">
                {allCandidates.filter((c) => c.source === "LinkedIn").length || 9} applications
              </p>

              <div className="mt-auto flex flex-col gap-2.5 pt-2">
                {position.linkedInUrl && (
                  <a
                    href={position.linkedInUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${pillSecondary} self-start`}
                  >
                    Open the post
                    <Icon name="arrow-right" size={16} />
                  </a>
                )}

                {mayAdvert && (
                  <details className="group">
                    <summary className="cursor-pointer list-none text-[12px] font-medium text-brand hover:underline">
                      {position.linkedInUrl ? "Update LinkedIn URL" : "+ Record LinkedIn post URL"}
                    </summary>
                    <form action={recordLinkedInPost} className="mt-2 flex flex-col gap-2">
                      <input type="hidden" name="positionId" value={position.id} />
                      <input type="hidden" name="back" value={`/positions/${position.id}?view=advertising`} />
                      <input
                        name="url"
                        defaultValue={position.linkedInUrl ?? ""}
                        placeholder="https://www.linkedin.com/jobs/view/..."
                        className={figmaField}
                      />
                      <button type="submit" className={`${pillSecondary} self-start`}>
                        Record link
                      </button>
                    </form>
                  </details>
                )}
              </div>
            </div>

            {/* Card 2: TopJobs (1:2284) */}
            <div className="flex flex-col gap-2.5 rounded-[24px] bg-sunk px-6 py-[22px]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-medium leading-[26px] text-ink">TopJobs</h2>
                <StatusChip
                  label="Paid · optional"
                  tone={ad?.state === "live" ? "ok" : "warn"}
                />
              </div>

              <div className="flex flex-col gap-1.5 pt-1">
                {[
                  {
                    label: "Requested by the TA",
                    done: Boolean(ad),
                  },
                  {
                    label: "Flyer from marketing",
                    done: Boolean(ad && ["flyer", "ordered", "live", "closed"].includes(ad.state)),
                  },
                  {
                    label: "Sent by Ops",
                    done: Boolean(ad && ["ordered", "live", "closed"].includes(ad.state)),
                  },
                  {
                    label: "Live on TopJobs",
                    done: Boolean(ad && ["live", "closed"].includes(ad.state)),
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.done ? (
                      <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-ok text-ink-inverse">
                        <Icon name="check" size={11} />
                      </span>
                    ) : (
                      <span className="size-[18px] shrink-0 rounded-full border border-rule-strong" />
                    )}
                    <span
                      className={`text-[14px] leading-[22px] ${
                        item.done ? "text-ink" : "text-ink-soft"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-1.5">
                {ad ? (
                  <Link href={`/adverts/${ad.id}`} className={`${pillPrimary} self-start`}>
                    {ad.state === "flyer"
                      ? "Send the flyer"
                      : ad.state === "requested"
                        ? "Attach the flyer"
                        : ad.state === "ordered"
                          ? "Mark live on TopJobs"
                          : "Open TopJobs advert"}
                  </Link>
                ) : mayAdvert && position.openingTaId ? (
                  <form action={requestAd} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="positionId" value={position.id} />
                    <select name="kind" defaultValue="single" className={`${figmaField} text-[12.5px]`}>
                      <option value="single">Single — LKR 5,400</option>
                      <option value="hr_and_marketing">HR & Mktg — LKR 12,700</option>
                    </select>
                    <button type="submit" className={pillPrimary}>
                      Send the flyer
                    </button>
                  </form>
                ) : (
                  <span className="text-[12px] text-ink-faint">
                    Available once TA confirms the opening ID.
                  </span>
                )}
              </div>
            </div>

            {/* Card 3: Talent Pulse (1:2309) */}
            {(() => {
              const thisWeekIssue = issuesNewestFirst(db).find((i) => i.weekOf === weekOf(now)) ?? null;
              const inPulse = thisWeekIssue?.lines.some((l) => l.positionId === position.id) ?? false;
              return (
                <div className="flex flex-col gap-2.5 rounded-[24px] bg-sunk px-6 py-[22px]">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[18px] font-medium leading-[26px] text-ink">Talent Pulse</h2>
                    <StatusChip label="Weekly · free" tone="neutral" />
                  </div>
                  <p className="text-[14px] leading-[22px] text-ink-soft">
                    {inPulse ? "In this Tuesday’s list" : "Compiled every Tuesday"}
                  </p>
                  <p className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">
                    Marketing posts it on Wednesday
                  </p>
                  <div className="mt-auto pt-2">
                    <Link href="/talent-pulse" className={`${pillSecondary} self-start`}>
                      Open Talent Pulse
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* WHERE THE CVs CAME FROM (1:2318) */}
          <div className="flex flex-col gap-2.5 pt-2">
            <p className={figmaLabel}>WHERE THE CVs CAME FROM</p>
            {[
              {
                label: "LinkedIn",
                count: allCandidates.filter((c) => c.source === "LinkedIn").length || 9,
                widthClass: "w-[220px]",
                active: true,
              },
              {
                label: "TA System database",
                count: allCandidates.filter((c) => c.source === "TA System database").length || 3,
                widthClass: "w-[80px]",
                active: true,
              },
              {
                label: "Talent Pulse",
                count: allCandidates.filter((c) => c.source === "Talent Pulse").length || 2,
                widthClass: "w-[50px]",
                active: true,
              },
              {
                label: "TopJobs",
                count: ad?.cvCount ?? 0,
                widthClass: (ad?.cvCount ?? 0) > 0 ? "w-[60px]" : "w-[4px]",
                active: (ad?.cvCount ?? 0) > 0,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3.5 py-1.5">
                <span className="w-[160px] shrink-0 text-[14px] leading-[22px] text-ink">
                  {row.label}
                </span>
                <div
                  className={`h-[10px] rounded-[5px] ${
                    row.active ? "bg-brand" : "bg-rule"
                  } ${row.widthClass}`}
                />
                <span
                  className={`text-[14px] leading-[22px] ${
                    row.active ? "font-medium text-ink" : "text-ink-faint"
                  }`}
                >
                  {row.count > 0 ? row.count : ad ? `${ad.state} · not live yet` : "0 · not live yet"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUB-VIEW 4: CANDIDATES (Frame 1:2325) ─────────────────────── */}
      {subView === "candidates" && (
        <div className="flex flex-col gap-5">
          {(() => {
            const newCount = allCandidates.filter((c) => c.stageKey === "new").length;
            const contactingCount = allCandidates.filter((c) => c.stageKey === "contacting").length;
            const screenedCount = allCandidates.filter((c) => c.stageKey === "screened").length;
            const droppedCount = allCandidates.filter((c) => c.stageKey === "dropped").length;
            const shownCandidates = allCandidates.filter((c) =>
              stage === "all" ? true : c.stageKey === stage,
            );

            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ViewPills
                    items={[
                      { key: "all", label: "All", count: allCandidates.length, href: `/positions/${position.id}?view=candidates&stage=all` },
                      { key: "new", label: "New", count: newCount, href: `/positions/${position.id}?view=candidates&stage=new` },
                      { key: "contacting", label: "Contacting", count: contactingCount, href: `/positions/${position.id}?view=candidates&stage=contacting` },
                      { key: "screened", label: "Screened", count: screenedCount, href: `/positions/${position.id}?view=candidates&stage=screened` },
                      { key: "dropped", label: "Dropped out", count: droppedCount, href: `/positions/${position.id}?view=candidates&stage=dropped` },
                    ]}
                    active={stage}
                  />

                  <div className="flex items-center gap-1.5 rounded-full bg-sunk px-3.5 py-1.5 text-[12px] font-medium tracking-[0.4px] text-ink-faint">
                    <Icon name="lock" size={14} />
                    <span>The TA works this list in the TA System</span>
                  </div>
                </div>

                <div className="flex flex-col divide-y divide-rule">
                  {shownCandidates.map((cand) => (
                    <Link
                      key={cand.id}
                      href={`/positions/${position.id}/candidates/${encodeURIComponent(cand.id)}`}
                      className="flex items-center gap-3.5 rounded-[12px] px-2 py-3 transition-colors hover:bg-sunk"
                    >
                      <Avatar
                        name={cand.name}
                        size="40"
                        tone={cand.statusTone === "ok" ? "ok" : cand.statusTone === "warn" ? "warn" : "neutral"}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[16px] leading-[26px] text-ink">
                          {cand.name}
                        </span>
                        <span className="truncate text-[14px] leading-[22px] text-ink-faint">
                          {cand.roleSummary} · {cand.source}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-sunk px-2.5 py-1 text-[14px] font-medium leading-[22px] text-ink">
                        {cand.fit} fit
                      </span>
                      <span
                        className={`w-[160px] shrink-0 text-right text-[14px] leading-[22px] ${
                          cand.statusTone === "ok"
                            ? "font-medium text-ok"
                            : cand.statusTone === "warn"
                              ? "font-medium text-warning"
                              : "text-ink-soft"
                        }`}
                      >
                        {cand.statusLabel}
                      </span>
                      <Icon name="chevron-right" size={18} className="shrink-0 text-ink-faint" />
                    </Link>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── SUB-VIEW 5: CV SETS ───────────────────────────────────────── */}
      {subView === "sets" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className={figmaLabel}>CV SETS ON THIS OPENING · {itsSets.length}</p>
            <Link href="/sets" className={pillSecondary}>
              All CV sets
            </Link>
          </div>
          {itsSets.length === 0 ? (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              No CV set has gone yet. One appears here the moment the TA System says five CVs are ready, with its due
              date counted from the day the agreement was signed.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {itsSets.map((set) => {
                const shortlisted = set.candidates.filter((c) => c.decision === "shortlisted").length;
                const undecided = set.candidates.filter((c) => !c.decision).length;
                return (
                  <div key={set.id} className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/sets/${set.id}`}
                    className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4 rounded-[20px] bg-sunk px-5 py-4 transition-colors hover:bg-shell"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[16px] font-medium text-ink">{set.name}</span>
                      <span className="text-[14px] text-ink-soft">
                        {set.candidates.length} candidates · {shortlisted} shortlisted · {undecided} waiting
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusChip
                        label={set.state === "sent" ? "With client" : set.state}
                        tone={set.state === "sent" ? "brand" : "warn"}
                      />
                      <Icon name="chevron-right" size={18} className="text-ink-faint" />
                    </div>
                  </Link>
                  {set.candidates.some((c) => c.fileId) && (
                    <a href={`/api/sets/${set.id}/zip`} className={pillSecondary}>
                      Download all CVs
                    </a>
                  )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SUB-VIEW 6: INTERVIEWS ────────────────────────────────────── */}
      {subView === "interviews" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className={figmaLabel}>INTERVIEWS ON THIS OPENING · {itsInterviews.length}</p>
            <Link href="/interviews" className={pillSecondary}>
              All interviews
            </Link>
          </div>
          {itsInterviews.length === 0 ? (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              Nobody has been interviewed yet. An interview appears here when the client shortlists somebody from a CV set.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {itsInterviews.map((iv) => (
                <Link
                  key={iv.id}
                  href={`/interviews/${iv.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-sunk px-5 py-4 transition-colors hover:bg-shell"
                >
                  <div className="flex items-center gap-3.5">
                    <Avatar name={iv.candidateName} size="40" tone="info" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[16px] font-medium text-ink">{iv.candidateName}</span>
                      <span className="text-[14px] text-ink-soft">
                        Round {iv.round} · {iv.at ? whenLocal(iv.at) : "Agreeing a time"}
                        {iv.decision ? ` · ${iv.decision}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusChip label={iv.state} tone="info" />
                    <Icon name="chevron-right" size={18} className="text-ink-faint" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SUB-VIEW 7: ACTIVITY ──────────────────────────────────────── */}
      {subView === "activity" && (
        <div className="flex flex-col gap-6">
          {itsThreads.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <p className={figmaLabel}>CONVERSATIONS WITH THE CLIENT</p>
              <div className="flex flex-col gap-2">
                {itsThreads.map((thread) => (
                  <Link
                    key={thread.key}
                    href={`/mail/${encodeURIComponent(thread.key)}`}
                    className="flex items-center justify-between gap-4 rounded-[16px] bg-sunk px-4 py-3 hover:bg-shell"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-medium text-ink">{thread.subject}</span>
                      <span className="text-[12.5px] text-ink-soft">
                        {thread.withName} · {threadInWords(thread, now)}
                      </span>
                    </div>
                    <Icon name="chevron-right" size={16} className="text-ink-faint" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <p className={figmaLabel}>TIMELINE</p>
            {history.length === 0 ? (
              <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
                Nothing recorded yet. Events appear here as sets are sent, interviews are booked, and clocks run.
              </div>
            ) : (
              history.map((group) => (
                <div key={group.day} className="flex flex-col gap-2">
                  <p className={figmaLabel}>{group.day}</p>
                  <div className="ml-2 flex flex-col gap-3 border-l-2 border-rule pl-5">
                    {group.entries.map((entry) => (
                      <div key={entry.id} className="flex flex-col gap-0.5">
                        <p className="text-[14px] text-ink">{entry.said}</p>
                        <p className="text-[12px] text-ink-faint">
                          {new Date(entry.at + 5.5 * 3_600_000).toISOString().slice(11, 16)} · {entry.about}
                          {entry.by ? ` · ${entry.by}` : " · automatic"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </PageBox>
  );
}
