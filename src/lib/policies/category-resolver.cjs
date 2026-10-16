// Universal Policy Category Resolver
// Single source of truth for assigning canonical policy categories to all extractions and uploads

function resolveDocumentCategory({
  currentCategory = "",
  policyType = "",
  insuredName = "",
  sourceFile = "",
  text = "",
  vehicleRegistrationNumber = "",
  makeModel = "",
} = {}) {
  const normCurrent = String(currentCategory || "").trim();
  const normType = String(policyType || "").trim();
  const normName = String(insuredName || "").trim();
  const normFile = String(sourceFile || "").trim();
  const normReg = String(vehicleRegistrationNumber || "").trim();
  const normMake = String(makeModel || "").trim();
  const normText = String(text || "").slice(0, 15000);

  const contextStr = [normCurrent, normType, normName, normFile, normMake].join(" ").toLowerCase();

  // 1. Warehouse Insurance (Checked first so warehouse properties with fire/burglary coverage are correctly identified)
  if (
    /\b(warehouse|godown|mpwlc|warehousing|bhandaran|bhandargrah)\b/i.test(contextStr) ||
    /\b(storage\s+of\s+non[- ]hazardous\s+goods|bhandaran\s+nigam)\b/i.test(normText)
  ) {
    // Exclude actual motor policies where insured is a warehouse logistics company
    const hasVehicleNumber = /^[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}$/i.test(normReg);
    const isCommercialMotor = /\b(goods\s+carrying|commercial\s+vehicle|private\s+car|two\s+wheeler|gcv|pcv)\b/i.test(normType);
    if (!hasVehicleNumber && !isCommercialMotor) {
      return "Warehouse Insurance";
    }
  }

  // 2. Health Insurance
  if (
    /\b(health|mediclaim|medical|hospital|hospitalization|family\s*floater|floater|critical\s*illness|optima\s*secure|elevate|reassure|arogya|ayush)\b/i.test(
      [normCurrent, normType, normFile].join(" ")
    ) ||
    /\b(health\s+insurance|mediclaim\s+insurance|individual\s+health|family\s+floater|pre[- ]existing\s+disease|sum\s+insured\s+for\s+hospitalization)\b/i.test(normText)
  ) {
    return "Health Insurance";
  }

  // 3. Motor Insurance
  if (
    /\b(motor|vehicle|private\s*car|two\s*wheeler|commercial\s*vehicle|gcv|pcv|car|scooter|bike|act\s*only|package\s*policy)\b/i.test(
      [normCurrent, normType, normFile].join(" ")
    ) ||
    /^[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}$/i.test(normReg) ||
    /\b(schedule\s+of\s+premium\s+for\s+motor|insured\s+vehicle|registration\s+no\b.*engine\s+no\b|chassis\s+no\b.*engine\s+no\b)/i.test(normText)
  ) {
    return "Motor Insurance";
  }

  // 4. Workmen Compensation
  if (/\b(workmen|workman|employee(?:'s)?\s*compensation|wc\s*policy)\b/i.test(contextStr) || /\bworkm(?:e|a)n(?:'s)?\s+compensation\b/i.test(normText)) {
    return "Workmen Compensation Insurance";
  }

  // 5. Burglary Insurance
  if (/\b(burglary|house\s*breaking|burglary\s*first\s*loss)\b/i.test(contextStr) || /\bburglary\s+and\s+house\s*breaking\b/i.test(normText)) {
    return "Burglary Insurance";
  }

  // 6. Marine Insurance
  if (/\b(marine|cargo|transit|inland\s*transit)\b/i.test(contextStr) || /\bmarine\s+cargo\s+policy\b/i.test(normText)) {
    return "Marine Insurance";
  }

  // 7. Fire Insurance
  if (/\b(fire|sfsp|standard\s+fire|special\s*perils|bharat\s*sookshma|bharat\s*laghu|bharat\s*griha)\b/i.test(contextStr) || /\bstandard\s+fire\s+and\s+special\s+perils\b/i.test(normText)) {
    return "Fire Insurance";
  }

  // 8. Engineering Insurance
  if (/\b(contractors\s*plant|cpm|machinery\s*breakdown|ear\s*policy|car\s*policy)\b/i.test(contextStr) || /\bcontractor'?s\s+plant\s+and\s+machinery\b/i.test(normText)) {
    return "Engineering Insurance";
  }

  // 9. Fidelity Insurance
  if (/\b(fidelity\s*guarantee|fidelity\s*insurance)\b/i.test(contextStr) || /\bfidelity\s+guarantee\b/i.test(normText)) {
    return "Fidelity Insurance";
  }

  // 10. Public Liability Insurance
  if (/\b(public\s*liability|cgl|commercial\s*general\s*liability)\b/i.test(contextStr) || /\bpublic\s+liability\s+policy\b/i.test(normText)) {
    return "Public Liability Insurance";
  }

  // Preserve existing clean specific category if non-empty and non-generic
  if (normCurrent && !/^(general|policy|non-motor|general insurance)$/i.test(normCurrent)) {
    return normCurrent;
  }

  return "Non-Motor Insurance";
}

module.exports = {
  resolveDocumentCategory,
};
