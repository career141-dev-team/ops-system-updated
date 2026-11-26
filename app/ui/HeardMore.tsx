/** The job description and salary scale written down on a call, beside the rest of its outcome (26 Nov, Nov 25 ops meeting). */
export function HeardMore({ meeting }: { meeting: { jd?: string; salaryScale?: string } }) {
  return (
    <>
      {meeting.salaryScale && <p className="text-[13px] text-ink-soft">Salary scale: {meeting.salaryScale}</p>}
      {meeting.jd && <p className="whitespace-pre-wrap text-[13px] text-ink-soft">Job description: {meeting.jd}</p>}
    </>
  );
}
