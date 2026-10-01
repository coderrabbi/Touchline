import type { NextConfig } from "next";

const apiUrl = process.env.API_INTERNAL_URL || "http://localhost:4100/api/v1";

if (process.env.NODE_ENV === 'production' && !apiUrl.startsWith('https://')) {
  throw new Error('Production API_INTERNAL_URL must use HTTPS');
}

const config: NextConfig = {
  productionBrowserSourceMaps: false,
  output: process.env.NEXT_OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
  transpilePackages: ["@touchline/shared"],
  poweredByHeader: false,

  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'"},
          {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'},
          ...(process.env.NODE_ENV === 'production' ? [{key: 'Strict-Transport-Security', value: 'max-age=31536000'}] : []),
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default config;
