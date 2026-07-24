export function normalizePolicyFamily(record = {}) {
  const haystack = [
    record.policyType,
    record.selectedPolicyType,
    record.documentCategory,
    record.policyCoverType,
    record.insuranceCompany,
    record.companyName,
    record.sourceFile,
    record.description,
    record.vehicleNumber,
    record.registrationNumber,
    record.engineNumber,
    record.chassisNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!haystack.trim()) return "";

  if (
    /\b(motor|vehicle|private\s+car|two\s+wheeler|commercial\s+vehicle|goods\s+carrying|auto\s+secure|registration|chassis|engine)\b/.test(
      haystack,
    ) ||
    /\b[a-z]{2}[-\s]?\d{1,2}[-\s]?[a-z]{1,3}[-\s]?\d{4}\b/.test(haystack)
  ) {
    return "Motor Policy";
  }
  if (
    /\b(fire|sfsp|standard\s+fire|msme\s+suraksha|burglary|warehouse|stock|contents|property|industrial\s+all\s+risk)\b/.test(
      haystack,
    )
  ) {
    return "Fire Policy";
  }
  if (
    /\b(health|mediclaim|medical|family\s+floater|critical\s+illness|hospital|personal\s+accident|pa policy)\b/.test(
      haystack,
    )
  ) {
    return "Health Policy";
  }
  if (/\b(life|term\s+life|endowment|ulip|whole\s+life|annuity|pension)\b/.test(haystack)) {
    return "Life Policy";
  }
  if (/\b(travel|journey|overseas|student\s+travel)\b/.test(haystack)) {
    return "Travel Policy";
  }
  if (/\b(marine|transit|cargo|inland\s+transit)\b/.test(haystack)) {
    return "Marine Policy";
  }
  if (/\b(home|householder|building|contents)\b/.test(haystack)) {
    return "Home Policy";
  }
  if (/\b(engineering|contractor|erection|machinery|boiler|plant)\b/.test(haystack)) {
    return "Engineering Policy";
  }
  if (/\b(liability|professional\s+indemnity|public\s+liability|workmen|cyber)\b/.test(haystack)) {
    return "Liability Policy";
  }

  return cleanPolicyType(record.policyType || record.selectedPolicyType || "General Policy");
}

export function formatPolicySubType(record = {}) {
  const rawType = String(record.policyType || record.selectedPolicyType || record.productName || "").trim();

  const haystack = [
    record.policyType,
    record.selectedPolicyType,
    record.productName,
    record.documentCategory,
    record.policyCoverType,
    record.insuranceCompany,
    record.companyName,
    record.sourceFile,
    record.description,
    record.makeModel,
    record.vehicleNumber,
    record.registrationNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!haystack.trim()) return "Policy";

  const family = normalizePolicyFamily(record);

  if (family === "Motor Policy") {
    if (/\b(two\s*wheeler|scooter|bike|motorcycle|2\s*w(?:heeler)?)\b/.test(haystack)) {
      return "Two Wheeler";
    }
    if (/\b(goods\s*carrying|gcv|truck|tractor|lorry|dumper|jcb|trailer)\b/.test(haystack)) {
      return "Commercial Vehicle";
    }
    if (/\b(passenger\s*carrying|pcv|taxi|cab|bus|auto\s*rickshaw)\b/.test(haystack)) {
      return "Commercial Vehicle";
    }
    if (/\b(commercial\s*vehicle|commercial|heavy\s*vehicle|gcv|pcv)\b/.test(haystack)) {
      return "Commercial Vehicle";
    }
    if (/\b(private\s*car|car|hatchback|sedan|suv|saloon|private)\b/.test(haystack)) {
      return "Private Car";
    }
    if (rawType && !/^(motor|motor policy|policy)$/i.test(rawType)) {
      const cleaned = cleanPolicyType(rawType);
      if (cleaned) return cleaned;
    }
    return "Motor Policy";
  }

  if (family === "Fire Policy") {
    if (/\b(sfsp|standard\s+fire)\b/.test(haystack)) return "Fire & Special Perils";
    if (/\bburglary\b/.test(haystack)) return "Burglary Policy";
    if (/\bfidelity\b/.test(haystack)) return "Fidelity Guarantee";
    if (/\b(warehouse|stock|storage)\b/.test(haystack)) return "Warehouse Policy";
    if (/\b(msme|sookshma|laghu)\b/.test(haystack)) return "MSME Property Policy";
    if (rawType && !/^(fire|fire policy|policy)$/i.test(rawType)) {
      const cleaned = cleanPolicyType(rawType);
      if (cleaned) return cleaned;
    }
    return "Fire Policy";
  }

  if (family === "Health Policy") {
    if (/\b(family\s+floater|floater)\b/.test(haystack)) return "Family Floater Health";
    if (/\b(gmc|group)\b/.test(haystack)) return "Group Health";
    if (/\bindividual\b/.test(haystack)) return "Individual Health";
    if (rawType && !/^(health|health policy|policy)$/i.test(rawType)) {
      const cleaned = cleanPolicyType(rawType);
      if (cleaned) return cleaned;
    }
    return "Health Policy";
  }

  if (rawType && !/^(general policy|policy)$/i.test(rawType)) {
    const cleaned = cleanPolicyType(rawType);
    if (cleaned) return cleaned;
  }

  return family || "Policy";
}

export function withRenewalPolicyDisplay(record = {}) {
  const originalPolicyType = record.policyType || "";
  const policyFamily = normalizePolicyFamily(record);
  const displayPolicyType = formatPolicySubType(record);

  return {
    ...record,
    originalPolicyType,
    policyFamily,
    displayPolicyType,
    policyType: displayPolicyType || originalPolicyType,
  };
}

function cleanPolicyType(value) {
  return String(value || "")
    .replace(
      /\b(package|comprehensive|liability\s*only|third\s*party|zero\s*dep(?:reciation)?|nil\s*dep(?:reciation)?|own\s*damage)\b/gi,
      "",
    )
    .replace(/\s*[-–—:]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
