import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { deleteGoogleDriveFile, uploadGoogleDriveFile } from "@/lib/storage/google-drive-storage";

// Active storage settings
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "google_drive"; // "local" | "s3" | "google_drive"
const LOCAL_STORAGE_DIR = path.join(process.cwd(), "storage", "uploads");
const SIGNING_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-storage-signing-secret");
if (!SIGNING_SECRET) {
  throw new Error("JWT_SECRET is required in production for signed storage URLs.");
}

// Ensure local directory exists in dev mode
if (STORAGE_PROVIDER === "local") {
  fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true }).catch((err) => {
    console.error("Failed to create local storage directory:", err);
  });
}

/**
 * Computes SHA256 checksum of a buffer.
 */
export function calculateHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Uploads a file to the active storage provider.
 * 
 * @param {Buffer} buffer File data
 * @param {string} mimeType File mime type
 * @param {string} filename Original filename
 * @returns {Promise<{ storageProvider: string, storagePath: string, fileSize: number, fileHash: string }>}
 */
export async function uploadFile(buffer, mimeType, filename) {
  const fileHash = calculateHash(buffer);
  const fileSize = buffer.length;
  const ext = path.extname(filename) || ".pdf";
  const uniqueName = `${crypto.randomUUID()}${ext}`;

  if (STORAGE_PROVIDER === "s3") {
    // Standard AWS S3 / Cloudflare R2 Upload stub
    // In a real cloud setup, we would use:
    // const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
    // const s3 = new S3Client({...});
    // await s3.send(new PutObjectCommand({ Bucket, Key, Body: buffer }));
    // For this hardened code, cloud misconfiguration must fail visibly.
    const BUCKET = process.env.STORAGE_BUCKET;
    if (!BUCKET || !process.env.AWS_ACCESS_KEY_ID) {
      throw new Error("S3 storage is missing required credentials. Uploaded PDFs must remain in cloud storage.");
    }
    
    // We could import S3 dynamically if needed. Do not fall back to local storage
    // when cloud storage is requested, because uploaded PDFs must stay in cloud.
    throw new Error("S3 Upload not fully implemented (missing AWS SDK dependencies).");
  }

  if (STORAGE_PROVIDER === "google_drive") {
    return uploadGoogleDriveFile({
      buffer,
      mimeType,
      filename,
      fileHash,
      fileSize
    });
  }

  return uploadLocal(buffer, uniqueName, fileHash, fileSize);
}

async function uploadLocal(buffer, uniqueName, fileHash, fileSize) {
  // Construct date-partitioned path to prevent folder overflow
  const now = new Date();
  const dateSubdir = path.join(
    now.getFullYear().toString(),
    (now.getMonth() + 1).toString().padStart(2, "0")
  );
  
  const targetDir = path.join(LOCAL_STORAGE_DIR, dateSubdir);
  await fs.mkdir(targetDir, { recursive: true });

  const storageRelativePath = path.join(dateSubdir, uniqueName).replace(/\\/g, "/");
  const fullPath = path.join(LOCAL_STORAGE_DIR, storageRelativePath);

  await fs.writeFile(fullPath, buffer);

  return {
    storageProvider: "local",
    storagePath: storageRelativePath,
    fileSize,
    fileHash,
  };
}

/**
 * Generates a signed, temporary download URL.
 * 
 * @param {string} storagePath Storage location path
 * @param {number} expiresInSeconds Expiration duration (default 900s = 15m)
 * @returns {string} Secure URL
 */
export function getSignedUrl(storagePath, expiresInSeconds = 900) {
  if (!storagePath) return "";

  if (STORAGE_PROVIDER === "s3" && process.env.STORAGE_BUCKET) {
    // S3/R2 signed URL logic stub
    return `https://${process.env.STORAGE_BUCKET}.s3.amazonaws.com/${storagePath}?signed=true`;
  }

  // Local signed URL logic with expiration and HMAC signature
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  const hmac = crypto.createHmac("sha256", SIGNING_SECRET);
  hmac.update(`${storagePath}:${expiresAt}`);
  const signature = hmac.digest("hex");

  return `/api/storage/download?path=${encodeURIComponent(storagePath)}&expires=${expiresAt}&signature=${signature}`;
}

/**
 * Verifies if a local download signature is valid.
 */
export function verifyLocalSignature(storagePath, expiresAt, signature) {
  if (!storagePath || !expiresAt || !signature) return false;
  if (Date.now() > Number(expiresAt)) return false;

  const hmac = crypto.createHmac("sha256", SIGNING_SECRET);
  hmac.update(`${storagePath}:${expiresAt}`);
  const expectedSignature = hmac.digest("hex");

  return signature === expectedSignature;
}

/**
 * Resolves a local storage path safely, preventing directory traversal.
 */
export function getLocalPhysicalPath(storagePath) {
  const resolvedPath = path.resolve(LOCAL_STORAGE_DIR, storagePath);
  
  // Enforce boundary check to prevent path traversal attack (e.g. storagePath = "../../../etc/passwd")
  if (!resolvedPath.startsWith(LOCAL_STORAGE_DIR)) {
    throw new Error("Access Denied: Path Traversal Attempted");
  }

  return resolvedPath;
}

/**
 * Deletes a file from the active storage provider.
 * 
 * @param {string} storagePath Storage location path
 * @returns {Promise<void>}
 */
export async function deleteFile(storagePath) {
  if (!storagePath) return;

  if (STORAGE_PROVIDER === "s3") {
    // S3 Delete stub
    return;
  }

  if (STORAGE_PROVIDER === "google_drive") {
    try {
      await deleteGoogleDriveFile(storagePath);
    } catch (err) {
      console.error(`Failed to delete Google Drive file ${storagePath}:`, err);
    }
    return;
  }

  try {
    const fullPath = getLocalPhysicalPath(storagePath);
    await fs.unlink(fullPath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`Failed to delete local file ${storagePath}:`, err);
    }
  }
}
