import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";
import { normalizeRenewalInsuranceCompany } from "@/lib/renewals/companies";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user || user.role === "VIEWER") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      policyId,
      insuredName,
      contactPersonName,
      contactNumber,
      contactPersonEmail,
      renewalRecipientName,
      renewalRecipientMobile,
      renewalRecipientEmail,
      contactUpdateMode = "policy_only",
      targetPortfolioId,
      newPortfolioName,
      newPortfolioMobile,
      newPortfolioEmail,
      policyNumber,
      insuranceCompany,
      policyType,
      premium,
      expiryDate,
      assignedToUserId,
      renewalStatus,
      remark,
      nextFollowUpDate,
    } = body;

    // Required fields validation
    if (!policyId) {
      return Response.json({ error: "Missing policyId parameter" }, { status: 400 });
    }
    if (!insuredName || !String(insuredName).trim()) {
      return Response.json({ error: "Customer Name is required." }, { status: 400 });
    }
    if (!policyNumber || !String(policyNumber).trim()) {
      return Response.json({ error: "Policy Number is required." }, { status: 400 });
    }
    if (!insuranceCompany || !String(insuranceCompany).trim()) {
      return Response.json({ error: "Insurance Company is required." }, { status: 400 });
    }
    const standardInsuranceCompany = normalizeRenewalInsuranceCompany(insuranceCompany);
    if (!policyType || !String(policyType).trim()) {
      return Response.json({ error: "Policy Type is required." }, { status: 400 });
    }
    if (!expiryDate || isNaN(new Date(expiryDate).getTime())) {
      return Response.json({ error: "Valid Expiry Date is required." }, { status: 400 });
    }
    if (!["policy_only", "move_existing", "create_portfolio"].includes(contactUpdateMode)) {
      return Response.json({ error: "Invalid contact update mode." }, { status: 400 });
    }
    const premiumProvided = premium !== undefined && premium !== null && String(premium).trim() !== "";
    const parsedPremium = premiumProvided ? Number(String(premium).replace(/[^0-9.-]/g, "")) : null;
    if (premiumProvided && (!Number.isFinite(parsedPremium) || parsedPremium < 0)) {
      return Response.json({ error: "Premium must be a valid non-negative number." }, { status: 400 });
    }

    // Phone validation & normalization
    let cleanPhone = String(contactNumber || "").trim();
    if (cleanPhone) {
      const normalized = normalizeIndianPhone(cleanPhone);
      if (!normalized) {
        return Response.json(
          { error: "Customer Phone must be a valid 10-digit Indian mobile number." },
          { status: 400 },
        );
      }
      cleanPhone = normalized;
    }
    let cleanRenewalMobile = String(renewalRecipientMobile ?? cleanPhone).trim();
    if (cleanRenewalMobile) {
      const normalized = normalizeIndianPhone(cleanRenewalMobile);
      if (!normalized) {
        return Response.json({ error: "Renewal recipient mobile must be a valid 10-digit Indian mobile number." }, { status: 400 });
      }
      cleanRenewalMobile = normalized;
    }

    const tenantFilter = getTenantFilter(user, "write");
    const actorId = user.userId || user.id || null;
    const actorName = user.name || user.email || "User";

    // 1. Fetch existing policy record
    const policy = await prisma.policyRecord.findFirst({
      where: {
        id: policyId,
        ...tenantFilter,
      },
    });

    if (!policy) {
      return Response.json({ error: "Policy record not found or access denied" }, { status: 404 });
    }

    const oldData = { ...(policy.data || {}), ...(policy.reviewedData || {}) };

    // Parse old values
    const oldInsuredName = oldData.insuredName || "";
    const oldContactPersonName = policy.contactPersonName || oldData.contactPersonName || oldData.contactPerson || "";
    const oldContactNumber = policy.contactPersonMobile || oldData.contactNumber || oldData.customerMobile || "";
    const oldRenewalRecipientName = policy.renewalRecipientName || oldData.renewalRecipientName || oldContactPersonName;
    const oldRenewalRecipientMobile = policy.renewalRecipientMobile || oldData.renewalRecipientMobile || oldContactNumber;
    const oldPolicyNumber = oldData.policyNumber || "";
    const oldInsuranceCompany = normalizeRenewalInsuranceCompany(
      policy.selectedCompany || oldData.insuranceCompany,
    );
    const oldPolicyType = policy.selectedPolicyType || oldData.policyType || "";
    const oldPremium = oldData.premium || oldData.totalPremium || 0;
    const oldExpiryDate = oldData.expiryDate || oldData.policyEndDate || "";
    const oldAssignedTo = oldData.assignedTo || "";
    const oldAssignedToId = oldData.assignedToId || "";
    const oldStatus = policy.renewalStatus || "ACTIVE";
    const finalContactPersonName = contactPersonName === undefined
      ? String(oldContactPersonName).trim()
      : String(contactPersonName || "").trim();
    const finalContactPersonEmail = String(contactPersonEmail ?? policy.contactPersonEmail ?? oldData.email ?? "").trim();
    const finalRenewalRecipientName = String(renewalRecipientName ?? policy.renewalRecipientName ?? finalContactPersonName).trim();
    const finalRenewalRecipientEmail = String(renewalRecipientEmail ?? policy.renewalRecipientEmail ?? finalContactPersonEmail).trim();
    const finalPremium = premiumProvided ? parsedPremium : oldPremium;

    // Calculate changes
    const changes = [];
    if (String(insuredName).trim() !== String(oldInsuredName).trim()) {
      changes.push({ field: "Customer Name", oldValue: oldInsuredName || "N/A", newValue: insuredName });
    }
    if (cleanPhone !== String(oldContactNumber).trim()) {
      changes.push({ field: "Customer Phone", oldValue: oldContactNumber || "N/A", newValue: cleanPhone });
    }
    if (finalContactPersonName !== String(oldContactPersonName).trim()) {
      changes.push({
        field: "Contact Person Name",
        oldValue: oldContactPersonName || "N/A",
        newValue: finalContactPersonName || "N/A",
      });
    }
    if (finalRenewalRecipientName !== String(oldRenewalRecipientName).trim()) {
      changes.push({ field: "Renewal Recipient", oldValue: oldRenewalRecipientName || "N/A", newValue: finalRenewalRecipientName || "N/A" });
    }
    if (cleanRenewalMobile !== String(oldRenewalRecipientMobile).trim()) {
      changes.push({ field: "Renewal Mobile", oldValue: oldRenewalRecipientMobile || "N/A", newValue: cleanRenewalMobile || "N/A" });
    }
    if (String(policyNumber).trim() !== String(oldPolicyNumber).trim()) {
      changes.push({ field: "Policy Number", oldValue: oldPolicyNumber || "N/A", newValue: policyNumber });
    }
    if (standardInsuranceCompany !== oldInsuranceCompany) {
      changes.push({
        field: "Insurance Company",
        oldValue: oldInsuranceCompany || "N/A",
        newValue: standardInsuranceCompany,
      });
    }
    if (String(policyType).trim() !== String(oldPolicyType).trim()) {
      changes.push({ field: "Policy Type", oldValue: oldPolicyType || "N/A", newValue: policyType });
    }
    if (premiumProvided && parsedPremium !== Number(String(oldPremium).replace(/[^0-9.-]/g, ""))) {
      changes.push({ field: "Premium", oldValue: String(oldPremium || 0), newValue: String(premium) });
    }

    const parsedOldExpiry = oldExpiryDate ? new Date(oldExpiryDate) : null;
    const formattedOldExpiry = parsedOldExpiry && !Number.isNaN(parsedOldExpiry.getTime())
      ? parsedOldExpiry.toISOString().split("T")[0]
      : String(oldExpiryDate || "");
    const formattedNewExpiry = new Date(expiryDate).toISOString().split("T")[0];
    if (formattedNewExpiry !== formattedOldExpiry) {
      changes.push({
        field: "Expiry Date",
        oldValue: formattedOldExpiry || "N/A",
        newValue: formattedNewExpiry,
      });
    }

    // Determine assignee
    let newAssignedTo = oldAssignedTo;
    let newAssignedToId = oldAssignedToId;
    let assignmentChanged = false;

    if (assignedToUserId && assignedToUserId !== oldAssignedToId) {
      const assignee = await prisma.user.findFirst({
        where:
          user.role === "SUPER_ADMIN"
            ? { id: assignedToUserId, role: { not: "VIEWER" } }
            : { id: assignedToUserId, organizationId: user.organizationId, role: { not: "VIEWER" } },
        select: { id: true, name: true, email: true },
      });
      if (assignee) {
        newAssignedTo = assignee.name || assignee.email;
        newAssignedToId = assignee.id;
        assignmentChanged = true;
        changes.push({
          field: "Assigned User",
          oldValue: oldAssignedTo || "Unassigned",
          newValue: newAssignedTo,
        });
      }
    } else if (assignedToUserId === "" && oldAssignedToId) {
      newAssignedTo = "";
      newAssignedToId = "";
      assignmentChanged = true;
      changes.push({ field: "Assigned User", oldValue: oldAssignedTo, newValue: "Unassigned" });
    }

    // Determine status
    let finalStatus = renewalStatus || oldStatus;
    const isClosed = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(
      finalStatus,
    );

    // Auto update status if expiry date changed and status is not closed
    if (formattedNewExpiry !== formattedOldExpiry && !isClosed) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newExpiry = new Date(expiryDate);
      newExpiry.setHours(0, 0, 0, 0);
      const diffTime = newExpiry.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining < 0) {
        finalStatus = "Overdue";
      } else if (daysRemaining === 0) {
        finalStatus = "Expiring Today";
      } else if (daysRemaining <= 7) {
        finalStatus = "Due Soon";
      } else {
        finalStatus = "Active";
      }
    }

    // Check status change
    let statusChanged = false;
    if (finalStatus !== oldStatus) {
      statusChanged = true;
      changes.push({ field: "Renewal Status", oldValue: oldStatus, newValue: finalStatus });
    }

    const { ipAddress, userAgent } = getAuditMetadata(request);
    const timestamp = new Date().toISOString();

    // Compile remarks array
    const existingRemarks = Array.isArray(oldData.renewalRemarks) ? oldData.renewalRemarks : [];
    let updatedRemarks = [...existingRemarks];

    // Append reassignment remark if changed
    if (assignmentChanged) {
      const reassignRemarkText = oldAssignedTo
        ? `Reassigned from ${oldAssignedTo} to ${newAssignedTo || "Unassigned"}.`
        : `Assigned to ${newAssignedTo}.`;

      const reassignRemark = {
        id: randomUUID(),
        text: reassignRemarkText,
        createdAt: timestamp,
        createdBy: actorName,
        createdById: actorId,
        type: "REASSIGNED",
        oldStatus: oldStatus,
        newStatus: finalStatus,
        assignedTo: newAssignedTo,
        assignedToId: newAssignedToId,
      };
      updatedRemarks.unshift(reassignRemark);
    }

    // Append standard follow-up/remark if provided
    const cleanRemarkText = String(remark || "").trim();
    if (cleanRemarkText) {
      const renewalRemark = {
        id: randomUUID(),
        text: cleanRemarkText,
        createdAt: timestamp,
        createdBy: actorName,
        createdById: actorId,
        type: "FOLLOW_UP",
        oldStatus: oldStatus,
        newStatus: finalStatus,
        nextFollowUpDate: String(nextFollowUpDate || "").trim(),
      };
      updatedRemarks.unshift(renewalRemark);
      changes.push({ field: "Remark", oldValue: "N/A", newValue: cleanRemarkText });
    }

    // Build the updated JSON payload
    const updatedPayload = {
      ...oldData,
      insuredName,
      contactPerson: finalContactPersonName,
      contactPersonName: finalContactPersonName,
      contactNumber: cleanPhone,
      customerMobile: cleanPhone,
      contactPersonEmail: finalContactPersonEmail,
      renewalRecipientName: finalRenewalRecipientName,
      renewalRecipientMobile: cleanRenewalMobile,
      renewalRecipientEmail: finalRenewalRecipientEmail,
      policyNumber,
      insuranceCompany: standardInsuranceCompany,
      policyType,
      premium: finalPremium,
      totalPremium: finalPremium,
      expiryDate: formattedNewExpiry,
      policyEndDate: formattedNewExpiry,
      assignedTo: newAssignedTo,
      assignedToId: newAssignedToId,
      remark: cleanRemarkText || oldData.remark || "",
      renewalRemarks: updatedRemarks,
    };

    if (cleanRemarkText || nextFollowUpDate) {
      updatedPayload.renewalFollowUp = {
        nextFollowUpDate: String(nextFollowUpDate || "").trim(),
        followUpStatus: finalStatus,
        lastRemarkAt: timestamp,
        lastRemarkBy: actorName,
      };
    }

    // Check if status is marked renewed or lost
    let isActivePolicy = policy.isActivePolicy;
    if (["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(finalStatus)) {
      isActivePolicy = false;
    }

    const customerPortfolioId = await prisma.$transaction(async (tx) => {
      let customerPortfolioId = policy.customerPortfolioId || null;
      const portfolioScope = { organizationId: policy.organizationId || null };

      if (!customerPortfolioId) {
        const oldMobile = String(oldContactNumber || "").replace(/\D/g, "").slice(-10);
        let currentPortfolio = oldMobile
          ? await tx.customerProfile.findFirst({
              where: { phone: { contains: oldMobile }, deletedAt: null, ...portfolioScope },
              orderBy: { createdAt: "asc" },
            })
          : null;
        currentPortfolio ||= await tx.customerProfile.create({
          data: {
            name: oldInsuredName || insuredName || "Unnamed Customer",
            phone: oldMobile || `NO-MOBILE-${policy.id}`,
            contactPersonName: oldContactPersonName || null,
            organizationId: policy.organizationId || null,
            createdById: actorId,
            updatedById: actorId,
          },
        });
        customerPortfolioId = currentPortfolio.id;
      }

      if (contactUpdateMode === "move_existing") {
        const target = await tx.customerProfile.findFirst({
          where: { id: targetPortfolioId, deletedAt: null, ...portfolioScope },
          select: { id: true },
        });
        if (!target) throw new Error("TARGET_PORTFOLIO_NOT_FOUND");
        customerPortfolioId = target.id;
      } else if (contactUpdateMode === "create_portfolio") {
        const portfolioPhone = normalizeIndianPhone(newPortfolioMobile || cleanPhone);
        if (!String(newPortfolioName || "").trim() || !portfolioPhone) throw new Error("INVALID_NEW_PORTFOLIO");
        const createdPortfolio = await tx.customerProfile.create({
          data: {
            name: String(newPortfolioName).trim(),
            phone: portfolioPhone,
            email: String(newPortfolioEmail || "").trim() || null,
            contactPersonName: finalContactPersonName || null,
            organizationId: policy.organizationId || null,
            createdById: actorId,
            updatedById: actorId,
          },
        });
        customerPortfolioId = createdPortfolio.id;
      }

      await tx.policyRecord.update({
        where: { id: policyId },
        data: {
        customerPortfolioId,
        contactPersonName: finalContactPersonName || null,
        contactPersonMobile: cleanPhone || null,
        contactPersonEmail: finalContactPersonEmail || null,
        renewalRecipientName: finalRenewalRecipientName || null,
        renewalRecipientMobile: cleanRenewalMobile || null,
        renewalRecipientEmail: finalRenewalRecipientEmail || null,
        renewalStatus: finalStatus,
        selectedCompany: standardInsuranceCompany,
        selectedPolicyType: policyType,
        isActivePolicy,
        reviewedData: updatedPayload,
        data: updatedPayload,
        updatedById: actorId,
        renewalDate: ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(
          finalStatus,
        )
          ? new Date()
          : undefined,
        lostReason: ["LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(finalStatus)
          ? cleanRemarkText || "Marked Lost"
          : undefined,
        },
      });
      return customerPortfolioId;
    });

    if (customerPortfolioId !== policy.customerPortfolioId) {
      changes.push({ field: "Customer Portfolio", oldValue: policy.customerPortfolioId || "Legacy group", newValue: customerPortfolioId });
    }

    // Write audit logs
    if (changes.length > 0) {
      await logAudit({
        action: "RENEWAL_EDITED",
        entityType: "PolicyRecord",
        entityId: policyId,
        severity: "INFO",
        source: "API",
        ipAddress,
        userAgent,
        userId: actorId,
        organizationId: user.organizationId,
        metadata: { changes },
      });
    }

    if (assignmentChanged) {
      await logAudit({
        action: "RENEWAL_REASSIGNED",
        entityType: "PolicyRecord",
        entityId: policyId,
        severity: "INFO",
        source: "API",
        ipAddress,
        userAgent,
        userId: actorId,
        organizationId: user.organizationId,
        metadata: { assignedToUserId: newAssignedToId, assignedTo: newAssignedTo },
      });
    }

    if (statusChanged) {
      await logAudit({
        action: "RENEWAL_STATUS_CHANGED",
        entityType: "PolicyRecord",
        entityId: policyId,
        severity: "INFO",
        source: "API",
        ipAddress,
        userAgent,
        userId: actorId,
        organizationId: user.organizationId,
        metadata: { oldStatus, newStatus: finalStatus },
      });
    }

    if (cleanRemarkText) {
      await logAudit({
        action: "RENEWAL_REMARK_ADDED",
        entityType: "PolicyRecord",
        entityId: policyId,
        severity: "INFO",
        source: "API",
        ipAddress,
        userAgent,
        userId: actorId,
        organizationId: user.organizationId,
        metadata: { remark: cleanRemarkText, nextFollowUpDate },
      });
    }

    return Response.json({ success: true, customerPortfolioId });
  } catch (error) {
    console.error("Failed to edit renewal:", error);
    if (error.message === "TARGET_PORTFOLIO_NOT_FOUND") {
      return Response.json({ error: "Selected customer portfolio was not found." }, { status: 404 });
    }
    if (error.message === "INVALID_NEW_PORTFOLIO") {
      return Response.json({ error: "New portfolio name and valid mobile number are required." }, { status: 400 });
    }
    return Response.json({ error: "Failed to edit renewal record." }, { status: 500 });
  }
}
