const GOOGLE_CLIENT_ID =
  process.env.CLIENT_GOOGLE_CLIENT_ID ||
  process.env.NEXT_PUBLIC_CLIENT_GOOGLE_CLIENT_ID ||
  "780359724362-m0i25gff41i2dgru6atnkjc02n2hcq74.apps.googleusercontent.com";

export async function getVerifiedGoogleEmail(accessToken, fetcher = fetch) {
  const token = String(accessToken || "").trim();
  if (!token || token.length > 4096) return "";

  const response = await fetcher(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return "";

  const profile = await response.json();
  const audience = String(profile.aud || profile.issued_to || "");
  const verified = profile.email_verified === true || profile.email_verified === "true" || profile.verified_email === true;
  const expiresIn = Number(profile.expires_in);
  if (audience !== GOOGLE_CLIENT_ID || !verified || !Number.isFinite(expiresIn) || expiresIn <= 0) return "";

  return String(profile.email || "").trim().toLowerCase();
}
