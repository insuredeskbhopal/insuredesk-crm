import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || baseUrl}/api/auth/google/callback`;

    if (!clientId) {
      return NextResponse.json({ success: false, error: "Google Client ID is not configured" }, { status: 500 });
    }

    // Secure Google OAuth 2.0 Auth Endpoint
    const targetUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent("openid email profile")}` +
      `&access_type=offline` +
      `&prompt=consent`;

    return NextResponse.json({ success: true, url: targetUrl });
  } catch (error) {
    console.error("Failed to generate Google auth URL:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
