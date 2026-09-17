import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    latestVersion: "1.0.1",
    versionCode: 2,
    minSupportedVersion: "1.0.0",
    forceUpdate: false,
    title: "New Update Available (v1.0.1)",
    releaseNotes: [
      "Bigger & information-rich policy cards with insured name & vehicle plate",
      "Dedicated full-screen policy breakdown view with coverage specs",
      "Redesigned mobile-first PDF download bottom sheet",
      "Live CRM database real-time auto sync",
      "Enhanced performance and stability"
    ],
    downloadUrl: "https://www.bimaheadquarter.com/downloads/bimaheadquarter.apk",
    releaseDate: "September 2026",
    fileSizeMb: "28 MB"
  }, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  });
}
