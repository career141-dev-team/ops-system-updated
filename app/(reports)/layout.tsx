import AreaHead from "@/app/AreaHead";
import { REPORT_TABS } from "@/lib/tabs";

/**
 * The reports area: one tab bar, and never a second (25, section 2).
 *
 * The bar lives here rather than on each page, so the pages underneath cannot
 * drift apart and a person moving between them never loses where they are. On
 * a record it steps out of the way: that page has its own bar.
 */
export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <AreaHead
        title="Reports"
        about="What goes to the Director on a Monday, and the numbers the desk is actually making."
        tabs={REPORT_TABS}
      />
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
