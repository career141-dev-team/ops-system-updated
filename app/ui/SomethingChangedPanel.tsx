import Link from "next/link";

import Icon from "@/app/Icon";
import Panel from "@/app/ui/Panel";

/**
 * G2 "Something changed" (frame 145:60): a list of what happened, each row a link to its short form.
 * Presentational: the page decides the rows and their hrefs (usually `panelHref(path, params, "...", id)`).
 * A row with no `href` is shown but not a link; `note` is the small grey text before the chevron.
 */
export default function SomethingChangedPanel({
  title,
  sub,
  intro = "What happened? Each choice opens a short form.",
  rows,
  closeHref,
}: {
  title: string;
  sub?: string;
  intro?: string;
  rows: { label: string; href?: string; note?: string }[];
  closeHref: string;
}) {
  return (
    <Panel kicker="Something changed" title={title} sub={sub} closeHref={closeHref}>
      <p className="t-body pb-[18px] text-ink-2">{intro}</p>
      {rows.map((r) => {
        const inner = (
          <>
            <span className="t-body min-w-0 flex-1 text-ink">{r.label}</span>
            {r.note && <span className="t-small shrink-0 text-ink-faint">{r.note}</span>}
            <Icon name="chevron-right" size={18} className="shrink-0 text-ink-faint" />
          </>
        );
        const cls = "flex items-center gap-2.5 border-t border-rule py-[15px]";
        return r.href ? (
          <Link key={r.label} href={r.href} scroll={false} className={cls + " hover:bg-sunk/60"}>
            {inner}
          </Link>
        ) : (
          <div key={r.label} className={cls}>
            {inner}
          </div>
        );
      })}
    </Panel>
  );
}
