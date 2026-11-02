import { redirect } from "next/navigation";

import { repo } from "@/data/store";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * Every number and switch in one place (15, Phase 1 steps 8 and 9), so nothing
 * that matters is buried in the code. Only the ops lead may change them, which
 * arrives with the editing step; this is the read.
 */
export default async function SettingsPage() {
  const member = await currentMember();
  if (!member) redirect("/sign-in");

  const settings = repo.settings();
  const switches = settings.filter((s) => s.key.startsWith("switch."));
  const numbers = settings.filter((s) => !s.key.startsWith("switch."));

  return (
    <div className="max-w-[760px]">
      <h1 className="text-[17px] font-medium">Settings</h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        {can(member, "settings.manage")
          ? "You can change these once the editing step is built."
          : "Only the ops lead can change these."}
      </p>

      <section className="mt-5 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">Switches</h2>
        {switches.map((setting) => (
          <div key={setting.key} className="flex items-center justify-between border-t border-rule py-2.5 first:border-t-0">
            <span className="text-[13.5px]">{setting.key.replace("switch.", "")}</span>
            <span className={"text-[13px] " + (setting.value === true ? "text-brand" : "text-ink-faint")}>
              {setting.value === true ? "on" : "off"}
            </span>
          </div>
        ))}
      </section>

      <section className="mt-3 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">Numbers</h2>
        {numbers.map((setting) => (
          <div key={setting.key} className="flex items-center justify-between border-t border-rule py-2.5 first:border-t-0">
            <span className="text-[13.5px]">{setting.key}</span>
            <span className="text-[13px] text-ink-soft">{String(setting.value)}</span>
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
