import { redirect } from "next/navigation";

import { desk, fileIn } from "@/data/desk";
import { linkFor, readBytes, usingR2 } from "@/data/fileStore";
import { currentMember } from "@/lib/session";

/**
 * A file, to whoever is signed in and nobody else (15, Phase 1 step 23).
 *
 * In R2 this hands over a signed link that stops working after ten minutes,
 * so the bytes never pass through the app and nothing is ever public. With the
 * files in a folder on this machine there is nothing to sign, so it reads the
 * file and sends it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const member = await currentMember();
  if (!member) return new Response("Sign in first.", { status: 401 });

  const { id } = await params;
  const row = fileIn(await desk(), id);
  if (!row) return new Response("There is no such file.", { status: 404 });

  if (usingR2()) redirect(await linkFor(row.id, row.key, row.name));

  const bytes = await readBytes(row.key);
  if (!bytes) return new Response("The file is missing from storage.", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": row.mime,
      "Content-Disposition": 'attachment; filename="' + row.name + '"',
      // Never cached anywhere but the person's own download.
      "Cache-Control": "no-store",
    },
  });
}
