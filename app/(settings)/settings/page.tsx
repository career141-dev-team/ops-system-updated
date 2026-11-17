import { redirect } from "next/navigation";
import { changeSetting } from "@/app/actions";
import { desk } from "@/data/desk";
import { figmaField, pillSecondary } from "@/app/ui/figma";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { LOCKED_SETTINGS } from "@/lib/settingsRules";
import Link from "next/link";
import { isFrameRule, isInternal, settingRank, settingWords } from "@/lib/settingWords";
import Icon from "@/app/Icon";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { msg } = await searchParams;
  const mayChange = can(member, "settings.manage");

  const db = await desk();
  const settings = db.settings.filter((s) => !isInternal(s.key)).sort((a, b) => settingRank(a.key) - settingRank(b.key) || a.key.localeCompare(b.key));
  const switches = settings.filter(
    (s) => s.key.startsWith("switch.") || typeof s.value === "boolean",
  );
  const numbers = settings.filter((s) => !switches.includes(s));
  const frameRules = numbers.filter((s) => isFrameRule(s.key));
  const otherRules = numbers.filter((s) => !isFrameRule(s.key));
  const holidayYear = new Date().getFullYear();
  const holidayDays = db.holidays.filter((h) => h.date.startsWith(String(holidayYear))).length;

  const RULE = (setting: (typeof numbers)[number]) => {
          const words = settingWords(setting.key, setting.value);
          return (
            <div key={setting.key} className="border-b border-rule py-4 first:pt-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-[200px] flex-1">
                  <div className="text-[16px] leading-[26px] text-ink">{words.label}</div>
                  {words.about && <div className="text-[14px] leading-[21px] text-ink-faint">{words.about}</div>}
                </div>
                {mayChange ? (
                  // Edit in place (no overlays): the value is the summary, the form opens under it.
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-sunk px-4 py-2 text-[14px] font-medium leading-[21px] text-ink [&::-webkit-details-marker]:hidden">
                      {words.shown}
                      <Icon name="pen" size={14} className="text-ink-faint" />
                    </summary>
                    <form action={changeSetting} className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <input type="hidden" name="key" value={setting.key} />
                      <input name="value" defaultValue={String(setting.value)} aria-label={words.label} className={figmaField + " w-[120px] bg-sunk"} />
                      <input name="reason" placeholder="Why?" aria-label="Why change it" className={figmaField + " w-[180px]"} />
                      <button type="submit" className={pillSecondary}>
                        Save
                      </button>
                    </form>
                  </details>
                ) : (
                  <span className="rounded-full bg-sunk px-4 py-2 text-[14px] font-medium leading-[21px] text-ink">{words.shown}</span>
                )}
              </div>
            </div>
          );
        };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[26px] leading-[34px] text-ink">
          Timers and working days
        </h2>
        <p className="mt-1 text-[14px] leading-[21px] text-ink-soft">
          {mayChange
            ? "Every clock in the system runs from these. Only the ops lead can change them, and every change asks why."
            : "Every clock in the system runs from these. Only the ops lead can change them."}
        </p>
      </div>

      {msg && (
        <div className="rounded-[18px] border border-brand/25 bg-brand-tint px-4 py-3 text-[13px] font-medium text-ink">
          {msg}
        </div>
      )}

      <section className="flex flex-col">
        {frameRules.map(RULE)}
      </section>

      {/* Public holidays have a line of their own in the frame; the page itself is /holidays. */}
      <div className="flex items-center justify-between gap-4 pt-2 text-[14px] leading-[21px]">
        <span className="flex items-center gap-2.5 text-ink-soft">
          <Icon name="calendar" size={16} className="text-ink-faint" />
          Public holidays {holidayYear} · {holidayDays} days loaded
        </span>
        <Link href="/holidays" className="text-ink underline">
          Edit
        </Link>
      </div>

      {otherRules.length > 0 && (
        <div className="pt-2">
          <div className="mb-2 text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">OTHER RULES</div>
          <section className="flex flex-col">
            {otherRules.map(RULE)}
          </section>
        </div>
      )}

      <div className="pt-2">
        <div className="mb-2 text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">
          SYSTEM SWITCHES
        </div>
        <section className="divide-y divide-rule">
          {switches.map((setting) => (
            <div
              key={setting.key}
              className="flex flex-wrap items-center justify-between gap-4 py-3.5"
            >
              <div className="min-w-[200px] flex-1">
                <span className="text-[14.5px] text-ink">
                  {setting.key.replace("switch.", "")}
                </span>
                <span
                  className={`ml-2.5 text-[12.5px] font-medium ${
                    setting.value === true ? "text-brand" : "text-ink-faint"
                  }`}
                >
                  {setting.value === true ? "on" : "off"}
                </span>
              </div>
              {LOCKED_SETTINGS.includes(setting.key) ? (
                <span className="text-[12px] text-ink-faint">
                  Set by the owner at release time
                </span>
              ) : (
                mayChange && (
                  <form action={changeSetting} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="key" value={setting.key} />
                    <input
                      name="reason"
                      placeholder="Why?"
                      className={figmaField + " w-[160px]"}
                    />
                    <button type="submit" className={pillSecondary}>
                      Turn {setting.value === true ? "off" : "on"}
                    </button>
                  </form>
                )
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
