import Link from "next/link";
import { addManualCandidate, removeManualCandidate } from "@/app/actions";
import Icon from "@/app/Icon";
import { Avatar, StatusChip, ViewPills, figmaField, figmaLabel, pillSecondary } from "@/app/ui/figma";
import { CANDIDATE_LEVELS, LEVEL_LABELS, type CandidateLevel } from "@/lib/positionCandidates";

import type { RoleCtx, TabProps } from "./ctx";
export default function Sets({ c, sp }: TabProps) {
  const { db, position, mayManage, client, itsSets, guarantee, allCandidates, stage } = c;
  return (
<div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <p className={figmaLabel}>CV SETS ON THIS OPENING · {itsSets.length}</p>
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
        <div className="flex flex-col gap-5">
          {(() => {
            // By level (owner, 17 Nov evening): internal shortlist, external shortlist, interviews, joining, guarantee.
            const levelCount = (level: CandidateLevel) => allCandidates.filter((c) => c.level === level).length;
            const shownCandidates = allCandidates.filter((c) => (stage === "all" ? true : c.level === stage));
            const levelHref = (key: string) => `/positions/${position.id}?view=sets&stage=${key}`;

            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ViewPills
                    items={[
                      { key: "all", label: "All", count: allCandidates.length, href: levelHref("all") },
                      ...CANDIDATE_LEVELS.map((level) => ({ key: level, label: LEVEL_LABELS[level], count: levelCount(level), href: levelHref(level) })),
                    ]}
                    active={stage}
                  />

                  <div className="flex items-center gap-1.5 rounded-full bg-sunk px-3.5 py-1.5 text-[12px] font-medium tracking-[0.4px] text-ink-faint">
                    <Icon name="lock" size={14} />
                    <span>The TA works this list in the TA System. People added here by hand stay in Ops.</span>
                  </div>
                </div>

                {mayManage && (
                  <details className="rounded-[24px] bg-sunk px-6 py-4">
                    <summary className="cursor-pointer text-[14px] font-medium text-brand hover:underline">
                      Add a candidate by hand (for when the TA link is down)
                    </summary>
                    {(position.manualCandidates ?? []).length > 0 && (
                      <ul className="mt-3 flex flex-col divide-y divide-rule text-[14px]">
                        {(position.manualCandidates ?? []).map((m) => (
                          <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                            <span className="text-ink">
                              {m.name} <span className="text-ink-soft">· added by hand, not in TA</span>
                            </span>
                            <form action={removeManualCandidate}>
                              <input type="hidden" name="positionId" value={position.id} />
                              <input type="hidden" name="candidateId" value={m.id} />
                              <button type="submit" className="text-[13px] text-ink-faint hover:text-danger">
                                Remove
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                    <form action={addManualCandidate} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input type="hidden" name="positionId" value={position.id} />
                      <input name="name" required placeholder="Full name" className={figmaField} />
                      <input name="email" type="email" placeholder="Email" className={figmaField} />
                      <input name="phone" placeholder="Phone" className={figmaField} />
                      <select name="cvFileId" className={figmaField} defaultValue="">
                        <option value="">No CV yet</option>
                        {db.files.filter((f) => f.kind === "cv").map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                      <input name="note" placeholder="A line about them: current role, years" className={figmaField + " sm:col-span-2"} />
                      <button type="submit" className={pillSecondary + " self-start"}>
                        Add them
                      </button>
                    </form>
                  </details>
                )}

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
                          {cand.roleSummary}{cand.source ? " · " + cand.source : ""}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-sunk px-2.5 py-1 text-[14px] font-medium leading-[22px] text-ink">
                        {LEVEL_LABELS[cand.level]}{cand.manual ? " · by hand" : ""}
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
</div>
  );
}
