import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { BUSINESS_DETAILS, MARKETING_PAGES, SITE_NAME, SITE_URL } from "@/lib/seo/site";

function findPage(slug) {
  const path = `/${slug}`;
  return MARKETING_PAGES.find((page) => page.path === path);
}

export function generateStaticParams() {
  return MARKETING_PAGES.filter((page) => {
    const segments = page.path.split("/").filter(Boolean);
    const isMultiSegment = segments.length > 1;
    const isTopLevelFolderRoute = ["/blog", "/services"].includes(page.path);
    return !isMultiSegment && !isTopLevelFolderRoute;
  }).map((page) => ({
    slug: page.path.replace("/", ""),
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = findPage(slug);

  if (!page) {
    return {};
  }

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: page.path,
    },
    openGraph: {
      title: `${page.title} | ${SITE_NAME}`,
      description: page.description,
      url: new URL(page.path, SITE_URL).href,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.title} | ${SITE_NAME}`,
      description: page.description,
    },
  };
}

export default async function MarketingPage({ params }) {
  const { slug } = await params;
  const page = findPage(slug);

  if (!page) {
    notFound();
  }

  const pageUrl = new URL(page.path, SITE_URL).href;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: page.title,
        headline: page.heading,
        description: page.description,
        isPartOf: {
          "@id": `${SITE_URL}/#website`,
        },
        about: {
          "@id": `${SITE_URL}/#organization`,
        },
        inLanguage: "en-IN",
      },
      {
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        name: page.heading,
        description: page.summary,
        provider: {
          "@type": "Organization",
          name: SITE_NAME,
          legalName: BUSINESS_DETAILS.legalName,
          url: SITE_URL,
        },
        areaServed: {
          "@type": "Country",
          name: BUSINESS_DETAILS.serviceArea,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: page.heading,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <main className="seo-page">
      <Script
        id={`structured-data-${slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="seo-page-hero">
        <Link className="seo-page-brand" href="/">
          {SITE_NAME}
        </Link>
        <p className="seo-page-eyebrow">Insurance & Claim Consulting</p>
        <h1>{page.heading}</h1>
        <p className="seo-page-summary">{page.summary}</p>
        <div className="seo-page-actions">
          <Link href="/#cta-banner">Get Consultation</Link>
          <Link href="/claims-assistance">Claim Assistance</Link>
        </div>
      </section>
      <section className="seo-page-content">
        {(page.sections || []).map((section) => (
          <article key={section}>
            <p>{section}</p>
          </article>
        ))}
      </section>
      <section className="seo-page-contact">
        <h2>Talk to BIMAHEADQUARTER</h2>
        <p>
          Contact {BUSINESS_DETAILS.legalName} at {BUSINESS_DETAILS.email} or {BUSINESS_DETAILS.phone}.
        </p>
        <Link href="/">Back to Home</Link>
      </section>
    </main>
  );
}
