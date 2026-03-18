import { readRoleConfig } from "./roles";

const HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export type ValidationOk<T> = { ok: true; value: T };
export type ValidationErr = { ok: false; error: string };

export async function validateAllowedRoles(
  allowedRoles: unknown
): Promise<ValidationOk<string[] | undefined> | ValidationErr> {
  if (allowedRoles === undefined) return { ok: true, value: undefined };
  if (!Array.isArray(allowedRoles)) {
    return { ok: false, error: "allowedRoles must be a JSON array of role ids" };
  }
  const cleaned = allowedRoles.map((r) => String(r ?? "").trim());
  const emptyIdx = cleaned.findIndex((r) => !r);
  if (emptyIdx !== -1) {
    return { ok: false, error: "allowedRoles cannot contain empty role ids" };
  }
  const config = await readRoleConfig();
  const known = new Set((config.roles ?? []).map((r) => r.id));
  const unknown = [...new Set(cleaned.filter((r) => !known.has(r)))];
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown role id(s): ${unknown.join(", ")}` };
  }
  const uniq = [...new Set(cleaned)];
  return { ok: true, value: uniq.length > 0 ? uniq : undefined };
}

/**
 * Optional generic validation for HTTP-style headers objects.
 * - keys must be valid header tokens
 * - values must be strings (or numbers/booleans that can be stringified)
 */
export function validateHeadersObject(
  headers: unknown,
  label = "headers"
): ValidationOk<Record<string, string> | undefined> | ValidationErr {
  if (headers === undefined) return { ok: true, value: undefined };
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return { ok: false, error: `${label} must be an object like {"User-Agent":"..."}` };
  }
  const out: Record<string, string> = {};
  for (const [rawKey, rawVal] of Object.entries(headers as Record<string, unknown>)) {
    const key = String(rawKey ?? "").trim();
    if (!key) return { ok: false, error: `${label} contains an empty header name` };
    if (!HEADER_NAME_RE.test(key)) {
      return { ok: false, error: `${label} contains invalid header name: ${key}` };
    }
    if (rawVal === undefined || rawVal === null) {
      return { ok: false, error: `${label}.${key} must be a string value` };
    }
    if (typeof rawVal === "string") out[key] = rawVal;
    else if (typeof rawVal === "number" || typeof rawVal === "boolean") out[key] = String(rawVal);
    else return { ok: false, error: `${label}.${key} must be a string value` };
  }
  return { ok: true, value: Object.keys(out).length > 0 ? out : undefined };
}

