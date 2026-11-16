import Link from "next/link";
import { redirect } from "next/navigation";

import { runImport } from "@/app/actions";
import { desk } from "@/data/desk";
import { IMPORT_KINDS, type ImportKind } from "@/lib/importer";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * The first day (15, Phase 8 step 11).
 *
 * What the team already knows, pasted in: the clients and who owns each one,
 * the holiday list, the ops people. A dry run first every time — the same
 * code builds the dry run and the real one, so what you read is what lands —
 * and a file run twice adds nothing.
 */
export default async function ImportPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  const db = await desk();
  const counts: Record<ImportKind, number> = {
    clients: db.clients.length,
    holidays: db.holidays.length,
    members: db.members.length,
  };
  const mayImport = can(me, "settings.manage");

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[13px] font-mono";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-ink-inverse hover:opacity-90";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h1 className="text-[17px] font-medium">The first day</h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          Everything the team already knows, pasted in from the sheets: the clients we have and who owns each one, the
          holiday list so a working-day clock means what the TA System means, and the ops people with their roles.
          Copy the rows straight out of the sheet — commas or tabs, header row and all.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {!mayImport && (
        <p className="rounded-lg border border-warning bg-surface px-3 py-2 text-[13px]">
          Only the ops lead imports: these rows become the client list, the roles and the holidays everything else
          counts from.
        </p>
      )}

      {(Object.keys(IMPORT_KINDS) as ImportKind[]).map((kind) => (
        <section key={kind} className={card}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[14.5px] font-medium">{kind}</h2>
            <span className="text-[12.5px] text-ink-soft">{counts[kind]} here now</span>
          </div>
          <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">{IMPORT_KINDS[kind].what}</p>
          <p className="mt-1 font-mono text-[12px] text-ink-faint">{IMPORT_KINDS[kind].columns.join(",")}</p>

          {mayImport && (
            <form action={runImport} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="kind" value={kind} />
              <textarea
                name="sheet"
                rows={5}
                placeholder={IMPORT_KINDS[kind].columns.join(",")}
                className={field}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button className={plain}>Dry run — show me what it would do</button>
                <button name="forReal" value="yes" className={button}>
                  Import it for real
                </button>
              </div>
              <p className="text-[12px] text-ink-faint">
                Nothing is written by a dry run. A row already here is left alone, so the same file can be run again
                after the sheet is fixed.
              </p>
            </form>
          )}
        </section>
      ))}

      <p className="text-[12px] text-ink-faint">
        Placements and guarantees are not imported: they come from the TA System&rsquo;s own events, and anybody who
        joined inside the last ninety days arrives with their placement. The{" "}
        <Link href="/health" className="text-brand hover:underline">
          health page
        </Link>{" "}
        is where to watch that the link is reading.
      </p>
    </div>
  );
}
