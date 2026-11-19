import Link from "next/link";
import Icon from "@/app/Icon";
import { figmaLabel } from "@/app/ui/figma";
import { threadInWords } from "@/lib/mailbox";

import type { RoleCtx } from "./ctx";
export default function History({ c }: { c: RoleCtx }) {
  const { now, history, itsThreads } = c;
  return (
        <div className="flex flex-col gap-6">
          {itsThreads.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <p className={figmaLabel}>CONVERSATIONS WITH THE CLIENT</p>
              <div className="flex flex-col gap-2">
                {itsThreads.map((thread) => (
                  <Link
                    key={thread.key}
                    href={`/mail/${encodeURIComponent(thread.key)}`}
                    className="flex items-center justify-between gap-4 rounded-[16px] bg-sunk px-4 py-3 hover:bg-shell"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-medium text-ink">{thread.subject}</span>
                      <span className="text-[12.5px] text-ink-soft">
                        {thread.withName} · {threadInWords(thread, now)}
                      </span>
                    </div>
                    <Icon name="chevron-right" size={16} className="text-ink-faint" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <p className={figmaLabel}>TIMELINE</p>
            {history.length === 0 ? (
              <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
                Nothing recorded yet. Events appear here as sets are sent, interviews are booked, and clocks run.
              </div>
            ) : (
              history.map((group) => (
                <div key={group.day} className="flex flex-col gap-2">
                  <p className={figmaLabel}>{group.day}</p>
                  <div className="ml-2 flex flex-col gap-3 border-l-2 border-rule pl-5">
                    {group.entries.map((entry) => (
                      <div key={entry.id} className="flex flex-col gap-0.5">
                        <p className="text-[14px] text-ink">{entry.said}</p>
                        <p className="text-[12px] text-ink-faint">
                          {new Date(entry.at + 5.5 * 3_600_000).toISOString().slice(11, 16)} · {entry.about}
                          {entry.by ? ` · ${entry.by}` : " · automatic"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
  );
}
