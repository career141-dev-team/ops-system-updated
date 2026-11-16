import SettingsNav from "@/app/(settings)/SettingsNav";
import { PageBox } from "@/app/ui/figma";

export default function SettingsAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageBox width="1160">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-0">
        <SettingsNav />
        <div className="min-w-0 flex-1 md:pl-8">{children}</div>
      </div>
    </PageBox>
  );
}
