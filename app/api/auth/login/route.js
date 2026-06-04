import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { comparePassword, signJWT } from "@/lib/auth";
import { logAudit, getAuditMetadata } from "@/lib/audit";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find the user including role and organization
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
    }

    // Check soft-delete status
    if (user.deletedAt) {
      return NextResponse.json({ success: false, error: "Account has been deactivated" }, { status: 403 });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      // Log failed login attempt audit
      const { ipAddress, userAgent } = getAuditMetadata(request);
      await logAudit({
        action: "FAILED_LOGIN_ATTEMPT",
        entityType: "User",
        entityId: user.id,
        severity: "WARNING",
        source: "AUTH",
        ipAddress,
        userAgent,
        userId: user.id,
        organizationId: user.organizationId,
        metadata: { email: normalizedEmail }
      });

      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
    }

    // Sign JWT token including SaaS partition claims
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId
    });

    // Extract IP and UA for success audit
    const { ipAddress, userAgent } = getAuditMetadata(request);

    // Record login audit event
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
      metadata: { email: user.email, role: user.role }
    });

    // Set secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId
      }
    });

    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
