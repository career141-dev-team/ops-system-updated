import Link from "next/link";
import type { ReactNode } from "react";

import Icon, { type IconName } from "@/app/Icon";

/**
 * Shared Figma components from "Ops System" (ACJZ96veiBLHJhUTfOt9tu).
 *
 * The older screens sit inside `PageBox` (a rounded white sheet). The v6 screens (19 Nov) are
 * canvas with cards on it: use `PageTitle`, `Card`, `DataTable`, `EmptyState`, `PanelField` at
 * the foot of this file. A state panel is `app/ui/Panel.tsx`; nothing else opens over a page.
 */

export type Tone =
  | "brand"
  | "ok"
  | "warn"
  | "danger"
  | "info"
  | "violet"
  | "neutral"
  | "quiet";


const AVATAR_TONES = [
  "bg-bg-brand text-brand",
  "bg-info-soft text-info",
  "bg-warn-soft text-warn",
  "bg-violet-soft text-violet",
] as const;

export function initialsFor(name: string | null | undefined): string {
  const clean = (name ?? "").trim();
  if (!clean) return "—";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function toneForName(
  name: string | null | undefined,
): (typeof AVATAR_TONES)[number] {
  const clean = (name ?? "").trim().toLowerCase();
  if (!clean) return AVATAR_TONES[0];
  if (clean.startsWith("rushda")) return AVATAR_TONES[0];
  if (
    clean.startsWith("zainab") ||
    clean.startsWith("chathura") ||
    clean.startsWith("nadeesha")
  )
    return AVATAR_TONES[1];
  if (clean.startsWith("rakshana")) return AVATAR_TONES[2];
  if (clean.startsWith("jesmeen")) return AVATAR_TONES[3];
  let hash = 0;
  for (let i = 0; i < clean.length; i++)
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function Avatar({
  name,
  size = "28",
  tone,
  className = "",
}: {
  name: string | null | undefined;
  size?: "24" | "28" | "32" | "36" | "40" | "48";
  tone?: "green" | "ok" | "brand" | "info" | "warn" | "violet" | "neutral" | "danger";
  className?: string;
}) {
  const toneCls =
    tone === "green" || tone === "ok" || tone === "brand"
      ? AVATAR_TONES[0]
      : tone === "info"
        ? AVATAR_TONES[1]
        : tone === "warn"
          ? AVATAR_TONES[2]
          : tone === "violet"
            ? AVATAR_TONES[3]
            : tone === "danger"
              ? "bg-bg-danger text-danger"
              : tone === "neutral"
                ? "bg-sunk text-ink-soft"
                : toneForName(name);
  const sizeCls =
    size === "24"
      ? "size-[24px] text-[11px] leading-[14px]"
      : size === "28"
        ? "size-[28px] text-[12px] leading-[16px] tracking-[0.4px]"
        : size === "32"
          ? "size-[32px] text-[12px] leading-[16px]"
          : size === "36"
            ? "size-[36px] text-[13px] leading-[18px]"
            : size === "48"
              ? "size-[48px] text-[16px] leading-[22px]"
              : "size-[40px] text-[14px] leading-[21px]";
  return (
    <span
      className={
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium " +
        toneCls +
        " " +
        sizeCls +
        (className ? " " + className : "")
      }
    >
      {initialsFor(name)}
    </span>
  );
}

/**
 * The fixed outer white sheet box (`rounded-sheet bg-surface shadow-card`)
 * that every workspace and record page renders inside.
 */
export function PageBox({
  children,
  msg,
  width = "1080",
  className = "",
}: {
  children: ReactNode;
  msg?: string | null;
  width?: "880" | "920" | "1080" | "1160" | "full";
  className?: string;
}) {
  const maxCls =
    width === "880"
      ? "max-w-[880px]"
      : width === "920"
        ? "max-w-[920px]"
        : width === "1080"
          ? "max-w-[1080px]"
          : width === "1160"
            ? "max-w-[1160px]"
            : "max-w-none";
  return (
    <div className="relative rounded-sheet bg-surface px-5 pb-10 pt-9 shadow-card max-md:overflow-hidden md:flex md:flex-col md:px-12 md:pt-9">
      <div className={`rise mx-auto flex w-full flex-col ${maxCls} ${className}`}>
        {msg && (
          <p className="mb-5 rounded-panel border border-rule bg-sunk/60 px-4 py-2.5 text-[14px] leading-[21px] text-ink">
            {msg}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * Top back-link row (`1:488`, `1:591`, `1:1867`, `1:2054`):
 * round 40px chevron-left button + label on the left, owner pill(s) & optional
 * overflow `<details>` menu on the right.
 */
export function BackBar({
  href,
  label,
  ownerName,
  right,
  rightSlot,
  moreMenu,
}: {
  href: string;
  label: string;
  ownerName?: string | null;
  right?: ReactNode;
  rightSlot?: ReactNode;
  moreMenu?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2.5">
      <Link
        href={href}
        className="group inline-flex items-center gap-3 text-[14px] leading-[21px] text-ink-faint hover:text-ink"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rule-strong text-ink transition-colors group-hover:bg-sunk">
          <Icon name="chevron-left" size={18} />
        </span>
        <span>{label}</span>
      </Link>
      <div className="flex-1" />
      {right ?? rightSlot}
      {ownerName && (
        <div className="flex items-center gap-2">
          <Avatar name={ownerName} size="28" />
          <span className="text-[14px] leading-[21px] text-ink-soft">{ownerName}</span>
        </div>
      )}
      {moreMenu && (
        <details className="group relative">
          <summary
            aria-label="More options"
            className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-rule-strong text-ink transition-colors hover:bg-sunk [&::-webkit-details-marker]:hidden"
          >
            <Icon name="more" size={18} />
          </summary>
          <div className="mt-2 rounded-panel border border-rule bg-surface p-3 shadow-card">
            {moreMenu}
          </div>
        </details>
      )}
    </div>
  );
}

export function StatusChip({
  label,
  children,
  tone = "warn",
}: {
  label?: ReactNode;
  children?: ReactNode;
  tone?: Tone;
}) {
  const wrap =
    tone === "brand" || tone === "ok"
      ? "bg-bg-brand text-brand"
      : tone === "warn"
        ? "bg-warn-soft text-warn"
        : tone === "danger"
          ? "bg-bg-danger text-danger"
          : tone === "info"
            ? "bg-info-soft text-info"
            : tone === "violet"
              ? "bg-violet-soft text-violet"
              : "bg-sunk text-ink-soft";
  const dot =
    tone === "brand" || tone === "ok"
      ? "bg-brand"
      : tone === "warn"
        ? "bg-warn"
        : tone === "danger"
          ? "bg-danger"
          : tone === "info"
            ? "bg-info"
            : tone === "violet"
              ? "bg-violet"
              : "bg-ink-faint";
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium leading-[19px] " +
        wrap
      }
    >
      <span aria-hidden="true" className={"size-1.5 rounded-full " + dot} />
      {label ?? children}
    </span>
  );
}

export function ClockPill({
  label,
  children,
  tone = "warn",
  icon,
}: {
  label?: ReactNode;
  children?: ReactNode;
  tone?: Tone;
  icon?: IconName;
}) {
  const wrap =
    tone === "danger"
      ? "bg-bg-danger text-danger"
      : tone === "brand" || tone === "ok"
        ? "bg-bg-brand text-brand"
        : tone === "quiet" || tone === "neutral"
          ? "bg-sunk text-ink-soft"
          : "bg-warn-soft text-warn";
  const chosenIcon: IconName =
    icon ?? (tone === "danger" ? "alert" : tone === "ok" ? "check" : "clock");
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full py-[5px] pl-2.5 pr-3 text-[14px] font-medium leading-[21px] " +
        wrap
      }
    >
      <Icon name={chosenIcon} size={14} />
      {label ?? children}
    </span>
  );
}

/**
 * The other pieces of this client's work - lead, opening, placement, invoice, guarantee - as plain
 * links, shown only when there is more than one (18 Nov). Replaces the progress bar: it says where
 * you can go, not how far along anything is.
 */
export function RelatedLinks({ items, active }: { items: { key: string; label: string; href: string }[]; active: string }) {
  return items.length > 1 ? <ViewPills items={items} active={active} /> : null;
}

/**
 * View pills (`1:425`, `1:611`, `1:3563`): one horizontal row of pill links
 * with optional counts in `text-ink-faint`.
 */
export function ViewPills({
  items,
  active,
  rightSlot,
}: {
  /** `mark`: a small dot for "this is next" (18 Nov); it says where to go, not how far along it is. */
  items: { key: string; label: string; href: string; count?: number; mark?: boolean }[];
  active: string;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-1">
      {items.map((item) => {
        const isOn = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isOn ? "page" : undefined}
            className={
              "inline-flex items-center gap-2 rounded-full px-4 py-[9px] text-[14px] leading-[21px] transition-colors " +
              (isOn ? "bg-sunk font-medium text-ink" : "text-ink-soft hover:text-ink")
            }
          >
            <span>{item.label}</span>
            {item.mark && <span className="size-1.5 rounded-full bg-brand" title="Next" />}
            {typeof item.count === "number" && (
              <span className="text-ink-faint">{item.count}</span>
            )}
          </Link>
        );
      })}
      {rightSlot && (
        <>
          <div className="flex-1" />
          {rightSlot}
        </>
      )}
    </div>
  );
}

/**
 * The one heavy thing on a record page (`1:551`, `1:3500`, `1:732`, `1:2110`, `1:618`):
 * rounded-[28px], shadow-float, UP NEXT caption, clock pill, 26px title, 16px body,
 * action buttons, and optional `byItself` line.
 */
export function NextStepCard({
  eyebrow = "UP NEXT",
  clock,
  clockTone = "warn",
  title,
  body,
  description,
  actions,
  children,
  byItself,
}: {
  eyebrow?: string;
  clock?:
    | ReactNode
    | {
        label: ReactNode;
        tone?: Tone;
        icon?: IconName;
      };
  clockTone?: Tone;
  title: ReactNode;
  body?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  byItself?: ReactNode;
}) {
  const isClockObj =
    clock !== null &&
    typeof clock === "object" &&
    "label" in (clock as Record<string, unknown>);
  const resolvedClockLabel = isClockObj
    ? (clock as { label: ReactNode }).label
    : (clock as ReactNode);
  const resolvedClockTone = isClockObj
    ? ((clock as { tone?: Tone }).tone ?? clockTone)
    : clockTone;
  const resolvedClockIcon = isClockObj
    ? (clock as { icon?: IconName }).icon
    : undefined;

  const textBody = body ?? description;

  return (
    <section className="flex w-full flex-col gap-2.5 rounded-[28px] bg-surface px-6 pb-7 pt-[30px] shadow-float md:px-8">
      <div className="flex w-full items-center gap-2.5">
        <p className="text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">
          {eyebrow}
        </p>
        <div className="flex-1" />
        {resolvedClockLabel && (
          <ClockPill tone={resolvedClockTone} icon={resolvedClockIcon}>
            {resolvedClockLabel}
          </ClockPill>
        )}
      </div>
      <h2 className="text-[22px] font-normal leading-[30px] text-ink md:text-[26px] md:leading-[34px]">
        {title}
      </h2>
      {textBody && (
        <p className="text-[16px] leading-[26px] text-ink-soft">{textBody}</p>
      )}
      {actions && <div className="flex flex-wrap items-center gap-2.5 pt-2">{actions}</div>}
      {children && <div className="flex flex-col gap-3 pt-1.5">{children}</div>}
      {byItself && (
        <div className="flex items-center gap-2 pt-1 text-[14px] leading-[21px] text-ink-faint">
          <Icon name="refresh" size={16} className="shrink-0 text-ink-faint" />
          <span>{byItself}</span>
        </div>
      )}
    </section>
  );
}

/**
 * Collapsible `Fold · ...` row (`1:553`, `1:562`, `1:571`, `1:579`, `1:3529`):
 * expands in-place inside the page box.
 */
export function FoldRow({
  title,
  summary,
  state,
  done,
  defaultOpen = false,
  id,
  variant = "card",
  children,
}: {
  title: string;
  summary?: ReactNode;
  state?: "done" | "active" | "warn" | "pending";
  done?: boolean;
  defaultOpen?: boolean;
  id?: string;
  /** "line" is the plain ruled row of the interview page (Figma 249:10196); "card" is the grey one. */
  variant?: "card" | "line";
  children?: ReactNode;
}) {
  const line = variant === "line";
  const resolvedState = state ?? (done === false ? "pending" : "done");
  const badge =
    resolvedState === "done" ? (
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-bg-brand text-brand">
        <Icon name="check" size={13} />
      </span>
    ) : resolvedState === "active" ? (
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-brand bg-bg-brand">
        <span className="size-2 rounded-full bg-brand" />
      </span>
    ) : resolvedState === "warn" ? (
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-warn bg-warn-soft">
        <span className="size-2 rounded-full bg-warn" />
      </span>
    ) : (
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-sunk">
        <span className="size-1.5 rounded-full bg-ink-faint" />
      </span>
    );

  return (
    <details
      id={id}
      open={defaultOpen}
      className={"group w-full " + (line ? "border-b border-rule px-1" : "rounded-[20px] bg-sunk px-5 py-1")}
    >
      <summary className={"flex cursor-pointer list-none items-center gap-3 transition-colors [&::-webkit-details-marker]:hidden " + (line ? "py-4" : "py-3.5")}>
        {badge}
        <span className={"text-[16px] leading-[26px] text-ink " + (line ? "font-normal" : "font-medium")}>{title}</span>
        <span className="flex-1" />
        {summary && (
          <span
            className={
              "text-[14px] leading-[21px] " +
              (resolvedState === "active" || resolvedState === "warn"
                ? "text-ink-soft"
                : "text-ink-faint")
            }
          >
            {summary}
          </span>
        )}
        <Icon
          name="chevron-down"
          size={18}
          className="text-ink-faint transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      {children && (
        <div className={"flex flex-col gap-4 pb-4 " + (line ? "pt-1" : "border-t border-rule pt-3.5")}>
          {children}
        </div>
      )}
    </details>
  );
}

/**
 * Directory `Record card` (`1:449` in Clients, `1:2743` in Placements):
 * rounded-[24px] bg-sunk px-6 py-[22px].
 */
export function RecordCard({
  href,
  chip,
  eyebrow,
  overline,
  rightText,
  rightTone = "faint",
  ownerName,
  title,
  subtitle,
  footerLeft,
  statusText,
  statusTone = "quiet",
  rightMeta,
  clockText,
  outline = false,
}: {
  /** White with a hairline, as the Placements directory draws it (Figma 263:17210). */
  outline?: boolean;
  href: string;
  chip?: { label: string; tone?: Tone };
  eyebrow?: string;
  overline?: string;
  rightText?: string;
  rightTone?: "faint" | "danger" | "warn" | "brand";
  ownerName?: string | null;
  title: string;
  subtitle?: string;
  footerLeft?: string;
  statusText?: string;
  statusTone?: Tone;
  rightMeta?: string;
  clockText?: string;
}) {
  const topRightColor =
    rightTone === "danger"
      ? "text-danger"
      : rightTone === "warn"
        ? "text-warn"
        : rightTone === "brand"
          ? "text-brand"
          : "text-ink-faint";

  const resolvedEyebrow = eyebrow ?? overline;
  const resolvedRightMeta = rightMeta ?? clockText;
  const dotColor =
    statusTone === "ok" || statusTone === "brand"
      ? "bg-success"
      : statusTone === "warn"
        ? "bg-warn"
        : statusTone === "danger"
          ? "bg-danger"
          : statusTone === "info"
            ? "bg-info"
            : statusTone === "violet"
              ? "bg-violet"
              : "bg-ink-faint";

  return (
    <Link
      href={href}
      data-row
      data-open
      className={`flex min-h-[150px] flex-1 flex-col gap-2.5 rounded-[24px] px-6 py-[20px] transition-colors ${outline ? "border border-rule bg-surface hover:bg-sunk" : "bg-sunk hover:bg-shell/80"}`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        {chip ? (
          <StatusChip label={chip.label} tone={chip.tone ?? "brand"} />
        ) : (
          <span className="truncate text-[14px] leading-[21px] text-ink-faint">
            {resolvedEyebrow}
          </span>
        )}
        {rightText ? (
          <span className={`shrink-0 text-[13px] font-medium ${topRightColor}`}>
            {rightText}
          </span>
        ) : (
          ownerName && !footerLeft && <Avatar name={ownerName} size="28" />
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="truncate text-[16px] font-medium leading-[26px] text-ink">
          {title}
        </p>
        {subtitle && (
          <p className="line-clamp-2 text-[14px] font-normal leading-[21px] text-ink-soft">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex w-full items-center justify-between gap-2 pt-1">
        <span className="inline-flex items-center gap-2 truncate text-[14px] leading-[21px] text-ink-soft">
          {statusText && !footerLeft && (
            <span aria-hidden="true" className={`size-[7px] shrink-0 rounded-full ${dotColor}`} />
          )}
          <span className="truncate">{footerLeft ?? statusText ?? ""}</span>
        </span>
        {ownerName && footerLeft ? (
          <Avatar name={ownerName} size="24" />
        ) : (
          resolvedRightMeta && (
            <span className="shrink-0 text-[14px] leading-[21px] text-ink-faint">
              {resolvedRightMeta}
            </span>
          )
        )}
      </div>
    </Link>
  );
}

/**
 * Metric tile (`1:621` in Client overview, Opening overview, Finance, Reports):
 * rounded-[24px] bg-sunk px-6 py-5.
 */
export function StatTile({
  value,
  label,
  caption,
  tone = "default",
  size = "md",
  href,
  outline = false,
  highlight,
}: {
  value: ReactNode;
  label?: ReactNode;
  caption?: ReactNode;
  tone?: "default" | "danger" | "brand" | "warn" | "ok";
  size?: "sm" | "md" | "lg";
  href?: string;
  /** White with a hairline, as the money screens draw them (Figma 283:3343, 283:3198). */
  outline?: boolean;
  /** One tile the eye should land on: a green or red outline and tint. */
  highlight?: "ok" | "danger";
}) {
  const valCls =
    tone === "danger"
      ? "text-danger"
      : tone === "ok"
        ? "text-ok"
        : tone === "brand"
          ? "text-brand"
          : tone === "warn"
            ? "text-warn"
            : "text-ink";
  const fontCls =
    size === "lg"
      ? "text-[32px] font-light leading-[42px] md:text-[40px] md:leading-[50px] "
      : size === "sm"
        ? "text-[22px] font-normal leading-[30px] "
        : "text-[26px] font-normal leading-[34px] ";
  const box =
    highlight === "ok"
      ? "border-[1.5px] border-success bg-brand-tint"
      : highlight === "danger"
        ? "border-[1.5px] border-danger bg-danger-soft"
        : outline
          ? "border border-rule bg-surface"
          : "bg-sunk";
  const inner = (
    <>
      <p className={fontCls + valCls}>{value}</p>
      <p className="text-[14px] leading-[21px] text-ink-faint">{label ?? caption}</p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={`flex flex-1 flex-col gap-0.5 rounded-[24px] px-6 py-5 transition-colors hover:bg-shell/80 ${box}`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className={`flex flex-1 flex-col gap-0.5 rounded-[24px] px-6 py-5 ${box}`}>
      {inner}
    </div>
  );
}

/**
 * Multi-segment progress bar for 7-day CV ownership window (`1:968`) and
 * 60-working-day guarantee replacement window (`1:1350`).
 */
export function SegmentedBar({
  totalSegments,
  filledSegments,
  total,
  filled,
  tone = "brand",
  label,
  caption,
  rightLabel,
}: {
  totalSegments?: number;
  filledSegments?: number;
  total?: number;
  filled?: number;
  tone?: "brand" | "warn" | "danger";
  label?: ReactNode;
  caption?: ReactNode;
  rightLabel?: ReactNode;
}) {
  const count = totalSegments ?? total ?? 7;
  const active = filledSegments ?? filled ?? 0;
  const fillCls =
    tone === "danger" ? "bg-danger" : tone === "warn" ? "bg-warn" : "bg-brand";
  const resolvedLabel = label ?? caption;
  if (!resolvedLabel && !rightLabel) {
    return (
      <div className="flex items-center gap-[5px]">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={
              "h-[6px] w-[28px] rounded-[3px] " + (i < active ? fillCls : "bg-rule")
            }
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-4">
      <div className="flex items-center gap-[3px]">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={
              (count > 10 ? "h-2 w-[10px] rounded-[2px] " : "h-2 w-7 rounded-[3px] ") +
              (i < active ? fillCls : "bg-shell")
            }
          />
        ))}
      </div>
      {resolvedLabel && (
        <span className="text-[16px] leading-[26px] text-ink-soft">{resolvedLabel}</span>
      )}
      {rightLabel && (
        <span className="ml-auto text-[14px] leading-[21px] text-ink-faint">{rightLabel}</span>
      )}
    </div>
  );
}

/** Figma button class helpers matching node `1:131`. */
export const pillPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-[11px] text-[14px] font-medium leading-[21px] text-ink-inverse transition-transform active:scale-[0.98] cursor-pointer";

export const pillSecondary =
  "inline-flex items-center justify-center gap-2 rounded-full border border-rule-strong bg-surface px-5 py-[11px] text-[14px] font-medium leading-[21px] text-ink transition-colors hover:bg-sunk active:scale-[0.98] cursor-pointer";

export const pillDanger =
  "inline-flex items-center justify-center gap-2 rounded-full bg-bg-danger px-5 py-[11px] text-[14px] font-medium leading-[21px] text-danger transition-transform active:scale-[0.98] cursor-pointer";

export const pillBrand =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-[11px] text-[14px] font-medium leading-[21px] text-ink-inverse transition-transform active:scale-[0.98] cursor-pointer";

export const pillGhost =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-[11px] text-[14px] font-medium leading-[21px] text-ink-soft transition-colors hover:text-ink cursor-pointer";

export const figmaField =
  "w-full rounded-[10px] bg-sunk px-3.5 py-3 text-[16px] leading-[26px] text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-brand";

export const figmaLabel =
  "text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint";

/* ---- v6 kit (19 Nov, frames W1 128:2 and R1 116:283) ---------------------------------------- */

/**
 * The white card of the v6 frames: 28px corners, the soft drop shadow, 28px of padding. With a
 * title it draws the h2 and the small line under it, and `right` sits at the far end of that row.
 */
export function Card({
  title,
  sub,
  right,
  className = "",
  children,
}: {
  title?: string;
  sub?: string;
  right?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={"flex flex-col gap-[18px] rounded-[28px] bg-surface px-7 py-[26px] shadow-card " + className}>
      {(title || right) && (
        <div className="flex items-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {title && <h2 className="t-h2">{title}</h2>}
            {sub && <p className="t-small text-ink-3">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * The page heading of the v6 frames: the light 40px display line, the small line under it, and
 * the pill tabs below when the page has views. The tabs are links, so a view is an address.
 */
export function PageTitle({
  title,
  sub,
  tabs,
  active,
  right,
}: {
  title: string;
  sub?: ReactNode;
  tabs?: { key: string; label: string; href: string; count?: number }[];
  active?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex items-center gap-4 p-1">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="t-display">{title}</h1>
          {sub && <p className="t-small text-ink-3">{sub}</p>}
        </div>
        {right}
      </div>
      {tabs && tabs.length > 0 && <PillTabs items={tabs} active={active ?? tabs[0].key} />}
    </div>
  );
}

/** The pill tabs of W1: the open one is solid ink, the rest white with a hairline; counts in small type. */
export function PillTabs({
  items,
  active,
}: {
  items: { key: string; label: string; href: string; count?: number }[];
  active: string;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      {items.map((item) => {
        const on = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={
              "t-body-m inline-flex items-center gap-2 rounded-full px-4 py-2.5 transition-colors " +
              (on ? "bg-ink text-ink-inverse" : "border border-rule bg-surface text-ink hover:bg-sunk")
            }
          >
            {item.label}
            {typeof item.count === "number" && <span className={"t-label " + (on ? "text-ink-inverse" : "text-ink-3")}>{item.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * A table in a card: small capital column heads over hairline rows. `rows` carry their cells;
 * give a row `href` and its first cell becomes the link, so a row is reachable with no script.
 * With no rows, `empty` shows instead (use <EmptyState>), never an empty frame.
 */
export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: { label: string; align?: "left" | "right"; className?: string }[];
  rows: { key: string; cells: ReactNode[]; href?: string }[];
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label} scope="col" className={"t-micro border-b border-rule px-3 pb-3 text-ink-3 first:pl-0 last:pr-0 " + (c.align === "right" ? "text-right " : "") + (c.className ?? "")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-rule last:border-b-0 hover:bg-sunk/50">
              {row.cells.map((cell, i) => (
                <td key={i} className={"t-body px-3 py-3.5 first:pl-0 last:pr-0 " + (columns[i]?.align === "right" ? "text-right " : "") + (columns[i]?.className ?? "")}>
                  {i === 0 && row.href ? (
                    <Link href={row.href} className="t-body-m hover:underline">
                      {cell}
                    </Link>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The honest empty state: a quiet icon, a title, one sentence. Used where a screen has no data
 * yet (nothing saved, or the feed is not connected), so it says so rather than inventing rows.
 */
export function EmptyState({ icon = "sparkle", title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[18px] bg-sunk px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-surface text-ink-3">
        <Icon name={icon} size={20} />
      </span>
      <p className="t-body-m">{title}</p>
      {children && <p className="t-small max-w-[420px] text-ink-3">{children}</p>}
    </div>
  );
}

/** A labelled value in a panel or card: the small grey label over the content (a field, text, chips). */
export function PanelField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="t-small text-ink-3">{label}</span>
      {children}
      {hint && <span className="t-small text-ink-3">{hint}</span>}
    </div>
  );
}
