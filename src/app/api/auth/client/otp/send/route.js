import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth";
import { resolveWhatsAppSender } from "@/lib/whatsapp/account-access";
import { dispatchWhatsApp } from "@/lib/whatsapp/dispatch";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { phone } = await request.json();
    const rawPhone = String(phone || "").trim();
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "").slice(-10);

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    // 1. Check if client account exists
    let customer = await prisma.clientAccount.findFirst({
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
      },
    });

    let organizationId = customer?.organizationId || null;
    let clientName = customer?.name || null;

    // 2. If client account not found, check if policies exist for this phone number
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
        organizationId = pol.organization_id;
        clientName = (pData.insuredName || pData.customerName || pData.name || "Policyholder").toString().trim();
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "No policy records found registered with this mobile number. Please check the number or contact your insurance advisor.",
          },
          { status: 404 }
        );
      }
    }

    clientName = clientName || "Valued Client";

    // 3. Rate limiting check (min 30 seconds cooldown between OTP requests)
    const existingOtpTask = await prisma.task.findUnique({
      where: { sourceKey: `client-otp:${cleanPhone}` },
      select: { id: true, metadata: true },
    });

    if (existingOtpTask?.metadata?.lastSentAt) {
      const elapsedMs = Date.now() - new Date(existingOtpTask.metadata.lastSentAt).getTime();
      if (elapsedMs < 30 * 1000) {
        const waitSec = Math.ceil((30 * 1000 - elapsedMs) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${waitSec} seconds before requesting a new OTP.`,
          },
          { status: 429 }
        );
      }
    }

    // 4. Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await hashPassword(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 5. Store OTP in DB Task record with sourceKey
    await prisma.task.upsert({
      where: { sourceKey: `client-otp:${cleanPhone}` },
      create: {
        organizationId,
        title: `Client OTP for ${cleanPhone}`,
        description: `One-time login verification code for ${cleanPhone}`,
        type: "SERVICE_REQUEST",
        status: "OPEN",
        priority: "HIGH",
        module: "CLIENT_PORTAL_SECURITY",
        sourceKey: `client-otp:${cleanPhone}`,
        customerName: clientName,
        customerMobile: cleanPhone,
        metadata: {
          otpHash,
          expiresAt,
          attempts: 0,
          lastSentAt: new Date().toISOString(),
          cleanPhone,
          clientName,
        },
      },
      update: {
        organizationId,
        customerName: clientName,
        metadata: {
          otpHash,
          expiresAt,
          attempts: 0,
          lastSentAt: new Date().toISOString(),
          cleanPhone,
          clientName,
        },
      },
    });

    // 6. Dispatch OTP via WhatsApp (if gateway connected)
    const otpMessage = `Dear ${clientName},

Your BimaHeadquarter verification code is: *${otp}*

This code is valid for 5 minutes. Please do not share this code with anyone.

- Team Bima Headquarter`;

    let dispatchedViaWhatsApp = false;
    try {
      if (organizationId) {
        const accountId = await resolveWhatsAppSender({ organizationId });
        if (accountId) {
          const formattedPhone = `91${cleanPhone}`;
          await dispatchWhatsApp(
            { organizationId, accountId, recipientName: clientName },
            "TEXT",
            formattedPhone,
            otpMessage
          );
          dispatchedViaWhatsApp = true;
        }
      }
    } catch (whatsappErr) {
      console.log(`[WhatsApp OTP Gateway]: Could not deliver via gateway (${whatsappErr.message}). Falling back to SMS.`);
    }

    // 7. Multi-Channel Fallback: SMS Gateway
    let dispatchedViaSms = false;
    if (!dispatchedViaWhatsApp) {
      try {
        const smsApiKey = process.env.SMS_API_KEY || process.env.FAST2SMS_API_KEY;
        if (smsApiKey) {
          await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
              authorization: smsApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              route: "otp",
              variables_values: otp,
              numbers: cleanPhone,
            }),
          });
          dispatchedViaSms = true;
          console.log(`[SMS Gateway]: Dispatched OTP via SMS to ${cleanPhone}`);
        }
      } catch (smsErr) {
        console.warn(`[SMS Gateway]: SMS delivery error (${smsErr.message})`);
      }
    }

    if (process.env.NODE_ENV === "production" && !dispatchedViaWhatsApp && !dispatchedViaSms) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification code delivery service is temporarily unavailable. Please try again or contact support.",
        },
        { status: 503 },
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Client OTP]: Sent OTP to ${cleanPhone} (WhatsApp: ${dispatchedViaWhatsApp}, SMS: ${dispatchedViaSms})`);
    }

    const maskedPhone = `+91 ******${cleanPhone.slice(-4)}`;
    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${maskedPhone}`,
      maskedPhone,
      deliveryChannel: dispatchedViaWhatsApp ? "WHATSAPP" : dispatchedViaSms ? "SMS" : "DEV",
      // Provide dev OTP in non-production for frictionless testing
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("Error sending client OTP:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send verification code. Please try again later." },
      { status: 500 }
    );
  }
}
