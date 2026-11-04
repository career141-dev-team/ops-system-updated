/**
 * One part of the record, open only if it is the step you are on
 * (24, section 4, part 4).
 *
 * The lead page used to show nine forms at once and say nothing about which
 * one mattered. A part is shut by default and says in one line what it holds,
 * so the page reads as a list of where this thing has been - and the step the
 * card names is already open when you arrive.
 *
 * It is a plain `details`, so it needs no JavaScript, keyboard and screen
 * readers already know it, and it is not an overlay: the page grows, nothing
 * covers anything.
 */
export default function Part({
  title,
  says,
  open,
  children,
}: {
  title: string;
  /** What this part holds, in a few words, readable while it is shut. */
  says?: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="rounded-2xl border border-rule bg-surface px-5 py-4">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[14.5px] font-medium">{title}</span>
        {says && <span className="text-[12.5px] text-ink-soft">{says}</span>}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
