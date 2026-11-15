import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/app/Icon";
import { activeMembers, clientIn, desk } from "@/data/desk";
import { PageBox, ViewPills, pillGhost } from "@/app/ui/figma";
import { numbersFrom } from "@/lib/numbers";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

type NumbersView = "operations" | "response" | "finance";

function parseView(raw: string | undefined): NumbersView {
  if (raw === "response" || raw === "finance") return raw;
  return "operations";
}

function mondayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

export default async function NumbersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; owner?: string; client?: string; week?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  if (!can(me, "report.read")) {
    redirect("/?msg=" + encodeURIComponent("The numbers are for the leads."));
  }

  const sp = await searchParams;
  const view = parseView(sp.view);
  const db = await desk();
  const measures = numbersFrom(db);
  const owners = activeMembers(db);

  const now = Date.now();
  const currentMonday = mondayStart(now);
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const filteredSets = db.clientSets.filter((s) => {
    if (!s.sentAt) return false;
    if (sp.client && s.clientId !== sp.client) return false;
    if (sp.owner) {
      const c = s.clientId ? clientIn(db, s.clientId) : null;
      if (!c || c.ownerId !== sp.owner) return false;
    }
    return true;
  });

  const weeks = Array.from({ length: 8 }, (_, idx) => {
    const start = currentMonday - (7 - idx) * weekMs;
    const end = start + weekMs;
    const setsInWeek = filteredSets.filter(
      (s) => (s.sentAt ?? 0) >= start && (s.sentAt ?? 0) < end,
    );
    const cvCount = setsInWeek.reduce((sum, s) => sum + s.candidates.length, 0);
    const label = new Date(start).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    const key = new Date(start).toISOString().slice(0, 10);
    return { key, label, cvCount, sets: setsInWeek };
  });

  const selectedWeek = weeks.find((w) => w.key === sp.week) ?? weeks[weeks.length - 1];
  const maxCvs = Math.max(1, ...weeks.map((w) => w.cvCount));

  const tabs = [
    { key: "weekly", label: "Weekly TA report", href: "/reports" },
    { key: "operations", label: "Operations", href: "/numbers" },
    { key: "response", label: "Client response", href: "/numbers?view=response" },
    { key: "finance", label: "Finance & guarantees", href: "/numbers?view=finance" },
  ];

  const baseParams = new URLSearchParams();
  if (view !== "operations") baseParams.set("view", view);
  if (sp.owner) baseParams.set("owner", sp.owner);
  if (sp.client) baseParams.set("client", sp.client);

  return (
    <PageBox width="1160">
      <div className="flex flex-col gap-6">
        <ViewPills items={tabs} active={view} />

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/numbers${view !== "operations" ? `?view=${view}` : ""}`}
            className={
              !sp.owner && !sp.client
                ? "rounded-full bg-sunk px-3.5 py-1.5 text-[13px] font-medium text-ink"
                : pillGhost
            }
          >
            All owners &amp; clients
          </Link>
          {owners.slice(0, 5).map((m) => {
            const p = new URLSearchParams(baseParams);
            if (sp.owner === m.id) p.delete("owner");
            else p.set("owner", m.id);
            const active = sp.owner === m.id;
            return (
              <Link
                key={m.id}
                href={`/numbers?${p.toString()}`}
                className={
                  active
                    ? "rounded-full bg-sunk px-3.5 py-1.5 text-[13px] font-medium text-ink"
                    : pillGhost
                }
              >
                <span className="text-ink-faint">Owner </span>
                {m.name.split(" ")[0]}
              </Link>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-edge bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-medium text-ink">
              CVs sent to clients each week
            </h2>
            <span className="text-[13px] text-ink-faint">
              Click a bar to see that week&rsquo;s sets
            </span>
          </div>

          <div className="mt-5 flex h-[180px] items-end gap-3 sm:gap-4">
            {weeks.map((w) => {
              const selected = w.key === selectedWeek.key;
              const barH = Math.max(12, Math.round((w.cvCount / maxCvs) * 126));
              const p = new URLSearchParams(baseParams);
              p.set("week", w.key);
              return (
                <Link
                  key={w.key}
                  href={`/numbers?${p.toString()}`}
                  className="group flex flex-1 flex-col items-center gap-1.5"
                >
                  <span
                    className={`text-[12px] font-medium ${
                      selected ? "text-ink" : "text-ink-faint"
                    }`}
                  >
                    {w.cvCount}
                  </span>
                  <div
                    style={{ height: `${barH}px` }}
                    className={`w-full rounded-t-[8px] transition ${
                      selected ? "bg-brand" : "bg-edge-strong/70 group-hover:bg-brand/60"
                    }`}
                  />
                  <span className="text-[11.5px] font-medium text-ink-faint">{w.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            WEEK OF {selectedWeek.label.toUpperCase()} · {selectedWeek.cvCount} CVS IN{" "}
            {selectedWeek.sets.length} SET{selectedWeek.sets.length === 1 ? "" : "S"}
          </div>
          <div className="rounded-[24px] border border-edge bg-surface p-2">
            {selectedWeek.sets.length === 0 ? (
              <div className="px-4 py-6 text-[13.5px] text-ink-soft">
                No CV sets sent during that week.
              </div>
            ) : (
              <div className="divide-y divide-edge/60">
                {selectedWeek.sets.map((s) => {
                  const c = s.clientId ? clientIn(db, s.clientId) : null;
                  return (
                    <Link
                      key={s.id}
                      href={`/sets/${s.id}`}
                      className="flex items-center justify-between gap-4 rounded-[16px] px-4 py-3.5 transition hover:bg-sunk/60"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft">
                          <Icon name="send" size={16} />
                        </span>
                        <div className="truncate text-[14px] font-medium text-ink">
                          {s.role} · {c?.name ?? "Client"}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-[12.5px] text-ink-soft">
                          {s.candidates.length} CVs · {s.state.replace(/_/g, " ")}
                        </span>
                        <Icon name="chevron-right" size={16} className="text-ink-faint" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            MEASURES FROM YOUR ROWS
          </div>
          <div className="rounded-[24px] border border-edge bg-surface p-5">
            <div className="divide-y divide-edge/60">
              {measures.map((measure) => (
                <div key={measure.key} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-[14px] font-medium text-ink">{measure.what}</p>
                  <p className="mt-0.5 text-[13px] text-ink-soft">{measure.words}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageBox>
  );
}
