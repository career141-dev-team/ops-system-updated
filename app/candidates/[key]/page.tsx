import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { BackBar, PageBox, figmaLabel } from "@/app/ui/figma";
import { desk } from "@/data/desk";
import { candidatesOnDesk } from "@/lib/candidates";
import { currentMember } from "@/lib/session";

const DOT: Record<string, string> = { ok: "bg-success", warn: "bg-warn", violet: "bg-violet", info: "bg-info", danger: "bg-danger", quiet: "bg-ink-faint" };

/**
 * One candidate (Figma 249:11354): who they are, each opening they are in, and for the chosen
 * one the CV copy Ops holds. Read-only: the TA System owns the person.
 */
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
    <PageBox width="1080" className="gap-6">
      <BackBar
        href="/candidates"
        label="Candidates"
        right={
          <div className="flex items-center gap-1.5 rounded-full bg-sunk px-3.5 py-1.5 text-[12px] font-medium tracking-[0.4px] text-ink-faint">
            <Icon name="lock" size={14} />
            <span>Read from the TA System</span>
          </div>
        }
      />

      <div className="flex items-center gap-4">
        <span className="flex size-[70px] shrink-0 items-center justify-center rounded-full bg-brand-tint text-[26px] text-brand">{person.initials}</span>
        <div className="flex flex-col">
          <h1 className="text-[40px] font-light leading-[50px] text-ink">{person.name}</h1>
          <p className="text-[16px] leading-[26px] text-ink-soft">
            {chosen.title} at {chosen.clientName} · {n} {n === 1 ? "opening" : "openings"}
          </p>
        </div>
      </div>

      <p className={figmaLabel}>APPLICATIONS · {n} {n === 1 ? "OPENING" : "OPENINGS"}</p>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {person.applications.map((a) => (
          <Link
            key={a.openingTaId}
            href={`/candidates/${encodeURIComponent(person.key)}?app=${encodeURIComponent(a.openingTaId)}`}
            className={"flex flex-col gap-1 rounded-[20px] px-[18px] py-4 " + (a === chosen ? "bg-surface shadow-float" : "bg-sunk hover:shadow-card")}
          >
            <span className="text-[14px] leading-[21px] text-ink-faint">{a.clientName}</span>
            <span className="text-[16px] font-medium leading-[26px] text-ink">{a.title}</span>
            <span className="flex items-center gap-1.5 pt-1.5 text-[14px] leading-[21px] text-ink-soft">
              <span aria-hidden="true" className={"size-[7px] rounded-full " + DOT[a.tone]} />
              {a.status}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-[20px] bg-sunk p-5">
          <p className={figmaLabel}>FOR THIS OPENING</p>
          {[
            ["Opening", chosen.title],
            ["Client", chosen.clientName],
            ["CV set", chosen.setName ?? "Not in a set"],
            ["Client decided", chosen.decision ?? "Not yet"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 text-[14px] leading-[21px]">
              <span className="text-ink-faint">{k}</span>
              <span className="text-ink">{v}</span>
            </div>
          ))}
          {chosen.positionId && (
            <Link href={`/positions/${chosen.positionId}`} className="pt-1 text-[14px] leading-[21px] text-brand hover:underline">
              Open the opening
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-3 rounded-[20px] bg-sunk p-5">
          <p className={figmaLabel}>CV</p>
          {file ? (
            <Link href={`/api/files/${file.id}`} className="flex items-center gap-2 self-start rounded-full bg-rule px-4 py-2 text-[14px] leading-[21px] text-ink hover:bg-rule-strong">
              <Icon name="file" size={16} />
              {file.name}
            </Link>
          ) : (
            <p className="text-[14px] leading-[21px] text-ink-soft">Ops holds no copy of the CV for this opening. It is in the TA System.</p>
          )}
        </div>
      </div>
    </PageBox>
  );
}
