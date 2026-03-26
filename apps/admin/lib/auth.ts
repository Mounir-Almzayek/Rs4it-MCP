/**
 * Session auth for admin (Phase 10).
 * Signed cookie: payload.exp, payload.username. Verified in middleware and API.
 */

import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE_SEC = 24 * 60 * 60; // 24 hours

function getSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET or ADMIN_SESSION_SECRET (min 16 chars) is required for admin auth");
  }
  return secret;
}

export interface SessionPayload {
  username: string;
  exp: number;
}

function encodeBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function decodeBase64Url(str: string): Buffer | null {
  try {
    return Buffer.from(str, "base64url");
  } catch {
    return null;
  }
}

export function createSessionCookie(username: string): { name: string; value: string; options: Record<string, unknown> } {
  const payload: SessionPayload = {
    username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = encodeBase64Url(Buffer.from(payloadStr, "utf-8"));
  const secret = getSecret();
  const sig = createHmac("sha256", secret).update(payloadB64).digest();
  const value = `${payloadB64}.${encodeBase64Url(sig)}`;
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax" as const,
      maxAge: SESSION_MAX_AGE_SEC,
      path: "/",
    },
  };
}

export function verifySessionCookie(cookieValue: string | null | undefined): SessionPayload | null {
  if (!cookieValue || !cookieValue.includes(".")) return null;
  const [payloadB64, sigB64] = cookieValue.split(".");
  if (!payloadB64 || !sigB64) return null;
  const sig = decodeBase64Url(sigB64);
  if (!sig) return null;
  const expectedSig = createHmac("sha256", getSecret()).update(payloadB64).digest();
  if (expectedSig.length !== sig.length || !timingSafeEqual(expectedSig, sig)) return null;
  const payloadBuf = decodeBase64Url(payloadB64);
  if (!payloadBuf) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(payloadBuf.toString("utf-8")) as SessionPayload;
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== "number" || typeof payload.username !== "string") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expired
  return payload;
}

export function getSessionFromRequest(request: Request): SessionPayload | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1].trim()) : null;
  return verifySessionCookie(value);
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

/** Call from API routes: returns session or null; use to send 401 if null. */
export function requireSession(request: Request): SessionPayload | null {
  return getSessionFromRequest(request);
}
