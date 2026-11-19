import Link from "next/link";

import { recordCall } from "@/app/actions";
import Icon from "@/app/Icon";
import { Avatar, pillPrimary, pillSecondary, panelInput } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import type { ClientCard } from "@/lib/clientsView";
import { dayWords } from "@/lib/clientsView";
import CopyButton from "../CopyButton";
import { waLink } from "../parts";
import ReasonPicker from "../ReasonPicker";

/**
 * C1 panel "Check in with the client" (frame 156:354): why now, who and how, the message to copy, and a
 * line to write down what happened. Saving writes a call note on the client (`recordCall`): it is a record
 * of what a person did, and nothing is sent from here.
 */
export default function CheckInPanel({ card, now, close, checkIn }: { card: ClientCard; now: number; close: string; checkIn: string }) {
  const p = card.person;
  const wa = waLink(p?.phone);
  const why = [
    card.quietDays === null ? "No call or message is written down for them yet" : card.quietDays > 0 ? "Quiet for " + card.quietDays + (card.quietDays === 1 ? " day" : " days") + ": no call or message since" : "Talked today",
    card.openRoles.length ? card.openRoles.length + (card.openRoles.length === 1 ? " role is open" : " roles are open") + ": " + card.openRoles.map((r) => r.title).join(", ") : "No role is open for them right now",
    card.status.text,
  ];
  return (
    <Panel kicker="Check in with the client" title={"Check in with " + card.name} sub={[card.name, card.openRoles[0]?.title].filter(Boolean).join(" > ")} closeHref={close}>
      <PanelSection title="Why now">
        <ul className="flex flex-col gap-3">
          {why.map((w, i) => (
            <li key={i} className="t-body flex items-start gap-3 text-ink-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-[3px] bg-warn" />
              {w}
            </li>
          ))}
        </ul>
      </PanelSection>
      <PanelSection title="Who and how">
        {p ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar name={p.name} size="40" tone="neutral" />
              <div className="flex min-w-0 flex-col">
                <span className="t-body-m">{p.name}</span>
                <span className="t-small text-ink-3">{[p.role ? p.role.toUpperCase() : "", card.name, p.phone].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.phone && (
                <a href={"tel:" + p.phone.replace(/\s/g, "")} className={pillSecondary + " !px-4 !py-[7px] !text-[12px]"}>
                  <Icon name="phone" size={14} />
                  Call
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className={pillSecondary + " !px-4 !py-[7px] !text-[12px]"}>
                  <Icon name="chat" size={14} />
                  WhatsApp
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="t-body text-ink-2">
            Nobody is written down as their contact. <Link href={card.href + "?view=contacts"} className="text-brand underline">Add one on their page.</Link>
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="t-small text-ink-3">Check-in message</span>
          <p className="t-body rounded-[14px] border border-rule px-4 py-3.5 text-ink-2">{checkIn}</p>
          <div>
            <CopyButton text={checkIn} label="Copy check-in" tone="pill" />
          </div>
        </div>
      </PanelSection>
      <form action={recordCall}>
        <input type="hidden" name="back" value={close} />
        <input type="hidden" name="subjectType" value="client" />
        <input type="hidden" name="subjectId" value={card.id} />
        <input type="hidden" name="purpose" value="check-in" />
        <input type="hidden" name="toName" value={p?.name ?? ""} />
        <PanelSection title="Log it here">
          <ReasonPicker target="outcome" groups={[{ label: "What happened", options: ["Talked", "No answer", "Message sent"] }]} notePlaceholder="Note: what they said, or how you sent it" noteRequired />
          <input type="hidden" name="spokeTo" value={p?.name ?? card.name} />
          {p?.phone ? <input type="hidden" name="to" value={p.phone} /> : <input name="to" required placeholder="Their number" className={panelInput} />}
        </PanelSection>
        <PanelSection title="What happens next">
          <p className="t-body text-ink-2">It is written on their page as a call note, and the quiet clock restarts today. The next check-in comes up after 3 quiet days, around {dayWords(now + 4 * 86_400_000)}.</p>
          <div className="flex gap-3">
            <button type="submit" className={pillPrimary}>
              Save
            </button>
          </div>
        </PanelSection>
      </form>
    </Panel>
  );
}
