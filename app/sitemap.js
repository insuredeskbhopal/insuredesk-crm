import { PUBLIC_ROUTES, SITE_URL } from "@/lib/seo/site";
import { BLOG_POSTS } from "./blog/blogData";

export default function sitemap() {
  const routes = PUBLIC_ROUTES.map((route) => ({
    url: new URL(route.path, SITE_URL).href,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));

  const blogRoutes = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7
  }));

  return [...routes, ...blogRoutes];
}

