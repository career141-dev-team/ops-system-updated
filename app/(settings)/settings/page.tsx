import Link from "next/link";
import { redirect } from "next/navigation";

import { addOpsMember, changeSetting, saveBankDetails, saveCover, saveTemplateWording } from "@/app/actions";
import Icon from "@/app/Icon";
import { Avatar, PageTitle, PillTabs, figmaField, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { desk, member as memberIn, numberOf, switchedOn, textOf } from "@/data/desk";
import { ASSIGNABLE_ROLES, ROLE_LABEL, can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { LOCKED_SETTINGS } from "@/lib/settingsRules";
import { isInternal, settingRank, settingWords } from "@/lib/settingWords";

export const dynamic = "force-dynamic";

type SP = { msg?: string; view?: string; open?: string };

const COLOMBO = 5.5 * 3_600_000;
const shortDay = (at: number) =>
  new Date(at + COLOMBO).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Settings (v6 frames S1 Rules 3:5712 & S2 Templates and people 3:5836).
 *
 * Two tabs:
 * - Rules: 6 grouped rule cards in a 2-column grid + right-rail "Before you change one" & "Last changes"
 *   (backed by real `opsSettings` & `opsAudit`), plus a quiet System & Admin strip below so outbound
 *   switches, bank details, holidays, files, TA link, import, AI and health remain reachable.
 * - Templates and people: 2-column grid of message templates + "People and cover" card + right-rail
 *   "Open template" live editor backed by `saveTemplateWording` and `saveCover`.
 */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const sp = await searchParams;
  const view = sp.view === "templates" ? "templates" : "rules";
  const mayChange = can(me, "settings.manage");
  const mayEditTemplate = can(me, "template.edit");

  const db = await desk();
  const settings = db.settings
    .filter((s) => !isInternal(s.key) && !s.key.startsWith("cover."))
    .sort((a, b) => settingRank(a.key) - settingRank(b.key) || a.key.localeCompare(b.key));
  const switches = settings.filter((s) => s.key.startsWith("switch.") || typeof s.value === "boolean");

  // Six v6 S1 rule groups, mapped to live settings keys.
  const groups = [
    {
      title: "Agreement chase",
      keys: ["esa.chase1Days", "esa.chase2Days", "esa.callDay", "esa.expiryDays"],
      lines: [
        `Chase 1 goes after ${numberOf(db, "esa.chase1Days", 3)} days with no reply`,
        `Chase 2 goes after ${numberOf(db, "esa.chase2Days", 5)} days`,
        `Then call the client on day ${numberOf(db, "esa.callDay", 7)}`,
      ],
    },
    {
      title: "CV ownership",
      keys: ["set.ownershipWorkingDays", "set.minCvs", "set.requireInternalInterview"],
      lines: [
        `Career141 owns a CV for ${numberOf(db, "set.ownershipWorkingDays", 7)} working days after a set`,
        `A set needs at least ${numberOf(db, "set.minCvs", 5)} prepared CVs before it goes`,
        switchedOn(db, "set.requireInternalInterview")
          ? "Every candidate needs an internal interview pass first"
          : "Internal interview pass is currently optional",
      ],
    },
    {
      title: "Interviews",
      keys: ["interview.reconfirmHours", "interview.slotsChaseDays", "interview.feedbackDueHours"],
      lines: [
        `Reconfirm the day before (${numberOf(db, "interview.reconfirmHours", 24)} hours before)`,
        `Offered times are chased after ${numberOf(db, "interview.slotsChaseDays", 2)} days`,
        "Candidate feedback goes to the client the next morning",
      ],
    },
    {
      title: "Joining",
      keys: ["placement.joinCheckDays", "placement.joinRemindDays"],
      lines: [
        `Reconfirm the joining date ${numberOf(db, "placement.joinRemindDays", 1)} to ${numberOf(db, "placement.joinCheckDays", 7)} days before`,
        "A date can move at any time. The move is saved with a reason",
        "The team checks joining at 09:00 on the first working day",
      ],
    },
    {
      title: "Guarantee and refund",
      keys: ["guarantee.days", "guarantee.replacementWorkingDays", "guarantee.refundPct"],
      lines: [
        `The guarantee runs ${numberOf(db, "guarantee.days", 90)} days from joining`,
        `Replacement runs ${numberOf(db, "guarantee.replacementWorkingDays", 60)} working days`,
        "Every refund waits for the Director of Operations",
      ],
    },
    {
      title: "Late charge",
      keys: ["invoice.dueDays", "invoice.latePctPerMonth", "invoice.writeOffDays"],
      lines: [
        `An invoice falls due ${numberOf(db, "invoice.dueDays", 30)} days after joining`,
        `${numberOf(db, "invoice.latePctPerMonth", 5)}% a month is added after the due date`,
        `Write-off requires ${numberOf(db, "invoice.writeOffDays", 90)} days or Director approval`,
      ],
    },
  ];

  // Recent setting changes from audit trail.
  const recentChanges = db.audit
    .filter((a) => a.action.startsWith("setting."))
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);

  // S2 Templates & Cover
  const templates = [...db.templates].sort((a, b) => a.name.localeCompare(b.name));
  const selectedTemplate =
    (sp.open ? templates.find((t) => t.key === sp.open) : null) ?? templates[0] ?? null;

  const covers = db.settings
    .filter((s) => s.key.startsWith("cover.") && typeof s.value === "string" && s.value.trim().startsWith("{"))
    .map((s) => {
      const awayId = s.key.slice("cover.".length);
      try {
        const parsed = JSON.parse(String(s.value)) as { coverId?: string; until?: string };
        return {
          away: memberIn(db, awayId),
          cover: parsed.coverId ? memberIn(db, parsed.coverId) : null,
          until: parsed.until ?? "",
        };
      } catch {
        return null;
      }
    })
    .filter((x): x is { away: NonNullable<ReturnType<typeof memberIn>>; cover: ReturnType<typeof memberIn>; until: string } => Boolean(x?.away && x?.cover));

  const holidayYear = new Date().getFullYear();
  const holidayDays = db.holidays.filter((h) => h.date.startsWith(String(holidayYear))).length;

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Settings"
        sub={
          view === "rules"
            ? "The rules the whole team works by"
            : "The messages you copy and send, and who covers whom"
        }
      />

      {sp.msg && (
        <div className="rounded-[18px] border border-brand/25 bg-brand-tint px-5 py-3 text-[13px] font-medium text-ink">
          {sp.msg}
        </div>
      )}

      <PillTabs
        active={view}
        items={[
          { key: "rules", label: "Rules", href: "/settings" },
          { key: "templates", label: "Templates and people", href: "/settings?view=templates" },
        ]}
      />

      {view === "rules" ? (
        <>
          <div className="grid items-start gap-[22px] pg-xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* 6 grouped rule cards (S1) */}
            <div className="grid gap-5 md:grid-cols-2">
              {groups.map((g) => {
                const groupSettings = g.keys
                  .map((k) => db.settings.find((s) => s.key === k))
                  .filter((s): s is NonNullable<typeof s> => Boolean(s));
                return (
                  <section key={g.title} className="flex flex-col gap-4 rounded-[28px] bg-surface p-7 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="t-h2 text-ink">{g.title}</h2>
                      {mayChange && groupSettings.length > 0 && (
                        <details className="group relative">
                          <summary className="t-label cursor-pointer list-none rounded-full border border-rule bg-surface px-4 py-1.5 text-ink hover:bg-sunk [&::-webkit-details-marker]:hidden">
                            Change
                          </summary>
                          <div className="mt-3 flex flex-col gap-3 rounded-[18px] border border-rule bg-sunk p-4">
                            {groupSettings.map((setting) => {
                              const words = settingWords(setting.key, setting.value);
                              return (
                                <form key={setting.key} action={changeSetting} className="flex flex-col gap-2 border-b border-rule pb-3 last:border-b-0 last:pb-0">
                                  <input type="hidden" name="key" value={setting.key} />
                                  <input type="hidden" name="back" value="/settings" />
                                  <label className="t-label text-ink">{words.label}</label>
                                  <div className="flex flex-wrap gap-2">
                                    <input
                                      name="value"
                                      defaultValue={String(setting.value)}
                                      className={figmaField + " w-[100px] bg-surface"}
                                    />
                                    <input
                                      name="reason"
                                      required
                                      placeholder="Why?"
                                      className={figmaField + " min-w-[140px] flex-1 bg-surface"}
                                    />
                                    <button type="submit" className={pillSecondary + " !px-3.5 !py-1.5 !text-[12px]"}>
                                      Save
                                    </button>
                                  </div>
                                </form>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                    <ul className="flex flex-col gap-2.5">
                      {g.lines.map((line) => (
                        <li key={line} className="t-body text-ink-2">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>

            {/* Right rail: BEFORE YOU CHANGE ONE + LAST CHANGES */}
            <aside className="flex flex-col gap-5">
              <section className="flex flex-col gap-2.5 rounded-[28px] bg-surface p-7 shadow-card">
                <p className="t-micro text-ink-3">Before you change one</p>
                <h2 className="t-h2 text-ink">A change asks for a reason</h2>
                <p className="t-body text-ink-2">
                  Type why you are changing it. The reason is saved with the old and the new value, so anyone can see who changed what.
                </p>
              </section>

              <section className="flex flex-col gap-3 rounded-[28px] bg-surface p-7 shadow-card">
                <p className="t-micro text-ink-3">Last changes</p>
                {recentChanges.length === 0 ? (
                  <p className="t-small text-ink-3">No rule changes recorded yet.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {recentChanges.map((a) => {
                      const actor = a.actorId ? memberIn(db, a.actorId)?.name.split(" ")[0] : "";
                      return (
                        <li key={a.id} className="t-small flex items-start gap-2.5">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-info" />
                          <span className="w-[52px] shrink-0 text-ink-3">{shortDay(a.at)}</span>
                          <span className="min-w-0 flex-1 text-ink">
                            {a.reason || a.action}
                            {actor ? ` · ${actor}` : ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </aside>
          </div>

          {/* Quiet System & Admin strip so zero operational settings are lost */}
          <section className="flex flex-col gap-6 rounded-[28px] bg-surface p-7 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="t-micro text-ink-3">System &amp; admin</p>
                <h2 className="t-h2 mt-1 text-ink">Switches, bank details, files and links</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["Public holidays (" + holidayDays + ")", "/holidays"],
                  ["Files & templates", "/files"],
                  ["TA link & people", "/ta"],
                  ["AI & budget", "/ai"],
                  ["Automation health", "/health"],
                  ["Import", "/import"],
                ].map(([label, href]) => (
                  <Link key={href} href={href} className={pillSecondary + " !px-4 !py-1.5 !text-[12px]"}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {switches.length > 0 && (
              <div className="grid gap-3 border-t border-rule pt-5 md:grid-cols-2 pg-lg:grid-cols-3">
                {switches.map((s) => {
                  const words = settingWords(s.key, s.value);
                  const on = Boolean(s.value);
                  const locked = LOCKED_SETTINGS.includes(s.key);
                  return (
                    <div key={s.key} className="flex flex-col justify-between gap-2 rounded-[18px] border border-rule p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="t-body-m text-ink">{words.label}</p>
                          {words.about && <p className="t-small text-ink-3">{words.about}</p>}
                        </div>
                        <span className={"t-label shrink-0 rounded-full px-2.5 py-0.5 " + (on ? "bg-bg-brand text-brand" : "bg-sunk text-ink-3")}>
                          {on ? "On" : "Off"}
                        </span>
                      </div>
                      {mayChange && !locked && (
                        <details>
                          <summary className="t-small cursor-pointer text-ink-3 underline">Change</summary>
                          <form action={changeSetting} className="mt-2 flex flex-wrap gap-2">
                            <input type="hidden" name="key" value={s.key} />
                            <input type="hidden" name="value" value={on ? "false" : "true"} />
                            <input type="hidden" name="back" value="/settings" />
                            <input name="reason" required placeholder="Why?" className={figmaField + " min-w-[120px] flex-1 bg-sunk"} />
                            <button type="submit" className={pillSecondary + " !px-3 !py-1 !text-[12px]"}>
                              Turn {on ? "off" : "on"}
                            </button>
                          </form>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-rule pt-5">
              <p className="t-micro mb-3 text-ink-3">Bank details on invoices</p>
              {mayChange ? (
                <form action={saveBankDetails} className="grid grid-cols-1 gap-3 sm:grid-cols-2 pg-lg:grid-cols-3">
                  {(
                    [
                      ["bank", "Bank", "bank.name"],
                      ["branch", "Branch", "bank.branch"],
                      ["accountName", "Account name", "bank.accountName"],
                      ["accountNumber", "Account number", "bank.accountNumber"],
                      ["swift", "SWIFT (optional)", "bank.swift"],
                    ] as const
                  ).map(([name, label, key]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="t-small text-ink-3">{label}</span>
                      <input name={name} defaultValue={textOf(db, key, "")} className={panelInput} />
                    </label>
                  ))}
                  <div className="flex items-end">
                    <button type="submit" className={pillPrimary}>
                      Save bank details
                    </button>
                  </div>
                </form>
              ) : (
                <p className="t-small text-ink-3">Only the ops lead can change bank details.</p>
              )}
            </div>
          </section>
        </>
      ) : (
        /* S2 · Templates and people */
        <div className="grid items-start gap-[22px] pg-xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid gap-5 md:grid-cols-2">
            {templates.map((t) => {
              const isOpen = selectedTemplate?.key === t.key;
              return (
                <article
                  key={t.key}
                  className={
                    "flex flex-col gap-3 rounded-[28px] bg-surface p-7 shadow-card transition " +
                    (isOpen ? "ring-1 ring-ink" : "")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="t-h2 text-ink">{t.name}</h2>
                      <p className="t-small text-ink-3">
                        {t.channel} · {t.key}
                      </p>
                    </div>
                    <Link
                      href={`/settings?view=templates&open=${encodeURIComponent(t.key)}`}
                      scroll={false}
                      className={
                        "t-label shrink-0 rounded-full px-3.5 py-1.5 " +
                        (isOpen ? "bg-info-soft text-info" : "border border-rule bg-surface text-ink hover:bg-sunk")
                      }
                    >
                      {isOpen ? "• Open" : "Open"}
                    </Link>
                  </div>
                  <p className="t-body line-clamp-3 text-ink-2">{t.body}</p>
                </article>
              );
            })}

            {/* People and cover card */}
            <section className="flex flex-col gap-4 rounded-[28px] bg-surface p-7 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <h2 className="t-h2 text-ink">People and cover</h2>
                {mayChange && (
                  <details className="group">
                    <summary className="t-label cursor-pointer list-none rounded-full border border-rule bg-surface px-4 py-1.5 text-ink hover:bg-sunk [&::-webkit-details-marker]:hidden">
                      Change
                    </summary>
                    <form action={saveCover} className="mt-3 flex flex-col gap-2.5 rounded-[18px] border border-rule bg-sunk p-4">
                      <input type="hidden" name="back" value="/settings?view=templates" />
                      <select name="awayId" required className={panelInput}>
                        <option value="">Who is on leave?</option>
                        {db.members.filter((m) => m.active).map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <select name="coverId" className={panelInput}>
                        <option value="">Clear cover (back at desk)</option>
                        {db.members.filter((m) => m.active).map((m) => (
                          <option key={m.id} value={m.id}>{m.name} covers</option>
                        ))}
                      </select>
                      <input name="until" placeholder="Dates (e.g. 24 to 28 Nov)" className={panelInput} />
                      <input name="reason" required placeholder="Reason" className={panelInput} />
                      <button type="submit" className={pillPrimary + " self-start"}>
                        Save cover
                      </button>
                    </form>
                  </details>
                )}
              </div>

              {covers.length === 0 ? (
                <p className="t-body text-ink-2">Nobody is marked on leave right now. Everyone owns their own clients and roles.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {covers.map((c) => (
                    <div key={c.away.id} className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={c.away.name} size="36" tone="brand" />
                        <div>
                          <p className="t-body-m text-ink">{c.away.name.split(" ")[0]} is on leave</p>
                          {c.until && <p className="t-small text-ink-3">{c.until}</p>}
                        </div>
                      </div>
                      <Icon name="chevron-right" size={14} className="text-ink-3" />
                      <div className="flex items-center gap-2">
                        <Avatar name={c.cover!.name} size="36" tone="info" />
                        <div>
                          <p className="t-body-m text-ink">{c.cover!.name.split(" ")[0]} covers</p>
                          <p className="t-small text-ink-3">All of {c.away.name.split(" ")[0]}&apos;s roles</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-rule pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="t-micro text-ink-3">Ops team &amp; access</h3>
                  {mayChange && (
                    <details className="group">
                      <summary className="t-label cursor-pointer list-none rounded-full border border-rule bg-surface px-4 py-1.5 text-ink hover:bg-sunk [&::-webkit-details-marker]:hidden">
                        Add person
                      </summary>
                      <form action={addOpsMember} className="mt-3 flex flex-col gap-2.5 rounded-[18px] border border-rule bg-sunk p-4">
                        <input type="hidden" name="back" value="/settings?view=templates" />
                        <input name="name" required placeholder="Full name" className={panelInput} />
                        <input name="email" type="email" required placeholder="Email address (must match Clerk login)" className={panelInput} />
                        <select name="role" defaultValue="ops_owner" className={panelInput}>
                          {ASSIGNABLE_ROLES.filter((r) => r !== "admin" || me.role === "admin").map((r) => (
                            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                          ))}
                        </select>
                        <button type="submit" className={pillPrimary + " self-start"}>
                          Add to Ops team
                        </button>
                      </form>
                    </details>
                  )}
                </div>
                <div className="flex flex-col divide-y divide-rule">
                  {db.members.filter((m) => m.active).map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="t-body-m truncate text-ink">{m.name}</p>
                        <p className="t-small truncate text-ink-3">{m.email}</p>
                      </div>
                      <span className="t-label shrink-0 rounded-full bg-sunk px-3 py-1 text-ink-2">
                        {ROLE_LABEL[m.role]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Right rail: OPEN TEMPLATE live editor */}
          <aside className="flex flex-col gap-4 rounded-[28px] bg-surface p-7 shadow-card">
            {selectedTemplate ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="t-micro text-ink-3">Open template</p>
                    <h2 className="t-h2 mt-1 text-ink">{selectedTemplate.name}</h2>
                    <p className="t-small text-ink-3">
                      Channel: {selectedTemplate.channel} · key `{selectedTemplate.key}`
                    </p>
                  </div>
                  <Link
                    href="/settings?view=templates"
                    scroll={false}
                    aria-label="Close"
                    className="flex size-9 items-center justify-center rounded-full border border-rule text-ink hover:bg-sunk"
                  >
                    <Icon name="x" size={16} />
                  </Link>
                </div>

                <form action={saveTemplateWording} className="flex flex-col gap-3.5 border-t border-rule pt-4">
                  <input type="hidden" name="key" value={selectedTemplate.key} />
                  <input type="hidden" name="name" value={selectedTemplate.name} />
                  <input type="hidden" name="back" value={`/settings?view=templates&open=${encodeURIComponent(selectedTemplate.key)}`} />
                  {selectedTemplate.approvedForAuto && <input type="hidden" name="approvedForAuto" value="on" />}

                  {selectedTemplate.channel === "email" && (
                    <label className="flex flex-col gap-1">
                      <span className="t-small text-ink-3">Subject</span>
                      <input
                        name="subject"
                        defaultValue={selectedTemplate.subject}
                        readOnly={!mayEditTemplate}
                        className={panelInput}
                      />
                    </label>
                  )}

                  <label className="flex flex-col gap-1">
                    <span className="t-small text-ink-3">Message wording</span>
                    <textarea
                      name="body"
                      rows={11}
                      defaultValue={selectedTemplate.body}
                      readOnly={!mayEditTemplate}
                      className={panelInput + " min-h-[220px] resize-y"}
                    />
                  </label>

                  <p className="t-small text-ink-3">
                    {mayEditTemplate
                      ? "Changes take effect on the next drafted message."
                      : "Only the ops lead can edit template wording."}
                  </p>

                  {mayEditTemplate && (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button type="submit" className={pillPrimary}>
                        Save the template
                      </button>
                      <Link href="/settings?view=templates" scroll={false} className={pillSecondary}>
                        Close
                      </Link>
                    </div>
                  )}
                </form>
              </>
            ) : (
              <p className="t-body text-ink-3">Select a template to preview or edit its wording.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
