import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { comparePassword, signJWT } from "@/lib/auth";
import { provisionClientMpin } from "@/lib/client-portal/credentials";
import { generateNextClientCode, normalizeClientId } from "@/lib/client-accounts/server";
import { normalizeClientCode } from "@/lib/client-accounts/utils";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { phone, customerId, otp, newMpin } = await request.json();
    const rawPhone = String(phone || "").trim();
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "").slice(-10);
    const cleanOtp = String(otp || "").trim().replace(/[^0-9]/g, "");
    const cleanMpin = String(newMpin || "").trim().replace(/[^0-9]/g, "");

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: "Invalid mobile number." },
        { status: 400 }
      );
    }

    if (cleanOtp.length !== 6) {
      return NextResponse.json(
        { success: false, error: "Please enter the 6-digit verification code." },
        { status: 400 }
      );
    }

    if (cleanMpin.length < 4 || cleanMpin.length > 6) {
      return NextResponse.json(
        { success: false, error: "MPIN must be a 4 to 6-digit numeric PIN." },
        { status: 400 }
      );
    }

    // 1. Fetch OTP task
    const otpTask = await prisma.task.findUnique({
      where: { sourceKey: `client-otp:${cleanPhone}` },
      select: { id: true, metadata: true },
    });

    if (!otpTask || !otpTask.metadata?.otpHash) {
      return NextResponse.json(
        { success: false, error: "No active verification request found. Please request an OTP first." },
        { status: 400 }
      );
    }

    const metadata = otpTask.metadata;
    const expiresAt = new Date(metadata.expiresAt).getTime();
    if (Date.now() > expiresAt) {
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    const currentAttempts = Number(metadata.attempts || 0);
    if (currentAttempts >= 5) {
      return NextResponse.json(
        { success: false, error: "Too many failed attempts. Please request a new verification code." },
        { status: 429 }
      );
    }

    // 2. Compare OTP
    const isOtpValid = await comparePassword(cleanOtp, metadata.otpHash);
    if (!isOtpValid) {
      await prisma.task.update({
        where: { id: otpTask.id },
        data: {
          metadata: {
            ...metadata,
            attempts: currentAttempts + 1,
          },
        },
      });
      return NextResponse.json(
        { success: false, error: "Invalid verification code. Please check and try again." },
        { status: 400 }
      );
    }

    // 3. Find matching active account or auto-provision when phone has policies
    const normalizedId = normalizeClientId(customerId);
    const normalizedCode = normalizeClientCode(customerId);
    let customer = null;
    if (normalizedId || normalizedCode) {
      customer = await prisma.clientAccount.findFirst({
        where: {
          ...(normalizedId ? { id: normalizedId } : { clientCode: normalizedCode }),
          phone: cleanPhone,
          deletedAt: null,
        },
        select: {
          id: true,
          clientCode: true,
          name: true,
          email: true,
          phone: true,
          organizationId: true,
          deletedAt: true,
        },
      });
    } else {
      const phoneMatches =
        typeof prisma.clientAccount.findMany === "function"
          ? await prisma.clientAccount.findMany({
              where: { phone: cleanPhone, deletedAt: null },
              select: {
                id: true,
                clientCode: true,
                name: true,
                email: true,
                phone: true,
                organizationId: true,
                deletedAt: true,
              },
              take: 3,
            })
          : [];
      if (phoneMatches.length > 1) {
        return NextResponse.json(
          {
            success: false,
            code: "MULTIPLE_ACCOUNTS",
            requiresClientId: true,
            error: "Multiple Client IDs share this mobile number. Enter your Client ID (BHQ-...) to reset MPIN.",
          },
          { status: 409 },
        );
      }
      customer = phoneMatches[0] || null;
      if (!customer && typeof prisma.clientAccount.findMany !== "function") {
        customer = await prisma.clientAccount.findFirst({
          where: { phone: { contains: cleanPhone }, deletedAt: null },
          select: {
            id: true,
            clientCode: true,
            name: true,
            email: true,
            phone: true,
            organizationId: true,
            deletedAt: true,
          },
        });
      }
    }

    if (!customer) {
      const matchedPolicies = await prisma.$queryRaw`
        SELECT id, organization_id, reviewed_data, data, contact_person_mobile
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND (
            (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g'), 10) = ${cleanPhone})
            OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g'), 10) = ${cleanPhone})
            OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${cleanPhone})
            OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'customerPhone', ''), data->>'customerPhone', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'customerPhone', ''), data->>'customerPhone', ''), '[^0-9]', '', 'g'), 10) = ${cleanPhone})
            OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'customerMobile', ''), data->>'customerMobile', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'customerMobile', ''), data->>'customerMobile', ''), '[^0-9]', '', 'g'), 10) = ${cleanPhone})
            OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactPersonPhone', ''), data->>'contactPersonPhone', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactPersonPhone', ''), data->>'contactPersonPhone', ''), '[^0-9]', '', 'g'), 10) = ${cleanPhone})
            OR (length(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g'), 10) = ${cleanPhone})
          )
        ORDER BY saved_at DESC
        LIMIT 1;
      `;

      if (Array.isArray(matchedPolicies) && matchedPolicies.length > 0) {
        const pol = matchedPolicies[0];
        const pData = pol.reviewed_data || pol.data || {};
        const clientName = (pData.insuredName || pData.customerName || pData.name || "Policyholder").toString().trim();
        const clientEmail = (pData.email || pData.insuredEmail || "").toString().trim() || null;
        const orgId = pol.organization_id;

        const generatedCode = await generateNextClientCode(prisma);
        customer = await prisma.clientAccount.create({
          data: {
            clientCode: generatedCode,
            name: clientName,
            phone: cleanPhone,
            email: clientEmail,
            organizationId: orgId,
          },
          select: {
            id: true,
            clientCode: true,
            name: true,
            email: true,
            phone: true,
            organizationId: true,
            deletedAt: true,
          },
        });
      } else {
        return NextResponse.json(
          { success: false, error: "No policy records found for this phone number." },
          { status: 404 }
        );
      }
    }

    // 4. Provision new MPIN securely
    const writeResult = await provisionClientMpin(customer, cleanMpin);
    const credentialVersion = typeof writeResult === "number" ? writeResult : (writeResult?.credentialVersion || 1);

    // 5. Delete used OTP record to prevent replay
    await prisma.task.delete({ where: { id: otpTask.id } }).catch(() => {});

    // 6. Generate authenticated JWT token for the client session
    const token = await signJWT({
      role: "CLIENT",
      customerId: customer.id,
      clientCode: customer.clientCode || "",
      email: customer.email,
      name: customer.name,
      phone: cleanPhone,
      organizationId: customer.organizationId,
      credentialVersion,
    });

    const response = NextResponse.json({
      success: true,
      message: "MPIN set and verified successfully.",
      token,
      user: {
        id: customer.id,
        clientCode: customer.clientCode || "",
        name: customer.name,
        phone: cleanPhone,
        email: customer.email,
      },
    });
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Error verifying OTP and setting MPIN:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
