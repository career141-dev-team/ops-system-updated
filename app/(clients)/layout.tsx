/**
 * The clients workspace (Figma CL · Clients).
 *
 * Each screen renders inside its own PageBox sheet so the outer viewport
 * stays fixed and the rounded white sheet scrolls internally.
 */
export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
