import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import {
  isValidClientEmail,
  sanitizeClientAccountPayload,
  serializeClientAccount,
} from "@/lib/client-accounts/utils";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { withClientIdLock, withClientPhoneLock } from "@/lib/client-accounts/server";
import { generateTemporaryClientMpin, provisionClientMpin } from "@/lib/client-portal/credentials";
import { resolveWhatsAppSender } from "@/lib/whatsapp/account-access";
import { dispatchWhatsApp } from "@/lib/whatsapp/dispatch";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const session = await requireStaffSession(request);
    if (session.response) return session.response;

    const { id } = await params;
    const account = await prisma.clientAccount.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read"),
        deletedAt: null,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Client account not found." }, { status: 404 });
    }

    return NextResponse.json(serializeClientAccount(account));
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Client account could not be loaded.") },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await requireStaffSession(request);
    if (session.response) return session.response;
    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.clientAccount.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read"),
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client account not found." }, { status: 404 });
    }

    const rawBody = await request.json();
    const allowSharedPhone = Boolean(rawBody?.allowSharedPhone);
    const data = sanitizeClientAccountPayload(rawBody);
    if (!data.name || !data.phone || normalizeIndianPhone(data.phone) !== data.phone) {
      return NextResponse.json(
        { error: "Please enter client name and a valid 10-digit Indian mobile number." },
        { status: 400 },
      );
    }
    if (!isValidClientEmail(data.email)) {
      return NextResponse.json({ error: "Please enter a valid client email address." }, { status: 400 });
    }
    if (allowSharedPhone && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can share a phone number across multiple Client IDs." },
        { status: 403 },
      );
    }

    const actorId = session.userId || session.id;
    const result = await withClientPhoneLock(existing.organizationId, data.phone, async (database) => {
      if (!allowSharedPhone) {
        const duplicate = await database.clientAccount.findFirst({
          where: {
            organizationId: existing.organizationId,
            deletedAt: null,
            phone: data.phone,
            NOT: { id },
          },
          include: {
            createdBy: { select: { name: true, email: true } },
            updatedBy: { select: { name: true, email: true } },
          },
        });
        if (duplicate) return { duplicate };
      }

      return withClientIdLock(
        id,
        async (lockedDatabase) => {
          const current = await lockedDatabase.clientAccount.findFirst({
            where: { id, organizationId: existing.organizationId, deletedAt: null },
            select: { id: true },
          });
          if (!current) return { notFound: true };
          const account = await lockedDatabase.clientAccount.update({
            where: { id },
            data: {
              ...data,
              updatedById: actorId,
            },
            include: {
              createdBy: { select: { name: true, email: true } },
              updatedBy: { select: { name: true, email: true } },
            },
          });
          return { account };
        },
        database,
      );
    });

    if (result.duplicate) {
      return NextResponse.json(
        {
          error: "This phone number already has a Client ID.",
          profile: serializeClientAccount(result.duplicate),
        },
        { status: 409 },
      );
    }
    if (result.notFound) {
      return NextResponse.json({ error: "Client account not found." }, { status: 404 });
    }

    const account = result.account;

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CLIENT_ACCOUNT_UPDATE",
      entityType: "ClientAccount",
      entityId: account.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { phone: account.phone },
    });

    return NextResponse.json(serializeClientAccount(account));
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Client account could not be updated.") },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await requireStaffSession(request);
    if (session.response) return session.response;
    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action || "RESET_MPIN";
    if (action !== "SEND_CREDENTIALS" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admin can reset a client MPIN." }, { status: 403 });
    }

    const { id } = await params;
    const account = await prisma.clientAccount.findFirst({
      where: { id, ...getTenantFilter(session, "read"), deletedAt: null },
      select: { id: true, clientCode: true, name: true, phone: true, organizationId: true },
    });
    if (!account) {
      return NextResponse.json({ error: "Client account not found." }, { status: 404 });
    }

    const actorId = session.userId || session.id;
    let temporaryMpin = null;
    if (action !== "SEND_CREDENTIALS" || (body?.resetMpin && session.role === "SUPER_ADMIN")) {
      temporaryMpin = generateTemporaryClientMpin();
      await provisionClientMpin(account, temporaryMpin);
    }

    let whatsappSent = false;
    let whatsappError = "";
    const shouldSendWhatsApp = action === "SEND_CREDENTIALS" || Boolean(body?.sendWhatsApp);
    if (shouldSendWhatsApp) {
      const targetPhone = normalizeIndianPhone(body?.recipientPhone || account.phone || "");
      if (!targetPhone) {
        whatsappError = "Valid 10-digit mobile number is required to send WhatsApp credentials.";
      } else {
        try {
          const senderAccountId = await resolveWhatsAppSender({
            userId: actorId,
            organizationId: account.organizationId,
          });
          const portalUrl = `${(process.env.NEXT_PUBLIC_APP_URL || "https://bimaheadquarter.com").replace(/\/$/, "")}/login`;
          const codeText = account.clientCode || account.id;
          const mpinLine = temporaryMpin
            ? `*Temporary MPIN:* ${temporaryMpin}\n_(You will be asked to set your personal MPIN after login)_`
            : `*Login Options:* Use your Mobile/Client ID with your MPIN, or verify via OTP on first login`;
          const text = [
            `Hello ${account.name},`,
            "",
            `Your *Bima Headquarter* Client Portal access details:`,
            `*Client ID:* ${codeText}`,
            `*Registered Mobile:* ${account.phone}`,
            mpinLine,
            `*Portal Link:* ${portalUrl}`,
          ].join("\n");
          await dispatchWhatsApp(
            {
              userId: actorId,
              organizationId: account.organizationId,
              accountId: senderAccountId,
              recipientName: account.name,
            },
            "TEXT",
            `91${targetPhone}`,
            text,
          );
          whatsappSent = true;
        } catch (waErr) {
          whatsappError = waErr?.message || "Failed to send WhatsApp message.";
        }
      }
      if (action === "SEND_CREDENTIALS" && !whatsappSent) {
        return NextResponse.json({ error: whatsappError || "WhatsApp could not be sent." }, { status: 502 });
      }
    }

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: action === "SEND_CREDENTIALS" ? "CLIENT_CREDENTIALS_WHATSAPP" : "CLIENT_MPIN_RESET",
      entityType: "ClientAccount",
      entityId: account.id,
      severity: temporaryMpin ? "WARNING" : "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: {
        credentialRotated: Boolean(temporaryMpin),
        whatsappSent,
      },
    });

    return NextResponse.json({
      success: true,
      clientId: account.id,
      clientCode: account.clientCode || "",
      ...(temporaryMpin ? { temporaryMpin } : {}),
      ...(shouldSendWhatsApp ? { whatsappSent, ...(whatsappError ? { whatsappError } : {}) } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Client MPIN could not be reset.") },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireStaffSession(request);
    if (session.response) return session.response;
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admin can delete client accounts." }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.clientAccount.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read"),
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client account not found." }, { status: 404 });
    }

    const actorId = session.userId || session.id;
    const result = await withClientIdLock(existing.id, async (database) => {
      const current = await database.clientAccount.findFirst({
        where: { id: existing.id, organizationId: existing.organizationId, deletedAt: null },
      });
      if (!current) return { notFound: true };

      const [linkedPolicies, linkedClaim, linkedRequest] = await Promise.all([
        database.$queryRaw`
          SELECT pr.id
          FROM pdf_records pr
          CROSS JOIN (SELECT ${current.organizationId}::uuid AS org_id, ${current.id}::text AS target_id) v
          WHERE pr.deleted_at IS NULL
            AND pr.organization_id IS NOT DISTINCT FROM v.org_id
            AND (
              LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(v.target_id)
              OR LOWER(COALESCE(pr.client_account_id::text, '')) = LOWER(v.target_id)
            )
          LIMIT 1
        `,
        database.claim.findFirst({
          where: {
            organizationId: current.organizationId,
            deletedAt: null,
            metadata: { path: ["customerId"], equals: current.id },
          },
          select: { id: true },
        }),
        database.task.findFirst({
          where: {
            organizationId: current.organizationId,
            module: { in: ["CLIENT_PORTAL", "CLIENT_ID_REQUEST"] },
            recordId: current.id,
          },
          select: { id: true },
        }),
      ]);
      if (linkedPolicies.length || linkedClaim || linkedRequest) return { linked: true };

      const account = await database.clientAccount.update({
        where: { id: current.id },
        data: {
          deletedAt: new Date(),
          googleEmail: null,
          updatedById: actorId,
        },
        include: {
          createdBy: { select: { name: true, email: true } },
          updatedBy: { select: { name: true, email: true } },
        },
      });
      return { account };
    });
    if (result.notFound) {
      return NextResponse.json({ error: "Client account not found." }, { status: 404 });
    }
    if (result.linked) {
      return NextResponse.json(
        { error: "This Client ID has linked portal records and cannot be deleted." },
        { status: 409 },
      );
    }
    const account = result.account;

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CLIENT_ACCOUNT_DELETE",
      entityType: "ClientAccount",
      entityId: account.id,
      severity: "WARNING",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { phone: account.phone },
    });

    return NextResponse.json({ success: true, profile: serializeClientAccount(account) });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Client account could not be deleted.") },
      { status: 500 },
    );
  }
}

async function requireStaffSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session || session.role === "CLIENT") {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }
  return session;
}
