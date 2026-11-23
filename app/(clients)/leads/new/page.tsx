import { redirect } from "next/navigation";

import ClientAddForm from "@/app/(clients)/leads/new/ClientAddForm";
import { BackBar, Card, PageTitle } from "@/app/ui/figma";
import { desk, switchedOn } from "@/data/desk";
import { teamsFake } from "@/lib/graphCalendar";
import { people as taPeople } from "@/lib/ta";
import { can, refusal } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** Add a client: straight to a client record, no enquiry step (23 Nov, the owner). */
export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;
  const db = await desk();
  const taSide = await taPeople();
  const call = {
    taPeople: taSide.ok ? taSide.data.filter((p) => p.isActive) : [],
    members: db.members,
    organiserId: me.id,
    teamsOn: teamsFake() || switchedOn(db, "switch.teamsEnabled"),
  };

  return (
    <div className="flex flex-col gap-[22px]">
      <BackBar href="/clients" label="Clients" />

      <PageTitle title="Add a client" sub="A company we work with, or are about to. Only the name is needed to start." />

      {msg && (
        <p className="rounded-[18px] bg-warn-soft px-4 py-3 t-small">{msg}</p>
      )}

      {can(me, "client.manage") ? (
        <Card>
          <ClientAddForm call={call} />
        </Card>
      ) : (
        <p className="rounded-[18px] bg-sunk px-4 py-3 t-small text-ink-3">
          {refusal("client.manage")}
        </p>
      )}
    </div>
  );
}
