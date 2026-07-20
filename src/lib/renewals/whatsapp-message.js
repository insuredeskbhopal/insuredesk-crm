import renewalImportIdentity from "./import-identity.cjs";
import { calculateDaysLeft } from "./dates";

const RENEWAL_HELP_NUMBER = "+91 88188 89660";
const { excelDateToString } = renewalImportIdentity;

export const RENEWAL_WHATSAPP_CUSTOM_FIELDS = [
  { label: "Agent Name", placeholder: "{AgentName}", example: "Amit Sharma" },
  { label: "Customer Name", placeholder: "{CustomerName}", example: "BHAIJILAL CHOUHAN" },
  { label: "Insurance Company", placeholder: "{InsuranceCompany}", example: "IFFCO Tokio" },
  { label: "Policy Number", placeholder: "{PolicyNumber}", example: "N4116778" },
  { label: "Vehicle Make", placeholder: "{VehicleMake}", example: "MG" },
  { label: "Vehicle Model", placeholder: "{VehicleModel}", example: "H Savvy" },
  { label: "Registration Number", placeholder: "{RegistrationNumber}", example: "MP04ZL6963" },
  { label: "Expiry Date", placeholder: "{ExpiryDate}", example: "2026-08-01" },
  { label: "Days Remaining", placeholder: "{DaysLeft}", example: "12" },
];

export function selectRenewalWhatsAppPolicies({
  policyId,
  primaryPolicy,
  duePolicies = [],
  policies = [],
} = {}) {
  if (policyId) {
    const requestedPolicy = policies.find((policy) => policy.id === policyId) || primaryPolicy;
    return requestedPolicy ? [requestedPolicy] : [];
  }
  if (duePolicies.length > 0) return duePolicies;
  if (policies.length > 0) return policies;
  return primaryPolicy ? [primaryPolicy] : [];
}

function renewalDueDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";
  return excelDateToString(raw);
}

function renewalVehicleDescription(policy = {}) {
  const makeModel =
    [policy.vehicleMake, policy.vehicleModel]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ") ||
    String(policy.makeModel || "").trim().replace(/\s*,\s*/g, " ");
  const vehicleNumber = String(policy.vehicleNumber || policy.registrationNumber || "").trim();
  const vehicle = makeModel || String(policy.displayPolicyType || policy.policyType || "Insurance Policy").trim();

  return `${vehicle}${vehicleNumber ? ` (${vehicleNumber})` : ""}`;
}

export function buildRenewalWhatsAppMessage({ agentName, customerName, policies = [], referenceDate } = {}) {
  const agent = String(agentName || "Team Member").trim() || "Team Member";
  const name = String(customerName || "Valued Customer").trim() || "Valued Customer";
  const reminders = policies
    .map((policy) => {
      const hasDaysRemaining = policy.daysRemaining !== null && policy.daysRemaining !== undefined && policy.daysRemaining !== "";
      const daysLeft = hasDaysRemaining && Number.isFinite(Number(policy.daysRemaining))
        ? Number(policy.daysRemaining)
        : calculateDaysLeft(policy.expiryDate, referenceDate);
      return `The Motor Insurance Policy for *${name}* with *${String(policy.insuranceCompany || "your insurer").trim()}* is scheduled to expire soon.

*Policy Number:* ${String(policy.policyNumber || "N/A").trim()}
*Vehicle:* ${renewalVehicleDescription(policy).replace(/\s+\([^)]*\)$/, "")}
*Registration No.:* ${String(policy.vehicleNumber || policy.registrationNumber || "N/A").trim()}
*Expiry Date:* ${renewalDueDate(policy.expiryDate)}
*Days Remaining:* ${daysLeft ?? "N/A"} days`;
    })
    .join("\n\n");

  return `Dear ${agent},

${reminders}

Please connect with us in advance to ensure a smooth renewal, avoid any interruption in coverage, and explore the best renewal options available.

Phone: ${RENEWAL_HELP_NUMBER}
Website: www.bimaheadquarter.com

*Team BimaHeadquarter by InsureDesk IMF Pvt. Ltd.*
_Your Trusted Insurance Partner_`;
}
