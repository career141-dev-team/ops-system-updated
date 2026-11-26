import Link from "next/link";

import { draftInvoiceForPlacement, markJoined, requestPaymentDetails, savePlacementPhone } from "@/app/actions";
import { Avatar, Card, EmptyState, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { statusWords } from "@/lib/accountsBoard";
import { colomboDateInWords } from "@/lib/calendar";
import { feeMonthsFor, isExpat, moneyWhole } from "@/lib/money";
import { guaranteeDay, missingInWords, offerColumn, type OfferColumn } from "@/lib/offerBoard";
import { closeHref, panelHref } from "@/lib/panel";
import { can } from "@/lib/roles";

import type { TabProps } from "./ctx";
import CopyButton from "./offer/CopyButton";
import OfferPanels, { shortDay } from "./offer/panels";

const PANELS = ["record-address", "move-doj", "offer-declined", "did-not-join", "confirm-nationality", "testimonial"];
const DAY = 86_400_000;
const small = " !px-3 !py-[7px] !text-[12px] !leading-4";

const COLUMNS: { key: OfferColumn; title: string; dot: string }[] = [
  { key: "offer", title: "Offer", dot: "bg-warn" },
  { key: "missing", title: "Details missing", dot: "bg-danger" },
  { key: "joining", title: "Joining", dot: "bg-info" },
  { key: "joined", title: "Joined", dot: "bg-brand" },
  { key: "didNotJoin", title: "Did not join", dot: "bg-ink-3" },
];

export default function Offer({ c, sp }: TabProps) {
  const { db, itsPlacements, now, client, clientName } = c;
  const path = `/positions/${c.position.id}`;
  const back = closeHref(path, sp);
  const mayManage = can(c.me, "client.manage");
  const addressKnown = Boolean(client?.billingAddress.trim());
  const open = (panel: string, on: string) => panelHref(path, sp, panel, on);
  const total = (g: { startsAt: number; endsAt: number }) => Math.max(1, Math.round((g.endsAt - g.startsAt) / DAY));

  const cards = itsPlacements.map((pl) => {
    // A replacement under the guarantee is not invoiced again, so it waits for no address.
    const known = addressKnown || Boolean(pl.isReplacementOf);
    return {
      pl,
      known,
      col: offerColumn(pl, known),
      problems: pl.state === "placed" ? missingInWords(pl, known) : [],
      guarantee: db.guarantees.find((g) => g.placementId === pl.id) ?? null,
      invoice: db.invoices.find((inv) => inv.placementId === pl.id) ?? null,
    };
  });
  const byCol = (key: OfferColumn) => cards.filter((x) => x.col === key);
  const columns = COLUMNS.filter((col) => col.key !== "didNotJoin" || byCol("didNotJoin").length > 0);

  const waiting = cards.filter((x) => x.pl.state === "placed");
  const noAddress = waiting.find((x) => !x.known);
  const contact = client?.contacts?.[0] ?? null;
  const contactFirst = (contact?.name ?? clientName).split(" ")[0];
  const message = noAddress
    ? `Hello ${contactFirst}, ${noAddress.pl.candidateName.split(" ")[0]} joins you${noAddress.pl.joinDate ? " on " + colomboDateInWords(noAddress.pl.joinDate) : ""}. Could you send us the full address the invoice should go to, and whether it needs a name or a PO number on it? Thank you.`
    : null;

  const headline =
    itsPlacements.length === 0
      ? "Nobody has been placed yet."
      : waiting.length === 0
        ? "Everybody placed has joined."
        : waiting.length === 1
          ? "One person is about to join."
          : waiting.length + " people are about to join.";
  const lines = [
    ...waiting.map((x) => {
      const n = x.pl.candidateName.split(" ")[0];
      if (!x.pl.offerLetterFileRef) return `${n}'s signed offer letter has not come back.`;
      const bits = x.problems.map((p) => p.charAt(0).toLowerCase() + p.slice(1));
      return `${n}${x.pl.joinDate ? " joins on " + shortDay(x.pl.joinDate) : " has no joining day yet"}${bits.length ? ": " + bits.join(", ") : ""}.`;
    }),
    ...cards
      .filter((x) => x.pl.state === "joined" && x.guarantee)
      .map((x) => `${x.pl.candidateName.split(" ")[0]} is on guarantee day ${guaranteeDay(x.guarantee!, now, total(x.guarantee!))} of ${total(x.guarantee!)}.`),
  ];
  const rail = waiting.find((x) => x.pl.joinDate) ?? waiting[0] ?? null;

  return (
    <>
      {PANELS.includes(sp.panel ?? "") && <OfferPanels c={c} sp={sp} path={path} />}
      <div className="flex flex-col items-start gap-[22px] pg-lg:flex-row">
        <Card title="Offer and joining" sub="From the offer to the first day. Details must be complete before the joining day." className="w-full min-w-0 flex-1">
          {itsPlacements.length === 0 ? (
            <EmptyState title="Nobody has been placed on this role yet">A placement appears here when the TA System places somebody.</EmptyState>
          ) : (
            <div className="flex flex-col gap-[14px] md:flex-row">
              {columns.map((col) => {
                const list = byCol(col.key);
                return (
                  <div key={col.key} className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-[20px] bg-surface-2 px-3 py-3.5">
                    <div className="flex items-center gap-2 px-1 pb-0.5">
                      <span className={"size-2 rounded-[4px] " + col.dot} />
                      <p className="t-body-m flex-1">{col.title}</p>
                      <p className="t-small text-ink-3">{list.length}</p>
                    </div>
                    {list.length === 0 && <div className="t-small rounded-[14px] border border-rule p-3.5 text-ink-3">None now</div>}
                    {list.map(({ pl, problems, guarantee, invoice, known }) => (
                      <div key={pl.id} className="flex flex-col gap-2 rounded-[16px] bg-surface p-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={pl.candidateName} size="32" />
                          <div className="min-w-0 flex-1">
                            <p className="t-body-m">{pl.candidateName}</p>
                            <p className="t-small text-ink-3">
                              {pl.state === "joined"
                                ? "Joined " + shortDay(pl.joinedAt ?? pl.joinDate ?? now)
                                : pl.state === "no_show"
                                  ? "Did not turn up"
                                  : (pl.joinDate ? "DOJ " + shortDay(pl.joinDate) + " · " : "") + "placed " + shortDay(pl.createdAt)}
                            </p>
                          </div>
                          {pl.state !== "joined" && (
                            <details className="relative">
                              <summary aria-label={"More for " + pl.candidateName} className="flex size-7 cursor-pointer list-none items-center justify-center rounded-[14px] text-ink-3 hover:bg-sunk">…</summary>
                              <div className="absolute right-0 z-10 mt-1 flex w-44 flex-col rounded-[14px] border border-rule bg-surface p-1 shadow-card">
                                {pl.state === "placed" && <Link scroll={false} className="t-small rounded-[10px] px-3 py-2 hover:bg-sunk" href={open("move-doj", pl.id)}>Move the DOJ</Link>}
                                {pl.state === "placed" && <Link scroll={false} className="t-small rounded-[10px] px-3 py-2 hover:bg-sunk" href={open("offer-declined", pl.id)}>Offer declined</Link>}
                                <Link scroll={false} className="t-small rounded-[10px] px-3 py-2 hover:bg-sunk" href={open("did-not-join", pl.id)}>Did not join</Link>
                              </div>
                            </details>
                          )}
                        </div>
                        {problems.map((p, i) => (
                          <p key={p} className={"t-small " + (i === 0 ? "text-danger" : "text-ink-3")}>{p}</p>
                        ))}
                        {!known && pl.state === "placed" && (
                          <div>
                            <Link scroll={false} href={open("record-address", pl.id)} className={pillPrimary + small}>Record the address</Link>
                          </div>
                        )}
                        {pl.state === "placed" && problems.length === 0 && mayManage && (
                          <form action={markJoined}>
                            <input type="hidden" name="placementId" value={pl.id} />
                            <button className={pillSecondary + small}>They joined</button>
                          </form>
                        )}
                        {pl.dojHistory.length > 0 && <p className="t-small text-ink-3">Moved {pl.dojHistory.length} time{pl.dojHistory.length === 1 ? "" : "s"}</p>}
                        {(col.key === "joining" || col.key === "joined") && (
                          <div className="flex flex-wrap items-center gap-2">
                            {pl.nationalityConfirmedAt && pl.nationality ? (
                              <p className="t-small text-ink-2">
                                Nationality: <strong className="font-medium text-ink">{pl.nationality}</strong>{" "}
                                ({isExpat(pl.nationality) ? `Expat · ${feeMonthsFor(pl)} mo` : `Local · ${feeMonthsFor(pl)} mo`})
                              </p>
                            ) : (
                              <>
                                <p className="t-small text-warn">
                                  Nationality not confirmed{pl.nationalityFromCv ? ` (CV: ${pl.nationalityFromCv})` : ""}
                                </p>
                                {mayManage && (
                                  <Link scroll={false} href={open("confirm-nationality", pl.id)} className={pillSecondary + small}>
                                    Confirm nationality
                                  </Link>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        {guarantee && <p className="t-small text-brand">Guarantee day {guaranteeDay(guarantee, now, total(guarantee))} of {total(guarantee)}</p>}
                        {pl.state === "joined" && (
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="t-small text-ink-3">
                              Testimonial: candidate {pl.testimonial?.candidate ?? "pending"} · client {pl.testimonial?.client ?? "pending"}
                            </p>
                            {mayManage && (
                              <Link scroll={false} href={open("testimonial", pl.id)} className={pillSecondary + small}>
                                Testimonial
                              </Link>
                            )}
                          </div>
                        )}
                        {pl.state === "joined" &&
                          (invoice ? (
                            <Link href={`/invoices/${invoice.id}`} className="t-small text-ink-2 hover:text-brand">Invoice {invoice.number} · {statusWords(invoice, now)}</Link>
                          ) : pl.isReplacementOf ? (
                            <p className="t-small text-ink-3">A replacement: no new invoice</p>
                          ) : (
                            mayManage && (
                              <div className="flex flex-wrap items-center gap-2">
                                <form action={draftInvoiceForPlacement}>
                                  <input type="hidden" name="placementId" value={pl.id} />
                                  <input type="hidden" name="back" value={back} />
                                  <button className={pillSecondary + small}>Draft the invoice</button>
                                </form>
                                {/* 26 Nov (PR 3 review): a client with no billing details never gets an invoice row, so ask from the placement. */}
                                <form action={requestPaymentDetails}>
                                  <input type="hidden" name="placementId" value={pl.id} />
                                  <input type="hidden" name="back" value={back} />
                                  <button className={pillSecondary + small}>Ask the client for payment details</button>
                                </form>
                              </div>
                            )
                          ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {cards.some((x) => x.pl.dojHistory.length >= 2) && (
            <p className="t-small text-ink-3">
              {cards.filter((x) => x.pl.dojHistory.length >= 2).map((x) => x.pl.candidateName.split(" ")[0]).join(", ")} moved twice already: see the joining on the right.
            </p>
          )}
        </Card>

        <div className="flex w-full shrink-0 flex-col gap-5 pg-lg:w-[360px]">
          <div className="flex flex-col gap-3 rounded-[28px] bg-ink p-6">
            <p className="t-micro text-ink-3">Where it stands</p>
            <p className="t-h2 text-ink-inverse">{headline}</p>
            {lines.length > 0 && <p className="t-small text-ink-3">{lines.join(" ")}</p>}
            {message && (
              <div>
                <CopyButton text={message} label={`Copy the message to ${contactFirst}`} className="rounded-full bg-surface px-3.5 py-2 text-[12px] font-medium text-ink" />
              </div>
            )}
          </div>
          {rail && (
            <div className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
              <p className="t-micro text-ink-3">{rail.pl.candidateName.split(" ")[0]}&apos;s joining</p>
              <p className="t-small text-ink-3">
                {rail.pl.monthlySalary ? "Offer " + moneyWhole(rail.pl.monthlySalary, rail.pl.currency) : "Package not recorded yet"} · placed {shortDay(rail.pl.createdAt)}
              </p>
              <p className="t-micro text-ink-3">DOJ moves</p>
              {rail.pl.dojHistory.length === 0 && <p className="t-small text-ink-3">It has not moved.</p>}
              {rail.pl.dojHistory.map((m) => (
                <div key={m.at} className="flex flex-col gap-0.5">
                  <p className="t-body-m">{m.from ? shortDay(m.from) : "unset"} → {shortDay(m.to)}</p>
                  <p className="t-small text-ink-3">{m.reason}</p>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Link scroll={false} href={open("move-doj", rail.pl.id)} className={pillSecondary + small}>Move the DOJ</Link>
              </div>
              <form action={savePlacementPhone} className="flex flex-col gap-2 border-t border-rule pt-3">
                <input type="hidden" name="placementId" value={rail.pl.id} />
                <input type="hidden" name="back" value={`${path}?view=offer`} />
                <p className="t-micro text-ink-3">Candidate phone</p>
                <div className="flex gap-2">
                  <input name="candidatePhone" defaultValue={rail.pl.candidatePhone ?? ""} placeholder="077 123 4567" className={panelInput + " !py-1.5 !text-[13px]"} />
                  <button type="submit" className={pillSecondary + small + " shrink-0"}>Save</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
