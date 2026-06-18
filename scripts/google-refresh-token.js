const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

loadEnvFile(".env.local");
loadEnvFile(".env");

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_DRIVE_CLIENT_ID or GOOGLE_DRIVE_CLIENT_SECRET in .env.local/.env.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

console.log("\nOpen this URL:\n");
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("\nPaste only code= value here: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());

    console.log("\nNEW REFRESH TOKEN:\n");
    console.log(tokens.refresh_token);

    rl.close();
  } catch (err) {
    console.error("\nError:", err.message);
    rl.close();
  }
});

function loadEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
