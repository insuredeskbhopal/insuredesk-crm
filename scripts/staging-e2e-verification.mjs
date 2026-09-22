/**
 * Complete Staging / Pre-Production E2E Verification Script
 * Validates all Renewal and Calling Architecture workflows against the live database.
 */

import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const SECRET_KEY =
  process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-jwt-secret-change-me");
const encodedSecret = new TextEncoder().encode(SECRET_KEY);

async function signJWT(payload, expiresIn = "24h") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedSecret);
}

const MANUAL_RENEWAL_IMPORT_METHOD = "renewal_excel_import";
const MANUAL_RENEWAL_SOURCE_FILE = "Non_Motor_July_2026_Renewal_Data (1).xlsx";

function withoutManualRenewalSources(where = {}) {
  const existingAnd = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
  return {
    ...where,
    AND: [
      ...existingAnd,
      { OR: [{ extractionMethod: { not: MANUAL_RENEWAL_IMPORT_METHOD } }, { extractionMethod: null }] },
      { OR: [{ sourceFile: { not: MANUAL_RENEWAL_SOURCE_FILE } }, { sourceFile: null }] },
      { OR: [{ pdfFileName: { not: MANUAL_RENEWAL_SOURCE_FILE } }, { pdfFileName: null }] },
    ],
  };
}

function logStep(step, desc) {
  console.log(`\n======================================================`);
  console.log(`[STEP ${step}] ${desc}`);
  console.log(`======================================================`);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runStagingVerification() {
  console.log("Starting Live Staging E2E Verification against database...\n");

  const testOrgAId = randomUUID();
  const testOrgBId = randomUUID();
  const userAId = randomUUID();
  const userBId = randomUUID();
  const userCId = randomUUID();

  const pol1Id = randomUUID();
  const pol2Id = randomUUID();
  const pol3Id = randomUUID();
  let renewedNewPolicyId = null;

  let tokenUserA = "";
  let tokenUserB = "";
  let tokenUserC = "";

  try {
    // ----------------------------------------------------
    // SETUP: Organizations, Users & Initial Policies
    // ----------------------------------------------------
    logStep("0", "Setup Test Organizations, Users & Policies");

    await prisma.organization.createMany({
      data: [
        { id: testOrgAId, name: "STAGING-TEST-ORG-A" },
        { id: testOrgBId, name: "STAGING-TEST-ORG-B" },
      ],
    });
    console.log("  ✓ Created test organizations: ORG-A, ORG-B");

    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: "staging-mgr-a@test.local",
          name: "Staging Manager A",
          password: "test-password-hash",
          role: "MANAGER",
          organizationId: testOrgAId,
        },
        {
          id: userBId,
          email: "staging-agent-a@test.local",
          name: "Staging Agent A",
          password: "test-password-hash",
          role: "AGENT",
          organizationId: testOrgAId,
        },
        {
          id: userCId,
          email: "staging-mgr-b@test.local",
          name: "Staging Manager B",
          password: "test-password-hash",
          role: "MANAGER",
          organizationId: testOrgBId,
        },
      ],
    });
    console.log("  ✓ Created test users: Manager A (Org A), Agent A (Org A), Manager B (Org B)");

    tokenUserA = await signJWT({
      userId: userAId,
      id: userAId,
      email: "staging-mgr-a@test.local",
      name: "Staging Manager A",
      role: "MANAGER",
      organizationId: testOrgAId,
    });

    tokenUserB = await signJWT({
      userId: userBId,
      id: userBId,
      email: "staging-agent-a@test.local",
      name: "Staging Agent A",
      role: "AGENT",
      organizationId: testOrgAId,
    });

    tokenUserC = await signJWT({
      userId: userCId,
      id: userCId,
      email: "staging-mgr-b@test.local",
      name: "Staging Manager B",
      role: "MANAGER",
      organizationId: testOrgBId,
    });
    console.log("  ✓ Generated signed JWT session tokens for all 3 users");

    const now = new Date();
    const expirySoon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await prisma.policyRecord.createMany({
      data: [
        {
          id: pol1Id,
          organizationId: testOrgAId,
          createdById: userAId,
          renewalStatus: "PENDING",
          isActivePolicy: true,
          data: {
            policyNumber: "STAGING-POL-001",
            insuredName: "Staging Client One",
            customerName: "Staging Client One",
            contactNumber: "9999999991",
            policyType: "Motor Comprehensive",
            insuranceCompany: "Tata AIG General Insurance",
            premium: 15000,
            netPremium: 12712,
            expiryDate: expirySoon.toISOString(),
          },
        },
        {
          id: pol2Id,
          organizationId: testOrgAId,
          createdById: userAId,
          renewalStatus: "PENDING",
          isActivePolicy: true,
          data: {
            policyNumber: "STAGING-POL-002",
            insuredName: "Staging Client One",
            customerName: "Staging Client One",
            contactNumber: "9999999991",
            policyType: "Health Protect Plus",
            insuranceCompany: "Star Health Insurance",
            premium: 25000,
            netPremium: 21186,
            expiryDate: expirySoon.toISOString(),
          },
        },
        {
          id: pol3Id,
          organizationId: testOrgAId,
          createdById: userAId,
          renewalStatus: "PENDING",
          isActivePolicy: true,
          data: {
            policyNumber: "STAGING-POL-003",
            insuredName: "Staging Client Two",
            customerName: "Staging Client Two",
            contactNumber: "9999999992",
            policyType: "Commercial Fire",
            insuranceCompany: "ICICI Lombard",
            premium: 45000,
            netPremium: 38135,
            expiryDate: expirySoon.toISOString(),
          },
        },
      ],
    });
    console.log("  ✓ Created 3 test policies in ORG-A (POL-1, POL-2 for Client 1; POL-3 for Client 2)");

    // ----------------------------------------------------
    // STEP 1: Existing Renewal → Call Back
    // ----------------------------------------------------
    logStep("1", "Existing renewal → Call Back");
    {
      const pol1Before = await prisma.policyRecord.findUnique({ where: { id: pol1Id } });
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(`${BASE_URL}/api/renewals/remarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `token=${tokenUserA}`,
        },
        body: JSON.stringify({
          policyId: pol1Id,
          remark: "Customer requested callback tomorrow morning at 11am",
          nextFollowUpDate: tomorrow,
          followUpStatus: "CALL_BACK",
          expectedUpdatedAt: pol1Before.updatedAt.toISOString(),
        }),
      });

      const json = await res.json();
      assert(res.status === 200, `Call Back remark returned HTTP 200 (got ${res.status})`);
      assert(json.success === true, "Response has success: true");

      const pol1After = await prisma.policyRecord.findUnique({ where: { id: pol1Id } });
      assert(pol1After.data?.renewalFollowUp?.followUpStatus === "CALL_BACK", "Renewal follow-up status updated to CALL_BACK");
      assert(pol1After.data?.renewalFollowUp?.nextFollowUpDate === tomorrow, "Next follow-up date saved correctly");
      assert(pol1After.data?.renewalRemarks?.length > 0, "Renewal remark recorded in policy data");

      const activity = await prisma.auditLog.findFirst({
        where: { entityId: pol1Id, action: "RENEWAL_REMARK_ADDED" },
      });
      assert(activity !== null, "AuditLog / Activity entry logged for Call Back");
    }

    // ----------------------------------------------------
    // STEP 2: Multi-policy Customer Remark & Follow-up
    // ----------------------------------------------------
    logStep("2", "Multi-policy customer remark & follow-up");
    {
      const pol1 = await prisma.policyRecord.findUnique({ where: { id: pol1Id } });
      const pol2 = await prisma.policyRecord.findUnique({ where: { id: pol2Id } });
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(`${BASE_URL}/api/renewals/remarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `token=${tokenUserA}`,
        },
        body: JSON.stringify({
          policyIds: [pol1Id, pol2Id],
          remark: "Discussed full bundle renewal (Motor + Health). Customer interested in 10% combo discount.",
          nextFollowUpDate: nextWeek,
          followUpStatus: "PROPOSAL_SENT",
          expectedUpdatedAts: {
            [pol1Id]: pol1.updatedAt.toISOString(),
            [pol2Id]: pol2.updatedAt.toISOString(),
          },
        }),
      });

      const json = await res.json();
      assert(res.status === 200, `Multi-policy remark returned HTTP 200 (got ${res.status})`);
      assert(json.success === true, "Multi-policy remark response has success: true");

      const pol1After = await prisma.policyRecord.findUnique({ where: { id: pol1Id } });
      const pol2After = await prisma.policyRecord.findUnique({ where: { id: pol2Id } });

      assert(pol1After.data?.renewalFollowUp?.followUpStatus === "PROPOSAL_SENT", "POL-1 followUpStatus updated");
      assert(pol2After.data?.renewalFollowUp?.followUpStatus === "PROPOSAL_SENT", "POL-2 followUpStatus updated");
      assert(pol1After.data?.renewalRemarks?.[0]?.text?.includes("Discussed full bundle"), "POL-1 remark stored");
      assert(pol2After.data?.renewalRemarks?.[0]?.text?.includes("Discussed full bundle"), "POL-2 remark stored");
    }

    // ----------------------------------------------------
    // STEP 3: Assignment to User B
    // ----------------------------------------------------
    logStep("3", "Policy Assignment");
    {
      const pol1 = await prisma.policyRecord.findUnique({ where: { id: pol1Id } });
      const pol2 = await prisma.policyRecord.findUnique({ where: { id: pol2Id } });

      const res = await fetch(`${BASE_URL}/api/renewals/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `token=${tokenUserA}`,
        },
        body: JSON.stringify({
          policyIds: [pol1Id, pol2Id],
          assignedToUserId: userBId,
          note: "Assigned bundle to Agent A for closing",
          expectedUpdatedAts: {
            [pol1Id]: pol1.updatedAt.toISOString(),
            [pol2Id]: pol2.updatedAt.toISOString(),
          },
        }),
      });

      const json = await res.json();
      assert(res.status === 200, `Assignment returned HTTP 200 (got ${res.status})`);
      assert(json.success === true, "Assignment response has success: true");

      const pol1After = await prisma.policyRecord.findUnique({ where: { id: pol1Id } });
      const pol2After = await prisma.policyRecord.findUnique({ where: { id: pol2Id } });

      assert(pol1After.data?.assignedToId === userBId, "POL-1 assignedToId matches Agent A");
      assert(pol2After.data?.assignedToId === userBId, "POL-2 assignedToId matches Agent A");
    }

    // ----------------------------------------------------
    // STEP 4: Two-session Concurrent Update (OCC Conflict)
    // ----------------------------------------------------
    logStep("4", "Two-session Concurrent Update (OCC Conflict)");
    {
      const pol1Snapshot = await prisma.policyRecord.findUnique({ where: { id: pol1Id } });
      const staleTimestamp = pol1Snapshot.updatedAt.toISOString();

      // Session 1 performs an update that advances updatedAt
      const res1 = await fetch(`${BASE_URL}/api/renewals/remarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `token=${tokenUserA}`,
        },
        body: JSON.stringify({
          policyId: pol1Id,
          remark: "Session 1 update - customer requested revised quote",
          expectedUpdatedAt: staleTimestamp,
        }),
      });
      assert(res1.status === 200, "Session 1 update succeeded");

      // Session 2 attempts update with the STALE expectedUpdatedAt
      const res2 = await fetch(`${BASE_URL}/api/renewals/remarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `token=${tokenUserB}`,
        },
        body: JSON.stringify({
          policyId: pol1Id,
          remark: "Session 2 concurrent update - trying to overwrite",
          expectedUpdatedAt: staleTimestamp,
        }),
      });

      const json2 = await res2.json();
      assert(res2.status === 409, `Session 2 correctly rejected with HTTP 409 (got ${res2.status})`);
      assert(json2.conflict === true, "Response signals conflict: true");
    }

    // ----------------------------------------------------
    // STEP 5: Mark Lost
    // ----------------------------------------------------
    logStep("5", "Mark Lost");
    {
      const pol3 = await prisma.policyRecord.findUnique({ where: { id: pol3Id } });

      const res = await fetch(`${BASE_URL}/api/renewals/lost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `token=${tokenUserA}`,
        },
        body: JSON.stringify({
          policyId: pol3Id,
          renewalStatus: "LOST",
          lostReason: "Sold property / business closed",
          remarks: "Customer confirmed business closed down",
          expectedUpdatedAt: pol3.updatedAt.toISOString(),
        }),
      });

      const json = await res.json();
      assert(res.status === 200, `Mark Lost returned HTTP 200 (got ${res.status})`);
      assert(json.success === true, "Mark Lost response has success: true");

      const pol3After = await prisma.policyRecord.findUnique({ where: { id: pol3Id } });
      assert(pol3After.renewalStatus === "LOST", "POL-3 status is LOST");
      assert(pol3After.isActivePolicy === false, "POL-3 isActivePolicy is false (closed)");
      assert(pol3After.lostReason === "Sold property / business closed", "Lost reason recorded");

      const newPolicies = await prisma.policyRecord.findMany({
        where: { previousPolicyId: pol3Id },
      });
      assert(newPolicies.length === 0, "Zero new policy created for Lost renewal");
    }

    // ----------------------------------------------------
    // STEP 6: Renewed Elsewhere
    // ----------------------------------------------------
    logStep("6", "Renewed Elsewhere & Production Exclusion");
    {
      const pol2 = await prisma.policyRecord.findUnique({ where: { id: pol2Id } });

      const res = await fetch(`${BASE_URL}/api/renewals/lost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `token=${tokenUserA}`,
        },
        body: JSON.stringify({
          policyId: pol2Id,
          renewalStatus: "RENEWED_ELSEWHERE",
          lostReason: "Competitor offered cheaper price",
          remarks: "Renewed with competitor HDFC Ergo",
          expectedUpdatedAt: pol2.updatedAt.toISOString(),
        }),
      });

      const json = await res.json();
      assert(res.status === 200, `Renewed Elsewhere returned HTTP 200 (got ${res.status})`);
      assert(json.success === true, "Renewed Elsewhere response has success: true");

      const pol2After = await prisma.policyRecord.findUnique({ where: { id: pol2Id } });
      assert(pol2After.renewalStatus === "RENEWED_ELSEWHERE", "POL-2 status is RENEWED_ELSEWHERE");
      assert(pol2After.isActivePolicy === false, "POL-2 isActivePolicy is false (closed)");

      const newPolicies = await prisma.policyRecord.findMany({
        where: { previousPolicyId: pol2Id },
      });
      assert(newPolicies.length === 0, "Zero new policy created for Renewed Elsewhere");

      // Verify Production Accounting excludes it
      const prodQuery = withoutManualRenewalSources({
        organizationId: testOrgAId,
        isActivePolicy: true,
      });
      const activeProduction = await prisma.policyRecord.findMany({ where: prodQuery });
      const containsPol2 = activeProduction.some((p) => p.id === pol2Id);
      const containsPol3 = activeProduction.some((p) => p.id === pol3Id);
      assert(!containsPol2, "Renewed Elsewhere policy is excluded from active production");
      assert(!containsPol3, "Lost policy is excluded from active production");
    }

    // ----------------------------------------------------
    // STEP 7: Renewed through BHQ with Real Test PDF
    // ----------------------------------------------------
    logStep("7", "Renewed through BHQ with Test PDF");
    renewedNewPolicyId = null;
    {
      const pol1 = await prisma.policyRecord.findUnique({ where: { id: pol1Id } });

      // Read real test PDF fixture
      const pdfBuffer = readFileSync("tests/fixtures/TATA AIG.pdf");
      const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

      const formData = new FormData();
      formData.append("previousPolicyId", pol1Id);
      formData.append("idempotencyKey", `IDEMP-${pol1Id}-1`);
      formData.append("file", pdfBlob, "TATA_AIG_Renewal.pdf");
      formData.append(
        "renewedData",
        JSON.stringify({
          remark: "Renewed through BHQ with Tata AIG policy copy",
          expectedUpdatedAt: pol1.updatedAt.toISOString(),
        })
      );

      const res = await fetch(`${BASE_URL}/api/renewals/renew`, {
        method: "POST",
        headers: {
          Cookie: `token=${tokenUserA}`,
        },
        body: formData,
      });

      const json = await res.json();
      console.log("  ℹ BHQ Renewal response:", res.status, json);
      assert(res.status === 200 || res.status === 201, `BHQ Renewal returned HTTP 200/201 (got ${res.status}: ${json.error || "ok"})`);
      assert(json.id !== undefined, "Response contains renewed policy ID");
      renewedNewPolicyId = json.id;

      // Inspect DB for Lifecycle Linkage
      const oldPol = await prisma.policyRecord.findUnique({ where: { id: pol1Id } });
      const newPol = await prisma.policyRecord.findUnique({ where: { id: renewedNewPolicyId } });

      assert(oldPol.renewalStatus === "RENEWED", "Old policy renewalStatus is RENEWED");
      assert(oldPol.isActivePolicy === false, "Old policy isActivePolicy is false");
      assert(oldPol.renewedPolicyId === renewedNewPolicyId, "Old policy renewedPolicyId points to new policy");

      assert(newPol.isActivePolicy === true, "New policy isActivePolicy is true");
      assert(newPol.previousPolicyId === pol1Id, "New policy previousPolicyId points to old policy");
      assert(Boolean(newPol.data?.policyNumber), `New policy has valid extracted policy number (got ${newPol.data?.policyNumber})`);

      // Verify UploadedFile
      if (newPol.uploadedFileId) {
        const uploadedFile = await prisma.uploadedFile.findUnique({ where: { id: newPol.uploadedFileId } });
        assert(uploadedFile !== null, "UploadedFile record created and linked to new policy");
      }

      // Verify Activity Log & Audit Log
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "POLICY_RENEWED",
          OR: [{ entityId: pol1Id }, { entityId: renewedNewPolicyId }],
        },
      });
      assert(audit !== null, "AuditLog recorded POLICY_RENEWED for policy renewal");

      const activity = await prisma.activityLog.findFirst({
        where: {
          action: "RENEWAL",
          module: "RENEWAL",
        },
      });
      assert(activity !== null, "ActivityLog recorded RENEWAL interaction");

      // Verify Production Accounting
      const prodQuery = withoutManualRenewalSources({
        organizationId: testOrgAId,
        isActivePolicy: true,
      });
      const activeProduction = await prisma.policyRecord.findMany({ where: prodQuery });
      const newPolInProd = activeProduction.some((p) => p.id === renewedNewPolicyId);
      const oldPolInProd = activeProduction.some((p) => p.id === pol1Id);
      assert(newPolInProd, "New renewed policy is included in active production");
      assert(!oldPolInProd, "Old closed renewal policy is excluded from active production");
    }

    // ----------------------------------------------------
    // STEP 8: Duplicate BHQ Renewal Submission (Idempotency)
    // ----------------------------------------------------
    logStep("8", "Duplicate BHQ Renewal Submission (Idempotency)");
    {
      const res = await fetch(`${BASE_URL}/api/renewals/renew`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `token=${tokenUserA}`,
        },
        body: JSON.stringify({
          previousPolicyId: pol1Id,
          idempotencyKey: `IDEMP-${pol1Id}-1`, // Retry with same key
          renewedData: {
            policyNumber: "POL-BHQ-RENEWED-001",
          },
        }),
      });

      const json = await res.json();
      assert(res.status === 200, `Duplicate renewal submission returned HTTP 200 (got ${res.status})`);
      assert(json.id === renewedNewPolicyId, "Idempotent response returned the exact same existing renewed policy ID");

      const countNew = await prisma.policyRecord.count({
        where: { previousPolicyId: pol1Id },
      });
      assert(countNew === 1, `Exactly 1 renewed policy exists for POL-1 (count = ${countNew})`);
    }

    // ----------------------------------------------------
    // STEP 9: Cross-Tenant Isolation
    // ----------------------------------------------------
    logStep("9", "Tenant Isolation (Cross-Tenant Mutation Prohibited)");
    {
      // User C is in ORG-B. They attempt to mutate POL-1 in ORG-A.
      const res = await fetch(`${BASE_URL}/api/renewals/remarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `token=${tokenUserC}`,
        },
        body: JSON.stringify({
          policyId: pol1Id,
          remark: "Cross-tenant intrusion attempt from Org B",
        }),
      });

      assert(res.status === 403, `Cross-tenant remark rejected with HTTP 403 (got ${res.status})`);

      // Cross-tenant assignment attempt
      const resAssign = await fetch(`${BASE_URL}/api/renewals/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `token=${tokenUserC}`,
        },
        body: JSON.stringify({
          policyId: pol1Id,
          assignedToUserId: userCId,
        }),
      });
      assert(resAssign.status === 403, `Cross-tenant assignment rejected with HTTP 403 (got ${resAssign.status})`);
    }

    // ----------------------------------------------------
    // STEP 10: WhatsApp Provider Verification
    // ----------------------------------------------------
    logStep("10", "WhatsApp Provider Verification");
    {
      // Test sending WhatsApp message using the WhatsApp route
      const res = await fetch(`${BASE_URL}/api/operations/whatsapp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `token=${tokenUserA}`,
        },
        body: JSON.stringify({
          recipient: "919999999991",
          message: "Staging E2E Verification Test WhatsApp Message",
        }),
      });

      const json = await res.json();
      console.log(`  ℹ WhatsApp Gateway Response status: ${res.status}`, json);

      if (res.status === 200 && json.success) {
        console.log("  ✓ WhatsApp Gateway is active and sent message successfully (messageId:", json.messageId, ")");
      } else {
        console.log(`  ℹ WhatsApp Gateway returned: ${json.error || "Offline/Not configured"} (Expected when test gateway is offline/unreachable)`);
        // Verify that on failure, no false success audit is recorded
        const falseSuccess = await prisma.auditLog.findFirst({
          where: {
            action: "WHATSAPP_REMINDER_SENT",
            metadata: { path: ["message"], equals: "Staging E2E Verification Test WhatsApp Message" },
          },
        });
        assert(falseSuccess === null, "No false success audit log created when gateway fails");
      }
    }

    console.log("\n======================================================");
    console.log("🎉 ALL STAGING E2E TESTS PASSED SUCCESSFULLY!");
    console.log("======================================================\n");
  } catch (err) {
    console.error("\n❌ E2E VERIFICATION ERROR:", err);
    throw err;
  } finally {
    // ----------------------------------------------------
    // CLEANUP: Clean all staging test records
    // ----------------------------------------------------
    console.log("\nCleaning up staging test records...");
    try {
      // Find all policy records created for test orgs
      const testPolicies = await prisma.policyRecord.findMany({
        where: {
          OR: [
            { organizationId: { in: [testOrgAId, testOrgBId] } },
            { id: { in: [pol1Id, pol2Id, pol3Id, renewedNewPolicyId].filter(Boolean) } },
          ],
        },
        select: { id: true, uploadedFileId: true },
      });

      const policyIds = testPolicies.map((p) => p.id);
      const uploadedFileIds = testPolicies.map((p) => p.uploadedFileId).filter(Boolean);

      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { organizationId: { in: [testOrgAId, testOrgBId] } },
            { entityId: { in: policyIds } },
            { userId: { in: [userAId, userBId, userCId] } },
          ],
        },
      });

      await prisma.activityLog.deleteMany({
        where: {
          OR: [
            { organizationId: { in: [testOrgAId, testOrgBId] } },
            { userId: { in: [userAId, userBId, userCId] } },
          ],
        },
      });

      await prisma.policyRecord.deleteMany({
        where: { id: { in: policyIds } },
      });

      if (uploadedFileIds.length > 0) {
        await prisma.uploadedFile.deleteMany({
          where: { id: { in: uploadedFileIds } },
        });
      }

      await prisma.user.deleteMany({
        where: { id: { in: [userAId, userBId, userCId] } },
      });

      await prisma.organization.deleteMany({
        where: { id: { in: [testOrgAId, testOrgBId] } },
      });

      console.log("✓ Cleanup completed successfully. Database restored to pristine state.\n");
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    } finally {
      await prisma.$disconnect();
    }
  }
}

runStagingVerification().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
