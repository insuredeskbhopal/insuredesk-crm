export const RENEWAL_WORK_ACTIONS = [
  "RENEWAL_REMARK_ADDED",
  "POLICY_RENEWED",
  "POLICY_MARK_LOST",
  "RENEWAL_REASSIGNED",
  "WHATSAPP_REMINDER_SENT"
];

export function getRenewalActionLabel(action = "") {
  const map = {
    RENEWAL_REMARK_ADDED: "Remark Added",
    POLICY_RENEWED: "Policy Renewed",
    POLICY_MARK_LOST: "Marked Lost",
    RENEWAL_REASSIGNED: "Reassigned",
    WHATSAPP_REMINDER_SENT: "WhatsApp Sent",
    RENEWAL_UPDATED: "Renewal Updated"
  };
  return map[action] || String(action || "Activity").replace(/_/g, " ");
}

export function buildTodayWorkSummary(activities = []) {
  const summary = {
    total: activities.length,
    remarks: 0,
    renewed: 0,
    lost: 0,
    reassigned: 0,
    whatsapp: 0,
    other: 0,
    uniquePolicies: 0
  };

  const policyIds = new Set();
  for (const item of activities) {
    if (item.policyId) policyIds.add(item.policyId);
    if (item.action === "RENEWAL_REMARK_ADDED") summary.remarks += 1;
    else if (item.action === "POLICY_RENEWED") summary.renewed += 1;
    else if (item.action === "POLICY_MARK_LOST") summary.lost += 1;
    else if (item.action === "RENEWAL_REASSIGNED") summary.reassigned += 1;
    else if (item.action === "WHATSAPP_REMINDER_SENT") summary.whatsapp += 1;
    else summary.other += 1;
  }
  summary.uniquePolicies = policyIds.size;
  return summary;
}
