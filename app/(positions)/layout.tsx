import AreaHead from "@/app/AreaHead";
import { POSITION_TABS } from "@/lib/tabs";

/**
 * The positions area: one tab bar, and never a second (25, section 2).
 *
 * The bar lives here rather than on each page, so the pages underneath cannot
 * drift apart and a person moving between them never loses where they are. On
 * a record it steps out of the way: that page has its own bar.
 */
export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <AreaHead
        title="Positions"
        about="What a client asked us to fill. The TA System runs the search; this is everything Ops does around it."
        tabs={POSITION_TABS}
      />
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
