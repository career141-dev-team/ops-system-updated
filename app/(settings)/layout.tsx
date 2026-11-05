import AreaHead from "@/app/AreaHead";
import { SETTINGS_TABS } from "@/lib/tabs";

/**
 * The settings area: one tab bar, and never a second (25, section 2).
 *
 * The bar lives here rather than on each page, so the pages underneath cannot
 * drift apart and a person moving between them never loses where they are. On
 * a record it steps out of the way: that page has its own bar.
 */
export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <AreaHead
        title="Settings"
        about="Everything set up once and then left alone: the switches, the wording, the people, the files and the links."
        tabs={SETTINGS_TABS}
      />
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
