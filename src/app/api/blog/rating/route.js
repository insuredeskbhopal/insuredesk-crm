import crypto from "crypto";
import { getArticleRatingFromDb, saveArticleRating } from "@/lib/db/blog";

function hashIp(rawIp = "") {
  if (!rawIp) return null;
  return crypto.createHash("sha256").update(rawIp.trim()).digest("hex").slice(0, 32);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { slug, rating } = body;

    if (!slug || typeof slug !== "string") {
      return Response.json(
        { success: false, error: "Valid article slug is required." },
        { status: 400 }
      );
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return Response.json(
        { success: false, error: "Rating must be an integer between 1 and 5." },
        { status: 400 }
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const rawIp = (forwarded ? forwarded.split(",")[0] : realIp) || "";
    const ipHash = hashIp(rawIp);
    const userAgent = request.headers.get("user-agent")?.slice(0, 255) || null;

    const freshStats = await saveArticleRating({
      slug: slug.trim(),
      rating: ratingNum,
      ipHash,
      userAgent,
    });

    return Response.json({
      success: true,
      userRating: ratingNum,
      ratingValue: freshStats.ratingValue,
      ratingCount: freshStats.ratingCount,
      reviewCount: freshStats.reviewCount,
    });
  } catch (error) {
    console.error("Failed to process article rating:", error);
    return Response.json(
      { success: false, error: error?.message || "Failed to store rating in database." },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return Response.json(
        { success: false, error: "Missing slug parameter." },
        { status: 400 }
      );
    }

    const stats = await getArticleRatingFromDb(slug.trim());
    return Response.json({ success: true, ...stats });
  } catch (error) {
    console.error("Failed to fetch article rating:", error);
    return Response.json(
      { success: false, error: "Failed to retrieve rating." },
      { status: 500 }
    );
  }
}
