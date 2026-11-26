import { isOff } from "@/lib/interviews";
import { onPosition } from "@/lib/positionCounts";
import { pipeline } from "@/lib/ta";
import type { OpsClientSet, OpsDatabase, OpsPosition } from "@/data/types";

/**
 * Where a candidate is on the way from found to guaranteed (owner, 17 Nov evening):
 * found -> internal shortlist (ours) -> external shortlist (the client's) -> interviews ->
 * joining (placed) -> guarantee (joined), or out.
 */
export type CandidateLevel = "found" | "internal" | "external" | "interview" | "joining" | "guarantee" | "out";

export const CANDIDATE_LEVELS: CandidateLevel[] = ["found", "internal", "external", "interview", "joining", "guarantee", "out"];

export const LEVEL_LABELS: Record<CandidateLevel, string> = {
  found: "Found",
  internal: "Internal shortlist",
  external: "External shortlist",
  interview: "Interviews",
  joining: "Joining",
  guarantee: "Guarantee",
  out: "Out",
};

/**
 * TA stages that mean "ours, not yet the client's". shortcut: TA does not publish its pre-client stage
 * names yet, so only these guesses count; any other stage stays "found". Add TA's real names when known.
 */
const INTERNAL_STAGES = ["shortlisted", "internal_shortlist", "screened"];

/** What Ops knows about one candidate, as plain yes/no facts. */
export interface LevelFacts {
  /** The client rejected them, or they were dropped (the client already had the CV). */
  dropped: boolean;
  /** They are in one of our CV sets. */
  inSet: boolean;
  /** The client said yes to them. */
  clientShortlisted: boolean;
  /** An interview that was not cancelled. */
  hasInterview: boolean;
  /** A placement exists (not fallen through). */
  placed: boolean;
  /** They have joined: the guarantee runs. */
  joined: boolean;
  /** The TA System's own stage for them, when it is connected. */
  taStage: string | null;
}

export function candidateLevel(f: LevelFacts): CandidateLevel {
  if (f.joined) return "guarantee";
  if (f.placed || f.taStage === "offer") return "joining";
  if (f.dropped || f.taStage === "rejected_by_client") return "out";
  if (f.hasInterview || f.taStage === "interview") return "interview";
  if (f.clientShortlisted || f.taStage === "client_shortlist") return "external";
  if (f.inSet || INTERNAL_STAGES.includes(f.taStage ?? "")) return "internal";
  return "found";
}

export interface PositionCandidateView {
  id: string;
  applicationTaId: string;
  name: string;
  roleSummary: string;
  /** Where the CV came from, when anybody recorded it (18 Nov: never guessed). */
  source: "LinkedIn" | "TA System database" | "Talent Pulse" | "TopJobs" | "Added by hand" | null;
  /** A fit score, when the TA System gives one. None does yet, so it is null rather than a made-up number. */
  fit: number | null;
  stageKey: "new" | "contacting" | "screened" | "dropped";
  statusLabel: string;
  statusTone: "ok" | "warn" | "neutral";
  noticeWeeks: string;
  expectedSalary: string;
  contactSummary: string;
  setId: string | null;
  setName: string | null;
  fileId: string | null;
  decision: string | null;
  decisionReason: string | null;
  /** Added by hand in Ops; not in the TA System (17 Nov). */
  manual?: boolean;
  /** Found, internal shortlist, external shortlist, interviews, joining, guarantee, or out. */
  level: CandidateLevel;
}

/** The opening's applications from the TA System, or none when it cannot be reached or there is no opening yet. */
export async function taApplicationsFor(openingId: string | null): Promise<TaApplicationLike[]> {
  if (!openingId) return [];
  const result = await pipeline(openingId);
  return result.ok ? result.data.applications : [];
}

/** The part of TA's pipeline this needs (see `TaPipeline` in src/lib/ta.ts). */
export interface TaApplicationLike {
  id: string;
  candidateName: string;
  currentStage: string;
}

/**
 * Builds the unified candidate list for an opening (`1:2325` and `1:2433`),
 * merging real candidates from CV sets and interviews with the TA System's
 * active search pipeline so every candidate row and application detail view works.
 */
export function candidatesForPosition(
  db: OpsDatabase,
  position: OpsPosition,
  itsSets: OpsClientSet[],
  /** The opening's pipeline from the TA System when it is connected (17 Nov). */
  taApplications: TaApplicationLike[] = [],
): PositionCandidateView[] {
  const byId = new Map<string, PositionCandidateView>();
  const taStageOf = new Map<string, string>();
  for (const a of taApplications) {
    taStageOf.set(a.id, a.currentStage);
    taStageOf.set(a.candidateName.toLowerCase(), a.currentStage);
  }

  let idx = 0;
  for (const set of itsSets) {
    for (const c of set.candidates) {
      const id = c.applicationTaId || `cand-${idx}`;
      const isShortlisted = c.decision === "shortlisted";
      const isRejected = c.decision === "rejected" || c.claimVerdict === "dropped";
      const stageKey: PositionCandidateView["stageKey"] = isRejected ? "dropped" : "screened";
      const statusLabel = isShortlisted
        ? "Shortlisted"
        : isRejected
          ? c.claimVerdict === "dropped"
            ? "Dropped · client had CV"
            : "Rejected by client"
          : set.state === "sent"
            ? "With the client"
            : "In CV set " + set.setNumber;
      const statusTone: PositionCandidateView["statusTone"] = isShortlisted
        ? "ok"
        : isRejected
          ? "warn"
          : "neutral";

      byId.set(id, {
        id,
        applicationTaId: id,
        name: c.name,
        // What Ops knows about them is the set they are in; their CV says the rest (18 Nov: no invented years).
        roleSummary: "In " + (set.state === "sent" ? "CV set " + set.setNumber + ", with the client" : "CV set " + set.setNumber),
        source: null,
        fit: null,
        stageKey,
        statusLabel,
        statusTone,
        noticeWeeks: "",
        expectedSalary: "",
        contactSummary: "",
        setId: set.id,
        setName: set.name,
        fileId: c.fileId,
        decision: c.decision ?? null,
        decisionReason: c.decisionReason ?? null,
        level: "internal",
      });
      idx += 1;
    }
  }

  for (const m of position.manualCandidates ?? []) {
    byId.set("manual:" + m.id, {
      id: "manual:" + m.id,
      applicationTaId: "manual:" + m.id,
      name: m.name,
      roleSummary: m.note || "Added by hand",
      source: "Added by hand",
      fit: null,
      stageKey: "new",
      statusLabel: "Added by hand, not in TA",
      statusTone: "neutral",
      noticeWeeks: "",
      expectedSalary: "",
      contactSummary: [m.email, m.phone].filter(Boolean).join(" · ") || "No contact details yet",
      setId: null,
      setName: null,
      fileId: m.cvFileId,
      decision: null,
      decisionReason: null,
      manual: true,
      level: "found",
    });
  }

  // Whoever the TA System has on this opening and Ops has not heard of yet: shown by their TA stage.
  for (const a of taApplications) {
    const known = byId.has(a.id) || Array.from(byId.values()).some((e) => e.name.toLowerCase() === a.candidateName.toLowerCase());
    if (known) continue;
    byId.set(a.id, {
      id: a.id,
      applicationTaId: a.id,
      name: a.candidateName,
      roleSummary: position.title + " candidate",
      source: null,
      fit: null,
      stageKey: "screened",
      statusLabel: "In the TA System: " + a.currentStage.replace(/_/g, " "),
      statusTone: "neutral",
      noticeWeeks: "",
      expectedSalary: "",
      contactSummary: "From the TA System",
      setId: null,
      setName: null,
      fileId: null,
      decision: null,
      decisionReason: null,
      level: "found",
    });
  }

  // The level of each, from the sets, the client's answers, interviews, placements and the TA stage.
  const interviews = db.interviews.filter((i) => onPosition(position, i) && !isOff(i.state));
  const placements = db.placements.filter((p) => onPosition(position, p) && p.state !== "cancelled" && p.state !== "no_show");
  for (const view of byId.values()) {
    const inSetRow = itsSets.some((set) => set.candidates.some((c) => (c.applicationTaId || "") === view.applicationTaId));
    const placement = placements.find((p) => p.applicationTaId === view.applicationTaId);
    view.level = candidateLevel({
      dropped: view.stageKey === "dropped",
      inSet: inSetRow,
      clientShortlisted: view.decision === "shortlisted",
      hasInterview: interviews.some((i) => i.applicationTaId === view.applicationTaId),
      placed: !!placement,
      joined: !!placement?.joinedAt,
      taStage: taStageOf.get(view.applicationTaId) ?? taStageOf.get(view.name.toLowerCase()) ?? null,
    });
  }

  return Array.from(byId.values());
}
