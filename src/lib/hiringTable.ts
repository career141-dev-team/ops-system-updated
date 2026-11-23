/**
 * Internal hiring across every vacancy (23 Nov, the ops team's feedback): a board of all the people in the
 * screening funnel and a table of them, built for volume, since the team screens 30 or more calls a day
 * from a panel of 1,500 CVs. The vacancy page keeps its own board for one vacancy; this is the whole funnel.
 *
 * The board shows the first few of each column and says how many more there are, with a link to the table
 * for that stage, so a column of 400 people never becomes a page of 400 cards. The table is filtered and
 * paged on the server. Pure: it reads the typed view and draws nothing.
 */
import type { Applicant, ApplicantStage, HiringView } from "@/lib/hiring";

export const FUNNEL: { stage: ApplicantStage; label: string }[] = [
  { stage: "new", label: "New CVs" },
  { stage: "call", label: "To call" },
  { stage: "fits", label: "Called · fits" },
  { stage: "interview", label: "Interview" },
  { stage: "decision", label: "Decision" },
  { stage: "hired", label: "Hired" },
  { stage: "rejected", label: "Rejected" },
];

export const STAGE_LABEL: Record<string, string> = Object.fromEntries(FUNNEL.map((f) => [f.stage, f.label]));

export interface ApplicantRow {
  id: string;
  name: string;
  source: string;
  phone: string | null;
  vacancyId: string;
  vacancy: string;
  stage: ApplicantStage;
  since: number;
  detail: string;
  hasCv: boolean;
  nic: string;
  targetPosition: string;
  packageSaid: string;
  laptop: string;
}

/** Everyone, oldest waiting first inside a stage: the longest-waiting CV is the next call. */
export function applicantRows(view: HiringView): ApplicantRow[] {
  const rows: ApplicantRow[] = view.vacancies.flatMap((v) =>
    v.applicants.map((a: Applicant) => ({
      id: a.id,
      name: a.name,
      source: a.source,
      phone: a.phone,
      vacancyId: v.id,
      vacancy: v.title,
      stage: a.stage,
      since: a.since,
      detail: a.detail,
      hasCv: !!a.cvFileId,
      nic: a.nic ?? "",
      targetPosition: a.targetPosition ?? "",
      packageSaid: a.packageSaid ?? "",
      laptop: a.laptop ?? "",
    })),
  );
  return rows.sort((a, b) => a.since - b.since);
}

export interface ApplicantFilter {
  vacancyId?: string;
  stage?: string;
  q?: string;
}

/** Every word of the search must be in the name, the source, the phone or the vacancy. */
export function filterApplicants(rows: ApplicantRow[], f: ApplicantFilter): ApplicantRow[] {
  const words = (f.q ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((r) => {
    if (f.vacancyId && r.vacancyId !== f.vacancyId) return false;
    // "To call" holds the new CVs too, as on the vacancy board.
    if (f.stage && !(f.stage === "call" ? r.stage === "call" || r.stage === "new" : r.stage === f.stage)) return false;
    const text = [r.name, r.source, r.phone ?? "", r.vacancy, r.nic, r.targetPosition].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

export const PAGE_SIZE = 50;

/** One page of a long list, with the page number kept inside what exists. */
export function pageOf<T>(rows: T[], page: number, size = PAGE_SIZE): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const at = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: rows.slice((at - 1) * size, at * size), page: at, pages };
}

export const BOARD_CARDS = 8;

/** The board: each stage with its first few cards and the count of all of them. "New" folds into "To call". */
export function boardColumns(rows: ApplicantRow[], cards = BOARD_CARDS): { stage: ApplicantStage; label: string; total: number; shown: ApplicantRow[] }[] {
  return FUNNEL.filter((f) => f.stage !== "new").map((f) => {
    const here = rows.filter((r) => (f.stage === "call" ? r.stage === "call" || r.stage === "new" : r.stage === f.stage));
    return { stage: f.stage, label: f.stage === "call" ? "To call" : f.label, total: here.length, shown: here.slice(0, cards) };
  });
}
