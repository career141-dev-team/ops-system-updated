import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/app/Icon";
import {
  clientIn,
  desk,
  invoicesNewestFirst,
  member as memberIn,
  placementIn,
  positionIn,
  runClocks,
} from "@/data/desk";
import {
  PageBox,
  StatTile,
  ViewPills,
  pillGhost,
  pillSecondary,
} from "@/app/ui/figma";
import { day } from "@/lib/listing";
import { invoiceDrift } from "@/lib/exports";
import { balanceOf, invoiceInWords, money, moneyCompact, paidSoFar } from "@/lib/money";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

type View = "invoices" | "collections" | "payments" | "refunds" | "surcharges";

function parseView(raw: string | undefined): View {
  if (
    raw === "collections" ||
    raw === "payments" ||
    raw === "refunds" ||
    raw === "surcharges"
  ) {
    return raw;
  }
  return "invoices";
}

function statusTone(state: string, overdue: boolean): string {
  if (state === "paid") return "text-ok";
  if (state === "disputed" || overdue) return "text-danger";
  if (state === "sent" || state === "partly_paid") return "text-warn";
  return "text-ink-faint";
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");

  const sp = await searchParams;
  const view = parseView(sp.view);
  const canMoney = can(me, "money.manage");

  await runClocks();
  const db = await desk();
  const now = Date.now();
  const allInvoices = invoicesNewestFirst(db);

  let totalOwed = 0;
  let openCount = 0;
  let totalLate = 0;
  let lateCount = 0;

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();
  const monthLabel = monthStart.toLocaleDateString("en-GB", { month: "long" });

  let collectedMonth = 0;
  let monthPayments = 0;

  for (const inv of allInvoices) {
    if (inv.kind === "credit_note") continue;
    const bal = balanceOf(inv);
    if (inv.state !== "paid" && inv.state !== "written_off" && bal > 0) {
      totalOwed += bal;
      openCount += 1;
      if (inv.dueAt && inv.dueAt < now) {
        totalLate += bal;
        lateCount += 1;
      }
    }
    for (const p of inv.payments) {
      if (p.paidAt >= monthStartMs) {
        collectedMonth += p.amount;
        monthPayments += 1;
      }
    }
  }

  const unreportedTimers = db.timers.filter(
    (t) =>
      t.state === "running" &&
      t.kind === "hire.unreported" &&
      t.subjectType === "clientSet",
  );
  const refundGuarantees = db.guarantees.filter(
    (g) => g.state === "refund_pending" || g.state === "refunded",
  );

  const visibleInvoices = allInvoices.filter((inv) => {
    if (view === "collections") {
      return (
        inv.kind !== "credit_note" &&
        inv.state !== "paid" &&
        inv.state !== "written_off" &&
        ((inv.dueAt && inv.dueAt < now) || inv.state === "disputed" || inv.lateMonths > 0)
      );
    }
    if (view === "payments") {
      return inv.payments.length > 0 || inv.state === "paid" || inv.state === "partly_paid";
    }
    if (view === "refunds") {
      return inv.kind === "credit_note";
    }
    if (view === "surcharges") {
      return inv.kind === "surcharge";
    }
    return inv.kind !== "credit_note";
  });

  const tabs = [
    { key: "invoices", label: "Invoices", href: "/invoices" },
    { key: "collections", label: "Collections", href: "/invoices?view=collections" },
    { key: "payments", label: "Payments", href: "/invoices?view=payments" },
    { key: "refunds", label: "Refunds", href: "/invoices?view=refunds" },
    { key: "surcharges", label: "Surcharges", href: "/invoices?view=surcharges" },
  ];

  const cardShell = "flex flex-col gap-2";

  return (
    <PageBox width="1160">
      <div className="flex flex-col gap-6">
        {sp.msg && (
          <div className="rounded-[18px] border border-brand/25 bg-brand-tint px-4 py-3 text-[13px] font-medium text-ink">
            {sp.msg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            size="lg"
            outline
            value={moneyCompact(totalOwed, "LKR")}
            label="owed to us"
            caption={`${openCount} open invoice${openCount === 1 ? "" : "s"}`}
          />
          <StatTile
            size="lg"
            outline
            highlight={totalLate > 0 ? "danger" : undefined}
            tone={totalLate > 0 ? "danger" : "default"}
            value={moneyCompact(totalLate, "LKR")}
            label="late"
            caption={lateCount > 0 ? `${lateCount} past due date` : "none overdue"}
          />
          <StatTile
            size="lg"
            outline
            value={moneyCompact(collectedMonth, "LKR")}
            label={`collected in ${monthLabel}`}
            caption={`${monthPayments} payment${monthPayments === 1 ? "" : "s"} logged`}
          />
        </div>

        <ViewPills
          items={tabs}
          active={view}
          rightSlot={
            canMoney ? (
              <Link href="/invoices/payment" className={pillSecondary}>
                Log a payment
              </Link>
            ) : undefined
          }
        />

        {view === "surcharges" && unreportedTimers.length > 0 && (
          <div className={cardShell}>
            <div className="px-4 pb-2 pt-3 text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">
              Unreported hire checks ({unreportedTimers.length})
            </div>
            <div className="flex flex-col gap-2">
              {unreportedTimers.map((t) => {
                const set = db.clientSets.find((s) => s.id === t.subjectId);
                const client = set?.clientId ? clientIn(db, set.clientId) : null;
                return (
                  <Link
                    key={t.id}
                    href={`/invoices/unreported?setId=${encodeURIComponent(t.subjectId)}`}
                    className="flex items-center justify-between gap-4 rounded-[16px] border border-rule bg-surface px-4 py-3 transition-colors hover:bg-sunk"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                        <Icon name="flag" size={16} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[16px] leading-[26px] text-ink">
                          {client?.name ?? "Client"} · {set?.role ?? "Unreported hire"}
                        </div>
                        <div className="truncate text-[14px] leading-[21px] text-ink-faint">
                          3-month check flagged a possible unreported hire
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[14px] text-danger">Needs review</span>
                      <Icon name="chevron-right" size={16} className="text-ink-faint" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {view === "refunds" && refundGuarantees.length > 0 && (
          <div className={cardShell}>
            <div className="px-4 pb-2 pt-3 text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">
              Guarantee refunds ({refundGuarantees.length})
            </div>
            <div className="flex flex-col gap-2">
              {refundGuarantees.map((g) => {
                const placement = placementIn(db, g.placementId);
                const client = placement?.clientId ? clientIn(db, placement.clientId) : null;
                const posTitle = placement?.positionId
                  ? positionIn(db, placement.positionId)?.title
                  : null;
                return (
                  <Link
                    key={g.id}
                    href={`/guarantees/${g.id}`}
                    className="flex items-center justify-between gap-4 rounded-[16px] border border-rule bg-surface px-4 py-3 transition-colors hover:bg-sunk"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft">
                        <Icon name="shield" size={16} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[16px] leading-[26px] text-ink">
                          {client?.name ?? "Client"} · {g.candidateName}
                        </div>
                        <div className="truncate text-[14px] leading-[21px] text-ink-faint">
                          {posTitle ?? "Placement"} ·{" "}
                          {g.refundAmount != null ? money(g.refundAmount, "LKR") : "Refund case"}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`text-[14px] font-medium ${g.state === "refunded" ? "text-ok" : "text-warn"
                          }`}
                      >
                        {g.state === "refunded" ? "Refunded" : "Refund pending"}
                      </span>
                      <Icon name="chevron-right" size={16} className="text-ink-faint" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div>
          {visibleInvoices.length === 0 ? (
            <div className="rounded-[20px] bg-sunk px-5 py-6 text-[14px] text-ink-soft">
              Nothing in this view right now.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleInvoices.map((inv) => {
                const client = inv.clientId ? clientIn(db, inv.clientId) : null;
                const owner = memberIn(db, inv.ownerId);
                const bal = balanceOf(inv);
                const paid = paidSoFar(inv);
                const overdue = Boolean(
                  inv.dueAt &&
                  inv.dueAt < now &&
                  inv.state !== "paid" &&
                  inv.state !== "written_off",
                );
                const rightText =
                  inv.state === "paid"
                    ? "Paid"
                    : inv.state === "written_off"
                      ? "Written off"
                      : inv.state === "disputed"
                        ? "Disputed"
                        : overdue
                          ? `${money(bal, inv.currency)} overdue`
                          : bal > 0
                            ? `${money(bal, inv.currency)} owed`
                            : invoiceInWords(inv);

                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between gap-4 rounded-[16px] border border-rule bg-surface px-4 py-3 transition-colors hover:bg-sunk"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft">
                        <Icon name={inv.kind === "surcharge" ? "flag" : "wallet"} size={16} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[16px] leading-[26px] text-ink">
                          {client?.name ?? "Client"} · {inv.number}
                        </div>
                        <div className="truncate text-[14px] leading-[21px] text-ink-faint">
                          {inv.about}
                          {inv.dueAt ? ` · due ${day(inv.dueAt)}` : ""}
                          {paid > 0 && inv.state !== "paid"
                            ? ` · ${money(paid, inv.currency)} paid`
                            : ""}
                          {owner ? ` · ${owner.name}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`text-[14px] ${statusTone(inv.state, overdue)}`}
                      >
                        {rightText}
                      </span>
                      <Icon name="chevron-right" size={16} className="text-ink-faint" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* The two exports had a home in the page's old header; the frame has none, so they sit here. */}
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/exports/invoices.csv" className={pillGhost}>
            Invoices CSV
          </a>
          <a href="/api/exports/payments.csv" className={pillGhost}>
            Payments CSV
          </a>
        </div>
      </div>
    </PageBox>
  );
}
