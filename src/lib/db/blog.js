/**
 * Blog Data Access Layer
 * Server-side functions for fetching blog posts from the database.
 */
import { prisma } from "./prisma";

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
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    include: { sections: { orderBy: { order: "asc" } } },
    orderBy: { date: "desc" },
  });

  return posts.map(transformPost);
}

/**
 * Get a single blog post by slug.
 */
export async function getBlogPostBySlug(slug) {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { sections: { orderBy: { order: "asc" } } },
  });

  if (!post || !post.published) return null;

  return transformPost(post);
}

/**
 * Get all published blog post slugs (for generateStaticParams).
 */
export async function getBlogPostSlugs() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true },
  });

  return posts.map((p) => ({ slug: p.slug }));
}

/**
 * Get related posts (same category first, then others), excluding the current post.
 */
export async function getRelatedPosts(currentSlug, category, limit = 2) {
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
}

/**
 * Get all published blog posts for sitemap (lightweight — no sections).
 */
export async function getBlogPostsForSitemap() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true, date: true },
    orderBy: { date: "desc" },
  });

  return posts;
}
