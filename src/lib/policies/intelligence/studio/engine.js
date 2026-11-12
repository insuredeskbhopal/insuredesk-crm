import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getLocalPhysicalPath, uploadFile } from "@/lib/storage";
import { downloadGoogleDriveFile } from "@/lib/storage/google-drive-storage";
import { defaultCategories } from "./defaults.js";
import { learnMapping, locateValueWordsInPages, mergeMapping } from "./extraction.js";
import { extractHybrid } from "./crm-trainers.js";
import { ocrAvailable, parsePdf } from "./pdf.js";
import seedData from "./seed-data.json";

const STUDIO_DIR = path.join(process.cwd(), "storage", "training-studio");
const STATE_FILE = path.join(STUDIO_DIR, "studio-state.json");
const PAGES_DIR = path.join(STUDIO_DIR, "pages");
const DOCS_DIR = path.join(STUDIO_DIR, "documents");

export class StudioError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const policyFieldSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z][a-zA-Z0-9_]{0,63}$/, "Field ID must start with a lowercase letter and use letters, numbers, or underscores."),
  label: z.string().trim().min(1).max(100),
  kind: z.enum(["text", "date", "currency", "registration", "policy_number", "number", "phone", "email"]),
  required: z.boolean(),
  aliases: z.array(z.string().trim().min(1).max(200)).max(30),
  section: z.string().max(80).optional(),
  description: z.string().max(300).optional(),
});

const policySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().max(500),
    fields: z.array(policyFieldSchema).min(1).max(100),
  })
  .refine((v) => new Set(v.fields.map((f) => f.id)).size === v.fields.length, "Field IDs must be unique.");

const selectionSchema = z.object({
  fieldId: z.string().min(1),
  page: z.number().int().min(1),
  wordIds: z.array(z.number().int().min(0)).min(1).max(2000),
  anchor: z.string().max(500).optional(),
  semanticHint: z.string().max(500).optional(),
  multiline: z.boolean().optional(),
  valueOverride: z.string().max(1000).optional(),
});

const STATE_MEM = globalThis.__bhqStudioStateCache || { state: null, mtimeMs: 0 };
globalThis.__bhqStudioStateCache = STATE_MEM;

function defaultSeedState() {
  const types = Array.isArray(seedData?.types) && seedData.types.length ? seedData.types : defaultCategories;
  const profiles = Array.isArray(seedData?.profiles) ? seedData.profiles : [];
  return {
    types: types.map((t) => ({ ...t, createdAt: t.createdAt || new Date().toISOString() })),
    profiles: profiles.map((p) => ({ ...p })),
    documents: [],
    runs: [],
    updatedAt: new Date().toISOString(),
  };
}

async function loadState() {
  try {
    const stat = await fsp.stat(STATE_FILE);
    if (STATE_MEM.state && STATE_MEM.mtimeMs === stat.mtimeMs) {
      return STATE_MEM.state;
    }
    const raw = await fsp.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.types) && parsed.types.length) {
      STATE_MEM.state = parsed;
      STATE_MEM.mtimeMs = stat.mtimeMs;
      return STATE_MEM.state;
    }
  } catch {
    if (STATE_MEM.state) return STATE_MEM.state;
  }

  try {
    const snap = await prisma.auditLog.findFirst({
      where: { entityType: "TrainingStudio", entityId: "studio-v1", action: "TRAINING_STUDIO_STATE" },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
    if (snap?.metadata && Array.isArray(snap.metadata.types) && snap.metadata.types.length) {
      STATE_MEM.state = snap.metadata;
      return STATE_MEM.state;
    }
  } catch {
    // Non-fatal DB fallback
  }

  STATE_MEM.state = defaultSeedState();
  return STATE_MEM.state;
}

async function saveState(state, { persistSnapshot = false } = {}) {
  state.updatedAt = new Date().toISOString();
  STATE_MEM.state = state;

  try {
    await fsp.mkdir(STUDIO_DIR, { recursive: true });
    await fsp.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
    const stat = await fsp.stat(STATE_FILE);
    STATE_MEM.mtimeMs = stat.mtimeMs;
  } catch {
    // Ephemeral filesystems rely on Postgres snapshot below
  }

  if (persistSnapshot) {
    try {
      await prisma.auditLog.create({
        data: {
          action: "TRAINING_STUDIO_STATE",
          entityType: "TrainingStudio",
          entityId: "studio-v1",
          severity: "INFO",
          source: "SYSTEM",
          metadata: {
            types: state.types,
            profiles: state.profiles,
            documents: state.documents,
            runs: state.runs.slice(0, 100),
            updatedAt: state.updatedAt,
          },
        },
      });
    } catch {
      // Non-blocking cloud backup
    }
  }
}

function schemaFingerprint(fields) {
  return createHash("sha256")
    .update(fields.map((f) => `${f.id}:${f.kind}:${f.required}`).join("|"))
    .digest("hex")
    .slice(0, 12);
}

async function loadDocumentPages(doc) {
  const cachedPageFile = path.join(PAGES_DIR, `${doc.id}.json`);
  try {
    const raw = await fsp.readFile(cachedPageFile, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Re-parse cleanly from PDF binary if page cache is absent
  }

  const buffer = await getDocumentBuffer(doc);
  const pages = await parsePdf(new Uint8Array(buffer));
  try {
    await fsp.mkdir(PAGES_DIR, { recursive: true });
    await fsp.writeFile(cachedPageFile, JSON.stringify(pages), "utf8");
  } catch {
    // Read-only env
  }
  return pages;
}

async function getDocumentBuffer(doc) {
  const candidates = [
    doc.localPdfPath ? path.resolve(process.cwd(), doc.localPdfPath) : "",
    path.join(DOCS_DIR, `${doc.id}.pdf`),
    path.join(process.cwd(), "policy-intelligence-module", "data", "documents", `${doc.id}.pdf`),
  ].filter(Boolean);

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return fsp.readFile(filePath);
    }
  }

  if (doc.storageProvider === "google_drive" && doc.storagePath) {
    return downloadGoogleDriveFile(doc.storagePath);
  }
  if (doc.storagePath) {
    return fsp.readFile(getLocalPhysicalPath(doc.storagePath));
  }
  throw new StudioError(404, "PDF binary not found in storage.");
}

export async function getStudioHealth() {
  const metrics = await getStudioMetrics();
  return {
    ok: true,
    status: "ok",
    mode: "native-in-process",
    ocr: ocrAvailable(),
    integrationEnabled: true,
    integrationReady: metrics.integrationReady,
    typesCount: (await getStudioTypes()).length,
    profilesCount: metrics.profiles,
  };
}

export async function getStudioTypes() {
  const state = await loadState();
  return state.types;
}

export async function saveStudioType(body, id = null) {
  const state = await loadState();
  const value = policySchema.parse(body);

  if (id) {
    const idx = state.types.findIndex((t) => t.id === id);
    if (idx === -1) throw new StudioError(404, "Category not found.");
    state.types[idx] = { ...state.types[idx], ...value };
    await saveState(state, { persistSnapshot: true });
    return state.types[idx];
  }

  const slug = value.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const exists = state.types.some((t) => t.id === slug);
  const newType = {
    id: exists ? `${slug}-${randomUUID().slice(0, 6)}` : slug || randomUUID().slice(0, 8),
    ...value,
    createdAt: new Date().toISOString(),
  };
  state.types.push(newType);
  await saveState(state, { persistSnapshot: true });
  return newType;
}

export async function getStudioDocuments() {
  const state = await loadState();
  return state.documents;
}

export async function getStudioDocument(id) {
  const state = await loadState();
  const doc = state.documents.find((d) => d.id === id);
  if (!doc) throw new StudioError(404, "PDF document not found.");
  const pages = await loadDocumentPages(doc);
  return { ...doc, pages };
}

export async function getStudioDocumentFile(id) {
  const state = await loadState();
  const doc = state.documents.find((d) => d.id === id);
  if (!doc) throw new StudioError(404, "PDF document not found.");
  const bytes = await getDocumentBuffer(doc);
  return { name: doc.name, bytes };
}

export async function uploadStudioDocumentBuffer({ buffer, fileName, typeId, role = "training", allowReuse = false }) {
  const state = await loadState();
  if (!typeId || !state.types.some((t) => t.id === typeId)) {
    throw new StudioError(422, "Choose an existing policy category first.");
  }
  const normalizedRole = role === "heldout" ? "heldout" : "training";
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength > 25 * 1024 * 1024) {
    throw new StudioError(413, "PDF must be 25 MB or smaller.");
  }
  if (Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-") {
    throw new StudioError(415, "Upload a valid PDF file.");
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const existing = state.documents.find((d) => d.sha256 === sha256);
  if (existing) {
    if (allowReuse && existing.typeId === typeId) return existing;
    if (existing.role !== normalizedRole) {
      throw new StudioError(409, "This PDF already exists in the other dataset. Use a genuinely unseen PDF for testing.");
    }
    if (existing.typeId !== typeId) {
      throw new StudioError(409, "This PDF is already assigned to another policy category.");
    }
    return existing;
  }

  let pages;
  try {
    pages = await parsePdf(bytes);
  } catch (err) {
    throw new StudioError(422, err?.message || "Could not extract text or layout from this PDF.");
  }

  const id = randomUUID();
  let localPdfPath = "";
  let storageProvider = "";
  let storagePath = "";

  try {
    await fsp.mkdir(DOCS_DIR, { recursive: true });
    await fsp.mkdir(PAGES_DIR, { recursive: true });
    await fsp.writeFile(path.join(DOCS_DIR, `${id}.pdf`), bytes);
    await fsp.writeFile(path.join(PAGES_DIR, `${id}.json`), JSON.stringify(pages), "utf8");
    localPdfPath = `storage/training-studio/documents/${id}.pdf`;
  } catch {
    // Ephemeral disk; save via CRM storage below
  }

  try {
    const uploaded = await uploadFile(Buffer.from(bytes), "application/pdf", fileName || `${id}.pdf`);
    storageProvider = uploaded.storageProvider || "";
    storagePath = uploaded.storagePath || "";
  } catch {
    if (!localPdfPath) {
      throw new StudioError(500, "Failed to persist PDF file to storage.");
    }
  }

  const safeName = String(fileName || "policy.pdf")
    .split(/[/\\]/)
    .at(-1)
    .slice(0, 200);

  const doc = {
    id,
    name: safeName,
    typeId,
    sha256,
    role: normalizedRole,
    pageCount: pages.length,
    localPdfPath,
    storageProvider,
    storagePath,
    createdAt: new Date().toISOString(),
  };

  state.documents.unshift(doc);
  await saveState(state, { persistSnapshot: true });
  return doc;
}

export async function deleteStudioDocument(id) {
  const state = await loadState();
  const idx = state.documents.findIndex((d) => d.id === id);
  if (idx === -1) throw new StudioError(404, "Document not found.");
  state.documents.splice(idx, 1);
  state.runs = state.runs.filter((r) => r.documentId !== id);
  await saveState(state, { persistSnapshot: true });
  await fsp.unlink(path.join(DOCS_DIR, `${id}.pdf`)).catch(() => {});
  await fsp.unlink(path.join(PAGES_DIR, `${id}.json`)).catch(() => {});
  return { deleted: true, id };
}

export async function previewStudioMapping(body) {
  const state = await loadState();
  const value = selectionSchema.extend({ documentId: z.string() }).parse(body);
  const doc = state.documents.find((d) => d.id === value.documentId);
  if (!doc) throw new StudioError(404, "PDF not found.");
  if (doc.role !== "training") {
    throw new StudioError(409, "Held-out test documents cannot be used for training.");
  }
  const type = state.types.find((t) => t.id === doc.typeId);
  if (!type) throw new StudioError(404, "Policy category not found.");
  const field = (type.fields || []).find((f) => f.id === value.fieldId);
  const pages = await loadDocumentPages(doc);
  const page = pages[value.page - 1];
  if (!field || !page) throw new StudioError(422, "Choose a valid field and PDF page.");
  try {
    return learnMapping(page, value, field, doc.id);
  } catch (err) {
    throw new StudioError(422, err?.message || "Could not learn mapping for selected words.");
  }
}

export async function getStudioProfiles() {
  const state = await loadState();
  return state.profiles;
}

export async function saveStudioProfile(body) {
  const state = await loadState();
  const value = z
    .object({
      typeId: z.string().min(1),
      documentId: z.string().min(1),
      name: z.string().trim().min(1).max(100),
      baseProfileId: z.string().nullable().optional(),
      selections: z.array(selectionSchema).max(100),
      autoSelections: z.array(selectionSchema).max(100).optional(),
      removeFieldIds: z.array(z.string()).max(100).optional(),
    })
    .parse(body);

  const doc = state.documents.find((d) => d.id === value.documentId);
  if (!doc || doc.role !== "training" || doc.typeId !== value.typeId) {
    throw new StudioError(409, "Choose a training PDF inside the selected category.");
  }

  const mappings = {};
  const exampleDocumentIds = new Set([doc.id]);

  if (value.baseProfileId) {
    const base = state.profiles.find((p) => p.id === value.baseProfileId);
    if (!base) throw new StudioError(404, "Base profile not found.");
    if (base.typeId !== value.typeId) throw new StudioError(409, "Profile category does not match.");
    Object.assign(mappings, JSON.parse(JSON.stringify(base.mappings || {})));
    (base.exampleDocumentIds || []).forEach((id) => exampleDocumentIds.add(id));
  }

  for (const rmId of value.removeFieldIds || []) {
    const existing = mappings[rmId];
    if (!existing) continue;
    const remaining = (existing.variants?.length ? existing.variants : [existing]).filter(
      (v) => v.documentId !== doc.id,
    );
    if (remaining.length) {
      mappings[rmId] = { ...remaining[0], fieldLabel: existing.fieldLabel, variants: remaining };
    } else {
      delete mappings[rmId];
    }
  }

  for (const selection of value.selections) {
    const learned = await previewStudioMapping({ ...selection, documentId: doc.id });
    mappings[selection.fieldId] = mergeMapping(mappings[selection.fieldId], learned);
  }

  for (const autoSel of value.autoSelections || []) {
    if (value.selections.some((s) => s.fieldId === autoSel.fieldId)) continue;
    try {
      const learned = await previewStudioMapping({ ...autoSel, documentId: doc.id });
      mappings[autoSel.fieldId] = mergeMapping(mappings[autoSel.fieldId], learned);
    } catch {
      // Optional auto-promotion
    }
  }

  if (!Object.keys(mappings).length) {
    throw new StudioError(422, "Map at least one field in the PDF before saving.");
  }

  const previousVersions = state.profiles.filter((p) => p.typeId === value.typeId && p.name === value.name);
  const maxVersion = previousVersions.reduce((acc, p) => Math.max(acc, Number(p.version || 0)), 0);

  const created = {
    id: randomUUID(),
    typeId: value.typeId,
    name: value.name,
    version: maxVersion + 1,
    mappings,
    exampleDocumentIds: [...exampleDocumentIds],
    createdAt: new Date().toISOString(),
  };

  state.profiles.unshift(created);
  await saveState(state, { persistSnapshot: true });
  return created;
}

export async function autoDetectStudioPreview(body) {
  const state = await loadState();
  const value = z
    .object({
      typeId: z.string().min(1),
      documentId: z.string().min(1),
      baseProfileId: z.string().nullable().optional(),
    })
    .parse(body);

  const doc = state.documents.find((d) => d.id === value.documentId);
  if (!doc) throw new StudioError(404, "PDF not found.");
  const type = state.types.find((t) => t.id === value.typeId);
  if (!type) throw new StudioError(404, "Category not found.");

  let mappings = {};
  const chosen = value.baseProfileId
    ? state.profiles.find((p) => p.id === value.baseProfileId && p.typeId === value.typeId)
    : state.profiles.find((p) => p.typeId === value.typeId);
  if (chosen) mappings = chosen.mappings || {};

  const pages = await loadDocumentPages(doc);
  return extractHybrid(pages, type.fields || [], mappings, {
    fileName: doc.name,
    categoryName: type.name,
  });
}

export async function getStudioRuns() {
  const state = await loadState();
  return state.runs;
}

export async function runStudioExtraction({ profileId, documentId }) {
  const state = await loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) throw new StudioError(404, "Saved profile not found.");
  const doc = state.documents.find((d) => d.id === documentId);
  if (!doc) throw new StudioError(404, "PDF document not found.");
  if (doc.typeId !== profile.typeId) {
    throw new StudioError(409, "Choose a profile and PDF from the same policy category.");
  }
  const type = state.types.find((t) => t.id === profile.typeId);
  if (!type) throw new StudioError(404, "Category not found.");

  const pages = await loadDocumentPages(doc);
  const fields = type.fields || [];
  const { results } = extractHybrid(pages, fields, profile.mappings || {}, {
    fileName: doc.name,
    categoryName: type.name,
  });

  const run = {
    id: randomUUID(),
    documentId: doc.id,
    profileId: profile.id,
    results,
    schema: fields,
    truth: null,
    engine: "native-hybrid-v2",
    createdAt: new Date().toISOString(),
    reviewedAt: null,
  };

  state.runs.unshift(run);
  await saveState(state, { persistSnapshot: true });
  return run;
}

export async function runStudioBatchBenchmark({ profileId }) {
  const state = await loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) throw new StudioError(404, "Saved profile not found.");
  const heldoutDocs = state.documents.filter((d) => d.typeId === profile.typeId && d.role === "heldout");
  if (!heldoutDocs.length) {
    throw new StudioError(404, "No held-out test PDFs found in this category.");
  }
  const runs = [];
  for (const doc of heldoutDocs) {
    runs.push(await runStudioExtraction({ profileId: profile.id, documentId: doc.id }));
  }
  return { profileId: profile.id, runs };
}

export async function reviewStudioRun(runId, body) {
  const state = await loadState();
  const run = state.runs.find((r) => r.id === runId);
  if (!run) throw new StudioError(404, "Extraction run not found.");
  const value = z.object({ truth: z.record(z.string(), z.string().max(1000)) }).parse(body);

  run.truth = value.truth;
  run.reviewedAt = new Date().toISOString();
  await saveState(state, { persistSnapshot: true });
  return run;
}

export async function promoteStudioCorrections(body) {
  const state = await loadState();
  const value = z
    .object({
      runId: z.string().min(1),
      profileName: z.string().trim().min(1).max(100).optional(),
      allowPromoteHeldout: z.boolean().optional(),
    })
    .parse(body);

  const run = state.runs.find((r) => r.id === value.runId);
  if (!run) throw new StudioError(404, "Extraction run not found.");
  if (!run.truth) throw new StudioError(422, "Save ground-truth corrections before promoting a profile.");

  const doc = state.documents.find((d) => d.id === run.documentId);
  const profile = state.profiles.find((p) => p.id === run.profileId);
  if (!doc || !profile) throw new StudioError(404, "Run document or profile no longer exists.");
  if (doc.role === "heldout" && !value.allowPromoteHeldout) {
    throw new StudioError(409, "Confirm promoting a held-out test PDF into training.");
  }
  if (doc.role === "heldout") {
    doc.role = "training";
  }

  const type = state.types.find((t) => t.id === profile.typeId);
  const fields = type?.fields || [];
  const pages = await loadDocumentPages(doc);

  const selections = [];
  for (const field of fields) {
    const expected = (run.truth[field.id] ?? "").trim();
    if (!expected) continue;
    const prev = (run.results || []).find((r) => r.fieldId === field.id);
    if (prev && (prev.value ?? "").trim() === expected) continue;
    const hit = locateValueWordsInPages(pages, expected);
    if (hit) {
      selections.push({
        fieldId: field.id,
        page: hit.page,
        wordIds: hit.wordIds,
        valueOverride: expected,
      });
    }
  }

  if (!selections.length) {
    throw new StudioError(422, "Could not locate corrected text coordinates inside the PDF pages.");
  }

  return saveStudioProfile({
    typeId: profile.typeId,
    documentId: doc.id,
    name: value.profileName || profile.name,
    baseProfileId: profile.id,
    selections,
  });
}

export async function getStudioMetrics() {
  const state = await loadState();
  const docsById = new Map(state.documents.map((d) => [d.id, d]));
  const profilesById = new Map(state.profiles.map((p) => [p.id, p]));
  const typesById = new Map(state.types.map((t) => [t.id, t]));

  const latestByPair = new Map();
  for (const run of state.runs) {
    if (!run.reviewedAt || !run.truth) continue;
    const doc = docsById.get(run.documentId);
    const profile = profilesById.get(run.profileId);
    if (!doc || !profile || doc.role !== "heldout") continue;
    if ((profile.exampleDocumentIds || []).includes(doc.id)) continue;

    const schemaHash = schemaFingerprint(Array.isArray(run.schema) ? run.schema : []);
    const voteKey = `${profile.id}:${doc.sha256}:${schemaHash}`;
    if (!latestByPair.has(voteKey)) {
      latestByPair.set(voteKey, { run, doc, profile, schemaHash });
    }
  }

  const groups = new Map();
  for (const { run, profile, schemaHash } of latestByPair.values()) {
    const key = `${profile.id}:${schemaHash}`;
    const type = typesById.get(profile.typeId);
    const group = groups.get(key) || {
      profileId: profile.id,
      profileName: profile.name,
      version: profile.version,
      typeId: profile.typeId,
      typeName: type?.name || profile.typeId,
      schema: schemaHash,
      documents: 0,
      correct: 0,
      total: 0,
      accuracy: null,
      ready: false,
      fields: {},
    };

    group.documents++;
    for (const result of run.results || []) {
      if (!result.required) continue;
      const expected = String(run.truth?.[result.fieldId] ?? "").trim();
      const actual = String(result.value ?? "").trim();
      const correct = actual === expected;
      const fieldStat = group.fields[result.fieldId] || { label: result.label, correct: 0, total: 0 };
      fieldStat.total++;
      fieldStat.correct += Number(correct);
      group.fields[result.fieldId] = fieldStat;
      group.total++;
      group.correct += Number(correct);
    }

    group.accuracy = group.total ? Math.round((group.correct / group.total) * 10000) / 100 : null;
    group.ready = group.documents >= 1 && group.accuracy !== null && group.accuracy >= 95;
    groups.set(key, group);
  }

  const benchmarks = [...groups.values()];
  return {
    documents: state.documents.length,
    trainingDocuments: state.documents.filter((d) => d.role === "training").length,
    heldoutDocuments: state.documents.filter((d) => d.role === "heldout").length,
    profiles: state.profiles.length,
    runs: state.runs.length,
    reviewed: state.runs.filter((r) => Boolean(r.reviewedAt)).length,
    benchmarks,
    target: 95,
    integrationReady: benchmarks.some((b) => b.ready),
    offlineFallback: false,
  };
}

export async function integrateExtractBuffer({ buffer, fileName = "policy.pdf", typeId = "", profileId = "" }) {
  const state = await loadState();
  let activeProfile = null;
  if (profileId) {
    activeProfile = state.profiles.find((p) => p.id === profileId) || null;
  } else if (typeId) {
    activeProfile = state.profiles.find((p) => p.typeId === typeId) || null;
  }
  if (!activeProfile) return null;

  const type = state.types.find((t) => t.id === activeProfile.typeId);
  if (!type) return null;

  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const pages = await parsePdf(bytes);
  const { results } = extractHybrid(pages, type.fields || [], activeProfile.mappings || {}, {
    fileName,
    categoryName: type.name,
  });

  return {
    policyType: { id: type.id, name: type.name },
    profile: { id: activeProfile.id, name: activeProfile.name, version: activeProfile.version },
    fields: Object.fromEntries(
      results.map((r) => [
        r.fieldId,
        {
          label: r.label,
          value: r.value,
          confidence: r.score,
          status: r.status,
          valid: r.valid,
        },
      ]),
    ),
  };
}

export async function createStudioBackupJson() {
  const state = await loadState();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      types: state.types,
      profiles: state.profiles,
      documents: state.documents,
      runs: state.runs,
    },
    null,
    2,
  );
}

