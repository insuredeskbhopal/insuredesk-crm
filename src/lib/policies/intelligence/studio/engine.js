import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
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
import locations from "@/lib/policies/pdf/utils/locations.cjs";
const { lookupRtoLocation } = locations || {};

const BASE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "bhq-training-studio")
  : path.join(process.cwd(), "storage", "training-studio");
const STUDIO_DIR = BASE_DIR;
const STATE_FILE = path.join(process.cwd(), "storage", "training-studio", "studio-state.json");
const PAGES_DIR = path.join(BASE_DIR, "pages");
const DOCS_DIR = path.join(BASE_DIR, "documents");

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
  page: z.coerce.number().int().min(1).default(1),
  wordIds: z.array(z.coerce.number().int().min(0)).max(2000).default([]),
  anchor: z.string().max(500).nullable().optional(),
  semanticHint: z.string().max(500).nullable().optional(),
  multiline: z.boolean().nullable().optional(),
  valueOverride: z.string().max(2000).nullable().optional(),
});

const STATE_MEM = globalThis.__bhqStudioStateCache || { state: null, mtimeMs: 0 };
globalThis.__bhqStudioStateCache = STATE_MEM;

function stripNullBytes(obj) {
  if (typeof obj === "string") {
    return obj.replace(/\u0000/g, "");
  }
  if (Array.isArray(obj)) {
    return obj.map(stripNullBytes);
  }
  if (obj !== null && typeof obj === "object") {
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      clean[key] = stripNullBytes(val);
    }
    return clean;
  }
  return obj;
}

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

async function loadState({ fresh = false } = {}) {
  const now = Date.now();
  if (!fresh && STATE_MEM.state && (now - (STATE_MEM.fetchedAt || 0) < 2000)) {
    return STATE_MEM.state;
  }

  let dbState = null;
  try {
    const snap = await prisma.auditLog.findFirst({
      where: { entityType: "TrainingStudio", entityId: "studio-v1", action: "TRAINING_STUDIO_STATE" },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
    if (snap?.metadata && typeof snap.metadata === "object") {
      dbState = snap.metadata;
    }
  } catch (err) {
    console.warn("[TrainingStudio] loadState DB query failed:", err?.message);
  }

  let diskState = null;
  try {
    const raw = await fsp.readFile(STATE_FILE, "utf8");
    diskState = JSON.parse(raw);
  } catch {
    // static file might not be readable in all envs
  }

  const base = diskState && Array.isArray(diskState.types) ? diskState : defaultSeedState();

  if (dbState && Array.isArray(dbState.types) && dbState.types.length) {
    const mergedTypes = Array.isArray(dbState.types) && dbState.types.length ? dbState.types : base.types;
    const mergedProfiles = Array.isArray(dbState.profiles) && dbState.profiles.length ? dbState.profiles : base.profiles;
    const mergedDocuments = Array.isArray(dbState.documents) ? dbState.documents : (base.documents || []);
    const mergedRuns = Array.isArray(dbState.runs) ? dbState.runs : (base.runs || []);

    STATE_MEM.state = {
      types: mergedTypes,
      profiles: mergedProfiles,
      documents: mergedDocuments,
      runs: mergedRuns,
      updatedAt: dbState.updatedAt || new Date().toISOString(),
    };
    return STATE_MEM.state;
  }

  STATE_MEM.state = base;
  return STATE_MEM.state;
}

async function saveState(state, { persistSnapshot = true } = {}) {
  state.updatedAt = new Date().toISOString();
  STATE_MEM.state = state;
  STATE_MEM.fetchedAt = Date.now();

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
      const sanitizedMetadata = stripNullBytes({
        types: state.types,
        profiles: state.profiles,
        documents: state.documents,
        runs: state.runs.slice(0, 100),
        updatedAt: state.updatedAt,
      });

      await prisma.auditLog.create({
        data: {
          action: "TRAINING_STUDIO_STATE",
          entityType: "TrainingStudio",
          entityId: "studio-v1",
          severity: "INFO",
          source: "SYSTEM",
          metadata: sanitizedMetadata,
        },
      });
    } catch (err) {
      console.error("[TrainingStudio] Snapshot creation failed:", err?.message);
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
  if (!buffer) {
    throw new StudioError(404, "Original PDF binary is not available on server or database.");
  }
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
    doc.localPdfPath,
    path.join(DOCS_DIR, `${doc.id}.pdf`),
    path.join(process.cwd(), "storage", "training-studio", "documents", `${doc.id}.pdf`),
    path.join(process.cwd(), "policy-intelligence-module", "data", "documents", `${doc.id}.pdf`),
  ].filter(Boolean);

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        return await fsp.readFile(filePath);
      }
    } catch {}
  }

  // 1. Fetch from PostgreSQL UploadedFile by uploadedFileId OR doc.id
  const targetId = doc.uploadedFileId || doc.id;
  if (targetId) {
    try {
      const rec = await prisma.uploadedFile.findUnique({
        where: { id: targetId },
        select: { pdfBytes: true, storagePath: true, storageProvider: true },
      });
      if (rec?.pdfBytes) return Buffer.from(rec.pdfBytes);
      if (rec?.storageProvider === "google_drive" && rec?.storagePath) {
        return await downloadGoogleDriveFile(rec.storagePath);
      }
      if (rec?.storagePath) {
        const physical = getLocalPhysicalPath(rec.storagePath);
        if (fs.existsSync(physical)) return await fsp.readFile(physical);
      }
    } catch (err) {
      console.warn("[TrainingStudio] DB buffer retrieval failed:", err?.message);
    }
  }

  // Fallback: check if an UploadedFile exists with matching file name
  if (doc.name) {
    try {
      const rec = await prisma.uploadedFile.findFirst({
        where: { sourceFile: doc.name, pdfBytes: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { pdfBytes: true },
      });
      if (rec?.pdfBytes) return Buffer.from(rec.pdfBytes);
    } catch {}
  }

  if (doc.storageProvider === "google_drive" && doc.storagePath) {
    return downloadGoogleDriveFile(doc.storagePath);
  }
  if (doc.storagePath) {
    const physical = getLocalPhysicalPath(doc.storagePath);
    if (fs.existsSync(physical)) {
      return fsp.readFile(physical);
    }
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
  try {
    const dbFiles = await prisma.uploadedFile.findMany({
      where: { extractionMethod: "training-studio", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, sourceFile: true, createdAt: true, status: true, storagePath: true, storageProvider: true },
    });
    if (dbFiles?.length) {
      const knownIds = new Set(state.documents.map((d) => d.uploadedFileId || d.id));
      for (const file of dbFiles) {
        if (!knownIds.has(file.id)) {
          state.documents.push({
            id: file.id,
            name: file.sourceFile,
            typeId: state.types[0]?.id || "motor-insurance",
            sha256: "",
            role: "training",
            pageCount: 1,
            localPdfPath: "",
            storageProvider: file.storageProvider || "",
            storagePath: file.storagePath || "",
            uploadedFileId: file.id,
            createdAt: file.createdAt?.toISOString?.() || new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.warn("[TrainingStudio] getStudioDocuments db enrichment skipped:", err?.message);
  }
  return state.documents;
}

export async function findOrResolveStudioDocument(state, id, typeId = null) {
  if (!id) return null;
  let doc = state.documents.find((d) => d.id === id || d.uploadedFileId === id);
  if (!doc) {
    try {
      const rec = await prisma.uploadedFile.findUnique({
        where: { id },
        select: { id: true, sourceFile: true, pdfBytes: true, storagePath: true, storageProvider: true, createdAt: true },
      });
      if (rec) {
        doc = {
          id: rec.id,
          name: rec.sourceFile || "policy.pdf",
          typeId: typeId || state.types[0]?.id || "motor-insurance",
          sha256: "",
          role: "training",
          pageCount: 1,
          localPdfPath: "",
          storageProvider: rec.storageProvider || "",
          storagePath: rec.storagePath || "",
          uploadedFileId: rec.id,
          createdAt: rec.createdAt?.toISOString?.() || new Date().toISOString(),
        };
        state.documents.unshift(doc);
      }
    } catch (err) {
      console.warn("[TrainingStudio] findOrResolveStudioDocument DB fallback failed:", err?.message);
    }
  }
  if (doc) {
    if (typeId && (!doc.typeId || doc.typeId !== typeId)) {
      doc.typeId = typeId;
    }
    if (!doc.role) {
      doc.role = "training";
    }
  }
  return doc;
}

export async function getStudioDocument(id) {
  const state = await loadState();
  const doc = await findOrResolveStudioDocument(state, id);
  if (!doc) throw new StudioError(404, "PDF document not found.");
  const pages = await loadDocumentPages(doc);
  return { ...doc, pages };
}

export async function getStudioDocumentFile(id) {
  const state = await loadState();
  const doc = await findOrResolveStudioDocument(state, id);
  if (!doc) throw new StudioError(404, "PDF document not found.");
  const bytes = await getDocumentBuffer(doc);
  if (!bytes) throw new StudioError(404, "Original PDF binary is not available.");
  return { name: doc.name, bytes };
}

export async function uploadStudioDocumentBuffer({
  buffer,
  fileName,
  typeId,
  role = "training",
  allowReuse = false,
  uploadedFileId = null,
}) {
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
  let dbUploadedFileId = uploadedFileId;

  try {
    await fsp.mkdir(DOCS_DIR, { recursive: true });
    await fsp.mkdir(PAGES_DIR, { recursive: true });
    await fsp.writeFile(path.join(DOCS_DIR, `${id}.pdf`), bytes);
    await fsp.writeFile(path.join(PAGES_DIR, `${id}.json`), JSON.stringify(pages), "utf8");
    localPdfPath = path.join(DOCS_DIR, `${id}.pdf`);
  } catch {
    // Ephemeral disk; save via CRM storage or DB below
  }

  const safeName = String(fileName || "policy.pdf")
    .split(/[/\\]/)
    .at(-1)
    .slice(0, 200);

  // Guarantee persistence in serverless environments by saving to PostgreSQL UploadedFile
  if (!dbUploadedFileId) {
    try {
      const uploadRecord = await prisma.uploadedFile.create({
        data: {
          sourceFile: safeName,
          mimeType: "application/pdf",
          sizeBytes: bytes.byteLength,
          pdfBytes: Buffer.from(bytes),
          status: "EXTRACTED",
          extractionMethod: "training-studio",
        },
        select: { id: true },
      });
      dbUploadedFileId = uploadRecord.id;
    } catch (dbErr) {
      console.warn("[TrainingStudio] UploadedFile create skipped:", dbErr?.message);
    }
  }

  try {
    const uploaded = await uploadFile(Buffer.from(bytes), "application/pdf", safeName);
    storageProvider = uploaded.storageProvider || "";
    storagePath = uploaded.storagePath || "";
  } catch {
    // Non-fatal if DB or local disk has the binary
  }

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
    uploadedFileId: dbUploadedFileId,
    createdAt: new Date().toISOString(),
  };

  state.documents.unshift(doc);
  await saveState(state, { persistSnapshot: true });
  return { ...doc, pages };
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

function calculateDurationSafe(startStr, expiryStr) {
  if (!startStr || !expiryStr) return "";
  const parse = (s) => {
    const m = String(s).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (m) return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    const iso = Date.parse(s);
    return isNaN(iso) ? null : new Date(iso);
  };
  const d1 = parse(startStr);
  const d2 = parse(expiryStr);
  if (!d1 || !d2 || d2 < d1) return "";
  const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  const years = Math.round(diffDays / 365);
  if (years >= 1 && Math.abs(diffDays - years * 365) <= 5) {
    return years === 1 ? "1 Year" : `${years} Years`;
  }
  const months = Math.round(diffDays / 30);
  if (months < 12 && months > 0) {
    return months === 1 ? "1 Month" : `${months} Months`;
  }
  return `${years || 1} Year`;
}

export function splitEngineAndChassis(rawText, _activeFieldId = "engineNumber", anchorText = "") {
  if (!rawText || typeof rawText !== "string") return { isSplit: false };
  const cleaned = rawText.trim();
  const parts = cleaned
    .replace(/(?:\b(?:chassis|chasis|engine|eng|chas|vin)\b[\s.:#]*|\b(?:no|nos|number|#)\b[\s.:]*)/gi, " ")
    .split(/[\s/\\|&,\n\r\t]+/)
    .map((p) => p.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
    .filter((p) => p.length >= 5 && p.length <= 25);

  if (parts.length < 2) return { isSplit: false };
  const [partA, partB] = parts;

  const isVinA = partA.length === 17;
  const isVinB = partB.length === 17;

  let chassis = "";
  let engine = "";

  if (isVinA && !isVinB) {
    chassis = partA;
    engine = partB;
  } else if (!isVinA && isVinB) {
    chassis = partB;
    engine = partA;
  } else if (partA.length > partB.length + 3) {
    chassis = partA;
    engine = partB;
  } else if (partB.length > partA.length + 3) {
    chassis = partB;
    engine = partA;
  } else {
    const context = `${anchorText || ""} ${rawText}`.toLowerCase();
    const engIdx = context.search(/\b(eng|engine)\b/);
    const chasIdx = context.search(/\b(chas|chassis|vin)\b/);
    if (engIdx !== -1 && chasIdx !== -1 && engIdx < chasIdx) {
      engine = partA;
      chassis = partB;
    } else {
      chassis = partA;
      engine = partB;
    }
  }

  return { isSplit: true, chassisNumber: chassis, engineNumber: engine };
}

export function autoScanPolicyPages(pages, fields) {
  const discovered = {};
  if (!pages?.length || !fields?.length) return discovered;

  const aliasMap = [];
  for (const field of fields) {
    const list = [field.label, ...(field.aliases || [])];
    for (const a of list) {
      const norm = a.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (norm.length >= 3) {
        aliasMap.push({ norm, fieldId: field.id, label: a, rawLabel: field.label, kind: field.kind });
      }
    }
  }
  aliasMap.sort((a, b) => b.norm.length - a.norm.length);

  for (const page of pages) {
    const segments = page.segments || [];
    const lines = page.lines || [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const segText = seg.text.trim();
      const segNorm = segText.toLowerCase().replace(/[^a-z0-9]/g, "");

      for (const item of aliasMap) {
        if (discovered[item.fieldId]?.value) continue;

        const isMatch =
          segNorm === item.norm ||
          segNorm.startsWith(item.norm) ||
          (item.norm.length >= 6 && segNorm.includes(item.norm));
        if (isMatch) {
          const colonIdx = segText.indexOf(":");
          if (colonIdx !== -1) {
            let after = segText.slice(colonIdx + 1).trim();
            if (after.length >= 2 && !/^(?:na|n\/a|nil|-)$/i.test(after)) {
              if (item.kind === "currency") {
                const num = after.match(/\b\d+(?:,\d+)*(?:\.\d{2})?\b/);
                if (num) after = num[0].replace(/,/g, "");
              }
              const segWords = seg.wordIds.map((id) => page.words[id]).filter(Boolean);
              const valWords = segWords.filter((w) => after.includes(w.text));
              discovered[item.fieldId] = {
                fieldId: item.fieldId,
                value: after,
                page: page.number,
                wordIds: valWords.length ? valWords.map((w) => w.id) : seg.wordIds,
                anchor: segText.slice(0, colonIdx).trim(),
                score: 0.95,
                status: "confident",
                valid: true,
              };
              break;
            }
          }

          if (i + 1 < segments.length) {
            const nextSeg = segments[i + 1];
            if (nextSeg.line === seg.line) {
              let nextVal = nextSeg.text.trim().replace(/^[:\-\s]+/, "").trim();
              const nextNorm = nextVal.toLowerCase().replace(/[^a-z0-9]/g, "");
              const isNextAField = aliasMap.some(
                (am) => am.norm === nextNorm || (am.norm.length >= 6 && nextNorm.startsWith(am.norm)),
              );
              if (!isNextAField && nextVal.length >= 1 && !/^(?:na|n\/a|nil|-)$/i.test(nextVal)) {
                if (item.kind === "currency") {
                  const num = nextVal.match(/\b\d+(?:,\d+)*(?:\.\d{2})?\b/);
                  if (num) nextVal = num[0].replace(/,/g, "");
                }
                discovered[item.fieldId] = {
                  fieldId: item.fieldId,
                  value: nextVal,
                  page: page.number,
                  wordIds: nextSeg.wordIds,
                  anchor: segText,
                  score: 0.94,
                  status: "confident",
                  valid: true,
                };
                break;
              }
            }
          }
        }
      }
    }

    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx];
      const lineText = line.text.trim();
      const lineLower = lineText.toLowerCase();

      for (const item of aliasMap) {
        if (discovered[item.fieldId]?.value) continue;

        const pos = lineLower.indexOf(item.label.toLowerCase());
        if (pos !== -1) {
          let after = lineText.slice(pos + item.label.length).replace(/^[:\-\s]+/, "").trim();
          if (after.length >= 2 && !/^(?:na|n\/a|nil|-)$/i.test(after)) {
            const nextColon = after.indexOf(":");
            if (nextColon !== -1) {
              const beforeNext = after.slice(0, nextColon).trim();
              const wordsBefore = beforeNext.split(/\s+/);
              if (wordsBefore.length > 1) {
                after = wordsBefore.slice(0, -1).join(" ").trim();
              }
            }
            if (item.kind === "currency") {
              const num = after.match(/\b\d+(?:,\d+)*(?:\.\d{2})?\b/);
              if (num) after = num[0].replace(/,/g, "");
            }
            const lineWords = page.words.filter((w) => w.line === lIdx);
            const valWords = lineWords.filter((w) => after.includes(w.text));
            discovered[item.fieldId] = {
              fieldId: item.fieldId,
              value: after,
              page: page.number,
              wordIds: valWords.length ? valWords.map((w) => w.id) : lineWords.map((w) => w.id),
              anchor: item.label,
              score: 0.92,
              status: "confident",
              valid: true,
            };
            break;
          }
        }
      }
    }
  }

  const cVal = discovered.chassisNumber?.value || discovered.engineNumber?.value;
  if (cVal) {
    const split = splitEngineAndChassis(cVal, "chassisNumber");
    if (split.isSplit) {
      if (!discovered.chassisNumber || !discovered.chassisNumber.valid) {
        discovered.chassisNumber = {
          fieldId: "chassisNumber",
          value: split.chassisNumber,
          page: discovered.engineNumber?.page || 1,
          wordIds: discovered.engineNumber?.wordIds || [],
          score: 0.98,
          status: "confident",
          valid: true,
        };
      } else {
        discovered.chassisNumber.value = split.chassisNumber;
      }
      if (!discovered.engineNumber || !discovered.engineNumber.valid) {
        discovered.engineNumber = {
          fieldId: "engineNumber",
          value: split.engineNumber,
          page: discovered.chassisNumber?.page || 1,
          wordIds: discovered.chassisNumber?.wordIds || [],
          score: 0.98,
          status: "confident",
          valid: true,
        };
      } else {
        discovered.engineNumber.value = split.engineNumber;
      }
    }
  }

  return discovered;
}

export async function previewStudioMapping(body) {
  const state = await loadState();
  const value = selectionSchema.extend({ documentId: z.string() }).parse(body);
  const doc = await findOrResolveStudioDocument(state, value.documentId);
  if (!doc) throw new StudioError(404, "PDF not found.");
  if (doc.role !== "training") {
    doc.role = "training";
  }
  const type = state.types.find((t) => t.id === doc.typeId) || state.types[0];
  if (!type) throw new StudioError(404, "Policy category not found.");
  const field = (type.fields || []).find((f) => f.id === value.fieldId);
  const pages = await loadDocumentPages(doc);
  const page = pages[value.page - 1] || pages[0];
  if (!field || !page) throw new StudioError(422, "Choose a valid field and PDF page.");
  try {
    const result = learnMapping(page, value, field, doc.id);
    if ((field.id === "registrationNumber" || field.id === "vehicleNumber") && result?.example) {
      result.example = String(result.example).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (typeof lookupRtoLocation === "function") {
        result.rtoLocation = lookupRtoLocation(result.example) || "";
      }
    }
    if ((field.id === "engineNumber" || field.id === "chassisNumber") && result?.example) {
      const split = splitEngineAndChassis(result.example, field.id, result.anchor || "");
      if (split.isSplit) {
        result.example = field.id === "chassisNumber" ? split.chassisNumber : split.engineNumber;
        result.companion = {
          fieldId: field.id === "chassisNumber" ? "engineNumber" : "chassisNumber",
          value: field.id === "chassisNumber" ? split.engineNumber : split.chassisNumber,
        };
      }
    }
    return result;
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

  const doc = await findOrResolveStudioDocument(state, value.documentId, value.typeId);
  if (!doc) {
    throw new StudioError(404, "PDF document not found.");
  }
  doc.role = "training";
  doc.typeId = value.typeId;

  const type = state.types.find((t) => t.id === value.typeId) || state.types[0];
  if (!type) throw new StudioError(404, "Policy category not found.");

  const mappings = {};
  const exampleDocumentIds = new Set([doc.id]);

  if (value.baseProfileId) {
    const base = state.profiles.find((p) => p.id === value.baseProfileId);
    if (base && base.typeId === value.typeId) {
      Object.assign(mappings, JSON.parse(JSON.stringify(base.mappings || {})));
      (base.exampleDocumentIds || []).forEach((id) => exampleDocumentIds.add(id));
    }
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
    if (!selection.wordIds?.length && selection.valueOverride) {
      mappings[selection.fieldId] = {
        anchor: selection.anchor || selection.fieldId,
        relation: "same-line",
        example: selection.valueOverride,
        valueOverride: selection.valueOverride,
        fieldLabel: (type.fields || []).find((f) => f.id === selection.fieldId)?.label || selection.fieldId,
      };
      continue;
    }

    try {
      const learned = await previewStudioMapping({ ...selection, documentId: doc.id });
      if (selection.valueOverride) {
        learned.valueOverride = selection.valueOverride;
        learned.example = selection.valueOverride;
      }
      mappings[selection.fieldId] = mergeMapping(mappings[selection.fieldId], learned);
    } catch (learnErr) {
      console.warn(`[TrainingStudio] Mapping fallback for ${selection.fieldId}:`, learnErr?.message);
      const fallbackVal = selection.valueOverride || "";
      mappings[selection.fieldId] = {
        anchor: selection.anchor || selection.fieldId,
        relation: "same-line",
        example: fallbackVal,
        valueOverride: fallbackVal,
        fieldLabel: (type.fields || []).find((f) => f.id === selection.fieldId)?.label || selection.fieldId,
      };
    }
  }

  for (const autoSel of value.autoSelections || []) {
    if (value.selections.some((s) => s.fieldId === autoSel.fieldId)) continue;
    try {
      const learned = await previewStudioMapping({ ...autoSel, documentId: doc.id });
      if (autoSel.valueOverride) {
        learned.valueOverride = autoSel.valueOverride;
        learned.example = autoSel.valueOverride;
      }
      mappings[autoSel.fieldId] = mergeMapping(mappings[autoSel.fieldId], learned);
    } catch {
      if (autoSel.valueOverride) {
        mappings[autoSel.fieldId] = {
          anchor: autoSel.anchor || autoSel.fieldId,
          relation: "same-line",
          example: autoSel.valueOverride,
          valueOverride: autoSel.valueOverride,
          fieldLabel: (type.fields || []).find((f) => f.id === autoSel.fieldId)?.label || autoSel.fieldId,
        };
      }
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

  const doc = await findOrResolveStudioDocument(state, value.documentId, value.typeId);
  if (!doc) throw new StudioError(404, "PDF not found.");
  const type = state.types.find((t) => t.id === value.typeId) || state.types[0];
  if (!type) throw new StudioError(404, "Category not found.");

  let mappings = {};
  const chosen = value.baseProfileId
    ? state.profiles.find((p) => p.id === value.baseProfileId && p.typeId === value.typeId)
    : state.profiles.find((p) => p.typeId === value.typeId);
  if (chosen) mappings = chosen.mappings || {};

  const pages = await loadDocumentPages(doc);
  const hybrid = extractHybrid(pages, type.fields || [], mappings, {
    fileName: doc.name,
    categoryName: type.name,
  });

  const autoScanned = autoScanPolicyPages(pages, type.fields || []);
  if (Array.isArray(hybrid?.results)) {
    for (const r of hybrid.results) {
      if ((!r.value || !r.valid || r.status === "missing") && autoScanned[r.fieldId]) {
        const found = autoScanned[r.fieldId];
        r.value = found.value;
        r.valid = true;
        r.status = "confident";
        r.score = found.score || 0.94;
        r.page = found.page || 1;
        r.wordIds = found.wordIds || [];
        r.anchor = found.anchor || "";
      }
    }
    let regVal = "";
    let startVal = "";
    let expiryVal = "";
    let rtoResult = null;
    let durationResult = null;

    for (const r of hybrid.results) {
      if ((r.fieldId === "registrationNumber" || r.fieldId === "vehicleNumber") && r.value) {
        r.value = String(r.value).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (!regVal) regVal = r.value;
      }
      if (r.fieldId === "startDate" && r.value) startVal = r.value;
      if (r.fieldId === "expiryDate" && r.value) expiryVal = r.value;
      if (r.fieldId === "rtoLocation") rtoResult = r;
      if (r.fieldId === "duration") durationResult = r;
    }

    if (regVal && rtoResult && (!rtoResult.value || !rtoResult.valid)) {
      const loc = typeof lookupRtoLocation === "function" ? lookupRtoLocation(regVal) : "";
      if (loc) {
        rtoResult.value = loc;
        rtoResult.valid = true;
        rtoResult.status = "confident";
        rtoResult.score = 0.98;
      }
    }

    if (startVal && expiryVal && durationResult && (!durationResult.value || !durationResult.valid)) {
      const calcDur = calculateDurationSafe(startVal, expiryVal);
      if (calcDur) {
        durationResult.value = calcDur;
        durationResult.valid = true;
        durationResult.status = "confident";
        durationResult.score = 0.98;
      }
    }

    const chasRes = hybrid.results.find((r) => r.fieldId === "chassisNumber");
    const engRes = hybrid.results.find((r) => r.fieldId === "engineNumber");
    const combinedVal = chasRes?.value || engRes?.value || "";
    const splitDual = splitEngineAndChassis(combinedVal, "chassisNumber");
    if (splitDual.isSplit) {
      if (chasRes) {
        chasRes.value = splitDual.chassisNumber;
        chasRes.valid = true;
        chasRes.status = "confident";
        chasRes.score = 0.98;
      }
      if (engRes) {
        engRes.value = splitDual.engineNumber;
        engRes.valid = true;
        engRes.status = "confident";
        engRes.score = 0.98;
        if (!engRes.wordIds?.length && chasRes?.wordIds?.length) {
          engRes.wordIds = [...chasRes.wordIds];
          engRes.page = chasRes.page;
        }
      }
    }
  }

  return hybrid;
}

export async function getStudioRuns() {
  const state = await loadState();
  return state.runs;
}

export async function runStudioExtraction({ profileId, documentId }) {
  const state = await loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) throw new StudioError(404, "Saved profile not found.");
  const doc = await findOrResolveStudioDocument(state, documentId, profile.typeId);
  if (!doc) throw new StudioError(404, "PDF document not found.");
  if (doc.typeId !== profile.typeId) {
    doc.typeId = profile.typeId;
  }
  const type = state.types.find((t) => t.id === profile.typeId) || state.types[0];
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

  const profile = state.profiles.find((p) => p.id === run.profileId);
  const doc = await findOrResolveStudioDocument(state, run.documentId, profile?.typeId);
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

