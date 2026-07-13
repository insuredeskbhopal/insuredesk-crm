import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { normalizeRecord } from "@/lib/records";
import { withRenewalPolicyDisplay } from "@/lib/policies/type-display";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { formatPhoneForWhatsapp } from "@/lib/customer-profiles/utils";

export const runtime = "nodejs";

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(d.getDate()).padStart(2, "0")}-${months[d.getMonth()]}-${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { policyId, phone, logAudit: shouldLog } = body;
    if (!policyId && !phone) {
      return Response.json({ error: "Missing policyId or phone parameter" }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "read");
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;

    // Get organization name
    let orgName = "BimaHeadquarter";
    if (orgId) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      });
      if (org?.name) {
        orgName = org.name;
      }
    }

    // 1. Resolve contact phone number
    let targetPhone = phone || "";
    let mainPolicy = null;
    if (policyId) {
      mainPolicy = await prisma.policyRecord.findFirst({
        where: { id: policyId, clientIdPending: false, ...tenantFilter },
      });
      if (mainPolicy) {
        const norm = normalizeRecord(mainPolicy);
        targetPhone = norm.contactNumber || norm.customerMobile || "";
      }
    }

    const cleanContact = targetPhone ? String(targetPhone).replace(/[^0-9]/g, "") : "";

    // 2. Fetch all matching active policies for this phone to check the portfolio
    let activePolicies = [];
    if (cleanContact) {
      activePolicies = await prisma.policyRecord.findMany({
        where: {
          deletedAt: null,
          clientIdPending: false,
          ...(isSuperAdmin ? {} : { organizationId: orgId }),
          OR: [
            { reviewedData: { path: ["contactNumber"], string_contains: cleanContact } },
            { reviewedData: { path: ["customerMobile"], string_contains: cleanContact } },
            { data: { path: ["contactNumber"], string_contains: cleanContact } },
            { data: { path: ["customerMobile"], string_contains: cleanContact } },
          ],
        },
      });
    } else if (mainPolicy) {
      activePolicies = [mainPolicy];
    }

    const normalized = activePolicies.map((p) => withRenewalPolicyDisplay(normalizeRecord(p)));

    // 3. Filter to active due policies in the 30-day window
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowStart = new Date(today);
    windowStart.setDate(today.getDate() - 30);
    const windowEnd = new Date(today);
    windowEnd.setDate(today.getDate() + 30);

    const duePolicies = normalized.filter((p) => {
      if (!p.expiryDate) return false;
      const exp = new Date(p.expiryDate);
      const isClosed = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(
        p.renewalStatus,
      );
      return p.isActivePolicy && !isClosed && exp >= windowStart && exp <= windowEnd;
    });

    // Fallback: If no policies are strictly "due in window", use all normalized matching policies
    const targetList =
      duePolicies.length > 0
        ? duePolicies
        : normalized.length > 0
          ? normalized
          : mainPolicy
            ? [withRenewalPolicyDisplay(normalizeRecord(mainPolicy))]
            : [];

    if (targetList.length === 0) {
      return Response.json({ error: "No policies found to generate message" }, { status: 404 });
    }

    let customerName = "Valued Customer";
    if (cleanContact) {
      const last10 = cleanContact.slice(-10);
      const profile = await prisma.customerProfile.findFirst({
        where: {
          phone: { contains: last10 },
          deletedAt: null,
          ...(isSuperAdmin ? {} : { organizationId: orgId }),
        },
        select: {
          contactPersonName: true,
        },
      });
      if (profile?.contactPersonName) {
        customerName = profile.contactPersonName;
      }
    }

    if (customerName === "Valued Customer") {
      customerName = String(
        targetList[0].contactPerson || targetList[0].insuredName || "Valued Customer",
      ).trim();
    }
    const count = targetList.length;

    const phoneParam = formatPhoneForWhatsapp(targetPhone) || cleanContact;

    // Handle Audit logging
    if (shouldLog) {
      const { ipAddress, userAgent } = getAuditMetadata(request);
      const logPromises = targetList.map((p) =>
        logAudit({
          action: "WHATSAPP_REMINDER_SENT",
          entityType: "PolicyRecord",
          entityId: p.id,
          severity: "INFO",
          source: "API",
          ipAddress,
          userAgent,
          userId: user.userId || user.id,
          organizationId: orgId,
          metadata: { contactNumber: p.contactNumber },
        }),
      );
      await Promise.all(logPromises);
      return Response.json({ success: true });
    }

    // 4. Generate Message Content
    let templates = {};
    let defaultTemplate = "due_soon";

    if (count > 1) {
      // Combined Multi-policy message template
      const lines = targetList.map((p, idx) => {
        const pType = String(p.displayPolicyType || p.policyType || "Insurance").trim();
        const pCompany = String(p.insuranceCompany || "your insurer").trim();
        const pNumber = String(p.policyNumber || "N/A").trim();
        const pExpiry = formatDate(p.expiryDate);
        const companyName = String(p.insuredName || "your company").trim();
        const daysLeft =
          p.daysRemaining === undefined || p.daysRemaining === null
            ? "N/A"
            : p.daysRemaining < 0
              ? `Overdue ${Math.abs(p.daysRemaining)} days`
              : `${p.daysRemaining} days left`;
        return `${idx + 1}. ${pType} for ${companyName} with ${pCompany} - Policy Number: ${pNumber} - Expiry: ${pExpiry} - ${daysLeft}`;
      });

      const combinedText = `Dear ${customerName},

You have ${count} policies due for renewal:

${lines.join("\n")}

Please connect with us to avoid any interruption in coverage.

Regards,
${orgName} Team`;

      templates = {
        due_soon: combinedText,
        today: combinedText,
        expired: combinedText,
        follow_up: combinedText,
      };
    } else {
      // Single policy message templates
      const p = targetList[0];
      const policyType = String(p.displayPolicyType || p.policyType || "insurance").trim();
      const policyNumber = String(p.policyNumber || "N/A").trim();
      const insuranceCompany = String(p.insuranceCompany || "your insurer").trim();
      const companyName = String(p.insuredName || "your company").trim();
      const expiryDate = formatDate(p.expiryDate);

      // Parse days remaining for template picker
      let daysRemaining = 30;
      if (p.expiryDate) {
        const exp = new Date(p.expiryDate);
        exp.setHours(0, 0, 0, 0);
        const diffTime = exp.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const daysText =
        daysRemaining < 0
          ? `overdue by ${Math.abs(daysRemaining)} days`
          : daysRemaining === 0
            ? "due today"
            : `${daysRemaining} days left`;

      const dueSoonText = `Dear ${customerName},

Your ${policyType} for ${companyName} with ${insuranceCompany} is due for renewal on ${expiryDate}.

Policy Number: ${policyNumber}
Days Left: ${daysText}

Please connect with us to avoid any interruption in coverage.

Regards,
${orgName} Team`;

      const expiringTodayText = `Dear ${customerName},

Your ${policyType} for ${companyName} with ${insuranceCompany} is due for renewal today (${expiryDate}).

Policy Number: ${policyNumber}
Days Left: due today

Please connect with us to avoid any interruption in coverage.

Regards,
${orgName} Team`;

      const alreadyExpiredText = `Dear ${customerName},

Your ${policyType} for ${companyName} with ${insuranceCompany} was due for renewal on ${expiryDate}.

Policy Number: ${policyNumber}
Days Left: overdue by ${Math.abs(daysRemaining)} days

Please connect with us to avoid any interruption in coverage.

Regards,
${orgName} Team`;

      const followUpText = `Dear ${customerName},

Following up regarding your ${policyType} for ${companyName} with ${insuranceCompany}.

Policy Number: ${policyNumber}
Expiry Date: ${expiryDate}
Days Left: ${daysText}

Please connect with us to avoid any interruption in coverage.

Regards,
${orgName} Team`;

      templates = {
        due_soon: dueSoonText,
        today: expiringTodayText,
        expired: alreadyExpiredText,
        follow_up: followUpText,
      };

      if (daysRemaining < 0) {
        defaultTemplate = "expired";
      } else if (daysRemaining === 0) {
        defaultTemplate = "today";
      } else if (daysRemaining > 0 && daysRemaining <= 7) {
        defaultTemplate = "due_soon";
      } else {
        defaultTemplate = "follow_up";
      }
    }

    return Response.json({
      success: true,
      phone: phoneParam,
      defaultTemplate,
      templates,
    });
  } catch (error) {
    console.error("WhatsApp message generation failed:", error);
    return Response.json({ error: "Failed to generate WhatsApp message." }, { status: 500 });
  }
}
