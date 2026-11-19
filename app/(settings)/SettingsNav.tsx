"use client";

import { usePathname } from "next/navigation";

import { PillTabs } from "@/app/ui/figma";

const LINKS = [
  { key: "/ta", label: "People and roles", href: "/ta" },
  { key: "/templates", label: "Templates and the ESA", href: "/templates" },
  { key: "/ai", label: "What needs approval", href: "/ai" },
  { key: "/settings", label: "Timers and working days", href: "/settings" },
  { key: "/files", label: "Channels", href: "/files" },
  { key: "/health", label: "Automation health", href: "/health" },
  { key: "/import", label: "Import", href: "/import" },
];

export default function SettingsNav() {
  const path = usePathname() ?? "/settings";
  const active = LINKS.find((l) => path === l.href || path.startsWith(l.href + "/"))?.key ?? "";
  return <PillTabs items={LINKS} active={active} />;
}
