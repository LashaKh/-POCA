import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { getSecurityHeaders } from "./lib/security/headers";

const production = process.env.DEPLOY_ENV === "production";
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86_400,
    qualities: [85],
    dangerouslyAllowLocalIP: !production,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/product-renditions/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/product-renditions/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: getSecurityHeaders({ production }).filter(
          (header) => header.key !== "Content-Security-Policy",
        ),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
