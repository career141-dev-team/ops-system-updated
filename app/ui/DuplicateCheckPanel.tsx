import Link from "next/link";

import { Avatar, pillPrimary, pillSecondary } from "@/app/ui/figma";
import Panel from "@/app/ui/Panel";

/**
 * G5 "Duplicate check" (frame 145:210): the match we found, and the choice between using that person
 * and saying it is someone else. Presentational: `sameHref` / `elseHref` are links (or pass `sameForm`
 * to post a server action instead, as a node holding the form's button).
 */
export default function DuplicateCheckPanel({
  title,
  why,
  matches,
  sameHref,
  elseHref,
  sameLabel = "Use the same person",
  elseLabel = "It is someone else",
  closeHref,
}: {
  title: string;
  why: string;
  matches: { name: string; line?: string }[];
  sameHref: string;
  elseHref: string;
  sameLabel?: string;
  elseLabel?: string;
  closeHref: string;
}) {
  return (
    <Panel kicker="Duplicate check" title={title} closeHref={closeHref}>
      <p className="t-body pb-[18px] text-ink-2">{why}</p>
      {matches.map((m) => (
        <div key={m.name} className="flex items-center gap-3 border-t border-rule py-[18px]">
          <Avatar name={m.name} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="t-body-m">{m.name}</span>
            {m.line && <span className="t-small text-ink-faint">{m.line}</span>}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 border-t border-rule pt-[18px]">
        <Link href={sameHref} className={pillPrimary}>
          {sameLabel}
        </Link>
        <Link href={elseHref} className={pillSecondary}>
          {elseLabel}
        </Link>
      </div>
    </Panel>
  );
}
