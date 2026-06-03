const REGISTRATION_PATTERN = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/;

function validatePolicyFields(data = {}) {
  const issues = [];

  addIssue(issues, validateRegistrationNumber(data.registrationNumber || data.vehicleNumber));
  addIssue(issues, validateIdentifierField("engineNumber", data.engineNumber, data.registrationNumber || data.vehicleNumber));
  addIssue(issues, validateChassisNumber(data.chassisNumber, data.engineNumber));
  addIssue(issues, validatePolicyNumber(data.policyNumber));
  addIssue(issues, validateMoneyField("premium", data.premium));
  addIssue(issues, validateMoneyField("totalPremium", data.totalPremium));
  addIssue(issues, validateMoneyField("netPremium", data.netPremium));
  addIssue(issues, validateMoneyField("gstAmount", data.gstAmount));
  addIssue(issues, validateDateField("startDate", data.startDate));
  addIssue(issues, validateDateField("expiryDate", data.expiryDate));

  return issues.filter(Boolean);
}

function validatePolicyCrossFields(data = {}) {
  const issues = [];
  const startDate = parsePolicyDate(data.startDate);
  const expiryDate = parsePolicyDate(data.expiryDate);

  if (startDate && expiryDate && startDate >= expiryDate) {
    issues.push(issue("date_chronology", "Policy start date should be before expiry date.", ["startDate", "expiryDate"]));
  }

  const registration = cleanRegistration(data.registrationNumber || data.vehicleNumber);
  const engine = cleanIdentifier(data.engineNumber);
  const chassis = cleanIdentifier(data.chassisNumber);

  if (registration && engine && registration === engine) {
    issues.push(issue("registration_equals_engine", "Registration number cannot equal engine number.", ["registrationNumber", "engineNumber"]));
  }

  if (chassis && engine && chassis === engine) {
    issues.push(issue("chassis_equals_engine", "Chassis number cannot equal engine number.", ["chassisNumber", "engineNumber"]));
  }

  const netPremium = parseAmount(data.netPremium || data.totalPackagePremium);
  const gstAmount = parseAmount(data.gstAmount);
  const totalPremium = parseAmount(data.totalPremium || data.premium);
  if (netPremium != null && gstAmount != null && totalPremium != null && Math.abs((netPremium + gstAmount) - totalPremium) > 2) {
    issues.push(issue("premium_total_mismatch", "Net premium plus GST should approximately match total premium.", ["netPremium", "gstAmount", "totalPremium"]));
  }

  if (/\btwo\s*wheeler\b/i.test(data.policyType || "") && Number(data.seatingCapacity) >= 5) {
    issues.push(issue("two_wheeler_seating", "Two wheeler policy has an unusually high seating capacity.", ["policyType", "seatingCapacity"]));
  }

  return issues;
}

function validateExtractionNonDestructive(data = {}) {
  const fieldIssues = validatePolicyFields(data);
  const crossFieldIssues = validatePolicyCrossFields(data);
  return {
    status: fieldIssues.length || crossFieldIssues.length ? "review_required" : "passed",
    fieldIssues,
    crossFieldIssues
  };
}

function validateRegistrationNumber(value) {
  const clean = cleanRegistration(value);
  if (!clean) return null;
  if (!REGISTRATION_PATTERN.test(clean)) {
    return issue("registration_format", "Registration number does not match a standard Indian vehicle format.", ["registrationNumber"]);
  }
  return null;
}

function validateIdentifierField(field, value, registrationNumber) {
  const clean = cleanIdentifier(value);
  if (!clean) return null;
  if (clean.length < 5 || !/[A-Z]/i.test(clean) || !/\d/.test(clean)) {
    return issue(`${field}_format`, `${field} should contain a realistic alphanumeric identifier.`, [field]);
  }
  if (cleanRegistration(registrationNumber) === clean) {
    return issue(`${field}_matches_registration`, `${field} cannot match the registration number.`, [field, "registrationNumber"]);
  }
  return null;
}

function validateChassisNumber(value, engineNumber) {
  const clean = cleanIdentifier(value);
  if (!clean) return null;
  if (clean.length < 8 || /^(?:CHASSIS|CHASSISNO|ENGINE|ENGINENO)$/i.test(clean)) {
    return issue("chassis_format", "Chassis number should be a realistic VIN/chassis identifier.", ["chassisNumber"]);
  }
  if (cleanIdentifier(engineNumber) === clean) {
    return issue("chassis_matches_engine", "Chassis number cannot match engine number.", ["chassisNumber", "engineNumber"]);
  }
  return null;
}

function validatePolicyNumber(value) {
  const clean = cleanIdentifier(value);
  if (!clean) return null;
  if (clean.length < 5 || !/\d/.test(clean)) {
    return issue("policy_number_format", "Policy number should contain a stable alphanumeric policy identifier.", ["policyNumber"]);
  }
  return null;
}

function validateMoneyField(field, value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  if (parseAmount(value) == null) {
    return issue(`${field}_amount_format`, `${field} should be numeric.`, [field]);
  }
  return null;
}

function validateDateField(field, value) {
  if (!value) return null;
  if (!parsePolicyDate(value)) {
    return issue(`${field}_date_format`, `${field} should contain a valid date.`, [field]);
  }
  return null;
}

function parsePolicyDate(value) {
  const text = String(value || "").trim();
  const slash = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const year = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) return date;
    return null;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmount(value) {
  const number = Number(String(value || "").replace(/[, ]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function cleanRegistration(value) {
  return String(value || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function cleanIdentifier(value) {
  return String(value || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function addIssue(issues, item) {
  if (item) issues.push(item);
}

function issue(code, message, fields) {
  return { code, message, fields, severity: "warning" };
}

module.exports = {
  validatePolicyFields,
  validatePolicyCrossFields,
  validateExtractionNonDestructive
};
