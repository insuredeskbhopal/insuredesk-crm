import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    latestVersion: "1.0.2",
    versionCode: 4,
    minSupportedVersion: "1.0.0",
    forceUpdate: false,
    title: "New Update Available (v1.0.2)",
    releaseNotes: [
      "Friendly BHQ Client IDs (BHQ-XXXXXX) and unified 4 to 6-digit MPIN support",
      "Fixed document ticket streaming and live OTP MPIN recovery",
      "Reliable claim & support request sync with accurate error feedback",
      "Improved policy cards, pagination, and secure logout isolation",
      "Enhanced performance and stability"
    ],
    downloadUrl: "https://www.bimaheadquarter.com/downloads/bimaheadquarter.apk",
    releaseDate: "September 2026",
    fileSizeMb: "28 MB"
  }, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
