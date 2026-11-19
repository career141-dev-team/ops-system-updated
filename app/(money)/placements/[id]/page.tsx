import { notFound, redirect } from "next/navigation";

import { desk, placementIn } from "@/data/desk";
import { currentMember } from "@/lib/session";

/** The placement now lives on its role's Offer tab (v6 R4). Old links, tasks and action redirects land here and are sent on, with ?msg= kept. */
export default async function PlacementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!(await currentMember())) redirect("/sign-in");
  const { id } = await params;
  const { msg } = await searchParams;
  const placement = placementIn(await desk(), id);
  if (!placement) notFound();
  if (!placement.positionId) redirect("/positions" + (msg ? "?msg=" + encodeURIComponent(msg) : ""));
  const q = new URLSearchParams({ view: "offer" });
  if (msg) q.set("msg", msg);
  redirect("/positions/" + placement.positionId + "?" + q.toString());
}
