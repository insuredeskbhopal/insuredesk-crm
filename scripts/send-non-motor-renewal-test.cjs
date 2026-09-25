const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function normalizeCustomerName(value) {
  const name = String(value || "").trim();
  return name && name !== "N/A" && name !== "-" ? name : "";
}

function resolveNonMotorProduct(policy) {
  return String(policy.productName || policy.product || policy.displayPolicyType || policy.policyType || policy.policyCategory || policy.category || "General").trim();
}

function excelDateToString(raw) {
  if (!raw) return "N/A";
  const s = String(raw).trim();
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

async function main() {
  // Use the non-motor ACE INFOTEXIS policy
  const rec = await prisma.policyRecord.findFirst({
    where: {
      id: "11d3c74c-35f0-4f95-9d81-8ba1f9e54f31",
      deletedAt: null,
    },
  });

  if (!rec) {
    console.log("Policy not found, trying second non-motor...");
    // Try the other one
    const rec2 = await prisma.policyRecord.findFirst({
      where: { id: "1fea7164-1a0d-48eb-86ee-c128a7718ce3", deletedAt: null },
    });
    if (!rec2) { console.log("No policy found."); await prisma.$disconnect(); return; }
    Object.assign(rec, rec2);
  }

  const reviewed = rec.reviewedData || {};
  const data = rec.data || {};
  const m = { ...data, ...reviewed };

  const policyCustomerName = String(m.insuredName || m.customerName || "Valued Customer").trim();
  const insuranceCompany = String(m.insuranceCompany || m.companyName || "your insurer").trim();
  const policyNumber = String(m.policyNumber || "N/A").trim();
  const expiryDate = excelDateToString(m.expiryDate || m.policyEndDate);

  const fullProductName = resolveNonMotorProduct(m);
  let headlineProduct = fullProductName
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+Insurance(?:\s+Policy)?$/i, "")
    .replace(/\s+Policy$/i, "")
    .trim();
  if (!headlineProduct) headlineProduct = fullProductName;

  const today = new Date(); today.setHours(0,0,0,0);
  const expDate = new Date(m.expiryDate || m.policyEndDate);
  expDate.setHours(0,0,0,0);
  const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemainingText = `${daysLeft} days`;
  const recipient = normalizeCustomerName(policyCustomerName) || "Valued Customer";

  console.log("=== POLICY DETAILS ===");
  console.log("Customer:", policyCustomerName);
  console.log("Company:", insuranceCompany);
  console.log("Policy#:", policyNumber);
  console.log("Category:", m.policyCategory || m.category || m.documentCategory);
  console.log("Product:", fullProductName);
  console.log("Expiry:", expiryDate);
  console.log("Days Left:", daysLeft);

  const message = `Dear ${recipient},

The ${headlineProduct} Insurance Policy for *${policyCustomerName}* with *${insuranceCompany}* is scheduled to expire soon.

*Policy Number:* ${policyNumber}
*Product:* ${fullProductName}
*Expiry Date:* ${expiryDate}
*Days Remaining:* ${daysRemainingText}

Please connect with us in advance to ensure a smooth renewal, avoid any interruption in coverage, and explore the best renewal options available.

Phone: +91 88188 89660
Website: www.bimaheadquarter.com

*Team BimaHeadquarter by InsureDesk IMF Pvt. Ltd.*
_Your Trusted Insurance Partner_`;

  console.log("\n=== MESSAGE ===\n");
  console.log(message);
  console.log("\n=== SENDING TO 8839707135 ===\n");

  const rawBaseUrl = process.env.WHATSAPP_GATEWAY_URL || process.env.OPENWA_BASE_URL || "";
  const rawApiKey = process.env.WHATSAPP_GATEWAY_API_KEY || process.env.OPENWA_API_KEY || "";
  const baseUrl = rawBaseUrl.trim().replace(/\/$/, "");
  const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, "");
  if (!baseUrl || !apiKey) { console.log("Gateway not configured."); await prisma.$disconnect(); return; }
  const normalizedBase = /^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`;

  const res = await fetch(`${normalizedBase}/send-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ to: "918839707135", content: message }),
  });
  const result = await res.json();
  console.log("Gateway response:", JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
