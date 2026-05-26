import { NextResponse } from "next/server";
import fs from "fs/promises";
import { verifyLocalSignature, getLocalPhysicalPath } from "@/lib/storage";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const storagePath = searchParams.get("path");
    const expires = searchParams.get("expires");
    const signature = searchParams.get("signature");

    if (!storagePath || !expires || !signature) {
      return NextResponse.json(
        { error: "Missing required download parameters" },
        { status: 400 }
      );
    }

    // Verify HMAC signature and expiration
    const isValid = verifyLocalSignature(storagePath, expires, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired download link" },
        { status: 403 }
      );
    }

    // Resolve physical path (with boundary traversal protection)
    let physicalPath;
    try {
      physicalPath = getLocalPhysicalPath(storagePath);
    } catch {
      return NextResponse.json(
        { error: "Access Denied: Invalid file path path" },
        { status: 403 }
      );
    }

    // Read file stats/existence
    try {
      const stats = await fs.stat(physicalPath);
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: "Resource is not a file" },
          { status: 400 }
        );
      }
      
      const fileBuffer = await fs.readFile(physicalPath);

      // Stream file back
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${storagePath.split("/").pop()}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    } catch (err) {
      if (err.code === "ENOENT") {
        return NextResponse.json(
          { error: "File not found in storage" },
          { status: 404 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("Storage download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
