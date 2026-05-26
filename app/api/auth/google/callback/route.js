export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJWT } from "@/lib/auth";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import bcryptjs from "bcryptjs";

export async function GET(request) {
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || baseUrl;
  const redirectUri = `${appBaseUrl}/api/auth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(`${appBaseUrl}/login?error=missing_auth_code`);
    }

    if (!clientId || !clientSecret) {
      console.error("Google OAuth configuration missing client ID or secret.");
      return NextResponse.redirect(`${appBaseUrl}/login?error=google_callback_failed`);
    }

    // 1. Exchange the auth code for access token and id_token using Google Token Endpoint
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new globalThis.URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.id_token) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(`${appBaseUrl}/login?error=token_exchange_failed`);
    }

    // 2. Fetch user profile from Google UserInfo Endpoint using access_token
    const userProfileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profileData = await userProfileResponse.json();

    if (!userProfileResponse.ok || !profileData.email) {
      console.error("Google user profile retrieval failed:", profileData);
      return NextResponse.redirect(`${appBaseUrl}/login?error=profile_retrieval_failed`);
    }

    const email = profileData.email.toLowerCase().trim();
    const name = profileData.name || profileData.given_name || email.split("@")[0];

    // 3. Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      // Create a unique personal organization context
      const orgName = `${name}'s Organization`;
      const org = await prisma.organization.create({
        data: { name: orgName }
      });

      // Secure random placeholder password
      const secureRandomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const hashedPassword = await bcryptjs.hash(secureRandomPassword, 10);

      // Create new user under the newly generated Organization as the ADMIN
      user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: "ADMIN",
          organizationId: org.id
        }
      });

      // Audit new signup
      await logAudit({
        action: "USER_SIGNUP",
        entityType: "User",
        entityId: user.id,
        severity: "INFO",
        source: "AUTH",
        ipAddress,
        userAgent,
        userId: user.id,
        organizationId: user.organizationId,
        metadata: { email, role: user.role, method: "GOOGLE_OAUTH" }
      });
    }

    if (user.deletedAt) {
      return NextResponse.redirect(`${appBaseUrl}/login?error=account_deactivated`);
    }

    // 4. Generate app partition claims JWT Token
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId
    });

    // Audit successful login
    await logAudit({
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user.id,
      severity: "INFO",
      source: "AUTH",
      ipAddress,
      userAgent,
      userId: user.id,
      organizationId: user.organizationId,
      metadata: { email: user.email, role: user.role, method: "GOOGLE_OAUTH", isNewUser }
    });

    // 5. Set JWT token in Secure HTTP-only cookies and redirect to Dashboard
    const redirectResponse = NextResponse.redirect(`${appBaseUrl}/dashboard`);
    redirectResponse.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/"
    });

    return redirectResponse;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${appBaseUrl}/login?error=google_callback_failed`);
  }
}
