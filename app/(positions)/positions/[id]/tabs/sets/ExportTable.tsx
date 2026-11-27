"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import Icon from "@/app/Icon";
import { pillPrimary, pillSecondary } from "@/app/ui/figma";
import { stageRowsHtml, stageRowsTsv, stageRowsWithout, type TrackRow } from "@/lib/stageTable";

/**
 * The tracking rows with a × on each, so a person can take people off before sending the table on: copied as a
 * table (HTML for an email, tab-separated text for a sheet or WhatsApp) or downloaded as a CSV without them.
 */
export default function ExportTable({ rows, csvHref }: { rows: TrackRow[]; csvHref: string }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const gone = new Set((searchParams.get("skip") ?? "").split(",").filter(Boolean));
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const kept = stageRowsWithout(rows, gone);

  function updateRemoved(next: Set<string>) {
    const query = new URLSearchParams(searchParams.toString());
    if (next.size) query.set("skip", [...next].join(","));
    else query.delete("skip");
    const suffix = query.toString();
    router.replace(pathname + (suffix ? "?" + suffix : ""), { scroll: false });
  }

  async function copy() {
    const text = stageRowsTsv(kept);
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([stageRowsHtml(kept)], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
        } catch {
          await navigator.clipboard.writeText(text);
        }
      } else {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard is not available");
        await navigator.clipboard.writeText(text);
      }
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {kept.length === 0 ? (
        <p className="t-small text-ink-3">No one left in the table. Restore all to put everyone back in this view.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-rule rounded-[16px] bg-surface">
          {kept.map((r) => (
            <li key={r.id} className="flex items-start gap-3 px-4 py-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="t-body-m">{r.name}</span>
                <span className="t-small text-ink-3">
                  {r.setNumber === null ? "" : "Set " + r.setNumber + " · "}
                  {r.stage}
                </span>
                <span className="t-small text-ink-2">{r.feedback}</span>
              </span>
              <button type="button" aria-label={"Take " + r.name + " off the table"} onClick={() => updateRemoved(new Set([...gone, r.id]))} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-sunk hover:text-danger">
                <Icon name="x" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} disabled={kept.length === 0} className={pillPrimary + " !gap-2"}>
          <Icon name="copy" size={16} />
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Could not copy" : "Copy as table"}
        </button>
        {gone.size > 0 && (
          <button type="button" onClick={() => updateRemoved(new Set())} className={pillSecondary}>
            Restore all
          </button>
        )}
        <a href={csvHref + (gone.size ? "?skip=" + encodeURIComponent([...gone].join(",")) : "")} className={pillSecondary + " !gap-2"}>
          <Icon name="file" size={16} />
          Download CSV
        </a>
      </div>
    </div>
  );
}
