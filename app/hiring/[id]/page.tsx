import Link from "next/link";
import { redirect } from "next/navigation";

import { PageBox } from "@/app/ui/figma";
import { currentMember } from "@/lib/session";

/** H2 · One internal hire. No hiring backend yet: nothing is shown and nothing is saved. */
export default async function HiringRolePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await currentMember())) redirect("/sign-in");
  await params;
  return (
    <PageBox width="1160" className="gap-6">
      <Link href="/hiring" className="text-[14px] text-ink-faint hover:text-brand">
        Internal hiring
      </Link>
      <h1 className="text-[40px] font-light leading-[50px] text-ink">Hiring role</h1>
      <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
        Internal hiring is not connected yet, so there is no role or applicant to show.
      </div>
    </PageBox>
  );
}
