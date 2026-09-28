const { normalizeAmount } = require("../../utils/amounts.cjs");
const { buildDuration } = require("../../utils/dates.cjs");

const scope = { insurer: "go-digit", category: "motor" };

function matches({ text = "", result = {} }) {
  const category = String(result.documentCategory || result.policyType || "");
  const isDigit = /Go\s+Digit\s+General\s+Insurance\s+Ltd\.?/i.test(text) &&
    /Digit\s+(?:Two-Wheeler|Private\s+Car|Commercial\s+Vehicle)/i.test(text);
  const isMotor = /Motor|Two-Wheeler|Private\s+Car|Commercial\s+Vehicle/i.test(category || text);
  return isDigit && isMotor;
}

function clean(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function amount(value = "") {
  return normalizeAmount(String(value).replace(/,/g, ""));
}

function formatIsoDate(value = "") {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${match[3]}-${months[Number(match[2]) - 1]}-${match[1]}`;
}

function assign(patch, key, value) {
  const normalized = clean(value);
  if (normalized) patch[key] = normalized;
}

function train({ text = "", result = {} }) {
  if (!result || typeof result !== "object") return result;

  const patch = {};
  const productMatch = text.match(/\b(Digit\s+(?:Private\s+Car|Two-Wheeler|Commercial\s+Vehicle)[^\n]*?(?:Policy|Insurance))\s*(?:UIN\s+No\.?|Invoice\s+Date|\n)/i);
  const productName = clean(productMatch?.[1]);
  if (productName) {
    patch.productName = productName;
    patch.policyType = productName;
    patch.policyCoverType = productName;
  }

  assign(patch, "uinNumber", text.match(/UIN\s+No\.?\s*:?[\s\S]{0,80}?(IRDAN158[A-Z0-9]+)/i)?.[1]);
  assign(
    patch,
    "policyNumber",
    text.match(/Policy\s+No\.?\s*:?\s*([A-Z]\d{8,})/i)?.[1] || text.match(/\b([A-Z]\d{8,})\s*\/\s*\d{8}\b/)?.[1],
  );

  const privateCustomer = text.match(
    /YOUR DETAILS\s+([A-Z]\d{8,})\s*\/\s*\d{8}\s+([^\n]+)\s+([^\n]+)\s+([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})\s+([^\n]+)\s+Email:/i,
  );
  const labelledCustomer = text.match(
    /Name\s*(?:M\/S|MS|MR|MRS|DR)?\s*([A-Z][A-Z0-9 .&'/-]{2,100}?)\s*Vehicle Registration No\.?\s*([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})/i,
  );
  const labelledCustomerBlock = text.match(/Name\s*(?:M\/S|MS|MR|MRS|DR)?[\s\S]{0,700}?Digit\s+Two-Wheeler\s+Insurance/i)?.[0] || "";
  const insuredName = clean(privateCustomer?.[5] || labelledCustomer?.[1]).replace(/^(?:M\/S|MS|MR|MRS|DR)\s+/i, "");
  if (insuredName) {
    patch.insuredName = insuredName;
    patch.customerName = insuredName;
    patch.contactPerson = insuredName;
  }

  const footer = text.match(
    /\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})\s+([A-Z][A-Z0-9 &.-]+?)\s+(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})\s+Digit\s+(?:Private\s+Car|Two-Wheeler)/i,
  );
  const registrationNumber = clean(privateCustomer?.[4] || labelledCustomer?.[2] || footer?.[1]).toUpperCase();
  if (registrationNumber) {
    patch.registrationNumber = registrationNumber;
    patch.vehicleNumber = registrationNumber;
  }

  const startDate = formatIsoDate(footer?.[3] || "");
  const expiryDate = formatIsoDate(footer?.[4] || "");
  if (startDate && expiryDate) {
    patch.startDate = startDate;
    patch.expiryDate = expiryDate;
    patch.duration = buildDuration(startDate, expiryDate);
  } else {
    const policyDetails = text.match(/YOUR POLICY DETAILS([\s\S]+?)YOUR VEHICLE DETAILS/i)?.[1] || "";
    const policyDates = [...policyDetails.matchAll(/\b(\d{2}-[A-Za-z]{3}-\d{4})\b/g)].map((match) => match[1]);
    const firstDate = policyDates[0] || "";
    const secondDate = policyDates.find((date) => date !== firstDate) || "";
    if (firstDate && secondDate) {
      patch.startDate = firstDate;
      patch.expiryDate = secondDate;
      patch.duration = buildDuration(firstDate, secondDate);
    }
  }

  const issueDate = text.match(/Policy\s+Issue\s+Date\s*(\d{2}-[A-Za-z]{3}-\d{4})/i)?.[1];
  assign(patch, "policyIssueDate", issueDate);
  assign(patch, "invoiceNumber", text.match(/Invoice\s+No\.?\s*([A-Z0-9]{8,20})/i)?.[1]);
  assign(patch, "invoiceDate", text.match(/Invoice\s+Date\s*(\d{2}-[A-Za-z]{3}-\d{4})/i)?.[1]);

  const vehicleBlock = text.match(/YOUR VEHICLE DETAILS([\s\S]+?)(?:YOUR VEHICLE IDV|FASTag NUMBER DECLARATION)/i)?.[1] || "";
  const vehicleMake = clean(vehicleBlock.match(/\bMake\s*([A-Z][A-Z0-9 &.-]{1,30})(?=\n|Model)/i)?.[1]);
  const modelVariant = vehicleBlock.match(/Model\/Vehicle[\s\S]{0,60}?Type\)\s*([A-Z0-9 .&-]+)\/([^\n]+)/i);
  const vehicleModel = clean(modelVariant?.[1]);
  const variant = clean(modelVariant?.[2]);
  assign(patch, "vehicleMake", vehicleMake);
  assign(patch, "vehicleModel", vehicleModel);
  assign(patch, "variant", variant);
  assign(patch, "makeModel", [vehicleMake, vehicleModel].filter(Boolean).join(" "));
  assign(patch, "bodyType", vehicleBlock.match(/Body\s+Type\s*([A-Za-z ]+?)(?=Fuel\s+Type|\n)/i)?.[1]);
  assign(patch, "fuelType", vehicleBlock.match(/Fuel\s+Type\s*([A-Za-z]+)/i)?.[1]);
  assign(patch, "seatingCapacity", vehicleBlock.match(/Seating\s+Capacity\s*(\d{1,2})/i)?.[1]);
  assign(patch, "cubicCapacity", vehicleBlock.match(/Cubic\s+Capacity\s*(\d+\s*CC)/i)?.[1]);
  assign(patch, "engineNumber", vehicleBlock.match(/Engine\s+No\.?\s*([A-Z0-9]{6,20})(?=Chassis)/i)?.[1]);
  assign(patch, "chassisNumber", vehicleBlock.match(/Chassis\s+No\.?\s*([A-Z0-9]{17})(?=Cubic|\s|$)/i)?.[1]);
  assign(patch, "rtoLocation", vehicleBlock.match(/RTO\s+Location\s*([^\n]+)/i)?.[1]);

  const yearDetails = vehicleBlock.match(/Year\s+of[\s\S]{0,55}?(\d{4})\/([0-9-]{4,10})/i);
  assign(patch, "manufacturingYear", yearDetails?.[1]);
  if (yearDetails?.[2] && !/^0001-/.test(yearDetails[2])) assign(patch, "registrationDate", yearDetails[2]);

  const financier = clean(vehicleBlock.match(/Financier\s+Details\s*([^\n]*)/i)?.[1]);
  if (financier && !/^YOUR\b/i.test(financier) && !/^NA$/i.test(financier)) patch.financerName = financier.replace(/^NA\s*/i, "");

  const idv = amount(text.match(/Year\s*1\s*([0-9]{4,9})/i)?.[1]);
  if (idv) {
    patch.vehicleIdv = idv;
    patch.totalIdv = idv;
    patch.sumInsured = idv;
    patch.idv = idv;
  }

  const ncb = text.match(/NCB\s*%\s*\(Current Policy\)[\s\S]{0,260}?(\d{1,2}\s*%)/i)?.[1] || text.match(/NCB\s*\((\d{1,2}\s*%)\)/i)?.[1];
  assign(patch, "ncbPercentage", ncb);
  assign(patch, "ncb", ncb);

  const premiumInvoice = text.match(
    /Invoice\s+Number\s*Invoice\s+Date\s*Net\s+Premium\s+Igst\s+Cgst\s+Sgst\s+Utgst\s+Cess\s*Gross\s+Premium\s*([A-Z0-9]{8,20})\s*(\d{4}-\d{2}-\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})/i,
  );
  if (premiumInvoice) {
    const netPremium = amount(premiumInvoice[3]);
    const igst = amount(premiumInvoice[4]);
    const cgst = amount(premiumInvoice[5]);
    const sgst = amount(premiumInvoice[6]);
    const grossPremium = amount(premiumInvoice[9]);
    const taxAmount = (Number(igst || 0) + Number(cgst || 0) + Number(sgst || 0)).toFixed(2);
    patch.invoiceNumber = premiumInvoice[1];
    patch.invoiceDate = premiumInvoice[2];
    patch.netPremium = netPremium;
    patch.basicPremium = netPremium;
    patch.igst = igst;
    patch.cgst = cgst;
    patch.sgst = sgst;
    patch.gstAmount = taxAmount;
    patch.taxAmount = taxAmount;
    patch.totalPremium = grossPremium;
    patch.grossPremium = grossPremium;
    patch.premiumIncludingGst = grossPremium;
    patch.premium = grossPremium;

    if (/Digit\s+Private\s+Car/i.test(productName)) {
      const totalsAfterTax = text.match(/CGST\s*@[^\n]+\n([0-9,]+\.\d{2})\n([0-9,]+\.\d{2})/i);
      const totalOdPremium = amount(totalsAfterTax?.[1]);
      if (totalOdPremium && Number(netPremium) > Number(totalOdPremium)) {
        const totalActPremium = (Number(netPremium) - Number(totalOdPremium)).toFixed(2);
        patch.odPremium = totalOdPremium;
        patch.ownDamagePremium = totalOdPremium;
        patch.tpPremium = totalActPremium;
        patch.tpDriverOwner = totalActPremium;
        patch.totalActPremium = totalActPremium;
        patch.liabilityPremium = totalActPremium;
      }
    } else if (/Digit\s+Two-Wheeler/i.test(productName)) {
      const motorTotals = text.match(/Total OD Premium[\s\S]{0,350}?OWN DAMAGE PREMIUM \[A\][\s\S]{0,250}?\n([0-9,]+\.\d{2})\n([0-9,]+\.\d{2})\n([0-9,]+\.\d{2})/i);
      const totalOdPremium = amount(motorTotals?.[1]);
      const totalActPremium = amount(motorTotals?.[2]);
      if (totalOdPremium) {
        patch.odPremium = totalOdPremium;
        patch.ownDamagePremium = totalOdPremium;
      }
      if (totalActPremium) {
        patch.tpPremium = totalActPremium;
        patch.tpDriverOwner = totalActPremium;
        patch.totalActPremium = totalActPremium;
        patch.liabilityPremium = totalActPremium;
      }
    }
  }

  const customerEmail = privateCustomer?.[2] || labelledCustomerBlock.match(/\bEmail\s*\n([^\n]+)/i)?.[1];
  const customerMobile = privateCustomer?.[3] || labelledCustomerBlock.match(/\bMobile\s*\n([^\n]+)/i)?.[1];
  assign(patch, "customerEmail", customerEmail);
  assign(patch, "customerMobile", customerMobile);
  assign(patch, "contactNumber", customerMobile);
  patch.extractionTrainingVersion = "GO_DIGIT_MOTOR_V2";

  return patch;
}

module.exports = { scope, matches, train };
