const fs = require("node:fs");
const path = require("node:path");

const MEMORY_DIR = path.join(process.cwd(), "storage", "training-memory");
const MEMORY_FILE = path.join(MEMORY_DIR, "corrections.jsonl");

async function saveCorrection(correction = {}, prisma = null) {
  const payload = {
    id: correction.id || buildCorrectionId(correction),
    savedAt: new Date().toISOString(),
    originalValue: correction.originalValue ?? null,
    correctedValue: correction.correctedValue ?? null,
    field: correction.field || "",
    layoutFingerprint: correction.layoutFingerprint || correction.layoutHash || "",
    company: correction.company || "",
    policyType: correction.policyType || "",
    aliases: correction.aliases || [],
    sourceFieldLabel: correction.sourceFieldLabel || "",
    sourceText: correction.sourceText || "",
    userId: correction.userId || "",
    organizationId: correction.organizationId || ""
  };

  if (prisma && typeof prisma.trainingCorrection?.create === "function") {
    return prisma.trainingCorrection.create({ data: { payload } });
  }

  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  if (isDuplicateRecentCorrection(payload)) return payload;
  fs.appendFileSync(MEMORY_FILE, `${JSON.stringify(payload)}\n`, "utf8");
  return payload;
}

function loadCorrections(limit = 200) {
  if (!fs.existsSync(MEMORY_FILE)) return [];
  return fs.readFileSync(MEMORY_FILE, "utf8")
    .split(/\n/)
    .filter(Boolean)
    .slice(-limit)
    .map((line) => safeParse(line))
    .filter(Boolean);
}

function isDuplicateRecentCorrection(payload) {
  const recent = loadCorrections(100);
  return recent.some((item) => item.id === payload.id);
}

function buildCorrectionId(correction) {
  const raw = [
    correction.layoutFingerprint || correction.layoutHash || "",
    correction.company || "",
    correction.policyType || "",
    correction.field || "",
    correction.originalValue ?? "",
    correction.correctedValue ?? ""
  ].join("|");
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(index)) | 0;
  }
  return `corr_${Math.abs(hash)}`;
}

function safeParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

module.exports = { saveCorrection, loadCorrections };
