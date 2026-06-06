import { SITE_URL } from "@/lib/seo/site";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
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
          "/upload-history/"
        ]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
