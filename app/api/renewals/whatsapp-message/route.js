import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/rbac";
import { normalizeRecord } from "@/lib/records";
import { withRenewalPolicyDisplay } from "@/lib/policy-type-display";
import { logAudit, getAuditMetadata } from "@/lib/audit";

export const runtime = "nodejs";

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

    const { policyId } = await request.json();
    if (!policyId) {
      return Response.json({ error: "Missing policyId parameter" }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "read");

    const record = await prisma.policyRecord.findFirst({
      where: {
        id: policyId,
        ...tenantFilter
      }
    });

    if (!record) {
      return Response.json({ error: "Policy not found" }, { status: 404 });
    }

    const policy = withRenewalPolicyDisplay(normalizeRecord(record));

    const companyName = policy.insuranceCompany || "your insurer";
    const expiryDate = policy.expiryDate || "soon";
    const policyType = policy.policyType || "Insurance";
    const customerName = policy.insuredName || "Customer";

    const text = `Hello ${customerName},

Your ${policyType} policy with ${companyName} is due for renewal on ${expiryDate}.

Please contact us for renewal assistance.

Regards,
BimaHeadquarter`;

    const message = encodeURIComponent(text);

    let phone = String(policy.contactNumber || "").replace(/[^0-9]/g, "");
    if (phone.length === 10) {
      phone = "91" + phone;
    }
    const url = `https://wa.me/${phone}?text=${message}`;

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "WHATSAPP_REMINDER_SENT",
      entityType: "PolicyRecord",
      entityId: policyId,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: user.userId || user.id,
      organizationId: user.organizationId,
      metadata: { contactNumber: policy.contactNumber }
    });

    return Response.json({ success: true, message: text, url });
  } catch (error) {
    console.error("WhatsApp message generation failed:", error);
    return Response.json({ error: "Failed to generate WhatsApp message." }, { status: 500 });
  }
}
