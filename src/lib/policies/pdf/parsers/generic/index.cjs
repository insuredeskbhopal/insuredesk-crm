
const { matchGroup } = require("../../utils/regex.cjs");
const { normalizeAmount, sumAmounts, diffAmounts, extractIffcoPremiumFromBlock } = require("../../utils/amounts.cjs");
const { extractNewIndiaDenseIdv } = require("../../utils/motor.cjs");

// Start of extractGenericPolicyPeriod (Lines 3671-3725)
function extractGenericPolicyPeriod(text) {
  const source = String(text || "");
  const date = "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})";
  const periodPatterns = [
    new RegExp(`Period\\s+of\\s+cover\\s*${date}[^\\n]{0,80}?\\bto\\b\\s*${date}`, "i"),
    new RegExp(
      `Period\\s+of\\s+Insurance\\s*[:.-]?\\s*From\\s*[:.-]?\\s*(?:\\d{1,2}:\\d{2}(?::\\d{2})?\\s*)?(?:hours\\s+of\\s*)?${date}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?\\s*(?:To|Upto|Till)\\s*[:.-]?\\s*(?:Midnight\\s*(?:On|of)?\\s*)?${date}`,
      "i",
    ),
    new RegExp(
      `Period\\s+of\\s+Insurance\\s*[:.-]?\\s*From\\s*(?:\\d{1,2}:\\d{2}\\s*)?(?:hours\\s+of\\s*)?${date}\\s*(?:To|Upto|Till)\\s*(?:Midnight\\s*(?:On|of)?\\s*)?${date}`,
      "i",
    ),
    new RegExp(
      `From\\s*[:.-]?\\s*(?:\\d{1,2}:\\d{2}\\s*)?(?:Hours\\s+of\\s*)?${date}\\s*(?:To|Upto|Till)\\s*[:.-]?\\s*(?:Midnight\\s*(?:On|of)?\\s*)?${date}`,
      "i",
    ),
    new RegExp(
      `Policy\\s+effective\\s+from\\s*(?:\\d{3,4}\\s*hrs?\\s*)?${date}[\\s\\S]{0,220}?\\bTo\\s+MidNight\\s*${date}`,
      "i",
    ),
    new RegExp(
      `(?:Start|Commencement)\\s*Date\\s*[:.-]?\\s*${date}[\\s\\S]{0,180}?(?:Expiry|End)\\s*Date\\s*[:.-]?\\s*${date}`,
      "i",
    ),
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
      matchGroup(
        source,
        new RegExp(`From\\s*[:.-]?\\s*(?:\\d{1,2}:\\d{2}\\s*)?(?:Hours\\s+of\\s*)?${date}`, "i"),
      ) ||
      matchGroup(
        source,
        new RegExp(`Period\\s+of\\s+Insurance\\s*from\\s*:?\\s*(?:00:00\\s+hours\\s+of\\s*)?${date}`, "i"),
      ) ||
      matchGroup(source, new RegExp(`(?:Start|Commencement)\\s*Date\\s*[:.-]?\\s*${date}`, "i")) ||
      matchGroup(source, new RegExp(`Policy\\s+effective\\s+from\\s*(?:\\d{3,4}\\s*hrs?\\s*)?${date}`, "i")),
    expiryDate:
      matchGroup(source, new RegExp(`Period\\s+of\\s+cover\\s*${date}[^\\n]+?\\bto\\s+${date}`, "i"), 2) ||
      matchGroup(source, new RegExp(`To\\s*[:.-]?\\s*(?:Midnight\\s*(?:On|of)?\\s*)?${date}`, "i")) ||
      matchGroup(source, new RegExp(`To\\s+MidNight\\s*${date}`, "i")) ||
      matchGroup(source, new RegExp(`(?:Expiry|End)\\s*Date\\s*[:.-]?\\s*${date}`, "i")) ||
      matchGroup(source, new RegExp(`(?:midnight\\s+of\\s+)?${date}\\s*(?:midnight|23:59)`, "i")),
  };
}

// Start of extractGenericPremiumSchedule (Lines 4485-4574)
function extractGenericPremiumSchedule(text, fallbackTotal) {
  const result = {
    basicOwnDamage: "",
    totalPremium: "",
    netPremium: "",
    tpDriverOwner: "",
    odPremium: "",
    gstAmount: "",
    cgst: "",
    sgst: "",
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
    matchGroup(
      text,
      /\bSection\s*1\s*(?:\(\s*A\s*\+\s*B\s*\))?\s*(?:Rs\.?)?\s*\n?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    ) ||
    matchGroup(
      text,
      /\bSection\s*1\s*\(A\s*\+\s*B\)\s*(?:\(for\s*1\s*years?\)?)?\s*(?:Rs\.?)?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    ) ||
    matchGroup(text, /\bNet\s+Premium\s*(?:Rs\.?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bNet\s+Premium\s*\(A\+B\+C\+D\)\s*₹?\s*([0-9,]+(?:\.\d{1,2})?)/i) ||
    matchGroup(text, /\bTaxable\s+Value[\s\S]{0,120}?\bAmount\s*([0-9,]+(?:\.\d{1,2})?)/i);

  const total =
    matchGroup(
      text,
      /\bPremium\s+Paid\s*\(\s*Total\s+Invoice\s+Value\s*\)\s*Rs\.?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    ) ||
    matchGroup(
      text,
      /\bTotal\s*Premium\s*(?:inclusive\s*Tax)?\s*(?:\(?Rs\.?\)?)?\s*[:.-]?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    ) ||
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

// Start of extractGenericGstBreakup (Lines 4576-4597)
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

// Start of extractPremium (Lines 4599-4661)
function extractPremium(text) {
  const totalInvoicePremium = normalizeAmount(
    matchGroup(
      text,
      /\bPremium\s+Paid\s*\(\s*Total\s+Invoice\s+Value\s*\)\s*Rs\.?\s*([0-9,]+(?:\.\d{1,2})?)/i,
    ),
  );
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
        if (!numbers[i].endsWith(".00")) return normalizeAmount(numbers[i]);
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
        if (!numbers[i].endsWith(".00")) return normalizeAmount(numbers[i]);
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
    /Premium\s*(?:Amount)?\s*(?:Rs\.?|INR)?\s*([0-9,]+\.\d{2})/i,
  ];
  for (const pattern of fallbacks) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeAmount(match[1]);
  }
  return "";
}

// Start of extractIDV (Lines 4721-4767)
function extractIDV(text) {
  // New India Assurance IDV patterns
  const NIA_idvMatch1 = text.match(/individual covers\s*\(OD\)\s*in\s*RS\s*[:.-]?\s*([0-9,]+)/i);
  if (NIA_idvMatch1?.[1]) {
    return normalizeAmount(NIA_idvMatch1[1]);
  }
  const newIndiaDenseIdv = extractNewIndiaDenseIdv(text);
  if (newIndiaDenseIdv) return newIndiaDenseIdv;
  const NIA_idvMatchInline = text.match(
    /\b(?:Insured\s+Declared\s+Value|IDV)(?:\s*\([^)]*\)|\s*\/\s*IDV|\s+IDV|\s+in\s+Rs\.?|\s*\(?Rs\.?\)?)?\s*[:.-]?\s*(?:Rs\.?\s*)?([1-9][0-9,]{4,8}(?:\.\d{1,2})?)/i,
  );
  if (NIA_idvMatchInline?.[1]) {
    return normalizeAmount(NIA_idvMatchInline[1]);
  }
  const NIA_idvMatchNearby = text.match(
    /\bInsured\s+Declared\s+Value[\s\S]{0,140}?\b(?:Total\s*)?IDV[\s\S]{0,80}?([1-9][0-9,]{4,8}(?:\.\d{1,2})?)/i,
  );
  if (NIA_idvMatchNearby?.[1]) {
    return normalizeAmount(NIA_idvMatchNearby[1]);
  }
  const NIA_idvMatch2 = text.match(
    /(?:INSURED DECLARED VALUE|Insured Declared Value)[^\n]*\n[^\n]*\n\s*([1-9]\d{4,8})/i,
  );
  if (NIA_idvMatch2?.[1]) {
    return normalizeAmount(NIA_idvMatch2[1]);
  }

  const inlinePatterns = [
    /\bIDV(?:\.|:)?\s*([0-9,]+\.\d{2})/i,
    /\bInsured Declared Value(?:\.|:)?\s*([0-9,]+\.\d{2})/i,
    /IDV in Rs\.?\s*\n?[^0-9]*([0-9,]+\.\d{2})/i,
    /\bIDV(?:\.|:)?\s*(?:Rs\.?\s*)?([0-9,]+)/i,
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

module.exports = {
  extractGenericPolicyPeriod,
  extractGenericPremiumSchedule,
  extractGenericGstBreakup,
  extractPremium,
  extractIDV
};
