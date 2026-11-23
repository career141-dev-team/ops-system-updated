import Link from "next/link";

import { Card, DataTable } from "@/app/ui/figma";
import { type HistoryRow, outcomeCounts, outcomeWords } from "@/lib/pipelineHistory";
import { shortDay } from "@/lib/setsBoard";

/**
 * Who was sent, when, as which set, and where it ended up (23 Nov, the ops team's feedback).
 * The same table on a position (its own candidates) and on a client (every position's), so the
 * `positions` column shows only where it has something to tell.
 */
export default function PipelineHistory({ rows, showPosition, title = "Pipeline history" }: { rows: HistoryRow[]; showPosition: boolean; title?: string }) {
  const counts = outcomeCounts(rows);
  return (
    <Card title={title} sub={rows.length ? rows.length + (rows.length === 1 ? " candidate sent or ready" : " candidates sent or ready") : "Nobody has been put in a set yet"}>
      {counts.length > 0 && (
        <p className="t-small text-ink-3">{counts.map((c) => (c.outcome === "Interview" ? c.n + " in interview" : c.n + " " + c.outcome.toLowerCase())).join(" · ")}</p>
      )}
      <DataTable
        columns={[
          { label: "CANDIDATE" },
          ...(showPosition ? [{ label: "POSITION" }] : []),
          { label: "SET" },
          { label: "SUBMITTED" },
          { label: "OUTCOME" },
        ]}
        rows={rows.map((r) => ({
          key: r.key,
          cells: [
            r.candidate,
            ...(showPosition
              ? [r.positionId ? <Link key="p" href={"/positions/" + r.positionId} className="hover:underline">{r.position}</Link> : r.position]
              : []),
            "Set " + r.setNumber,
            r.submittedAt ? shortDay(r.submittedAt) : "Not sent yet",
            <span key="o" className="flex flex-col">
              <span className="t-body-m">{outcomeWords(r)}</span>
              {r.reason && <span className="t-small text-ink-3">{r.reason}</span>}
            </span>,
          ],
        }))}
        empty={<p className="t-body text-ink-3">When a CV set is built, its candidates are listed here with how each one went.</p>}
      />
    </Card>
  );
}
