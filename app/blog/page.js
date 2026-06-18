"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import { BLOG_POSTS } from "./blogData";

const categories = ["All", "Claims", "Renewals", "Business Risk", "Personal Insurance"];

export default function BlogFeedPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.body.classList.add("landing-page");
    const revealElements = document.querySelectorAll(".reveal");
    const revealObserver = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.1 }
    );
    revealElements.forEach((el) => revealObserver.observe(el));
    return () => {
      document.body.classList.remove("landing-page");
      revealObserver.disconnect();
    };
  }, []);

  // Filter posts by category and search query
  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCategory =
      activeCategory === "All" || post.category === activeCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Featured post is the first post (or from a specific flag)
  const featuredPost = BLOG_POSTS[0];
  const standardPosts = filteredPosts.filter((post) => post.slug !== featuredPost.slug);

  return (
    <>
      <Script
        src="https://cdn.tailwindcss.com?plugins=forms,container-queries"
        strategy="beforeInteractive"
      />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Be+Vietnam+Pro:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <div className="landing-shell blog-feed-page bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />

        <main>
          {/* Blog Hero Section */}
          <section className="blog-hero">
            <div className="blog-hero-inner max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="blog-hero-copy reveal">
                <span className="blog-eyebrow">
                  <span className="material-symbols-outlined">menu_book</span>
                  Insights & Guides
                </span>
                <h1>Knowledge Hub for Smart Insurance</h1>
                <p>
                  Explore professional advice, claims navigation manuals, and updates 
                  to protect your health, vehicles, and businesses across India.
                </p>
              </div>

              {/* Search Bar */}
              <div className="blog-search-stage reveal">
                <div className="blog-search-box">
                  <span className="material-symbols-outlined">search</span>
                  <input
                    type="text"
                    placeholder="Search articles, guides, or LOB topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery("")}>
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Main Feed Section */}
          <section className="blog-workspace">
            <div className="blog-workspace-inner max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              
              {/* Category Filter Tabs */}
              <div className="blog-category-bar reveal">
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
                  <div className="blog-featured-card">
                    <div className="blog-featured-media" style={{ backgroundImage: `url(${featuredPost.coverImage})` }}></div>
                    <div className="blog-featured-content">
                      <div className="blog-card-meta">
                        <span className="blog-card-category">{featuredPost.category}</span>
                        <span className="blog-card-dot">•</span>
                        <span>{featuredPost.readTime}</span>
                      </div>
                      <h2>
                        <Link href={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link>
                      </h2>
                      <p>{featuredPost.excerpt}</p>
                      <div className="blog-card-footer">
                        <div className="blog-author">
                          <strong>{featuredPost.author.name}</strong>
                          <span>{featuredPost.author.role}</span>
                        </div>
                        <Link href={`/blog/${featuredPost.slug}`} className="blog-read-link">
                          Read Article
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>
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
                  <div className="blog-grid">
                    {/* Render featured post as a grid card if filtering is active */}
                    {(activeCategory !== "All" || searchQuery ? filteredPosts : standardPosts).map((post) => (
                      <article key={post.slug} className="blog-card reveal">
                        <div className="blog-card-media" style={{ backgroundImage: `url(${post.coverImage})` }}></div>
                        <div className="blog-card-copy">
                          <div className="blog-card-meta">
                            <span className="blog-card-category">{post.category}</span>
                            <span className="blog-card-dot">•</span>
                            <span>{post.readTime}</span>
                          </div>
                          <h3>
                            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                          </h3>
                          <p>{post.excerpt}</p>
                          <div className="blog-card-footer">
                            <div className="blog-author">
                              <strong>{post.author.name}</strong>
                              <span>{post.author.role}</span>
                            </div>
                            <Link href={`/blog/${post.slug}`} className="blog-read-link">
                              Read
                              <span className="material-symbols-outlined">arrow_forward</span>
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* Newsletter Subscribe Banner */}
          <section className="blog-subscribe-section">
            <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="blog-subscribe-grid reveal">
                <div>
                  <span>Stay Informed</span>
                  <h2>Get monthly claim tips & renewal advisories</h2>
                  <p>We send only curated, licensed insurance consulting insights once a month.</p>
                </div>
                <form className="blog-subscribe-form" onSubmit={(e) => { e.preventDefault(); window.alert("Subscription successful!"); }}>
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
