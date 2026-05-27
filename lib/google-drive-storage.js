const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function getDriveConfig() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const missing = [];
  if (!clientId) missing.push("GOOGLE_DRIVE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_DRIVE_CLIENT_SECRET");
  if (!refreshToken) missing.push("GOOGLE_DRIVE_REFRESH_TOKEN");
  if (!folderId) missing.push("GOOGLE_DRIVE_FOLDER_ID");

  if (missing.length) {
    throw new Error(`Google Drive storage is missing env variables: ${missing.join(", ")}`);
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    folderId,
    makePublic: String(process.env.GOOGLE_DRIVE_MAKE_PUBLIC || "false").toLowerCase() === "true"
  };
}

async function getAccessToken() {
  const config = getDriveConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new globalThis.URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token"
    })
  });

  const tokenData = await response.json().catch(() => ({}));
  if (!response.ok || !tokenData.access_token) {
    throw new Error(`Google Drive token refresh failed: ${tokenData.error_description || tokenData.error || response.statusText}`);
  }

  return tokenData.access_token;
}

export async function uploadGoogleDriveFile({ buffer, mimeType, filename, fileHash, fileSize }) {
  const config = getDriveConfig();
  const accessToken = await getAccessToken();
  const boundary = `bimaheadquarter_${cryptoRandomBoundary()}`;
  const metadata = {
    name: filename || "Untitled.pdf",
    mimeType: mimeType || "application/pdf",
    parents: [config.folderId]
  };

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType || "application/pdf"}\r\n\r\n`),
    Buffer.from(buffer),
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const fields = "id,name,mimeType,size,webViewLink,webContentLink,parents";
  const uploadResponse = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=${encodeURIComponent(fields)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length)
    },
    body
  });

  const driveFile = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok || !driveFile.id) {
    throw new Error(`Google Drive upload failed: ${driveFile.error?.message || uploadResponse.statusText}`);
  }

  if (config.makePublic) {
    await makeDriveFilePublic(driveFile.id, accessToken);
  }

  const hydratedFile = await getDriveFileMetadata(driveFile.id, accessToken).catch(() => driveFile);
  const driveFileId = hydratedFile.id || driveFile.id;

  return {
    storageProvider: "google_drive",
    storagePath: driveFileId,
    fileSize,
    fileHash,
    storageMetadata: {
      driveFileId,
      webViewLink: hydratedFile.webViewLink || driveFile.webViewLink || "",
      webContentLink: hydratedFile.webContentLink || driveFile.webContentLink || "",
      folderId: config.folderId,
      originalFilename: filename || "Untitled.pdf",
      mimeType: mimeType || "application/pdf"
    }
  };
}

export async function downloadGoogleDriveFile(fileId) {
  if (!fileId) throw new Error("Google Drive file id is required.");

  const accessToken = await getAccessToken();
  const response = await fetch(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google Drive download failed: ${text || response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function deleteGoogleDriveFile(fileId) {
  if (!fileId) return;

  const accessToken = await getAccessToken();
  const response = await fetch(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google Drive delete failed: ${text || response.statusText}`);
  }
}

async function getDriveFileMetadata(fileId, accessToken) {
  const fields = "id,name,mimeType,size,webViewLink,webContentLink,parents";
  const response = await fetch(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Google Drive metadata fetch failed: ${data.error?.message || response.statusText}`);
  }
  return data;
}

async function makeDriveFilePublic(fileId, accessToken) {
  const response = await fetch(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ role: "reader", type: "anyone" })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Google Drive permission update failed: ${data.error?.message || response.statusText}`);
  }
}

function cryptoRandomBoundary() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
