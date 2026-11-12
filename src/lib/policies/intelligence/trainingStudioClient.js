import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { ensureDefaultFieldSetup } from "@/lib/policies/field-setup";
import {
  getStudioMetrics,
  getStudioProfiles,
  getStudioTypes,
  integrateExtractBuffer,
} from "./studio/engine";

const DEFAULT_PORTABLE_FILE = path.join(
  process.cwd(),
  "storage",
  "training-memory",
  "portable-profiles.json",
);

const CATEGORY_TO_TYPE_ID = new Map([
  ["motor", "motor-insurance"],
  ["motor insurance", "motor-insurance"],
  ["private car", "motor-insurance"],
  ["two wheeler", "motor-insurance"],
  ["commercial vehicle", "motor-insurance"],
  ["health", "health-insurance"],
  ["health insurance", "health-insurance"],
  ["warehouse", "warehouse"],
  ["warehouse insurance", "warehouse"],
  ["fire", "fire-insurance"],
  ["fire insurance", "fire-insurance"],
  ["marine", "marine-insurance"],
  ["marine insurance", "marine-insurance"],
]);

const FIELD_KEY_ALIASES = {
  vehicleNumber: ["vehicleNumber", "registrationNumber"],
  gst: ["gstAmount", "gst"],
  gstAmount: ["gstAmount", "gst"],
  insuredAddress: ["address", "insuredAddress"],
  totalPremium: ["totalPremium", "premium"],
  netPremium: ["netPremium"],
  sumInsured: ["sumInsured"],
};

const MOTOR_CATEGORY_RE =
  /\b(?:motor|private[\s_-]*car|two[\s_-]*wheeler|commercial[\s_-]*vehicle|gcv|pcv|misc[\s_-]*d)\b/i;

export function getTrainingStudioConfig() {
  const enabled = String(process.env.PIE_LIVE_ENRICHMENT || "true").toLowerCase() !== "false";
  const portableProfilesPath = process.env.PIE_PORTABLE_PROFILES_PATH || DEFAULT_PORTABLE_FILE;
  return { enabled, mode: "native-in-process", portableProfilesPath };
}

export function normalizeCategoryToTypeId(categoryName = "") {
  const normalized = String(categoryName || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  if (CATEGORY_TO_TYPE_ID.has(normalized)) {
    return CATEGORY_TO_TYPE_ID.get(normalized);
  }
  return normalized.replace(/\s+/g, "-");
}

function isMotorScope({ resolvedCategory = "", currentData = {} } = {}) {
  return (
    MOTOR_CATEGORY_RE.test(String(resolvedCategory || "")) ||
    MOTOR_CATEGORY_RE.test(String(currentData.documentCategory || "")) ||
    MOTOR_CATEGORY_RE.test(String(currentData.policyType || ""))
  );
}

function isEmptyOrPlaceholder(field, val) {
  const s = String(val ?? "").trim();
  if (!s) return true;
  if (/^(?:Policy|Policy No|Registration|Chassis|Engine|Name|Address|N\/A|NA|-)$/i.test(s)) {
    return true;
  }
  if (field === "policyNumber" && s.length < 5) return true;
  return false;
}

export async function loadPortableProfiles(customPath) {
  const filePath = customPath || getTrainingStudioConfig().portableProfilesPath;
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.profiles) && parsed.profiles.length) {
      return parsed;
    }
  } catch {
    // Fallback to live in-process Studio store
  }

  try {
    const [types, profiles, metrics] = await Promise.all([
      getStudioTypes(),
      getStudioProfiles(),
      getStudioMetrics(),
    ]);
    return {
      updatedAt: null,
      types,
      profiles,
      benchmarks: metrics?.benchmarks || [],
    };
  } catch {
    return { updatedAt: null, types: [], profiles: [] };
  }
}

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanMatchedValue(raw, { stopLabels = [], inlineAfter = "" } = {}) {
  let val = String(raw || "")
    .replace(/^[\s:|=\-–—.]+/, "")
    .trim();

  if (inlineAfter) {
    const idx = val.toLowerCase().indexOf(String(inlineAfter).toLowerCase());
    if (idx > 0) val = val.slice(0, idx);
  }

  for (const stop of stopLabels || []) {
    if (!stop || stop.length < 2) continue;
    const stopRe = new RegExp(`\\s+${escapeRegExp(stop)}\\b`, "i");
    const m = stopRe.exec(val);
    if (m && m.index > 0) {
      val = val.slice(0, m.index);
    }
  }

  return val.replace(/[\s:|=\-–—]+$/, "").replace(/\s+/g, " ").trim();
}

function matchVariantInLines(lines, variant) {
  const anchor = String(variant?.anchor || "").trim();
  if (!anchor || anchor.length < 2) return "";

  const anchorWords = anchor.match(/[\p{L}\p{N}#]+/gu);
  if (!anchorWords?.length) return "";
  const anchorRe = new RegExp(
    anchorWords.map(escapeRegExp).join("[^\\p{L}\\p{N}#]*") + "(?:\\s*[.):\\]])*",
    "i",
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = anchorRe.exec(line);
    if (!m) continue;

    if (variant.relation === "next-line") {
      const nextLine = (lines[i + 1] || "").trim();
      const cleaned = cleanMatchedValue(nextLine, variant);
      if (cleaned && cleaned.length >= 2 && cleaned.length <= 160) return cleaned;
      continue;
    }

    const tail = line.slice(m.index + m[0].length).trim();
    const cleaned = cleanMatchedValue(tail, variant);
    if (cleaned && cleaned.length >= 2 && cleaned.length <= 160) return cleaned;
  }

  return "";
}

function mapResultFields(fieldId, value, currentData, target) {
  const keys = FIELD_KEY_ALIASES[fieldId] || [fieldId];
  let applied = false;
  for (const key of keys) {
    if (isEmptyOrPlaceholder(key, currentData[key]) && isEmptyOrPlaceholder(key, target[key])) {
      target[key] = value;
      applied = true;
    }
  }
  return applied;
}

export function extractFromPortableStore({ store, rawText = "", resolvedCategory = "", currentData = {} }) {
  if (!store?.profiles?.length || !rawText) return { addedFields: {}, profile: null };
  if (isMotorScope({ resolvedCategory, currentData })) {
    return { addedFields: {}, profile: null };
  }

  const targetTypeId = normalizeCategoryToTypeId(resolvedCategory);
  if (!targetTypeId) return { addedFields: {}, profile: null };

  const candidates = store.profiles
    .filter((p) => p.typeId === targetTypeId)
    .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));

  if (!candidates.length) return { addedFields: {}, profile: null };

  const lines = String(rawText)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const profile = candidates[0];
  const addedFields = {};

  for (const [fieldId, mapping] of Object.entries(profile.mappings || {})) {
    const variants = Array.isArray(mapping?.variants) && mapping.variants.length ? mapping.variants : [mapping];
    for (const variant of variants) {
      if (!variant) continue;
      const matched = matchVariantInLines(lines, variant);
      if (matched && mapResultFields(fieldId, matched, currentData, addedFields)) {
        break;
      }
    }
  }

  return {
    addedFields,
    profile: Object.keys(addedFields).length
      ? { id: profile.id, name: profile.name, version: profile.version, typeId: profile.typeId }
      : null,
  };
}

export async function enrichWithTrainedProfiles({
  rawText = "",
  currentData = {},
  sourceFile = "",
  resolvedCategory = "",
  pdfBuffer = null,
} = {}) {
  const config = getTrainingStudioConfig();
  if (!config.enabled) {
    return { addedFields: {}, appliedFields: [], source: "disabled", profile: null };
  }

  // Strict Motor isolation: never modify or override Motor extraction path.
  if (isMotorScope({ resolvedCategory, currentData })) {
    return { addedFields: {}, appliedFields: [], source: "skipped_motor_isolation", profile: null };
  }

  const addedFields = {};
  let matchedProfile = null;
  let enrichmentSource = "";

  // 1. Portable synced profiles (fast, zero-I/O)
  try {
    const store = await loadPortableProfiles(config.portableProfilesPath);
    const portable = extractFromPortableStore({ store, rawText, resolvedCategory, currentData });
    if (Object.keys(portable.addedFields).length > 0) {
      Object.assign(addedFields, portable.addedFields);
      matchedProfile = portable.profile;
      enrichmentSource = "portable_training_profile";
    }
  } catch {
    // Non-blocking fallback
  }

  // 2. Native in-process spatial + OCR matcher when PDF binary buffer is present
  const typeId = normalizeCategoryToTypeId(resolvedCategory);
  if (pdfBuffer && typeId && typeId !== "motor-insurance") {
    try {
      const data = await integrateExtractBuffer({
        buffer: pdfBuffer,
        fileName: sourceFile || "policy.pdf",
        typeId,
      });

      if (data) {
        const mergedView = { ...currentData, ...addedFields };
        for (const [fieldId, item] of Object.entries(data.fields || {})) {
          const candidateVal = String(item?.value || "").trim();
          if (!candidateVal || item?.valid === false || item?.status === "missing") continue;
          if (mapResultFields(fieldId, candidateVal, mergedView, addedFields)) {
            enrichmentSource = enrichmentSource
              ? `${enrichmentSource}+native_training_studio`
              : "native_training_studio";
          }
        }
        if (data.profile && !matchedProfile) {
          matchedProfile = { ...data.profile, typeId: data?.policyType?.id || typeId };
        }
      }
    } catch {
      // Never interfere with Bulk PDF Upload
    }
  }

  const appliedFields = Object.keys(addedFields);
  return {
    addedFields,
    appliedFields,
    source: enrichmentSource || "none",
    profile: matchedProfile,
  };
}

export async function syncSidecarProfilesToCrm({ actorId = null } = {}) {
  const config = getTrainingStudioConfig();
  const [types, profiles, metrics] = await Promise.all([
    getStudioTypes(),
    getStudioProfiles(),
    getStudioMetrics(),
  ]);

  const payload = {
    updatedAt: new Date().toISOString(),
    syncedBy: actorId || null,
    types: Array.isArray(types) ? types : [],
    profiles: Array.isArray(profiles) ? profiles : [],
    benchmarks: Array.isArray(metrics?.benchmarks) ? metrics.benchmarks : [],
  };

  try {
    await fs.mkdir(path.dirname(config.portableProfilesPath), { recursive: true });
    await fs.writeFile(config.portableProfilesPath, JSON.stringify(payload, null, 2), "utf8");
  } catch {
    // Serverless environments persist aliases directly in Postgres below
  }

  let updatedDefinitions = 0;
  try {
    await ensureDefaultFieldSetup();
    const learnedAliasesByKey = new Map();

    for (const type of payload.types) {
      for (const field of type.fields || []) {
        const key = String(field.id || "").trim();
        if (!key) continue;
        const set = learnedAliasesByKey.get(key) || new Set();
        for (const alias of field.aliases || []) {
          if (String(alias || "").trim()) set.add(String(alias).trim());
        }
        learnedAliasesByKey.set(key, set);
      }
    }

    for (const profile of payload.profiles) {
      for (const [fieldId, mapping] of Object.entries(profile.mappings || {})) {
        const set = learnedAliasesByKey.get(fieldId) || new Set();
        if (mapping?.anchor && String(mapping.anchor).trim().length >= 3) {
          set.add(String(mapping.anchor).trim());
        }
        for (const variant of mapping?.variants || []) {
          if (variant?.anchor && String(variant.anchor).trim().length >= 3) {
            set.add(String(variant.anchor).trim());
          }
        }
        learnedAliasesByKey.set(fieldId, set);
      }
    }

    for (const [fieldKey, aliasSet] of learnedAliasesByKey.entries()) {
      if (!aliasSet.size) continue;
      const crmKeys = FIELD_KEY_ALIASES[fieldKey] || [fieldKey];
      const existingDefs = await prisma.fieldDefinition.findMany({
        where: { key: { in: crmKeys } },
        select: { id: true, aliases: true },
      });

      for (const def of existingDefs) {
        const existingAliases = Array.isArray(def.aliases) ? def.aliases : [];
        const merged = [...existingAliases];
        const lower = new Set(existingAliases.map((a) => String(a).toLowerCase()));
        let changed = false;
        for (const candidate of aliasSet) {
          if (!lower.has(candidate.toLowerCase())) {
            merged.push(candidate);
            lower.add(candidate.toLowerCase());
            changed = true;
          }
        }
        if (changed) {
          await prisma.fieldDefinition.update({
            where: { id: def.id },
            data: { aliases: merged },
          });
          updatedDefinitions++;
        }
      }
    }
  } catch (err) {
    console.warn("FieldDefinition alias sync skipped:", err?.message || err);
  }

  return {
    syncedAt: payload.updatedAt,
    typeCount: payload.types.length,
    profileCount: payload.profiles.length,
    updatedDefinitions,
    portableProfilesPath: config.portableProfilesPath,
  };
}

export const syncStudioProfilesToCrm = syncSidecarProfilesToCrm;
