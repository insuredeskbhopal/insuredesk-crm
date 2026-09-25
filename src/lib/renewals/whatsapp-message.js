import renewalImportIdentity from "./import-identity.cjs";
import { calculateDaysLeft } from "./dates.js";
import { normalizeCustomerName, resolvePolicyCustomerName } from "./customer-name.js";

const RENEWAL_HELP_NUMBER = "+91 88188 89660";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const { excelDateToString } = renewalImportIdentity;

export const RENEWAL_WHATSAPP_CUSTOM_FIELDS = [
  { label: "Contact Person Name", placeholder: "{ContactPersonName}", example: "Amit Sharma" },
  { label: "Customer Name", placeholder: "{CustomerName}", example: "BHAIJILAL CHOUHAN" },
  { label: "Insurance Company", placeholder: "{InsuranceCompany}", example: "IFFCO Tokio" },
  { label: "Policy Number", placeholder: "{PolicyNumber}", example: "N4116778" },
  { label: "Product Name", placeholder: "{ProductName}", example: "Individual Health Insurance" },
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

export function isRenewalAgentId(value) {
  return UUID_PATTERN.test(String(value || "").trim());
}

export function normalizeRenewalContactName(value, fallback = "Valued Customer") {
  const name = normalizeCustomerName(value);
  return name && !isRenewalAgentId(name) && name.toLowerCase() !== "unassigned" ? name : fallback;
}

export function normalizeRenewalAgentName(value, fallback = "Team Member") {
  return normalizeRenewalContactName(value, fallback);
}

export function groupRenewalPoliciesByRecipient(policies = []) {
  const groups = new Map();
  policies.forEach((policy) => {
    const rawMobile = policy.renewalRecipientMobile || policy.contactNumber || "";
    const digits = String(rawMobile).replace(/\D/g, "");
    const mobile = digits.length >= 10 ? digits.slice(-10) : "";
    if (!mobile) return;
    const current = groups.get(mobile) || {
      mobile,
      name: resolvePolicyCustomerName(policy.insuredName, policy.customerName, policy.renewalRecipientName, policy.contactPerson) || "Valued Customer",
      policies: [],
    };
    current.policies.push(policy);
    groups.set(mobile, current);
  });
  return Array.from(groups.values());
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

export function isMotorPolicy(policy = {}) {
  const cat = String(
    policy.policyCategory ||
    policy.category ||
    policy.lob ||
    policy.lineOfBusiness ||
    policy.documentCategory ||
    "",
  ).toLowerCase();

  if (
    cat.includes("health") ||
    cat.includes("mediclaim") ||
    cat.includes("life") ||
    cat.includes("fire") ||
    cat.includes("marine") ||
    cat.includes("burglary") ||
    cat.includes("warehouse") ||
    cat.includes("commercial") ||
    cat.includes("engineering") ||
    cat.includes("workmen") ||
    cat.includes("travel")
  ) {
    return false;
  }

  if (
    cat.includes("motor") ||
    cat.includes("vehicle") ||
    cat.includes("car") ||
    cat.includes("bike") ||
    cat.includes("two wheeler") ||
    cat.includes("four wheeler")
  ) {
    return true;
  }

  const prod = String(
    policy.productName ||
    policy.product ||
    policy.policyType ||
    policy.displayPolicyType ||
    "",
  ).toLowerCase();

  if (
    prod.includes("health") ||
    prod.includes("mediclaim") ||
    prod.includes("optima") ||
    prod.includes("medicare") ||
    prod.includes("life") ||
    prod.includes("term") ||
    prod.includes("fire") ||
    prod.includes("marine") ||
    prod.includes("burglary") ||
    prod.includes("warehouse") ||
    prod.includes("commercial")
  ) {
    return false;
  }

  if (
    prod.includes("motor") ||
    prod.includes("car") ||
    prod.includes("auto") ||
    prod.includes("two wheeler") ||
    prod.includes("commercial vehicle") ||
    prod.includes("goods carrying") ||
    prod.includes("passenger")
  ) {
    return true;
  }

  const reg = String(policy.vehicleNumber || policy.registrationNumber || "").trim();
  if (reg && reg !== "N/A" && reg !== "-" && /^[A-Z]{2}[0-9]/i.test(reg)) {
    return true;
  }

  return false;
}

export function resolveNonMotorProduct(policy = {}) {
  const prod = String(
    policy.productName ||
    policy.product ||
    policy.displayPolicyType ||
    policy.policyType ||
    policy.policyCategory ||
    policy.category ||
    "General",
  ).trim();
  return prod;
}

export function buildRenewalWhatsAppMessage({ recipientName, agentName, customerName, policies = [], referenceDate } = {}) {
  const policyInsured = policies.find((p) => p.insuredName || p.customerName);
  const primaryInsured = policyInsured?.insuredName || policyInsured?.customerName || customerName;
  const name = normalizeCustomerName(primaryInsured) || normalizeCustomerName(recipientName) || "Valued Customer";
  const recipient = normalizeRenewalContactName(
    primaryInsured || recipientName || agentName,
    normalizeRenewalContactName(name),
  );
  const reminders = policies
    .map((policy) => {
      const hasDaysRemaining = policy.daysRemaining !== null && policy.daysRemaining !== undefined && policy.daysRemaining !== "";
      const daysLeft = hasDaysRemaining && Number.isFinite(Number(policy.daysRemaining))
        ? Number(policy.daysRemaining)
        : calculateDaysLeft(policy.expiryDate, referenceDate);
      const policyCustomerName = String(policy.insuredName || name).trim() || name;
      const insuranceCompany = String(policy.insuranceCompany || policy.companyName || "your insurer").trim();
      const policyNumber = String(policy.policyNumber || "N/A").trim();
      const expiryDate = renewalDueDate(policy.expiryDate);
      const daysRemainingText = daysLeft !== null && daysLeft !== undefined ? `${daysLeft} days` : "N/A";

      const motor = isMotorPolicy(policy);

      if (motor) {
        return `The Motor Insurance Policy for *${policyCustomerName}* with *${insuranceCompany}* is scheduled to expire soon.

*Policy Number:* ${policyNumber}
*Vehicle:* ${renewalVehicleDescription(policy).replace(/\s+\([^)]*\)$/, "")}
*Registration No.:* ${String(policy.vehicleNumber || policy.registrationNumber || "N/A").trim()}
*Expiry Date:* ${expiryDate}
*Days Remaining:* ${daysRemainingText}`;
      } else {
        const fullProductName = resolveNonMotorProduct(policy);
        let headlineProduct = fullProductName
          .replace(/\s*\([^)]*\)/g, "")
          .replace(/\s+Insurance(?:\s+Policy)?$/i, "")
          .replace(/\s+Policy$/i, "")
          .trim();
        if (!headlineProduct) headlineProduct = fullProductName;

        return `The ${headlineProduct} Insurance Policy for *${policyCustomerName}* with *${insuranceCompany}* is scheduled to expire soon.

*Policy Number:* ${policyNumber}
*Product:* ${fullProductName}
*Expiry Date:* ${expiryDate}
*Days Remaining:* ${daysRemainingText}`;
      }
    })
    .join("\n\n");

  return `Dear ${recipient},

${reminders}

Please connect with us in advance to ensure a smooth renewal, avoid any interruption in coverage, and explore the best renewal options available.

Phone: ${RENEWAL_HELP_NUMBER}
Website: www.bimaheadquarter.com

*Team BimaHeadquarter by InsureDesk IMF Pvt. Ltd.*
_Your Trusted Insurance Partner_`;
}
