import Link from "next/link";

import { recordCall, recordClientDecision } from "@/app/actions";
import Icon from "@/app/Icon";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { ChoiceGroup, PanelField, initialsFor, panelInput, pillPrimary } from "@/app/ui/figma";
import type { OpsDatabase, OpsTask } from "@/data/types";
import { clockOf, callContext, dayShort } from "@/lib/myWorkView";
import CopyButton from "./CopyButton";

const chip = "inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-3.5 py-2 text-[12px] font-medium leading-4 text-ink hover:bg-sunk";

/**
 * The two call panels (frames 150:2 / 156:447 "Call the client" and 140:338 "Write the result").
 * One form: it posts to recordCall, which writes the call down and finishes the task. Nothing dials.
 */
export default function CallPanel({ db, task, mode, now, back, close }: { db: OpsDatabase; task: OpsTask; mode: "call-client" | "write-result"; now: number; back: string; close: string }) {
  const c = callContext(db, task, now);
  const name = c.person?.name || c.ctx.client || task.title;
  const writing = mode === "write-result";
  const email = c.person?.email ?? "";
  const subject = c.ctx.set;
  return (
    <Panel
      kicker={writing ? "Write the result" : "Call the client"}
      title={writing ? "Result of the call with " + name : "Call " + name}
      sub={c.sub || undefined}
      closeHref={close}
    >
      <PanelSection title="Why now">
        <ul className="flex flex-col gap-2">
          {(writing ? ["Call made today, " + dayShort(now) + ", " + clockOf(now), ...c.why] : c.why).map((line) => (
            <li key={line} className="t-body flex items-start gap-2 text-ink-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-warn" />
              {line}
            </li>
          ))}
        </ul>
      </PanelSection>

      <PanelSection title="Who and how">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-sunk t-label text-ink-2">{initialsFor(name)}</span>
          <div className="flex flex-col">
            <p className="t-body-m">{name}</p>
            <p className="t-small text-ink-3">{[c.person?.role, c.phone].filter(Boolean).join(" · ") || "No phone number on record"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.tel ? (
            <a href={c.tel} className={chip}>
              <Icon name="phone" size={14} />
              Call
            </a>
          ) : (
            <span className={chip + " opacity-50"} title="No phone number on record">
              <Icon name="phone" size={14} />
              Call
            </span>
          )}
          {c.phone ? (
            <a href={"https://wa.me/" + c.phone.replace(/\D/g, "")} target="_blank" rel="noreferrer" className={chip}>
              <Icon name="chat" size={14} />
              WhatsApp
            </a>
          ) : null}
          {email ? <CopyButton text={email} label="Copy email" className={chip} /> : null}
        </div>
        {c.ask.length > 0 && (
          <PanelField label="What to ask">
            {c.ask.map((q) => (
              <p key={q} className="t-body text-ink-2">
                {q}
              </p>
            ))}
          </PanelField>
        )}
      </PanelSection>

      {subject && c.open.length > 0 && (
        <PanelSection title="Candidate answers">
          <div className="flex flex-col gap-3">
            {c.open.map((cand) => (
              <div key={cand.applicationTaId} className="flex flex-col gap-2 rounded-[14px] border border-rule bg-surface p-3">
                <p className="t-body-m">{cand.name}</p>
                <div className="flex flex-wrap gap-2">
                  <form action={recordClientDecision}>
                    <input type="hidden" name="setId" value={subject.id} />
                    <input type="hidden" name="applicationTaId" value={cand.applicationTaId} />
                    <input type="hidden" name="decision" value="shortlisted" />
                    <input type="hidden" name="back" value={back} />
                    <button type="submit" className={chip}>
                      Shortlisted
                    </button>
                  </form>
                  <form action={recordClientDecision} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="setId" value={subject.id} />
                    <input type="hidden" name="applicationTaId" value={cand.applicationTaId} />
                    <input type="hidden" name="decision" value="rejected" />
                    <input type="hidden" name="back" value={back} />
                    <input name="reason" required placeholder="Reason if rejected" className="rounded-full border border-rule bg-surface px-3 py-1.5 text-[12px] text-ink outline-none focus:border-ink" />
                    <button type="submit" className={chip}>
                      Rejected
                    </button>
                  </form>
                </div>
              </div>
            ))}
            <p className="t-small text-ink-3">
              Or open{" "}
              <Link href={"/sets/" + subject.id} className="underline">
                the set&apos;s page
              </Link>{" "}
              to see all CVs.
            </p>
          </div>
        </PanelSection>
      )}

      <form action={recordCall}>
        <input type="hidden" name="taskId" value={task.id} />
        {task.subjectType && <input type="hidden" name="subjectType" value={task.subjectType} />}
        {task.subjectId && <input type="hidden" name="subjectId" value={task.subjectId} />}
        <input type="hidden" name="purpose" value={c.purpose} />
        <input type="hidden" name="toName" value={name} />
        <input type="hidden" name="back" value={back} />

        <PanelSection title="Log it here">
          <PanelField label="Number">
            <input name="to" defaultValue={c.phone ?? ""} placeholder="077 123 4567" required className={panelInput} />
          </PanelField>
          <PanelField label="Who you spoke to">
            <input name="spokeTo" defaultValue={c.person?.name ?? ""} placeholder="a name, or that nobody answered" required className={panelInput} />
          </PanelField>
          <PanelField label="Call result" hint="One line about what was said. A call is not finished until it is written down.">
            <textarea name="outcome" rows={3} required placeholder="Note: what was said, what happens next" className={panelInput} />
          </PanelField>
        </PanelSection>

        <PanelSection title="What happens next">
          <p className="t-body text-ink-2">Saving writes the call down and finishes the call task. Nothing is dialled or sent from here.</p>
          <div className="flex gap-3">
            <button className={pillPrimary}>Save</button>
            <Link href={close} replace scroll={false} className="inline-flex items-center rounded-full px-5 py-[11px] t-body-m text-ink-2 hover:text-ink">
              Cancel
            </Link>
          </div>
        </PanelSection>
      </form>
    </Panel>
  );
}
