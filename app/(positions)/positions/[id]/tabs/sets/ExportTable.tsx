"use client";

import { useState } from "react";

import Icon from "@/app/Icon";
import { pillPrimary, pillSecondary } from "@/app/ui/figma";
import { stageRowsHtml, stageRowsTsv, type TrackRow } from "@/lib/stageTable";

/**
 * The tracking rows with a × on each, so a person can take people off before sending the table on: copied as a
 * table (HTML for an email, tab-separated text for a sheet or WhatsApp) or downloaded as a CSV without them.
 */
export default function ExportTable({ rows, csvHref }: { rows: TrackRow[]; csvHref: string }) {
  const [gone, setGone] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const kept = rows.filter((r) => !gone.includes(r.id));

  async function copy() {
    const text = stageRowsTsv(kept);
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([stageRowsHtml(kept)], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard refused (no permission, or an old browser): the CSV button still works.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {kept.length === 0 ? (
        <p className="t-small text-ink-3">No one left in the table. Reload the panel to bring everyone back.</p>
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
              <button type="button" aria-label={"Take " + r.name + " off the table"} onClick={() => setGone([...gone, r.id])} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-sunk hover:text-danger">
                <Icon name="x" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} disabled={kept.length === 0} className={pillPrimary + " !gap-2"}>
          <Icon name="copy" size={16} />
          {copied ? "Copied" : "Copy as table"}
        </button>
        <a href={csvHref + (gone.length ? "?skip=" + encodeURIComponent(gone.join(",")) : "")} className={pillSecondary + " !gap-2"}>
          <Icon name="file" size={16} />
          Download CSV
        </a>
      </div>
    </div>
  );
}
