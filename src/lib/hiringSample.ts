/**
 * Invented internal-hiring data (19 Nov), used ONLY when OPS_DEV_SIGNIN is "on", so the layout can be
 * checked against the Figma frames while there is no hiring backend. Every name here is made up.
 * Production mode never reads this file.
 */
import { DAY, HOUR } from "@/lib/calendar";
import type { Applicant, HiringView, Vacancy } from "@/lib/hiring";

export function hiringSample(now: number): HiringView {
  const ago = (days: number) => now - days * DAY;
  const a = (id: string, name: string, source: string, stage: Applicant["stage"], since: number, detail: string, extra: Partial<Applicant> = {}): Applicant => ({
    id,
    name,
    source,
    phone: "+94 77 555 01" + String(40 + id.length * 3).slice(0, 2),
    stage,
    since,
    detail,
    ...extra,
  });
  const checks = ["Expected salary: LKR 90,000 to 110,000", "Can start within 30 days", "Lives near Colombo, reaches the head office daily", "1 year in sales or HR", "English and Sinhala, speaks and writes", "Degree or diploma, any subject"];
  const recruit: Vacancy = {
    id: "vac_recruit",
    title: "Recruitment Consultant",
    places: 2,
    filled: 0,
    postedAt: ago(16),
    status: "open",
    checks,
    freeTimes: [
      { who: "Rushda", round: "first interview", times: [now + 1 * DAY + 4 * HOUR, now + 1 * DAY + 7.5 * HOUR] },
      { who: "Mr Azeem", round: "second interview", times: [now + 5 * DAY + 3 * HOUR] },
    ],
    applicants: [
      a("a1", "Thilini Rathnayake", "LinkedIn", "new", ago(1), "CV came 18 Nov", { tries: 1 }),
      a("a2", "Chamika Fonseka", "Referral", "new", ago(1), "CV came 18 Nov"),
      a("a3", "Sachini Peiris", "Jobs site", "call", ago(2), "No answer 17 Nov · try 2 of 3", { tries: 2 }),
      a("a4", "Isuru Madushanka", "Jobs site", "call", ago(4), "CV came 15 Nov"),
      a("a5", "Dilini Abeysekara", "LinkedIn", "fits", ago(2), "Fits · called 17 Nov", { draft: { interviewAt: now + 1 * DAY + 7.5 * HOUR, interviewer: "Rushda", place: "our Colombo office" } }),
      a("a6", "Nuwan Seneviratne", "Referral", "fits", ago(1), "Fits · called 18 Nov"),
      a("a7", "Lakmal Gamage", "Referral", "interview", now + 1 * DAY + 4 * HOUR, "Fri 20 Nov 11:00 with Rushda"),
      a("a8", "Buddhika Samarasinghe", "LinkedIn", "interview", now + 1 * DAY + 2 * HOUR, "Second interview Fri 20 Nov · Mr Azeem"),
      a("a9", "Tharaka Munasinghe", "LinkedIn", "decision", ago(1), "Passed both interviews", {
        draft: { startDate: "Tue 22 Dec", salary: "LKR 160,000 a month", replyBy: "Fri 27 Nov" },
      }),
      a("a10", "Madhavi Ekanayake", "Referral", "decision", ago(5), "On hold since 14 Nov"),
    ],
  };
  const ops: Vacancy = {
    id: "vac_ops",
    title: "Ops Executive",
    places: 1,
    filled: 0,
    postedAt: ago(9),
    status: "open",
    checks,
    applicants: [
      a("b1", "Kasun Wijesekara", "Jobs site", "interview", now + 1 * DAY + 5 * HOUR, "Fri 20 Nov 15:00 with Rushda"),
      a("b2", "Ruwan Perera", "LinkedIn", "new", ago(1), "CV came 18 Nov"),
    ],
  };
  const marketing: Vacancy = {
    id: "vac_marketing",
    title: "Marketing Executive",
    places: 1,
    filled: 0,
    postedAt: ago(30),
    status: "on_hold",
    hold: { since: ago(7), who: "Mr Azeem", keptCvs: 4 },
    checks,
    applicants: [],
  };
  return {
    vacancies: [recruit, ops, marketing],
    slots: [
      { at: now + 1 * DAY + 5 * HOUR, name: "Kasun Wijesekara", line: "Ops Executive · with Rushda" },
      { at: now + 2 * DAY + 1 * HOUR, name: "Lakmal Gamage", line: "Recruitment Consultant · with Rushda" },
    ],
    hiredThisMonth: [{ title: "Accounts Assistant", at: ago(15) }],
  };
}
