import { saveCoverEmail } from "@/app/actions";
import { figmaLabel, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { SubmitButton } from "@/app/ui/SubmitButton";

const box = "rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none";

/**
 * The cover email exactly as the client will get it (17 Nov): plain text, so what
 * is in the box is what is sent, with the address and the attachment above it.
 * Editable: the person's own words are kept with the agreement and used by the send.
 */
export function CoverEmailPreview({
  esaId,
  to,
  attachment,
  email,
  edited,
  returnTo,
  step,
}: {
  esaId: string;
  to: string;
  attachment: string;
  email: { subject: string; body: string } | { problem: string };
  edited: boolean;
  returnTo: "intro" | "agreement";
  /** The number in front of the heading on the intro call's numbered steps. */
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5">
      <span className={figmaLabel}>{step ? step + " · " : ""}THE EMAIL THAT WILL GO WITH IT{edited ? " · EDITED BY HAND" : ""}</span>
      {"problem" in email ? (
        <p className="text-[14px] text-warn">{email.problem}</p>
      ) : (
        <form action={saveCoverEmail} className="flex flex-col gap-3">
          <input type="hidden" name="esaId" value={esaId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5 text-[14px]">
            <dt className="text-ink-soft">To</dt>
            <dd className="text-ink">{to || "No email address yet"}</dd>
            <dt className="text-ink-soft">Attached</dt>
            <dd className="text-ink">{attachment}</dd>
            <dt className="self-center text-ink-soft">Subject</dt>
            <dd>
              <input name="subject" defaultValue={email.subject} className={box + " w-full"} />
            </dd>
          </dl>
          <textarea
            name="body"
            defaultValue={email.body}
            rows={Math.min(30, email.body.split("\n").length + 2)}
            className={box + " w-full whitespace-pre-wrap font-mono text-[13.5px] leading-[1.55]"}
          />
          <div className="flex flex-wrap items-center gap-2.5">
            <SubmitButton id={"save-email-" + returnTo} className={pillPrimary}>
              Save my edits to the email
            </SubmitButton>
            {edited && (
              <SubmitButton id={"reset-email-" + returnTo} name="reset" value="1" formNoValidate className={pillSecondary}>
                Reset to the standard wording
              </SubmitButton>
            )}
            <span className="text-[12.5px] text-ink-soft">Plain text, as sent. A person still approves it before it goes.</span>
          </div>
        </form>
      )}
    </div>
  );
}
