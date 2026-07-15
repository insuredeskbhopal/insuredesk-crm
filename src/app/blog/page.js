import { getAllBlogPosts } from "@/lib/db/blog";
import BlogFeedClient from "./BlogFeedClient";

export const dynamic = "force-dynamic";

export default async function BlogFeedPage({ searchParams }) {
  const { search = "" } = await searchParams;
  const posts = await getAllBlogPosts();
  return <BlogFeedClient initialPosts={posts} initialSearch={typeof search === "string" ? search : ""} />;
}
