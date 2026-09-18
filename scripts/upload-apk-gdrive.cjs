require("dotenv").config();
const fs = require("fs");
const path = require("path");

async function uploadApk() {
  console.log("=== BimaHeadquarter APK Google Drive Uploader ===");

  // 1. Locate APK
  const apkPath = path.join(__dirname, "..", "public", "downloads", "bimaheadquarter.apk");
  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK not found at ${apkPath}`);
  }

  const fileStats = fs.statSync(apkPath);
  const fileSize = fileStats.size;
  console.log(`Found APK: ${apkPath}`);
  console.log(`File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB (${fileSize} bytes)`);

  // 2. Validate env
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google Drive OAuth credentials in environment variables.");
  }

  // 3. Obtain Access Token
  console.log("\n1. Requesting Google OAuth2 access token...");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(`Failed to refresh Google token: ${JSON.stringify(tokenData)}`);
  }
  const accessToken = tokenData.access_token;
  console.log("-> Access token acquired successfully.");

  // 4. Initiate Resumable Upload Session
  console.log("\n2. Initializing resumable upload session on Google Drive...");
  const metadata = {
    name: "BimaHeadquarter_v1.0.1.apk",
    mimeType: "application/vnd.android.package-archive",
    description: "BimaHeadquarter Android Release APK (v1.0.1)",
  };
  if (folderId) {
    metadata.parents = [folderId];
    console.log(`-> Target Google Drive Folder ID: ${folderId}`);
  }

  const initRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "application/vnd.android.package-archive",
      "X-Upload-Content-Length": String(fileSize),
    },
    body: JSON.stringify(metadata),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Resumable session initialization failed (${initRes.status}): ${errText}`);
  }

  const sessionUri = initRes.headers.get("location");
  if (!sessionUri) {
    throw new Error("Google Drive did not return a resumable session Location header.");
  }
  console.log("-> Resumable session created.");

  // 5. Upload file buffer
  console.log("\n3. Uploading APK binary data to Google Drive (please wait)...");
  const fileBuffer = fs.readFileSync(apkPath);
  const uploadRes = await fetch(sessionUri, {
    method: "PUT",
    headers: {
      "Content-Length": String(fileSize),
      "Content-Type": "application/vnd.android.package-archive",
    },
    body: fileBuffer,
  });

  const uploadResult = await uploadRes.json();
  if (!uploadRes.ok || !uploadResult.id) {
    throw new Error(`Upload failed (${uploadRes.status}): ${JSON.stringify(uploadResult)}`);
  }

  const fileId = uploadResult.id;
  console.log(`-> APK uploaded successfully! Google Drive File ID: ${fileId}`);

  // 6. Make file publicly downloadable
  console.log("\n4. Configuring public read permissions for anyone with the link...");
  const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
      allowFileDiscovery: false,
    }),
  });

  if (!permRes.ok) {
    const permErr = await permRes.text();
    console.warn("Warning: Could not set public permissions automatically:", permErr);
  } else {
    console.log("-> File permissions set to public (anyone with the link can view/download).");
  }

  // 7. Get File Metadata with Links
  console.log("\n5. Fetching generated share and download links...");
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,webViewLink,webContentLink`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const meta = await metaRes.json();

  const directDownloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const webViewLink = meta.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  const webContentLink = meta.webContentLink || directDownloadLink;

  console.log("\n========================================================");
  console.log(" SUCCESS! APK UPLOADED TO GOOGLE DRIVE");
  console.log("========================================================");
  console.log(`File Name             : ${meta.name}`);
  console.log(`File ID               : ${fileId}`);
  console.log(`File Size             : ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Direct Download Link  : ${directDownloadLink}`);
  console.log(`Google Drive View Link: ${webViewLink}`);
  console.log(`Web Content Link      : ${webContentLink}`);
  console.log("========================================================\n");

  return {
    fileId,
    name: meta.name,
    directDownloadLink,
    webViewLink,
    webContentLink,
    fileSizeMb: (fileSize / (1024 * 1024)).toFixed(2),
  };
}

uploadApk().catch((err) => {
  console.error("\nFATAL ERROR during APK upload:", err.message);
  process.exit(1);
});
