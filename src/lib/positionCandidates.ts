import type { OpsClientSet, OpsDatabase, OpsPosition } from "@/data/types";

export interface PositionCandidateView {
  id: string;
  applicationTaId: string;
  name: string;
  roleSummary: string;
  source: "LinkedIn" | "TA System database" | "Talent Pulse" | "TopJobs";
  fit: number;
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
}

const FALLBACK_TA_PIPELINE: Omit<PositionCandidateView, "setId" | "setName" | "fileId" | "decision" | "decisionReason">[] = [
  {
    id: "app-ishara-perera",
    applicationTaId: "app-ishara-perera",
    name: "Ishara Perera",
    roleSummary: "Senior Accountant, Cargills · 9 yrs",
    source: "LinkedIn",
    fit: 82,
    stageKey: "screened",
    statusLabel: "Shortlisted",
    statusTone: "ok",
    noticeWeeks: "2 weeks",
    expectedSalary: "LKR 600k",
    contactSummary: "WhatsApp and a call · reached on day 1",
  },
  {
    id: "app-ruwan-fernando",
    applicationTaId: "app-ruwan-fernando",
    name: "Ruwan Fernando",
    roleSummary: "Finance Controller, MAS · 11 yrs",
    source: "TA System database",
    fit: 78,
    stageKey: "screened",
    statusLabel: "With the client",
    statusTone: "neutral",
    noticeWeeks: "1 month",
    expectedSalary: "LKR 620k",
    contactSummary: "Phone call · reached on day 1",
  },
  {
    id: "app-dinesh-jayawardena",
    applicationTaId: "app-dinesh-jayawardena",
    name: "Dinesh Jayawardena",
    roleSummary: "Finance Manager, Hayleys · 8 yrs",
    source: "LinkedIn",
    fit: 75,
    stageKey: "screened",
    statusLabel: "Screened",
    statusTone: "neutral",
    noticeWeeks: "1 month",
    expectedSalary: "LKR 580k",
    contactSummary: "WhatsApp and phone call · screened by TA",
  },
  {
    id: "app-sanduni-wickramasinghe",
    applicationTaId: "app-sanduni-wickramasinghe",
    name: "Sanduni Wickramasinghe",
    roleSummary: "Group Accountant, John Keells · 7 yrs",
    source: "Talent Pulse",
    fit: 71,
    stageKey: "contacting",
    statusLabel: "Contacting · 2 of 3",
    statusTone: "neutral",
    noticeWeeks: "3 weeks",
    expectedSalary: "LKR 540k",
    contactSummary: "2 attempts (WhatsApp + call) · waiting for reply",
  },
  {
    id: "app-malith-bandara",
    applicationTaId: "app-malith-bandara",
    name: "Malith Bandara",
    roleSummary: "Finance Lead, Aitken Spence · 6 yrs",
    source: "LinkedIn",
    fit: 64,
    stageKey: "contacting",
    statusLabel: "No reply · TA to call",
    statusTone: "warn",
    noticeWeeks: "1 month",
    expectedSalary: "LKR 525k",
    contactSummary: "2 WhatsApp messages · TA calling today",
  },
];

const SOURCES: PositionCandidateView["source"][] = [
  "LinkedIn",
  "TA System database",
  "Talent Pulse",
  "TopJobs",
];

/**
 * Builds the unified candidate list for an opening (`1:2325` and `1:2433`),
 * merging real candidates from CV sets and interviews with the TA System's
 * active search pipeline so every candidate row and application detail view works.
 */
export function candidatesForPosition(
  db: OpsDatabase,
  position: OpsPosition,
  itsSets: OpsClientSet[],
): PositionCandidateView[] {
  const byId = new Map<string, PositionCandidateView>();

  let idx = 0;
  for (const set of itsSets) {
    for (const c of set.candidates) {
      const id = c.applicationTaId || `cand-${idx}`;
      const fit = 84 - (idx * 4) % 22;
      const source = SOURCES[idx % SOURCES.length];
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
        roleSummary: `${position.title} candidate · ${8 + (idx % 5)} yrs`,
        source,
        fit,
        stageKey,
        statusLabel,
        statusTone,
        noticeWeeks: idx % 2 === 0 ? "2 weeks" : "1 month",
        expectedSalary: position.requirementId
          ? db.requirements.find((r) => r.id === position.requirementId)?.fields.salary || "LKR 600k"
          : "LKR 600k",
        contactSummary: "WhatsApp and a call · reached on day 1",
        setId: set.id,
        setName: set.name,
        fileId: c.fileId,
        decision: c.decision ?? null,
        decisionReason: c.decisionReason ?? null,
      });
      idx += 1;
    }
  }

  for (const fb of FALLBACK_TA_PIPELINE) {
    const alreadyByName = Array.from(byId.values()).some(
      (existing) => existing.name.toLowerCase() === fb.name.toLowerCase(),
    );
    if (!byId.has(fb.id) && !alreadyByName) {
      byId.set(fb.id, {
        ...fb,
        setId: itsSets[0]?.id ?? null,
        setName: itsSets[0]?.name ?? null,
        fileId: null,
        decision: fb.statusLabel === "Shortlisted" ? "shortlisted" : null,
        decisionReason: null,
      });
    }
  }

  return Array.from(byId.values());
}
