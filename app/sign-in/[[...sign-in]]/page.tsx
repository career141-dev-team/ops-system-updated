import { SignIn, SignOutButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { activeMembers, desk } from "@/data/desk";
import { ROLE_LABEL } from "@/lib/roles";
import {
  clerkSessionState,
  clerkSignInConfigured,
  devSignInAllowed,
  microsoftSignInConfigured,
  signInAs,
  signInOffReason,
} from "@/lib/session";

async function choose(formData: FormData) {
  "use server";
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return;
  await signInAs(memberId);
  redirect("/");
}

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-[11px] text-[14px] font-medium text-ink-inverse transition-transform active:scale-[0.98]";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ problem?: string; __clerk_ticket?: string }>;
}) {
  const { problem, __clerk_ticket: ticket } = await searchParams;
  if (ticket) {
    redirect("/sign-up?__clerk_ticket=" + encodeURIComponent(ticket));
  }
  const off = signInOffReason();
  const clerkOn = clerkSignInConfigured();

  if (clerkOn) {
    const state = await clerkSessionState();
    if (state.signedIn && state.member) {
      redirect("/");
    }
    return (
      <div className="mx-auto flex max-w-[460px] flex-col gap-5 py-6">
        <div>
          <h1 className="t-h1 text-ink">Career 141 Ops</h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Sign in with your Career 141 account. Access is granted to Ops team members and Admins.
          </p>
        </div>

        {(problem || state.problem) && (
          <div className="flex flex-col gap-3 rounded-[18px] border border-danger bg-bg-danger p-4 text-[13px] text-danger">
            <p>{state.problem ?? problem}</p>
            {state.signedIn && (
              <div>
                <SignOutButton redirectUrl="/sign-in">
                  <button type="button" className={buttonClass}>
                    Sign out and try another account
                  </button>
                </SignOutButton>
              </div>
            )}
          </div>
        )}

        {!state.signedIn && (
          <Suspense fallback={<p className="text-[13.5px] text-ink-soft">Loading sign-in...</p>}>
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
          </Suspense>
        )}
      </div>
    );
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
            ask an Ops lead or Admin to add your address under Account &amp; help.
          </p>
        </>
      )}

      {/* Restored 21 Nov: the Clerk page dropped the development door, so
          start-ui.sh could not sign in. devSignInAllowed() still refuses it
          wherever Clerk or Microsoft is set up. */}
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

      {!microsoftSignInConfigured() && !devSignInAllowed() && (
        <p className="mt-3 text-[13.5px] text-ink-soft">
          {off ?? "Sign-in requires Clerk keys (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY) to be configured."}
        </p>
      )}
    </div>
  );
}
