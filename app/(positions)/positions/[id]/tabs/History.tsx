import Link from "next/link";

import Icon from "@/app/Icon";
import { Card, EmptyState } from "@/app/ui/figma";
import { threadInWords } from "@/lib/mailbox";
import { subjectsOfPosition } from "@/lib/timeline";

import type { TabProps } from "./ctx";
import { clock, dayKey, dayMonth, first, weekdayDayMonth } from "./shared/fmt";

type Kind = "message" | "change" | "file" | "call";
const KINDS: { key: string; label: string; kind?: Kind }[] = [
  { key: "all", label: "All" },
  { key: "messages", label: "Messages", kind: "message" },
  { key: "changes", label: "Changes", kind: "change" },
  { key: "files", label: "Files", kind: "file" },
  { key: "calls", label: "Calls", kind: "call" },
];
const KIND_STYLE: Record<Kind, { label: string; dot: string; text: string }> = {
  message: { label: "Message", dot: "bg-info", text: "text-info" },
  change: { label: "Change", dot: "bg-warn", text: "text-warn" },
  file: { label: "File", dot: "bg-ink-faint", text: "text-ink-3" },
  call: { label: "Call", dot: "bg-brand", text: "text-brand" },
};
const PAGE = 25;
const DAY = 86_400_000;

const kindOf = (about: string): Kind => (about === "a message" || about === "a reply" ? "message" : about === "a file" ? "file" : "change");
const fileBadge = (name: string) => {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  return ext === "zip" ? { t: "ZIP", cls: "bg-info-soft text-info" } : { t: ext.slice(0, 4).toUpperCase() || "FILE", cls: "bg-sunk text-ink-3" };
};

/** R7, the role's history (frame 182:2): everything that happened on this role, filtered by kind, with its files beside. */
export default function History({ c, sp }: TabProps) {
  const { db, position, now, history, itsThreads } = c;
  const path = `/positions/${position.id}`;
  const hist = (show: string, older = false) => `${path}?view=history${show ? "&show=" + show : ""}${older ? "&older=1" : ""}`;
  const subjects = subjectsOfPosition(db, position);
  const show = KINDS.find((k) => k.key === sp.show) ?? KINDS[0];
  const who = (id: string) => first(db.members.find((m) => m.id === id)?.name);

  const rows = [
    ...history.flatMap((g) => g.entries).map((e) => ({ id: e.id, at: e.at, kind: kindOf(e.about), said: e.said, by: e.by ? first(e.by) : "System" })),
    ...db.calls
      .filter((x) => x.subjectId && subjects.has(x.subjectId))
      .map((x) => ({ id: "call" + x.id, at: x.at, kind: "call" as Kind, said: `Called ${x.toName}${x.outcome ? ". " + x.outcome : ""}`, by: who(x.by) })),
  ]
    .filter((r) => !show.kind || r.kind === show.kind)
    .sort((a, b) => b.at - a.at);
  const shown = sp.older ? rows : rows.slice(0, PAGE);

  const files = db.files.filter((f) => f.subjectId && subjects.has(f.subjectId)).sort((a, b) => b.uploadedAt - a.uploadedAt);

  const today = dayKey(now);
  const heading = (at: number) => {
    const d = weekdayDayMonth(at).replace(",", "").toUpperCase();
    return dayKey(at) === today ? `TODAY · ${d}` : dayKey(at) === dayKey(now - DAY) ? `YESTERDAY · ${d}` : d;
  };

  let lastDay = "";
  return (
    <div className="flex flex-col gap-[22px] xl:flex-row xl:items-start">
      <Card title="History" sub="Everything that happened on this role" className="min-w-0 flex-1">
        <nav className="flex flex-wrap gap-2" aria-label="Show">
          {KINDS.map((k) => (
            <Link
              key={k.key}
              href={hist(k.key === "all" ? "" : k.key)}
              scroll={false}
              className={"rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-5 " + (k.key === show.key ? "bg-ink text-ink-inverse" : "bg-sunk text-ink hover:bg-shell")}
            >
              {k.label}
            </Link>
          ))}
        </nav>
        <p className="t-small -mt-1 text-ink-3">Undo and Send a correction are not connected yet.</p>

        {rows.length === 0 ? (
          <EmptyState icon="clock" title="Nothing recorded yet">
            Events appear here as sets are sent, interviews are booked and clocks run.
          </EmptyState>
        ) : (
          <div className="flex flex-col">
            {shown.map((r) => {
              const key = dayKey(r.at);
              const head = key !== lastDay;
              lastDay = key;
              const st = KIND_STYLE[r.kind];
              return (
                <div key={r.id}>
                  {head && <p className="t-micro border-t border-rule pb-1 pt-3.5 text-ink-3 first:border-t-0">{heading(r.at)}</p>}
                  <div className="flex items-center gap-4 border-t border-rule py-3.5 first:border-t-0">
                    <span className="t-small w-[46px] shrink-0 text-ink-3">{clock(r.at)}</span>
                    <span className={"t-small flex w-[84px] shrink-0 items-center gap-2 " + st.text}>
                      <span aria-hidden className={"size-1.5 rounded-full " + st.dot} />
                      {st.label}
                    </span>
                    <span className="t-body-m w-[84px] shrink-0">{r.by}</span>
                    <span className="t-body min-w-0 flex-1">{r.said}</span>
                    {(r.kind === "change" || r.kind === "message") && (
                      <button
                        type="button"
                        disabled
                        title={r.kind === "change" ? "not connected yet: undoing a change" : "not connected yet: sending a correction"}
                        className="shrink-0 cursor-not-allowed rounded-full border border-rule bg-surface px-3 py-1.5 text-[12px] font-medium leading-4 text-ink-3 opacity-60"
                      >
                        {r.kind === "change" ? "Undo" : "Send a correction"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!sp.older && rows.length > PAGE && (
              <Link href={hist(sp.show ?? "", true)} className="t-body-m pt-3 text-brand hover:underline">
                Show older
              </Link>
            )}
          </div>
        )}
      </Card>

      <aside className="flex w-full shrink-0 flex-col gap-[18px] xl:w-[300px]">
        <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
          <p className="t-micro text-ink-3">FILES</p>
          {files.length === 0 ? (
            <p className="t-small text-ink-3">No files kept for this role yet.</p>
          ) : (
            files.map((f) => {
              const b = fileBadge(f.name);
              return (
                <a key={f.id} href={`/api/files/${f.id}`} className="flex items-center gap-3 rounded-[12px] py-1 hover:bg-sunk/60">
                  <span className={"flex size-[34px] shrink-0 items-center justify-center rounded-[10px] text-[10px] font-medium " + b.cls}>{b.t}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="t-body-m truncate">{f.name}</span>
                    <span className="t-small text-ink-3">{dayMonth(f.uploadedAt)}</span>
                  </span>
                </a>
              );
            })
          )}
        </section>

        {itsThreads.length > 0 && (
          <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
            <p className="t-micro text-ink-3">CONVERSATIONS WITH THE CLIENT</p>
            {itsThreads.map((thread) => (
              <Link key={thread.key} href={`/mail/${encodeURIComponent(thread.key)}`} className="flex items-center justify-between gap-3 rounded-[12px] py-1 hover:bg-sunk/60">
                <span className="flex min-w-0 flex-col">
                  <span className="t-body-m truncate">{thread.subject}</span>
                  <span className="t-small text-ink-3">
                    {thread.withName} · {threadInWords(thread, now)}
                  </span>
                </span>
                <Icon name="chevron-right" size={16} className="shrink-0 text-ink-3" />
              </Link>
            ))}
          </section>
        )}
      </aside>
    </div>
  );
}
