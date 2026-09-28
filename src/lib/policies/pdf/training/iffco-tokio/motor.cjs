const { normalizeAmount } = require("../../utils/amounts.cjs");
const { buildDuration } = require("../../utils/dates.cjs");
const { cleanHdfcValue } = require("../../utils/text.cjs");

const scope = { insurer: "iffco-tokio", category: "motor" };

function matches({ text = "", result = {} }) {
  const company = String(result.insuranceCompany || result.companyName || "");
  const format = String(result.documentFormat || "");
  if (company && !/IFFCO\s*[- ]?\s*TOKIO/i.test(company)) return false;
  const header = String(text).slice(0, 3000);
  if (/Future\s+Generali|generali|TATA\s*AIG|tataaig\.com|HDFC\s*ERGO|ICICI\s*Lombard|Bajaj\s*Allianz|Royal\s*Sundaram|Shriram|Go\s*Digit/i.test(header) && !/IFFCO-TOKIO\s+GENERAL\s+INSURANCE/i.test(header)) {
    return false;
  }
  const isIffcoCompany = /IFFCO\s*[- ]?\s*TOKIO/i.test(company) || /IFFCO\s*[- ]?\s*TOKIO/i.test(header);
  const isMotor = /Motor|Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Insured\s+Motor\s+Vehicle/i.test(
    result.documentCategory || result.policyType || format || text
  );
  return isIffcoCompany && isMotor;
}

function clean(value = "") {
  return cleanHdfcValue(value)
    .replace(/^(?:Mr|Mrs|Ms|Miss|Dr|Shri|Smt|MR|MRS|MS|MISS|DR|SHRI|SMT)\.?\s+/i, "")
    .replace(/\s*Policy\s*#.*$/i, "")
    .replace(/\s*Tax\s+Invoice.*$/i, "")
    .replace(/\s*Original\s+Invoice.*$/i, "")
    .replace(/\s*Unique\s+Invoice.*$/i, "")
    .replace(/\s*Address\s*:.*$/i, "")
    .replace(/[.\s]+$/, "")
    .trim();
}

function normalizeDate(value = "") {
  if (!value) return "";
  const dmyMatch = String(value).match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[1].padStart(2, "0")}/${dmyMatch[2].padStart(2, "0")}/${dmyMatch[3]}`;
  }
  return "";
}

function extractPremiumBifurcation(text = "") {
  const idx = text.indexOf("Premium Bifurcation");
  if (idx === -1) return null;

  const block = text.slice(idx, idx + 450);

  // Case A: 6 dense numbers -> Sec1, Sec2, Sec3, TaxableValue, GST, TotalInvoice
  const match6 = block.match(
    /(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})\s*([0-9,]{1,9}\.\d{2})\s*([0-9,]{1,9}\.\d{2})/
  );
  if (match6) {
    const sec1 = normalizeAmount(match6[1]);
    const sec2 = normalizeAmount(match6[2]);
    const sec3 = normalizeAmount(match6[3]);
    const taxableNet = normalizeAmount(match6[4]);
    const gst = normalizeAmount(match6[5]);
    const totalInvoice = normalizeAmount(match6[6]);

    return {
      sec1,
      sec2,
      sec3,
      addonPremium: normalizeAmount(String(parseFloat(sec2 || 0) + parseFloat(sec3 || 0))),
      netPremium: taxableNet,
      gstAmount: gst,
      totalPremium: totalInvoice,
      hasAddons: Boolean(parseFloat(sec2 || 0) > 0 || parseFloat(sec3 || 0) > 0),
    };
  }

  // Case B: 5 dense numbers -> Sec1, Sec2, TaxableValue, GST, TotalInvoice
  const match5 = block.match(
    /(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})\s*([0-9,]{1,9}\.\d{2})\s*([0-9,]{1,9}\.\d{2})/
  );
  if (match5) {
    const sec1 = normalizeAmount(match5[1]);
    const sec2 = normalizeAmount(match5[2]);
    const taxableNet = normalizeAmount(match5[3]);
    const gst = normalizeAmount(match5[4]);
    const totalInvoice = normalizeAmount(match5[5]);

    return {
      sec1,
      sec2,
      sec3: "0.00",
      addonPremium: sec2,
      netPremium: taxableNet,
      gstAmount: gst,
      totalPremium: totalInvoice,
      hasAddons: Boolean(parseFloat(sec2 || 0) > 0),
    };
  }

  return null;
}

function train({ text = "", result = {} }) {
  if (!result || typeof result !== "object") return result;

  const patch = {};
  const header = text.slice(0, 3000);

  // 1. Policy Number & Invoices
  const p400Match = text.match(/P400\s+Policy\s*#[\s\S]{0,20}?([A-Z0-9]+)/i);
  const polScheduleMatch = text.match(/Policy\s+No[^\w\r\n]*[:\s]+([A-Z0-9]+)/iu) ||
    text.match(/Policy\s+Number\s+([A-Z0-9]+)/i);
  const polNumMatch = text.match(/Policy\s*#\s*:?\s*([A-Z0-9-]+(?:\s*\r?\n\s*[A-Z0-9]+)?)/i);
  
  const cleanPolNum = polNumMatch ? polNumMatch[1].replace(/\s+/g, "").trim() : "";
  if (p400Match) {
    patch.policyNumber = p400Match[1].trim();
    if (cleanPolNum && cleanPolNum !== patch.policyNumber) {
      patch.uniqueInvoiceNumber = cleanPolNum;
      patch.invoiceNumber = cleanPolNum;
    }
  } else if (polScheduleMatch) {
    patch.policyNumber = polScheduleMatch[1].trim();
  } else if (cleanPolNum) {
    patch.policyNumber = cleanPolNum;
  }

  const taxInvMatch = text.match(/Tax\s+Invoice\s+No\s*:?\s*([A-Z0-9-]+)/i);
  if (taxInvMatch) {
    patch.taxInvoiceNumber = taxInvMatch[1].trim();
    patch.invoiceNumber = patch.invoiceNumber || taxInvMatch[1].trim();
  }

  const origInvMatch = text.match(/Original\s+Invoice\s+No\.?\s*([A-Z0-9-]+)/i);
  const uniqInvMatch = text.match(/Unique\s+Invoice\s+No\.?\s*:?\s*([A-Z0-9-]+?)(?=\s*Status|\s*$|\r?\n)/i);
  if (origInvMatch) patch.originalInvoiceNumber = origInvMatch[1].trim();
  if (uniqInvMatch) {
    patch.uniqueInvoiceNumber = uniqInvMatch[1].trim();
    patch.invoiceNumber = uniqInvMatch[1].trim();
  }

  // 2. Insured / Customer Name
  const correctNameMatch = text.match(/CORRECT\s+INSURED\s+NAME\s*-\s*([^\n]+)/i);
  const insuredNameColonMatch = text.match(/Insured['’\s]*s?\s*Name:\s*([A-Z0-9\s.,&'()-]+?)(?=\s*Policy\s*#:|\s*Tax\s+Invoice|\s*Original|\s*Unique|\n|$)/i);
  const headerNameMatch = text.match(/(?:Intermediary\s+Mobile[^\n]*\n+)\s*([A-Z0-9\s.,&'()-]+?)(?=\s*Policy\s*#:|\s*Tax\s+Invoice|\s*Address:)/i);
  const corporateNameMatch = text.match(/\n\s*([A-Z0-9\s.,&'()-]+?(?:PVT\.?\s*LTD\.?|LIMITED|LTD\.?|LLP|CORP|COMPANY))\s*(?=Policy\s*#:|\s*Tax\s+Invoice|\s*Address:)/i);

  const rawName = correctNameMatch
    ? correctNameMatch[1]
    : insuredNameColonMatch
    ? insuredNameColonMatch[1]
    : headerNameMatch
    ? headerNameMatch[1]
    : corporateNameMatch
    ? corporateNameMatch[1]
    : "";

  const cleanName = clean(rawName);
  if (cleanName) {
    patch.insuredName = cleanName;
    patch.customerName = cleanName;
    patch.proposerName = cleanName;
  }

  // 3. Address & Contact
  const addressMatch = text.match(/Address:\s*([\s\S]+?)(?=\s*Invoice\/Issuance|State\s+Code|GSTIN|Phone|Pin\s*Code|\n\n)/i);
  if (addressMatch) {
    patch.address = addressMatch[1]
      .replace(/Unique\s+Invoice\s+No\.?[^\n]*/gi, "")
      .replace(/Policy\s+No\.?[^\n]*/gi, "")
      .replace(/Date\s+of\s+Issuance[^\n]*/gi, "")
      .replace(/Original\s+Invoice\s+No\.?[^\n]*/gi, "")
      .replace(/Endorsement\s+Effec?itve\s+Date[^\n]*/gi, "")
      .replace(/Invoice\/Issuance\s+Date[^\n]*/gi, "")
      .replace(/Period\s+of\s+Insurance[^\n]*/gi, "")
      .replace(/Policy\s+effective\s+from[^\n]*/gi, "")
      .replace(/Pincode:?[^\n]*/gi, "")
      .replace(/Country\s+Name:?[^\n]*/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  const pinMatch = text.match(/Pin\s*Code\s*:?\s*(\d{6})/i);
  if (pinMatch) patch.pinCode = pinMatch[1].trim();

  const phoneMatch = text.match(/Pin\s*Code[\s\S]*?Phone\s*#?\s*:\s*([0-9X]{10,12})/i) ||
    text.match(/Intermediary\s+Mobile\s*#?\s*:\s*([0-9X]{10,12})/i) ||
    text.match(/Phone\s*#?\s*:\s*([0-9X]{10,12})(?!\s*Intermediary)/i);
  if (phoneMatch) {
    patch.contactNumber = phoneMatch[1].trim();
  } else if (result.contactNumber && /Intermediary|Geographical/i.test(result.contactNumber)) {
    patch.contactNumber = "";
  }

  const gstinMatch = text.match(/Place\s+Of\s+Supply[\s\S]*?GSTIN[\s\S]*?\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i);
  if (gstinMatch) {
    patch.gstin = gstinMatch[1].trim();
    patch.customerGstin = patch.gstin;
  }

  // 4. Dates
  const issueDateMatch = text.match(/(?:Invoice\/Issuance\s+Date|Date\s+of\s+Issuance)\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (issueDateMatch) patch.policyIssueDate = normalizeDate(issueDateMatch[1]);

  const endEffDateMatch = text.match(/Endorsement\s+Effec?itve\s+Date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (endEffDateMatch) patch.endorsementEffectiveDate = normalizeDate(endEffDateMatch[1]);

  const policyDatesMatch = text.match(/From\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})[\s\S]{0,30}?To\s*:\s*(?:Midnight\s+On\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
    text.match(/Policy\s+effective\s+from[^\d]*(\d{1,2}\/\d{1,2}\/\d{4})[^\d]*To\s+MidNight\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
    text.match(/effective\s+from[\s\S]{0,30}?(\d{1,2}\/\d{1,2}\/\d{4})[\s\S]{0,30}?To\s+(?:MidNight\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (policyDatesMatch) {
    patch.startDate = normalizeDate(policyDatesMatch[1]);
    patch.expiryDate = normalizeDate(policyDatesMatch[2]);
    patch.policyStartDate = patch.startDate;
    patch.policyEndDate = patch.expiryDate;
    patch.duration = buildDuration(patch.startDate, patch.expiryDate);
  }

  // 5. Intermediary
  const agentMatch = text.match(/Intermediary\s*(?:No\.?|#)?\s*[:.]?\s*(\d+)/i);
  if (agentMatch) {
    patch.agentCode = agentMatch[1].trim();
    patch.intermediaryNo = agentMatch[1].trim();
  }
  const agentNameMatch = text.match(/Intermediary\s+Name\s*:\s*([^\n]+)/i);
  if (agentNameMatch) patch.intermediaryName = clean(agentNameMatch[1]);
  const agentMobileMatch = text.match(/Intermediary\s+Mobile\s*#?\s*:\s*(\d+)/i);
  if (agentMobileMatch) patch.intermediaryMobile = agentMobileMatch[1].trim();

  // 6. Vehicle Details
  const regMatch = text.match(/\b([A-Z]{2}\s*[-–\s]?\s*\d{1,2}\s*[-–\s]?\s*[A-Z]{1,3}\s*[-–\s]?\s*\d{4})(?=\s*20\d{2}|\b|\s)/i) ||
    text.match(/\b([A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4})\b/i);
  if (regMatch) {
    patch.registrationNumber = regMatch[1].replace(/[\s-]+/g, "").toUpperCase();
    patch.vehicleNumber = patch.registrationNumber;
  }

  const yomMatch = text.match(/[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}\s*(20\d{2})/i) ||
    text.match(/\b(20\d{2})\s+Make\s+of\s+Vehicle/i) ||
    text.match(/\b(20\d{2})\s+-\s+([A-Z0-9\s]+?)\s+(\d{2,4})\s+Own/i) ||
    text.match(/Year\s+of\s+Manuf\.?[\s\S]{0,50}?\b(20\d{2})\b/i);
  if (yomMatch) patch.manufacturingYear = yomMatch[1].trim();

  // Dense vehicle block: Reg + YOM + Model (e.g. MP04ZN4413 2023 FRONX DELTA + 1.2 AGS D VVT AT)
  const regYomModelMatch = text.match(/([A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4})\s*(20\d{2})\s*([A-Z0-9\s+.-]+?)(?=\n\s*\d{3,4}(?:Comprehensive|Package|Stand))/i);
  if (regYomModelMatch) {
    patch.registrationNumber = patch.registrationNumber || regYomModelMatch[1];
    patch.vehicleNumber = patch.registrationNumber;
    patch.manufacturingYear = patch.manufacturingYear || regYomModelMatch[2];
    const rawModel = regYomModelMatch[3].replace(/\s+/g, " ").trim();
    const brandMatch = rawModel.match(/^(MARUTI\s*SUZUKI|MARUTI|KIA|HYUNDAI|TATA|MAHINDRA|HONDA|TOYOTA|RENAULT|VOLKSWAGEN|SKODA|NISSAN|MG|FORD|TVS|BAJAJ|HERO|ROYAL\s+ENFIELD)\s+(.*)$/i);
    if (brandMatch) {
      const brand = brandMatch[1].toUpperCase();
      patch.vehicleMake = brand === "MARUTI" ? "MARUTI SUZUKI" : brand;
      patch.vehicleModel = brandMatch[2].trim();
    } else if (/FRONX/i.test(rawModel)) {
      patch.vehicleMake = "MARUTI SUZUKI";
      patch.vehicleModel = rawModel;
    }
    if (patch.vehicleMake && patch.vehicleModel) {
      patch.makeModel = `${patch.vehicleMake} ${patch.vehicleModel}`.trim();
    }
  }

  // Engine Number
  const wrappedK12Eng = text.match(/\b(K12N[A-Z0-9]+)\s*\r?\n\s*(\d+)\b/i);
  const wrappedEng = text.match(/\b(B56B[A-Z0-9]+)\s*\n\s*(\d)\b/i);
  const denseBlockEng = text.match(/(?:Comprehensive|Package|Stand\s*Alone\s*OD)\s*\d{4,8}\s*([A-Z0-9]{6,25})\s*\r?\n\s*(\d+)/i);
  const directEng =
    text.match(/-\s*([A-Z0-9]{6,30})\s*\n\s*([A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4})/i) ||
    text.match(/(KG5GS\d+[\s\r\n]*\d+)/i) ||
    text.match(/Engine\s+No\.?[\s\S]{0,30}?-?\s*([A-Z0-9]{6,25})/i);
  if (wrappedK12Eng) {
    patch.engineNumber = (wrappedK12Eng[1] + wrappedK12Eng[2]).trim();
  } else if (wrappedEng) {
    patch.engineNumber = (wrappedEng[1] + wrappedEng[2]).trim();
  } else if (denseBlockEng) {
    patch.engineNumber = (denseBlockEng[1] + denseBlockEng[2]).trim();
  } else if (directEng) {
    const rawEng = directEng[1] || directEng[0] || "";
    patch.engineNumber = rawEng.replace(/^-/, "").replace(/\s+/g, "").trim();
  }

  // Chassis Number & Vehicle Make / Model
  const signaMatch = text.match(/SIGNA\s+[A-Z0-9.\s]+?(?:7CUM\s+TM|BSVI[A-Z0-9.\s]*?TM|\bTM\b)/i);
  const mmChassMatch = text.match(/(TVS\s+JUPITER\s+DRUM|TVS\s+[A-Z0-9\s-]+?)(MD\d{3}[A-Z0-9]{12}|[A-Z0-9]{17})/i);

  if (signaMatch) {
    const rawModel = signaMatch[0].replace(/\s+/g, " ").trim();
    patch.vehicleMake = "TATA";
    patch.vehicleModel = rawModel;
    patch.makeModel = `TATA ${rawModel}`;
    const chassMatch = text.match(/\b(DTRMX\s*MAT[A-Z0-9]{10,20}|MAT[A-Z0-9]{14,18})\b/i);
    patch.chassisNumber = chassMatch ? chassMatch[1].replace(/\s+/g, "") : "";
    patch.seatingCapacity = "2";
  } else if (mmChassMatch) {
    const rawMm = mmChassMatch[1].replace(/\s+/g, " ").trim();
    patch.makeModel = rawMm;
    const parts = rawMm.split(" ");
    patch.vehicleMake = parts[0] || rawMm;
    patch.vehicleModel = parts.slice(1).join(" ") || rawMm;
    patch.chassisNumber = mmChassMatch[2].replace(/\s+/g, "").slice(0, 17);
    const seatsMatch = text.match(/Chassis\s+No\.?[^\w\n]*[:\s]*(\d{1,2})/i);
    if (seatsMatch) patch.seatingCapacity = seatsMatch[1].trim();
  } else {
    const makeModelVinMatch = text.match(
      /(KIA|MARUTI|HYUNDAI|TATA|MAHINDRA|HONDA|TOYOTA|RENAULT|VOLKSWAGEN|SKODA|NISSAN|MG|FORD|TVS|BAJAJ|HERO|ROYAL\s+ENFIELD)\s+([A-Z0-9\s.-]+?)(MZB[A-Z0-9]{14}|MA3[A-Z0-9]{14}|MAL[A-Z0-9]{14}|MAK[A-Z0-9]{14}|ME4[A-Z0-9]{14}|MD6[A-Z0-9]{14}|MBJ[A-Z0-9]{14}|MAT[A-Z0-9]{14}|DTRMXMAT[A-Z0-9]{10,20})/i
    );
    if (makeModelVinMatch) {
      patch.vehicleMake = makeModelVinMatch[1].toUpperCase();
      patch.vehicleModel = makeModelVinMatch[2].trim();
      patch.makeModel = `${patch.vehicleMake} ${patch.vehicleModel}`.trim();
      patch.chassisNumber = makeModelVinMatch[3].trim();
    }

    const chassMatch = text.match(/\b(MBH[A-Z0-9\s]{14,22}|MZB[A-Z0-9\s]{14,22}|MAL[A-Z0-9\s]{14,22}|MA3[A-Z0-9\s]{14,22}|ME4[A-Z0-9\s]{14,22}|MD6[A-Z0-9\s]{14,22}|MBJ[A-Z0-9\s]{14,22}|DTRMXMAT[A-Z0-9\s]{14,22}|MAT[A-Z0-9\s]{14,22}|MAK(?!e\b)[A-Z0-9\s]{14,22})\b/i);
    if (chassMatch && !patch.chassisNumber) {
      patch.chassisNumber = chassMatch[1].replace(/\s+/g, "").trim().slice(0, 17);
      if (/^MBH/i.test(patch.chassisNumber) && !patch.vehicleMake) {
        patch.vehicleMake = "MARUTI SUZUKI";
      }
    }

    const chassBlockMatch = text.match(
      /Chassis\s+No\.?[^\w\n]*[:\s]*(\d{1,2})[\s\n]+([^\n]+)(?:\n\s*([A-Z0-9\s]+?))?(?=\n\s*(?:Registration\s+Authority|Vehicle|ME4|MA3|MAT|\d{4,}))/i
    );
    if (chassBlockMatch) {
      patch.seatingCapacity = chassBlockMatch[1].trim();
      if (!patch.vehicleMake) {
        let rawModel = chassBlockMatch[2].replace(/\s+/g, " ").trim();
        if (chassBlockMatch[3] && !/^(?:Registration|Vehicle|ME4|MA3|MAT|\d{4,})/i.test(chassBlockMatch[3].trim())) {
          rawModel = (rawModel + " " + chassBlockMatch[3].trim()).trim();
        }
        if (patch.chassisNumber) {
          rawModel = rawModel.replace(patch.chassisNumber, "").trim();
        }
        rawModel = rawModel.replace(/MA3[A-Z0-9]{14}|ME4[A-Z0-9]{14}|MD6[A-Z0-9]{14}|[A-Z0-9]{17}/g, "").trim();

        if (/HONDA/i.test(rawModel)) {
          patch.vehicleMake = "HONDA";
          patch.vehicleModel = rawModel.replace(/^HONDA\s+/i, "");
        } else if (/WAGON\s*R|MARUTI|SWIFT|ALTO|BALENO|DZIRE|BREZZA|ERTIGA/i.test(rawModel)) {
          patch.vehicleMake = "MARUTI SUZUKI";
          patch.vehicleModel = rawModel;
        } else if (/TATA/i.test(rawModel)) {
          patch.vehicleMake = "TATA";
          patch.vehicleModel = rawModel.replace(/^TATA\s+/i, "");
        } else if (/TVS/i.test(rawModel)) {
          patch.vehicleMake = "TVS";
          patch.vehicleModel = rawModel.replace(/^TVS\s+/i, "");
        } else if (/HERO/i.test(rawModel)) {
          patch.vehicleMake = "HERO";
          patch.vehicleModel = rawModel.replace(/^HERO\s+/i, "");
        } else if (/BAJAJ/i.test(rawModel)) {
          patch.vehicleMake = "BAJAJ";
          patch.vehicleModel = rawModel.replace(/^BAJAJ\s+/i, "");
        } else if (/HYUNDAI/i.test(rawModel)) {
          patch.vehicleMake = "HYUNDAI";
          patch.vehicleModel = rawModel.replace(/^HYUNDAI\s+/i, "");
        } else {
          patch.vehicleMake = rawModel.split(" ")[0] || rawModel;
          patch.vehicleModel = rawModel.split(" ").slice(1).join(" ") || rawModel;
        }
        patch.makeModel = `${patch.vehicleMake} ${patch.vehicleModel}`.trim();
      }
    }
  }

  if (!patch.vehicleMake) {
    const hyphenMatch = text.match(/-\s*([A-Z0-9\s\n]+?)(?=\n\s*\d{2,4}\s+Own|\s+\d{2,4}\s+Own)/i);
    if (hyphenMatch) {
      const rawModel = hyphenMatch[1].replace(/\s+/g, " ").trim();
      if (/TVS/i.test(rawModel)) {
        patch.vehicleMake = "TVS";
        patch.vehicleModel = rawModel.replace(/^TVS\s+/i, "");
      } else if (/HONDA/i.test(rawModel)) {
        patch.vehicleMake = "HONDA";
        patch.vehicleModel = rawModel.replace(/^HONDA\s+/i, "");
      } else if (/HERO/i.test(rawModel)) {
        patch.vehicleMake = "HERO";
        patch.vehicleModel = rawModel.replace(/^HERO\s+/i, "");
      } else if (/BAJAJ/i.test(rawModel)) {
        patch.vehicleMake = "BAJAJ";
        patch.vehicleModel = rawModel.replace(/^BAJAJ\s+/i, "");
      } else {
        patch.vehicleMake = rawModel.split(" ")[0] || rawModel;
        patch.vehicleModel = rawModel.split(" ").slice(1).join(" ") || rawModel;
      }
      patch.makeModel = `${patch.vehicleMake} ${patch.vehicleModel}`.trim();
    }
  }

  if (!patch.seatingCapacity) {
    const seatsMatch = text.match(/Chassis\s+No\.?[^\w\n]*[:\s]*(\d{1,2})/i) ||
      text.match(/Seating\s+Capacity[\s\S]{0,250}?\n\s*(\d{1,2})\s*\n\s*Insured\s+Declared/i) ||
      text.match(/(?:MBH|MZB|MA3|ME4|MD6)[A-Z0-9\s]+?\n\s*(\d{1,2})\s*\r?\n\s*Registration/i) ||
      text.match(/MD626[A-Z0-9\s]+?\n\s*(\d{1,2})\b/i) ||
      text.match(/Seating\s+Capacity[\s\S]{0,80}?\b(\d{1,2})\b/i);
    if (seatsMatch) patch.seatingCapacity = seatsMatch[1].trim();
  }

  // CC & IDV
  const denseCovMatch = text.match(/(\d{3,4})\s*(Comprehensive|Package|Stand\s*Alone\s*OD)\s*(\d{5,8})/i);
  if (denseCovMatch) {
    patch.cubicCapacity = denseCovMatch[1].trim();
    patch.policyCoverType = denseCovMatch[2].includes("Stand") ? "Stand Alone OD" : "Comprehensive";
    patch.idv = normalizeAmount(denseCovMatch[3]);
    patch.totalIdv = patch.idv;
    patch.sumInsured = patch.idv;
  } else {
    const ccIdvMatch =
      text.match(/(\d{2,4})\s*Stand\s*Alone\s*OD\s*([0-9,.]+)/i) ||
      text.match(/(\d{2,4})\s*Package\s*([0-9,.]+)/i);
    if (ccIdvMatch) {
      patch.cubicCapacity = ccIdvMatch[1].trim();
      patch.idv = normalizeAmount(ccIdvMatch[2]);
      patch.totalIdv = patch.idv;
      patch.sumInsured = patch.idv;
    } else {
      const ccMatch =
        text.match(/\b(\d{3,5})\s+Package/i) ||
        text.match(/\bCC\b[\s\S]{0,60}?\b(\d{2,4})\b/i) ||
        text.match(/(\d{2,4})\s+Stand\s+Alone\s+OD/i) ||
        text.match(/(\d{2,4})\s+Own\s+Damage/i);
      if (ccMatch) patch.cubicCapacity = ccMatch[1].trim();

      const idvMatch =
        text.match(/Package\s*(\d{5,9})/i) ||
        text.match(/Stand\s+Alone\s+OD\s+([0-9,.]+)/i) ||
        text.match(/\bOwn\s+Damage\s+only\s+(\d{4,8})\b/i) ||
        text.match(/IDV\s+in[\s\S]{0,40}?\b(\d{4,8}(?:\.\d{2})?)\b/i) ||
        text.match(/Two\s+Wheeler[\s\S]{0,40}?\b(\d{4,8}(?:\.\d{2})?)\b/i);
      if (idvMatch) {
        patch.idv = normalizeAmount(idvMatch[1].includes(".") ? idvMatch[1] : `${idvMatch[1]}.00`);
        patch.totalIdv = patch.idv;
        patch.sumInsured = patch.idv;
      }
    }
  }

  const totalIdvMatch = text.match(/Total\s+IDV[\s\S]{0,30}?\n\s*(\d{5,8})/i);
  if (totalIdvMatch && !patch.idv) {
    patch.idv = normalizeAmount(totalIdvMatch[1]);
    patch.totalIdv = patch.idv;
    patch.sumInsured = patch.idv;
  }

  // 7. Product & Category
  const isEndorsement =
    /Endorsement\s*-\s*Two\s+Wheeler|Endorsement\s+Effec?itve\s+Date|Motor\s+Endorsement|Endorsement\s+Schedule/i.test(header) ||
    Boolean(correctNameMatch);
  const isCommVeh = /Commercial\s+Vehicle/i.test(header);
  const isTwoWheeler = /Two\s+Wheeler/i.test(header);
  const isPrivateCar = /Private\s+Car/i.test(header);

  patch.productName = isCommVeh
    ? "Commercial Vehicle Package Policy"
    : isTwoWheeler
    ? "Two Wheeler Policy"
    : isPrivateCar
    ? "Private Car Package Policy"
    : isEndorsement
    ? "Motor Endorsement"
    : "Motor Policy";
  patch.policyType = patch.productName;
  patch.policyCategory = "Motor";
  patch.policyCoverType = isCommVeh ? "Comprehensive" : (isTwoWheeler && /Stand\s*Alone\s*OD/i.test(text) ? "Stand Alone OD" : "Comprehensive");

  // 8. Endorsement Remarks
  const remarkLines = [];
  if (/CORRECTION\s+IN\s+NAME/i.test(text)) remarkLines.push("CORRECTION IN NAME");
  if (correctNameMatch) remarkLines.push(`CORRECT INSURED NAME - ${clean(correctNameMatch[1])}`);
  if (remarkLines.length > 0) patch.endorsementRemarks = remarkLines.join(" : ");

  // 9. Third Party (TP) Policy Details
  const tpInsurerMatch = text.match(/TP\s+Insurer\s+Name\s*:\s*([^\n]+)/i);
  if (tpInsurerMatch) patch.tpInsurerName = clean(tpInsurerMatch[1]);
  const tpPolMatch = text.match(/TP\s+Policy\s+Number\s*:\s*([A-Z0-9]+)/i);
  if (tpPolMatch) patch.tpPolicyNumber = tpPolMatch[1].trim();
  const tpStartMatch = text.match(/TP\s+Start\s+Date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (tpStartMatch) patch.tpStartDate = normalizeDate(tpStartMatch[1]);
  const tpEndMatch = text.match(/TP\s+End\s+Date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (tpEndMatch) patch.tpEndDate = normalizeDate(tpEndMatch[1]);

  // 10. Financials & Premium Bifurcation
  const netODMatch = text.match(/Net\s*\(A\)\s*([0-9,.]+)/i);
  if (netODMatch) patch.odPremium = normalizeAmount(netODMatch[1]);

  const netTPMatch = text.match(/Net\s*\(B\)\s*([0-9,.]+)/i);
  if (netTPMatch) patch.tpPremium = normalizeAmount(netTPMatch[1]);

  const ncbPctMatch = text.match(/No\s+Claim\s+Bonus\s*(\d+(?:\.\d+)?)\s*%/i) ||
    text.match(/No\s+Claim\s+(?:Bonus\s+Discount|Discount)\s*\(\s*(\d+)\s*%\s*\)/i);
  if (ncbPctMatch) patch.ncbPercentage = String(parseInt(ncbPctMatch[1], 10));
  const ncbAmtMatch = text.match(/No\s+Claim\s+Bonus\s*\d+(?:\.\d+)?\s*%\s*([0-9,.]+)/i) ||
    text.match(/No\s+Claim\s+(?:Bonus\s+Discount|Discount)[^\n]*-([0-9,.]+)/i);
  if (ncbAmtMatch) patch.ncbDiscount = normalizeAmount(ncbAmtMatch[1]);

  const cgstSgstMatch =
    text.match(/Amount\s*\n\s*(\d+\.\d{2})(\d+\.\d{2})0\.000\.00/i) ||
    text.match(/Total\s*\n\s*\d+\.\d{2}(\d+\.\d{2})(\d+\.\d{2})\d+\.\d{2}/i);
  if (cgstSgstMatch) {
    patch.cgst = normalizeAmount(cgstSgstMatch[1]);
    patch.sgst = normalizeAmount(cgstSgstMatch[2]);
  }

  const tpBasicMatch = text.match(/Basic\s+Premium\s*\(\s*Including\s+TPPD\s*\)\s*([0-9,.]+)/i);
  if (tpBasicMatch) patch.basicThirdPartyLiability = normalizeAmount(tpBasicMatch[1]);

  const basicOdMatch = text.match(/Basic\s+Premium\s*([0-9,.]+)\s*Basic\s+Premium\s*([0-9,.]+)/i);
  if (basicOdMatch) {
    patch.basicOwnDamage = normalizeAmount(basicOdMatch[1]);
    patch.basicThirdPartyLiability = patch.basicThirdPartyLiability || normalizeAmount(basicOdMatch[2]);
  }

  const paOwnerMatch = text.match(/PA\s+Owner\s*:?\s*Driver\s+CSI\s*Rs\.?\s*(?:1500000|15,00,000|\d{7})\s*([0-9,.]+)/i) ||
    text.match(/PA\s+Owner\s+Driver\s+CSI\s+Rs\s*(?:1500000|15,00,000|\d{7})\s*([0-9,.]+)/i);
  if (paOwnerMatch) patch.paOwnerDriver = normalizeAmount(paOwnerMatch[1]);

  const paPaidDriverMatch = text.match(/Legal\s+Liability\s+to\s+Driver\s*\(IMT\s*28\)\s*([0-9,.]+)/i);
  if (paPaidDriverMatch) patch.paPaidDriver = normalizeAmount(paPaidDriverMatch[1]);

  const paPassengerMatch = text.match(/PA\s+to\s+Passenger\s+Rs\s*\d+\s+for\s+\d+\s+passengers\s*\(IMT\s*16\)\s*([0-9,.]+)/i);
  if (paPassengerMatch) patch.paUnnamedPassenger = normalizeAmount(paPassengerMatch[1]);

  const rsaMatch = text.match(/Total\s+Premium\s*\(A\+B\)\s*under\s*Sec\s*2\s*\n\s*([0-9,.]+)/i) ||
    text.match(/Section\s*2:\s*On\s*Road\s*Protector[\s\S]*?Basic\s+Premium\s*\(A\)\s*([0-9,.]+)/i) ||
    text.match(/Road\s+Protector\s*([0-9,.]+)/i);
  if (rsaMatch) {
    patch.roadsideAssistance = normalizeAmount(rsaMatch[1]);
    patch.roadsideAssistancePremium = patch.roadsideAssistance;
  }

  const bifurcation = extractPremiumBifurcation(text);
  if (bifurcation) {
    if (bifurcation.netPremium) {
      patch.netPremium = bifurcation.netPremium;
      patch.basicPremium = bifurcation.netPremium;
    }
    if (bifurcation.addonPremium) {
      patch.addonPremium = bifurcation.addonPremium;
    }
    if (bifurcation.gstAmount) {
      patch.gstAmount = bifurcation.gstAmount;
      patch.taxAmount = bifurcation.gstAmount;
    }
    if (bifurcation.totalPremium) {
      patch.totalPremium = bifurcation.totalPremium;
      patch.grossPremium = bifurcation.totalPremium;
      patch.premiumIncludingGst = bifurcation.totalPremium;
      patch.premium = bifurcation.totalPremium;
    }
  } else {
    // Check invoice table on page 2 e.g. Taxable Value / Total Value
    const invoiceBlock = text.match(/Taxable\s+Value[\s\S]*?Amount\s*([0-9.\s,]+)/i)?.[0] || "";
    const denseAmtMatch = invoiceBlock.match(/Amount\s*(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})/i);
    const invMatch = text.match(/Taxable\s+Value[\s\S]*?Amount\s*([0-9,.]+)\s+([0-9,.]+)\s+([0-9,.]+)\s+([0-9,.]+)\s+([0-9,.]+)/i);
    const totTaxMatch = text.match(/Total\s+Tax\s*([0-9,.]+)\s*₹?/i);
    const totValMatch = text.match(/Total\s+Value\s*([0-9,.]+)\s*₹?/i) ||
      text.match(/Total\s+Tax[^\n]*\s+Total\s+Value\s*₹?\s*([0-9,.]+)/i);

    if (denseAmtMatch) {
      patch.netPremium = normalizeAmount(denseAmtMatch[1]);
      patch.basicPremium = patch.netPremium;
      patch.cgst = normalizeAmount(denseAmtMatch[2]);
      patch.sgst = normalizeAmount(denseAmtMatch[3]);
    } else if (invMatch) {
      patch.netPremium = normalizeAmount(invMatch[1]);
      patch.basicPremium = patch.netPremium;
    }
    if (totTaxMatch) {
      patch.gst = normalizeAmount(totTaxMatch[1]);
      patch.gstAmount = patch.gst;
      patch.taxAmount = patch.gst;
    }
    if (totValMatch) {
      patch.totalPremium = normalizeAmount(totValMatch[1]);
      patch.grossPremium = patch.totalPremium;
      patch.premium = patch.totalPremium;
      patch.premiumIncludingGst = patch.totalPremium;
    }
  }

  // The policy schedule labels the taxable value explicitly; the GST-only
  // Amount row must never be interpreted as a net-premium invoice row.
  const scheduleNet = text.match(/(?:Total\s+Taxable\s+Value|Taxable\s+Value)\s*\(A\s*\+\s*B\)\s*(?:\(for\s+\d+\s+years?\))?\s*Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i);
  if (!bifurcation && scheduleNet) {
    patch.netPremium = patch.basicPremium = normalizeAmount(scheduleNet[1]);
  }
  if (cgstSgstMatch) {
    patch.cgst = normalizeAmount(cgstSgstMatch[1]);
    patch.sgst = normalizeAmount(cgstSgstMatch[2]);
    patch.gstAmount = patch.taxAmount = (Number(patch.cgst.replace(/,/g, "")) + Number(patch.sgst.replace(/,/g, ""))).toFixed(2);
  }

  // 11. Payment Details
  const payMatch =
    text.match(/Receipt\s+Particulars:[\s\S]*?(NEFT|CHEQUE|ONLINE|DD|CASH|CREDIT\s*CARD|DEBIT\s*CARD|UPI)[\s\r\n]+([0-9.]+)[\s\r\n]+([A-Z0-9]+?)\s*(\d{2}\/\d{2}\/\d{4})\s*([A-Z\s]+?)(?=\s+Amount|\n\n|$)/i) ||
    text.match(/Receipt\s+Particulars:[\s\S]*?(NEFT|CHEQUE|ONLINE|DD|CASH|CREDIT\s*CARD|DEBIT\s*CARD|UPI)\s*([A-Z0-9]+?)\s*(\d{2}\/\d{2}\/\d{4})\s*([A-Za-z\s]+?)(?=\s*\n|$)/i) ||
    text.match(/Receipt\s+Particulars:[\s\S]*?(Online-PG|ONLINE|NEFT|RTGS|CHEQUE|UPI|DD|CASH|CARD)\s*([A-Z0-9]+?)\s*(\d{2}\/\d{2}\/\d{4})/i);

  let rawPayMode = "";
  if (payMatch) {
    rawPayMode = payMatch[1];
    if (payMatch[5]) {
      patch.paymentAmount = normalizeAmount(payMatch[2]);
      patch.paymentReference = payMatch[3].trim();
      patch.paymentDate = normalizeDate(payMatch[4]);
      patch.bankName = payMatch[5].replace(/\s+/g, " ").trim();
    } else if (payMatch[3] && !payMatch[4]) {
      patch.paymentReference = payMatch[2].trim();
      patch.paymentDate = normalizeDate(payMatch[3]);
      patch.paymentAmount = patch.totalPremium || "";
    } else {
      patch.paymentReference = payMatch[2].trim();
      patch.paymentDate = normalizeDate(payMatch[3]);
      patch.bankName = payMatch[4] ? payMatch[4].replace(/\s+/g, " ").trim() : "";
      patch.paymentAmount = patch.totalPremium || "";
    }
  } else {
    rawPayMode = "Online";
  }

  const payModeUpper = String(rawPayMode).toUpperCase();
  const normalizedPayMode =
    payModeUpper.includes("NEFT") || payModeUpper.includes("RTGS") || payModeUpper.includes("DD")
      ? "NEFT / RTGS"
      : payModeUpper.includes("CHEQUE")
      ? "Cheque"
      : payModeUpper.includes("UPI")
      ? "UPI"
      : payModeUpper.includes("CARD")
      ? "Card"
      : payModeUpper.includes("CASH")
      ? "Cash"
      : "Online";

  patch.paymentMethod = rawPayMode ? rawPayMode.toUpperCase() : "ONLINE";
  patch.paymentMode = normalizedPayMode;
  patch.modeOfPayment = normalizedPayMode;

  if (patch.policyCoverType === "Stand Alone OD") {
    if (!patch.tpPremium) patch.tpPremium = "0.00";
    if (!patch.tpDriverOwner) patch.tpDriverOwner = "0.00";
  }

  // 12. Financer & Previous Policy Details
  const finMatch = text.match(/Under\s+Hire\s+Purchase\s*\/Hypo(?:thecated)?\/?\s*(?:Lease\s+Agreement\s+with)?\s*([^\n]+)/i);
  if (finMatch) {
    const rawFin = finMatch[1].replace(/\s+/g, " ").trim();
    if (!/^(?:NA\b|N\/A\b|NONE\b|NANominee|Subject\s+to\s+IMT)/i.test(rawFin)) {
      patch.financerName = rawFin.replace(/Nominees?.*$/i, "").trim();
    } else {
      patch.financerName = "";
    }
  } else {
    patch.financerName = "";
  }

  const prevMatch =
    text.match(/Previous\s+Policy\s+Number[^\n]*\n+([A-Z0-9]*\d)\s*([A-Z][A-Z\s.,&'()-]+?(?:ASSURANCE|INSURANCE|LTD|LIMITED)[A-Z\s.,&'()-]*?)(\d{2}\/\d{2}\/\d{4})/i) ||
    text.match(/Previous\s+Policy\s+Number[^\n]*\n+(\d{10,25})\s*([^\n]+?)\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (prevMatch) {
    patch.previousPolicyNumber = prevMatch[1].trim();
    const rawInsurer = prevMatch[2].replace(/\s+/g, " ").trim();
    const cleanInsurerMatch = rawInsurer.match(/(.*?ASSURANCE\s+CO\.?\s*LTD\.?|.*?INSURANCE\s+CO\.?\s*LTD\.?|.*?LIMITED|.*?LTD\.?)/i);
    patch.previousInsurer = cleanInsurerMatch ? cleanInsurerMatch[1].trim() : rawInsurer;
    patch.previousPolicyExpiryDate = normalizeDate(prevMatch[3]);
  }

  // 13. Additional Coverage & Metadata
  if (patch.registrationNumber && !patch.rtoLocation) {
    const rtoMatch = patch.registrationNumber.match(/^([A-Z]{2}\d{2})/i);
    if (rtoMatch) {
      const code = rtoMatch[1].toUpperCase();
      patch.rtoLocation = code === "MP04" ? "MP04-BHOPAL" : code;
    }
  }

  if (!patch.fuelType) {
    const textWithoutHeaders = text.replace(/CNG\/LPG\s*Kit/gi, "").replace(/Fuel\s+Delivery/gi, "");
    const fuelMatch = textWithoutHeaders.match(/\b(DIESEL|PETROL|ELECTRIC|LPG)\b/i);
    if (fuelMatch) {
      patch.fuelType = fuelMatch[1][0].toUpperCase() + fuelMatch[1].slice(1).toLowerCase();
    } else if (isTwoWheeler || /K12N|VVT|FRONX|SWIFT|ALTO|BALENO|DZIRE/i.test(text)) {
      patch.fuelType = "Petrol";
    }
  }

  const depWaiverMatch = text.match(/Depri?ciation\s+Wa[iv]{1,2}er(?:\s+Cover)?\s*([0-9,.]+)/i);
  if (depWaiverMatch) {
    patch.depreciationWaiverPremium = normalizeAmount(depWaiverMatch[1].replace(/,/g, ""));
    if (parseFloat(patch.depreciationWaiverPremium || 0) > 0) {
      patch.depreciationShieldCover = "Yes";
      patch.depreciationWaiverCover = "Yes";
      patch.nilDepreciation = "Yes";
      patch.zeroDepreciationCover = patch.depreciationWaiverPremium;
      patch.addOnCovers = patch.addOnCovers ? `${patch.addOnCovers}, Depreciation Waiver Cover` : "Depreciation Waiver Cover";
    }
  }

  if ((patch.depreciationWaiverPremium || patch.roadsideAssistance) && !patch.addonPremium) {
    const depAmt = parseFloat(String(patch.depreciationWaiverPremium || 0).replace(/,/g, ""));
    const rsaAmt = parseFloat(String(patch.roadsideAssistance || 0).replace(/,/g, ""));
    patch.addonPremium = normalizeAmount(String(depAmt + rsaAmt));
  }

  const compExcessMatch = text.match(/Compulsory\s+Excess\s*(?:\(IMT\s*22\))?\s*Rs\.?\s*([0-9,.]+)/i);
  if (compExcessMatch) {
    patch.compulsoryDeductible = normalizeAmount(compExcessMatch[1]);
    patch.compulsoryExcess = patch.compulsoryDeductible;
  }

  const imts = new Set();
  const imtListMatch = text.match(/Subject\s+to\s+IMT\s+Endorsement\s+Nos\.?[\s\r\n]*([0-9,\s]+?)(?=\n[A-Z]|\n\n|$)/i);
  if (imtListMatch) {
    const nums = imtListMatch[1].match(/\b\d+\b/g);
    if (nums) nums.forEach(n => imts.add(`IMT-${n}`));
  }
  if (/IMT\s*22\b/i.test(text)) imts.add("IMT-22");
  if (/IMT\s*24\b/i.test(text)) imts.add("IMT-24");
  if (/IMT\s*33\b/i.test(text)) imts.add("IMT-33");
  if (/IMT\s*10\b/i.test(text)) imts.add("IMT-10");
  if (/IMT\s*7\b/i.test(text)) imts.add("IMT-7");
  if (/IMT\s*28\b/i.test(text)) imts.add("IMT-28");
  if (/IMT\s*16\b/i.test(text)) imts.add("IMT-16");
  if (imts.size > 0) patch.imtEndorsements = Array.from(imts).join(", ");

  patch.extractionTrainingVersion = "IFFCO_TOKIO_MOTOR_V2";

  return patch;
}

module.exports = {
  scope,
  matches,
  train,
};
