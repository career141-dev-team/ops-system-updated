import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { Card, EmptyState, PageTitle, pillSecondary } from "@/app/ui/figma";
import { desk } from "@/data/desk";
import { COLOMBO_OFFSET_MS } from "@/lib/calendar";
import { clockOf, dayWord } from "@/lib/calendarBoard";
import { HIRING_BACKEND_GAPS, countOf, hiringView, totals, vacancyLine, whereItStands, type Vacancy } from "@/lib/hiring";
import { hiringSample } from "@/lib/hiringSample";
import { currentMember } from "@/lib/session";

/** One number of the strip: small capital label, the figure, one line under it. */
function Figure({ label, value, line, tone = "text-ink" }: { label: string; value: number; line: string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="t-micro text-ink-3">{label}</p>
      <p className={"t-num " + tone}>{value}</p>
      <p className="t-small text-ink-3">{line}</p>
    </div>
  );
}

const Chev = () => (
  <span className="flex w-7 shrink-0 items-center justify-center text-ink-3" aria-hidden="true">
    <Icon name="chevron-right" size={14} />
  </span>
);

function VacancyCard({ v, first }: { v: Vacancy; first: boolean }) {
  const n = (s: Parameters<typeof countOf>[1]) => countOf(v, s);
  const toCall = n("call") + n("new");
  const counts: [string, number, string][] = [
    ["New CVs", n("new"), "text-ink"],
    ["To call", toCall, toCall ? "text-warn" : "text-ink"],
    ["Interview", n("interview"), "text-info"],
    ["Decision", n("decision"), n("decision") ? "text-warn" : "text-ink"],
  ];
  return (
    <Card className="gap-4 lg:!flex-row lg:items-center lg:gap-7">
      <div className="flex w-full flex-col gap-1.5 lg:w-[380px] lg:shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="t-h2">{v.title}</h2>
          {v.status === "on_hold" ? (
            <span className="t-label rounded-full bg-sunk px-2.5 py-1 text-ink-2">On hold</span>
          ) : toCall > 0 ? (
            <span className="t-label inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-1 text-warn">
              <span className="size-1.5 rounded-[3px] bg-warn" />
              {toCall} to call
            </span>
          ) : null}
        </div>
        <p className="t-small text-ink-3">{vacancyLine(v)}</p>
      </div>
      {v.status === "on_hold" ? (
        <p className="t-body min-w-0 flex-1 text-ink-3">Nothing moves until {v.hold?.who ?? "the owner"} restarts it.</p>
      ) : (
        <dl className="flex min-w-0 flex-1 gap-9">
          {counts.map(([label, count, tone]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dd className={"text-[20px] font-medium leading-7 " + tone}>{count}</dd>
              <dt className="t-micro text-ink-3">{label}</dt>
            </div>
          ))}
        </dl>
      )}
      <Link
        href={`/hiring/${v.id}`}
        className={"t-label shrink-0 rounded-full px-3 py-[7px] " + (first && v.status === "open" ? "bg-ink text-ink-inverse" : "border border-rule bg-surface text-ink hover:bg-sunk")}
      >
        Open
      </Link>
    </Card>
  );
}

/**
 * H1 · Internal hiring: Career141's own vacancies. There is no hiring backend yet, so this reads the
 * typed view in src/lib/hiring.ts (empty in production, invented data on a laptop) and every button
 * that would save is switched off with its reason.
 */
export default async function HiringPage() {
  if (!(await currentMember())) redirect("/sign-in");
  const db = await desk();
  const now = Date.now();
  const view = hiringView(db, process.env.OPS_DEV_SIGNIN === "on" ? hiringSample(now) : null);
  const t = totals(view, now);
  const stand = whereItStands(view, now);
  const openCount = view.vacancies.filter((v) => v.status === "open").length;
  const reason = `Not connected yet: ${HIRING_BACKEND_GAPS} are not stored.`;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const local = new Date(now + COLOMBO_OFFSET_MS);
  const toMonday = local.getUTCDay() === 0 ? -6 : 1 - local.getUTCDay();
  const week = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + toMonday + i));
    return { name: names[d.getUTCDay()], num: d.getUTCDate(), key: d.toISOString().slice(0, 10) };
  });
  const keyOf = (at: number) => new Date(at + COLOMBO_OFFSET_MS).toISOString().slice(0, 10);
  const todayKey = keyOf(now);

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Internal hiring"
        sub={`Career141's own vacancies · ${openCount} open`}
        right={
          <button type="button" disabled title={reason} className={pillSecondary + " disabled:cursor-not-allowed disabled:opacity-50"}>
            <Icon name="plus" size={16} />
            Add a vacancy
          </button>
        }
      />

      {view.vacancies.length === 0 ? (
        <Card>
          <EmptyState icon="briefcase" title="No vacancies here yet">
            Hiring for our own team is not connected yet: {HIRING_BACKEND_GAPS} are not stored, so nothing can be added or shown.
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card className="!flex-row items-center">
            <Figure label="New CVs" value={t.newCvs} line={`across ${t.newCvVacancies} ${t.newCvVacancies === 1 ? "vacancy" : "vacancies"}`} />
            <Chev />
            <Figure label="To call" value={t.toCall} tone="text-warn" line={t.toCall ? `oldest waits ${t.oldestDays} ${t.oldestDays === 1 ? "day" : "days"}` : "nobody waits"} />
            <Chev />
            <Figure label="Interview" value={t.interview} tone="text-info" line={`${view.slots.length} this week`} />
            <Chev />
            <Figure label="Decision" value={t.decision} tone={t.decision ? "text-warn" : "text-ink"} line="waiting for you" />
            <Chev />
            <Figure label="Hired this month" value={t.hiredThisMonth} tone="text-brand" line={t.lastHire ? `${t.lastHire.title} · ${dayWord(t.lastHire.at).slice(4)}` : "nobody yet"} />
          </Card>

          <div className="flex flex-col items-start gap-[22px] xl:flex-row">
            <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
              {view.vacancies.map((v, i) => (
                <VacancyCard key={v.id} v={v} first={i === 0} />
              ))}
            </div>
            <aside className="flex w-full shrink-0 flex-col gap-5 xl:w-[360px]">
              <section className="flex flex-col gap-3 rounded-[28px] bg-ink p-6">
                <p className="t-micro flex items-center gap-2 text-ink-3">
                  <Icon name="sparkle" size={16} />
                  Where it stands
                </p>
                <p className="text-[20px] font-medium leading-7 text-surface">{stand.headline}</p>
                <p className="t-small text-ink-3">{stand.body}</p>
                {stand.open && (
                  <div>
                    <Link href={`/hiring/${stand.open.id}`} className="t-label inline-flex rounded-full bg-surface px-3.5 py-2 text-ink">
                      Open {stand.open.title}
                    </Link>
                  </div>
                )}
              </section>
              <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
                <p className="t-micro text-ink-3">This week · internal interviews</p>
                <div className="flex gap-1.5">
                  {week.map((d) => {
                    const has = view.slots.some((s) => keyOf(s.at) === d.key);
                    return (
                      <div key={d.key} className={"flex w-[47px] flex-col items-center gap-0.5 rounded-[12px] py-2 " + (has ? "bg-brand-soft" : "border border-rule")}>
                        <span className="t-micro text-ink-3">{d.name}</span>
                        <span className={"t-body-m " + (has ? "text-brand" : "")}>{d.num}</span>
                        {has && <span className="size-[5px] rounded-[3px] bg-brand" />}
                        {d.key === todayKey && !has && <span className="size-[5px] rounded-[3px] bg-ink-3" />}
                      </div>
                    );
                  })}
                </div>
                {view.slots.length === 0 && <p className="t-small text-ink-3">No internal interviews this week.</p>}
                {view.slots.map((s) => (
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
        </>
      )}
    </div>
  );
}
