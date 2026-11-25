import Link from "next/link";

import { createClient } from "@/app/actions";
import { MeetingFields } from "@/app/(clients)/leads/[id]/MeetingBookingForm";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { PanelField, panelInput, pillPrimary } from "@/app/ui/figma";

type CallSetup = {
  taPeople: { id: string; fullName: string }[];
  members: { id: string; name: string }[];
  organiserId: string;
  teamsOn: boolean;
};

/**
 * "Add a client" as a pop-up over the Clients page (25 Nov, the owner): the page behind it blurred, and
 * each part of the form in its own bordered box, like New position. The same action as the old page
 * (`/leads/new`, still there): one form, one record, no enquiry step.
 */
export default function NewClientPanel({ closeHref, msg, mayAdd, refusal, call }: { closeHref: string; msg?: string; mayAdd: boolean; refusal: string; call: CallSetup }) {
  return (
    <Panel kicker="Add a client" title="Add a client" sub="A company we work with, or are about to. Only the name is needed to start." closeHref={closeHref} boxed>
      {msg && <p className="t-small mb-3.5 rounded-[14px] bg-warn-soft px-4 py-3">{msg}</p>}
      {!mayAdd ? (
        <p className="t-small rounded-[14px] bg-sunk px-4 py-3 text-ink-3">{refusal}</p>
      ) : (
        <form action={createClient} className="flex flex-col gap-5">
          <input type="hidden" name="back" value={"/clients?panel=new-client"} />
          <PanelSection title="The company">
            <PanelField label="Company">
              <input name="company" required placeholder="Ceylon Cold Stores" className={panelInput} />
            </PanelField>
            <PanelField label="What they do">
              <input name="industry" placeholder="Cold chain, food & beverage…" className={panelInput} />
            </PanelField>
            <PanelField label="Website">
              <input name="website" placeholder="els.lk" className={panelInput} />
            </PanelField>
          </PanelSection>
          <PanelSection title="Who we write to">
            <p className="t-small text-ink-3">An email or a number.</p>
            <PanelField label="Contact">
              <input name="contactName" placeholder="Roshan Perera" className={panelInput} />
            </PanelField>
            <PanelField label="Their email">
              <input name="contactEmail" type="email" placeholder="r.perera@els.lk" className={panelInput} />
            </PanelField>
            <PanelField label="Their number">
              <input name="contactPhone" placeholder="+94 77 412 8890" className={panelInput} />
            </PanelField>
          </PanelSection>
          <PanelSection title="Who gets the invoice">
            <p className="t-small text-ink-3">This can wait.</p>
            <PanelField label="Billing name">
              <input name="billingName" placeholder="Ceylon Cold Stores (Pvt) Ltd" className={panelInput} />
            </PanelField>
            <PanelField label="Billing email">
              <input name="billingEmail" type="email" placeholder="accounts@els.lk" className={panelInput} />
            </PanelField>
            <PanelField label="Billing address">
              <input name="billingAddress" placeholder="12 Galle Road, Colombo 3" className={panelInput} />
            </PanelField>
          </PanelSection>
          <PanelSection title="Intro call (optional)">
            <p className="t-small text-ink-3">The requirement is taken in the same call. Leave the time empty to book it later from the client&rsquo;s page. The Teams link goes to the contact above.</p>
            <MeetingFields {...call} contact={{ name: "", email: "" }} timeOptional />
          </PanelSection>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={pillPrimary}>
              Add client
            </button>
            <Link href={closeHref} scroll={false} replace className="px-2 py-2 text-[16px] font-medium leading-[26px] text-ink-soft hover:text-ink">
              Cancel
            </Link>
          </div>
          <p className="t-small text-ink-3">You own them until the ops lead moves them. Banking and finance are refused.</p>
        </form>
      )}
    </Panel>
  );
}
