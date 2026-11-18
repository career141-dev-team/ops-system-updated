import Link from "next/link";
import { redirect } from "next/navigation";
import {
  confirmUnreportedHire,
  dismissUnreportedHire,
  sendInvoice,
} from "@/app/actions";
import { clientIn, clientSetIn, desk, invoiceIn, numberOf, unreportedToAsk } from "@/data/desk";
import {
  BackBar,
  ClockPill,
  NextStepCard,
  PageBox,
  figmaField,
  figmaLabel,
  pillDanger,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import { day } from "@/lib/listing";
import { money } from "@/lib/money";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UnreportedHirePage({
  searchParams,
}: {
  searchParams: Promise<{ setId?: string; invoiceId?: string; msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");

  const sp = await searchParams;
  const db = await desk();

  const inv = sp.invoiceId ? invoiceIn(db, sp.invoiceId) : null;
  const set = sp.setId
    ? clientSetIn(db, sp.setId)
    : inv?.setId
      ? clientSetIn(db, inv.setId)
      : null;

  if (!inv && !set) {
    const openTimer = unreportedToAsk(db)[0];
    if (openTimer) {
      redirect(`/invoices/unreported?setId=${encodeURIComponent(openTimer.subjectId)}`);
    }
    redirect("/invoices?view=surcharges");
  }

  const client = set?.clientId
    ? clientIn(db, set.clientId)
    : inv?.clientId
      ? clientIn(db, inv.clientId)
      : null;
  const canClient = can(me, "client.manage");
  // The settings the surcharge is drafted from (18 Nov: the page said 50%, 150% and "3-month" whatever they were).
  const pct = numberOf(db, "hire.surchargePct", 50);
  const months = numberOf(db, "hire.unreportedMonths", 3);
  const canMoney = can(me, "money.manage");
  const cardShell = "rounded-[24px] border border-rule bg-surface p-5";

  return (
    <PageBox width="1080">
      <div className="flex flex-col gap-6">
        <BackBar href="/invoices?view=surcharges" label="Finance" />

        <div>
          <p className="text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">
            Unreported hire · surcharge invoice
          </p>
          <h1 className="mt-1 text-[40px] font-light leading-[50px] text-ink">
            {client?.name ?? "Client"}
          </h1>
        </div>

        {sp.msg && (
          <div className="rounded-[18px] border border-brand/25 bg-brand-tint px-4 py-3 text-[13px] font-medium text-ink">
            {sp.msg}
          </div>
        )}

        {inv ? (
          <>
            <NextStepCard
              eyebrow="UP NEXT"
              clock={<ClockPill tone="danger" label="Surcharge draft" />}
              title={`Approve the ${pct}% surcharge invoice`}
              body="Review the evidence and amount below before sending this surcharge invoice to the client."
              actions={
                <div className="flex flex-wrap items-center gap-2.5">
                  {inv.state === "draft" && canMoney && (
                    <form action={sendInvoice}>
                      <input type="hidden" name="invoiceId" value={inv.id} />
                      <input type="hidden" name="back" value={`/invoices/${inv.id}`} />
                      <button type="submit" className={pillPrimary}>
                        Approve and send
                      </button>
                    </form>
                  )}
                  <Link href={`/invoices/${inv.id}`} className={pillSecondary}>
                    Open full invoice
                  </Link>
                </div>
              }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className={cardShell}>
                <div className="text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">
                  EVIDENCE
                </div>
                <p className="mt-2 text-[14px] font-medium text-ink">{inv.about}</p>
                <p className="mt-1 text-[13px] text-ink-soft">
                  {set
                    ? `CV set for ${set.role}, sent ${day(set.sentAt ?? set.createdAt)}.`
                    : "Linked to client CV set."}
                </p>
              </div>
              <div className={cardShell}>
                <div className="text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">
                  AMOUNT
                </div>
                <p className="mt-2 text-[26px] font-light text-ink">
                  {money(inv.amount, inv.currency)}
                </p>
                <p className="mt-1 text-[13px] text-ink-soft">
                  Includes the {pct}% surcharge under the signed client agreement.
                </p>
              </div>
            </div>
          </>
        ) : (
          set && (
            <>
              <NextStepCard
                eyebrow="UP NEXT"
                clock={<ClockPill tone="warn" label={`${months}-month check`} />}
                title={`Confirm or dismiss the unreported hire for ${set.role}`}
                body="If the client hired someone from this CV set without notifying Career 141, draft the surcharge invoice. Otherwise record their explanation."
                actions={
                  <Link href={`/sets/${set.id}`} className={pillSecondary}>
                    Open CV set
                  </Link>
                }
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={cardShell}>
                  <div className="text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">
                    EVIDENCE
                  </div>
                  <p className="mt-2 text-[14px] font-medium text-ink">
                    {set.candidates.length} candidate{set.candidates.length === 1 ? "" : "s"} in set
                  </p>
                  <p className="mt-1 text-[13px] text-ink-soft">
                    Role: {set.role} · sent {day(set.sentAt ?? set.createdAt)}
                  </p>
                </div>
                <div className={cardShell}>
                  <div className="text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">
                    SURCHARGE BASIS
                  </div>
                  <p className="mt-2 text-[22px] font-light text-ink">
                    {pct}% of the placement fee
                  </p>
                  <p className="mt-1 text-[13px] text-ink-soft">
                    Calculated from the candidate&rsquo;s agreed monthly salary.
                  </p>
                </div>
              </div>

              {canClient && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className={cardShell}>
                    <h2 className="text-[18px] font-light text-ink">
                      Draft surcharge invoice
                    </h2>
                    <form action={confirmUnreportedHire} className="mt-4 flex flex-col gap-3">
                      <input type="hidden" name="setId" value={set.id} />
                      <input type="hidden" name="back" value="/invoices/unreported" />
                      <div>
                        <label className={figmaLabel} htmlFor="candidateName">
                          Candidate hired
                        </label>
                        <input
                          id="candidateName"
                          name="candidateName"
                          type="text"
                          required
                          list={`hired-${set.id}`}
                          placeholder="Who did they hire?"
                          className={figmaField}
                        />
                        {/* The set's candidates as suggestions, none chosen for them (18 Nov: the first was pre-filled). */}
                        <datalist id={`hired-${set.id}`}>
                          {set.candidates.map((c) => (
                            <option key={c.applicationTaId} value={c.name} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className={figmaLabel} htmlFor="monthlySalary">
                          Monthly salary (LKR)
                        </label>
                        <input
                          id="monthlySalary"
                          name="monthlySalary"
                          type="number"
                          required
                          placeholder="Enter monthly salary"
                          className={figmaField}
                        />
                      </div>
                      <div>
                        <button type="submit" className={pillPrimary}>
                          Draft surcharge invoice
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className={cardShell}>
                    <h2 className="text-[18px] font-light text-ink">Dismiss check</h2>
                    <form action={dismissUnreportedHire} className="mt-4 flex flex-col gap-3">
                      <input type="hidden" name="setId" value={set.id} />
                      <div>
                        <label className={figmaLabel} htmlFor="reason">
                          What did the client say?
                        </label>
                        <input
                          id="reason"
                          name="reason"
                          type="text"
                          required
                          placeholder="Verified not hired / hired elsewhere"
                          className={figmaField}
                        />
                      </div>
                      <div>
                        <button type="submit" className={pillDanger}>
                          Dismiss check
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )
        )}

        <div className="rounded-[18px] border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-ink">
          Surcharge invoices and unreported-hire decisions are always logged in the client and
          finance audit trail.
        </div>
      </div>
    </PageBox>
  );
}
