import { hasCompanyEvidence } from "../company-detector";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-5.2";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

const AI_EXTRACTION_FIELDS = [
  "insuranceCompany",
  "policyType",
  "insuredName",
  "contactNumber",
  "contactPerson",
  "groupName",
  "policyNumber",
  "startDate",
  "expiryDate",
  "duration",
  "sumInsured",
  "premium",
  "totalPremium",
  "netPremium",
  "tpDriverOwner",
  "odPremium",
  "basicOwnDamage",
  "basicThirdPartyLiability",
  "netOwnDamagePremium",
  "netLiabilityPremium",
  "totalPackagePremium",
  "gstAmount",
  "sgst",
  "cgst",
  "idv",
  "totalIdv",
  "ncb",
  "ncbPercentage",
  "policyCoverType",
  "riskLocation",
  "district",
  "tehsil",
  "description",
  "occupancy",
  "validIn",
  "registrationNumber",
  "vehicleNumber",
  "makeModel",
  "vehicleMake",
  "vehicleModel",
  "variant",
  "manufacturingYear",
  "registrationDate",
  "engineNumber",
  "chassisNumber",
  "fuelType",
  "cubicCapacity",
  "seatingCapacity",
  "grossVehicleWeight",
  "rtoLocation",
  "rto",
  "bodyType",
  "geographicalArea",
  "nomineeName",
  "financerName",
  "proposalNumber",
  "invoiceNumber",
  "issuanceDate",
  "customerId",
  "communicationAddress",
  "customerMobile",
  "customerEmail",
  "gstin",
  "panNumber",
  "compulsoryDeductible",
  "voluntaryDeductible",
  "zeroDepreciationCover",
  "engineGearboxProtection",
  "costOfConsumables",
  "previousPolicyNumber",
  "previousPolicyValidity",
  "previousInsurer",
  "paymentReference",
  "bankName",
  "cscName",
  "cscCode",
  "cscContactNumber",
  "modeOfPayment",
  "dueCollection",
  "collectedAmount",
  "remark"
];

const CORE_REVIEW_FIELDS = [
  "insuranceCompany",
  "policyType",
  "insuredName",
  "policyNumber",
  "startDate",
  "expiryDate",
  "registrationNumber",
  "vehicleNumber",
  "makeModel",
  "manufacturingYear",
  "engineNumber",
  "chassisNumber",
  "fuelType",
  "cubicCapacity",
  "seatingCapacity",
  "idv",
  "premium",
  "totalPremium",
  "netPremium",
  "odPremium",
  "tpDriverOwner"
];

const AMOUNT_FIELDS = new Set([
  "premium",
  "totalPremium",
  "netPremium",
  "tpDriverOwner",
  "odPremium",
  "basicOwnDamage",
  "basicThirdPartyLiability",
  "netOwnDamagePremium",
  "netLiabilityPremium",
  "totalPackagePremium",
  "gstAmount",
  "sgst",
  "cgst",
  "idv",
  "totalIdv",
  "sumInsured",
  "dueCollection",
  "collectedAmount",
  "compulsoryDeductible",
  "voluntaryDeductible",
  "zeroDepreciationCover",
  "engineGearboxProtection",
  "costOfConsumables"
]);

const DATE_FIELDS = new Set(["startDate", "expiryDate", "registrationDate", "issuanceDate", "previousPolicyValidity"]);
const IDENTIFIER_FIELDS = new Set(["registrationNumber", "vehicleNumber", "engineNumber", "chassisNumber"]);

export async function reviewPolicyExtractionWithAi({ rawText = "", extractedData = {}, sourceFile = "" } = {}) {
  const issues = getExtractionAuthenticityIssues(extractedData, rawText);
  const aiProvider = getAiProvider();
  if (!aiProvider || !rawText.trim()) {
    const verified = rawText.trim()
      ? keepOnlySourceVerifiedFields({ rawText, data: extractedData, aiPatch: {} })
      : { data: extractedData, clearedFields: [], fieldEvidence: {} };
    return {
      data: {
        ...verified.data,
        extractionQuality: {
          ...(extractedData.extractionQuality || {}),
          aiReview: {
            provider: aiProvider?.provider || "",
            used: false,
            mode: "rule-only",
            issues,
            acceptedFields: [],
            rejectedFields: [],
            clearedFields: verified.clearedFields,
            fieldEvidence: verified.fieldEvidence
          }
        }
      },
      aiReview: {
        provider: aiProvider?.provider || "",
        used: false,
        mode: "rule-only",
        issues,
        acceptedFields: [],
        rejectedFields: [],
        clearedFields: verified.clearedFields
      }
    };
  }

  try {
    const aiPatch = await requestAiExtractionReview({ rawText, extractedData, sourceFile, issues, aiProvider });
    const merge = mergeAiExtractionPatch({ rawText, extractedData, aiPatch });
    const verified = keepOnlySourceVerifiedFields({ rawText, data: merge.data, aiPatch });
    return {
      data: {
        ...verified.data,
        extractionQuality: {
          ...(extractedData.extractionQuality || {}),
          aiReview: {
            provider: aiProvider.provider,
            used: true,
            mode: "independent-full-extraction",
            model: aiProvider.model,
            issues,
            acceptedFields: merge.acceptedFields,
            rejectedFields: merge.rejectedFields,
            clearedFields: verified.clearedFields,
            fieldEvidence: verified.fieldEvidence,
            aiAttemptedFields: AI_EXTRACTION_FIELDS,
            aiUnresolvedFields: getAiUnresolvedFields(aiPatch)
          }
        }
      },
      aiReview: {
        provider: aiProvider.provider,
        used: true,
        mode: "independent-full-extraction",
        issues,
        acceptedFields: merge.acceptedFields,
        rejectedFields: merge.rejectedFields,
        clearedFields: verified.clearedFields,
        unresolvedFields: getAiUnresolvedFields(aiPatch)
      }
    };
  } catch (error) {
    const aiReview = {
      provider: aiProvider.provider,
      used: false,
      mode: "independent-full-extraction",
      issues,
      acceptedFields: [],
      rejectedFields: [],
      error: error instanceof Error ? error.message : "AI extraction review failed"
    };
    return {
      data: {
        ...extractedData,
        extractionQuality: {
          ...(extractedData.extractionQuality || {}),
          aiReview
        }
      },
      aiReview
    };
  }
}

export async function reviewPolicyExtractionPassivelyWithAi({
  sourceText = "",
  detectedCompany = "",
  detectedPolicyType = "",
  ruleExtraction = {},
  schemaExtraction = {},
  validationIssues = {},
  missingFields = [],
  suspiciousFields = [],
  sourceFile = ""
} = {}) {
  const aiProvider = getAiProvider();
  const baseReview = buildPassiveReview({
    provider: aiProvider?.provider || "",
    model: aiProvider?.model || "",
    used: false,
    sourceFile,
    detectedCompany,
    detectedPolicyType,
    validationIssues,
    missingFields,
    suspiciousFields,
    aiPatch: {}
  });

  if (!aiProvider || !String(sourceText || "").trim()) {
    return baseReview;
  }

  try {
    const aiPatch = await requestPassiveAiExtractionReview({
      sourceText,
      detectedCompany,
      detectedPolicyType,
      ruleExtraction,
      schemaExtraction,
      validationIssues,
      missingFields,
      suspiciousFields,
      sourceFile,
      aiProvider
    });

    return buildPassiveReview({
      provider: aiProvider.provider,
      model: aiProvider.model,
      used: true,
      sourceFile,
      detectedCompany,
      detectedPolicyType,
      validationIssues,
      missingFields,
      suspiciousFields,
      aiPatch,
      sourceText
    });
  } catch (error) {
    return {
      ...baseReview,
      provider: aiProvider.provider,
      model: aiProvider.model,
      error: error instanceof Error ? error.message : "Passive AI review failed"
    };
  }
}

export function buildPassiveReview({
  provider = "",
  model = "",
  used = false,
  sourceFile = "",
  detectedCompany = "",
  detectedPolicyType = "",
  validationIssues = {},
  missingFields = [],
  suspiciousFields = [],
  aiPatch = {},
  sourceText = ""
} = {}) {
  const normalized = normalizePassiveAiPatch(aiPatch, sourceText);
  return {
    provider,
    model,
    used,
    mode: "passive-review",
    sourceFile,
    detectedCompany,
    detectedPolicyType,
    validationIssues,
    missingFields,
    suspiciousFields,
    suggestedCorrections: normalized.suggestedCorrections,
    filledMissingFields: normalized.filledMissingFields,
    rejectedCorrections: normalized.rejectedCorrections,
    evidence: normalized.evidence
  };
}

export function normalizePassiveAiPatch(aiPatch = {}, sourceText = "") {
  const acceptedCorrectionEntries = {};
  const acceptedMissingEntries = {};
  const rejectedCorrections = { ...(aiPatch?.rejectedCorrections || {}) };
  const evidence = {};

  for (const [field, entry] of Object.entries(aiPatch?.suggestedCorrections || aiPatch?.correctedFields || {})) {
    const normalized = normalizePassiveReviewEntry(field, entry, sourceText);
    if (normalized.accepted) {
      acceptedCorrectionEntries[field] = normalized.payload;
      evidence[field] = normalized.payload.evidenceText;
    } else {
      rejectedCorrections[field] = normalized.reason;
    }
  }

  for (const [field, entry] of Object.entries(aiPatch?.filledMissingFields || {})) {
    const normalized = normalizePassiveReviewEntry(field, entry, sourceText);
    if (normalized.accepted) {
      acceptedMissingEntries[field] = normalized.payload;
      evidence[field] = normalized.payload.evidenceText;
    } else {
      rejectedCorrections[field] = normalized.reason;
    }
  }

  return {
    suggestedCorrections: acceptedCorrectionEntries,
    filledMissingFields: acceptedMissingEntries,
    rejectedCorrections,
    evidence
  };
}

function normalizePassiveReviewEntry(field, entry, sourceText) {
  const value = entry && typeof entry === "object" ? entry.value : entry;
  const evidenceText = entry && typeof entry === "object" ? entry.evidenceText || entry.sourceText || "" : "";
  const reason = entry && typeof entry === "object" ? entry.reason || "" : "";

  if (value == null || value === "") {
    return { accepted: false, reason: "missing value" };
  }

  const normalizedValue = normalizeAiFieldValue(field, value);
  if (!normalizedValue) {
    return { accepted: false, reason: "invalid value" };
  }

  if (!containsSourceSnippet(sourceText, evidenceText)) {
    return { accepted: false, reason: "missing source evidence" };
  }

  if (!hasSourceEvidence(field, normalizedValue, evidenceText, { [field]: normalizedValue })) {
    return { accepted: false, reason: "evidence does not support field value" };
  }

  return {
    accepted: true,
    payload: {
      value: normalizedValue,
      evidenceText,
      reason
    }
  };
}

function getAiProvider() {
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      url: OPENAI_CHAT_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
    };
  }

  if (process.env.GROQ_API_KEY) {
    return {
      provider: "groq",
      url: GROQ_CHAT_URL,
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL
    };
  }

  return null;
}

export function getExtractionAuthenticityIssues(data = {}, rawText = "") {
  const issues = [];
  const registration = compactIdentifier(data.registrationNumber || data.vehicleNumber);
  const engine = compactIdentifier(data.engineNumber);
  const chassis = compactIdentifier(data.chassisNumber);

  for (const field of CORE_REVIEW_FIELDS) {
    if (field === "vehicleNumber" && registration) continue;
    if (!data[field]) issues.push(`${field} missing`);
  }

  if (!registration) issues.push("registrationNumber missing");
  if (!engine) issues.push("engineNumber missing");
  if (!chassis) issues.push("chassisNumber missing");
  if (registration && engine && (engine === registration || engine.includes(registration))) {
    issues.push("engineNumber appears to contain registrationNumber");
  }
  if (/^(?:ENGINE|MOTOR|SEATING|CHASSIS)$/i.test(String(data.engineNumber || "").trim())) {
    issues.push("engineNumber is a label, not a value");
  }
  if (/^(?:ENGINE|MOTOR|SEATING|CHASSIS)$/i.test(String(data.chassisNumber || "").trim())) {
    issues.push("chassisNumber is a label, not a value");
  }
  if (chassis && (chassis.length < 10 || chassis.length > 25)) {
    issues.push("chassisNumber length is suspicious");
  }
  if (data.fuelType && !isRecognizedFuelType(data.fuelType)) {
    issues.push("fuelType is not recognized");
  }
  if (!data.makeModel && registration) issues.push("makeModel missing");

  if (String(rawText || "").trim()) {
    for (const field of CORE_REVIEW_FIELDS) {
      const value = data[field];
      if (!value) continue;
      if (isInvalidExtractedValue(field, value, data)) {
        issues.push(`${field} is invalid`);
        continue;
      }
      if (!hasSourceEvidence(field, value, rawText, data)) {
        issues.push(`${field} lacks source evidence`);
      }
    }
  }

  return Array.from(new Set(issues));
}

export function mergeAiExtractionPatch({ rawText = "", extractedData = {}, aiPatch = {} } = {}) {
  const data = { ...extractedData };
  const acceptedFields = [];
  const rejectedFields = [];
  const corrections = getAiExtractedFields(aiPatch);

  for (const field of AI_EXTRACTION_FIELDS) {
    const correction = corrections[field];
    if (!correction) continue;
    const value = correction.value;
    const sourceText = correction.sourceText;
    if (value == null || value === "") continue;

    const normalized = normalizeAiFieldValue(field, value);
    if (!normalized) {
      rejectedFields.push(field);
      continue;
    }

    if (!hasAiSourceEvidence(field, normalized, sourceText, rawText, corrections)) {
      rejectedFields.push(field);
      continue;
    }

    if (!shouldAcceptAiField(field, data[field], normalized, data, rawText, correction)) {
      rejectedFields.push(field);
      continue;
    }

    data[field] = normalized;
    if (field === "registrationNumber" && !data.vehicleNumber) data.vehicleNumber = normalized;
    if (field === "vehicleNumber" && !data.registrationNumber) data.registrationNumber = normalized;
    acceptedFields.push(field);
  }

  return { data, acceptedFields, rejectedFields };
}

async function requestAiExtractionReview({ rawText, extractedData, sourceFile, issues, aiProvider }) {
  const body = {
    model: aiProvider.model,
    response_format: { type: "json_object" },
    messages: buildExtractionReviewMessages({ rawText, extractedData, sourceFile, issues })
  };

  if (aiProvider.provider === "groq") {
    body.temperature = 0;
  }

  const response = await fetch(aiProvider.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aiProvider.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${aiProvider.provider} review failed with status ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

async function requestPassiveAiExtractionReview({
  sourceText,
  detectedCompany,
  detectedPolicyType,
  ruleExtraction,
  schemaExtraction,
  validationIssues,
  missingFields,
  suspiciousFields,
  sourceFile,
  aiProvider
}) {
  const body = {
    model: aiProvider.model,
    response_format: { type: "json_object" },
    messages: buildPassiveReviewMessages({
      sourceText,
      detectedCompany,
      detectedPolicyType,
      ruleExtraction,
      schemaExtraction,
      validationIssues,
      missingFields,
      suspiciousFields,
      sourceFile
    })
  };

  if (aiProvider.provider === "groq") {
    body.temperature = 0;
  }

  const response = await fetch(aiProvider.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aiProvider.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${aiProvider.provider} passive review failed with status ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

function buildPassiveReviewMessages({
  sourceText,
  detectedCompany,
  detectedPolicyType,
  ruleExtraction,
  schemaExtraction,
  validationIssues,
  missingFields,
  suspiciousFields,
  sourceFile
}) {
  return [
    {
      role: "system",
      content: [
        "You are a passive reviewer for Indian insurance policy extraction.",
        "Rule-based extraction and company parsers are the source of truth.",
        "Do not overwrite fields, do not invent values, and do not estimate policy data.",
        "Return only JSON with suggestedCorrections, filledMissingFields, rejectedCorrections, and evidence.",
        "Every suggestedCorrections or filledMissingFields entry must include value, evidenceText, and reason.",
        "evidenceText must be an exact short snippet from sourceText that supports the value and field mapping.",
        "If evidence is missing or uncertain, put the item in rejectedCorrections instead."
      ].join(" ")
    },
    {
      role: "user",
      content: JSON.stringify({
        sourceFile,
        sourceText: String(sourceText || "").slice(0, 18000),
        detectedCompany,
        detectedPolicyType,
        ruleExtraction: pickReviewFields(ruleExtraction),
        schemaExtraction,
        validationIssues,
        missingFields,
        suspiciousFields,
        outputFormat: {
          suggestedCorrections: {
            fieldName: {
              value: "correct value",
              evidenceText: "exact sourceText snippet",
              reason: "why this existing field is suspicious"
            }
          },
          filledMissingFields: {
            fieldName: {
              value: "missing value found",
              evidenceText: "exact sourceText snippet",
              reason: "why this blank field can be filled"
            }
          },
          rejectedCorrections: {
            fieldName: "why no evidence-backed suggestion is safe"
          },
          evidence: {
            fieldName: "exact sourceText snippet"
          }
        }
      })
    }
  ];
}

function buildExtractionReviewMessages({ rawText, extractedData, sourceFile, issues }) {
  return [
    {
      role: "system",
      content: [
        "You independently extract Indian insurance policy fields from raw PDF text.",
        "Attempt every field in requiredFields, even when the deterministic rule extractor already has a value.",
        "Use headings, nearby labels, table columns, row alignment, and surrounding document context to map each value to the correct field.",
        "Detect and correct common extraction errors: labels captured as values, wrong field assignment, registration copied into engine or chassis, table row or column misalignment, incorrect premium mapping, and OCR mistakes.",
        "Return JSON only with top-level extractedFields, finalReview, unchangedFields, and unresolvedFields objects.",
        "For extractedFields, every field you can extract must contain value, sourceText, sourceLabel, and reason.",
        "sourceText must be an exact short snippet copied from the raw PDF text that supports both the value and the field mapping.",
        "sourceLabel should name the heading, table column, or nearby label proving the field mapping.",
        "Do not guess, assume, infer from file name, insurer, vehicle type, or previous records.",
        "Do not calculate values unless the source values needed for the calculation are visibly present in the PDF text.",
        "If a field is not visible or not confidently mapped, leave it out of extractedFields and mark it unresolved.",
        "Use the deterministic rule extraction only for final conflict review; do not copy it unless the raw text supports it."
      ].join(" ")
    },
    {
      role: "user",
      content: JSON.stringify({
        sourceFile,
        ruleExtractionIssues: issues,
        ruleExtraction: pickReviewFields(extractedData),
        requiredFields: AI_EXTRACTION_FIELDS,
        outputFormat: {
          extractedFields: {
            fieldName: {
              value: "field value",
              sourceText: "exact PDF text proving value and field mapping",
              sourceLabel: "heading/label/table column used",
              reason: "why this value belongs to this field"
            }
          },
          finalReview: {
            correctedRuleFields: ["fieldName corrected by AI evidence"],
            suspectedRuleMappingErrors: ["fieldName looked mapped to wrong source"],
            notes: ["brief source-backed review note"]
          },
          unchangedFields: {
            fieldName: {
              value: "existing value",
              sourceText: "exact PDF text supporting existing value",
              reason: "rule value matched PDF evidence"
            }
          },
          unresolvedFields: {
            fieldName: {
              reason: "value not found in PDF text"
            }
          }
        },
        rawText: String(rawText || "").slice(0, 18000)
      })
    }
  ];
}

function getAiExtractedFields(aiPatch = {}) {
  const extracted = normalizeAiFieldEntries(aiPatch?.extractedFields);
  const corrected = normalizeAiFieldEntries(aiPatch?.correctedFields);
  return { ...extracted, ...corrected };
}

function normalizeAiFieldEntries(entries = {}) {
  if (!entries || typeof entries !== "object") return {};
  return Object.entries(entries).reduce((fields, [field, entry]) => {
    if (entry && typeof entry === "object") {
      fields[field] = {
        value: entry.value,
        sourceText: entry.sourceText || "",
        sourceLabel: entry.sourceLabel || "",
        reason: entry.reason || ""
      };
    }
    return fields;
  }, {});
}

function getAiUnresolvedFields(aiPatch = {}) {
  const unresolved = aiPatch?.unresolvedFields;
  if (!unresolved || typeof unresolved !== "object") return [];
  return Object.keys(unresolved);
}

function keepOnlySourceVerifiedFields({ rawText = "", data = {}, aiPatch = {} } = {}) {
  const verified = { ...data };
  const clearedFields = [];
  const fieldEvidence = {};
  const corrections = getAiExtractedFields(aiPatch);

  for (const field of AI_EXTRACTION_FIELDS) {
    const value = verified[field];
    if (!value) continue;

    const correction = corrections[field];
    if (correction && hasAiSourceEvidence(field, value, correction.sourceText, rawText, corrections)) {
      fieldEvidence[field] = correction.sourceText;
      continue;
    }

    if (hasSourceEvidence(field, value, rawText, verified)) {
      fieldEvidence[field] = "extractor value matched PDF text";
      continue;
    }

    verified[field] = "";
    clearedFields.push(field);
  }

  return { data: verified, clearedFields, fieldEvidence };
}

function hasAiSourceEvidence(field, value, sourceText, rawText, fields = {}) {
  const snippet = String(sourceText || "").replace(/\s+/g, " ").trim();
  if (!snippet) return false;
  if (!containsSourceSnippet(rawText, snippet)) return false;
  return hasSourceEvidence(field, value, snippet, getAiFieldValues(fields));
}

function getAiFieldValues(fields = {}) {
  return Object.entries(fields).reduce((values, [field, entry]) => {
    values[field] = entry && typeof entry === "object" ? entry.value || "" : entry || "";
    return values;
  }, {});
}

function shouldAcceptAiField(field, existingValue, nextValue, data = {}, rawText = "", correction = {}) {
  if (!existingValue) return true;
  const current = String(existingValue || "").trim();
  if (!current) return true;
  if (normalizeComparableFieldValue(field, current) === normalizeComparableFieldValue(field, nextValue)) return false;
  if (isInvalidExtractedValue(field, current, data)) return true;

  const aiHasFieldContext =
    hasFieldLabelContext(field, correction.sourceText || "") ||
    hasFieldLabelContext(field, correction.sourceLabel || "");

  if ((AMOUNT_FIELDS.has(field) || DATE_FIELDS.has(field)) && aiHasFieldContext) {
    return true;
  }

  const currentHasSource = rawText && hasSourceEvidence(field, current, rawText, data);
  if (rawText && !currentHasSource) return true;

  if (aiHasFieldContext && !hasFieldLabelEvidence(field, current, rawText)) {
    return true;
  }

  if (field === "engineNumber") {
    const registration = compactIdentifier(data.registrationNumber || data.vehicleNumber);
    const engine = compactIdentifier(current);
    return /^(?:ENGINE|MOTOR|SEATING|CHASSIS)$/i.test(current) || (registration && engine.includes(registration));
  }
  if (field === "chassisNumber") {
    const chassis = compactIdentifier(current);
    return /^(?:ENGINE|MOTOR|SEATING|CHASSIS)$/i.test(current) || chassis.length < 10 || chassis.length > 25;
  }
  if (field === "fuelType") return !isRecognizedFuelType(current) && isRecognizedFuelType(nextValue);
  if (field === "registrationNumber" || field === "vehicleNumber") return !compactIdentifier(current);
  if (field === "insuranceCompany" || field === "policyType" || field === "policyNumber" || field === "makeModel") return false;
  return false;
}

function normalizeComparableFieldValue(field, value = "") {
  if (AMOUNT_FIELDS.has(field)) return compactIdentifier(normalizeAiFieldValue(field, value));
  if (DATE_FIELDS.has(field)) return compactIdentifier(value);
  if (IDENTIFIER_FIELDS.has(field) || field === "policyNumber") return compactIdentifier(value);
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isInvalidExtractedValue(field, value, data = {}) {
  const text = String(value || "").trim();
  if (!text) return true;
  if (/^(?:NA|N\/A|NONE|NIL|NULL|UNDEFINED)$/i.test(text)) return true;

  if (IDENTIFIER_FIELDS.has(field)) {
    const compact = compactIdentifier(text);
    if (!compact) return true;
    if (/^(?:ENGINE|MOTOR|SEATING|CHASSIS|REGISTRATION|NUMBER|NO)$/i.test(compact)) return true;
    if ((field === "engineNumber" || field === "chassisNumber") && compactIdentifier(data.registrationNumber || data.vehicleNumber) === compact) return true;
    if (field === "engineNumber" && compact.length < 5) return true;
    if (field === "engineNumber" && !/\d/.test(compact)) return true;
    if (field === "chassisNumber" && (compact.length < 10 || compact.length > 25)) return true;
  }

  if (AMOUNT_FIELDS.has(field) && !/[0-9]/.test(text)) return true;
  if (DATE_FIELDS.has(field) && !/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text)) return true;
  if (field === "fuelType" && !isRecognizedFuelType(text)) return true;
  if (field === "manufacturingYear" && !/^(?:19|20)\d{2}$/.test(text)) return true;
  if ((field === "cubicCapacity" || field === "seatingCapacity" || field === "grossVehicleWeight") && !/\d/.test(text)) return true;
  return false;
}

function hasFieldLabelEvidence(field, value, rawText = "") {
  if (!rawText || !value) return false;
  const text = String(rawText || "").replace(/\s+/g, " ");
  const candidates = buildValueCandidates(value);
  for (const candidate of candidates) {
    const escaped = escapeRegExp(candidate);
    const regex = new RegExp(`.{0,120}${escaped}.{0,120}`, "ig");
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (hasFieldLabelContext(field, match[0])) return true;
    }
  }
  return false;
}

function buildValueCandidates(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const candidates = new Set([text]);
  if (AMOUNT_FIELDS.size) {
    candidates.add(text.replace(/,/g, ""));
    candidates.add(text.replace(/,/g, "").replace(/\.00$/, ""));
  }
  candidates.delete("");
  return [...candidates];
}

function hasFieldLabelContext(field, text = "") {
  const source = String(text || "");
  const patterns = getFieldLabelPatterns(field);
  return patterns.some((pattern) => pattern.test(source));
}

function getFieldLabelPatterns(field) {
  const labels = {
    insuranceCompany: [/insurance\s+company|insurer|assurance|general\s+insurance/i],
    policyType: [/policy\s+type|package\s+policy|liability\s+policy|comprehensive|policy\s+schedule/i],
    insuredName: [/insured'?s?\s+name|name\s+of\s+insured|proposer\s+name|customer\s+name/i],
    contactNumber: [/contact|mobile|phone/i],
    customerMobile: [/contact|mobile|phone/i],
    policyNumber: [/policy\s*(?:no|number)|certificate\s*(?:no|number)/i],
    startDate: [/from|start|effective|period\s+of\s+(?:cover|insurance)/i],
    expiryDate: [/to|end|expiry|midnight|period\s+of\s+(?:cover|insurance)/i],
    sumInsured: [/sum\s+insured|insured\s+declared\s+value|total\s+idv/i],
    idv: [/idv|insured\s+declared\s+value/i],
    totalIdv: [/total\s+idv|total\s+value|insured\s+declared\s+value/i],
    premium: [/premium|total\s+payable|amount\s+payable/i],
    totalPremium: [/total\s+(?:premium|payable)|gross\s+premium|premium\s+amount/i],
    netPremium: [/net\s+premium/i],
    odPremium: [/own\s+damage|od\s+premium|total\s+od/i],
    tpDriverOwner: [/tp|third\s+party|liability|driver|owner/i],
    basicOwnDamage: [/basic\s+own\s+damage|basic\s+od/i],
    basicThirdPartyLiability: [/basic\s+(?:tp|third\s+party)|third\s+party\s+liability/i],
    netOwnDamagePremium: [/net\s+own\s+damage|total\s+own\s+damage|total\s+od/i],
    netLiabilityPremium: [/net\s+liability|total\s+liability|total\s+tp/i],
    totalPackagePremium: [/total\s+package|package\s+premium/i],
    gstAmount: [/gst|tax/i],
    sgst: [/sgst|ugst/i],
    cgst: [/cgst/i],
    registrationNumber: [/registration|regn|vehicle\s+(?:no|number)/i],
    vehicleNumber: [/registration|regn|vehicle\s+(?:no|number)/i],
    makeModel: [/make|model/i],
    vehicleMake: [/make/i],
    vehicleModel: [/model/i],
    variant: [/variant|sub\s*type/i],
    manufacturingYear: [/manufactur|mfg|year/i],
    registrationDate: [/registration\s+date|date\s+of\s+registration/i],
    engineNumber: [/engine|motor\s+no/i],
    chassisNumber: [/chassis|vin/i],
    fuelType: [/fuel/i],
    cubicCapacity: [/cubic|cc|kw|wattage/i],
    seatingCapacity: [/seating|seat|capacity/i],
    grossVehicleWeight: [/gross\s+vehicle\s+weight|gvw/i],
    ncb: [/ncb|no\s+claim/i],
    ncbPercentage: [/ncb|no\s+claim/i],
    policyCoverType: [/cover|coverage|package|liability|comprehensive/i],
    rtoLocation: [/rto|registration\s+authority/i],
    rto: [/rto|registration\s+authority/i],
    nomineeName: [/nominee/i],
    financerName: [/financier|financer|hypothecation|lease|hire\s+purchase/i],
    customerEmail: [/email/i],
    gstin: [/gstin|gst\s+no/i],
    panNumber: [/pan/i],
    previousPolicyNumber: [/previous\s+policy/i],
    previousInsurer: [/previous\s+insurer/i],
    paymentReference: [/payment|reference|transaction/i],
    bankName: [/bank/i],
    modeOfPayment: [/mode\s+of\s+payment|payment\s+mode/i]
  };
  return labels[field] || [new RegExp(escapeRegExp(field).replace(/[A-Z]/g, " $&").trim().replace(/\s+/g, "\\s+"), "i")];
}

function hasSourceEvidence(field, value, rawText, fields = {}) {
  const text = String(rawText || "");
  if (!text.trim()) return false;
  if (isInvalidExtractedValue(field, value, fields)) return false;

  if ([...IDENTIFIER_FIELDS, "policyNumber", "proposalNumber", "invoiceNumber", "customerId", "receiptNumber"].includes(field)) {
    const compactValue = compactIdentifier(value);
    if (!compactValue) return false;
    return compactIdentifier(text).includes(compactValue);
  }

  if (DATE_FIELDS.has(field)) {
    return compactIdentifier(text).includes(compactIdentifier(value));
  }

  if (field === "duration") {
    return Boolean(fields.startDate && fields.expiryDate &&
      hasSourceEvidence("startDate", fields.startDate, text, fields) &&
      hasSourceEvidence("expiryDate", fields.expiryDate, text, fields));
  }

  if (AMOUNT_FIELDS.has(field)) {
    return compactAmount(text).includes(compactAmount(value));
  }

  if (field === "fuelType") {
    const fuel = String(value || "").trim();
    const makeModel = fields.makeModel || "";
    if (!isRecognizedFuelType(fuel)) return false;
    return new RegExp(`\\b${escapeRegExp(fuel)}\\b`, "i").test(text) ||
      (inferFuelFromMakeModel(makeModel) === fuel && containsTextTokens(text, makeModel, 2));
  }

  if (field === "insuranceCompany") {
    return hasCompanyEvidence(value, text);
  }

  if (field === "policyType" || field === "insuredName" || field === "makeModel") {
    return containsTextTokens(text, value, 2);
  }

  if (
    field === "manufacturingYear" ||
    field === "cubicCapacity" ||
    field === "seatingCapacity" ||
    field === "grossVehicleWeight" ||
    field === "ncb" ||
    field === "ncbPercentage" ||
    field === "contactNumber" ||
    field === "customerMobile" ||
    field === "cscContactNumber" ||
    field === "gstin" ||
    field === "panNumber"
  ) {
    const compactValue = compactIdentifier(value);
    if (!compactValue) return false;
    return compactIdentifier(text).includes(compactValue);
  }

  if (field === "customerEmail") {
    return text.toLowerCase().includes(String(value || "").toLowerCase());
  }

  return containsTextTokens(text, value, 1) || compactIdentifier(text).includes(compactIdentifier(value));
}

function normalizeAiFieldValue(field, value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (IDENTIFIER_FIELDS.has(field)) {
    return text.replace(/[^A-Z0-9-]/gi, "").toUpperCase();
  }
  if (field === "policyNumber" || field === "proposalNumber" || field === "invoiceNumber") {
    return text.replace(/[^A-Z0-9/.-]/gi, "").toUpperCase();
  }
  if (DATE_FIELDS.has(field)) {
    return text.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/)?.[0] || "";
  }
  if (AMOUNT_FIELDS.has(field)) {
    const amount = text.match(/[0-9][0-9,]*(?:\.\d{1,2})?/);
    if (!amount) return "";
    return amount[0].includes(".") ? amount[0].replace(/\.(\d)$/, ".$10") : `${amount[0]}.00`;
  }
  if (field === "fuelType") return normalizeFuelType(text);
  return text;
}

function pickReviewFields(data = {}) {
  return AI_EXTRACTION_FIELDS.reduce((payload, field) => {
    payload[field] = data[field] || "";
    return payload;
  }, {});
}

function compactIdentifier(value = "") {
  return String(value || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function compactAmount(value = "") {
  return String(value || "")
    .replace(/,/g, "")
    .replace(/\.00\b/g, "")
    .replace(/[^0-9]/g, "");
}

function isRecognizedFuelType(value = "") {
  return /^(petrol|diesel|cng|lpg|electric|ev|hybrid)$/i.test(String(value || "").trim());
}

function normalizeFuelType(value = "") {
  const fuel = String(value || "").trim().toUpperCase();
  if (fuel === "EV") return "Electric";
  if (fuel === "PETROL") return "Petrol";
  if (fuel === "DIESEL") return "Diesel";
  if (fuel === "CNG") return "CNG";
  if (fuel === "LPG") return "LPG";
  if (fuel === "ELECTRIC") return "Electric";
  if (fuel === "HYBRID") return "Hybrid";
  return "";
}

function inferFuelFromMakeModel(value = "") {
  const text = String(value || "").toLowerCase();
  if (/\bdiesel\b|\bcrdi\b|\bdci\b|\btdi\b|\bddis\b|\b d\b|\bd\s*(?:at|mt|amt)\b/.test(text)) return "Diesel";
  if (/\bpetrol\b|\bdts-?fi\b|\b vxi\b|\b lxi\b|\b zxi\b/.test(text)) return "Petrol";
  if (/\bcng\b/.test(text)) return "CNG";
  if (/\belectric\b|\bev\b|\bbev\b/.test(text)) return "Electric";
  if (/\blpg\b/.test(text)) return "LPG";
  return "";
}

function containsTextTokens(text, value, minimum = 2) {
  const source = String(text || "").toLowerCase();
  const tokens = String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
  if (!tokens.length) return false;
  return tokens.filter((token) => source.includes(token)).length >= Math.min(minimum, tokens.length);
}

function containsSourceSnippet(rawText, sourceText) {
  const source = String(rawText || "").replace(/\s+/g, " ").trim().toLowerCase();
  const snippet = String(sourceText || "").replace(/\s+/g, " ").trim().toLowerCase();
  return Boolean(snippet && source.includes(snippet));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
