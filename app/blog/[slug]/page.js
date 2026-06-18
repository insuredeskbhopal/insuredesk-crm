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
    slug: post.slug
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
      canonical: `/blog/${post.slug}`
    },
    openGraph: {
      title: `${post.title} | BIMAHEADQUARTER Blog`,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      authors: [post.author.name]
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | BIMAHEADQUARTER Blog`,
      description: post.excerpt
    }
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  // Find related articles (same category or others, excluding current)
  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug)
    .slice(0, 2);

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
          jobTitle: post.author.role
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/brand/main-logo-wide.png`
          }
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": postUrl
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${postUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${SITE_URL}/blog`
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: postUrl
          }
        ]
      }
    ]
  };

  return (
    <>
      <Script
        src="https://cdn.tailwindcss.com?plugins=forms,container-queries"
        strategy="beforeInteractive"
      />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Be+Vietnam+Pro:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
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
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={idx}>{section.text}</p>;
                  })}
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
                      <div className="blog-card-media" style={{ backgroundImage: `url(${rPost.coverImage})` }}></div>
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
