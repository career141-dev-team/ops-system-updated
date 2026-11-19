import type { ReactNode } from "react";

import { Card, StatusChip, type Tone } from "@/app/ui/figma";

/** The "up next" card of the invoice record pages in the v6 look: a caption, a chip, one sentence, the actions. */
export default function StepCard({
  eyebrow = "Up next",
  chip,
  tone = "warn",
  title,
  body,
  actions,
}: {
  eyebrow?: string;
  chip?: ReactNode;
  tone?: Tone;
  title: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <p className="t-micro flex-1 text-ink-3">{eyebrow}</p>
        {chip && <StatusChip tone={tone}>{chip}</StatusChip>}
      </div>
      <h2 className="text-[22px] font-normal leading-[30px] text-ink">{title}</h2>
      {body && <p className="t-body text-ink-2">{body}</p>}
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </Card>
  );
}
