import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "@atlaskit/button",
      "@atlaskit/icon",
      "@atlaskit/primitives",
    ],
  },
};

export default nextConfig;
