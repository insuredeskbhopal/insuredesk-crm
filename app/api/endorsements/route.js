import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import {
  endorsementInclude,
  generateEndorsementNumber,
  getEndorsementWhere,
  getSummary,
  requireEndorsementSession,
  sanitizeEndorsementPayload,
  serializeEndorsement
} from "./utils";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const auth = await requireEndorsementSession(request);
    if (auth.response) return auth.response;
    const { session } = auth;

    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "").trim();
    const status = String(searchParams.get("status") || "").trim();
    const type = String(searchParams.get("type") || "").trim();
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"), true);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100", 10), 1), 500);
    const skip = (page - 1) * limit;

    const where = getEndorsementWhere(session, "read");
    const andFilters = [];

    if (q) {
      andFilters.push({
        OR: [
          { endorsementNo: { contains: q, mode: "insensitive" } },
          { policyNo: { contains: q, mode: "insensitive" } },
          { insuredName: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { insuranceCompany: { contains: q, mode: "insensitive" } },
          { policyType: { contains: q, mode: "insensitive" } },
          { endorsementType: { contains: q, mode: "insensitive" } },
          { remark: { contains: q, mode: "insensitive" } }
        ]
      });
    }

    if (status && status !== "All") andFilters.push({ status });
    if (type && type !== "All") andFilters.push({ endorsementType: type });
    if (from || to) {
      andFilters.push({
        endorsementDate: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {})
        }
      });
    }
    if (andFilters.length) where.AND = andFilters;

    const [endorsements, total, summaryRows] = await Promise.all([
      prisma.endorsement.findMany({
        where,
        include: endorsementInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.endorsement.count({ where }),
      prisma.endorsement.findMany({
        where,
        select: { status: true },
        take: 10000
      })
    ]);

    return NextResponse.json({
      endorsements: endorsements.map(serializeEndorsement),
      summary: getSummary(summaryRows),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Endorsements could not be loaded." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireEndorsementSession(request, true);
    if (auth.response) return auth.response;
    const { session } = auth;
    const actorId = session.userId || session.id || null;

    const payload = await request.json();
    const data = sanitizeEndorsementPayload(payload);
    if (!data.insuredName || !data.endorsementType) {
      return NextResponse.json({ error: "Insured name and endorsement type are required." }, { status: 422 });
    }
    const links = await resolveEndorsementLinks(session, data);

    const record = await prisma.endorsement.create({
      data: {
        ...data,
        policyId: links.policyId,
        customerId: links.customerId,
        endorsementNo: data.endorsementNo || generateEndorsementNumber(),
        organizationId: session.organizationId,
        createdById: actorId,
        updatedById: actorId,
        documents: {
          create: buildDocumentsFromPayload(data, actorId)
        }
      },
      include: endorsementInclude
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "ENDORSEMENT_CREATE",
      entityType: "Endorsement",
      entityId: record.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { endorsementNo: record.endorsementNo, policyNo: record.policyNo, status: record.status }
    });

    return NextResponse.json(serializeEndorsement(record), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Endorsement could not be saved." }, { status: 500 });
  }
}

function buildDocumentsFromPayload(data, actorId) {
  const documents = [];
  if (data.generatedLetterPdfUrl) {
    documents.push({
      documentType: "Generated Letter",
      fileName: data.generatedLetterFileName || `${data.endorsementNo || "endorsement"}-letter.pdf`,
      fileType: "application/pdf",
      dataUrl: data.generatedLetterPdfUrl,
      uploadedById: actorId
    });
  }
  if (data.insuranceCompanyLetterPdfUrl) {
    documents.push({
      documentType: "Insurance Company Letter",
      fileName: data.insuranceCompanyLetterFileName || `${data.endorsementNo || "endorsement"}-company-letter.pdf`,
      fileType: "application/pdf",
      dataUrl: data.insuranceCompanyLetterPdfUrl,
      uploadedById: actorId
    });
  }
  return documents;
}

function parseDate(value, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

async function resolveEndorsementLinks(session, data) {
  const tenantFilter = {
    organizationId: session.role === "SUPER_ADMIN" ? undefined : session.organizationId,
    deletedAt: null
  };
  const cleanTenantFilter = Object.fromEntries(Object.entries(tenantFilter).filter(([, value]) => value !== undefined));

  let policyId = data.policyId;
  if (!policyId && data.policyNo) {
    const policy = await prisma.policyRecord.findFirst({
      where: {
        ...cleanTenantFilter,
        OR: [
          { reviewedData: { path: ["policyNumber"], equals: data.policyNo } },
          { data: { path: ["policyNumber"], equals: data.policyNo } }
        ]
      },
      select: { id: true }
    });
    policyId = policy?.id || null;
  }

  let customerId = data.customerId;
  if (!customerId && (data.customerName || data.insuredName)) {
    const customer = await prisma.customerProfile.findFirst({
      where: {
        ...cleanTenantFilter,
        name: { contains: data.customerName || data.insuredName, mode: "insensitive" }
      },
      select: { id: true }
    });
    customerId = customer?.id || null;
  }

  return { policyId, customerId };
}
