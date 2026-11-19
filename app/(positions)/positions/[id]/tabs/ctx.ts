import { roleNumbers } from "@/lib/roleNumbers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  addManualCandidate,
  addStrategy,
  approvePositionJd,
  openCloseByHand,
  removeManualCandidate,
  removeStrategy,
  recordLinkedInPost,
  requestAd,
  savePositionRequirement,
  setOpeningPeople,
  setPositionTeam,
} from "@/app/actions";
import Icon from "@/app/Icon";
import { Contacts } from "@/app/ui/Contacts";
import {
  Avatar,
  BackBar,
  FoldRow,
  RelatedLinks,
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
  liveTimers,
  member as memberIn,
  numberOf,
  openChecklistFor,
  outboxWaiting,
  positionIn,
  requirementIn,
} from "@/data/desk";
import { weekOf } from "@/lib/adverts";
import { OWNERSHIP_WORKING_DAYS, ownershipWindow } from "@/lib/clientFeedback";
import { depthInWords } from "@/lib/depth";
import { relatedWork } from "@/data/journeyOf";
import { clockInWords, timeLeft } from "@/lib/timers";
import { buildThreads, threadInWords } from "@/lib/mailbox";
import { positionNextStep } from "@/lib/nextStep";
import { CANDIDATE_LEVELS, LEVEL_LABELS, type CandidateLevel, candidatesForPosition, taApplicationsFor } from "@/lib/positionCandidates";
import { REQUIREMENT_FIELDS, briefText, handoverInWords, requirementLocked } from "@/lib/requirements";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { people as taPeople } from "@/lib/ta";
import { TA_STRATEGIES, resolveStrategyOwner, taOwnerId } from "@/lib/strategies";
import { byDay, subjectsOfPosition, timeline } from "@/lib/timeline";


/** Everything a tab of the role page reads, computed once by the loader. */
export async function buildRoleCtx(id: string, stage: string, me: NonNullable<Awaited<ReturnType<typeof currentMember>>>) {
  const db = await desk();
  const position = positionIn(db, id);
  if (!position) return null;

  const now = Date.now();
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
  const itsPlacements = db.placements.filter((pl) => pl.openingTaId === position.openingTaId && pl.state !== "cancelled");

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

  const allCandidates = candidatesForPosition(db, position, itsSets, await taApplicationsFor(position.openingTaId));

  // The other pieces of this client's work, as plain links (18 Nov: no progress bar).
  const related = relatedWork(db, { positionId: position.id });

  // What is running or open on this opening: reminders, chases, and tasks.
  const whenDateOf = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const aboutThis = new Set<string>([position.id, ...itsSets.map((c) => c.id), ...itsInterviews.map((iv) => iv.id)]);
  const waitingOn = [
    ...liveTimers(db)
      .filter((t) => aboutThis.has(t.subjectId))
      .map((t) => ({ key: "t" + t.id, text: clockInWords(t.kind), when: timeLeft(t.dueAt, now).text, at: t.dueAt })),
    ...db.tasks
      .filter((t) => t.state === "open" && t.subjectId && aboutThis.has(t.subjectId))
      .map((t) => ({ key: "k" + t.id, text: t.title, when: "task, due " + whenDateOf(t.dueAt), at: t.dueAt })),
  ].sort((x, y) => x.at - y.at);

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

  // The number strip at the head of every tab (v6 R0).
  const headcount = Number.parseInt(requirement?.fields.headcount ?? "", 10);
  const numbers = roleNumbers({
    now,
    headcount: Number.isFinite(headcount) ? headcount : null,
    candidates: allCandidates.map((cand) => ({ setId: cand.setId ?? null, out: cand.level === "out" })),
    sets: itsSets.map((s) => ({ ...s, name: "SET " + s.setNumber })),
    interviews: itsInterviews,
    placements: itsPlacements,
    guarantees: db.guarantees.filter((g) => itsPlacements.some((pl) => pl.id === g.placementId)),
  });


  const addressMissing = Boolean(client) && !(client?.billingAddress ?? "").trim();
  const daysOpen = Math.max(1, Math.floor((now - (position.handedOverAt ?? position.createdAt)) / 86_400_000));
  return { stage, me, db, position, now, mayManage, mayAdvert, client, clientName, requirement, queued, taSide, taPeopleList, primaryTaPerson, taName, opsOwner, opsOwnerName, ad, hold, checklist, itsSets, sentSets, waitingSet, readySet, itsInterviews, liveIv, placement, guarantee, itsPlacements, step, allCandidates, related, whenDateOf, waitingOn, history, whenLocal, whenDate, itsThreads, daysOpen, numbers, addressMissing };
}

export type RoleCtx = NonNullable<Awaited<ReturnType<typeof buildRoleCtx>>>;

/** What every role tab receives: the data loaded once, and the page's search params (for ?panel= and ?on=). */
export type TabProps = { c: RoleCtx; sp: Record<string, string | undefined> };
