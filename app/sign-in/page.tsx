import { redirect } from "next/navigation";

import { activeMembers, desk } from "@/data/desk";
import { ROLE_LABEL } from "@/lib/roles";
import { devSignInAllowed, signInAs } from "@/lib/session";

/**
 * Pick your name. Development only, and refused outright when the switch is
 * off, so this can never become how someone gets in for real.
 */
export default async function SignInPage() {
  if (!devSignInAllowed()) {
    return (
      <p className="text-[13.5px] text-ink-soft">
        Sign-in is not set up yet. Real sign-in replaces this before any real data exists.
      </p>
    );
  }

  async function choose(formData: FormData) {
    "use server";
    const memberId = String(formData.get("memberId") ?? "");
    if (!memberId) return;
    await signInAs(memberId);
    redirect("/");
  }

  const members = activeMembers(await desk());

  return (
    <div className="max-w-[560px]">
      <h1 className="text-[17px] font-medium">Who are you?</h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        This is the development sign-in. The data on this site is invented, and nothing it sends
        reaches anybody.
      </p>

      <form action={choose} className="mt-5 flex flex-col gap-2">
        {members.map((member) => (
          <button
            key={member.id}
            name="memberId"
            value={member.id}
            className="flex items-center justify-between rounded-xl border border-rule bg-surface px-4 py-3 text-left hover:border-rule-strong"
          >
            <span className="text-[14px]">{member.name}</span>
            <span className="text-[12.5px] text-ink-faint">{ROLE_LABEL[member.role]}</span>
          </button>
        ))}
      </form>
    </div>
  );
}
