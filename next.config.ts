import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The preview sits behind a password at the proxy and must never be indexed
  // (2 Nov). Belt and braces: every response says so too.
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
