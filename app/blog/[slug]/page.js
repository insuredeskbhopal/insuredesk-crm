import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import BlogSidebarForm from "../BlogSidebarForm";
import { BLOG_POSTS } from "../blogData";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

// Generate static params for Next.js build prerendering
export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

// Generate dynamic SEO metadata
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return {};
  }

  return {
    title: `${post.title} | BIMAHEADQUARTER Blog`,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | BIMAHEADQUARTER Blog`,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      authors: [post.author.name],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | BIMAHEADQUARTER Blog`,
      description: post.excerpt,
    },
  };
}

const getRelatedServicesForBlog = (category) => {
  const allServices = [
    {
      title: "Claims Assistance",
      desc: "Get expert representation, documentation support, and claims advocacy across India.",
      slug: "claims-assistance",
    },
    {
      title: "Policy Renewals",
      desc: "Track and renew your active policies across leading insurers in India seamlessly.",
      slug: "policy-renewals",
    },
    {
      title: "Health Insurance Consulting",
      desc: "Compare individual, family, senior citizen, and corporate health insurance plans.",
      slug: "health-insurance",
    },
    {
      title: "Motor & Fleet Insurance",
      desc: "Compare own damage, third-party, add-on, and renewal options for personal and commercial vehicles.",
      slug: "motor-insurance",
    },
    {
      title: "Commercial Insurance",
      desc: "Protect corporate assets, stock, liability, operations, and commercial risk.",
      slug: "commercial-insurance",
    },
    {
      title: "Risk Advisory Services",
      desc: "Identify coverage gaps, audit asset values, and implement risk control strategies.",
      slug: "risk-advisory",
    },
    {
      title: "Warehouse Insurance",
      desc: "Protect warehouse stock, inventory, burglary risks, and storage liabilities.",
      slug: "warehouse-insurance",
    },
  ];

  if (category === "Claims") {
    return [allServices[0], allServices[1]];
  } else if (category === "Renewals") {
    return [allServices[1], allServices[3]];
  } else if (category === "Business Risk") {
    return [allServices[4], allServices[5]];
  } else {
    return [allServices[2], allServices[3]];
  }
};

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const relatedServices = getRelatedServicesForBlog(post.category);

  // Find related articles (same category or others, excluding current)
  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  // Structured Article and Breadcrumb schema data
  const articleSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${postUrl}#post`,
        url: postUrl,
        headline: post.title,
        description: post.excerpt,
        datePublished: new Date(post.date).toISOString(),
        dateModified: new Date(post.date).toISOString(),
        author: {
          "@type": "Person",
          name: post.author.name,
          jobTitle: post.author.role,
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/brand/main-logo-wide.webp`,
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": postUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${postUrl}#breadcrumb`,
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
            name: "Blog",
            item: `${SITE_URL}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: postUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <Script
        id={`blog-schema-${post.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="landing-shell blog-detail-page bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />

        <main>
          {/* Article Header Hero */}
          <section className="blog-detail-hero">
            <div className="blog-detail-hero-inner max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="blog-breadcrumb">
                <Link href="/blog">
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back to Hub
                </Link>
              </div>

              <div className="blog-post-header">
                <div className="blog-card-meta">
                  <span className="blog-card-category">{post.category}</span>
                  <span className="blog-card-dot">•</span>
                  <span>{post.readTime}</span>
                  <span className="blog-card-dot">•</span>
                  <span>{post.date}</span>
                </div>
                <h1>{post.title}</h1>
                <p className="blog-excerpt">{post.excerpt}</p>

                <div className="blog-post-author-bar">
                  <span className="material-symbols-outlined">account_circle</span>
                  <div>
                    <strong>{post.author.name}</strong>
                    <span>{post.author.role}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Reading Layout & Sidebar */}
          <section className="blog-detail-main">
            <div className="blog-detail-main-inner max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              {/* Content Body */}
              <article className="blog-detail-content">
                <div className="blog-detail-prose">
                  {post.sections.map((section, idx) => {
                    if (section.type === "heading") {
                      return <h2 key={idx}>{section.text}</h2>;
                    }
                    if (section.type === "list") {
                      return (
                        <ul key={idx} className="blog-content-list">
                          {section.items.map((item, itemIdx) => (
                            <li key={itemIdx}>
                              <span className="material-symbols-outlined">check_circle</span>
                              <span dangerouslySetInnerHTML={{ __html: item }} />
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={idx} dangerouslySetInnerHTML={{ __html: section.text }} />;
                  })}
                </div>

                {/* Related Services Section */}
                <div className="blog-related-services mt-12 pt-8 border-t border-outline-variant/30 reveal">
                  <h3 className="text-[22px] font-bold text-primary mb-6">Related Consulting Services</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {relatedServices.map((service) => (
                      <div
                        key={service.slug}
                        className="glass-card p-6 rounded-2xl border border-outline-variant/20 flex flex-col justify-between"
                      >
                        <div>
                          <h4 className="font-bold text-primary text-[18px] mb-2">{service.title}</h4>
                          <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
                            {service.desc}
                          </p>
                        </div>
                        <Link
                          href={`/services/${service.slug}`}
                          className="inline-flex items-center text-sm font-semibold text-secondary hover:underline gap-1 mt-2"
                        >
                          Explore Service{" "}
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Back to Blog Button */}
                <div className="blog-bottom-nav">
                  <Link href="/blog" className="blog-back-button">
                    <span className="material-symbols-outlined">grid_view</span>
                    Explore All Articles
                  </Link>
                </div>
              </article>

              {/* Sidebar */}
              <aside className="blog-detail-sidebar">
                <BlogSidebarForm defaultService={post.category} />

                {/* Office Info Mini-Card */}
                <div className="blog-sidebar-info">
                  <span className="material-symbols-outlined">help_center</span>
                  <h4>Need Immediate Assistance?</h4>
                  <p>Speak directly to our licensed support specialists for urgent motor or health claims.</p>
                  <a href="tel:+918818889660">
                    <span className="material-symbols-outlined">call</span>
                    Call 88188 89660
                  </a>
                </div>
              </aside>
            </div>
          </section>

          {/* Related Articles Section */}
          {relatedPosts.length > 0 && (
            <section className="blog-related-section">
              <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
                <div className="blog-related-heading">
                  <h2>Related Articles</h2>
                  <Link href="/blog">
                    View All
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </div>
                <div className="blog-grid">
                  {relatedPosts.map((rPost) => (
                    <article key={rPost.slug} className="blog-card reveal">
                      <div
                        className="blog-card-media"
                        style={{ backgroundImage: `url(${rPost.coverImage})` }}
                      ></div>
                      <div className="blog-card-copy">
                        <div className="blog-card-meta">
                          <span className="blog-card-category">{rPost.category}</span>
                          <span className="blog-card-dot">•</span>
                          <span>{rPost.readTime}</span>
                        </div>
                        <h3>
                          <Link href={`/blog/${rPost.slug}`}>{rPost.title}</Link>
                        </h3>
                        <p>{rPost.excerpt}</p>
                        <div className="blog-card-footer">
                          <div className="blog-author">
                            <strong>{rPost.author.name}</strong>
                            <span>{rPost.author.role}</span>
                          </div>
                          <Link href={`/blog/${rPost.slug}`} className="blog-read-link">
                            Read
                            <span className="material-symbols-outlined">arrow_forward</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
