import Link from "next/link";

import { StatusChip } from "@/app/ui/figma";

import type { RoleCtx, TabProps } from "./ctx";

export default function Guarantee({ c, sp }: TabProps) {
  const { db, itsPlacements } = c;
  const rows = itsPlacements
    .map((pl) => ({ pl, g: db.guarantees.find((row) => row.placementId === pl.id) ?? null }))
    .filter((row) => row.g);
  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 ? (
        <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
          No guarantee yet. One starts when somebody is placed on this opening.
        </div>
      ) : (
        rows.map(({ pl, g }) => (
          <Link
            key={g!.id}
            href={`/guarantees/${g!.id}`}
            className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-sunk px-5 py-4 transition-colors hover:bg-shell"
          >
            <span className="text-[16px] font-medium text-ink">{pl.candidateName}</span>
            <StatusChip label={g!.state} tone="info" />
          </Link>
        ))
      )}
    </div>
  );
}
