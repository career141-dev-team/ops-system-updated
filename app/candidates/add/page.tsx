import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { BackBar, PageBox } from "@/app/ui/figma";
import { currentMember } from "@/lib/session";

/**
 * Add candidates (Figma 249:11407). The frame reads each CV and checks it against the TA System
 * before adding anyone. TA has no endpoint for either yet, so this says so rather than pretend:
 * nothing is accepted, and nobody is made up.
 */
export default async function AddCandidatesPage() {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  return (
    <PageBox width="920" className="gap-6">
      <BackBar href="/candidates" label="Candidates" />
      <div className="flex flex-col gap-1">
        <h1 className="text-[40px] font-light leading-[50px] text-ink">Add candidates</h1>
        <p className="text-[16px] leading-[26px] text-ink-soft">Each CV is checked against the TA System first, so nobody is added twice.</p>
      </div>
      <div
        aria-disabled="true"
        className="flex h-[140px] cursor-not-allowed flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-ink-faint text-center"
      >
        <Icon name="file" size={22} className="text-ink-soft" />
        <p className="text-[14px] font-medium leading-[21px] text-ink">Drop CVs or click to choose</p>
        <p className="text-[12px] leading-4 text-ink-faint">PDF or Word · up to 20 at a time</p>
      </div>
      <p className="rounded-[16px] bg-warn-soft px-5 py-4 text-[14px] leading-[21px] text-ink">
        Not connected yet. Reading a CV and checking it against the TA System needs two new TA endpoints, so Ops cannot add people on its own. Until
        then, add the person in the TA System and they appear on the list here once they are in an opening.
      </p>
    </PageBox>
  );
}
