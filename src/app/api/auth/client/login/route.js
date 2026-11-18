import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signJWT } from "@/lib/auth";
import { verifyClientMpinWithVersion, provisionClientMpin } from "@/lib/client-portal/credentials";
import { normalizeClientId } from "@/lib/client-accounts/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request) {
  try {
    const { customerId, phone, mpin } = await request.json();
    const rawInput = String(customerId || phone || "").trim();

    if (!rawInput || !mpin) {
      return NextResponse.json({ success: false, error: "Mobile number or Client ID and MPIN are required" }, { status: 400 });
    }

    const normalizedCustomerId = normalizeClientId(rawInput);
    const cleanPhone = rawInput.replace(/[^0-9]/g, "").slice(-10);
    const cleanMpin = String(mpin || "").replace(/[^0-9]/g, "");

    if (cleanMpin.length < 4 || cleanMpin.length > 6) {
      return NextResponse.json({ success: false, error: "Client MPIN must be a 4 to 6-digit numeric code" }, { status: 400 });
    }

    let customer = null;
    if (normalizedCustomerId) {
      customer = await prisma.clientAccount.findUnique({
        where: { id: normalizedCustomerId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          organizationId: true,
          deletedAt: true,
        },
      });
    } else if (cleanPhone.length === 10) {
      customer = await prisma.clientAccount.findFirst({
        where: {
          phone: { contains: cleanPhone },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          organizationId: true,
          deletedAt: true,
        },
      });

      // If no client account exists yet, check if policies were uploaded by CRM agents with this phone number
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

          // Auto-provision clientAccount from the policy uploaded by CRM agent
          customer = await prisma.clientAccount.create({
            data: {
              name: clientName,
              phone: cleanPhone,
              email: clientEmail,
              organizationId: orgId,
            },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              organizationId: true,
              deletedAt: true,
            },
          });

          // Set their entered MPIN as their initial login MPIN
          await provisionClientMpin(customer, cleanMpin);
        }
      }
    }

    if (!customer || customer.deletedAt) {
      return NextResponse.json({
        success: false,
        error: cleanPhone.length === 10
          ? "No policy records found registered with this mobile number. Please check the number or contact your insurance advisor."
          : "Invalid Client ID or MPIN.",
      }, { status: 401 });
    }

    if (!customer.phone) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }

    const cleanDbPhone = customer.phone.replace(/[^0-9]/g, "");
    let mpinVerification = await verifyClientMpinWithVersion(customer, cleanMpin);
    if (!mpinVerification.valid) {
      // Check if this account was created in CRM without an initial MPIN set
      const existingCred = await prisma.task.findUnique({
        where: { sourceKey: `client-credential:${customer.id}` },
        select: { metadata: true },
      });
      if (!existingCred?.metadata?.mpinHash) {
        // First-time sign in: provision entered MPIN as initial MPIN
        await provisionClientMpin(customer, cleanMpin);
        mpinVerification = await verifyClientMpinWithVersion(customer, cleanMpin);
      } else {
        return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
      }
    }

    // Sign the JWT token specifically for the client portal
    const token = await signJWT({
      role: "CLIENT",
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      phone: cleanDbPhone,
      organizationId: customer.organizationId,
      credentialVersion: mpinVerification.credentialVersion,
    });

    // Set secure HTTP-only cookie matching standard session settings
    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
      token,
      user: {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        role: "CLIENT",
        organizationId: customer.organizationId
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
    console.error("Client ID login error stack:", error.stack || error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
