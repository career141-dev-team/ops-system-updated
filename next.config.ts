import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The image that runs on the server carries only Next's standalone output,
  // not the source or the build tools (deploy/preview, 2 Nov).
  output: "standalone",

  // The laptop shared through a Cloudflare quick tunnel for a review (10 Nov);
  // without this the dev server refuses its own scripts to the tunnel's host.
  allowedDevOrigins: ["*.trycloudflare.com"],

  // The preview sits behind a password at the proxy and must never be indexed
  // (2 Nov). Belt and braces: every response says so too.
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },

  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
