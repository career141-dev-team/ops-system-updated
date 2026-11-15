import { redirect } from "next/navigation";

import LeadCaptureForm from "@/app/(clients)/leads/new/LeadCaptureForm";
import { BackBar, PageBox } from "@/app/ui/figma";
import { clientsNewestFirst, desk, leadsNewestFirst, member as memberIn } from "@/data/desk";
import { can, refusal } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * UT · Create — capture a lead (Figma frame 1:1863).
 */
export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;
  const mayManage = can(me, "client.manage");

  const db = await desk();
  const existingCompanies = [
    ...clientsNewestFirst(db).map((c) => ({
      id: c.id,
      name: c.name,
      owner: memberIn(db, c.ownerId)?.name ?? "Unassigned",
      status: c.stage.replace(/_/g, " "),
      href: "/clients/" + c.id,
    })),
    ...leadsNewestFirst(db).map((l) => ({
      id: l.id,
      name: l.company,
      owner: memberIn(db, l.ownerId)?.name ?? "Unassigned",
      status: l.state.replace(/_/g, " "),
      href: "/leads/" + l.id,
    })),
  ];

  return (
    <PageBox width="880" className="gap-7">
      <BackBar href="/clients" label="Clients" />

      <div className="flex flex-col gap-1">
        <h1 className="text-[40px] font-light leading-[50px] text-ink">New lead</h1>
        <p className="text-[16px] font-normal leading-[26px] text-ink-soft">
          Say it or paste the email — AURA fills the form for you to check.
        </p>
      </div>

      {msg && (
        <p className="rounded-[16px] bg-warn-soft px-4 py-3 text-[14px] text-ink">{msg}</p>
      )}

      {mayManage ? (
        <LeadCaptureForm existingCompanies={existingCompanies} />
      ) : (
        <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink-soft">
          {refusal("client.manage")}
        </p>
      )}
    </PageBox>
  );
}
