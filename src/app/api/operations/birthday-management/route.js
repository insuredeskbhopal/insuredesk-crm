import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getCustomerProfileScopedFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import {
  normalizeIndianPhone,
  sanitizeCustomerProfilePayload,
  serializeCustomerProfile,
} from "@/lib/customer-profiles/utils";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";

export const runtime = "nodejs";

async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session) {
    return { errorResponse: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  }
  return session;
}

export async function GET(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;

    const ownProfileFilter = getCustomerProfileScopedFilter(session);
    const where = {
      ...ownProfileFilter,
      deletedAt: null,
    };

    const profiles = await prisma.customerProfile.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    const serialized = profiles.map(serializeCustomerProfile);

    return NextResponse.json({
      profiles: serialized,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Failed to load birthdays.") },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;
    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { profiles: importList } = body;

    if (!Array.isArray(importList)) {
      return NextResponse.json({ error: "Invalid payload format. Expected list of profiles." }, { status: 400 });
    }

    const actorId = session.userId || session.id;
    const actorLabel = session.name || session.email || "";
    
    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];

    const { ipAddress, userAgent } = getAuditMetadata(request);

    // Process in transaction or loop with safety
    for (let i = 0; i < importList.length; i++) {
      const row = importList[i];
      try {
        const sanitized = sanitizeCustomerProfilePayload({
          name: row.name || "Unnamed Customer",
          phone: row.phone,
          email: row.email,
          dob: row.dob,
        });

        const normalizedPhone = normalizeIndianPhone(sanitized.phone);
        if (!normalizedPhone) {
          errors.push(`Row ${i + 1}: Phone number '${row.phone}' is not a valid 10-digit Indian number.`);
          continue;
        }

        // Check if phone number already exists for this organization/user scope
        const existing = await prisma.customerProfile.findFirst({
          where: {
            deletedAt: null,
            phone: normalizedPhone,
            organizationId: session.organizationId,
          },
        });

        if (existing) {
          // Update existing profile's DOB, email, and name (if name was unnamed previously)
          const dataToUpdate = {
            dob: sanitized.dob,
            updatedById: actorId,
          };
          if (sanitized.email && sanitized.email !== existing.email) {
            dataToUpdate.email = sanitized.email;
          }
          if (sanitized.name && sanitized.name !== "Unnamed Customer" && (!existing.name || existing.name === "Unnamed Customer")) {
            dataToUpdate.name = sanitized.name;
          }

          await prisma.customerProfile.update({
            where: { id: existing.id },
            data: dataToUpdate,
          });

          await logAudit({
            action: "CUSTOMER_PROFILE_UPDATE",
            entityType: "CustomerProfile",
            entityId: existing.id,
            severity: "INFO",
            source: "API",
            ipAddress,
            userAgent,
            userId: actorId,
            organizationId: session.organizationId,
            metadata: {
              phone: normalizedPhone,
              dobImported: sanitized.dob,
              isBirthdayImport: true,
            },
          });

          updatedCount++;
        } else {
          // Create a new profile
          const record = await prisma.customerProfile.create({
            data: {
              name: sanitized.name,
              phone: normalizedPhone,
              email: sanitized.email,
              dob: sanitized.dob,
              status: "New Lead",
              organizationId: session.organizationId,
              createdById: actorId,
              updatedById: actorId,
              assignedTo: actorLabel,
            },
          });

          await logAudit({
            action: "CUSTOMER_PROFILE_CREATE",
            entityType: "CustomerProfile",
            entityId: record.id,
            severity: "INFO",
            source: "API",
            ipAddress,
            userAgent,
            userId: actorId,
            organizationId: session.organizationId,
            metadata: {
              phone: normalizedPhone,
              dobImported: sanitized.dob,
              isBirthdayImport: true,
            },
          });

          createdCount++;
        }
      } catch (rowErr) {
        errors.push(`Row ${i + 1}: ${rowErr.message || "Failed to process record."}`);
      }
    }

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Failed to import client birthdays.") },
      { status: 500 },
    );
  }
}
