import Link from "next/link";

import Icon from "@/app/Icon";

/**
 * The pieces every screen is made of (25, section 2).
 *
 * The owner sent two screens of an ATS on 5 November and asked for the same
 * feel: a white page, hairline rules, small type, soft chips, one green. The
 * point of putting them here is that there is **one** of each - one page
 * header, one tab bar, one table row - so twenty-six screens cannot drift
 * into twenty-six shapes, which is exactly how the old ones got sloppy.
 *
 * Nothing here is a modal, a drawer or an overlay. Nothing here hides
 * behind a hover.
 */

/* ── The top of a page ──────────────────────────────────────────── */

export function PageHead({
  crumbs,
  title,
  meta,
  actions,
}: {
  /** Home › Positions › Head of finance. The last one is not a link. */
  crumbs?: { what: string; href?: string }[];
  title: string;
  /** One line under the title: where this stands, who owns it. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav className="mb-1 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-faint">
            {crumbs.map((crumb, i) => (
              <span key={crumb.what + i} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">›</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-ink">
                    {crumb.what}
                  </Link>
                ) : (
                  <span className="text-ink-soft">{crumb.what}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[18px] font-medium leading-tight">{title}</h1>
        {meta && <p className="mt-1 text-[12.5px] text-ink-soft">{meta}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── One tab bar, and never a second one on the same page ───────── */

export function Tabs({
  tabs,
  here,
}: {
  tabs: { key: string; what: string; href: string; count?: number }[];
  here: string;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-x-1 border-b border-rule">
      {tabs.map((tab) => {
        const on = tab.key === here;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] " +
              (on
                ? "border-brand font-medium text-ink"
                : "border-transparent text-ink-soft hover:text-ink")
            }
          >
            {tab.what}
            {typeof tab.count === "number" && tab.count > 0 && (
              <span className="rounded-full bg-sunk px-1.5 text-[11.5px] text-ink-faint">{tab.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/* ── Buttons ────────────────────────────────────────────────────── */

export const buttonClass =
  "inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-ink-inverse " +
  "transition-transform duration-150 ease-out hover:bg-brand-strong active:scale-[0.98]";

export const quietButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-rule-strong bg-surface px-3 py-1.5 text-[13px] " +
  "text-ink transition-transform duration-150 ease-out hover:bg-sunk active:scale-[0.98]";

export const fieldClass =
  "w-full rounded-lg border border-rule-strong bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint";

/* ── Chips: a small fact with a tint ────────────────────────────── */

export function Chip({
  children,
  tone = "quiet",
}: {
  children: React.ReactNode;
  tone?: "quiet" | "brand" | "late" | "careful" | "done";
}) {
  const tones: Record<string, string> = {
    quiet: "bg-sunk text-ink-soft",
    brand: "bg-bg-brand text-brand",
    late: "bg-bg-danger text-danger",
    careful: "bg-bg-warning text-warning",
    done: "bg-bg-ok text-ink-soft",
  };
  return (
    <span className={"inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] " + tones[tone]}>
      {children}
    </span>
  );
}

/** A coloured dot before a stage or a state. The words carry the meaning. */
export function Dot({ tone = "quiet" }: { tone?: "quiet" | "brand" | "late" | "careful" }) {
  const tones: Record<string, string> = {
    quiet: "bg-rule-strong",
    brand: "bg-brand",
    late: "bg-danger",
    careful: "bg-warning",
  };
  return <span className={"h-2 w-2 shrink-0 rounded-full " + tones[tone]} aria-hidden="true" />;
}

/* ── A card, a table, and a row ─────────────────────────────────── */

export function Card({
  title,
  says,
  children,
  className = "",
}: {
  title?: string;
  says?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={"rounded-xl border border-rule bg-surface " + className}>
      {(title || says) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-rule px-4 py-3">
          {title && <h2 className="text-[13.5px] font-medium">{title}</h2>}
          {says && <p className="text-[12.5px] text-ink-soft">{says}</p>}
        </div>
      )}
      {children && <div className="px-4 py-3">{children}</div>}
    </section>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-rule bg-surface">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-rule">
            {head.map((cell) => (
              <th
                key={cell}
                className="whitespace-nowrap px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.04em] text-ink-faint"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-rule last:border-b-0 hover:bg-sunk">{children}</tr>;
}

export function Cell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={"px-4 py-3 align-top text-[13px] " + className}>{children}</td>;
}

/* ── Nothing here, and why ──────────────────────────────────────── */

/**
 * An empty place says what would fill it (25, section 5).
 *
 * "Nothing here" teaches nobody anything. A person new to the system learns
 * what it does from the empty screens as much as the full ones.
 */
export function Empty({ what }: { what: string }) {
  return <p className="px-4 py-6 text-[13px] text-ink-soft">{what}</p>;
}

/* ── A list page: the toolbar, and the table it sits over ───────── */

/**
 * Search, order, and what was found (25, section 7).
 *
 * A plain GET form, so it works with no JavaScript, the browser's back button
 * does what it should, and a search a person wants to keep is a URL they can
 * send somebody. The owner's reference screen has the same three things in
 * the same order.
 */
export function Toolbar({
  action,
  q,
  sort,
  found,
  sorts,
  extra,
}: {
  action: string;
  q?: string;
  sort?: string;
  found: string;
  sorts: { key: string; what: string }[];
  extra?: React.ReactNode;
}) {
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-rule-strong bg-surface px-3 py-1.5">
        <Icon name="search" className="text-ink-faint" size={15} />
        <input
          name="q" autoComplete="off"
          defaultValue={q ?? ""}
          placeholder="Search by name, client, owner or what it says"
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
        />
      </label>

      <label className="flex items-center gap-2 rounded-lg border border-rule-strong bg-surface px-3 py-1.5 text-[12.5px] text-ink-soft">
        <span className="whitespace-nowrap">Sorted by</span>
        <select name="sort" defaultValue={sort ?? sorts[0].key} className="bg-transparent text-[12.5px] text-ink outline-none">
          {sorts.map((one) => (
            <option key={one.key} value={one.key}>
              {one.what}
            </option>
          ))}
        </select>
      </label>

      <button className={quietButtonClass}>Apply</button>
      {extra}
      <span className="ml-auto text-[12.5px] text-ink-faint">{found}</span>
    </form>
  );
}

/**
 * One row of a list, in the shape every list uses.
 *
 * The name and its one line of plain words in the first column - because that
 * is what a person reads - then the chips, then who owns it and when it last
 * moved. Four columns, and the same four everywhere.
 */
export function ListRow({
  href,
  title,
  says,
  chips,
  who,
  when,
  late,
}: {
  href: string;
  title: string;
  says: string;
  chips?: { what: string; tone?: "quiet" | "brand" | "late" | "careful" | "done" }[];
  who: string;
  when: string;
  late?: boolean;
}) {
  return (
    <Row>
      <Cell className="min-w-[280px]">
        <Link href={href} className="text-[13.5px] font-medium text-brand hover:underline">
          {title}
        </Link>
        <p className={"mt-0.5 text-[12.5px] " + (late ? "text-danger" : "text-ink-soft")}>{says}</p>
      </Cell>
      <Cell>
        <span className="flex flex-wrap gap-1">
          {(chips ?? []).map((chip, i) => (
            <Chip key={chip.what + i} tone={chip.tone}>
              {chip.what}
            </Chip>
          ))}
        </span>
      </Cell>
      <Cell className="whitespace-nowrap text-[12.5px] text-ink-soft">{who}</Cell>
      <Cell className="whitespace-nowrap text-[12.5px] text-ink-faint">{when}</Cell>
    </Row>
  );
}

/** The four columns every list has, so no two lists disagree. */
export const LIST_HEAD = ["Name", "State", "Owner", "Last moved"];
