import Link from "next/link";

import { addManualCandidate, removeManualCandidate } from "@/app/actions";
import Icon from "@/app/Icon";
import { Avatar, Card, EmptyState, PillTabs, panelInput, pillSecondary } from "@/app/ui/figma";
import { numberOf } from "@/data/desk";
import { OWNERSHIP_WORKING_DAYS } from "@/lib/clientFeedback";
import { CANDIDATE_LEVELS, LEVEL_LABELS, type CandidateLevel } from "@/lib/positionCandidates";
import { panelHref } from "@/lib/panel";
import { sendHref } from "@/lib/sendModal";
import { answerLine, awaiting, columnOf, dayOfWindow, sentLine, shortDay } from "@/lib/setsBoard";

import type { TabProps } from "./ctx";
import BuildSet from "./sets/BuildSet";
import ChaseClient from "./sets/ChaseClient";
import ClientHadCv from "./sets/ClientHadCv";
import RecordAnswer from "./sets/RecordAnswer";
import UnreportedHire from "./sets/UnreportedHire";
import { chipBtn, chipInk } from "./sets/shared";

const dot = { warn: "bg-warning", info: "bg-info", brand: "bg-brand" } as const;

/** R2 Role Sets (123:361): the board of sets, the rail beside it, and the old Candidates tab folded in underneath. */
export default function Sets({ c, sp }: TabProps) {
  const { db, position, mayManage, itsSets, allCandidates, stage, now } = c;
  const path = `/positions/${position.id}`;
  const open = (panel: string, on?: string) => panelHref(path, sp, panel, on);
  const windowDays = numberOf(db, "set.ownershipWorkingDays", OWNERSHIP_WORKING_DAYS);
  const holidays = db.holidays.map((h) => h.date);

  const ready = itsSets.filter((s) => columnOf(s) === "ready");
  const withClient = itsSets.filter((s) => columnOf(s) === "client");
  const answered = itsSets.filter((s) => columnOf(s) === "answered");
  const waiting = withClient[0] ?? null;
  const lastSent = c.sentSets[c.sentSets.length - 1] ?? null;

  const chases = waiting ? db.messages.filter((m) => m.subjectId === waiting.id && m.templateKey === "feedback.chase") : [];
  const calls = waiting ? db.timers.filter((t) => t.subjectId === waiting.id && t.kind === "feedback.call" && (t.state === "running" || t.state === "warned")) : [];

  const standing = waiting
    ? {
        title: `SET ${waiting.setNumber} needs an answer.`,
        body: `It is on day ${dayOfWindow(waiting, now, holidays, windowDays)} of ${windowDays} with ${awaiting(waiting)} ${awaiting(waiting) === 1 ? "person" : "people"} not answered.`,
        label: "Record the answer",
        href: open("record-answer", waiting.id),
      }
    : ready[0]
      ? { title: `SET ${ready[0].setNumber} is ready to build.`, body: `${ready[0].candidates.length} CVs are ready from the TA. Nothing reaches the client until a person has read it.`, label: `Build SET ${ready[0].setNumber}`, href: open("build-set", ready[0].id) }
      : { title: "No set is waiting on anyone.", body: itsSets.length ? "Every set sent has an answer." : "A set appears when the TA System says its CVs are ready.", label: "", href: "" };

  const levelCount = (level: CandidateLevel) => allCandidates.filter((x) => x.level === level).length;
  const shown = allCandidates.filter((x) => stage === "all" || x.level === stage);
  const levelHref = (key: string) => `${path}?view=sets&stage=${key}`;

  return (
    <>
      <div className="flex flex-col gap-[22px] lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[22px]">
          <Card
            title="Sets"
            sub={`Each set goes to the client, who has ${windowDays} days to answer.`}
          >
            {itsSets.length === 0 ? (
              <EmptyState title="No CV set has gone yet" icon="file">
                One appears here the moment the TA System says five CVs are ready, with its due date counted from the day the agreement was signed.
              </EmptyState>
            ) : (
              <div className="grid gap-3.5 md:grid-cols-3">
                <Column title="Ready to send" tone="warn" count={ready.length}>
                  {ready.map((s) => (
                    <div key={s.id} className="flex flex-col gap-2.5">
                      {s.candidates.map((x) => (
                        <div key={x.applicationTaId} className="flex items-center gap-2.5 rounded-[16px] bg-surface p-3.5">
                          <Avatar name={x.name} size="32" tone="neutral" />
                          <div className="flex min-w-0 flex-col">
                            <span className="t-body-m truncate">{x.name}</span>
                            <span className="t-small truncate text-ink-3">
                              {x.fileId ? "CV kept" : "From TA"}
                              {x.internalInterview?.outcome === "pass" ? " · passed our interview" : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        <Link href={open("build-set", s.id)} scroll={false} className={chipInk}>
                          Build SET {s.setNumber}
                        </Link>
                        <Link href={sendHref(path, sp, "send-set", s.id)} scroll={false} className={chipBtn}>
                          Preview and send
                        </Link>
                      </div>
                    </div>
                  ))}
                </Column>
                <Column title="With the client" tone="info" count={withClient.length}>
                  {withClient.map((s) => (
                    <SetCard key={s.id} set={s} tone="warn" line={sentLine(s, now, holidays, windowDays)} note={`${awaiting(s)} without an answer`} noteTone="warn">
                      <Link href={open("record-answer", s.id)} scroll={false} className={chipBtn}>
                        Record the answer
                      </Link>
                      <Link href={open("chase-client", s.id)} scroll={false} className={chipBtn}>
                        Chase the client
                      </Link>
                      <Link href={sendHref(path, sp, "chase-set", s.id)} scroll={false} className={chipBtn}>
                        Preview chase
                      </Link>
                      {s.candidates.some((x) => x.fileId) && (
                        <a href={`/api/sets/${s.id}/zip`} className={chipBtn}>
                          Download CVs
                        </a>
                      )}
                    </SetCard>
                  ))}
                </Column>
                <Column title="Answered" tone="brand" count={answered.length}>
                  {answered.map((s) => (
                    <SetCard key={s.id} set={s} tone="brand" line={`${s.sentAt ? "Sent " + shortDay(s.sentAt) : "Not sent"} · ${s.candidates.length} CVs`} note={answerLine(s)} noteTone="brand">
                      <Link href={open("record-answer", s.id)} scroll={false} className={chipBtn}>
                        See the answers
                      </Link>
                    </SetCard>
                  ))}
                </Column>
              </div>
            )}
            <p className="t-small text-ink-3">The {windowDays}-day clock starts when the client gets a set.</p>
          </Card>

          <Card title="Candidates" sub="The TA works this list in the TA System. People added here by hand stay in Ops.">
            <PillTabs
              active={stage}
              items={[
                { key: "all", label: "All", count: allCandidates.length, href: levelHref("all") },
                ...CANDIDATE_LEVELS.map((level) => ({ key: level, label: LEVEL_LABELS[level], count: levelCount(level), href: levelHref(level) })),
              ]}
            />
            {shown.length === 0 ? (
              <EmptyState title="No candidates here yet" icon="user">
                People appear as the TA moves them through this opening, or add one by hand below.
              </EmptyState>
            ) : (
              <div className="flex flex-col divide-y divide-rule">
                {shown.map((cand) => (
                  <Link key={cand.id} href={`${path}/candidates/${encodeURIComponent(cand.id)}`} className="flex items-center gap-3.5 px-1 py-3 transition-colors hover:bg-sunk/50">
                    <Avatar name={cand.name} size="40" tone={cand.statusTone === "ok" ? "ok" : cand.statusTone === "warn" ? "warn" : "neutral"} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="t-body-m truncate">{cand.name}</span>
                      <span className="t-small truncate text-ink-3">
                        {cand.roleSummary}
                        {cand.source ? " · " + cand.source : ""}
                      </span>
                    </div>
                    <span className="t-label shrink-0 rounded-full bg-sunk px-2.5 py-1">
                      {LEVEL_LABELS[cand.level]}
                      {cand.manual ? " · by hand" : ""}
                    </span>
                    <span className={"t-small hidden w-[160px] shrink-0 text-right sm:block " + (cand.statusTone === "ok" ? "text-success" : cand.statusTone === "warn" ? "text-warning" : "text-ink-3")}>
                      {cand.statusLabel}
                    </span>
                    <Icon name="chevron-right" size={18} className="shrink-0 text-ink-faint" />
                  </Link>
                ))}
              </div>
            )}
            {mayManage && (
              <details className="rounded-[18px] bg-sunk px-5 py-3.5">
                <summary className="t-body-m cursor-pointer">Add a candidate by hand (for when the TA link is down)</summary>
                {(position.manualCandidates ?? []).length > 0 && (
                  <ul className="mt-3 flex flex-col divide-y divide-rule">
                    {(position.manualCandidates ?? []).map((m) => (
                      <li key={m.id} className="t-body flex items-center justify-between gap-2 py-2">
                        <span>
                          {m.name} <span className="text-ink-3">· added by hand, not in TA</span>
                        </span>
                        <form action={removeManualCandidate}>
                          <input type="hidden" name="positionId" value={position.id} />
                          <input type="hidden" name="candidateId" value={m.id} />
                          <button type="submit" className="t-small text-ink-3 hover:text-danger">
                            Remove
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={addManualCandidate} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input type="hidden" name="positionId" value={position.id} />
                  <input name="name" required placeholder="Full name" className={panelInput} />
                  <input name="email" type="email" placeholder="Email" className={panelInput} />
                  <input name="phone" placeholder="Phone" className={panelInput} />
                  <select name="cvFileId" className={panelInput} defaultValue="">
                    <option value="">No CV yet</option>
                    {db.files.filter((f) => f.kind === "cv").map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <input name="note" placeholder="A line about them: current role, years" className={panelInput + " sm:col-span-2"} />
                  <button type="submit" className={pillSecondary + " self-start"}>
                    Add them
                  </button>
                </form>
              </details>
            )}
          </Card>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[360px]">
          <section className="flex flex-col gap-3 rounded-[28px] bg-ink p-6">
            <div className="flex items-center gap-2 text-ink-3">
              <Icon name="sparkle" size={16} />
              <span className="t-micro">WHERE IT STANDS</span>
            </div>
            <p className="t-h2 text-ink-inverse">{standing.title}</p>
            <p className="t-small text-ink-3">{standing.body}</p>
            {standing.label && (
              <div>
                <Link href={standing.href} scroll={false} className="t-label inline-flex rounded-full bg-surface px-3.5 py-2 text-ink">
                  {standing.label}
                </Link>
              </div>
            )}
          </section>
          <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
            <span className="t-micro text-ink-3">{waiting ? `CHASE · SET ${waiting.setNumber}` : "CHASE"}</span>
            {!waiting ? (
              <p className="t-small text-ink-3">Nothing to chase: no set is waiting for an answer, and a client who has answered is not chased.</p>
            ) : (
              <>
                {chases.length === 0 && calls.length === 0 && <p className="t-small text-ink-3">No chase has gone yet. One is drafted a day after the set goes, and a person approves it.</p>}
                {chases.map((m, i) => (
                  <div key={m.id} className="flex items-start gap-3">
                    <span className={"mt-1.5 size-1.5 shrink-0 rounded-[3px] " + (m.sentAt ? dot.info : dot.warn)} />
                    <span className="t-small w-[70px] shrink-0 text-ink-3">{m.sentAt ? shortDay(m.sentAt) : "drafted"}</span>
                    <Link href={`/messages/${m.id}`} className="t-small min-w-0 flex-1 hover:underline">
                      Chase {i + 1} {m.sentAt ? "sent" : "waits for approval"}
                    </Link>
                  </div>
                ))}
                {calls.map((t) => (
                  <div key={t.id} className="flex items-start gap-3">
                    <span className={"mt-1.5 size-1.5 shrink-0 rounded-[3px] " + dot.warn} />
                    <span className="t-small w-[70px] shrink-0 text-ink-3">{shortDay(t.dueAt)}</span>
                    <span className="t-small min-w-0 flex-1">Call the client</span>
                  </div>
                ))}
                <div>
                  <Link href={open("chase-client", waiting.id)} scroll={false} className={chipBtn}>
                    <Icon name="copy" size={14} /> Chase the client
                  </Link>
                </div>
              </>
            )}
          </section>
        </aside>
      </div>

      {sp.panel === "record-answer" && <RecordAnswer c={c} sp={sp} />}
      {sp.panel === "build-set" && <BuildSet c={c} sp={sp} />}
      {sp.panel === "chase-client" && <ChaseClient c={c} sp={sp} />}
      {sp.panel === "client-had-cv" && <ClientHadCv c={c} sp={sp} />}
      {sp.panel === "unreported-hire" && <UnreportedHire c={c} sp={sp} />}
    </>
  );
}

function Column({ title, tone, count, children }: { title: string; tone: keyof typeof dot; count: number; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-[20px] bg-sunk px-3 py-3.5">
      <div className="flex items-center gap-2 px-1 pb-0.5">
        <span className={"size-2 rounded-[4px] " + dot[tone]} />
        <span className="t-body-m flex-1">{title}</span>
        <span className="t-small text-ink-3">{count}</span>
      </div>
      {count === 0 ? <p className="t-small px-1 text-ink-3">None</p> : children}
    </div>
  );
}

function SetCard({
  set,
  tone,
  line,
  note,
  noteTone,
  children,
}: {
  set: { setNumber: number };
  tone: keyof typeof dot;
  line: string;
  note: string;
  noteTone: keyof typeof dot;
  children: React.ReactNode;
}) {
  const bg = { warn: "bg-bg-warn text-warning", info: "bg-bg-info text-info", brand: "bg-sunk text-ink-2" }[tone];
  const text = { warn: "text-warning", info: "text-info", brand: "text-brand" }[noteTone];
  return (
    <div className="flex flex-col gap-2 rounded-[16px] bg-surface p-3.5">
      <div className="flex items-center gap-2.5">
        <span className={"t-label flex size-8 shrink-0 items-center justify-center rounded-full " + bg}>S{set.setNumber}</span>
        <div className="flex min-w-0 flex-col">
          <span className="t-body-m">SET {set.setNumber}</span>
          <span className="t-small text-ink-3">{line}</span>
        </div>
      </div>
      <p className={"t-small " + text}>{note}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
