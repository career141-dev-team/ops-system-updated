import { redirect } from "next/navigation";

import LeadCaptureForm from "@/app/(clients)/leads/new/LeadCaptureForm";
import { BackBar, Card, PageTitle } from "@/app/ui/figma";
import { clientsNewestFirst, desk, leadIn, leadsNewestFirst, member as memberIn } from "@/data/desk";
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

  // Direct client: only our own clients, each with the people we write to. A client with no contacts on its
  // record falls back to the person on the lead it came in as.
  const directClients = clientsNewestFirst(db)
    .filter((c) => c.stage !== "closed")
    .map((c) => {
      const lead = c.leadId ? leadIn(db, c.leadId) : null;
      const contacts = (c.contacts ?? []).filter((p) => p.name || p.email || p.phone);
      return {
        id: c.id,
        name: c.name,
        about: [lead?.industry, "Owner: " + (memberIn(db, c.ownerId)?.name ?? "Unassigned")].filter(Boolean).join(" · "),
        contacts:
          contacts.length > 0
            ? contacts.map((p) => ({ name: p.name, email: p.email, phone: p.phone, role: p.role }))
            : lead && (lead.contactEmail || lead.contactPhone)
              ? [{ name: lead.contactName, email: lead.contactEmail, phone: lead.contactPhone, role: "" }]
              : [],
      };
    });

  return (
    <div className="flex flex-col gap-[22px]">
      <BackBar href="/clients" label="Clients" />

      <PageTitle title="New lead" sub="Say it or paste the email — AURA fills the form for you to check." />

      {msg && (
        <p className="rounded-[18px] bg-warn-soft px-4 py-3 t-small">{msg}</p>
      )}

      {mayManage ? (
        <Card>
          <LeadCaptureForm existingCompanies={existingCompanies} directClients={directClients} />
        </Card>
      ) : (
        <p className="rounded-[18px] bg-sunk px-4 py-3 t-small text-ink-3">
          {refusal("client.manage")}
        </p>
      )}
    </div>
  );
}
