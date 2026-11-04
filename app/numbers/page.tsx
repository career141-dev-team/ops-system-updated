import Link from "next/link";
import { redirect } from "next/navigation";

import { desk } from "@/data/desk";
import { numbersFrom } from "@/lib/numbers";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * The numbers (15, Phase 7 step 16).
 *
 * The owner's wish from the first week: measure today's numbers, so next
 * month can be compared with this one. Five or six of them, each with the
 * count behind it — an average of two things says so — and the ones still
 * waiting are kept out, because a slow month must not look fast because the
 * slowest clients never replied.
 */
export default async function NumbersPage() {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  if (!can(me, "report.read")) redirect("/?msg=" + encodeURIComponent("The numbers are for the leads."));

  const db = await desk();
  const measures = numbersFrom(db);
  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <div>
        <h1 className="text-[17px] font-medium">The numbers</h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          How long each part of the work really takes, from our own rows. Every line says how many finished things it
          is made of, and what is still waiting — which is deliberately not in the average.
        </p>
      </div>

      <section className={card}>
        {measures.map((measure) => (
          <div key={measure.key} className="border-t border-rule py-3 first:border-t-0">
            <p className="text-[13.5px]">{measure.what}</p>
            <p className="mt-0.5 text-[13px] text-ink-soft">{measure.words}</p>
          </div>
        ))}
      </section>

      <p className="text-[12px] text-ink-faint">
        Nothing here is a target. They are for the owner&rsquo;s own question — is the agreement coming back faster
        than it used to, and are clients answering sooner — and they only mean something once a few months have gone
        by. The{" "}
        <Link href="/reports" className="text-brand hover:underline">
          weekly report
        </Link>{" "}
        is the one that goes to the Director.
      </p>
    </div>
  );
}
