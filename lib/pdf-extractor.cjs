const pdf = require("pdf-parse");
const { understandDocument } = require("./pdf-understanding/understandDocument");
const { resolveSchema } = require("./policy-intelligence/schemaEngine");
const { extractWithSchema } = require("./policy-intelligence/dynamicExtractor");
const { mergeSchemaWithFallback, validateExtraction } = require("./policy-intelligence/confidenceEngine");

async function extractPolicyFromPdf(buffer, sourceFile = "") {
  const parsed = await pdf(buffer);
  return extractPolicyFromText(parsed.text || "", sourceFile);
}

function extractPolicyFromText(text, sourceFile = "") {
  const sourceText = cleanText(text || "");
  const policyUnderstanding = understandDocument(sourceText);
  const policySchema = resolveSchema(policyUnderstanding);
  const schemaExtraction = extractWithSchema(sourceText, policyUnderstanding, policySchema);
  const hdfcErgoMotor = extractHdfcErgoMotor(sourceText);
  const generaliMotor = extractGeneraliMotor(sourceText);
  
  const insuredName = extractInsuredName(sourceText);
  const policyNumber = extractPolicyNumber(sourceText);
  const policyType =
    hdfcErgoMotor.policyType ||
    matchGroup(sourceText, /(MSME Suraksha Kavach Package Policy\s*-\s*Advance)/i) ||
    matchGroup(sourceText, /(PRIVATE CAR COMPREHENSIVE POLICY)/i) ||
    matchGroup(sourceText, /(Private Car Package Policy)/i) ||
    matchGroup(sourceText, /(Private Car Liability Only Policy)/i) ||
    matchGroup(sourceText, /(Two Wheeler Package Policy)/i) ||
    matchGroup(sourceText, /(Two Wheeler Liability Only Policy)/i) ||
    matchGroup(sourceText, /(Commercial Vehicle Package Policy)/i) ||
    matchGroup(sourceText, /(Commercial Vehicle Liability Only Policy)/i) ||
    matchGroup(sourceText, /(Two Wheeler Policy)/i) ||
    matchGroup(sourceText, /(Policy Schedule.*?)(?:Name of the Insured|Mailing Address)/i);
  const issuedAt = matchGroup(sourceText, /Issued at\s*([A-Z][A-Z\s]+?)(?:Premises to be Insured|Premium|Hypothecation|Intermediary Details|$)/i);
  const startDate =
    matchGroup(sourceText, /Period of cover\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /From:\s*\d{2}:\d{2}\s*Hours of\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /Period of Insurance\s*From:\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /From:\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /(?:Start|Commencement)\s*Date\s*[:.-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ||
    matchGroup(sourceText, /Period\s+of\s+Insurance\s*from\s*:?\s*(?:00:00\s+hours\s+of\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  const expiryDate =
    matchGroup(sourceText, /Period of cover\s*\d{2}\/\d{2}\/\d{4}[^\n]+?\bto\s+(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /To:\s*Midnight of\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /To:\s*Midnight\s+On\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /To:\s*(?:Midnight\s+(?:On|of)\s*)?(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /(?:Expiry|End)\s*Date\s*[:.-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ||
    matchGroup(sourceText, /(?:midnight\s+of\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(?:midnight|23:59)/i);
  const duration = buildDuration(startDate, expiryDate);
  const riskLocation =
    matchGroup(sourceText, /Premises to be Insured\s*([\s\S]+?)\s*Premium\s*\(`/i) ||
    matchGroup(sourceText, /Risk Location\s*[–-]?\s*:\s*([\s\S]+?)\s*Description of Block/i);
  const businessDescription =
    matchGroup(sourceText, /Business of the Insured\s*([\s\S]+?)\s*Issued at/i) ||
    matchGroup(sourceText, /Description of Block\s*:?\s*([\s\S]+?)\s*Perils Covered/i);
  
  const idv = extractIDV(sourceText);
  const premium = extractPremium(sourceText);
  const sumInsured =
    normalizeAmount(matchGroup(sourceText, /MSME Suraksha Kavach\s*-\s*Contents\s*(?:Fire Basic Covers\s*)?\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i)) ||
    normalizeAmount(matchGroup(sourceText, /1\s*MSME Suraksha Kavach\s*-\s*Contents\s*\(`\)\s*([0-9,]+\.\d{2})/i)) ||
    normalizeAmount(matchGroup(sourceText, /MSME Suraksha Kavach\s*-\s*Contents[\s\S]{0,60}?\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i)) ||
    idv;

  const district = extractLocationPart(sourceText, riskLocation, "district");
  const tehsil = extractLocationPart(sourceText, riskLocation, "tehsil");
  const contactNumber =
    matchGroup(sourceText, /Agency\/Broker Mobile No\s*\S*\s*([6-9]\d{9})/i) ||
    matchGroup(sourceText, /Agency\/Broker CodeAgency\/Broker NameAgency\/Broker Mobile NoAgency\/Broker Email-ID\s*\d+\s*[A-Z0-9]*\s*([6-9]\d{9})/i) ||
    matchGroup(sourceText, /Agency\/Broker Mobile No.*?([6-9]\d{9})/i) ||
    matchGroup(sourceText, /\b([6-9]\d{9})\b/);
  const contactPerson =
    matchGroup(sourceText, /PROP\.?\s+([A-Z][A-Z\s]+?)(?:,|\s+KHASRA|\s+VILLAGE)/i) ||
    matchGroup(sourceText, /Contact person name\s*[:-]?\s*([A-Z][A-Z\s]+)/i);
  const insuranceCompany =
    matchGroup(sourceText, /(ICICI Lombard General Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(ICICI Lombard General Insurance Company Ltd)/i) ||
    matchGroup(sourceText, /(HDFC ERGO General Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(HDFC ERGO General Insurance Company Ltd)/i) ||
    matchGroup(sourceText, /(TATA AIG General Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(TATA AIG General Insurance Company Ltd)/i) ||
    matchGroup(sourceText, /(The New India Assurance Company Limited)/i) ||
    matchGroup(sourceText, /(IFFCO[- ]TOKIO General Insurance Co\.?\s*Ltd)/i) ||
    matchGroup(sourceText, /(IFFCO[- ]?TOKIO GENERAL INSURANCE[A-Z .]*)/i) ||
    matchGroup(sourceText, /(Bajaj Allianz General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Bajaj Allianz General Insurance Company? Ltd)/i) ||
    matchGroup(sourceText, /(SBI General Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(United India Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(Oriental Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(The Oriental Insurance Company? Ltd)/i) ||
    matchGroup(sourceText, /(National Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(Reliance General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Kotak Mahindra General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Future Generali India Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Cholamandalam MS General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Royal Sundaram General Insurance Co\.?\s*Limited)/i) ||
    matchGroup(sourceText, /(Shriram General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Acko General Insurance Limited)/i) ||
    matchGroup(sourceText, /(Go Digit General Insurance Limited)/i) ||
    matchGroup(sourceText, /(Navi General Insurance Limited)/i) ||
    matchGroup(sourceText, /(Liberty General Insurance Limited)/i) ||
    matchGroup(sourceText, /(Magma HDI General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Universal Sompo General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Raheja QBE General Insurance Company? Limited)/i);
  const pptMpwlc = matchGroup(sourceText, /\b(MPWLC)\b/i);
  const occupancy = businessDescription;
  const validIn = issuedAt;
  const groupName = deriveGroupName(sourceText, sourceFile, insuredName, pptMpwlc);
  const motorVehicleTable = extractMotorVehicleTable(sourceText, { policyType });
  const vehicleNumber =
    motorVehicleTable.registrationNumber ||
    extractMotorRegistrationNumber(sourceText) ||
    matchGroup(sourceText, /\bVehicle (?:Registration )?No(?:\.|:)?\s*([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4})/i) ||
    matchGroup(sourceText, /\bRegistration No(?:\.|:)?\s*([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4})/i) ||
    matchGroup(sourceText, /\bRegistration Mark[^\n]*\n[^A-Z]*([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})/i) ||
    matchGroup(sourceText, /\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(?=\d{4}\b)/i) ||
    matchGroup(sourceText, /\b([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4})\b/i);
  const registrationNumber =
    matchGroup(sourceText, /\bRegistration Number(?:\.|:)?\s*([A-Z0-9-]+)/i) ||
    vehicleNumber;
  
  const makeModel = motorVehicleTable.makeModel || extractMakeModel(sourceText);
  const variant =
    matchGroup(sourceText, /\bVariant(?:\.|:)?\s*([A-Z0-9 /&().,-]{1,60})/i);
  const manufacturingYear = motorVehicleTable.manufacturingYear || extractMfgYear(sourceText);
  const registrationDate =
    matchGroup(sourceText, /\bRegistration Date(?:\.|:)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  
  const engineNumber = motorVehicleTable.engineNumber || extractEngineNumber(sourceText);
  const chassisNumber = motorVehicleTable.chassisNumber || extractChassisNumber(sourceText);
  const fuelType =
    matchGroup(sourceText, /\bFuel Type(?:\.|:)?\s*([A-Z ]{3,40})/i) ||
    inferFuelType(sourceText, makeModel);
  const cubicCapacity =
    motorVehicleTable.cubicCapacity ||
    matchGroup(sourceText, /Cubic capacity[\s\S]{0,100}?\b(\d{3,4})\s*cc/i) ||
    matchGroup(sourceText, /\b(?:CC|Cubic Capacity)(?:\.|:)?\s*([0-9. ]{2,20})/i) ||
    matchGroup(sourceText, /\bCC\s*\n?\s*(\d{2,4})/i) ||
    matchGroup(sourceText, /\b(\d{2,4})(?:Package|Liability|Comprehensive|Third\s*Party)/i);
  const seatingCapacity = motorVehicleTable.seatingCapacity || extractSeatingCapacity(sourceText, { policyType, makeModel, cubicCapacity });
  const grossVehicleWeight =
    matchGroup(sourceText, /\b(?:GVW|Gross Vehicle Weight)(?:\.|:)?\s*([0-9., ]{2,20})/i);
  
  const ncb =
    matchGroup(sourceText, /\bNCB[^\n]*?(\d{1,2}%)/i) ||
    matchGroup(sourceText, /\bNCB(?:\.|:)?\s*([0-9]{1,2}%)/i) ||
    matchGroup(sourceText, /\bNo Claim Bonus(?:\.|:)?\s*([0-9]{1,2}%)/i) ||
    matchNCB(sourceText);
  const shouldPopulatePolicyCoverType =
    isMotorCoverTypeContext({ policyType, policyUnderstanding, motorVehicleTable, hdfcErgoMotor, generaliMotor }) ||
    schemaSupportsCoverType(policySchema);
  const policyCoverType =
    shouldPopulatePolicyCoverType
      ? motorVehicleTable.policyCoverType || extractPolicyCoverType(sourceText, policyType)
      : "";
  const rtoLocation =
    matchGroup(sourceText, /\bRTO(?: Location)?(?:\.|:)?\s*([A-Z0-9/&().,\-\s]{2,80})/i);
  
  const nomineeName = extractNominee(sourceText);
  const financerName = extractFinancer(sourceText);

  const legacyData = {
    sourceFile: sourceFile || "Untitled.pdf",
    sourceText,
    status: "saved",
    srNo: "",
    documentFormat: hdfcErgoMotor.documentDetected ? "HDFC_ERGO_MOTOR_V1" : generaliMotor.documentDetected ? "GENERALI_MOTOR_V1" : policyUnderstanding.documentFormat !== "GENERIC_POLICY_V1" ? policyUnderstanding.documentFormat : "",
    documentCategory: hdfcErgoMotor.documentDetected || generaliMotor.documentDetected ? "Motor Insurance" : policyUnderstanding.documentCategory || "",
    insuredName: hdfcErgoMotor.insuredName || generaliMotor.insuredName || insuredName,
    contactNumber: hdfcErgoMotor.customerMobile || generaliMotor.customerMobile || contactNumber,
    contactPerson,
    groupName,
    policyNumber: hdfcErgoMotor.policyNumber || generaliMotor.policyNumber || policyNumber,
    policyType: generaliMotor.policyType || policyType,
    sumInsured: hdfcErgoMotor.totalIdv || generaliMotor.totalIdv || sumInsured,
    premium: hdfcErgoMotor.totalPremium || generaliMotor.totalPremium || premium,
    startDate: hdfcErgoMotor.policyStartDate || generaliMotor.policyStartDate || startDate,
    expiryDate: hdfcErgoMotor.policyEndDate || generaliMotor.policyEndDate || expiryDate,
    duration: buildDuration(hdfcErgoMotor.policyStartDate || generaliMotor.policyStartDate || startDate, hdfcErgoMotor.policyEndDate || generaliMotor.policyEndDate || expiryDate) || duration,
    riskLocation: hdfcErgoMotor.communicationAddress || generaliMotor.communicationAddress || riskLocation,
    district,
    tehsil,
    insuranceCompany: hdfcErgoMotor.companyName || generaliMotor.companyName || insuranceCompany,
    description: businessDescription,
    pptMpwlc,
    occupancy,
    validIn,
    vehicleNumber: hdfcErgoMotor.registrationNumber || generaliMotor.registrationNumber || vehicleNumber,
    registrationNumber: hdfcErgoMotor.registrationNumber || generaliMotor.registrationNumber || registrationNumber,
    makeModel: [hdfcErgoMotor.vehicleMake, hdfcErgoMotor.vehicleModel].filter(Boolean).join(" ") || [generaliMotor.vehicleMake, generaliMotor.vehicleModel].filter(Boolean).join(" ") || makeModel,
    variant,
    manufacturingYear: hdfcErgoMotor.manufacturingYear || generaliMotor.manufacturingYear || manufacturingYear,
    registrationDate,
    engineNumber: hdfcErgoMotor.engineNumber || generaliMotor.engineNumber || engineNumber,
    chassisNumber: hdfcErgoMotor.chassisNumber || generaliMotor.chassisNumber || chassisNumber,
    fuelType: generaliMotor.documentDetected ? generaliMotor.fuelType || "" : fuelType,
    cubicCapacity: hdfcErgoMotor.cubicCapacity || generaliMotor.cubicCapacity || cubicCapacity,
    seatingCapacity: hdfcErgoMotor.seatingCapacity || generaliMotor.seatingCapacity || seatingCapacity,
    grossVehicleWeight,
    idv: hdfcErgoMotor.totalIdv || generaliMotor.totalIdv || idv,
    ncb: hdfcErgoMotor.ncbPercentage || generaliMotor.ncbPercentage || ncb,
    policyCoverType,
    rtoLocation: hdfcErgoMotor.rto || generaliMotor.rto || rtoLocation,
    nomineeName: generaliMotor.nomineeName || nomineeName,
    financerName: generaliMotor.financerName || financerName,
    companyName: hdfcErgoMotor.companyName || generaliMotor.companyName,
    proposalNumber: hdfcErgoMotor.proposalNumber,
    invoiceNumber: hdfcErgoMotor.invoiceNumber || generaliMotor.invoiceNumber,
    issuanceDate: hdfcErgoMotor.issuanceDate || generaliMotor.issuanceDate,
    customerId: hdfcErgoMotor.customerId,
    communicationAddress: hdfcErgoMotor.communicationAddress || generaliMotor.communicationAddress,
    customerMobile: hdfcErgoMotor.customerMobile || generaliMotor.customerMobile,
    customerEmail: hdfcErgoMotor.customerEmail || generaliMotor.customerEmail,
    gstin: hdfcErgoMotor.gstin,
    panNumber: hdfcErgoMotor.panNumber || generaliMotor.panNumber,
    vehicleMake: hdfcErgoMotor.vehicleMake || generaliMotor.vehicleMake,
    vehicleModel: hdfcErgoMotor.vehicleModel || generaliMotor.vehicleModel,
    rto: hdfcErgoMotor.rto || generaliMotor.rto,
    bodyType: hdfcErgoMotor.bodyType || generaliMotor.bodyType,
    totalIdv: hdfcErgoMotor.totalIdv || generaliMotor.totalIdv,
    geographicalArea: hdfcErgoMotor.geographicalArea || generaliMotor.geographicalArea,
    compulsoryDeductible: hdfcErgoMotor.compulsoryDeductible || generaliMotor.compulsoryDeductible,
    voluntaryDeductible: hdfcErgoMotor.voluntaryDeductible,
    basicOwnDamage: hdfcErgoMotor.basicOwnDamage || generaliMotor.basicOwnDamage,
    basicThirdPartyLiability: hdfcErgoMotor.basicThirdPartyLiability || generaliMotor.basicThirdPartyLiability,
    netOwnDamagePremium: hdfcErgoMotor.netOwnDamagePremium || generaliMotor.netOwnDamagePremium,
    netLiabilityPremium: hdfcErgoMotor.netLiabilityPremium || generaliMotor.netLiabilityPremium,
    totalPackagePremium: hdfcErgoMotor.totalPackagePremium || generaliMotor.totalPackagePremium,
    gstAmount: hdfcErgoMotor.gstAmount || generaliMotor.gstAmount,
    totalPremium: hdfcErgoMotor.totalPremium || generaliMotor.totalPremium,
    zeroDepreciationCover: hdfcErgoMotor.zeroDepreciationCover,
    engineGearboxProtection: hdfcErgoMotor.engineGearboxProtection,
    costOfConsumables: hdfcErgoMotor.costOfConsumables,
    previousPolicyNumber: hdfcErgoMotor.previousPolicyNumber || generaliMotor.previousPolicyNumber,
    previousPolicyValidity: hdfcErgoMotor.previousPolicyValidity,
    previousInsurer: hdfcErgoMotor.previousInsurer,
    ncbPercentage: hdfcErgoMotor.ncbPercentage || generaliMotor.ncbPercentage,
    paymentReference: hdfcErgoMotor.paymentReference,
    bankName: hdfcErgoMotor.bankName || generaliMotor.bankName,
    cscName: hdfcErgoMotor.cscName,
    cscCode: hdfcErgoMotor.cscCode,
    cscContactNumber: hdfcErgoMotor.cscContactNumber
  };

  return buildIntelligentResult(legacyData, policyUnderstanding, policySchema, schemaExtraction);
}

function buildIntelligentResult(legacyData, policyUnderstanding, policySchema, schemaExtraction) {
  const mergedData = mergeSchemaWithFallback(schemaExtraction, legacyData);
  const validation = validateExtraction({ legacyData: mergedData, schemaResult: schemaExtraction, understanding: policyUnderstanding });

  return {
    ...mergedData,
    confidenceScore: validation.confidenceScore,
    extractionMethod: schemaExtraction.schemaMatch >= 0.62 ? "understanding_schema_with_regex_fallback" : "regex_fallback_with_understanding",
    extractionQuality: {
      quality: validation.quality,
      schemaName: policySchema.name || "",
      schemaVersion: policySchema.version || 1,
      schemaMatch: schemaExtraction.schemaMatch,
      understandingConfidence: policyUnderstanding.confidence,
      schemaLoadError: policySchema.schemaLoadError || "",
      warnings: validation.warnings
    },
    policyUnderstanding,
    schemaExtraction: {
      schemaName: schemaExtraction.schemaName,
      schemaVersion: schemaExtraction.schemaVersion,
      schemaMatch: schemaExtraction.schemaMatch,
      confidence: schemaExtraction.confidence,
      warnings: schemaExtraction.warnings
    },
    fieldConfidence: validation.fieldConfidence
  };
}

function extractHdfcErgoMotor(text) {
  const detected = isHdfcErgoMotor(text);
  if (!detected) return { documentDetected: false };

  const data = {
    documentDetected: true,
    companyName: "HDFC ERGO",
    policyType: cleanHdfcValue(
      matchGroup(text, /(PRIVATE CAR COMPREHENSIVE POLICY)/i) ||
      matchGroup(text, /(Private Car Comprehensive Policy)/i) ||
      matchGroup(text, /(Motor Insurance\s*-\s*Proposal Form cum Transcript Letter For Private Car Package)/i)
    ),
    policyNumber: extractHdfcPolicyNumber(text),
    proposalNumber: extractByLabels(text, ["Proposal No.", "Proposal No"], "identifier"),
    invoiceNumber: extractByLabels(text, ["Invoice No.", "Invoice No"], "identifier"),
    issuanceDate: extractByLabels(text, ["Issuance Date", "Issue Date"], "date"),
    policyStartDate: extractHdfcPeriod(text, "start"),
    policyEndDate: extractHdfcPeriod(text, "end"),
    customerId: extractByLabels(text, ["Customer Id", "Customer ID"], "identifier"),
    insuredName: extractHdfcInsuredName(text),
    communicationAddress: extractHdfcCommunicationAddress(text),
    customerMobile: extractByLabels(text, ["Tel.", "Tel", "Mobile", "Contact No"], "phone"),
    customerEmail: extractByLabels(text, ["Email ID", "Email Id", "Email"], "email"),
    gstin: extractInsuredGstin(text),
    panNumber: extractByLabels(text, ["PAN/Form 97 ID", "PAN"], "pan"),
    vehicleMake: extractByLabels(text, ["Make"], "vehicleText"),
    vehicleModel: extractHdfcBoundedText(text, "Model", ["Period of", "Registration No", "RTO", "Chassis No"]),
    registrationNumber: extractHdfcRegistrationNumber(text),
    rto: extractHdfcBoundedText(text, "RTO", ["Issuance Date", "Chassis No", "Invoice No"]),
    chassisNumber: extractHdfcBoundedText(text, "Chassis No.", ["Invoice No", "Cubic Capacity", "Customer Id"]),
    engineNumber: extractByLabels(text, ["Engine No.", "Engine No", "Engine Number"], "identifier"),
    cubicCapacity: extractByLabels(text, ["Cubic Capacity / Watts", "Cubic Capacity"], "number"),
    seatingCapacity: extractByLabels(text, ["Seats", "Seating Capacity"], "number"),
    manufacturingYear: extractByLabels(text, ["Year of Manufacture", "Manufacturing Year"], "year"),
    bodyType: extractByLabels(text, ["Body Type"], "shortText"),
    totalIdv: extractHdfcTotalIdv(text),
    geographicalArea: extractHdfcGeographicalArea(text),
    compulsoryDeductible: extractHdfcInlineAmount(text, /Compulsory Deductible\s*\(IMT-22\)\s*([0-9,]+)/i),
    voluntaryDeductible: extractHdfcInlineAmount(text, /Voluntary Deductible(?:\s*\(IMT-22A\))?\s*([0-9,]+)/i),
    basicOwnDamage: extractByLabels(text, ["Basic Own Damage"], "amount"),
    basicThirdPartyLiability: extractByLabels(text, ["Basic Third Party Liability"], "amount"),
    netOwnDamagePremium: extractByLabels(text, ["Net Own Damage Premium (a)", "Net Own Damage Premium"], "amount"),
    netLiabilityPremium: extractByLabels(text, ["Net Liability Premium (b)", "Net Liability Premium"], "amount"),
    totalPackagePremium: extractByLabels(text, ["Total Package Premium (a+b)", "Total Package Premium"], "amount"),
    gstAmount: extractGstAmount(text),
    totalPremium: extractByLabels(text, ["Total Premium"], "amount"),
    zeroDepreciationCover: extractHdfcAmountAfterCoverage(text, "Zero Depreciation"),
    engineGearboxProtection: extractHdfcAmountAfterCoverage(text, "Engine and Gear box Protection"),
    costOfConsumables: extractHdfcAmountAfterCoverage(text, "Cost of Consumables"),
    previousPolicyNumber: extractHdfcPreviousPolicyNumber(text),
    previousPolicyValidity: extractHdfcPreviousPolicyValidity(text),
    previousInsurer: extractHdfcPreviousInsurer(text),
    ncbPercentage: extractByLabels(text, ["NCB", "No Claim Bonus"], "percent"),
    paymentReference: extractByLabels(text, ["Payment Details", "Payment Reference"], "text"),
    bankName: extractByLabels(text, ["Bank Name"], "text"),
    cscName: extractHdfcBoundedText(text, "CSC Name", ["CSC Code", "Contact No", "For HDFC", "Anti rebate"]),
    cscCode: extractHdfcBoundedText(text, "CSC Code", ["Contact No", "For HDFC", "Anti rebate"]),
    cscContactNumber: extractCscContact(text)
  };

  if (!data.policyType && /private\s+car\s+comprehensive\s+policy/i.test(text)) {
    data.policyType = "Private Car Comprehensive Policy";
  }

  return data;
}

function isHdfcErgoMotor(text) {
  const hasCompany = /HDFC\s+ERGO\s+General\s+Insurance\s+Company\s+Limited/i.test(text) || /\bHDFC\s+ERGO\b/i.test(text);
  const hasExactPolicyTitle = /PRIVATE\s+CAR\s+COMPREHENSIVE\s+POLICY/i.test(text);

  if (!hasCompany && !hasExactPolicyTitle) return false;

  const formatSignals = [
    /Vehicle\s+Details/i,
    /Premium\s+Details/i,
    /Total\s+IDV/i,
    /Basic\s+Own\s+Damage/i,
    /Basic\s+Third\s+Party\s+Liability/i,
    /Net\s+Own\s+Damage\s+Premium/i,
    /Net\s+Liability\s+Premium/i,
    /CSC\s+Name/i,
    /Policy\s+No\.?/i,
    /Proposal\s+No\.?/i
  ];

  return hasCompany && formatSignals.some((pattern) => pattern.test(text)) || hasCompany && hasExactPolicyTitle || hasExactPolicyTitle && formatSignals.filter((pattern) => pattern.test(text)).length >= 2;
}

function extractGeneraliMotor(text) {
  if (!isGeneraliMotor(text)) return { documentDetected: false };

  const invoiceBlock = sliceText(text, /Tax Invoice/i, /Motor Protect Private Car Package Policy/i) || text;
  const scheduleBlock = sliceText(text, /Motor Protect Private Car Package Policy/i, /INSURED'S DECLARED VALUE/i) || text;
  const premiumBlock = sliceText(text, /INSURED'S DECLARED VALUE/i, /Class of Vehicle/i) || text;
  const vehicle = extractGeneraliVehicle(scheduleBlock);

  return {
    documentDetected: true,
    companyName: "Generali Central Insurance Company Limited",
    policyType: cleanHdfcValue(
      matchGroup(text, /(MOTOR PROTECT PRIVATE CAR PACKAGE POLICY)/i) ||
      matchGroup(text, /(Motor Protect Private Car Package Policy)/i) ||
      matchGroup(text, /(PRIVATE CAR PACKAGE POLICY)/i)
    ),
    policyNumber: extractGeneraliPolicyNumber(text),
    invoiceNumber: matchGroup(text, /\b([A-Z0-9]{8,24})\s*:\s*Invoice Number/i),
    issuanceDate: matchGroup(text, /Date of Issue\s*\/\s*Invoice Date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
      matchGroup(text, /Date of Issue\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i),
    policyStartDate: extractGeneraliPeriod(text, "start"),
    policyEndDate: extractGeneraliPeriod(text, "end"),
    insuredName: extractGeneraliInsuredName(text),
    communicationAddress: extractGeneraliAddress(invoiceBlock),
    customerMobile: matchGroup(text, /Telephone\s*\(Mob,Off\)\s*:?\s*([0-9Xx*]{8,14})/i),
    customerEmail: matchGroup(text, /Email\s+Id\s*:?\s*([A-Z0-9*._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i),
    panNumber: matchGroup(text, /(?:^|\n)\s*PAN Number\s*:?\s*([A-Z]{5}\d{4}[A-Z])/i),
    vehicleMake: vehicle.make,
    vehicleModel: vehicle.model,
    registrationNumber: vehicle.registrationNumber,
    rto: vehicle.rto,
    chassisNumber: vehicle.chassisNumber,
    engineNumber: vehicle.engineNumber,
    cubicCapacity: vehicle.cubicCapacity,
    seatingCapacity: vehicle.seatingCapacity,
    manufacturingYear: vehicle.manufacturingYear,
    bodyType: vehicle.bodyType,
    totalIdv: extractGeneraliTotalIdv(premiumBlock),
    geographicalArea: matchGroup(text, /Geographical Area\s*:?\s*([A-Z][A-Z ]{2,40})/i),
    compulsoryDeductible: cleanGeneraliAmount(matchGroup(text, /Compulsory Deductible[\s\S]{0,100}?([0-9,]+\.\d{2})\s*\/-/i)),
    basicOwnDamage: cleanGeneraliAmount(matchGroup(premiumBlock, /Basic Premium on Vehicle\s*([0-9,]+\.\d{1,2})/i)),
    basicThirdPartyLiability: cleanGeneraliAmount(matchGroup(premiumBlock, /Basic Premium including Premium for TPPD\s*([0-9,]+\.\d{1,2})/i)),
    netOwnDamagePremium: cleanGeneraliAmount(matchGroup(premiumBlock, /Total Own Damage Premium\s*\(A\)[^\d]*([0-9,]+\.\d{1,2})/i)),
    netLiabilityPremium: cleanGeneraliAmount(matchGroup(premiumBlock, /Total Liability Premium\s*\(B\)\s*([0-9,]+\.\d{1,2})/i)),
    totalPackagePremium: cleanGeneraliAmount(matchGroup(premiumBlock, /Total Annual Premium\s*\(A\+B\)\s*([0-9,]+\.\d{1,2})/i)),
    gstAmount: cleanGeneraliAmount(matchGroup(premiumBlock, /Goods and Service Tax\s*([0-9,]+\.\d{1,2})/i)),
    totalPremium: extractGeneraliTotalPremium(text),
    previousPolicyNumber: matchGroup(text, /Previous Policy No\s*:?\s*([A-Z0-9/-]+)/i),
    ncbPercentage: matchGroup(text, /No Claim Discount\s*\((\d{1,2}%)/i) || matchGroup(text, /\bNCB[^\d]*(\d{1,2}%)/i),
    bankName: extractGeneraliFinancer(text),
    nomineeName: extractGeneraliNominee(text),
    financerName: extractGeneraliFinancer(text)
  };
}

function isGeneraliMotor(text) {
  const hasCompany = /Generali\s+Central\s+Insurance\s+Company\s+Limited/i.test(text) ||
    /Future\s+Generali\s+India\s+Insurance\s+Company\s+Limited/i.test(text);
  const hasMotorSignal = /Motor Protect Private Car Package Policy/i.test(text) ||
    /PRIVATE\s+CAR\s+PACKAGE\s+POLICY/i.test(text) ||
    /INSURED MOTOR VEHICLE DETAILS/i.test(text);
  return hasCompany && hasMotorSignal;
}

function extractGeneraliPolicyNumber(text) {
  const patterns = [
    /Policy No\.?\s*:?\s*([0-9]{2,4}\/[0-9]{2}\/[0-9]{2}\/[0-9]{4}\/[A-Z]+\/[0-9]+)/i,
    /Policy Number\s*:?\s*([0-9]{2,4}\/[0-9]{2}\/[0-9]{2}\/[0-9]{4}\/[A-Z]+\/[0-9]+)/i,
    /Your Policy No\.?\s+is\s+([0-9]{2,4}\/[0-9]{2}\/[0-9]{2}\/[0-9]{4}\/[A-Z]+\/[0-9]+)/i
  ];
  for (const pattern of patterns) {
    const value = matchGroup(text, pattern);
    if (value) return value;
  }
  return "";
}

function extractGeneraliPeriod(text, side) {
  const match = text.match(/Period of Insurance\s*:?\s*From\s*(?:[0-9:]+\s*hours\s*of\s*)?(\d{1,2}\/\d{1,2}\/\d{4})\s*To\s*(?:Midnight\s*of\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (!match) return "";
  return side === "start" ? match[1] : match[2];
}

function extractGeneraliInsuredName(text) {
  const patterns = [
    /Name of\s*Insured\/Proposer\s*:?\s*([A-Z .]+?)(?:\s+GCI State Code|\s+Address:|\n)/i,
    /Name of Insured\/Proposer\s*:?\s*([A-Z .]+?)(?:\s+GCI State Code|\s+Address:|\n)/i,
    /Dear\s+([A-Z .]+?),/i
  ];
  for (const pattern of patterns) {
    const value = cleanHdfcValue(matchGroup(text, pattern));
    if (value && !/insured details|registration/i.test(value)) return value;
  }
  return "";
}

function extractGeneraliAddress(text) {
  const match = text.match(/Address\s*:\s*([\s\S]+?)(?:GSTIN Number|GCI GSTIN Number|CKYC|Place of Supply|Telephone|Email Id)/i);
  if (!match?.[1]) return "";
  return cleanHdfcValue(match[1].replace(/\n/g, " "))
    .replace(/\s*Pincode\s*:\s*/i, " Pincode: ")
    .replace(/\s*(?:State|City)\s*:\s*$/i, "")
    .trim();
}

function extractGeneraliVehicle(text) {
  const data = {
    registrationNumber: "",
    rto: "",
    make: "",
    model: "",
    engineNumber: "",
    chassisNumber: "",
    manufacturingYear: "",
    cubicCapacity: "",
    bodyType: "",
    seatingCapacity: ""
  };

  const vehicleMatch = text.match(/\b([A-Z]{2}-\d{2}-[A-Z]{1,3}-\d{4}),\s*([A-Z ]+?)(MARUTI SUZUKI|MARUTI|HYUNDAI|HONDA|TATA|MAHINDRA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)([\s\S]{0,120}?)\n\s*([A-Z0-9]{8,20})([A-Z0-9]{17})/i);
  if (vehicleMatch) {
    data.registrationNumber = vehicleMatch[1].trim();
    data.rto = cleanHdfcValue(vehicleMatch[2]);
    data.make = cleanHdfcValue(vehicleMatch[3]);
    data.model = cleanHdfcValue(vehicleMatch[4].replace(/\n/g, " "));
    data.engineNumber = vehicleMatch[5].trim();
    data.chassisNumber = vehicleMatch[6].trim();
  }

  const specMatch = text.match(/Premium\s*\n\s*(\d{4})(\d{3,4})([A-Z ]+?)(\d)([0-9,]+\.\d{2})/i);
  if (specMatch) {
    data.manufacturingYear = specMatch[1];
    data.cubicCapacity = specMatch[2];
    data.bodyType = cleanHdfcValue(specMatch[3]);
    data.seatingCapacity = specMatch[4];
  }

  return data;
}

function extractGeneraliTotalIdv(text) {
  const beforeYear = text.split(/Year\s*1\s*IDV/i)[0] || text;
  const amounts = Array.from(beforeYear.matchAll(/\b\d{1,3}(?:,\d{2,3})+\.\d{2}\b/g)).map((match) => match[0]);
  return amounts.length ? cleanGeneraliAmount(amounts[amounts.length - 1]) : "";
}

function extractGeneraliTotalPremium(text) {
  return cleanGeneraliAmount(
    matchGroup(text, /Total Premium\s*\(rounded off\)\s*([0-9,]+\.\d{1,2})/i) ||
    matchGroup(text, /Rs\.\s*([0-9,]+\.\d{1,2})\s*being the amount towards premium/i) ||
    matchGroup(text, /Total\s*\(Rounded to the nearest rupee\)\s*([0-9,]+\.\d{1,2})/i)
  );
}

function extractGeneraliNominee(text) {
  return cleanHdfcValue(
    matchGroup(text, /nominee[\s\S]{0,120}?\bis\s*1\)\s*([A-Z .]+?)(?:,\s*Age|\s*Age:)/i)
  );
}

function extractGeneraliFinancer(text) {
  return cleanHdfcValue(
    matchGroup(text, /Hypothecation Agreement with:-\s*1\)\s*Hypothecation\s*-\s*([A-Z0-9 &().,-]+?)(?:\n|$)/i) ||
    matchGroup(text, /Hypothecation\s*-\s*([A-Z0-9 &().,-]+?)(?:\n|$)/i)
  );
}

function sliceText(text, startPattern, endPattern) {
  const start = text.search(startPattern);
  if (start === -1) return "";
  const rest = text.slice(start);
  const end = rest.search(endPattern);
  return end === -1 ? rest : rest.slice(0, end);
}

function cleanGeneraliAmount(value) {
  const normalized = normalizeAmount(value || "");
  return normalized.replace(/^0+(?=\d,)/, "");
}

function extractByLabels(text, labels, type = "text") {
  for (const label of labels) {
    const value = extractNearLabel(text, label, type);
    if (value) return value;
  }
  return "";
}

function extractNearLabel(text, label, type) {
  const escaped = escapeRegExp(label).replace(/\\ /g, "\\s+");
  const patterns = [
    new RegExp(`${escaped}\\s*(?:[:\\-]|\\.)?\\s*([^\\n]{1,180})`, "i"),
    new RegExp(`${escaped}\\s*\\n\\s*([^\\n]{1,180})`, "i")
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = cleanHdfcValue(match[1]);
      const normalized = normalizeHdfcTypedValue(value, type);
      if (normalized) return normalized;
    }
  }
  return "";
}

function normalizeHdfcTypedValue(value, type) {
  const text = cleanHdfcValue(value);
  if (!text) return "";

  if (type === "amount") {
    return normalizeAmount(matchGroup(text, /([0-9][0-9,]*(?:\.\d{1,2})?)/) || text);
  }
  if (type === "number") {
    return matchGroup(text, /([0-9]+(?:\.\d+)?)/) || "";
  }
  if (type === "year") {
    return matchGroup(text, /\b(19\d{2}|20\d{2})\b/) || "";
  }
  if (type === "date") {
    return matchGroup(text, /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/) || text;
  }
  if (type === "email") {
    return matchGroup(text, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i) || text;
  }
  if (type === "phone") {
    return matchGroup(text, /([6-9Xx*][0-9Xx*]{7,14})/) || text;
  }
  if (type === "pan") {
    return matchGroup(text, /\b([A-Z]{5}\d{4}[A-Z])\b/i) || text;
  }
  if (type === "percent") {
    const percent = matchGroup(text, /(\d{1,2}\s*%)/);
    return percent ? percent.replace(/\s+/g, "") : "";
  }
  if (type === "registration") {
    return matchGroup(text, /\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})\b/i) || text;
  }
  if (type === "identifier") {
    return text.split(/\s{2,}|(?=\b(?:Policy|Proposal|Invoice|Customer|From|To|Make|Model|RTO|GSTIN)\b)/i)[0].trim();
  }
  if (type === "shortText" || type === "vehicleText") {
    return text.split(/\s{3,}|(?=\b(?:Model|Registration|RTO|Chassis|Engine|Cubic|Seats|Year|Body|Total)\b)/i)[0].trim();
  }

  return text;
}

function extractHdfcPolicyNumber(text) {
  const certificateMatch = text.match(/Certificate of Insurance cum Policy Schedule\s*\n?\s*(\d{12,24})\s*\n?\s*PRIVATE CAR COMPREHENSIVE POLICY/i);
  if (certificateMatch?.[1]) return certificateMatch[1].trim();

  const labelMatch = text.match(/Policy No\.?\s*([0-9 ]{12,32})/i);
  if (labelMatch?.[1]) return labelMatch[1].replace(/\s+/g, "");

  const repeated = text.match(/\b(23\d{17})\b/);
  return repeated?.[1] || "";
}

function extractHdfcRegistrationNumber(text) {
  const match = text.match(/Registration No\.?\s*([A-Z]{2}-\d{2}-[A-Z]{1,3}-\d{4})/i);
  return match?.[1]?.trim() || extractByLabels(text, ["Registration No", "Registration No.", "Registration Number"], "registration");
}

function extractHdfcBoundedText(text, label, stopLabels = []) {
  const escaped = escapeRegExp(label).replace(/\\ /g, "\\s+");
  const pattern = new RegExp(`${escaped}\\s*(?:[:.-])?\\s*([\\s\\S]{1,220})`, "i");
  const match = text.match(pattern);
  if (!match?.[1]) return "";

  let value = match[1];
  for (const stopLabel of stopLabels) {
    const stop = value.search(new RegExp(escapeRegExp(stopLabel).replace(/\\ /g, "\\s+"), "i"));
    if (stop !== -1) value = value.slice(0, stop);
  }

  return cleanHdfcValue(value)
    .split(/\n/)[0]
    .replace(/\s{2,}.*/, "")
    .trim();
}

function extractHdfcCommunicationAddress(text) {
  const match = text.match(/Communication Address\s*:?\s*([\s\S]+?)\s*Tel\.\s*[0-9Xx*]{8,14}/i);
  if (!match?.[1]) return extractByLabels(text, ["Communication Address"], "text");
  return cleanHdfcValue(match[1]);
}

function extractHdfcTotalIdv(text) {
  const rowMatch = text.match(/Year 1From\s*\d{2}\/\d{2}\/\d{4}\s*To\s*\d{2}\/\d{2}\/\d{4}\s*([0-9]+)/i) || text.match(/Total IDV\s*\(`\)[\s\S]{0,160}?Year 1From[^\n]*?([0-9]{8,})/i);
  if (rowMatch?.[1]) {
    const digits = rowMatch[1];
    const known = digits.match(/(10\d{5,7})$/);
    if (known?.[1]) return normalizeAmount(known[1]);
    if (digits.length > 8) return normalizeAmount(digits.slice(-7));
    return normalizeAmount(digits);
  }

  return extractByLabels(text, ["Total IDV", "IDV"], "amount");
}

function extractHdfcGeographicalArea(text) {
  return matchGroup(text, /Geographical Area\s+([A-Za-z ]+?)\s+Compulsory Deductible/i) || extractByLabels(text, ["Geographical Area"], "text");
}

function extractHdfcInlineAmount(text, pattern) {
  const match = text.match(pattern);
  return match?.[1] ? normalizeAmount(match[1]) : "";
}

function extractHdfcAmountAfterCoverage(text, label) {
  const escaped = escapeRegExp(label).replace(/\\ /g, "\\s+");
  const pattern = new RegExp(`${escaped}(?:\\s*\\([^\\n]+\\))?\\s*\\n\\s*([0-9,]+(?:\\.\\d{1,2})?)`, "i");
  const match = text.match(pattern);
  return match?.[1] ? normalizeAmount(match[1]) : "";
}

function extractHdfcPreviousPolicyNumber(text) {
  return matchGroup(text, /Previous Policy No\.?\s*([A-Z0-9/-]+)(?=Valid)/i);
}

function extractHdfcPreviousPolicyValidity(text) {
  return matchGroup(text, /Previous Policy No\.?[A-Z0-9/-]+Valid\s*([0-9/]+\s*to\s*[0-9/]+)/i);
}

function extractHdfcPreviousInsurer(text) {
  return matchGroup(text, /Previous Policy No\.?[A-Z0-9/-]+Valid[0-9/]+\s*to\s*[0-9/]+\s*of\s*([A-Z0-9 .&-]+?)(?=NCB|Policy Holder|$)/i);
}

function extractHdfcPeriod(text, side) {
  const ownDamagePeriod = text.match(/From Date & Time\s*(\d{2}\/\d{2}\/\d{4}[^\n]*?)\s*To Date & Time\s*(\d{2}\/\d{2}\/\d{4}[^\n]*?)(?=From Date & Time|Note:|Premium Details|$)/i);
  if (ownDamagePeriod?.[1] || ownDamagePeriod?.[2]) {
    return cleanHdfcValue(side === "start" ? ownDamagePeriod[1] : ownDamagePeriod[2]);
  }

  const pattern = /(?:Period\s+of\s+Insurance\s*)?From\s*[:.-]?\s*([^\n]{4,80}?)\s+(?:To|Upto)\s*[:.-]?\s*([^\n]{4,80})/i;
  const match = text.match(pattern);
  if (match?.[1] || match?.[2]) {
    return cleanHdfcValue(side === "start" ? match[1] : match[2]);
  }
  return extractByLabels(text, side === "start" ? ["From Date & Time", "From"] : ["To Date & Time", "To"], "text");
}

function extractHdfcInsuredName(text) {
  const patterns = [
    /Customer\s+Name\s*(?:Block)?\s*[:.-]?\s*([^\n]{3,120})/i,
    /(?:Customer|Insured|Proposer)\s+Name\s*[:.-]?\s*([^\n]{3,120})/i,
    /\b(M\/S\s+[A-Z0-9&().,/ -]{3,100})\b/i
  ];
  for (const pattern of patterns) {
    const value = matchGroup(text, pattern);
    if (value) return cleanHdfcValue(value);
  }
  return "";
}

function extractInsuredGstin(text) {
  const gstMatches = Array.from(text.matchAll(/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/g));
  if (!gstMatches.length) return "";

  for (const match of gstMatches) {
    const before = text.slice(Math.max(0, match.index - 120), match.index);
    if (!/HDFC\s+ERGO|insurer|insurance\s+company/i.test(before)) {
      return match[0];
    }
  }
  return gstMatches[0][0];
}

function extractGstAmount(text) {
  const totalLine = text.match(/GST\s*18%[\s\S]{0,140}?\n\s*([0-9,]+(?:\.\d{1,2})?)/i);
  if (totalLine?.[1]) return normalizeAmount(totalLine[1]);

  const taxLine = text.match(/Central Tax\s*9%\s*\(`\s*([0-9,]+(?:\.\d{1,2})?)\s*\)\s*\+\s*State Tax\s*9%\s*\(`\s*([0-9,]+(?:\.\d{1,2})?)/i);
  if (taxLine?.[1] || taxLine?.[2]) {
    const total = Number(String(taxLine[1] || "0").replace(/,/g, "")) + Number(String(taxLine[2] || "0").replace(/,/g, ""));
    return normalizeAmount(String(total));
  }

  const central = normalizeAmount(extractByLabels(text, ["Central Tax"], "amount"));
  const state = normalizeAmount(extractByLabels(text, ["State Tax"], "amount"));
  const centralNumber = Number(String(central || "").replace(/,/g, ""));
  const stateNumber = Number(String(state || "").replace(/,/g, ""));
  if (centralNumber || stateNumber) return normalizeAmount(String(centralNumber + stateNumber));
  return extractByLabels(text, ["GST 18%", "GST Amount", "GST"], "amount");
}

function extractCscContact(text) {
  const cscIndex = text.search(/CSC\s+(?:Name|Code|Contact)|INSUREDESK\s+IMF/i);
  if (cscIndex === -1) return "";
  const block = text.slice(cscIndex, cscIndex + 600);
  return extractByLabels(block, ["Contact No", "CSC Contact", "Contact Number"], "phone") || matchGroup(block, /\b([6-9]\d{9})\b/);
}

function cleanHdfcValue(value) {
  return String(value || "")
    .replace(/\r/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*(?:\||;)+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanText(text) {
  return text
    .replace(/\r/g, " ")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function cleanMakeModel(text) {
  const patterns = [
    /(?:BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL ENFIELD|KTM|HARLEY|JAWA|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)\s+[A-Z0-9][A-Z0-9 /.,-]{2,60}/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) {
      return match[0]
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\s*(?:Registration|Chassis|Engine|Seating|Vehicle|Side Car|Accessories).*$/i, "")
        .trim();
    }
  }
  return "";
}

function matchNCB(text) {
  const m = text.match(/No Claim Bonus\s*(?:Discount)?\s*\(?\s*(\d{1,2})\s*%\s*\)?/i);
  if (m?.[1]) return m[1] + "%";
  return "";
}

function inferFuelType(text, makeModel) {
  const combined = (text + " " + (makeModel || "")).toLowerCase();
  if (/\bdiesel\b/.test(combined)) return "Diesel";
  if (/\belectric\b|\bev\b|\bbev\b/.test(combined)) return "Electric";
  if (/\bcng\b/.test(combined)) return "CNG";
  if (/\blpg\b/.test(combined)) return "LPG";
  if (/\bpetrol\b|\bgasoline\b|\bdts-?fi\b|\bfi\b/.test(combined)) return "Petrol";
  return "";
}

function matchGroup(text, pattern) {
  const match = text.match(pattern);
  return match?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeAmount(value) {
  if (!value) return "";
  const cleaned = value.replace(/\s+/g, "");
  return cleaned.includes(".") ? cleaned : `${cleaned}.00`;
}

function buildDuration(startDate, expiryDate) {
  if (!startDate || !expiryDate) return "";
  const normalizedStart = matchGroup(String(startDate), /(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  const normalizedEnd = matchGroup(String(expiryDate), /(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (!normalizedStart || !normalizedEnd) return "";
  const [sd, sm, sy] = normalizedStart.split("/").map(Number);
  const [ed, em, ey] = normalizedEnd.split("/").map(Number);
  if (!sd || !sm || !sy || !ed || !em || !ey) return "";
  let months = (ey - sy) * 12 + (em - sm);
  if (months <= 0) months = 1;
  return `${months} month${months === 1 ? "" : "s"}`;
}

function extractLocationPart(text, riskLocation, kind) {
  const haystack = `${riskLocation || ""} ${text}`;
  if (kind === "district") {
    return (
      matchGroup(haystack, /DIST(?:RICT|ICT)\s+([A-Z][A-Z\s]+)/i) ||
      matchGroup(haystack, /MADHYA PRADESH[-\s]+([A-Z][A-Z\s]+)[-\s]+\d{6}/i)
    );
  }

  return matchGroup(haystack, /TEHSIL\s+([A-Z][A-Z\s]+)/i);
}

function deriveGroupName(text, sourceFile, insuredName, pptMpwlc) {
  if (pptMpwlc) return pptMpwlc;

  const filenameGroup = matchGroup(sourceFile, /\b([A-Z]{3,})\b/i);
  if (filenameGroup && ["PDF", "POLICY"].indexOf(filenameGroup.toUpperCase()) === -1) {
    return filenameGroup.toUpperCase();
  }

  return matchGroup(insuredName || text, /\b([A-Z]{3,})\b/i);
}

// Robust IFFCO-TOKIO and general PDF extraction helpers

function extractInsuredName(text) {
  const patterns = [
    /Name of the Insured\s*([\s\S]+?)(?=\s*(?:Policy No|Policy\s*#|Address|Phone|Customer|$))/i,
    /following insured:\s*([\s\S]+?)(?=\s*PROP)/i,
    /Insured(?:'s)? Name\s*[:.-]?\s*([\s\S]+?)(?=\s*(?:Policy No|Policy\s*#|Address|Phone|Invoice|Date|GSTIN|Customer|$))/i,
    /Name of Insured\s*[:.-]?\s*([\s\S]+?)(?=\s*(?:Policy No|Policy\s*#|Address|Phone|Invoice|Date|GSTIN|Customer|$))/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      let val = match[1].replace(/\s+/g, " ").trim();
      val = val.replace(/\s*(?:Policy|Address|Phone|Invoice|Date|GSTIN|Customer).*$/i, "");
      if (val.length >= 2) return val;
    }
  }
  return "";
}

function extractPolicyNumber(text) {
  const patterns = [
    /[Pp][Oo][Ll][Ii][Cc][Yy]\s*#\s*:?\s*([A-Z0-9/-]+[A-Z0-9])/,
    /[Pp][Oo][Ll][Ii][Cc][Yy]\s*(?:[Nn][Oo]|[Nn][Uu][Mm][Bb][Ee][Rr]|[Ss][Cc][Hh][Ee][Dd][Uu][Ll][Ee]\s*[Nn][Oo]|[Ss][Cc][Hh][Ee][Dd][Uu][Ll][Ee]\s*[Nn][Uu][Mm][Bb][Ee][Rr])?\s*[:.-]?\s*([A-Z0-9/.-]{6,})/,
    /[Cc][Ee][Rr][Tt][Ii][Ff][Ii][Cc][Aa][Tt][Ee]\s*(?:[Nn][Oo]|[Nn][Uu][Mm][Bb][Ee][Rr])?\s*[:.-]?\s*([A-Z0-9/.-]{6,})/,
    /attached\s*herewith\s*([A-Z0-9/.-]{10,})\s*which\s*has\s*been\s*issued/
  ];
  
  for (const pattern of patterns) {
    const flags = pattern.flags ? pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g" : "g";
    const matches = text.matchAll(new RegExp(pattern.source, flags));
    for (const match of matches) {
      const val = match[1]?.trim();
      if (val && /\d/.test(val) && !/previous/i.test(val) && !/insurer/i.test(val)) {
        return val;
      }
    }
  }
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractPremium(text) {
  // Try Net Premium Table first (specifically IFFCO-TOKIO)
  const tableMatch1 = text.match(/Net Premium Rs\.(?:[^\n]*\n)+?\s*([\d.]+)/i);
  if (tableMatch1?.[1]) {
    const numbers = tableMatch1[1].match(/\d+\.\d{2}/g);
    if (numbers && numbers.length > 0) {
      return numbers[numbers.length - 1];
    }
  }

  // Try Premium Bifurcation Table
  const tableMatch2 = text.match(/Premium Bifurcation(?:[^\n]*\n)+?\s*([\d.]+)/i);
  if (tableMatch2?.[1]) {
    const numbers = tableMatch2[1].match(/\d+\.\d{2}/g);
    if (numbers && numbers.length > 0) {
      return numbers[numbers.length - 1];
    }
  }

  // Try Amount Received
  const amountRec = text.match(/Amount\s+Received\s*([0-9,.]+)/i);
  if (amountRec?.[1]) {
    return amountRec[1].trim();
  }

  // Fallbacks
  const fallbacks = [
    /Total Premium inclusive Tax\s*\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i,
    /Total Premium inclusive Tax\s*\(\s*`\s*\)\s*([0-9,]+)/i,
    /Premium\s*\(\s*`\s*\)\s*\(Including GST\)\s*\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i,
    /Premium\s*\(`\)\s*\(Including GST\)\(`\)\s*([0-9,]+\.\d{2})/i,
    /Total Premium\s*\(Rs\.?\)\s*([0-9,]+\.\d{2})/i,
    /Section 1[^\n]*Rs\.?\s*([0-9,]+\.\d{2})/i,
    /(?:Net Premium in Rs|Net Premium)\s*(?:Rs\.?)?\s*([0-9,]+(?:\.\d{2})?)/i,
    /Net Premium\s*(?:Rs\.?)?\s*([0-9,]+\.\d{2})/i,
    /(?:Total|Gross)\s*Premium[^\d]{0,30}([0-9,]+\.\d{2})/i,
    /Premium\s*(?:Amount)?\s*(?:Rs\.?|INR)?\s*([0-9,]+\.\d{2})/i
  ];
  for (const pattern of fallbacks) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeAmount(match[1]);
  }
  return "0.00";
}

function extractIDV(text) {
  // New India Assurance IDV patterns
  const NIA_idvMatch1 = text.match(/individual covers\s*\(OD\)\s*in\s*RS\s*[:.-]?\s*([0-9,]+)/i);
  if (NIA_idvMatch1?.[1]) {
    return normalizeAmount(NIA_idvMatch1[1]);
  }
  const NIA_idvMatch2 = text.match(/(?:INSURED DECLARED VALUE|Insured Declared Value)[^\n]*\n[^\n]*\n\s*([1-9]\d{4,8})/i);
  if (NIA_idvMatch2?.[1]) {
    return normalizeAmount(NIA_idvMatch2[1]);
  }

  const inlinePatterns = [
    /\bIDV(?:\.|:)?\s*([0-9,]+\.\d{2})/i,
    /\bInsured Declared Value(?:\.|:)?\s*([0-9,]+\.\d{2})/i,
    /IDV in Rs\.?\s*\n?[^0-9]*([0-9,]+\.\d{2})/i,
    /\bIDV(?:\.|:)?\s*(?:Rs\.?\s*)?([0-9,]+)/i
  ];
  for (const pattern of inlinePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeAmount(match[1]);
  }

  const coveragePattern = /(?:Package|Comprehensive|Liability|Third\s*Party)\s*([0-9,]+\.\d{2})/i;
  const matchCoverage = text.match(coveragePattern);
  if (matchCoverage?.[1]) return normalizeAmount(matchCoverage[1]);

  return "";
}

function extractMakeModel(text) {
  const manufacturerPattern = /Make of Vehicle\s*\n?\s*(?:\d+(?:\.\d+)?\s*)?(?:Package|Comprehensive|Liability|Third Party)?\s*(?:[0-9,.]+\s*)?(?:[^\n]*\n)*?\s*((?:BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL ENFIELD|KTM|HARLEY|JAWA|BENELLI|APRILIA|KAWASAKI|BMW|DUCATI|TRIUMPH|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)[A-Z0-9 /&.,-]+)/i;
  const m1 = text.match(manufacturerPattern);
  let makeModel = "";
  if (m1?.[1]) {
    makeModel = m1[1].replace(/\s+/g, " ").trim();
  } else {
    makeModel = cleanMakeModel(text);
  }

  if (!makeModel) {
    const labelPatterns = [
      /\bVehicle Make Model(?:\.|:)?\s*([A-Z0-9/&()., -]{3,80})/i,
      /\bMake(?:\s*\/\s*Model)?\s*[:.-]\s*([A-Z0-9/&()., -]{3,80})/i,
      /\bMake(?:\s*\/\s*Model)?(?:\.|:)?\s*([A-Z0-9/&()., -]{3,80})/i
    ];
    for (const pattern of labelPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        makeModel = match[1].replace(/\s+/g, " ").trim();
        break;
      }
    }
  }

  if (makeModel && makeModel.endsWith("-")) {
    const escaped = makeModel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped + "\\s*\\n\\s*([A-Za-z0-9]+)", "i");
    const matchSuffix = text.match(pattern);
    if (matchSuffix?.[1]) {
      makeModel += matchSuffix[1];
    }
  }

  return makeModel;
}

function extractMfgYear(text) {
  const patterns = [
    /\bMfg(?:\.|:)? Year(?:\.|:)?\s*(\d{4})/i,
    /\bManufacturing Year(?:\.|:)?\s*(\d{4})/i,
    /\b[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}(\d{4})\b/i,
    /Year of Manuf\.?\s*\n?[^\d\n]*(\d{4})/i,
    /\bYear\s*(?:of)?\s*(?:Manufacture|Manufacturing|Manuf)(?:\.|:)?\s*(\d{4})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const year = parseInt(match[1], 10);
      if (year >= 1980 && year <= 2030) {
        return match[1];
      }
    }
  }
  return "";
}

function extractMotorVehicleTable(text, context = {}) {
  const block = extractMotorVehicleBlock(text);
  if (!block) {
    return {
      registrationNumber: "",
      manufacturingYear: "",
      cubicCapacity: "",
      policyCoverType: "",
      makeModel: "",
      engineNumber: "",
      chassisNumber: "",
      seatingCapacity: ""
    };
  }

  const compact = block.replace(/\s+/g, " ");
  const dense = compact.replace(/\s/g, "");
  const registrationNumber = extractMotorRegistrationNumber(block);
  const registrationYear = registrationNumber
    ? matchGroup(compact, new RegExp(`${escapeRegExp(registrationNumber).replace(/[-\\s]/g, "[-\\\\s]?")}\\s*(\\d{4})`, "i"))
    : "";
  const coverMatch =
    dense.match(/\b(\d{2,4})(Package|Comprehensive|LiabilityOnly|Liability|ThirdParty|TP|OwnDamage)([0-9]{3,10}(?:\.\d{1,2})?)/i) ||
    dense.match(/\b(\d{2,4})(Package|Comprehensive|LiabilityOnly|Liability|ThirdParty|TP|OwnDamage)\b/i);
  const policyCoverType = coverMatch?.[2] ? normalizeCoverType(coverMatch[2]) : extractPolicyCoverType(block, context.policyType || "");
  const cubicCapacity = coverMatch?.[1] || extractMotorLabelValue(block, ["Cubic Capacity", "Cubic Capacity /Watts", "CC"], "number");
  const makeModel = extractMotorMakeModel(block) || extractMakeModel(block) || cleanMakeModel(block);

  return {
    registrationNumber,
    manufacturingYear: normalizeManufacturingYear(registrationYear) || extractMfgYear(block),
    cubicCapacity,
    policyCoverType,
    makeModel,
    engineNumber: extractEngineNumber(block),
    chassisNumber: extractChassisNumber(block),
    seatingCapacity: extractSeatingFromVehicleBlock(block, {
      ...context,
      makeModel,
      policyCoverType,
      cubicCapacity
    })
  };
}

function extractMotorVehicleBlock(text) {
  const startPatterns = [
    /Insured\s+Motor\s+Vehicle\s+Details/i,
    /INSURED\s+MOTOR\s+VEHICLE\s+DETAILS\s+AND\s+PREMIUM\s+(?:COMPUTATION|CALCULATION)/i,
    /\bVEHICLE\s+DETAILS\b/i,
    /Vehicle\s+Details\s*&?\s*Premium/i,
    /Registration\s+Mark\s*&?\s*No\.?/i,
    /Vehicle\s+Registration\s+(?:Details|No)/i
  ];
  let start = -1;
  for (const pattern of startPatterns) {
    const index = text.search(pattern);
    if (index !== -1 && (start === -1 || index < start)) start = index;
  }
  if (start === -1) return "";

  const tail = text.slice(start);
  const endMatch = tail.slice(120).search(/(?:VehicleSide\s+Car|A\.\s*Own\s+Damage|Premium\s+Details|Co-Insurance|Nominees?|Limit\s+of\s+Liability|Previous\s+Policy|GST\s+Details)/i);
  const end = endMatch === -1 ? Math.min(tail.length, 1400) : Math.min(tail.length, endMatch + 120);
  return tail.slice(0, end);
}

function extractMotorRegistrationNumber(text) {
  const labelled = extractMotorLabelValue(text, ["Registration Number", "Registration No", "Registration Mark", "Vehicle Registration No"], "registration");
  const normalizedLabelled = labelled ? matchGroup(labelled, /\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})\b/i) : "";
  if (normalizedLabelled) return normalizedLabelled;
  return matchGroup(text, /\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})\b/i);
}

function extractMotorLabelValue(text, labels, type = "text") {
  const stopWords = "(?:Policy|Period|RTO|Issuance|Chassis|Engine|Make|Model|Variant|Year|Type|Colour|Cubic|Seating|Seats|Customer|Invoice|Name|Geographical|Cover|IDV|Premium)";
  for (const label of labels) {
    const escaped = escapeRegExp(label).replace(/\\ /g, "\\s+");
    const patterns = [
      new RegExp(`${escaped}\\s*(?:[:.-])?\\s*([^\\n]{1,180})`, "i"),
      new RegExp(`${escaped}\\s*\\n\\s*([^\\n]{1,180})`, "i")
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match?.[1]) continue;
      let value = cleanHdfcValue(match[1]);
      value = value.split(new RegExp(`(?=${stopWords}\\b)`, "i"))[0].trim();
      const normalized = normalizeHdfcTypedValue(value, type);
      if (type === "registration" && !/\b[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}\b/i.test(normalized)) continue;
      if (normalized) return normalized;
    }
  }
  return "";
}

function extractMotorMakeModel(text) {
  const labelled = extractMotorLabelValue(text, ["Make / Model", "Make/Model of Vehicle", "Vehicle Make Model", "Model"], "vehicleText");
  if (labelled && !/^(?:of\s+Vehicle|Vehicle)$/i.test(labelled)) return labelled;

  const makeIndex = text.search(/\bMake(?:\s*\/\s*Model|\s*\/Model\s+of\s+Vehicle| of Vehicle|$)/i);
  if (makeIndex === -1) return "";
  const block = text.slice(makeIndex, makeIndex + 500);
  const makeMatch = block.match(/\b(?:BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL ENFIELD|KTM|HARLEY|JAWA|BENELLI|APRILIA|KAWASAKI|BMW|DUCATI|TRIUMPH|MAHINDRA|MARUTI(?: SUZUKI)?|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)[A-Z0-9 /&.,-]{2,100}/i);
  if (!makeMatch?.[0]) return "";
  let makeModel = cleanHdfcValue(makeMatch[0])
    .replace(/\s*(?:Engine|Chassis|Year|Cubic|Seating|Capacity|Premium|Variant).*$/i, "")
    .trim();
  if (makeModel.endsWith("-")) {
    const afterMatch = block.slice(makeMatch.index + makeMatch[0].length).match(/^\s*([A-Z0-9]{1,12})\b/i);
    if (afterMatch?.[1]) makeModel += afterMatch[1];
  }
  return makeModel;
}

function extractSeatingFromVehicleBlock(block, context = {}) {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const candidates = [];

  for (const match of block.matchAll(/\b(?:Seating\s*Capacity|Seating|Seats?|Carrying\s+Capacity)\b[ \t:.-]*(\d{1,2})(?!\d)/ig)) {
    candidates.push({ value: match[1], score: 70, source: match[0] });
  }

  for (const match of block.matchAll(/\bSeating\s*capacity(?:\s+including\s+Driver)?\s*(?:\n|\s)*(\d{1,2})(?=\D|$)/ig)) {
    candidates.push({ value: match[1], score: 92, source: match[0] });
  }

  for (const match of block.matchAll(/\bSeats\s*(\d{1,2})(?=\D|$)/ig)) {
    candidates.push({ value: match[1], score: 88, source: match[0] });
  }

  const chassisLabelIndex = lines.findIndex((line) => /\bChassis\s*(?:No|Number)\b/i.test(line));
  if (chassisLabelIndex !== -1) {
    for (let i = chassisLabelIndex + 1; i < Math.min(lines.length, chassisLabelIndex + 5); i++) {
      const value = lines[i].match(/^(\d{1,2})$/)?.[1];
      if (value) candidates.push({ value, score: 95, source: `after Chassis No: ${lines[i]}` });
    }
  }

  const seatingLabelIndex = lines.findIndex((line, index) => {
    const joined = `${line} ${lines[index + 1] || ""}`;
    return /\bSeating\s*Capacity\b/i.test(joined) || /\bSeats?\b/i.test(line);
  });
  if (seatingLabelIndex !== -1) {
    for (let i = seatingLabelIndex + 1; i < Math.min(lines.length, seatingLabelIndex + 14); i++) {
      const line = lines[i];
      const exact = line.match(/^(\d{1,2})$/)?.[1];
      if (exact) candidates.push({ value: exact, score: 90, source: `near Seating Capacity: ${line}` });

      const labelled = line.match(/(?:capacity|seats?)\D{0,20}(\d{1,2})(?!\d)/i)?.[1];
      if (labelled) candidates.push({ value: labelled, score: 78, source: line });
    }
  }

  const compact = block.replace(/\s+/g, "");
  const denseSpec = compact.match(/\b(19\d{2}|20\d{2})(\d{2,4})(?:[A-Z]{3,20})(\d{1,2})(?=\d{3,8}(?:\.\d{1,2})?\b)/i);
  if (denseSpec?.[3]) {
    candidates.push({ value: denseSpec[3], score: 82, source: denseSpec[0] });
  }

  const best = candidates
    .map((candidate) => ({
      ...candidate,
      normalized: normalizeSeatingCapacity(candidate.value, { ...context, text: block })
    }))
    .filter((candidate) => candidate.normalized)
    .sort((a, b) => b.score - a.score)[0];

  return best?.normalized || "";
}

function extractEngineNumber(text) {
  // New India Assurance pattern
  const NIA_EngineMatch = text.match(/(?:Chassis no\.\/Engine Number|Chassis No)\s*[A-Z0-9]{17}\s*\/\s*([A-Z0-9\n ]{3,30}?)(?=\s*(?:Make|Chassis|Registration|Model|Fuel|Year|$))/i);
  if (NIA_EngineMatch?.[1]) {
    return NIA_EngineMatch[1].replace(/[\r\n\s]+/g, "").trim();
  }

  const inlinePatterns = [
    /\bEngine\s*(?:No|Number)(?:\.|:)?\s*:\s*([A-Z0-9]{5,40})/i,
    /\bEngine\s*(?:No|Number)(?:\.|:)?\s*-\s*([A-Z0-9]{5,40})/i,
    /\bEngine\s*(?:No|Number)(?:\.|:)?[ \t]+([A-Z0-9]{5,40})/i
  ];
  for (const pattern of inlinePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  const index = text.search(/Engine\s*(?:No|Number)\b/i);
  if (index !== -1) {
    const sub = text.substring(index, index + 300);
    const lines = sub.split("\n").map(l => l.trim()).filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cleaned = line.replace(/^[-:.\s]+/, "").trim();
      if (
        cleaned.length >= 6 &&
        /\d/.test(cleaned) &&
        /[A-Z]/i.test(cleaned) &&
        !/seating|capacity|chassis|registration|make|model|year|body/i.test(cleaned)
      ) {
        return cleaned;
      }
    }
  }

  return "";
}

function extractChassisNumber(text) {
  // New India Assurance pattern
  const NIA_ChassisMatch = text.match(/(?:Chassis no\.\/Engine Number|Chassis No)\s*([A-Z0-9]{17})/i);
  if (NIA_ChassisMatch?.[1]) {
    return NIA_ChassisMatch[1].trim();
  }

  const inlinePatterns = [
    /\bChassis\s*(?:No|Number)(?:\.|:)?\s*:\s*([A-Z0-9]{10,25})/i,
    /\bChassis\s*(?:No|Number)(?:\.|:)?\s*-\s*([A-Z0-9]{10,25})/i,
    /\bChassis\s*(?:No|Number)(?:\.|:)?[ \t]+([A-Z0-9]{10,25})/i
  ];
  for (const pattern of inlinePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  const index = text.search(/Chassis\s*(?:No|Number)\b/i);
  if (index !== -1) {
    const sub = text.substring(index, index + 300);
    const lines = sub.split("\n").map(l => l.trim()).filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cleaned = line.replace(/^[-:.\s]+/, "").trim();
      if (
        cleaned.length >= 10 &&
        cleaned.length <= 25 &&
        /\d/.test(cleaned) &&
        /[A-Z]/i.test(cleaned) &&
        !/\s/.test(cleaned) &&
        !/seating|capacity|engine|registration|make|model|year|body|accessories/i.test(cleaned)
      ) {
        return cleaned;
      }
    }
  }

  const vinMatch = text.match(/\b([A-Z0-9]{17})\b/i);
  if (vinMatch?.[1]) {
    const cleaned = vinMatch[1].trim();
    if (/\d/.test(cleaned) && !/HEEE|FFF|DJE|GBF|ENL|KOH|JOK|EFN|APB/i.test(cleaned)) {
      return cleaned;
    }
  }

  return "";
}

function extractSeatingCapacity(text, context = {}) {
  const tableValue = extractSeatingFromVehicleBlock(extractMotorVehicleBlock(text), context);
  if (tableValue) return tableValue;

  const index = text.search(/Seating\s*Capacity/i);
  if (index !== -1) {
    const sub = text.substring(index, index + 300);
    const lines = sub.split("\n").map(l => l.trim()).filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^(\d{1,2})/);
      if (m) {
        const normalized = normalizeSeatingCapacity(m[1], { ...context, text });
        if (normalized) return normalized;
      }
    }
  }

  const patterns = [
    /\bSeating Capacity(?:\.|:)?[ \t]*([0-9]{1,3})(?!\d)/i,
    /Seating\s*Capacity[^\d\n]*?(\d{1,3})(?!\d)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const normalized = normalizeSeatingCapacity(match[1], { ...context, text });
      if (normalized) return normalized;
    }
  }
  return "";
}

function normalizeSeatingCapacity(value, context = {}) {
  const number = parseInt(String(value || "").trim(), 10);
  if (!Number.isFinite(number) || number < 1 || number > 80) return "";

  const vehicleType = inferMotorVehicleType(context);
  if (vehicleType === "two_wheeler" && number > 3) return "";
  if (vehicleType === "private_car" && number > 10) return "";
  if ((vehicleType === "goods" || vehicleType === "tractor") && number > 6) return "";
  return String(number);
}

function inferMotorVehicleType(context = {}) {
  const haystack = [
    context.policyType,
    context.policyCoverType,
    context.makeModel,
    context.text
  ].filter(Boolean).join(" ").toLowerCase();

  if (/\b(two\s*wheeler|bike|motor\s*cycle|motorcycle|scooter|moped|activa|pulsar|splendor|apache|jupiter|shine|discover|access)\b/.test(haystack)) {
    return "two_wheeler";
  }
  if (/\b(bus|passenger\s+carrying|school\s+bus)\b/.test(haystack)) return "passenger";
  if (/\b(goods\s+carrying|gcv|truck|lorry|pickup|dumper)\b/.test(haystack)) return "goods";
  if (/\b(tractor)\b/.test(haystack)) return "tractor";
  if (/\b(private\s+car|motor\s+car|taxi|cab|sedan|hatchback|suv)\b/.test(haystack)) return "private_car";
  return "unknown";
}

function isMotorCoverTypeContext(context = {}) {
  if (context.hdfcErgoMotor?.documentDetected || context.generaliMotor?.documentDetected) return true;
  if (/\bMOTOR\b/i.test(context.policyUnderstanding?.documentCategory || "")) return true;
  if (/\bMOTOR\b/i.test(context.policyUnderstanding?.documentFormat || "")) return true;
  if (/\b(private\s+car|two\s*wheeler|commercial\s+vehicle|motor\s+(?:protect|policy|insurance)|vehicle\s+package|vehicle\s+liability)\b/i.test(context.policyType || "")) return true;

  const table = context.motorVehicleTable || {};
  return Boolean(table.registrationNumber || table.engineNumber || table.chassisNumber || table.seatingCapacity);
}

function schemaSupportsCoverType(schema = {}) {
  return (schema.fields || []).some((field) => {
    const name = String(field.field || "").toLowerCase();
    if (name === "policycovertype" || name === "covertype") return true;
    return (field.aliases || []).some((alias) => /\bcover\s+type\b/i.test(String(alias || "")));
  });
}

function extractPolicyCoverType(text, policyType = "") {
  const haystack = `${policyType || ""} ${text || ""}`;
  const exact =
    matchGroup(haystack, /\b(Package Policy|Liability Only Policy|Comprehensive Policy|Third Party Policy|Own Damage Policy)\b/i) ||
    matchGroup(haystack, /\b(Private Car Package|Two Wheeler Package|Commercial Vehicle Package)\b/i);
  if (exact) return normalizeCoverType(exact);

  const vehicleBlock = extractMotorVehicleBlock(text) || text;
  const compact = vehicleBlock.replace(/\s+/g, "");
  const denseCover = matchGroup(compact, /\d{2,4}(Package|Comprehensive|LiabilityOnly|Liability|ThirdParty|TP|OwnDamage)\d/i);
  if (denseCover) return normalizeCoverType(denseCover);

  if (/\bpackage\b/i.test(haystack)) return "Package";
  if (/\bcomprehensive\b/i.test(haystack)) return "Comprehensive";
  if (/\b(liability\s*only|third\s*party|tp)\b/i.test(haystack)) return "Third Party";
  if (/\bown\s*damage\b/i.test(haystack)) return "Own Damage";
  return "";
}

function normalizeCoverType(value) {
  const text = String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim().toLowerCase();
  if (!text) return "";
  if (/package/.test(text)) return "Package";
  if (/comprehensive/.test(text)) return "Comprehensive";
  if (/liability|third party|\btp\b/.test(text)) return "Third Party";
  if (/own damage/.test(text)) return "Own Damage";
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeManufacturingYear(value) {
  const year = parseInt(String(value || "").trim(), 10);
  if (year >= 1980 && year <= 2035) return String(year);
  return "";
}

function extractNominee(text) {
  const nomineePattern = /\bNominees?\b(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,60})/i;
  const match = text.match(nomineePattern);
  if (match?.[1]) {
    const val = match[1].replace(/,\s*$/, "").trim();
    if (!/is a minor|relationship/i.test(val)) return val;
  }

  const fallbackPatterns = [
    /\bNominee Name(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,120})/i,
    /\bNominee(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,120})/i
  ];
  for (const pattern of fallbackPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const val = match[1].trim();
      if (!/is a minor|relationship/i.test(val)) return val;
    }
  }
  return "";
}

function extractFinancer(text) {
  const patterns = [
    /\bHypothecated\/Lease Agreement with[ \t]*([A-Z0-9/&()., -]{2,80})/i,
    /\bHypothecated with[ \t]*([A-Z0-9/&()., -]{2,80})/i,
    /\bFinancier(?: Name)?(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,160})/i,
    /\bHypothecation(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,160})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

module.exports = {
  extractPolicyFromPdf,
  extractPolicyFromText
};
