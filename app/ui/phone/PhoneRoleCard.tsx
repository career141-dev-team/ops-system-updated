/**
 * The summary card at the top of the phone's role page (frame PH3, 181:453): the client, the role, seven
 * segments for how far the search has got (filled to the furthest stage that has someone in it, the last
 * one amber), then one line of where it stands. The desk's numbers strip does not fit 390 wide.
 */
export default function PhoneRoleCard({
  client,
  title,
  stages,
  headline,
  line,
}: {
  client: string;
  title: string;
  /** Seven stages in order, each true when somebody is in it. */
  stages: boolean[];
  headline: string;
  line: string;
}) {
  const last = stages.lastIndexOf(true);
  return (
    <section className="flex flex-col gap-2 rounded-[24px] bg-surface p-4 md:hidden">
      <p className="t-small text-ink-3">{client}</p>
      <h2 className="text-[24px] font-normal leading-8 text-ink">{title}</h2>
      <div className="flex gap-1.5" aria-hidden>
        {stages.map((_, i) => (
          <span key={i} className={"h-1.5 flex-1 rounded-[3px] " + (i < last ? "bg-brand" : i === last ? "bg-warn" : "bg-rule")} />
        ))}
      </div>
      <p className="t-body-m">{headline}</p>
      <p className="t-small text-ink-3">{line}</p>
    </section>
  );
}
