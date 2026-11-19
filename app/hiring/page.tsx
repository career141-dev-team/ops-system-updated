import { redirect } from "next/navigation";

import { PageBox } from "@/app/ui/figma";
import { currentMember } from "@/lib/session";

/** H1 · Internal hiring. There is no hiring backend yet, so this says so and saves nothing. */
export default async function HiringPage() {
  if (!(await currentMember())) redirect("/sign-in");
  return (
    <PageBox width="1160" className="gap-6">
      <h1 className="text-[40px] font-light leading-[50px] text-ink">Internal hiring</h1>
      <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
        Hiring for our own team is not connected yet. There are no roles or applicants here until it is.
      </div>
    </PageBox>
  );
}
