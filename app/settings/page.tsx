import { redirect } from "next/navigation";

import { repo } from "@/data/store";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { changeSetting } from "@/app/actions";
import { LOCKED_SETTINGS } from "@/lib/settingsRules";

/**
 * Every number and switch in one place (15, Phase 1 steps 8 and 9), so nothing
 * that matters is buried in the code. Only the ops lead may change them, which
 * arrives with the editing step; this is the read.
 */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { msg } = await searchParams;
  const mayChange = can(member, "settings.manage");

  const settings = repo.settings();
  const switches = settings.filter((s) => s.key.startsWith("switch."));
  const numbers = settings.filter((s) => !s.key.startsWith("switch."));

  return (
    <div className="max-w-[760px]">
      <h1 className="text-[17px] font-medium">Settings</h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        {mayChange
          ? "Change any of these. Every change asks why, and is written down with the old value."
          : "Only the ops lead can change these."}
      </p>

      {msg && (
        <p className="mt-3 rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>
      )}

      <section className="mt-5 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">Switches</h2>
        {switches.map((setting) => (
          <div key={setting.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-rule py-2.5 first:border-t-0">
            <span className="flex-1 text-[13.5px]">{setting.key.replace("switch.", "")}</span>
            <span className={"text-[13px] " + (setting.value === true ? "text-brand" : "text-ink-faint")}>
              {setting.value === true ? "on" : "off"}
            </span>
            {LOCKED_SETTINGS.includes(setting.key) ? (
              <span className="text-[12px] text-ink-faint">
                Set by the owner at release time, not here
              </span>
            ) : (
              mayChange && (
                <form action={changeSetting} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="key" value={setting.key} />
                  <input
                    name="reason"
                    placeholder="Why?"
                    className="w-[160px] rounded-lg border border-rule bg-paper px-2.5 py-1 text-[12.5px]"
                  />
                  <button className="rounded-full border border-rule-strong px-3 py-1 text-[12px] hover:bg-paper">
                    Turn {setting.value === true ? "off" : "on"}
                  </button>
                </form>
              )
            )}
          </div>
        ))}
      </section>

      <section className="mt-3 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">Numbers</h2>
        {numbers.map((setting) => (
          <div key={setting.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-rule py-2.5 first:border-t-0">
            <span className="flex-1 text-[13.5px]">{setting.key}</span>
            {mayChange ? (
              <form action={changeSetting} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="key" value={setting.key} />
                <input
                  name="value"
                  defaultValue={String(setting.value)}
                  className="w-[90px] rounded-lg border border-rule bg-paper px-2.5 py-1 text-[12.5px]"
                />
                <input
                  name="reason"
                  placeholder="Why?"
                  className="w-[160px] rounded-lg border border-rule bg-paper px-2.5 py-1 text-[12.5px]"
                />
                <button className="rounded-full border border-rule-strong px-3 py-1 text-[12px] hover:bg-paper">
                  Save
                </button>
              </form>
            ) : (
              <span className="text-[13px] text-ink-soft">{String(setting.value)}</span>
            )}
          </div>
        ))}
      </section>

      <section className="mt-3 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">Holidays</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          Working days skip these, so "seven working days" means the same everywhere.
        </p>
        {repo.holidays().map((date) => (
          <p key={date} className="border-t border-rule py-2 text-[13.5px] first:border-t-0">
            {date}
          </p>
        ))}
      </section>
    </div>
  );
}
