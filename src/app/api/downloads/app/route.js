import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { downloadGoogleDriveFile } from "@/lib/storage/google-drive-storage";

export const dynamic = "force-dynamic";

const GOOGLE_DRIVE_APK_FILE_ID =
  process.env.GOOGLE_DRIVE_APK_FILE_ID || "1OW05BnW1ElKDCi2Xse86bsiEESS3TgSI";

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

    // 2. Fallback: Stream directly from Google Drive API with official headers
    if (GOOGLE_DRIVE_APK_FILE_ID) {
      try {
        const driveBuffer = await downloadGoogleDriveFile(GOOGLE_DRIVE_APK_FILE_ID);
        return new Response(driveBuffer, {
          headers: {
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": 'attachment; filename="bimaheadquarter.apk"',
            "Content-Length": driveBuffer.length.toString(),
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch (driveErr) {
        console.error("Google Drive APK fallback stream error:", driveErr);
      }
    }

    // 3. Fallback: Redirect to main download page or release repository
    return NextResponse.redirect(new URL("/download-app?ready=pending", request.url));
  } catch (error) {
    console.error("APK Download Error:", error);
    return NextResponse.redirect(new URL("/download-app", request.url));
  }
}
