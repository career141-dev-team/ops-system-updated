import Link from "next/link";
import Icon from "@/app/Icon";
import { Avatar, StatusChip, figmaLabel, pillSecondary } from "@/app/ui/figma";

import type { RoleCtx } from "./ctx";
export default function Interviews({ c }: { c: RoleCtx }) {
  const { client, itsInterviews, whenLocal } = c;
  return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className={figmaLabel}>INTERVIEWS ON THIS OPENING · {itsInterviews.length}</p>
            <Link href="/interviews" className={pillSecondary}>
              All interviews
            </Link>
          </div>
          {itsInterviews.length === 0 ? (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              Nobody has been interviewed yet. An interview appears here when the client shortlists somebody from a CV set.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {itsInterviews.map((iv) => (
                <Link
                  key={iv.id}
                  href={`/interviews/${iv.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-sunk px-5 py-4 transition-colors hover:bg-shell"
                >
                  <div className="flex items-center gap-3.5">
                    <Avatar name={iv.candidateName} size="40" tone="info" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[16px] font-medium text-ink">{iv.candidateName}</span>
                      <span className="text-[14px] text-ink-soft">
                        Round {iv.round} · {iv.at ? whenLocal(iv.at) : "Agreeing a time"}
                        {iv.decision ? ` · ${iv.decision}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusChip label={iv.state} tone="info" />
                    <Icon name="chevron-right" size={18} className="text-ink-faint" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
  );
}
