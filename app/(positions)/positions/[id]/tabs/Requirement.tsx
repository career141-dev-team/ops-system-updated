import Link from "next/link";
import { addStrategy, approvePositionJd, removeStrategy, recordLinkedInPost, requestAd, savePositionRequirement } from "@/app/actions";
import Icon from "@/app/Icon";
import { StatusChip, figmaField, figmaLabel, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { issuesNewestFirst } from "@/data/desk";
import { weekOf } from "@/lib/adverts";
import { REQUIREMENT_FIELDS, briefText, requirementLocked } from "@/lib/requirements";
import { TA_STRATEGIES, resolveStrategyOwner, taOwnerId } from "@/lib/strategies";

import type { RoleCtx } from "./ctx";
export default function Requirement({ c }: { c: RoleCtx }) {
  const { me, db, position, now, mayManage, mayAdvert, client, clientName, requirement, taPeopleList, primaryTaPerson, taName, ad, allCandidates, whenDate } = c;
  return (
<div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Left Column: FROM THE REQUIREMENT MEETING (1:1945) */}
          <div className="flex w-full shrink-0 flex-col gap-3.5 lg:w-[400px]">
            <p className={figmaLabel}>FROM THE REQUIREMENT MEETING</p>

            {/* Only what the meeting recorded (18 Nov: the gaps were filled with an invented salary, level and town). */}
            {[
              { label: "Salary", value: requirement?.fields.salary },
              {
                label: "Level",
                value: requirement?.fields.level
                  ? `${requirement.fields.level}${requirement.fields.headcount ? ` · ${requirement.fields.headcount} open` : ""}`
                  : "",
              },
              { label: "Location", value: requirement?.fields.locations },
              { label: "What the client really wants", value: requirement?.fields.jdNotes || requirement?.fields.insights },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5 rounded-[16px] bg-sunk px-4 py-3.5">
                <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">{item.label}</span>
                <span className={`whitespace-pre-wrap text-[14px] leading-[22px] ${item.value ? "text-ink" : "text-ink-faint"}`}>
                  {item.value || "Not recorded yet"}
                </span>
              </div>
            ))}

            {mayManage && !(requirement && requirementLocked(requirement.fields)) && (
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

          {/* The brief as the TA System gets it (18 Nov: was an "AURA" draft written from fixed sentences; AI drafting is off). */}
          <div className="flex flex-1 flex-col gap-3 rounded-[28px] bg-surface px-[30px] py-[26px] shadow-float">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-soft">
                The brief, from the requirement meeting
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

            {requirement?.fields ? (
              <pre className="whitespace-pre-wrap font-sans text-[14px] leading-[22px] text-ink-soft">
                {briefText(requirement.fields)}
              </pre>
            ) : (
              <p className="text-[14px] text-ink-faint">No requirement recorded yet. Fill in the fields on the left.</p>
            )}

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
              {mayManage && !(requirement && requirementLocked(requirement.fields)) ? (
                <a href="#edit-requirement" className={pillSecondary}>
                  Edit
                </a>
              ) : requirement && requirementLocked(requirement.fields) ? (
                <span className="text-[12px] text-ink-faint">The requirement is complete and locked.</span>
              ) : null}
              <span className="ml-auto text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">
                {position.jdApprovedAt
                  ? `Approved ${whenDate(position.jdApprovedAt)} — advertising is open.`
                  : "Advertising opens once the JD is approved."}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          {/* Strategies assigned (17 Nov): TA strategies assigned to an Ops or TA person on this job */}
          <div className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5">
            <h2 className="text-[18px] font-medium leading-[26px] text-ink">Strategies assigned</h2>
            {(position.strategies ?? []).length === 0 ? (
              <p className="text-[14px] text-ink-soft">None yet. Choose a strategy and assign it to an Ops or TA person below.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-rule">
                {(position.strategies ?? []).map((st) => {
                  const owner = resolveStrategyOwner(st.ownerId, db.members, taPeopleList);
                  return (
                    <li key={st.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]">
                      <span className="text-ink">
                        {st.text}{" "}
                        <span className="text-ink-soft">
                          · {owner ? `${owner.name} (${owner.team})` : "somebody"}
                        </span>
                      </span>
                      {mayManage && (
                        <form action={removeStrategy}>
                          <input type="hidden" name="positionId" value={position.id} />
                          <input type="hidden" name="strategyId" value={st.id} />
                          <button type="submit" className="text-[13px] text-ink-faint hover:text-danger">
                            Remove
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {mayManage && (
              <details className="border-t border-rule pt-3" open={(position.strategies ?? []).length === 0}>
                <summary className="cursor-pointer text-[13px] font-medium text-brand hover:underline">
                  Add strategies
                </summary>
                <form action={addStrategy} className="mt-3 flex flex-col gap-2">
                  <input type="hidden" name="positionId" value={position.id} />
                  <div className="flex flex-col divide-y divide-rule rounded-[14px] border border-rule bg-surface px-3">
                    {TA_STRATEGIES.map((s) => (
                      <div
                        key={s}
                        className="grid grid-cols-1 items-center gap-2 py-2 sm:grid-cols-[220px_190px_1fr]"
                      >
                        <label className="flex items-center gap-2 text-[13.5px] text-ink">
                          <input type="checkbox" name="pick" value={s} />
                          <span>{s}</span>
                        </label>
                        <select
                          name={"owner." + s}
                          defaultValue={primaryTaPerson ? taOwnerId(primaryTaPerson.id) : me.id}
                          className={figmaField}
                        >
                          {primaryTaPerson && (
                            <optgroup label="TA on this job">
                              <option value={taOwnerId(primaryTaPerson.id)}>
                                {primaryTaPerson.fullName} (TA)
                              </option>
                            </optgroup>
                          )}
                          <optgroup label="Ops team">
                            {db.members
                              .filter((m) => m.active)
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} (Ops)
                                </option>
                              ))}
                          </optgroup>
                          {taPeopleList.filter((p) => p.id !== primaryTaPerson?.id).length > 0 && (
                            <optgroup label="TA team">
                              {taPeopleList
                                .filter((p) => p.id !== primaryTaPerson?.id)
                                .map((p) => (
                                  <option key={p.id} value={taOwnerId(p.id)}>
                                    {p.fullName} (TA)
                                  </option>
                                ))}
                            </optgroup>
                          )}
                        </select>
                        <input name={"note." + s} placeholder="Note (optional)" className={figmaField} />
                      </div>
                    ))}
                  </div>
                  <button type="submit" className={pillSecondary + " self-start"}>
                    Add selected
                  </button>
                </form>
              </details>
            )}
          </div>

          {/* 3-Column Channel Cards (1:2272) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Card 1: LinkedIn */}
            <div className="flex flex-col gap-2.5 rounded-[24px] bg-sunk px-6 py-[22px]">
              <h2 className="text-[18px] leading-[26px] text-ink">LinkedIn</h2>
              <p className="text-[14px] leading-[22px] text-ink-soft">
                {position.linkedInUrl
                  ? `Live${position.linkedInPostedAt ? " since " + whenDate(position.linkedInPostedAt) : ""} · posted by ${taName}`
                  : `Waiting for ${taName} to post on LinkedIn before going Live`}
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
              <h2 className="text-[18px] leading-[26px] text-ink">TopJobs</h2>

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
                    {/* It asks marketing for a flyer; nothing goes to TopJobs yet (18 Nov: said "Send the flyer"). */}
                    <button type="submit" className={pillPrimary}>
                      Request the advert
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
                  <h2 className="text-[18px] leading-[26px] text-ink">Talent Pulse</h2>
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

          {/* WHERE THE CVs CAME FROM (Figma 249:14374): real counts, bars in proportion, in a card of their own */}
          {(() => {
            // Only sources somebody recorded (18 Nov: LinkedIn and the rest were counted from invented sources).
            const byHand = allCandidates.filter((c) => c.manual).length;
            const topJobs = ad?.cvCount ?? 0;
            const rows = [
              { label: "TopJobs", count: topJobs },
              { label: "Added by hand", count: byHand },
              { label: "Not recorded", count: Math.max(0, allCandidates.length - byHand - topJobs) },
            ];
            const most = Math.max(1, ...rows.map((r) => r.count));
            return (
              <div className="flex max-w-[640px] flex-col gap-2.5 rounded-[24px] bg-surface p-5 shadow-card">
                <p className={figmaLabel}>WHERE THE CVs CAME FROM</p>
                {rows.map((row) => (
                  <div key={row.label} className="flex items-center gap-3.5 py-1">
                    <span className="w-[140px] shrink-0 text-[14px] leading-[22px] text-ink">{row.label}</span>
                    <div className="flex min-w-0 flex-1 items-center">
                      <div
                        className={`h-[10px] rounded-[5px] ${row.count > 0 ? "bg-brand" : "bg-rule"}`}
                        style={{ width: row.count > 0 ? `${Math.max(4, (row.count / most) * 100)}%` : 4 }}
                      />
                    </div>
                    <span className={`w-6 text-right text-[14px] leading-[22px] ${row.count > 0 ? "text-ink" : "text-ink-faint"}`}>{row.count}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
</div>
  );
}
