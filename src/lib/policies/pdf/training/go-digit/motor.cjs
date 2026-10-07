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
    patch.policyCoverType = /Stand-?alone\s+Own\s+Damage/i.test(productName)
      ? "Standalone Own Damage"
      : productName;
  }

  assign(patch, "uinNumber", text.match(/UIN\s+No\.?\s*:?[\s\S]{0,80}?(IRDAN158[A-Z0-9]+)/i)?.[1]);
  assign(
    patch,
    "policyNumber",
    text.match(/\b([A-Z]\d{8,})\s*\/\s*\d{8}\b/)?.[1] ||
      text.match(/Policy\s+No\.?\s*:?\s*([A-Z]\d{8,})/i)?.[1],
  );

  const privateCustomer = text.match(
    /YOUR DETAILS\s+([A-Z]\d{8,})\s*\/\s*\d{8}\s+([^\n]+)\s+([^\n]+)\s+([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})\s+([^\n]+)\s+Email:/i,
  );
  const labelledCustomer = text.match(
    /Name\s*(?:M\/S|MS|MR|MRS|DR)?\s*([A-Z][A-Z0-9 .&'/-]{2,100}?)\s*Vehicle Registration No\.?\s*([A-Z]{2}\d{2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2}|[A-Z0-9]{8,11})/i,
  );
  const labelledCustomerBlock = text.match(/Name\s*(?:M\/S|MS|MR|MRS|DR)?[\s\S]{0,700}?Digit\s+Two-Wheeler\s+Insurance/i)?.[0] || "";
  const insuredName = clean(privateCustomer?.[5] || labelledCustomer?.[1]).replace(/^(?:M\/S|MS|MR|MRS|DR)\s+/i, "");
  if (insuredName) {
    patch.insuredName = insuredName;
    patch.customerName = insuredName;
    patch.contactPerson = insuredName;
  }

  const footer = text.match(
    /\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})\s+([A-Z][A-Z0-9 &.-]+?)\s+(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})\s+Digit\s+(?:Private\s+Car|Two-Wheeler)/i,
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
  const vehicleMake = clean(vehicleBlock.match(/\bMake\s*([A-Z][A-Z0-9 &.-]{1,30})(?=\n|Model|Electrical)/i)?.[1]);
  const modelVariant = vehicleBlock.match(/Model\/Vehicle[\s\S]{0,60}?Type\)\s*([A-Z0-9 .&-]+)\/([^\n]+?)(?=CNG|Trailer|Fuel|\n|$)/i);
  const vehicleModel = clean(modelVariant?.[1]);
  const variant = clean(modelVariant?.[2]);
  assign(patch, "vehicleMake", vehicleMake);
  assign(patch, "vehicleModel", vehicleModel);
  assign(patch, "variant", variant);
  assign(patch, "makeModel", [vehicleMake, vehicleModel].filter(Boolean).join(" "));
  assign(patch, "bodyType", vehicleBlock.match(/Body\s+Type\s*([A-Za-z ]+?)(?=Fuel\s+Type|\n)/i)?.[1]);
  assign(patch, "fuelType", vehicleBlock.match(/Fuel\s+Type\s*(Diesel|Petrol|CNG|LPG|Electric|Hybrid|[A-Za-z]+?)(?=Trailer|CNG|LPG|\n|\s|$)/i)?.[1]);
  assign(patch, "seatingCapacity", vehicleBlock.match(/Seating\s+Capacity\s*(\d{1,2})/i)?.[1]);
  assign(patch, "cubicCapacity", vehicleBlock.match(/Cubic\s+Capacity\s*(\d+\s*CC)/i)?.[1]);
  assign(patch, "engineNumber", vehicleBlock.match(/Engine\s+No\.?\s*([A-Z0-9]{6,20}?)(?=Chassis|\s|$)/i)?.[1]);
  assign(patch, "chassisNumber", vehicleBlock.match(/Chassis\s+No\.?\s*([A-Z0-9]{17})/i)?.[1]);
  assign(patch, "rtoLocation", vehicleBlock.match(/RTO\s+Location\s*([^\n]+)/i)?.[1]);

  const mfgYear = vehicleBlock.match(/(?:Year of Regn\/Year of Mfg\.?|Year\s+of[\s\S]{0,55}?)\s*(\d{4})/i)?.[1];
  assign(patch, "manufacturingYear", mfgYear);
  const regDateMatch = vehicleBlock.match(/Year\s+of[\s\S]{0,55}?\d{4}\/([0-9-]{4,10})/i);
  if (regDateMatch?.[1] && !/^0001-/.test(regDateMatch[1])) assign(patch, "registrationDate", regDateMatch[1]);

  const financier = clean(vehicleBlock.match(/Financier\s+Details\s*([^\n]*)/i)?.[1]);
  if (financier && !/^YOUR\b/i.test(financier) && !/^NA$/i.test(financier)) patch.financerName = financier.replace(/^NA\s*/i, "");

  const idv = amount(
    text.match(/Total\s+IDV\s*\([^)]*\)\s*([0-9,]+(?:\.\d{2})?)/i)?.[1] ||
    text.match(/Vehicle\s+IDV\s*\([^)]*\)\s*([0-9,]+(?:\.\d{2})?)/i)?.[1] ||
    text.match(/Year\s*1\s*([0-9]{4,9})/i)?.[1]
  );
  if (idv) {
    patch.vehicleIdv = idv;
    patch.totalIdv = idv;
    patch.sumInsured = idv;
    patch.idv = idv;
  }

  const ncb = text.match(/NCB\s*%\s*\(Current Policy\)[\s\S]{0,260}?(\d{1,2}\s*%)/i)?.[1] ||
    text.match(/NCB\s*\((\d{1,2}\s*%)\)/i)?.[1] ||
    text.match(/(\d{1,2}\s*%)\s*\n(?:Digit Private-Car|NCB)/i)?.[1];
  assign(patch, "ncbPercentage", ncb);
  assign(patch, "ncb", ncb);

  const addressMatch = text.match(/Address\s*([^\n]+(?:\n[^\n]+){1,3}?)(?=\n\s*(?:Partner|Mobile|Pin|Email))/i);
  if (addressMatch) {
    const cleanAddr = clean(addressMatch[1]);
    patch.mailingAddress = cleanAddr;
    patch.communicationAddress = cleanAddr;
    patch.address = cleanAddr;
    const pin = cleanAddr.match(/\b(\d{6})\b/);
    if (pin) patch.pinCode = pin[1];
  }

  assign(patch, "partnerName", text.match(/Partner\s+Name\s*:?\s*([^\n]+)/i)?.[1]);
  assign(patch, "partnerCode", text.match(/Partner\s+Code\s*:?\s*([A-Z0-9]+)/i)?.[1]);
  assign(patch, "partnerMobile", text.match(/Partner\s+Mobile\s+No\.?\s*:?\s*([0-9]{10})/i)?.[1]);
  assign(patch, "partnerEmail", text.match(/Partner\s+Email\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1]);
  if (patch.partnerName) patch.agentName = patch.partnerName;
  if (patch.partnerCode) patch.agentCode = patch.partnerCode;
  if (patch.partnerMobile) patch.agentMobile = patch.partnerMobile;
  if (patch.partnerEmail) patch.agentEmail = patch.partnerEmail;

  if (/Compulsory\s+Deductible/i.test(text)) {
    patch.compulsoryDeductible = "1000.00";
    patch.voluntaryDeductible = "0.00";
  }

  const tpPolicy = text.match(/(\d{15,25})\s*\n\s*The New India Assurance/i)?.[1] ||
    text.match(/THIRD\s+PARTY\s+LIABILITY\s+DETAILS[\s\S]*?Policy\s+No\.?\s*\n\s*(\d{15,25})/i)?.[1];
  const tpInsurer = text.match(/\d{15,25}\s*\n\s*([^\n]+Assurance[^\n]*)/i)?.[1] ||
    text.match(/THIRD\s+PARTY\s+LIABILITY\s+DETAILS[\s\S]*?Insurer\s*\n\s*([^\n]+)/i)?.[1];
  const tpDates = text.match(/THIRD\s+PARTY\s+LIABILITY\s+DETAILS\s*\n\s*(\d{2}-[A-Za-z]{3}-\d{4})\s*\n\s*(\d{2}-[A-Za-z]{3}-\d{4})/i);
  if (tpPolicy) {
    patch.activeTpPolicyNumber = tpPolicy;
    patch.bundledPolicyNumber = tpPolicy;
  }
  if (tpInsurer) {
    patch.activeTpInsurer = clean(tpInsurer);
    patch.bundledInsurer = clean(tpInsurer);
  }
  if (tpDates) {
    patch.activeTpStartDate = tpDates[1];
    patch.activeTpEndDate = tpDates[2];
    patch.bundledPolicyPeriod = `${tpDates[1]} to ${tpDates[2]}`;
  }

  assign(patch, "previousPolicyNumber", text.match(/([A-Z]\d{8,})\s*\n\s*(?:Go Digit General Insurance Limited|Previous Own Damage)/i)?.[1]);
  assign(patch, "previousInsurer", text.match(/([A-Z]\d{8,})\s*\n\s*(Go Digit[^\n]+)/i)?.[2]);
  assign(patch, "previousPolicyExpiryDate", text.match(/OTHER DETAILS\s*\n\s*\d+\s*\n\s*(\d{2}-[A-Za-z]{3}-\d{4})/i)?.[1]);
  assign(patch, "receiptNumber", text.match(/\b(RA\d{8,})\b/)?.[1]);
  assign(patch, "receiptDate", text.match(/OTHER DETAILS\s*\n\s*\d+\s*\n\s*\d{2}-[A-Za-z]{3}-\d{4}\s*\n\s*(\d{2}-[A-Za-z]{3}-\d{4})/i)?.[1]);
  assign(patch, "endorsements", text.match(/\b(IMT-\d+)\b/)?.[1]);

  const addOnsOpted = [];
  if (/Parts\s+Depreciation\s+Protect/i.test(text)) addOnsOpted.push("Zero Depreciation");
  if (/Breakdown\s+Assistance/i.test(text)) addOnsOpted.push("Road Side Assistance");
  if (/Loss\s+to\s+Personal\s+Belongings/i.test(text)) addOnsOpted.push("Loss to Personal Belongings");
  if (/Key\s+&\s+Lock\s+Protect/i.test(text)) addOnsOpted.push("Key & Lock Protect");
  if (addOnsOpted.length) patch.addOnsOpted = addOnsOpted;

  const premiumInvoice = text.match(
    /Invoice\s+Number[\s\S]{0,120}?Gross\s+Premium\s*([A-Z0-9]{8,15}?)(\d{4}-\d{2}-\d{2})([0-9,]+\.\d{2})([0-9,]+\.\d{2})([0-9,]+\.\d{2})([0-9,]+\.\d{2})([0-9,]+\.\d{2})([0-9,]+\.\d{2})([0-9,]+\.\d{2})/i,
  ) || text.match(
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

    const isStandaloneOD = /Stand-?alone\s+Own\s+Damage/i.test(productName);
    if (isStandaloneOD) {
      const basicOd = amount(text.match(/OWN\s+DAMAGE\s+PREMIUM\s+\[A\][\s\S]{0,100}?\n([0-9,]+\.\d{2})/i)?.[1] || text.match(/Total Basic Owm Damage Premium[\s\S]*?Others\s*\n([0-9,]+\.\d{2})/i)?.[1]);
      const addonPrem = amount(text.match(/Total Basic Owm Damage Premium[\s\S]*?Others\s*\n[0-9,.]+\s*\n[0-9,.]+\s*\n([0-9,]+\.\d{2})/i)?.[1]);
      const ncbDisc = amount(text.match(/OWN\s+DAMAGE\s+PREMIUM\s+\[A\][\s\S]{0,100}?\n[0-9,.]+\s+([0-9,]+\.\d{2})/i)?.[1]);
      patch.odPremium = netPremium;
      patch.ownDamagePremium = netPremium;
      if (basicOd) patch.basicOwnDamage = basicOd;
      if (addonPrem) patch.addonPremium = addonPrem;
      if (ncbDisc) patch.ncbDiscount = ncbDisc;
      patch.tpPremium = "0.00";
      patch.totalActPremium = "0.00";
      patch.liabilityPremium = "0.00";
    } else if (/Digit\s+Private\s+Car/i.test(productName)) {
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

  const customerEmail = privateCustomer?.[2] ||
    text.match(/\bEmail\s*\n\s*([a-zA-Z0-9._%+-xX]+@[a-zA-Z0-9.-xX]+)/i)?.[1] ||
    labelledCustomerBlock.match(/\bEmail\s*\n([^\n]+)/i)?.[1];
  const customerMobile = privateCustomer?.[3] ||
    text.match(/\bMobile\s*\n\s*([xX0-9]{10,14})/i)?.[1] ||
    labelledCustomerBlock.match(/\bMobile\s*\n([^\n]+)/i)?.[1];
  assign(patch, "customerEmail", customerEmail);
  assign(patch, "customerMobile", customerMobile);
  assign(patch, "contactNumber", customerMobile);
  patch.extractionTrainingVersion = "GO_DIGIT_MOTOR_V2";

  return patch;
}

module.exports = { scope, matches, train };
