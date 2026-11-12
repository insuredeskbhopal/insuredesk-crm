import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { getLocalPhysicalPath } from "@/lib/storage";
import { downloadGoogleDriveFile } from "@/lib/storage/google-drive-storage";
import { ensureDefaultFieldSetup } from "@/lib/policies/field-setup";
import { loadCorrections } from "@/lib/policies/intelligence/trainingMemory";
import {
  getTrainingStudioConfig,
  loadPortableProfiles,
  syncStudioProfilesToCrm,
} from "@/lib/policies/intelligence/trainingStudioClient";
import {
  StudioError,
  autoDetectStudioPreview,
  createStudioBackupJson,
  deleteStudioDocument,
  getStudioDocument,
  getStudioDocumentFile,
  getStudioDocuments,
  getStudioHealth,
  getStudioMetrics,
  getStudioProfiles,
  getStudioRuns,
  getStudioTypes,
  integrateExtractBuffer,
  previewStudioMapping,
  promoteStudioCorrections,
  reviewStudioRun,
  runStudioBatchBenchmark,
  runStudioExtraction,
  saveStudioProfile,
  saveStudioType,
  uploadStudioDocumentBuffer,
} from "@/lib/policies/intelligence/studio/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return { errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  const session = await verifyJWT(token);
  if (!session) {
    return { errorResponse: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  }
  if (session.role === "VIEWER") {
    return {
      errorResponse: NextResponse.json(
        { error: "Access denied. Viewers cannot access or modify PDF Training Studio." },
        { status: 403 },
      ),
    };
  }
  return session;
}

function readCorrectionCountSafe() {
  try {
    const items = loadCorrections();
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

async function resolveUploadedFileBuffer(upload) {
  if (upload.pdfBytes) {
    return Buffer.from(upload.pdfBytes);
  }
  if (upload.storageProvider === "google_drive" && upload.storagePath) {
    return downloadGoogleDriveFile(upload.storagePath);
  }
  if (upload.storagePath) {
    const physical = getLocalPhysicalPath(upload.storagePath);
    return fs.readFile(physical);
  }
  throw new StudioError(404, "Original PDF binary is not available for this upload.");
}

async function getOverviewPayload(session) {
  const tenantWhere = { ...getTenantFilter(session, "read"), deletedAt: null };
  const [portableStore, queueCount, health, metrics] = await Promise.all([
    loadPortableProfiles(),
    prisma.uploadedFile.count({
      where: { ...tenantWhere, status: { in: ["FAILED", "REVIEW_REQUIRED"] } },
    }),
    getStudioHealth(),
    getStudioMetrics(),
  ]);

  const corrections = readCorrectionCountSafe();
  const config = getTrainingStudioConfig();

  return {
    engineOnline: true,
    mode: config.mode,
    liveEnrichmentEnabled: config.enabled,
    health,
    metrics,
    portableStore: {
      updatedAt: portableStore.updatedAt || null,
      typeCount: portableStore.types?.length || 0,
      profileCount: portableStore.profiles?.length || 0,
    },
    correctionCount: corrections.length,
    queueCount,
  };
}

function formatStudioError(error) {
  if (error instanceof StudioError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues?.[0]?.message || "Invalid request payload." },
      { status: 422 },
    );
  }
  console.error("PDF Training Studio API error:", error);
  return NextResponse.json(
    { error: error?.message || "Training Studio request failed." },
    { status: 500 },
  );
}

async function writeTrainingAudit(request, session, action, entityId, metadata = {}) {
  const { ipAddress, userAgent } = getAuditMetadata(request);
  await logAudit({
    action,
    entityType: "TrainingProfile",
    entityId: entityId || null,
    severity: "INFO",
    source: "USER_ACTION",
    ipAddress,
    userAgent,
    userId: session.userId || session.id || null,
    organizationId: session.organizationId || null,
    metadata,
  });
}

export async function GET(request, context) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;

    const params = await context.params;
    const segments = Array.isArray(params?.path) ? params.path : [];
    const subPath = segments.join("/");

    if (!subPath || subPath === "status") {
      return NextResponse.json(await getOverviewPayload(session));
    }

    if (subPath === "health") {
      return NextResponse.json(await getStudioHealth());
    }

    if (subPath === "types") {
      return NextResponse.json(await getStudioTypes());
    }

    if (subPath === "documents") {
      return NextResponse.json(await getStudioDocuments());
    }

    if (segments.length === 2 && segments[0] === "documents") {
      return NextResponse.json(await getStudioDocument(segments[1]));
    }

    if (segments.length === 3 && segments[0] === "documents" && segments[2] === "file") {
      const file = await getStudioDocumentFile(segments[1]);
      return new Response(file.bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
          "Content-Length": String(file.bytes.length),
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    if (subPath === "profiles") {
      return NextResponse.json(await getStudioProfiles());
    }

    if (subPath === "runs") {
      return NextResponse.json(await getStudioRuns());
    }

    if (subPath === "metrics") {
      return NextResponse.json(await getStudioMetrics());
    }

    if (subPath === "backup") {
      const jsonText = await createStudioBackupJson();
      return new Response(jsonText, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="bimaheadquarter-pdf-training-backup.json"`,
        },
      });
    }

    if (subPath === "crm-queue") {
      const { searchParams } = new URL(request.url);
      const includeAll = searchParams.get("all") === "1";
      const where = {
        ...getTenantFilter(session, "read"),
        deletedAt: null,
        ...(includeAll ? {} : { status: { in: ["FAILED", "REVIEW_REQUIRED"] } }),
      };

      const uploads = await prisma.uploadedFile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          sourceFile: true,
          status: true,
          detectedCompanyName: true,
          detectedServiceCategoryName: true,
          detectedPolicyTypeName: true,
          confidenceScore: true,
          errorMessage: true,
          storageProvider: true,
          storagePath: true,
          createdAt: true,
        },
      });

      const corrections = readCorrectionCountSafe();

      return NextResponse.json({
        uploads: uploads.map((u) => ({
          ...u,
          hasFile: Boolean(u.storagePath),
        })),
        recentCorrections: corrections.slice(-25).reverse(),
      });
    }

    if (subPath === "crm-fields") {
      await ensureDefaultFieldSetup();
      const [schemas, fieldDefinitions] = await Promise.all([
        prisma.policySchema.findMany({
          include: {
            policyType: { select: { id: true, name: true, category: true } },
            fields: {
              include: { fieldDefinition: true },
              orderBy: { displayOrder: "asc" },
            },
          },
          take: 25,
        }),
        prisma.fieldDefinition.findMany({
          orderBy: { key: "asc" },
          take: 100,
        }),
      ]);
      return NextResponse.json({ schemas, fieldDefinitions });
    }

    return NextResponse.json({ error: "Unknown Training Studio endpoint." }, { status: 404 });
  } catch (error) {
    return formatStudioError(error);
  }
}

async function handleWrite(request, context, method) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;

    const params = await context.params;
    const segments = Array.isArray(params?.path) ? params.path : [];
    const subPath = segments.join("/");

    if (method === "POST" && subPath === "sync-crm") {
      const summary = await syncStudioProfilesToCrm({
        actorId: session.userId || session.id || null,
      });
      await writeTrainingAudit(request, session, "SYNC_TRAINING_PROFILES_TO_CRM", "portable-profiles", summary);
      return NextResponse.json(summary);
    }

    if (method === "POST" && subPath === "import-upload") {
      const body = await request.json();
      const uploadedFileId = String(body?.uploadedFileId || "").trim();
      const typeId = String(body?.typeId || "").trim();
      const role = body?.role === "heldout" ? "heldout" : "training";
      const allowReuse = Boolean(body?.allowReuse);

      if (!uploadedFileId || !typeId) {
        return NextResponse.json({ error: "uploadedFileId and typeId are required." }, { status: 400 });
      }

      const upload = await prisma.uploadedFile.findFirst({
        where: {
          id: uploadedFileId,
          deletedAt: null,
          ...getTenantFilter(session, "read"),
        },
      });
      if (!upload) {
        return NextResponse.json({ error: "Uploaded file not found." }, { status: 404 });
      }

      const buffer = await resolveUploadedFileBuffer(upload);
      const created = await uploadStudioDocumentBuffer({
        buffer,
        fileName: upload.sourceFile || "policy.pdf",
        typeId,
        role,
        allowReuse,
      });

      await writeTrainingAudit(request, session, "IMPORT_UPLOAD_TO_TRAINING", created?.id || uploadedFileId, {
        uploadedFileId,
        sourceFile: upload.sourceFile,
        typeId,
        role,
      });

      return NextResponse.json(created, { status: 201 });
    }

    if (method === "POST" && subPath === "documents") {
      const form = await request.formData();
      const file = form.get("file");
      const typeId = String(form.get("typeId") || "");
      const role = String(form.get("role") || "training");
      const allowReuse = String(form.get("allowReuse") || "") === "true";

      if (!file || typeof file.arrayBuffer !== "function") {
        return NextResponse.json({ error: "Attach a PDF file." }, { status: 422 });
      }
      const buffer = new Uint8Array(await file.arrayBuffer());
      const created = await uploadStudioDocumentBuffer({
        buffer,
        fileName: file.name || "policy.pdf",
        typeId,
        role,
        allowReuse,
      });
      return NextResponse.json(created, { status: 201 });
    }

    if (method === "DELETE" && segments.length === 2 && segments[0] === "documents") {
      return NextResponse.json(await deleteStudioDocument(segments[1]));
    }

    if (method === "POST" && subPath === "types") {
      const body = await request.json();
      const created = await saveStudioType(body);
      await writeTrainingAudit(request, session, "TRAINING_STUDIO_CREATE_TYPE", created.id, { name: created.name });
      return NextResponse.json(created, { status: 201 });
    }

    if (method === "PUT" && segments.length === 2 && segments[0] === "types") {
      const body = await request.json();
      const updated = await saveStudioType(body, segments[1]);
      await writeTrainingAudit(request, session, "TRAINING_STUDIO_UPDATE_TYPE", updated.id, { name: updated.name });
      return NextResponse.json(updated);
    }

    if (method === "POST" && subPath === "mappings/preview") {
      return NextResponse.json(await previewStudioMapping(await request.json()));
    }

    if (method === "POST" && subPath === "profiles/auto-detect") {
      return NextResponse.json(await autoDetectStudioPreview(await request.json()));
    }

    if (method === "POST" && subPath === "profiles") {
      const created = await saveStudioProfile(await request.json());
      await writeTrainingAudit(request, session, "TRAINING_STUDIO_SAVE_PROFILE", created.id, {
        name: created.name,
        version: created.version,
        typeId: created.typeId,
      });
      return NextResponse.json(created, { status: 201 });
    }

    if (method === "POST" && subPath === "profiles/from-corrections") {
      const created = await promoteStudioCorrections(await request.json());
      await writeTrainingAudit(request, session, "TRAINING_STUDIO_PROMOTE_CORRECTIONS", created.id, {
        name: created.name,
        version: created.version,
      });
      return NextResponse.json(created, { status: 201 });
    }

    if (method === "POST" && subPath === "runs") {
      const body = await request.json();
      const run = await runStudioExtraction({
        profileId: String(body?.profileId || ""),
        documentId: String(body?.documentId || ""),
      });
      return NextResponse.json(run, { status: 201 });
    }

    if (method === "POST" && subPath === "runs/batch") {
      const body = await request.json();
      return NextResponse.json(
        await runStudioBatchBenchmark({ profileId: String(body?.profileId || "") }),
        { status: 201 },
      );
    }

    if (method === "PUT" && segments.length === 3 && segments[0] === "runs" && segments[2] === "review") {
      const reviewed = await reviewStudioRun(segments[1], await request.json());
      await writeTrainingAudit(request, session, "TRAINING_STUDIO_REVIEW_RUN", reviewed.id, {
        documentId: reviewed.documentId,
      });
      return NextResponse.json(reviewed);
    }

    if (method === "POST" && subPath === "v1/extract") {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file.arrayBuffer !== "function") {
        return NextResponse.json({ error: "Attach a PDF file." }, { status: 422 });
      }
      const result = await integrateExtractBuffer({
        buffer: new Uint8Array(await file.arrayBuffer()),
        fileName: file.name || "policy.pdf",
        typeId: String(form.get("typeId") || ""),
        profileId: String(form.get("profileId") || ""),
      });
      if (!result) {
        return NextResponse.json({ error: "No matching saved profile found for this category." }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown or disallowed Training Studio action." }, { status: 404 });
  } catch (error) {
    return formatStudioError(error);
  }
}

export async function POST(request, context) {
  return handleWrite(request, context, "POST");
}

export async function PUT(request, context) {
  return handleWrite(request, context, "PUT");
}

export async function DELETE(request, context) {
  return handleWrite(request, context, "DELETE");
}
