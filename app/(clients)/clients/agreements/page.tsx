import Link from "next/link";
import { redirect } from "next/navigation";

import { PageBox, StatusChip } from "@/app/ui/figma";
import { desk, leadIn } from "@/data/desk";
import { currentMember } from "@/lib/session";

/** C3 · Agreements: every client agreement the desk holds, newest first, each linking to its lead. */
export default async function AgreementsPage() {
  if (!(await currentMember())) redirect("/sign-in");
  const db = await desk();
  const rows = [...db.agreements].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <PageBox width="1160" className="gap-6">
      <h1 className="text-[40px] font-light leading-[50px] text-ink">Agreements</h1>
      {rows.length === 0 ? (
        <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
          No agreement has been drafted yet. One appears here when a lead reaches the agreement step.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((esa) => {
            const lead = leadIn(db, esa.leadId);
            return (
              <Link
                key={esa.id}
                href={`/leads/${esa.leadId}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-sunk px-5 py-4 hover:bg-shell"
              >
                <span className="text-[16px] font-medium text-ink">
                  {lead?.company ?? "Client"} · version {esa.version}
                </span>
                <StatusChip label={esa.state} tone="info" />
              </Link>
            );
          })}
        </div>
      )}
    </PageBox>
  );
}
