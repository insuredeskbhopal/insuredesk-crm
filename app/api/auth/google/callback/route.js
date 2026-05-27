import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request) {
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || baseUrl;
  return NextResponse.redirect(`${appBaseUrl}/login`);
}
