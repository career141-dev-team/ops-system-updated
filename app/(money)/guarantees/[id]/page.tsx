import { notFound, redirect } from "next/navigation";

import { desk, guaranteeIn, placementIn } from "@/data/desk";
import { currentMember } from "@/lib/session";

/** The guarantee now lives on its role's Guarantee tab (v6 R5). Old links and action redirects land here and are sent on, with ?msg= kept. */
export default async function GuaranteePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!(await currentMember())) redirect("/sign-in");
  const { id } = await params;
  const { msg } = await searchParams;
  const db = await desk();
  const g = guaranteeIn(db, id);
  if (!g) notFound();
  const positionId = placementIn(db, g.placementId)?.positionId;
  const q = new URLSearchParams({ view: "guarantee" });
  if (msg) q.set("msg", msg);
  redirect(positionId ? "/positions/" + positionId + "?" + q.toString() : "/positions" + (msg ? "?msg=" + encodeURIComponent(msg) : ""));
}
