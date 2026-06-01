import { hasCompanyEvidence } from "./company-detector";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

const REVIEW_FIELDS = [
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

export async function reviewPolicyExtractionWithAi({ rawText = "", extractedData = {}, sourceFile = "" } = {}) {
  const issues = getExtractionAuthenticityIssues(extractedData, rawText);
  if (!process.env.GROQ_API_KEY || !issues.length || !rawText.trim()) {
    const verified = rawText.trim()
      ? keepOnlySourceVerifiedFields({ rawText, data: extractedData, aiPatch: {} })
      : { data: extractedData, clearedFields: [], fieldEvidence: {} };
    return {
      data: {
        ...verified.data,
        extractionQuality: {
          ...(extractedData.extractionQuality || {}),
          aiReview: {
            provider: process.env.GROQ_API_KEY ? "groq" : "",
            used: false,
            issues,
            acceptedFields: [],
            rejectedFields: [],
            clearedFields: verified.clearedFields,
            fieldEvidence: verified.fieldEvidence
          }
        }
      },
      aiReview: {
        provider: process.env.GROQ_API_KEY ? "groq" : "",
        used: false,
        issues,
        acceptedFields: [],
        rejectedFields: [],
        clearedFields: verified.clearedFields
      }
    };
  }

  try {
    const aiPatch = await requestGroqExtractionReview({ rawText, extractedData, sourceFile, issues });
    const merge = mergeAiExtractionPatch({ rawText, extractedData, aiPatch });
    const verified = keepOnlySourceVerifiedFields({ rawText, data: merge.data, aiPatch });
    return {
      data: {
        ...verified.data,
        extractionQuality: {
          ...(extractedData.extractionQuality || {}),
          aiReview: {
            provider: "groq",
            used: true,
            model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
            issues,
            acceptedFields: merge.acceptedFields,
            rejectedFields: merge.rejectedFields,
            clearedFields: verified.clearedFields,
            fieldEvidence: verified.fieldEvidence
          }
        }
      },
      aiReview: {
        provider: "groq",
        used: true,
        issues,
        acceptedFields: merge.acceptedFields,
        rejectedFields: merge.rejectedFields,
        clearedFields: verified.clearedFields
      }
    };
  } catch (error) {
    return {
      data: extractedData,
      aiReview: {
        provider: "groq",
        used: false,
        issues,
        acceptedFields: [],
        rejectedFields: [],
        error: error instanceof Error ? error.message : "AI extraction review failed"
      }
    };
  }
}

export function getExtractionAuthenticityIssues(data = {}, rawText = "") {
  const issues = [];
  const registration = compactIdentifier(data.registrationNumber || data.vehicleNumber);
  const engine = compactIdentifier(data.engineNumber);
  const chassis = compactIdentifier(data.chassisNumber);

  for (const field of REVIEW_FIELDS) {
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
    for (const field of REVIEW_FIELDS) {
      const value = data[field];
      if (!value) continue;
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
  const corrections = getAiCorrectedFields(aiPatch);

  for (const field of REVIEW_FIELDS) {
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

    if (!shouldAcceptAiField(field, data[field], normalized, data, rawText)) {
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

async function requestGroqExtractionReview({ rawText, extractedData, sourceFile, issues }) {
  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You review Indian motor insurance PDF extraction.",
            "The deterministic extractor has already run first; you are only a verification and recovery layer.",
            "Return JSON only with top-level correctedFields, unchangedFields, and unresolvedFields objects.",
            "For correctedFields, each field must contain value, sourceText, and reason.",
            "sourceText must be an exact short snippet copied from the raw PDF text containing the value.",
            "Only correct wrong fields when the correct value is visibly present in raw text.",
            "Only fill missing fields when the value is clearly present in raw text.",
            "For unchangedFields, include only fields whose current value matches raw text evidence.",
            "For unresolvedFields, include fields missing from raw text or not confidently verified.",
            "Do not guess, assume, infer from file name, insurer, vehicle type, or previous records.",
            "Do not calculate values unless the exact calculation source exists in the PDF text.",
            "If a field is not visible, leave it out of correctedFields and mark it unresolved."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({
            sourceFile,
            issues,
            currentExtraction: pickReviewFields(extractedData),
            requiredFields: REVIEW_FIELDS,
            outputFormat: {
              correctedFields: {
                fieldName: {
                  value: "correct value",
                  sourceText: "exact PDF text where value was found",
                  reason: "why extractor value was wrong or missing"
                }
              },
              unchangedFields: {
                fieldName: {
                  value: "existing value",
                  reason: "extractor value matched PDF evidence"
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
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Groq review failed with status ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

function getAiCorrectedFields(aiPatch = {}) {
  if (aiPatch?.correctedFields && typeof aiPatch.correctedFields === "object") {
    return Object.entries(aiPatch.correctedFields).reduce((fields, [field, entry]) => {
      if (entry && typeof entry === "object") {
        fields[field] = {
          value: entry.value,
          sourceText: entry.sourceText || "",
          reason: entry.reason || ""
        };
      }
      return fields;
    }, {});
  }

  return {};
}

function keepOnlySourceVerifiedFields({ rawText = "", data = {}, aiPatch = {} } = {}) {
  const verified = { ...data };
  const clearedFields = [];
  const fieldEvidence = {};
  const corrections = getAiCorrectedFields(aiPatch);

  for (const field of REVIEW_FIELDS) {
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

function shouldAcceptAiField(field, existingValue, nextValue, data = {}, rawText = "") {
  if (!existingValue) return true;
  const current = String(existingValue || "").trim();
  if (!current) return true;
  if (rawText && !hasSourceEvidence(field, current, rawText, data)) return true;

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

function hasSourceEvidence(field, value, rawText, fields = {}) {
  const text = String(rawText || "");
  if (!text.trim()) return false;

  if (["registrationNumber", "vehicleNumber", "engineNumber", "chassisNumber", "policyNumber"].includes(field)) {
    return compactIdentifier(text).includes(compactIdentifier(value));
  }

  if (field === "startDate" || field === "expiryDate") {
    return compactIdentifier(text).includes(compactIdentifier(value));
  }

  if (["premium", "totalPremium", "netPremium", "odPremium", "tpDriverOwner", "idv"].includes(field)) {
    return compactIdentifier(text).includes(compactIdentifier(value));
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

  if (field === "manufacturingYear") return compactIdentifier(text).includes(compactIdentifier(value));
  if (field === "cubicCapacity" || field === "seatingCapacity") return compactIdentifier(text).includes(compactIdentifier(value));

  return false;
}

function normalizeAiFieldValue(field, value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (["registrationNumber", "vehicleNumber", "engineNumber", "chassisNumber"].includes(field)) {
    return text.replace(/[^A-Z0-9-]/gi, "").toUpperCase();
  }
  if (field === "startDate" || field === "expiryDate") {
    return text.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/)?.[0] || "";
  }
  if (["premium", "totalPremium", "netPremium", "odPremium", "tpDriverOwner", "idv"].includes(field)) {
    const amount = text.match(/[0-9][0-9,]*(?:\.\d{1,2})?/);
    if (!amount) return "";
    return amount[0].includes(".") ? amount[0].replace(/\.(\d)$/, ".$10") : `${amount[0]}.00`;
  }
  if (field === "fuelType") return normalizeFuelType(text);
  return text;
}

function pickReviewFields(data = {}) {
  return REVIEW_FIELDS.reduce((payload, field) => {
    payload[field] = data[field] || "";
    return payload;
  }, {});
}

function compactIdentifier(value = "") {
  return String(value || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
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
