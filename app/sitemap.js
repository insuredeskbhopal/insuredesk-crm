import { PUBLIC_ROUTES, SITE_URL } from "@/lib/seo/site";

export default function sitemap() {
  return PUBLIC_ROUTES.map((route) => ({
    url: new URL(route.path, SITE_URL).href,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
}
