import Link from "next/link";
import { redirect } from "next/navigation";

import { addScoop, createVacancy } from "@/app/actions";
import Icon from "@/app/Icon";
import { Avatar, Card, DataTable, EmptyState, PageTitle, PanelField, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import CvDropZone from "./CvDropZone";
import { desk, scoopBatches } from "@/data/desk";
import { COLOMBO_OFFSET_MS } from "@/lib/calendar";
import { clockOf, dayWord } from "@/lib/calendarBoard";
import { countOf, hiringView, totals, vacancyLine, whereItStands, type Vacancy } from "@/lib/hiring";
import { hiringSample } from "@/lib/hiringSample";
import { FUNNEL, STAGE_LABEL, applicantRows, boardColumns, filterApplicants, pageOf, type ApplicantRow } from "@/lib/hiringTable";
import { closeHref, panelHref } from "@/lib/panel";
import { summaryOf, type ScoopBatch } from "@/lib/scoop";
import { can } from "@/lib/roles";
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
    <Card className="gap-4 pg-lg:!flex-row pg-lg:items-center pg-lg:gap-7">
      <div className="flex w-full flex-col gap-1.5 pg-lg:w-[380px] pg-lg:shrink-0">
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
export default async function HiringPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const sp = await searchParams;
  const db = await desk();
  const now = Date.now();
  const view = hiringView(db, process.env.OPS_DEV_SIGNIN === "on" ? hiringSample(now) : null);
  const t = totals(view, now);
  const stand = whereItStands(view, now);
  const openCount = view.vacancies.filter((v) => v.status === "open").length;
  const mayManage = can(me, "client.manage");
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const local = new Date(now + COLOMBO_OFFSET_MS);
  const toMonday = local.getUTCDay() === 0 ? -6 : 1 - local.getUTCDay();
  const week = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + toMonday + i));
    return { name: names[d.getUTCDay()], num: d.getUTCDate(), key: d.toISOString().slice(0, 10) };
  });
  const keyOf = (at: number) => new Date(at + COLOMBO_OFFSET_MS).toISOString().slice(0, 10);
  const todayKey = keyOf(now);
  // Vacancies (the cards), Board (everyone in the funnel) or Table (everyone, filtered and paged), 23 Nov.
  const mode = sp.view === "board" || sp.view === "table" || sp.view === "scoops" ? sp.view : "vacancies";
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Internal hiring"
        sub={`Career141's own vacancies · ${openCount} open`}
        right={
          mayManage ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <Link href={panelHref("/hiring", sp, "add-scoop")} scroll={false} className={pillSecondary}>
                <Icon name="plus" size={16} />
                Add a Scoop
              </Link>
              <Link href={panelHref("/hiring", sp, "add-vacancy")} scroll={false} className={pillSecondary}>
                <Icon name="plus" size={16} />
                Add a vacancy
              </Link>
            </div>
          ) : null
        }
      />
      {view.vacancies.length > 0 && (
        <nav className="flex items-center gap-2" aria-label="Layout">
          {[{ k: "vacancies", label: "Vacancies" }, { k: "board", label: "Board" }, { k: "table", label: "Table" }, { k: "scoops", label: "Scoops" }].map((x) => (
            <Link key={x.k} href={x.k === "vacancies" ? "/hiring" : "/hiring?view=" + x.k} aria-current={x.k === mode ? "page" : undefined} className={"t-label rounded-full px-3.5 py-[7px] " + (x.k === mode ? "bg-ink text-ink-inverse" : "bg-sunk text-ink-2 hover:bg-shell")}>
              {x.label}
            </Link>
          ))}
        </nav>
      )}

      {view.vacancies.length === 0 ? (
        <Card>
          <EmptyState icon="briefcase" title="No vacancies here yet">
            Click &ldquo;Add a vacancy&rdquo; above to open a Career141 internal vacancy and start tracking applicants.
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card className="!flex-row items-center">
            <Figure label="New CVs" value={t.newCvs} line={`across ${t.newCvVacancies} ${t.newCvVacancies === 1 ? "vacancy" : "vacancies"}`} />
            <Chev />
            <Figure
              label="To call"
              value={t.toCall}
              tone="text-warn"
              line={t.toCall ? `${t.newCvs > 0 ? `includes ${t.newCvs} new ${t.newCvs === 1 ? "CV" : "CVs"} · ` : ""}oldest waits ${t.oldestDays} ${t.oldestDays === 1 ? "day" : "days"}` : "nobody waits"}
            />
            <Chev />
            <Figure label="Interview" value={t.interview} tone="text-info" line={`${view.slots.length} this week`} />
            <Chev />
            <Figure label="Decision" value={t.decision} tone={t.decision ? "text-warn" : "text-ink"} line="waiting for you" />
            <Chev />
            <Figure label="Hired this month" value={t.hiredThisMonth} tone="text-brand" line={t.lastHire ? `${t.lastHire.title} · ${dayWord(t.lastHire.at).slice(4)}` : "nobody yet"} />
          </Card>

          {mode === "scoops" && <ScoopsList batches={scoopBatches(db)} people={db.applicants.map((a) => ({ id: a.id, name: a.name, stage: a.stage, tries: a.tries, interviewAt: a.interviewAt, rejectReason: a.rejectReason, rejectedAtStage: a.rejectedAtStage ?? null, repliedAt: a.repliedAt ?? null }))} />}
          {mode === "board" && <HiringBoard rows={applicantRows(view)} />}
          {mode === "table" && <HiringTable rows={applicantRows(view)} vacancies={view.vacancies.map((v) => ({ id: v.id, title: v.title }))} filters={{ vacancyId: one("vacancy"), stage: one("stage"), q: one("q") }} page={Number(one("page")) || 1} />}
          {mode === "vacancies" && (
          <div className="flex flex-col items-start gap-[22px] pg-xl:flex-row">
            <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
              {view.vacancies.map((v, i) => (
                <VacancyCard key={v.id} v={v} first={i === 0} />
              ))}
            </div>
            <aside className="flex w-full shrink-0 flex-col gap-5 pg-xl:w-[360px]">
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
          )}
        </>
      )}

      {sp.panel === "add-scoop" && mayManage && (
        <Panel kicker="Internal hiring" title="Add a Scoop" sub="Many CVs at once: the name, email, number, NIC and position are read from each" closeHref={closeHref("/hiring", sp)} boxed>
          <form action={addScoop} encType="multipart/form-data">
            <input type="hidden" name="back" value="/hiring?view=scoops" />
            <PanelSection title="The CVs">
              <PanelField label="Files (PDF or Word, up to 25 MB in all)">
                <CvDropZone />
              </PanelField>
              <PanelField label="Which vacancy">
                <select name="vacancyId" defaultValue="" className={panelInput}>
                  <option value="">Match each CV by the position it applies for</option>
                  {view.vacancies.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </PanelField>
            </PanelSection>
            <PanelSection title="What happens next">
              <p className="t-body text-ink-2">Each CV is kept, read, and made an applicant to call, with the package and laptop left for you to fill in after the call. Somebody already on file is not added twice. A CV that is a scan is added with no details, and says so. Nothing is sent to anybody.</p>
              <button type="submit" className={pillPrimary + " self-start"}>Read the CVs</button>
            </PanelSection>
          </form>
        </Panel>
      )}

      {sp.panel === "add-vacancy" && mayManage && (
        <Panel kicker="Internal hiring" title="Add a vacancy" sub="Open a new Career141 internal vacancy" closeHref={closeHref("/hiring", sp)} boxed>
          <form action={createVacancy}>
            <input type="hidden" name="back" value="/hiring" />
            <PanelSection title="Vacancy details">
              <PanelField label="Role title">
                <input name="title" required placeholder="e.g. Talent Acquisition Executive" className={panelInput} />
              </PanelField>
              <PanelField label="Places to fill">
                <input name="places" type="number" min="1" max="20" defaultValue="1" required className={panelInput} />
              </PanelField>
              <PanelField label="Screening checks (one per line, optional)">
                <textarea name="checks" rows={3} placeholder={"English fluency\nColombo office commute\nNotice period"} className={panelInput} />
              </PanelField>
            </PanelSection>
            <PanelSection title="What happens next">
              <p className="t-body text-ink-2">The vacancy opens immediately and you can start adding applicants and booking internal interviews.</p>
              <button type="submit" className={pillPrimary + " self-start"}>Open vacancy</button>
            </PanelSection>
          </form>
        </Panel>
      )}
    </div>
  );
}

/** Everyone in the funnel, a column a stage. Each column shows its first few and says how many more there are. */
function HiringBoard({ rows }: { rows: ApplicantRow[] }) {
  const cols = boardColumns(rows);
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 pg-2xl:grid-cols-6">
      {cols.map((col) => (
        <div key={col.stage} className="flex flex-col gap-2.5 rounded-[18px] bg-sunk p-2.5">
          <div className="flex items-center gap-2 px-1.5 pt-1">
            <span className="t-micro text-ink-3">{col.label.toUpperCase()}</span>
            <span className="t-label text-ink-3">{col.total}</span>
          </div>
          {col.shown.map((a) => (
            <Link key={a.id} href={"/hiring/" + a.vacancyId} className="flex flex-col gap-1.5 rounded-[14px] border border-rule bg-surface p-3 hover:shadow-card">
              <span className="flex items-center gap-2">
                <Avatar name={a.name} size="32" />
                <span className="t-body-m min-w-0 flex-1 truncate">{a.name}</span>
              </span>
              <span className="t-small truncate text-ink-3">{a.vacancy}</span>
              {a.detail && <span className="t-small text-ink-3">{a.detail}</span>}
            </Link>
          ))}
          {col.total > col.shown.length && (
            <Link href={"/hiring?view=table&stage=" + col.stage} className="t-label px-1.5 text-brand hover:underline">
              See all {col.total}
            </Link>
          )}
          {col.total === 0 && <p className="t-small px-1.5 text-ink-3">Nobody here.</p>}
        </div>
      ))}
    </div>
  );
}

/** The same people as a table: filtered by vacancy, stage and a search, fifty to a page. */
function HiringTable({ rows, vacancies, filters, page }: { rows: ApplicantRow[]; vacancies: { id: string; title: string }[]; filters: { vacancyId: string; stage: string; q: string }; page: number }) {
  const matched = filterApplicants(rows, filters);
  const shown = pageOf(matched, page);
  const field = "rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none";
  const link = (n: number) => {
    const q = new URLSearchParams({ view: "table" });
    if (filters.vacancyId) q.set("vacancy", filters.vacancyId);
    if (filters.stage) q.set("stage", filters.stage);
    if (filters.q) q.set("q", filters.q);
    if (n > 1) q.set("page", String(n));
    return "/hiring?" + q.toString();
  };
  return (
    <Card className="gap-4 !p-6">
      <form method="get" action="/hiring" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="view" value="table" />
        <label className="flex flex-col gap-1">
          <span className="t-small text-ink-3">Search</span>
          <input name="q" defaultValue={filters.q} placeholder="Name, number, source" className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-small text-ink-3">Vacancy</span>
          <select name="vacancy" defaultValue={filters.vacancyId} className={field}>
            <option value="">All</option>
            {vacancies.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-small text-ink-3">Stage</span>
          <select name="stage" defaultValue={filters.stage} className={field}>
            <option value="">All</option>
            {FUNNEL.filter((f) => f.stage !== "new").map((f) => (
              <option key={f.stage} value={f.stage}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={pillSecondary}>
          Filter
        </button>
        {(filters.q || filters.vacancyId || filters.stage) && (
          <Link href="/hiring?view=table" className="t-small pb-2 text-ink-3 hover:underline">
            Clear
          </Link>
        )}
      </form>
      <p className="t-small text-ink-3">
        {matched.length} of {rows.length} {rows.length === 1 ? "person" : "people"}
        {shown.pages > 1 ? " · page " + shown.page + " of " + shown.pages : ""}
      </p>
      <DataTable
        columns={[{ label: "NAME" }, { label: "VACANCY" }, { label: "STAGE" }, { label: "PHONE" }, { label: "NIC" }, { label: "APPLIED FOR" }, { label: "PACKAGE" }, { label: "LAPTOP" }, { label: "CV" }, { label: "SOURCE" }]}
        rows={shown.items.map((r) => ({
          key: r.id,
          href: "/hiring/" + r.vacancyId,
          cells: [r.name, r.vacancy, STAGE_LABEL[r.stage] ?? r.stage, r.phone ?? "No number", r.nic || "—", r.targetPosition || "—", r.packageSaid || "—", r.laptop || "—", r.hasCv ? "Yes" : "No", r.source],
        }))}
        empty={<p className="t-body text-ink-3">Nobody matches. Clear the filters, or change the search.</p>}
      />
      {shown.pages > 1 && (
        <div className="flex items-center gap-3">
          {shown.page > 1 && (
            <Link href={link(shown.page - 1)} className={pillSecondary}>
              Earlier
            </Link>
          )}
          {shown.page < shown.pages && (
            <Link href={link(shown.page + 1)} className={pillSecondary}>
              Next
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}

/** The Scoops that came in, newest first, each with how it went and what became of the people it added. */
function ScoopsList({ batches, people }: { batches: ScoopBatch[]; people: Parameters<typeof summaryOf>[1] }) {
  if (batches.length === 0) {
    return (
      <Card>
        <EmptyState icon="inbox" title="No Scoop yet">
          &ldquo;Add a Scoop&rdquo; reads many CVs at once. A Scoop sent to the Scoop mailbox comes in by itself once mail reading is switched on.
        </EmptyState>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {batches.map((b) => {
        const s = summaryOf(b, people);
        return (
          <Card key={b.id} className="gap-3 !p-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="t-h2">{b.source === "mail" ? b.subject || "A Scoop by email" : "CVs added by hand"}</h2>
              <span className="t-small text-ink-3">
                {dayWord(b.at)} · {b.source === "mail" ? "from " + (b.from || "email") : "uploaded"}
                {b.complete ? "" : " · still being read"}
              </span>
            </div>
            <ul className="flex flex-col gap-1">
              {s.lines.map((l) => (
                <li key={l} className="t-body text-ink-2">
                  {l}
                </li>
              ))}
            </ul>
            {(b.duplicates.length > 0 || b.unreadable.length > 0) && (
              <details>
                <summary className="t-label cursor-pointer text-brand hover:underline">Files to look at ({b.duplicates.length + b.unreadable.length})</summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {b.duplicates.map((d) => (
                    <li key={"d" + d.name} className="t-small text-ink-3">
                      {d.name}: {d.of}
                    </li>
                  ))}
                  {b.unreadable.map((u) => (
                    <li key={"u" + u.name} className="t-small text-warn">
                      {u.name}: {u.why}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <Link href={"/hiring?view=table"} className="t-label w-fit text-brand hover:underline">
              See the people in the table
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
