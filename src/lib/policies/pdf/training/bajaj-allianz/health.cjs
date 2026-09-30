const { sumAmounts, normalizeAmount } = require("../../utils/amounts.cjs");
const { sliceText } = require("../../utils/text.cjs");

const scope = { insurer: "bajaj-allianz", category: "health" };

function formatAmount(value = "") {
  return value ? sumAmounts(value) : "";
}

function normalizeDate(value = "") {
  if (!value) return "";
  const dmyMatch = String(value).match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[1].padStart(2, "0")}/${dmyMatch[2].padStart(2, "0")}/${dmyMatch[3]}`;
  }
  return "";
}

function matches({ text = "" }) {
  if (!/Bajaj\s*(?:Allianz|General)/i.test(text)) return false;
  if (
    /Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Goods\s+Carrying|Passenger\s+Carrying|Drive\s*Assure/i.test(
      text,
    )
  ) {
    return false;
  }
  return (
    /BAJHLGP|Flexi\s+Health\s+Protect|Health\s*Guard|Extra\s*Care|Global\s*Health|Group\s+Policy\s+No|cat-\d/i.test(
      text,
    )
  );
}

function train({ text = "", result = {} }) {
  const patch = {};

  // Policy Number
  const polMatch =
    text.match(/\b(\d{2}-\d{4}-\d{10}-\d{2})\b/) ||
    text.match(/Group\s+Policy\s+No[^\n]*\n[\s\S]*?(\d{2}-\d{4}-\d{10}-\d{2})/) ||
    text.match(/Policy\s+No\.?\s*[:\s]*([A-Z0-9-]+)/i);
  if (polMatch) {
    patch.policyNumber = polMatch[1].trim();
  }

  // Product / Plan Name
  const planMatch =
    text.match(/POLICY\s+SCHEDULE\s*\n\s*([^\n]+)/i) ||
    text.match(/(?:Plan|Product)\s+Name\s*[:\s]*([^\n]+)/i) ||
    text.match(/Flexi\s+Health\s+Protect\s+Plan[^\n]*/i);
  patch.productName = planMatch ? planMatch[1].replace(/UIN.*$/i, "").trim() : "Flexi Health Protect Plan(Group) -Individual";
  patch.policyType = /Group/i.test(patch.productName) ? "Group Health Insurance" : "Health Insurance";
  patch.policyCategory = "Health Insurance";
  patch.policyCoverType = /Group/i.test(patch.productName) ? "Group" : "Individual";

  // Group Policy Holder / Insured Name
  const holderMatch =
    text.match(/Group\s+Policy\s+Holder\s+Name:[\s\S]*?ACTIVE\s*\n\s*([^\n]+)/i) ||
    text.match(/ACTIVE\s*\n\s*([A-Z0-9\s.,&()-]+?(?:LIMITED|PVT|LTD))/i) ||
    text.match(/Group\s+Policy\s+Holder\s+Name\s*[:\s]*([^\n]+)/i) ||
    text.match(/Name\s+of\s+(?:the\s+)?Insured\s*[:\s]*([^\n]+)/i);
  if (holderMatch) {
    patch.insuredName = holderMatch[1].trim();
    patch.customerName = patch.insuredName;
    patch.proposerName = patch.insuredName;
    patch.contactPerson = patch.insuredName;
    patch.groupName = patch.insuredName;
  }

  // Policy Period / Dates
  const periodMatch =
    text.match(/From\s+(\d{1,2}\/\d{1,2}\/\d{4})[^\n]*?To\s+(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
    text.match(/Period\s+From\s*[:\s]*([0-9A-Za-z/-]+)[^\n]*?To\s*[:\s]*([0-9A-Za-z/-]+)/i);
  if (periodMatch) {
    patch.policyStartDate = normalizeDate(periodMatch[1]);
    patch.startDate = patch.policyStartDate;
    patch.policyEndDate = normalizeDate(periodMatch[2]);
    patch.expiryDate = patch.policyEndDate;
  }

  const issueMatch = text.match(/Group\s+Policy\s+Issued\s+on\s*[:\s]*[\s\S]*?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (issueMatch) {
    patch.policyIssuedOn = normalizeDate(issueMatch[1]);
    patch.issueDate = patch.policyIssuedOn;
  }

  // Financials (Premiums & Taxes)
  const premBlockMatch = text.match(/All\s+Premium\s+figures\s+are\s+in\s+Rupees[\s\S]*?CompanyShare/i);
  if (premBlockMatch) {
    const lines = premBlockMatch[0]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const nums = lines.filter((l) => /^\d+$/.test(l));
    if (nums.length >= 7) {
      patch.sgst = formatAmount(nums[0]);
      patch.cgst = formatAmount(nums[1]);
      patch.igst = formatAmount(nums[2]);
      patch.totalPremium = formatAmount(nums[4]);
      patch.grossPremium = patch.totalPremium;
      patch.premium = patch.totalPremium;
      patch.premiumIncludingGst = patch.totalPremium;
      patch.netPremium = formatAmount(nums[5]);
      patch.basicPremium = patch.netPremium;
      patch.gstAmount = formatAmount(Number(nums[0]) + Number(nums[1]) + Number(nums[2]));
      patch.taxAmount = patch.gstAmount;
    }
  }

  if (!patch.netPremium) {
    const baseMatch =
      text.match(/Total\s+Net\s+Premium\s*:\s*\n[^\d]*(\d+)/i) ||
      text.match(/Policy\s+Base\s+Premium[^\n]*\n[\s\S]*?(\d{4,})/i) ||
      text.match(/Net\s+Premium\s*[:\s]*([0-9,.]+)/i);
    if (baseMatch) {
      patch.netPremium = formatAmount(baseMatch[1]);
      patch.basicPremium = patch.netPremium;
    }
  }

  if (!patch.totalPremium) {
    const grossMatch =
      text.match(/Gross\s+Premium[\s\S]*?\n\s*(\d{4,})/i) ||
      text.match(/Total\s+Premium\s*[:\s]*([0-9,.]+)/i);
    if (grossMatch) {
      patch.totalPremium = formatAmount(grossMatch[1]);
      patch.grossPremium = patch.totalPremium;
      patch.premium = patch.totalPremium;
      patch.premiumIncludingGst = patch.totalPremium;
    }
  }

  // Sum Insured & Members
  const siMatch =
    text.match(/cat-1(\d{2})(\d)(\d{7})/i) ||
    text.match(/cat-1\s*(\d{2})\s*(\d)\s*(\d+)/i);
  if (siMatch) {
    patch.numberOfInsuredMembers = parseInt(siMatch[1], 10);
    patch.totalSumInsured = formatAmount(siMatch[3]);
    patch.sumInsured = patch.totalSumInsured;
  }

  // Address
  const addrMatch =
    text.match(/INSUREDESK\s+IMF\s+PRIVATE\s+LIMITED\s*\n([\s\S]+?)(?=\n\s*\d{6}\b)/i) ||
    text.match(/Address\s*:\s*\n?\s*([^\n]+(?:\n[^\n]+)?)(?=\s*Pin\s*Code|\s*Contact)/i);
  if (addrMatch) {
    patch.communicationAddress = addrMatch[1].replace(/\s+/g, " ").trim();
    patch.mailingAddress = patch.communicationAddress;
  }

  const blockMatch = text.match(/Pincode:\s*(\d{6})\s*\n\s*\d{6}\s*\n\s*([6-9]\d{9})\s*\n\s*([A-Z0-9]{8,12})/i);
  if (blockMatch) {
    patch.pincode = blockMatch[1];
    patch.contactNumber = blockMatch[2];
    patch.partnerId = blockMatch[3];
  } else {
    const pinMatch = text.match(/Pincode\s*[:\s]*(\d{6})/i) || text.match(/Pin\s*Code\s*[:\s]*[\s\S]*?(\b\d{6}\b)/i);
    if (pinMatch) {
      patch.pincode = pinMatch[1];
    }
    const contactMatch = text.match(/Contact\s*Number\s*[:\s]*([6-9]\d{9})/i) || text.match(/\b([6-9]\d{9})\b/);
    if (contactMatch) {
      patch.contactNumber = contactMatch[1];
    }
    const partnerMatch = text.match(/Partner\s*Id\s*[:\s]*([A-Z0-9]+)/i) || text.match(/\b(PO\d{6,10})\b/);
    if (partnerMatch) {
      patch.partnerId = partnerMatch[1];
    }
  }

  // Intermediary Details
  const agentNameMatch = text.match(/Broker\s*\/\s*Agent\s+Name\s*([^\n]+)/i);
  if (agentNameMatch) {
    patch.agentName = agentNameMatch[1].trim();
  }

  const agentCodeMatch =
    text.match(/Broker\s*\/\s*Agent\s+Code[\s\S]*?(\b1010\d{4}\b)/i) ||
    text.match(/\b(1010\d{4})\b/);
  if (agentCodeMatch) {
    patch.agentCode = agentCodeMatch[1];
  }

  const agentEmailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (agentEmailMatch) {
    patch.agentEmail = agentEmailMatch[1];
  }

  const agentMobileMatch =
    text.match(/Broker\s*\/Agent\s+Email\s*\n\s*(\d{10})/i) ||
    text.match(/Broker\/Agent\s+Contact\s+No[\s\S]*?(\d{10})/i);
  if (agentMobileMatch) {
    patch.agentMobile = agentMobileMatch[1];
  }

  // TPA
  const tpaMatch = text.match(/TPA\s+Name\s*\n\s*([^\n]+(?:\n[^\n]+)?)/i);
  if (tpaMatch) {
    patch.tpaName = tpaMatch[1].replace(/\s+/g, " ").trim();
  }

  // Previous policy
  const prevMatch = text.match(/Previous\s+Policy\s+No\s*[:\s]*([A-Za-z0-9/-]+)/i);
  patch.previousPolicyNumber = prevMatch && !/^Policy/i.test(prevMatch[1]) ? prevMatch[1].trim() : "NA";

  // Zero out motor fields to ensure absolute isolation
  patch.vehicleNumber = "";
  patch.registrationNumber = "";
  patch.makeModel = "";
  patch.vehicleMake = "";
  patch.vehicleModel = "";
  patch.variant = "";
  patch.manufacturingYear = "";
  patch.registrationDate = "";
  patch.engineNumber = "";
  patch.chassisNumber = "";
  patch.fuelType = "";
  patch.cubicCapacity = "";
  patch.seatingCapacity = "";
  patch.grossVehicleWeight = "";
  patch.idv = "";
  patch.totalIdv = "";
  patch.compulsoryDeductible = "";
  patch.voluntaryDeductible = "";
  patch.totalPackagePremium = "";
  patch.ncb = "";
  patch.rtoLocation = "";

  patch.extractionTrainingVersion = "BAJAJ_ALLIANZ_HEALTH_V1";

  return patch;
}

module.exports = { scope, matches, train };
