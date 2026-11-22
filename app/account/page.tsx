import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { addOpsMember, inviteOpsMember, signOutAction, updateOpsMember } from "@/app/actions";
import Icon from "@/app/Icon";
import { Avatar, PageTitle, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { activeMembers, desk } from "@/data/desk";
import { ASSIGNABLE_ROLES, ROLE_LABEL, can } from "@/lib/roles";
import { clerkSignInConfigured, currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const sp = await searchParams;

  const db = await desk();
  const myClients = db.clients.filter((c) => c.ownerId === me.id);
  const members = activeMembers(db).filter((m) => m.id !== me.id);
  const coverMember = members[0] ?? null;
  const mayManagePeople = can(me, "settings.manage");
  const clerkOn = clerkSignInConfigured();

  // Hide legacy dummy @example.test rows from the real management list unless active.
  const teamMembers = db.members
    .filter((m) => m.active || !m.email.endsWith("@example.test"))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));

  const cardShell = "flex flex-col gap-[18px] rounded-[28px] bg-surface px-7 py-[26px] shadow-card";
  const helpRow = "flex items-center justify-between gap-4 rounded-[16px] border border-rule bg-surface px-4 py-3 transition-colors hover:bg-sunk";
  const caption = "text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint";
  const assignable = ASSIGNABLE_ROLES.filter((r) => r !== "admin" || me.role === "admin");

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title={me.name}
        sub={`${ROLE_LABEL[me.role]} · ${myClients.length} client${myClients.length === 1 ? "" : "s"}`}
        right={
          <span className="flex size-[56px] shrink-0 items-center justify-center rounded-full bg-brand-tint text-[22px] text-brand">
            {me.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </span>
        }
      />

      {sp.msg && (
        <div className="rounded-[18px] border border-brand/25 bg-brand-tint px-5 py-3 text-[13px] font-medium text-ink">
          {sp.msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={cardShell}>
          <div className={caption}>WHILE I&rsquo;M AWAY</div>
          <div className="mt-1 flex flex-col gap-2.5 text-[14px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-soft">My work goes to</span>
              <span className="font-medium text-ink">{coverMember?.name ?? "Unassigned"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-soft">From – to</span>
              <span className="font-medium text-ink">Not set</span>
            </div>
          </div>
        </div>

        <div className={cardShell}>
          <div className={caption}>TELL ME ABOUT</div>
          <div className="mt-1 flex flex-col gap-2.5 text-[14px]">
            {[
              { label: "Client replies", on: true },
              { label: "Anything late", on: true },
              { label: "Daily summary at 8:30", on: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-ink">{item.label}</span>
                <span
                  className={`inline-flex h-6 w-11 items-center rounded-full px-0.5 transition ${
                    item.on ? "justify-end bg-brand" : "justify-start bg-edge-strong"
                  }`}
                >
                  <span className="h-5 w-5 rounded-full bg-surface shadow-sm" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin & Ops lead people management (20 Nov) */}
      {mayManagePeople && (
        <section className={cardShell}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className={caption}>MANAGE PEOPLE &amp; ACCESS</div>
              <h2 className="t-h2 text-ink">Who can sign in to Ops</h2>
              <p className="t-small text-ink-3">
                Invite a teammate by email through Clerk, or add them manually to the Ops allow-list.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <details className="group">
                <summary className={pillPrimary + " cursor-pointer list-none [&::-webkit-details-marker]:hidden"}>
                  <Icon name="mail" size={14} />
                  Invite by email
                </summary>
                <form
                  action={inviteOpsMember}
                  className="mt-3 flex w-full min-w-[290px] max-w-[380px] flex-col gap-2.5 rounded-[20px] border border-rule bg-sunk p-4"
                >
                  <input type="hidden" name="back" value="/account" />
                  <p className="t-body-m text-ink">Send a Clerk invitation</p>
                  <p className="t-small text-ink-3">
                    Emails them a Clerk sign-in invite and grants their chosen Ops access level immediately.
                  </p>
                  <input name="name" required placeholder="Full name" className={panelInput} />
                  <input name="email" type="email" required placeholder="name@career141.com" className={panelInput} />
                  <select name="role" defaultValue="ops_owner" className={panelInput}>
                    {assignable.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                  <button type="submit" className={pillPrimary + " self-start"}>
                    Send invite
                  </button>
                </form>
              </details>

              <details className="group">
                <summary className={pillSecondary + " cursor-pointer list-none [&::-webkit-details-marker]:hidden"}>
                  <Icon name="plus" size={14} />
                  Add manually
                </summary>
                <form
                  action={addOpsMember}
                  className="mt-3 flex w-full min-w-[290px] max-w-[380px] flex-col gap-2.5 rounded-[20px] border border-rule bg-sunk p-4"
                >
                  <input type="hidden" name="back" value="/account" />
                  <p className="t-body-m text-ink">Add to Ops allow-list</p>
                  <p className="t-small text-ink-3">
                    Adds their email directly without sending an invite email (ideal if they already have a Clerk login).
                  </p>
                  <input name="name" required placeholder="Full name" className={panelInput} />
                  <input name="email" type="email" required placeholder="name@career141.com" className={panelInput} />
                  <select name="role" defaultValue="ops_owner" className={panelInput}>
                    {assignable.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                  <button type="submit" className={pillPrimary + " self-start"}>
                    Add person
                  </button>
                </form>
              </details>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-rule border-t border-rule">
            {teamMembers.map((person) => {
              const isSelf = person.id === me.id;
              const lockedAdmin = person.role === "admin" && me.role !== "admin";
              return (
                <div key={person.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={person.name} size="40" tone={person.active ? "brand" : "neutral"} />
                    <div className="min-w-0">
                      <p className="t-body-m flex items-center gap-2 truncate text-ink">
                        <span className="truncate">{person.name}</span>
                        {isSelf && <span className="t-small rounded-full bg-sunk px-2 py-0.5 text-ink-3">You</span>}
                        {!person.active && <span className="t-small rounded-full bg-warn-soft px-2 py-0.5 text-warn">Inactive</span>}
                      </p>
                      <p className="t-small truncate text-ink-3">{person.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {lockedAdmin ? (
                      <span className="t-label rounded-full bg-sunk px-3 py-1.5 text-ink-2">
                        {ROLE_LABEL[person.role]}
                      </span>
                    ) : (
                      <form action={updateOpsMember} className="flex items-center gap-2">
                        <input type="hidden" name="memberId" value={person.id} />
                        <input type="hidden" name="intent" value="role" />
                        <input type="hidden" name="back" value="/account" />
                        <select
                          name="role"
                          defaultValue={ASSIGNABLE_ROLES.includes(person.role) ? person.role : "ops_owner"}
                          aria-label={`Role for ${person.name}`}
                          className="rounded-full border border-rule bg-surface px-3 py-1.5 text-[13px] text-ink outline-none focus:border-ink"
                        >
                          {assignable.map((r) => (
                            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                          ))}
                        </select>
                        <button type="submit" className={pillSecondary + " !px-3.5 !py-1.5 !text-[12px]"}>
                          Save
                        </button>
                      </form>
                    )}

                    {!isSelf && !lockedAdmin && (
                      <form action={updateOpsMember}>
                        <input type="hidden" name="memberId" value={person.id} />
                        <input type="hidden" name="intent" value="toggle" />
                        <input type="hidden" name="back" value="/account" />
                        <button
                          type="submit"
                          className={
                            "rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors " +
                            (person.active
                              ? "border-rule bg-surface text-ink-2 hover:border-danger hover:text-danger"
                              : "border-brand/30 bg-brand-tint text-brand hover:bg-brand hover:text-ink-inverse")
                          }
                        >
                          {person.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className={cardShell}>
        <div className={caption}>HELP</div>
        <div className="flex flex-col gap-2">
          <Link href="/reports" className={helpRow}>
            <div className="flex items-center gap-3.5">
              <span className="flex size-10 items-center justify-center rounded-full bg-sunk text-ink-soft">
                <Icon name="file" size={16} />
              </span>
              <span className="text-[16px] leading-[26px] text-ink">How the Ops flow works</span>
            </div>
            <Icon name="chevron-right" size={16} className="text-ink-faint" />
          </Link>

          <Link href="/ai" className={helpRow}>
            <div className="flex items-center gap-3.5">
              <span className="flex size-10 items-center justify-center rounded-full bg-sunk text-ink-soft">
                <Icon name="sparkle" size={16} />
              </span>
              <span className="text-[16px] leading-[26px] text-ink">What AURA can and can&rsquo;t do</span>
            </div>
            <Icon name="chevron-right" size={16} className="text-ink-faint" />
          </Link>

          <Link href="/health" className={helpRow}>
            <div className="flex items-center gap-3.5">
              <span className="flex size-10 items-center justify-center rounded-full bg-sunk text-ink-soft">
                <Icon name="flag" size={16} />
              </span>
              <span className="text-[16px] leading-[26px] text-ink">Report a problem</span>
            </div>
            <Icon name="chevron-right" size={16} className="text-ink-faint" />
          </Link>
        </div>
      </div>

      <div>
        <Link href="/settings" className={helpRow}>
          <div className="flex items-center gap-3.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-sunk text-ink-soft">
              <Icon name="lock" size={16} />
            </span>
            <span className="text-[16px] leading-[26px] text-ink">Settings</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-ink-faint">
              {me.role === "admin" ? "Admin access" : mayManagePeople ? "Ops lead access" : "Ops lead only"}
            </span>
            <Icon name="chevron-right" size={16} className="text-ink-faint" />
          </div>
        </Link>
      </div>

      <div>
        {clerkOn ? (
          <SignOutButton redirectUrl="/sign-in">
            <button type="button" className={pillSecondary}>Sign out</button>
          </SignOutButton>
        ) : (
          <form action={signOutAction}>
            <button className={pillSecondary}>Sign out</button>
          </form>
        )}
      </div>
    </div>
  );
}
