/**
 * Where the career141 logo and the AURA mark are served from (25 Nov, owner):
 * the public assets bucket in R2 when NEXT_PUBLIC_ASSETS_URL is set at build
 * time, the copies in public/ otherwise, so a laptop works with no R2.
 */
export function brandAsset(name: "career141-lockup.png" | "aura-symbol.png"): string {
  const base = (process.env.NEXT_PUBLIC_ASSETS_URL ?? "").trim().replace(/\/+$/, "");
  return base + "/" + name;
}
