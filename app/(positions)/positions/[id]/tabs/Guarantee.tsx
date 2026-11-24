import Link from "next/link";

import { recordLeaver } from "@/app/actions";
import { Card, EmptyState, PanelField, panelInput, pillSecondary } from "@/app/ui/figma";
import { colomboDate } from "@/lib/calendar";
import { REFUND_PCT, REPLACEMENT_WORKING_DAYS, WARN_DAY } from "@/lib/guarantee";
import { guaranteeColumn, guaranteeDay, type GuaranteeColumn } from "@/lib/offerBoard";
import { closeHref, panelHref } from "@/lib/panel";
import { can } from "@/lib/roles";

import type { TabProps } from "./ctx";
import { clientPeople, shortDay } from "./offer/panels";
import ActionPanel from "./offer/PanelKit";
import ReasonField from "./offer/ReasonField";

const DAY = 86_400_000;
const small = " !px-3 !py-[7px] !text-[12px] !leading-4";

const COLUMNS: { key: GuaranteeColumn; title: string; dot: string; none: string }[] = [
  { key: "in", title: "In guarantee", dot: "bg-brand", none: "None now" },
  { key: "call", title: `Day ${WARN_DAY} call due`, dot: "bg-warn", none: "None now" },
  { key: "leaver", title: "Leaver: replacing", dot: "bg-danger", none: "None now" },
  { key: "ended", title: "Ended", dot: "bg-ink-3", none: "None this year on this role" },
];

export default function Guarantee({ c, sp }: TabProps) {
  const { db, itsPlacements, now } = c;
  const path = `/positions/${c.position.id}`;
  const rows = itsPlacements
    .map((pl) => ({ pl, g: db.guarantees.find((row) => row.placementId === pl.id) ?? null }))
    .filter((row): row is { pl: (typeof itsPlacements)[number]; g: NonNullable<(typeof row)["g"]> } => Boolean(row.g))
    .map((row) => ({ ...row, col: guaranteeColumn(row.g, now), total: Math.max(1, Math.round((row.g.endsAt - row.g.startsAt) / DAY)) }));
  const mayManage = can(c.me, "client.manage");

  const live = rows.filter((r) => r.col === "in" || r.col === "call");
  const left = rows.filter((r) => r.col === "leaver");
  const headline = rows.length === 0 ? "Nobody is under guarantee yet." : live.length + (live.length === 1 ? " person" : " people") + " under guarantee.";
  const lines = [
    ...live.map(
      (r) =>
        `${r.pl.candidateName} is on day ${guaranteeDay(r.g, now, r.total)} of ${r.total}. The guarantee ends ${shortDay(r.g.endsAt)}; the day ${WARN_DAY} call is on ${shortDay(r.g.startsAt + WARN_DAY * DAY)}.`,
    ),
    rows.length === 0 ? `A guarantee starts the day a placed person joins.` : left.length === 0 ? "Nobody has left." : left.map((r) => r.pl.candidateName).join(", ") + " has left.",
  ];

  const panelOn = sp.panel === "record-leaver" ? (rows.find((r) => r.g.id === sp.on || r.pl.id === sp.on) ?? rows.find((r) => r.col === "in" || r.col === "call")) : null;
  const first = live[0] ?? null;

  return (
    <>
      {panelOn && (
        <ActionPanel
          kicker="Record a leaver"
          title={`${panelOn.pl.candidateName} is leaving ${c.clientName}`}
          sub={`${c.clientName} > ${c.position.title} > Joined ${shortDay(panelOn.g.startsAt)} > Guarantee day ${guaranteeDay(panelOn.g, now, panelOn.total)} of ${panelOn.total}`}
          closeHref={closeHref(path, sp)}
          why={[
            `${panelOn.pl.candidateName.split(" ")[0]} joined on ${shortDay(panelOn.g.startsAt)} and the guarantee runs ${panelOn.total} days, to ${shortDay(panelOn.g.endsAt)}`,
            panelOn.g.feePaidAt ? "The fee is paid in full, so a replacement or a refund is owed" : "The fee is not paid in full, so the guarantee does not apply and nothing is replaced or refunded",
            `A replacement search has ${REPLACEMENT_WORKING_DAYS} working days; a refund is ${REFUND_PCT}% and only the Director of Operations decides it`,
          ]}
          people={clientPeople(c)}
          askTitle={`What to ask ${(c.client?.contacts?.[0]?.name ?? c.clientName).split(" ")[0]}`}
          ask="What is their last day? Why are they leaving? Do you want a replacement search?"
          hidden={{ guaranteeId: panelOn.g.id }}
          next={`A replacement search opens with the same TA and the ${REPLACEMENT_WORKING_DAYS} working day clock starts on the day they left. If nobody is placed by then, the ${REFUND_PCT}% refund goes to the Director to decide. The TA is told either way.`}
          action={recordLeaver}
          blocked={!mayManage ? "Only a client manager can record a leaver." : undefined}
        >
          <PanelField label="Leaving date">
            <input type="date" name="leftAt" required defaultValue={colomboDate(now)} max={colomboDate(now)} className={panelInput} />
          </PanelField>
          <ReasonField
            label="Reason"
            who={["The client", "The candidate", "Found by us"]}
            whoLabel="Who told us"
            chips={["Resigned", "Client ended it", "Did not fit the role", "Better offer", "Personal or family", "Other"]}
            placeholder="If Other, write it here"
          />
        </ActionPanel>
      )}
      <div className="flex flex-col items-start gap-[22px] pg-lg:flex-row">
        <Card title="Guarantee" sub={`Each person placed stays under guarantee for ${rows[0]?.total ?? 90} days.`} className="w-full min-w-0 flex-1">
          {rows.length === 0 ? (
            <EmptyState title="No guarantee yet">One starts when somebody placed on this role joins.</EmptyState>
          ) : (
            <div className="flex flex-col gap-[14px] md:flex-row">
              {COLUMNS.map((col) => {
                const list = rows.filter((r) => r.col === col.key);
                return (
                  <div key={col.key} className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-[20px] bg-surface-2 px-3 py-3.5">
                    <div className="flex items-center gap-2 px-1 pb-0.5">
                      <span className={"size-2 rounded-[4px] " + col.dot} />
                      <p className="t-body-m flex-1">{col.title}</p>
                      <p className="t-small text-ink-3">{list.length}</p>
                    </div>
                    {list.length === 0 && <div className="t-small rounded-[14px] border border-rule p-3.5 text-ink-3">{col.none}</div>}
                    {list.map(({ pl, g, total }) => (
                      <div key={g.id} className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-3.5">
                        <p className="t-body-m">{pl.candidateName}</p>
                        {col.key === "leaver" ? (
                          <p className="t-small text-ink-3">{g.leftAt ? "Left " + shortDay(g.leftAt) + " · " : ""}{g.deadlineAt ? "replacement by " + shortDay(g.deadlineAt) : "being replaced"}</p>
                        ) : col.key === "ended" ? (
                          <p className="t-small text-ink-3">Ended {shortDay(g.endsAt)}</p>
                        ) : (
                          <>
                            <p className="t-small text-ink-3">Joined {shortDay(g.startsAt)} · day {guaranteeDay(g, now, total)} of {total}</p>
                            <p className="t-small text-ink-3">Ends {shortDay(g.endsAt)} · day {WARN_DAY} call {shortDay(g.startsAt + WARN_DAY * DAY)}</p>
                          </>
                        )}
                        {(col.key === "in" || col.key === "call") && mayManage && (
                          <div className="pt-1">
                            <Link scroll={false} href={panelHref(path, sp, "record-leaver", g.id)} className={pillSecondary + small}>Record a leaver</Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="flex w-full shrink-0 flex-col gap-5 pg-lg:w-[360px]">
          <div className="flex flex-col gap-3 rounded-[28px] bg-ink p-6">
            <p className="t-micro text-ink-3">Where it stands</p>
            <p className="t-h2 text-ink-inverse">{headline}</p>
            <p className="t-small text-ink-3">{lines.join(" ")}</p>
            {first && (
              <div>
                <Link href={`/positions/${c.position.id}?view=offer`} className="inline-flex rounded-full bg-surface px-3.5 py-2 text-[12px] font-medium text-ink">
                  Open {first.pl.candidateName.split(" ")[0]}
                </Link>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
            <p className="t-micro text-ink-3">If a person leaves</p>
            {[
              ["Record the leaver", null],
              [`Within ${REPLACEMENT_WORKING_DAYS} working days`, `Replacement search with TA, or refund ${REFUND_PCT}%.`],
              ["The Director of Operations decides by email", "Then you record the answer."],
            ].map(([title, text], i) => (
              <div key={title} className="flex gap-3">
                <span className="t-label flex size-[26px] shrink-0 items-center justify-center rounded-full bg-surface-2">{i + 1}</span>
                <div>
                  <p className="t-body-m">{title}</p>
                  {text && <p className="t-small text-ink-3">{text}</p>}
                </div>
              </div>
            ))}
            <div>
              <Link href="/invoices/payment?panel=refund-decision" className={pillSecondary + small}>Record the answer</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
