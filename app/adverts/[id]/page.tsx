import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { dropAd, markAdClosed, markAdLive, orderAd, recordAdFlyer } from "@/app/actions";
import { adIn, clientIn, desk, fileIn, member as memberIn, positionIn } from "@/data/desk";
import { AD_MEANINGS, AD_PRICES, type AdState, adInWords } from "@/lib/adverts";
import { money } from "@/lib/money";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** One advert: the flyer, the order, the date it went live, the CV count. */
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
  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";

  return (
    <div className="flex max-w-[800px] flex-col gap-4">
      <div>
        <Link href="/adverts" className="text-[12.5px] text-brand hover:underline">
          Back to the adverts
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">{ad.title}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {adInWords(ad, now)} · {memberIn(db, ad.ownerId)?.name ?? "nobody"} owns it
          {position && (
            <>
              {" · "}
              <Link href={"/positions/" + position.id} className="text-brand hover:underline">
                the position
              </Link>
            </>
          )}
          {client && " · " + client.name}
        </p>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          {ad.kind === "hr_and_marketing" ? "The HR and marketing advert" : "The single advert"} · the board says{" "}
          {money(AD_PRICES[ad.kind] ?? 0, "LKR")}
          {ad.applyAlias && " · applications to " + ad.applyAlias}
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {ad.state === "requested" && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">The flyer</h2>
          <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">
            TopJobs takes an image, not a job description. Marketing keeps the flyer on the{" "}
            <Link href="/files" className="text-brand hover:underline">
              Files screen
            </Link>{" "}
            first, then it is picked here.
          </p>
          {images.length === 0 && (
            <p className="mt-2 text-[13px] text-warning">
              No image is on the Files screen yet, so there is nothing to attach. Marketing keeps the flyer there
              first; this page will pick it up.
            </p>
          )}
          <form action={recordAdFlyer} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="adId" value={ad.id} />
            <label className="flex min-w-[280px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
              The flyer
              <select name="flyerFileId" className={field} defaultValue="">
                <option value="">— pick the image —</option>
                {images.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <button className={plain}>The flyer is ready</button>
          </form>
        </section>
      )}

      {ad.state === "flyer" && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Order it</h2>
          <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">
            The order goes as a drafted email with the flyer attached. What they are charging goes on the record, so
            somebody can check the bill later.
          </p>
          <form action={orderAd} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="adId" value={ad.id} />
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              To (one address a line)
              <textarea name="to" rows={2} placeholder="ads@topjobs.lk" className={field} />
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex w-[160px] flex-col gap-1 text-[12.5px] text-ink-soft">
                What they charge
                <input
                  name="cost"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={AD_PRICES[ad.kind] ?? 0}
                  className={field}
                />
              </label>
              <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
                The apply address TA routed for it
                <input name="applyAlias" placeholder="apply-headoffinance@career141.com" className={field} />
              </label>
            </div>
            <button className={button}>Draft the order</button>
          </form>
        </section>
      )}

      {ad.state === "ordered" && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">TopJobs says it is live</h2>
          <form action={markAdLive} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="adId" value={ad.id} />
            <label className="flex min-w-[170px] flex-col gap-1 text-[12.5px] text-ink-soft">
              The day it went live
              <input name="liveAt" type="date" className={field} />
            </label>
            <button className={plain}>Record it</button>
          </form>
          <p className="mt-2 text-[12px] text-ink-faint">
            Two weeks start from that day, and the TA System is told so the advert shows on their opening.
          </p>
        </section>
      )}

      {ad.state === "live" && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Closing it</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Live since {ad.liveAt ? day(ad.liveAt) : "—"}, down on {ad.closesAt ? day(ad.closesAt) : "—"}.
          </p>
          <form action={markAdClosed} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="adId" value={ad.id} />
            <label className="flex w-[200px] flex-col gap-1 text-[12.5px] text-ink-soft">
              CVs it brought (TA&rsquo;s count)
              <input name="cvCount" type="number" min="0" className={field} />
            </label>
            <button className={plain}>It has come down</button>
          </form>
        </section>
      )}

      {(ad.state === "requested" || ad.state === "flyer" || ad.state === "ordered") && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Not running it after all</h2>
          <form action={dropAd} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="adId" value={ad.id} />
            <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
              Why
              <input name="reason" className={field} />
            </label>
            <button className={plain}>Drop it</button>
          </form>
        </section>
      )}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What happened to it</h2>
        {flyer && (
          <p className="mt-2 text-[13px]">
            The flyer:{" "}
            <Link href={"/files"} className="text-brand hover:underline">
              {flyer.name}
            </Link>
          </p>
        )}
        {ad.orderMessageId && (
          <p className="mt-1 text-[13px]">
            <Link href={"/messages/" + ad.orderMessageId} className="text-brand hover:underline">
              The order to TopJobs
            </Link>
          </p>
        )}
        {theirAudit.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {theirAudit.map((entry) => (
          <div key={entry.id} className="border-t border-rule py-2 first:border-t-0">
            <p className="text-[12.5px]">
              {entry.action}
              {entry.after && <span className="text-ink-soft"> → {entry.after}</span>}
            </p>
            <p className="text-[12px] text-ink-faint">
              {whenLocal(entry.at)}
              {entry.reason && " · " + entry.reason}
            </p>
          </div>
        ))}
        <p className="mt-2 text-[12px] text-ink-faint">
          {AD_MEANINGS[ad.state as AdState] ?? ad.state}
          {ad.reason && " · " + ad.reason}
        </p>
      </section>
    </div>
  );
}
