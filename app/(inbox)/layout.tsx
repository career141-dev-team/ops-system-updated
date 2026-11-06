import AreaHead from "@/app/AreaHead";
import { INBOX_TABS } from "@/lib/tabs";

/**
 * The inbox area: one tab bar, and never a second (25, section 2).
 *
 * The bar lives here rather than on each page, so the pages underneath cannot
 * drift apart and a person moving between them never loses where they are. On
 * a record it steps out of the way: that page has its own bar.
 */
export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <AreaHead
        title="Inbox"
        about="Every conversation with a client, and every call the system asked somebody to make."
        tabs={INBOX_TABS}
      />
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
