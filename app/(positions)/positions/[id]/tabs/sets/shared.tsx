import Icon from "@/app/Icon";
import { PanelSection } from "@/app/ui/Panel";
import { Avatar, ChoiceGroup, panelInput, pillPrimary } from "@/app/ui/figma";
import { recordClientDecision } from "@/app/actions";
import { contactsFor } from "@/lib/contacts";

import type { RoleCtx } from "../ctx";

/** The small outline button of the v6 cards and panels (12px label). */
export const chipBtn =
  "t-label inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-[7px] text-ink transition-colors hover:bg-sunk cursor-pointer";
export const chipInk =
  "t-label inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-[7px] text-ink-inverse cursor-pointer";

export type SetRow = RoleCtx["itsSets"][number];

export const rolePath = (c: RoleCtx) => `/positions/${c.position.id}`;

/** The person we write to for this role: its own named people first, then the client's contacts. */
export function contactOf(c: RoleCtx) {
  return contactsFor({ position: c.position.contacts, client: c.client?.contacts })[0] ?? null;
}

/** "Serendib Foods > Sales Executive > SET 2", the line under a panel title. */
export const trail = (c: RoleCtx, set?: SetRow | null) =>
  [c.clientName, c.position.title, set ? "SET " + set.setNumber : null].filter(Boolean).join(" > ");

export function WhyNow({ items }: { items: string[] }) {
  return (
    <PanelSection title="WHY NOW">
      <ul className="flex flex-col gap-2.5">
        {items.map((t) => (
          <li key={t} className="t-body flex items-start gap-3 text-ink-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warning" />
            {t}
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

/** The contact, with Call / WhatsApp / Email as plain links that open the person's own app (nothing is sent from here). */
export function WhoAndHow({ c, children }: { c: RoleCtx; children?: React.ReactNode }) {
  const who = contactOf(c);
  const digits = who?.phone.replace(/[^\d]/g, "");
  return (
    <PanelSection title="WHO AND HOW">
      {who ? (
        <>
          <div className="flex items-center gap-3.5">
            <Avatar name={who.name} size="40" tone="neutral" />
            <div className="flex min-w-0 flex-col">
              <span className="t-body-m">{who.name}</span>
              <span className="t-small text-ink-3">
                {[who.role ? who.role.toUpperCase() : null, c.clientName, who.phone].filter(Boolean).join(" · ")}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {who.phone && (
              <a href={`tel:${who.phone}`} className={chipBtn}>
                <Icon name="phone" size={14} /> Call
              </a>
            )}
            {digits && (
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className={chipBtn}>
                <Icon name="chat" size={14} /> WhatsApp
              </a>
            )}
            <a href={`mailto:${who.email}`} className={chipBtn}>
              <Icon name="mail" size={14} /> Email
            </a>
          </div>
        </>
      ) : (
        <p className="t-body text-ink-2">No contact is saved for this role yet. Add one on the client&apos;s page.</p>
      )}
      {children}
    </PanelSection>
  );
}

export function WhatNext({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <PanelSection title="WHAT HAPPENS NEXT">
      <p className="t-body text-ink-2">{children}</p>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </PanelSection>
  );
}

/** One person the client has not answered: shortlist or reject, in the client's own words. Posts to recordClientDecision. */
export function AnswerForm({ set, who, back }: { set: SetRow; who: SetRow["candidates"][number]; back: string }) {
  return (
    <form action={recordClientDecision} className="flex flex-col gap-2.5 border-t border-rule pt-4 first:border-t-0 first:pt-0">
      <input type="hidden" name="setId" value={set.id} />
      <input type="hidden" name="applicationTaId" value={who.applicationTaId} />
      <input type="hidden" name="back" value={back} />
      <div className="flex items-center gap-3.5">
        <Avatar name={who.name} size="40" tone="neutral" />
        <div className="flex flex-col">
          <span className="t-body-m">{who.name}</span>
          <span className="t-small text-ink-3">SET {set.setNumber} · no answer yet</span>
        </div>
      </div>
      <ChoiceGroup
        name="decision"
        label={`Answer for ${who.name}`}
        required
        options={[
          { value: "shortlisted", label: "Shortlisted", tone: "good" },
          { value: "rejected", label: "Rejected", tone: "bad" },
        ]}
      />
      <input name="reason" required placeholder="What the client said, in their words" aria-label={`Reason for ${who.name}`} className={panelInput} />
      <div>
        <button type="submit" className={pillPrimary}>
          Save
        </button>
      </div>
    </form>
  );
}

