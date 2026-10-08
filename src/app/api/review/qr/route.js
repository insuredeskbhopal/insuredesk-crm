import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { BRAND_CONFIG } from "@/lib/review/config";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "svg").toLowerCase();
    const rawCampaign = searchParams.get("c") || searchParams.get("campaign") || "standard";
    const campaign = String(rawCampaign).replace(/[^\w-]/g, "").slice(0, 50) || "standard";

    // Build canonical target URL for the QR code
    const targetUrl = `${BRAND_CONFIG.canonicalReviewUrl}?src=qr&c=${encodeURIComponent(campaign)}`;

    if (format === "png") {
      const buffer = await QRCode.toBuffer(targetUrl, {
        type: "png",
        width: 600,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      });

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `inline; filename="bimaheadquarter-review-qr-${campaign}.png"`,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    // Default to clean scalable vector SVG
    const svgString = await QRCode.toString(targetUrl, {
      type: "svg",
      width: 400,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });

    return new NextResponse(svgString, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `inline; filename="bimaheadquarter-review-qr-${campaign}.svg"`,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[Review QR API] Generation error:", err);
    return NextResponse.json({ success: false, error: "Failed to generate QR code." }, { status: 500 });
  }
}
