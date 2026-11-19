import type { ReactNode } from "react";

import Panel, { PanelSection } from "@/app/ui/Panel";
import { Avatar, pillPrimary, pillSecondary } from "@/app/ui/figma";

export interface PanelPerson {
  name: string;
  detail: string;
  phone?: string;
  email?: string;
  missing?: string;
}

/**
 * The shape every R4/R5 state panel shares (frames 156:718 ... 187:224): why now, who and how, log it here,
 * what happens next + Save. `action` is the existing server action; `fields` are the hidden inputs it reads.
 */
export default function ActionPanel({
  kicker,
  title,
  sub,
  closeHref,
  why,
  people,
  ask,
  askTitle,
  hidden,
  next,
  action,
  blocked,
  children,
}: {
  kicker: string;
  title: string;
  sub: string;
  closeHref: string;
  why: string[];
  people: PanelPerson[];
  ask?: string;
  askTitle?: string;
  hidden: Record<string, string>;
  next: string;
  action: (formData: FormData) => Promise<void>;
  /** When set, Save is off and this line says why ("not connected yet: ..."). */
  blocked?: string;
  children: ReactNode;
}) {
  return (
    <Panel kicker={kicker} title={title} sub={sub} closeHref={closeHref}>
      <PanelSection title="Why now">
        <ul className="flex flex-col gap-2">
          {why.map((line) => (
            <li key={line} className="t-body flex gap-2.5">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-3" />
              {line}
            </li>
          ))}
        </ul>
      </PanelSection>
      {people.length > 0 && (
        <PanelSection title="Who and how">
          {people.map((p) => (
            <div key={p.name} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={p.name} size="40" />
                <div className="min-w-0">
                  <p className="t-body-m">{p.name}</p>
                  <p className="t-small text-ink-3">{p.detail}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.phone && (
                  <>
                    <a href={"tel:" + p.phone.replace(/[^\d+]/g, "")} className={pillSecondary}>Call</a>
                    <a href={"https://wa.me/" + p.phone.replace(/\D/g, "")} target="_blank" rel="noreferrer" className={pillSecondary}>WhatsApp</a>
                  </>
                )}
                {p.email && <a href={"mailto:" + p.email} className={pillSecondary}>Email</a>}
                {!p.phone && !p.email && <span className="t-small text-ink-3">{p.missing ?? "No phone or email on record."}</span>}
              </div>
            </div>
          ))}
          {ask && (
            <div className="flex flex-col gap-1">
              <p className="t-small text-ink-3">{askTitle}</p>
              <p className="t-body">{ask}</p>
            </div>
          )}
        </PanelSection>
      )}
      <form action={action} className="flex flex-col">
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input type="hidden" name="back" value={closeHref} />
        <PanelSection title="Log it here">
          <div className="flex flex-col gap-4">{children}</div>
        </PanelSection>
        <PanelSection title="What happens next">
          <p className="t-body">{next}</p>
          {blocked && <p className="t-small text-ink-3">{blocked}</p>}
          <div>
            <button type="submit" disabled={Boolean(blocked)} className={pillPrimary + (blocked ? " opacity-50" : "")}>
              Save
            </button>
          </div>
        </PanelSection>
      </form>
    </Panel>
  );
}
