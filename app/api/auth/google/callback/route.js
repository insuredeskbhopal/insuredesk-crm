import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    return new Response(renderOAuthCodePage(code), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || baseUrl;
  return NextResponse.redirect(`${appBaseUrl}/crm/admin/login`);
}

function renderOAuthCodePage(code) {
  const escapedCode = escapeHtml(code);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Google Drive OAuth Code</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; line-height: 1.5; color: #111827; }
      code { display: block; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; word-break: break-all; background: #f9fafb; }
    </style>
  </head>
  <body>
    <h1>Google Drive OAuth Code</h1>
    <p>Paste this value into the terminal prompt:</p>
    <code>${escapedCode}</code>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
