import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The image that runs on the server carries only Next's standalone output,
  // not the source or the build tools (deploy/preview, 2 Nov).
  output: "standalone",

  // The preview sits behind a password at the proxy and must never be indexed
  // (2 Nov). Belt and braces: every response says so too.
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
