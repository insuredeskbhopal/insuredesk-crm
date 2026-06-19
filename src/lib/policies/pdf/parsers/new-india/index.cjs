
const { cleanHdfcValue, sliceText } = require("../../utils/text.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { normalizeFuelType, normalizeRegistrationDisplay, cleanVehicleCode, extractMotorVehicleBlock } = require("../../utils/motor.cjs");
const { normalizeAmount, diffAmounts } = require("../../utils/amounts.cjs");
const { extractIDV } = require("../generic/index.cjs");

// Start of isNewIndiaFinalData (Lines 1458-1464)
function isNewIndiaFinalData(data = {}) {
  return (
    isNewIndiaAssuranceText(data.sourceText || "") ||
    /NEW_INDIA/i.test(data.documentFormat || "") ||
    /\bNew\s+India\s+Assurance\b/i.test(data.insuranceCompany || data.companyName || "")
  );
}

// Start of finalizeNewIndiaMotorFields (Lines 1466-1501)
function finalizeNewIndiaMotorFields(data = {}) {
  const sourceText = data.sourceText || "";
  const premiumSchedule = extractNewIndiaPremiumSchedule(sourceText);

  if (premiumSchedule.totalPremium) {
    data.premium = premiumSchedule.totalPremium;
    data.totalPremium = premiumSchedule.totalPremium;
  }
  if (premiumSchedule.netPremium) data.netPremium = premiumSchedule.netPremium;
  if (premiumSchedule.odPremium) {
    data.odPremium = premiumSchedule.odPremium;
    data.netOwnDamagePremium = premiumSchedule.odPremium;
  }
  if (premiumSchedule.tpDriverOwner) {
    data.tpDriverOwner = premiumSchedule.tpDriverOwner;
    data.netLiabilityPremium = premiumSchedule.tpDriverOwner;
  }
  if (premiumSchedule.gstAmount) data.gstAmount = premiumSchedule.gstAmount;
  if (premiumSchedule.basicOwnDamage) data.basicOwnDamage = premiumSchedule.basicOwnDamage;
  if (premiumSchedule.basicThirdPartyLiability)
    data.basicThirdPartyLiability = premiumSchedule.basicThirdPartyLiability;
  if (premiumSchedule.zeroDepreciationCover)
    data.zeroDepreciationCover = premiumSchedule.zeroDepreciationCover;
  if (premiumSchedule.ncbPercentage) {
    data.ncb = premiumSchedule.ncbPercentage;
    data.ncbPercentage = premiumSchedule.ncbPercentage;
  }

  if (
    /Standalone\s+Motor\s+Own\s+Damage|Stand[-\s]*alone\s+Own\s+Damage|Own\s+Damage\s+Policy/i.test(
      data.policyType || sourceText,
    )
  ) {
    data.policyCoverType = "Own Damage";
  }
}

// Start of isNewIndiaAssuranceText (Lines 3956-3961)
function isNewIndiaAssuranceText(text = "") {
  return (
    /\bTHE\s+NEW\s+INDIA\s+ASSURANCE\s+CO\.?\s+LTD\.?\b/i.test(text) ||
    /\bNew\s+India\s+Assurance\b/i.test(text)
  );
}

// Start of detectNewIndiaPolicyFamily (Lines 3963-3987)
function detectNewIndiaPolicyFamily(text = "") {
  const type =
    matchGroup(
      text,
      /POLICY\s+SCHEDULE\s+CUM\s+CERTIFICATE\s+OF\s+INSURANCE\s+([\s\S]{0,120}?)\s+UIN\s+Number/i,
    ) ||
    matchGroup(
      text,
      /(Private Car Package Policy\s*-\s*Enhanced Covers|Commercial Vehicle Package Policy Enhanced Covers|Standalone Motor Own Damage Policy for Two Wheelers\s*-\s*Enhanced Covers|Two Wheeler Enhancement Cover Policy|Commercial Vehicle Package Policy|Commercial Vehicle Liability Only Policy|Private Car Liability Policy|Two Wheeler Liability Only Policy|Two Wheeler Package Policy|Private Car Package Policy)/i,
    ) ||
    "";

  const normalized = cleanHdfcValue(type);

  return {
    rawPolicyType: normalized,
    isCommercial: /Commercial Vehicle/i.test(normalized),
    isTwoWheeler: /Two Wheeler|Two Wheelers/i.test(normalized),
    isPrivateCar: /Private Car/i.test(normalized),
    isLiabilityOnly: /Liability Only|Liability Policy/i.test(normalized),
    isPackage: /Package/i.test(normalized),
    isEnhanced: /Enhanced|Enhancement/i.test(normalized),
    isOwnDamageOnly: /Own Damage/i.test(normalized),
  };
}

// Start of cleanNewIndiaPolicyType (Lines 3995-4001)
function cleanNewIndiaPolicyType(value = "") {
  return cleanHdfcValue(value)
    .replace(/\s*-\s*Enhanced Covers?\b/i, "")
    .replace(/\s+Enhanced Covers?\b/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Start of normalizeNewIndiaFuelType (Lines 4003-4009)
function normalizeNewIndiaFuelType(fuel = "") {
  const normalized = normalizeFuelType(fuel);
  if (normalized === "PETROL") return "Petrol";
  if (normalized === "DIESEL") return "Diesel";
  if (normalized === "HYBRID") return "Hybrid";
  return normalized;
}

// Start of extractNewIndiaMotorDetails (Lines 4011-4183)
function extractNewIndiaMotorDetails(text = "") {
  const result = {
    documentDetected: false,
    companyName: "",
    policyType: "",
    policyNumber: "",
    insuredName: "",
    customerId: "",
    insuredAddress: "",
    customerMobile: "",
    customerEmail: "",
    gstin: "",
    policyStartDate: "",
    policyEndDate: "",
    receiptNumber: "",
    previousInsurer: "",
    previousPolicyNumber: "",
    registrationNumber: "",
    chassisNumber: "",
    engineNumber: "",
    makeModel: "",
    vehicleMake: "",
    vehicleModel: "",
    variant: "",
    manufacturingYear: "",
    fuelType: "",
    bodyType: "",
    cubicCapacity: "",
    seatingCapacity: "",
    grossVehicleWeight: "",
    commercialVehicleType: "",
    commercialVehicleSubType: "",
    rtoLocation: "",
    financerName: "",
    totalIdv: "",
    idv: "",
    enhancedCovers: {},
    policyFamily: {},
  };

  if (!isNewIndiaAssuranceText(text)) return result;

  result.documentDetected = true;
  result.companyName = "The New India Assurance Company Limited";
  result.policyFamily = detectNewIndiaPolicyFamily(text);
  result.policyType = cleanNewIndiaPolicyType(result.policyFamily.rawPolicyType) || "Motor Policy";
  result.policyNumber =
    matchGroup(text, /Policy\s+Number\s*:?\s*(\d{10,})/i) ||
    matchGroup(text, /Policy\s+No\.?\s*:?\s*(\d{10,})/i);
  result.insuredName = cleanHdfcValue(matchGroup(text, /Insured'?s?\s+Name\s+(.+?)\s+Customer\s+ID/i));
  result.customerId = matchGroup(text, /Customer\s+ID\s+([A-Z0-9]+)/i);
  result.insuredAddress = cleanHdfcValue(
    matchGroup(text, /Insured'?s?\s+Address\s+([\s\S]+?)\s+Contact\s+Number/i),
  );
  result.customerMobile = matchGroup(text, /Contact\s+Number\s*\/\s*\/\s*([X\d]{6,14})/i);
  result.customerEmail = cleanHdfcValue(matchGroup(text, /Email\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i));
  result.gstin = matchGroup(text, /GSTIN\s+([0-9A-Z]{15}|NA)/i);

  const period = extractNewIndiaPolicyPeriod(text);
  result.policyStartDate = period.startDate;
  result.policyEndDate = period.endDate;
  result.receiptNumber = matchGroup(text, /Receipt\s+Number\s+([0-9]+)\s*-/i);
  result.previousInsurer = cleanHdfcValue(
    matchGroup(text, /Previous\s+Insurer\s+(.+?)\s+Previous\s+Policy\s+Number/i),
  );
  result.previousPolicyNumber = cleanHdfcValue(
    matchGroup(text, /Previous\s+Policy\s+Number\s+([A-Z0-9/.-]+)/i),
  );

  const vehicleBlock =
    sliceText(text, /VEHICLE DETAILS/i, /INSURED DECLARED VALUE|ENHANCED COVER|SCHEDULE OF PREMIUM/i) ||
    extractMotorVehicleBlock(text) ||
    text;
  result.registrationNumber =
    normalizeRegistrationDisplay(
      matchGroup(
        vehicleBlock,
        /Registration\s+Number\s*([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{3,4})/i,
      ),
    ) ||
    normalizeRegistrationDisplay(
      matchGroup(
        vehicleBlock,
        /Registration\s+no\.?\s*([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{0,3}[-\s]?\d{0,4})/i,
      ),
    ) ||
    normalizeRegistrationDisplay(matchGroup(vehicleBlock, /Registration\s+Number\s*(New Vehicle)/i)) ||
    "";

  const ce = matchGroup(
    vehicleBlock,
    /Chassis\s+no\.?\s*\/\s*Engine\s+(?:Number|no\.?)\s*:?\s*([A-Z0-9\s-]+\/[A-Z0-9\s-]+)/i,
  );
  if (ce) {
    const [chassis, engine] = ce.split("/");
    result.chassisNumber = cleanVehicleCode(chassis);
    result.engineNumber = cleanVehicleCode(engine);
  }

  result.makeModel = cleanHdfcValue(
    matchGroup(
      vehicleBlock,
      /Make\s*\/?\s*Model\s*:?\s*([A-Z0-9 &/().,-]+?)(?=Registration\s+no\.?|\s+Registration\s+no\.?|\s+Variant|\s+Year|\n|$)/i,
    ),
  );
  if (result.makeModel.includes("/")) {
    const [make, ...model] = result.makeModel.split("/");
    result.vehicleMake = cleanHdfcValue(make);
    result.vehicleModel = cleanHdfcValue(model.join("/"));
  }

  result.variant = cleanHdfcValue(
    matchGroup(
      vehicleBlock,
      /Variant\s*:?\s*([\s\S]{1,80}?)(?=\s+Automobile|\s+Colour|\s+Cover\s+Note|\n|$)/i,
    ),
  );
  result.manufacturingYear = matchGroup(vehicleBlock, /Year\s+of\s+manufacture\s*:?\s*(19\d{2}|20\d{2})/i);

  const bodyFuel = cleanHdfcValue(
    matchGroup(vehicleBlock, /Type\s+of\s+body\s*\/\s*Type\s+of\s+Fuel\s*:?\s*([A-Z -]+\/[A-Z]+)/i),
  );
  if (bodyFuel.includes("/")) {
    const [body, fuel] = bodyFuel.split("/");
    result.bodyType = cleanHdfcValue(body);
    result.fuelType = normalizeNewIndiaFuelType(fuel);
  } else {
    result.bodyType = cleanHdfcValue(matchGroup(vehicleBlock, /Type\s+of\s+body\s*:?\s*([A-Z -]+)/i));
    result.fuelType = normalizeNewIndiaFuelType(
      matchGroup(vehicleBlock, /Type\s+of\s+fuel\s*:?\s*([A-Z]+)/i),
    );
  }

  result.cubicCapacity =
    matchGroup(vehicleBlock, /Cubic\s+capacity\s*\(cc\)\s*\/\s*Wattage\s*\(kW\)\s*:?\s*(\d+)\s*cc/i) ||
    matchGroup(vehicleBlock, /Cubic\s+capacity[\s\S]{0,50}?(\d+)\s*cc/i);
  result.seatingCapacity = matchGroup(vehicleBlock, /Seating\s+capacity\s+including\s+Driver\s*:?\s*(\d+)/i);
  result.grossVehicleWeight = String(
    matchGroup(vehicleBlock, /Gross\s+Vehicle\s+Weight\s*\(GVW\)\s*:?\s*([0-9,]+)/i) || "",
  ).replace(/[,\s]/g, "");
  result.commercialVehicleType = cleanHdfcValue(
    matchGroup(vehicleBlock, /Type\s+of\s+Commercial\s+Vehicles\s*:?\s*([\s\S]+?)\s+Sub\s+Type/i),
  );
  result.commercialVehicleSubType = cleanHdfcValue(
    matchGroup(vehicleBlock, /Sub\s+Type\s*:?\s*([\s\S]+?)\s+Name\s+of\s+the\s+Financier/i),
  );
  result.rtoLocation = cleanHdfcValue(
    matchGroup(
      vehicleBlock,
      /Name\s+of\s+registration\s+authority\s*:?\s*([A-Z ]+?)(?=\s+FASTag|\s+INSURED|\n|$)/i,
    ),
  );
  result.financerName = cleanHdfcValue(
    matchGroup(
      vehicleBlock,
      /Name\s+of\s+the\s+Financier\s*:?\s*([\s\S]+?)(?=\s+Chassis|\s+Cover\s+Note|\n\s*Cover\s+Note|$)/i,
    ),
  );
  if (/cover note/i.test(result.financerName)) result.financerName = "";

  const idvBlock = sliceText(text, /INSURED DECLARED VALUE/i, /ENHANCED COVER|SCHEDULE OF PREMIUM/i) || "";
  const idvRow = idvBlock.match(
    /Vehicle\s+Trailer[\s\S]{0,160}?\n\s*([0-9,]+)\s+[0-9,]+\s+(?:N\/A|0)\s+(?:N\/A|0)\s+[0-9,]*\s+([0-9,]+)/i,
  );
  result.totalIdv =
    normalizeAmount(idvRow?.[2]) ||
    normalizeAmount(matchGroup(text, /For individual covers \(OD\) in RS\s*:?\s*([0-9,]+)/i)) ||
    extractIDV(text);
  result.idv = result.totalIdv;
  result.enhancedCovers = extractNewIndiaEnhancedCovers(text);

  return result;
}

// Start of extractNewIndiaPolicyPeriod (Lines 4185-4197)
function extractNewIndiaPolicyPeriod(text = "") {
  const bundled = text.match(
    /Period\s+of\s+cover\s+OD\s+Cover\s+(\d{1,2}\/\d{1,2}\/\d{4})[\s\S]{0,80}?to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  if (bundled) return { startDate: bundled[1], endDate: bundled[2] };

  const regular = text.match(
    /Period\s+of\s+cover\s+(\d{1,2}\/\d{1,2}\/\d{4})[\s\S]{0,80}?to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  if (regular) return { startDate: regular[1], endDate: regular[2] };

  return { startDate: "", endDate: "" };
}

// Start of extractNewIndiaEnhancedCovers (Lines 4199-4225)
function extractNewIndiaEnhancedCovers(text = "") {
  const block =
    sliceText(text, /ENHANCED COVER|Cover Description\s+Cover Opted/i, /SCHEDULE OF PREMIUM/i) || "";
  const hasYes = (label) => {
    const direct = block.match(new RegExp(`(?:${label})(?:\\s+Cover)?\\s*(Yes|No|-)`, "i"));
    if (direct?.[1]) return /^yes$/i.test(direct[1]);
    return new RegExp(`${label}[\\s\\S]{0,30}?Yes`, "i").test(block);
  };
  const hasRoadsideAssistance = () => {
    const direct = block.match(/Roadside\s+Assistance\s+Cover\s*-\s*Basic\s*(Yes|No|-)/i);
    if (direct?.[1]) return /^yes$/i.test(direct[1]);
    return hasYes("Roadside Assistance");
  };

  return {
    nilDepreciation: hasYes("Nil Depreciation"),
    engineProtection: hasYes("Engine Protection|Engine Protect"),
    consumableItems: hasYes("Consumable Items"),
    roadsideAssistance: hasRoadsideAssistance(),
    returnToInvoice: hasYes("Return to Invoice"),
    batteryProtect: hasYes("Battery Protect"),
    keyProtect: hasYes("Key Protect"),
    tyreAndAlloy: hasYes("Tyre and Alloy"),
    lossOfContents: hasYes("Loss of Contents"),
    personalBelongings: hasYes("Personal Belongings"),
  };
}

// Start of extractNewIndiaPremiumSchedule (Lines 4238-4402)
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
    engineProtectionPremium: "",
    consumableItemsPremium: "",
    roadsideAssistance: "",
    ncbPercentage: "",
    premiumBreakup: {},
  };

  if (!isNewIndiaAssuranceText(text) && !/SCHEDULE OF PREMIUM/i.test(text)) {
    return result;
  }

  const schedule =
    sliceText(
      text,
      /SCHEDULE OF PREMIUM/i,
      /GSTIN\(Issuing Office\)|Limitation as to use|Limits of Liability|Premium and GST Details/i,
    ) || text;
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
    /Own\s+Damage\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
  );
  result.tpDriverOwner = amount(
    /Total\s+TP\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Calculated\s+TP\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /TP\s*\+\s*Driver\s*\+\s*Owner(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /TP\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Liability\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
  );
  result.netPremium = amount(
    /Net\s+Premium(?:\s*\(?Rs\.?\)?)?\s*(?:in\s+Rs)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Net\s+Premium\s*[:.-]?\s*(?:Rs\.?)?\s*([0-9,]+(?:\.\d{1,2})?)/i,
  );
  result.gstAmount = amount(
    /GST(?:\s*\(?Rs\.?\)?)?\s*(?:in\s+Rs)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /GST\s*[:.-]?\s*(?:Rs\.?)?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Goods\s+and\s+Service\s+Tax\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
  );
  result.totalPremium = amount(
    /Total\s+Payable(?:\s*\(?Rs\.?\)?)?\s*(?:in\s+Rs)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Total\s+Premium(?:\s*\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Total\s+Payable\s*[:.-]?\s*(?:Rs\.?)?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    /Premium\s+including\s+GST\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
  );
  result.basicOwnDamage = result.basicOwnDamage || amount(/Basic\s+OD\s+Premium\s+([0-9,]+(?:\.\d{1,2})?)/i);
  result.basicThirdPartyLiability =
    result.basicThirdPartyLiability || amount(/Basic\s+TP\s+Premium\s+([0-9,]+(?:\.\d{1,2})?)/i);
  result.zeroDepreciationCover =
    result.zeroDepreciationCover ||
    amount(/Premium\s+for\s+nil\s+depreciation\s+cover\s+([0-9,]+(?:\.\d{1,2})?)/i);
  result.engineProtectionPremium = amount(
    /Engine\s+Protect(?:ion)?\s+Cover\s+Premium\s+([0-9,]+(?:\.\d{1,2})?)/i,
  );
  result.consumableItemsPremium = amount(/Consumable\s+Items\s+Cover\s+Premium\s+([0-9,]+(?:\.\d{1,2})?)/i);
  result.roadsideAssistance = amount(/Roadside\s+Assistance\s+Cover\s+Premium\s+([0-9,]+(?:\.\d{1,2})?)/i);
  result.ncbPercentage =
    result.ncbPercentage ||
    matchGroup(schedule, /(?:Calculated\s+NCB\s+Discount|Total\s+NCB\s+Discount)\s*\((\d{1,2}%)/i) ||
    "";
  const stackedOwnDamage = parseNewIndiaStackedOwnDamagePremiums(schedule);
  result.zeroDepreciationCover = stackedOwnDamage.zeroDepreciationCover || result.zeroDepreciationCover;
  result.engineProtectionPremium = stackedOwnDamage.engineProtectionPremium || result.engineProtectionPremium;
  result.consumableItemsPremium = stackedOwnDamage.consumableItemsPremium || result.consumableItemsPremium;
  result.roadsideAssistance = stackedOwnDamage.roadsideAssistance || result.roadsideAssistance;
  result.premiumBreakup = buildNewIndiaPremiumBreakup(schedule);

  if (!result.netPremium && result.totalPremium && result.gstAmount)
    result.netPremium = diffAmounts(result.totalPremium, result.gstAmount);
  if (!result.gstAmount && result.totalPremium && result.netPremium)
    result.gstAmount = diffAmounts(result.totalPremium, result.netPremium);
  if (!result.odPremium && result.netPremium && result.tpDriverOwner)
    result.odPremium = diffAmounts(result.netPremium, result.tpDriverOwner);
  if (!result.tpDriverOwner && result.netPremium && result.odPremium)
    result.tpDriverOwner = diffAmounts(result.netPremium, result.odPremium);

  // Parse columns
  const scheduleIndex = text.search(/SCHEDULE OF PREMIUM/i);
  if (scheduleIndex !== -1) {
    const scheduleBlock = text.slice(scheduleIndex, scheduleIndex + 3000);
    const basicOdIdx = scheduleBlock.search(/Basic\s+OD\s+Premium/i);
    const basicTpIdx = scheduleBlock.search(/Basic\s+TP\s+Premium/i);

    if (basicOdIdx !== -1 && basicTpIdx !== -1 && basicTpIdx > basicOdIdx) {
      const odBlock = scheduleBlock.slice(basicOdIdx, basicTpIdx);
      let tpEndIdx = scheduleBlock.search(
        /Calculated\s+OD\s+Premium|Calculated\s+TP\s+Premium|Total\s+OD\s+Premium|Total\s+TP\s+Premium|Net\s+Premium/i,
      );
      if (tpEndIdx === -1 || tpEndIdx <= basicTpIdx) {
        tpEndIdx = scheduleBlock.length;
      }
      const tpBlock = scheduleBlock.slice(basicTpIdx, tpEndIdx);

      const alignLabelsAndValues = (blockText) => {
        const lines = blockText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const labels = [];
        const values = [];
        for (const line of lines) {
          if (/^[0-9,.-]+(?:\s*[0-9,.-]+)*$/.test(line)) {
            const nums = line
              .split(/\s+/)
              .map((n) => n.trim())
              .filter(Boolean);
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

        const zeroDepIdx = odAligned.labels.findIndex((l) =>
          /nil\s*depreciation|depreciation\s*cover/i.test(l),
        );
        if (zeroDepIdx !== -1 && zeroDepIdx < odAligned.values.length) {
          result.zeroDepreciationCover = normalizeAmount(odAligned.values[zeroDepIdx]);
        }

        const ncbIdx = odAligned.labels.findIndex((l) => /NCB|No\s*Claim\s*Bonus/i.test(l));
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

// Start of parseNewIndiaStackedOwnDamagePremiums (Lines 4404-4452)
function parseNewIndiaStackedOwnDamagePremiums(schedule = "") {
  const result = {
    zeroDepreciationCover: "",
    engineProtectionPremium: "",
    consumableItemsPremium: "",
    roadsideAssistance: "",
  };
  const block =
    sliceText(
      schedule,
      /Basic\s+OD\s+Premium/i,
      /Calculated\s+OD\s+Premium|Total\s+OD\s+Premium|Net\s+Premium/i,
    ) || "";
  if (!block) return result;

  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const entries = [];
  for (const line of lines) {
    if (/^[-+()#\s]*[0-9,]+(?:\.\d{1,2})?$/.test(line)) {
      entries.push({ type: "value", value: normalizeAmount(line.replace(/[^0-9,.]/g, "")) });
      continue;
    }
    if (/Premium\s+for\s+nil\s+depreciation\s+cover|Nil\s+Depreciation\s+Cover\s+Premium/i.test(line)) {
      entries.push({ type: "label", key: "zeroDepreciationCover" });
    } else if (/Engine\s+Protect(?:ion)?\s+Cover\s+Premium/i.test(line)) {
      entries.push({ type: "label", key: "engineProtectionPremium" });
    } else if (/Consumable\s+Items\s+Cover\s+Premium/i.test(line)) {
      entries.push({ type: "label", key: "consumableItemsPremium" });
    } else if (/Roadside\s+Assistance\s+Cover\s+Premium/i.test(line)) {
      entries.push({ type: "label", key: "roadsideAssistance" });
    } else if (/NCB\s+Discount/i.test(line)) {
      entries.push({ type: "label", key: "ncbDiscount" });
    }
  }

  const labels = entries.filter((entry) => entry.type === "label");
  const values = entries.filter((entry) => entry.type === "value").map((entry) => entry.value);
  if (!labels.length || values.length < labels.length) return result;

  labels.forEach((label, index) => {
    if (label.key !== "ncbDiscount" && !result[label.key]) {
      result[label.key] = values[index] || "";
    }
  });
  return result;
}

// Start of buildNewIndiaPremiumBreakup (Lines 4454-4483)
function buildNewIndiaPremiumBreakup(schedule = "") {
  const map = {};
  const lines = String(schedule || "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const labels = [
    ["basicODPremium", /Basic OD Premium/i],
    ["basicTPPremium", /Basic TP Premium/i],
    ["calculatedNCBDiscount", /NCB Discount/i],
    ["legalLiabilityPaidDriver", /Legal Liability|LL to paid driver/i],
    ["paOwnerDriver", /Compulsory PA Premium for Owner Driver/i],
    ["unnamedPaCover", /UnNamed|Pillion|Hirer/i],
    ["nilDepreciationPremium", /nil depreciation/i],
    ["engineProtectPremium", /Engine Protect/i],
    ["consumablePremium", /Consumable/i],
    ["roadsidePremium", /Roadside Assistance/i],
  ];

  for (let index = 0; index < lines.length; index += 1) {
    for (const [key, pattern] of labels) {
      if (!pattern.test(lines[index]) || map[key]) continue;
      const nearby = lines.slice(index, index + 5).join(" ");
      const amountMatch = nearby.match(/\b([0-9,]+(?:\.\d{1,2})?)\b/);
      if (amountMatch) map[key] = normalizeAmount(amountMatch[1]);
    }
  }

  return map;
}

module.exports = {
  isNewIndiaFinalData,
  finalizeNewIndiaMotorFields,
  isNewIndiaAssuranceText,
  detectNewIndiaPolicyFamily,
  cleanNewIndiaPolicyType,
  normalizeNewIndiaFuelType,
  extractNewIndiaMotorDetails,
  extractNewIndiaPolicyPeriod,
  extractNewIndiaEnhancedCovers,
  extractNewIndiaPremiumSchedule,
  parseNewIndiaStackedOwnDamagePremiums,
  buildNewIndiaPremiumBreakup
};
