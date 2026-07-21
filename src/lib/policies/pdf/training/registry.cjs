const tataAigWarehouse = require("./tata-aig/warehouse.cjs");
const iciciLombardHealth = require("./icici-lombard/health.cjs");

const trainers = [tataAigWarehouse, iciciLombardHealth];
const ICICI_LOMBARD_HEALTH_FORMAT = "ICICI_LOMBARD_HEALTH_ELEVATE_V1";
const protectedScopeFields = [
  "sourceFile",
  "insuranceCompany",
  "companyName",
  "documentCategory",
  "documentFormat",
  "sourceDocumentType",
];

function normalizeInsurer(value = "") {
  const insurer = String(value).trim();
  const known = [
    [/ICICI\s+Lombard/i, "icici-lombard"],
    [/TATA\s*AIG/i, "tata-aig"],
    [/IFFCO\s*Tokio/i, "iffco-tokio"],
    [/Bajaj\s*Allianz/i, "bajaj-allianz"],
    [/United\s+India/i, "united-india"],
    [/New\s+India/i, "new-india"],
    [/HDFC\s*ERGO/i, "hdfc-ergo"],
    [/(?:Future\s+)?Generali/i, "generali"],
    [/Royal\s+Sundaram/i, "royal-sundaram"],
    [/Shriram/i, "shriram"],
    [/Liberty/i, "liberty"],
    [/(?:Go\s+)?Digit/i, "go-digit"],
  ];
  return known.find(([pattern]) => pattern.test(insurer))?.[1] || slug(insurer);
}

function normalizeCategory(value = "") {
  const category = String(value).trim();
  const known = [
    [/Motor/i, "motor"],
    [/Warehouse/i, "warehouse"],
    [/Fire/i, "fire"],
    [/Health/i, "health"],
    [/Marine/i, "marine"],
    [/Burglary/i, "burglary"],
    [/Fidelity/i, "fidelity"],
    [/Workm(?:e|a)n(?:'s)?\s+Compensation/i, "workmen-compensation"],
  ];
  return known.find(([pattern]) => pattern.test(category))?.[1] || slug(category);
}

function slug(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isIciciLombardElevateHealth(result = {}, context = {}) {
  const insurer = normalizeInsurer(result.insuranceCompany || result.companyName);
  const text = String(context.text || result.sourceText || "");
  return (
    insurer === "icici-lombard" &&
    /Product\s+Name\s*ELEVATE\b/i.test(text) &&
    /ICIHLIP\d{5}[A-Z]\d{6}/i.test(text) &&
    /\bPolicyholder\s+Details\b/i.test(text) &&
    /\bInsured\s+Details\b/i.test(text)
  );
}

function deriveTrainingScope(result = {}, context = {}) {
  const insurer = normalizeInsurer(result.insuranceCompany || result.companyName);
  return {
    insurer,
    category: isIciciLombardElevateHealth(result, context)
      ? "health"
      : normalizeCategory(result.documentCategory),
  };
}

function establishTrainingIdentity(result = {}, context = {}) {
  if (!isIciciLombardElevateHealth(result, context)) return result;
  return {
    ...result,
    documentCategory: "Health Insurance",
    documentFormat: ICICI_LOMBARD_HEALTH_FORMAT,
    sourceDocumentType: ICICI_LOMBARD_HEALTH_FORMAT,
  };
}

function selectScopedTraining(result = {}, context = {}) {
  const scope = deriveTrainingScope(result, context);
  if (!scope.insurer || !scope.category) return [];
  return trainers.filter((trainer) => {
    if (trainer.scope.insurer !== scope.insurer || trainer.scope.category !== scope.category) return false;
    try {
      return !trainer.matches || trainer.matches({ result: clone(result), ...context });
    } catch {
      return false;
    }
  });
}

function clone(value) {
  return typeof globalThis.structuredClone === "function"
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function protectScopeIdentity(candidate, original) {
  for (const field of protectedScopeFields) {
    if (Object.prototype.hasOwnProperty.call(original, field)) candidate[field] = original[field];
    else delete candidate[field];
  }
  return candidate;
}

function applyScopedTraining(result, context = {}) {
  if (!result || typeof result !== "object") return result;

  const scopedResult = establishTrainingIdentity(result, context);
  return selectScopedTraining(scopedResult, context).reduce((current, trainer) => {
    try {
      const working = clone(current);
      const patch = trainer.train({ result: working, ...context }) || {};
      const changes = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
      return protectScopeIdentity({ ...working, ...changes }, current);
    } catch (error) {
      return {
        ...current,
        extractionTrainingWarnings: [
          ...(current.extractionTrainingWarnings || []),
          `${trainer.scope.insurer}/${trainer.scope.category}: ${error?.message || String(error)}`,
        ],
      };
    }
  }, scopedResult);
}

module.exports = {
  trainers,
  deriveTrainingScope,
  selectScopedTraining,
  applyScopedTraining,
};
