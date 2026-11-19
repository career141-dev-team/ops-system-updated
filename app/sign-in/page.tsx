import Link from "next/link";
import { redirect } from "next/navigation";

import { activeMembers, desk } from "@/data/desk";
import { ROLE_LABEL } from "@/lib/roles";
import {
  devSignInAllowed,
  microsoftSignInConfigured,
  signInAs,
  signInOffReason,
} from "@/lib/session";

/**
 * The door (6 Nov).
 *
 * Microsoft where it is set up; pick-your-name where it is not and the
 * development switch is on; and where neither holds, a sentence naming the
 * settings that are missing - rather than "not set up yet", which told nobody
 * anything.
 *
 * The two are never both offered. A machine with a real door does not keep a
 * second one that needs no password.
 */
// Was in the old app/ui.tsx (removed 19 Nov); the one class the sign-in page used.
const buttonClass =
  "inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-[11px] text-[14px] font-medium text-ink-inverse transition-transform active:scale-[0.98]";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ problem?: string }>;
}) {
  const { problem } = await searchParams;
  const off = signInOffReason();

  async function choose(formData: FormData) {
    "use server";
    const memberId = String(formData.get("memberId") ?? "");
    if (!memberId) return;
    await signInAs(memberId);
    redirect("/");
  }

  return (
    <div className="max-w-[560px]">
      <h1 className="text-[17px] font-medium">Career 141 Ops</h1>

      {problem && (
        <p className="mt-3 rounded-lg border border-danger bg-bg-danger px-3 py-2 text-[13px] text-danger">
          {problem}
        </p>
      )}

      {microsoftSignInConfigured() && (
        <>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Sign in with the Microsoft account you already use for your email.
          </p>
          <Link href="/sign-in/microsoft" className={buttonClass + " mt-5"}>
            Sign in with Microsoft
          </Link>
          <p className="mt-4 text-[12.5px] text-ink-faint">
            Only people on the ops team can come in. If Microsoft lets you in and this does not,
            ask the ops lead to add your address on the People screen.
          </p>
        </>
      )}

      {devSignInAllowed() && (
        <>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            This is the development sign-in. The data on this site is invented, and nothing it
            sends reaches anybody.
          </p>
          <form action={choose} className="mt-5 flex flex-col gap-2">
            {activeMembers(await desk()).map((member) => (
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
        </>
      )}

      {off && <p className="mt-3 text-[13.5px] text-ink-soft">{off}</p>}
    </div>
  );
}
