/**
 * Session verification for Edge (middleware). Uses Web Crypto; same cookie format as auth.ts.
 */

export interface SessionPayload {
  username: string;
  exp: number;
}

function decodeBase64UrlToStr(str: string): string {
  try {
    const binary = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function encodeBase64Url(bytes: ArrayBuffer): string {
  const b = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < b.length; i++) binary += String.fromCharCode(b[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function verifySessionCookieEdge(
  cookieValue: string | null | undefined,
  secret: string
): Promise<SessionPayload | null> {
  if (!cookieValue || !cookieValue.includes(".")) return null;
  const [payloadB64, sigB64] = cookieValue.split(".");
  if (!payloadB64 || !sigB64) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const payloadBytes = encoder.encode(payloadB64);
  const sig = await crypto.subtle.sign("HMAC", key, payloadBytes);
  const expectedB64 = encodeBase64Url(sig);
  if (expectedB64 !== sigB64) return null;

  try {
    const payloadStr = decodeBase64UrlToStr(payloadB64);
    const payload = JSON.parse(payloadStr) as SessionPayload;
    if (!payload || typeof payload.exp !== "number" || typeof payload.username !== "string") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
