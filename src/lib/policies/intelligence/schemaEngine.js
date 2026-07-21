const fs = require("node:fs");
const path = require("node:path");
const { buildFieldMap } = require("../understanding/buildFieldMap");

const SCHEMA_DIR = fs.existsSync(path.join(process.cwd(), "src", "lib", "policies", "schemas"))
  ? path.join(process.cwd(), "src", "lib", "policies", "schemas")
  : path.join(process.cwd(), "lib", "policies", "schemas");
const FORMAT_TO_SCHEMA = {
  ICICI_LOMBARD_HEALTH_ELEVATE_V1: "icici_health.json",
  UNITED_INDIA_WAREHOUSE_V1: "united_india_warehouse.json",
  HDFC_ERGO_MOTOR_V1: "hdfc_motor.json",
  IFFCO_TOKIO_MOTOR_V1: "iffco_motor.json",
  GENERALI_MOTOR_V1: "generali_motor.json",
  NEW_INDIA_MOTOR_V1: "new_india_motor.json",
  TATA_AIG_MOTOR_V1: "tata_aig_motor.json",
  TATA_AIG_WAREHOUSE_V1: "tata_aig_warehouse.json",
  ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1: "icici_warehouse.json",
  ICICI_WAREHOUSE_V1: "icici_warehouse.json",
  IFFCO_TOKIO_WAREHOUSE_V1: "iffco_warehouse.json",
  LIBERTY_MOTOR_V1: "liberty_motor.json",
  ROYAL_SUNDARAM_MOTOR_V1: "royal_sundaram_motor.json",
  SHRIRAM_MOTOR_V1: "shriram_motor.json",
  GENERIC_POLICY_V1: "generic_policy.json",
};

function resolveSchema(understanding = {}) {
  const fileName = FORMAT_TO_SCHEMA[understanding.documentFormat] || "generic_policy.json";
  const { schema, error } = readSchema(fileName);
  const fallback = schema ? { schema, error } : readSchema("generic_policy.json");
  const resolvedSchema = fallback.schema || { name: "Generic Policy", version: 1, fields: [] };
  const schemaMatch = calculateSchemaMatch(understanding, resolvedSchema);
  return {
    ...resolvedSchema,
    fileName,
    schemaLoadError: error || fallback.error || "",
    schemaMatch,
    fieldMap: buildFieldMap(understanding, resolvedSchema),
  };
}

function readSchema(fileName) {
  const fullPath = path.join(SCHEMA_DIR, fileName);
  if (!fs.existsSync(fullPath)) return { schema: null, error: `Schema file not found: ${fileName}` };
  try {
    return { schema: JSON.parse(fs.readFileSync(fullPath, "utf8")), error: "" };
  } catch (error) {
    return {
      schema: null,
      error: `Schema file invalid: ${fileName}: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

function calculateSchemaMatch(understanding, schema) {
  const labels = new Set((understanding.importantLabels || []).map((label) => normalize(label)));
  const sectionTypes = new Set((understanding.sections || []).map((section) => section.type));
  const tableTypes = new Set((understanding.tables || []).map((table) => table.type));
  const fields = schema.fields || [];

  const fieldAliasHits = fields.filter((field) =>
    (field.aliases || []).some((alias) => labels.has(normalize(alias))),
  ).length;
  const requiredHits = fields.filter(
    (field) =>
      field.required &&
      (sectionTypes.has(field.section) ||
        (field.aliases || []).some((alias) => labels.has(normalize(alias)))),
  ).length;
  const expectedSectionHits = (schema.expectedSections || []).filter((section) =>
    sectionTypes.has(section),
  ).length;
  const expectedTableHits = (schema.expectedTables || []).filter((table) => tableTypes.has(table)).length;

  const score = Math.min(
    1,
    (understanding.confidence || 0) * 0.35 +
      ratio(fieldAliasHits, Math.min(fields.length, 12)) * 0.25 +
      ratio(requiredHits, Math.max(1, fields.filter((field) => field.required).length)) * 0.2 +
      ratio(expectedSectionHits, Math.max(1, (schema.expectedSections || []).length)) * 0.12 +
      ratio(expectedTableHits, Math.max(1, (schema.expectedTables || []).length)) * 0.08,
  );

  return Number(score.toFixed(2));
}

function ratio(value, total) {
  return total ? Math.min(1, value / total) : 0;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_.:-]+/g, "");
}

module.exports = { resolveSchema };
