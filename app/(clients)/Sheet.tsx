import type { ReactNode } from "react";

import { Card } from "@/app/ui/figma";

/**
 * The v6 card that holds a working page (a lead, the new-lead form, who owns what): one white 28px card on
 * the canvas, centred at the width the page needs. Replaces the old PageBox sheet on these pages.
 */
export default function Sheet({ children, width = 1080, msg }: { children: ReactNode; width?: 880 | 1080 | 1160; msg?: string | null }) {
  return (
    <div className="mx-auto flex w-full flex-col gap-[18px]" style={{ maxWidth: width }}>
      {msg && <p className="t-body rounded-[16px] bg-surface px-5 py-3 shadow-card">{msg}</p>}
      <Card className="!gap-7">{children}</Card>
    </div>
  );
}
