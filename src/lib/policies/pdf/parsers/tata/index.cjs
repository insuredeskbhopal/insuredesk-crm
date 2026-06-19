const { normalizeInsuranceCompanyName: normalizeCompanyFromMaster } = require("../../../../master/insurance-companies.cjs");
const { matchGroup, escapeRegExp } = require("../../utils/regex.cjs");
const { normalizeAmount, sumPlainAmounts } = require("../../utils/amounts.cjs");
const { isBajajIssuerDocument } = require("../bajaj/index.cjs");
const { isPlausibleEngineNumber, matchNCB, normalizeFuelType } = require("../../utils/motor.cjs");
const { cleanHdfcValue, cleanWarehouseBlock } = require("../../utils/text.cjs");
const { normalizeWarehouseDate } = require("../../utils/dates.cjs");

// Start of isTataAigFinalData (Lines 1511-1518)
function isTataAigFinalData(data = {}) {
  if (/WAREHOUSE/i.test(data.documentFormat || data.documentCategory || "")) return false;
  return (
    isTataAigMotor(data.sourceText || "") ||
    /TATA_AIG/i.test(data.documentFormat || "") ||
    /\bTATA\s*AIG\b/i.test(data.insuranceCompany || data.companyName || "")
  );
}

// Start of protectTataAigMergedFields (Lines 1753-1804)
function protectTataAigMergedFields(mergedData, legacyData) {
  const protectedFields = [
    "policyNumber",
    "insuredName",
    "contactNumber",
    "vehicleNumber",
    "registrationNumber",
    "makeModel",
    "variant",
    "engineNumber",
    "chassisNumber",
    "fuelType",
    "cubicCapacity",
    "manufacturingYear",
    "registrationDate",
    "seatingCapacity",
    "idv",
    "sumInsured",
    "totalIdv",
    "premium",
    "totalPremium",
    "netPremium",
    "odPremium",
    "tpDriverOwner",
    "policyCoverType",
    "receiptNumber",
    "receiptDate",
    "payerName",
    "previousPolicyNumber",
    "previousInsurer",
  ];

  for (const field of protectedFields) {
    if (legacyData[field] !== undefined && legacyData[field] !== null && String(legacyData[field]).trim()) {
      mergedData[field] = legacyData[field];
    }
  }

  const sourceText = mergedData.sourceText || legacyData.sourceText || "";
  const totalPremium =
    extractTataAigTotalPremium(sourceText) || extractTataAigTotalPremium(legacyData.sourceText || "");
  if (totalPremium) {
    mergedData.premium = totalPremium;
    mergedData.totalPremium = totalPremium;
    mergedData.totalPackagePremium = totalPremium;
  }

  const netPremium = normalizeAmount(
    matchGroup(sourceText, /Net Premium\s*\(A\+B\+C(?:\+D)?\)\s*₹?\s*([0-9,.]+)/i),
  );
  if (netPremium) mergedData.netPremium = netPremium;
}

// Start of finalizeTataAigMotorFields (Lines 1806-1827)
function finalizeTataAigMotorFields(data, legacyData = {}) {
  const sourceText = data.sourceText || legacyData.sourceText || "";
  const totalPremium = extractTataAigTotalPremium(sourceText);
  if (totalPremium) {
    data.premium = totalPremium;
    data.totalPremium = totalPremium;
    data.totalPackagePremium = totalPremium;
  }

  if (data.makeModel) {
    data.makeModel = cleanTataVehicleValue(data.makeModel).replace(/\bHYC\s+ROSS\b/i, "HYCROSS");
  }
  if (data.vehicleModel) {
    data.vehicleModel = cleanTataVehicleValue(data.vehicleModel).replace(/\bHYC\s+ROSS\b/i, "HYCROSS");
  }
  if (data.variant) {
    data.variant = cleanTataVehicleValue(data.variant)
      .replace(/\s*Fuel Type.*$/i, "")
      .replace(/\bHYC\s+ROSS\b/i, "HYCROSS")
      .trim();
  }
}

// Start of isTataAigMotor (Lines 5751-5778)
function isTataAigMotor(text) {
  if (isBajajIssuerDocument(text)) return false;

  const hasTataAigCompanyMarker =
    /TATA\s*AIG/i.test(text) ||
    /tata\s*aig\s*general\s*insurance/i.test(text) ||
    /customersupport@tataaig\.com/i.test(text) ||
    /\btataaig\.com\b/i.test(text);

  if (!hasTataAigCompanyMarker) return false;

  const signals = [
    /Auto\s*Secure/i,
    /Private\s*Car\s*Package\s*Policy/i,
    /Motor\s*Insurance/i,
    /Policy\s+Schedule/i,
    /Vehicle\s+Details/i,
    /Chassis\s+No/i,
    /Engine\s+No/i,
  ];
  let matches = 0;
  for (const pattern of signals) {
    if (pattern.test(text)) {
      matches++;
    }
  }
  return matches >= 1;
}

// Start of extractTataInsuredName (Lines 5789-5808)
function extractTataInsuredName(text) {
  const patterns = [
    /Name\s*\(Registered owner of the Motor Vehicle\)\s*[:.-]?\s*([A-Z][A-Z\s]+?)(?=\s*(?:\d|Address|Contact|$))/i,
    /Name\s*([A-Z][A-Z\s]+?)(?=\s*Address)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      let val = match[1]
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (val.toUpperCase().startsWith("NAME") && val.length > 4) {
        val = val.substring(4).trim();
      }
      return val;
    }
  }
  return "";
}

// Start of extractTataAigVehicleIdentifier (Lines 5810-5853)
function extractTataAigVehicleIdentifier(text, type) {
  const labelPattern = type === "engine" ? /Engine\s+Number|Motor\s+No\.?\s*\(for EV\)/i : /Chassis\s+No\.?/i;
  const stopPattern =
    /^(?:Contract|Loan|Reference|Body\s+Type|CC\/KW|Mfg\.?\s*Year|Date\s+of\s+Registration|Hire\s+Purchase|Seating\s+Capacity|Zone\s+Details|RTO\s+Location|Fuel\s+Type|Make\s*\/\s*Model|Registration\s+No)/i;
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!labelPattern.test(line)) continue;

    const inlineValue = line
      .replace(labelPattern, "")
      .replace(/^[\s:/.-]+/, "")
      .trim();
    const inlineCompact = inlineValue.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (type === "engine" && isPlausibleEngineNumber(inlineCompact)) return inlineCompact;
    if (type === "chassis" && /^[A-Z0-9]{10,25}$/i.test(inlineCompact)) return inlineCompact;

    for (let offset = 1; offset <= 4 && index + offset < lines.length; offset++) {
      const candidateLine = lines[index + offset];
      if (stopPattern.test(candidateLine)) break;
      if (/^(?:\/|NA|N\/A|NO|NUMBER|MOTOR|ENGINE|CHASSIS|MOTOR\s+NO\.?\s*\(for EV\))$/i.test(candidateLine))
        continue;

      let compact = candidateLine
        .replace(type === "engine" ? /[^A-Z0-9.]/gi : /[^A-Z0-9]/gi, "")
        .toUpperCase();
      if (
        type === "chassis" &&
        compact.length < 17 &&
        /^[A-Z0-9]{1,8}$/i.test(lines[index + offset + 1] || "")
      ) {
        compact += lines[index + offset + 1].replace(/[^A-Z0-9]/gi, "").toUpperCase();
      }
      if (type === "engine" && isPlausibleEngineNumber(compact)) return compact;
      if (type === "chassis" && /^[A-Z0-9]{10,25}$/i.test(compact)) return compact;
    }
  }

  return "";
}

// Start of detectTataAigFormat (Lines 5855-5862)
function detectTataAigFormat(text = "") {
  if (/Standalone\s+Own\s+Damage\s+Private\s+Car\s+Policy/i.test(text))
    return "TATA_AIG_STANDALONE_OD_PRIVATE_CAR_V1";
  if (/Two[-\s]?Wheeler\s+Package\s+Policy/i.test(text)) return "TATA_AIG_TWO_WHEELER_PACKAGE_V1";
  if (/Liability\s+Only\s+Policy/i.test(text)) return "TATA_AIG_LIABILITY_ONLY_V1";
  if (/Private\s+Car\s+Package\s+Policy/i.test(text)) return "TATA_AIG_PRIVATE_CAR_PACKAGE_V1";
  return "TATA_AIG_UNKNOWN";
}

// Start of cleanTataVehicleValue (Lines 5864-5871)
function cleanTataVehicleValue(value = "") {
  return cleanHdfcValue(value)
    .replace(/\bAL\s+PHA\b/gi, "ALPHA")
    .replace(/\bC\s+VT\b/gi, "CVT")
    .replace(/\bC\s+NG\b/gi, "CNG")
    .replace(/\bKRYOJ\s+ET\b/gi, "KRYOJET")
    .trim();
}

// Start of extractTataAfterLabel (Lines 5873-5910)
function extractTataAfterLabel(block = "", startLabels = [], endLabels = []) {
  const lines = String(block || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const startPattern = new RegExp(`^(?:${startLabels.map(escapeRegExp).join("|")})\\b`, "i");
  const endPattern = new RegExp(`^(?:${endLabels.map(escapeRegExp).join("|")})\\b`, "i");

  for (let index = 0; index < lines.length; index++) {
    if (!startPattern.test(lines[index])) continue;

    const inline = lines[index]
      .replace(startPattern, "")
      .replace(/^[\s:/.-]+/, "")
      .trim();
    const collected = [];
    if (inline) collected.push(inline);

    for (let offset = 1; index + offset < lines.length; offset++) {
      let candidate = lines[index + offset];
      if (endPattern.test(candidate)) break;
      const inlineEnd = endLabels
        .map((label) => candidate.search(new RegExp(escapeRegExp(label), "i")))
        .filter((position) => position > 0)
        .sort((a, b) => a - b)[0];
      if (inlineEnd !== undefined) {
        candidate = candidate.slice(0, inlineEnd).trim();
        if (candidate) collected.push(candidate);
        break;
      }
      collected.push(candidate);
    }

    return cleanTataVehicleValue(collected.join(" "));
  }

  return "";
}

// Start of extractTataAigMakeModelVariant (Lines 5912-5975)
function extractTataAigMakeModelVariant(text = "") {
  const directRaw = cleanHdfcValue(
    matchGroup(text, /Make\s*\/\s*Model\s*\/[\s\S]*?Variant\s*\n?\s*([^\n]+)/i),
  );
  const blockRaw = extractTataAigWrappedVehicleValue(text);
  const raw = directRaw && directRaw.split("/").length >= 3 ? directRaw : blockRaw || directRaw;

  const normalized = cleanTataVehicleValue(raw).replace(/\s*\/\s*/g, " / ");
  const parts = normalized
    .split("/")
    .map((part) => cleanTataVehicleValue(part))
    .filter(Boolean);
  let make = "";
  let model = "";
  let variant = "";

  if (parts.length >= 3) {
    make = parts[0];
    model = parts[1];
    variant = parts.slice(2).join(" ");
    const wrappedModel = mergeWrappedTataModel(model, variant);
    model = wrappedModel.model;
    variant = wrappedModel.variant;
  } else if (parts.length === 2) {
    make = parts[0];
    model = parts[1];
  } else if (parts.length === 1 && parts[0]) {
    const rawVal = parts[0];
    const knownMakes = [
      "TATA MOTORS",
      "MARUTI SUZUKI",
      "MARUTI",
      "HYUNDAI",
      "HONDA",
      "TATA",
      "MAHINDRA",
      "TOYOTA",
      "FORD",
      "RENAULT",
      "NISSAN",
      "VOLKSWAGEN",
      "KIA",
      "MG",
      "SKODA",
    ];
    const foundMake = knownMakes.find((knownMake) => rawVal.toUpperCase().startsWith(knownMake));
    if (foundMake) {
      make = foundMake;
      const rest = rawVal.substring(foundMake.length).trim();
      const tokens = rest.split(/\s+/).filter(Boolean);
      model = tokens[0] || "";
      variant = tokens.slice(1).join(" ");
    } else {
      make = rawVal;
    }
  }

  return {
    make,
    model,
    variant,
    makeModel: [make, model].filter(Boolean).join(" "),
  };
}

// Start of extractTataAigWrappedVehicleValue (Lines 5977-6012)
function extractTataAigWrappedVehicleValue(text = "") {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (let index = 0; index < lines.length; index++) {
    if (
      !/^Make\s*\/\s*Model\s*\/?$/i.test(lines[index]) &&
      !/^Make\s*\/\s*Model\s*\/\s*Variant$/i.test(lines[index])
    )
      continue;

    const collected = [];
    for (let offset = 1; index + offset < lines.length && offset <= 5; offset++) {
      let candidate = lines[index + offset];
      if (
        /^(?:Fuel Type|Engine Number|Engine No\.?|Chassis No\.?|Body Type|CC\/KW|CC \/ KW)\b/i.test(candidate)
      )
        break;
      const inlineStop = candidate.search(
        /\b(?:Fuel Type|Engine Number|Engine No\.?|Chassis No\.?|Body Type|CC\/KW|CC \/ KW)\b/i,
      );
      if (inlineStop > 0) {
        candidate = candidate.slice(0, inlineStop).trim();
        if (candidate) collected.push(candidate);
        break;
      }
      if (/^Variant$/i.test(candidate)) continue;
      collected.push(candidate);
    }

    const value = cleanTataVehicleValue(collected.join(" "));
    if (value) return value;
  }
  return "";
}

// Start of mergeWrappedTataModel (Lines 6014-6036)
function mergeWrappedTataModel(model = "", variant = "") {
  const variantTokens = String(variant || "")
    .split(/\s+/)
    .filter(Boolean);
  if (!variantTokens.length) return { model, variant };

  const firstToken = variantTokens[0];
  const spacedModel = String(model || "")
    .replace(/\bHYC\s+ROSS\b/i, "HYCROSS")
    .trim();
  if (spacedModel !== model) return { model: spacedModel, variant };

  const merged = `${model}${firstToken}`;
  const knownWrappedModels = ["HYCROSS"];
  if (knownWrappedModels.includes(merged.toUpperCase())) {
    return {
      model: merged,
      variant: variantTokens.slice(1).join(" "),
    };
  }

  return { model, variant };
}

// Start of extractTataAigPolicyNumber (Lines 6038-6050)
function extractTataAigPolicyNumber(text = "") {
  const currentArea = String(text || "").split(/Previous Insurance Details|Transcript Of Proposal/i)[0];
  const patterns = [
    /Policy No\.?\s*([0-9]{10}\s+[0-9]{2}\s+[0-9]{2})/i,
    /Your Policy Number is\s*([0-9]{10}\s+[0-9]{2}\s+[0-9]{2})/i,
    /Your Policy No\.?\s*([0-9]{10}\s+[0-9]{2}\s+[0-9]{2})/i,
  ];
  for (const pattern of patterns) {
    const value = matchGroup(currentArea, pattern);
    if (value) return value.replace(/\s+/g, " ").trim();
  }
  return "";
}

// Start of extractTataAigGstAmount (Lines 6052-6058)
function extractTataAigGstAmount(text = "") {
  const matches = [
    ...String(text || "").matchAll(/(?:SGST\/UGST|SGST|CGST|IGST)\s*@?\s*\d+%?\s*₹?\s*([0-9,.]+)/gi),
  ];
  const total = matches.reduce((sum, match) => sum + (Number(String(match[1]).replace(/,/g, "")) || 0), 0);
  return total ? normalizeAmount(String(total)) : "";
}

// Start of extractTataAigTotalPremium (Lines 6060-6070)
function extractTataAigTotalPremium(text = "") {
  const patterns = [
    /Premium Amount\s*\(Including GST\)\s*₹?\s*([0-9,.]+)/i,
    /Total Policy Premium\s*₹?\s*([0-9,.]+)/i,
  ];
  for (const pattern of patterns) {
    const value = normalizeAmount(matchGroup(text, pattern));
    if (value && Number(value.replace(/,/g, "")) > 100) return value;
  }
  return "";
}

// Start of extractTataAigMotor (Lines 6072-6413)
function extractTataAigMotor(text, _sourceFile = "") {
  if (!isTataAigMotor(text)) return { documentDetected: false };

  const tataFormat = detectTataAigFormat(text);
  let rawPolicyNumber =
    extractTataAigPolicyNumber(text) ||
    matchGroup(
      text.split(/Previous Insurance Details|Transcript Of Proposal/i)[0],
      /Policy No\.?\s*([0-9][0-9 ]{8,30})/i,
    ) ||
    matchGroup(
      text.split(/Previous Insurance Details|Transcript Of Proposal/i)[0],
      /Policy Number\s*(?:is\s*)?([0-9][0-9 ]{8,30})/i,
    );
  rawPolicyNumber = rawPolicyNumber ? String(rawPolicyNumber).replace(/\s+/g, " ").trim() : "";
  const policyNumber = rawPolicyNumber;

  const insuredName = extractTataInsuredName(text);
  const startDateRaw =
    matchGroup(text, /Own Damage Cover\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(text, /TP Cover Period\s*[:.-]?\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    "";
  const expiryDateRaw =
    matchGroup(text, /Own Damage Cover\s*\d{2}\/\d{2}\/\d{4}[^\n]*?(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(text, /TP Cover Period\s*[:.-]?\s*\d{2}\/\d{2}\/\d{4}[^\n]*?to\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    "";
  const startDate = normalizeTataDate(startDateRaw);
  const expiryDate = normalizeTataDate(expiryDateRaw);

  const registrationMatch =
    matchGroup(
      text,
      /Registration No\.?\s*((?:[A-Z]{2}\s*\d{2}\s*[A-Z]{1,3}\s*\d{3,5}|[0-9]{2}\s*BH\s*\d{4}\s*[A-Z]))/i,
    ) || matchGroup(text, /Registration No\.?\s*([A-Z0-9-\s]{6,20})/i);
  const registrationNumber = registrationMatch
    ? String(registrationMatch).toUpperCase().replace(/\s+/g, "")
    : "";
  const makeModelParts = extractTataAigMakeModelVariant(text);
  const make = makeModelParts.make;
  const model = makeModelParts.model;
  const variant = makeModelParts.variant;
  const makeModel = makeModelParts.makeModel;

  const rawEngine =
    matchGroup(text, /Engine Number\s*\/\s*Motor No\.?\s*\(for EV\)\s*\n?\s*([A-Z0-9.-]{3,25})/i) ||
    matchGroup(text, /Engine Number\s*[:.-]?\s*([A-Z0-9.-]{3,25})/i) ||
    matchGroup(text, /Motor No\.\s*\(for EV\)\s*\n?\s*([A-Z0-9.-]{3,25})/i) ||
    extractTataAigVehicleIdentifier(text, "engine") ||
    "";
  const engineNumber = rawEngine
    ? String(rawEngine)
        .toUpperCase()
        .replace(/[^A-Z0-9.]/g, "")
    : "";

  const rawChassis =
    extractTataAigVehicleIdentifier(text, "chassis") ||
    matchGroup(text, /Chassis\s*No\.?\s*[:.-]?\s*([A-Z0-9-]{10,25})/i) ||
    matchGroup(text, /Chassis\s*No\s*\n\s*([A-Z0-9-]{10,25})/i) ||
    "";
  const chassisNumber = rawChassis
    ? String(rawChassis)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
    : "";

  const fuelType = normalizeFuelType(matchGroup(text, /Fuel Type\s*([A-Z ]{3,20})/i));
  const cubicCapacity = matchGroup(text, /CC\s*[/]\s*KW\s*([0-9]+)/i);
  const manufacturingYear = matchGroup(text, /Mfg\.\s*Year\s*([0-9]{4})/i);
  const registrationDate = matchGroup(text, /Date of Registration\s*([0-9/]{8,10})/i);
  const seatingCapacity =
    matchGroup(text, /Seating Capacity\s*\(?Including\s*Driver\)?\s*\n?\s*([0-9]+)/i) ||
    extractTataAfterLabel(
      text,
      ["Seating Capacity (Including Driver)", "Seating Capacity(Including Driver)", "Seating Capacity"],
      ["Vehicle Details", "Zone Details", "RTO Location"],
    ).match(/\b\d{1,2}\b/)?.[0] ||
    "";

  const premium = extractTataAigTotalPremium(text);

  const rawIdv = matchGroup(text, /Total IDV\s*\(₹\)\s*\n?\s*([0-9]+)/i);
  const tataIdv = extractTataAigIdv(text, rawIdv);
  let idv = "";
  let accessoriesIdv = "0";
  let totalIdv = "";
  let idvReconstruction = {};

  if (tataIdv.totalIdv) {
    idv = tataIdv.vehicleIdv || tataIdv.totalIdv;
    totalIdv = tataIdv.totalIdv;
    accessoriesIdv = tataIdv.accessoriesIdv || "0";
    idvReconstruction = tataIdv.debug;
  } else if (rawIdv && rawIdv.length >= 10) {
    const len = Math.ceil(rawIdv.length / 3);
    idv = rawIdv.substring(0, len);
    const accIdvStr = rawIdv.substring(len, rawIdv.length - len);
    const vehNum = parseInt(idv, 10) || 0;
    const accNum = parseInt(accIdvStr, 10) || 0;

    if (accNum > 0 && accNum < vehNum) {
      accessoriesIdv = String(accNum);
      totalIdv = String(vehNum + accNum);
    } else {
      totalIdv = idv;
    }

    idvReconstruction = {
      rawString: rawIdv,
      splitLength: len,
      derivedVehicleIdv: idv,
      derivedAccessories: accessoriesIdv,
      derivedTotalIdv: totalIdv,
      mathematicallyValidated: parseInt(totalIdv, 10) >= parseInt(idv, 10),
    };
  } else {
    idv = rawIdv || matchGroup(text, /Vehicle IDV\s*\(₹\)\s*([0-9]+)/i) || "";
    totalIdv = rawIdv || matchGroup(text, /Total IDV\s*\(₹\)\s*([0-9]+)/i) || idv;

    if (!idv || !totalIdv) {
      const basicOd = matchGroup(text, /Basic Own Damage Premium[^\n]*?₹?\s*([0-9,.]+)/i);
      if (basicOd) {
        const odNum = parseFloat(basicOd.replace(/,/g, ""));
        if (odNum > 0) {
          const estimated = Math.round(odNum / 0.019);
          idv = String(estimated);
          totalIdv = String(estimated);
          idvReconstruction = {
            estimatedFromBasicOD: true,
            basicOD: basicOd,
            derivedVehicleIdv: idv,
            derivedTotalIdv: totalIdv,
          };
        }
      }
    }
  }

  const parsedIdv = parseInt(idv, 10) || 0;
  const parsedTotalIdv = parseInt(totalIdv, 10) || 0;
  if (parsedTotalIdv < parsedIdv) {
    totalIdv = idv;
  }

  const ncb = matchNCB(text) || matchGroup(text, /NCB Claimed\s*:\s*([0-9\s]+%)/i).replace(/\s+/g, "");

  const nominee =
    matchGroup(text, /Name of the Nominee\s*:\s*([A-Za-z ]+)/i) ||
    (text.includes("LEGAL HEIR") ? "LEGAL HEIR" : "");

  const financer =
    matchGroup(text, /Hire Purchase\s*\/\s*Hypothecation\s*\/\s*Lease\s*with\s*([A-Z0-9 .,&/-]+)/i) ||
    matchGroup(text, /Hypothecation\s*\/\s*Lease\s*with\s*\n?\s*([A-Za-z0-9 ]+)/i);
  const rtoLocation = matchGroup(text, /RTO Location\s*([A-Za-z0-9 ]+)/i);
  const zone = matchGroup(text, /\bZone\s*([A-Z])\b/i);
  const geographicalArea = matchGroup(text, /Geographical Area\s*([A-Za-z ]+)/i);
  const bodyType = matchGroup(text, /Body Type\s*([A-Z ]+?)(?=CC\/KW|Mfg\.|Date|Hire|Seating|\n|$)/i);
  const contractLoanReference = matchGroup(
    text,
    /Contract\s*\/\s*Loan\s*\/\s*Reference No\.?\s*([A-Z0-9/-]+)/i,
  );

  const addressMatch = text.match(/Address\s*\n\s*([\s\S]+?)(?=\s*(?:Contact|Email|GSTIN|$))/i);
  const communicationAddress = addressMatch?.[1] ? cleanHdfcValue(addressMatch[1]) : "";

  const mobileMatch = text.match(/Contact No\.\s*([^\n]+)/i);
  const mobile = mobileMatch?.[1] ? mobileMatch[1].replace(/[^0-9Xx*+]/g, "").trim() : "";

  const emailMatch = text.match(/Email ID\s*([^\n]+)/i);
  let email = "";
  if (emailMatch?.[1]) {
    const emailStr = emailMatch[1].trim();
    if (!/tataaig\.com/i.test(emailStr)) {
      email = emailStr;
    }
  }

  let basicOwnDamage = "";
  const odMatch = text.match(/Basic Own Damage[\s\S]{0,100}?₹\s*([0-9,.]+)/i);
  if (odMatch) {
    basicOwnDamage = normalizeAmount(odMatch[1]);
  } else {
    basicOwnDamage = normalizeAmount(matchGroup(text, /Basic Own Damage Premium[^\n]*?₹?\s*([0-9,.]+)/i));
  }

  const basicThirdPartyLiability = normalizeAmount(matchGroup(text, /Basic TP premium\s*₹?\s*([0-9,.]+)/i));
  const netOwnDamagePremium = normalizeAmount(
    matchGroup(text, /Total Own Damage Premium\s*\(A\)\s*₹?\s*([0-9,.]+)/i),
  );
  const netLiabilityPremium = normalizeAmount(
    matchGroup(text, /Total Liability Premium\s*\([AB]\)\s*₹?\s*([0-9,.]+)/i),
  );
  const netPremium = normalizeAmount(
    matchGroup(text, /Net Premium\s*\(A\+B\+C(?:\+D)?\)\s*₹?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Net Premium\s*\(A\)\s*₹?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Net Premium\s*₹?\s*([0-9,.]+)/i),
  );
  const totalPackagePremium = premium;

  const sgst = matchGroup(text, /SGST(?:\/UGST)?\s*@?\s*\d+%?\s*₹?\s*([0-9,.]+)/i);
  const cgst = matchGroup(text, /CGST\s*@?\s*\d+%?\s*₹?\s*([0-9,.]+)/i);
  const gstAmount = extractTataAigGstAmount(text);

  let zeroDepreciationCover = "";
  const zeroDepMatch = text.match(
    /(?:Depreciation Reimbursement|Zero Depreciation)[\s\S]{0,100}?₹\s*([0-9,.]+)/i,
  );
  if (zeroDepMatch) {
    zeroDepreciationCover = normalizeAmount(zeroDepMatch[1]);
  }

  let previousPolicyNumber = "";
  const prevPolicyMatch = text.match(
    /Previous Insurance Details:[\s\S]{0,400}?Policy Number:\s*([A-Za-z0-9/-]+)/i,
  );
  if (prevPolicyMatch) {
    previousPolicyNumber = prevPolicyMatch[1].trim();
  }

  let previousInsurer = "";
  const prevInsurerMatch = text.match(
    /Previous Insurance Details:[\s\S]{0,400}?Name of the Insurer:\s*([A-Za-z0-9 .,&-]+?)(?:\r?\n|$)/i,
  );
  if (prevInsurerMatch) {
    previousInsurer = prevInsurerMatch[1].trim();
  }
  const clientId = matchGroup(text, /Client ID\s*([0-9]+)/i);
  const gstin = matchGroup(text, /GSTIN\s*(NA|[A-Z0-9]{15})/i);
  const addonPremium = normalizeAmount(matchGroup(text, /Total Add on Premium\s*\(C\)\s*₹?\s*([0-9,.]+)/i));
  const receiptNumberMatch = text.match(/Receipt No\.?\s*([A-Z0-9]+)(?=Receipt Date|Service Account|$)/);
  const receiptNumber = receiptNumberMatch?.[1] || "";
  const receiptDate = matchGroup(text, /Receipt Date\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const modeOfPayment = matchGroup(text, /\n([A-Za-z][A-Za-z]+)(?=\d{3,}\d{3,}\d+\s*\nPayer Name)/);
  const payerName = matchGroup(text, /Payer Name:\s*([A-Z .]+)/i);
  const nomineeMatch =
    text.match(/Nomination Details:[\s\S]{0,260}?Nominee\s*\n([A-Z ]+?)(\d{1,3})NA([A-Za-z]+)/i) ||
    text.match(
      /Nomination Details:[\s\S]{0,260}?Relationship with\s*Nominee\s*([A-Z ]+?)(\d{1,3})NA([A-Za-z ]+?)(?=Drivers Clause|$)/i,
    );
  const nomineeName = nomineeMatch?.[1]?.trim() || nominee;
  const nomineeAge = nomineeMatch?.[2]?.trim() || "";
  const nomineeRelationship = nomineeMatch?.[3]?.trim() || "";
  const compulsoryDeductible = normalizeAmount(matchGroup(text, /Compulsory Deductible:\s*₹?\s*([0-9,.]+)/i));
  const voluntaryDeductible = normalizeAmount(matchGroup(text, /Voluntary Deductible:\s*₹?\s*([0-9,.]+)/i));
  const claimsCovered = matchGroup(
    text,
    /No\.?\s*of Claims\s*Covered Under\s*Depreciation\s*Reimbursement\s*([0-9]+)/i,
  );

  const policyType =
    matchGroup(text, /(Auto Secure\s*[-–—:]\s*[A-Za-z0-9 &()/-]+Policy)/i) ||
    matchGroup(text, /(Private Car Package Policy)/i) ||
    matchGroup(text, /(Private Car Comprehensive Policy)/i) ||
    matchGroup(text, /(Two Wheeler Package Policy)/i) ||
    matchGroup(text, /(Two Wheeler Policy)/i) ||
    matchGroup(text, /(Commercial Vehicle Package Policy)/i) ||
    "motor";

  return {
    documentDetected: true,
    companyName: normalizeCompanyFromMaster("TATA AIG"),
    tataAigFormat: tataFormat,
    policyType: cleanHdfcValue(policyType),
    policyNumber,
    rawPolicyNumber,
    insuredName,
    policyStartDate: startDate,
    policyEndDate: expiryDate,
    registrationNumber,
    make,
    model,
    makeModel,
    variant,
    engineNumber,
    chassisNumber,
    fuelType,
    cubicCapacity,
    manufacturingYear,
    registrationDate,
    seatingCapacity,
    totalPremium: premium,
    idv: normalizeAmount(idv),
    totalIdv: normalizeAmount(totalIdv),
    ncbPercentage: ncb,
    nominee: nomineeName,
    financer,
    rtoLocation,
    communicationAddress,
    insuredAddress: communicationAddress,
    mobile,
    email,
    policyCoverType:
      tataFormat === "TATA_AIG_STANDALONE_OD_PRIVATE_CAR_V1"
        ? "Own Damage"
        : tataFormat === "TATA_AIG_LIABILITY_ONLY_V1"
          ? "Third Party"
          : "Package",
    gstin,
    clientId,
    bodyType,
    contractLoanReference,
    zone,
    geographicalArea,
    addonPremium,
    tpPremium: netLiabilityPremium,
    sgst: normalizeAmount(sgst),
    cgst: normalizeAmount(cgst),
    nomineeAge,
    nomineeRelationship,
    claimsCovered,
    compulsoryDeductible,
    voluntaryDeductible,
    receiptNumber,
    receiptDate,
    modeOfPayment,
    payerName,
    basicOwnDamage,
    basicThirdPartyLiability,
    netOwnDamagePremium,
    netLiabilityPremium: tataFormat === "TATA_AIG_STANDALONE_OD_PRIVATE_CAR_V1" ? "" : netLiabilityPremium,
    netPremium,
    totalPackagePremium,
    gstAmount,
    zeroDepreciationCover,
    previousPolicyNumber,
    previousInsurer,
    extractionDebug: {
      detectionMatches: [
        /TATA\s*AIG/i.test(text) ? "TATA AIG" : null,
        /customersupport@tataaig\.com/i.test(text) ? "support-email" : null,
        /Auto\s*Secure/i.test(text) ? "Auto Secure" : null,
      ].filter(Boolean),
      idvReconstruction,
      confidence: {
        policyNumber: policyNumber ? 0.95 : 0,
        insuredName: insuredName ? 0.9 : 0,
        chassisNumber: chassisNumber ? 0.98 : 0,
        engineNumber: engineNumber ? 0.98 : 0,
      },
    },
  };
}

// Start of extractTataAigIdv (Lines 6415-6448)
function extractTataAigIdv(text, rawIdv = "") {
  const row = rawIdv || matchGroup(text, /Total IDV\s*\(₹\)\s*\n?\s*([0-9]+)/i);
  if (!row) return { totalIdv: "", vehicleIdv: "", accessoriesIdv: "", debug: {} };

  const compact = row.replace(/\D/g, "");
  const candidates = [];
  for (let width = 5; width <= 8; width++) {
    const total = compact.slice(-width);
    const prefix = compact.slice(0, -width);
    if (!total || /^0+$/.test(total)) continue;
    if (prefix.includes(total)) {
      const vehicleMatch = prefix.match(new RegExp(`(?:^|1)(${escapeRegExp(total)})`));
      candidates.push({
        vehicleIdv: vehicleMatch?.[1] || total,
        totalIdv: total,
        accessoriesIdv: "",
        debug: { rawString: row, parsedAs: "dense-idv-total-column", totalWidth: width },
      });
    }
  }

  const best = candidates
    .filter((candidate) => Number(candidate.totalIdv) > 0)
    .sort((a, b) => b.totalIdv.length - a.totalIdv.length)[0];
  if (!best)
    return {
      totalIdv: "",
      vehicleIdv: "",
      accessoriesIdv: "",
      debug: { rawString: row, parsedAs: "unparsed" },
    };

  return best;
}

// Start of normalizeTataDate (Lines 6450-6464)
function normalizeTataDate(dateStr) {
  if (!dateStr) return "";
  const cleaned = dateStr.replace(/[^0-9/-]/g, "").trim();
  const parts = cleaned.split(/[/-]/);
  if (parts.length === 3) {
    let day = parts[0].trim().padStart(2, "0");
    let month = parts[1].trim().padStart(2, "0");
    let year = parts[2].trim();
    if (year.length === 2) year = "20" + year;
    if (year.length === 4 && day.length === 2 && month.length === 2) {
      return `${year}-${month}-${day}`;
    }
  }
  return dateStr;
}

// Start of extractTataWarehouse (Lines 7044-7112)
function extractTataWarehouse(text) {
  if (!/\bTATA\s*AIG\b/i.test(text) || !/Business\s+Guard\s+(?:Laghu|Sookshma)\s+Package\s+Policy/i.test(text)) {
    return { documentDetected: false };
  }

  const productName = cleanHdfcValue(matchGroup(text, /(Business\s+Guard\s+(?:Laghu|Sookshma)\s+Package\s+Policy)/i));
  const policyNumber = matchGroup(text, /POLICY\s+NO\s*:\s*([0-9]+)/i);
  const insuredName = cleanHdfcValue(matchGroup(text, /INSURED\s+NAME\s*:\s*([^\n]+)/i));
  const mailingAddress = cleanWarehouseBlock(matchGroup(text, /COMMUNICATION\s+ADDRESS\s*:\s*([\s\S]+?)\s*PLACE\s+OF\s+SUPPLY/i));
  const riskLocation = cleanWarehouseBlock(matchGroup(text, /RISK\s+LOCATION\s+ADDRESS\s*:\s*([\s\S]+?)\s*OCCUPANCY\s*:/i));
  const occupancy = cleanWarehouseBlock(matchGroup(text, /OCCUPANCY\s*:\s*([\s\S]+?)\s*PERIOD\s+OF\s+INSURANCE/i));
  const startDate = normalizeWarehouseDate(matchGroup(text, /From\s*:\s*00:00hrs\s+of\s+([0-9-]+)/i));
  const expiryDate = normalizeWarehouseDate(matchGroup(text, /To\s*:\s*Midnight\s+of\s+([0-9-]+)/i));
  const brokerRaw = cleanHdfcValue(matchGroup(text, /Agent\/Broker\s+Name\s*-\s*([^\n]+)/i));
  const brokerCodeFromName = matchGroup(brokerRaw, /-([0-9]{6,})$/);
  const brokerName = brokerRaw.replace(/-[0-9]{6,}$/, "").trim();
  const brokerCode = matchGroup(text, /Agent\/Broker\s+License\s+Code\s*-?\s*([0-9]+)/i) || brokerCodeFromName;
  const brokerMobile = matchGroup(text, /Agent\/Broker\s+Contact\s+No\s*-\s*([0-9X]+)/i);
  const hypothecationDetails = cleanHdfcValue(matchGroup(text, /BANK\s*\/\s*FINANCIAL\s+INSTITUTION\s*:\s*([^\n]+)/i));
  const netPremium = normalizeAmount(matchGroup(text, /Net\s+Premium\s*:\s*Rs\.?\s*([0-9,.]+)/i));
  const cgst = normalizeAmount(matchGroup(text, /CGST\s*Rs\.?\s*([0-9,.]+)/i));
  const sgst = normalizeAmount(matchGroup(text, /SGST\s*Rs\.?\s*([0-9,.]+)/i));
  const premiumIncludingGst = normalizeAmount(matchGroup(text, /Total\s+Amount\s*\(Rounded\s+Off\)\s*:\s*Rs\.?\s*([0-9,.]+)/i));
  const gstAmount = sumPlainAmounts(cgst, sgst);
  const contentsSumInsured =
    normalizeAmount(matchGroup(text, /A\.?\s*Fire[\s\S]{0,180}?([0-9][0-9,]+(?:\.\d{2})?)/i)) ||
    normalizeAmount(matchGroup(text, /Building\s*\(Refer\s+Annexure[^)]*\)\s*([0-9][0-9,]+(?:\.\d{2})?)/i));
  const burglarySumInsured = normalizeAmount(matchGroup(text, /Burglary[\s\S]{0,160}?([0-9][0-9,]+(?:\.\d{2})?)/i));
  const fidelitySumInsured =
    normalizeAmount(matchGroup(text, /Employee\s+Fidelity[\s\S]{0,160}?([0-9][0-9,]+(?:\.\d{2})?)/i)) ||
    normalizeAmount(matchGroup(text, /Annual\s+Aggregate\s*:\s*Rs\.?\s*([0-9][0-9,]+(?:\.\d{2})?)/i));
  const sumInsured = contentsSumInsured || burglarySumInsured || fidelitySumInsured || normalizeAmount(matchGroup(text, /Total\s+Sum\s+Insured\s*([0-9,]+(?:\.\d{2})?)/i));
  const coverages = [
    contentsSumInsured && { sectionName: "Fire Building and/or Contents", sumInsured: contentsSumInsured },
    burglarySumInsured && { sectionName: "Burglary", sumInsured: burglarySumInsured },
    fidelitySumInsured && { sectionName: "Employee Fidelity", sumInsured: fidelitySumInsured },
  ].filter(Boolean);

  return {
    documentDetected: true,
    productName,
    policyType: productName,
    policyNumber,
    insuredName,
    mailingAddress,
    riskLocation,
    businessDescription: occupancy || "Warehouse",
    occupancy,
    startDate,
    expiryDate,
    netPremium,
    premiumIncludingGst,
    cgst,
    sgst,
    gstAmount,
    igst: "0.00",
    invoiceNumber: policyNumber,
    gstin: matchGroup(text, /GST\s+Registration\s+No\.?\s*:\s*([0-9A-Z]{15})/i),
    hypothecationDetails,
    brokerName,
    brokerCode,
    brokerMobile,
    sumInsured,
    contentsSumInsured,
    burglarySumInsured,
    fidelitySumInsured,
    coverages,
  };
}

module.exports = {
  isTataAigFinalData,
  protectTataAigMergedFields,
  finalizeTataAigMotorFields,
  isTataAigMotor,
  extractTataInsuredName,
  extractTataAigVehicleIdentifier,
  detectTataAigFormat,
  cleanTataVehicleValue,
  extractTataAfterLabel,
  extractTataAigMakeModelVariant,
  extractTataAigWrappedVehicleValue,
  mergeWrappedTataModel,
  extractTataAigPolicyNumber,
  extractTataAigGstAmount,
  extractTataAigTotalPremium,
  extractTataAigMotor,
  extractTataAigIdv,
  normalizeTataDate,
  extractTataWarehouse
};
