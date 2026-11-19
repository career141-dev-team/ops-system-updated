import Link from "next/link";

import { declineAgreement, draftNextChase, recordChangesWanted } from "@/app/actions";
import Icon from "@/app/Icon";
import { Avatar, pillPrimary, pillSecondary, panelInput } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import type { OpsDatabase, OpsEsa } from "@/data/types";
import { type AgreementCard, chaseCopy, contactOf, dayWords, repliedSince } from "@/lib/clientsView";
import { chaseDueAt, dueWords } from "@/lib/clientsBoard";
import { CHASE_PLAN, chaseStep } from "@/lib/esa";
import CopyButton from "../../CopyButton";
import ReasonPicker from "../../ReasonPicker";
import { waLink } from "../../parts";

const small = " !px-4 !py-[7px] !text-[12px]";

function Bullets({ title, lines }: { title: string; lines: string[] }) {
  return (
    <PanelSection title={title}>
      <ul className="flex flex-col gap-3">
        {lines.map((w, i) => (
          <li key={i} className="t-body flex items-start gap-3 text-ink-2">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-[3px] bg-warn" />
            {w}
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

function who(db: OpsDatabase, esa: OpsEsa, card: AgreementCard) {
  const client = card.clientId ? (db.clients.find((c) => c.id === card.clientId) ?? null) : null;
  const lead = db.leads.find((l) => l.id === esa.leadId) ?? null;
  const person = (client ? contactOf(client, lead) : null) ?? {
    name: esa.fields.signatoryName ?? lead?.contactName ?? "",
    email: esa.fields.signatoryEmail ?? lead?.contactEmail ?? "",
    phone: esa.fields.signatoryPhone ?? lead?.contactPhone ?? "",
    role: "",
  };
  return { client, person };
}

/** C3 "Chase the agreement" (156:2): why the chase is due, the words to copy, and the real way to draft it for approval. */
export function ChaseAgreementPanel({ db, esa, card, now, close, mayManage }: { db: OpsDatabase; esa: OpsEsa; card: AgreementCard; now: number; close: string; mayManage: boolean }) {
  const { client, person } = who(db, esa, card);
  const replied = client ? repliedSince(db, client, esa.sentAt) : false;
  const next = chaseStep(esa.chaseStep + 1);
  const due = next && esa.sentAt ? dueWords(chaseDueAt(esa.sentAt, next.step, CHASE_PLAN), now) : null;
  const copy = chaseCopy(db, esa, replied, person.phone || null);
  const wa = waLink(person.phone);
  const daysAgo = esa.sentAt ? Math.max(0, Math.round((now - esa.sentAt) / 86_400_000)) : 0;
  const why = [
    next ? "Chase " + next.step + " of " + CHASE_PLAN.length + " is " + (due?.text ?? "next") + ": " + next.what.toLowerCase() : "The chase has run out: somebody has to call them",
    esa.sentAt ? "Agreement v" + esa.version + " was sent " + dayWords(esa.sentAt) + ", " + daysAgo + (daysAgo === 1 ? " day" : " days") + " ago" : "The agreement has not been sent",
    replied ? "The client has written since it was sent, so the chase stops" : esa.chaseStep ? "No reply to chase " + (esa.chaseStep === 1 ? "1" : "1 to " + esa.chaseStep) : "No reply yet",
  ];
  const title = next ? "Chase " + next.step + " for " + card.company : "Chase " + card.company;
  return (
    <Panel kicker="Chase the agreement" title={title} sub={[card.company, "Agreement v" + esa.version, next ? "Chase " + next.step + " of " + CHASE_PLAN.length : ""].filter(Boolean).join(" > ")} closeHref={close}>
      <Bullets title="Why now" lines={why} />
      <PanelSection title="Who and how">
        <div className="flex items-center gap-3">
          <Avatar name={person.name || card.company} size="40" tone="neutral" />
          <div className="flex min-w-0 flex-col">
            <span className="t-body-m">{person.name || "No contact written down"}</span>
            <span className="t-small text-ink-3">{["Signatory", card.company, person.phone].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {person.phone && (
            <a href={"tel:" + person.phone.replace(/\s/g, "")} className={pillSecondary + small}>
              <Icon name="phone" size={14} />
              Call
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className={pillSecondary + small}>
              <Icon name="chat" size={14} />
              WhatsApp
            </a>
          )}
          {person.email && <CopyButton text={person.email} label="Copy email" tone="pill" />}
        </div>
        {copy && (
          <div className="flex flex-col gap-1.5">
            <span className="t-small text-ink-3">Chase {copy.step} message</span>
            <p className="t-body whitespace-pre-wrap rounded-[14px] border border-rule px-4 py-3.5 text-ink-2">{copy.text}</p>
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={copy.text} label={copy.label} tone="pill" />
              <Link href={"/clients/agreements?send=chase-agreement&on=" + esa.id} scroll={false} className={pillSecondary + small}>
                <Icon name="send" size={14} />
                Preview and send
              </Link>
            </div>
          </div>
        )}
        {!copy && !replied && next && next.channel === "call" && <p className="t-body text-ink-2">The last step is a call by a person. Ring them, then write down what they say.</p>}
      </PanelSection>
      {mayManage && !replied && (
        <PanelSection title="Log it here">
          {next && next.channel !== "call" && (
            <form action={draftNextChase} className="flex flex-col gap-3">
              <input type="hidden" name="esaId" value={esa.id} />
              <input type="hidden" name="back" value={close} />
              <p className="t-body text-ink-2">Drafts chase {next.step} in To approve, and moves the chase on. A person approves it before it goes.</p>
              <button type="submit" className={pillPrimary + " self-start"}>
                Draft chase {next.step} for approval
              </button>
            </form>
          )}
          <form action={recordChangesWanted} className="flex flex-col gap-2.5 border-t border-rule pt-4">
            <input type="hidden" name="esaId" value={esa.id} />
            <input type="hidden" name="back" value={close} />
            <span className="t-small text-ink-3">If they answered: they want changes</span>
            <input name="what" required placeholder="What they want changed" className={panelInput} />
            <button type="submit" className={pillSecondary + small + " self-start"}>
              They want changes
            </button>
          </form>
          <Link href={"/leads/" + esa.leadId + "?step=agreement"} className="t-body-m text-brand hover:underline">
            They signed it back: record the signed copy
          </Link>
          <p className="t-small text-ink-3">Not connected yet: writing down a chase you sent by hand. Until then, draft it above so it is on the record.</p>
        </PanelSection>
      )}
      <PanelSection title="What happens next">
        <p className="t-body text-ink-2">
          {replied
            ? "Read their reply and answer by hand. The remaining chases do not go out."
            : next && CHASE_PLAN[next.step]
              ? "Chase " + (next.step + 1) + " follows after " + CHASE_PLAN[next.step].afterDays + " days. If it is signed back, the agreement moves to Signed and the chases stop."
              : "If it is signed back, the agreement moves to Signed and the chases stop. Otherwise it is declined or expires after two weeks."}
        </p>
      </PanelSection>
    </Panel>
  );
}

/** C3 "Agreement declined or expired" (185:295): what happened and why, written as the one reason the decline keeps. */
export function AgreementDeclinedPanel({ db, esa, card, close, mayManage, open }: { db: OpsDatabase; esa: OpsEsa | null; card: AgreementCard | null; close: string; mayManage: boolean; open: { id: string; company: string }[] }) {
  if (!esa || !card) {
    return (
      <Panel kicker="Agreement declined or expired" title="Which agreement?" closeHref={close}>
        {open.length === 0 ? (
          <p className="t-body text-ink-2">No agreement is out waiting for an answer.</p>
        ) : (
          <div className="flex flex-col">
            {open.map((o) => (
              <Link key={o.id} href={"?panel=agreement-declined&on=" + o.id} scroll={false} replace className="t-body-m border-t border-rule py-4 first:border-t-0 hover:text-brand">
                {o.company}
              </Link>
            ))}
          </div>
        )}
      </Panel>
    );
  }
  const { person } = who(db, esa, card);
  const wa = waLink(person.phone);
  const sent = esa.sentAt ? "Sent on " + dayWords(esa.sentAt) + ", day " + Math.max(1, Math.round((Date.now() - esa.sentAt) / 86_400_000)) + " today" : "Not sent yet";
  return (
    <Panel kicker="Agreement declined or expired" title={"Agreement not signed by " + card.company} sub={[card.company, "Agreement v" + esa.version].join(" > ")} closeHref={close}>
      <Bullets title="Why now" lines={[sent, esa.chaseStep ? "Chase 1" + (esa.chaseStep > 1 ? " to " + esa.chaseStep : "") + " went out, no answer" : "No chase has gone out", "Or the client said no"]} />
      <PanelSection title="Who and how">
        <div className="flex items-center gap-3">
          <Avatar name={person.name || card.company} size="40" tone="neutral" />
          <div className="flex min-w-0 flex-col">
            <span className="t-body-m">{person.name || "No contact written down"}</span>
            <span className="t-small text-ink-3">{["Signatory", card.company, person.phone].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {person.phone && (
            <a href={"tel:" + person.phone.replace(/\s/g, "")} className={pillSecondary + small}>
              <Icon name="phone" size={14} />
              Call
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className={pillSecondary + small}>
              <Icon name="chat" size={14} />
              WhatsApp
            </a>
          )}
          {person.email && (
            <a href={"mailto:" + person.email} className={pillSecondary + small}>
              <Icon name="mail" size={14} />
              Email
            </a>
          )}
        </div>
      </PanelSection>
      {mayManage ? (
        <form action={declineAgreement}>
          <input type="hidden" name="esaId" value={esa.id} />
          <input type="hidden" name="back" value={close} />
          <PanelSection title="Log it here">
            <ReasonPicker
              target="reason"
              groups={[
                { label: "What happened", options: ["Declined by the client", "No answer by day 15"] },
                { label: "Why", options: ["Fee too high", "Found another agency", "Not hiring now", "Other"], first: false },
              ]}
              noteLabel="Note"
              notePlaceholder="What they said, in a line"
            />
            <label className="flex flex-col gap-1.5">
              <span className="t-small text-ink-3">Invite back on</span>
              <input type="date" disabled className={panelInput + " opacity-60"} />
              <span className="t-small text-ink-3">Not connected yet: an invite-back reminder needs its own action.</span>
            </label>
          </PanelSection>
          <PanelSection title="What happens next">
            <p className="t-body text-ink-2">The agreement is closed as declined and the team is told the search for this client is blocked. Nothing closes without a reason, so the note is kept as written.</p>
            <button type="submit" className={pillPrimary + " self-start"}>
              Save
            </button>
          </PanelSection>
        </form>
      ) : (
        <PanelSection>
          <p className="t-body text-ink-2">Only somebody who manages clients can close an agreement.</p>
        </PanelSection>
      )}
    </Panel>
  );
}
