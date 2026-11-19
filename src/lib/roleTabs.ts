/**
 * The tabs of a role page (19 Nov, v6): one place that turns whatever `?view=`
 * a link carries into a tab that exists. Old links keep working: they are
 * stored in tasks, mail and the action `back` fields.
 */
export const ROLE_TABS = ["overview", "interviews", "sets", "offer", "guarantee", "requirement", "history"] as const;
export type RoleTab = (typeof ROLE_TABS)[number];

const ALIASES: Record<string, RoleTab> = {
  jd: "requirement",
  advertising: "requirement",
  adverts: "requirement",
  placements: "offer",
  activity: "history",
  messages: "history",
  // The old Candidates tab is part of Sets now (manual add and ?stage= live there).
  candidates: "sets",
};

/** `view` is `?view=`; `legacyTab` is the older `?tab=`. Anything unknown is the overview. */
export function resolveRoleTab(view?: string, legacyTab?: string): RoleTab {
  for (const key of [view, legacyTab]) {
    if (!key) continue;
    if ((ROLE_TABS as readonly string[]).includes(key)) return key as RoleTab;
    if (ALIASES[key]) return ALIASES[key];
  }
  return "overview";
}
