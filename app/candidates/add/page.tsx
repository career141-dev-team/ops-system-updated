import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { Card, EmptyState, PageTitle, pillSecondary } from "@/app/ui/figma";
import { currentMember } from "@/lib/session";

/**
 * Add candidates. Reading each CV and checking it against the TA System needs two TA endpoints that
 * do not exist yet, so this says so rather than pretend: nothing is accepted, nobody is made up.
 */
export default async function AddCandidatesPage() {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Add candidates"
        sub="Each CV is checked against the TA System first, so nobody is added twice."
        right={
          <Link href="/candidates" className={pillSecondary}>
            <Icon name="chevron-left" size={16} /> Candidates
          </Link>
        }
      />
      <Card>
        <EmptyState title="not connected yet: reading a CV and checking it against the TA System" icon="file">
          This needs two new TA endpoints, so Ops cannot add people on its own. Until then, add the person in the TA System and they appear here once they are in an opening. For a person the TA System cannot hold, use &quot;Add a candidate by hand&quot; on the opening&apos;s Sets tab.
        </EmptyState>
      </Card>
    </div>
  );
}
