import { SITE_URL } from "@/lib/seo/site";

export default function robots() {
  const privateRoutes = [
    "/api/",
    "/admin/",
    "/analytics-reports/",
    "/bulk-upload/",
    "/crm/admin/login",
    "/customer-management/",
    "/dashboard/",
    "/field-setup/",
    "/login",
    "/manual-policy-entry/",
    "/operations/",
    "/policy-records/",
    "/premium-reports/",
    "/settings/",
    "/signup",
    "/upload-history/",
  ];

  const aiBots = [
    "GPTBot",
    "ChatGPT-User",
    "Google-Extended",
    "ClaudeBot",
    "Claude-Web",
    "PerplexityBot",
    "cohere-ai",
    "Applebot-Extended",
    "facebookexternalhit",
    "FacebookBot",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privateRoutes,
      },
      ...aiBots.map((bot) => ({
        userAgent: bot,
        allow: "/",
        disallow: privateRoutes,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

