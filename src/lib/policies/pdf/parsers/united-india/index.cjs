const { matchGroup } = require("../../utils/regex.cjs");
const { normalizeAmount } = require("../../utils/amounts.cjs");

function parseAmount(val) {
  if (!val) return 0;
  const clean = val.replace(/[^0-9.]/g, "");
  return parseFloat(clean) || 0;
}

function extractUnitedIndiaMotor(text, _sourceFile = "") {
  const isUnitedIndia = /UNITED\s+INDIA\s+INSURANCE/i.test(text) && /uiic\.co\.in/i.test(text);
  const isMotor = /MOTOR\s+INSURANCE/i.test(text) || /VEHICLE\s+DETAILS/i.test(text);

  if (!isUnitedIndia || !isMotor) {
    return { documentDetected: false };
  }

  // 1. Policy Number
  const policyNumber =
    matchGroup(text, /Policy\s*No\.\s*([A-Z0-9]+?)(?=\s*Certificate|$)/i) ||
    matchGroup(text, /Policy Number\s*:\s*([A-Z0-9]{10,25})/i) ||
    "";

  // 2. Insured Name
  let insuredNameRaw =
    matchGroup(text, /Insured Name\/ID\s*:\s*([A-Z\s./0-9]+)/i) ||
    matchGroup(text, /Name of the Insured\s*([A-Z\s.-]+?)(?:W NO|COURT ROAD|Address of the Insured|$)/i) ||
    "";
  let insuredName = insuredNameRaw.split("/")[0].trim();

  // 3. Customer Mobile
  const customerMobile =
    matchGroup(text, /Mobile No\.- ([0-9*]+)/i) ||
    matchGroup(text, /Mobile:\s*([0-9*]+)/i) ||
    "";

  // 4. Policy Type
  let policyType = "";
  const policyTypeMatch = matchGroup(text, /(MOTOR INSURANCE\s*-\s*GCV[A-Z0-9\s-]+?POLICY)/i) ||
                           matchGroup(text, /(MOTOR INSURANCE\s*-\s*[A-Z0-9\s-]+?POLICY)/i);
  if (policyTypeMatch) {
    policyType = policyTypeMatch.replace(/\s+/g, " ").trim();
  } else {
    policyType = "Commercial Vehicle Liability Only Policy";
  }

  // 5. Dates
  const startDate =
    matchGroup(text, /Insurance Start Date & Time\s*:\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(text, /commencement of Insurance.*?on\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    "";
  const expiryDate =
    matchGroup(text, /Insurance expiry Date & Time\s*:\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(text, /Expiry of the Insurance.*?on\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    "";

  // 6. Vehicle Details
  let registrationNumberRaw =
    matchGroup(text, /Registration Number\s*([A-Z0-9\s-]+?)\s*(?:Obsolete|Chassis|Engine|$)/i) ||
    matchGroup(text, /Registration No\.\s*([A-Z0-9\s-]+?)\s*(?:Obsolete|Chassis|Engine|$)/i) ||
    "";
  const registrationNumber = registrationNumberRaw.replace(/\s+/g, "").replace(/-+/g, "-").trim();

  const engineNumber =
    matchGroup(text, /Engine Number\s*([A-Z0-9]+)/i) ||
    matchGroup(text, /Engine No\.\s*([A-Z0-9]+)/i) ||
    "";

  const chassisNumber =
    matchGroup(text, /No\s*&\s*([A-Z0-9]+)/i) ||
    matchGroup(text, /Chassis No\.\s*([A-Z0-9]+)/i) ||
    "";

  let makeModel = "";
  const makeModelMatch = matchGroup(text, /Vehicle Make & Model\s*([\s\S]+?)\s*Type Of Body/i);
  if (makeModelMatch) {
    makeModel = makeModelMatch.replace(/\s+/g, " ").trim();
  }

  const manufacturingYear =
    matchGroup(text, /Year\s+Of\s+Manufacture\s*(\d{4})/i) ||
    matchGroup(text, /Year of Mfg\s*(\d{4})/i) ||
    "";

  let cubicCapacity = "";
  let seatingCapacity = "";
  const capMatch = text.match(/Cubic\s+Capacity\/Seating\s+Capacity\s+(\d+)\/(\d+)/i);
  if (capMatch) {
    cubicCapacity = capMatch[1];
    seatingCapacity = capMatch[2];
  } else {
    cubicCapacity = matchGroup(text, /HP\/Cubic Capacity\s*(\d+)/i) || "";
    seatingCapacity = matchGroup(text, /Seating Capacity\s*(\d+)/i) || "";
  }

  const grossVehicleWeight =
    matchGroup(text, /Gross\s+vehicle\s+Weight\s+(\d+)/i) ||
    matchGroup(text, /GVW\s*(\d+)/i) ||
    "";

  let rto =
    matchGroup(text, /RTA Name\s*([A-Z0-9\s]+?)\s*(?:Vehicle|$)/i) ||
    matchGroup(text, /Registration Authority\s*([A-Z0-9\s]+?)\s*(?:Geographical|$)/i) ||
    "";
  rto = rto.trim();

  let financerName = matchGroup(text, /Financer\s*([A-Z0-9\s]+?)(?:Seating|Applicable|$)/i) || "";
  financerName = financerName.trim();

  // 7. Premium Details
  const totalPremiumVal =
    matchGroup(text, /TOTAL PAYABLE PREMIUM\s*([0-9,]+\.\d{2})/i) ||
    matchGroup(text, /Total\(Rounded Off\):\s*([0-9,]+\.\d{2})/i) ||
    "";
  const totalPremium = normalizeAmount(totalPremiumVal);

  const netPremiumVal =
    matchGroup(text, /Premium\(A\+B\)\s*([0-9,]+\.\d{2})/i) ||
    matchGroup(text, /Premium:\s*([0-9,]+\.\d{2})/i) ||
    "";
  const netPremium = normalizeAmount(netPremiumVal);

  // CGST & SGST
  const cgst1 = parseAmount(matchGroup(text, /CGST-Others\(9%\):\s*([0-9,.]+)/i));
  const sgst1 = parseAmount(matchGroup(text, /SGST-Others\(9%\):\s*([0-9,.]+)/i));
  const cgst2 = parseAmount(matchGroup(text, /CGST-Basic TP\(2\.50%\):\s*([0-9,.]+)/i));
  const sgst2 = parseAmount(matchGroup(text, /SGST-Basic TP\(2\.50%\):\s*([0-9,.]+)/i));
  
  const cgstOthersSchedule = parseAmount(matchGroup(text, /CGST-Others\(9%\)\s*([0-9,.]+)/i));
  const sgstOthersSchedule = parseAmount(matchGroup(text, /SGST-Others\(9%\)\s*([0-9,.]+)/i));
  const cgstTpSchedule = parseAmount(matchGroup(text, /CGST-Basic TP\(2\.50%\)\s*([0-9,.]+)/i));
  const sgstTpSchedule = parseAmount(matchGroup(text, /SGST-Basic TP\(2\.50%\)\s*([0-9,.]+)/i));

  const cgst = cgst1 + cgst2 || cgstOthersSchedule + cgstTpSchedule || 0;
  const sgst = sgst1 + sgst2 || sgstOthersSchedule + sgstTpSchedule || 0;
  const gstAmount = cgst + sgst || (totalPremium && netPremium ? Math.round((parseAmount(totalPremium) - parseAmount(netPremium) - 1.00) * 100) / 100 : 0);

  // Own Damage & TP
  const basicOd = parseAmount(matchGroup(text, /Gross OD\(A\)\s*([0-9,.]+)/i));
  const basicTp = parseAmount(matchGroup(text, /Gross TP\(B\)\s*([0-9,.]+)/i));
  
  const odPremium = basicOd;
  const tpDriverOwner = basicTp;

  return {
    documentDetected: true,
    policyNumber,
    insuredName,
    customerMobile,
    policyType,
    policyStartDate: startDate,
    policyEndDate: expiryDate,
    registrationNumber,
    engineNumber,
    chassisNumber,
    makeModel,
    manufacturingYear,
    cubicCapacity,
    seatingCapacity,
    grossVehicleWeight,
    rto,
    financerName,
    companyName: "United India Insurance Company Limited",
    totalPremium,
    netPremium,
    odPremium,
    tpDriverOwner,
    cgst,
    sgst,
    gstAmount
  };
}

module.exports = {
  extractUnitedIndiaMotor
};
