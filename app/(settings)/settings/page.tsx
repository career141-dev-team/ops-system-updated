import { redirect } from "next/navigation";
import { changeSetting } from "@/app/actions";
import { desk } from "@/data/desk";
import { figmaField, pillSecondary } from "@/app/ui/figma";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { LOCKED_SETTINGS } from "@/lib/settingsRules";

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
  const settings = [...db.settings].sort((a, b) => a.key.localeCompare(b.key));
  const switches = settings.filter(
    (s) => s.key.startsWith("switch.") || typeof s.value === "boolean",
  );
  const numbers = settings.filter((s) => !switches.includes(s));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-serif text-[26px] font-medium leading-[1.2] text-ink">
          Timers and working days
        </h2>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          {mayChange
            ? "Every clock in the system runs from these. Only the ops lead can change them, and every change asks why."
            : "Every clock in the system runs from these. Only the ops lead can change them."}
        </p>
      </div>

      {msg && (
        <div className="rounded-[18px] border border-brand/25 bg-bg-brand px-4 py-3 text-[13px] font-medium text-ink">
          {msg}
        </div>
      )}

      <section className="divide-y divide-edge">
        {numbers.map((setting) => (
          <div
            key={setting.key}
            className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0"
          >
            <div className="min-w-[200px] flex-1">
              <div className="text-[15px] font-medium text-ink">{setting.key}</div>
            </div>
            {mayChange ? (
              <form action={changeSetting} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="key" value={setting.key} />
                <input
                  name="value"
                  defaultValue={String(setting.value)}
                  className={figmaField + " w-[120px] bg-sunk"}
                />
                <input
                  name="reason"
                  placeholder="Why?"
                  className={figmaField + " w-[180px]"}
                />
                <button type="submit" className={pillSecondary}>
                  Save
                </button>
              </form>
            ) : (
              <span className="rounded-[10px] bg-sunk px-3.5 py-2 text-[13.5px] font-medium text-ink">
                {String(setting.value)}
              </span>
            )}
          </div>
        ))}
      </section>

      <div className="pt-2">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
          SYSTEM SWITCHES
        </div>
        <section className="divide-y divide-edge">
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
