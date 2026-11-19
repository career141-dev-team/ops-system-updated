import { redirect } from "next/navigation";

/** Placements and guarantees are per role now: the Offer and Guarantee tabs of each position (v6 R4, R5). */
export default function Page() {
  redirect("/positions");
}
