require('dotenv').config();
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');

const config = {
  clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
  folderId: process.env.GOOGLE_DRIVE_FOLDER_ID
};

async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const data = await response.json();
  return data.access_token;
}

async function listAllFiles() {
  const token = await getAccessToken();
  let files = [];
  let pageToken = null;

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${config.folderId}' in parents and trashed = false`);
    url.searchParams.set('pageSize', '1000');
    url.searchParams.set('fields', 'nextPageToken, files(id, name, mimeType, size, createdTime)');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.files) {
      files = files.concat(data.files);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`Total files in Google Drive folder (${config.folderId}):`, files.length);
  fs.writeFileSync('scripts/drive_files.json', JSON.stringify(files, null, 2));

  // Also check if any file in Google Drive matches the missing ones
  const searchVehicles = [
    'MP04ZL6963', 'MP04EB7507', 'MP04CJ2645', 'MP04CP6963', 'MP04CX5642',
    'MP04YB2059', 'MP04CN1498', 'MP04UG1132', 'MP04KG0802', 'MP04CL5420',
    'MP09ZS9904', 'MP04ZA1437', 'MP04BA4360', 'MP04YA8427', 'MP04UC1162',
    'MP04CN0553', 'MP09KD6564'
  ];

  console.log('\n--- Checking Drive for missing vehicles ---');
  for (const v of searchVehicles) {
    const f = files.filter(file => file.name.toUpperCase().includes(v));
    if (f.length > 0) {
      console.log(`FOUND ${v} in Drive:`, f.map(x => `${x.name} (${x.id})`).join(', '));
    } else {
      console.log(`NOT found in Drive: ${v}`);
    }
  }
}

listAllFiles().catch(console.error);
