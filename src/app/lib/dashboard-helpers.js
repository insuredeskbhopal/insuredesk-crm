import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/uploads/status";
import { validateContactPerson, validateContactNumber } from "@/lib/records/validation";

export const MANUAL_REQUIRED_FIELDS = ["contactPerson", "contactNumber", "clientId"];
export const MOTOR_MANUAL_REQUIRED_FIELDS = [];
export const COMMON_REVIEW_FIELDS = ["whatsappGroupName"];

export const PAYMENT_MODE_OPTIONS = [
  { value: "", label: "Select payment mode" },
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
  { value: "UPI", label: "UPI" },
  { value: "NEFT / RTGS", label: "NEFT / RTGS" },
  { value: "Card", label: "Card" },
  { value: "Online", label: "Online" },
];

export const FUEL_TYPE_OPTIONS = [
  { value: "", label: "Select fuel type" },
  { value: "Petrol", label: "Petrol" },
  { value: "Diesel", label: "Diesel" },
  { value: "CNG", label: "CNG" },
  { value: "LPG", label: "LPG" },
  { value: "Electric", label: "Electric" },
  { value: "Hybrid", label: "Hybrid" },
];

export const FIELD_LABELS = {
  appointeeName: "Appointee Name",
  bankChargeType: "Bank Charge Type",
  basicPremium: "Basic Premium",
  brokerCode: "Broker Code",
  brokerEmail: "Broker Email",
  brokerMobile: "Broker Mobile",
  brokerName: "Broker Name",
  buildingSumInsured: "Building Sum Insured",
  burglarySumInsured: "Burglary Sum Insured",
  businessDescription: "Business Description",
  cgst: "CGST",
  chassisNumber: "Chassis Number",
  clientId: "Client ID",
  collectedAmount: "Collected Amount",
  contactNumber: "Contact Number",
  contactPerson: "Contact Person",
  contentsSumInsured: "Contents Sum Insured",
  createdAt: "Created Date",
  cubicCapacity: "Cubic Capacity",
  description: "Description",
  district: "District",
  documentCategory: "Document Category",
  documentFormat: "Document Format",
  dueCollection: "Due Collection",
  duration: "Duration",
  engineNumber: "Engine Number",
  expiryDate: "Expiry Date",
  fidelitySumInsured: "Fidelity Sum Insured",
  financerName: "Financer Name",
  fuelType: "Fuel Type",
  grossVehicleWeight: "Gross Vehicle Weight",
  groupName: "Group Name",
  gstAmount: "GST Amount",
  gstin: "GSTIN",
  hypothecationDetails: "Hypothecation Details",
  idv: "IDV",
  igst: "IGST",
  insuranceCompany: "Insurance Company",
  insuredMembers: "Insured Members",
  insuredName: "Insured Name",
  invoiceDate: "Invoice Date",
  invoiceNumber: "Invoice Number",
  issuedAt: "Issued At",
  loyaltyBonus: "Loyalty Bonus",
  mailingAddress: "Mailing Address",
  makeModel: "Make / Model",
  manufacturingYear: "Manufacturing Year",
  modeOfPayment: "Mode Of Payment",
  ncb: "NCB",
  netPremium: "Net Premium",
  newOrRenewal: "New / Renewal",
  nomineeDateOfBirth: "Nominee Date of Birth",
  nomineeName: "Nominee Name",
  nomineeRelationship: "Nominee Relationship",
  numberOfInsuredMembers: "Number of Insured Members",
  occupancy: "Occupancy",
  placeOfSupply: "Place of Supply",
  policyCoverType: "Policy Cover Type",
  policyNumber: "Policy Number",
  policyTenure: "Policy Tenure",
  policyType: "Policy Type",
  powerBooster: "Power Booster",
  pptMpwlc: "PPT / MPWLC",
  premisesAddress: "Premises Address",
  premium: "Premium",
  productName: "Product Name",
  productUin: "Product UIN",
  registrationDate: "Registration Date",
  registrationNumber: "Registration Number",
  remark: "Remark",
  riskLocation: "Risk Location",
  rtoLocation: "RTO Location",
  savedAt: "Saved Date",
  seatingCapacity: "Seating Capacity",
  servicingBranchAddress: "Servicing Branch Address",
  servicingBranchName: "Servicing Branch Name",
  sgst: "SGST",
  sourceDocumentType: "Source Document Type",
  sourceFile: "Source PDF File",
  stampDuty: "Stamp Duty",
  startDate: "Start Date",
  stockSumInsured: "Stock Sum Insured",
  sumInsured: "Sum Insured",
  taxAmount: "Tax Amount",
  tehsil: "Tehsil",
  totalPremium: "Total Premium",
  validIn: "Valid In",
  variant: "Variant",
  vehicleNumber: "Vehicle Number",
  whatsappGroupName: "WhatsApp Group Name",
};

export function getFieldLabel(key = "") {
  return FIELD_LABELS[key] || String(key).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (char) => char.toUpperCase());
}

export function hasValue(value) {
  if (typeof value === "boolean") return true;
  return String(value ?? "").trim().length > 0;
}

export function isRecognizedFuelType(value = "") {
  return /^(petrol|diesel|cng|lpg|electric|ev|hybrid)$/i.test(String(value || "").trim());
}

export function shouldUseExtractedFuelType(data = {}) {
  if (!hasValue(data?.fuelType) || !isRecognizedFuelType(data.fuelType)) return false;

  const documentFormat = String(data?.documentFormat || data?.policyUnderstanding?.documentFormat || "");
  if (/_MOTOR_V\d+$/i.test(documentFormat)) return true;

  const haystack = [data?.insuranceCompany, data?.companyName, data?.policyType, data?.sourceFile]
    .filter(Boolean)
    .join(" ");

  return (
    /\b(?:TATA\s*AIG|New\s+India|IFFCO[-\s]?TOKIO|HDFC\s+ERGO|ICICI\s+Lombard|Bajaj\s+Allianz|Go\s+Digit|Generali|Royal\s+Sundaram)\b/i.test(
      haystack,
    ) &&
    /\b(?:motor|vehicle|private\s+car|two\s+wheeler|package|registration|chassis|engine)\b/i.test(haystack)
  );
}

export function shouldUseExtractedVariant(data = {}, upload = {}) {
  const haystack = [data.insuranceCompany, data.companyName, data.sourceFile, upload.sourceFile]
    .filter(Boolean)
    .join(" ");

  return /\bnew\s+india\b/i.test(haystack);
}

export function isManualRequiredField(key) {
  return MANUAL_REQUIRED_FIELDS.includes(key) || MOTOR_MANUAL_REQUIRED_FIELDS.includes(key);
}

export function isFieldManualForUpload(upload, key) {
  if (key === "fuelType" && shouldUseExtractedFuelType(upload?.extractedData)) return false;
  return isManualRequiredField(key);
}

export function getReviewFieldValue(upload, key) {
  if (key === "fuelType" && shouldUseExtractedFuelType(upload?.extractedData))
    return upload?.extractedData?.[key] || "";
  if (isManualRequiredField(key) && Array.isArray(upload?.manualFields) && !upload.manualFields.includes(key))
    return "";
  return upload?.extractedData?.[key] || "";
}

function getPremiumValue(record = {}) {
  return record.netPremium || record.totalPremium || record.premium || "";
}

export function inferRequiredFields(groupId, policyId) {
  if (groupId === "motor") {
    const base = [
      "insuredName",
      "policyNumber",
      "insuranceCompany",
      "premium",
      "startDate",
      "expiryDate",
      "vehicleNumber",
      "engineNumber",
      "chassisNumber",
    ];

    if (policyId === "motor-private-car-package" || policyId === "motor-two-wheeler-package") {
      return [...base, "idv"];
    }

    if (
      policyId === "motor-goods-carrying" ||
      policyId === "motor-passenger-carrying" ||
      policyId === "motor-taxi-cab" ||
      policyId === "motor-school-bus"
    ) {
      return [...base, "policyCoverType"];
    }

    return base;
  }

  if (groupId === "fire") {
    return [
      "insuredName",
      "policyNumber",
      "insuranceCompany",
      "premium",
      "startDate",
      "expiryDate",
      "riskLocation",
    ];
  }

  if (
    groupId === "health" ||
    groupId === "life" ||
    groupId === "home" ||
    groupId === "cyber" ||
    groupId === "misc"
  ) {
    return ["insuredName", "policyNumber", "insuranceCompany", "premium", "startDate", "expiryDate"];
  }

  return ["insuredName", "policyNumber"];
}

export function inferPolicyFamily(haystack, extracted = {}) {
  const docCategory = String(extracted.documentCategory || "").toLowerCase();
  const docFormat = String(extracted.documentFormat || "").toLowerCase();
  const explicitNonMotor = docCategory + " " + docFormat;
  if (/health|medical|mediclaim/i.test(explicitNonMotor)) return "health";
  if (/warehouse|fire|msme|suraksha|sfsp|burglary|property|workmen/i.test(explicitNonMotor)) return "fire";

  const policyType = String(extracted.policyType || "").toLowerCase();
  if (/warehouse|fire|sfsp|msme|suraksha|burglary|property|stock|contents/i.test(policyType)) return "fire";

  const hasMotorSignals =
    hasValue(extracted.vehicleNumber) ||
    hasValue(extracted.registrationNumber) ||
    hasValue(extracted.engineNumber) ||
    hasValue(extracted.chassisNumber) ||
    hasValue(extracted.idv) ||
    /\b(motor|private car|two wheeler|bike|scooter|commercial vehicle|taxi|cab|bus|chassis|engine)\b/.test(
      haystack,
    );
  if (hasMotorSignals) return "motor";

  if (/\b(sfsp|fire|burglary|msme|warehouse|stock|property|contents)\b/.test(haystack)) return "fire";
  if (/\b(health|mediclaim|hospital|family floater|tpa)\b/.test(haystack)) return "health";
  if (/\b(term life|endowment|life policy|life assured|nominee)\b/.test(haystack)) return "life";
  if (/\b(home building|home contents|home policy)\b/.test(haystack)) return "home";
  if (/\b(cyber|ransomware|data breach|network security)\b/.test(haystack)) return "cyber";
  if (/\b(marine|travel|liability)\b/.test(haystack)) return "misc";

  return null;
}

export function inferPolicySchemaWithinGroup(group, haystack, extracted = {}) {
  if (group.id !== "motor") {
    if (group.id === "fire") {
      if (/\bburglary\b/.test(haystack)) return group.policies.find((item) => item.id === "fire-burglary");
      if (/\bsfsp\b/.test(haystack)) return group.policies.find((item) => item.id === "fire-sfsp");
    }
    return group.policies?.[0] || null;
  }

  if (/\b(two wheeler|bike|scooter)\b/.test(haystack) || hasValue(extracted.cubicCapacity)) {
    if (/\b(liability only|third party)\b/.test(haystack)) {
      return group.policies.find((item) => item.id === "motor-two-wheeler-third-party");
    }
    return group.policies.find((item) => item.id === "motor-two-wheeler-package");
  }
  if (
    /\bprivate car\b/.test(haystack) ||
    hasValue(extracted.seatingCapacity) ||
    hasValue(extracted.makeModel)
  ) {
    if (/\b(liability only|third party)\b/.test(haystack)) {
      return group.policies.find((item) => item.id === "motor-private-car-third-party");
    }
    return group.policies.find((item) => item.id === "motor-private-car-package");
  }
  if (/\bschool bus\b/.test(haystack)) {
    return group.policies.find((item) => item.id === "motor-school-bus");
  }
  if (/\b(taxi|cab)\b/.test(haystack)) {
    return group.policies.find((item) => item.id === "motor-taxi-cab");
  }
  if (/\b(passenger carrying|passenger)\b/.test(haystack)) {
    return group.policies.find((item) => item.id === "motor-passenger-carrying");
  }
  if (
    /\b(goods carrying|commercial vehicle|goods vehicle)\b/.test(haystack) ||
    hasValue(extracted.grossVehicleWeight)
  ) {
    return group.policies.find((item) => item.id === "motor-goods-carrying");
  }
  if (/\bfleet\b/.test(haystack) || hasValue(extracted.groupName)) {
    return group.policies.find((item) => item.id === "motor-fleet");
  }

  return group.policies?.[0] || null;
}

export const FIELD_GROUPS = [
  {
    title: "Policy Details",
    fields: [
      "insuredName",
      "insuranceCompany",
      "policyNumber",
      "policyType",
      "newOrRenewal",
      "startDate",
      "expiryDate",
      "policyTenure",
      "sumInsured",
      "premium",
      "duration",
      "policyCoverType",
      "pptMpwlc",
    ],
  },
  {
    title: "Vehicle Details",
    fields: [
      "vehicleNumber",
      "registrationNumber",
      "makeModel",
      "variant",
      "manufacturingYear",
      "registrationDate",
      "engineNumber",
      "chassisNumber",
      "fuelType",
      "cubicCapacity",
      "seatingCapacity",
      "grossVehicleWeight",
      "idv",
      "ncb",
      "rtoLocation",
    ],
  },
  {
    title: "Contact & Parties",
    fields: [
      "contactPerson",
      "contactNumber",
      "mailingAddress",
      "whatsappGroupName",
      "clientId",
    ],
  },
  {
    title: "Payment",
    fields: [
      "totalPremium",
      "netPremium",
      "basicPremium",
      "taxAmount",
      "gstAmount",
      "stampDuty",
      "cgst",
      "sgst",
      "igst",
      "collectedAmount",
      "modeOfPayment",
      "dueCollection",
      "invoiceNumber",
      "invoiceDate",
      "gstin",
      "placeOfSupply",
    ],
  },
  {
    title: "Warehouse & Property",
    fields: [
      "riskLocation",
      "district",
      "tehsil",
      "occupancy",
      "description",
      "premisesAddress",
      "businessDescription",
      "contentsSumInsured",
      "buildingSumInsured",
      "stockSumInsured",
      "burglarySumInsured",
      "fidelitySumInsured",
    ],
  },
  {
    title: "Document & Source",
    fields: [
      "sourceFile",
      "sourceDocumentType",
      "documentCategory",
      "documentFormat",
      "productName",
      "productUin",
      "validIn",
      "issuedAt",
      "hypothecationDetails",
      "bankChargeType",
      "financerName",
      "brokerCode",
      "brokerName",
      "brokerMobile",
      "brokerEmail",
    ],
  },
  {
    title: "Health & Members",
    fields: [
      "nomineeName",
      "nomineeRelationship",
      "nomineeDateOfBirth",
      "appointeeName",
      "numberOfInsuredMembers",
      "loyaltyBonus",
      "powerBooster",
      "servicingBranchName",
      "servicingBranchAddress",
    ],
  },
  {
    title: "Internal Remarks",
    fields: ["remark"],
  },
];

export const FIELD_SETUP = FIELD_GROUPS.flatMap((group) => group.fields.map((key) => [getFieldLabel(key), key]));

export const POLICY_SCHEMA_LIBRARY = [
  {
    id: "motor",
    label: "Motor Insurance",
    policies: [
      { id: "motor-private-car-package", name: "Private Car Comprehensive / Package Policy" },
      { id: "motor-private-car-third-party", name: "Private Car Third Party Liability Only" },
      { id: "motor-two-wheeler-package", name: "Two Wheeler Comprehensive / Package Policy" },
      { id: "motor-two-wheeler-third-party", name: "Two Wheeler Third Party Liability Only" },
      { id: "motor-goods-carrying", name: "Goods Carrying Commercial Vehicle Policy" },
      { id: "motor-passenger-carrying", name: "Passenger Carrying Commercial Vehicle Policy" },
      { id: "motor-taxi-cab", name: "Taxi / Cab Commercial Vehicle Policy" },
      { id: "motor-school-bus", name: "School Bus / Passenger Vehicle Policy" },
      { id: "motor-fleet", name: "Fleet Motor Policy" },
    ],
  },
  {
    id: "fire",
    label: "Warehouse / Fire / Property",
    policies: [
      { id: "fire-warehouse", name: "Warehouse & Storage Property Insurance" },
      { id: "fire-sfsp", name: "Standard Fire & Special Perils Policy (SFSP)" },
      { id: "fire-burglary", name: "Burglary & Housebreaking Policy" },
      { id: "fire-msme", name: "MSME / Bharat Sookshma & Laghu Udyam Suraksha" },
      { id: "fire-fidelity", name: "Fidelity Guarantee Policy" },
    ],
  },
  {
    id: "health",
    label: "Health Insurance",
    policies: [
      { id: "health-individual", name: "Individual Mediclaim Policy" },
      { id: "health-family-floater", name: "Family Floater Health Insurance" },
      { id: "health-group", name: "Group Mediclaim Policy (GMC)" },
    ],
  },
  {
    id: "life",
    label: "Life Insurance",
    policies: [
      { id: "life-term", name: "Term Life Insurance" },
      { id: "life-endowment", name: "Endowment / Savings Life Plan" },
      { id: "life-group", name: "Group Term Life Policy (GTL)" },
    ],
  },
];

export function canSaveWithPendingClientId(validation, clientIdRequestId) {
  return (
    Boolean(clientIdRequestId) &&
    validation.contactErrors?.length === 0 &&
    validation.missingRequired?.every((field) => field === "clientId" || field === "Client ID")
  );
}

export function formatReviewValidationError(missingRequired = [], contactErrors = []) {
  if (contactErrors.length) return contactErrors.join(" ");
  return `Fill required field${missingRequired.length === 1 ? "" : "s"} before saving: ${missingRequired.join(", ")}.`;
}

export function resolvePolicySchema(groupId, policyId) {
  const group = POLICY_SCHEMA_LIBRARY.find((item) => item.id === groupId);
  if (!group) return null;

  const policy = group.policies.find((item) => item.id === policyId) || group.policies[0];
  if (!policy) return null;

  return {
    groupId: group.id,
    groupLabel: group.label,
    policyId: policy.id,
    policyName: policy.name,
    fields: policy.fields || [],
    requiredFields: inferRequiredFields(group.id, policy.id),
  };
}

export function reviewStatusLabel(upload, missingRequired = []) {
  if (!upload) return "Waiting";
  const status = normalizeUploadStatus(upload.status);
  if (status === UPLOAD_STATUS.APPROVED) return "Saved";
  if (status === UPLOAD_STATUS.FAILED) return "Failed";
  if (status === UPLOAD_STATUS.PROCESSING || status === UPLOAD_STATUS.PENDING) return "Extracting";
  if (missingRequired.length) return "Needs manual input";
  return "Ready for Review";
}

function addFields(fields, keys) {
  const existing = new Set(fields.map(([, key]) => key));
  const extras = FIELD_SETUP.filter(([, key]) => keys.includes(key) && !existing.has(key));
  return [...fields, ...extras];
}

function addUnique(values, extras) {
  return Array.from(new Set([...(values || []), ...extras]));
}

export function inferUploadSchema(upload) {
  if (!upload) return null;

  const extracted = upload.extractedData || {};
  const haystack = [
    upload.sourceFile,
    extracted.policyType,
    extracted.insuranceCompany,
    extracted.description,
    extracted.vehicleNumber,
    extracted.registrationNumber,
    extracted.makeModel,
    extracted.riskLocation,
    extracted.documentCategory,
    extracted.documentFormat,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const family = inferPolicyFamily(haystack, extracted);
  if (!family) return null;

  const group = POLICY_SCHEMA_LIBRARY.find((item) => item.id === family);
  if (!group) return null;

  const policy = inferPolicySchemaWithinGroup(group, haystack, extracted);
  return {
    groupId: group.id,
    groupLabel: group.label,
    policyId: policy?.id || group.policies?.[0]?.id || "",
    policyName: policy?.name || group.policies?.[0]?.name || group.label,
    fields: policy?.fields || group.policies?.[0]?.fields || [],
    requiredFields: inferRequiredFields(group.id, policy?.id),
  };
}

export function getMissingRequiredFields(upload, visibleFields = FIELD_SETUP, requiredKeys = []) {
  const visibleKeys = new Set(visibleFields.map(([, key]) => key));
  const fieldLabels = new Map(FIELD_SETUP.map(([label, key]) => [key, label]));
  const activeRequiredKeys = new Set(requiredKeys.length ? requiredKeys : ["insuredName", "policyNumber"]);
  return Array.from(activeRequiredKeys)
    .filter((key) => visibleKeys.has(key) && !hasValue(getReviewFieldValue(upload, key)))
    .map((key) => fieldLabels.get(key) || key);
}

export function getReviewValidation(upload, options = {}) {
  if (!upload) {
    return {
      resolvedSchema: null,
      visibleFields: FIELD_SETUP,
      requiredKeys: ["insuredName", "policyNumber"],
      missingRequired: [],
      contactErrors: [],
      contactFieldErrors: { contactPerson: "", contactNumber: "" },
      valid: false,
      isReady: false,
    };
  }

  const resolvedSchema = options.resolvedSchema || inferUploadSchema(upload);
  const manualRequiredFields = MANUAL_REQUIRED_FIELDS;
  const schemaVisibleFields = resolvedSchema?.fields?.length
    ? FIELD_SETUP.filter(([, key]) => resolvedSchema.fields.includes(key))
    : FIELD_SETUP;
  const visibleFields = addFields(schemaVisibleFields, [...manualRequiredFields, ...COMMON_REVIEW_FIELDS, "newOrRenewal"]);
  const requiredKeys = addUnique(
    resolvedSchema?.requiredFields?.length ? resolvedSchema.requiredFields : ["insuredName", "policyNumber"],
    manualRequiredFields,
  );
  const missingRequired = getMissingRequiredFields(upload, visibleFields, requiredKeys);

  const contactPersonVal = getReviewFieldValue(upload, "contactPerson");
  const contactNumberVal = getReviewFieldValue(upload, "contactNumber");
  const contactPersonErr = validateContactPerson(contactPersonVal);
  const contactNumberErr = validateContactNumber(contactNumberVal);
  const contactErrors = [contactPersonErr, contactNumberErr].filter(Boolean);

  return {
    resolvedSchema,
    visibleFields,
    requiredKeys,
    missingRequired,
    contactErrors,
    contactFieldErrors: {
      contactPerson: contactPersonErr,
      contactNumber: contactNumberErr,
    },
    valid: missingRequired.length === 0 && contactErrors.length === 0,
    isReady: missingRequired.length === 0 && contactErrors.length === 0,
  };
}

export function getReviewCounts(uploads = []) {
  let pendingCount = 0;
  let readyCount = 0;
  let needsInputCount = 0;
  let savedCount = 0;
  let failedCount = 0;

  uploads.forEach((upload) => {
    const status = normalizeUploadStatus(upload.status);
    if (status === UPLOAD_STATUS.APPROVED) {
      savedCount += 1;
    } else if (status === UPLOAD_STATUS.FAILED) {
      failedCount += 1;
    } else if (status === UPLOAD_STATUS.PROCESSING || status === UPLOAD_STATUS.PENDING) {
      pendingCount += 1;
    } else {
      const validation = getReviewValidation(upload);
      if (validation.missingRequired.length) {
        needsInputCount += 1;
      } else {
        readyCount += 1;
      }
    }
  });

  return {
    pendingCount,
    readyCount,
    needsInputCount,
    savedCount,
    failedCount,
    totalCount: uploads.length,
  };
}

export function queueSummaryLabel(counts) {
  if (counts.needsInputCount > 0) return `${counts.needsInputCount} need manual input`;
  if (counts.readyCount > 0) return `${counts.readyCount} ready to save`;
  if (counts.pendingCount > 0) return `${counts.pendingCount} extracting`;
  if (counts.savedCount > 0) return `${counts.savedCount} saved to policy records`;
  if (counts.failedCount > 0) return `${counts.failedCount} failed`;
  return "Upload queue is empty";
}

export function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function pageTitle(page) {
  return {
    dashboard: "Policy Dashboard",
    "bulk-entry": "AI Bulk Policy Ingestion",
    "manual-entry": "Manual Policy Entry",
    records: "Policy Records",
    customers: "Customer Management",
    analytics: "Analytics & Reports",
    "field-setup": "Field Setup",
    settings: "Settings",
  }[page];
}

export function pageSubtitle(page) {
  return {
    dashboard: "Review live policy records and upload activity.",
    "bulk-entry": "Upload multiple insurance policy PDFs for record creation and OCR workflow handoff.",
    "manual-entry": "Create or correct a policy record without uploading a PDF.",
    records: "Search, export, and manage saved policy data.",
    customers: "Browse insured parties and policy summaries.",
    analytics: "Review premium totals, insured value, and district coverage.",
    "field-setup": "See how the Prisma model maps to the intake fields.",
    settings: "Review database connectivity and current app status.",
  }[page];
}

export function buildClientProfiles(records, parseMoney) {
  const profiles = new Map();

  records.forEach((record) => {
    const name = record.insuredName || "Unnamed insured";
    const current = profiles.get(name) || {
      name,
      policies: [],
      premiumTotal: 0,
      sumInsuredTotal: 0,
      district: record.district || "",
      tehsil: record.tehsil || "",
      contactNumber: record.contactNumber || "",
      customerId: record.customerId || "",
    };

    current.policies.push(record);
    current.premiumTotal += parseMoney(getPremiumValue(record));
    current.sumInsuredTotal += parseMoney(record.sumInsured);
    current.district ||= record.district || "";
    current.tehsil ||= record.tehsil || "";
    current.contactNumber ||= record.contactNumber || "";
    current.customerId ||= record.customerId || "";
    profiles.set(name, current);
  });

  return Array.from(profiles.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function loadDashboardView(DASHBOARD_VIEW_KEY) {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(DASHBOARD_VIEW_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveDashboardView(DASHBOARD_VIEW_KEY, view) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DASHBOARD_VIEW_KEY, JSON.stringify(view));
  } catch {}
}

export function queueLabel(status) {
  const normalized = normalizeUploadStatus(status);
  return {
    [UPLOAD_STATUS.PENDING]: "Queued",
    [UPLOAD_STATUS.PROCESSING]: "Extracting",
    [UPLOAD_STATUS.REVIEW_REQUIRED]: "Ready for review",
    [UPLOAD_STATUS.APPROVED]: "Saved",
    [UPLOAD_STATUS.FAILED]: "Failed",
  }[normalized];
}

export function progressWidth(status) {
  const normalized = normalizeUploadStatus(status);
  return {
    [UPLOAD_STATUS.PENDING]: "20%",
    [UPLOAD_STATUS.PROCESSING]: "50%",
    [UPLOAD_STATUS.REVIEW_REQUIRED]: "90%",
    [UPLOAD_STATUS.APPROVED]: "100%",
    [UPLOAD_STATUS.FAILED]: "100%",
  }[normalized];
}

export function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
