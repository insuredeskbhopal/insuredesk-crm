"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { SITE_URL } from "@/lib/seo/site";

const ROUTE_NAMES = {
  services: "Services",
  about: "About Us",
  contact: "Contact Us",
  "general-insurance": "General Insurance",
  "health-insurance": "Health Insurance",
  "motor-insurance": "Motor Insurance",
  "life-insurance": "Life Insurance",
  "commercial-insurance": "Commercial Insurance",
  "policy-renewals": "Policy Renewals",
  "claims-assistance": "Claims Assistance",
  "risk-advisory": "Risk Advisory",
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb objects
  const breadcrumbs = segments.map((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    const name = ROUTE_NAMES[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { name, path };
  });

  // Construct JSON-LD Schema
  const schemaList = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
    ...breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 2,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: schemaList,
  };

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-4 flex flex-col gap-1">
      {/* Schema Script */}
      <Script
        id={`breadcrumb-schema-${segments.join("-")}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Render Visual Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center flex-wrap gap-2 text-sm text-on-surface-variant/70"
      >
        <Link href="/" className="hover:text-secondary transition-colors text-[14px]">
          Home
        </Link>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <div key={crumb.path} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm opacity-50 text-[14px]">chevron_right</span>
              {isLast ? (
                <span className="text-primary font-semibold text-[14px]" aria-current="page">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.path} className="hover:text-secondary transition-colors text-[14px]">
                  {crumb.name}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
