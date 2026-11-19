import Link from "next/link";
import { redirect } from "next/navigation";

import { aiSwitches, desk } from "@/data/desk";
import Icon from "@/app/Icon";
import { aboutWhom } from "@/app/MessagesView";
import { EmptyState, PageTitle, figmaField, figmaLabel, pillPrimary } from "@/app/ui/figma";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { teamNewsView, whatsappView } from "@/lib/inboxChannels";
import { sampleNews } from "@/lib/inboxChannelsSample";
import { inFolder } from "@/lib/inboxView";
import { mailboxesInWords, readerEnabled } from "@/lib/graphMail";
import { buildThreads, type Thread } from "@/lib/mailbox";
import { firstName, shortWhen } from "@/lib/myWork";
import { can, seesWholeDesk } from "@/lib/roles";
import { currentMember, devSignInAllowed } from "@/lib/session";
import { pretendMailArrives, readMailNow, writeNewMessage } from "@/app/actions";
import { NewsPanel, WhatsAppPanel } from "./ChannelViews";
import ReadingPane from "./ReadingPane";

/**
 * The Inbox (Figma I1 151:351, I2 132:2, I3 133:384): Mail, WhatsApp and Team news as three views of one page
 * (`?view=mail|whatsapp|news`). Everything is a URL, nothing opens over the page. Mail is real; WhatsApp shows
 * what the desk holds; Team news has no store yet (see src/lib/inboxChannels.ts).
 */
export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; msg?: string; box?: string; t?: string; compose?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const sp = await searchParams;
  const view = sp.view === "whatsapp" || sp.view === "news" ? sp.view : "mail";

  const all = await desk();
  const now = Date.now();
  // Whose mail: your own box, the shared boxes, or everything (9 Nov).
  const people = new Set(all.members.map((m) => m.email.toLowerCase()));
  const mine = (i: { mailbox: string }) => i.mailbox.toLowerCase() === member.email.toLowerCase();
  const shared = (i: { mailbox: string }) => !people.has(i.mailbox.toLowerCase());
  const box = sp.box === "shared" || sp.box === "all" || sp.box === "mine" ? sp.box : seesWholeDesk(member) || !all.inbound.some(mine) ? "all" : "mine";
  const db = { ...all, inbound: all.inbound.filter((i) => (box === "mine" ? mine(i) : box === "shared" ? shared(i) : true)) };

  const mailIn = db.inbound.filter((i) => i.channel !== "whatsapp");
  const readState = new Map(mailIn.map((i) => [i.id, i.readState]));
  const threads = buildThreads(
    mailIn,
    db.messages.filter((m) => m.channel === "email"),
  );
  const inbox = threads.filter((t) => inFolder(t, "inbox", readState));
  const needsYou = inbox.filter((t) => inFolder(t, "unread", readState) || t.waitingOnUs);
  const filed = inbox.filter((t) => !needsYou.includes(t));
  const wa = whatsappView(db);
  const waCount = wa.replies.length + wa.ready.length;
  const real = teamNewsView(db);
  const news = real.length === 0 && devSignInAllowed() ? sampleNews(now) : real;

  const chosen = sp.compose ? null : (inbox.find((t) => t.key === sp.t) ?? threads.find((t) => t.key === sp.t) ?? needsYou[0] ?? filed[0] ?? null);
  const hrefMail = (over: Record<string, string | undefined> = {}) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ box: sp.box, ...over })) if (v) p.set(k, v);
    return "/mail" + (p.toString() ? "?" + p.toString() : "");
  };
  const here = hrefMail({ t: chosen?.key });
  const mayWrite = can(member, "message.approve");
  const aiOn = anyKeySet() && aiSwitches(db).on;
  const companyOf = (t: Thread) =>
    (t.clientId ? db.clients.find((c) => c.id === t.clientId)?.name : null) ?? (t.about ? aboutWhom(db, t.about.type, t.about.id) : null);

  const sub =
    view === "mail"
      ? `${inbox.length} ${inbox.length === 1 ? "conversation" : "conversations"} · ${needsYou.length} need you`
      : view === "whatsapp"
        ? `${wa.replies.length} client ${wa.replies.length === 1 ? "reply" : "replies"} to record · ${wa.ready.length} ${wa.ready.length === 1 ? "message" : "messages"} ready to copy`
        : "What happened across the team";

  const card = (t: Thread) => {
    const last = t.items[t.items.length - 1];
    const on = t.key === chosen?.key;
    return (
      <Link
        key={t.key}
        href={hrefMail({ t: t.key })}
        scroll={false}
        aria-current={on ? "page" : undefined}
        className={"flex flex-col gap-1 rounded-[22px] bg-surface px-[22px] py-[18px] " + (on ? "border-2 border-ink" : "shadow-card hover:bg-sunk/50")}
      >
        <span className="flex items-baseline gap-2">
          <span className="t-body-m">{t.withName.replace(/@.*/, "") || t.with[0]}</span>
          <span className="t-small min-w-0 flex-1 truncate text-ink-3">{companyOf(t)}</span>
          <span className="t-small shrink-0 text-ink-3">{shortWhen(t.lastAt, now)}</span>
        </span>
        <span className="t-body-m truncate">{t.subject || "(no subject)"}</span>
        <span className="t-small line-clamp-2 text-ink-2">{(last?.body ?? "").split("\n").find((l) => l.trim())?.trim()}</span>
      </Link>
    );
  };
  const section = (tone: string, text: string, n: number) => (
    <div className="flex items-center gap-2.5 px-2 pb-1 pt-3.5">
      <span className={"size-2 rounded-[4px] " + (tone === "warn" ? "bg-warn" : "bg-brand")} />
      <span className={"t-body-m " + (tone === "warn" ? "text-warn" : "text-brand")}>{text}</span>
      <span className="t-small text-ink-3">{n}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Inbox"
        sub={sub}
        active={view}
        tabs={[
          { key: "mail", label: "Mail", href: "/mail", count: inbox.length },
          { key: "whatsapp", label: "WhatsApp", href: "/mail?view=whatsapp", count: waCount },
          { key: "news", label: "Team news", href: "/mail?view=news" },
        ]}
        right={
          view === "mail" && mayWrite ? (
            <Link href={hrefMail({ compose: "1" })} className={pillPrimary}>
              <Icon name="plus" size={16} />
              New message
            </Link>
          ) : undefined
        }
      />
      {sp.msg && <p className="rounded-[16px] bg-sunk px-4 py-3 t-body">{sp.msg}</p>}

      {view === "whatsapp" && <WhatsAppPanel view={wa} now={now} />}
      {view === "news" && <NewsPanel items={news} now={now} name={firstName(member.name)} />}
      {view === "mail" && (
        <div className="flex items-start gap-[22px] max-lg:flex-col">
          <div className="flex w-[620px] max-w-[45%] shrink-0 flex-col gap-3 max-lg:w-full max-lg:max-w-none">
            <div className="flex flex-wrap items-center gap-3 px-2 t-small text-ink-3">
              {([["mine", "Your mailbox"], ["shared", "Shared boxes"], ["all", "Everything"]] as const).map(([k, w]) => (
                <Link key={k} href={hrefMail({ box: k })} aria-current={box === k ? "page" : undefined} className={box === k ? "t-label text-ink" : "hover:text-ink"}>{w}</Link>
              ))}
              <span className="flex-1" />
              <span title={mailboxesInWords()}>{readerEnabled() ? "Read every five minutes" : "Mail reading is off"}</span>
              <form action={readMailNow}><button className="text-brand hover:underline">Read now</button></form>
              {devSignInAllowed() && (
                <form action={pretendMailArrives}>
                  <input type="hidden" name="kind" value="reply" />
                  <button className="hover:text-ink">Pretend a client replies</button>
                </form>
              )}
            </div>
            {inbox.length === 0 && <EmptyState icon="mail" title="Nothing in the inbox">A conversation shows here when somebody writes to us.</EmptyState>}
            {needsYou.length > 0 && section("warn", "Needs you", needsYou.length)}
            {needsYou.map(card)}
            {filed.length > 0 && section("ok", "Filed", filed.length)}
            {filed.map(card)}
          </div>
          {sp.compose && mayWrite ? (
            <Compose db={db} back={hrefMail({ compose: "1" })} cancel={hrefMail()} />
          ) : chosen ? (
            <ReadingPane key={chosen.key} db={db} thread={chosen} company={companyOf(chosen)} now={now} here={here} mayWrite={mayWrite} aiOn={aiOn} aiOff={aiOffReason(anyKeySet(), aiSwitches(db).on)} />
          ) : (
            <section className="flex flex-1 rounded-[28px] bg-surface px-9 py-8 shadow-card">
              <p className="t-body text-ink-3">A conversation opens here when somebody writes to us.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/** A plain email from your own address: a draft, like the rest. */
function Compose({ db, back, cancel }: { db: Awaited<ReturnType<typeof desk>>; back: string; cancel: string }) {
  const writeTo = [
    ...db.clients.filter((c) => c.stage !== "closed").map((c) => ({ value: "client|" + c.id, label: "Client · " + c.name })),
    ...db.positions.map((p) => ({ value: "position|" + p.id, label: "Position · " + p.title })),
  ].slice(0, 200);
  return (
    <form action={writeNewMessage} className="flex flex-1 flex-col gap-3.5 rounded-[28px] bg-surface px-9 py-8 shadow-card">
      <input type="hidden" name="back" value={back} />
      <div>
        <h2 className="t-h2">New message</h2>
        <p className="t-small text-ink-3">From your own address. It is drafted like every other message, and nothing goes until you approve it.</p>
      </div>
      <label className={figmaLabel}>To<input name="to" placeholder="hr@example.test, md@example.test" className={figmaField} /></label>
      <label className={figmaLabel}>
        About, so it is findable later
        <select name="about" defaultValue="" className={figmaField}>
          <option value="">Nothing in particular</option>
          {writeTo.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
        </select>
      </label>
      <label className={figmaLabel}>Subject<input name="subject" className={figmaField} /></label>
      <label className={figmaLabel}>Message<textarea name="body" rows={8} className={figmaField} /></label>
      <div className="flex items-center gap-3">
        <button className={pillPrimary}>Draft it</button>
        <Link href={cancel} className="px-3 t-body-m text-ink-2 hover:text-ink">Cancel</Link>
      </div>
    </form>
  );
}
