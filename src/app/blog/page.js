import { getAllBlogPosts } from "@/lib/db/blog";
import BlogFeedClient from "./BlogFeedClient";

export const dynamic = "force-dynamic";

export default async function BlogFeedPage() {
  const posts = await getAllBlogPosts();
  return <BlogFeedClient initialPosts={posts} />;
}
