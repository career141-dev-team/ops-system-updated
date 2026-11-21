import { SignOutButton, SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { clerkSessionState, clerkSignInConfigured } from "@/lib/session";

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-[11px] text-[14px] font-medium text-ink-inverse transition-transform active:scale-[0.98]";

/**
 * Clerk invitation acceptance & sign-up route (`/sign-up`).
 *
 * Clerk invitation emails carry `?__clerk_ticket=...` and redirect here so invited
 * Ops staff complete account creation on our own site (never Clerk's developer portal)
 * and land directly in Ops (`/`). Uninvited sign-ups are still blocked by `opsMembers`.
 */
export default async function SignUpPage() {
  if (!clerkSignInConfigured()) redirect("/sign-in");

  const state = await clerkSessionState();
  if (state.signedIn && state.member) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex max-w-[460px] flex-col gap-5 py-6">
      <div>
        <h1 className="t-h1 text-ink">Join Career 141 Ops</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Finish setting up your invited Career 141 account to enter Ops.
        </p>
      </div>

      {state.problem && (
        <div className="flex flex-col gap-3 rounded-[18px] border border-danger bg-bg-danger p-4 text-[13px] text-danger">
          <p>{state.problem}</p>
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
        <Suspense fallback={<p className="text-[13.5px] text-ink-soft">Loading invitation...</p>}>
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/" />
        </Suspense>
      )}
    </div>
  );
}
