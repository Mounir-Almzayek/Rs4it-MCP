/**
 * Admin credentials storage (Phase 10).
 * DB-backed via Hub API (single admin user).
 */

export interface StoredCredentials {
  username: string;
  passwordHash: string;
}

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubSecretHeader(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

export async function credentialsExist(): Promise<boolean> {
  const res = await fetch(`${hubBaseUrl()}/api/admin/credentials/status`, {
    headers: hubSecretHeader(),
    cache: "no-store",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { ok?: boolean; exists?: boolean };
  return Boolean(data?.exists);
}

export async function getCredentials(): Promise<StoredCredentials | null> {
  // Not exposed for security; return null.
  return null;
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const res = await fetch(`${hubBaseUrl()}/api/admin/login`, {
    method: "POST",
    headers: { ...hubSecretHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { ok?: boolean };
  return Boolean(data?.ok);
}

export async function saveCredentials(username: string, password: string): Promise<void> {
  const res = await fetch(`${hubBaseUrl()}/api/admin/setup`, {
    method: "POST",
    headers: { ...hubSecretHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to setup credentials");
  }
}

export async function updateCredentials(options: {
  newUsername?: string;
  newPassword?: string;
  currentPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${hubBaseUrl()}/api/admin/credentials`, {
      method: "PUT",
      headers: { ...hubSecretHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(options),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !data?.ok) return { success: false, error: data?.error ?? "Failed to update credentials" };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
