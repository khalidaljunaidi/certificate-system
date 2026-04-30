import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  serverExternalPackages: ["@react-pdf/renderer"],
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: "/admin/login",
        destination: "/login",
      },
    ];
  },
};

export default nextConfig;
