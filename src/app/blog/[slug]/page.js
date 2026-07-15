import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import BlogSidebarForm from "../BlogSidebarForm";
import { getBlogPostBySlug, getBlogPostSlugs, getRelatedPosts } from "@/lib/db/blog";
import { BUSINESS_DETAILS, SITE_URL } from "@/lib/seo/site";
import { SERVICES } from "@/content/services";

const stripHtml = (value) => value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

// Generate static params for Next.js build prerendering
export async function generateStaticParams() {
  return await getBlogPostSlugs();
}

// Generate dynamic SEO metadata
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: `${post.title} | Bima Headquarter Blog`,
    description: stripHtml(post.excerpt),
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | Bima Headquarter Blog`,
      description: stripHtml(post.excerpt),
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      authors: [post.author.name],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Bima Headquarter Blog`,
      description: stripHtml(post.excerpt),
    },
  };
}

const getRelatedServicesForBlog = (category) => {
  const getBySlug = (slug) => {
    const s = SERVICES.find((item) => item.slug === slug);
    return {
      title: s ? s.fullName || s.title : "",
      desc: s ? s.desc : "",
      slug: slug,
    };
  };

  if (category === "Claims") {
    return [getBySlug("claims-assistance"), getBySlug("policy-renewals")];
  } else if (category === "Renewals") {
    return [getBySlug("policy-renewals"), getBySlug("motor-insurance")];
  } else if (category === "Business Risk") {
    return [getBySlug("commercial-insurance"), getBySlug("risk-advisory")];
  } else {
    return [getBySlug("health-insurance"), getBySlug("motor-insurance")];
  }
};

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedServices = getRelatedServicesForBlog(post.category);

  // Find related articles (same category or others, excluding current)
  const relatedPosts = await getRelatedPosts(post.slug, post.category, 2);

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
        description: stripHtml(post.excerpt),
        datePublished: new Date(post.date).toISOString(),
        dateModified: new Date(post.date).toISOString(),
        author: {
          "@type": "Person",
          name: post.author.name,
          jobTitle: post.author.role,
          description: `${post.author.name} contributes insurance guidance as ${post.author.role} at Bima Headquarter.`,
          worksFor: { "@id": `${SITE_URL}/#organization` },
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
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
                <p className="blog-excerpt" dangerouslySetInnerHTML={{ __html: post.excerpt }} />

                <div className="blog-post-author-bar">
                  <span className="material-symbols-outlined">account_circle</span>
                  <div>
                    <strong>{post.author.name}</strong>
                    <span>{post.author.role}</span>
                    <p>
                      {post.author.name} contributes practical insurance guidance for Bima Headquarter readers.
                    </p>
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
                  <a href={`tel:${BUSINESS_DETAILS.phoneHref}`}>
                    <span className="material-symbols-outlined">call</span>
                    Call {BUSINESS_DETAILS.phone}
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
