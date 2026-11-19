import Link from "next/link";

import type { RoleCtx } from "./ctx";
export default function Offer({ c }: { c: RoleCtx }) {
  const { db, itsPlacements, whenDateOf } = c;
  return (
        <div className="flex flex-col gap-4">
          {itsPlacements.length === 0 ? (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              Nobody has been placed on this opening yet.
            </div>
          ) : (
            itsPlacements.map((pl) => {
              const invoices = db.invoices.filter((inv) => inv.placementId === pl.id);
              const g = db.guarantees.find((row) => row.placementId === pl.id) ?? null;
              return (
                <div key={pl.id} className="flex flex-col gap-2 rounded-[24px] bg-sunk px-6 py-5">
                  <Link href={`/placements/${pl.id}`} className="text-[16px] font-medium text-ink hover:text-brand">
                    {pl.candidateName} · {pl.state}
                    {pl.joinDate ? " · joining " + whenDateOf(pl.joinDate) : ""}
                  </Link>
                  <div className="flex flex-col gap-1 text-[14px] text-ink-soft">
                    {invoices.map((inv) => (
                      <Link key={inv.id} href={`/invoices/${inv.id}`} className="hover:text-brand">
                        Invoice {inv.number} · {inv.state}
                      </Link>
                    ))}
                    {invoices.length === 0 && <span>No invoice yet.</span>}
                    {g && (
                      <Link href={`/guarantees/${g.id}`} className="hover:text-brand">
                        Guarantee · {g.state}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
  );
}
