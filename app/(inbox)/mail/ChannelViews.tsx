import Link from "next/link";

import { deleteTeamNote, markMailDone, postTeamNote } from "@/app/actions";
import Icon from "@/app/Icon";
import { EmptyState, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { groupByDay, type NewsItem, type WhatsAppView } from "@/lib/inboxChannels";
import { bubbleWhen, initialsOf, shortWhen } from "@/lib/myWork";
import { clockOf } from "@/lib/myWorkView";
import CopyButton from "./CopyButton";

const row = "flex items-center gap-4 rounded-[22px] inbox-item bg-surface px-[22px] py-[18px]";

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
  <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-sunk text-ink-2">
    <Icon name="chat" size={20} />
  </span>
);

/** The small tag under a card: a soft pill with a dot in the same colour (I2). */
const TAG = {
  info: ["bg-info-soft text-info", "bg-info"],
  warn: ["bg-warn-soft text-warn", "bg-warn"],
  ok: ["bg-brand-soft text-brand", "bg-brand"],
  ink: ["bg-sunk text-ink-2", "bg-ink-2"],
} as const;
function Tag({ tone, children }: { tone: keyof typeof TAG; children: React.ReactNode }) {
  return (
    <span className={"t-label flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 " + TAG[tone][0]}>
      <span aria-hidden="true" className={"size-1.5 rounded-[3px] " + TAG[tone][1]} />
      {children}
    </span>
  );
}

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
    <div className="flex items-start gap-[22px] max-pg-lg:flex-col">
      <div className="flex min-w-0 flex-1 flex-col gap-3 max-pg-lg:w-full">
        <Section tone="warn" label="Client replies to record" count={replies.length} />
        {replies.length === 0 && <p className="t-small px-2 text-ink-3">No replies waiting.</p>}
        {replies.map((r, i) => (
          <div key={r.id} className={row}>
            {bubble}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="flex items-center gap-2">
                <span className="t-body-m">{r.who}</span>
                <span className="t-small text-ink-3">{bubbleWhen(r.at, now)}</span>
              </p>
              <p className="t-body break-words">&ldquo;{r.quote}&rdquo;</p>
              {r.about && (
                <div className="pt-1">
                  <Tag tone="info">{r.about}</Tag>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <form action={markMailDone}>
                <input type="hidden" name="inboundId" value={r.inboundId} />
                <input type="hidden" name="back" value="/mail?view=whatsapp" />
                <SubmitButton id={"wa-done-" + r.id} className="t-label rounded-full px-2 py-[7px] text-ink-3 hover:text-ink">Done</SubmitButton>
              </form>
              {r.recordHref ? (
                <Link href={r.recordHref} className={(i === 0 ? "bg-ink text-ink-inverse" : "border border-rule bg-surface text-ink hover:bg-sunk") + " t-label rounded-full px-3 py-[7px]"}>
                  Record
                </Link>
              ) : (
                <span title="Not filed to anybody yet: the number is not one we know" className="t-label rounded-full border border-rule bg-surface px-3 py-[7px] text-ink opacity-50">Record</span>
              )}
            </div>
          </div>
        ))}
        <Section tone="info" label="Messages ready to copy" count={ready.length} />
        {ready.length === 0 && <p className="t-small px-2 text-ink-3">Nothing waiting to be copied.</p>}
        {ready.map((m) => (
          <div key={m.id} className={row}>
            {bubble}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="flex items-center gap-2">
                <span className="t-body-m">{m.who}</span>
                <span className="t-small text-ink-3">{m.label || shortWhen(m.at, now)}</span>
              </p>
              <p className="t-body whitespace-pre-wrap break-words">{m.text}</p>
              <div className="pt-1">
                {m.state === "approved" ? <Tag tone="ok">Drafted {clockOf(m.at)}, approved</Tag> : <Tag tone="ink">Draft: waits for approval</Tag>}
              </div>
            </div>
            <CopyButton text={m.text} />
          </div>
        ))}
      </div>
      <aside className="flex w-[360px] shrink-0 flex-col gap-5 max-pg-lg:w-full">
        <div className="flex flex-col gap-2.5 rounded-[28px] bg-ink p-6 text-ink-inverse">
          <p className="t-micro flex items-center gap-2 text-ink-3">
            <Icon name="chat" size={16} />
            Waiting for you
          </p>
          <p className="t-h2">{replies.length} {replies.length === 1 ? "reply" : "replies"} to record</p>
          <p className="t-small text-ink-3">
            {replies.length === 0 ? "No client has written in a group." : "These clients have written in their groups or to the Ops number."}
          </p>
        </div>
        <p className="rounded-[28px] inbox-item bg-surface px-6 py-[22px] t-body text-ink-2">The system cannot read WhatsApp. Record each client reply here.</p>
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
    <div className="flex items-start gap-[22px] max-pg-lg:flex-col">
      <div className="flex min-w-0 flex-1 flex-col gap-3 max-pg-lg:w-full">
        <form action={postTeamNote} className="flex items-center gap-4 rounded-[22px] inbox-item bg-surface px-[22px] py-[18px]">
          <input type="hidden" name="back" value="/mail?view=news" />
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft t-body-m text-brand">{initialsOf(name)}</span>
          <input name="body" required minLength={2} maxLength={500} aria-label="Write a note to the team" placeholder="Write a note to the team" className="min-w-0 flex-1 h-11 rounded-full bg-sunk px-[18px] t-body outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink/20" />
          <SubmitButton id="post-note" className="t-label rounded-full bg-ink px-3 py-[7px] text-ink-inverse">Post</SubmitButton>
        </form>
        {days.length === 0 ? (
          <EmptyState icon="bell" title="No team news yet">
            Signed agreements, booked interviews, placements, and team notes will appear here as they happen.
          </EmptyState>
        ) : (
          days.map((g) => (
            <div key={g.day} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5 px-2 pb-1 pt-3.5">
                <span className="size-2 rounded-[4px] bg-ink-2" />
                <span className="t-body-m text-ink-2">{dayLabel(g.day)}</span>
                <span className="t-small text-ink-3">{g.items.length}</span>
              </div>
              {g.items.map((n) => (
                <div key={n.id} className="flex items-start gap-4 rounded-[22px] inbox-item bg-surface px-[22px] py-[18px]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sunk t-body-m text-ink-2">{initialsOf(n.by)}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="flex items-center gap-2.5">
                      <span className={"t-label flex items-center gap-1.5 rounded-full px-2.5 py-1 " + TONE[n.tone]}>
                        <span aria-hidden="true" className="size-1.5 rounded-[3px] bg-current" />
                        {n.kind}
                      </span>
                      <span className="t-small text-ink-3">{n.by} · {bubbleWhen(n.at, now)}</span>
                    </p>
                    <p className="t-body-m">{n.text}</p>
                    {n.about && (
                      <p className="t-small flex items-center gap-1.5 text-brand">
                        <Icon name="link" size={14} />
                        {n.href ? <Link href={n.href} className="hover:underline">{n.about}</Link> : n.about}
                      </p>
                    )}
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
      <aside className="flex w-[360px] shrink-0 flex-col gap-3 rounded-[28px] inbox-item bg-surface px-6 py-[22px] max-pg-lg:w-full">
        <p className="t-micro text-ink-3">FOLLOW</p>
        {[
          ["My clients", "Their events show here", true],
          ["All", "Every client and role", false],
          ["Placements only", "Joining", false],
        ].map(([t, sub, on]) => (
          <div key={String(t)} className="flex items-center gap-3" title="not connected yet: the team feed is not stored">
            <div className="min-w-0 flex-1">
              <p className="t-body-m">{t}</p>
              <p className="t-small text-ink-3">{sub}</p>
            </div>
            <span aria-hidden="true" className={"flex h-[26px] w-11 shrink-0 items-center rounded-full p-[3px] " + (on ? "justify-end bg-brand" : "border border-rule bg-sunk")}>
              <span className="size-5 rounded-full bg-surface" />
            </span>
          </div>
        ))}
      </aside>
    </div>
  );
}
