/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};

export default nextConfig;
