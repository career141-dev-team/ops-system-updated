import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { BackBar, RecordCard } from "@/app/ui/figma";
import { clientIn, desk, holdsNewestFirst, member as memberIn, runClocks } from "@/data/desk";
import { HOLD_MEANINGS, type HoldState } from "@/lib/clientFeedback";
import { currentMember } from "@/lib/session";

/**
 * Held positions directory.
 */
export default async function HoldsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q = "" } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const query = q.trim().toLowerCase();
  const holds = holdsNewestFirst(db).filter((hold) => {
    if (!query) return true;
    const client = hold.clientId ? clientIn(db, hold.clientId) : null;
    return [client?.name, hold.openingTaId, hold.reason, hold.state].some((part) =>
      (part ?? "").toLowerCase().includes(query),
    );
  });

  const days = (from: number) => Math.max(1, Math.round((now - from) / 86_400_000));

  return (
    <div className="mx-auto flex w-full flex-col gap-7 rounded-[28px] bg-surface px-7 py-8 shadow-card">
      <BackBar href="/clients?filter=hold" label="Clients" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[40px] font-light leading-[50px] text-ink">
            Clients &amp; positions on hold
          </h1>
          <p className="max-w-[70ch] text-[16px] font-normal leading-[26px] text-ink-soft">
            A client who has gone quiet does not lose their position: it goes on hold with a notice they receive, and never closes by itself — somebody is asked about it every thirty days until they decide.
          </p>
        </div>

        <form
          action="/holds"
          className="flex h-[46px] w-[260px] items-center gap-2.5 rounded-full bg-sunk pl-4 pr-3 sm:w-[300px]"
        >
          <Icon name="search" size={18} className="shrink-0 text-ink-faint" />
          <input
            name="q" autoComplete="off"
            defaultValue={q}
            placeholder="Find a held client or opening"
            aria-label="Find a held client or opening"
            className="min-w-0 flex-1 bg-transparent text-[14px] leading-[21px] text-ink outline-none placeholder:text-ink-faint"
          />
        </form>
      </div>

      {msg && (
        <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">{msg}</p>
      )}

      {holds.length === 0 ? (
        <p className="rounded-[24px] bg-sunk px-6 py-8 text-[15px] text-ink-soft">
          Nothing is held right now. A hold is proposed by a clock when a client goes quiet, and only holds once somebody approves the notice they get.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {holds.map((hold) => {
            const owner = memberIn(db, hold.ownerId)?.name ?? "Unassigned";
            const client = hold.clientId ? clientIn(db, hold.clientId) : null;
            const daysHeld = days(hold.heldAt ?? hold.proposedAt);
            const late =
              hold.state === "proposed" || Boolean(hold.reviewAt && hold.reviewAt < now);

            return (
              <RecordCard
                key={hold.id}
                href={`/holds/${hold.id}`}
                chip={{
                  label:
                    hold.state === "lifted"
                      ? "Lifted"
                      : hold.state === "proposed"
                        ? "Hold proposed"
                        : `Hold · ${daysHeld}d`,
                  tone: hold.state === "lifted" ? "ok" : "warn",
                }}
                rightText={
                  hold.state === "proposed"
                    ? "Needs approval"
                    : hold.state === "lifted"
                      ? "Reopened"
                      : "30-day review"
                }
                rightTone={late ? "danger" : "faint"}
                title={client?.name ?? hold.openingTaId}
                subtitle={`${HOLD_MEANINGS[hold.state as HoldState] ?? hold.state} · ${hold.reason}`}
                footerLeft={hold.state === "proposed" ? "Approve notice" : "Review hold"}
                ownerName={owner}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
