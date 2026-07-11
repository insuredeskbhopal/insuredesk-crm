/**
 * Blog Data Access Layer
 * Server-side functions for fetching blog posts from the database.
 */
import { prisma } from "./prisma";
import { BLOG_POSTS } from "@/app/blog/blogData";

/**
 * Transform a DB blog post record into the shape used by the frontend.
 */
function transformPost(dbPost) {
  if (!dbPost) return null;

  const sections = (dbPost.sections || [])
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      if (s.type === "list") {
        return { type: "list", items: s.items || [] };
      }
      return { type: s.type, text: s.text || "" };
    });

  return {
    slug: dbPost.slug,
    title: dbPost.title,
    excerpt: dbPost.excerpt,
    category: dbPost.category,
    readTime: dbPost.readTime,
    date: dbPost.date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    }),
    author: {
      name: dbPost.authorName,
      role: dbPost.authorRole,
    },
    coverImage: dbPost.coverImage,
    sections,
  };
}

/**
 * Get all published blog posts, ordered by date descending.
 */
export async function getAllBlogPosts() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      include: { sections: { orderBy: { order: "asc" } } },
      orderBy: { date: "desc" },
    });

    return posts.map(transformPost);
  } catch (error) {
    warnBlogFallback(error);
    return sortFallbackPosts(BLOG_POSTS);
  }
}

/**
 * Get a single blog post by slug.
 */
export async function getBlogPostBySlug(slug) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: { sections: { orderBy: { order: "asc" } } },
    });

    if (!post || !post.published) return null;

    return transformPost(post);
  } catch (error) {
    warnBlogFallback(error);
    return BLOG_POSTS.find((post) => post.slug === slug) || null;
  }
}

/**
 * Get all published blog post slugs (for generateStaticParams).
 */
export async function getBlogPostSlugs() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true },
    });

    return posts.map((p) => ({ slug: p.slug }));
  } catch (error) {
    warnBlogFallback(error);
    return BLOG_POSTS.map((post) => ({ slug: post.slug }));
  }
}

/**
 * Get related posts (same category first, then others), excluding the current post.
 */
export async function getRelatedPosts(currentSlug, category, limit = 2) {
  try {
    // First try same-category posts
    const sameCat = await prisma.blogPost.findMany({
      where: {
        published: true,
        slug: { not: currentSlug },
        category,
      },
      include: { sections: { orderBy: { order: "asc" } } },
      orderBy: { date: "desc" },
      take: limit,
    });

    if (sameCat.length >= limit) {
      return sameCat.map(transformPost);
    }

    // Fill remaining with other categories
    const remaining = limit - sameCat.length;
    const otherPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        slug: { notIn: [currentSlug, ...sameCat.map((p) => p.slug)] },
        category: { not: category },
      },
      include: { sections: { orderBy: { order: "asc" } } },
      orderBy: { date: "desc" },
      take: remaining,
    });

    return [...sameCat, ...otherPosts].map(transformPost);
  } catch (error) {
    warnBlogFallback(error);
    const posts = sortFallbackPosts(BLOG_POSTS).filter((post) => post.slug !== currentSlug);
    const sameCategory = posts.filter((post) => post.category === category);
    const otherCategories = posts.filter((post) => post.category !== category);
    return [...sameCategory, ...otherCategories].slice(0, limit);
  }
}

/**
 * Get all published blog posts for sitemap (lightweight — no sections).
 */
export async function getBlogPostsForSitemap() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, date: true },
      orderBy: { date: "desc" },
    });

    return posts;
  } catch (error) {
    warnBlogFallback(error);
    return BLOG_POSTS.map((post) => ({
      slug: post.slug,
      date: new Date(post.date),
    }));
  }
}

function sortFallbackPosts(posts) {
  return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function warnBlogFallback(error) {
  console.warn("Blog database unavailable; using bundled blog posts.", error?.message || error);
}
