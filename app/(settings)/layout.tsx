import SettingsNav from "@/app/(settings)/SettingsNav";
import { PageBox } from "@/app/ui/figma";

/** Settings fills the card: the list on the left with a rule down its side, the page wide beside it (Figma 249:14114). */
export default function SettingsAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageBox width="full" className="md:flex-1">
      <div className="flex flex-col gap-6 md:min-h-full md:flex-row md:items-stretch md:gap-0">
        <SettingsNav />
        <div className="min-w-0 flex-1 md:pl-12">{children}</div>
      </div>
    </PageBox>
  );
}
