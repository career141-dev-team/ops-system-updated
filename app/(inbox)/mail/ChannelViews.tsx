import Link from "next/link";

import { deleteTeamNote, markMailDone, postTeamNote } from "@/app/actions";
import Icon from "@/app/Icon";
import { EmptyState, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { groupByDay, type NewsItem, type WhatsAppView } from "@/lib/inboxChannels";
import { bubbleWhen, initialsOf, shortWhen } from "@/lib/myWork";
import CopyButton from "./CopyButton";

const row = "flex items-center gap-4 rounded-[22px] bg-surface px-[22px] py-[18px] shadow-card";

function Section({ tone, label, count }: { tone: "warn" | "info" | "ink"; label: string; count: number }) {
  const c = tone === "warn" ? ["bg-warn", "text-warn"] : tone === "info" ? ["bg-info", "text-info"] : ["bg-ink", "text-ink"];
  return (
    <div className="flex items-center gap-2.5 px-2 pb-1 pt-3.5">
      <span className={"size-2 rounded-[4px] " + c[0]} />
      <span className={"t-body-m " + c[1]}>{label}</span>
      <span className="t-small text-ink-3">{count}</span>
    </div>
  );
}

const bubble = (
  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-2">
    <Icon name="chat" size={18} />
  </span>
);

/** I2 (132:2). Ops cannot read or send WhatsApp: replies are recorded by a person, messages are copied by hand. */
export function WhatsAppPanel({ view, now }: { view: WhatsAppView; now: number }) {
  const { replies, ready } = view;
  if (replies.length === 0 && ready.length === 0) {
    return (
      <EmptyState icon="chat" title="Nothing on WhatsApp right now">
        No replies are waiting and no WhatsApp messages are waiting to be copied. Replies to the Ops number arrive here once WhatsApp is connected; a client's reply in their group is still recorded by hand, from the role page.
      </EmptyState>
    );
  }
  return (
    <div className="flex items-start gap-[22px]">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Section tone="warn" label="Replies on WhatsApp" count={replies.length} />
        {replies.length === 0 && <p className="t-small px-2 text-ink-3">No replies waiting.</p>}
        {replies.map((r) => (
          <div key={r.id} className={row}>
            {bubble}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="t-body-m">
                {r.who} <span className="t-small font-normal text-ink-3">{bubbleWhen(r.at, now)}</span>
              </p>
              <p className="t-body break-words">&ldquo;{r.quote}&rdquo;</p>
              {r.about && <span className="t-label self-start rounded-full bg-info-soft px-3 py-1 text-info">{r.about}</span>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {r.recordHref ? (
                <Link href={r.recordHref} className={pillPrimary + " !py-2"}>Open</Link>
              ) : (
                <span title="Not filed to anybody yet: the number is not one we know" className={pillSecondary + " !py-2 opacity-50"}>Open</span>
              )}
              <form action={markMailDone}>
                <input type="hidden" name="inboundId" value={r.inboundId} />
                <input type="hidden" name="back" value="/mail?view=whatsapp" />
                <SubmitButton id={"wa-done-" + r.id} className={pillSecondary + " !py-1.5"}>Done</SubmitButton>
              </form>
            </div>
          </div>
        ))}
        <Section tone="info" label="Messages ready to copy" count={ready.length} />
        {ready.length === 0 && <p className="t-small px-2 text-ink-3">Nothing waiting to be copied.</p>}
        {ready.map((m) => (
          <div key={m.id} className={row}>
            {bubble}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="t-body-m">
                {m.who} <span className="t-small font-normal text-ink-3">{shortWhen(m.at, now)}</span>
              </p>
              <p className="t-body whitespace-pre-wrap break-words">{m.text}</p>
              <span className={"t-label self-start rounded-full px-3 py-1 " + (m.state === "approved" ? "bg-bg-ok text-success" : "bg-sunk text-ink-2")}>
                {m.state === "approved" ? "Approved" : "Draft: waits for approval"}
              </span>
            </div>
            <CopyButton text={m.text} />
          </div>
        ))}
      </div>
      <aside className="flex w-[300px] shrink-0 flex-col gap-4">
        <div className="flex flex-col gap-1.5 rounded-[22px] bg-ink px-5 py-5 text-ink-inverse">
          <p className="t-micro opacity-70">WAITING FOR YOU</p>
          <p className="t-h2">{replies.length} {replies.length === 1 ? "reply" : "replies"} to read</p>
        </div>
        <p className="rounded-[22px] bg-surface px-5 py-5 t-body shadow-card">A message to the Ops number is filed to whose number it is. A client&apos;s group chat cannot be read: record that reply by hand.</p>
      </aside>
    </div>
  );
}

const TONE = { good: "bg-bg-ok text-success", info: "bg-info-soft text-info", warn: "bg-warn-soft text-warn" } as const;

/** I3 (133:384). Posted team notes merged with desk milestones; authors can delete their own note (22 Nov). */
export function NewsPanel({ items, now, name, memberId, mayModerate = false }: { items: NewsItem[]; now: number; name: string; memberId: string; mayModerate?: boolean }) {
  const days = groupByDay(items);
  const dayLabel = (d: string) => {
    const today = new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10);
    const days = Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  };
  return (
    <div className="flex items-start gap-[22px]">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <form action={postTeamNote} className="flex items-center gap-4 rounded-[28px] bg-surface p-[18px] shadow-card">
          <input type="hidden" name="back" value="/mail?view=news" />
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft t-label text-brand">{initialsOf(name)}</span>
          <input name="body" required minLength={2} maxLength={500} aria-label="Write a note to the team" placeholder="Write a note to the team" className="min-w-0 flex-1 rounded-full bg-sunk px-4 py-3 t-body outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink/20" />
          <SubmitButton id="post-note" className={pillPrimary + " !py-2"}>Post</SubmitButton>
        </form>
        {days.length === 0 ? (
          <EmptyState icon="bell" title="No team news yet">
            Signed agreements, booked interviews, placements, and team notes will appear here as they happen.
          </EmptyState>
        ) : (
          days.map((g) => (
            <div key={g.day} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5 px-2 pb-1 pt-3.5">
                <span className="size-2 rounded-[4px] bg-ink" />
                <span className="t-body-m">{dayLabel(g.day)}</span>
                <span className="t-small text-ink-3">{g.items.length}</span>
              </div>
              {g.items.map((n) => (
                <div key={n.id} className={row}>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sunk t-body-m text-ink-2">{initialsOf(n.by)}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="flex items-center gap-2">
                      <span className={"t-label rounded-full px-2.5 py-0.5 " + TONE[n.tone]}>{n.kind}</span>
                      <span className="t-small text-ink-3">{n.by} · {bubbleWhen(n.at, now)}</span>
                    </p>
                    <p className="t-body-m">{n.text}</p>
                    {n.about && (n.href ? <Link href={n.href} className="t-small text-brand hover:underline">{n.about}</Link> : <span className="t-small text-brand">{n.about}</span>)}
                  </div>
                  {(n.authorId === memberId || mayModerate) && n.authorId && (
                    <form action={deleteTeamNote}>
                      <input type="hidden" name="back" value="/mail?view=news" />
                      <input type="hidden" name="id" value={n.id} />
                      <SubmitButton id={"del-" + n.id} aria-label={"Delete note: " + n.text.slice(0, 40)} className={pillSecondary + " !py-1.5"}>Delete</SubmitButton>
                    </form>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <aside className="flex w-[300px] shrink-0 flex-col gap-3 rounded-[22px] bg-surface p-5 shadow-card">
        <p className="t-micro text-ink-3">FOLLOW</p>
        {[
          ["My clients", "Their events show here"],
          ["All", "Every client and role"],
          ["Placements only", "Joining"],
        ].map(([t, s]) => (
          <div key={t} className="flex items-center gap-3" title="not connected yet: the team feed is not stored">
            <div className="flex-1">
              <p className="t-body-m">{t}</p>
              <p className="t-small text-ink-3">{s}</p>
            </div>
            <span aria-disabled className="h-6 w-10 rounded-full bg-sunk opacity-60" />
          </div>
        ))}
      </aside>
    </div>
  );
}
