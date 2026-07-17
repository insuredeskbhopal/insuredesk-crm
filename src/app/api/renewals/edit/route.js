import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";

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
    if (!policyType || !String(policyType).trim()) {
      return Response.json({ error: "Policy Type is required." }, { status: 400 });
    }
    if (!expiryDate || isNaN(new Date(expiryDate).getTime())) {
      return Response.json({ error: "Valid Expiry Date is required." }, { status: 400 });
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
    const oldContactPersonName = oldData.contactPersonName || oldData.contactPerson || "";
    const oldContactNumber = oldData.contactNumber || oldData.customerMobile || "";
    const oldPolicyNumber = oldData.policyNumber || "";
    const oldInsuranceCompany = policy.selectedCompany || oldData.insuranceCompany || "";
    const oldPolicyType = policy.selectedPolicyType || oldData.policyType || "";
    const oldPremium = oldData.premium || oldData.totalPremium || 0;
    const oldExpiryDate = oldData.expiryDate || oldData.policyEndDate || "";
    const oldAssignedTo = oldData.assignedTo || "";
    const oldAssignedToId = oldData.assignedToId || "";
    const oldStatus = policy.renewalStatus || "ACTIVE";
    const finalContactPersonName = contactPersonName === undefined
      ? String(oldContactPersonName).trim()
      : String(contactPersonName || "").trim();
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
    if (String(policyNumber).trim() !== String(oldPolicyNumber).trim()) {
      changes.push({ field: "Policy Number", oldValue: oldPolicyNumber || "N/A", newValue: policyNumber });
    }
    if (String(insuranceCompany).trim() !== String(oldInsuranceCompany).trim()) {
      changes.push({
        field: "Insurance Company",
        oldValue: oldInsuranceCompany || "N/A",
        newValue: insuranceCompany,
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
      policyNumber,
      insuranceCompany,
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

    // Update or create CustomerProfile if phone number is provided
    if (cleanPhone) {
      const cleanPhoneDigits = cleanPhone.replace(/\D/g, "");
      const last10 = cleanPhoneDigits.slice(-10);

      const isSuperAdmin = user.role === "SUPER_ADMIN";
      const orgId = user.organizationId || null;

      // Find profile by comparing the last 10 digits
      const profile = await prisma.customerProfile.findFirst({
        where: {
          phone: { contains: last10 },
          deletedAt: null,
          ...(isSuperAdmin ? {} : { organizationId: orgId }),
        },
      });

      if (profile) {
        // Update contact person name
        await prisma.customerProfile.update({
          where: { id: profile.id },
          data: {
            contactPersonName: finalContactPersonName || null,
            updatedById: actorId,
          },
        });
      } else {
        // Create new customer profile
        await prisma.customerProfile.create({
          data: {
            name: insuredName || "Unnamed Customer",
            phone: cleanPhone,
            contactPersonName: finalContactPersonName || null,
            organizationId: user.organizationId,
            createdById: actorId,
            updatedById: actorId,
            assignedTo: newAssignedTo || actorName,
          },
        });
      }
    }

    // Save changes to database
    await prisma.policyRecord.update({
      where: { id: policyId },
      data: {
        renewalStatus: finalStatus,
        selectedCompany: insuranceCompany,
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

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to edit renewal:", error);
    return Response.json({ error: "Failed to edit renewal record." }, { status: 500 });
  }
}
