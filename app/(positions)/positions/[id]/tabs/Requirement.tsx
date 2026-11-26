import Link from "next/link";
import type { ReactNode } from "react";

import { addStrategy, approvePositionJd, recordLinkedInPost, removeStrategy, requestAd, savePositionRequirement } from "@/app/actions";
import Icon from "@/app/Icon";
import { Card, figmaField, panelInput } from "@/app/ui/figma";
import { issuesNewestFirst, meetingIn } from "@/data/desk";
import { weekOf } from "@/lib/adverts";
import { REQUIREMENT_FIELDS, briefText, requirementLocked } from "@/lib/requirements";
import { TA_STRATEGIES, resolveStrategyOwner, taOwnerId } from "@/lib/strategies";

import type { TabProps } from "./ctx";
import HoldPanel from "./overview/HoldPanel";
import MeetingNotHeldPanel from "./requirement/MeetingNotHeldPanel";
import { dayMonth } from "./shared/fmt";

const chip = (tone: "brand" | "warn") =>
  `inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium leading-4 ${tone === "brand" ? "bg-bg-brand text-brand" : "bg-warn-soft text-warn"}`;
const small = "inline-flex items-center rounded-full border border-rule bg-surface px-3.5 py-2 text-[13px] font-medium leading-5 text-ink hover:bg-sunk cursor-pointer";
const primary = "inline-flex items-center rounded-full bg-ink px-3.5 py-2 text-[13px] font-medium leading-5 text-ink-inverse cursor-pointer";

function Field({ label, children, sub }: { label: string; children: ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="t-micro text-ink-3">{label.toUpperCase()}</span>
      <span className="t-body-m whitespace-pre-wrap">{children}</span>
      {sub && <span className="t-small text-ink-3">{sub}</span>}
    </div>
  );
}

/** R6, the role's requirement and adverts (frame 181:527). */
export default function Requirement({ c, sp }: TabProps) {
  const { me, db, position, now, mayManage, mayAdvert, client, requirement, taPeopleList, primaryTaPerson, taName, ad, allCandidates, whenDate } = c;
  const path = `/positions/${position.id}`;
  const f = requirement?.fields ?? {};
  const locked = Boolean(requirement && requirementLocked(requirement.fields));
  // One requirement call per position (26 Nov, Nov 25 ops meeting); older calls carry no position, so the requirement's own is the fallback.
  const meeting =
    db.meetings.filter((m) => m.kind === "requirement" && m.positionId === position.id).sort((a, b) => b.at - a.at)[0] ??
    (requirement?.meetingId ? meetingIn(db, requirement.meetingId) : null);
  const contact = client?.contacts?.[0] ?? null;
  const team = (position.team ?? []).map((t) => taPeopleList.find((p) => p.id === t.taId)?.fullName.split(" ")[0] ?? t.taId);
  const thisWeek = issuesNewestFirst(db).find((i) => i.weekOf === weekOf(now)) ?? null;
  const inPulse = thisWeek?.lines.some((l) => l.positionId === position.id) ?? false;

  // Only sources somebody recorded: TopJobs from the advert's own address, hand-added, and the rest unlabelled.
  const byHand = allCandidates.filter((x) => x.manual).length;
  const topJobs = ad?.cvCount ?? 0;
  const sources = [
    { label: "TopJobs", n: topJobs },
    { label: "Added by hand", n: byHand },
    { label: "Not recorded", n: Math.max(0, allCandidates.length - byHand - topJobs) },
  ];
  const most = Math.max(1, ...sources.map((s) => s.n));

  const hundred = position.hundredPercentDay ? Date.parse(position.hundredPercentDay + "T09:00:00+05:30") : 0;
  const adLive = ad && ["live", "closed"].includes(ad.state);
  const standsHead = !requirement ? "No requirement is recorded yet." : position.jdApprovedAt ? "The requirement is current." : "The JD is waiting for approval.";
  const standsBody = [
    requirement ? `Version ${(requirement.version ?? 1)} since ${dayMonth(requirement.updatedAt)}.` : null,
    ad?.closesAt && adLive ? `The TopJobs advert ends on ${dayMonth(ad.closesAt)}.` : null,
    thisWeek ? (inPulse ? "Talent Pulse has this role in this week's issue." : "Talent Pulse is compiled every Tuesday.") : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="grid gap-[22px] pg-xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_380px] pg-xl:items-start">
        <div className="flex flex-col gap-[22px]">
          <Card
            title="Requirement"
            sub={requirement ? `Version ${(requirement.version ?? 1)} · changed ${dayMonth(requirement.updatedAt)}` : "Nothing recorded yet"}
            right={requirement ? <span className="inline-flex shrink-0 rounded-full bg-info-soft px-2.5 py-1 text-[12px] font-medium leading-4 text-info">Version {(requirement.version ?? 1)}</span> : undefined}
          >
            {requirement ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Position">{f.title || position.title}</Field>
                <Field label="Level">{f.level || "Not recorded"}</Field>
                <Field label="Headcount">{f.headcount || "Not recorded"}</Field>
                <Field label="Location">{f.locations || "Not recorded"}</Field>
                <Field label="Salary">{f.salary || "Not recorded"}</Field>
                <Field label="Meeting" sub={contact ? `with ${contact.name}` : undefined}>
                  {meeting?.heldAt ? `Held ${dayMonth(meeting.heldAt)}` : meeting ? "Not held yet" : "No meeting recorded"}
                </Field>
                {f.incumbentNote && (
                  <div className="col-span-2">
                    <Field label="Incumbent or reference profile">{f.incumbentNote}</Field>
                  </div>
                )}
                <div className="col-span-2">
                  <Field label="Notes">{f.jdNotes || f.insights || "Not recorded"}</Field>
                </div>
                {mayManage && !meeting?.heldAt && (
                  <div className="col-span-2">
                    {/* The requirement call is booked from the client's page, for this position, in its TA's calendar (26 Nov, Nov 25 ops meeting). */}
                    <Link href={(client ? "/clients/" + client.id : "/leads/" + requirement.leadId + "?step=requirement") + "?panel=requirement-call&position=" + position.id} scroll={false} className={small}>
                      {meeting ? "Rebook the requirement call" : "Book the requirement call"}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <p className="t-body rounded-[18px] bg-sunk px-6 py-5 text-ink-3">No requirement is recorded yet. Fill in the fields below.</p>
            )}

            {locked ? (
              <p className="t-small text-ink-3">The requirement is complete and locked. A change goes through the client.</p>
            ) : (
              mayManage && (
                <details id="change-requirement" open={sp.open === "requirement"} className="group scroll-mt-6">
                  <summary className="t-body-m cursor-pointer list-none text-brand hover:underline [&::-webkit-details-marker]:hidden">Change the requirement</summary>
                  <form action={savePositionRequirement} className="mt-4 flex flex-col gap-3 border-t border-rule pt-4">
                    <input type="hidden" name="positionId" value={position.id} />
                    <input type="hidden" name="back" value={`${path}?view=requirement`} />
                    {REQUIREMENT_FIELDS.map((x) => (
                      <label key={x.key} className="t-small flex flex-col gap-1 text-ink-3">
                        {x.label}
                        <input name={`field.${x.key}`} defaultValue={f[x.key] ?? (x.key === "title" ? position.title : "")} className={panelInput} />
                      </label>
                    ))}
                    <button type="submit" className={primary + " self-start"}>
                      Save the requirement
                    </button>
                  </form>
                </details>
              )
            )}
          </Card>

          <Card
            title="JD"
            sub="Job description"
            right={<span className={chip(position.jdApprovedAt ? "brand" : "warn")}>{position.jdApprovedAt ? "● Approved" : "● Waiting for approval"}</span>}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Field label="Approved">{position.jdApprovedAt ? dayMonth(position.jdApprovedAt) : "Not yet"}</Field>
              <Field label="Version">{requirement ? String(requirement.version ?? 1) : "—"}</Field>
            </div>
            <details id="jd" open={sp.open === "jd"} className="scroll-mt-6">
              <summary className={small + " w-fit list-none gap-1.5 [&::-webkit-details-marker]:hidden"}>
                <Icon name="chevron-right" size={13} />
                Open the JD
              </summary>
              <div className="mt-4 flex flex-col gap-3">
                {requirement ? <pre className="t-body whitespace-pre-wrap font-sans text-ink-2">{briefText(requirement.fields)}</pre> : <p className="t-body text-ink-3">Nothing to approve until a requirement is recorded.</p>}
                {mayManage && requirement && !position.jdApprovedAt && (
                  <form action={approvePositionJd}>
                    <input type="hidden" name="positionId" value={position.id} />
                    <input type="hidden" name="back" value={`${path}?view=requirement`} />
                    <button type="submit" className={primary}>
                      Approve the JD
                    </button>
                  </form>
                )}
                <p className="t-small text-ink-3">{position.jdApprovedAt ? `Approved ${whenDate(position.jdApprovedAt)}: advertising is open.` : "Advertising opens once the JD is approved."}</p>
              </div>
            </details>
          </Card>
        </div>

        <div className="flex flex-col gap-[22px]">
          <Card title="Hand-over and team">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Field label="Primary TA" sub={team.length ? `${team.join(", ")} also ${team.length === 1 ? "works" : "work"} on it` : undefined}>
                {primaryTaPerson?.fullName.split(" ")[0] ?? taName}
              </Field>
              <Field label="TA opening">{position.openingTaId || "Not confirmed yet"}</Field>
              <Field label="Handed over">{dayMonth(position.handedOverAt ?? position.createdAt)}</Field>
              <Field label="100% filled">{hundred ? (Number.isNaN(hundred) ? position.hundredPercentDay : dayMonth(hundred)) : "Not set"}</Field>
            </div>
          </Card>

          <Card title="Adverts" sub="Where the role is advertised">
            <div className="flex flex-col">
              <div className="flex items-start gap-3 border-b border-rule pb-4">
                <span aria-hidden className={"mt-2 size-2 shrink-0 rounded-full " + (position.linkedInUrl ? "bg-brand" : "bg-ink-faint")} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="t-body-m">LinkedIn</span>
                  <span className="t-small text-brand">{position.linkedInUrl ? `Live${position.linkedInPostedAt ? " since " + dayMonth(position.linkedInPostedAt) : ""}` : `Waiting for ${taName} to post`}</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {position.linkedInUrl && (
                      <a href={position.linkedInUrl} target="_blank" rel="noreferrer" className="t-small text-brand hover:underline">
                        Open the post
                      </a>
                    )}
                    {mayAdvert && (
                      <details className="w-full">
                        <summary className="t-small cursor-pointer list-none text-brand hover:underline [&::-webkit-details-marker]:hidden">{position.linkedInUrl ? "Update the link" : "Record the post link"}</summary>
                        <form action={recordLinkedInPost} className="mt-2 flex gap-2">
                          <input type="hidden" name="positionId" value={position.id} />
                          <input type="hidden" name="back" value={`${path}?view=requirement`} />
                          <input name="url" defaultValue={position.linkedInUrl ?? ""} placeholder="https://www.linkedin.com/jobs/view/..." className={panelInput} />
                          <button type="submit" className={small}>
                            Save
                          </button>
                        </form>
                      </details>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 border-b border-rule py-4">
                <span aria-hidden className={"mt-2 size-2 shrink-0 rounded-full " + (adLive ? "bg-brand" : "bg-ink-faint")} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-baseline gap-3">
                    <span className="t-body-m flex-1">TopJobs</span>
                    {ad?.cvCount != null && <span className="t-small text-ink-3">{ad.cvCount} CVs</span>}
                  </div>
                  <span className="t-small text-brand">
                    {!ad
                      ? "No advert yet"
                      : ad.state === "live"
                        ? `Live${ad.closesAt ? " till " + dayMonth(ad.closesAt) : ""}${ad.cost ? " · LKR " + ad.cost.toLocaleString("en-GB") : ""}`
                        : ad.state === "closed"
                          ? "Closed"
                          : ad.state === "flyer"
                            ? "Flyer from marketing is ready to send"
                            : ad.state === "ordered"
                              ? "Ordered, waiting to go live"
                              : "Requested, waiting for the flyer"}
                  </span>
                  {ad ? (
                    <Link href={`/adverts/${ad.id}`} className="t-small w-fit text-brand hover:underline">
                      Open the advert
                    </Link>
                  ) : mayAdvert && position.openingTaId ? (
                    <form action={requestAd} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="positionId" value={position.id} />
                      <select name="kind" defaultValue="single" className={figmaField + " !w-auto !py-2 text-[13px]"}>
                        <option value="single">Single · LKR 5,400</option>
                        <option value="hr_and_marketing">HR and marketing · LKR 12,700</option>
                      </select>
                      {/* It asks marketing for a flyer; nothing goes to TopJobs yet. */}
                      <button type="submit" className={small}>
                        Request the advert
                      </button>
                    </form>
                  ) : (
                    <span className="t-small text-ink-3">Available once TA confirms the opening ID.</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 pt-4">
                <span aria-hidden className={"mt-2 size-2 shrink-0 rounded-full " + (inPulse ? "bg-info" : "bg-ink-faint")} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="t-body-m">Talent Pulse</span>
                  <Link href="/talent-pulse" className="t-small w-fit text-info hover:underline">
                    {inPulse ? "In this week's issue" : "Compiled every Tuesday"}
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-[18px]">
          <section className="flex flex-col gap-3 rounded-[28px] bg-ink px-6 py-[22px] text-ink-inverse shadow-card">
            <p className="t-micro flex items-center gap-2 text-ink-faint">
              <Icon name="sparkle" size={13} />
              WHERE IT STANDS
            </p>
            <h2 className="t-h2 text-ink-inverse">{standsHead}</h2>
            {standsBody && <p className="t-small text-ink-faint">{standsBody}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              {!locked && mayManage && (
                <Link href={`${path}?view=requirement&open=requirement#change-requirement`} scroll={false} className="inline-flex rounded-full bg-surface px-3.5 py-2 text-[13px] font-medium leading-5 text-ink">
                  Change the requirement
                </Link>
              )}
              <Link href={`${path}?view=requirement&open=jd#jd`} scroll={false} className="inline-flex rounded-full border border-ink-faint px-3.5 py-2 text-[13px] font-medium leading-5 text-ink-inverse">
                Open the JD
              </Link>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
            <p className="t-micro text-ink-3">CVS BY SOURCE</p>
            {sources.map((s) => (
              <div key={s.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="t-body">{s.label}</span>
                  <span className="t-body">{s.n}</span>
                </div>
                <span className="h-[3px] w-full rounded-sm bg-rule">
                  <span className="block h-[3px] rounded-sm bg-info" style={{ width: s.n ? Math.max(4, (s.n / most) * 100) + "%" : "0" }} />
                </span>
              </div>
            ))}
          </section>
        </aside>
      </div>

      <Card title="Strategies assigned" sub="TA strategies given to an Ops or TA person on this role">
        {(position.strategies ?? []).length === 0 ? (
          <p className="t-body text-ink-3">None yet. Choose a strategy and assign it to an Ops or TA person below.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-rule">
            {(position.strategies ?? []).map((st) => {
              const owner = resolveStrategyOwner(st.ownerId, db.members, taPeopleList);
              return (
                <li key={st.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="t-body">
                    {st.text} <span className="text-ink-3">· {owner ? `${owner.name} (${owner.team})` : "somebody"}</span>
                  </span>
                  {mayManage && (
                    <form action={removeStrategy}>
                      <input type="hidden" name="positionId" value={position.id} />
                      <input type="hidden" name="strategyId" value={st.id} />
                      <button type="submit" className="t-small text-ink-3 hover:text-danger">
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
          <details open={(position.strategies ?? []).length === 0} className="border-t border-rule pt-3">
            <summary className="t-body-m cursor-pointer text-brand hover:underline">Add strategies</summary>
            <form action={addStrategy} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="positionId" value={position.id} />
              <div className="flex flex-col divide-y divide-rule rounded-[14px] border border-rule px-3">
                {TA_STRATEGIES.map((s) => (
                  <div key={s} className="grid grid-cols-1 items-center gap-2 py-2 sm:grid-cols-[220px_190px_1fr]">
                    <label className="t-body flex items-center gap-2">
                      <input type="checkbox" name="pick" value={s} />
                      <span>{s}</span>
                    </label>
                    <select name={"owner." + s} defaultValue={primaryTaPerson ? taOwnerId(primaryTaPerson.id) : me.id} className={figmaField}>
                      {primaryTaPerson && (
                        <optgroup label="TA on this job">
                          <option value={taOwnerId(primaryTaPerson.id)}>{primaryTaPerson.fullName} (TA)</option>
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
              <button type="submit" className={small + " self-start"}>
                Add selected
              </button>
            </form>
          </details>
        )}
      </Card>

      {sp.panel === "meeting-not-held" && <MeetingNotHeldPanel c={c} sp={sp} />}
      {sp.panel === "hold-close-reopen" && <HoldPanel c={c} sp={sp} />}
    </>
  );
}
