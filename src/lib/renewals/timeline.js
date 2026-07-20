export function buildWhatsAppTimelineItems(logs = [], policies = []) {
  const policyById = new Map(policies.map((policy) => [policy.id, policy]));

  return logs.map((log) => {
    const metadata = log.metadata && typeof log.metadata === "object" ? log.metadata : {};
    const policy = policyById.get(log.entityId) || {};

    return {
      id: log.id,
      type: "WHATSAPP_SENT",
      text: String(metadata.message || "").trim() || "WhatsApp renewal reminder sent.",
      createdAt: log.createdAt,
      createdBy: log.user?.name || log.user?.email || metadata.senderName || "User",
      oldStatus: "WhatsApp",
      newStatus: "Message Sent",
      policyId: log.entityId,
      policyNumber: policy.policyNumber || "N/A",
      policyType: policy.displayPolicyType || policy.policyType || "Policy",
      recipientPhone: metadata.recipientPhone || metadata.contactNumber || "",
    };
  });
}
