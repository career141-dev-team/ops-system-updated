import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { Card, PageTitle, pillSecondary } from "@/app/ui/figma";
import { desk } from "@/data/desk";
import { candidatesOnDesk } from "@/lib/candidates";
import { currentMember } from "@/lib/session";

const DOT: Record<string, string> = { ok: "bg-success", warn: "bg-warning", violet: "bg-violet", info: "bg-info", danger: "bg-danger", quiet: "bg-ink-faint" };

/** One candidate: each opening they are in, and for the chosen one the CV copy Ops holds. Read-only: the TA System owns the person. */
export default async function CandidatePage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ app?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { key } = await params;
  const { app } = await searchParams;
  const db = await desk();
  const person = candidatesOnDesk(db).find((p) => p.key === decodeURIComponent(key));
  if (!person) notFound();

  const chosen = person.applications.find((a) => a.openingTaId === app) ?? person.applications[0];
  const file = chosen?.fileId ? db.files.find((f) => f.id === chosen.fileId) : null;
  const n = person.applications.length;

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title={person.name}
        sub={`${chosen.title} at ${chosen.clientName} · ${n} ${n === 1 ? "opening" : "openings"} · read from the TA System`}
        right={
          <Link href="/candidates" className={pillSecondary}>
            <Icon name="chevron-left" size={16} /> Candidates
          </Link>
        }
      />
      <Card title="Applications" sub={`${n} ${n === 1 ? "opening" : "openings"}`}>
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {person.applications.map((a) => (
            <Link
              key={a.openingTaId}
              href={`/candidates/${encodeURIComponent(person.key)}?app=${encodeURIComponent(a.openingTaId)}`}
              className={"flex flex-col gap-1 rounded-[16px] px-[18px] py-4 " + (a === chosen ? "border border-ink bg-surface" : "bg-sunk hover:bg-rule/50")}
            >
              <span className="t-small text-ink-3">{a.clientName}</span>
              <span className="t-body-m">{a.title}</span>
              <span className="t-small flex items-center gap-1.5 pt-1.5 text-ink-2">
                <span aria-hidden="true" className={"size-[7px] rounded-full " + DOT[a.tone]} />
                {a.status}
              </span>
            </Link>
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-[22px] md:grid-cols-2">
        <Card title="For this opening">
          {[
            ["Opening", chosen.title],
            ["Client", chosen.clientName],
            ["CV set", chosen.setName ?? "Not in a set"],
            ["Client decided", chosen.decision ?? "Not yet"],
          ].map(([k, v]) => (
            <div key={k} className="t-body flex items-center justify-between gap-4">
              <span className="text-ink-3">{k}</span>
              <span>{v}</span>
            </div>
          ))}
          {chosen.positionId && (
            <Link href={`/positions/${chosen.positionId}?view=sets`} className="t-body-m text-brand hover:underline">
              Open the opening
            </Link>
          )}
        </Card>
        <Card title="CV">
          {file ? (
            <Link href={`/api/files/${file.id}`} className={pillSecondary + " self-start"}>
              <Icon name="file" size={16} />
              {file.name}
            </Link>
          ) : (
            <p className="t-body text-ink-2">Ops holds no copy of the CV for this opening. It is in the TA System.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
