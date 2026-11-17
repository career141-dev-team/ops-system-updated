/**
 * The words for a setting on the Timers screen (16 Nov, Figma 249:14114): a name a person would
 * say, one line about it, and the value as it reads ("14 days"). Anything not listed falls back to
 * its key, so a new setting is never hidden - it just reads plainly until somebody words it.
 */

const n = (unit: string, one = unit) => (v: unknown) => `${v} ${Number(v) === 1 ? one : unit}`;

interface Words {
  label: string;
  about: string;
  value: (v: unknown) => string;
}

const WORDS: Record<string, Words> = {
  "esa.declineDays": { label: "ESA chase window", about: "Emails, WhatsApps and a call, then declined", value: n("days", "day") },
  "esa.sendHours": { label: "Agreement goes out within", about: "Counted from the intro call", value: n("hours", "hour") },
  "set.ownershipWorkingDays": { label: "Client owns a CV set", about: "From the moment they receive it", value: n("working days", "working day") },
  "set.minCvs": { label: "Fewest CVs in a set", about: "A set with fewer is not sent", value: n("CVs", "CV") },
  "feedback.chaseDays": { label: "Feedback chase", about: "Then the ops owner calls the next day", value: (v) => `After ${v} working ${Number(v) === 1 ? "day" : "days"}` },
  "invoice.dueDays": { label: "Invoice due", about: "From the joining day", value: n("days", "day") },
  "invoice.latePctPerMonth": { label: "Late charge", about: "Then the ops owner decides on a write-off", value: (v) => `${v}% a month` },
  "invoice.writeOffDays": { label: "Write-off review", about: "After this long unpaid", value: n("days", "day") },
  "guarantee.days": { label: "Guarantee", about: "From the actual joining day", value: n("days", "day") },
  "replacement.workingDays": { label: "Replacement", about: "Or the Director decides on a refund", value: n("working days", "working day") },
  "hold.afterDays": { label: "Hold after silence", about: "No feedback for this long puts a client on hold", value: n("days", "day") },
  "hold.reviewDays": { label: "Hold review", about: "The owner gets a task about each hold this often", value: n("days", "day") },
  "feedback.stopAfterSilentDays": { label: "Stop chasing feedback", about: "After this many silent days", value: n("days", "day") },
  "feedback.callAfterDays": { label: "Feedback call", about: "The owner calls this long after the chase", value: n("days", "day") },
  "depth.holdAt": { label: "Hold the search at", about: "CVs with the client before the TA pauses", value: n("CVs", "CV") },
  "depth.searchAgainAt": { label: "Search again at", about: "CVs left before the TA looks for more", value: n("CVs", "CV") },
  "escalation.leadAfterHours": { label: "Tell the ops lead after", about: "When something late is still untouched", value: n("hours", "hour") },
  "escalation.directorAfterHours": { label: "Tell the Director after", about: "When the ops lead has not acted either", value: n("hours", "hour") },
  "interview.maxSlotLoops": { label: "Times asked for", about: "Asking the client for times, at most this often", value: n("times", "time") },
  "interview.reportReminderDays": { label: "Interview feedback reminder", about: "After the interview", value: n("days", "day") },
  "interview.noticeDays": { label: "Interview reminder", about: "Sent this long before, at 9:00", value: n("days", "day") },
  "interview.noticeHours": { label: "Interview heads-up", about: "Sent this long before it starts", value: n("hours", "hour") },
  "hire.unreportedMonths": { label: "Unreported hire window", about: "How far back to look for a hire nobody told us about", value: n("months", "month") },
  "hire.surchargePct": { label: "Unreported hire surcharge", about: "Added to the fee", value: (v) => `${v}%` },
  "message.dailyCapPerClient": { label: "Messages a day to one client", about: "The most we send before it waits", value: n("messages", "message") },
  "refund.pct": { label: "Refund", about: "Of the fee, when a replacement is not found", value: (v) => `${v}%` },
  "guarantee.warnDay": { label: "Guarantee warning", about: "Day on which the owner is warned", value: (v) => `Day ${v}` },
  "ai.dailyBudget": { label: "AURA's daily budget", about: "Most AURA may do in a day", value: (v) => String(v) },
  "report.recipients": { label: "Weekly report goes to", about: "The Director's address", value: (v) => (String(v) || "Nobody yet") },
  "invoice.series": { label: "Invoice numbers start", about: "The series prefix", value: (v) => String(v) },
  "ad.days": { label: "Advert runs for", about: "Then it is taken down", value: n("days", "day") },
};

/** Machine state kept beside the settings. Not a thing a person sets, so not shown. */
export // bank.* are the owner's bank details for the invoice: kept by their own form on this screen, not listed as rules.
const INTERNAL = ["ta.", "clock.", "bank."];

export const isInternal = (key: string): boolean => INTERNAL.some((p) => key.startsWith(p));

export function settingWords(key: string, value: unknown): Words & { shown: string } {
  const w = WORDS[key] ?? { label: key, about: "", value: (v: unknown) => String(v) };
  return { ...w, shown: w.value(value) };
}

/** The seven rules the Figma frame shows (249:14114), in its order. The others follow under their own heading. */
export const FRAME_RULES = [
  "esa.declineDays",
  "set.ownershipWorkingDays",
  "feedback.chaseDays",
  "invoice.dueDays",
  "invoice.latePctPerMonth",
  "guarantee.days",
  "replacement.workingDays",
];

export const isFrameRule = (key: string): boolean => FRAME_RULES.includes(key);

/** The frame's rules first, in its order; the rest after, worded ones before unworded, then by key. */
export const settingRank = (key: string): number => {
  const frame = FRAME_RULES.indexOf(key);
  if (frame !== -1) return frame;
  const at = Object.keys(WORDS).indexOf(key);
  return at === -1 ? 2000 : 100 + at;
};
