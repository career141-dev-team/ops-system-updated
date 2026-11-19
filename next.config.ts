import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The image that runs on the server carries only Next's standalone output,
  // not the source or the build tools (deploy/preview, 2 Nov).
  output: "standalone",

  // The laptop shared through a Cloudflare quick tunnel for a review (10 Nov);
  // without this the dev server refuses its own scripts to the tunnel's host.
  // 127.0.0.1 too (17 Nov): the run instructions open the app there, and the dev server only trusts "localhost" by
  // name, so live reload was refused and every change needed a manual refresh. Development only.
  allowedDevOrigins: ["*.trycloudflare.com", "127.0.0.1"],

  // The preview sits behind a password at the proxy and must never be indexed
  // (2 Nov). Belt and braces: every response says so too.
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },

  // v6 (19 Nov): list pages that moved. Exact paths only, so /sets/[id], /interviews/[id] and the other
  // detail pages that stored task links point at keep working. The old list pages stay in the tree until
  // their content has a new home.
  async redirects() {
    const to = (source: string, destination: string) => ({ source, destination, permanent: false });
    return [
      // /calls -> /?view=calls and /interviews -> /calendar return when My work's calls view and the calendar's
      // startInterview form land; until then those two list pages stay as they are.
      to("/sets", "/positions"),
      to("/placements", "/positions"),
      to("/guarantees", "/positions"),
      to("/holds", "/positions"),
      to("/adverts", "/positions"),
      to("/money", "/invoices"),
    ];
  },

  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
