import { notFound, redirect } from "next/navigation";

import { clientSetIn, desk, positionForSet } from "@/data/desk";
import { currentMember } from "@/lib/session";

/**
 * A set no longer has a page of its own (v6, 19 Nov): it lives on the role's Sets tab, with its
 * panels. This door stays because tasks, mail and every action's redirect still point here; the
 * message (`?msg=`) rides along so a refusal or a "Saved" is still read.
 */
export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; panel?: string }>;
}) {
  if (!(await currentMember())) redirect("/sign-in");
  const { id } = await params;
  const { msg } = await searchParams;
  const db = await desk();
  const set = clientSetIn(db, id);
  if (!set) notFound();
  const position = positionForSet(db, set);
  if (!position) redirect("/positions" + (msg ? "?msg=" + encodeURIComponent(msg) : ""));
  const q = new URLSearchParams({ view: "sets" });
  if (msg) q.set("msg", msg);
  redirect(`/positions/${position.id}?${q.toString()}`);
}
