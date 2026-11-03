import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { desk, templateFor } from "@/data/desk";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { HOLE_MEANINGS, fill, holesNeeded } from "@/lib/templates";
import { saveTemplateWording } from "@/app/actions";

/**
 * One template, edited in place (15, Phase 1 step 25).
 *
 * No overlay and no second screen: the wording, the blanks it uses, and a
 * worked example are on one page, because the question a person actually has
 * while editing is "what will this look like when it goes out".
 *
 * The example is filled with obvious stand-ins (SAMPLE CLIENT) so nobody can
 * mistake it for a real client, and so a blank the wording forgot shows up as
 * itself rather than as a plausible-looking gap.
 */
const EXAMPLE: Record<string, string> = {
  client: "SAMPLE CLIENT",
  contact: "SAMPLE CONTACT",
  position: "Head of finance",
  opsPerson: "SAMPLE OPS PERSON",
  opsEmail: "sample@example.test",
  days: "3",
  date: "2 November",
  setNumber: "2",
  cvCount: "6",
  taskTitle: "SAMPLE TASK",
  dueWhen: "tomorrow at nine",
};

export default async function TemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { key } = await params;
  const { msg } = await searchParams;

  const db = await desk();
  const template = templateFor(db, decodeURIComponent(key));
  if (!template) notFound();

  const mayEdit = can(member, "template.edit");
  const holes = holesNeeded(template);
  const example = fill(template, EXAMPLE);
  const field = "w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";

  return (
    <div className="max-w-[760px]">
      <Link href="/templates" className="text-[12.5px] text-brand hover:underline">
        Back to what we send
      </Link>
      <h1 className="mt-2 text-[17px] font-medium">{template.name}</h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        {template.key} · {template.channel === "internal" ? "a notice to our own people" : template.channel}
        {template.updatedAt
          ? " · last changed " + new Date(template.updatedAt).toISOString().slice(0, 10)
          : " · never changed"}
      </p>

      {msg && <p className="mt-3 rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <form action={saveTemplateWording} className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
        <input type="hidden" name="key" value={template.key} />

        <label className="block text-[12.5px] text-ink-soft" htmlFor="name">
          Name, for the list
        </label>
        <input id="name" name="name" defaultValue={template.name} className={field + " mt-1"} disabled={!mayEdit} />

        {template.channel === "email" && (
          <>
            <label className="mt-4 block text-[12.5px] text-ink-soft" htmlFor="subject">
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              defaultValue={template.subject}
              className={field + " mt-1"}
              disabled={!mayEdit}
            />
          </>
        )}

        <label className="mt-4 block text-[12.5px] text-ink-soft" htmlFor="body">
          Message
        </label>
        <textarea
          id="body"
          name="body"
          defaultValue={template.body}
          rows={12}
          className={field + " mt-1 font-mono text-[12.5px]"}
          disabled={!mayEdit}
        />

        {template.channel !== "internal" && (
          <label className="mt-4 flex items-start gap-2 text-[13px]">
            <input
              type="checkbox"
              name="approvedForAuto"
              defaultChecked={template.approvedForAuto}
              disabled={!mayEdit}
              className="mt-0.5"
            />
            <span>
              This wording may go out without anybody reading it.
              <span className="block text-[12px] text-ink-faint">
                Only for routine notices. Anything written to a client about one position waits for a person.
              </span>
            </span>
          </label>
        )}

        {mayEdit ? (
          <button className="mt-4 rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper">
            Save the wording
          </button>
        ) : (
          <p className="mt-4 text-[12.5px] text-ink-faint">Only the ops lead can change this.</p>
        )}
      </form>

      <section className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">The blanks it uses</h2>
        {holes.length === 0 && (
          <p className="mt-2 text-[13px] text-ink-soft">None. It goes out exactly as written.</p>
        )}
        {holes.map((hole) => (
          <div key={hole} className="flex flex-wrap items-baseline gap-x-3 border-t border-rule py-2 first:border-t-0">
            <code className="text-[12.5px]">{"{{" + hole + "}}"}</code>
            <span className="text-[12.5px] text-ink-soft">{HOLE_MEANINGS[hole] ?? "We have nothing for this one."}</span>
          </div>
        ))}
        <p className="mt-3 text-[12.5px] text-ink-faint">
          A blank still empty when a message is drafted stops it from being sent, rather than going out as it stands.
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
        <h2 className="text-[14.5px] font-medium">What it looks like going out</h2>
        <p className="mt-1 text-[12px] text-ink-faint">Filled with stand-ins, so nothing here is a real client.</p>
        {template.channel === "email" && (
          <p className="mt-3 text-[13.5px] font-medium">{example.subject}</p>
        )}
        <p className="mt-2 whitespace-pre-wrap text-[13px]">{example.body}</p>
      </section>
    </div>
  );
}
