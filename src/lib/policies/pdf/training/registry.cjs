const tataAigWarehouse = require("./tata-aig/warehouse.cjs");

const trainers = [tataAigWarehouse];
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

function deriveTrainingScope(result = {}) {
  return {
    insurer: normalizeInsurer(result.insuranceCompany || result.companyName),
    category: normalizeCategory(result.documentCategory),
  };
}

function selectScopedTraining(result = {}, context = {}) {
  const scope = deriveTrainingScope(result);
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

  return selectScopedTraining(result, context).reduce((current, trainer) => {
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
  }, result);
}

module.exports = {
  trainers,
  deriveTrainingScope,
  selectScopedTraining,
  applyScopedTraining,
};
