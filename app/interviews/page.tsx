import { redirect } from "next/navigation";

/** The old interview list is the Calendar now (v6 K1); about 15 interview actions still redirect here with a ?msg=. */
export default async function InterviewsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  redirect("/calendar" + (msg ? "?msg=" + encodeURIComponent(msg) : ""));
}
