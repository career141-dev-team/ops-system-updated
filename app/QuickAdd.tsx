"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { quickAdd } from "@/app/actions";
import Icon from "@/app/Icon";
import { LEAD_SOURCES, SOURCE_MEANINGS } from "@/lib/leads";

/**
 * Quick-add from anywhere (7 Nov, UX order 5).
 *
 * Three small forms in the sidebar: a call, a note, an enquiry. Each saves
 * through the same action the full screen uses and sends you back to the
 * page you were on, with the three-second line saying so. No overlay and no
 * drawer (the owner's rule): it is a `details` that opens in the sidebar's
 * own column and pushes the menu down while it is open.
 *
 * The browser refuses an empty required field before anything is sent, so
 * the only round trip is a save. The server's own rules stand behind it,
 * and a refusal from there comes back as the same three-second line.
 */
export default function QuickAdd({ clients, inBar = false }: { clients: { id: string; name: string }[]; inBar?: boolean }) {
  const path = usePathname() ?? "/";
  const field =
    "w-full rounded-md border border-shell-rule bg-surface px-2 py-1.5 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-brand";
  const save = "mt-1.5 self-start rounded-md bg-brand px-2.5 py-1 text-[12px] font-medium text-white active:scale-[0.98]";
  const row = "flex flex-col gap-1.5 px-2 pb-2 pt-1";
  const sub = "cursor-pointer select-none px-2 py-1 text-[12.5px] text-ink-soft hover:text-ink";

  // In the top bar (13 Nov, Figma "Create"): the round black + and the three
  // forms in a panel under it. The bar itself already floats over the page by
  // the owner's decision, and there is no column for them to push down.
  const summary = inBar ? (
    <summary
      aria-label="Add a call, a note or an enquiry"
      title="Add a call, a note or an enquiry"
      className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full bg-ink text-ink-inverse transition-transform active:scale-[0.96] [&::-webkit-details-marker]:hidden"
    >
      <Icon name="plus" size={20} />
    </summary>
  ) : (
    <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-[7px] text-[13.5px] text-ink-soft hover:bg-shell-sunk hover:text-ink">
      <Icon name="plus" size={16} />
      <span className="flex-1">Add</span>
      <span className="text-[11px] text-ink-faint group-open:hidden">a call, a note, an enquiry</span>
    </summary>
  );

  return (
    <details className={inBar ? "group relative" : "group rounded-lg"}>
      {summary}
      <div className={inBar ? "absolute right-0 top-[52px] z-30 w-[300px] rounded-panel bg-surface p-2 shadow-float" : ""}>
      <Link
        href="/leads/new"
        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-brand hover:bg-sunk"
      >
        <span>Capture a lead</span>
        <Icon name="arrow-right" size={14} />
      </Link>

      <datalist id="quick-clients">
        {clients.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>

      {/* A call: the same call log as /calls, without the task. */}
      <details className="mt-1">
        <summary className={sub}>A call</summary>
        <form action={quickAdd} className={row}>
          <input type="hidden" name="kind" value="call" />
          <input type="hidden" name="back" value={path} />
          <input name="to" required placeholder="077 123 4567" aria-label="Their number" className={field} />
          <input name="spokeTo" required placeholder="who you spoke to" aria-label="Who you spoke to" className={field} />
          <input name="about" list="quick-clients" placeholder="which client (optional)" aria-label="Which client" className={field} />
          <textarea name="outcome" required rows={2} placeholder="what was said" aria-label="What was said" className={field} />
          <button type="submit" className={save}>Write it down</button>
        </form>
      </details>

      {/* A note: a task to yourself, on Your day tomorrow morning. */}
      <details>
        <summary className={sub}>A note</summary>
        <form action={quickAdd} className={row}>
          <input type="hidden" name="kind" value="note" />
          <input type="hidden" name="back" value={path} />
          <textarea name="text" required rows={3} placeholder="the first line is the title" aria-label="The note" className={field} />
          <input name="about" list="quick-clients" placeholder="which client (optional)" aria-label="Which client" className={field} />
          <button type="submit" className={save}>Keep it</button>
        </form>
      </details>

      {/* An enquiry: the same lead as /leads, with the two checks waiting on its page. */}
      <details>
        <summary className={sub}>An enquiry</summary>
        <form action={quickAdd} className={row}>
          <input type="hidden" name="kind" value="enquiry" />
          <input type="hidden" name="back" value={path} />
          <input name="company" required placeholder="the company" aria-label="The company" className={field} />
          <input name="contactName" placeholder="who rang" aria-label="Who rang" className={field} />
          <input name="contactPhone" placeholder="their number" aria-label="Their number" className={field} />
          <input name="contactEmail" placeholder="or their email" aria-label="Their email" className={field} />
          <select name="source" defaultValue="call" aria-label="Where it came from" className={field}>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_MEANINGS[s]}
              </option>
            ))}
          </select>
          <button type="submit" className={save}>Save the enquiry</button>
        </form>
      </details>
      </div>
    </details>
  );
}
