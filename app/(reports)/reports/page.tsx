import { redirect } from "next/navigation";

/** The report list is gone from the menu (v6): the weekly report opens from Positions, and its page is /reports/<id>. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  redirect("/positions" + (msg ? "?msg=" + encodeURIComponent(msg) : "?panel=weekly-report"));
}
