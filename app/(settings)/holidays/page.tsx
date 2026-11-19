import { redirect } from "next/navigation";

import { addHolidayList, dropHoliday } from "@/app/actions";
import { desk } from "@/data/desk";
import { colomboDate } from "@/lib/calendar";
import { fromTodayOn, gapInTheList, holidayYears } from "@/lib/holidays";
import { can, refusal } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * The days the office is shut (15, Phase 1 step 10).
 *
 * This list is not an extra: every working-day clock in Ops counts against it
 * — the seven working days of CV ownership, the sixty to find a replacement,
 * the five after a no-show. While it is empty those clocks treat a poya day as
 * a working day and come due when nobody is in, which is the kind of wrong
 * that nobody notices until a client is annoyed.
 *
 * So the screen says plainly how far the list reaches, and takes a pasted
 * block, because that is how the list exists in the world.
 */
export default async function HolidaysPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { msg } = await searchParams;
  const mayEdit = can(member, "settings.manage");

  const db = await desk();
  const today = colomboDate(Date.now());
  const all = [...db.holidays].sort((a, b) => a.date.localeCompare(b.date));
  const ahead = fromTodayOn(all, today);
  const gap = gapInTheList(all, today);
  const field = "w-full rounded-[10px] border border-rule bg-surface px-3.5 py-2.5 text-[14px]";

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-1.5 p-1">
        <h1 className="t-display">Holidays</h1>
        <p className="t-small text-ink-3">
        The days Sri Lanka is shut. Every clock counted in working days skips them, as the TA System does.
      </p>
      </div>

      {msg && <p className="rounded-[18px] bg-sunk px-4 py-3 t-small">{msg}</p>}

      {gap && (
        <p className="rounded-[18px] bg-sunk px-4 py-3 t-small">
          <span className="font-medium">Not finished:</span> {gap}
        </p>
      )}

      <section className="rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
        <h2 className="t-h2">Add the list</h2>
        {mayEdit ? (
          <form action={addHolidayList} className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              One a line: the date, then the name
              <textarea
                name="pasted"
                rows={8}
                placeholder={"2027-01-15, Thai Pongal\n2027-01-22, Duruthu Full Moon Poya\n2027-02-04, Independence Day"}
                className={field + " font-mono text-[12.5px]"}
              />
            </label>
            <button className="self-start rounded-full border border-rule-strong bg-surface px-5 py-[11px] text-[14px] font-medium hover:bg-sunk">
              Add them
            </button>
            <p className="text-[12px] text-ink-faint">
              A date already on the list is skipped. A line that is not a date is said back rather than dropped.
            </p>
          </form>
        ) : (
          <p className="mt-2 text-[13px] text-ink-faint">{refusal("settings.manage")}</p>
        )}
      </section>

      <section className="rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
        <h2 className="t-h2">
          Still to come
          <span className="ml-2 text-[12px] font-normal text-ink-faint">
            {ahead.length} days{holidayYears(all).length ? " · " + holidayYears(all).join(", ") : ""}
          </span>
        </h2>
        {ahead.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing ahead. Every clock counts five days a week.</p>}
        {ahead.map((day) => (
          <div key={day.date} className="flex flex-wrap items-baseline gap-x-3 border-t border-rule py-2 first:border-t-0">
            <span className="text-[13.5px] font-mono">{day.date}</span>
            <span className="text-[13px]">{day.name || "no name given"}</span>
            {mayEdit && (
              <form action={dropHoliday} className="ml-auto">
                <input type="hidden" name="date" value={day.date} />
                <button className="text-[12px] text-ink-faint hover:text-ink hover:underline">Not a holiday</button>
              </form>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
