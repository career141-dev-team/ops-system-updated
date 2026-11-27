import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { addHiringApplicant, claimApplicant } from "@/app/actions";
import Icon from "@/app/Icon";
import { Avatar, Card, EmptyState, PanelField, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { desk, fileIn, textOf } from "@/data/desk";
import { COLOMBO_OFFSET_MS } from "@/lib/calendar";
import { clockOf, dayWord } from "@/lib/calendarBoard";
import {
  HIRING_SECTIONS,
  REJECT_KIND_LABEL,
  STAGE_ACTION,
  colomboDateTimeInput,
  countOf,
  daysSince,
  defaultHiringInterviewAt,
  filterByCaller,
  first,
  hiringInterviewersFrom,
  hiringView,
  isHiringCaller,
  rejectedByKind,
  sectionOfStage,
  slotsThisWeek,
  vacancyById,
  vacancyLine,
  vacancySourceLabel,
  type Applicant,
} from "@/lib/hiring";
import { STAGE_LABEL } from "@/lib/hiringTable";
import { viewHref } from "@/lib/files";
import { hiringSample } from "@/lib/hiringSample";
import { closeHref, panelHref } from "@/lib/panel";
import { can } from "@/lib/roles";
import { closeSendHref } from "@/lib/sendModal";
import { currentMember } from "@/lib/session";
import HiringPanel, { type HiringPanelKind } from "./HiringPanel";
import { HiringSendModal } from "./HiringSendModals";

const PANELS: HiringPanelKind[] = ["call", "book-interview", "add-result", "decide", "reject", "cv", "details"];

/** H2 · Vacancy detail: the numbers, the board of applicants, and the panels (call, book, result, decide, not a fit). Every form saves through an action in app/actions.ts. */
export default async function VacancyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const sp = await searchParams;
  const db = await desk();
  const now = Date.now();
  const view = hiringView(db, process.env.OPS_DEV_SIGNIN === "on" ? hiringSample(now) : null);
  const v = vacancyById(view, id);
  if (!v) {
    if (view.vacancies.length === 0) {
      return (
        <div className="flex flex-col gap-[22px]">
          <Link href="/hiring" className="t-body-m inline-flex items-center gap-2 text-ink-2 hover:underline">
            <Icon name="chevron-left" size={18} /> Internal Hiring
          </Link>
          <Card>
            <EmptyState icon="briefcase" title="This vacancy is not here">
              Hiring for our own team is not connected yet, so no vacancy can be opened.
            </EmptyState>
          </Card>
        </div>
      );
    }
    notFound();
  }

  const path = `/hiring/${v.id}`;
  const n = (s: Parameters<typeof countOf>[1]) => countOf(v, s);
  const toCall = n("call") + n("new");
  const oldest = Math.max(0, ...v.applicants.filter((a) => a.stage === "call" || a.stage === "new").map((a) => daysSince(a.since, now)));
  const openName = typeof sp.panel === "string" && PANELS.includes(sp.panel as HiringPanelKind) ? (sp.panel as HiringPanelKind) : null;
  const on = typeof sp.on === "string" ? v.applicants.find((a) => a.id === sp.on) : undefined;
  const cvFile = on?.cvFileId ? fileIn(db, on.cvFileId) : null;
  const canCall = isHiringCaller(me);
  const mineOnly = sp.mine === "1";
  const memberName = new Map(db.members.map((m) => [m.id, m.name]));
  const leadershipInterviewers = hiringInterviewersFrom(textOf(db, "hiring.interviewers", ""), db.members);
  const defaultInterviewAt = colomboDateTimeInput(defaultHiringInterviewAt(now, db.holidays.map((h) => h.date)));
  const srcLabel = vacancySourceLabel(v);
  const stand = [
    toCall > 0 ? `${toCall} ${toCall === 1 ? "person waits" : "people wait"} for a call.` : "Nobody waits for a call.",
    [n("fits") ? `${n("fits")} scheduled to book.` : "", n("interview") ? `${n("interview")} in interview.` : "", n("shortlisted") + n("offered") + n("decision") ? `${n("shortlisted") + n("offered") + n("decision")} shortlisted or offered.` : ""].filter(Boolean).join(" ") +
      ` ${v.filled === 0 ? "No one is hired yet" : v.filled + " hired"}, ${v.places} ${v.places === 1 ? "place" : "places"} to fill.`,
  ];
  const nextCall = v.applicants.find((a) => a.stage === "new" || a.stage === "call");
  const keyOf = (at: number) => new Date(at + COLOMBO_OFFSET_MS).toISOString().slice(0, 10);
  const interviewers = slotsThisWeek(view.slots, now);
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const local = new Date(now + COLOMBO_OFFSET_MS);
  const toMonday = local.getUTCDay() === 0 ? -6 : 1 - local.getUTCDay();
  const week = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + toMonday + i));
    return { name: names[d.getUTCDay()], num: d.getUTCDate(), key: d.toISOString().slice(0, 10) };
  });

  const rejected = rejectedByKind(v.applicants);
  const figures: [string, number, string, string][] = [
    ["Calling", toCall + n("fits"), toCall ? `${toCall} to call · oldest ${oldest}d` : "nobody waits", "text-warn"],
    ["Interviews", n("interview"), `${interviewers.length} this week`, "text-info"],
    ["Shortlisted & offered", n("shortlisted") + n("offered") + n("decision"), `${n("shortlisted") + n("decision")} shortlisted · ${n("offered")} offered`, "text-brand"],
    ["Hired", v.filled, `of ${v.places} places`, "text-brand"],
    ["Closed / out", n("non_responsive") + n("not_interested") + n("declined") + n("rejected"), `${n("non_responsive")} non-resp · ${n("not_interested")} not int · ${n("declined")} decl`, "text-ink"],
  ];

  const card = (a: Applicant) => {
    const act = STAGE_ACTION[a.stage];
    const caller = a.callerId ? memberName.get(a.callerId) ?? "Ops" : null;
    const salaryText = a.expectedSalary || a.packageSaid;
    return (
      <div key={a.id} className="flex flex-col gap-2.5 rounded-[18px] border border-rule bg-surface p-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar name={a.name} size="32" />
          <div className="min-w-0 flex-1">
            <p className="t-body-m">{a.name}</p>
            <p className="t-small text-ink-3">{a.source} · {STAGE_LABEL[a.stage] ?? a.stage}</p>
          </div>
          {can(me, "client.manage") && (
            <details className="relative shrink-0">
              <summary aria-label={"More for " + a.name} className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full text-ink-3 hover:bg-sunk [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="text-[18px] leading-none">&#8942;</span>
              </summary>
              <div className="absolute right-0 z-20 mt-1 flex w-44 flex-col rounded-[14px] border border-rule bg-surface p-1 shadow-float">
                <Link href={panelHref(path, sp, "details", a.id)} scroll={false} className="t-small rounded-[10px] px-3 py-2 hover:bg-sunk">
                  Details
                </Link>
                <Link href={panelHref(path, sp, "cv", a.id)} scroll={false} className="t-small rounded-[10px] px-3 py-2 hover:bg-sunk">
                  {a.cvFileId ? "Replace CV" : "Add CV"}
                </Link>
                <Link href={panelHref(path, sp, "reject", a.id)} scroll={false} className="t-small rounded-[10px] px-3 py-2 text-danger hover:bg-sunk">
                  Reject
                </Link>
              </div>
            </details>
          )}
        </div>
        <p className="t-small text-ink-3">{a.detail}</p>
        {(a.currentSalary || salaryText || a.availability) && (
          <p className="t-small text-ink-3">
            {[a.currentSalary ? `Curr: ${a.currentSalary}` : "", salaryText ? `Exp: ${salaryText}` : "", a.availability ? `Avail: ${a.availability}` : ""].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {sectionOfStage(a.stage) === "calling" && canCall && a.callerId !== me.id && (
            <form action={claimApplicant}>
              <input type="hidden" name="applicantId" value={a.id} />
              <input type="hidden" name="vacancyId" value={v.id} />
              <input type="hidden" name="back" value={mineOnly ? `${path}?mine=1` : path} />
              <button type="submit" className={pillSecondary + " !px-3 !py-[6px] !text-[12px]"}>
                {caller ? `Claim (${caller})` : "Claim"}
              </button>
            </form>
          )}
          {caller && a.callerId === me.id && <span className="t-small text-brand">Claimed by you</span>}
          {act && (
            <Link href={panelHref(path, sp, act.panel, a.id)} scroll={false} className="t-label inline-flex w-fit rounded-full bg-ink px-3 py-[7px] text-ink-inverse">
              {act.label}
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex items-center gap-4 p-1">
        <Link href="/hiring" aria-label="Back to Internal Hiring" className="flex size-10 items-center justify-center rounded-full border border-rule bg-surface hover:bg-sunk">
          <Icon name="chevron-left" size={18} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="t-display">{v.title}</h1>
            {srcLabel && <span className="t-label rounded-full bg-sunk px-2.5 py-1 text-ink-2">{srcLabel}</span>}
            <span className="t-label rounded-full bg-sunk px-2.5 py-1 text-ink-2">{v.status === "on_hold" ? "On hold" : "Career 141"}</span>
          </div>
          <p className="t-small text-ink-3">{vacancyLine(v)}</p>
        </div>
        {canCall && (
          <Link
            href={mineOnly ? path : `${path}?mine=1`}
            className={"t-label shrink-0 rounded-full px-3.5 py-2 " + (mineOnly ? "bg-brand text-ink-inverse" : "border border-rule bg-surface text-ink hover:bg-sunk")}
          >
            {mineOnly ? "Mine (showing claimed)" : "Mine"}
          </Link>
        )}
        {can(me, "client.manage") && (
          <Link href={panelHref(path, sp, "add-applicant")} scroll={false} className={pillSecondary + " shrink-0"}>
            <Icon name="plus" size={16} />
            Add applicant
          </Link>
        )}
      </div>

      <Card className="!flex-row items-center">
        {figures.map(([label, value, line, tone], i) => (
          <div key={label} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="t-micro text-ink-3">{label}</p>
              <p className={"t-num " + tone}>{value}</p>
              <p className="t-small text-ink-3">{line}</p>
            </div>
            {i < figures.length - 1 && <Icon name="chevron-right" size={14} />}
          </div>
        ))}
      </Card>

      <div className="flex flex-col items-start gap-[22px] pg-xl:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
          {v.applicants.length === 0 ? (
            <Card title="Pipeline" sub="Calling, Interview, Shortlisted, and Offered.">
              <EmptyState icon="user" title="No applicants here">
                {v.status === "on_hold" ? "This vacancy is on hold, so nothing moves." : "Nobody has applied yet."}
              </EmptyState>
            </Card>
          ) : (
            <Card title="Pipeline Kanban" sub="Calling, Interview, Shortlisted, and Offered — scroll sideways for all stages.">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[
                  { key: "calling", label: "Calling", items: mineOnly ? filterByCaller(v.applicants.filter((a) => sectionOfStage(a.stage) === "calling"), me.id) : v.applicants.filter((a) => sectionOfStage(a.stage) === "calling") },
                  { key: "interview", label: "Interview", items: v.applicants.filter((a) => sectionOfStage(a.stage) === "interviews") },
                  { key: "shortlisted", label: "Shortlisted", items: v.applicants.filter((a) => a.stage === "shortlisted") },
                  { key: "offered", label: "Offered", items: v.applicants.filter((a) => a.stage === "offered" || a.stage === "decision") },
                ].map((col) => (
                  <div key={col.key} className="flex w-[270px] shrink-0 flex-col gap-2.5 self-start rounded-[18px] bg-sunk p-2.5">
                    <div className="flex items-center gap-2 px-1.5 pt-1">
                      <span className="t-micro text-ink-3">{col.label.toUpperCase()}</span>
                      <span className="t-label text-ink-3">{col.items.length}</span>
                    </div>
                    {col.items.length === 0 ? (
                      <p className="t-small px-1.5 text-ink-3">Nobody here.</p>
                    ) : (
                      col.items.map(card)
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
          {v.applicants.some((a) => ["hired", "non_responsive", "not_interested", "declined", "rejected"].includes(a.stage)) && (
            <Card title="Outcomes" sub="Hired, non-responsive, not interested, declined, or rejected.">
              {(["hired", "non_responsive", "not_interested", "declined"] as const).map((st) => {
                const list = v.applicants.filter((a) => a.stage === st);
                if (list.length === 0) return null;
                return (
                  <div key={st} className="flex flex-col gap-2">
                    <p className="t-micro text-ink-3">
                      {(STAGE_LABEL[st] ?? st).toUpperCase()} · {list.length}
                    </p>
                    <ul className="flex flex-col divide-y divide-rule">
                      {list.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                          <span className="t-body-m">{a.name}</span>
                          <span className="t-small text-ink-3">{a.notInterestedReason || a.rejectReason || a.detail}</span>
                          {STAGE_ACTION[a.stage] && can(me, "client.manage") && (
                            <Link href={panelHref(path, sp, STAGE_ACTION[a.stage]!.panel, a.id)} scroll={false} aria-label={"Call " + a.name} className="t-label rounded-full bg-ink px-3 py-[7px] text-ink-inverse">
                              {STAGE_ACTION[a.stage]!.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {(["screening", "final"] as const).map((kind) =>
                rejected[kind].length === 0 ? null : (
                  <div key={kind} className="flex flex-col gap-2">
                    <p className="t-micro text-ink-3">
                      {REJECT_KIND_LABEL[kind].toUpperCase()} · {rejected[kind].length}
                    </p>
                    <ul className="flex flex-col divide-y divide-rule">
                      {rejected[kind].map((a) => (
                        <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                          <span className="t-body-m">{a.name}</span>
                          <span className="t-small text-ink-3">{a.rejectReason || a.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </Card>
          )}
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 pg-xl:w-[360px]">
          <section className="flex flex-col gap-3 rounded-[28px] bg-ink p-6">
            <p className="t-micro flex items-center gap-2 text-ink-3">
              <Icon name="sparkle" size={16} />
              Where it stands
            </p>
            <p className="text-[20px] font-medium leading-7 text-surface">{stand[0]}</p>
            <p className="t-small text-ink-3">{stand[1]}</p>
            {nextCall && (
              <div>
                <Link href={panelHref(path, sp, "call", nextCall.id)} scroll={false} className="t-label inline-flex rounded-full bg-surface px-3.5 py-2 text-ink">
                  Call {first(nextCall.name)}
                </Link>
              </div>
            )}
          </section>
          <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
            <p className="t-micro text-ink-3">This week · internal interviews</p>
            <div className="flex gap-1.5">
              {week.map((d) => {
                const has = interviewers.some((s) => keyOf(s.at) === d.key);
                return (
                  <div key={d.key} className={"flex w-[47px] flex-col items-center gap-0.5 rounded-[12px] py-2 " + (has ? "bg-brand-soft" : "border border-rule")}>
                    <span className="t-micro text-ink-3">{d.name}</span>
                    <span className={"t-body-m " + (has ? "text-brand" : "")}>{d.num}</span>
                    {has && <span className="size-[5px] rounded-[3px] bg-brand" />}
                  </div>
                );
              })}
            </div>
            {interviewers.length === 0 && <p className="t-small text-ink-3">No internal interviews this week.</p>}
            {interviewers.map((s) => (
              <div key={s.at + s.name} className="flex items-start gap-3 rounded-[12px] bg-info-soft px-3 py-2.5">
                <span className="w-[3px] self-stretch rounded-sm bg-info" />
                <span className="t-small w-[72px] shrink-0 text-info">
                  {dayWord(s.at).split(" ")[0]} {clockOf(s.at)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="t-body-m">{s.name}</span>
                  <span className="t-small text-ink-3">{s.line}</span>
                </span>
              </div>
            ))}
          </section>
        </aside>
      </div>

      {openName && on && (
        <HiringPanel
          kind={openName}
          v={v}
          a={on}
          now={now}
          closeHref={closeHref(path, sp)}
          cvHref={cvFile ? viewHref(cvFile) : null}
          vacancies={view.vacancies.map((x) => ({ id: x.id, title: x.title }))}
          interviewers={leadershipInterviewers}
          defaultInterviewAt={defaultInterviewAt}
        />
      )}
      {sp.panel === "add-applicant" && can(me, "client.manage") && (
        <Panel kicker="Internal Hiring" title="Add an applicant" sub={v.title} closeHref={closeHref(path, sp)}>
          <form action={addHiringApplicant} encType="multipart/form-data">
            <input type="hidden" name="vacancyId" value={v.id} />
            <input type="hidden" name="back" value={path} />
            <PanelSection title="Applicant details">
              <PanelField label="Full name">
                <input name="name" required placeholder="e.g. Nimali Perera" className={panelInput} />
              </PanelField>
              <PanelField label="Source">
                <input name="source" defaultValue="LinkedIn" required placeholder="LinkedIn, Referral, TopJobs" className={panelInput} />
              </PanelField>
              <PanelField label="CV (optional, PDF or Word)">
                <input name="cv" type="file" accept=".pdf,.doc,.docx" className={panelInput} />
              </PanelField>
              <PanelField label="Phone (optional)">
                <input name="phone" placeholder="077 123 4567" className={panelInput} />
              </PanelField>
              <PanelField label="Email (optional)">
                <input name="email" type="email" placeholder="name@example.com" className={panelInput} />
              </PanelField>
            </PanelSection>
            <PanelSection title="What happens next">
              <p className="t-body text-ink-2">They appear under &ldquo;To call&rdquo; on this vacancy board so the team can screen them.</p>
              <button type="submit" className={pillPrimary + " self-start"}>Add applicant</button>
            </PanelSection>
          </form>
        </Panel>
      )}
      {typeof sp.send === "string" && on && (
        <HiringSendModal send={sp.send} vacancy={v} applicant={on} me={me} closeHref={closeSendHref(path, sp)} />
      )}
    </div>
  );
}
