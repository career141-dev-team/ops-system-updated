import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import Icon from "@/app/Icon";
import {
  BackBar,
  FoldRow,
  JourneyBar,
  NextStepCard,
  PageBox,
  StatTile,
  StatusChip,
  ViewPills,
  figmaLabel,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import {
  clientIn,
  desk,
  fileIn,
  positionIn,
  referenceForApplication,
} from "@/data/desk";
import { candidatesForPosition } from "@/lib/positionCandidates";
import { currentMember } from "@/lib/session";

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

/**
 * Frame 1:2433 — OP · Application — [Candidate] for [Position].
 *
 * Read-only view of a candidate's application on this opening from the TA System,
 * with links to the CV set, interviews, and reference checks in Ops.
 */
export default async function PositionCandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; candidateId: string }>;
  searchParams: Promise<{ tab?: string; msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id, candidateId } = await params;
  const { tab = "summary", msg } = await searchParams;

  const db = await desk();
  const position = positionIn(db, id);
  if (!position) notFound();

  const client = position.clientId ? clientIn(db, position.clientId) : null;
  const clientName = client?.name ?? (position.clientTaId || "Client");

  const itsSets = db.clientSets
    .filter((row) => row.openingTaId === position.openingTaId)
    .sort((a, b) => a.setNumber - b.setNumber);

  const candidates = candidatesForPosition(db, position, itsSets);
  const decodedId = decodeURIComponent(candidateId);
  const candidate =
    candidates.find((c) => c.id === decodedId || c.applicationTaId === decodedId) ??
    candidates[0];
  if (!candidate) notFound();

  const candInterviews = db.interviews.filter(
    (iv) =>
      iv.openingTaId === position.openingTaId &&
      (iv.applicationTaId === candidate.applicationTaId ||
        iv.candidateName.toLowerCase() === candidate.name.toLowerCase()),
  );
  const reference = referenceForApplication(db, candidate.applicationTaId);
  const cvFile = candidate.fileId ? fileIn(db, candidate.fileId) : null;
  const firstName = candidate.name.split(" ")[0] || candidate.name;
  const baseHref = `/positions/${position.id}/candidates/${encodeURIComponent(candidate.id)}`;

  let activeJourney = "With client";
  if (candInterviews.length > 0) activeJourney = "Interviews";
  else if (!candidate.setId) activeJourney = "Search";

  return (
    <PageBox width="1080" className="gap-6">
      <BackBar
        href={`/positions/${position.id}?view=candidates`}
        label={`${position.title} · Candidates`}
        right={
          <div className="flex items-center gap-1.5 rounded-full bg-sunk px-3.5 py-1.5 text-[12px] font-medium tracking-[0.4px] text-ink-faint">
            <Icon name="lock" size={14} />
            <span>Read from the TA System</span>
          </div>
        }
      />

      {msg && (
        <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">
          {msg}
        </div>
      )}

      {/* Header + 6 Sub-View Pills (1:2447) */}
      <div className="flex flex-col gap-3.5 border-b border-rule pb-[18px]">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] leading-[22px] text-ink-faint">
            Application · {position.title} · {clientName}
          </span>
          <h1 className="text-[40px] font-light leading-[50px] text-ink">
            {candidate.name}
          </h1>
        </div>

        <ViewPills
          items={[
            { key: "summary", label: "Summary", href: `${baseHref}?tab=summary` },
            { key: "screening", label: "Screening & contacts", href: `${baseHref}?tab=screening` },
            { key: "submissions", label: "Submissions", href: `${baseHref}?tab=submissions` },
            { key: "interviews", label: "Interviews & feedback", href: `${baseHref}?tab=interviews` },
            { key: "references", label: "References", href: `${baseHref}?tab=references` },
            { key: "activity", label: "Activity", href: `${baseHref}?tab=activity` },
          ]}
          active={tab}
        />
      </div>

      {tab === "summary" && (
        <div className="flex flex-col gap-6">
          <JourneyBar steps={JOURNEY_STEPS} active={activeJourney} />

          <NextStepCard
            eyebrow="WHOSE MOVE · THE CLIENT’S"
            clock="Day 3 of 7"
            clockTone="warn"
            title={`${clientName} is deciding on ${firstName}`}
            body={
              candidate.setName
                ? `Sent in ${candidate.setName} · waiting for the client to shortlist or pass.`
                : `Screened by the TA (${candidate.roleSummary}) · ready for the next CV set.`
            }
            actions={
              candidate.setId ? (
                <Link href={`/sets/${candidate.setId}`} className={pillPrimary}>
                  Open {candidate.setName || "CV set"}
                  <Icon name="arrow-right" size={16} />
                </Link>
              ) : (
                <Link href={`/positions/${position.id}?view=sets`} className={pillPrimary}>
                  View CV sets
                  <Icon name="arrow-right" size={16} />
                </Link>
              )
            }
          />

          {/* 3 StatTiles (1:2513) */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <StatTile
              value={`${candidate.fit} fit`}
              caption="for this opening · scored by AI"
            />
            <StatTile
              value={candidate.noticeWeeks}
              caption="until she can start"
            />
            <StatTile
              value={candidate.expectedSalary}
              caption="expected salary"
            />
          </div>

          <FoldRow
            title="Contact attempts"
            summary={candidate.contactSummary}
          >
            <div className="flex flex-col gap-2 text-[14px] text-ink-soft">
              <p>{candidate.contactSummary}</p>
              <p className="text-[12px] text-ink-faint">
                Source: {candidate.source} · Current role: {candidate.roleSummary}
              </p>
            </div>
          </FoldRow>
        </div>
      )}

      {tab === "screening" && (
        <div className="flex flex-col gap-4 rounded-[24px] bg-sunk p-6">
          <p className={figmaLabel}>SCREENING & CONTACT LOG (TA SYSTEM)</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[12px] text-ink-faint">Current role & experience</p>
              <p className="text-[14px] font-medium text-ink">{candidate.roleSummary}</p>
            </div>
            <div>
              <p className="text-[12px] text-ink-faint">Source channel</p>
              <p className="text-[14px] font-medium text-ink">{candidate.source}</p>
            </div>
            <div>
              <p className="text-[12px] text-ink-faint">Notice period</p>
              <p className="text-[14px] font-medium text-ink">{candidate.noticeWeeks}</p>
            </div>
            <div>
              <p className="text-[12px] text-ink-faint">Expected package</p>
              <p className="text-[14px] font-medium text-ink">{candidate.expectedSalary}</p>
            </div>
          </div>
          <div className="border-t border-rule pt-3 text-[14px] text-ink-soft">
            {candidate.contactSummary}
          </div>
        </div>
      )}

      {tab === "submissions" && (
        <div className="flex flex-col gap-4">
          <p className={figmaLabel}>CLIENT SUBMISSIONS</p>
          {candidate.setId ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-sunk px-5 py-4">
              <div className="flex flex-col gap-1">
                <span className="text-[16px] font-medium text-ink">
                  {candidate.setName || "CV set"}
                </span>
                <span className="text-[14px] text-ink-soft">
                  Status: {candidate.statusLabel}
                  {candidate.decisionReason ? ` · “${candidate.decisionReason}”` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {cvFile && (
                  <Link href={`/api/files/${cvFile.id}`} className={pillSecondary}>
                    Prepared CV ({cvFile.name})
                  </Link>
                )}
                <Link href={`/sets/${candidate.setId}`} className={pillPrimary}>
                  Open {candidate.setName || "CV set"}
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              Not included in a sent CV set yet.
            </div>
          )}
        </div>
      )}

      {tab === "interviews" && (
        <div className="flex flex-col gap-4">
          <p className={figmaLabel}>INTERVIEWS & FEEDBACK</p>
          {candInterviews.length === 0 ? (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              No interview rounds booked for {candidate.name} yet.
            </div>
          ) : (
            candInterviews.map((iv) => (
              <Link
                key={iv.id}
                href={`/interviews/${iv.id}`}
                className="flex items-center justify-between rounded-[20px] bg-sunk px-5 py-4 hover:bg-shell"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[16px] font-medium text-ink">
                    Round {iv.round} · {iv.state}
                  </span>
                  <span className="text-[14px] text-ink-soft">
                    {iv.decision ? `Decision: ${iv.decision}` : "Waiting for round outcome"}
                    {iv.decisionReason ? ` · “${iv.decisionReason}”` : ""}
                  </span>
                </div>
                <StatusChip label={iv.state} tone="info" />
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "references" && (
        <div className="flex flex-col gap-4">
          <p className={figmaLabel}>REFERENCE CHECKS</p>
          {reference ? (
            <div className="rounded-[20px] bg-sunk px-5 py-4 text-[14px] text-ink">
              <p className="font-medium">State: {reference.state}</p>
              <p className="mt-1 text-ink-soft">
                {reference.report || "Managed from the interview screen."}
              </p>
            </div>
          ) : (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              Reference checks start when the final interview round passes.
            </div>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="flex flex-col gap-3 rounded-[24px] bg-sunk p-6 text-[14px] text-ink-soft">
          <p className={figmaLabel}>APPLICATION ACTIVITY</p>
          <p>• {candidate.contactSummary}</p>
          <p>• Scored {candidate.fit} fit for {position.title}</p>
          {candidate.setName && <p>• Included in {candidate.setName}</p>}
        </div>
      )}
    </PageBox>
  );
}
