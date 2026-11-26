import { markMeetingHeld, markMeetingNotHeld } from "@/app/actions";
import { figmaLabel, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { KeepFields } from "@/app/ui/KeepFields";
import { MeetingOutcome } from "@/app/ui/MeetingOutcome";
import { SubmitButton } from "@/app/ui/SubmitButton";

const field = "rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none";

/** "Did the call happen?" for a booked call on the lead page: the intro call and the requirement call alike. */
export function CallOutcomeForms({ meetingId }: { meetingId: string }) {
  return (
    <MeetingOutcome
      meetingId={meetingId}
      held={
        <form action={markMeetingHeld} className="flex flex-col gap-2.5">
          <KeepFields id={"meeting-held-" + meetingId} />
          <input type="hidden" name="meetingId" value={meetingId} />
          <span className={figmaLabel}>It happened — what did they say?</span>
          <textarea name="brief" rows={2} required placeholder="Brief from the call (required)" className={field} />
          <div className="grid grid-cols-2 gap-2">
            <input name="role" placeholder="The position" className={field} />
            <input name="packageSaid" placeholder="Package mentioned" className={field} />
          </div>
          {/* 26 Nov (Nov 25 ops meeting): the call collects the JD and the salary scale too. */}
          <textarea name="jd" rows={3} placeholder="Job description (optional)" className={field} />
          <input name="salaryScale" placeholder="Salary scale (optional)" className={field} />
          <SubmitButton id={"held-" + meetingId} answerAt="call-held" className={pillPrimary + " self-start"}>
            It was held
          </SubmitButton>
        </form>
      }
      notHeld={
        <form action={markMeetingNotHeld} className="flex flex-col gap-2.5">
          <input type="hidden" name="meetingId" value={meetingId} />
          <KeepFields id={"meeting-not-held-" + meetingId} />
          <span className={figmaLabel}>It did not happen — why?</span>
          <input name="reason" required placeholder="Reason it was not held" className={field} />
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input type="checkbox" name="clientReplied" />
            <span>The client is still answering us</span>
          </label>
          <SubmitButton id={"not-held-" + meetingId} className={pillSecondary + " self-start"}>
            It was not held
          </SubmitButton>
        </form>
      }
    />
  );
}
