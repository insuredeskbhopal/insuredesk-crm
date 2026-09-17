import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // 1. Check if an APK exists in public/downloads/ or BHQ build output
    const localDownloadPath = path.join(process.cwd(), "public", "downloads", "bimaheadquarter.apk");
    const flutterReleasePath = path.join(
      process.cwd(),
      "BHQ",
      "build",
      "app",
      "outputs",
      "flutter-apk",
      "app-release.apk"
    );

    let targetPath = null;
    if (fs.existsSync(localDownloadPath)) {
      targetPath = localDownloadPath;
    } else if (fs.existsSync(flutterReleasePath)) {
      targetPath = flutterReleasePath;
    }

    if (targetPath) {
      const stats = fs.statSync(targetPath);
      const fileBuffer = fs.readFileSync(targetPath);

      return new Response(fileBuffer, {
        headers: {
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Disposition": 'attachment; filename="bimaheadquarter.apk"',
          "Content-Length": stats.size.toString(),
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Fallback: Redirect to main download page or release repository
    return NextResponse.redirect(new URL("/download-app?ready=pending", request.url));
  } catch (error) {
    console.error("APK Download Error:", error);
    return NextResponse.redirect(new URL("/download-app", request.url));
  }
}
