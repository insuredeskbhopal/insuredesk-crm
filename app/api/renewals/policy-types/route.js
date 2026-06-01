import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");

    const tenantFilter = getTenantFilter(user, "read");

    const records = await prisma.policyRecord.findMany({
      where: {
        ...tenantFilter,
        isActivePolicy: true
      },
      select: {
        selectedCompany: true,
        selectedPolicyType: true,
        data: true,
        reviewedData: true
      }
    });

    const policyTypes = new Set();
    records.forEach((r) => {
      const payload = r.reviewedData || r.data || {};
      const compName = r.selectedCompany || payload.insuranceCompany || payload.companyName || payload.insurerName || "";
      const pType = normalizePolicyFamily({
        ...payload,
        selectedPolicyType: r.selectedPolicyType
      });
      
      if (!company || company.toLowerCase() === "all" || compName.trim().toLowerCase() === company.trim().toLowerCase()) {
        if (pType.trim()) {
          policyTypes.add(pType.trim());
        }
      }
    });

    return Response.json({ policyTypes: Array.from(policyTypes).sort() });
  } catch (error) {
    console.error("Renewals policy-types fetch failed:", error);
    return Response.json({ error: "Failed to load policy types." }, { status: 500 });
  }
}

function normalizePolicyFamily(record = {}) {
  const haystack = [
    record.policyType,
    record.selectedPolicyType,
    record.documentCategory,
    record.policyCoverType,
    record.insuranceCompany,
    record.companyName,
    record.sourceFile,
    record.description,
    record.vehicleNumber,
    record.registrationNumber,
    record.engineNumber,
    record.chassisNumber
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!haystack.trim()) return "";
  if (/\b(motor|vehicle|private\s+car|two\s+wheeler|commercial\s+vehicle|goods\s+carrying|auto\s+secure|registration|chassis|engine)\b/.test(haystack) ||
    /\b[a-z]{2}[-\s]?\d{1,2}[-\s]?[a-z]{1,3}[-\s]?\d{4}\b/.test(haystack)) {
    return "Motor Policy";
  }
  if (/\b(fire|sfsp|standard\s+fire|msme\s+suraksha|burglary|warehouse|stock|contents|property|industrial\s+all\s+risk)\b/.test(haystack)) return "Fire Policy";
  if (/\b(health|mediclaim|medical|family\s+floater|critical\s+illness|hospital|personal\s+accident|pa policy)\b/.test(haystack)) return "Health Policy";
  if (/\b(life|term\s+life|endowment|ulip|whole\s+life|annuity|pension)\b/.test(haystack)) return "Life Policy";
  if (/\b(travel|journey|overseas|student\s+travel)\b/.test(haystack)) return "Travel Policy";
  if (/\b(marine|transit|cargo|inland\s+transit)\b/.test(haystack)) return "Marine Policy";
  if (/\b(home|householder|building|contents)\b/.test(haystack)) return "Home Policy";
  if (/\b(engineering|contractor|erection|machinery|boiler|plant)\b/.test(haystack)) return "Engineering Policy";
  if (/\b(liability|professional\s+indemnity|public\s+liability|workmen|cyber)\b/.test(haystack)) return "Liability Policy";
  return cleanPolicyType(record.policyType || record.selectedPolicyType || "General Policy");
}

function cleanPolicyType(value) {
  return String(value || "")
    .replace(/\b(package|comprehensive|liability\s*only|third\s*party|zero\s*dep(?:reciation)?|nil\s*dep(?:reciation)?|own\s*damage)\b/ig, "")
    .replace(/\s*[-–—:]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
