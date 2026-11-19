import Link from "next/link";
import { redirect } from "next/navigation";

import { desk } from "@/data/desk";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { holesNeeded } from "@/lib/templates";

/**
 * The wording we send, in one list (15, Phase 1 step 25).
 *
 * Grouped by channel because that is how a person thinks about them — "the
 * emails" and "the WhatsApps" — and because only an email has a subject. Each
 * row says what it is for and whether it may go out on its own, which is the
 * one thing worth seeing without opening it.
 */
export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { msg } = await searchParams;
  const mayEdit = can(member, "template.edit");

  const db = await desk();
  const templates = [...db.templates].sort((a, b) => a.key.localeCompare(b.key));
  const groups: { title: string; of: typeof templates }[] = [
    { title: "Emails", of: templates.filter((t) => t.channel === "email") },
    { title: "WhatsApp", of: templates.filter((t) => t.channel === "whatsapp") },
    { title: "Group posts", of: templates.filter((t) => t.channel === "group_post") },
    { title: "Our own notices", of: templates.filter((t) => t.channel === "internal") },
  ].filter((g) => g.of.length > 0);

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-4 p-1">
        <div className="flex flex-col gap-1.5">
          <h1 className="t-display">What we send</h1>
          <p className="t-small text-ink-3">
          {mayEdit
            ? "The wording of every message, in one place. Change it here and the next one sent uses it."
            : "The wording of every message. Only the ops lead can change it."}
          </p>
        </div>
        <Link href="/settings?view=templates" className="t-body-m inline-flex items-center rounded-full border border-rule bg-surface px-4 py-2 text-ink hover:bg-sunk">
          Open in Settings · Templates and people
        </Link>
      </div>

      {msg && <p className="rounded-[18px] bg-sunk px-4 py-3 t-small">{msg}</p>}

      {groups.map((group) => (
        <section key={group.title} className="rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
          <h2 className="t-h2">{group.title}</h2>
          {group.of.map((template) => (
            <div key={template.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0">
              <Link href={"/templates/" + template.key} className="text-[13.5px] text-brand hover:underline">
                {template.name}
              </Link>
              <span className="text-[12px] text-ink-faint">{template.key}</span>
              <span className="min-w-0 flex-1 text-right text-[12px] text-ink-faint">
                {holesNeeded(template).length} blanks
                {template.approvedForAuto ? " · goes on its own" : " · a person approves it"}
              </span>
            </div>
          ))}
        </section>
      ))}

      <p className="mt-4 text-[12.5px] text-ink-faint">
        More wording arrives with the part of the work that sends it: the agreement with client onboarding, the
        invoice with the money.{" "}
        <Link href="/" className="text-brand hover:underline">
          Back to your day
        </Link>
      </p>
    </div>
  );
}
