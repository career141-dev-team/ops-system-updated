import type { OpsDatabase } from "@/data/types";

/**
 * What an empty Ops backend is given on its first read (22 Nov).
 *
 * Until now any empty Convex backend got the invented sample desk: sample
 * people, clocks, tasks and drafts. A live backend that ever starts empty (first
 * deploy, a restore, a new environment) would have had fake clients' work next
 * to real ones. So the sample is opt-in: only a run that sets `OPS_SAMPLE_DESK=on`
 * (the laptop scripts and the invented-data preview) gets it. Every other backend
 * gets only the real defaults - the numbers and switches the rules read, and our
 * own wording - and no people, clocks, tasks, drafts or holidays.
 */
export function wantsSampleDesk(env: Record<string, string | undefined>): boolean {
  return env.OPS_SAMPLE_DESK === "on";
}

type FirstRun = Pick<OpsDatabase, "members" | "settings" | "holidays" | "templates" | "timers" | "tasks" | "messages">;

export function firstRunDesk(sample: FirstRun, withSample: boolean): FirstRun {
  if (withSample) return sample;
  // The holidays in the sample include an invented one, and a wrong holiday
  // moves every working-day clock; the real calendar is the owner's to type in.
  return { members: [], settings: sample.settings, holidays: [], templates: sample.templates, timers: [], tasks: [], messages: [] };
}
