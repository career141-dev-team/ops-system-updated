import { redirect } from "next/navigation";

/** The calls list is the Calls view of My work now (v6, 19 Nov). Stored links keep working. */
export default async function CallsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  redirect("/?view=calls" + (msg ? "&msg=" + encodeURIComponent(msg) : ""));
}
