import Link from "next/link";
import type { ReactNode } from "react";

import { buildWeeklyReportNow, setPositionTeam } from "@/app/actions";
import Icon from "@/app/Icon";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { Avatar, ChoiceGroup, PanelField, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import CopyMessage from "./CopyMessage";

/** The four state panels of P1 (frames 156:99, 156:187, 156:264, 180:609). */

export interface Person {
  name: string;
  phone?: string;
  line: string;
}

function Why({ lines }: { lines: string[] }) {
  return (
    <PanelSection title="Why now">
      <ul className="flex flex-col gap-2.5">
        {lines.map((l) => (
          <li key={l} className="t-body flex items-start gap-2.5">
            <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-warn" aria-hidden="true" />
            {l}
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

function PersonRow({ p, actions }: { p: Person; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3.5">
        <Avatar name={p.name} size="40" tone="neutral" />
        <div className="flex flex-col">
          <span className="t-body-m">{p.name}</span>
          <span className="t-small text-ink-faint">{p.line}</span>
        </div>
      </div>
      {actions}
    </div>
  );
}

function ContactButtons({ phone }: { phone?: string }) {
  const digits = (phone ?? "").replace(/[^\d]/g, "");
  if (!digits) return <p className="t-small text-ink-3">No phone number on file.</p>;
  return (
    <div className="flex gap-2">
      <a href={"tel:+" + digits} className={pillSecondary + " !px-4 !py-2"}>
        <Icon name="phone" size={14} />
        Call
      </a>
      <a href={"https://wa.me/" + digits} target="_blank" rel="noreferrer" className={pillSecondary + " !px-4 !py-2"}>
        <Icon name="chat" size={14} />
        WhatsApp
      </a>
    </div>
  );
}

/** Save, and Save and next. `back` rides on the button's own value, so each goes where it says with no script. */
function SaveRow({ closeHref, nextHref, disabled }: { closeHref: string; nextHref: string | null; disabled?: string }) {
  if (disabled) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2.5">
          <button type="button" disabled className={pillPrimary + " opacity-40"}>Save</button>
        </div>
        <p className="t-small text-ink-3">Not connected yet: {disabled}</p>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <button type="submit" name="back" value={closeHref} className={pillPrimary}>Save</button>
      {nextHref && <button type="submit" name="back" value={nextHref} className={pillSecondary}>Save and next</button>}
    </div>
  );
}

export function ChooseTaPanel(p: {
  closeHref: string;
  nextHref: string | null;
  sub: string;
  positionId: string;
  why: string[];
  tas: { id: string; name: string; roles: number; fewest: boolean }[];
  currentPrimaryId: string | null;
  hundredPercentDay: string | null;
  msg?: string;
}) {
  const suggested = p.currentPrimaryId ?? p.tas.find((t) => t.fewest)?.id;
  return (
    <Panel kicker="Choose a TA" title="Choose a TA" sub={p.sub} closeHref={p.closeHref}>
      {p.msg && <p className="t-small mb-4 rounded-[12px] bg-sunk px-3.5 py-2.5 text-ink">{p.msg}</p>}
      <Why lines={p.why} />
      <PanelSection title="Who and how">
        {p.tas.length === 0 ? (
          <p className="t-body text-ink-2">The TA System did not give us a list of TAs, so there is nobody to choose from yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {p.tas.map((t) => (
              <PersonRow key={t.id} p={{ name: t.name, line: `TA · ${t.roles} ${t.roles === 1 ? "role" : "roles"} now${t.fewest ? ", the fewest" : ""}` }} />
            ))}
          </div>
        )}
      </PanelSection>
      <form action={setPositionTeam}>
        <input type="hidden" name="positionId" value={p.positionId} />
        <PanelSection title="Log it here">
          <PanelField label="Primary TA">
            <ChoiceGroup name="primaryTaId" label="Primary TA" required value={suggested} options={p.tas.map((t) => ({ value: t.id, label: t.name }))} />
          </PanelField>
          <PanelField label="Second TA" hint="Not connected yet: the TA lead names a second TA in the TA System.">
            <span />
          </PanelField>
          <PanelField label="100% day">
            <input name="hundredPercentDay" defaultValue={p.hundredPercentDay ?? ""} placeholder="100% day, for example Tue 24 Nov" className={panelInput} />
          </PanelField>
        </PanelSection>
        <PanelSection title="What happens next">
          <p className="t-body text-ink-2">The choice is saved on the role and sent to the TA System. The role moves to TA search.</p>
          {p.tas.length > 0 ? <SaveRow closeHref={p.closeHref} nextHref={p.nextHref} /> : <SaveRow closeHref={p.closeHref} nextHref={null} disabled="the list of TAs" />}
        </PanelSection>
      </form>
    </Panel>
  );
}

export function ChaseHrPanel(p: {
  closeHref: string;
  nextHref: string | null;
  title: string;
  sub: string;
  why: string[];
  contact: Person | null;
  ask: string[];
}) {
  return (
    <Panel kicker="Chase the client HR" title={p.title} sub={p.sub} closeHref={p.closeHref}>
      <Why lines={p.why} />
      <PanelSection title="Who and how">
        {p.contact ? <PersonRow p={p.contact} actions={<ContactButtons phone={p.contact.phone} />} /> : <p className="t-body text-ink-2">No contact is on file for this client yet.</p>}
        <PanelField label="What to ask">
          <div className="flex flex-col">{p.ask.map((l) => <p key={l} className="t-body">{l}</p>)}</div>
        </PanelField>
      </PanelSection>
      <PanelSection title="Log it here">
        <PanelField label="The answer">
          <div className="flex flex-wrap gap-2">
            {["Accepted", "Declined", "Wants changes", "No answer yet"].map((l) => (
              <span key={l} className="t-label rounded-full border border-rule px-4 py-[9px] text-ink-3">{l}</span>
            ))}
          </div>
        </PanelField>
      </PanelSection>
      <PanelSection title="What happens next">
        <SaveRow closeHref={p.closeHref} nextHref={p.nextHref} disabled="writing the HR's answer down from here. Record it on the role page." />
      </PanelSection>
    </Panel>
  );
}

export function AskTaPanel(p: {
  closeHref: string;
  nextHref: string | null;
  title: string;
  sub: string;
  why: string[];
  ta: Person | null;
  message: string;
}) {
  return (
    <Panel kicker="Ask the TA for CVs" title={p.title} sub={p.sub} closeHref={p.closeHref}>
      <Why lines={p.why} />
      <PanelSection title="Who and how">
        {p.ta ? <PersonRow p={p.ta} actions={<ContactButtons phone={p.ta.phone} />} /> : <p className="t-body text-ink-2">No TA is chosen for this role yet.</p>}
        <PanelField label="Message to copy">
          <div className="flex flex-col gap-3">
            <p className="t-body rounded-[14px] border border-rule px-4 py-3.5">{p.message}</p>
            <CopyMessage text={p.message} />
          </div>
        </PanelField>
      </PanelSection>
      <PanelSection title="Log it here">
        <p className="t-small text-ink-3">How you asked and the promised date are not saved yet.</p>
      </PanelSection>
      <PanelSection title="What happens next">
        <p className="t-body text-ink-2">Nothing is sent from here. Copy the message and send it yourself.</p>
        <SaveRow closeHref={p.closeHref} nextHref={p.nextHref} disabled="saving who you asked and the promised date" />
      </PanelSection>
    </Panel>
  );
}

export function WeeklyReportPanel(p: {
  closeHref: string;
  built: string;
  counts: string;
  recipients: string[];
  latest: { id: string; weekOf: string; state: string } | null;
}) {
  return (
    <Panel kicker="Weekly report" title="Weekly report" sub="All roles > Weekly list of active roles" closeHref={p.closeHref}>
      <Why lines={[p.built, p.counts]} />
      <PanelSection title="Who and how">
        <p className="t-body text-ink-2">
          {p.recipients.length ? `The report goes by email to ${p.recipients.join(", ")}, after you have read it.` : "Nobody is set to receive the report. Put the Director's address in the settings first."}
        </p>
        {p.latest && (
          <Link href={"/reports/" + p.latest.id} className="t-body-m underline">
            Open the report for {p.latest.weekOf}
          </Link>
        )}
      </PanelSection>
      <form action={buildWeeklyReportNow}>
        <PanelSection title="What happens next">
          <p className="t-body text-ink-2">The system builds the list from the roles as they stand now. You read it, approve it, and only then is the email drafted for you to send.</p>
          <div className="flex gap-2.5">
            <button type="submit" className={pillPrimary}>{p.latest ? "Build it again and read it" : "Build and read it"}</button>
          </div>
        </PanelSection>
      </form>
    </Panel>
  );
}
