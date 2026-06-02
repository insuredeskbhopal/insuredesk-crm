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
  const paymentCollection = extractPaymentCollection(sourceText);

  const iciciMotor = extractIciciMotor(sourceText, sourceFile);
  if (iciciMotor.documentDetected) {
    const legacyData = {
      sourceFile: sourceFile || "Untitled.pdf",
      sourceText,
      status: "saved",
      documentFormat: "ICICI_LOMBARD_MOTOR_V1",
      documentCategory: "Motor Insurance",
      insuredName: iciciMotor.insuredName,
      contactNumber: iciciMotor.customerMobile,
      contactPerson: iciciMotor.insuredName,
      groupName: deriveGroupName(sourceText, sourceFile, iciciMotor.insuredName),
      policyNumber: iciciMotor.policyNumber,
      policyType: iciciMotor.policyType,
      sumInsured: iciciMotor.totalIdv,
      premium: iciciMotor.totalPremium,
      totalPremium: iciciMotor.totalPremium,
      netPremium: iciciMotor.totalPackagePremium,
      odPremium: iciciMotor.netOwnDamagePremium,
      tpDriverOwner: iciciMotor.netLiabilityPremium,
      startDate: iciciMotor.policyStartDate,
      expiryDate: iciciMotor.policyEndDate,
      duration: buildDuration(iciciMotor.policyStartDate, iciciMotor.policyEndDate) || "",
      riskLocation: "",
      district: "",
      tehsil: "",
      insuranceCompany: iciciMotor.companyName,
      description: "",
      pptMpwlc: "",
      occupancy: "",
      validIn: "",
      vehicleNumber: iciciMotor.registrationNumber,
      registrationNumber: iciciMotor.registrationNumber,
      makeModel: iciciMotor.makeModel,
      variant: iciciMotor.variant,
      manufacturingYear: iciciMotor.manufacturingYear,
      registrationDate: iciciMotor.registrationDate,
      engineNumber: iciciMotor.engineNumber,
      chassisNumber: iciciMotor.chassisNumber,
      fuelType: iciciMotor.fuelType,
      cubicCapacity: iciciMotor.cubicCapacity,
      seatingCapacity: iciciMotor.seatingCapacity,
      idv: iciciMotor.vehicleIdv,
      totalIdv: iciciMotor.totalIdv,
      ncb: iciciMotor.ncbPercentage,
      policyCoverType: iciciMotor.policyCoverType,
      rtoLocation: iciciMotor.rto,
      nomineeName: iciciMotor.nomineeName,
      financerName: iciciMotor.financerName,
      companyName: iciciMotor.companyName,
      invoiceNumber: iciciMotor.invoiceNumber,
      issuanceDate: iciciMotor.issuanceDate,
      communicationAddress: iciciMotor.communicationAddress,
      customerMobile: iciciMotor.customerMobile,
      customerEmail: iciciMotor.customerEmail,
      vehicleMake: iciciMotor.vehicleMake,
      vehicleModel: iciciMotor.vehicleModel,
      rto: iciciMotor.rto,
      bodyType: iciciMotor.bodyType,
      geographicalArea: iciciMotor.geographicalArea,
      compulsoryDeductible: iciciMotor.compulsoryDeductible,
      voluntaryDeductible: iciciMotor.voluntaryDeductible,
      basicOwnDamage: iciciMotor.basicOwnDamage,
      basicThirdPartyLiability: iciciMotor.basicThirdPartyLiability,
      netOwnDamagePremium: iciciMotor.netOwnDamagePremium,
      netLiabilityPremium: iciciMotor.netLiabilityPremium,
      totalPackagePremium: iciciMotor.totalPackagePremium,
      cgst: iciciMotor.cgst,
      sgst: iciciMotor.sgst,
      gstAmount: iciciMotor.gstAmount,
      previousPolicyNumber: iciciMotor.previousPolicyNumber,
      previousPolicyValidity: iciciMotor.previousPolicyValidity,
      previousInsurer: iciciMotor.previousInsurer,
      previousYearNcb: iciciMotor.previousYearNcb,
      ncbPercentage: iciciMotor.ncbPercentage,
      receiptNumber: iciciMotor.receiptNumber,
      receiptDate: iciciMotor.receiptDate,
      cscName: iciciMotor.agencyName,
      cscCode: iciciMotor.agencyCode,
      cscContactNumber: iciciMotor.agencyContactNumber,
      servicingBranchName: iciciMotor.servicingBranchName,
      servicingBranchAddress: iciciMotor.servicingBranchAddress,
      covernoteNumber: iciciMotor.covernoteNumber,
      premiumCollectionNumber: iciciMotor.premiumCollectionNumber,
      gstin: iciciMotor.insurerGstin,
      hsnSacCode: iciciMotor.hsnSacCode,
      applicableImtClauses: iciciMotor.applicableImtClauses,
      roadSideAssistance: iciciMotor.roadSideAssistance,
      legalLiabilityToPaidDriver: iciciMotor.legalLiabilityToPaidDriver,
      paCoverForOwnerDriver: iciciMotor.paCoverForOwnerDriver,
      unnamedPaCover: iciciMotor.unnamedPaCover
    };
    return buildIntelligentResult(legacyData, policyUnderstanding, policySchema, schemaExtraction);
  }

  const tataAigMotor = extractTataAigMotor(sourceText, sourceFile);
  if (tataAigMotor.documentDetected) {
    const legacyData = {
      sourceFile: sourceFile || "Untitled.pdf",
      sourceText,
      status: "saved",
      documentFormat: "TATA_AIG_MOTOR_V1",
      documentCategory: "Motor Insurance",
      insuredName: tataAigMotor.insuredName,
      contactNumber: tataAigMotor.mobile || tataAigMotor.customerMobile || "",
      contactPerson: "",
      groupName: deriveGroupName(sourceText, sourceFile, tataAigMotor.insuredName),
      policyNumber: tataAigMotor.policyNumber,
      rawPolicyNumber: tataAigMotor.rawPolicyNumber,
      policyType: tataAigMotor.policyType,
      sumInsured: tataAigMotor.totalIdv,
      premium: tataAigMotor.totalPremium,
      totalPremium: tataAigMotor.totalPremium,
      netPremium: tataAigMotor.netPremium || "",
      odPremium: tataAigMotor.netOwnDamagePremium || "",
      tpDriverOwner: tataAigMotor.netLiabilityPremium || "",
      dueCollection: paymentCollection.dueCollection,
      collectedAmount: paymentCollection.collectedAmount,
      startDate: tataAigMotor.policyStartDate,
      expiryDate: tataAigMotor.policyEndDate,
      duration: buildDuration(tataAigMotor.policyStartDate, tataAigMotor.policyEndDate) || "",
      riskLocation: tataAigMotor.communicationAddress,
      district: extractLocationPart(sourceText, tataAigMotor.communicationAddress, "district"),
      tehsil: extractLocationPart(sourceText, tataAigMotor.communicationAddress, "tehsil"),
      insuranceCompany: "TATA AIG",
      description: "",
      pptMpwlc: "",
      occupancy: "",
      validIn: "",
      vehicleNumber: tataAigMotor.registrationNumber,
      registrationNumber: tataAigMotor.registrationNumber,
      makeModel: tataAigMotor.makeModel,
      variant: tataAigMotor.variant,
      manufacturingYear: tataAigMotor.manufacturingYear,
      registrationDate: tataAigMotor.registrationDate,
      engineNumber: tataAigMotor.engineNumber,
      chassisNumber: tataAigMotor.chassisNumber,
      fuelType: tataAigMotor.fuelType,
      cubicCapacity: tataAigMotor.cubicCapacity,
      seatingCapacity: tataAigMotor.seatingCapacity,
      idv: tataAigMotor.totalIdv || tataAigMotor.idv,
      totalIdv: tataAigMotor.totalIdv,
      ncb: tataAigMotor.ncbPercentage,
      policyCoverType: tataAigMotor.policyCoverType,
      rtoLocation: tataAigMotor.rtoLocation,
      nomineeName: tataAigMotor.nominee,
      financerName: tataAigMotor.financer,
      companyName: "TATA AIG",
      proposalNumber: "",
      invoiceNumber: "",
      issuanceDate: "",
      customerId: tataAigMotor.clientId || "",
      communicationAddress: tataAigMotor.communicationAddress,
      insuredAddress: tataAigMotor.insuredAddress,
      customerMobile: tataAigMotor.mobile,
      customerEmail: tataAigMotor.email,
      gstin: tataAigMotor.gstin,
      panNumber: "",
      vehicleMake: tataAigMotor.make,
      vehicleModel: tataAigMotor.model,
      rto: tataAigMotor.rtoLocation,
      bodyType: tataAigMotor.bodyType || "",
      geographicalArea: tataAigMotor.geographicalArea || "India",
      compulsoryDeductible: tataAigMotor.compulsoryDeductible || "1,000.00",
      voluntaryDeductible: tataAigMotor.voluntaryDeductible || "0.00",
      contractLoanReference: tataAigMotor.contractLoanReference || "",
      zone: tataAigMotor.zone || "",
      addonPremium: tataAigMotor.addonPremium || "",
      tpPremium: tataAigMotor.tpPremium || "",
      sgst: tataAigMotor.sgst || "",
      cgst: tataAigMotor.cgst || "",
      nomineeAge: tataAigMotor.nomineeAge || "",
      nomineeRelationship: tataAigMotor.nomineeRelationship || "",
      claimsCovered: tataAigMotor.claimsCovered || "",
      receiptNumber: tataAigMotor.receiptNumber || "",
      receiptDate: tataAigMotor.receiptDate || "",
      modeOfPayment: tataAigMotor.modeOfPayment || "",
      payerName: tataAigMotor.payerName || "",
      basicOwnDamage: tataAigMotor.basicOwnDamage || "",
      basicThirdPartyLiability: tataAigMotor.basicThirdPartyLiability || "",
      netOwnDamagePremium: tataAigMotor.netOwnDamagePremium || "",
      netLiabilityPremium: tataAigMotor.netLiabilityPremium || "",
      totalPackagePremium: tataAigMotor.totalPackagePremium || "",
      gstAmount: tataAigMotor.gstAmount || "",
      zeroDepreciationCover: tataAigMotor.zeroDepreciationCover || "",
      engineGearboxProtection: tataAigMotor.engineGearboxProtection || "",
      costOfConsumables: tataAigMotor.costOfConsumables || "",
      previousPolicyNumber: tataAigMotor.previousPolicyNumber || "",
      previousPolicyValidity: tataAigMotor.previousPolicyValidity || "",
      previousInsurer: tataAigMotor.previousInsurer || "",
      ncbPercentage: tataAigMotor.ncbPercentage,
      paymentReference: "",
      bankName: "",
      cscName: "",
      cscCode: "",
      cscContactNumber: "",
      extractionDebug: tataAigMotor.extractionDebug
    };
    return buildIntelligentResult(legacyData, policyUnderstanding, policySchema, schemaExtraction);
  }

  const royalSundaramMotor = extractRoyalSundaramMotor(sourceText, sourceFile);
  if (royalSundaramMotor.documentDetected) {
    const legacyData = {
      sourceFile: sourceFile || "Untitled.pdf",
      sourceText,
      status: "saved",
      documentFormat: "ROYAL_SUNDARAM_MOTOR_V1",
      documentCategory: "Motor Insurance",
      insuredName: royalSundaramMotor.insuredName,
      contactNumber: royalSundaramMotor.contactNumber,
      contactPerson: royalSundaramMotor.insuredName,
      groupName: deriveGroupName(sourceText, sourceFile, royalSundaramMotor.insuredName),
      policyNumber: royalSundaramMotor.policyNumber,
      policyType: royalSundaramMotor.policyType,
      sumInsured: royalSundaramMotor.totalIdv,
      premium: royalSundaramMotor.totalPremium,
      totalPremium: royalSundaramMotor.totalPremium,
      netPremium: royalSundaramMotor.netLiabilityPremium || "",
      tpDriverOwner: royalSundaramMotor.netLiabilityPremium || "",
      odPremium: royalSundaramMotor.netOwnDamagePremium || "",
      startDate: royalSundaramMotor.policyStartDate,
      expiryDate: royalSundaramMotor.policyEndDate,
      duration: buildDuration(royalSundaramMotor.policyStartDate, royalSundaramMotor.policyEndDate) || "",
      riskLocation: "",
      district: "",
      tehsil: "",
      insuranceCompany: royalSundaramMotor.companyName,
      description: "",
      pptMpwlc: "",
      occupancy: "",
      validIn: "",
      vehicleNumber: royalSundaramMotor.registrationNumber,
      registrationNumber: royalSundaramMotor.registrationNumber,
      makeModel: royalSundaramMotor.makeModel,
      variant: "",
      manufacturingYear: royalSundaramMotor.manufacturingYear,
      registrationDate: royalSundaramMotor.registrationDate,
      engineNumber: royalSundaramMotor.engineNumber,
      chassisNumber: royalSundaramMotor.chassisNumber,
      fuelType: royalSundaramMotor.fuelType,
      cubicCapacity: royalSundaramMotor.cubicCapacity,
      seatingCapacity: royalSundaramMotor.seatingCapacity,
      grossVehicleWeight: royalSundaramMotor.grossVehicleWeight,
      idv: royalSundaramMotor.totalIdv,
      totalIdv: royalSundaramMotor.totalIdv,
      ncb: "",
      policyCoverType: royalSundaramMotor.policyCoverType,
      rtoLocation: royalSundaramMotor.rtoLocation,
      nomineeName: "",
      financerName: "",
      companyName: royalSundaramMotor.companyName,
      customerMobile: royalSundaramMotor.contactNumber,
      gstin: royalSundaramMotor.gstin,
      panNumber: royalSundaramMotor.panNumber,
      vehicleMake: royalSundaramMotor.vehicleMake,
      vehicleModel: royalSundaramMotor.vehicleModel,
      bodyType: royalSundaramMotor.bodyType,
      geographicalArea: royalSundaramMotor.geographicalArea,
      basicThirdPartyLiability: royalSundaramMotor.basicThirdPartyLiability,
      netLiabilityPremium: royalSundaramMotor.netLiabilityPremium,
      sgst: royalSundaramMotor.sgst,
      cgst: royalSundaramMotor.cgst,
      gstAmount: royalSundaramMotor.gstAmount || "",
      dueCollection: paymentCollection.dueCollection,
      collectedAmount: paymentCollection.collectedAmount,
      receiptNumber: royalSundaramMotor.receiptNumber,
      receiptDate: royalSundaramMotor.receiptDate
    };
    return buildIntelligentResult(legacyData, policyUnderstanding, policySchema, schemaExtraction);
  }

  const bajajAllianzMotor = extractBajajAllianzMotor(sourceText, sourceFile);
  if (bajajAllianzMotor.documentDetected) {
    const legacyData = {
      sourceFile: sourceFile || "Untitled.pdf",
      sourceText,
      status: "saved",
      documentFormat: "BAJAJ_ALLIANZ_MOTOR_V1",
      documentCategory: "Motor Insurance",
      insuredName: bajajAllianzMotor.insuredName,
      contactNumber: bajajAllianzMotor.customerMobile || "",
      contactPerson: bajajAllianzMotor.insuredName,
      groupName: deriveGroupName(sourceText, sourceFile, bajajAllianzMotor.insuredName),
      policyNumber: bajajAllianzMotor.policyNumber,
      policyType: bajajAllianzMotor.policyType,
      sumInsured: bajajAllianzMotor.idv,
      premium: bajajAllianzMotor.totalPremium,
      totalPremium: bajajAllianzMotor.totalPremium,
      netPremium: bajajAllianzMotor.netPremium || "",
      odPremium: bajajAllianzMotor.odPremium || "",
      tpDriverOwner: bajajAllianzMotor.tpDriverOwner || "",
      dueCollection: paymentCollection.dueCollection,
      collectedAmount: paymentCollection.collectedAmount,
      startDate: bajajAllianzMotor.policyStartDate,
      expiryDate: bajajAllianzMotor.policyEndDate,
      duration: buildDuration(bajajAllianzMotor.policyStartDate, bajajAllianzMotor.policyEndDate) || "",
      riskLocation: "",
      district: "",
      tehsil: "",
      insuranceCompany: bajajAllianzMotor.companyName,
      description: "",
      pptMpwlc: "",
      occupancy: "",
      validIn: "",
      vehicleNumber: bajajAllianzMotor.registrationNumber,
      registrationNumber: bajajAllianzMotor.registrationNumber,
      makeModel: bajajAllianzMotor.makeModel,
      variant: bajajAllianzMotor.variant,
      manufacturingYear: bajajAllianzMotor.manufacturingYear,
      registrationDate: bajajAllianzMotor.registrationDate,
      engineNumber: bajajAllianzMotor.engineNumber,
      chassisNumber: bajajAllianzMotor.chassisNumber,
      fuelType: bajajAllianzMotor.fuelType,
      cubicCapacity: bajajAllianzMotor.cubicCapacity,
      seatingCapacity: bajajAllianzMotor.seatingCapacity,
      idv: bajajAllianzMotor.idv,
      totalIdv: bajajAllianzMotor.idv,
      ncb: bajajAllianzMotor.ncbPercentage || "",
      policyCoverType: bajajAllianzMotor.policyCoverType,
      rtoLocation: bajajAllianzMotor.rtoLocation || "",
      nomineeName: bajajAllianzMotor.nomineeName || "",
      financerName: "",
      companyName: bajajAllianzMotor.companyName,
      proposalNumber: "",
      invoiceNumber: "",
      issuanceDate: "",
      customerId: bajajAllianzMotor.customerId || "",
      communicationAddress: bajajAllianzMotor.communicationAddress || "",
      customerMobile: bajajAllianzMotor.customerMobile || "",
      customerEmail: bajajAllianzMotor.customerEmail || "",
      gstin: bajajAllianzMotor.gstin || "",
      panNumber: "",
      vehicleMake: bajajAllianzMotor.vehicleMake,
      vehicleModel: bajajAllianzMotor.vehicleModel,
      rto: bajajAllianzMotor.rtoLocation || "",
      bodyType: bajajAllianzMotor.bodyType || "",
      geographicalArea: bajajAllianzMotor.geographicalArea || "India",
      compulsoryDeductible: bajajAllianzMotor.compulsoryDeductible || "1,000.00",
      voluntaryDeductible: bajajAllianzMotor.voluntaryDeductible || "0.00",
      basicOwnDamage: bajajAllianzMotor.basicOwnDamage || "",
      basicThirdPartyLiability: bajajAllianzMotor.basicThirdPartyLiability || "",
      netOwnDamagePremium: bajajAllianzMotor.odPremium || "",
      netLiabilityPremium: bajajAllianzMotor.tpDriverOwner || "",
      totalPackagePremium: bajajAllianzMotor.netPremium || "",
      gstAmount: bajajAllianzMotor.gstAmount || "",
      zeroDepreciationCover: bajajAllianzMotor.zeroDepreciationCover || "",
      previousPolicyNumber: bajajAllianzMotor.previousPolicyNumber || "",
      previousInsurer: bajajAllianzMotor.previousInsurer || "",
      ncbPercentage: bajajAllianzMotor.ncbPercentage || "",
      receiptNumber: bajajAllianzMotor.receiptNumber || "",
      receiptDate: bajajAllianzMotor.receiptDate || ""
    };
    return buildIntelligentResult(legacyData, policyUnderstanding, policySchema, schemaExtraction);
  }

  const goDigitMotor = extractGoDigitMotor(sourceText, sourceFile);
  if (goDigitMotor.documentDetected) {
    const legacyData = {
      sourceFile: sourceFile || "Untitled.pdf",
      sourceText,
      status: "saved",
      documentFormat: "GO_DIGIT_MOTOR_V1",
      documentCategory: "Motor Insurance",
      insuredName: goDigitMotor.insuredName,
      contactNumber: goDigitMotor.customerMobile || "",
      contactPerson: goDigitMotor.insuredName,
      groupName: deriveGroupName(sourceText, sourceFile, goDigitMotor.insuredName),
      policyNumber: goDigitMotor.policyNumber,
      policyType: goDigitMotor.policyType,
      sumInsured: goDigitMotor.totalIdv,
      premium: goDigitMotor.totalPremium,
      totalPremium: goDigitMotor.totalPremium,
      netPremium: goDigitMotor.netPremium || "",
      odPremium: goDigitMotor.odPremium || "",
      tpDriverOwner: goDigitMotor.tpDriverOwner || "",
      startDate: goDigitMotor.policyStartDate,
      expiryDate: goDigitMotor.policyEndDate,
      duration: buildDuration(goDigitMotor.policyStartDate, goDigitMotor.policyEndDate) || "",
      riskLocation: "",
      district: "",
      tehsil: "",
      insuranceCompany: goDigitMotor.companyName,
      description: "",
      pptMpwlc: "",
      occupancy: "",
      validIn: "",
      vehicleNumber: goDigitMotor.registrationNumber,
      registrationNumber: goDigitMotor.registrationNumber,
      makeModel: goDigitMotor.makeModel,
      variant: goDigitMotor.variant,
      manufacturingYear: goDigitMotor.manufacturingYear,
      registrationDate: goDigitMotor.registrationDate,
      engineNumber: goDigitMotor.engineNumber,
      chassisNumber: goDigitMotor.chassisNumber,
      fuelType: goDigitMotor.fuelType,
      cubicCapacity: goDigitMotor.cubicCapacity,
      seatingCapacity: goDigitMotor.seatingCapacity,
      idv: goDigitMotor.idv,
      totalIdv: goDigitMotor.totalIdv,
      ncb: goDigitMotor.ncbPercentage,
      policyCoverType: goDigitMotor.policyCoverType,
      rtoLocation: goDigitMotor.rtoLocation,
      nomineeName: goDigitMotor.nomineeName || "",
      financerName: goDigitMotor.financerName || "",
      companyName: goDigitMotor.companyName,
      customerMobile: goDigitMotor.customerMobile || "",
      customerEmail: goDigitMotor.customerEmail || "",
      gstin: goDigitMotor.gstin || "",
      vehicleMake: goDigitMotor.vehicleMake || "",
      vehicleModel: goDigitMotor.vehicleModel || "",
      gstAmount: goDigitMotor.gstAmount || "",
      cgst: goDigitMotor.cgst || "",
      sgst: goDigitMotor.sgst || ""
    };
    return buildIntelligentResult(legacyData, policyUnderstanding, policySchema, schemaExtraction);
  }

  const hdfcErgoMotor = extractHdfcErgoMotor(sourceText);
  const generaliMotor = extractGeneraliMotor(sourceText);
  const insuredName = cleanInsuredName(extractInsuredName(sourceText));
  const policyNumber = extractPolicyNumber(sourceText);
  const policyType =
    hdfcErgoMotor.policyType ||
    extractIffcoPolicyType(sourceText) ||
    matchGroup(sourceText, /(Auto Secure\s*[-–:]\s*Private Car Package Policy)/i) ||
    matchGroup(sourceText, /(MSME Suraksha Kavach Package Policy\s*-\s*Advance)/i) ||
    matchGroup(sourceText, /(PRIVATE CAR COMPREHENSIVE POLICY)/i) ||
    matchGroup(sourceText, /(Private Car Package Policy)/i) ||
    matchGroup(sourceText, /(Private Car Policy)/i) ||
    matchGroup(sourceText, /(Private Car Liability Only Policy)/i) ||
    matchGroup(sourceText, /(Two Wheeler Package Policy)/i) ||
    matchGroup(sourceText, /(Two Wheeler Liability Only Policy)/i) ||
    matchGroup(sourceText, /(Commercial Vehicle Package Policy)/i) ||
    matchGroup(sourceText, /(Commercial Vehicle Liability Only Policy)/i) ||
    matchGroup(sourceText, /(Two Wheeler Policy)/i) ||
    matchGroup(sourceText, /(Policy Schedule.*?)(?:Name of the Insured|Mailing Address)/i);
  const issuedAt = matchGroup(sourceText, /Issued at\s*([A-Z][A-Z\s]+?)(?:Premises to be Insured|Premium|Hypothecation|Intermediary Details|$)/i);
  const policyPeriod = extractGenericPolicyPeriod(sourceText);
  const startDate = policyPeriod.startDate;
  const expiryDate = policyPeriod.expiryDate;
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
    matchGroup(sourceText, /(IFFCO[- ]?TOKIO\s+GEN\s+INSU\.?\s*CO\.?\s*LTD\.?)/i) ||
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
  const newIndiaMotor = extractNewIndiaMotorDetails(sourceText);
  const motorVehicleTable = extractMotorVehicleTable(sourceText, { policyType });
  const vehicleNumber =
    newIndiaMotor.registrationNumber ||
    motorVehicleTable.registrationNumber ||
    extractMotorRegistrationNumber(sourceText) ||
    matchGroup(sourceText, /\bVehicle (?:Registration )?No(?:\.|:)?\s*((?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}))/i) ||
    matchGroup(sourceText, /\bRegistration No(?:\.|:)?\s*((?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}))/i) ||
    matchGroup(sourceText, /\bRegistration Mark[^\n]*\n[^A-Z]*([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})/i) ||
    matchGroup(sourceText, /\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(?=\d{4}\b)/i) ||
    matchGroup(sourceText, /\b((?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}))\b/i);
  const registrationNumber =
    vehicleNumber ||
    extractMotorRegistrationNumber(sourceText);

  const makeModel = newIndiaMotor.makeModel || motorVehicleTable.makeModel || extractMakeModel(sourceText);
  const genericVehicleParts = splitGenericMakeModel(makeModel);
  const variant =
    matchGroup(sourceText, /\bVariant(?:\.|:)?\s*([A-Z0-9 /&().,-]{1,60})/i);
  const manufacturingYear = motorVehicleTable.manufacturingYear || extractMfgYear(sourceText);
  const registrationDate =
    motorVehicleTable.registrationDate ||
    matchGroup(sourceText, /\bRegistration Date(?:\.|:)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ||
    matchGroup(sourceText, /\bDate of Registration(?:\.|:)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ||
    matchGroup(sourceText, /\bVehicle Registration Date(?:\.|:)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);

  const engineNumber = newIndiaMotor.engineNumber || motorVehicleTable.engineNumber || extractEngineNumber(sourceText);
  const chassisNumber = newIndiaMotor.chassisNumber || motorVehicleTable.chassisNumber || extractChassisNumber(sourceText);
  const fuelType =
    motorVehicleTable.fuelType ||
    matchGroup(sourceText, /\bType of fuel(?:\.|:)?\s*([A-Za-z]+?)(?=Cubic|\s|$)/i) ||
    matchGroup(sourceText, /\bFuel Type(?:\.|:)?\s*([A-Z ]{3,40})/i) ||
    inferFuelType(sourceText, makeModel);
  const cubicCapacity =
    motorVehicleTable.cubicCapacity ||
    matchGroup(sourceText, /Cubic\s*capacity\s*\(cc\)\/Wattage\s*\(kW\)(?:\.|:)?\s*([0-9]{1,4})\s*cc/i) ||
    matchGroup(sourceText, /Cubic capacity[\s\S]{0,100}?\b(\d{3,4})\s*cc/i) ||
    matchGroup(sourceText, /\b(?:CC|Cubic Capacity)(?:\.|:)?\s*([0-9. ]{2,20})/i) ||
    matchGroup(sourceText, /\bCC\s*\n?\s*(\d{2,4})/i) ||
    matchGroup(sourceText, /\b(\d{2,4})(?:Package|Liability|Comprehensive|Third\s*Party)/i);
  const seatingCapacity = motorVehicleTable.seatingCapacity || extractSeatingCapacity(sourceText, { policyType, makeModel, cubicCapacity });
  const grossVehicleWeight =
    matchGroup(sourceText, /Gross\s+Vehicle\s+Weight[\s\S]{0,30}?\b([0-9]{2,8})\b/i) ||
    matchGroup(sourceText, /\bGross\s+Vehicle\s+Weight\s*\(GVW\)(?:\.|:)?\s*([0-9., ]{2,20})/i) ||
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
  const understoodDocumentFormat = isVerifiedCompanyDocumentFormat(policyUnderstanding.documentFormat, sourceText)
    ? policyUnderstanding.documentFormat
    : "";

  const nomineeName = extractNominee(sourceText);
  const financerName = extractFinancer(sourceText);
  const newIndiaPremiumSchedule = extractNewIndiaPremiumSchedule(sourceText);
  const genericPremiumSchedule = extractGenericPremiumSchedule(sourceText, premium);
  const netPremium =
    hdfcErgoMotor.totalPackagePremium ||
    generaliMotor.totalPackagePremium ||
    newIndiaPremiumSchedule.netPremium ||
    genericPremiumSchedule.netPremium;
  const tpDriverOwner =
    hdfcErgoMotor.netLiabilityPremium ||
    generaliMotor.netLiabilityPremium ||
    newIndiaPremiumSchedule.tpDriverOwner ||
    genericPremiumSchedule.tpDriverOwner;
  const odPremium =
    hdfcErgoMotor.netOwnDamagePremium ||
    generaliMotor.netOwnDamagePremium ||
    newIndiaPremiumSchedule.odPremium ||
    genericPremiumSchedule.odPremium;

  const legacyData = {
    sourceFile: sourceFile || "Untitled.pdf",
    sourceText,
    status: "saved",
    documentFormat: hdfcErgoMotor.documentDetected ? "HDFC_ERGO_MOTOR_V1" : generaliMotor.documentDetected ? "GENERALI_MOTOR_V1" : understoodDocumentFormat !== "GENERIC_POLICY_V1" ? understoodDocumentFormat : "",
    documentCategory: hdfcErgoMotor.documentDetected || generaliMotor.documentDetected ? "Motor Insurance" : policyUnderstanding.documentCategory || "",
    insuredName: hdfcErgoMotor.insuredName || generaliMotor.insuredName || insuredName,
    contactNumber: hdfcErgoMotor.customerMobile || generaliMotor.customerMobile || contactNumber,
    contactPerson: cleanInsuredName(contactPerson),
    groupName,
    policyNumber: hdfcErgoMotor.policyNumber || generaliMotor.policyNumber || policyNumber,
    policyType: generaliMotor.policyType || policyType,
    sumInsured: hdfcErgoMotor.totalIdv || generaliMotor.totalIdv || newIndiaMotor.idv || motorVehicleTable.idv || sumInsured,
    premium: hdfcErgoMotor.totalPremium || generaliMotor.totalPremium || newIndiaPremiumSchedule.totalPremium || genericPremiumSchedule.totalPremium || premium,
    totalPremium: hdfcErgoMotor.totalPremium || generaliMotor.totalPremium || newIndiaPremiumSchedule.totalPremium || genericPremiumSchedule.totalPremium,
    netPremium,
    tpDriverOwner,
    odPremium,
    startDate: hdfcErgoMotor.policyStartDate || generaliMotor.policyStartDate || startDate,
    expiryDate: hdfcErgoMotor.policyEndDate || generaliMotor.policyEndDate || expiryDate,
    duration: buildDuration(hdfcErgoMotor.policyStartDate || generaliMotor.policyStartDate || startDate, hdfcErgoMotor.policyEndDate || generaliMotor.policyEndDate || expiryDate) || duration,
    riskLocation: hdfcErgoMotor.communicationAddress || generaliMotor.communicationAddress || riskLocation,
    district,
    tehsil,
    insuranceCompany: hdfcErgoMotor.companyName || generaliMotor.companyName || normalizeInsuranceCompanyName(insuranceCompany, sourceText),
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
    idv: hdfcErgoMotor.totalIdv || generaliMotor.totalIdv || newIndiaMotor.idv || motorVehicleTable.idv || idv,
    ncb: hdfcErgoMotor.ncbPercentage || generaliMotor.ncbPercentage || newIndiaPremiumSchedule.ncbPercentage || ncb,
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
    vehicleMake: hdfcErgoMotor.vehicleMake || generaliMotor.vehicleMake || genericVehicleParts.make,
    vehicleModel: hdfcErgoMotor.vehicleModel || generaliMotor.vehicleModel || genericVehicleParts.model,
    rto: hdfcErgoMotor.rto || generaliMotor.rto,
    bodyType: hdfcErgoMotor.bodyType || generaliMotor.bodyType,
    totalIdv: hdfcErgoMotor.totalIdv || generaliMotor.totalIdv || newIndiaMotor.idv || motorVehicleTable.idv || idv,
    geographicalArea: hdfcErgoMotor.geographicalArea || generaliMotor.geographicalArea,
    compulsoryDeductible: hdfcErgoMotor.compulsoryDeductible || generaliMotor.compulsoryDeductible,
    voluntaryDeductible: hdfcErgoMotor.voluntaryDeductible,
    basicOwnDamage: hdfcErgoMotor.basicOwnDamage || generaliMotor.basicOwnDamage || newIndiaPremiumSchedule.basicOwnDamage || genericPremiumSchedule.basicOwnDamage,
    basicThirdPartyLiability: hdfcErgoMotor.basicThirdPartyLiability || generaliMotor.basicThirdPartyLiability || newIndiaPremiumSchedule.basicThirdPartyLiability,
    netOwnDamagePremium: hdfcErgoMotor.netOwnDamagePremium || generaliMotor.netOwnDamagePremium || newIndiaPremiumSchedule.odPremium || genericPremiumSchedule.odPremium,
    netLiabilityPremium: hdfcErgoMotor.netLiabilityPremium || generaliMotor.netLiabilityPremium || newIndiaPremiumSchedule.tpDriverOwner || genericPremiumSchedule.tpDriverOwner,
    totalPackagePremium: hdfcErgoMotor.totalPackagePremium || generaliMotor.totalPackagePremium || newIndiaPremiumSchedule.netPremium || genericPremiumSchedule.netPremium,
    gstAmount: hdfcErgoMotor.gstAmount || generaliMotor.gstAmount || newIndiaPremiumSchedule.gstAmount || genericPremiumSchedule.gstAmount,
    cgst: hdfcErgoMotor.cgst || generaliMotor.cgst || genericPremiumSchedule.cgst || "",
    sgst: hdfcErgoMotor.sgst || generaliMotor.sgst || genericPremiumSchedule.sgst || "",
    dueCollection: paymentCollection.dueCollection,
    collectedAmount: paymentCollection.collectedAmount,
    zeroDepreciationCover: hdfcErgoMotor.zeroDepreciationCover || newIndiaPremiumSchedule.zeroDepreciationCover || "",
    engineGearboxProtection: hdfcErgoMotor.engineGearboxProtection,
    costOfConsumables: hdfcErgoMotor.costOfConsumables,
    previousPolicyNumber: hdfcErgoMotor.previousPolicyNumber || generaliMotor.previousPolicyNumber,
    previousPolicyValidity: hdfcErgoMotor.previousPolicyValidity,
    previousInsurer: hdfcErgoMotor.previousInsurer,
    ncbPercentage: hdfcErgoMotor.ncbPercentage || generaliMotor.ncbPercentage || newIndiaPremiumSchedule.ncbPercentage || ncb,
    paymentReference: hdfcErgoMotor.paymentReference,
    bankName: hdfcErgoMotor.bankName || generaliMotor.bankName,
    cscName: hdfcErgoMotor.cscName,
    cscCode: hdfcErgoMotor.cscCode,
    cscContactNumber: hdfcErgoMotor.cscContactNumber
  };

  return buildIntelligentResult(legacyData, policyUnderstanding, policySchema, schemaExtraction);
}

let rtoMaster = null;

function lookupRtoLocation(vehicleNumber) {
  if (!vehicleNumber) return null;
  const clean = vehicleNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const match = clean.match(/^([A-Z]{2})(\d{1,2})/);
  if (!match) return null;

  const state = match[1];
  const digits = match[2].padStart(2, "0");
  const rtoCode = state + digits;

  if (!rtoMaster) {
    try {
      rtoMaster = require("../rto-data/rto-master.json");
    } catch {
      rtoMaster = {};
    }
  }

  const info = rtoMaster[rtoCode];
  if (info) {
    return (info.rtoOffice || info.district || info.jurisdiction || "").toUpperCase().trim();
  }
  return null;
}

function buildIntelligentResult(legacyData, policyUnderstanding, policySchema, schemaExtraction) {
  const mergedData = mergeSchemaWithFallback(schemaExtraction, legacyData);
  
  // CRITICAL FIX: Ensure premium breakdown detection overrides schema-inferred cover type
  // If both Own Damage and Third Party premiums are present, force Comprehensive cover
  if (mergedData.sourceText) {
    const hasOwnDamagePremium = /\bOwn\s*Damage\s*Premium/i.test(mergedData.sourceText);
    const hasThirdPartyPremium = /\b(Third\s*Party|Liability)\s*Premium/i.test(mergedData.sourceText);
    if (hasOwnDamagePremium && hasThirdPartyPremium && mergedData.policyCoverType !== "Comprehensive") {
      mergedData.policyCoverType = "Comprehensive";
    }
  }
  
  if (isMotorExtraction(mergedData, policyUnderstanding)) {
    if (!shouldKeepExtractedMotorVariant(mergedData, policyUnderstanding, policySchema)) {
      mergedData.variant = "";
    }
    harmonizeMotorCoreFields(mergedData);
    mergedData.riskLocation = "";
    mergedData.district = "";
    mergedData.tehsil = "";
    mergedData.validIn = "";
    if (!shouldKeepExtractedMotorPartyFields(mergedData)) {
      mergedData.nomineeName = "";
    }
    if (!shouldKeepExtractedMotorFinancer(mergedData)) {
      mergedData.financerName = "";
    }
    mergedData.contactPerson = mergedData.contactPerson || mergedData.insuredName || "";

    const lookedUpLocation = lookupRtoLocation(mergedData.vehicleNumber || mergedData.registrationNumber);
    if (lookedUpLocation) {
      mergedData.rtoLocation = lookedUpLocation;
      mergedData.rto = lookedUpLocation;
    }
  }
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

function harmonizeMotorCoreFields(data = {}) {
  if (!data.vehicleNumber && data.registrationNumber) data.vehicleNumber = data.registrationNumber;
  if (!data.registrationNumber && data.vehicleNumber) data.registrationNumber = data.vehicleNumber;

  const idv = data.idv || data.totalIdv || data.sumInsured;
  if (idv) {
    if (!data.idv) data.idv = idv;
    if (!data.totalIdv) data.totalIdv = idv;
    if (!data.sumInsured) data.sumInsured = idv;
  }
}

function shouldKeepExtractedMotorVariant(data = {}, policyUnderstanding = {}, policySchema = {}) {
  const haystack = [
    data.insuranceCompany,
    data.companyName,
    data.sourceFile,
    policyUnderstanding.company,
    policyUnderstanding.insurer,
    policySchema.name
  ].filter(Boolean).join(" ");

  return /\bnew\s+india\b|\bTATA\s*AIG\b|\bICICI\s+Lombard\b|\bBajaj\s+(?:General|Allianz)\b/i.test(haystack);
}

function shouldKeepExtractedMotorPartyFields(data = {}) {
  return /\bTATA\s*AIG\b/i.test([data.insuranceCompany, data.companyName].filter(Boolean).join(" "));
}

function shouldKeepExtractedMotorFinancer(data = {}) {
  if (!data.financerName) return false;
  if (/^(?:NA|N\/A|NIL|NONE)(?:\b|Nominees?$)/i.test(data.financerName)) return false;
  if (/Nominees?$/i.test(data.financerName)) return false;
  return /\b(Hypothecat|Hire\s+Purchase|Lease\s+Agreement|Financier)\b/i.test(data.sourceText || "");
}

function normalizeInsuranceCompanyName(value = "", text = "") {
  const haystack = [value, text].filter(Boolean).join(" ");
  if (/\bIFFCO[-\s]?TOKIO\b/i.test(haystack)) return "IFFCO-TOKIO GENERAL INSURANCE CO.LTD";
  if (/\bNew\s+India\s+Assurance\b/i.test(haystack)) return "The New India Assurance Company Limited";
  return value;
}

function isVerifiedCompanyDocumentFormat(documentFormat = "", text = "") {
  if (!documentFormat || documentFormat === "GENERIC_POLICY_V1") return false;
  if (/HDFC_ERGO/i.test(documentFormat)) return /HDFC\s+ERGO/i.test(text);
  if (/TATA_AIG/i.test(documentFormat)) return /TATA\s*AIG|tataaig\.com/i.test(text);
  if (/GENERALI/i.test(documentFormat)) return /Generali\s+Central|Future\s+Generali/i.test(text);
  if (/IFFCO_TOKIO/i.test(documentFormat)) return /IFFCO[-\s]?TOKIO/i.test(text);
  if (/NEW_INDIA/i.test(documentFormat)) return /\bNew\s+India\s+Assurance\b/i.test(text);
  return true;
}

function isMotorExtraction(data, understanding) {
  const haystack = [
    data.documentCategory,
    data.policyType,
    data.vehicleNumber,
    data.registrationNumber,
    data.engineNumber,
    data.chassisNumber,
    data.makeModel,
    understanding?.documentCategory,
    understanding?.policyType
  ]
    .filter(Boolean)
    .join(" ");

  return /\b(motor|private\s+car|two\s+wheeler|commercial\s+vehicle|vehicle|chassis|engine)\b/i.test(haystack);
}

function extractIciciMotor(text, _sourceFile = "") {
  if (!isIciciMotor(text)) return { documentDetected: false };

  const riskLetterDetails = extractIciciRiskLetterVehicleDetails(text);
  const scheduleVehicle = extractIciciScheduleVehicleDetails(text);
  const premium = extractIciciPremiumDetails(text);
  const period = extractIciciPolicyPeriod(text);
  const communicationAddress = extractIciciAddress(text);
  const vehicleMake = riskLetterDetails.make || scheduleVehicle.make;
  const vehicleModel = riskLetterDetails.model || scheduleVehicle.model;
  const makeModel = [vehicleMake, vehicleModel].filter(Boolean).join(" ");

  return {
    documentDetected: true,
    companyName: "ICICI Lombard General Insurance Company Limited",
    policyType: cleanHdfcValue(matchGroup(text, /(Private Car Package Policy)/i) || "Private Car Package Policy"),
    policyNumber: matchGroup(text, /Policy No\.?\s*(?:\n\s*:)?\s*([0-9]{4}\/[0-9]+\/[0-9]{2}\/[0-9]{3})/i),
    insuredName: cleanHdfcValue(
      matchGroup(text, /Insured Name\s*:?\s*([A-Z][A-Z .]+?)(?=Policy No|\n|$)/i) ||
      riskLetterDetails.insuredName
    ),
    communicationAddress,
    customerMobile: matchGroup(text, /Mobile No\s*:?\s*([0-9*]{8,14})/i),
    customerEmail: matchGroup(text, /Email Address\s*:?\s*([A-Z0-9*._%+-]+@[A-Z0-9*.-]+\.COM)(?=E-Policy|\s|$)/i) ||
      matchGroup(text, /Email Address\s*:?\s*([A-Z0-9*._%+-]+@[A-Z0-9*.-]+\.[A-Z]{2,})/i),
    policyStartDate: period.start,
    policyEndDate: period.end,
    issuanceDate: normalizeIciciDate(matchGroup(text, /Policy Issued On\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i) || matchGroup(text, /Date:\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i)),
    covernoteNumber: matchGroup(text, /Covernote No\s*:?\s*([0-9]+)/i),
    invoiceNumber: matchGroup(text, /Invoice Number\s*:?\s*([0-9]+)/i),
    registrationNumber: scheduleVehicle.registrationNumber || riskLetterDetails.registrationNumber,
    vehicleMake,
    vehicleModel,
    makeModel,
    variant: "",
    bodyType: scheduleVehicle.bodyType,
    cubicCapacity: scheduleVehicle.cubicCapacity,
    manufacturingYear: scheduleVehicle.manufacturingYear || riskLetterDetails.manufacturingYear,
    seatingCapacity: scheduleVehicle.seatingCapacity,
    chassisNumber: scheduleVehicle.chassisNumber || riskLetterDetails.chassisNumber,
    engineNumber: scheduleVehicle.engineNumber || riskLetterDetails.engineNumber,
    registrationDate: riskLetterDetails.registrationDate,
    rto: cleanIciciRto(matchGroup(text, /RTO Location\s*:?\s*([A-Z -]+?)(?=GSTIN|Hypothecated|Servicing|\n|$)/i) || riskLetterDetails.rto),
    fuelType: inferIciciFuelType(makeModel) || inferFuelType(text, makeModel),
    vehicleIdv: premium.vehicleIdv,
    totalIdv: premium.totalIdv,
    basicOwnDamage: premium.basicOwnDamage,
    roadSideAssistance: premium.roadSideAssistance,
    basicThirdPartyLiability: premium.basicThirdPartyLiability,
    legalLiabilityToPaidDriver: premium.legalLiabilityToPaidDriver,
    paCoverForOwnerDriver: premium.paCoverForOwnerDriver,
    unnamedPaCover: premium.unnamedPaCover,
    netOwnDamagePremium: premium.netOwnDamagePremium,
    netLiabilityPremium: premium.netLiabilityPremium,
    totalPackagePremium: premium.totalPackagePremium,
    cgst: premium.cgst,
    sgst: premium.sgst,
    gstAmount: premium.gstAmount,
    totalPremium: premium.totalPremium,
    ncbPercentage: riskLetterDetails.ncbPercentage || matchGroup(text, /No Claim Bonus\s*(\d{1,2}%)/i),
    previousPolicyNumber: riskLetterDetails.previousPolicyNumber,
    previousPolicyValidity: riskLetterDetails.previousPolicyValidity,
    previousInsurer: riskLetterDetails.previousInsurer,
    previousYearNcb: riskLetterDetails.previousYearNcb,
    policyCoverType: "Package",
    nomineeName: "",
    financerName: "",
    geographicalArea: matchGroup(text, /Geographical Area:\s*([A-Za-z]+?)(?=Applicable|\s|$)/i),
    compulsoryDeductible: normalizeAmount(matchGroup(text, /Compulsory Deductible:\s*`\s*([0-9,]+)/i)),
    voluntaryDeductible: normalizeAmount(matchGroup(text, /Voluntary Deductible:\s*`\s*([0-9,]+)/i)),
    receiptNumber: matchGroup(text, /Receipt Date[0-9-]+\s*GSTIN/i) ? "" : "",
    receiptDate: normalizeIciciDate(matchGroup(text, /Receipt Date\s*([0-9-]{8,10})/i)),
    premiumCollectionNumber: matchGroup(text, /Premium Collection No\.?\s*([0-9]+)/i),
    agencyCode: matchGroup(text, /Agency Code\s*:?\s*([A-Z0-9]+)/i),
    agencyName: cleanHdfcValue(matchGroup(text, /Agency Name\s*:?\s*([A-Z0-9 .&-]+)/i)),
    agencyContactNumber: matchGroup(text, /Agent's Contact No\s*:?\s*([6-9]\d{9})/i),
    servicingBranchName: cleanHdfcValue(matchGroup(text, /Servicing Branch Name\s*:?\s*([A-Za-z ]+?)(?=Invoice|\n|$)/i)),
    servicingBranchAddress: cleanHdfcValue(matchGroup(text, /Servicing Branch Address\s*:?\s*([\s\S]+?)(?=Are you|Registration No\.|$)/i)),
    insurerGstin: matchGroup(text, /GSTIN Reg\.No\s*([0-9A-Z]{15})/i),
    hsnSacCode: cleanHdfcValue(matchGroup(text, /HSN\/SAC code\s*([0-9 /A-Z]+?GENERAL\s+INSURANCE\s+SERVICES)/i)),
    applicableImtClauses: cleanHdfcValue(matchGroup(text, /Applicable IMT Clauses:\s*([0-9 ,]+)/i))
  };
}

function isIciciMotor(text) {
  return /ICICI\s+Lombard\s+General\s+Insurance\s+Company/i.test(text) &&
    /Certificate\s+of\s+Insurance\s+cum\s+Policy\s+Schedule/i.test(text) &&
    /Private\s+Car\s+Package\s+Policy|Registration No\.\s+MakeModelType of Body/i.test(text);
}

function extractIciciRiskLetterVehicleDetails(text) {
  const block = sliceText(text, /Insured\s*&\s*Vehicle\s*Details/i, /Previous\s+Policy\s+Details/i) || "";
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const ownershipIndex = lines.findIndex((line) => /^Ownership Serial Number$/i.test(line));
  const values = ownershipIndex === -1 ? [] : lines.slice(ownershipIndex + 1);
  const [insuredName, period, rawMakeModel, rto, registrationNumber, registrationDate, engineNumber, chassisNumber, ncbPercentage] = values;
  const makeParts = String(rawMakeModel || "").split("/").map((part) => cleanHdfcValue(part)).filter(Boolean);
  const previousBlock = sliceText(text, /Previous\s+Policy\s+Details/i, /Theinformationprovidedabove|Certificate\s+of\s+Insurance/i) || "";
  const previousLines = previousBlock.split("\n").map((line) => line.trim()).filter(Boolean);
  const previousTypeIndex = previousLines.findIndex((line) => /^Previous Policy Type$/i.test(line));
  const previousValues = previousTypeIndex === -1 ? [] : previousLines.slice(previousTypeIndex + 1);

  return {
    insuredName,
    period,
    make: makeParts[0] || "",
    model: makeParts.slice(1).join(" / "),
    rto,
    registrationNumber,
    registrationDate: normalizeIciciDate(registrationDate),
    engineNumber,
    chassisNumber,
    ncbPercentage,
    manufacturingYear: matchGroup(text, new RegExp(`${escapeRegExp(registrationNumber || "")}[A-Z]*[\\s\\S]{0,300}?\\b(19\\d{2}|20\\d{2})\\b`, "i")),
    previousPolicyNumber: previousValues[0] || "",
    previousPolicyValidity: previousValues[1] || "",
    previousYearNcb: previousValues[2] || "",
    previousInsurer: previousValues[4] || ""
  };
}

function extractIciciScheduleVehicleDetails(text) {
  const match = text.match(/Registration No\.\s+MakeModelType of BodyCC\/KWMfg YrSeating CapacityChassis No\.Engine No\.\s*\n\s*([^\n]+)/i);
  if (!match?.[1]) return {};

  const row = match[1].replace(/\s+/g, "");
  const parsed = row.match(/^([A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4})([A-Z]+)([A-Z0-9 .-]+?)(SUV|SEDAN|HATCHBACK|MUV|SALOON|OPEN|CLOSED)(\d{2,4})(19\d{2}|20\d{2})(\d{1,2})([A-Z0-9]{17})([A-Z0-9]{6,25})$/i);
  if (!parsed) return {};

  return {
    registrationNumber: parsed[1],
    make: cleanHdfcValue(parsed[2]),
    model: cleanHdfcValue(parsed[3]),
    bodyType: cleanHdfcValue(parsed[4]),
    cubicCapacity: parsed[5],
    manufacturingYear: parsed[6],
    seatingCapacity: parsed[7],
    chassisNumber: parsed[8],
    engineNumber: parsed[9]
  };
}

function extractIciciPremiumDetails(text) {
  const result = {
    vehicleIdv: "",
    totalIdv: "",
    basicOwnDamage: "",
    roadSideAssistance: "",
    basicThirdPartyLiability: "",
    legalLiabilityToPaidDriver: "",
    paCoverForOwnerDriver: "",
    unnamedPaCover: "",
    netOwnDamagePremium: "",
    netLiabilityPremium: "",
    totalPackagePremium: "",
    cgst: "",
    sgst: "",
    gstAmount: "",
    totalPremium: ""
  };

  const idvDigits = matchGroup(text, /Total IDV\s*\(`\)\s*\n\s*([0-9]{6,})/i);
  if (idvDigits) {
    const parsedIdv = splitIciciDenseIdv(idvDigits);
    result.vehicleIdv = normalizeAmount(parsedIdv.vehicleIdv);
    result.totalIdv = normalizeAmount(parsedIdv.totalIdv);
  }

  const premiumBlock = sliceText(text, /Premium Details/i, /Unique Identification Number|Geographical Area/i) || text;
  const ownDamageNumbers = Array.from((premiumBlock.match(/No Claim Bonus 45%[\s\S]{0,80}?(\d+)\s*\n\s*(\d+)\s*\n\s*\n\s*(\d+)\s*\n\s*\n\s*(\d+)\s*\n\s*(\d+)/i) || []).slice(1));
  if (ownDamageNumbers.length >= 5) {
    result.basicOwnDamage = normalizeAmount(ownDamageNumbers[0]);
    result.roadSideAssistance = normalizeAmount(ownDamageNumbers[1]);
  }

  const liabilityNumbers = Array.from((premiumBlock.match(/Sub-Total\s*\n\s*(\d+)\s*\n\s*(\d+)\s*\n\s*\n\s*(\d+)\s*\n\s*(\d+)\s*\n\s*(\d+)\s*\n\s*(\d+)/i) || []).slice(1));
  if (liabilityNumbers.length >= 6) {
    result.basicThirdPartyLiability = normalizeAmount(liabilityNumbers[0]);
    result.legalLiabilityToPaidDriver = normalizeAmount(liabilityNumbers[2]);
    result.paCoverForOwnerDriver = normalizeAmount(liabilityNumbers[3]);
    result.unnamedPaCover = normalizeAmount(liabilityNumbers[4]);
  }

  result.netOwnDamagePremium = normalizeAmount(matchGroup(text, /Total Own Damage Premium\(A\)\s*([0-9]+)/i));
  result.netLiabilityPremium = normalizeAmount(matchGroup(text, /Total Liability Premium\(B\)\s*([0-9]+)/i));
  result.totalPackagePremium = normalizeAmount(matchGroup(text, /Total Package Premium\(A\+B\):\s*([0-9]+)/i));
  result.cgst = normalizeAmount(matchGroup(text, /CGST[\s\S]{0,30}?`\s*\n\s*([0-9.]+)/i));
  result.sgst = normalizeAmount(matchGroup(text, /SGST[\s\S]{0,30}?`\s*\n\s*([0-9.]+)/i));
  result.gstAmount = normalizeAmount(matchGroup(text, /Total Tax Payable in `\s*([0-9]+)/i)) || sumAmounts(result.cgst, result.sgst);
  result.totalPremium = normalizeAmount(matchGroup(text, /Total Premium Payable In `\s*([0-9]+)/i));

  return result;
}

function extractIciciPolicyPeriod(text) {
  const schedule = text.match(/Period of Insurance\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})\s*([0-9:]+)?\s*to\s*(?:Midnight of\s*)?([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i);
  if (schedule) {
    const start = normalizeIciciDate(schedule[1]);
    const end = normalizeIciciDate(schedule[3]);
    return {
      start: schedule[2] ? `${start} ${schedule[2]}` : start,
      end
    };
  }

  const riskLetter = text.match(/Period of Insurance[\s\S]{0,180}?([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})\s+to\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i);
  return {
    start: normalizeIciciDate(riskLetter?.[1] || ""),
    end: normalizeIciciDate(riskLetter?.[2] || "")
  };
}

function extractIciciAddress(text) {
  const match = text.match(/Address\s*:?\s*([\s\S]+?)\s*Tenure\s*:/i);
  if (!match?.[1]) return "";
  return cleanHdfcValue(match[1].replace(/\n/g, " "));
}

function normalizeIciciDate(value = "") {
  const text = String(value || "").trim();
  if (!text || text === "-") return "";
  const numeric = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (numeric) return `${numeric[1].padStart(2, "0")}/${numeric[2].padStart(2, "0")}/${numeric[3]}`;

  const monthMatch = text.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!monthMatch) return text;
  const months = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12"
  };
  const month = months[monthMatch[1].toLowerCase()];
  return month ? `${monthMatch[2].padStart(2, "0")}/${month}/${monthMatch[3]}` : text;
}

function cleanIciciRto(value = "") {
  return cleanHdfcValue(value).replace(/^MADHYA PRADESH-/i, "").toUpperCase();
}

function inferIciciFuelType(makeModel = "") {
  const text = String(makeModel || "").toUpperCase();
  if (/(CRDI|DIESEL|D-?TEC|TDI|DDIS|DICOR)/.test(text)) return "Diesel";
  if (/(PETROL|VVT|IVTEC|MPI|KAPPA)/.test(text)) return "Petrol";
  return "";
}

function splitIciciDenseIdv(value = "") {
  const compact = String(value || "").replace(/\D/g, "");
  const candidates = [];
  for (let width = 5; width <= 8; width++) {
    const totalIdv = compact.slice(-width);
    const prefix = compact.slice(0, -width);
    if (!totalIdv || /^0+$/.test(totalIdv)) continue;
    const vehicleMatch = prefix.match(new RegExp(`^(${escapeRegExp(totalIdv)})0*$`)) || prefix.match(/([1-9]\d{4,7})0*$/);
    if (vehicleMatch?.[1]) {
      candidates.push({ vehicleIdv: vehicleMatch[1], totalIdv, width });
    }
  }

  const best = candidates
    .filter((candidate) => Number(candidate.totalIdv) >= Number(candidate.vehicleIdv))
    .sort((a, b) => {
      const diff = Number(a.totalIdv) - Number(a.vehicleIdv) - (Number(b.totalIdv) - Number(b.vehicleIdv));
      return diff || b.width - a.width;
    })[0];
  return best || { vehicleIdv: "", totalIdv: "" };
}

function extractRoyalSundaramMotor(text, _sourceFile = "") {
  if (!isRoyalSundaramMotor(text)) return { documentDetected: false };

  const policyType = cleanHdfcValue(
    matchGroup(text, /(Goods Carrying Vehicle Policy\s*[-–—]\s*Liability only(?:\s*\[[^\]]+\])?)/i) ||
    matchGroup(text, /(Goods Carrying Vehicle Policy)/i)
  );
  const insuredName = cleanHdfcValue(
    matchGroup(text, /Invoice Date\s*:?\s*\d{1,2}\/\d{1,2}\/\d{4}\s*Address of insured:\s*Insured Name:\s*([^\n]+)/i) ||
    matchGroup(text, /Insured Name:\s*([^\n]+)/i) ||
    matchGroup(text, /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s*\d{4}\s*([^\n]+)/i)
  );
  const policyNumber = matchGroup(text, /Certificate of Insurance and Policy No\.\s*([A-Z0-9/-]+)/i) ||
    matchGroup(text, /Policy Number\s*:?\s*([A-Z0-9/-]+)/i);
  const policyStartDate = matchGroup(text, /From\s*00:00\s*hours\s*on\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const policyEndDate = matchGroup(text, /To\s*Midnight\s*of\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const registrationNumber = matchGroup(text, /Registration Number\s*([A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4})/i);
  const vehicleModel = cleanHdfcValue(matchGroup(text, /Model Description\s*([^\n]+)/i));
  const vehicleMake = cleanHdfcValue(matchGroup(text, /Make of the Vehicle\s*([^\n]+?)(?=\s*Year of Manufacture|\n|$)/i));
  const makeModel = [vehicleMake, vehicleModel].filter(Boolean).join(" ") || vehicleModel;
  const grossVehicleWeight = normalizeAmount(matchGroup(text, /Gross Vehicle Weight\(Kgs\)\s*([0-9,]+)/i));
  const engineNumber = matchGroup(text, /Engine Number\s*([A-Z0-9]{8,30})/i);
  const chassisNumber = matchGroup(text, /Chassis Number\s*([A-Z0-9]{8,30})/i);
  const bodyType = cleanHdfcValue(matchGroup(text, /Type of Body\s*([^\n]+)/i));
  const seatingCapacity = matchGroup(text, /Seating Capacity\s*\(including Driver\)\s*([0-9]+)/i);
  const fuelType = normalizeFuelType(matchGroup(text, /Fuel Type\s*([A-Za-z]+)/i));
  const manufacturingYear = matchGroup(text, /Year of Manufacture\s*(\d{4})/i);
  const registrationDate = matchGroup(text, /Name of Insured[\s\S]{0,240}?\d{1,2}\/\d{1,2}\/\d{4}India[A-Z ]+?(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
    matchGroup(text, /Registration\s*Date[\s\S]{80,180}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const totalPremium = normalizeAmount(matchGroup(text, /TOTAL PREMIUM\s*([0-9,]+\.\d{2})/i) || matchGroup(text, /Total Premium \(in Rs\.\)\s*([0-9,]+)/i));
  const basicThirdPartyLiability = normalizeAmount(matchGroup(text, /Basic premium including premium for TPPD\s*([0-9,]+\.\d{2})/i));
  const netLiabilityPremium = normalizeAmount(matchGroup(text, /TOTAL LIABILITY PREMIUM \(B\)\s*([0-9,]+\.\d{2})/i));
  const sgst = normalizeAmount(matchGroup(text, /ADD:SGST\s*([0-9,]+\.\d{2})/i));
  const cgst = normalizeAmount(matchGroup(text, /ADD:CGST\s*([0-9,]+\.\d{2})/i));
  const gstAmount = sumAmounts(sgst, cgst);
  const receiptNumber = matchGroup(text, /Receipt No\.\s*([A-Z0-9]+)/i);
  const receiptDate = matchGroup(text, /signed at [A-Za-z ]+ on (\d{1,2}\/\d{1,2}\/\d{4})/i);

  return {
    documentDetected: true,
    companyName: "Royal Sundaram General Insurance Co. Limited",
    policyType,
    policyNumber,
    insuredName,
    policyStartDate,
    policyEndDate,
    registrationNumber,
    vehicleMake,
    vehicleModel,
    makeModel,
    grossVehicleWeight,
    engineNumber,
    chassisNumber,
    bodyType,
    seatingCapacity,
    fuelType,
    manufacturingYear,
    registrationDate,
    totalPremium,
    policyCoverType: /Liability only/i.test(policyType) ? "Third Party" : extractPolicyCoverType(text, policyType),
    rtoLocation: matchGroup(text, /Registration\s*Authority\s*Registration\s*Date[\s\S]{0,120}?India([A-Z ]+?)\d{1,2}\/\d{1,2}\/\d{4}/i),
    contactNumber: matchGroup(text, /Contact:\s*([6-9]\d{9})/i) || matchGroup(text, /Mobile:\s*([^\n]+)/i),
    gstin: matchGroup(text, /GSTIN\s*:?\s*([A-Z0-9]{15})/i),
    panNumber: matchGroup(text, /PAN Number:\s*([A-Z0-9]+)/i),
    geographicalArea: matchGroup(text, /Name of Insured[\s\S]{0,200}?\b(India)\b/i),
    basicThirdPartyLiability,
    netLiabilityPremium,
    sgst,
    cgst,
    gstAmount,
    receiptNumber,
    receiptDate
  };
}

function isRoyalSundaramMotor(text) {
  return /Royal\s+Sundaram\s+General\s+Insurance/i.test(text) &&
    /Certificate\s*of\s*Insurance|CERTIFICATEOFINSURANCE/i.test(text) &&
    /Registration Number|Vehicle Details|Motor Vehicles Act/i.test(text);
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
    chassisNumber: extractHdfcBoundedText(text, "Chassis No.", ["Engine No", "Engine Number", "Invoice No", "Cubic Capacity", "Customer Id"]),
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

  if (!hasCompany) return false;

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

  return hasExactPolicyTitle || formatSignals.some((pattern) => pattern.test(text));
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

function extractPaymentCollection(text) {
  return {
    dueCollection: extractByLabels(text, ["Due Collection", "Due Amount", "Amount Due"], "amount"),
    collectedAmount: extractByLabels(text, ["Collected Amount", "Amount Collected"], "amount")
  };
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
    return matchGroup(text, /\b((?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}))\b/i) || text;
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
  const ownDamagePeriod = text.match(/From Date & Time\s*(\d{2}\/\d{2}\/\d{4}[^\n]*?)\s*To Date & Time\s*(\d{2}\/\d{2}\/\d{4}[^\n]*?)\s*(?=From Date & Time|Note:|Premium Details|$)/i);
  if (ownDamagePeriod?.[1] || ownDamagePeriod?.[2]) {
    return cleanHdfcValue(side === "start" ? ownDamagePeriod[1] : ownDamagePeriod[2]);
  }

  const pattern = /(?:Period\s+of\s+Insurance\s*)?From\s*[:.-]?\s*([^\n]{4,80}?)\s+(?:To|Upto)\s*[:.-]?\s*([^\n]{4,80})/i;
  const match = text.match(pattern);
  if (match?.[1] || match?.[2]) {
    return cleanHdfcPeriodValue(side === "start" ? match[1] : match[2]);
  }
  return extractByLabels(text, side === "start" ? ["From Date & Time", "From"] : ["To Date & Time", "To"], "text");
}

function cleanHdfcPeriodValue(value) {
  return cleanHdfcValue(value).replace(/^Date\s*&?\s*Time\s*/i, "").trim();
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

function cleanInsuredName(value) {
  return String(value || "")
    .replace(/\bUnique\s+Invoice\s+No\b.*$/i, "")
    .replace(/\bUnique\b\s*$/i, "")
    .replace(/\s+/g, " ")
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

function cleanMotorTableMakeModel(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\b(?:NULL|NA|N\/A)\b/ig, "")
    .replace(/\s*(?:Registration|Chassis|Engine|Seating|Capacity|Premium|VehicleSide|Insured Declared Values).*$/i, "")
    .trim();
}

function matchNCB(text) {
  const m = text.match(/No Claim (?:Bonus|Discount)\s*(?:Discount)?\s*\(?\s*(\d{1,2})\s*%\s*\)?/i);
  if (m?.[1]) return m[1] + "%";
  return "";
}

function extractIffcoPolicyType(text) {
  if (!/\bIFFCO[-\s]?TOKIO\b/i.test(text)) return "";
  if (/COMMERCIAL\s+VEHICLE\s+CERTIFICATE\s+OF\s+INSURANCE/i.test(text) || /PolicyWordingforCommercialVehicle/i.test(text)) {
    return /Package/i.test(text) ? "Commercial Vehicle Package Policy" : "Commercial Vehicle Policy";
  }
  if (/PRIVATE\s+CAR\s+CERTIFICATE\s+OF\s+INSURANCE/i.test(text)) {
    if (/Stand\s*Alone\s*OD/i.test(text)) return "Private Car Stand Alone Own Damage Policy";
    return /Package/i.test(text) ? "Private Car Package Policy" : "Private Car Policy";
  }
  if (/\bPRIVATE\s+CAR\s+CERTIFICATE\b/i.test(text) && /Stand\s*Alone\s*OD/i.test(text)) {
    return "Private Car Stand Alone Own Damage Policy";
  }
  return "";
}

function extractGenericPolicyPeriod(text) {
  const source = String(text || "");
  const date = "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})";
  const periodPatterns = [
    new RegExp(`Period\\s+of\\s+cover\\s*${date}[^\\n]{0,80}?\\bto\\b\\s*${date}`, "i"),
    new RegExp(`Period\\s+of\\s+Insurance\\s*[:.-]?\\s*From\\s*[:.-]?\\s*(?:\\d{1,2}:\\d{2}(?::\\d{2})?\\s*)?(?:hours\\s+of\\s*)?${date}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?\\s*(?:To|Upto|Till)\\s*[:.-]?\\s*(?:Midnight\\s*(?:On|of)?\\s*)?${date}`, "i"),
    new RegExp(`Period\\s+of\\s+Insurance\\s*[:.-]?\\s*From\\s*(?:\\d{1,2}:\\d{2}\\s*)?(?:hours\\s+of\\s*)?${date}\\s*(?:To|Upto|Till)\\s*(?:Midnight\\s*(?:On|of)?\\s*)?${date}`, "i"),
    new RegExp(`From\\s*[:.-]?\\s*(?:\\d{1,2}:\\d{2}\\s*)?(?:Hours\\s+of\\s*)?${date}\\s*(?:To|Upto|Till)\\s*[:.-]?\\s*(?:Midnight\\s*(?:On|of)?\\s*)?${date}`, "i"),
    new RegExp(`Policy\\s+effective\\s+from\\s*(?:\\d{3,4}\\s*hrs?\\s*)?${date}[\\s\\S]{0,220}?\\bTo\\s+MidNight\\s*${date}`, "i"),
    new RegExp(`(?:Start|Commencement)\\s*Date\\s*[:.-]?\\s*${date}[\\s\\S]{0,180}?(?:Expiry|End)\\s*Date\\s*[:.-]?\\s*${date}`, "i")
  ];

  for (const pattern of periodPatterns) {
    const match = source.match(pattern);
    if (match?.[1] && match?.[2]) {
      return { startDate: match[1], expiryDate: match[2] };
    }
  }

  return {
    startDate:
      matchGroup(source, new RegExp(`Period\\s+of\\s+cover\\s*${date}`, "i")) ||
      matchGroup(source, new RegExp(`From\\s*[:.-]?\\s*(?:\\d{1,2}:\\d{2}\\s*)?(?:Hours\\s+of\\s*)?${date}`, "i")) ||
      matchGroup(source, new RegExp(`Period\\s+of\\s+Insurance\\s*from\\s*:?\\s*(?:00:00\\s+hours\\s+of\\s*)?${date}`, "i")) ||
      matchGroup(source, new RegExp(`(?:Start|Commencement)\\s*Date\\s*[:.-]?\\s*${date}`, "i")) ||
      matchGroup(source, new RegExp(`Policy\\s+effective\\s+from\\s*(?:\\d{3,4}\\s*hrs?\\s*)?${date}`, "i")),
    expiryDate:
      matchGroup(source, new RegExp(`Period\\s+of\\s+cover\\s*${date}[^\\n]+?\\bto\\s+${date}`, "i"), 2) ||
      matchGroup(source, new RegExp(`To\\s*[:.-]?\\s*(?:Midnight\\s*(?:On|of)?\\s*)?${date}`, "i")) ||
      matchGroup(source, new RegExp(`To\\s+MidNight\\s*${date}`, "i")) ||
      matchGroup(source, new RegExp(`(?:Expiry|End)\\s*Date\\s*[:.-]?\\s*${date}`, "i")) ||
      matchGroup(source, new RegExp(`(?:midnight\\s+of\\s+)?${date}\\s*(?:midnight|23:59)`, "i"))
  };
}

function inferFuelTypeFromVehicleDescription(value = "") {
  const text = String(value || "").toLowerCase();
  if (/\bdiesel\b|\bcrdi\b|\bdci\b|\btdi\b|\bddis\b|\b d\b|\bd\s*(?:at|mt|amt)\b/.test(text)) return "Diesel";
  if (/\bpetrol\b|\bdts-?fi\b|\b vxi\b|\b lxi\b|\b zxi\b/.test(text)) return "Petrol";
  if (/\bcng\b/.test(text)) return "CNG";
  if (/\belectric\b|\bev\b|\bbev\b/.test(text)) return "Electric";
  if (/\blpg\b/.test(text)) return "LPG";
  return "";
}

function inferFuelType(text, makeModel) {
  const combined = (text + " " + (makeModel || "")).toLowerCase();
  const vehicleFuel = inferFuelTypeFromVehicleDescription(makeModel);
  if (vehicleFuel) return vehicleFuel;
  if (/\bdiesel\b/.test(combined)) return "Diesel";
  if (/\belectric\b|\bev\b|\bbev\b/.test(combined)) return "Electric";
  if (/\bcng\b/.test(combined)) return "CNG";
  if (/\blpg\b/.test(combined)) return "LPG";
  if (/\bpetrol\b|\bgasoline\b|\bdts-?fi\b|\bfi\b/.test(combined)) return "Petrol";
  return "";
}

function matchGroup(text, pattern, groupIndex = 1) {
  const match = text.match(pattern);
  return match?.[groupIndex]?.replace(/\s+/g, " ").trim() || "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeAmount(value) {
  if (!value) return "";
  const cleaned = value.replace(/\s+/g, "");
  if (!cleaned.includes(".")) return `${cleaned}.00`;
  return cleaned.replace(/\.(\d)$/, ".$10");
}

function sumAmounts(...values) {
  const nums = values
    .map((value) => Number(String(value || "").replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));
  if (!nums.length) return "";

  return nums
    .reduce((total, value) => total + value, 0)
    .toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function diffAmounts(first, second) {
  const a = Number(String(first || "").replace(/,/g, ""));
  const b = Number(String(second || "").replace(/,/g, ""));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "";

  return (a - b).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildDuration(startDate, expiryDate) {
  if (!startDate || !expiryDate) return "";

  const parseDurationDate = (value) => {
    const text = String(value || "");
    const slashDate = matchGroup(text, /(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (slashDate) {
      const [day, month, year] = slashDate.split("/").map(Number);
      return { day, month, year: year < 100 ? 2000 + year : year };
    }

    const isoMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return {
        year: Number(isoMatch[1]),
        month: Number(isoMatch[2]),
        day: Number(isoMatch[3])
      };
    }

    return {};
  };

  const { day: sd, month: sm, year: sy } = parseDurationDate(startDate);
  const { day: ed, month: em, year: ey } = parseDurationDate(expiryDate);
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
    /(?:^|\n)\s*([A-Z][A-Z .&'-]{2,120}?)\s*Policy\s*#\s*:?/i,
    /(?:^|\n)\s*([A-Z][A-Z .&'-]{2,120}?)\s+Policy\s*#\s*:?/i,
    /Insured's\s+name\s*[:.-]?\s*([\s\S]+?)(?=\s*(?:Unique\s+Invoice|Invoice|Policy No|Address|Phone|Customer|$))/i,
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
  const p400PolicyNumber = matchGroup(text, /\bP400\s+Policy\s*#\s*:?\s*([A-Z0-9/-]{6,})/i);
  if (p400PolicyNumber) return p400PolicyNumber;

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

const FULL_REGISTRATION_PATTERN = "[A-Z]{2}[-\\s]?\\d{1,2}[-\\s]?[A-Z]{1,3}[-\\s]?\\d{4}";
const PARTIAL_RTO_REGISTRATION_PATTERN = "[A-Z]{2}[-\\s]\\d{1,2}";
const NEW_INDIA_REGISTRATION_FORMATS = [
  {
    name: "labelled_full_registration",
    pattern: new RegExp(`Registration\\s*(?:Number|No\\.?|no\\.?)\\s*[:.]?\\s*(${FULL_REGISTRATION_PATTERN})\\b`, "i")
  },
  {
    name: "make_model_inline_full_registration",
    pattern: new RegExp(`Make\\s*\\/\\s*Model[\\s\\S]{0,180}?Registration\\s*no\\.?\\s*(${FULL_REGISTRATION_PATTERN})\\b`, "i")
  },
  {
    name: "labelled_partial_rto_registration",
    pattern: new RegExp(`Registration\\s*(?:Number|No\\.?|no\\.?)\\s*[:.]?\\s*(${PARTIAL_RTO_REGISTRATION_PATTERN})(?=\\s*(?:Seating|Variant|Name\\s+of\\s+registration|INSURED|SCHEDULE|$))`, "i")
  },
  {
    name: "make_model_inline_partial_rto_registration",
    pattern: new RegExp(`Make\\s*\\/\\s*Model[\\s\\S]{0,180}?Registration\\s*no\\.?\\s*(${PARTIAL_RTO_REGISTRATION_PATTERN})(?=\\s*(?:Seating|Variant|Name\\s+of\\s+registration|INSURED|SCHEDULE|$))`, "i")
  }
];

function extractNewIndiaMotorDetails(text) {
  const result = {
    registrationNumber: "",
    makeModel: "",
    engineNumber: "",
    chassisNumber: "",
    idv: ""
  };

  if (!isNewIndiaAssuranceText(text)) return result;

  const block = extractMotorVehicleBlock(text) || text;
  result.registrationNumber = firstNewIndiaPatternValue(block, NEW_INDIA_REGISTRATION_FORMATS);
  result.makeModel = extractNewIndiaMakeModel(block);

  const chassisEngine = extractNewIndiaChassisEngine(block);
  result.chassisNumber = chassisEngine.chassisNumber;
  result.engineNumber = chassisEngine.engineNumber;
  result.idv = extractIDV(text);

  return result;
}

function isNewIndiaAssuranceText(text = "") {
  return /\b(?:The\s+)?New\s+India\s+Assurance\b|\bTHE\s+NEW\s+INDIA\s+ASSURANCE\b/i.test(text);
}

function firstNewIndiaPatternValue(text, formats) {
  for (const format of formats) {
    const value = matchGroup(text, format.pattern);
    if (value) return normalizeRegistrationDisplay(value);
  }
  return "";
}

function normalizeRegistrationDisplay(value = "") {
  return String(value || "").replace(/\s+/g, "-").replace(/-+/g, "-").toUpperCase().trim();
}

function extractNewIndiaMakeModel(text) {
  const value =
    matchGroup(text, /\bMake\s*\/\s*Model\s*:?\s*([A-Z0-9 /&().,-]{2,80}?)(?=\s*Registration\b|\s*Chassis\b|\s*Seating\b|\n|$)/i) ||
    matchGroup(text, /\bMake\s*\/\s*Model\s*:?\s*([A-Z0-9 /&().,-]{2,80})/i);
  return cleanHdfcValue(value);
}

function extractNewIndiaChassisEngine(text) {
  const result = { chassisNumber: "", engineNumber: "" };
  const match = text.match(/Chassis\s*no\.?\s*\/\s*Engine\s*(?:no\.?|Number)\s*:?\s*([A-Z0-9]{10,25})\s*\/\s*([A-Z0-9\n ]{5,30}?)(?=\s*(?:Type|Make|Registration|Model|Fuel|Year|$))/i);
  if (!match) return result;

  result.chassisNumber = match[1].replace(/\s+/g, "").toUpperCase();
  result.engineNumber = match[2].replace(/\s+/g, "").toUpperCase();
  return result;
}

function extractNewIndiaPremiumSchedule(text) {
  const result = {
    basicOwnDamage: "",
    basicThirdPartyLiability: "",
    odPremium: "",
    tpDriverOwner: "",
    netPremium: "",
    gstAmount: "",
    totalPremium: "",
    zeroDepreciationCover: "",
    ncbPercentage: ""
  };

  if (!/New India Assurance|THE NEW INDIA ASSURANCE/i.test(text) && !/SCHEDULE OF PREMIUM/i.test(text)) {
    return result;
  }

  const schedule = sliceText(text, /SCHEDULE OF PREMIUM/i, /GSTIN\(Issuing Office\)|Limitation as to use|Limits of Liability/i) || text;
  const amount = (...patterns) => {
    for (const pattern of patterns) {
      const value = normalizeAmount(matchGroup(schedule, pattern) || matchGroup(text, pattern));
      if (value) return value;
    }
    return "";
  };

  result.odPremium = amount(
    /Total\s+OD\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Calculated\s+OD\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /OD\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Own\s+Damage\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i
  );
  result.tpDriverOwner = amount(
    /Total\s+TP\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Calculated\s+TP\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /TP\s*\+\s*Driver\s*\+\s*Owner(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /TP\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Liability\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i
  );
  result.netPremium = amount(
    /Net\s+Premium(?:\s*\(?Rs\.?\)?)?\s*(?:in\s+Rs)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Net\s+Premium\s*[:.-]?\s*(?:Rs\.?)?\s*([0-9,]+(?:\.\d{1,2})?)/i
  );
  result.gstAmount = amount(
    /GST(?:\s*\(?Rs\.?\)?)?\s*(?:in\s+Rs)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /GST\s*[:.-]?\s*(?:Rs\.?)?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Goods\s+and\s+Service\s+Tax\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i
  );
  result.totalPremium = amount(
    /Total\s+Payable(?:\s*\(?Rs\.?\)?)?\s*(?:in\s+Rs)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Total\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Total\s+Payable\s*[:.-]?\s*(?:Rs\.?)?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Premium\s+including\s+GST\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i
  );

  if (!result.netPremium && result.totalPremium && result.gstAmount) result.netPremium = diffAmounts(result.totalPremium, result.gstAmount);
  if (!result.gstAmount && result.totalPremium && result.netPremium) result.gstAmount = diffAmounts(result.totalPremium, result.netPremium);
  if (!result.odPremium && result.netPremium && result.tpDriverOwner) result.odPremium = diffAmounts(result.netPremium, result.tpDriverOwner);
  if (!result.tpDriverOwner && result.netPremium && result.odPremium) result.tpDriverOwner = diffAmounts(result.netPremium, result.odPremium);

  // Parse columns
  const scheduleIndex = text.search(/SCHEDULE OF PREMIUM/i);
  if (scheduleIndex !== -1) {
    const scheduleBlock = text.slice(scheduleIndex, scheduleIndex + 3000);
    const basicOdIdx = scheduleBlock.search(/Basic\s+OD\s+Premium/i);
    const basicTpIdx = scheduleBlock.search(/Basic\s+TP\s+Premium/i);
    
    if (basicOdIdx !== -1 && basicTpIdx !== -1 && basicTpIdx > basicOdIdx) {
      const odBlock = scheduleBlock.slice(basicOdIdx, basicTpIdx);
      let tpEndIdx = scheduleBlock.search(/Calculated\s+OD\s+Premium|Calculated\s+TP\s+Premium|Total\s+OD\s+Premium|Total\s+TP\s+Premium|Net\s+Premium/i);
      if (tpEndIdx === -1 || tpEndIdx <= basicTpIdx) {
        tpEndIdx = scheduleBlock.length;
      }
      const tpBlock = scheduleBlock.slice(basicTpIdx, tpEndIdx);

      const alignLabelsAndValues = (blockText) => {
        const lines = blockText.split("\n").map(l => l.trim()).filter(Boolean);
        const labels = [];
        const values = [];
        for (const line of lines) {
          if (/^[0-9,.-]+(?:\s*[0-9,.-]+)*$/.test(line)) {
            const nums = line.split(/\s+/).map(n => n.trim()).filter(Boolean);
            values.push(...nums);
          } else {
            if (!/^(Own Damage|Liability|SCHEDULE OF PREMIUM)$/i.test(line)) {
              labels.push(line);
            }
          }
        }
        return { labels, values };
      };

      const odAligned = alignLabelsAndValues(odBlock);
      const tpAligned = alignLabelsAndValues(tpBlock);

      if (odAligned.labels.length > 0 && odAligned.values.length > 0) {
        result.basicOwnDamage = normalizeAmount(odAligned.values[0]);

        const zeroDepIdx = odAligned.labels.findIndex(l => /nil\s*depreciation|depreciation\s*cover/i.test(l));
        if (zeroDepIdx !== -1 && zeroDepIdx < odAligned.values.length) {
          result.zeroDepreciationCover = normalizeAmount(odAligned.values[zeroDepIdx]);
        }

        const ncbIdx = odAligned.labels.findIndex(l => /NCB|No\s*Claim\s*Bonus/i.test(l));
        if (ncbIdx !== -1) {
          const ncbLabel = odAligned.labels[ncbIdx];
          const pctMatch = ncbLabel.match(/(\d+)\s*%/);
          if (pctMatch) {
            result.ncbPercentage = pctMatch[1] + "%";
          }
        }
      }

      if (tpAligned.labels.length > 0 && tpAligned.values.length > 0) {
        result.basicThirdPartyLiability = normalizeAmount(tpAligned.values[0]);
      }
    }
  }

  return result;
}

function extractGenericPremiumSchedule(text, fallbackTotal) {
  const result = {
    basicOwnDamage: "",
    totalPremium: "",
    netPremium: "",
    tpDriverOwner: "",
    odPremium: "",
    gstAmount: "",
    cgst: "",
    sgst: ""
  };

  const basicOwnDamage =
    matchGroup(text, /\bBasic\s+Premium\s*\(Incl\.?\s*Disc\)\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bBasic\s+Own\s+Damage\s+Premium\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bBasic\s+OD\s+Premium\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i);

  const od = 
    matchGroup(text, /\bNet\s*\(A\)\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bTotal\s*OD\s*Premium\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bOD\s*Premium\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bOwn\s*Damage\s*Premium\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bOwn\s*Damage\s*\(A\)\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i);

  const tp = 
    matchGroup(text, /\bNet\s*\(A\)\s*[0-9,]+(?:\.\d{1,2})?\s*Net\s*\(B\)\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bNet\s*\(B\)\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bTotal\s*TP\s*Premium\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bTP\s*Premium\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bThird\s*Party\s*Premium\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bLiability\s*Premium\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bTP\s*\+\s*Driver\s*\+\s*Owner\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i);

    const net = 
    matchGroup(text, /\bSection\s*1\s*(?:\(\s*A\s*\+\s*B\s*\))?\s*(?:Rs\.?)?\s*\n?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bSection\s*1\s*\(A\s*\+\s*B\)\s*(?:\(for\s*1\s*years?\)?)?\s*(?:Rs\.?)?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bNet\s+Premium\s*(?:Rs\.?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bNet\s+Premium\s*\(A\+B\+C\+D\)\s*₹?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bTaxable\s+Value[\s\S]{0,120}?\bAmount\s*([0-9,]+(?:\.\d{1,2})?)/i);

  const total = 
    matchGroup(text, /\bPremium\s+Paid\s*\(\s*Total\s+Invoice\s+Value\s*\)\s*Rs\.?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bTotal\s*Premium\s*(?:inclusive\s*Tax)?\s*(?:\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bTotal\s*Payable\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bPremium\s+including\s+GST\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bTotal\s+Value\s*([0-9,]+(?:\.\d{1,2})?)/i);

  let totalVal = total ? normalizeAmount(total) : "";
  if (!totalVal || parseFloat(totalVal.replace(/,/g, "")) === 0) {
    totalVal = fallbackTotal ? normalizeAmount(fallbackTotal) : "";
  }

  let netVal = net ? normalizeAmount(net) : "";
  if (netVal && parseFloat(netVal.replace(/,/g, "")) === 0) {
    netVal = "";
  }

  result.odPremium = od ? normalizeAmount(od) : "";
  result.tpDriverOwner = tp ? normalizeAmount(tp) : "";
  result.netPremium = netVal;
  result.totalPremium = totalVal;
  result.basicOwnDamage = basicOwnDamage ? normalizeAmount(basicOwnDamage) : "";

  const gstBreakup = extractGenericGstBreakup(text);
  result.cgst = gstBreakup.cgst;
  result.sgst = gstBreakup.sgst;
  result.gstAmount = gstBreakup.gstAmount;

  if (!result.netPremium && result.odPremium && result.tpDriverOwner) {
    result.netPremium = sumAmounts(result.odPremium, result.tpDriverOwner);
  }

  if (!result.gstAmount && result.totalPremium && result.netPremium) {
    result.gstAmount = diffAmounts(result.totalPremium, result.netPremium);
  }

  return result;
}

function extractGenericGstBreakup(text) {
  const result = { cgst: "", sgst: "", gstAmount: "" };
  const gstIndex = String(text || "").search(/CGST\s*SGST|CGSTSGST|Central\s+GST|State\s+GST/i);
  if (gstIndex === -1) return result;

  const block = text.slice(gstIndex, gstIndex + 600);
  const amountIndex = block.search(/\bAmount\b/i);
  if (amountIndex === -1) return result;

  const amountTail = block.slice(amountIndex, amountIndex + 160);
  const values = (amountTail.match(/[0-9,]+\.\d{2}/g) || [])
    .map((value) => normalizeAmount(value))
    .filter((value) => Number(String(value).replace(/,/g, "")) > 0);

  if (values.length >= 2) {
    result.cgst = values[0];
    result.sgst = values[1];
    result.gstAmount = sumAmounts(result.cgst, result.sgst);
  }

  return result;
}

function extractPremium(text) {
  const totalInvoicePremium = normalizeAmount(matchGroup(text, /\bPremium\s+Paid\s*\(\s*Total\s+Invoice\s+Value\s*\)\s*Rs\.?\s*([0-9,]+(?:\.\d{1,2})?)/i));
  if (totalInvoicePremium) return totalInvoicePremium;

  // Try Net Premium Table first (specifically IFFCO-TOKIO)
  const netIdx = text.search(/Net\s*Premium/i);
  if (netIdx !== -1) {
    const block = text.slice(netIdx, netIdx + 800);
    // IFFCO often embeds amounts tightly; use a dedicated helper
    const iffcoResult = extractIffcoPremiumFromBlock(block);
    if (iffcoResult) return iffcoResult;
    const numbers = block.match(/[0-9,]+\.[0-9]{2}/g);
    if (numbers && numbers.length) {
      for (let i = numbers.length - 1; i >= 0; i--) {
        if (!numbers[i].endsWith('.00')) return normalizeAmount(numbers[i]);
      }
      return normalizeAmount(numbers[numbers.length - 1]);
    }
  }

  // Try Premium Bifurcation Table
  const tableMatch2 = text.match(/Premium\s*Bifurcation[\s\S]{0,400}?/i);
  if (tableMatch2?.[0]) {
    const block = tableMatch2[0];
    const numbers = block.match(/[0-9,]+\.[0-9]{2}/g);
    if (numbers && numbers.length) {
      for (let i = numbers.length - 1; i >= 0; i--) {
        if (!numbers[i].endsWith('.00')) return normalizeAmount(numbers[i]);
      }
      return normalizeAmount(numbers[numbers.length - 1]);
    }
  }

  // Try Amount Received
  const amountRec = text.match(/Amount\s+Received\s*[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (amountRec?.[1]) {
    return normalizeAmount(amountRec[1]);
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
  return "";
}

// Dedicated parser for IFFCO-TOKIO dense premium blocks like:
// "24300.000.000.000.000.0024300.002251.44"
function extractIffcoPremiumFromBlock(block) {
  if (!block) return "";
  // remove non-numeric except dots and commas
  const candidate = block.replace(/[^0-9.,]/g, "");
  // split on sequences of zeros or repeated runs to try capture decimal groups
  const numbers = candidate.match(/[0-9,]+\.[0-9]{2}/g) || [];
  if (!numbers.length) {
    // fallback: find sequences of digits and infer last two as cents
    const digits = candidate.replace(/,/g, "");
    const groups = digits.match(/[0-9]{3,}/g) || [];
    if (!groups.length) return "";
    // try to recover last group as xxx.yy by taking last 3-6 chars
    const last = groups[groups.length - 1];
    if (last.length > 2) {
      const dollars = last.slice(0, -2);
      const cents = last.slice(-2);
      return normalizeAmount(`${dollars}.${cents}`);
    }
    return "";
  }

  // prefer the last number which is not .00
  for (let i = numbers.length - 1; i >= 0; i--) {
    if (!numbers[i].endsWith('.00')) return normalizeAmount(numbers[i]);
  }
  return normalizeAmount(numbers[numbers.length - 1]);
}

function extractNewIndiaDenseIdv(text) {
  const block = sliceText(text, /INSURED\s+DECLARED\s+VALUE/i, /(?:SCHEDULE\s+OF\s+PREMIUM|ENHANCED\s+COVER|Cover\s+Description|Page\s+\d+\s+of)/i);
  if (!block) return "";

  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const digits = line.replace(/\D/g, "");
    if (digits.length < 10 || !/[1-9]/.test(digits)) continue;

    for (let width = Math.min(9, Math.floor(digits.length / 2)); width >= 5; width--) {
      const suffix = digits.slice(-width);
      const prefix = digits.slice(0, -width);
      if (/^0+$/.test(suffix)) continue;
      if (prefix.startsWith(suffix) || prefix.endsWith(suffix)) {
        return normalizeAmount(suffix);
      }
    }
  }
  return "";
}

function extractIDV(text) {
  // New India Assurance IDV patterns
  const NIA_idvMatch1 = text.match(/individual covers\s*\(OD\)\s*in\s*RS\s*[:.-]?\s*([0-9,]+)/i);
  if (NIA_idvMatch1?.[1]) {
    return normalizeAmount(NIA_idvMatch1[1]);
  }
  const newIndiaDenseIdv = extractNewIndiaDenseIdv(text);
  if (newIndiaDenseIdv) return newIndiaDenseIdv;
  const NIA_idvMatchInline = text.match(/\b(?:Insured\s+Declared\s+Value|IDV)(?:\s*\([^)]*\)|\s*\/\s*IDV|\s+IDV|\s+in\s+Rs\.?|\s*\(?Rs\.?\)?)?\s*[:.-]?\s*(?:Rs\.?\s*)?([1-9][0-9,]{4,8}(?:\.\d{1,2})?)/i);
  if (NIA_idvMatchInline?.[1]) {
    return normalizeAmount(NIA_idvMatchInline[1]);
  }
  const NIA_idvMatchNearby = text.match(/\bInsured\s+Declared\s+Value[\s\S]{0,140}?\b(?:Total\s*)?IDV[\s\S]{0,80}?([1-9][0-9,]{4,8}(?:\.\d{1,2})?)/i);
  if (NIA_idvMatchNearby?.[1]) {
    return normalizeAmount(NIA_idvMatchNearby[1]);
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

  const standaloneOd = text.match(/Stand\s*Alone\s*OD\s*([0-9,]+\.\d{2})/i);
  if (standaloneOd?.[1]) return normalizeAmount(standaloneOd[1]);

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
      seatingCapacity: "",
      fuelType: "",
      idv: ""
    };
  }

  const iffcoCompressed = extractIffcoCompressedVehicleTable(block);
  if (iffcoCompressed.registrationNumber) return iffcoCompressed;

  const iffcoPrivateCar = extractIffcoDensePrivateCarVehicleTable(block);
  if (iffcoPrivateCar.registrationNumber) return iffcoPrivateCar;

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
    fuelType: "",
    idv: "",
    seatingCapacity: extractSeatingFromVehicleBlock(block, {
      ...context,
      makeModel,
      policyCoverType,
      cubicCapacity
    })
  };
}

function extractIffcoCompressedVehicleTable(block) {
  if (!/Registration\s+Mark/i.test(block) || !/IFFCO|Insured\s+Motor\s+Vehicle\s+Details/i.test(block)) {
    return { registrationNumber: "" };
  }

  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const regIndex = lines.findIndex((line) => /^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(19\d{2}|20\d{2})$/i.test(line));
  if (regIndex === -1) return { registrationNumber: "" };

  const regMatch = lines[regIndex].match(/^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(19\d{2}|20\d{2})$/i);
  const specLine = lines.slice(regIndex + 1, regIndex + 5).find((line) => /^\d{3,5}(?:Package|Comprehensive|Liability|Third\s*Party|Stand\s*Alone\s*OD)/i.test(line.replace(/\s+/g, "")));
  const specMatch = specLine?.replace(/\s+/g, "").match(/^(\d{3,5})(Package|Comprehensive|Liability|ThirdParty|StandAloneOD)([0-9,]+(?:\.\d{1,2})?)?/i);
  if (!regMatch || !specMatch) return { registrationNumber: "" };

  const registrationNumber = regMatch[1].toUpperCase();
  const manufacturingYear = regMatch[2];
  const cubicCapacity = specMatch[1];
  const policyCoverType = normalizeCoverType(specMatch[2]);
  const idv = normalizeAmount(specMatch[3] || "");

  let engineNumber = "";
  let makeModel = "";
  let chassisNumber = "";
  let seatingCapacity = "";
  const chassisLabelIndex = lines.findIndex((line) => /^Chassis\s+No\.?$/i.test(line));

  const beforeReg = lines.slice(Math.max(0, regIndex - 5), regIndex).reverse();
  const vehicleBeforeReg = beforeReg.find((line) => /^(?:ASHOK\s+LEYLAND|ASHOK\s+LEYL|BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL\s+ENFIELD|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)\b/i.test(line));
  if (vehicleBeforeReg) {
    const compactVehicle = vehicleBeforeReg.replace(/\s+/g, " ").trim();
    const engineMatch = compactVehicle.match(/([A-Z]{2,8}[A-Z0-9]{6,20})$/i);
    if (engineMatch && isPlausibleEngineNumber(engineMatch[1])) {
      engineNumber = engineMatch[1].toUpperCase();
      makeModel = cleanMotorTableMakeModel(compactVehicle.slice(0, -engineMatch[1].length));
    } else {
      makeModel = cleanMotorTableMakeModel(compactVehicle);
    }
  }

  if (!makeModel) {
    const afterSpec = lines.slice(regIndex + 1, Math.min(lines.length, regIndex + 10));
    const makeChassisLine = afterSpec.find((line) => /^(?:ASHOK\s+LEYLAND|ASHOK\s+LEYL|BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL\s+ENFIELD|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)\b/i.test(line) && /[A-Z0-9]{17}$/i.test(line));
    const makeChassisMatch = makeChassisLine?.match(/^(.+?)([A-Z0-9]{17})$/i);
    if (makeChassisMatch) {
      makeModel = cleanMotorTableMakeModel(makeChassisMatch[1]);
      chassisNumber = makeChassisMatch[2].toUpperCase();
    }
  }

  if (!makeModel && chassisLabelIndex !== -1) {
    const makeLineIndex = lines.findIndex((line, index) =>
      index > chassisLabelIndex &&
      index < chassisLabelIndex + 8 &&
      /^(?:ASHOK\s+LEYLAND|ASHOK\s+LEYL|BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL\s+ENFIELD|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)\b/i.test(line)
    );
    if (makeLineIndex !== -1) {
      let makeLine = lines[makeLineIndex];
      let engineOffset = 1;
      const suffix = lines[makeLineIndex + 1]?.trim();
      if (/-$/.test(makeLine) && /^[A-Za-z]{1,8}$/.test(suffix || "")) {
        makeLine += suffix;
        engineOffset = 2;
      }
      makeModel = cleanMotorTableMakeModel(makeLine);
      const possibleEngine = lines[makeLineIndex + engineOffset]?.replace(/^[-:.\s]+/, "").trim().toUpperCase();
      const possibleChassis = lines[makeLineIndex + engineOffset + 1]?.trim().toUpperCase();
      if (!engineNumber && isPlausibleEngineNumber(possibleEngine) && !/^[A-Z0-9]{17}$/i.test(possibleEngine || "")) engineNumber = possibleEngine;
      if (!chassisNumber && /^[A-Z0-9]{10,25}$/i.test(possibleChassis || "")) chassisNumber = possibleChassis;
    }
  }

  const engineLine = lines.slice(Math.max(0, regIndex - 5), Math.min(lines.length, regIndex + 8))
    .map((line) => line.replace(/^[-:.\s]+/, "").trim().toUpperCase())
    .find((line) => isPlausibleEngineNumber(line));
  if (!engineNumber && engineLine) engineNumber = engineLine;

  if (chassisLabelIndex !== -1) {
    for (let i = chassisLabelIndex + 1; i < Math.min(lines.length, chassisLabelIndex + 6); i++) {
      const line = lines[i];
      if (!seatingCapacity && /^([1-9]|[1-7]\d|80)$/.test(line)) {
        seatingCapacity = line;
        continue;
      }
      if (chassisNumber) continue;
      if (/^(?:ASHOK\s+LEYLAND|ASHOK\s+LEYL|BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL\s+ENFIELD|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)\b/i.test(line)) continue;
      if (isPlausibleEngineNumber(line) && /^[A-Z0-9]{10,25}$/i.test(lines[i + 1] || "")) continue;
      const chassisMatch = line.match(/\b([A-Z0-9]{10,25})\b/i);
      if (chassisMatch) {
        chassisNumber = chassisMatch[1].toUpperCase();
        break;
      }
    }
  }

  const totalValueLine = lines.find((line) => /^[0-9,.]+0\.000\.000\.00/i.test(line));
  const totalIdv = totalValueLine ? normalizeAmount((totalValueLine.match(/([1-9][0-9]{4,9}\.\d{2})(?=[0-9,.]*[0-9]+\.\d{2}$)/) || [])[1]) : idv;

  return {
    registrationNumber,
    manufacturingYear,
    cubicCapacity,
    policyCoverType,
    makeModel,
    engineNumber,
    chassisNumber,
    fuelType: inferFuelTypeFromVehicleDescription(makeModel),
    idv: totalIdv || idv,
    seatingCapacity: normalizeSeatingCapacity(seatingCapacity, { policyCoverType, makeModel, cubicCapacity, text: block })
  };
}

function extractIffcoDensePrivateCarVehicleTable(block) {
  const standaloneOd = extractIffcoStandaloneOdVehicleTable(block);
  if (standaloneOd.registrationNumber) return standaloneOd;

  if (!/Registration\s+Mark/i.test(block) || !/Type\s+of\s+bodyMake\s+of\s+VehicleCCCoverageIDV/i.test(block)) {
    return { registrationNumber: "" };
  }

  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const rowIndex = lines.findIndex((line) => /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}\d{4}/i.test(line));
  if (rowIndex === -1) return { registrationNumber: "" };

  const rowMatch = lines[rowIndex].match(/^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(\d{4})(.*)$/i);
  if (!rowMatch) return { registrationNumber: "" };

  const registrationNumber = rowMatch[1].toUpperCase();
  const manufacturingYear = normalizeManufacturingYear(rowMatch[2]);
  const makeParts = [rowMatch[3]];
  let specIndex = -1;

  for (let i = rowIndex + 1; i < Math.min(lines.length, rowIndex + 8); i++) {
    if (/^\d{3,4}(?:Package|Comprehensive|Liability|Third\s*Party)/i.test(lines[i])) {
      specIndex = i;
      break;
    }
    makeParts.push(lines[i]);
  }

  if (specIndex === -1) return { registrationNumber: "" };

  const specMatch = lines[specIndex].match(/^(\d{3,4})(Package|Comprehensive|Liability|Third\s*Party)([0-9,]+(?:\.\d{1,2})?)?/i);
  const cubicCapacity = specMatch?.[1] || "";
  const policyCoverType = normalizeCoverType(specMatch?.[2] || "");
  let idv = specMatch?.[3] || "";
  if (idv && lines[specIndex + 1] && /^\d{1,3}$/.test(lines[specIndex + 1])) {
    idv += lines[specIndex + 1];
  }

  const vehicleCodeLines = [];
  for (let i = specIndex + 1; i < Math.min(lines.length, specIndex + 8); i++) {
    const line = lines[i];
    if (/^\d{1,2}$/.test(line) && vehicleCodeLines.length) break;
    if (/^[A-Z0-9]{6,25}$/i.test(line) && !/^\d+$/.test(line)) {
      vehicleCodeLines.push(line.toUpperCase());
    }
  }
  const combinedVehicleCode = vehicleCodeLines.join("");
  const chassisNumber = combinedVehicleCode.length >= 17 ? combinedVehicleCode.slice(-17) : "";
  const engineNumber = chassisNumber ? combinedVehicleCode.slice(0, -17) : "";
  const seatingCapacity = lines.slice(specIndex + 1, specIndex + 10).find((line) => /^(?:[1-9]|[1-7]\d|80)$/.test(line)) || "";
  const makeModel = cleanMotorTableMakeModel(makeParts.join(" "));

  return {
    registrationNumber,
    manufacturingYear,
    cubicCapacity,
    policyCoverType,
    makeModel,
    engineNumber: isPlausibleEngineNumber(engineNumber) ? engineNumber : "",
    chassisNumber,
    fuelType: inferFuelTypeFromVehicleDescription(makeModel),
    idv: normalizeAmount(idv),
    seatingCapacity: normalizeSeatingCapacity(seatingCapacity, { policyCoverType, makeModel, cubicCapacity, text: block })
  };
}

function extractIffcoStandaloneOdVehicleTable(block) {
  if (!/Registration\s+Mark/i.test(block) || !/Stand\s*Alone\s*OD/i.test(block)) {
    return { registrationNumber: "" };
  }

  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const rowIndex = lines.findIndex((line) => /^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(\d{4})$/i.test(line));
  if (rowIndex === -1) return { registrationNumber: "" };

  const rowMatch = lines[rowIndex].match(/^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(\d{4})$/i);
  const specLine = lines.find((line) => /^(\d{3,4})StandAloneOD[0-9,]+(?:\.\d{1,2})?$/i.test(line.replace(/\s+/g, "")));
  const specMatch = specLine?.replace(/\s+/g, "").match(/^(\d{3,4})StandAloneOD([0-9,]+(?:\.\d{1,2})?)$/i);
  if (!rowMatch || !specMatch) return { registrationNumber: "" };

  const engineLine = lines
    .map((line) => line.replace(/^[-:.\s]+/, "").trim().toUpperCase())
    .find((line) => isPlausibleEngineNumber(line));

  let seatingCapacity = "";
  const chassisLabelIndex = lines.findIndex((line) => /^Chassis\s+No\.?$/i.test(line));
  if (chassisLabelIndex !== -1) {
    for (let i = chassisLabelIndex + 1; i < Math.min(lines.length, chassisLabelIndex + 5); i++) {
      if (/^(?:[1-9]|10)$/.test(lines[i])) {
        seatingCapacity = lines[i];
        break;
      }
    }
  }

  let makeModel = "";
  let chassisNumber = "";
  for (const line of lines) {
    const chassisMatch = line.match(/([A-Z0-9]{17})$/i);
    if (!chassisMatch) continue;

    const prefix = line.slice(0, line.length - chassisMatch[1].length).replace(/\s+/g, " ").trim();
    if (!prefix || !/^(?:ASHOK LEYLAND|MARUTI SUZUKI|ROYAL ENFIELD|MAHINDRA|HYUNDAI|BAJAJ|HONDA|HERO|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA|TVS|YAMAHA|SUZUKI)\b/i.test(prefix)) {
      continue;
    }

    makeModel = cleanMotorTableMakeModel(prefix);
    chassisNumber = chassisMatch[1].toUpperCase();
    break;
  }

  return {
    registrationNumber: rowMatch[1].toUpperCase(),
    manufacturingYear: normalizeManufacturingYear(rowMatch[2]),
    cubicCapacity: specMatch[1],
    policyCoverType: "Own Damage",
    makeModel,
    engineNumber: engineLine || "",
    chassisNumber,
    fuelType: inferFuelTypeFromVehicleDescription(makeModel),
    idv: normalizeAmount(specMatch[2]),
    seatingCapacity: normalizeSeatingCapacity(seatingCapacity, {
      policyCoverType: "Own Damage",
      makeModel,
      cubicCapacity: specMatch[1],
      text: block
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
  const labelled = extractMotorLabelValue(text, ["Registration Number", "Registration No", "Registration no", "Regn No", "Regn. No", "Registration Mark", "Vehicle Registration No", "Vehicle No"], "registration");
  const normalizedLabelled = labelled ? matchGroup(labelled, /\b((?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}))\b/i) : "";
  if (normalizedLabelled) return normalizedLabelled;
  const newIndiaLabelled = matchGroup(text, /\b(?:Registration\s*(?:No|Number|Mark)|Regn\.?\s*No|Vehicle\s*(?:No|Number))\b[\s,.:;-]*(?:is\s*)?((?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}))\b/i);
  if (newIndiaLabelled) return newIndiaLabelled;
  return matchGroup(text, /\b((?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}))\b/i);
}

function extractMotorLabelValue(text, labels, type = "text") {
  const stopWords = "(?:Policy|Period|RTO|Issuance|Chassis|Engine|Make|Model|Variant|Year|Type|Colour|Cubic|Seating|Seats|Customer|Invoice|Name|Registration|Geographical|Cover|IDV|Premium)";
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
      if (type === "registration" && !/\b(?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4})\b/i.test(normalized)) continue;
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
  const makeMatch = block.match(/\b(?:ASHOK\s+LEYLAND|ASHOK\s+LEYL|BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL ENFIELD|KTM|HARLEY|JAWA|BENELLI|APRILIA|KAWASAKI|BMW|DUCATI|TRIUMPH|MAHINDRA|MARUTI(?: SUZUKI)?|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)[A-Z0-9 /&.,-]{2,100}/i);
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

function splitGenericMakeModel(makeModel = "") {
  const cleaned = cleanHdfcValue(makeModel);
  if (!cleaned) return { make: "", model: "" };

  const slashParts = cleaned.split("/").map((part) => cleanHdfcValue(part)).filter(Boolean);
  if (slashParts.length >= 2) {
    return {
      make: slashParts[0],
      model: slashParts.slice(1).join(" / ")
    };
  }

  const knownMakes = [
    "ASHOK LEYLAND",
    "ASHOK LEYL",
    "MARUTI SUZUKI",
    "ROYAL ENFIELD",
    "MAHINDRA",
    "HYUNDAI",
    "BAJAJ",
    "HONDA",
    "HERO",
    "TATA",
    "TOYOTA",
    "FORD",
    "RENAULT",
    "NISSAN",
    "VOLKSWAGEN",
    "KIA",
    "MG",
    "SKODA",
    "TVS",
    "YAMAHA",
    "SUZUKI"
  ];
  const upper = cleaned.toUpperCase();
  const make = knownMakes.find((candidate) => upper === candidate || upper.startsWith(`${candidate} `));
  if (!make) return { make: "", model: "" };

  return {
    make,
    model: cleanHdfcValue(cleaned.slice(make.length))
  };
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
  const engineBeforeChassis = text.match(/(?:^|\n)\s*([A-Z0-9]{6,16})\s*\n\s*[A-Z0-9]{17}\s*(?:\n|$)/im);
  if (engineBeforeChassis?.[1] && isPlausibleEngineNumber(engineBeforeChassis[1])) {
    return engineBeforeChassis[1].trim().toUpperCase();
  }

  // New India Assurance pattern
  const newIndiaChassisEngine = text.match(/Chassis\s*no\.?\s*\/\s*Engine\s*(?:no\.?|Number)\s*:?\s*([A-Z0-9]{10,25})\s*\/\s*([A-Z0-9\n ]{5,30}?)(?=\s*(?:Type|Make|Registration|Model|Fuel|Year|$))/i);
  if (newIndiaChassisEngine?.[2]) {
    const engine = newIndiaChassisEngine[2].replace(/[\r\n\s]+/g, "").trim().toUpperCase();
    if (isPlausibleEngineNumber(engine) || /^\d{5,25}$/.test(engine)) return engine;
  }

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
        isPlausibleEngineNumber(cleaned) &&
        !/seating|capacity|chassis|registration|make|model|year|body/i.test(cleaned)
      ) {
        return cleaned;
      }
    }
  }

  return "";
}

function isPlausibleEngineNumber(value = "") {
  const cleaned = String(value || "").replace(/\s+/g, "").trim().toUpperCase();
  if (cleaned.length < 6 || cleaned.length > 25) return false;
  if (!/\d/.test(cleaned) || !/[A-Z]/.test(cleaned)) return false;
  if (/\b[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}(?:19\d{2}|20\d{2})?\b/i.test(cleaned)) return false;
  if (/^(?:BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|KIA|MG|SKODA)\b/i.test(value)) return false;
  if (/(?:PACKAGE|COMPREHENSIVE|LIABILITY|PREMIUM)/i.test(value)) return false;
  return true;
}

function extractChassisNumber(text) {
  const chassisAfterEngine = text.match(/(?:^|\n)\s*[A-Z0-9]{6,16}\s*\n\s*([A-Z0-9]{17})\s*(?:\n|$)/im);
  if (chassisAfterEngine?.[1]) {
    return chassisAfterEngine[1].trim().toUpperCase();
  }

  // New India Assurance pattern
  const newIndiaChassisEngine = text.match(/Chassis\s*no\.?\s*\/\s*Engine\s*(?:no\.?|Number)\s*:?\s*([A-Z0-9]{10,25})\s*\/\s*([A-Z0-9\n ]{5,30}?)(?=\s*(?:Type|Make|Registration|Model|Fuel|Year|$))/i);
  if (newIndiaChassisEngine?.[1]) {
    return newIndiaChassisEngine[1].trim().toUpperCase();
  }

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
        cleaned.length === 17 &&
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
  // Detect TP+OD (Comprehensive) by premium breakdown pattern FIRST (most reliable)
  const hasOwnDamagePremium = /\bOwn\s*Damage\s*Premium/i.test(text);
  const hasThirdPartyPremium = /\b(Third\s*Party|Liability)\s*Premium/i.test(text);
  if (hasOwnDamagePremium && hasThirdPartyPremium) return "Comprehensive";
  if (hasOwnDamagePremium && !hasThirdPartyPremium) return "Own Damage";
  if (hasThirdPartyPremium && !hasOwnDamagePremium) return "Third Party";

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
  if (/own damage|stand alone od|standalone od/.test(text)) return "Own Damage";
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
    /Engine\s+No/i
  ];
  let matches = 0;
  for (const pattern of signals) {
    if (pattern.test(text)) {
      matches++;
    }
  }
  return matches >= 1;
}

function isBajajIssuerDocument(text) {
  return /Bajaj\s+General\s+Insurance\s+Limited/i.test(text) ||
    /BAJAJ\s+GENERAL\s+INSURANCE\s+LIMITED/i.test(text) ||
    /careforyou@bajajgeneral\.com/i.test(text) ||
    /IRDAN113/i.test(text);
}

function extractTataInsuredName(text) {
  const patterns = [
    /Name\s*\(Registered owner of the Motor Vehicle\)\s*[:.-]?\s*([A-Z][A-Z\s]+?)(?=\s*(?:\d|Address|Contact|$))/i,
    /Name\s*([A-Z][A-Z\s]+?)(?=\s*Address)/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      let val = match[1].replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
      if (val.toUpperCase().startsWith("NAME") && val.length > 4) {
        val = val.substring(4).trim();
      }
      return val;
    }
  }
  return "";
}

function extractTataAigVehicleIdentifier(text, type) {
  const labelPattern = type === "engine"
    ? /Engine\s+Number|Motor\s+No\.?\s*\(for EV\)/i
    : /Chassis\s+No\.?/i;
  const stopPattern = /^(?:Contract|Loan|Reference|Body\s+Type|CC\/KW|Mfg\.?\s*Year|Date\s+of\s+Registration|Hire\s+Purchase|Seating\s+Capacity|Zone\s+Details|RTO\s+Location|Fuel\s+Type|Make\s*\/\s*Model|Registration\s+No)/i;
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!labelPattern.test(line)) continue;

    const inlineValue = line.replace(labelPattern, "").replace(/^[\s:/.-]+/, "").trim();
    const inlineCompact = inlineValue.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (type === "engine" && isPlausibleEngineNumber(inlineCompact)) return inlineCompact;
    if (type === "chassis" && /^[A-Z0-9]{10,25}$/i.test(inlineCompact)) return inlineCompact;

    for (let offset = 1; offset <= 4 && index + offset < lines.length; offset++) {
      const candidateLine = lines[index + offset];
      if (stopPattern.test(candidateLine)) break;
      if (/^(?:\/|NA|N\/A|NO|NUMBER|MOTOR|ENGINE|CHASSIS|MOTOR\s+NO\.?\s*\(for EV\))$/i.test(candidateLine)) continue;

      const compact = candidateLine.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      if (type === "engine" && isPlausibleEngineNumber(compact)) return compact;
      if (type === "chassis" && /^[A-Z0-9]{10,25}$/i.test(compact)) return compact;
    }
  }

  return "";
}

function extractTataAigMotor(text, _sourceFile = "") {
  if (!isTataAigMotor(text)) return { documentDetected: false };

  let rawPolicyNumber = matchGroup(text, /Policy No\.?\s*([0-9][0-9 ]{8,30})/i) ||
    matchGroup(text, /Policy Number\s*(?:is\s*)?([0-9][0-9 ]{8,30})/i);
  rawPolicyNumber = rawPolicyNumber ? String(rawPolicyNumber).replace(/\s+/g, " ").trim() : "";
  const policyNumber = rawPolicyNumber;

  const insuredName = extractTataInsuredName(text);
  const startDateRaw = matchGroup(text, /Own Damage Cover\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(text, /TP Cover Period\s*[:.-]?\s*(\d{2}\/\d{2}\/\d{4})/i) || "";
  const expiryDateRaw = matchGroup(text, /Own Damage Cover\s*\d{2}\/\d{2}\/\d{4}[^\n]*?(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(text, /TP Cover Period\s*[:.-]?\s*\d{2}\/\d{2}\/\d{4}[^\n]*?to\s*(\d{2}\/\d{2}\/\d{4})/i) || "";
  const startDate = normalizeTataDate(startDateRaw);
  const expiryDate = normalizeTataDate(expiryDateRaw);

  const registrationMatch = matchGroup(text, /Registration No\.?\s*([A-Z]{2}\s?\d{2}\s?[A-Z]{1,3}\s?\d{4})/i) || matchGroup(text, /Registration No\.?\s*([A-Z0-9-\s]{6,20})/i);
  const registrationNumber = registrationMatch ? String(registrationMatch).toUpperCase().replace(/\s+/g, "") : "";
  const makeModelMatch = text.match(/Make\s*\/\s*Model\s*\/[\s\S]*?Variant\s*\n?\s*([^\n]+)/i);
  let rawMakeModel = makeModelMatch?.[1] ? cleanHdfcValue(makeModelMatch[1]) : "";
  rawMakeModel = rawMakeModel.replace(/\s*\/\s*/g, " / ");

  const parts = rawMakeModel.split("/").map(p => p.trim()).filter(Boolean);
  let make = "";
  let model = "";
  let variant = "";

  if (parts.length >= 3) {
    make = parts[0];
    model = parts[1];
    variant = parts[2];
  } else if (parts.length === 2) {
    make = parts[0];
    model = parts[1];
  } else if (parts.length === 1 && parts[0]) {
    const rawVal = parts[0];
    const knownMakes = ["MARUTI SUZUKI", "MARUTI", "HYUNDAI", "HONDA", "TATA", "MAHINDRA", "TOYOTA", "FORD", "RENAULT", "NISSAN", "VOLKSWAGEN", "KIA", "MG", "SKODA"];
    let foundMake = "";
    for (const km of knownMakes) {
      if (rawVal.toUpperCase().startsWith(km)) {
        foundMake = km;
        break;
      }
    }
    if (foundMake) {
      make = foundMake;
      const rest = rawVal.substring(foundMake.length).trim();
      const restParts = rest.split(/\s+/);
      model = restParts[0] || "";
      variant = restParts.slice(1).join(" ") || "";
    } else {
      make = rawVal;
    }
  }

  const makeModel = [make, model].filter(Boolean).join(" ");

  const rawEngine =
    matchGroup(text, /Engine Number\s*\/\s*Motor No\.?\s*\(for EV\)\s*\n?\s*([A-Z0-9-]{3,25})/i) ||
    matchGroup(text, /Engine Number\s*[:.-]?\s*([A-Z0-9-]{3,25})/i) ||
    matchGroup(text, /Motor No\.\s*\(for EV\)\s*\n?\s*([A-Z0-9-]{3,25})/i) ||
    extractTataAigVehicleIdentifier(text, "engine") ||
    "";
  const engineNumber = rawEngine ? String(rawEngine).toUpperCase().replace(/[^A-Z0-9]/g, "") : "";

  const rawChassis =
    matchGroup(text, /Chassis\s*No\.?\s*[:.-]?\s*([A-Z0-9-]{10,25})/i) ||
    matchGroup(text, /Chassis\s*No\s*\n\s*([A-Z0-9-]{10,25})/i) ||
    extractTataAigVehicleIdentifier(text, "chassis") ||
    "";
  const chassisNumber = rawChassis ? String(rawChassis).toUpperCase().replace(/[^A-Z0-9]/g, "") : "";

  const fuelType = normalizeFuelType(matchGroup(text, /Fuel Type\s*([A-Z ]{3,20})/i));
  const cubicCapacity = matchGroup(text, /CC\s*[/]\s*KW\s*([0-9]+)/i);
  const manufacturingYear = matchGroup(text, /Mfg\.\s*Year\s*([0-9]{4})/i);
  const registrationDate = matchGroup(text, /Date of Registration\s*([0-9/]{8,10})/i);
  const seatingCapacity = matchGroup(text, /Seating Capacity\s*\(Including Driver\)\s*\n?\s*([0-9]+)/i);

  const rawPremium = matchGroup(text, /Premium Amount\s*\(Including GST\)\s*₹?\s*([0-9]+)/i) ||
    matchGroup(text, /Total Policy Premium\s*₹?\s*([0-9.]+)/i);
  const premium = rawPremium ? normalizeAmount(rawPremium) : "";

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
      mathematicallyValidated: (parseInt(totalIdv, 10) >= parseInt(idv, 10))
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
            derivedTotalIdv: totalIdv
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

  const nominee = matchGroup(text, /Name of the Nominee\s*:\s*([A-Za-z ]+)/i) ||
    (text.includes("LEGAL HEIR") ? "LEGAL HEIR" : "");

  const financer = matchGroup(text, /Hire Purchase\s*\/\s*Hypothecation\s*\/\s*Lease\s*with\s*([A-Z0-9 .,&/-]+)/i) ||
    matchGroup(text, /Hypothecation\s*\/\s*Lease\s*with\s*\n?\s*([A-Za-z0-9 ]+)/i);
  const rtoLocation = matchGroup(text, /RTO Location\s*([A-Za-z0-9 ]+)/i);
  const zone = matchGroup(text, /\bZone\s*([A-Z])\b/i);
  const geographicalArea = matchGroup(text, /Geographical Area\s*([A-Za-z ]+)/i);
  const bodyType = matchGroup(text, /Body Type\s*([A-Z ]+?)(?=CC\/KW|Mfg\.|Date|Hire|Seating|\n|$)/i);
  const contractLoanReference = matchGroup(text, /Contract\s*\/\s*Loan\s*\/\s*Reference No\.?\s*([A-Z0-9/-]+)/i);

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
  const netOwnDamagePremium = normalizeAmount(matchGroup(text, /Total Own Damage Premium\s*\(A\)\s*₹?\s*([0-9,.]+)/i));
  const netLiabilityPremium = normalizeAmount(matchGroup(text, /Total Liability Premium\s*\(B\)\s*₹?\s*([0-9,.]+)/i));
  const netPremium = normalizeAmount(matchGroup(text, /Net Premium\s*\(A\+B\+C(?:\+D)?\)\s*₹?\s*([0-9,.]+)/i));
  const totalPackagePremium = premium;

  const sgst = matchGroup(text, /SGST\/UGST\s*@\s*\d+%\s*₹?\s*([0-9,.]+)/i);
  const cgst = matchGroup(text, /CGST\s*@\s*\d+%\s*₹?\s*([0-9,.]+)/i);
  let gstAmount = "";
  if (sgst || cgst) {
    const sVal = parseFloat(sgst.replace(/,/g, "")) || 0;
    const cVal = parseFloat(cgst.replace(/,/g, "")) || 0;
    if (sVal || cVal) {
      gstAmount = normalizeAmount(String(sVal + cVal));
    }
  }

  let zeroDepreciationCover = "";
  const zeroDepMatch = text.match(/(?:Depreciation Reimbursement|Zero Depreciation)[\s\S]{0,100}?₹\s*([0-9,.]+)/i);
  if (zeroDepMatch) {
    zeroDepreciationCover = normalizeAmount(zeroDepMatch[1]);
  }

  let previousPolicyNumber = "";
  const prevPolicyMatch = text.match(/Previous Insurance Details:[\s\S]{0,400}?Policy Number:\s*([A-Za-z0-9/-]+)/i);
  if (prevPolicyMatch) {
    previousPolicyNumber = prevPolicyMatch[1].trim();
  }

  let previousInsurer = "";
  const prevInsurerMatch = text.match(/Previous Insurance Details:[\s\S]{0,400}?Name of the Insurer:\s*([A-Za-z0-9 .,&-]+?)(?:\r?\n|$)/i);
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
    text.match(/Nomination Details:[\s\S]{0,260}?Relationship with\s*Nominee\s*([A-Z ]+?)(\d{1,3})NA([A-Za-z ]+?)(?=Drivers Clause|$)/i);
  const nomineeName = nomineeMatch?.[1]?.trim() || nominee;
  const nomineeAge = nomineeMatch?.[2]?.trim() || "";
  const nomineeRelationship = nomineeMatch?.[3]?.trim() || "";
  const compulsoryDeductible = normalizeAmount(matchGroup(text, /Compulsory Deductible:\s*₹?\s*([0-9,.]+)/i));
  const voluntaryDeductible = normalizeAmount(matchGroup(text, /Voluntary Deductible:\s*₹?\s*([0-9,.]+)/i));
  const claimsCovered = matchGroup(text, /No\.?\s*of Claims\s*Covered Under\s*Depreciation\s*Reimbursement\s*([0-9]+)/i);

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
    companyName: "TATA AIG",
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
    policyCoverType: "Package",
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
    netLiabilityPremium,
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
        /Auto\s*Secure/i.test(text) ? "Auto Secure" : null
      ].filter(Boolean),
      idvReconstruction,
      confidence: {
        policyNumber: policyNumber ? 0.95 : 0,
        insuredName: insuredName ? 0.9 : 0,
        chassisNumber: chassisNumber ? 0.98 : 0,
        engineNumber: engineNumber ? 0.98 : 0
      }
    }
  };
}

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
        debug: { rawString: row, parsedAs: "dense-idv-total-column", totalWidth: width }
      });
    }
  }

  const best = candidates
    .filter((candidate) => Number(candidate.totalIdv) > 0)
    .sort((a, b) => b.totalIdv.length - a.totalIdv.length)[0];
  if (!best) return { totalIdv: "", vehicleIdv: "", accessoriesIdv: "", debug: { rawString: row, parsedAs: "unparsed" } };

  return best;
}

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

function normalizeFuelType(fuel) {
  const f = String(fuel || "").trim().toUpperCase();
  if (/PETROL|GASOLINE/.test(f)) return "PETROL";
  if (/DIESEL/.test(f)) return "DIESEL";
  if (/CNG/.test(f)) return "CNG";
  if (/ELECTRIC|EV|BEV/.test(f)) return "EV";
  if (/HYBRID/.test(f)) return "HYBRID";
  return f;
}

function isBajajAllianzMotor(text) {
  const hasBajajCompanyMarker =
    /Bajaj\s+Allianz/i.test(text) ||
    /Bajaj\s+General\s+Insurance/i.test(text) ||
    /careforyou@bajajgeneral\.com/i.test(text);

  if (!hasBajajCompanyMarker) return false;

  const signals = [
    /Private\s*Car\s*Package\s*Policy/i,
    /Certificate\s*of\s*Insurance/i,
    /Policy\s*Number\s*[:.-]?\s*OG-/i,
    /IRDAN113/i
  ];
  let matches = 0;
  for (const pattern of signals) {
    if (pattern.test(text)) {
      matches++;
    }
  }
  return matches >= 1;
}

function normalizeBajajDate(dateStr) {
  if (!dateStr) return "";
  const cleaned = dateStr.replace(/[^a-zA-Z0-9-]/g, "").trim();
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    let day = parts[0].trim().padStart(2, "0");
    let monthName = parts[1].trim().toUpperCase();
    let year = parts[2].trim();
    const months = {
      JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
      JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
    };
    const month = months[monthName] || monthName;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

function extractBajajMakeModel(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const knownMakes = ["MARUTI", "HYUNDAI", "TATA", "MAHINDRA", "TOYOTA", "FORD", "RENAULT", "NISSAN", "VOLKSWAGEN", "KIA", "MG", "SKODA", "HONDA", "BAJAJ", "HERO", "TVS", "YAMAHA", "SUZUKI", "ROYAL ENFIELD"];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();
    
    if (upper.includes("INSURANCE") || upper.includes("FORMERLY KNOWN AS") || upper.includes("REGISTERED AND HEAD OFFICE") || upper.includes("CORPORATE IDENTITY NUMBER") || upper.includes("PROPOSAL")) {
      continue;
    }
    
    const make = knownMakes.find(m => upper.startsWith(m));
    if (make) {
      let collected = [line];
      let j = i + 1;
      while (j < lines.length && j < i + 5) {
        const nextLine = lines[j];
        if (/NCB|Premium|Policy|Period|Limit|Address|Customer|Compulsory/i.test(nextLine)) break;
        if (/^\d{3,4}$/.test(nextLine)) break;
        if (/^\d{1,2}$/.test(nextLine)) break;
        if (/^\d{4}$/.test(nextLine)) break;
        if (/^\d+,\d+/.test(nextLine)) break;
        if (/\b(?:Petrol|Diesel|CNG|EV|Electric)\b/i.test(nextLine)) break;
        
        if (knownMakes.some(m => nextLine.toUpperCase().startsWith(m))) break;
        if (/^[A-Z]{2}\d{2}/i.test(nextLine)) break;
        
        if (/^\d+\.\d+/.test(nextLine)) break;
        
        collected.push(nextLine);
        j++;
      }
      const full = collected.join(" ").replace(/\s+/g, " ").replace(/\s*-\s*/g, " - ").trim();
      return full;
    }
  }
  return "";
}

function extractBajajAllianzMotor(text, _sourceFile = "") {
  if (!isBajajAllianzMotor(text)) return { documentDetected: false };

  const policyNumber = (
    matchGroup(text, /(OG-\d{2}-\d{4}-\d{4}-\d{8})/i) ||
    matchGroup(text, /Policy\s*Number\s*[:.-]?\s*(OG-[0-9a-zA-Z/-]+)/i) ||
    matchGroup(text, /PolicyNumber\s*[:.-]?\s*(OG-[0-9a-zA-Z/-]+)/i)
  );

  const insuredName = (
    matchGroup(text, /Insured\s*Name\s*[:.-]?\s*([A-Z\s]+?)(?:Insured|Address|\n|$)/i) ||
    matchGroup(text, /Proposer\s*Name\s*[:.-]?\s*([A-Z\s]+?)(?:Address|\n|$)/i) ||
    matchGroup(text, /Dear\s+([A-Z\s]+?),/i)
  ).replace(/\s+/g, " ").trim();

  const startDateRaw = matchGroup(text, /From\s*:\s*(\d{1,2}-[A-Z]{3}-\d{4})/i) ||
                       matchGroup(text, /From\s+(\d{1,2}-[A-Z]{3}-\d{4})/i) ||
                       matchGroup(text, /on\s+(\d{1,2}-[A-Z]{3}-\d{4})/i);
  const expiryDateRaw = matchGroup(text, /To\s*:\s*(\d{1,2}-[A-Z]{3}-\d{4})/i) ||
                        matchGroup(text, /To\s+(\d{1,2}-[A-Z]{3}-\d{4})/i) ||
                        matchGroup(text, /on\s+(\d{1,2}-[A-Z]{3}-\d{4})/i);

  const startDate = normalizeBajajDate(startDateRaw);
  const expiryDate = normalizeBajajDate(expiryDateRaw);

  const registrationNumber = (
    matchGroup(text, /Registration\s+Number\s*\n\s*Place[^\n]*\n\s*([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})/i) ||
    matchGroup(text, /([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})/i)
  ).toUpperCase().replace(/\s+/g, "");

  const makeModel = extractBajajMakeModel(text);
  const makeParts = makeModel.split("-").map(p => p.trim()).filter(Boolean);
  const make = makeParts[0] || "";
  const model = makeParts.slice(1).join(" - ") || "";

  const variant = matchGroup(text, /SubType\s*\n\s*([A-Z0-9 ./-]+)/i) ||
                  matchGroup(text, /Vehicle\s*Sub\s*Type\s*\n\s*([A-Z0-9 ./-]+)/i) ||
                  "";

  let engineNumber = "";
  let chassisNumber = "";
  const engineChassisMatch = text.match(/Engine NumberChassis Number[\s\S]*?\n\s*([A-Z0-9]+)\s*\n\s*([A-Z0-9]+)\s*\n\s*(?:\d)/i);
  if (engineChassisMatch) {
    const combined = (engineChassisMatch[1] + engineChassisMatch[2]).replace(/\s+/g, "").toUpperCase();
    chassisNumber = combined.slice(-17);
    engineNumber = combined.slice(0, -17);
  }

  let cubicCapacity = "";
  let fuelType = "";
  let manufacturingYear = "";
  let seatingCapacity = "";

  const concatRowMatch = text.match(/(\d{3,4})\s*(Petrol|Diesel|CNG|Electric|EV|LPG|Hybrid)\s*(\d{4})\s*(\d{1,2})/i);
  if (concatRowMatch) {
    cubicCapacity = concatRowMatch[1];
    fuelType = normalizeFuelType(concatRowMatch[2]);
    manufacturingYear = concatRowMatch[3];
    seatingCapacity = concatRowMatch[4];
  } else {
    const valueMatch = text.replace(/\s+/g, "").match(/(-45|-[0-9]{2})(\d{3,4})(\d)(\d{4})/);
    if (valueMatch) {
      cubicCapacity = valueMatch[2];
      seatingCapacity = valueMatch[3];
      manufacturingYear = valueMatch[4];
    }
  }

  const idv = normalizeAmount(
    matchGroup(text, /Total Value[\s\S]{0,100}?([0-9,]+\.\d{2})/i) ||
    matchGroup(text, /Total IDV[\s\S]{0,100}?([0-9,]+\.\d{2})/i)
  );

  const odPremium = normalizeAmount(
    matchGroup(text, /Total OD Premium\s*-\s*A\s*([0-9,.]+)/i) ||
    matchGroup(text, /Own Damage Premium\s*([0-9,.]+)/i)
  );

  const netPremium = normalizeAmount(
    matchGroup(text, /Total Premium\s*\(Net Premium\)\s*\(A\+B\)\s*([0-9,.]+)/i) ||
    matchGroup(text, /Net Premium\s*\(A\+B\)\s*([0-9,.]+)/i)
  );

  const tpDriverOwner = normalizeAmount(
    matchGroup(text, /Total Act Premium\s*-\s*B\s*([0-9,.]+)/i)
  );

  const totalPremium = normalizeAmount(
    matchGroup(text, /Final Premium[\s\S]{0,150}?\b([0-9,]+\.\d{2})/i) ||
    matchGroup(text, /Total Amount\s*(?:Rs\.?)?\s*([0-9,.]+)/i)
  );

  const sgst = matchGroup(text, /State GST\s*\(\d+%\)\s*([0-9,.]+)/i);
  const cgst = matchGroup(text, /Central GST\s*\(\d+%\)\s*([0-9,.]+)/i);
  let gstAmount = "";
  if (sgst && cgst) {
    gstAmount = (parseFloat(sgst.replace(/,/g, "")) + parseFloat(cgst.replace(/,/g, ""))).toFixed(2);
  }

  const rtoLocation = matchGroup(text, /NameofRegistrationAuthority:\s*([A-Z0-9 -]+)/i) || "";
  const customerMobile = matchGroup(text, /Proposer Mobile Number\s*[:.-]?\s*([0-9*]+)/i);
  const customerEmail = matchGroup(text, /Proposer e-mail id\s*[:.-]?\s*([a-zA-Z0-9*._%+-]+@[a-zA-Z0-9*.-]+\.[a-zA-Z]{2,})/i);

  const previousPolicyNumber = matchGroup(text, /Previous Policy Expiry Date[\s\S]{0,20}?Previous Policy No\s*:\s*([A-Z0-9]+)/i) ||
                               matchGroup(text, /Previous Policy\s*No\s*(?:\n\s*No\s*)?[:.-]?\s*([A-Z0-9]+)/i);

  const previousInsurer = matchGroup(text, /Insurance Provider\s*:\s*([A-Za-z0-9 .,&-]+?)(?:\r?\n|$)/i);
  const nomineeName = matchGroup(text, /Nominee Details[\s\S]{0,100}?Name\s*:\s*([A-Za-z\s]+?)(?=\s*-|\s*Relationship|$)/i).replace(/\s+/g, " ").trim();
  const gstin = matchGroup(text, /Company GST\s*No[\s\S]{0,20}?\n\s*([A-Z0-9]{15})/i) ||
                matchGroup(text, /Company GST\s*No\s*([A-Z0-9]{15})/i);

  let ncbPercentage = matchGroup(text, /NCB\s*\(No\s*Claim\s*Bonus\)[\s\S]{0,200}?([0-9-]+)\s*%/i);
  if (ncbPercentage) {
    ncbPercentage = ncbPercentage.replace(/[^0-9]/g, "") + "%";
  }

  return {
    documentDetected: true,
    companyName: /Bajaj\s+General\s+Insurance\s+Limited/i.test(text)
      ? "Bajaj General Insurance Limited"
      : "Bajaj Allianz General Insurance Company Limited",
    policyNumber,
    insuredName,
    policyType: "Private Car Package Policy",
    policyStartDate: startDate,
    policyEndDate: expiryDate,
    registrationNumber,
    vehicleMake: make,
    vehicleModel: model,
    makeModel,
    variant,
    engineNumber,
    chassisNumber,
    fuelType,
    cubicCapacity,
    manufacturingYear,
    seatingCapacity,
    idv,
    totalPremium,
    netPremium,
    odPremium,
    tpDriverOwner,
    gstAmount,
    rtoLocation,
    customerMobile,
    customerEmail,
    previousPolicyNumber,
    previousInsurer,
    nomineeName,
    gstin,
    ncbPercentage,
    policyCoverType: "Package"
  };
}

function isGoDigitMotor(text) {
  const hasGoDigitCompanyMarker =
    /Go\s+Digit/i.test(text) ||
    /godigit\.com/i.test(text) ||
    /hello@godigit\.com/i.test(text);

  if (!hasGoDigitCompanyMarker) return false;

  const signals = [
    /Digit\s+Private[- ]Car/i,
    /IRDAN158/i,
    /Own\s+Damage\s+Policy/i
  ];
  let matches = 0;
  for (const pattern of signals) {
    if (pattern.test(text)) {
      matches++;
    }
  }
  return matches >= 1;
}

function normalizeGoDigitDate(dateStr) {
  if (!dateStr) return "";
  const cleaned = dateStr.replace(/[^a-zA-Z0-9-]/g, "").trim();
  
  // YYYY-MM-DD format
  const ymdMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
  }

  // DD-MonthName-YYYY format (e.g. 30-May-2026)
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    let day = parts[0].trim().padStart(2, "0");
    let monthName = parts[1].trim().toUpperCase();
    let year = parts[2].trim();
    const months = {
      JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
      JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
    };
    const month = months[monthName] || monthName;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

function extractGoDigitMotor(text, _sourceFile = "") {
  if (!isGoDigitMotor(text)) return { documentDetected: false };

  const companyName = matchGroup(text, /(Go\s+Digit\s+General\s+Insurance\s+Ltd\.)/i) || "Go Digit General Insurance Ltd.";

  // Insured Name
  const nameMatch = text.match(/Name\s*([A-Za-z\s]+?)\s*Vehicle\s+Registration/i);
  const insuredName = nameMatch ? nameMatch[1].trim() : "";

  // Policy Number: IA followed by 9 digits
  const policyNumber = matchGroup(text, /\b(IA\d{9})\b/i);

  // Policy Type
  const policyType = matchGroup(text, /(Digit\s+Private[- ]Car\s+Stand-alone\s+Own\s+Damage\s+Policy)/i) || "Digit Private Car Stand-alone Own Damage Policy";

  // Period of policy dates
  let policyStartDate = "";
  let policyEndDate = "";
  const footerDatesMatch = text.match(/(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})/);
  if (footerDatesMatch) {
    policyStartDate = normalizeGoDigitDate(footerDatesMatch[1]);
    policyEndDate = normalizeGoDigitDate(footerDatesMatch[2]);
  } else {
    const periodBlock = sliceText(text, /Period of Policy/i, /AddOn Cover/i) || text;
    const dates = [];
    const dateRegex = /\b(\d{1,2}-[A-Za-z]{3}-\d{4})\b/g;
    let m;
    while ((m = dateRegex.exec(periodBlock)) !== null) {
      dates.push(m[1]);
    }
    if (dates.length >= 2) {
      policyStartDate = normalizeGoDigitDate(dates[0]);
      policyEndDate = normalizeGoDigitDate(dates[1]);
    }
  }

  // Registration Number / Vehicle Number
  const regMatch = text.match(/Vehicle\s*Registration\s*No\.?\s*([A-Z0-9 \t-]+)/i);
  const registrationNumber = regMatch ? regMatch[1].replace(/\s+/g, "").toUpperCase() : "";

  // Make Model & Variant
  let makeModel = "";
  let vehicleMake = "";
  let vehicleModel = "";
  const footerVehicleMatch = text.match(/\b([A-Z]{2}\d{2}[A-Z0-9]{5,6})\s+([A-Z0-9\s-]+?)\s+\d{4}-\d{2}-\d{2}/i);
  if (footerVehicleMatch) {
    makeModel = footerVehicleMatch[2].trim();
    const parts = makeModel.split(/\s+/);
    vehicleMake = parts[0] || "";
    vehicleModel = parts.slice(1).join(" ") || "";
  }

  let variant = "";
  const modelVariantMatch = text.match(/Model\/Vehicle\s+Variant[\s\S]*?Type\)\s*\r?\n?\s*([^\n]+?)(?=CNG\/LPG|$)/i);
  if (modelVariantMatch) {
    const fullVal = modelVariantMatch[1].trim();
    const slashIdx = fullVal.indexOf("/");
    if (slashIdx !== -1) {
      variant = fullVal.substring(slashIdx + 1).trim();
    } else {
      variant = fullVal;
    }
  }

  // Manufacturing Year & Registration Date
  let manufacturingYear = "";
  let registrationDate = "";
  const yearMatch = text.match(/Year\s+of\s+Regn\/Year\s+of\s+Mfg\.?\s*([0-9-]+)\/([0-9-]+)/i);
  if (yearMatch) {
    const p1 = yearMatch[1].trim();
    const p2 = yearMatch[2].trim();
    if (/^\d{4}$/.test(p1)) {
      manufacturingYear = p1;
      registrationDate = p2;
    } else if (/^\d{4}$/.test(p2)) {
      manufacturingYear = p2;
      registrationDate = p1;
    } else {
      manufacturingYear = p1;
      registrationDate = p2;
    }
  }

  // Engine Number & Chassis Number
  const engineMatch = text.match(/Engine\s+No\.?\s*([A-Z0-9]+)/i);
  const engineNumber = engineMatch ? engineMatch[1].trim().toUpperCase() : "";

  const chassisMatch = text.match(/Chassis\s+No\.?\s*([A-Z0-9]+)/i);
  const chassisNumber = chassisMatch ? chassisMatch[1].trim().toUpperCase() : "";

  // Seating Capacity
  const seatingMatch = text.match(/Seating\s+Capacity\s*(\d+)/i);
  const seatingCapacity = seatingMatch ? seatingMatch[1] : "";

  // RTO Location
  const rtoMatch = text.match(/RTO\s+Location\s*\r?\n?\s*([A-Za-z\s,.-]+?)(?=\r?\n|$|Vehicle)/i);
  const rtoLocation = rtoMatch ? rtoMatch[1].trim() : "";

  // Fuel Type & Cubic Capacity
  const fuelType = normalizeFuelType(matchGroup(text, /Fuel\s+Type\s*([A-Za-z]+)/i));
  const ccMatch = text.match(/Cubic\s+Capacity\s*(\d+)/i);
  const cubicCapacity = ccMatch ? ccMatch[1].trim() : "";

  // IDVs
  const idv = normalizeAmount(
    matchGroup(text, /Total\s+IDV[\s\S]{0,20}?([0-9,]+\.\d{2})/i) ||
    matchGroup(text, /Vehicle\s+IDV[\s\S]{0,20}?([0-9,]+)/i)
  );
  const totalIdv = idv;

  // Premiums
  const lines = text.split('\n').map(l => l.trim());
  const netPremiumIdx = lines.findIndex(l => /^Net\s+Premium$/i.test(l));
  let netPremium = "";
  let totalPremium = "";
  let odPremium = "";
  let gstAmount = "";

  if (netPremiumIdx !== -1) {
    const decimalNumbers = [];
    for (let i = netPremiumIdx - 1; i >= 0 && decimalNumbers.length < 8; i--) {
      const line = lines[i];
      const match = line.match(/^([0-9,]+\.\d{2})$/);
      if (match) {
        decimalNumbers.push(match[1]);
      }
    }
    if (decimalNumbers.length >= 3) {
      netPremium = decimalNumbers[0];
      odPremium = decimalNumbers[1];
      totalPremium = decimalNumbers[2];
    }
    if (decimalNumbers.length >= 5) {
      gstAmount = decimalNumbers[4];
    }
  }

  // CGST & SGST
  const cgstMatch = text.match(/CGST\s*@\s*\d+%\s*=\s*(?:\([^0-9]*([0-9.]+)\)|([0-9.]+))/i);
  const cgst = cgstMatch ? normalizeAmount(cgstMatch[1] || cgstMatch[2]) : "";

  const sgstMatch = text.match(/SGST(?:\/UTGST)?\s*@\s*\d+%\s*=\s*(?:\([^0-9]*([0-9.]+)\)|([0-9.]+))/i);
  const sgst = sgstMatch ? normalizeAmount(sgstMatch[1] || sgstMatch[2]) : "";

  // TP + Driver + Owner Premium
  const tpDriverOwner = "0.00";

  // NCB Percentage
  let ncbPercentage = "";
  const ncbMatch = text.match(/NCB\s*%\s*\(Current\s+Policy\)[\s\S]{0,500}?(\d+)\s*%/i);
  if (ncbMatch) {
    ncbPercentage = ncbMatch[1] + "%";
  }

  // Cover Type
  const policyCoverType = "Own Damage";

  // Others for completeness
  const gstinMatch = text.match(/GST\s+Reg\s+No\s+([A-Z0-9]+)/i);
  const gstin = gstinMatch ? gstinMatch[1].trim() : "";
  const customerMobile = matchGroup(text, /Mobile\s*\r?\n?\s*([0-9Xx*]+)/i);
  const customerEmail = matchGroup(text, /Email\s*\r?\n?\s*([a-zA-Z0-9*._%+-]+@[a-zA-Z0-9*.-]+\.[a-zA-Z]{2,})/i);

  return {
    documentDetected: true,
    companyName,
    policyNumber,
    insuredName,
    policyType,
    policyStartDate,
    policyEndDate,
    registrationNumber,
    vehicleMake,
    vehicleModel,
    makeModel,
    variant,
    engineNumber,
    chassisNumber,
    fuelType,
    cubicCapacity,
    manufacturingYear,
    registrationDate,
    seatingCapacity,
    idv,
    totalIdv,
    totalPremium,
    netPremium,
    odPremium,
    tpDriverOwner,
    gstAmount,
    cgst,
    sgst,
    rtoLocation,
    customerMobile,
    customerEmail,
    gstin,
    ncbPercentage,
    policyCoverType
  };
}

module.exports = {
  extractPolicyFromPdf,
  extractPolicyFromText
};
