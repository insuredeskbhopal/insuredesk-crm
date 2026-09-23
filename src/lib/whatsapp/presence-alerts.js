import { enqueueMessage } from "./queue-manager";

const MANAGEMENT_ALERT_PHONE = process.env.INTERNAL_WHATSAPP_ALERT_PHONE || "8818889660";

/**
 * Normalizes phone numbers to standard 10 or 12 digit format
 */
export function normalizePhone(rawPhone) {
  if (!rawPhone) return "";
  let digits = String(rawPhone).replace(/\D/g, "");
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

/**
 * Dispatch Warning 1 to Employee (5 minutes offline)
 */
export async function sendWarning1({
  organizationId,
  user,
  incidentId,
  offlineMinutes = 5,
  timeStr,
}) {
  const phone = normalizePhone(user.whatsappPhone);
  if (!phone || !organizationId) return { skipped: true, reason: "No phone or org" };

  const message = [
    `⚠️ *BIMA HEADQUARTER CRM - PRESENCE WARNING 1*`,
    ``,
    `Hello *${user.name || "Team Member"}*,`,
    `Your BimaHeadquarter CRM browser tab appears to be *CLOSED or INACTIVE*.`,
    ``,
    `🕒 *Time Detected:* ${timeStr}`,
    `⏱️ *Offline Duration:* ~${offlineMinutes} minutes`,
    `📋 *Official Duty Window:* 10:00 AM - 6:30 PM`,
    ``,
    `Please immediately open and log into *bimaheadquarter.com* to keep your shift attendance active. If you are on an authorized break, please ensure it is recorded in the CRM.`,
    ``,
    `_Bima Headquarter Automated Operations Center_`,
  ].join("\n");

  return enqueueMessage({
    organizationId,
    recipientPhone: phone,
    recipientName: user.name || "Employee",
    messageType: "TEXT",
    messageBody: message,
    uniqueKey: `PRESENCE_INCIDENT_${incidentId}_WARN_1`,
  });
}

/**
 * Dispatch Warning 2 to Employee (15 minutes offline)
 */
export async function sendWarning2({
  organizationId,
  user,
  incidentId,
  offlineMinutes = 15,
  timeStr,
}) {
  const phone = normalizePhone(user.whatsappPhone);
  if (!phone || !organizationId) return { skipped: true, reason: "No phone or org" };

  const message = [
    `⚠️ *BIMA HEADQUARTER CRM - PRESENCE WARNING 2 (URGENT)*`,
    ``,
    `Hello *${user.name || "Team Member"}*,`,
    `You have now been offline from the CRM for *${offlineMinutes} minutes* during active duty hours.`,
    ``,
    `🕒 *Current Time:* ${timeStr}`,
    `⚠️ *Status:* Offline without logged exception`,
    ``,
    `Continued absence from the CRM without approval will result in a final escalation to Operations Management.`,
    ``,
    `👉 Please re-open your CRM tab immediately at *bimaheadquarter.com*.`,
    ``,
    `_Bima Headquarter Automated Operations Center_`,
  ].join("\n");

  return enqueueMessage({
    organizationId,
    recipientPhone: phone,
    recipientName: user.name || "Employee",
    messageType: "TEXT",
    messageBody: message,
    uniqueKey: `PRESENCE_INCIDENT_${incidentId}_WARN_2`,
  });
}

/**
 * Dispatch Warning 3 to Employee (30 minutes offline - Final Warning)
 * Also sends an alert to Management
 */
export async function sendWarning3({
  organizationId,
  user,
  incidentId,
  offlineMinutes = 30,
  timeStr,
}) {
  const phone = normalizePhone(user.whatsappPhone);
  const results = [];

  if (phone && organizationId) {
    const userMessage = [
      `🚨 *BIMA HEADQUARTER CRM - FINAL PRESENCE WARNING (LEVEL 3)*`,
      ``,
      `Hello *${user.name || "Team Member"}*,`,
      `This is your *FINAL WARNING*. You have been offline for *${offlineMinutes} minutes*.`,
      ``,
      `🕒 *Time:* ${timeStr}`,
      `⚠️ *Action:* In 15 minutes, this absence will be officially escalated to Operations Management.`,
      ``,
      `Restore your CRM tab immediately at *bimaheadquarter.com* to prevent administrative review.`,
      ``,
      `_Bima Headquarter Automated Operations Center_`,
    ].join("\n");

    const r1 = await enqueueMessage({
      organizationId,
      recipientPhone: phone,
      recipientName: user.name || "Employee",
      messageType: "TEXT",
      messageBody: userMessage,
      uniqueKey: `PRESENCE_INCIDENT_${incidentId}_WARN_3`,
    });
    results.push(r1);
  }

  // Management Alert
  if (MANAGEMENT_ALERT_PHONE && organizationId) {
    const mgmtPhone = normalizePhone(MANAGEMENT_ALERT_PHONE);
    const mgmtMessage = [
      `📢 *STAFF PRESENCE NOTICE - 30 MIN OFFLINE*`,
      ``,
      `Staff Member: *${user.name}* (${user.role})`,
      `Email: ${user.email}`,
      `Phone: ${user.whatsappPhone || "Not set"}`,
      `Offline Duration: ${offlineMinutes} minutes`,
      `Warning 3 issued. Final escalation in 15 minutes if not resumed.`,
      ``,
      `_Bima Headquarter Operations Center_`,
    ].join("\n");

    const r2 = await enqueueMessage({
      organizationId,
      recipientPhone: mgmtPhone,
      recipientName: "Operations Management",
      messageType: "TEXT",
      messageBody: mgmtMessage,
      uniqueKey: `PRESENCE_INCIDENT_${incidentId}_MGMT_PRE_ESCALATION`,
    });
    results.push(r2);
  }

  return results;
}

/**
 * Dispatch Management Escalation (45 minutes offline)
 */
export async function sendManagementEscalation({
  organizationId,
  user,
  incidentId,
  offlineMinutes = 45,
  timeStr,
}) {
  if (!MANAGEMENT_ALERT_PHONE || !organizationId) return { skipped: true };

  const mgmtPhone = normalizePhone(MANAGEMENT_ALERT_PHONE);
  const mgmtMessage = [
    `🚨 *CRITICAL STAFF ABSENCE ESCALATION*`,
    ``,
    `Staff Member: *${user.name}*`,
    `Role: ${user.role}`,
    `Email: ${user.email}`,
    `Staff Phone: ${user.whatsappPhone || "Not set"}`,
    ``,
    `⏱️ *Offline Since:* ~${offlineMinutes} mins ago (${timeStr})`,
    `⚠️ *Incident Status:* ESCALATED PENDING REVIEW`,
    `All 3 automated warnings were delivered without CRM tab reconnection.`,
    ``,
    `Review & manage in Operations Hub:`,
    `*bimaheadquarter.com/operations/presence*`,
  ].join("\n");

  return enqueueMessage({
    organizationId,
    recipientPhone: mgmtPhone,
    recipientName: "Operations Management",
    messageType: "TEXT",
    messageBody: mgmtMessage,
    uniqueKey: `PRESENCE_INCIDENT_${incidentId}_ESCALATED`,
  });
}

/**
 * Dispatch Reconnection Confirmation
 */
export async function sendReconnectionNotice({
  organizationId,
  user,
  timeStr,
  durationMinutes,
}) {
  const phone = normalizePhone(user.whatsappPhone);
  if (!phone || !organizationId) return { skipped: true };

  const message = [
    `✅ *BIMA HEADQUARTER CRM - SESSION RESUMED*`,
    ``,
    `Hello *${user.name}*,`,
    `Your CRM tab is back *ONLINE* as of ${timeStr}.`,
    `Previous offline duration: ${durationMinutes} minutes.`,
    `Your shift presence is now actively recording.`,
    ``,
    `_Bima Headquarter Operations Center_`,
  ].join("\n");

  return enqueueMessage({
    organizationId,
    recipientPhone: phone,
    recipientName: user.name || "Employee",
    messageType: "TEXT",
    messageBody: message,
    uniqueKey: `PRESENCE_RECONNECT_${user.id}_${Date.now()}`,
  });
}
