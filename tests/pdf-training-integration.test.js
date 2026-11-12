/* @vitest-environment node */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  verifyJWTMock,
  uploadedFileCountMock,
  uploadedFileFindManyMock,
  fieldDefinitionFindManyMock,
  fieldDefinitionUpdateMock,
  auditLogCreateMock,
  auditLogFindFirstMock,
  ensureDefaultFieldSetupMock,
  loadCorrectionsMock,
} = vi.hoisted(() => ({
  verifyJWTMock: vi.fn(),
  uploadedFileCountMock: vi.fn(),
  uploadedFileFindManyMock: vi.fn(),
  fieldDefinitionFindManyMock: vi.fn(),
  fieldDefinitionUpdateMock: vi.fn(),
  auditLogCreateMock: vi.fn(),
  auditLogFindFirstMock: vi.fn(),
  ensureDefaultFieldSetupMock: vi.fn(),
  loadCorrectionsMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyJWT: verifyJWTMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    uploadedFile: {
      count: uploadedFileCountMock,
      findMany: uploadedFileFindManyMock,
      findFirst: vi.fn(),
    },
    policySchema: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    fieldDefinition: {
      findMany: fieldDefinitionFindManyMock,
      update: fieldDefinitionUpdateMock,
    },
    auditLog: {
      create: auditLogCreateMock,
      findFirst: auditLogFindFirstMock,
    },
  },
}));

vi.mock("@/lib/policies/field-setup", () => ({
  ensureDefaultFieldSetup: ensureDefaultFieldSetupMock,
}));

vi.mock("@/lib/policies/intelligence/trainingMemory", () => ({
  loadCorrections: loadCorrectionsMock,
}));

import {
  enrichWithTrainedProfiles,
  extractFromPortableStore,
  syncSidecarProfilesToCrm,
} from "../src/lib/policies/intelligence/trainingStudioClient";
import { extractPolicyDataFromTextResult } from "../src/lib/policies/extraction-pipeline";
import { GET, POST } from "../src/app/api/operations/pdf-training/[[...path]]/route";

function makeRequest(url, { method = "GET", cookieToken = "", body } = {}) {
  const headers = new globalThis.Headers();
  if (body && !(body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }
  return {
    url,
    method,
    headers,
    cookies: {
      get: (name) => (name === "token" && cookieToken ? { value: cookieToken } : undefined),
    },
    json: async () => (typeof body === "string" ? JSON.parse(body) : body),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body ?? {})),
    formData: async () => body,
  };
}

describe("Native PDF Training Studio Integration & Safety", () => {
  const originalPortablePath = process.env.PIE_PORTABLE_PROFILES_PATH;

  afterEach(() => {
    if (originalPortablePath === undefined) delete process.env.PIE_PORTABLE_PROFILES_PATH;
    else process.env.PIE_PORTABLE_PROFILES_PATH = originalPortablePath;
    vi.clearAllMocks();
  });

  it("enforces authentication and blocks VIEWER on Training Studio API", async () => {
    const unauthRes = await GET(makeRequest("http://localhost/api/operations/pdf-training/status"), {
      params: Promise.resolve({ path: ["status"] }),
    });
    expect(unauthRes.status).toBe(401);

    verifyJWTMock.mockResolvedValue({ userId: "u1", role: "VIEWER", organizationId: "org1" });
    const viewerGet = await GET(
      makeRequest("http://localhost/api/operations/pdf-training/status", { cookieToken: "tok" }),
      { params: Promise.resolve({ path: ["status"] }) },
    );
    expect(viewerGet.status).toBe(403);

    const viewerPost = await POST(
      makeRequest("http://localhost/api/operations/pdf-training/sync-crm", {
        method: "POST",
        cookieToken: "tok",
      }),
      { params: Promise.resolve({ path: ["sync-crm"] }) },
    );
    expect(viewerPost.status).toBe(403);
  });

  it("runs status & crm-queue in-process without any port 3005 sidecar", async () => {
    verifyJWTMock.mockResolvedValue({ userId: "admin1", role: "ADMIN", organizationId: "org1" });
    uploadedFileCountMock.mockResolvedValue(4);
    uploadedFileFindManyMock.mockResolvedValue([
      {
        id: "u1",
        sourceFile: "failed-warehouse.pdf",
        status: "FAILED",
        detectedCompanyName: "ICICI Lombard",
        detectedServiceCategoryName: "Warehouse",
        detectedPolicyTypeName: "Fire Policy",
        confidenceScore: 0.4,
        errorMessage: "Missing sum insured",
        storageProvider: "local",
        storagePath: "2026/11/test.pdf",
        createdAt: new Date("2026-11-12T10:00:00Z"),
      },
    ]);
    loadCorrectionsMock.mockReturnValue([{ id: "c1" }]);

    const statusRes = await GET(
      makeRequest("http://localhost/api/operations/pdf-training/status", { cookieToken: "tok" }),
      { params: Promise.resolve({ path: ["status"] }) },
    );
    expect(statusRes.status).toBe(200);
    const statusBody = await statusRes.json();
    expect(statusBody.engineOnline).toBe(true);
    expect(statusBody.mode).toBe("native-in-process");
    expect(statusBody.queueCount).toBe(4);
    expect(statusBody.correctionCount).toBe(1);

    const queueRes = await GET(
      makeRequest("http://localhost/api/operations/pdf-training/crm-queue", { cookieToken: "tok" }),
      { params: Promise.resolve({ path: ["crm-queue"] }) },
    );
    expect(queueRes.status).toBe(200);
    const queueBody = await queueRes.json();
    expect(queueBody.uploads).toHaveLength(1);
    expect(queueBody.uploads[0].hasFile).toBe(true);
  });

  it("never modifies Motor extraction even when profiles exist", async () => {
    const motorResult = await enrichWithTrainedProfiles({
      rawText: "Private Car Package Policy Registration No MP09AB1234",
      currentData: { documentCategory: "Motor Insurance", policyType: "Private Car", insuredName: "" },
      resolvedCategory: "Motor Insurance",
      sourceFile: "motor.pdf",
    });

    expect(motorResult.source).toBe("skipped_motor_isolation");
    expect(motorResult.appliedFields).toEqual([]);
    expect(motorResult.addedFields).toEqual({});
  });

  it("fills ONLY missing fields from portable trained profile without overwriting valid CRM fields", () => {
    const store = {
      profiles: [
        {
          id: "prof-wh-1",
          typeId: "warehouse",
          name: "Warehouse Universal Profile",
          version: 3,
          mappings: {
            insuredName: { anchor: "Insured Name", relation: "same-line", stopLabels: ["Policy No"] },
            sumInsured: { anchor: "Total Sum Insured", relation: "same-line", stopLabels: ["Premium"] },
            riskLocation: { anchor: "Risk Location", relation: "next-line", stopLabels: [] },
          },
        },
      ],
    };

    const rawText = [
      "Insured Name: SHRI KRISHNA WAREHOUSE A/C MPWLC Policy No: 1030/451873903/00/000",
      "Total Sum Insured: 4,50,00,000 Premium: 12,500",
      "Risk Location:",
      "KHASRA NO 144 VILLAGE SANWER ROAD INDORE MP",
    ].join("\n");

    const currentData = {
      documentCategory: "Warehouse Insurance",
      insuredName: "EXISTING VALID INSURED NAME",
      sumInsured: "",
      riskLocation: "",
    };

    const { addedFields, profile } = extractFromPortableStore({
      store,
      rawText,
      resolvedCategory: "Warehouse Insurance",
      currentData,
    });

    expect(profile?.version).toBe(3);
    expect(addedFields.insuredName).toBeUndefined();
    expect(addedFields.sumInsured).toBe("4,50,00,000");
    expect(addedFields.riskLocation).toBe("KHASRA NO 144 VILLAGE SANWER ROAD INDORE MP");
  });

  it("syncs built-in studio profiles to portable JSON and merges FieldDefinition aliases additively", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "bhq-portable-"));
    const portableFile = path.join(tmpDir, "portable-profiles.json");
    process.env.PIE_PORTABLE_PROFILES_PATH = portableFile;

    fieldDefinitionFindManyMock.mockResolvedValue([{ id: "fd-1", aliases: ["Sum Insured"] }]);
    fieldDefinitionUpdateMock.mockResolvedValue({});

    const summary = await syncSidecarProfilesToCrm({ actorId: "admin1" });
    expect(summary.typeCount).toBeGreaterThanOrEqual(5);
    expect(summary.profileCount).toBeGreaterThan(0);

    const savedJson = JSON.parse(await fs.readFile(portableFile, "utf8"));
    expect(savedJson.types.length).toBeGreaterThanOrEqual(5);
    expect(savedJson.profiles.length).toBeGreaterThan(0);
    expect(fieldDefinitionUpdateMock).toHaveBeenCalled();
  });

  it("keeps bulk upload extraction pipeline working cleanly with native enrichment", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "bhq-pipeline-"));
    process.env.PIE_PORTABLE_PROFILES_PATH = path.join(tmpDir, "missing.json");

    const result = await extractPolicyDataFromTextResult({
      sourceFile: "warehouse-test.pdf",
      pdfBuffer: Buffer.from("%PDF-1.4\n"),
      textResult: {
        extractionMethod: "pdf-parse",
        ocrAttempted: false,
        rawText: [
          "ICICI Lombard General Insurance Company Limited",
          "Bharat Sookshma Udyam Suraksha",
          "Policy No: 1030/451873903/00/000",
          "Insured Name: TEST WAREHOUSE A/C MPWLC",
          "Period of Insurance: From 01/04/2026 To 31/03/2027",
          "Total Sum Insured: 1,00,00,000",
        ].join("\n"),
      },
    });

    expect(result.data.policyNumber).toBe("1030/451873903/00/000");
    expect(result.data.insuranceCompany).toContain("ICICI Lombard");
    expect(result.data.extractionQuality.trainingStudio).toBeDefined();
  });
});
