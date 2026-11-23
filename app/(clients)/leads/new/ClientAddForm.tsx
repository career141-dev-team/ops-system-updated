import Link from "next/link";

import { createClient } from "@/app/actions";
import { MeetingFields } from "@/app/(clients)/leads/[id]/MeetingBookingForm";
import { figmaField, figmaLabel, pillPrimary } from "@/app/ui/figma";

const Field = ({ label, name, placeholder, required, type }: { label: string; name: string; placeholder: string; required?: boolean; type?: string }) => (
  <label className="flex flex-col gap-1.5">
    <span className={figmaLabel}>{label}</span>
    <input name={name} type={type} required={required} placeholder={placeholder} className={figmaField} />
  </label>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-3.5">
    <span className={figmaLabel}>{title}</span>
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">{children}</div>
  </div>
);

/** "Add a client": one form, one record. No enquiry, direct-client or discovery choice (23 Nov, the owner). */
type CallSetup = {
  taPeople: { id: string; fullName: string }[];
  members: { id: string; name: string }[];
  organiserId: string;
  teamsOn: boolean;
};

export default function ClientAddForm({ call }: { call: CallSetup }) {
  return (
    <form action={createClient} className="flex flex-col gap-7">
      <Section title="The company">
        <Field label="Company" name="company" required placeholder="Ceylon Cold Stores" />
        <Field label="What they do" name="industry" placeholder="Cold chain, food & beverage…" />
        <Field label="Website" name="website" placeholder="els.lk" />
      </Section>

      <Section title="Who we write to (an email or a number)">
        <Field label="Contact" name="contactName" placeholder="Roshan Perera" />
        <Field label="Their email" name="contactEmail" type="email" placeholder="r.perera@els.lk" />
        <Field label="Their number" name="contactPhone" placeholder="+94 77 412 8890" />
      </Section>

      <Section title="Who gets the invoice (can wait)">
        <Field label="Billing name" name="billingName" placeholder="Ceylon Cold Stores (Pvt) Ltd" />
        <Field label="Billing email" name="billingEmail" type="email" placeholder="accounts@els.lk" />
        <Field label="Billing address" name="billingAddress" placeholder="12 Galle Road, Colombo 3" />
      </Section>

      <div className="flex flex-col gap-3">
        <span className={figmaLabel}>Intro call (optional): the requirement is taken in the same call</span>
        <p className="text-[13px] text-ink-soft">
          Leave the time empty to book it later from the client&rsquo;s page. The Teams link goes to the contact above.
        </p>
        <MeetingFields {...call} contact={{ name: "", email: "" }} timeOptional />
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-2">
        <button type="submit" className={pillPrimary}>
          Add client
        </button>
        <Link href="/clients" className="px-4 py-2 text-[16px] font-medium leading-[26px] text-ink-soft hover:text-ink">
          Cancel
        </Link>
        <span className="text-[14px] leading-[21px] text-ink-soft sm:ml-auto">You own them until the ops lead moves them. Banking and finance are refused.</span>
      </div>
    </form>
  );
}
