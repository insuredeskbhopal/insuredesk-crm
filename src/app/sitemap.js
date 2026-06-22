import { PUBLIC_ROUTES, SITE_URL } from "@/lib/seo/site";
import { getBlogPostsForSitemap } from "@/lib/db/blog";

export default async function sitemap() {
  const routes = PUBLIC_ROUTES.map((route) => ({
    url: new URL(route.path, SITE_URL).href,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const blogPosts = await getBlogPostsForSitemap();

  const blogRoutes = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...routes, ...blogRoutes];
}
