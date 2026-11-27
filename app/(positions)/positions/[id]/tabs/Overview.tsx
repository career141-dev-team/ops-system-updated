import Link from "next/link";

import Icon from "@/app/Icon";
import { Card } from "@/app/ui/figma";
import { panelHref } from "@/lib/panel";
import { awaiting, unanswered } from "@/lib/setsBoard";

import type { TabProps } from "./ctx";
import HoldPanel from "./overview/HoldPanel";
import NotPracticalPanel from "./overview/NotPracticalPanel";
import OpeningAdmin from "./overview/OpeningAdmin";
import { clock, dayKey, dayMonth, weekdayDayMonth } from "./shared/fmt";

const DAY = 86_400_000;
const smallBtn = "inline-flex shrink-0 items-center rounded-full px-3 py-[7px] text-[13px] font-medium leading-5 ";
const dark = smallBtn + "bg-ink text-ink-inverse";
const light = smallBtn + "border border-rule bg-surface text-ink hover:bg-sunk";

type Need = { key: string; tone: "warn" | "danger"; label: string; who: string; text: string; cta: string; href: string; primary?: boolean };
type Person = { key: string; name: string; line: string; status?: string; statusTone?: "ok" | "warn" | "danger" | "info" };

/** R0, the role's overview (frame 124:89): what needs you, where each person is, the week, the latest. */
export default function Overview({ c, sp }: TabProps) {
  const { db, position, now, client, itsInterviews, itsSets, waitingSet, itsPlacements, numbers: n, history, allCandidates } = c;
  const path = `/positions/${position.id}`;
  const open = (view: string, panel: string, on?: string) => panelHref(path, { view }, panel, on);
  const live = itsInterviews.filter((iv) => ["slots", "agreed", "booked", "reconfirmed"].includes(iv.state));
  const today = dayKey(now);
  const missingAddress = !(client?.billingAddress ?? "").trim();

  // Needs you: only what the desk can show is waiting, each with the button that does it.
  const needs: Need[] = [];
  for (const iv of live.filter((x) => x.at === null)) {
    needs.push({
      key: "t" + iv.id,
      tone: "warn",
      label: "Needs a time",
      who: iv.candidateName,
      text: `Round ${iv.round}. ${iv.slots.length ? "Times were offered, pick one and book it." : "Ask for times, then book one."}`,
      cta: "Find a time",
      href: open("interviews", "find-a-time", iv.id),
      primary: true,
    });
  }
  if (waitingSet) {
    const day = waitingSet.sentAt ? Math.floor((now - waitingSet.sentAt) / DAY) + 1 : 1;
    const silent = awaiting(waitingSet);
    needs.push({
      key: "s" + waitingSet.id,
      tone: "warn",
      label: "No answer",
      who: `SET ${waitingSet.setNumber} · day ${day}`,
      text: `${silent} ${silent === 1 ? "person has" : "people have"} no answer from the client.`,
      cta: "Copy a chase",
      href: open("sets", "chase-client", waitingSet.id),
    });
  }
  if (missingAddress) {
    for (const pl of itsPlacements.filter((p) => p.state === "placed")) {
      needs.push({
        key: "a" + pl.id,
        tone: "danger",
        label: "Missing",
        who: pl.candidateName,
        text: `The invoice address is missing.${pl.joinDate ? ` DOJ is ${dayMonth(pl.joinDate)}.` : ""}`,
        cta: "Record the address",
        href: open("offer", "record-address", pl.id),
      });
    }
  }
  for (const iv of live.filter((x) => x.at !== null && dayKey(x.at as number) === today && x.state === "booked")) {
    needs.push({
      key: "r" + iv.id,
      tone: "warn",
      label: "Today",
      who: iv.candidateName,
      text: `Round ${iv.round} ${weekdayDayMonth(iv.at as number)}, ${clock(iv.at as number)}. Not reconfirmed yet.`,
      cta: "Reconfirmed",
      href: open("interviews", "reconfirm", iv.id),
    });
  }

  // Where each person is now.
  const sentSetIds = new Set(itsSets.filter((s) => s.state === "sent").map((s) => s.id));
  const taShortlist: Person[] = allCandidates
    .filter((cand) => (cand.level === "found" || cand.level === "internal") && (!cand.setId || !sentSetIds.has(cand.setId)))
    .map((cand) => ({
      key: "ta-" + cand.id,
      name: cand.name,
      line: cand.setName ? `${cand.setName} · ready for Ops` : cand.statusLabel || "TA shortlisted",
      status: cand.setName ? "Ready to send" : "TA shortlist",
      statusTone: cand.setName ? "warn" : "info",
    }));
  const ivOf = (name: string) => live.find((iv) => iv.candidateName.toLowerCase() === name.toLowerCase());
  const withClient: Person[] = itsSets
    .filter((s) => s.state === "sent")
    .flatMap((s) =>
      s.candidates
        .filter((x) => x.decision !== "rejected")
        .map((x): Person => {
          const iv = ivOf(x.name);
          return {
            key: s.id + x.applicationTaId,
            name: x.name,
            line: `SET ${s.setNumber} · ${unanswered(x) ? "waiting for an answer" : (x.decision ?? "client already had this CV")}`,
            status: iv ? (iv.at ? `Round ${iv.round} booked ${weekdayDayMonth(iv.at)}` : "Needs a time") : undefined,
            statusTone: iv ? (iv.at ? "info" : "warn") : undefined,
          };
        }),
    );
  const toIvPerson = (iv: (typeof live)[number]): Person => ({
    key: iv.id,
    name: iv.candidateName,
    line: `Round ${iv.round}${iv.at ? " · " + weekdayDayMonth(iv.at) : ""}`,
    status: iv.at === null ? "Needs a time" : dayKey(iv.at) === today && iv.state === "booked" ? "Reconfirm today" : `Booked ${clock(iv.at)}`,
    statusTone: iv.at === null || iv.state === "booked" ? "warn" : "info",
  });
  const interview1: Person[] = live.filter((iv) => iv.round === 1).map(toIvPerson);
  const interview2: Person[] = live.filter((iv) => iv.round === 2).map(toIvPerson);
  const interview3: Person[] = live.filter((iv) => iv.round >= 3).map(toIvPerson);
  const offer: Person[] = itsPlacements.filter((p) => p.state === "placed" && p.joinDate === null).map((p) => ({ key: p.id, name: p.candidateName, line: "Offer made" }));
  const joining: Person[] = itsPlacements
    .filter((p) => p.state === "placed" && p.joinDate !== null)
    .map((p) => ({
      key: p.id,
      name: p.candidateName,
      line: `DOJ ${dayMonth(p.joinDate as number)}`,
      status: missingAddress ? "Invoice address missing" : undefined,
      statusTone: "danger",
    }));
  const guarantee: Person[] = db.guarantees
    .filter((g) => itsPlacements.some((p) => p.id === g.placementId) && ["running", "warned", "replacing"].includes(g.state))
    .map((g) => ({
      key: g.id,
      name: g.candidateName,
      line: `Joined ${dayMonth(g.startsAt)}`,
      status: `Day ${Math.max(1, Math.floor((now - g.startsAt) / DAY) + 1)} of ${Math.max(1, Math.round((g.endsAt - g.startsAt) / DAY))}`,
      statusTone: "ok",
    }));
  const columns = [
    { label: "TA", dot: "bg-ink-3", people: taShortlist, href: `${path}?view=sets` },
    { label: "Sets", dot: "bg-info", people: withClient, href: `${path}?view=sets` },
    { label: "Interview 1", dot: "bg-warn", people: interview1, href: `${path}?view=interviews` },
    { label: "Interview 2", dot: "bg-warn", people: interview2, href: `${path}?view=interviews` },
    { label: "Interview 3", dot: "bg-warn", people: interview3, href: `${path}?view=interviews` },
    { label: "Offer", dot: "bg-brand", people: offer, href: `${path}?view=offer` },
    { label: "Joining", dot: "bg-info", people: joining, href: `${path}?view=offer` },
    { label: "Guarantee", dot: "bg-brand", people: guarantee, href: `${path}?view=guarantee` },
  ];
  const toneCls = { ok: "text-brand", warn: "text-warn", danger: "text-danger", info: "text-info" };

  // This week (Mon to Sat, Colombo): the days, and the interviews in them.
  const nowLocal = new Date(now + 5.5 * 3_600_000);
  const monday = Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate() - ((nowLocal.getUTCDay() + 6) % 7)) - 5.5 * 3_600_000;
  const days = Array.from({ length: 6 }, (_, i) => monday + i * DAY);
  const weekIvs = live.filter((iv) => iv.at !== null && (iv.at as number) >= monday && (iv.at as number) < monday + 7 * DAY).sort((a, b) => (a.at as number) - (b.at as number));
  const unbooked = live.filter((iv) => iv.at === null);

  // Latest: the newest four lines of the history, in words.
  const latest = history.flatMap((g) => g.entries).slice(0, 4);

  const standsHead = n.placed.of ? `${n.placed.done} of ${n.placed.of} placed.` : n.placed.done ? `${n.placed.done} placed.` : "Nobody placed yet.";
  const standsBody = [
    n.placed.of && n.placed.done < n.placed.of ? `${n.placed.of - n.placed.done} more to go.` : null,
    waitingSet ? `SET ${waitingSet.setNumber} is on day ${waitingSet.sentAt ? Math.floor((now - waitingSet.sentAt) / DAY) + 1 : 1} with ${awaiting(waitingSet)} not answered.` : null,
    c.step.waiting,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="flex flex-col gap-[22px] pg-xl:flex-row pg-xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[22px]">
          <Card title="Needs you" sub={needs.length ? `${needs.length} ${needs.length === 1 ? "thing waits" : "things wait"} on you today.` : "Nothing waits on you today."}>
            {needs.length === 0 ? (
              <p className="t-body rounded-[18px] bg-sunk px-6 py-5 text-ink-3">Nothing is waiting on you for this role.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {needs.map((x) => (
                  <div key={x.key} className="flex items-center gap-4 rounded-[18px] bg-sunk px-[18px] py-4 max-md:gap-3 max-md:rounded-none max-md:bg-transparent max-md:px-0 max-md:py-3 max-md:[&:not(:first-child)]:border-t max-md:border-rule">
                    <span className={"flex w-[120px] shrink-0 items-center gap-2 text-[13px] font-medium max-md:hidden " + (x.tone === "danger" ? "text-danger" : "text-warn")}>
                      <span aria-hidden className={"size-2 rounded-full " + (x.tone === "danger" ? "bg-danger" : "bg-warn")} />
                      {x.label}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="t-body-m">{x.who}</span>
                      <span className="t-small text-ink-2">{x.text}</span>
                    </span>
                    <Link scroll={false} href={x.href} className={x.primary ? dark : light}>
                      {x.cta}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="max-md:hidden"><Card title="Where each person is now">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {columns.map((col) => (
                <div key={col.label} className="flex w-[220px] shrink-0 flex-col gap-2.5 self-start rounded-[18px] bg-sunk p-3">
                  <Link href={col.href} className="flex items-center gap-2 px-1 py-0.5">
                    <span aria-hidden className={"size-2 rounded-full " + col.dot} />
                    <span className="t-body-m flex-1">{col.label}</span>
                    <span className="t-small text-ink-3">{col.people.length}</span>
                  </Link>
                  {col.people.length === 0 ? (
                    <p className="t-small rounded-[12px] border border-rule px-3 py-2.5 text-ink-3">None now</p>
                  ) : (
                    col.people.slice(0, 2).map((p) => (
                      <div key={p.key} className="flex flex-col gap-0.5 rounded-[14px] bg-surface px-3.5 py-3">
                        <span className="t-body-m">{p.name}</span>
                        <span className="t-small text-ink-3">{p.line}</span>
                        {p.status && <span className={"t-small " + toneCls[p.statusTone ?? "info"]}>{p.status}</span>}
                      </div>
                    ))
                  )}
                  {col.people.length > 2 && (
                    <Link href={col.href} className="t-small px-1 text-ink-3 hover:text-ink">
                      {col.people.length - 2} more
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </Card></div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-[18px] max-md:hidden pg-xl:w-[380px]">
          <section className="flex flex-col gap-3 rounded-[28px] bg-ink px-6 py-[22px] text-ink-inverse shadow-card">
            <p className="t-micro flex items-center gap-2 text-ink-faint">
              <Icon name="sparkle" size={13} />
              WHERE IT STANDS
            </p>
            <h2 className="t-h2 text-ink-inverse">{standsHead}</h2>
            {standsBody && <p className="t-small text-ink-faint">{standsBody}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href={`${path}?view=sets`} className="inline-flex rounded-full bg-surface px-3.5 py-2 text-[13px] font-medium leading-5 text-ink">
                {waitingSet ? `Open SET ${waitingSet.setNumber}` : "Open the sets"}
              </Link>
              {waitingSet && (
                <Link scroll={false} href={open("sets", "chase-client", waitingSet.id)} className="inline-flex rounded-full border border-ink-faint px-3.5 py-2 text-[13px] font-medium leading-5 text-ink-inverse">
                  Copy a chase
                </Link>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
            <p className="t-micro text-ink-3">THIS WEEK</p>
            <div className="grid grid-cols-6 gap-1.5">
              {days.map((d) => {
                const isToday = dayKey(d) === today;
                const has = weekIvs.some((iv) => dayKey(iv.at as number) === dayKey(d));
                return (
                  <div key={d} className={"flex flex-col items-center rounded-[10px] border py-1.5 " + (isToday ? "border-transparent bg-bg-brand" : "border-rule")}>
                    <span className="t-micro text-ink-3">{new Date(d + 5.5 * 3_600_000).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</span>
                    <span className="t-body-m">{new Date(d + 5.5 * 3_600_000).getUTCDate()}</span>
                    <span aria-hidden className={"mt-0.5 size-[5px] rounded-full " + (has ? "bg-brand" : "bg-transparent")} />
                  </div>
                );
              })}
            </div>
            {weekIvs.map((iv) => (
              <div key={iv.id} className="flex gap-3 rounded-[12px] bg-info-soft px-3 py-2.5">
                <span aria-hidden className="w-[3px] shrink-0 self-stretch rounded-sm bg-info" />
                <span className="t-small w-[72px] shrink-0 text-info">
                  {weekdayDayMonth(iv.at as number).split(" ")[0]} {clock(iv.at as number)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="t-body-m">{iv.candidateName}</span>
                  <span className="t-small text-ink-3">
                    Round {iv.round}
                    {iv.format ? " · " + iv.format : ""}
                  </span>
                </span>
              </div>
            ))}
            {unbooked.map((iv) => (
              <div key={iv.id} className="flex gap-3 rounded-[12px] bg-warn-soft px-3 py-2.5">
                <span aria-hidden className="w-[3px] shrink-0 self-stretch rounded-sm bg-warn" />
                <span className="t-small w-[72px] shrink-0 text-warn">Not booked</span>
                <span className="flex min-w-0 flex-col">
                  <span className="t-body-m">{iv.candidateName}</span>
                  <span className="t-small text-ink-3">{iv.slots.length ? iv.slots.map((s) => `${weekdayDayMonth(s)} ${clock(s)}`).join(" or ") + " offered" : "No times yet"}</span>
                </span>
              </div>
            ))}
            {weekIvs.length + unbooked.length === 0 && <p className="t-small text-ink-3">No interviews this week.</p>}
          </section>

          <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
            <p className="t-micro text-ink-3">LATEST</p>
            {latest.length === 0 ? (
              <p className="t-small text-ink-3">Nothing recorded yet.</p>
            ) : (
              latest.map((e) => (
                <div key={e.id} className="flex items-baseline gap-3">
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink-faint" />
                  <span className="t-small w-[60px] shrink-0 text-ink-3">{dayKey(e.at) === today ? clock(e.at) : dayMonth(e.at)}</span>
                  <span className="t-small text-ink">{e.said}</span>
                </div>
              ))
            )}
            <Link href={`${path}?view=history`} className="t-small text-brand hover:underline">
              Open the history
            </Link>
          </section>
        </aside>
      </div>

      <OpeningAdmin c={c} open={sp.open === "admin"} />

      {sp.panel === "hold-close-reopen" && <HoldPanel c={c} sp={sp} />}
      {sp.panel === "not-practical" && <NotPracticalPanel c={c} sp={sp} />}
    </>
  );
}
