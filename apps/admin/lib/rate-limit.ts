import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAtMs: number };

const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return "unknown";
}

export function checkRateLimit(
  req: NextRequest,
  options: { keyPrefix: string; limit: number; windowMs: number }
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${options.keyPrefix}:${ip}`;
  const existing = buckets.get(key);
  if (!existing || existing.resetAtMs <= now) {
    buckets.set(key, { count: 1, resetAtMs: now + options.windowMs });
    return { ok: true };
  }
  if (existing.count >= options.limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAtMs - now) / 1000)) };
  }
  existing.count += 1;
  return { ok: true };
}

