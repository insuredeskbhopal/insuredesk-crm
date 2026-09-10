"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import LandingEffects from "@/app/components/LandingEffects";
import { SITE_URL } from "@/lib/seo/site";
import { BLOG_CATEGORIES } from "@/content/blogConfig";

const categories = BLOG_CATEGORIES;
const POSTS_PER_PAGE = 9;

const stripHtml = (value) => value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export default function BlogFeedClient({ initialPosts = [], initialSearch = "" }) {
  const BLOG_POSTS = initialPosts;

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    document.body.classList.add("landing-page");
    return () => {
      document.body.classList.remove("landing-page");
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  // Filter posts by category and search query
  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCategory = activeCategory === "All" || post.category === activeCategory;
    const searchableExcerpt = stripHtml(post.excerpt).toLowerCase();
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      searchableExcerpt.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Featured post is the first post (or from a specific flag)
  const featuredPost = BLOG_POSTS[0];
  const standardPosts = filteredPosts.filter((post) => post.slug !== featuredPost.slug);
  const gridPosts = activeCategory !== "All" || searchQuery ? filteredPosts : standardPosts;
  const totalPages = Math.max(1, Math.ceil(gridPosts.length / POSTS_PER_PAGE));
  const pageStart = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = gridPosts.slice(pageStart, pageStart + POSTS_PER_PAGE);
  const pageSummaryStart = gridPosts.length === 0 ? 0 : pageStart + 1;
  const pageSummaryEnd = Math.min(pageStart + POSTS_PER_PAGE, gridPosts.length);
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#blog`,
    name: "Bima Headquarter Insurance Knowledge Hub",
    description:
      "Insurance guides, claim assistance articles, renewal checklists, and business risk education from Bima Headquarter.",
    blogPost: BLOG_POSTS.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: stripHtml(post.excerpt),
      datePublished: new Date(post.date).toISOString(),
      author: {
        "@type": "Person",
        name: post.author.name,
      },
      publisher: { "@id": `${SITE_URL}/#organization` },
      url: `${SITE_URL}/blog/${post.slug}`,
    })),
  };

  return (
    <>
      <Script
        id="bimaheadquarter-blog-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <LandingEffects />
      <div className="landing-shell blog-feed-page bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />

        <main>
          {/* Blog Hero Section */}
          <section className="blog-hero">
            <div className="blog-hero-inner">
              <span className="blog-eyebrow">
                <span className="material-symbols-outlined" aria-hidden="true">menu_book</span>
                Insurance Knowledge Hub
              </span>

              <h1 className="blog-hero-title">
                Insurance Insights & <span className="blog-title-gradient">Expert Guides</span>
              </h1>

              <p className="blog-hero-subtitle">
                Independent analysis, claims advocacy roadmaps, and policy decision checklists from licensed IRDAI insurance specialists.
              </p>

              {/* Search Bar */}
              <div className="blog-search-stage">
                <div className="blog-search-box">
                  <span className="material-symbols-outlined search-icon" aria-hidden="true">search</span>
                  <input
                    type="text"
                    placeholder="Search 50+ guides by topic, claim issue, or policy type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search articles"
                  />
                  {searchQuery ? (
                    <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search">
                      <span className="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                  ) : (
                    <span className="blog-search-badge">50+ Guides</span>
                  )}
                </div>
              </div>

              {/* Trending Quick Search Chips */}
              <div className="blog-trending-tags" aria-label="Trending topics">
                <span className="trending-label">Trending:</span>
                {["Motor Claims", "Health Portability", "Warehouse Fire", "Policy Renewals"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="trending-tag"
                    onClick={() => setSearchQuery(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Main Feed Section */}
          <section className="blog-workspace">
            <div className="blog-workspace-inner">
              {/* Category Filter Tabs */}
              <div className="blog-category-bar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`blog-category-tab ${activeCategory === cat ? "active" : ""}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Featured Post Card (only shown when category is 'All' and no active search query) */}
              {activeCategory === "All" && !searchQuery && featuredPost && (
                <div className="blog-featured-section reveal">
                  <span className="blog-section-title">Featured Article</span>
                  <Link href={`/blog/${featuredPost.slug}`} className="blog-featured-card">
                    <div
                      className="blog-featured-media"
                      style={{ backgroundImage: `url(${featuredPost.coverImage})` }}
                    ></div>
                    <div className="blog-featured-content">
                      <div className="blog-card-meta">
                        <span className="blog-card-category">{featuredPost.category}</span>
                        <span className="blog-card-dot">•</span>
                        <span>{featuredPost.readTime}</span>
                      </div>
                      <h2>{featuredPost.title}</h2>
                      <p dangerouslySetInnerHTML={{ __html: featuredPost.excerpt }} />
                      <div className="blog-card-footer">
                        <div className="blog-author">
                          <strong>{featuredPost.author.name}</strong>
                          <span>{featuredPost.author.role}</span>
                        </div>
                        <span className="blog-read-link">
                          Read Article
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Article Grid */}
              <div className="blog-grid-section">
                <span className="blog-section-title">
                  {searchQuery || activeCategory !== "All" ? "Search Results" : "Recent Articles"}
                </span>

                {filteredPosts.length === 0 ? (
                  <div className="blog-empty-state">
                    <span className="material-symbols-outlined">search_off</span>
                    <h3>No articles found</h3>
                    <p>Try refining your search queries or selecting another category.</p>
                  </div>
                ) : (
                  <>
                    <div className="blog-grid" key={`${activeCategory}-${searchQuery}-${currentPage}`}>
                      {paginatedPosts.map((post) => (
                        <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card reveal active">
                          <div
                            className="blog-card-media"
                            style={{ backgroundImage: `url(${post.coverImage})` }}
                          ></div>
                          <div className="blog-card-copy">
                            <div className="blog-card-meta">
                              <span className="blog-card-category">{post.category}</span>
                              <span className="blog-card-dot">•</span>
                              <span>{post.readTime}</span>
                            </div>
                            <h3>{post.title}</h3>
                            <p dangerouslySetInnerHTML={{ __html: post.excerpt }} />
                            <div className="blog-card-footer">
                              <div className="blog-author">
                                <strong>{post.author.name}</strong>
                                <span>{post.author.role}</span>
                              </div>
                              <span className="blog-read-link">
                                Read
                                <span className="material-symbols-outlined">arrow_forward</span>
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <nav className="blog-pagination" aria-label="Blog pagination">
                        <p>
                          Showing {pageSummaryStart}-{pageSummaryEnd} of {gridPosts.length} articles
                        </p>
                        <div>
                          <button
                            type="button"
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            disabled={currentPage === 1}
                            aria-label="Previous blog page"
                          >
                            <span className="material-symbols-outlined">chevron_left</span>
                          </button>
                          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                            <button
                              key={page}
                              type="button"
                              className={currentPage === page ? "active" : ""}
                              onClick={() => setCurrentPage(page)}
                              aria-label={`Go to blog page ${page}`}
                              aria-current={currentPage === page ? "page" : undefined}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                            disabled={currentPage === totalPages}
                            aria-label="Next blog page"
                          >
                            <span className="material-symbols-outlined">chevron_right</span>
                          </button>
                        </div>
                      </nav>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Newsletter Subscribe Banner */}
          <section className="blog-subscribe-section">
            <div className="blog-subscribe-inner">
              <div className="blog-subscribe-grid reveal">
                <div>
                  <span>Stay Informed</span>
                  <h2>Get monthly claim tips & renewal advisories</h2>
                  <p>We send only curated, licensed insurance consulting insights once a month.</p>
                </div>
                <form
                  className="blog-subscribe-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    window.alert("Subscription successful!");
                  }}
                >
                  <input type="email" placeholder="name@example.com" required />
                  <button type="submit">
                    Subscribe
                    <span className="material-symbols-outlined">mail</span>
                  </button>
                </form>
              </div>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
