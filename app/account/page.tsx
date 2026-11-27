import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { addOpsMember, addTaPerson, inviteOpsMember, removeTaPerson, signOutAction, syncTaRosterFromApi, updateMyProfile, updateOpsMember } from "@/app/actions";
import Icon from "@/app/Icon";
import PopupBox from "@/app/ui/PopupBox";
import { Avatar, PageTitle, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { activeMembers, desk, settingValue, taRosterPeople } from "@/data/desk";
import { ASSIGNABLE_ROLES, ROLE_LABEL, can } from "@/lib/roles";
import { clerkSignInConfigured, currentMember } from "@/lib/session";
import { fakeTa, readsEnabled } from "@/lib/ta";
import { TA_ROLES, TA_ROSTER_KEY, parseTaRoster, taRoleLabel } from "@/lib/taRoster";

export const dynamic = "force-dynamic";

type Sp = { msg?: string; panel?: string };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Sp>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const sp = await searchParams;

  const db = await desk();
  const myClients = db.clients.filter((c) => c.ownerId === me.id);
  const myPositions = db.positions.filter((p) => p.stage !== "closed" && (p.ownerId === me.id || p.backupOwnerId === me.id));
  const members = activeMembers(db).filter((m) => m.id !== me.id);
  const coverMember = members[0] ?? null;
  const mayManagePeople = can(me, "settings.manage");
  const clerkOn = clerkSignInConfigured();
  const taRead = await taRosterPeople(db);
  const tas = taRead.ok ? taRead.data : [];
  const activeTas = tas.filter((p) => p.isActive);
  const hasCustomTaRoster = parseTaRoster(settingValue(db, TA_ROSTER_KEY)) !== null;
  const canSyncLiveTa = readsEnabled() && !fakeTa();
  const clientNameOf = (clientId: string | null, fallback: string) =>
    (clientId ? db.clients.find((c) => c.id === clientId)?.name : null) ?? (fallback || "Client");

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

      {sp.msg && !sp.panel && (
        <div className="rounded-[18px] border border-brand/25 bg-brand-tint px-5 py-3 text-[13px] font-medium text-ink">
          {sp.msg}
        </div>
      )}

      {/* Logged-in Ops member's own details & assigned positions */}
      <section className={cardShell}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className={caption}>YOUR DETAILS</div>
            <h2 className="t-h2 text-ink">{me.name}</h2>
            <p className="t-small text-ink-3">
              {me.email} · {ROLE_LABEL[me.role]} · {me.active ? "Active" : "Inactive"}
            </p>
          </div>
          <form action={updateMyProfile} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="back" value="/account" />
            <input
              name="name"
              defaultValue={me.name}
              required
              aria-label="Your display name"
              className={panelInput + " !w-56"}
            />
            <button type="submit" className={pillSecondary}>
              Save name
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-rule pt-4">
          <div className={caption}>ASSIGNED POSITIONS ({myPositions.length})</div>
          {myPositions.length === 0 ? (
            <p className="t-small text-ink-3">You are not assigned as Main Ops or Backup Ops on any open position yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {myPositions.map((p) => (
                <Link
                  key={p.id}
                  href={`/positions/${p.id}?view=overview`}
                  className={helpRow}
                >
                  <div className="min-w-0">
                    <p className="t-body-m truncate text-ink">{p.title}</p>
                    <p className="t-small truncate text-ink-3">
                      {clientNameOf(p.clientId, p.clientTaId)} · {p.ownerId === me.id ? "Main Ops" : "Backup Ops"}
                    </p>
                  </div>
                  <Icon name="chevron-right" size={16} className="shrink-0 text-ink-faint" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

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
      {mayManagePeople ? (
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
      ) : (
        <section className={cardShell}>
          <div className="flex flex-col gap-1">
            <div className={caption}>OPS TEAM</div>
            <h2 className="t-h2 text-ink">People on Ops</h2>
            <p className="t-small text-ink-3">Active Ops members who can log in and be assigned to positions.</p>
          </div>
          <div className="flex flex-col divide-y divide-rule border-t border-rule">
            {teamMembers.filter((m) => m.active).map((person) => (
              <div key={person.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={person.name} size="36" tone="brand" />
                  <div className="min-w-0">
                    <p className="t-body-m truncate text-ink">
                      {person.name}
                      {person.id === me.id && <span className="t-small ml-2 rounded-full bg-sunk px-2 py-0.5 text-ink-3">You</span>}
                    </p>
                    <p className="t-small truncate text-ink-3">{person.email}</p>
                  </div>
                </div>
                <span className="t-label rounded-full bg-sunk px-3 py-1 text-ink-2">
                  {ROLE_LABEL[person.role]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TA list section + Change pop-up (27 Nov) */}
      <section className={cardShell}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className={caption}>TALENT ACQUISITION TEAM</div>
            <h2 className="t-h2 text-ink">TA list</h2>
            <p className="t-small text-ink-3">
              {activeTas.length} active TA {activeTas.length === 1 ? "person" : "people"} available for position assignment ·{" "}
              {hasCustomTaRoster ? "Editable Ops TA list" : canSyncLiveTa ? "From the TA System" : "Stand-in TA list"}
            </p>
          </div>
          <Link href="/account?panel=ta-list" scroll={false} className={pillSecondary}>
            Change
          </Link>
        </div>

        {activeTas.length === 0 ? (
          <p className="t-body text-ink-2">No TAs in the list yet. Click Change to add TAs.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeTas.map((p) => (
              <span
                key={p.id}
                className="t-small inline-flex items-center gap-1.5 rounded-full border border-rule bg-sunk px-3 py-1.5 text-ink"
              >
                <span className="font-medium">{p.fullName}</span>
                <span className="text-ink-3">· {taRoleLabel(p.taRole)}</span>
              </span>
            ))}
          </div>
        )}
      </section>

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

      {sp.panel === "ta-list" && (
        <PopupBox
          title="TA list"
          sub="Talent Acquisition people assignable to positions and calls. Add or remove people here; syncs with the TA System when connected."
          closeHref="/account"
          wide
        >
          {sp.msg && (
            <div className="rounded-[14px] border border-brand/25 bg-brand-tint px-4 py-2.5 text-[13px] font-medium text-ink">
              {sp.msg}
            </div>
          )}

          {mayManagePeople && (
            <div className="flex flex-col gap-3 rounded-[20px] border border-rule bg-sunk p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="t-body-m text-ink">Add a TA person</p>
                {canSyncLiveTa && (
                  <form action={syncTaRosterFromApi}>
                    <input type="hidden" name="back" value="/account?panel=ta-list" />
                    <button type="submit" className={pillSecondary + " !px-3.5 !py-1.5 !text-[12px]"}>
                      Sync from TA System
                    </button>
                  </form>
                )}
              </div>
              <form action={addTaPerson} className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1fr_170px_auto]">
                <input type="hidden" name="back" value="/account?panel=ta-list" />
                <input name="fullName" required placeholder="Full name" className={panelInput} />
                <input name="email" type="email" required placeholder="name@career141.com" className={panelInput} />
                <select name="taRole" defaultValue="ta" className={panelInput}>
                  {TA_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button type="submit" className={pillPrimary}>
                  Add TA
                </button>
              </form>
            </div>
          )}

          <div className="flex flex-col divide-y divide-rule">
            {tas.length === 0 ? (
              <p className="t-body py-4 text-ink-3">No TA people in the list yet.</p>
            ) : (
              tas.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={p.fullName} size="36" tone={p.isActive ? "info" : "neutral"} />
                    <div className="min-w-0">
                      <p className="t-body-m flex items-center gap-2 truncate text-ink">
                        <span className="truncate">{p.fullName}</span>
                        {!p.isActive && <span className="t-small rounded-full bg-warn-soft px-2 py-0.5 text-warn">Inactive</span>}
                      </p>
                      <p className="t-small truncate text-ink-3">{p.email || "No email"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="t-label rounded-full bg-sunk px-3 py-1 text-ink-2">
                      {taRoleLabel(p.taRole)}
                    </span>
                    {mayManagePeople && p.isActive && (
                      <form action={removeTaPerson}>
                        <input type="hidden" name="back" value="/account?panel=ta-list" />
                        <input type="hidden" name="taId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-rule bg-surface px-3.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-danger hover:text-danger"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </PopupBox>
      )}
    </div>
  );
}
