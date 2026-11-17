import { figmaLabel, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { DEFAULT_LENGTH, MEETING_LENGTHS } from "@/lib/teams";

const field = "rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none";

/**
 * One booking form for the intro call and the requirement meeting (17 Nov).
 *
 * It asks for what a real meeting needs: when, how long, whose calendar it goes
 * in, which TA lead joins, and the client emails the Teams link is sent to.
 * Three client rows are shown; a blank row is ignored, so there is no "add"
 * button and no script. A pasted link is the way out when Teams is off.
 */
export function MeetingBookingForm({
  action,
  leadId,
  contact,
  taPeople,
  members,
  organiserId,
  teamsOn,
  submitLabel,
  primary = false,
  offerAlsoRequirement = false,
}: {
  action: (formData: FormData) => Promise<void>;
  leadId: string;
  contact: { name: string; email: string };
  taPeople: { id: string; fullName: string }[];
  members: { id: string; name: string }[];
  organiserId: string;
  teamsOn: boolean;
  submitLabel: string;
  primary?: boolean;
  /** Intro call only: tick it when the same meeting settles the requirement too. */
  offerAlsoRequirement?: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={figmaLabel}>When (Colombo time)</span>
          <input type="datetime-local" name="at" required className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={figmaLabel}>How long</span>
          <select name="lengthMin" defaultValue={DEFAULT_LENGTH} className={field}>
            {MEETING_LENGTHS.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={figmaLabel}>In whose calendar</span>
          <select name="organiserId" defaultValue={organiserId} className={field}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={figmaLabel}>Which TA lead is joining</span>
          {taPeople.length > 0 ? (
            <select name="taLeadId" className={field}>
              {taPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          ) : (
            <input name="taLeadId" placeholder="TA lead name" className={field} />
          )}
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={figmaLabel}>Who from the client gets the link (leave a row empty to skip it)</legend>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              name="attendeeName"
              placeholder="Name"
              defaultValue={i === 0 ? contact.name : ""}
              className={field}
            />
            <input
              type="email"
              name="attendeeEmail"
              placeholder="email@client.com"
              defaultValue={i === 0 ? contact.email : ""}
              className={field}
            />
          </div>
        ))}
      </fieldset>

      {teamsOn ? (
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" name="makeTeams" defaultChecked />
          <span>Make the Teams meeting for me (it goes in that calendar; the client gets the link in a drafted email)</span>
        </label>
      ) : (
        <p className="text-[13px] text-ink-soft">
          Teams is switched off, so paste a meeting link below. It goes in the drafted invite.
        </p>
      )}
      <label className="flex flex-col gap-1">
        <span className={figmaLabel}>
          {teamsOn ? "Or paste a link instead" : "Meeting link or address"}
        </span>
        <input name="link" placeholder="https://teams.microsoft.com/..." className={field} />
      </label>

      {offerAlsoRequirement && (
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" name="alsoRequirement" />
          <span>This meeting is also the requirement meeting (we will take the requirement down in it)</span>
        </label>
      )}

      <button type="submit" className={(primary ? pillPrimary : pillSecondary) + " self-start"}>
        {submitLabel}
      </button>
    </form>
  );
}
