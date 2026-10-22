import { describe, expect, it, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";

const { prismaMock, verifyJWTMock } = vi.hoisted(() => ({
  prismaMock: {
    policyRecord: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customerProfile: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
  verifyJWTMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyJWT: verifyJWTMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

import { GET, POST } from "../src/app/api/renewals/import/route.js";

describe("Renewal Import System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockImplementation((token) => {
      if (token === "valid-jwt-token") {
        return Promise.resolve({
          userId: "user-123",
          role: "AGENT",
          organizationId: "org-123",
        });
      }
      return Promise.resolve(null);
    });

    prismaMock.policyRecord.findMany.mockResolvedValue([]);
    prismaMock.policyRecord.create.mockResolvedValue({ id: "rec-1" });
    prismaMock.customerProfile.findFirst.mockResolvedValue(null);
    prismaMock.customerProfile.create.mockResolvedValue({ id: "cust-1" });
    prismaMock.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  describe("GET /api/renewals/import (Template Download)", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockRequest = {
        cookies: {
          get: () => null,
        },
      };

      const response = await GET(mockRequest);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toMatch(/not authenticated/i);
    });

    it("generates an Excel spreadsheet with the correct column headers and sample rows", async () => {
      const mockRequest = {
        url: "http://localhost:3000/api/renewals/import?template=true&format=xlsx",
        cookies: {
          get: (name) => (name === "token" ? { value: "valid-jwt-token" } : null),
        },
      };

      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
      expect(response.headers.get("Content-Disposition")).toContain('filename="renewal_import_template.xlsx"');

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const workbook = XLSX.read(buffer, { type: "buffer" });

      expect(workbook.SheetNames).toContain("Renewal Template");
      const sheet = workbook.Sheets["Renewal Template"];
      const rows = XLSX.utils.sheet_to_json(sheet);

      expect(rows.length).toBeGreaterThanOrEqual(1);
      const sampleRow = rows[0];

      // Verify all essential standard headers are present
      expect(sampleRow).toHaveProperty("Policy Number");
      expect(sampleRow).toHaveProperty("Insured Name");
      expect(sampleRow).toHaveProperty("Contact Number");
      expect(sampleRow).toHaveProperty("Insurance Company");
      expect(sampleRow).toHaveProperty("Policy Type");
      expect(sampleRow).toHaveProperty("Expiry Date");
      expect(sampleRow).toHaveProperty("Gross Premium");
      expect(sampleRow).toHaveProperty("Registration Number");
      expect(sampleRow).toHaveProperty("Make / Model");
      expect(sampleRow).toHaveProperty("Remark");
      expect(sampleRow).toHaveProperty("Status");
    });

    it("generates a CSV template when format=csv is requested", async () => {
      const mockRequest = {
        url: "http://localhost:3000/api/renewals/import?template=true&format=csv",
        cookies: {
          get: (name) => (name === "token" ? { value: "valid-jwt-token" } : null),
        },
      };

      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/csv");
      expect(response.headers.get("Content-Disposition")).toContain('filename="renewal_import_template.csv"');

      const csvText = await response.text();
      expect(csvText).toContain("Policy Number");
      expect(csvText).toContain("Insured Name");
      expect(csvText).toContain("Gross Premium");
    });

    it("generates category-optimized templates for motor, health, and warehouse", async () => {
      // Motor category
      const motorReq = {
        url: "http://localhost:3000/api/renewals/import?template=true&format=csv&category=motor",
        cookies: {
          get: (name) => (name === "token" ? { value: "valid-jwt-token" } : null),
        },
      };
      const motorRes = await GET(motorReq);
      expect(motorRes.status).toBe(200);
      expect(motorRes.headers.get("Content-Disposition")).toContain('filename="renewal_import_template_motor.csv"');
      const motorCsv = await motorRes.text();
      expect(motorCsv).toContain("Commercial Vehicle");

      // Health category
      const healthReq = {
        url: "http://localhost:3000/api/renewals/import?template=true&format=csv&category=health",
        cookies: {
          get: (name) => (name === "token" ? { value: "valid-jwt-token" } : null),
        },
      };
      const healthRes = await GET(healthReq);
      expect(healthRes.status).toBe(200);
      expect(healthRes.headers.get("Content-Disposition")).toContain('filename="renewal_import_template_health.csv"');
      const healthCsv = await healthRes.text();
      expect(healthCsv).toContain("Family Health Optima");

      // Warehouse category
      const warehouseReq = {
        url: "http://localhost:3000/api/renewals/import?template=true&format=csv&category=warehouse",
        cookies: {
          get: (name) => (name === "token" ? { value: "valid-jwt-token" } : null),
        },
      };
      const warehouseRes = await GET(warehouseReq);
      expect(warehouseRes.status).toBe(200);
      expect(warehouseRes.headers.get("Content-Disposition")).toContain('filename="renewal_import_template_warehouse.csv"');
      const warehouseCsv = await warehouseRes.text();
      expect(warehouseCsv).toContain("Warehouse Policy");
    });
  });

  describe("POST /api/renewals/import (Batch & Studio Import)", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockRequest = {
        headers: { get: () => "application/json" },
        cookies: {
          get: () => null,
        },
      };

      const response = await POST(mockRequest);
      expect(response.status).toBe(401);
    });

    it("accepts JSON records array from Spreadsheet Studio and imports successfully", async () => {
      const sampleRecords = [
        {
          policyNumber: "45140031250100007692",
          insuredName: "VIJAY KUMAR MISHRA CONST PVT LTD",
          contactNumber: "9685717917",
          insuranceCompany: "The New India Assurance Company Limited",
          policyType: "Commercial Vehicle",
          expiryDate: "2026-11-02",
          grossPremium: "45531",
          registrationNumber: "MP17HH4323",
          makeModel: "Tata Signa",
          quote: "",
          remark: "Customer requested quote",
          status: "ACTIVE",
        },
      ];

      const mockRequest = {
        headers: {
          get: (header) => (header === "content-type" ? "application/json" : null),
        },
        cookies: {
          get: (name) => (name === "token" ? { value: "valid-jwt-token" } : null),
        },
        json: async () => ({
          records: sampleRecords,
          sourceFileName: "november_renewals.xlsx",
        }),
      };

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.insertedCount).toBe(1);
      expect(result.totalRows).toBe(1);

      expect(prismaMock.policyRecord.create).toHaveBeenCalledTimes(1);
      const createCall = prismaMock.policyRecord.create.mock.calls[0][0];
      expect(createCall.data.extractionMethod).toBe("renewal_excel_import");
      expect(createCall.data.selectedCompany).toBe("The New India Assurance Company Limited");
      expect(createCall.data.renewalStatus).toBe("ACTIVE");
      expect(createCall.data.isActivePolicy).toBe(true);
    });

    it("applies targetMonth to missing expiry dates and records targetRenewalMonth", async () => {
      const recordsWithoutExpiry = [
        {
          policyNumber: "45140031250100009999",
          insuredName: "ANIL ENTERPRISES",
          contactNumber: "9826011223",
          insuranceCompany: "Tata AIG General Insurance Company Limited",
          policyType: "Commercial Vehicle",
          expiryDate: "",
          grossPremium: "25000",
          registrationNumber: "MP04HE5555",
          makeModel: "Ashok Leyland",
          quote: "",
          remark: "November pipeline renewal",
          status: "ACTIVE",
        },
      ];

      const mockRequest = {
        headers: {
          get: (header) => (header === "content-type" ? "application/json" : null),
        },
        cookies: {
          get: (name) => (name === "token" ? { value: "valid-jwt-token" } : null),
        },
        json: async () => ({
          records: recordsWithoutExpiry,
          sourceFileName: "nov_renewals_raw.xlsx",
          targetMonth: "11",
        }),
      };

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.insertedCount).toBe(1);

      const createCall = prismaMock.policyRecord.create.mock.calls[0][0];
      expect(createCall.data.data.targetRenewalMonth).toBe("11");
      expect(createCall.data.data.expiryDate).toBe("2026-11-28");
    });
  });

  describe("Month Option Handling in Templates", () => {
    it("generates templates with expiry dates tailored to target month", async () => {
      const monthReq = {
        url: "http://localhost:3000/api/renewals/import?template=true&format=csv&category=motor&month=11",
        cookies: {
          get: (name) => (name === "token" ? { value: "valid-jwt-token" } : null),
        },
      };
      const monthRes = await GET(monthReq);
      expect(monthRes.status).toBe(200);
      const csvText = await monthRes.text();
      expect(csvText).toContain("2026-11-");
    });
  });
});
