import JSZip from "jszip";

import { clientSetIn, desk, fileIn } from "@/data/desk";
import { readBytes } from "@/data/fileStore";
import { problemWithZip, uniqueNames, zipName } from "@/lib/clientSets";
import { currentMember } from "@/lib/session";

/**
 * Every CV of one set, as one zip (owner, 16 Nov).
 *
 * The bytes are read here, in R2 as well as on a laptop, because a zip cannot
 * be made from ten signed links. Signed-in people only; plain words when a CV
 * is missing rather than a zip that quietly leaves somebody out.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const member = await currentMember();
  if (!member) return new Response("Sign in first.", { status: 401 });

  const { id } = await params;
  const db = await desk();
  const set = clientSetIn(db, id);
  if (!set) return new Response("There is no such set.", { status: 404 });
  const problem = problemWithZip(set.candidates);
  if (problem) return new Response(problem, { status: 409 });

  const files = set.candidates.map((c) => fileIn(db, c.fileId as string));
  const gone = set.candidates.filter((_, i) => !files[i]).map((c) => c.name);
  if (gone.length) return new Response("The CV file is missing for " + gone.join(", ") + ".", { status: 404 });

  const names = uniqueNames(files.map((f) => f!.name));
  const zip = new JSZip();
  for (let i = 0; i < files.length; i++) {
    const bytes = await readBytes(files[i]!.key);
    if (!bytes) return new Response("The file is missing from storage: " + set.candidates[i].name + ".", { status: 404 });
    zip.file(names[i], bytes);
  }
  const body = await zip.generateAsync({ type: "uint8array" });
  const name = zipName(set.name.split(" > ")[0] || "Client", set.role, set.setNumber);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition":
        'attachment; filename="' + name.replace(/[^\x20-\x7e]/g, "_") + "\"; filename*=UTF-8''" + encodeURIComponent(name),
      "Cache-Control": "no-store",
    },
  });
}
