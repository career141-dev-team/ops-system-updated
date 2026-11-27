import { redirect } from "next/navigation";

// The Clients > Positions tab was removed (owner, 27 Nov): /positions shows the same work. Old links land there.
export default function ClientPositionsPage() {
  redirect("/positions");
}
