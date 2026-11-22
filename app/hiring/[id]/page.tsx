import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { addHiringApplicant } from "@/app/actions";
import Icon from "@/app/Icon";
import { Avatar, Card, EmptyState, PanelField, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { desk, fileIn } from "@/data/desk";
import { COLOMBO_OFFSET_MS } from "@/lib/calendar";
import { clockOf, dayWord } from "@/lib/calendarBoard";
import { BOARD_COLUMNS, STAGE_ACTION, countOf, daysSince, first, hiringView, vacancyById, vacancyLine, type Applicant } from "@/lib/hiring";
import { viewHref } from "@/lib/files";
import { hiringSample } from "@/lib/hiringSample";
import { closeHref, panelHref } from "@/lib/panel";
import { can } from "@/lib/roles";
import { closeSendHref } from "@/lib/sendModal";
import { currentMember } from "@/lib/session";
import HiringPanel, { type HiringPanelKind } from "./HiringPanel";
import { HiringSendModal } from "./HiringSendModals";

const PANELS: HiringPanelKind[] = ["call", "book-interview", "add-result", "decide", "reject"];

/** H2 · Vacancy detail: the numbers, the board of applicants, and the four panels. Nothing here saves (no backend). */
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
            <Icon name="chevron-left" size={18} /> Internal hiring
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
  const stand = [
    toCall > 0 ? `${toCall} ${toCall === 1 ? "person waits" : "people wait"} for a call.` : "Nobody waits for a call.",
    [n("fits") ? `${n("fits")} fit and need an interview booked.` : "", n("interview") ? `${n("interview")} in interview.` : "", n("decision") ? `${n("decision")} waiting for a decision.` : ""].filter(Boolean).join(" ") +
      ` ${v.filled === 0 ? "No one is hired yet" : v.filled + " hired"}, ${v.places} ${v.places === 1 ? "place" : "places"} to fill.`,
  ];
  const nextCall = v.applicants.find((a) => a.stage === "new" || a.stage === "call");
  const keyOf = (at: number) => new Date(at + COLOMBO_OFFSET_MS).toISOString().slice(0, 10);
  const interviewers = view.slots;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const local = new Date(now + COLOMBO_OFFSET_MS);
  const toMonday = local.getUTCDay() === 0 ? -6 : 1 - local.getUTCDay();
  const week = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + toMonday + i));
    return { name: names[d.getUTCDay()], num: d.getUTCDate(), key: d.toISOString().slice(0, 10) };
  });

  const figures: [string, number, string, string][] = [
    ["New CVs", n("new"), "to look at", "text-ink"],
    ["To call", toCall, toCall ? `oldest waits ${oldest} ${oldest === 1 ? "day" : "days"}` : "nobody waits", "text-warn"],
    ["Called · fits", n("fits"), "to book", "text-ink"],
    ["Interview", n("interview"), `${interviewers.length} this week`, "text-info"],
    ["Decision", n("decision"), "waiting for you", n("decision") ? "text-warn" : "text-ink"],
    ["Hired", v.filled, `of ${v.places} places`, "text-brand"],
    ["Rejected", n("rejected"), "with a reason", "text-ink"],
  ];

  const card = (a: Applicant) => {
    const act = STAGE_ACTION[a.stage];
    return (
      <div key={a.id} className="flex flex-col gap-2.5 rounded-[18px] border border-rule bg-surface p-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar name={a.name} size="32" />
          <div className="min-w-0 flex-1">
            <p className="t-body-m truncate">{a.name}</p>
            <p className="t-small text-ink-3">{a.source}</p>
          </div>
        </div>
        <p className="t-small text-ink-3">{a.detail}</p>
        {act && (
          <Link href={panelHref(path, sp, act.panel, a.id)} scroll={false} className="t-label inline-flex w-fit rounded-full bg-ink px-3 py-[7px] text-ink-inverse">
            {act.label}
          </Link>
        )}
        {a.stage === "fits" && can(me, "client.manage") && (
          <Link href={panelHref(path, sp, "reject", a.id)} scroll={false} className="t-label inline-flex w-fit rounded-full border border-rule bg-surface px-3 py-[7px] text-ink hover:bg-sunk">
            Not a fit
          </Link>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex items-center gap-4 p-1">
        <Link href="/hiring" aria-label="Back to Internal hiring" className="flex size-10 items-center justify-center rounded-full border border-rule bg-surface hover:bg-sunk">
          <Icon name="chevron-left" size={18} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="t-display">{v.title}</h1>
            <span className="t-label rounded-full bg-sunk px-2.5 py-1 text-ink-2">{v.status === "on_hold" ? "On hold" : "Career141 vacancy"}</span>
          </div>
          <p className="t-small text-ink-3">{vacancyLine(v)}</p>
        </div>
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

      <div className="flex flex-col items-start gap-[22px] xl:flex-row">
        <div className="w-full min-w-0 flex-1">
          <Card title="Applicants" sub="Each person moves right as the team calls, books and decides.">
            {v.applicants.length === 0 ? (
              <EmptyState icon="user" title="No applicants here">
                {v.status === "on_hold" ? "This vacancy is on hold, so nothing moves." : "Nobody has applied yet."}
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {BOARD_COLUMNS.map((col) => {
                  const here = v.applicants.filter((a) => (col.stage === "call" ? a.stage === "call" || a.stage === "new" : a.stage === col.stage));
                  return (
                    <div key={col.stage} className="flex flex-col gap-2.5 rounded-[18px] bg-sunk p-2.5">
                      <div className="flex items-center gap-2 px-1.5 pt-1">
                        <span className="t-micro text-ink-3">{col.label}</span>
                        <span className="t-label text-ink-3">{here.length}</span>
                      </div>
                      {here.slice(0, 4).map(card)}
                      {here.length > 4 && <p className="t-small px-1.5 text-ink-3">{here.length - 4} more</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 xl:w-[360px]">
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

      {openName && on && <HiringPanel kind={openName} v={v} a={on} now={now} closeHref={closeHref(path, sp)} cvHref={cvFile ? viewHref(cvFile) : null} />}
      {sp.panel === "add-applicant" && can(me, "client.manage") && (
        <Panel kicker="Internal hiring" title="Add an applicant" sub={v.title} closeHref={closeHref(path, sp)}>
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
