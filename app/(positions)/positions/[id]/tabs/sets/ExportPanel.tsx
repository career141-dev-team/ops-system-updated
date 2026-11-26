import Panel from "@/app/ui/Panel";
import { EmptyState } from "@/app/ui/figma";
import { closeHref } from "@/lib/panel";
import { trackingForPosition } from "@/lib/setTracking";

import type { TabProps } from "../ctx";
import ExportTable from "./ExportTable";
import { rolePath } from "./shared";

/** The table of where each candidate stands, to copy into an email or WhatsApp, or to download (Ops lead, 25 Nov). */
export default function ExportPanel({ c, sp }: TabProps) {
  const { summary, rows } = trackingForPosition(c.db, c.position, c.allCandidates);
  return (
    <Panel kicker="Export" title="Where the candidates stand" sub={summary} closeHref={closeHref(rolePath(c), sp)}>
      {rows.length === 0 ? (
        <EmptyState title="Nobody to list yet">A candidate shows here once a set with them has gone to the client.</EmptyState>
      ) : (
        <ExportTable rows={rows} csvHref={`/api/positions/${c.position.id}/stages`} />
      )}
    </Panel>
  );
}
