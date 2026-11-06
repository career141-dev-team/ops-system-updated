import { redirect } from "next/navigation";

/**
 * /money, which the sidebar points at (6 Nov).
 *
 * Money is one sidebar entry over four tabs, so the entry needs a URL of its
 * own - and it had none: clicking Money in the sidebar was a 404 nobody hit,
 * because the walk-throughs always arrived from a record. The first tab is
 * where the area starts, so that is where this lands.
 */
export default async function MoneyPage() {
  redirect("/placements");
}
