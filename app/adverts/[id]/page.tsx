import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { dropAd, markAdClosed, markAdLive, orderAd, recordAdFlyer } from "@/app/actions";
import {
  BackBar,
  FoldRow,
  StatusChip,
  figmaField,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import { adIn, clientIn, desk, fileIn, member as memberIn, positionIn } from "@/data/desk";
import { AD_MEANINGS, AD_PRICES, type AdState, adInWords } from "@/lib/adverts";
import { money } from "@/lib/money";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export default async function AdvertPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const { msg } = await searchParams;

  const now = Date.now();
  const db = await desk();
  const ad = adIn(db, id);
  if (!ad) notFound();
  const position = ad.positionId ? positionIn(db, ad.positionId) : null;
  const client = ad.clientId ? clientIn(db, ad.clientId) : null;
  const flyer = ad.flyerFileId ? fileIn(db, ad.flyerFileId) : null;
  const images = db.files.filter((f) => (f.mime ?? "").startsWith("image/"));
  const theirAudit = db.audit.filter((a) => a.subjectType === "ad" && a.subjectId === id).slice(0, 12);
  const mayManage = can(me, "advert.manage");

  const day = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-6 rounded-[28px] bg-surface px-7 py-8 shadow-card">
      <BackBar
        href={position ? `/positions/${position.id}?view=advertising` : "/adverts"}
        label={position ? `${position.title} · Advertising` : "Paid adverts"}
      />

      {msg && (
        <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-[18px]">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] leading-[22px] text-ink-faint">
            TopJobs · {ad.kind === "hr_and_marketing" ? "HR & marketing" : "Single advert"} ·{" "}
            {money(AD_PRICES[ad.kind] ?? 0, "LKR")}
            {client ? ` · ${client.name}` : ""}
          </span>
          <h1 className="text-[40px] font-light leading-[50px] text-ink">{ad.title}</h1>
          <span className="text-[14px] text-ink-soft">
            {adInWords(ad, now)} · {memberIn(db, ad.ownerId)?.name ?? "nobody"} owns it
          </span>
        </div>

        <StatusChip
          label={ad.state}
          tone={ad.state === "live" ? "ok" : ad.state === "closed" ? "neutral" : "warn"}
        />
      </div>

      {ad.state === "requested" && mayManage && (
        <div className="flex flex-col gap-3 rounded-[28px] bg-surface px-[30px] py-[26px] shadow-float">
          <h2 className="text-[18px] font-medium text-ink">1. Attach the marketing flyer</h2>
          <p className="text-[14px] text-ink-soft">
            TopJobs takes an image, not a job description. Marketing keeps the flyer on the{" "}
            <Link href="/files" className="text-brand hover:underline">
              Files screen
            </Link>{" "}
            first, then it is picked here.
          </p>
          {images.length === 0 && (
            <p className="text-[13px] text-warning">
              No image is on the Files screen yet. Upload the flyer image there first.
            </p>
          )}
          <form action={recordAdFlyer} className="flex flex-wrap items-end gap-3 pt-1">
            <input type="hidden" name="adId" value={ad.id} />
            <label className="flex min-w-[280px] flex-1 flex-col gap-1 text-[12px] font-medium text-ink-soft">
              The flyer image
              <select name="flyerFileId" className={figmaField} defaultValue="">
                <option value="">— pick the image —</option>
                {images.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={pillPrimary}>
              The flyer is ready
            </button>
          </form>
        </div>
      )}

      {ad.state === "flyer" && mayManage && (
        <div className="flex flex-col gap-3 rounded-[28px] bg-surface px-[30px] py-[26px] shadow-float">
          <h2 className="text-[18px] font-medium text-ink">2. Send the order to TopJobs</h2>
          <p className="text-[14px] text-ink-soft">
            The order goes as a drafted email with the flyer attached. What they charge is recorded on the advert.
          </p>
          <form action={orderAd} className="flex flex-col gap-3 pt-1">
            <input type="hidden" name="adId" value={ad.id} />
            <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-soft">
              To (one address a line)
              <textarea name="to" rows={2} placeholder="ads@topjobs.lk" className={figmaField} />
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex w-[160px] flex-col gap-1 text-[12px] font-medium text-ink-soft">
                What they charge (LKR)
                <input
                  name="cost"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={AD_PRICES[ad.kind] ?? 0}
                  className={figmaField}
                />
              </label>
              <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[12px] font-medium text-ink-soft">
                The apply address TA routed for it
                <input name="applyAlias" placeholder="apply-role@career141.com" className={figmaField} />
              </label>
            </div>
            <button type="submit" className={`${pillPrimary} self-start`}>
              Draft the order
            </button>
          </form>
        </div>
      )}

      {ad.state === "ordered" && mayManage && (
        <div className="flex flex-col gap-3 rounded-[28px] bg-surface px-[30px] py-[26px] shadow-float">
          <h2 className="text-[18px] font-medium text-ink">3. TopJobs says it is live</h2>
          <form action={markAdLive} className="flex flex-wrap items-end gap-3 pt-1">
            <input type="hidden" name="adId" value={ad.id} />
            <label className="flex min-w-[170px] flex-col gap-1 text-[12px] font-medium text-ink-soft">
              The day it went live
              <input name="liveAt" type="date" className={figmaField} />
            </label>
            <button type="submit" className={pillPrimary}>
              Record it live
            </button>
          </form>
          <p className="text-[12px] text-ink-faint">
            Two weeks start from that day, and the TA System is told so the advert shows on their opening.
          </p>
        </div>
      )}

      {ad.state === "live" && mayManage && (
        <div className="flex flex-col gap-3 rounded-[28px] bg-surface px-[30px] py-[26px] shadow-float">
          <h2 className="text-[18px] font-medium text-ink">4. Closing the advert</h2>
          <p className="text-[14px] text-ink-soft">
            Live since {ad.liveAt ? day(ad.liveAt) : "—"}, down on {ad.closesAt ? day(ad.closesAt) : "—"}.
          </p>
          <form action={markAdClosed} className="flex flex-wrap items-end gap-3 pt-1">
            <input type="hidden" name="adId" value={ad.id} />
            <label className="flex w-[200px] flex-col gap-1 text-[12px] font-medium text-ink-soft">
              CVs it brought (TA’s count)
              <input name="cvCount" type="number" min="0" className={figmaField} />
            </label>
            <button type="submit" className={pillPrimary}>
              It has come down
            </button>
          </form>
        </div>
      )}

      {(ad.state === "requested" || ad.state === "flyer" || ad.state === "ordered") && mayManage && (
        <FoldRow title="Not running it after all" summary="Drop with a reason">
          <form action={dropAd} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="adId" value={ad.id} />
            <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-[12px] font-medium text-ink-soft">
              Why it is not running
              <input name="reason" className={figmaField} />
            </label>
            <button type="submit" className={pillSecondary}>
              Drop it
            </button>
          </form>
        </FoldRow>
      )}

      <FoldRow title="What happened to it" summary={AD_MEANINGS[ad.state as AdState] ?? ad.state}>
        <div className="flex flex-col gap-2 text-[14px] text-ink-soft">
          {flyer && (
            <p>
              The flyer:{" "}
              <Link href="/files" className="text-brand hover:underline">
                {flyer.name}
              </Link>
            </p>
          )}
          {ad.orderMessageId && (
            <p>
              <Link href={`/messages/${ad.orderMessageId}`} className="text-brand hover:underline">
                The order to TopJobs
              </Link>
            </p>
          )}
          {theirAudit.map((entry) => (
            <div key={entry.id} className="border-t border-rule py-2 first:border-t-0">
              <p className="text-[13px] text-ink">
                {entry.action}
                {entry.after && <span className="text-ink-soft"> → {entry.after}</span>}
              </p>
              <p className="text-[12px] text-ink-faint">
                {whenLocal(entry.at)}
                {entry.reason && ` · ${entry.reason}`}
              </p>
            </div>
          ))}
        </div>
      </FoldRow>
    </div>
  );
}
