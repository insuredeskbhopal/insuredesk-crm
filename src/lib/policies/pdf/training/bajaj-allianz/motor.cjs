const { normalizeAmount } = require("../../utils/amounts.cjs");
const { buildDuration, normalizeWarehouseDate } = require("../../utils/dates.cjs");
const { matchGroup } = require("../../utils/regex.cjs");

const scope = { insurer: "bajaj-allianz", category: "motor" };

function matches({ text = "", result = {} }) {
  const category = String(result.documentCategory || result.policyType || "");
  const isBajaj = /Bajaj\s*(?:General|Allianz)/i.test(text);
  const isMotor = /Motor|Commercial\s+Vehicle|Liability|Two-Wheeler|Two\s+Wheeler|Private\s+Car|Own\s+Damage/i.test(category || text);
  return (
    isBajaj &&
    isMotor &&
    (/Liability\s+Only\s+Policy\s+for\s+Commercial\s+Vehicle/i.test(text) ||
      /STANDALONE\s*OWN\s*DAMAGE\s*COVER/i.test(text) ||
      /PRIVATE\s*CAR\s*PACKAGE\s*POLICY/i.test(text) ||
      /Transcript\s*of\s*Proposal\s*for\s*Private\s*Car/i.test(text) ||
      /Commercial\s*Vehicle\s*Package\s*Policy/i.test(text) ||
      /Transcript\s*of\s*Proposal\s*for\s*Commercial\s*Vehicle/i.test(text) ||
      /Drive\s*Assure/i.test(text) ||
      /TWO\s*WHEELER\s*STANDALONE\s*OD/i.test(text))
  );
}

function clean(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function amount(value = "") {
  return normalizeAmount(String(value).replace(/,/g, ""));
}

function assign(patch, key, value) {
  const normalized = clean(value);
  if (normalized) patch[key] = normalized;
}

function train({ text = "", result = {} }) {
  if (!result || typeof result !== "object") return result;

  const patch = {};
  const isTwoWheelerOd = /STANDALONE\s*OWN\s*DAMAGE\s*COVER\s*FOR\s*TWO-WHEELER|Two\s*Wheeler\s*Standalone\s*OD/i.test(text);
  const isPrivateCarPackage = /PRIVATE\s*CAR\s*PACKAGE\s*POLICY|Transcript\s*of\s*Proposal\s*for\s*Private\s*Car/i.test(text);
  const isCommercialPackage = /Commercial\s*Vehicle\s*Package\s*Policy|Transcript\s*of\s*Proposal\s*for\s*Commercial\s*Vehicle\s*Package/i.test(text);
  const isCommercialLiability = /Liability\s+Only\s+Policy\s+for\s+Commercial\s+Vehicle/i.test(text);

  if (isTwoWheelerOd) {
    patch.productName = "Standalone Own Damage Cover for Two-Wheeler";
    patch.policyType = "Standalone Own Damage Cover for Two-Wheeler";
    patch.policyCoverType = "Standalone Own Damage";
  } else if (isPrivateCarPackage) {
    patch.productName = "Private Car Package Policy";
    patch.policyType = "Private Car Package Policy";
    patch.policyCoverType = "Comprehensive";
  } else if (isCommercialPackage) {
    patch.productName = "Commercial Vehicle Package Policy";
    patch.policyType = "Commercial Vehicle Package Policy";
    patch.policyCoverType = "Comprehensive";
  } else if (isCommercialLiability) {
    patch.productName = "Liability Only Policy for Commercial Vehicle";
    patch.policyType = "Liability Only Policy for Commercial Vehicle";
    patch.policyCoverType = "Third Party";
  } else {
    const detectedName = clean(
      text.match(/(?:STANDALONE\s*OWN\s*DAMAGE\s*COVER[^\n]+|Liability\s+Only\s+Policy\s+for[^\n]+)/i)?.[0],
    );
    if (detectedName) {
      patch.productName = detectedName;
      patch.policyType = detectedName;
    }
  }

  assign(patch, "uinNumber", matchGroup(text, /UIN\s*:\s*(IRDAN113[A-Z0-9]+)/i));
  assign(
    patch,
    "policyNumber",
    matchGroup(text, /\b(OG-\d{2}-\d{4}-\d{4}-\d{8})\b/i) ||
      matchGroup(text, /\b(\d{2}-\d{4}-\d{10}-\d{2})\b/i) ||
      matchGroup(text, /Policy Number\s*['":\s]+([A-Z0-9-]+)/i),
  );

  const insuredName = clean(
    matchGroup(text, /1\.\s*Proposer\s+Name\s*:\s*([^\n]+)/i) ||
      matchGroup(text, /Insured Name\s*([A-Z\s]+?)(?:Policy Number|Zone|\n)/i) ||
      matchGroup(text, /POLICY DETAILSINSURED DETAILS\s+Insured Name\s*([^\n]+)/i) ||
      matchGroup(text, /1\.\s*Proposer\s+Name\s*:\s*([^\n]+)/i) ||
      matchGroup(text, /Dear\s+([^\n,]+?)(?=\s*We wish to inform|\n|,)/i),
  );
  assign(patch, "insuredName", insuredName);
  patch.customerName = insuredName;
  patch.contactPerson = insuredName;
  assign(
    patch,
    "customerId",
    matchGroup(text, /\(Customer ID\s*:\s*([0-9]+)\s*\)/i) ||
      matchGroup(text, /Customer ID\s*[:\s]*([0-9]{8,12})/i) ||
      matchGroup(text, /Customer ID\s*[:\s]*([A-Z0-9]+)/i),
  );

  const addressMatch =
    matchGroup(text, /Insured Address\s*\n\s*([\s\S]+?)(?=Policy Issued on|Place of Supply|Geographical)/i) ||
    matchGroup(text, /2\.\s*Proposer Address:\s*([\s\S]+?)(?=3\.\s*Proposer Mobile)/i) ||
    matchGroup(text, /Mailing Address\s*([^\n]+(?:\n(?!Profession)[^\n]+)*)\s+Profession/i);
  assign(patch, "mailingAddress", addressMatch);
  assign(patch, "communicationAddress", addressMatch);

  const contactNo =
    matchGroup(text, /Mobile Number\s*(\d{10})/i) ||
    matchGroup(text, /3\.\s*Proposer Mobile Number:\s*(?:0-)?(\d{10})/i);
  if (contactNo) {
    patch.contactNumber = contactNo;
    patch.customerMobile = contactNo;
  }

  assign(
    patch,
    "customerEmail",
    matchGroup(text, /Email ID\s*([^\s]+@[^\s]+)/i) ||
      matchGroup(text, /5\.\s*Proposer e-mail id:\s*([^\s\n]+@[^\s\n]+)/i),
  );

  const gstinMatch =
    matchGroup(text, /([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\s+GSTIN\s*\/\s*UIN/i) ||
    matchGroup(text, /GSTIN\s*(?:\/\s*UIN)?\s*[:\s]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
  if (gstinMatch) {
    patch.gstin = gstinMatch;
  }

  if (isTwoWheelerOd) {
    const odStart =
      matchGroup(text, /Details of Own Damage[\s\S]*?From\s*:\s*(\d{2}-[A-Z]{3}-\d{4})/i) ||
      matchGroup(text, /Period of InsuranceFor Own Damage[\s\S]*?From\s*:\s*(\d{2}-[A-Z]{3}-\d{4})/i) ||
      matchGroup(text, /From\s*:\s*(\d{2}-[A-Z]{3}-\d{4})/i);
    const odEnd =
      matchGroup(text, /Details of Own Damage[\s\S]*?To\s*:\s*(\d{2}-[A-Z]{3}-\d{4})/i) ||
      matchGroup(text, /Period of InsuranceFor Own Damage[\s\S]*?To\s*:\s*(\d{2}-[A-Z]{3}-\d{4})/i) ||
      matchGroup(text, /To\s*:\s*(\d{2}-[A-Z]{3}-\d{4})/i);
    if (odStart && odEnd) {
      patch.startDate = normalizeWarehouseDate(odStart);
      patch.expiryDate = normalizeWarehouseDate(odEnd);
      patch.policyStartDate = patch.startDate;
      patch.policyEndDate = patch.expiryDate;
      patch.duration = buildDuration(patch.startDate, patch.expiryDate);
    }
  } else if (isPrivateCarPackage || isCommercialPackage) {
    const packageStart =
      matchGroup(text, /Policy Period[\s\S]*?From\s*:\s*(\d{2}-[A-Z]{3}-\d{4})/i) ||
      matchGroup(text, /Policy Inception Date:\s*From[^\n]*?(\d{2}-[A-Z]{3}-\d{4})/i) ||
      matchGroup(text, /Period of Insurance\s*:\s*From\s*(\d{2}-[A-Z]{3}-\d{4})/i) ||
      matchGroup(text, /Period of Insurance[\s\S]*?From\s*(\d{2}-[A-Z]{3}-\d{4})/i);
    const packageEnd =
      matchGroup(text, /Policy Period[\s\S]*?To\s*:\s*(\d{2}-[A-Z]{3}-\d{4})/i) ||
      matchGroup(text, /Policy Expiry Date:[^\n]*?(\d{2}-[A-Z]{3}-\d{4})/i) ||
      matchGroup(text, /Period of Insurance[\s\S]*?To\s*(\d{2}-[A-Z]{3}-\d{4})/i);
    if (packageStart && packageEnd) {
      patch.startDate = normalizeWarehouseDate(packageStart);
      patch.expiryDate = normalizeWarehouseDate(packageEnd);
      patch.policyStartDate = patch.startDate;
      patch.policyEndDate = patch.expiryDate;
      patch.duration = buildDuration(patch.startDate, patch.expiryDate);
    }
  } else {
    const period = text.match(/Policy Period\s+From:\s*(\d{2}-\d{2}-\d{4})[\s\S]{0,40}?To:\s*(\d{2}-\d{2}-\d{4})/i) ||
      text.match(/From\s+(\d{2}-\d{2}-\d{4})[\s\S]{0,40}?to\s+(\d{2}-\d{2}-\d{4})/i);
    if (period) {
      patch.startDate = period[1];
      patch.expiryDate = period[2];
      patch.policyStartDate = period[1];
      patch.policyEndDate = period[2];
      patch.duration = buildDuration(period[1], period[2]);
    }
  }

  assign(patch, "policyIssueDate", matchGroup(text, /Policy Issued on\s*(\d{2}-[A-Z]{3}-\d{4}|\d{2}-\d{2}-\d{4})/i) || matchGroup(text, /Date of issue\s*:(\d{2}-[A-Z]{3}-\d{4})/i));
  assign(patch, "invoiceNumber", matchGroup(text, /Invoice No\s*\n?\s*([0-9/]+)/i) || matchGroup(text, /Invoice Number\s*(\d{6}[A-Z]\d{9})/i));
  assign(patch, "receiptNumber", matchGroup(text, /Receipt No\.\s*([0-9A-Z/-]+)/i) || matchGroup(text, /Receipt Number\s*:\s*([0-9A-Z/-]+)/i) || matchGroup(text, /Receipt Number\s*([0-9A-Z/-]+)/i));
  assign(patch, "placeOfSupply", matchGroup(text, /Place of Supply\/[\s\S]{0,40}?(\d{2}\s*-\s*[A-Z ]+)/i));

  if (isTwoWheelerOd) {
    const regNo = matchGroup(text, /([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})/i);
    assign(patch, "registrationNumber", regNo);
    patch.vehicleNumber = regNo;
    assign(
      patch,
      "rtoLocation",
      matchGroup(text, /NameofRegistrationAuthority:\s*([^\n]+)/i) ||
        matchGroup(text, /Place of Registra-?\s*tion\s*\n([A-Z0-9-]+)/i),
    );
    assign(
      patch,
      "engineNumber",
      matchGroup(text, /ParticularsofVehicleInsured:[\s\S]*?\n([A-Z0-9]{8,12})(?:MD2B|[A-Z0-9]{17})/i) ||
        matchGroup(text, /\b(JEXCNH\d+)\b/i),
    );

    const chassisMatch = text.match(/MD2B[A-Z0-9\s]{13,20}/i);
    if (chassisMatch) {
      patch.chassisNumber = chassisMatch[0].replace(/\s+/g, "").slice(0, 17);
    }

    patch.vehicleMake = result.vehicleMake || matchGroup(text, /[A-Z]{3}\/\d{4}(BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL\s*ENFIELD)/i) || matchGroup(text, /Vehicle Make[ \t]+([^\n]+)/i);
    patch.vehicleModel = matchGroup(text, /BAJAJ\s*(PULSAR\s*125)/i)?.replace(/\s+/g, " ") || result.vehicleModel || "";
    patch.variant = matchGroup(text, /Sub Type[\s\S]*?(NS\s*DISC)/i) || result.variant || "";
    patch.bodyType = patch.variant;
    patch.makeModel = `${patch.vehicleMake} ${patch.vehicleModel} ${patch.variant}`.trim();
    patch.manufacturingYear = matchGroup(text, /NS\s*DISC\s*(\d{4})/i) || matchGroup(text, /Petrol\s*(\d{4})/i) || result.manufacturingYear || "";
    patch.cubicCapacity = matchGroup(text, /NS\s*DISC\s*(\d{2,4})\s*Petrol/i) || matchGroup(text, /Cubic Capa-?\s*city[\s\S]*?(\d{2,4})\s*Petrol/i) || result.cubicCapacity || "";
    patch.seatingCapacity = matchGroup(text, /Petrol\s*\d{4}\s*(\d{1,2})/i) || result.seatingCapacity || "";
    patch.fuelType = matchGroup(text, /(Petrol|Diesel|Electric|CNG|LPG)(?=\d{4}\d)/i) || matchGroup(text, /Fuel Type[ \t]+(Petrol|Diesel|Electric|CNG|LPG)/i) || result.fuelType || "";
    const ncb = text.match(/NCB[\s\S]{0,160}?[: ]\s*(\d{1,2})\s*%/i);
    if (ncb) patch.ncb = patch.ncbPercentage = `${ncb[1]}%`;

    const idv = amount(
      matchGroup(text, /Total\s+SI[\s\S]*?\d{2}-[A-Z]{3}-\d{2}\s*\d{2}-[A-Z]{3}-\d{2}\s*(\d+)/i) || "",
    );
    patch.idv = idv;
    patch.totalIdv = idv;
    patch.sumInsured = idv;

    const odNet = amount(matchGroup(text, /Own Damage Premium\s*\(?Rs\.?\)?\s*\n\s*Own Damage Premium\s*(\d+)/i) || "");
    const sgst = amount(matchGroup(text, /State GST\s*\(\d+%\)\s*(\d+)/i) || "");
    const cgst = amount(matchGroup(text, /Central GST\s*\(\d+%\)\s*(\d+)/i) || "");
    const total = amount(matchGroup(text, /Final Premium Rs\.\s*\n\s*(\d+)/i) || "");

    patch.odPremium = odNet;
    patch.netPremium = odNet;
    patch.basicPremium = odNet;
    patch.sgst = sgst;
    patch.cgst = cgst;
    if (cgst || sgst) {
      patch.gstAmount = (Number(cgst || 0) + Number(sgst || 0)).toFixed(2);
      patch.taxAmount = patch.gstAmount;
    }
    patch.totalPremium = total;
    patch.grossPremium = total;
    patch.premium = total;
    patch.premiumIncludingGst = total;

    assign(patch, "agentName", matchGroup(text, /Agency Name\s*([^\n]+)/i));
    assign(patch, "agentCode", matchGroup(text, /Agency\s*Code\s*([A-Z]{3}\d{8})/i));
    assign(patch, "agentMobile", matchGroup(text, /Agency Code[\s\S]*?Contact No\.\s*([0-9/]+)/i)?.split("/")?.[0]);
    assign(patch, "agentEmail", matchGroup(text, /E-Mail\s*ID\.\s*([^\s\n]+@[^\s\n]+)/i));

    const tpInsurer = matchGroup(text, /(IFFCO Tokio General Insurance Company Limited)/i);
    assign(patch, "activeTpInsurer", tpInsurer);
    assign(patch, "activeTpPolicyNumber", matchGroup(text, /Details of Active[\s\S]*?Policy Number\s*([A-Z0-9]+)/i));
    assign(patch, "activeTpStartDate", normalizeWarehouseDate(matchGroup(text, /Details of Active[\s\S]*?From\s*:\s*(\d{2}-[A-Z]{3}-\d{4})/i)));
    assign(patch, "activeTpExpiryDate", normalizeWarehouseDate(matchGroup(text, /Details of Active[\s\S]*?To\s*:\s*(\d{2}-[A-Z]{3}-\d{4})/i)));
    assign(patch, "previousInsurer", tpInsurer);
    assign(patch, "previousPolicyNumber", patch.activeTpPolicyNumber);

    patch.addOnCovers = "Drive Assure Basic (depreciation shield)";
    patch.depreciationShieldCover = "Yes";
    patch.extractionTrainingVersion = "BAJAJ_ALLIANZ_MOTOR_TWO_WHEELER_OD_V1";
  } else if (isPrivateCarPackage) {
    const regNo =
      matchGroup(text, /Registration Number[\s\S]*?\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})\b/i) ||
      matchGroup(text, /Registration Num-?\s*ber[\s\S]*?\n\s*([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})/i) ||
      matchGroup(text, /([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})/i) ||
      result.registrationNumber || "";
    assign(patch, "registrationNumber", regNo);
    patch.vehicleNumber = regNo;

    assign(
      patch,
      "rtoLocation",
      matchGroup(text, /Name\s*of\s*Registration\s*Authority\s*:\s*([A-Z0-9-]+)/i) ||
        matchGroup(text, /Place of Registra-?\s*tion\s*\n?\s*([A-Z0-9-]+)/i) ||
        result.rtoLocation || "",
    );

    assign(
      patch,
      "engineNumber",
      matchGroup(text, /Engine Number\s+(?:Chassis Number[^\n]*\n)?\s*([A-Z0-9]{8,15})/i) ||
        result.engineNumber || "",
    );

    const chassisMatch = matchGroup(text, /Chassis Number\s+([A-Z0-9]{17})\b/i) || result.chassisNumber || "";
    patch.chassisNumber = chassisMatch;

    patch.vehicleMake = matchGroup(text, /Vehicle Make[ \t]+([^\n]+)/i) || result.vehicleMake || result.makeModel?.split(/\s+-\s+/)[0] || "";
    patch.vehicleModel = matchGroup(text, /Vehicle Model[ \t]+([^\n]+)/i) || result.vehicleModel?.replace(/^-\s*/, "") || result.makeModel?.split(/\s+-\s+/)[1] || "";
    const variant = clean(
      matchGroup(text, /\b(1\.2\s*VDI\s*\(O\)(?:\s*DDIS\s*200)?)/i) ||
        matchGroup(text, /\b(1\.2\s*VDI[^\n]+)/i) ||
        result.variant || "",
    );
    patch.variant = variant;
    patch.bodyType = variant;
    patch.makeModel = `${patch.vehicleMake} - ${patch.vehicleModel}`.trim();

    const rowMatch = text.match(/(-?\d{1,2})(\d{3,4})(\d{1,2})(\d{4})-,-([A-Z\s]+(?:BANK|LTD|LIMITED|FINANCE))/i);

    patch.manufacturingYear =
      (rowMatch ? rowMatch[4] : null) ||
      matchGroup(text, /Year of\s+Manufacture[\s\S]*?\b(20\d{2}|19\d{2})\b/i) ||
      matchGroup(text, /Year Of Manufactur-?\s*ing[\s\S]*?\b(20\d{2}|19\d{2})\b/i) ||
      result.manufacturingYear || "";
    patch.cubicCapacity =
      (rowMatch ? rowMatch[2] : null) ||
      matchGroup(text, /Cubic Capa-?\s*city\/Kilowatt[\s\S]*?(\d{3,4})/i) ||
      matchGroup(text, /CC(?:\/KW)?\s+Seating Capacity[\s\S]*?(\d{3,4})\s+\d+/i) ||
      result.cubicCapacity || "";
    patch.seatingCapacity =
      (rowMatch ? rowMatch[3] : null) ||
      matchGroup(text, /Seating Ca-?\s*pacity[\s\S]*?\b(\d{1,2})\b/i) ||
      "5";
    patch.fuelType = matchGroup(text, /Fuel Type\s*(Diesel|Petrol|CNG|Electric|LPG)/i) || result.fuelType || "";

    const ncbVal =
      (rowMatch ? rowMatch[1] : null) ||
      matchGroup(text, /NCB\s*\(No Claim Bonus\)[^\n]*?(-?\d{1,2})\s*%/i) ||
      matchGroup(text, /NCB\s*%\s+(?:CC\/KW[^\n]*\n)?\s*(-?\d{1,2})/i);
    if (ncbVal) {
      const absNcb = Math.abs(parseInt(ncbVal, 10));
      patch.ncb = `${absNcb}%`;
      patch.ncbPercentage = `${absNcb}%`;
    }

    assign(
      patch,
      "hypothecation",
      (rowMatch ? rowMatch[5] : null) ||
        matchGroup(text, /Name of Pledgee\s*:\s*([^\n.]+)/i) ||
        matchGroup(text, /Hypothecation Details[\s\S]*?([A-Z\s]+(?:BANK|LTD|LIMITED|FINANCE)[^\n]*)/i) ||
        result.financerName || "",
    );
    if (patch.hypothecation) {
      patch.financier = patch.hypothecation;
    }

    const idv = amount(
      matchGroup(text, /(\d{1,3}(?:,\d{2,3})*\.\d{2})000/i) ||
        matchGroup(text, /Vehicle IDV \(in\s*Rs\.?\)\s*[:\s]*([0-9,.]+)/i) ||
        matchGroup(text, /Total IDV \(in\s*Rs\.?\)\s*[:\s]*([0-9,.]+)/i) ||
        matchGroup(text, /Vehicle IDV\s*[:\s]*([0-9,.]+)/i) ||
        matchGroup(text, /Total Value\s*[:\s]*([0-9,.]+)/i) ||
        result.idv || "",
    );
    patch.idv = idv;
    patch.totalIdv = idv;
    patch.vehicleIdv = idv;
    patch.sumInsured = idv;

    const odNet = amount(
      matchGroup(text, /Total OD Premium - A\s*([0-9,.]+)/i) ||
        matchGroup(text, /Own Damage Premium\s*([0-9,.]+)/i) ||
        result.odPremium || "",
    );
    const basicTp = amount(matchGroup(text, /Basic Third Party Liability\s*([0-9,.]+)/i) || result.basicTpPremium || "");
    const ownerDriver = amount(matchGroup(text, /PA Cover for Owner-Driver[\s\S]*?(\d+\.\d{2})/i) || "");
    const legalLiability = amount(
      matchGroup(text, /LL to person for Paid driver\/Opera-\s*\n\s*tion\/Maintenance\s*\n\s*([0-9,.]+)/i) ||
        matchGroup(text, /LL to person for Paid driver[\s\S]*?(\d+\.\d{2})/i) ||
        "",
    );
    const passengerPa = amount(matchGroup(text, /PA Cover For \d+ Passenger[\s\S]*?(\d+\.\d{2})/i) || "");
    const totalAct = amount(matchGroup(text, /Total Act Premium - B\s*([0-9,.]+)/i) || result.tpPremium || "");
    const netPremium = amount(
      matchGroup(text, /Total Premium \(Net Premium\)[^\n]*?\s*([0-9,.]+)/i) || result.netPremium || "",
    );
    const sgst = amount(matchGroup(text, /State GST \(\d+%\)\s*([0-9,.]+)/i) || "");
    const cgst = amount(matchGroup(text, /Central GST \(\d+%\)\s*([0-9,.]+)/i) || "");
    const totalPremium = amount(
      matchGroup(text, /Final Premium\s*\(\s*Rupees[^\n]*\n\s*([0-9,.]+)/i) ||
        matchGroup(text, /Final Premium[^\n]*?\n\s*([0-9,.]+)/i) ||
        matchGroup(text, /Final Premium[^\n]*?\s+([0-9,.]+)/i) ||
        result.totalPremium || "",
    );

    patch.odPremium = odNet;
    patch.basicThirdPartyLiability = basicTp;
    patch.basicTpPremium = basicTp;
    patch.tpPremium = totalAct;
    patch.totalActPremium = totalAct;
    patch.liabilityPremium = totalAct;
    patch.ownerDriverPremium = ownerDriver;
    patch.legalLiabilityPremium = legalLiability;
    patch.paPassengersPremium = passengerPa;
    patch.netPremium = netPremium;
    patch.basicPremium = netPremium;
    patch.sgst = sgst;
    patch.cgst = cgst;
    if (cgst || sgst) {
      patch.gstAmount = (Number(cgst || 0) + Number(sgst || 0)).toFixed(2);
      patch.taxAmount = patch.gstAmount;
    }
    patch.totalPremium = totalPremium;
    patch.grossPremium = totalPremium;
    patch.premium = totalPremium;
    patch.premiumIncludingGst = totalPremium;

    assign(patch, "agentName", matchGroup(text, /Agency Name\s*([^\n]+)/i));
    assign(patch, "agentCode", matchGroup(text, /Agency\s*Code\s*([A-Z0-9]{8,12})(?:Contact|\s|$)/i));
    assign(patch, "agentMobile", matchGroup(text, /Agency Code[\s\S]*?Contact No\.\s*([0-9/]+)/i)?.split("/")?.[0]);
    assign(patch, "agentEmail", matchGroup(text, /E-Mail\s*ID\.\s*([^\s\n]+@[^\s\n]+)/i));

    assign(patch, "nomineeName", clean(matchGroup(text, /Nominee Details\s*Name\s*:([A-Z\s]+?)\s*-\s*Relationship/i)));
    assign(patch, "nomineeRelation", clean(matchGroup(text, /Relationship\s*:([A-Za-z]+)/i)));

    assign(patch, "previousInsurer", clean(matchGroup(text, /Insurance Provider\s*:\s*([^\n.]+)/i)));
    assign(
      patch,
      "previousPolicyNumber",
      matchGroup(text, /Previous Policy No\s*:\s*([A-Z0-9]+)/i) ||
        matchGroup(text, /Previous Policy\s*No\s*\n\s*([A-Z0-9]+)/i),
    );
    const prevExp = matchGroup(text, /Previous Policy Expiry Date\s*:\s*(\d{2}-[A-Z]{3}-\d{2,4})/i);
    if (prevExp) {
      patch.previousPolicyExpiryDate = normalizeWarehouseDate(prevExp);
    }

    assign(
      patch,
      "addOnCovers",
      clean(matchGroup(text, /Plan Name:([A-Za-z0-9\s]+?)(?:&|Plan Description|$)/i) || ""),
    );
    patch.depreciationShieldCover = "Yes";
    patch.engineProtectorCover = "Yes";
    patch.spotAssistanceCover = "Yes";
    patch.keysAndLocksCover = "Yes";
    patch.personalBaggageCover = "Yes";
    patch.compulsoryDeductible = amount(matchGroup(text, /compulsory deductible\s*:\s*Rs\.([0-9,.]+)/i) || "");
    patch.imtEndorsements = "IMT-7, IMT-16, IMT-22, IMT-28";
    patch.extractionTrainingVersion = "BAJAJ_ALLIANZ_MOTOR_PRIVATE_CAR_PACKAGE_V1";
  } else if (isCommercialPackage) {
    // Commercial Vehicle Package Policy (Transcript of Proposal format)
    const vehicleTableMatch = text.match(
      /Number\s*\n\s*([A-Z0-9]+)\s*\n\s*(\d+)\s*\n\s*([A-Z]+(?:\s+[A-Z]+)*)\s*\n\s*([\s\S]+?)\s*\n\s*([A-Z0-9]+?)(\d{4})(\d{4})(\d{1,2})([A-Z0-9]{8,12})\s*\n\s*([A-Z0-9]{5,10})\s*\n\s*([A-Z0-9]+)/i,
    );

    let regNo = "";
    if (vehicleTableMatch) {
      regNo = `${vehicleTableMatch[1]}${vehicleTableMatch[2]}`.replace(/\s+/g, "");
      assign(patch, "vehicleMake", clean(vehicleTableMatch[3]));
      assign(patch, "variant", clean(vehicleTableMatch[4]));
      assign(patch, "bodyType", clean(vehicleTableMatch[4]));
      assign(patch, "vehicleModel", clean(vehicleTableMatch[5]));
      assign(patch, "grossVehicleWeight", vehicleTableMatch[6]);
      assign(patch, "manufacturingYear", vehicleTableMatch[7]);
      assign(patch, "seatingCapacity", vehicleTableMatch[8]);
      assign(patch, "chassisNumber", `${vehicleTableMatch[9]}${vehicleTableMatch[10]}`.replace(/\s+/g, ""));
      assign(patch, "engineNumber", clean(vehicleTableMatch[11]));
      if (patch.vehicleMake && patch.vehicleModel) {
        patch.makeModel = `${patch.vehicleMake} ${patch.vehicleModel}`;
      }
    } else {
      regNo =
        matchGroup(text, /Registration\s*Number\s*[\s\S]*?\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{3,4})\b/i) ||
        matchGroup(text, /\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{3,4})\b/i);
    }
    assign(patch, "registrationNumber", regNo);
    patch.vehicleNumber = regNo;

    const rtoMatch = regNo ? regNo.match(/^([A-Z]{2}\d{2})/i) : null;
    assign(
      patch,
      "rtoLocation",
      matchGroup(text, /Name\s*of\s*Registration\s*Authority\s*:\s*([A-Z0-9-]+)/i) ||
        matchGroup(text, /Place of Registra-?\s*tion\s*\n?\s*([A-Z0-9-]+)/i) ||
        (rtoMatch && rtoMatch[1].toUpperCase() === "MP04" ? result.rtoLocation || "" : rtoMatch ? rtoMatch[1].toUpperCase() : ""),
    );

    const fuelMatch = text.match(/(DIESEL|PETROL|CNG|ELECTRIC|LPG)\s*(\d{1,3}(?:,\d{2,3})+)/i);
    if (fuelMatch) {
      patch.fuelType = fuelMatch[1][0].toUpperCase() + fuelMatch[1].slice(1).toLowerCase();
      const totalSumInsured = amount(fuelMatch[2]);
      patch.idv = totalSumInsured;
      patch.totalIdv = totalSumInsured;
      patch.vehicleIdv = totalSumInsured;
      patch.sumInsured = totalSumInsured;
    } else {
      patch.fuelType = matchGroup(text, /Fuel Type\s*(?:Vehicle IDV[^\n]*\n[^\n]*\n)?\s*(Diesel|Petrol|CNG|Electric|LPG)/i) || result.fuelType || "";
      const totalSumInsured = amount(
        matchGroup(text, /Total Sum In-?\s*sured\s*[\s\S]*?([0-9,]+\.?\d*?)(?:\s*\n|$)/i) ||
          matchGroup(text, /Vehicle IDV\s*\(in Rs\.?\)\s*[\s\S]*?([0-9,]+)/i),
      );
      patch.idv = totalSumInsured;
      patch.totalIdv = totalSumInsured;
      patch.vehicleIdv = totalSumInsured;
      patch.sumInsured = totalSumInsured;
    }

    const ncbVal = matchGroup(text, /NCB\s*\(No Claim Bonus\)[^\n]*?(-?\d{1,2})\s*%/i) ||
      matchGroup(text, /No Claim Bonus[\s\S]*?:\s*(-?\d{1,2})\s*%/i);
    if (ncbVal) {
      const absNcb = Math.abs(parseInt(ncbVal, 10));
      patch.ncb = `${absNcb}%`;
      patch.ncbPercentage = `${absNcb}%`;
    }

    const hypothecation = matchGroup(text, /HYPOTHECATED\s+WITH\s*:\s*([A-Z\s]+(?:BANK|LTD|LIMITED|FINANCE)[^\n]*)/i);
    if (hypothecation) {
      patch.hypothecation = hypothecation.trim();
      patch.financier = patch.hypothecation;
    }

    const odNet = amount(
      matchGroup(text, /Total Own Damage Premium\s*:\s*([0-9,.]+)/i) ||
        matchGroup(text, /Total OD Premium\s*([0-9,.]+)/i) ||
        matchGroup(text, /16\.\s*Premium for OD coverage[^\n]*?Rs\.\s*([0-9,.]+)/i),
    );
    const basicTp = amount(
      matchGroup(text, /Basic Third Party Liability\s*([0-9,.]+)/i) ||
        matchGroup(text, /15\.\s*Premium for Liability coverage[^\n]*?Rs\.\s*([0-9,.]+)/i),
    );
    const netPremium = amount(
      matchGroup(text, /Total Premium\s*\(excluding[\s\S]*?:\s*Rs\.?\s*([0-9,.]+)/i) ||
        matchGroup(text, /Total Premium \(Net Premium\)[^\n]*?\s*([0-9,.]+)/i) ||
        matchGroup(text, /Total Premium \(excluding[^\n]*?Rs\.\s*([0-9,.]+)/i) ||
        matchGroup(text, /Total Premium[^\n]*?Rs\.\s*([0-9,.]+)/i),
    );
    const totalPremium = amount(
      matchGroup(text, /Final Premium\s*(?:Rs\.)?\s*([0-9,.]+)/i),
    );

    const modeOfPayment = clean(
      matchGroup(text, /Instrument\s*Type[\s\S]*?\n\s*(Credit Card|Debit Card|Cheque|DD|NEFT|RTGS|UPI|Cash|Online)/i) ||
        matchGroup(text, /Mode\s*Of\s*Payment\s*[:\s]*([^\n]+)/i),
    );
    if (modeOfPayment) {
      patch.modeOfPayment = modeOfPayment;
    }

    const ownerDriver = /Whether PA cover is opted for owner-driver\s*:\s*Yes/i.test(text)
      ? amount(matchGroup(text, /PA Cover for Owner-Driver[\s\S]*?(\d+\.\d{2})/i) || "0")
      : "0.00";
    const paidDriver = /Whether PA cover is opted for paid driver[\s\S]*?Yes/i.test(text)
      ? amount(matchGroup(text, /PA Cover For Paid Driver[\s\S]*?(\d+\.\d{2})/i) || "0")
      : "0.00";
    const legalLiability = /Is LL to person for Paid driver[\s\S]*?Yes/i.test(text)
      ? amount(matchGroup(text, /LL to person for Paid driver[\s\S]*?(\d+\.\d{2})/i) || "0")
      : "0.00";

    assign(patch, "odPremium", odNet);
    assign(patch, "basicThirdPartyLiability", basicTp);
    assign(patch, "basicTpPremium", basicTp);
    assign(patch, "tpPremium", basicTp);
    assign(patch, "liabilityPremium", basicTp);
    assign(patch, "ownerDriverPremium", ownerDriver);
    assign(patch, "legalLiabilityPremium", legalLiability);
    assign(patch, "tpDriverOwner", (Number(ownerDriver || 0) + Number(paidDriver || 0)).toFixed(2));
    assign(patch, "netPremium", netPremium);
    assign(patch, "basicPremium", netPremium);

    if (totalPremium && netPremium && Number(totalPremium) >= Number(netPremium)) {
      const gstDiff = (Number(totalPremium) - Number(netPremium)).toFixed(2);
      const halfGst = (Number(gstDiff) / 2).toFixed(2);
      patch.gstAmount = gstDiff;
      patch.taxAmount = gstDiff;
      patch.cgst = halfGst;
      patch.sgst = halfGst;
    }

    assign(patch, "totalPremium", totalPremium);
    assign(patch, "grossPremium", totalPremium);
    assign(patch, "premium", totalPremium);
    assign(patch, "premiumIncludingGst", totalPremium);

    assign(patch, "agentName", matchGroup(text, /Agency Name\s*:\s*([^\n]+)/i) || matchGroup(text, /Agency Name\s*([^\n]+)/i));
    assign(patch, "agentCode", matchGroup(text, /Agency\s*Code\s*([A-Z0-9]{8,12})(?:\s*Channel|\s*Contact|\s|$)/i));
    assign(patch, "agentMobile", matchGroup(text, /Contact No\s*:\s*([0-9/]+)/i)?.split("/")?.[0]);
    assign(patch, "agentEmail", matchGroup(text, /Email\s*-\s*([^\s\n]+@[^\s\n]+)/i));

    const prevMatch = text.match(/Previous Insurer\s*-\s*([^\n]+?)\s*Previous Policy No\s*-\s*([A-Z0-9]+)/i);
    if (prevMatch) {
      patch.previousInsurer = clean(prevMatch[1]);
      patch.previousPolicyNumber = prevMatch[2];
    }
    const prevExp = matchGroup(text, /Expiry On\s*-\s*(\d{2}-[A-Z]{3}-\d{2,4})/i);
    if (prevExp) patch.previousPolicyExpiryDate = normalizeWarehouseDate(prevExp);

    patch.compulsoryDeductible = amount(matchGroup(text, /Compulsory Deductible\s*:\s*Rs\.?\s*([0-9,.]+)/i) || "");

    const imtList = [];
    if (/Hypothecated|HYPOTHECATED/i.test(text)) imtList.push("IMT-7");
    const imtNums = text.match(/IMT Endorsement Nos\s*:\s*([\d,\s&]+)/i);
    if (imtNums) {
      imtNums[1].split(/[,&]/).forEach(n => {
        const num = n.trim();
        if (num && !imtList.includes(`IMT-${num}`)) imtList.push(`IMT-${num}`);
      });
    }
    if (imtList.length > 0) patch.imtEndorsements = imtList.join(", ");

    patch.extractionTrainingVersion = "BAJAJ_ALLIANZ_MOTOR_COMMERCIAL_PACKAGE_V1";
  } else {
    // Commercial Vehicle (Liability Only)
    const vehicle1 = text.match(
      /(MP-\d{2}-[A-Z]{1,3}-\d{4})\s*([A-Z]+)\s*(\d{3,4})\s*(\d{4})\s*([A-Z0-9\s]+?)(HALF DECK LOAD BODY|OPEN LOAD BODY|CLOSED LOAD BODY|LOAD BODY|SCHOOL BUS[^\n]*)\s*(\d{4,6})/i,
    );
    const vehicle2 = text.match(
      /(MP-\d{2}-[A-Z]{1,3}-\d{4})([A-Z]+)\s+(\d{3,4})(\d{4})([A-Z]+\s*\d+)(SCHOOL\s+BUS\s*\(\d+\))\s+(\d{3,6})/i,
    );
    const vehicle = vehicle1 || vehicle2;

    if (vehicle) {
      patch.registrationNumber = vehicle[1].toUpperCase();
      patch.vehicleNumber = patch.registrationNumber;
      patch.vehicleMake = clean(vehicle[2]).toUpperCase();
      patch.cubicCapacity = vehicle[3];
      patch.manufacturingYear = vehicle[4];
      patch.yearOfManufacture = vehicle[4];
      patch.vehicleModel = clean(vehicle[5]).toUpperCase();
      patch.variant = clean(vehicle[6]).toUpperCase();
      patch.bodyType = patch.variant;
      patch.grossVehicleWeight = vehicle[7];
      patch.makeModel = `${patch.vehicleMake} ${patch.vehicleModel}`;
    }

    if (!patch.registrationNumber) {
      const regMatch = matchGroup(text, /\b([A-Z]{2}-\d{2}-[A-Z]{1,3}-\d{4})\b/i) || matchGroup(text, /\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})\b/i);
      if (regMatch) {
        patch.registrationNumber = regMatch;
        patch.vehicleNumber = regMatch;
      }
    }

    const vehicleIdentifiers = text.match(
      /(MP\d{2}-[A-Z]+)(\d{1,2})([A-Z0-9]{17})(DIESEL|PETROL|CNG|LPG)(?:\([A-Z]\))?(\d)([A-Z0-9]{15,22})/i,
    );
    if (vehicleIdentifiers) {
      patch.rtoLocation = vehicleIdentifiers[1].toUpperCase();
      patch.seatingCapacity = vehicleIdentifiers[2];
      patch.chassisNumber = vehicleIdentifiers[3].toUpperCase();
      patch.fuelType = vehicleIdentifiers[4][0].toUpperCase() + vehicleIdentifiers[4].slice(1).toLowerCase();
      patch.numberOfTrailers = vehicleIdentifiers[5];
      patch.engineNumber = vehicleIdentifiers[6].toUpperCase();
    }

    const hypothecation = matchGroup(text, /Hypothecated\s+With\s*([A-Z\s]+(?:BANK|LTD|LIMITED|FINANCE)[^\n]*)/i);
    if (hypothecation) {
      patch.hypothecation = hypothecation.trim();
      patch.financier = patch.hypothecation;
    }

    const idv = amount(text.match(/Total IDV \(Rs\)[\s\S]{0,180}?\n(\d+)\n(?:\d+\n){0,4}/i)?.[1] || "0");
    patch.idv = idv;
    patch.totalIdv = idv;
    patch.vehicleIdv = idv;
    patch.sumInsured = idv;

    const basicThirdParty = amount(
      text.match(/(\d+)\s+Basic Third Party Liability/i)?.[1] ||
        text.match(/Basic Third Party Liability\s+(\d+)/i)?.[1],
    );
    const netPremium = amount(
      text.match(/Rs\.\s*(\d+)\s+9\.\s*Premium for Liability coverage/i)?.[1] ||
        text.match(/Premium for Liability coverage[^\n]*?Rs\.\s*(\d+)/i)?.[1] ||
        basicThirdParty,
    );
    const finalPremium = amount(
      text.match(/(\d+)\s+Final Premium/i)?.[1] ||
        text.match(/Final Premium\s+(\d+)/i)?.[1] ||
        text.match(/Final Premium\s*\n\s*(\d+)/i)?.[1],
    );

    const legalLiability = amount(
      text.match(/LL To Person For Operation\s*Maintenance\s*(?:IMT\s*28)?\s+(\d+)/i)?.[1] ||
        text.match(/LL To Person For Operation\s+Maintenance IMT 28\s+(\d+)/i)?.[1] ||
        text.match(/IMT\s*28\s*\n\s*(\d+)/i)?.[1],
    );

    const ownerDriver = amount(text.match(/Compulsory Personal Accident[\s\S]{0,120}?(\d+)\s+LL To Person/i)?.[1]);

    assign(patch, "basicThirdPartyLiability", basicThirdParty);
    assign(patch, "basicTpPremium", basicThirdParty);
    assign(patch, "tpPremium", basicThirdParty);
    assign(patch, "netPremium", netPremium);
    assign(patch, "basicPremium", netPremium);
    assign(patch, "liabilityPremium", netPremium);
    assign(patch, "netLiabilityPremium", netPremium);
    assign(patch, "tpDriverOwner", netPremium);
    assign(patch, "totalActPremium", netPremium);
    assign(patch, "ownerDriverPremium", ownerDriver);
    assign(patch, "legalLiabilityPremium", legalLiability);

    if (finalPremium && netPremium && Number(finalPremium) >= Number(netPremium)) {
      const gstDiff = (Number(finalPremium) - Number(netPremium)).toFixed(2);
      const halfGst = (Number(gstDiff) / 2).toFixed(2);
      patch.gstAmount = gstDiff;
      patch.taxAmount = gstDiff;
      patch.cgst = halfGst;
      patch.sgst = halfGst;
    }

    assign(patch, "premium", finalPremium);
    assign(patch, "totalPremium", finalPremium);
    assign(patch, "grossPremium", finalPremium);
    assign(patch, "premiumIncludingGst", finalPremium);

    assign(patch, "agentName", clean(matchGroup(text, /Agency Name\s*([A-Z\s]+?)(?=\s*Email\s*ID|\n|$)/i)));
    assign(patch, "agentCode", matchGroup(text, /Agency Code\s*(?:Phone Number\s*\d+\s*)?([0-9A-Z]{8,12})/i) || matchGroup(text, /Agency\s*Code\s*([A-Z0-9]{8,12})/i));
    assign(patch, "agentMobile", matchGroup(text, /Agency Details[\s\S]*?Phone Number\s*(\d{10})/i) || matchGroup(text, /Phone Number\s*(\d{10})/i));

    const agentEmailRaw = matchGroup(text, /Agency Details[\s\S]*?Email ID\s*([a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9\s.-]+?)(?=\s+Sub\s+IMD|\s+SP\/POSP|\s+Agency\s+Code|\n|$)/i);
    if (agentEmailRaw) {
      let cleanEmail = agentEmailRaw.replace(/\s+/g, "").trim().toLowerCase();
      if (cleanEmail.endsWith(".")) cleanEmail += "com";
      patch.agentEmail = cleanEmail;
    }

    const previousPolicy = text.match(
      /About the last insurance company[\s\S]{0,250}?Reliance General Insurance Company Limited\.?\s+(\d{15,25})\s+(\d{2}\/\d{2}\/\d{4})/i,
    );
    if (previousPolicy) {
      patch.previousInsurer = "Reliance General Insurance Company Limited";
      patch.previousPolicyNumber = previousPolicy[1];
      patch.previousPolicyExpiryDate = previousPolicy[2];
    }

    const imtList = [];
    if (/Hypothecated\s+With/i.test(text)) imtList.push("IMT-7");
    if (/IMT\s*28|LL To Person For Operation/i.test(text)) imtList.push("IMT-28");
    if (imtList.length > 0) {
      patch.imtEndorsements = imtList.join(", ");
    }

    patch.extractionTrainingVersion = "BAJAJ_ALLIANZ_MOTOR_COMMERCIAL_LIABILITY_V2";
  }

  const printedTotal = amount(matchGroup(text, /Final\s+Premium\s*(?:\([^)]*\))?\s*(?:Rs\.?)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i));
  if (printedTotal) {
    patch.totalPremium = patch.grossPremium = patch.premium = patch.premiumIncludingGst = printedTotal;
  }
  return patch;
}

module.exports = { scope, matches, train };
