import { notFound, redirect } from "next/navigation";

import { desk, interviewIn } from "@/data/desk";
import { currentMember } from "@/lib/session";

/**
 * An interview has no page of its own any more (v6, 19 Nov): it lives on its role, in the Interviews tab,
 * and what you do to it opens as a panel. This address stays because stored task links and every action's
 * "back" still point here, so it forwards to the right panel, keeping the page's one-time message.
 */
export default async function InterviewPage({
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
  const iv = interviewIn(await desk(), id);
  if (!iv) notFound();

  const panel =
    iv.state === "slots" || iv.state === "agreed"
      ? iv.scheduler === "client"
        ? "client-books-directly"
        : "find-a-time"
      : iv.state === "booked" || iv.state === "reconfirmed"
        ? "reconfirm"
        : iv.state === "attended" && !iv.decision
          ? "add-result"
          : null;
  const query = new URLSearchParams({ view: "interviews" });
  if (panel) {
    query.set("panel", panel);
    query.set("on", iv.id);
  }
  if (msg) query.set("msg", msg);
  redirect(iv.positionId ? `/positions/${iv.positionId}?${query}` : `/positions?${msg ? "msg=" + encodeURIComponent(msg) : ""}`);
}
