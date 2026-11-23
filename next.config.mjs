/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      ["/motor-insurance", "/services/motor-insurance"],
      ["/life-insurance", "/services/life-insurance"],
      ["/warehouse-insurance", "/services/warehouse-insurance"],
      ["/marine-insurance", "/services/marine-insurance"],
      ["/business-insurance", "/services/commercial-insurance"],
      ["/general-insurance", "/services/general-insurance"],
      ["/health-insurance", "/services/health-insurance"],
      ["/policy-renewals", "/services/policy-renewals"],
      ["/claims-assistance", "/services/claims-assistance"],
      ["/fire-insurance", "/services/fire-insurance"],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas", "tesseract.js"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, ticket" },
        ],
      },
    ];
  },
};

export default nextConfig;
