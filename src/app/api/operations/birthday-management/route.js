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
      dob: { not: null },
    };

    const profiles = await prisma.customerProfile.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    const serialized = profiles
      .map(serializeCustomerProfile)
      .filter((p) => Boolean(p.dob));

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
    let importList = body.profiles;

    if (!Array.isArray(importList)) {
      if (body.name && body.phone && body.dob) {
        importList = [
          {
            name: body.name,
            phone: body.phone,
            email: body.email || "",
            dob: body.dob,
          },
        ];
      } else {
        return NextResponse.json(
          { error: "Invalid payload format. Expected list of profiles or single client with name, phone, and dob." },
          { status: 400 },
        );
      }
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
          alternatePhone: row.alternatePhone || row.alternateMobile || "",
          email: row.email,
          dob: row.dob,
          referenceSource: row.referenceSource || row.lob || row.lineOfBusiness || "",
          remarks: row.remarks || row.remark || "",
        });

        const normalizedPhone = normalizeIndianPhone(sanitized.phone);
        if (!normalizedPhone) {
          errors.push(`Row ${i + 1}: Phone number '${row.phone}' is not a valid 10-digit Indian number.`);
          continue;
        }

        // Check if phone number matches an existing profile with same/similar name
        const candidates = await prisma.customerProfile.findMany({
          where: {
            deletedAt: null,
            phone: normalizedPhone,
            organizationId: session.organizationId,
          },
        });

        let existing = null;
        if (candidates.length > 0) {
          const nameLower = sanitized.name.toLowerCase().trim();
          existing = candidates.find(c => c.name.toLowerCase().trim() === nameLower);
          if (!existing) {
            existing = candidates.find(c => {
              const cLower = c.name.toLowerCase().trim();
              return cLower.includes(nameLower) || nameLower.includes(cLower);
            });
          }
          if (!existing && candidates.length === 1) {
            const single = candidates[0];
            const corporateKeywords = /\b(warehouse|pvt|ltd|limited|corp|corporation|co\.|company|inc|associates|enterprises|industries|mpwlc)\b/i;
            if (corporateKeywords.test(single.name) || single.name === "Unnamed Customer") {
              existing = single;
            }
          }
        }

        if (existing) {
          // Update existing profile's DOB, email, and name (if name was unnamed previously)
          const dataToUpdate = {
            dob: sanitized.dob,
            updatedById: actorId,
          };
          if (sanitized.alternatePhone && !existing.alternatePhone) {
            dataToUpdate.alternatePhone = sanitized.alternatePhone;
          }
          if (sanitized.referenceSource && !existing.referenceSource) {
            dataToUpdate.referenceSource = sanitized.referenceSource;
          }
          if (sanitized.remarks) {
            dataToUpdate.remarks = existing.remarks ? `${existing.remarks}; ${sanitized.remarks}` : sanitized.remarks;
          }
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
          // Create a new profile (either new phone or family member on existing phone)
          const record = await prisma.customerProfile.create({
            data: {
              name: sanitized.name,
              phone: normalizedPhone,
              alternatePhone: sanitized.alternatePhone || "",
              email: sanitized.email,
              dob: sanitized.dob,
              referenceSource: sanitized.referenceSource || "Birthday Import",
              remarks: sanitized.remarks || (candidates.length > 0 ? `Shared phone with ${candidates[0].name}` : ""),
              status: "Existing Customer",
              customerType: "Existing",
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

    if (importList.length === 1 && errors.length > 0 && createdCount === 0 && updatedCount === 0) {
      return NextResponse.json({ error: errors[0].replace(/^Row 1:\s*/, "") }, { status: 400 });
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

export async function PATCH(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;
    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { profileId, dob } = await request.json();
    const sanitized = sanitizeCustomerProfilePayload({ dob });
    if (!profileId || !sanitized.dob) {
      return NextResponse.json({ error: "A valid customer and date of birth are required." }, { status: 400 });
    }

    const existing = await prisma.customerProfile.findFirst({
      where: {
        id: profileId,
        ...getCustomerProfileScopedFilter(session),
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Customer profile not found." }, { status: 404 });
    }

    const actorId = session.userId || session.id;
    const profile = await prisma.customerProfile.update({
      where: { id: existing.id },
      data: { dob: sanitized.dob, updatedById: actorId },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CUSTOMER_PROFILE_UPDATE",
      entityType: "CustomerProfile",
      entityId: profile.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { dobUpdated: sanitized.dob, isBirthdayManagement: true },
    });

    return NextResponse.json(serializeCustomerProfile(profile));
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Failed to update date of birth.") },
      { status: 500 },
    );
  }
}
