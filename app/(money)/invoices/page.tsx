import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/app/Icon";
import { draftInvoiceForPlacement } from "@/app/actions";
import {
  clientIn,
  desk,
  invoicesNewestFirst,
  numberOf,
  placementIn,
  positionIn,
  runClocks,
  unreportedToAsk,
} from "@/data/desk";
import { Card, PageTitle, pillGhost, pillSecondary } from "@/app/ui/figma";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { boardSummary, columnOf, type Column } from "@/lib/accountsBoard";
import { closeHref, panelHref } from "@/lib/panel";
import { closeSendHref, sendHref } from "@/lib/sendModal";
import { WRITE_OFF_DAYS, balanceOf, money, moneyWhole } from "@/lib/money";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { AccountsSendModal } from "./AccountsSendModals";
import InvoicePanel from "./InvoicePanel";
import WriteOffPanel from "./WriteOffPanel";

export const dynamic = "force-dynamic";

const PATH = "/invoices";
const SHOWN = 2;

/** "17 Nov" and "Thu 3 Dec", in Colombo. */
const COLOMBO = 5.5 * 3_600_000;
const short = (at: number) => new Date(at + COLOMBO).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const longDay = (at: number) => new Date(at + COLOMBO).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const COLUMNS: { key: Column; title: string; dot: string }[] = [
  { key: "to_send", title: "To send", dot: "bg-warn" },
  { key: "sent", title: "Sent", dot: "bg-info" },
  { key: "late", title: "Late", dot: "bg-danger" },
  { key: "paid", title: "Paid", dot: "bg-brand" },
];

const smallBtn = "inline-flex cursor-pointer items-center rounded-full border border-rule bg-surface px-3 py-[7px] t-label text-ink hover:bg-sunk";
const smallInk = "inline-flex cursor-pointer items-center rounded-full bg-ink px-3 py-[7px] t-label text-ink-inverse";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; panel?: string; send?: string; on?: string; more?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");

  const sp = await searchParams;
  const canMoney = can(me, "money.manage");

  await runClocks();
  const db = await desk();
  const now = Date.now();
  const all = invoicesNewestFirst(db);
  const sum = boardSummary(all, now);
  const month = new Date(now + COLOMBO).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });

  const placed = (id: string | null) => (id ? placementIn(db, id) : null);
  const byColumn = new Map<Column, typeof all>();
  for (const inv of all) {
    const col = columnOf(inv, now);
    if (col) byColumn.set(col, [...(byColumn.get(col) ?? []), inv]);
  }
  // Oldest late first: that is the one to chase.
  byColumn.get("late")?.sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
  const oldestLate = byColumn.get("late")?.[0];
  const oldestLateClient = oldestLate?.clientId ? clientIn(db, oldestLate.clientId)?.name : null;

  // Joined, and nobody has made the invoice (a replacement under the guarantee is not invoiced again).
  const joinedNoInvoice = db.placements.filter((p) => p.state === "joined" && !p.invoiceId && !p.isReplacementOf);
  const unreported = unreportedToAsk(db);

  const invoiceCount = all.filter((i) => i.kind !== "credit_note").length;

  const rail = [
    { label: "Invoiced", value: sum.invoicedSum, bar: "bg-ink" },
    { label: `Paid · ${sum.paidCount} invoice${sum.paidCount === 1 ? "" : "s"}`, value: sum.paidSum, bar: "bg-brand" },
    { label: `Late · ${sum.late} invoice${sum.late === 1 ? "" : "s"}`, value: sum.lateSum, bar: "bg-danger" },
    { label: "Sent, not due", value: sum.sentNotDueSum, bar: "bg-info" },
  ];
  const railMax = Math.max(1, ...rail.map((r) => r.value));

  const numbers = [
    { label: "To send", value: sum.toSend, tone: "text-warn", caption: "drafted, need you" },
    { label: "Sent", value: sum.sent, tone: "text-info", caption: "waiting for payment" },
    { label: "Due this week", value: sum.dueThisWeek, tone: "text-warn", caption: `by ${longDay(now + 7 * 86_400_000)}` },
    { label: "Late", value: sum.late, tone: "text-danger", caption: sum.late ? `oldest ${sum.oldestLateDays} day${sum.oldestLateDays === 1 ? "" : "s"}` : "none late" },
    { label: "Paid this month", value: sum.paidCount, tone: "text-brand", caption: moneyWhole(sum.paidSum, "LKR") },
  ];

  const open = sp.panel === "invoice" || sp.panel === "write-off" ? all.find((i) => i.id === sp.on) : null;
  const close = closeHref(PATH, sp);

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Invoices"
        sub={`${invoiceCount} invoice${invoiceCount === 1 ? "" : "s"} · ${longDay(now)}`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            {canMoney && (
              <Link href="/invoices/payment" className={pillSecondary}>
                Payments and refunds
              </Link>
            )}
            <a href="/api/exports/invoices.csv" className={pillGhost}>Invoices CSV</a>
            <a href="/api/exports/payments.csv" className={pillGhost}>Payments CSV</a>
          </div>
        }
      />

      {sp.msg && !open && <p role="status" className="t-body rounded-[18px] bg-brand-tint px-4 py-3">{sp.msg}</p>}

      <section className="grid grid-cols-2 gap-6 rounded-[28px] bg-surface px-7 py-[22px] shadow-card md:grid-cols-5 md:gap-0">
        {numbers.map((n, i) => (
          <div key={n.label} className={"flex flex-col gap-1 md:px-7 " + (i > 0 ? "md:border-l md:border-rule" : "md:pl-0")}>
            <p className="t-micro text-ink-3">{n.label}</p>
            <p className={"text-[36px] font-medium leading-[44px] " + n.tone}>{n.value}</p>
            <p className="t-small text-ink-3">{n.caption}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 items-start gap-[22px] pg-xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card title="Invoices" sub="Grouped by where each one stands. Each card has one button.">
          {(joinedNoInvoice.length > 0 || unreported.length > 0) &&
            <div className="flex flex-col gap-2">
              {joinedNoInvoice.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-[18px] rounded-[18px] bg-sunk px-5 py-4">
                  <span className="flex w-[150px] items-center gap-2 t-label text-warn"><span className="size-2 rounded-[4px] bg-warn" />Needs you</span>
                  <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
                    <p className="t-body-m">Joined, no invoice</p>
                    <p className="t-small text-ink-2">
                      {p.candidateName} joined {(p.clientId ? clientIn(db, p.clientId)?.name : null) ?? "the client"}
                      {p.joinedAt ? " on " + short(p.joinedAt) : ""}. No invoice has been made.
                    </p>
                  </div>
                  {(canMoney || can(me, "client.manage")) && (
                    <form action={draftInvoiceForPlacement}>
                      <input type="hidden" name="placementId" value={p.id} />
                      <SubmitButton id={"make-" + p.id} className={smallBtn}>Make the invoice</SubmitButton>
                    </form>
                  )}
                </div>
              ))}
              {unreported.map((t) => {
                const set = db.clientSets.find((s) => s.id === t.subjectId);
                const client = set?.clientId ? clientIn(db, set.clientId) : null;
                return (
                  <div key={t.id} className="flex flex-wrap items-center gap-[18px] rounded-[18px] bg-sunk px-5 py-4">
                    <span className="flex w-[150px] items-center gap-2 t-label text-warn"><span className="size-2 rounded-[4px] bg-warn" />Needs you</span>
                    <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
                      <p className="t-body-m">Possible unreported hire</p>
                      <p className="t-small text-ink-2">{client?.name ?? "A client"} · {set?.role ?? "a role"}. The 3-month check flagged it.</p>
                    </div>
                    <Link href={`/invoices/unreported?setId=${encodeURIComponent(t.subjectId)}`} className={smallBtn}>Review</Link>
                  </div>
                );
              })}
            </div>}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 pg-xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const rows = byColumn.get(col.key) ?? [];
              const expanded = (sp.more ?? "").split(",").includes(col.key);
              const shown = expanded ? rows : rows.slice(0, SHOWN);
              return (
                <div key={col.key} className="flex min-w-0 flex-col gap-2.5 rounded-[20px] bg-sunk px-3 py-3.5">
                  <div className="flex items-center gap-2 px-1 pb-0.5">
                    <span className={"size-2 rounded-[4px] " + col.dot} />
                    <h3 className="t-body-m flex-1">{col.title}</h3>
                    <span className="t-small text-ink-3">{rows.length}</span>
                  </div>
                  {rows.length === 0 && <p className="t-small px-1 text-ink-3">Nothing here.</p>}
                  {shown.map((inv) => {
                    const client = inv.clientId ? clientIn(db, inv.clientId) : null;
                    const pl = placed(inv.placementId);
                    const who = pl?.candidateName ?? inv.about ?? "";
                    const role = pl?.positionId ? positionIn(db, pl.positionId)?.title : null;
                    const late = inv.dueAt ? Math.floor((now - inv.dueAt) / 86_400_000) : 0;
                    return (
                      <article key={inv.id} className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-3.5">
                        <Link href={panelHref(PATH, sp, "invoice", inv.id)} scroll={false} className="t-body-m hover:underline">
                          {client?.name ?? "Client"}
                        </Link>
                        <p className="t-small break-words text-ink-3">{inv.number}{who ? " · " + who : ""}{role && !who ? " · " + role : ""}</p>
                        <p className="text-[16px] font-medium leading-6">{money(balanceOf(inv) > 0 && col.key !== "to_send" ? balanceOf(inv) : inv.amount, inv.currency)}</p>
                        {col.key === "to_send" && <p className="t-small text-ink-3">{pl?.joinedAt ? "Joined " + short(pl.joinedAt) : "Draft, not sent"}</p>}
                        {col.key === "sent" && <p className="t-small text-info">{inv.disputed ? "Disputed · " : ""}{inv.sentAt ? "Sent " + short(inv.sentAt) : "Sent"}{inv.dueAt ? " · due " + longDay(inv.dueAt) : ""}</p>}
                        {col.key === "late" && <p className="t-small text-danger">Late · {late} day{late === 1 ? "" : "s"}</p>}
                        {col.key === "paid" && <p className="t-small text-brand">Paid {inv.paidAt ? short(inv.paidAt) : ""}</p>}
                        {canMoney && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {col.key === "to_send" && (
                              <>
                                <Link href={sendHref(PATH, sp, "invoice", inv.id)} scroll={false} className={smallInk}>Preview and send</Link>
                                <Link href={panelHref(PATH, sp, "invoice", inv.id)} scroll={false} className={smallBtn}>Details</Link>
                              </>
                            )}
                            {col.key === "sent" && (
                              <Link href={panelHref(PATH, sp, "invoice", inv.id)} scroll={false} className={smallBtn}>Record a payment</Link>
                            )}
                            {col.key === "late" && (
                              <>
                                <Link href={panelHref(PATH, sp, "invoice", inv.id)} scroll={false} className={smallBtn}>Copy a reminder</Link>
                                <Link href={panelHref(PATH, sp, "write-off", inv.id)} scroll={false} className={smallBtn}>Write off</Link>
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                  {rows.length > SHOWN && !expanded && (
                    <Link
                      href={{ pathname: PATH, query: { ...sp, more: [...(sp.more ? sp.more.split(",") : []), col.key].join(",") } }}
                      scroll={false}
                      className="t-small px-1 text-ink-3 hover:text-ink"
                    >
                      {rows.length - SHOWN} more
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <aside className="flex flex-col gap-5">
          <section className="flex flex-col gap-3 rounded-[28px] bg-ink p-6">
            <p className="t-micro flex items-center gap-2 text-ink-3"><Icon name="sparkle" size={16} />Where it stands</p>
            <p className="text-[20px] font-medium leading-7 text-surface">
              {sum.late === 0 && sum.toSend === 0 ? "All clear." : `${sum.late} late, ${sum.toSend} to send.`}
            </p>
            <p className="t-small text-ink-3">
              {sum.late > 0 && oldestLateClient ? `${oldestLateClient} is the oldest, ${sum.oldestLateDays} day${sum.oldestLateDays === 1 ? "" : "s"}.` : "Nothing is late."}
              {sum.toSend > 0 ? ` Send the ${sum.toSend} draft${sum.toSend === 1 ? "" : "s"} today so their clock starts.` : ""}
            </p>
          </section>
          <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
            <p className="t-micro text-ink-3">This month · {month}</p>
            {rail.map((r) => (
              <div key={r.label} className="flex flex-col gap-1.5">
                <p className="t-small flex"><span className="flex-1 text-ink">{r.label}</span><span className="text-ink-2">{moneyWhole(r.value, "LKR")}</span></p>
                <div className="h-2 rounded bg-sunk"><div className={"h-2 rounded " + r.bar} style={{ width: Math.round((r.value / railMax) * 100) + "%" }} /></div>
              </div>
            ))}
          </section>
        </aside>
      </div>

      {open && sp.panel === "invoice" && (
        <InvoicePanel db={db} inv={open} now={now} canMoney={canMoney} closeHref={close} msg={sp.msg} latePct={numberOf(db, "invoice.latePctPerMonth", 5)} />
      )}
      {open && sp.panel === "write-off" && (
        <WriteOffPanel db={db} inv={open} now={now} me={me} closeHref={close} msg={sp.msg} writeOffDays={numberOf(db, "invoice.writeOffDays", WRITE_OFF_DAYS)} />
      )}
      {sp.send && (
        <AccountsSendModal send={sp.send} on={sp.on} db={db} me={me} closeHref={closeSendHref(PATH, sp)} />
      )}
    </div>
  );
}
