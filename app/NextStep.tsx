import type { ReactNode } from "react";

/**
 * "What to do now" (23, section 4).
 *
 * The card at the top of every page about one thing. It says where this is,
 * what is waiting and on whom, and holds the one or two things that move it -
 * and then, in its own line, what will happen by itself and when.
 *
 * It is a piece of layout and nothing more: every word in it comes from the
 * rules in `src/lib`, so it cannot drift from what the buttons will really
 * let a person do.
 */
export default function NextStep({
  where,
  waiting,
  clock,
  children,
}: {
  /** Where this thing is, in a few words. */
  where: string;
  /** What is waiting, and on whom. One sentence. */
  waiting: string;
  /** What will happen by itself, and when. Left out when nothing will. */
  clock?: string | null;
  /** The one or two things that move it. */
  children?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-brand bg-surface px-5 py-4">
      <h2 className="text-[12px] uppercase tracking-[0.08em] text-ink-faint">What to do now</h2>
      <p className="mt-1 text-[15px]">{waiting}</p>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">{where}</p>
      {children && <div className="mt-3 flex flex-wrap items-end gap-2">{children}</div>}
      {clock && <p className="mt-3 border-t border-rule pt-2 text-[12px] text-ink-faint">{clock}</p>}
    </section>
  );
}
