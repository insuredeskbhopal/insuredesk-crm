import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logAudit, getAuditMetadata } from "@/lib/audit";

export async function POST(request) {
  try {
    const { email, password, name, organizationName } = await request.json();

    if (process.env.ENABLE_PUBLIC_SIGNUP === "false") {
      return NextResponse.json({ success: false, error: "Public registration is disabled." }, { status: 403 });
    }

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: "User with this email already exists" }, { status: 400 });
    }

    // Determine Organization context and role
    let organizationId = null;
    let userRole = "AGENT";

    if (organizationName && organizationName.trim()) {
      const newOrg = await prisma.organization.create({
        data: { name: organizationName.trim() }
      });
      organizationId = newOrg.id;
      userRole = "ADMIN"; // Owner/creator of a new organization gets ADMIN
    } else {
      // Find or create default organization
      let defaultOrg = await prisma.organization.findFirst();
      if (!defaultOrg) {
        defaultOrg = await prisma.organization.create({
          data: { name: "Default Organization" }
        });
        userRole = "ADMIN"; // First user in system gets ADMIN
      }
      organizationId = defaultOrg.id;
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name || null,
        organizationId,
        role: userRole
      }
    });

    // Extract IP and UA for auditing
    const { ipAddress, userAgent } = getAuditMetadata(request);

    // Audit Log the signup
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
      metadata: { email: user.email, role: user.role }
    });

    return NextResponse.json({ success: true, message: "User registered successfully", userId: user.id });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

