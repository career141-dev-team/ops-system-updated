/**
 * What the stand-in TA System remembers (18 Nov), so a test on a laptop has consequences.
 *
 * The real TA System moves a candidate's stage when Ops tells it the client shortlisted or turned them down, and
 * Ops counts the shortlist from TA's pipeline (the depth rules: hold at five, search again). A stand-in that kept
 * nothing could never show those rules working. This is the small memory it keeps: stage changes, and the people
 * the dev panel invented for an opening. Pure; `src/data/fakeTa.ts` keeps it in a file next to the store.
 *
 * Only the sample's people (`ta_smp_`) and the dev panel's (`ta_dev_`) are ever moved, so the recorded sample
 * (`ta_a1`...) the tests rely on stays exactly as it was.
 */

export interface FakeTaApp {
  id: string;
  candidateName: string;
  currentStage: string;
  setNumber: number | null;
  backupForApplicationId: null;
}

export interface FakeTaState {
  /** An application's stage, by its id, as TA would now say it. */
  stages: Record<string, string>;
  /** People the dev panel invented, by the opening they belong to. */
  apps: Record<string, FakeTaApp[]>;
}

export const EMPTY_STATE: FakeTaState = { stages: {}, apps: {} };

const movable = (id: string) => /^ta_(smp|dev)_/.test(id);

/** What a write Ops sends does to TA's side. Anything not about a movable application changes nothing. */
export function applyWrite(state: FakeTaState, path: string, body: unknown): FakeTaState {
  const match = /\/applications\/([^/]+)\/(client-decision|client-owned)$/.exec(path.split("?")[0]);
  if (!match || !movable(match[1])) return state;
  const said = (body ?? {}) as { decision?: string };
  const stage =
    match[2] === "client-owned"
      ? "client_owned"
      : said.decision === "shortlisted"
        ? "client_shortlist"
        : said.decision === "rejected"
          ? "rejected_by_client"
          : null;
  return stage ? { ...state, stages: { ...state.stages, [match[1]]: stage } } : state;
}

/** A stage the dev panel sets directly ("TA moves a candidate"). */
export function setStage(state: FakeTaState, applicationId: string, stage: string): FakeTaState {
  return movable(applicationId) ? { ...state, stages: { ...state.stages, [applicationId]: stage } } : state;
}

/** People the dev panel just sent in a set, added to that opening's pipeline. */
export function addApps(state: FakeTaState, openingId: string, apps: FakeTaApp[]): FakeTaState {
  const had = state.apps[openingId] ?? [];
  const fresh = apps.filter((a) => !had.some((h) => h.id === a.id));
  return { ...state, apps: { ...state.apps, [openingId]: [...had, ...fresh] } };
}

/** An opening's pipeline as TA would answer now: what it started as, with every stage that has moved since. */
export function pipelineNow(base: FakeTaApp[], state: FakeTaState): { applications: FakeTaApp[]; counts: Record<string, number> } {
  const applications = base.map((a) => (state.stages[a.id] ? { ...a, currentStage: state.stages[a.id] } : a));
  const counts: Record<string, number> = {};
  for (const a of applications) counts[a.currentStage] = (counts[a.currentStage] ?? 0) + 1;
  return { applications, counts };
}
