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

export const FIELD_GROUPS = [
  {
    title: "Policy Details",
    fields: [
      "insuredName",
      "policyNumber",
      "insuranceCompany",
      "policyType",
      "premium",
      "sumInsured",
      "startDate",
      "expiryDate",
      "duration",
      "policyCoverType",
      "pptMpwlc",
      "newOrRenewal",
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
    fields: ["contactPerson", "contactNumber", "whatsappGroupName", "clientId"],
  },
  {
    title: "Payment",
    fields: [
      "totalPremium",
      "netPremium",
      "gstAmount",
      "gstin",
      "tpDriverOwner",
      "odPremium",
      "dueCollection",
      "collectedAmount",
      "modeOfPayment",
      "remark",
    ],
  },
  {
    title: "Risk & Locations",
    fields: ["riskLocation", "district", "tehsil", "occupancy", "description", "validIn"],
  },
];

export const FIELD_SETUP = [
  ["Client ID", "clientId"],
  ["Customer ID", "customerId"],
  ["Source File", "sourceFile"],
  ["Insured Name", "insuredName"],
  ["Policy Number", "policyNumber"],
  ["Contact Person", "contactPerson"],
  ["Contact Number", "contactNumber"],
  ["WP Group Name", "whatsappGroupName"],
  ["Group Name", "groupName"],
  ["New / Renewal", "newOrRenewal"],
  ["Policy Type", "policyType"],
  ["Premium", "premium"],
  ["Total Premium", "totalPremium"],
  ["Net Premium", "netPremium"],
  ["GST", "gstAmount"],
  ["TP + Driver + Owner", "tpDriverOwner"],
  ["OD Premium", "odPremium"],
  ["Due Collection", "dueCollection"],
  ["Collected Amount", "collectedAmount"],
  ["Mode Of Payment", "modeOfPayment"],
  ["Remark", "remark"],
  ["Sum Insured", "sumInsured"],
  ["Start Date", "startDate"],
  ["Expiry Date", "expiryDate"],
  ["Duration", "duration"],
  ["Risk Location", "riskLocation"],
  ["District", "district"],
  ["Tehsil", "tehsil"],
  ["Insurance Company", "insuranceCompany"],
  ["Description", "description"],
  ["PPT / MPWLC", "pptMpwlc"],
  ["Occupancy", "occupancy"],
  ["Valid In", "validIn"],
  ["Vehicle Number", "vehicleNumber"],
  ["Registration Number", "registrationNumber"],
  ["Make / Model", "makeModel"],
  ["Variant", "variant"],
  ["Manufacturing Year", "manufacturingYear"],
  ["Registration Date", "registrationDate"],
  ["Engine Number", "engineNumber"],
  ["Chassis Number", "chassisNumber"],
  ["Fuel Type", "fuelType"],
  ["Cubic Capacity", "cubicCapacity"],
  ["Seating Capacity", "seatingCapacity"],
  ["Gross Vehicle Weight", "grossVehicleWeight"],
  ["IDV", "idv"],
  ["NCB", "ncb"],
  ["Cover Type", "policyCoverType"],
  ["RTO Location", "rtoLocation"],
  ["Nominee Name", "nomineeName"],
  ["Financer Name", "financerName"],
  ["GST Number", "gstin"],
];

const MOTOR_COMMON_FIELDS = [
  "insuredName",
  "policyNumber",
  "policyType",
  "policyCoverType",
  "vehicleNumber",
  "registrationNumber",
  "makeModel",
  "variant",
  "manufacturingYear",
  "registrationDate",
  "engineNumber",
  "chassisNumber",
  "fuelType",
  "insuranceCompany",
  "premium",
  "idv",
  "startDate",
  "expiryDate",
  "duration",
  "ncb",
  "rtoLocation",
  "contactPerson",
  "contactNumber",
  "totalPremium",
  "netPremium",
  "tpDriverOwner",
  "odPremium",
  "dueCollection",
  "collectedAmount",
  "modeOfPayment",
  "remark",
];

export const POLICY_SCHEMA_LIBRARY = [
  {
    id: "fire",
    label: "Fire Policy",
    description: "Property and stock protection policies.",
    policies: [
      {
        id: "fire-standard",
        name: "Standard Fire",
        fields: [
          "insuredName",
          "policyNumber",
          "policyType",
          "sumInsured",
          "premium",
          "gstAmount",
          "gstin",
          "startDate",
          "expiryDate",
          "riskLocation",
          "district",
          "tehsil",
          "insuranceCompany",
          "description",
          "occupancy",
          "validIn",
        ],
      },
      {
        id: "fire-sfsp",
        name: "SFSP",
        fields: [
          "insuredName",
          "policyNumber",
          "policyType",
          "sumInsured",
          "premium",
          "gstAmount",
          "gstin",
          "startDate",
          "expiryDate",
          "duration",
          "riskLocation",
          "district",
          "tehsil",
          "insuranceCompany",
          "description",
          "occupancy",
        ],
      },
      {
        id: "fire-burglary",
        name: "Burglary",
        fields: [
          "insuredName",
          "policyNumber",
          "policyType",
          "sumInsured",
          "premium",
          "gstAmount",
          "gstin",
          "startDate",
          "expiryDate",
          "riskLocation",
          "district",
          "tehsil",
          "insuranceCompany",
          "description",
        ],
      },
    ],
  },
  {
    id: "motor",
    label: "Motor Policy",
    description: "Car, bike, and commercial vehicle cover.",
    policies: [
      {
        id: "motor-private-car-package",
        name: "Private Car - Package",
        fields: [...MOTOR_COMMON_FIELDS, "sumInsured", "seatingCapacity"],
      },
      {
        id: "motor-private-car-third-party",
        name: "Private Car - Third Party",
        fields: MOTOR_COMMON_FIELDS.filter((key) => key !== "idv" && key !== "ncb").concat([
          "seatingCapacity",
        ]),
      },
      {
        id: "motor-two-wheeler-package",
        name: "Two Wheeler - Package",
        fields: [...MOTOR_COMMON_FIELDS, "sumInsured", "cubicCapacity"],
      },
      {
        id: "motor-two-wheeler-third-party",
        name: "Two Wheeler - Third Party",
        fields: MOTOR_COMMON_FIELDS.filter((key) => key !== "idv" && key !== "ncb").concat(["cubicCapacity"]),
      },
      {
        id: "motor-goods-carrying",
        name: "Goods Carrying Vehicle",
        fields: [...MOTOR_COMMON_FIELDS, "grossVehicleWeight", "sumInsured"],
      },
      {
        id: "motor-passenger-carrying",
        name: "Passenger Carrying Vehicle",
        fields: [...MOTOR_COMMON_FIELDS, "seatingCapacity", "grossVehicleWeight", "sumInsured"],
      },
      {
        id: "motor-taxi-cab",
        name: "Taxi / Cab",
        fields: [...MOTOR_COMMON_FIELDS, "seatingCapacity", "sumInsured"],
      },
      {
        id: "motor-school-bus",
        name: "School Bus",
        fields: [...MOTOR_COMMON_FIELDS, "seatingCapacity", "grossVehicleWeight"],
      },
      { id: "motor-fleet", name: "Fleet Policy", fields: [...MOTOR_COMMON_FIELDS, "sumInsured"] },
    ],
  },
  {
    id: "life",
    label: "Life Policy",
    description: "Term, endowment, and savings-linked life policies.",
    policies: [
      {
        id: "life-term",
        name: "Term Life",
        fields: [
          "insuredName",
          "policyNumber",
          "contactPerson",
          "contactNumber",
          "policyType",
          "premium",
          "gstAmount",
          "startDate",
          "expiryDate",
          "duration",
          "insuranceCompany",
          "description",
        ],
      },
      {
        id: "life-endowment",
        name: "Endowment",
        fields: [
          "insuredName",
          "policyNumber",
          "contactNumber",
          "groupName",
          "policyType",
          "premium",
          "gstAmount",
          "startDate",
          "expiryDate",
          "duration",
          "insuranceCompany",
          "validIn",
        ],
      },
    ],
  },
  {
    id: "health",
    label: "Health Policy",
    description: "Individual, family, and group mediclaim.",
    policies: [
      {
        id: "health-individual",
        name: "Individual Health",
        fields: [
          "insuredName",
          "policyNumber",
          "contactPerson",
          "contactNumber",
          "policyType",
          "sumInsured",
          "premium",
          "gstAmount",
          "startDate",
          "expiryDate",
          "duration",
          "insuranceCompany",
        ],
      },
      {
        id: "health-family",
        name: "Family Floater",
        fields: [
          "insuredName",
          "policyNumber",
          "contactNumber",
          "groupName",
          "policyType",
          "sumInsured",
          "premium",
          "gstAmount",
          "startDate",
          "expiryDate",
          "duration",
          "insuranceCompany",
          "description",
        ],
      },
    ],
  },
  {
    id: "home",
    label: "Home Policy",
    description: "Home building and contents cover.",
    policies: [
      {
        id: "home-building",
        name: "Home Building",
        fields: [
          "insuredName",
          "policyNumber",
          "policyType",
          "sumInsured",
          "premium",
          "gstAmount",
          "startDate",
          "expiryDate",
          "riskLocation",
          "district",
          "tehsil",
          "insuranceCompany",
          "description",
        ],
      },
      {
        id: "home-contents",
        name: "Home Contents",
        fields: [
          "insuredName",
          "policyNumber",
          "policyType",
          "sumInsured",
          "premium",
          "gstAmount",
          "startDate",
          "expiryDate",
          "riskLocation",
          "district",
          "tehsil",
          "insuranceCompany",
          "occupancy",
        ],
      },
    ],
  },
  {
    id: "cyber",
    label: "Cyber Policy",
    description: "Cyber liability and breach response cover.",
    policies: [
      {
        id: "cyber-sme",
        name: "Cyber SME",
        fields: [
          "insuredName",
          "policyNumber",
          "contactPerson",
          "contactNumber",
          "policyType",
          "premium",
          "gstAmount",
          "startDate",
          "expiryDate",
          "duration",
          "insuranceCompany",
          "description",
          "validIn",
        ],
      },
      {
        id: "cyber-enterprise",
        name: "Cyber Enterprise",
        fields: [
          "insuredName",
          "policyNumber",
          "groupName",
          "policyType",
          "premium",
          "gstAmount",
          "startDate",
          "expiryDate",
          "duration",
          "riskLocation",
          "insuranceCompany",
          "description",
        ],
      },
    ],
  },
  {
    id: "misc",
    label: "Other Policies",
    description: "Marine, travel, liability, and custom formats.",
    policies: [
      {
        id: "marine",
        name: "Marine",
        fields: [
          "insuredName",
          "policyNumber",
          "policyType",
          "sumInsured",
          "premium",
          "gstAmount",
          "startDate",
          "expiryDate",
          "insuranceCompany",
          "description",
          "validIn",
        ],
      },
      {
        id: "travel",
        name: "Travel",
        fields: [
          "insuredName",
          "policyNumber",
          "contactNumber",
          "policyType",
          "premium",
          "gstAmount",
          "startDate",
          "expiryDate",
          "duration",
          "insuranceCompany",
          "validIn",
        ],
      },
      {
        id: "liability",
        name: "Liability",
        fields: [
          "insuredName",
          "policyNumber",
          "groupName",
          "policyType",
          "sumInsured",
          "premium",
          "gstAmount",
          "startDate",
          "expiryDate",
          "insuranceCompany",
          "description",
        ],
      },
    ],
  },
];

export function getReviewCounts(files) {
  return files.reduce(
    (counts, file) => {
      const status = normalizeUploadStatus(file.status);
      if (status === UPLOAD_STATUS.APPROVED) counts.saved += 1;
      else if (status === UPLOAD_STATUS.FAILED) counts.failed += 1;
      else if (status === UPLOAD_STATUS.PROCESSING || status === UPLOAD_STATUS.PENDING)
        counts.processing += 1;
      else counts.pending += 1;
      return counts;
    },
    { pending: 0, saved: 0, failed: 0, processing: 0 },
  );
}

export function queueSummaryLabel({ isUploading, selectedFiles, reviewCounts }) {
  if (isUploading) return "Extracting";
  if (!selectedFiles.length) return "No files";
  if (reviewCounts.pending) return `${reviewCounts.pending} ready for review`;
  if (reviewCounts.failed && !reviewCounts.saved) return `${reviewCounts.failed} failed`;
  if (reviewCounts.failed) return `${reviewCounts.saved} saved, ${reviewCounts.failed} failed`;
  return `${reviewCounts.saved} saved`;
}

export function getMissingRequiredFields(upload, visibleFields = FIELD_SETUP, requiredKeys) {
  const visibleKeys = new Set(visibleFields.map(([, key]) => key));
  const fieldLabels = new Map(FIELD_SETUP.map(([label, key]) => [key, label]));
  const activeRequiredKeys = new Set(requiredKeys?.length ? requiredKeys : ["insuredName", "policyNumber"]);
  return Array.from(activeRequiredKeys)
    .filter((key) => visibleKeys.has(key) && !hasValue(getReviewFieldValue(upload, key)))
    .map((key) => fieldLabels.get(key) || key);
}

export function getReviewValidation(upload, options = {}) {
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
  };
}

export function formatReviewValidationError(missingRequired, contactErrors = []) {
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

export function reviewStatusLabel(upload, missingRequired) {
  if (!upload) return "Waiting";
  const status = normalizeUploadStatus(upload.status);
  if (status === UPLOAD_STATUS.APPROVED) return "Saved";
  if (status === UPLOAD_STATUS.FAILED) return "Failed";
  if (status === UPLOAD_STATUS.PROCESSING || status === UPLOAD_STATUS.PENDING) return "Extracting";
  if (missingRequired.length) return "Needs manual input";
  return "Ready for Review";
}

export function hasValue(value) {
  if (typeof value === "boolean") return true;
  return String(value ?? "").trim().length > 0;
}

export function isManualRequiredField(key) {
  return MANUAL_REQUIRED_FIELDS.includes(key) || MOTOR_MANUAL_REQUIRED_FIELDS.includes(key);
}

export function isFieldManualForUpload(upload, key) {
  if (key === "fuelType" && shouldUseExtractedFuelType(upload?.extractedData)) return false;
  return isManualRequiredField(key);
}

export function shouldUseExtractedVariant(data = {}, upload = {}) {
  const haystack = [data.insuranceCompany, data.companyName, data.sourceFile, upload.sourceFile]
    .filter(Boolean)
    .join(" ");

  return /\bnew\s+india\b/i.test(haystack);
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

export function getReviewFieldValue(upload, key) {
  if (key === "fuelType" && shouldUseExtractedFuelType(upload?.extractedData))
    return upload?.extractedData?.[key] || "";
  if (isManualRequiredField(key) && Array.isArray(upload?.manualFields) && !upload.manualFields.includes(key))
    return "";
  return upload?.extractedData?.[key] || "";
}

function addFields(fields, keys) {
  const existing = new Set(fields.map(([, key]) => key));
  const extras = FIELD_SETUP.filter(([, key]) => keys.includes(key) && !existing.has(key));
  return [...fields, ...extras];
}

function addUnique(values, extras) {
  return Array.from(new Set([...(values || []), ...extras]));
}

function isRecognizedFuelType(value = "") {
  return /^(petrol|diesel|cng|lpg|electric|ev|hybrid)$/i.test(String(value || "").trim());
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

export function inferPolicyFamily(haystack, extracted) {
  // Check explicit document category/format FIRST — these are authoritative signals
  // set by company-specific parsers (e.g. documentCategory: "Fire Insurance")
  const docCategory = String(extracted.documentCategory || "").toLowerCase();
  const docFormat = String(extracted.documentFormat || "").toLowerCase();
  const explicitNonMotor = docCategory + " " + docFormat;
  if (/warehouse|fire|msme|suraksha|sfsp|burglary|property|workmen/i.test(explicitNonMotor)) return "fire";

  // Check policyType for explicit non-motor indicators before motor signals
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

export function inferPolicySchemaWithinGroup(group, haystack, extracted) {
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

function getPremiumValue(record = {}) {
  return record.netPremium || record.totalPremium || record.premium || "";
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
