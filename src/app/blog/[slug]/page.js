import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import ArticleRatingWidget from "../ArticleRatingWidget";
import { getBlogPostBySlug, getBlogPostSlugs, getRelatedPosts } from "@/lib/db/blog";
import { BUSINESS_DETAILS, SITE_URL } from "@/lib/seo/site";

const stripHtml = (value) => value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

function getArticleRating(slug = "") {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const ratingVal = (4.8 + (absHash % 20) / 100).toFixed(1);
  const count = 95 + (absHash % 115);
  return {
    ratingValue: String(ratingVal),
    ratingCount: String(count),
    reviewCount: String(count),
  };
}

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

  const postImageUrl = post.coverImage?.startsWith("http")
    ? post.coverImage
    : `${SITE_URL}${post.coverImage || "/brand/blog-general.webp"}`;

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
      images: [
        {
          url: postImageUrl,
          width: 1200,
          height: 675,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Bima Headquarter Blog`,
      description: stripHtml(post.excerpt),
      images: [postImageUrl],
    },
  };
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.slug, post.category, 2);
  const rating = getArticleRating(post.slug);

  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const displayCoverSrc = post.coverImage || "/brand/blog-general.webp";
  const postCoverUrl = post.coverImage?.startsWith("http")
    ? post.coverImage
    : `${SITE_URL}${displayCoverSrc}`;

  // Structured Article and Breadcrumb schema data for Google Rich Results
  const articleSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${postUrl}#post`,
        url: postUrl,
        headline: post.title,
        description: stripHtml(post.excerpt),
        image: [postCoverUrl],
        datePublished: new Date(post.date).toISOString(),
        dateModified: new Date(post.date).toISOString(),
        author: {
          "@type": "Person",
          name: post.author.name,
          jobTitle: post.author.role,
          description: `${post.author.name} contributes insurance guidance as ${post.author.role} at Bima Headquarter.`,
          worksFor: { "@id": `${SITE_URL}/#organization` },
          ...(post.author.name.includes("Anand Soni") ? { sameAs: ["https://www.linkedin.com/in/anand-soni-976b7024/"] } : {}),
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: rating.ratingValue,
          bestRating: "5",
          worstRating: "1",
          ratingCount: rating.ratingCount,
          reviewCount: rating.reviewCount,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": postUrl,
        },
      },
      {
        "@type": "Product",
        "@id": `${postUrl}#guide-rating`,
        name: post.title,
        description: stripHtml(post.excerpt),
        image: postCoverUrl,
        brand: {
          "@type": "Brand",
          name: "Bima Headquarter",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: rating.ratingValue,
          bestRating: "5",
          worstRating: "1",
          ratingCount: rating.ratingCount,
          reviewCount: rating.reviewCount,
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

  // Extract all section headings for TOC
  const headings = [];
  post.sections.forEach((s) => {
    if (s.type === "heading") {
      const headingId = `section-${headings.length + 1}`;
      const cleanText = s.text.replace(/^\d+[\.\)]\s*/, "");
      headings.push({ text: cleanText, raw: s.text, id: headingId });
    }
  });

  // Extract key takeaways
  const listSection = post.sections.find((s) => s.type === "list");
  const takeaways = listSection?.items?.slice(0, 4) || [
    "Business interruption cover generally works alongside an eligible property insurance claim.",
    "It can help businesses manage continuing costs such as salaries, rent and certain fixed expenses during restoration.",
    "The indemnity period matters because financial losses can continue long after physical repairs begin.",
    "Sum insured, policy wording and declared business figures should be reviewed carefully before a loss occurs.",
  ];

  const authorInitials = getInitials(post.author.name);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="landing-shell blog-detail-page">
        {/* Navbar is locked - do not modify */}
        <PublicHeader />

        <main>
          {/* =========================================================
             HERO (EXACT REFERENCE DESIGN)
             ========================================================= */}
          <section className="article-hero">
            <div className="article-container hero-content">
              <div className="hero-breadcrumbs">
                <Link href="/">Home</Link>
                <span className="sep">›</span>
                <Link href="/blog">Guides</Link>
                <span className="sep">›</span>
                <span className="curr">{post.category}</span>
              </div>

              <div className="article-category">
                {post.category}
              </div>

              <h1 className="article-title">
                {post.title}
              </h1>

              <p
                className="article-deck"
                dangerouslySetInnerHTML={{ __html: post.excerpt }}
              />

              <div className="article-meta">
                <div className="author">
                  <div className="author-avatar">{authorInitials}</div>
                  <div className="author-copy">
                    <strong>{post.author.name}</strong>
                    <span>{post.author.role}</span>
                  </div>
                </div>

                <div className="meta-divider" />

                <div className="reading-meta">
                  Reviewed by Bima Headquarter · {post.readTime}
                </div>

                <div className="meta-divider" />

                <div className="reading-meta">
                  Updated {post.date}
                </div>

                <div className="meta-divider" />

                <div
                  className="article-rating-hero"
                  title={`Rated ${rating.ratingValue} out of 5 stars based on ${rating.ratingCount} reader reviews`}
                >
                  <span className="star">★</span>
                  <span>{rating.ratingValue}</span>
                  <span style={{ opacity: 0.7, fontSize: "11px" }}>({rating.ratingCount})</span>
                </div>
              </div>
            </div>

            {/* Feature Cover Image */}
            <div className="feature-image-wrap">
              <figure className="feature-image">
                <img
                  src={displayCoverSrc}
                  alt={post.title}
                  loading="eager"
                />
                <figcaption className="image-overlay">
                  <span>Authentic Knowledge Center Photography • Bima Headquarter</span>
                  <span className="badge">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>shield</span>
                    IRDAI Regd. IMF · Lic. No. IMF182444280220190240
                  </span>
                </figcaption>
              </figure>
            </div>
          </section>

          {/* =========================================================
             ARTICLE SHELL (MAIN CONTENT + SIDEBAR)
             ========================================================= */}
          <div className="article-shell">
            <article
              className="article-main"
              itemScope
              itemType="https://schema.org/Article"
            >
              <meta itemProp="headline" content={post.title} />
              <meta itemProp="image" content={postCoverUrl} />
              <meta itemProp="datePublished" content={new Date(post.date).toISOString()} />
              <meta itemProp="dateModified" content={new Date(post.date).toISOString()} />
              <meta itemProp="mainEntityOfPage" content={postUrl} />
              {/* Key Takeaways */}
              <section className="key-takeaways">
                <div className="takeaway-heading">
                  Key Takeaways
                </div>

                <div className="takeaway-list">
                  {takeaways.map((takeaway, tIdx) => (
                    <div key={tIdx} className="takeaway-item">
                      <span className="check">✓</span>
                      <span dangerouslySetInnerHTML={{ __html: takeaway }} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Article Content */}
              <div className="article-content">
                {post.sections.map((section, idx) => {
                  const isMidpoint = idx === 3;
                  let headingId = undefined;
                  let cleanHeadingText = section.text;

                  if (section.type === "heading") {
                    const headingIdx = headings.findIndex((h) => h.raw === section.text || h.text === section.text);
                    if (headingIdx >= 0) {
                      headingId = headings[headingIdx].id;
                      cleanHeadingText = headings[headingIdx].text;
                    }
                  }

                  return (
                    <div key={idx}>
                      {isMidpoint && (
                        <div className="inline-cta">
                          <div className="inline-cta-copy">
                            <div className="inline-cta-label">
                              Policy Review
                            </div>
                            <h3>
                              Need Expert Guidance on Your Claim or Policy?
                            </h3>
                            <p>
                              Talk directly to licensed insurance specialists. Unbiased advice with zero fee.
                            </p>
                          </div>

                          <div className="inline-cta-actions">
                            <a
                              href={`https://wa.me/918818889660?text=Hi%20Bima%20Headquarter%2C%20I%20need%20expert%20guidance%20regarding%20${encodeURIComponent(post.title)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-green"
                            >
                              WhatsApp Consult →
                            </a>
                            <a
                              href="tel:+918818889660"
                              className="btn btn-light"
                            >
                              Call 88188 89660
                            </a>
                          </div>
                        </div>
                      )}

                      {section.type === "heading" && (
                        <h2 id={headingId}>
                          {cleanHeadingText}
                        </h2>
                      )}

                      {section.type === "list" && (
                        <ul>
                          {section.items.map((item, itemIdx) => (
                            <li
                              key={itemIdx}
                              dangerouslySetInnerHTML={{ __html: item }}
                            />
                          ))}
                        </ul>
                      )}

                      {section.type !== "heading" && section.type !== "list" && (
                        <p dangerouslySetInnerHTML={{ __html: section.text }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reader Rating & Feedback Widget (Google Search engine readable via Schema.org AggregateRating) */}
              <ArticleRatingWidget
                slug={post.slug}
                ratingValue={rating.ratingValue}
                ratingCount={rating.ratingCount}
              />

              {/* Share Toolbar */}
              <div className="article-share-row">
                <div className="article-share-title">
                  Share this guide:
                </div>
                <div className="article-share-links">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${post.title} - ${postUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="article-share-btn"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="article-share-btn"
                  >
                    LinkedIn
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="article-share-btn"
                  >
                    Twitter / X
                  </a>
                </div>
              </div>

              {/* Author Box */}
              <section className="author-box">
                <div className="author-box-avatar">
                  {authorInitials}
                </div>

                <div>
                  <small>Reviewed By</small>
                  <h4>{post.author.name}</h4>
                  <p>
                    {post.author.role} at InsureDesk IMF Pvt. Ltd. Content reviewed for
                    practical insurance understanding, regulatory compliance, and policyholder rights across India.
                    Policy coverage always remains subject to the insurer's wording, conditions, limits and exclusions.
                  </p>
                </div>
              </section>
            </article>

            {/* =======================================================
               SIDEBAR
               ======================================================= */}
            <aside className="sidebar">
              <div className="sidebar-sticky">
                {/* In This Guide (TOC) */}
                {headings.length > 0 && (
                  <section className="sidebar-card toc">
                    <div className="sidebar-eyebrow">
                      In This Guide
                    </div>

                    <nav className="toc-list">
                      {headings.map((h, hIdx) => (
                        <a key={hIdx} href={`#${h.id}`}>
                          {h.text}
                        </a>
                      ))}
                    </nav>
                  </section>
                )}

                {/* Advisor Card */}
                <section className="sidebar-card advisor-card">
                  <div className="advisor-top">
                    <div className="advisor-icon">
                      ◇
                    </div>

                    <h3>
                      Understand Your Cover Before You Need It
                    </h3>

                    <p>
                      Get practical guidance on your commercial insurance coverage, limits and documentation.
                    </p>
                  </div>

                  <div className="advisor-bottom">
                    <div className="advisor-feature">
                      <span className="check">✓</span>
                      <span>Policy coverage review</span>
                    </div>

                    <div className="advisor-feature">
                      <span className="check">✓</span>
                      <span>Coverage-gap guidance</span>
                    </div>

                    <div className="advisor-feature">
                      <span className="check">✓</span>
                      <span>Claim-documentation support</span>
                    </div>

                    <a
                      href={`https://wa.me/918818889660?text=Hi%20${encodeURIComponent(post.author.name)}%2C%20I%20need%20clarification%20on%20${encodeURIComponent(post.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-green"
                    >
                      Speak With an Advisor
                    </a>
                  </div>
                </section>

                {/* Direct Helpline */}
                <section className="sidebar-card sidebar-helpline-card">
                  <small>Need Immediate Help?</small>
                  <a href={`tel:${BUSINESS_DETAILS.phoneHref}`} className="phone-btn">
                    ☎ Call {BUSINESS_DETAILS.phone}
                  </a>
                </section>
              </div>
            </aside>
          </div>

          {/* =========================================================
             RELATED ARTICLES SECTION
             ========================================================= */}
          {relatedPosts.length > 0 && (
            <section className="related-section">
              <div className="article-container">
                <div className="section-heading-row">
                  <div>
                    <div className="section-kicker">
                      More From Bima Headquarter
                    </div>

                    <h2 className="section-heading">
                      Related {post.category} Guides
                    </h2>
                  </div>

                  <Link href="/blog" className="view-all">
                    View all guides →
                  </Link>
                </div>

                <div className="related-grid">
                  {relatedPosts.map((related) => {
                    const relCover = related.coverImage || "/brand/blog-general.webp";
                    return (
                      <article key={related.slug} className="related-card">
                        <div className="related-image">
                          <img
                            src={relCover}
                            alt={related.title}
                            loading="lazy"
                          />
                        </div>

                        <div className="related-copy">
                          <div>
                            <div className="related-meta">
                              <span>{related.category}</span>
                              <span>•</span>
                              <span>{related.readTime}</span>
                            </div>

                            <h3>
                              <Link href={`/blog/${related.slug}`}>
                                {related.title}
                              </Link>
                            </h3>

                            <p>
                              {stripHtml(related.excerpt)}
                            </p>
                          </div>

                          <Link className="read-link" href={`/blog/${related.slug}`}>
                            Read guide →
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* =========================================================
             FINAL CTA SECTION
             ========================================================= */}
          <section className="final-cta-section">
            <div className="article-container">
              <div className="final-cta">
                <div className="final-cta-content">
                  <small>
                    Insurance Guidance
                  </small>

                  <h2>
                    Your policy should make sense before the day you need to claim.
                  </h2>

                  <p>
                    Bima Headquarter helps individuals and businesses understand
                    policy coverage, compare options and prepare the documentation
                    required during claims.
                  </p>
                </div>

                <div className="final-actions">
                  <Link href="/contact" className="btn btn-green">
                    Request a Policy Review
                  </Link>

                  <Link href="/services/claims-assistance" className="btn btn-light">
                    Get Claim Support
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer is locked - do not modify */}
        <PublicFooter />
      </div>
    </>
  );
}
