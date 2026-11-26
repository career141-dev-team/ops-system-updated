import { desk, positionIn } from "@/data/desk";
import { candidatesForPosition, taApplicationsFor } from "@/lib/positionCandidates";
import { currentMember } from "@/lib/session";
import { stageRowsCsv, trackingForPosition } from "@/lib/setTracking";

/**
 * Where each candidate stands on one position, as a CSV (Ops lead, 25 Nov). `?skip=id,id` leaves out the rows
 * a person took off the list before downloading. Signed-in people only, like the set zip: it holds no money.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const member = await currentMember();
  if (!member) return new Response("Sign in first.", { status: 401 });

  const { id } = await params;
  const db = await desk();
  const position = positionIn(db, id);
  if (!position) return new Response("There is no such position.", { status: 404 });

  const skip = new Set((new URL(request.url).searchParams.get("skip") ?? "").split(",").filter(Boolean));
  const sets = db.clientSets.filter((s) => s.openingTaId === position.openingTaId);
  const candidates = candidatesForPosition(db, position, sets, await taApplicationsFor(position.openingTaId));
  const { rows } = trackingForPosition(db, position, candidates);
  const name = (position.title.replace(/[^A-Za-z0-9]+/g, "_") || "Position") + "_candidates.csv";
  return new Response(stageRowsCsv(rows.filter((r) => !skip.has(r.id))), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
