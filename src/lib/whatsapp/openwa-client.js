const BASE_URL = process.env.OPENWA_BASE_URL || 'http://localhost:8085';
const API_KEY = process.env.OPENWA_API_KEY;

function formatPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  if (!cleaned.endsWith('@c.us')) {
    cleaned = cleaned + '@c.us';
  }
  return cleaned;
}

async function callOpenWA(endpoint, payload = {}) {
  const url = `${BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) {
    headers['api_key'] = API_KEY;
    headers['key'] = API_KEY;
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenWA API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function getOpenwaStatus() {
  try {
    const res = await callOpenWA('getConnectionState');
    const state = res.response || res;
    return {
      connected: state === 'CONNECTED',
      state: state || 'UNKNOWN',
      lastChecked: new Date(),
    };
  } catch (error) {
    // If the REST API endpoint is not yet mounted (returns 404 or connection error),
    // check if the OpenWA server is responsive at all.
    try {
      const rootRes = await fetch(BASE_URL);
      if (rootRes.ok) {
        return {
          connected: false,
          state: 'SCAN_QR_CODE',
          lastChecked: new Date(),
        };
      }
    } catch (rootError) {
      // Server is completely offline
    }
    return {
      connected: false,
      state: 'UNREACHABLE',
      error: error.message,
      lastChecked: new Date(),
    };
  }
}

export async function getOpenwaQrCode() {
  try {
    try {
      const res = await callOpenWA('getQrCode');
      return {
        success: true,
        qrCode: res.response || res,
      };
    } catch (error) {
      // Fallback: Fetch raw binary QR code from `/qr` and encode to base64 DataURL
      const url = `${BASE_URL.replace(/\/$/, '')}/qr`;
      const response = await fetch(url);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/png';
        return {
          success: true,
          qrCode: `data:${contentType};base64,${base64}`,
        };
      }
      throw error;
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function sendOpenwaText(to, content) {
  const formattedTo = formatPhoneNumber(to);
  const payload = {
    args: {
      to: formattedTo,
      content: content,
    },
  };
  const res = await callOpenWA('sendText', payload);
  return res.response || res;
}

export async function sendOpenwaImage(to, fileData, filename, caption) {
  const formattedTo = formatPhoneNumber(to);
  const payload = {
    args: {
      to: formattedTo,
      file: fileData,
      filename: filename || 'image.png',
      caption: caption || '',
    },
  };
  const res = await callOpenWA('sendImage', payload);
  return res.response || res;
}

export async function sendOpenwaFile(to, fileData, filename, caption) {
  const formattedTo = formatPhoneNumber(to);
  const payload = {
    args: {
      to: formattedTo,
      file: fileData,
      filename: filename || 'document.pdf',
      caption: caption || '',
    },
  };
  const res = await callOpenWA('sendFile', payload);
  return res.response || res;
}
