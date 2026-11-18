import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getClientOwnedPolicyRows, requireClient } from "@/lib/client-portal/session";
import { normalizeCanonicalPhone } from "@/lib/client-portal/policies";
import {
  findActiveClientAccount,
  withClientIdLock,
  withPolicyRecordLock,
} from "@/lib/client-accounts/server";

export async function GET(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const customerId = auth.customer.id;
    const orgId = auth.organizationId;
    const customer = auth.customer;

    const cleanPhone = normalizeCanonicalPhone(customer.phone || "");

    const policyRows = await getClientOwnedPolicyRows({
      customerId,
      organizationId: orgId,
      customer,
      database: prisma,
    });
    const safeRows = Array.isArray(policyRows) ? policyRows : [];
    const policyNumbers = safeRows
      .map((row) => row.policy_number)
      .filter(Boolean);

    const legacyOwnership =
      cleanPhone && policyNumbers.length
        ? { policyNo: { in: policyNumbers }, mobileNo: { endsWith: cleanPhone } }
        : null;
    const claims = await prisma.claim.findMany({
      where: {
        deletedAt: null,
        organizationId: orgId,
        OR: [
          { metadata: { path: ["customerId"], equals: customerId } },
          ...(legacyOwnership ? [legacyOwnership] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        claimNo: true,
        policyNo: true,
        claimType: true,
        claimStatus: true,
        claimDescription: true,
        claimDate: true,
        followUpDate: true,
        currentRemark: true,
        createdAt: true,
        updatedAt: true,
        mobileNo: true,
        metadata: true,
        remarks: {
          orderBy: { createdAt: "asc" },
          select: { id: true, text: true, followUpDate: true, createdAt: true },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
          select: { id: true, name: true, fileName: true, fileType: true, size: true, uploadedAt: true },
        },
      },
    });

    const ownedClaims = claims
      .filter((claim) => {
        const storedCustomerId = String(claim.metadata?.customerId || "");
        if (storedCustomerId) return storedCustomerId === customerId;
        return Boolean(
          legacyOwnership &&
          policyNumbers.includes(claim.policyNo) &&
          normalizeCanonicalPhone(claim.mobileNo || "") === cleanPhone,
        );
      })
      .map((claim) => {
        const meta = claim.metadata || {};
        const publicClaim = {
          ...claim,
          claimAmount: meta.claimAmount || meta.estimatedAmount || "0",
          hospitalOrWorkshop: meta.hospitalOrGarageName || claim.claimDescription || "Network Garage / Hospital",
          insuranceCompany: meta.insuranceCompany || "",
          incidentLocation: meta.incidentLocation || null,
        };
        delete publicClaim.metadata;
        delete publicClaim.mobileNo;
        return publicClaim;
      });

    return NextResponse.json({ success: true, claims: ownedClaims });
  } catch (error) {
    console.error("Client Claims Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const customerId = auth.customer.id;
    const orgId = auth.organizationId;

    const payload = await request.json();
    const {
      policyNo,
      policyNumber,
      insuranceCompany,
      claimType,
      claimDescription,
      description,
      estimatedAmount,
      hospitalOrGarageName,
      incidentLocation,
      incidentDate,
      claimDate,
      attachments,
    } = payload;
    const resolvedPolicyNo = (policyNo || policyNumber || "").toString().trim();
    const resolvedDesc = (claimDescription || description || "").toString().trim();
    const resolvedDate = incidentDate || claimDate;

    if (!resolvedPolicyNo || !claimType) {
      return NextResponse.json({ success: false, error: "Policy number and claim type are required." }, { status: 400 });
    }

    const policy = await getClientOwnedPolicyRows({
      customerId,
      organizationId: orgId,
      customer: auth.customer,
      policyNo: resolvedPolicyNo,
      database: prisma,
    });

      if (!policy.length) {
        return NextResponse.json({ success: false, error: "Policy not found for this client." }, { status: 403 });
      }

      // Generate a unique claim number
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/[^0-9]/g, "");
      const rand = Math.floor(1000 + Math.random() * 9000);
      const claimNo = `CLM-CLI-${datePrefix}-${rand}`;

      const claimResult = await withPolicyRecordLock(policy[0].id, async (policyDatabase) => {
        const currentPolicy = await getClientOwnedPolicyRows({
          customerId,
          organizationId: orgId,
          customer: auth.customer,
          policyNo: resolvedPolicyNo,
          policyId: policy[0].id,
          database: policyDatabase,
        });
        if (!currentPolicy.length) return { ownershipLost: true };

        return withClientIdLock(
          customerId,
          async (database) => {
            const activeCustomer = await findActiveClientAccount(customerId, orgId, database);
            if (!activeCustomer) return { inactiveCustomer: true };

            // Build clean description summarizing details for CRM advisors
            const descParts = [];
            if (hospitalOrGarageName) descParts.push(`Facility/Garage: ${hospitalOrGarageName}`);
            if (incidentLocation) descParts.push(`Location: ${incidentLocation}`);
            if (estimatedAmount) descParts.push(`Est. Amount: ₹${estimatedAmount}`);
            if (resolvedDesc) descParts.push(resolvedDesc);
            const finalClaimDescription = descParts.join(" | ");

            const createdClaim = await database.claim.create({
              data: {
                insuredName: activeCustomer.name || "Client",
                mobileNo: activeCustomer.phone || "",
                policyNo: resolvedPolicyNo,
                claimNo,
                claimType,
                claimDescription: finalClaimDescription,
                claimDate: resolvedDate ? new Date(resolvedDate) : new Date(),
                claimStatus: "Open",
                organizationId: orgId,
                metadata: {
                  insuranceCompany: insuranceCompany || "",
                  customerId,
                  claimAmount: estimatedAmount ? String(estimatedAmount) : null,
                  hospitalOrGarageName: hospitalOrGarageName || null,
                  incidentLocation: incidentLocation || null,
                  incidentDate: incidentDate || null,
                  attachmentCount: Array.isArray(attachments) ? attachments.length : 0,
                },
              },
            });

            // Save any uploaded claim documents / damage photos
            if (Array.isArray(attachments) && attachments.length > 0) {
              for (const doc of attachments) {
                if (doc.name || doc.fileName) {
                  await database.claimDocument.create({
                    data: {
                      claimId: createdClaim.id,
                      name: doc.name || "Incident Attachment",
                      fileName: doc.fileName || doc.name || "damage_photo.jpg",
                      fileType: doc.fileType || "image/jpeg",
                      size: doc.size ? Number(doc.size) : null,
                      dataUrl: doc.dataUrl || "",
                    },
                  }).catch(() => {});
                }
              }
            }

            return { claim: createdClaim };
          },
          policyDatabase,
        );
      });

      if (claimResult.ownershipLost) {
        return NextResponse.json(
          { success: false, error: "Policy not found for this client." },
          { status: 403 },
        );
      }
      if (claimResult.inactiveCustomer) {
        return NextResponse.json(
          { success: false, error: "Client account is no longer active." },
          { status: 401 },
        );
      }
      const newClaim = claimResult.claim;

      // Trigger instant notification in CRM for staff & advisors
      try {
        await prisma.notification.create({
          data: {
            organizationId: orgId,
            category: "CLAIM",
            severity: "INFO",
            title: `New Claim Filed: ${resolvedPolicyNo}`,
            message: `${newClaim.insuredName || "Client"} filed a claim for policy #${resolvedPolicyNo}.${Array.isArray(attachments) && attachments.length ? ` (${attachments.length} attachment(s) included)` : ""} ${newClaim.claimDescription || ""}`.trim(),
            module: "CLAIMS",
            recordId: newClaim.id,
            recordLabel: claimNo,
            actionUrl: `/claims?q=${encodeURIComponent(claimNo)}`,
            sourceKey: `client-claim:${newClaim.id}`,
          },
        });
      } catch (_) {}

      return NextResponse.json({ success: true, claim: newClaim });
    } catch (error) {
      console.error("Client Initiate Claim Error:", error);
      return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
  }
